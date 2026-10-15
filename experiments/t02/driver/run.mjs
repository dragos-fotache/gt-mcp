/**
 * T02 isolated driver bootstrap (S1+S2A+S2B+R2+R3: no-companion/sdk,
 * generic-readonly/sdk, direct-readonly/sdk, deferred/codemode/
 * nested-readonly/sdk, plus the ten R3 SDK preflight/binding/hidden
 * scenarios).
 *
 * Small bootstrap/report collector, NOT the SDK runtime process: it creates
 * disposable roots, writes launcher-owned inputs, then starts one Node worker
 * with a complete explicit child environment and disposable cwd. This module
 * never imports Pi, activates extensions, or contacts a provider.
 *
 * Usage:
 *   node experiments/t02/driver/run.mjs --scenario <name> --harness <sdk|pty> --out <report.json>
 *
 * exit0: the observation completed (NOT the test verdict — inspect the
 * report). exit1: harness/cleanup/timeout failure. exit2: invalid arguments
 * (including combinations not authorized in the current slice).
 * The single JSON report is emitted on stdout with no unrelated logging.
 */

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getScenario, SEED_DIGEST, SEED_OPERATION_ID } from "./scenarios.mjs";
import { prepareRoots, buildExperimentEnv, cleanupRoots } from "./roots.mjs";
import { buildReport, BUDGETS } from "./report.mjs";
import { readSharedJournal } from "./event-journal.mjs";
import { assembleR3Report } from "./r3-report.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..", "..");
const WORKER_S1 = join(HERE, "sdk-s1-worker.mjs");
const WORKER_READONLY = join(HERE, "sdk-readonly-worker.mjs");
const WORKER_GATE = join(HERE, "sdk-gate-worker.mjs");
const WORKER_PREFLIGHT = join(HERE, "sdk-preflight-worker.mjs");
const R3_SCENARIOS = [
  "static-shadow",
  "normalized-collision",
  "normalized-collision-reversed",
  "replacement-mcp",
  "replacement-codemode",
  "missing-mcp",
  "unsupported-inventory",
  "binding-missing",
  "binding-ambiguous",
  "hidden-tool",
];
const FIXTURE_ENTRY = join(REPO_ROOT, "experiments", "t02", "fixture-server", "server.mjs");
const SCENARIO_BUDGET_MS = 65_000;
const OUTPUT_CAP_BYTES = 1024 * 1024;

function usageError(message) {
  process.stderr.write(`t02-driver: ${message}\n`);
  process.stderr.write(
    "usage: run.mjs --scenario <name> --harness <sdk|pty> --out <report.json>\n",
  );
  process.exit(2);
}

function groupSurvivors(pgid) {
  try {
    process.kill(-pgid, 0);
    return true;
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ESRCH") return false;
    return true;
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const get = (flag) => {
    const i = argv.indexOf(flag);
    if (i === -1 || i + 1 >= argv.length) usageError(`missing ${flag}`);
    return argv[i + 1];
  };
  const scenarioName = get("--scenario");
  const harness = get("--harness");
  const outPath = get("--out");
  if (harness !== "sdk" && harness !== "pty") usageError(`unknown harness: ${harness}`);
  let scenario;
  try {
    scenario = getScenario(scenarioName);
  } catch {
    usageError(`unknown scenario: ${scenarioName}`);
  }
  // Authorized targets only; the registry itself is unchanged.
  const authorized =
    (scenarioName === "no-companion" ||
      scenarioName === "generic-readonly" ||
      scenarioName === "direct-readonly" ||
      scenarioName === "deferred-readonly" ||
      scenarioName === "codemode-readonly" ||
      scenarioName === "nested-readonly" ||
      R3_SCENARIOS.includes(scenarioName)) &&
    harness === "sdk";
  if (!authorized) {
    usageError(
      `authorized targets: no-companion/sdk, generic-readonly/sdk, direct-readonly/sdk, deferred-readonly/sdk, codemode-readonly/sdk, nested-readonly/sdk, ${R3_SCENARIOS.map((s) => `${s}/sdk`).join(", ")} (got ${scenarioName}/${harness})`,
    );
  }
  const isR3 = R3_SCENARIOS.includes(scenarioName);
  const isHidden = scenarioName === "hidden-tool";
  const isGenericReadonly = scenarioName === "generic-readonly";
  const isGateReadonly =
    scenarioName === "direct-readonly" ||
    scenarioName === "deferred-readonly" ||
    scenarioName === "codemode-readonly" ||
    scenarioName === "nested-readonly";
  const isR2 =
    scenarioName === "deferred-readonly" ||
    scenarioName === "codemode-readonly" ||
    scenarioName === "nested-readonly";
  const isSharedJournal = isGenericReadonly || isGateReadonly || isR3;
  const workerPath = isR3
    ? WORKER_PREFLIGHT
    : isGateReadonly
      ? WORKER_GATE
      : isGenericReadonly
        ? WORKER_READONLY
        : WORKER_S1;
  // Narrow budget seam: R2/R3 owned-worker deadline 55s so no scenario can
  // be reported complete past the public 60s budget. Accepted S1/S2A/S2B
  // profiles keep 65s.
  const scenarioDeadlineMs = isR2 || isR3 ? 55_000 : SCENARIO_BUDGET_MS;

  const started = Date.now();
  const roots = prepareRoots();
  const journalFile = join(roots.run, "t02-journal.jsonl");
  const sharedJournalFile = join(roots.run, "t02-shared-journal.jsonl");
  const turnsFile = join(roots.run, "t02-turns.json");
  const ledgerFile = join(roots.run, "fixture-ledger.jsonl");
  const traceFile = join(roots.run, "companion-trace.jsonl");
  const bindingFile = join(roots.run, "t02-binding.json");
  const modelFile = join(roots.run, "t02-model.json");
  writeFileSync(turnsFile, JSON.stringify(scenario.turns(scenario.name)), { mode: 0o600 });
  if (isSharedJournal) {
    // The shared journal is created once, empty, before workers/fixture start.
    writeFileSync(sharedJournalFile, "", { mode: 0o600 });
  }
  if (isGateReadonly) {
    // Strict private synthetic tuple for the companion-managed gate route.
    // Launcher-owned trusted input: origin plus fixed synthetic identifiers.
    // Values never enter reports, journals, or session entries.
    writeFileSync(
      bindingFile,
      `${JSON.stringify({
        origin: "synthetic://t02",
        accountUuid: "22222222-2222-4222-8222-222222222222",
        sessionGeneration: 7,
        profileGenerationId: "44444444-4444-4444-8444-444444444444",
      })}\n`,
      { mode: 0o600 },
    );
  }
  if (isR3) {
    // R3 trusted binding inputs: good single tuple for supported/static
    // profiles, two independently valid candidates for binding-ambiguous,
    // and no file at all for binding-missing (never seed an empty file).
    // Values never enter reports, journals, or session entries.
    if (scenarioName === "binding-ambiguous") {
      const candidate = (generation) => ({
        origin: "synthetic://t02",
        accountUuid: "22222222-2222-4222-8222-222222222222",
        sessionGeneration: generation,
        profileGenerationId: "44444444-4444-4444-8444-444444444444",
      });
      writeFileSync(bindingFile, `${JSON.stringify([candidate(7), candidate(8)])}\n`, {
        mode: 0o600,
      });
    } else if (scenarioName !== "binding-missing") {
      writeFileSync(
        bindingFile,
        `${JSON.stringify({
          origin: "synthetic://t02",
          accountUuid: "22222222-2222-4222-8222-222222222222",
          sessionGeneration: 7,
          profileGenerationId: "44444444-4444-4444-8444-444444444444",
        })}\n`,
        { mode: 0o600 },
      );
    }
    // R3 closed launcher-owned static configuration: private 0600
    // agent-root mcp.json ONLY, with the single safe fixture descriptor
    // per closed registry name (insertion order significant). No
    // sidecar/binding flags, env expansion, shell, network or unknown
    // entry. Never the repository .pi.
    const staticNames = Array.isArray(scenario.staticMcp?.names) ? scenario.staticMcp.names : [];
    for (const name of staticNames) {
      if (name !== "synth-gt" && name !== "synth_gt") {
        process.stderr.write(`t02-driver: unsupported static name: ${name}\n`);
        process.exit(2);
      }
    }
    const staticServers = {};
    for (const name of staticNames) {
      staticServers[name] = {
        command: process.execPath,
        args: [
          FIXTURE_ENTRY,
          "--t02-ledger-file",
          ledgerFile,
          "--t02-event-journal",
          sharedJournalFile,
        ],
        timeout: 10,
        exposure: "direct",
        enabled: true,
      };
    }
    writeFileSync(
      join(roots.agent, "mcp.json"),
      `${JSON.stringify({ mcpServers: staticServers, autoEnableCodemode: false })}\n`,
      { mode: 0o600 },
    );
  }

  const scenarioEnv = {
    T02_SCENARIO: scenarioName,
    T02_EXPOSURE: scenario.exposure,
    T02_TRACE_FILE: traceFile,
    // binding-missing receives no file and no T02_BINDING_FILE value.
    ...(isR3 && scenarioName === "binding-missing" ? {} : { T02_BINDING_FILE: bindingFile }),
    T02_LEDGER_FILE: ledgerFile,
    T02_TURNS_FILE: turnsFile,
    T02_MODEL_FILE: modelFile,
    T02_RUN_DIR: roots.run,
    T02_JOURNAL_FILE: journalFile,
    T02_SHARED_JOURNAL: isSharedJournal
      ? sharedJournalFile
      : join(roots.run, "t02-shared-unused.jsonl"),
    T02_FIXTURE_ENTRY:
      isSharedJournal && (!isR3 || isHidden)
        ? FIXTURE_ENTRY
        : join(roots.run, "t02-fixture-unused.mjs"),
    T02_LAYER: "sdk-pipeline",
    // Trusted hidden exposure flag only for the hidden-tool target.
    ...(isHidden ? { T02_HIDE_CREATE: "1" } : {}),
  };
  const { env: childEnv, stripped } = buildExperimentEnv(roots, scenarioEnv);

  // One owned worker in its own process group; tracked by child events only.
  const child = spawn(
    process.execPath,
    [workerPath, "--repo-root", REPO_ROOT, "--scenario", scenarioName],
    {
      cwd: roots.cwd,
      env: childEnv,
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stdout = "";
  let stderr = "";
  let stdoutTruncated = false;
  let stderrTruncated = false;
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf8");
    if (stdout.length > OUTPUT_CAP_BYTES) {
      stdout = stdout.slice(0, OUTPUT_CAP_BYTES);
      stdoutTruncated = true;
    }
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf8");
    if (stderr.length > OUTPUT_CAP_BYTES) {
      stderr = stderr.slice(0, OUTPUT_CAP_BYTES);
      stderrTruncated = true;
    }
  });

  // Await stdio closure (not just exit); on timeout signal the owned group,
  // then keep awaiting the close event so reaping precedes any journal read
  // or root deletion.
  let closeReceived = false;
  let workerExited = false;
  child.once("exit", () => {
    workerExited = true;
  });
  const exitInfo = await new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      try {
        if (!workerExited && child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
      } catch {
        // group may already be gone; close event below decides
      }
      resolve({ code: null, signal: "SIGKILL", timeout: true });
      settled = true;
    }, scenarioDeadlineMs);
    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: null, signal: null, timeout: false, spawnError: err.message });
    });
    child.on("close", (code, signal) => {
      closeReceived = true;
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, signal, timeout: false });
    });
  });
  // If the timeout path resolved first, still await actual close/reaping
  // (bounded). Closure is tracked by the close event only — a non-null
  // exitCode/signalCode never substitutes for it.
  if (!closeReceived) {
    await new Promise((resolve) => {
      const reapTimer = setTimeout(() => resolve(null), 5000);
      child.once("close", () => {
        closeReceived = true;
        clearTimeout(reapTimer);
        resolve(null);
      });
    });
  }

  // Owned-group survivor check: ESRCH (gone) is the only passing result.
  const survivors = child.pid !== undefined && groupSurvivors(child.pid);
  const groupGone = !survivors;
  let workerResult = null;
  if (!exitInfo.timeout && !exitInfo.spawnError) {
    try {
      workerResult = JSON.parse(stdout.trim().split("\n").pop() ?? "");
    } catch {
      workerResult = null;
    }
  }

  // Parent size validation before reading the journal.
  const journalSizeOk =
    closeReceived &&
    groupGone &&
    (() => {
      try {
        return statSync(journalFile).size <= 256 * 1024;
      } catch {
        return false;
      }
    })();
  const readJournal = () => {
    try {
      const raw = readFileSync(journalFile, "utf8");
      const lines = raw.split("\n").filter((l) => l.trim().length > 0);
      const parsed = lines.map((l) => JSON.parse(l));
      const ok =
        parsed.length > 0 &&
        parsed.every((rec, i) => rec && typeof rec === "object" && rec.seq === i + 1);
      return ok ? { ok: true, trace: parsed } : { ok: false, trace: [] };
    } catch {
      return { ok: false, trace: [] };
    }
  };
  const journal = journalSizeOk ? readJournal() : { ok: false, trace: [] };
  const trace = journal.trace;
  const journalOk = journal.ok;

  if (isR3) {
    await assembleR3Report({
      scenarioName,
      harness,
      scenario,
      roots,
      sharedJournalFile,
      ledgerFile,
      child,
      exitInfo,
      closeReceived,
      survivors,
      workerResult,
      stdoutTruncated,
      stderrTruncated,
      stderr,
      stripped,
      started,
      scenarioDeadlineMs,
      outPath,
    });
    return;
  }

  if (isR2) {
    await assembleR2Report({
      scenarioName,
      harness,
      scenario,
      roots,
      sharedJournalFile,
      ledgerFile,
      child,
      exitInfo,
      closeReceived,
      survivors,
      workerResult,
      stdoutTruncated,
      stderrTruncated,
      stderr,
      stripped,
      started,
      scenarioDeadlineMs,
      outPath,
    });
    return;
  }

  if (isGateReadonly) {
    await assembleGateReport({
      scenarioName,
      harness,
      scenario,
      roots,
      sharedJournalFile,
      ledgerFile,
      child,
      exitInfo,
      closeReceived,
      survivors,
      workerResult,
      stdoutTruncated,
      stderrTruncated,
      stderr,
      stripped,
      started,
      outPath,
    });
    return;
  }

  if (isGenericReadonly) {
    await assembleReadonlyReport({
      scenarioName,
      harness,
      scenario,
      roots,
      sharedJournalFile,
      ledgerFile,
      child,
      exitInfo,
      closeReceived,
      survivors,
      workerResult,
      stdoutTruncated,
      stderrTruncated,
      stderr,
      stripped,
      started,
      outPath,
    });
    return;
  }

  // Worker-observed runtime replaces bootstrap probing (sanitized worker only).
  const runtime = workerResult?.runtime ?? null;

  // Effects come only from verified worker observations. Any failed or
  // unverified path reports clearly unverified effects (null total) —
  // never a false zero.
  const workerEffects = workerResult?.effects;
  const workerEffectsVerified =
    exitInfo.code === 0 &&
    !exitInfo.timeout &&
    !exitInfo.spawnError &&
    closeReceived &&
    groupGone &&
    journalOk &&
    !stdoutTruncated &&
    !stderrTruncated &&
    workerResult?.completed === true &&
    workerEffects !== null &&
    typeof workerEffects === "object" &&
    workerEffects.source === "none" &&
    workerEffects.observation === "not-spawned" &&
    workerEffects.total === 0 &&
    Array.isArray(workerEffects.operations) &&
    workerEffects.operations.length === 0;
  const effects = workerEffectsVerified
    ? { source: "none", observation: "not-spawned", total: 0, operations: [] }
    : { source: "none", observation: "unverified", total: null, operations: [] };
  const elapsed = Date.now() - started;
  const limits = {
    workerExit: exitInfo.code,
    workerSignal: exitInfo.signal,
    workerTimeout: exitInfo.timeout === true,
    closeReceived,
    spawnError: exitInfo.spawnError ?? null,
    stdoutTruncated,
    stderrTruncated,
    workerStderrTail: stderr.slice(-2000),
    journalOk,
    journalSizeOk,
    journalRecords: trace.length,
    scenarioMs: elapsed,
    scenarioBudgetMs: BUDGETS.scenarioMs,
    budgetExceeded: elapsed > BUDGETS.scenarioMs,
    strippedEnvVars: stripped.length,
    workerCompleted: workerResult?.completed === true,
    workerEffectsVerified,
    runtimeObserved: runtime !== null,
  };
  // Completion requires every conjunct: actual close/reap, known group
  // disappearance, worker success with verified effects, valid bounded
  // journal, no truncation/timeout, validated worker listener closure, and
  // successful root removal. Unknown closure retains roots and fails.
  const workerCleanup = trace.find((r) => r.source === "launcher" && r.type === "worker_cleanup");
  const workerListenersClosed =
    workerCleanup?.listenersClosed === true && workerCleanup?.remainingListeners === 0;
  let rootsRemoved = false;
  let rootsRetained = false;
  if (
    closeReceived &&
    groupGone &&
    journalOk &&
    !stdoutTruncated &&
    !stderrTruncated &&
    workerEffectsVerified &&
    workerListenersClosed
  ) {
    rootsRemoved = cleanupRoots(roots);
  } else {
    rootsRetained = true;
  }
  const completed =
    exitInfo.code === 0 &&
    !exitInfo.timeout &&
    closeReceived &&
    groupGone &&
    journalOk &&
    !stdoutTruncated &&
    !stderrTruncated &&
    workerListenersClosed &&
    workerEffectsVerified &&
    workerResult?.completed === true &&
    runtime !== null &&
    rootsRemoved &&
    !rootsRetained &&
    !limits.budgetExceeded;
  // ONE final parent cleanup record, appended after worker-done/close/ESRCH/
  // removal. Earlier worker records are never mutated to claim later state.
  trace.push({
    seq: trace.length + 1,
    source: "launcher",
    type: "cleanup",
    layer: "sdk-pipeline",
    childrenGone: groupGone,
    listenersClosed: workerListenersClosed,
    rootsRemoved,
    rootsRetained,
    remainingChildren: groupGone ? 0 : 1,
    remainingListeners: workerCleanup?.remainingListeners ?? null,
  });
  limits.rootsRemoved = rootsRemoved;
  limits.rootsRetained = rootsRetained;

  const report = buildReport({
    scenario: scenarioName,
    harness,
    layer: scenario.layer,
    runtime,
    trace,
    effects,
    limits,
    completed,
  });
  const encoded = JSON.stringify(report);
  try {
    writeFileSync(outPath, `${encoded}\n`, { encoding: "utf8", mode: 0o600 });
  } catch (err) {
    process.stderr.write(
      `t02-driver: cannot write report: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
  process.stdout.write(`${encoded}\n`);
  if (!report.completed) process.exit(1);
}

async function assembleReadonlyReport(ctx) {
  const {
    scenarioName,
    harness,
    scenario,
    roots,
    sharedJournalFile,
    ledgerFile,
    exitInfo,
    closeReceived,
    survivors,
    workerResult,
    stdoutTruncated,
    stderrTruncated,
    stderr,
    stripped,
    started,
    outPath,
  } = ctx;
  const failures = [];
  const note = (message) => failures.push(message);

  // Shared journal: parent validates shape/sequences/aggregate, assigns seq.
  let shared = [];
  try {
    if (!closeReceived || survivors) throw new Error("owned-resources-not-closed");
    shared = readSharedJournal(sharedJournalFile);
  } catch (err) {
    note(`shared-journal:${err instanceof Error ? err.message : String(err)}`);
  }
  const ofType = (type, producer = null) =>
    shared.filter((r) => r.type === type && (producer === null || r.producer === producer));

  // Independent fixture ledger: exactly one final, zero effects.
  let ledgerLines = [];
  try {
    if (!closeReceived || survivors) throw new Error("owned-resources-not-closed");
    if (statSync(ledgerFile).size > BUDGETS.traceBytes) throw new Error("ledger-budget-exceeded");
    const raw = readFileSync(ledgerFile, "utf8");
    if (!raw.endsWith("\n")) throw new Error("incomplete-ledger-record");
    ledgerLines = raw
      .slice(0, -1)
      .split("\n")
      .map((line) => {
        if (!line.startsWith("T02-LEDGER ")) throw new Error("invalid-ledger-record");
        return JSON.parse(line.slice("T02-LEDGER ".length));
      });
  } catch (err) {
    note(`ledger-unreadable:${err instanceof Error ? err.message : String(err)}`);
  }
  const ledgerFinals = ledgerLines.filter((r) => r.event === "final");
  const ledgerFinal = ledgerFinals.length === 1 ? ledgerFinals[0] : null;
  if (!ledgerFinal) note(`ledger-finals:${ledgerFinals.length}`);
  else if (
    ledgerFinal.operationId !== null ||
    ledgerFinal.digest !== null ||
    ledgerFinal.totalDispatches !== 0 ||
    !Array.isArray(ledgerFinal.operations) ||
    ledgerFinal.operations.length !== 0
  ) {
    note("ledger-nonzero");
  }

  // Fixture-origin observations from the shared journal.
  const startups = ofType("fixture_startup", "fixture");
  if (startups.length !== 1) note(`fixture-startups:${startups.length}`);
  else if (
    startups[0].sidecar !== false ||
    startups[0].binding !== false ||
    startups[0].ledger !== true
  )
    note("unexpected-fixture-profile");
  const journalFinals = ofType("effect_ledger", "fixture").filter((r) => r.final === true);
  if (journalFinals.length !== 1) note(`journal-finals:${journalFinals.length}`);
  else if (
    journalFinals[0].operationId !== null ||
    journalFinals[0].digest !== null ||
    journalFinals[0].counter !== 0 ||
    !Array.isArray(journalFinals[0].operations) ||
    journalFinals[0].operations.length !== 0
  )
    note("journal-final-invalid");
  const toolLists = ofType("tool_list", "fixture");
  const expectedTools = [
    "search_exercises",
    "get_exercise",
    "list_workouts",
    "get_workout",
    "list_routines",
    "get_routine",
    "create_routine",
  ];
  const listed = toolLists.length > 0 ? toolLists[toolLists.length - 1].tools : null;
  if (
    !Array.isArray(listed) ||
    listed.length !== 7 ||
    !expectedTools.every((t) => listed.includes(t))
  ) {
    note("tool-list-mismatch");
  }
  const protocols = ofType("protocol", "fixture");
  const negotiated = protocols.length > 0 ? protocols[protocols.length - 1].negotiated : null;
  if (negotiated !== "2025-11-25") note(`protocol:${String(negotiated)}`);
  const receiverChecks = ofType("receiver_check", "fixture");
  const createCheck = receiverChecks.find((r) => r.receivedDigest === SEED_DIGEST);
  if (!createCheck) note("receiver-check-missing");
  else if (createCheck.decision !== "deny")
    note(`receiver-decision:${String(createCheck.decision)}`);

  // Joined pipeline outcomes from worker-observed events.
  const results = ofType("tool_result", "sdk-worker");
  const createResult = results.find((r) => r.name === "mcp__synth_gt__create_routine");
  if (!createResult) note("create-result-missing");
  else if (createResult.isError !== true || createResult.code !== "write_approval_required") {
    note(`create-outcome:${String(createResult.code ?? createResult.reason)}`);
  }
  const readResult = results.find((r) => r.name === "mcp__synth_gt__get_exercise");
  if (!readResult) note("read-result-missing");
  else if (readResult.isError !== false) note("read-outcome-error");
  const registrations = ofType("registration", "sdk-worker");
  const readonlyReg = registrations.find((r) => r.policy === "readonly");
  if (!readonlyReg) note("readonly-registration-missing");
  const forbidden = shared.filter((r) =>
    ["gate_installed", "approval_prompt", "gate_invocation"].includes(r.type),
  );
  if (forbidden.length > 0) note(`forbidden-records:${forbidden.length}`);
  const preflights = ofType("preflight", "sdk-worker");
  if (!preflights.some((r) => r.supported === true)) note("preflight-unsupported");

  // Call/result ID join integrity.
  const calls = ofType("tool_call", "sdk-worker");
  const callIds = new Set(calls.map((c) => c.toolCallId));
  for (const result of results) {
    if (!callIds.has(result.toolCallId)) note(`unjoined-result:${String(result.toolCallId)}`);
  }

  if (calls.length !== 2 || results.length !== 2 || callIds.size !== 2)
    note("pipeline-count-mismatch");
  for (const call of calls) {
    if (typeof call.toolCallId !== "string" || call.toolCallId.length === 0)
      note("invalid-call-id");
    const joined = results.filter((result) => result.toolCallId === call.toolCallId);
    if (joined.length !== 1 || joined[0].name !== call.name || call.seq >= joined[0].seq)
      note("invalid-pipeline-join");
  }
  if (
    !preflights.some(
      (record) => record.mode === "print" && record.hasUI === false && record.uiInjected === false,
    )
  )
    note("invalid-context");
  if (
    receiverChecks.length !== 1 ||
    createCheck?.operationId !== "55555555-5555-4555-8555-555555555555" ||
    createCheck?.approvedDigest !== null ||
    createCheck?.reason !== "no-sidecar"
  )
    note("invalid-receiver-refusal");
  const firstInventory = ofType("first-request-inventory", "sdk-worker");
  if (
    firstInventory.length !== 1 ||
    !Array.isArray(firstInventory[0].tools) ||
    firstInventory[0].tools.length !== 7 ||
    !expectedTools.every((tool) => firstInventory[0].tools.includes(tool)) ||
    !readonlyReg ||
    readonlyReg.registered !== true ||
    readonlyReg.connected !== true ||
    readonlyReg.spawned !== true ||
    calls.some((call) => firstInventory[0].seq >= call.seq || readonlyReg.seq >= call.seq)
  )
    note("unverified-discovery");
  const runtime = workerResult?.runtime ?? null;
  if (runtime) runtime.protocol = negotiated === "2025-11-25" ? "2025-11-25" : runtime.protocol;
  const effects =
    failures.length === 0 && ledgerFinal
      ? {
          source: "fixture",
          observation: "fixture-final",
          total: ledgerFinal.totalDispatches ?? 0,
          operations: (ledgerFinal.operations ?? []).map((o) => ({
            operationId: o.operationId ?? null,
            digest: o.digest ?? null,
            counter: o.dispatches ?? 0,
          })),
        }
      : { source: "none", observation: "unverified", total: null, operations: [] };

  const elapsed = Date.now() - started;
  const groupGone = !survivors;
  const workerCleanup = shared.find(
    (r) => r.producer === "sdk-worker" && r.type === "worker_cleanup",
  );
  const workerListenersClosed =
    workerCleanup?.listenersClosed === true && workerCleanup?.remainingListeners === 0;
  let rootsRemoved = false;
  let rootsRetained = false;
  const ready =
    failures.length === 0 &&
    closeReceived &&
    groupGone &&
    !stdoutTruncated &&
    !stderrTruncated &&
    workerResult?.completed === true &&
    workerListenersClosed &&
    runtime !== null;
  if (ready && exitInfo.code === 0 && !exitInfo.timeout && elapsed <= BUDGETS.scenarioMs) {
    rootsRemoved = cleanupRoots(roots);
  } else {
    rootsRetained = true;
    if (failures.length === 0) note("completion-conjunct-failed");
  }
  const completed = ready && rootsRemoved && !rootsRetained && exitInfo.code === 0;
  const trace = [
    ...shared,
    {
      seq: shared.length + 1,
      source: "launcher",
      type: "cleanup",
      layer: "sdk-pipeline",
      childrenGone: groupGone,
      listenersClosed: workerListenersClosed,
      rootsRemoved,
      rootsRetained,
      remainingChildren: groupGone ? 0 : 1,
      remainingListeners: workerCleanup?.remainingListeners ?? null,
    },
  ];
  const report = buildReport({
    scenario: scenarioName,
    harness,
    layer: scenario.layer,
    runtime,
    trace,
    effects,
    limits: {
      workerExit: exitInfo.code,
      workerSignal: exitInfo.signal,
      workerTimeout: exitInfo.timeout === true,
      closeReceived,
      spawnError: exitInfo.spawnError ?? null,
      stdoutTruncated,
      stderrTruncated,
      workerStderrTail: stderr.slice(-2000),
      sharedJournalRecords: shared.length,
      evidenceFailures: failures,
      scenarioMs: elapsed,
      scenarioBudgetMs: BUDGETS.scenarioMs,
      budgetExceeded: elapsed > BUDGETS.scenarioMs,
      strippedEnvVars: stripped.length,
      workerCompleted: workerResult?.completed === true,
      runtimeObserved: runtime !== null,
      rootsRemoved,
      rootsRetained,
    },
    completed,
  });
  const encoded = JSON.stringify(report);
  try {
    writeFileSync(outPath, `${encoded}\n`, { encoding: "utf8", mode: 0o600 });
  } catch (err) {
    process.stderr.write(
      `t02-driver: cannot write report: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
  process.stdout.write(`${encoded}\n`);
  if (!report.completed) process.exit(1);
}

async function assembleGateReport(ctx) {
  const {
    scenarioName,
    harness,
    scenario,
    roots,
    sharedJournalFile,
    ledgerFile,
    exitInfo,
    closeReceived,
    survivors,
    workerResult,
    stdoutTruncated,
    stderrTruncated,
    stderr,
    stripped,
    started,
    outPath,
  } = ctx;
  const failures = [];
  const note = (message) => failures.push(message);

  // Shared journal under the direct-readonly profile: companion provenance
  // is permitted only here, never for the generic S2A path.
  let shared = [];
  try {
    if (!closeReceived || survivors) throw new Error("owned-resources-not-closed");
    shared = readSharedJournal(sharedJournalFile, "direct-readonly");
  } catch (err) {
    note(`shared-journal:${err instanceof Error ? err.message : String(err)}`);
  }
  const ofType = (type, producer = null) =>
    shared.filter((r) => r.type === type && (producer === null || r.producer === producer));
  const companion = (type) => ofType(type, "companion");
  const worker = (type) => ofType(type, "sdk-worker");
  const fixture = (type) => ofType(type, "fixture");

  // Gate installation: exactly one companion gate_installed, preceding every
  // registration, declaration, inventory, and call observation.
  const installed = companion("gate_installed");
  if (installed.length !== 1) note(`gate-installed:${installed.length}`);
  else if (installed[0].handler !== "tool_call") note("gate-installed-handler");
  const laterRegistration = shared.filter((r) =>
    ["registration", "registration_declared", "first-request-inventory", "tool_call"].includes(
      r.type,
    ),
  );
  if (installed.length === 1 && laterRegistration.some((r) => r.seq <= installed[0].seq)) {
    note("gate-installed-not-first");
  }

  // Companion pending declaration: successful API return only, never
  // connected proof. The worker confirms readonly after real discovery.
  const declared = companion("registration_declared");
  if (declared.length !== 1) note(`registration-declared:${declared.length}`);
  const declaration = declared.length === 1 ? declared[0] : null;
  if (
    declaration &&
    (declaration.server !== "synth-gt" ||
      declaration.policy !== "readonly" ||
      declaration.registered !== true ||
      declaration.connected !== false ||
      declaration.spawned !== false)
  ) {
    note("declaration-not-pending-readonly");
  }
  // No write-capable registration on any producer.
  for (const record of ofType("registration").concat(ofType("registration_declared"))) {
    if (record.policy !== "readonly") note(`unexpected-policy:${String(record.policy)}`);
  }
  const workerRegs = worker("registration").filter((r) => r.policy === "readonly");
  const connectedReg = workerRegs.find(
    (r) => r.registered === true && r.connected === true && r.spawned === true,
  );
  if (!connectedReg) note("connected-readonly-missing");
  const inventories = worker("first-request-inventory");
  if (
    !connectedReg ||
    !declaration ||
    inventories.length !== 1 ||
    declaration.seq >= connectedReg.seq ||
    inventories[0].seq >= connectedReg.seq
  ) {
    note("unverified-discovery-order");
  }

  // Fixture-origin observations: startup, protocol, tool list, final zero.
  const startups = fixture("fixture_startup");
  if (startups.length !== 1) note(`fixture-startups:${startups.length}`);
  else if (
    startups[0].sidecar !== false ||
    startups[0].binding !== false ||
    startups[0].ledger !== true
  )
    note("unexpected-fixture-profile");
  const protocols = fixture("protocol");
  const negotiated = protocols.length > 0 ? protocols[protocols.length - 1].negotiated : null;
  if (negotiated !== "2025-11-25") note(`protocol:${String(negotiated)}`);
  const expectedTools = [
    "search_exercises",
    "get_exercise",
    "list_workouts",
    "get_workout",
    "list_routines",
    "get_routine",
    "create_routine",
  ];
  const toolLists = fixture("tool_list");
  const listed = toolLists.length > 0 ? toolLists[toolLists.length - 1].tools : null;
  if (
    !Array.isArray(listed) ||
    listed.length !== 7 ||
    !expectedTools.every((t) => listed.includes(t))
  ) {
    note("tool-list-mismatch");
  }
  if (
    inventories.length !== 1 ||
    !Array.isArray(inventories[0].tools) ||
    inventories[0].tools.length !== 7 ||
    !expectedTools.every((tool) => inventories[0].tools.includes(tool))
  ) {
    note("inventory-mismatch");
  }
  const journalFinals = fixture("effect_ledger").filter((r) => r.final === true);
  if (journalFinals.length !== 1) note(`journal-finals:${journalFinals.length}`);
  else if (
    journalFinals[0].operationId !== null ||
    journalFinals[0].digest !== null ||
    journalFinals[0].counter !== 0 ||
    !Array.isArray(journalFinals[0].operations) ||
    journalFinals[0].operations.length !== 0
  )
    note("journal-final-invalid");
  if (fixture("effect_ledger").some((r) => r.final !== true)) note("unexpected-dispatch");

  // Independent owned-file ledger: exactly one final zero.
  let ledgerLines = [];
  try {
    if (!closeReceived || survivors) throw new Error("owned-resources-not-closed");
    if (statSync(ledgerFile).size > BUDGETS.traceBytes) throw new Error("ledger-budget-exceeded");
    const raw = readFileSync(ledgerFile, "utf8");
    if (!raw.endsWith("\n")) throw new Error("incomplete-ledger-record");
    ledgerLines = raw
      .slice(0, -1)
      .split("\n")
      .map((line) => {
        if (!line.startsWith("T02-LEDGER ")) throw new Error("invalid-ledger-record");
        return JSON.parse(line.slice("T02-LEDGER ".length));
      });
  } catch (err) {
    note(`ledger-unreadable:${err instanceof Error ? err.message : String(err)}`);
  }
  const ledgerFinals = ledgerLines.filter((r) => r.event === "final");
  const ledgerFinal = ledgerFinals.length === 1 ? ledgerFinals[0] : null;
  if (!ledgerFinal) note(`ledger-finals:${ledgerFinals.length}`);
  else if (
    ledgerFinal.operationId !== null ||
    ledgerFinal.digest !== null ||
    ledgerFinal.totalDispatches !== 0 ||
    !Array.isArray(ledgerFinal.operations) ||
    ledgerFinal.operations.length !== 0
  ) {
    note("ledger-nonzero");
  }

  // Native pipeline: one read success plus one genuine gate denial. Direct
  // parents stay null; the creation call carries its own actual operationId.
  const calls = worker("tool_call");
  const results = worker("tool_result");
  const readCall = calls.find((c) => c.name === "mcp__synth_gt__get_exercise");
  const createCall = calls.find((c) => c.name === "mcp__synth_gt__create_routine");
  if (calls.length !== 2 || !readCall || !createCall) note("pipeline-call-mismatch");
  if (results.length !== 2) note(`pipeline-result-count:${results.length}`);
  for (const call of calls) {
    if (typeof call.toolCallId !== "string" || call.toolCallId.length === 0)
      note("invalid-call-id");
    if (call.parentToolCallId !== null) note("non-direct-parent");
    const joined = results.filter((result) => result.toolCallId === call.toolCallId);
    if (joined.length !== 1 || joined[0].name !== call.name || call.seq >= joined[0].seq)
      note("invalid-pipeline-join");
  }
  if (createCall && createCall.operationId !== SEED_OPERATION_ID) note("call-operation-mismatch");
  const readResult = readCall ? results.find((r) => r.toolCallId === readCall.toolCallId) : null;
  const createResult = createCall
    ? results.find((r) => r.toolCallId === createCall.toolCallId)
    : null;
  if (!readResult || readResult.isError !== false) note("read-outcome-error");
  // Host gate denial: isError without a structured receiver code. Text alone
  // never classifies; the genuine gate event below must join the same ID.
  if (!createResult || createResult.isError !== true) note("creation-not-denied");
  else if (createResult.code !== null) note(`creation-code:${String(createResult.code)}`);
  else if (createResult.reason === "unknown-tool") note("creation-unavailable-not-connected");
  if (results.some((r) => r.code === "write_approval_required")) note("wrong-route-code");

  // Genuine companion gate denial joined to the exact native creation ID.
  const gates = companion("gate_invocation");
  if (gates.length !== 1) note(`gate-invocations:${gates.length}`);
  const gate = gates.length === 1 ? gates[0] : null;
  if (
    gate &&
    (gate.decision !== "deny" ||
      gate.reason !== "mode-not-tui:print" ||
      gate.mode !== "print" ||
      gate.hasUI !== false ||
      gate.operationId !== SEED_OPERATION_ID ||
      gate.attemptedDigest !== SEED_DIGEST ||
      gate.approvedDigest !== null ||
      !createCall ||
      gate.toolCallId !== createCall.toolCallId ||
      gate.parentToolCallId !== null)
  ) {
    note("gate-join-mismatch");
  }
  if (createCall && createCall.seq >= (gate?.seq ?? Number.POSITIVE_INFINITY))
    note("gate-order-mismatch");

  // Never enabled by this profile: approval stimulus, sidecar/listener
  // verdicts, receiver checks/dispatch, or gate allow decisions.
  const forbidden = shared.filter((r) =>
    ["approval_prompt", "sidecar_verdict", "receiver_check"].includes(r.type),
  );
  if (forbidden.length > 0) note(`forbidden-records:${forbidden.length}`);
  if (gates.some((r) => r.decision !== "deny")) note("gate-allow");

  // Actual print/no-UI context with a supported companion profile.
  const preflights = worker("preflight");
  if (!preflights.some((r) => r.supported === true)) note("preflight-unsupported");
  const contexts = worker("session-context");
  if (
    !contexts.some(
      (record) => record.mode === "print" && record.hasUI === false && record.uiInjected === false,
    )
  )
    note("invalid-context");
  if (ofType("binding_present").length !== 1) note("binding-presence-missing");

  const runtime = workerResult?.runtime ?? null;
  if (runtime) runtime.protocol = negotiated === "2025-11-25" ? "2025-11-25" : runtime.protocol;
  const effects =
    failures.length === 0 && ledgerFinal
      ? {
          source: "fixture",
          observation: "fixture-final",
          total: ledgerFinal.totalDispatches ?? 0,
          operations: (ledgerFinal.operations ?? []).map((o) => ({
            operationId: o.operationId ?? null,
            digest: o.digest ?? null,
            counter: o.dispatches ?? 0,
          })),
        }
      : { source: "none", observation: "unverified", total: null, operations: [] };

  const elapsed = Date.now() - started;
  const groupGone = !survivors;
  const workerCleanup = shared.find(
    (r) => r.producer === "sdk-worker" && r.type === "worker_cleanup",
  );
  const workerListenersClosed =
    workerCleanup?.listenersClosed === true && workerCleanup?.remainingListeners === 0;
  let rootsRemoved = false;
  let rootsRetained = false;
  const ready =
    failures.length === 0 &&
    closeReceived &&
    groupGone &&
    !stdoutTruncated &&
    !stderrTruncated &&
    workerResult?.completed === true &&
    workerListenersClosed &&
    runtime !== null;
  if (ready && exitInfo.code === 0 && !exitInfo.timeout && elapsed <= BUDGETS.scenarioMs) {
    rootsRemoved = cleanupRoots(roots);
  } else {
    rootsRetained = true;
    if (failures.length === 0) note("completion-conjunct-failed");
  }
  const completed = ready && rootsRemoved && !rootsRetained && exitInfo.code === 0;
  const trace = [
    ...shared,
    {
      seq: shared.length + 1,
      source: "launcher",
      type: "cleanup",
      layer: "sdk-pipeline",
      childrenGone: groupGone,
      listenersClosed: workerListenersClosed,
      rootsRemoved,
      rootsRetained,
      remainingChildren: groupGone ? 0 : 1,
      remainingListeners: workerCleanup?.remainingListeners ?? null,
    },
  ];
  const report = buildReport({
    scenario: scenarioName,
    harness,
    layer: scenario.layer,
    runtime,
    trace,
    effects,
    limits: {
      workerExit: exitInfo.code,
      workerSignal: exitInfo.signal,
      workerTimeout: exitInfo.timeout === true,
      closeReceived,
      spawnError: exitInfo.spawnError ?? null,
      stdoutTruncated,
      stderrTruncated,
      workerStderrTail: stderr.slice(-2000),
      sharedJournalRecords: shared.length,
      evidenceFailures: failures,
      scenarioMs: elapsed,
      scenarioBudgetMs: BUDGETS.scenarioMs,
      budgetExceeded: elapsed > BUDGETS.scenarioMs,
      strippedEnvVars: stripped.length,
      workerCompleted: workerResult?.completed === true,
      runtimeObserved: runtime !== null,
      rootsRemoved,
      rootsRetained,
    },
    completed,
  });
  const encoded = JSON.stringify(report);
  try {
    writeFileSync(outPath, `${encoded}\n`, { encoding: "utf8", mode: 0o600 });
  } catch (err) {
    process.stderr.write(
      `t02-driver: cannot write report: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
  process.stdout.write(`${encoded}\n`);
  if (!report.completed) process.exit(1);
}

async function assembleR2Report(ctx) {
  const {
    scenarioName,
    harness,
    scenario,
    roots,
    sharedJournalFile,
    ledgerFile,
    exitInfo,
    closeReceived,
    survivors,
    workerResult,
    stdoutTruncated,
    stderrTruncated,
    stderr,
    stripped,
    started,
    scenarioDeadlineMs,
    outPath,
  } = ctx;
  const failures = [];
  const note = (message) => failures.push(message);

  // Same explicit companion-enabled profile as R1; S2A default untouched.
  let shared = [];
  try {
    if (!closeReceived || survivors) throw new Error("owned-resources-not-closed");
    shared = readSharedJournal(sharedJournalFile, "direct-readonly");
  } catch (err) {
    note(`shared-journal:${err instanceof Error ? err.message : String(err)}`);
  }
  const ofType = (type, producer = null) =>
    shared.filter((r) => r.type === type && (producer === null || r.producer === producer));
  const companion = (type) => ofType(type, "companion");
  const worker = (type) => ofType(type, "sdk-worker");
  const fixture = (type) => ofType(type, "fixture");
  const expectedTools = [
    "search_exercises",
    "get_exercise",
    "list_workouts",
    "get_workout",
    "list_routines",
    "get_routine",
    "create_routine",
  ];
  const expectedQualified = expectedTools.map((t) => `mcp__synth_gt__${t}`);
  const outerName =
    scenarioName === "codemode-readonly"
      ? "codemode"
      : scenarioName === "nested-readonly"
        ? "t02_orchestrate"
        : null;
  const expectedFirstActive =
    scenarioName === "deferred-readonly"
      ? ["tool_search"]
      : scenarioName === "codemode-readonly"
        ? ["codemode"]
        : [...expectedQualified, "t02_orchestrate"];
  // Exact first-request callable tables from genuine loader behavior.
  const expectedFirstCallable =
    scenarioName === "nested-readonly" ? [...expectedQualified, "t02_orchestrate"] : [];
  // Exact connected tables per route. Hidden exposure stays empty.
  const expectedConnected =
    scenarioName === "deferred-readonly"
      ? { active: ["tool_search", ...expectedQualified], callable: [...expectedQualified] }
      : scenarioName === "codemode-readonly"
        ? { active: ["codemode"], callable: [...expectedQualified] }
        : {
            active: [...expectedQualified, "t02_orchestrate"],
            callable: [...expectedQualified, "t02_orchestrate"],
          };
  const sameSet = (actual, expected) =>
    Array.isArray(actual) &&
    actual.length === expected.length &&
    expected.every((n) => actual.includes(n)) &&
    actual.every((n) => expected.includes(n));
  const hasDuplicates = (list) => !Array.isArray(list) || new Set(list).size !== list.length;

  // Gate installation first, before every declaration/registration/surface/call.
  const installed = companion("gate_installed");
  if (installed.length !== 1) note(`gate-installed:${installed.length}`);
  else if (installed[0].handler !== "tool_call") note("gate-installed-handler");
  const laterRecords = shared.filter((r) =>
    [
      "registration",
      "registration_declared",
      "first-request-inventory",
      "tool_surface",
      "tool_call",
      "fixture_startup",
      "protocol",
      "tool_list",
    ].includes(r.type),
  );
  if (installed.length === 1 && laterRecords.some((r) => r.seq <= installed[0].seq)) {
    note("gate-installed-not-first");
  }

  // Pending declaration, never connected proof; no write-capable policy.
  const declared = companion("registration_declared");
  if (declared.length !== 1) note(`registration-declared:${declared.length}`);
  const declaration = declared.length === 1 ? declared[0] : null;
  if (
    declaration &&
    (declaration.server !== "synth-gt" ||
      declaration.policy !== "readonly" ||
      declaration.registered !== true ||
      declaration.connected !== false ||
      declaration.spawned !== false)
  ) {
    note("declaration-not-pending-readonly");
  }
  for (const record of ofType("registration").concat(ofType("registration_declared"))) {
    if (record.policy !== "readonly") note(`unexpected-policy:${String(record.policy)}`);
  }

  // Exact phase surfaces: one first-request with the fixed loadout set, one
  // connected with seven available fixture tools. Duplicates invalid.
  const surfaces = worker("tool_surface");
  const firstSurfaces = surfaces.filter((r) => r.phase === "first-request");
  const connectedSurfaces = surfaces.filter((r) => r.phase === "connected");
  if (firstSurfaces.length !== 1) note(`first-surfaces:${firstSurfaces.length}`);
  if (connectedSurfaces.length !== 1) note(`connected-surfaces:${connectedSurfaces.length}`);
  const firstSurface = firstSurfaces.length === 1 ? firstSurfaces[0] : null;
  const connectedSurface = connectedSurfaces.length === 1 ? connectedSurfaces[0] : null;
  if (firstSurface && !sameSet(firstSurface.activeTools, expectedFirstActive)) {
    note(`first-active-mismatch:[${(firstSurface.activeTools ?? []).join(",")}]`);
  }
  if (firstSurface && !sameSet(firstSurface.callableTools, expectedFirstCallable)) {
    note(`first-callable-mismatch:[${(firstSurface.callableTools ?? []).join(",")}]`);
  }
  if (firstSurface && !sameSet(firstSurface.hiddenTools, [])) {
    note(`first-hidden-nonempty:[${(firstSurface.hiddenTools ?? []).join(",")}]`);
  }
  // fixtureTools observes the allowed actual fixture subset: it must match
  // the callable-derived subset exactly, never forced empty or invented.
  if (firstSurface) {
    const derivedFixture = (firstSurface.callableTools ?? [])
      .filter((n) => n.startsWith("mcp__synth_gt__"))
      .map((n) => n.slice("mcp__synth_gt__".length));
    if (
      !sameSet(firstSurface.fixtureTools, derivedFixture) ||
      !derivedFixture.every((t) => expectedTools.includes(t))
    ) {
      note(`first-fixture-mismatch:[${(firstSurface.fixtureTools ?? []).join(",")}]`);
    }
  }
  for (const surface of [firstSurface, connectedSurface]) {
    if (!surface) continue;
    for (const key of ["activeTools", "callableTools", "hiddenTools"]) {
      if (hasDuplicates(surface[key])) note(`surface-duplicates:${String(surface.phase)}:${key}`);
    }
  }
  if (connectedSurface) {
    if (!sameSet(connectedSurface.activeTools, expectedConnected.active)) {
      note(`connected-active-mismatch:[${(connectedSurface.activeTools ?? []).join(",")}]`);
    }
    if (!sameSet(connectedSurface.callableTools, expectedConnected.callable)) {
      note(`connected-callable-mismatch:[${(connectedSurface.callableTools ?? []).join(",")}]`);
    }
    if (!sameSet(connectedSurface.hiddenTools, [])) {
      note(`connected-hidden-nonempty:[${(connectedSurface.hiddenTools ?? []).join(",")}]`);
    }
    if (!sameSet(connectedSurface.fixtureTools, expectedTools)) {
      note(`connected-fixture-mismatch:[${(connectedSurface.fixtureTools ?? []).join(",")}]`);
    }
  }

  // Same-record connected registration after the connected surface.
  const connectedRegs = worker("registration").filter(
    (r) =>
      r.policy === "readonly" &&
      r.registered === true &&
      r.connected === true &&
      r.spawned === true,
  );
  if (connectedRegs.length !== 1) note(`connected-registrations:${connectedRegs.length}`);
  const connectedReg = connectedRegs.length === 1 ? connectedRegs[0] : null;
  if (
    !connectedReg ||
    !declaration ||
    !connectedSurface ||
    declaration.seq >= connectedSurface.seq ||
    connectedSurface.seq >= connectedReg.seq
  ) {
    note("unverified-discovery-order");
  }
  // R2 prebind warning review: actual loader warnings recorded empty.
  const inventories = worker("resource_inventory");
  if (!inventories.some((r) => Array.isArray(r.loaderWarnings) && r.loaderWarnings.length === 0)) {
    note("loader-warnings-unverified");
  }

  // Fixture-origin discovery and exactly-one null-field final zero.
  const startups = fixture("fixture_startup");
  if (startups.length !== 1) note(`fixture-startups:${startups.length}`);
  else if (
    startups[0].sidecar !== false ||
    startups[0].binding !== false ||
    startups[0].ledger !== true
  )
    note("unexpected-fixture-profile");
  const protocols = fixture("protocol");
  const negotiated = protocols.length > 0 ? protocols[protocols.length - 1].negotiated : null;
  if (negotiated !== "2025-11-25") note(`protocol:${String(negotiated)}`);
  const toolLists = fixture("tool_list");
  const listed = toolLists.length > 0 ? toolLists[toolLists.length - 1].tools : null;
  if (!sameSet(listed, expectedTools)) note("tool-list-mismatch");
  // Fixture tool_list precedes the connected surface.
  const lastToolList = toolLists.length > 0 ? toolLists[toolLists.length - 1] : null;
  if (connectedSurface && lastToolList && !(lastToolList.seq < connectedSurface.seq)) {
    note("discovery-before-surface");
  }
  const journalFinals = fixture("effect_ledger").filter((r) => r.final === true);
  if (journalFinals.length !== 1) note(`journal-finals:${journalFinals.length}`);
  else if (
    journalFinals[0].operationId !== null ||
    journalFinals[0].digest !== null ||
    journalFinals[0].counter !== 0 ||
    !Array.isArray(journalFinals[0].operations) ||
    journalFinals[0].operations.length !== 0
  )
    note("journal-final-invalid");
  if (fixture("effect_ledger").some((r) => r.final !== true)) note("unexpected-dispatch");

  let ledgerLines = [];
  try {
    if (!closeReceived || survivors) throw new Error("owned-resources-not-closed");
    if (statSync(ledgerFile).size > BUDGETS.traceBytes) throw new Error("ledger-budget-exceeded");
    const raw = readFileSync(ledgerFile, "utf8");
    if (!raw.endsWith("\n")) throw new Error("incomplete-ledger-record");
    ledgerLines = raw
      .slice(0, -1)
      .split("\n")
      .map((line) => {
        if (!line.startsWith("T02-LEDGER ")) throw new Error("invalid-ledger-record");
        return JSON.parse(line.slice("T02-LEDGER ".length));
      });
  } catch (err) {
    note(`ledger-unreadable:${err instanceof Error ? err.message : String(err)}`);
  }
  const ledgerFinals = ledgerLines.filter((r) => r.event === "final");
  const ledgerFinal = ledgerFinals.length === 1 ? ledgerFinals[0] : null;
  if (!ledgerFinal) note(`ledger-finals:${ledgerFinals.length}`);
  else if (
    ledgerFinal.operationId !== null ||
    ledgerFinal.digest !== null ||
    ledgerFinal.totalDispatches !== 0 ||
    !Array.isArray(ledgerFinal.operations) ||
    ledgerFinal.operations.length !== 0
  ) {
    note("ledger-nonzero");
  }

  // Native endpoints per route with joined IDs/parents/results.
  const calls = worker("tool_call");
  const results = worker("tool_result");
  const callById = new Map(calls.map((c) => [c.toolCallId, c]));
  const resultById = new Map(results.map((r) => [r.toolCallId, r]));
  if (calls.length !== 3 || results.length !== 3 || callById.size !== 3) {
    note("pipeline-count-mismatch");
  }
  for (const call of calls) {
    if (typeof call.toolCallId !== "string" || call.toolCallId.length === 0)
      note("invalid-call-id");
    // Every endpoint joins native source/name/parent/unique-ID observations.
    if (call.source !== "pi") note("non-native-call-source");
    const joined = resultById.get(call.toolCallId);
    if (!joined || joined.name !== call.name || call.seq >= joined.seq)
      note("invalid-pipeline-join");
    if (joined && joined.source !== "pi") note("non-native-result-source");
    if (joined && joined.parentToolCallId !== call.parentToolCallId) note("parent-join-mismatch");
  }
  const readCall = calls.find((c) => c.name === "mcp__synth_gt__get_exercise");
  const createCall = calls.find((c) => c.name === "mcp__synth_gt__create_routine");
  const readResult = readCall ? resultById.get(readCall.toolCallId) : null;
  const createResult = createCall ? resultById.get(createCall.toolCallId) : null;
  if (!readCall || !createCall) note("pipeline-call-mismatch");
  if (createCall && createCall.operationId !== SEED_OPERATION_ID) note("call-operation-mismatch");
  if (!readResult || readResult.isError !== false || readResult.code !== null)
    note("read-outcome-error");
  if (!createResult || createResult.isError !== true) note("creation-not-denied");
  else if (createResult.code !== null) note(`creation-code:${String(createResult.code)}`);
  else if (createResult.reason === "unknown-tool") note("creation-unavailable-not-connected");
  if (results.some((r) => r.code === "write_approval_required")) note("wrong-route-code");
  // Connected registration precedes creation; the read result precedes it.
  if (connectedReg && createCall && !(connectedReg.seq < createCall.seq)) {
    note("reg-before-creation");
  }
  if (readResult && createCall && !(readResult.seq < createCall.seq)) {
    note("read-before-creation");
  }

  if (scenarioName === "deferred-readonly") {
    const searchCall = calls.find((c) => c.name === "tool_search");
    const searchResult = searchCall ? resultById.get(searchCall.toolCallId) : null;
    if (!searchCall || !searchResult) note("search-endpoint-missing");
    else if (searchResult.isError !== false) note("search-not-loaded");
    for (const call of calls) {
      if (call.parentToolCallId !== null) note("non-direct-parent");
    }
    if (
      searchCall &&
      readCall &&
      createCall &&
      !(searchCall.seq < readCall.seq && readCall.seq < createCall.seq)
    ) {
      note("deferred-call-order");
    }
    // The actual search ID joins seven actually loaded tools.
    const loaded = worker("search_loaded");
    if (loaded.length !== 1) note(`search-loaded:${loaded.length}`);
    else if (
      !searchCall ||
      loaded[0].toolCallId !== searchCall.toolCallId ||
      !sameSet(loaded[0].loadedTools, expectedQualified)
    ) {
      note("search-loaded-mismatch");
    }
    const searchEnd = searchCall ? resultById.get(searchCall.toolCallId) : null;
    if (
      connectedSurface &&
      searchEnd &&
      connectedReg &&
      !(searchEnd.seq < connectedSurface.seq && connectedSurface.seq < connectedReg.seq)
    ) {
      note("deferred-discovery-order");
    }
    // Search result and search_loaded precede the read call.
    const loadedRecord = loaded.length === 1 ? loaded[0] : null;
    if (
      searchEnd &&
      readCall &&
      loadedRecord &&
      !(searchEnd.seq < readCall.seq && loadedRecord.seq < readCall.seq)
    ) {
      note("search-before-read");
    }
  } else if (outerName) {
    const outerCall = calls.find((c) => c.name === outerName);
    const outerResult = outerCall ? resultById.get(outerCall.toolCallId) : null;
    if (!outerCall || !outerResult) note("outer-endpoint-missing");
    const children =
      outerCall != null ? calls.filter((c) => c.parentToolCallId === outerCall.toolCallId) : [];
    if (
      !outerCall ||
      outerCall.parentToolCallId !== null ||
      children.length !== 2 ||
      !children.some((c) => c.toolCallId === readCall?.toolCallId) ||
      !children.some((c) => c.toolCallId === createCall?.toolCallId)
    ) {
      note("inner-endpoint-mismatch");
    }
    // Outer causal bounds enclose the nested read then creation.
    if (
      outerCall &&
      readCall &&
      createCall &&
      outerResult &&
      readResult &&
      createResult &&
      !(
        outerCall.seq < readCall.seq &&
        readCall.seq < readResult.seq &&
        readResult.seq < createCall.seq &&
        createCall.seq < createResult.seq &&
        createResult.seq < outerResult.seq
      )
    ) {
      note("outer-causal-bounds");
    }
    // Codemode connected surface is captured at inner read start, after the
    // read call is observed. Nested captures both surfaces up front at first
    // request after direct discovery, so only declaration/surface/
    // registration order applies there (checked above).
    if (
      scenarioName === "codemode-readonly" &&
      connectedSurface &&
      readCall &&
      connectedReg &&
      !(readCall.seq < connectedSurface.seq && connectedSurface.seq < connectedReg.seq)
    ) {
      note("connected-discovery-order");
    }
  }

  // Genuine gate denial joined to the exact creation ID and parent.
  const gates = companion("gate_invocation");
  if (gates.length !== 1) note(`gate-invocations:${gates.length}`);
  const gate = gates.length === 1 ? gates[0] : null;
  const expectedGateParent = scenarioName === "deferred-readonly" ? null : "outer";
  const outerCallId =
    expectedGateParent === "outer"
      ? (calls.find((c) => c.name === outerName)?.toolCallId ?? null)
      : null;
  if (
    gate &&
    (gate.decision !== "deny" ||
      gate.reason !== "mode-not-tui:print" ||
      gate.mode !== "print" ||
      gate.hasUI !== false ||
      gate.operationId !== SEED_OPERATION_ID ||
      gate.attemptedDigest !== SEED_DIGEST ||
      gate.approvedDigest !== null ||
      !createCall ||
      gate.toolCallId !== createCall.toolCallId ||
      (expectedGateParent === null
        ? gate.parentToolCallId !== null
        : gate.parentToolCallId !== outerCallId) ||
      gate.parentToolCallId === undefined)
  ) {
    note("gate-join-mismatch");
  }
  if (
    createCall &&
    createResult &&
    !(createCall.seq < (gate?.seq ?? -1) && gate.seq < createResult.seq)
  )
    note("gate-order-mismatch");

  // Never enabled by these profiles.
  const forbidden = shared.filter((r) =>
    ["approval_prompt", "sidecar_verdict", "receiver_check"].includes(r.type),
  );
  if (forbidden.length > 0) note(`forbidden-records:${forbidden.length}`);
  if (gates.some((r) => r.decision !== "deny")) note("gate-allow");

  // Actual print/no-UI context with a supported companion profile.
  const preflights = worker("preflight");
  if (!preflights.some((r) => r.supported === true)) note("preflight-unsupported");
  const contexts = worker("session-context");
  if (
    !contexts.some(
      (record) => record.mode === "print" && record.hasUI === false && record.uiInjected === false,
    )
  )
    note("invalid-context");
  if (ofType("binding_present").length !== 1) note("binding-presence-missing");

  const runtime = workerResult?.runtime ?? null;
  if (runtime) runtime.protocol = negotiated === "2025-11-25" ? "2025-11-25" : runtime.protocol;
  const effects =
    failures.length === 0 && ledgerFinal
      ? {
          source: "fixture",
          observation: "fixture-final",
          total: ledgerFinal.totalDispatches ?? 0,
          operations: (ledgerFinal.operations ?? []).map((o) => ({
            operationId: o.operationId ?? null,
            digest: o.digest ?? null,
            counter: o.dispatches ?? 0,
          })),
        }
      : { source: "none", observation: "unverified", total: null, operations: [] };

  const elapsed = Date.now() - started;
  const groupGone = !survivors;
  const workerCleanup = shared.find(
    (r) => r.producer === "sdk-worker" && r.type === "worker_cleanup",
  );
  const workerListenersClosed =
    workerCleanup?.listenersClosed === true && workerCleanup?.remainingListeners === 0;
  let rootsRemoved = false;
  let rootsRetained = false;
  const ready =
    failures.length === 0 &&
    closeReceived &&
    groupGone &&
    !stdoutTruncated &&
    !stderrTruncated &&
    workerResult?.completed === true &&
    workerListenersClosed &&
    runtime !== null;
  if (ready && exitInfo.code === 0 && !exitInfo.timeout && elapsed <= scenarioDeadlineMs) {
    rootsRemoved = cleanupRoots(roots);
  } else {
    rootsRetained = true;
    if (failures.length === 0) note("completion-conjunct-failed");
  }
  const completed = ready && rootsRemoved && !rootsRetained && exitInfo.code === 0;
  const trace = [
    ...shared,
    {
      seq: shared.length + 1,
      source: "launcher",
      type: "cleanup",
      layer: "sdk-pipeline",
      childrenGone: groupGone,
      listenersClosed: workerListenersClosed,
      rootsRemoved,
      rootsRetained,
      remainingChildren: groupGone ? 0 : 1,
      remainingListeners: workerCleanup?.remainingListeners ?? null,
    },
  ];
  const report = buildReport({
    scenario: scenarioName,
    harness,
    layer: scenario.layer,
    runtime,
    trace,
    effects,
    limits: {
      workerExit: exitInfo.code,
      workerSignal: exitInfo.signal,
      workerTimeout: exitInfo.timeout === true,
      closeReceived,
      spawnError: exitInfo.spawnError ?? null,
      stdoutTruncated,
      stderrTruncated,
      workerStderrTail: stderr.slice(-2000),
      sharedJournalRecords: shared.length,
      evidenceFailures: failures,
      scenarioMs: elapsed,
      scenarioBudgetMs: scenarioDeadlineMs,
      budgetExceeded: elapsed > scenarioDeadlineMs,
      strippedEnvVars: stripped.length,
      workerCompleted: workerResult?.completed === true,
      runtimeObserved: runtime !== null,
      rootsRemoved,
      rootsRetained,
    },
    completed,
  });
  const encoded = JSON.stringify(report);
  try {
    writeFileSync(outPath, `${encoded}\n`, { encoding: "utf8", mode: 0o600 });
  } catch (err) {
    process.stderr.write(
      `t02-driver: cannot write report: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
  process.stdout.write(`${encoded}\n`);
  if (!report.completed) process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`t02-driver: fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
