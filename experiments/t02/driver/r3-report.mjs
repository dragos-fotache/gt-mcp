/**
 * T02 R3 parent report assembly (bounded SDK preflight / binding / hidden).
 *
 * Validates §14 observations, causal order and real ID joins independently
 * of the worker result. Absent-nine profiles require no fixture record or
 * ledger, no registration declaration, gate invocation/approval/sidecar/
 * receiver/guarded capability, zero native transports and an actual
 * unavailable attempt. Hidden requires actual listing/surfaces/read/
 * unavailable create/final0. No positive intermediate effects, no nullable
 * omitted-field equivalence.
 *
 * All missing/unexpected fields, cleanup uncertainty, oversized/malformed
 * journal, failed probe/output/run => completed:false with unverified
 * effects, never a false zero. On a healthy observed denial exit0 is not
 * the QA verdict. Root/stdout/out contract matches the other assemblies.
 */

import { readFileSync, writeFileSync, statSync } from "node:fs";
import { buildReport, BUDGETS } from "./report.mjs";
import { readSharedJournal } from "./event-journal.mjs";
import { SEED_DIGEST, SEED_OPERATION_ID } from "./scenarios.mjs";
import { cleanupRoots } from "./roots.mjs";

const EXPECTED_REASON = {
  "static-shadow": "static-shadow",
  "normalized-collision": "normalized-collision",
  "normalized-collision-reversed": "normalized-collision",
  "replacement-mcp": "replacement-mcp",
  "replacement-codemode": "replacement-codemode",
  "missing-mcp": "missing-mcp",
  "unsupported-inventory": "unsupported-inventory",
  "binding-missing": "binding-missing",
  "binding-ambiguous": "binding-ambiguous",
  "hidden-tool": "profile-ok",
};
const EXPECTED_TOOLS = [
  "search_exercises",
  "get_exercise",
  "list_workouts",
  "get_workout",
  "list_routines",
  "get_routine",
  "create_routine",
];
const READ_TOOLS = EXPECTED_TOOLS.filter((t) => t !== "create_routine");
const PREFIX = "mcp__synth_gt__";
const CREATE_TOOL = `${PREFIX}create_routine`;
const READ_TOOL = `${PREFIX}get_exercise`;

const sameSet = (actual, expected) =>
  Array.isArray(actual) &&
  actual.length === expected.length &&
  expected.every((n) => actual.includes(n)) &&
  actual.every((n) => expected.includes(n));

export async function assembleR3Report(ctx) {
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
  const isHidden = scenarioName === "hidden-tool";
  const expectedReason = EXPECTED_REASON[scenarioName];

  let shared = [];
  try {
    if (!closeReceived || survivors) throw new Error("owned-resources-not-closed");
    shared = readSharedJournal(sharedJournalFile, "direct-readonly");
  } catch (err) {
    note(`shared-journal:${err instanceof Error ? err.message : String(err)}`);
  }
  const ofType = (type, producer = null) =>
    shared.filter((r) => r.type === type && (producer === null || r.producer === producer));
  const worker = (type) => ofType(type, "sdk-worker");
  const companion = (type) => ofType(type, "companion");
  const fixture = (type) => ofType(type, "fixture");

  // Companion gate installation exactly once (factory load); per-call gate
  // invocations, approvals, sidecar verdicts and receiver checks are never
  // enabled by any R3 profile.
  const installed = companion("gate_installed");
  if (installed.length !== 1) note(`gate-installed:${installed.length}`);
  else if (installed[0].handler !== "tool_call") note("gate-installed-handler");
  if (companion("gate_invocation").length !== 0) note("unexpected-gate-invocation");
  const forbiddenCompanion = shared.filter(
    (r) =>
      r.producer === "companion" &&
      !["gate_installed", "session", "registration", "registration_declared"].includes(r.type),
  );
  if (forbiddenCompanion.length > 0) note(`forbidden-companion:${forbiddenCompanion.length}`);
  if (
    shared.some((r) => ["approval_prompt", "sidecar_verdict", "receiver_check"].includes(r.type))
  ) {
    note("forbidden-channel-records");
  }
  // No write-capable or guarded registration anywhere in R3.
  for (const record of ofType("registration").concat(ofType("registration_declared"))) {
    if (record.policy !== "readonly" && record.policy !== "none") {
      note(`unexpected-policy:${String(record.policy)}`);
    }
  }

  // Target evidence triple + prebind decision.
  const inventories = worker("resource_inventory").filter((r) => r.runtimeRole === "target");
  if (inventories.length !== 1) note(`target-inventories:${inventories.length}`);
  const inventory = inventories.length === 1 ? inventories[0] : null;
  if (inventory) {
    if (inventory.inventoryProvenance !== "actual-sdk-loader") note("target-inventory-provenance");
    if (!Array.isArray(inventory.inlineProfiles) || inventory.inlineProfiles.length === 0) {
      note("target-inventory-empty");
    }
    for (const entry of inventory.inlineProfiles ?? []) {
      for (const key of ["path", "handlers", "tools", "commands", "replaceable"]) {
        if (!(key in Object(entry))) note(`target-inventory-field:${key}`);
      }
      if (typeof entry.replaceable !== "boolean") note("target-inventory-replaceable");
    }
    if (!Array.isArray(inventory.loaderErrors) || inventory.loaderErrors.length !== 0) {
      note("target-loader-errors");
    }
    if (!Array.isArray(inventory.loaderWarnings) || inventory.loaderWarnings.length !== 0) {
      note("target-loader-warnings");
    }
  }
  const statics = worker("static_settings").filter((r) => r.runtimeRole === "target");
  if (statics.length !== 1) note(`static-settings:${statics.length}`);
  const staticRec = statics.length === 1 ? statics[0] : null;
  if (staticRec) {
    if (staticRec.settingsProvenance !== "launcher-owned-loadConfig") {
      note("static-provenance");
    }
    if (!Array.isArray(staticRec.names) || !Array.isArray(staticRec.entries)) {
      note("static-shape");
    } else if (staticRec.names.length !== staticRec.entries.length) {
      note("static-names-entries");
    } else {
      for (let i = 0; i < staticRec.names.length; i += 1) {
        const entry = staticRec.entries[i];
        if (entry.name !== staticRec.names[i]) note("static-order");
        if (!["synth-gt", "synth_gt"].includes(entry.name))
          note(`static-name:${String(entry.name)}`);
        if (entry.namespace !== "mcp__synth_gt") note("static-namespace");
        if (entry.enabled !== true || entry.exposure !== "direct") note("static-descriptor");
        if (entry.resourceAlias !== "fixture:t02" || entry.policy !== "readonly") {
          note("static-alias-policy");
        }
      }
    }
  }
  const bindings = worker("binding_check").filter((r) => r.runtimeRole === "target");
  if (bindings.length !== 1) note(`binding-checks:${bindings.length}`);
  const binding = bindings.length === 1 ? bindings[0] : null;
  if (binding) {
    const expectedBinding =
      scenarioName === "binding-missing"
        ? { present: false, candidateCount: 0, valid: false, reason: "binding-missing" }
        : scenarioName === "binding-ambiguous"
          ? { present: true, candidateCount: 2, valid: false, reason: "binding-ambiguous" }
          : { present: true, candidateCount: 1, valid: true, reason: "binding-ok" };
    if (
      binding.present !== expectedBinding.present ||
      binding.candidateCount !== expectedBinding.candidateCount ||
      binding.valid !== expectedBinding.valid ||
      binding.reason !== expectedBinding.reason
    ) {
      note("binding-mismatch");
    }
    if ("tuple" in Object(binding) || "filename" in Object(binding)) note("binding-leak");
  }
  const prebinds = worker("prebind_check").filter((r) => r.runtimeRole === "target");
  if (prebinds.length !== 1) note(`prebind-checks:${prebinds.length}`);
  const prebind = prebinds.length === 1 ? prebinds[0] : null;
  if (prebind) {
    if (prebind.supported !== (isHidden ? true : false)) note("prebind-supported");
    if (prebind.reason !== expectedReason) note(`prebind-reason:${String(prebind.reason)}`);
    if (prebind.targetBound !== false) note("prebind-bound");
    if (prebind.targetLoadConfigCalls !== 0) note("prebind-loadconfig");
    if (prebind.targetTransportAttempts !== 0) note("prebind-transports");
    if (!Array.isArray(prebind.registrations) || prebind.registrations.length !== 0) {
      note("prebind-registrations");
    }
  }
  // Static/binding/inventory evidence precedes the joined prebind decision.
  if (inventory && staticRec && binding && prebind) {
    if (!(
      inventory.seq < prebind.seq &&
      staticRec.seq < prebind.seq &&
      binding.seq < prebind.seq
    )) {
      note("prebind-evidence-order");
    }
  }

  if (!isHidden) {
    await validateRefused({
      note,
      worker,
      companion,
      fixture,
      ledgerFile,
      closeReceived,
      survivors,
      prebind,
      expectedReason,
    });
  } else {
    await validateHidden({
      note,
      worker,
      companion,
      fixture,
      ledgerFile,
      closeReceived,
      survivors,
      prebind,
    });
  }

  const runtime = workerResult?.runtime ?? null;
  const ledgerFinal = readLedgerFinal({ ledgerFile, closeReceived, survivors, note, isHidden });
  let effects;
  if (isHidden) {
    effects =
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
  } else {
    effects =
      failures.length === 0 && ledgerFinal === null
        ? { source: "none", observation: "not-spawned", total: 0, operations: [] }
        : { source: "none", observation: "unverified", total: null, operations: [] };
  }

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

async function validateRefused({
  note,
  worker,
  companion,
  fixture,
  ledgerFile,
  closeReceived,
  survivors,
  prebind,
  expectedReason,
}) {
  // Exactly one awaited target disposal after the prebind decision.
  const disposed = worker("target_disposed").filter((r) => r.runtimeRole === "target");
  if (disposed.length !== 1) note(`target-disposed:${disposed.length}`);
  if (disposed.length === 1) {
    if (disposed[0].shutdownObserved !== true || disposed[0].targetBound !== false) {
      note("target-disposed-fields");
    }
    if (prebind && !(prebind.seq < disposed[0].seq)) note("prebind-dispose-order");
  }
  // No fixture-origin record or ledger for a process that did not exist.
  if (
    fixture("fixture_startup").length > 0 ||
    fixture("tool_list").length > 0 ||
    fixture("protocol").length > 0 ||
    fixture("effect_ledger").length > 0 ||
    fixture("receiver_check").length > 0
  ) {
    note("unexpected-fixture-record");
  }
  void ledgerFile;
  void closeReceived;
  void survivors;
  if (companion("registration").length !== 0) note("unexpected-target-registration");
  if (companion("registration_declared").length !== 0) note("unexpected-declaration");
  // Separately labeled refusal-probe inventory; never the target's.
  const probeInventories = worker("resource_inventory").filter(
    (r) => r.runtimeRole === "refusal-probe",
  );
  if (probeInventories.length !== 1) note(`probe-inventories:${probeInventories.length}`);
  // Probe context + summary carry the same specific target reason.
  const contexts = worker("session-context").filter((r) => r.runtimeRole === "refusal-probe");
  if (contexts.length !== 1) note(`probe-contexts:${contexts.length}`);
  const context = contexts.length === 1 ? contexts[0] : null;
  if (context) {
    if (context.mode !== "print" || context.hasUI !== false || context.uiInjected !== false) {
      note("probe-context-mode");
    }
    if (!Array.isArray(context.registrations) || context.registrations.length !== 0) {
      note("probe-context-registrations");
    }
  }
  const preflights = worker("preflight").filter((r) => r.runtimeRole === "refusal-probe");
  if (preflights.length !== 1) note(`probe-preflights:${preflights.length}`);
  const preflight = preflights.length === 1 ? preflights[0] : null;
  if (preflight) {
    if (
      preflight.mode !== "print" ||
      preflight.hasUI !== false ||
      preflight.uiInjected !== false ||
      preflight.supported !== false ||
      preflight.reason !== expectedReason ||
      preflight.targetBound !== false ||
      preflight.inventoryProvenance !== "actual-sdk-loader"
    ) {
      note("probe-preflight-fields");
    }
  }
  // Same-record absence-only registration before the attempt, backed by the
  // actual empty-config callback count and zero transport attempts.
  const regs = worker("registration").filter((r) => r.runtimeRole === "refusal-probe");
  if (regs.length !== 1) note(`probe-registrations:${regs.length}`);
  const reg = regs.length === 1 ? regs[0] : null;
  if (reg) {
    if (
      reg.server !== "synth-gt" ||
      reg.policy !== "none" ||
      reg.registered !== false ||
      reg.connected !== false ||
      reg.spawned !== false
    ) {
      note("probe-registration-fields");
    }
    if (
      typeof reg.loadConfigCalls !== "number" ||
      !Number.isInteger(reg.loadConfigCalls) ||
      reg.loadConfigCalls < 1
    ) {
      note("probe-loadconfig-count");
    }
    if (reg.transportAttempts !== 0) note("probe-transports");
  }
  // Exactly one actual native creation attempt joined to its unknown-tool
  // result; no gate event substitutes for it.
  const calls = worker("tool_call");
  const results = worker("tool_result");
  if (calls.length !== 1 || results.length !== 1) note("probe-pipeline-count");
  const call = calls.length === 1 ? calls[0] : null;
  const result = results.length === 1 ? results[0] : null;
  if (call) {
    if (call.name !== CREATE_TOOL) note(`probe-call-name:${String(call.name)}`);
    if (typeof call.toolCallId !== "string" || call.toolCallId.length === 0) {
      note("probe-call-id");
    }
    if (call.parentToolCallId !== null) note("probe-call-parent");
    if (call.source !== "pi") note("probe-call-source");
  }
  if (result) {
    if (
      !call ||
      result.toolCallId !== call.toolCallId ||
      result.name !== CREATE_TOOL ||
      result.parentToolCallId !== call.parentToolCallId
    ) {
      note("probe-result-join");
    }
    if (result.isError !== true || result.code !== null || result.reason !== "unknown-tool") {
      note("probe-result-outcome");
    }
    if (result.source !== "pi") note("probe-result-source");
  }
  if (call && result && !(call.seq < result.seq)) note("probe-call-order");
  if (reg && call && !(reg.seq < call.seq)) note("probe-reg-before-call");
  if (disposed.length === 1 && preflight && !(disposed[0].seq < preflight.seq)) {
    note("dispose-probe-order");
  }
  if (context && preflight && !(context.seq <= preflight.seq)) note("probe-context-order");
  // Zero native transports anywhere; no invented guarded capability.
  if (worker("mcp-transport-attempt").length !== 0) note("unexpected-transports");
}

async function validateHidden({
  note,
  worker,
  companion,
  fixture,
  ledgerFile,
  closeReceived,
  survivors,
  prebind,
}) {
  void ledgerFile;
  void closeReceived;
  void survivors;
  void prebind;
  // Hidden target binds print/no-UI with a supported readonly profile.
  const preflights = worker("preflight").filter(
    (r) => !("runtimeRole" in Object(r)) || r.runtimeRole !== "refusal-probe",
  );
  const hiddenPreflight = preflights.find((r) => r.reason === "hidden-readonly-profile");
  if (!hiddenPreflight) note("hidden-preflight-missing");
  else if (
    hiddenPreflight.mode !== "print" ||
    hiddenPreflight.hasUI !== false ||
    hiddenPreflight.uiInjected !== false ||
    hiddenPreflight.supported !== true
  ) {
    note("hidden-preflight-fields");
  }
  // Exactly one first-request and one connected surface: six reads
  // active/callable, create hidden, six unqualified fixture tools.
  const surfaces = worker("tool_surface");
  const first = surfaces.filter((r) => r.phase === "first-request");
  const connected = surfaces.filter((r) => r.phase === "connected");
  if (first.length !== 1) note(`hidden-first-surfaces:${first.length}`);
  if (connected.length !== 1) note(`hidden-connected-surfaces:${connected.length}`);
  const expectedActive = READ_TOOLS.map((t) => `${PREFIX}${t}`);
  for (const surface of [...first, ...connected]) {
    if (!sameSet(surface.activeTools, expectedActive)) note(`hidden-active:${surface.phase}`);
    if (!sameSet(surface.callableTools, expectedActive)) note(`hidden-callable:${surface.phase}`);
    if (!sameSet(surface.hiddenTools, [CREATE_TOOL])) note(`hidden-hidden:${surface.phase}`);
    if (!sameSet(surface.fixtureTools, READ_TOOLS)) note(`hidden-fixture-tools:${surface.phase}`);
  }
  // Same-record readonly connected registration after actual discovery and
  // before calls — never inferred from omission.
  const regs = worker("registration").filter((r) => r.policy === "readonly");
  const connectedReg = regs.find(
    (r) => r.registered === true && r.connected === true && r.spawned === true,
  );
  if (!connectedReg) note("hidden-registration-missing");
  // Fixture-origin discovery advertises all seven tools; negotiated
  // protocol replaces the candidate string; exactly-one final zero.
  const toolLists = fixture("tool_list");
  const listed = toolLists.length > 0 ? toolLists[toolLists.length - 1].tools : null;
  if (!sameSet(listed, EXPECTED_TOOLS)) note("hidden-tool-list");
  const protocols = fixture("protocol");
  const negotiated = protocols.length > 0 ? protocols[protocols.length - 1].negotiated : null;
  if (negotiated !== "2025-11-25") note(`hidden-protocol:${String(negotiated)}`);
  const finals = fixture("effect_ledger").filter((r) => r.final === true);
  if (finals.length !== 1) note(`hidden-finals:${finals.length}`);
  else if (
    finals[0].operationId !== null ||
    finals[0].digest !== null ||
    finals[0].counter !== 0 ||
    !Array.isArray(finals[0].operations) ||
    finals[0].operations.length !== 0 ||
    finals[0].source !== "fixture"
  ) {
    note("hidden-final-invalid");
  }
  if (fixture("effect_ledger").some((r) => r.final !== true)) note("hidden-dispatch");
  // Exactly two native direct null-parent calls/results: successful read
  // followed by the unavailable hidden creation.
  const calls = worker("tool_call");
  const results = worker("tool_result");
  if (calls.length !== 2 || results.length !== 2) note("hidden-pipeline-count");
  const readCall = calls.find((c) => c.name === READ_TOOL);
  const createCall = calls.find((c) => c.name === CREATE_TOOL);
  if (!readCall || !createCall) note("hidden-endpoint-mismatch");
  for (const call of calls) {
    if (call.parentToolCallId !== null) note("hidden-parent");
    if (call.source !== "pi") note("hidden-call-source");
    const joined = results.filter((r) => r.toolCallId === call.toolCallId);
    if (joined.length !== 1 || joined[0].name !== call.name || call.seq >= joined[0].seq) {
      note("hidden-join");
    }
  }
  const readResult = readCall ? results.find((r) => r.toolCallId === readCall.toolCallId) : null;
  const createResult = createCall
    ? results.find((r) => r.toolCallId === createCall.toolCallId)
    : null;
  if (!readResult || readResult.isError !== false || readResult.code !== null) {
    note("hidden-read-outcome");
  }
  if (!createResult || createResult.isError !== true) note("hidden-create-not-denied");
  else if (createResult.code !== null) note("hidden-create-code");
  else if (createResult.reason !== "unknown-tool") note("hidden-create-not-unavailable");
  if (results.some((r) => r.code === "write_approval_required")) note("hidden-wrong-route");
  if (
    readCall &&
    createCall &&
    readResult &&
    createResult &&
    !(
      readCall.seq < readResult.seq &&
      readResult.seq < createCall.seq &&
      createCall.seq < createResult.seq
    )
  ) {
    note("hidden-order");
  }
  if (connectedReg && readCall && createCall) {
    if (!(connectedReg.seq < readCall.seq)) note("hidden-reg-before-calls");
  }
  if (connected.length === 1 && readCall && !(connected[0].seq < readCall.seq)) {
    // Connected surface may be captured at first request alongside discovery;
    // it must precede the creation attempt at minimum.
    if (!(connected[0].seq < createCall.seq)) note("hidden-surface-before-create");
  }
  // No creation gate invocation or receiver check: unreachable, not a
  // print-mode block.
  if (results.some((r) => r.reason === "mode-not-tui:print")) note("hidden-wrong-denial");
  if (worker("mcp-transport-attempt").length !== 0) note("unexpected-transports");
  if (companion("registration").filter((r) => r.policy === "guarded").length !== 0) {
    note("hidden-guarded");
  }
  void SEED_OPERATION_ID;
  void SEED_DIGEST;
}

function readLedgerFinal({ ledgerFile, closeReceived, survivors, note, isHidden }) {
  try {
    if (!closeReceived || survivors) throw new Error("owned-resources-not-closed");
    let raw;
    try {
      raw = readFileSync(ledgerFile, "utf8");
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
        if (isHidden) note("ledger-missing");
        return null;
      }
      throw err;
    }
    if (statSync(ledgerFile).size > BUDGETS.traceBytes) throw new Error("ledger-budget-exceeded");
    if (!raw.endsWith("\n")) throw new Error("incomplete-ledger-record");
    const lines = raw
      .slice(0, -1)
      .split("\n")
      .map((line) => {
        if (!line.startsWith("T02-LEDGER ")) throw new Error("invalid-ledger-record");
        return JSON.parse(line.slice("T02-LEDGER ".length));
      });
    const finals = lines.filter((r) => r.event === "final");
    if (finals.length !== 1) {
      note(`ledger-finals:${finals.length}`);
      return null;
    }
    const ledgerFinal = finals[0];
    if (
      ledgerFinal.operationId !== null ||
      ledgerFinal.digest !== null ||
      ledgerFinal.totalDispatches !== 0 ||
      !Array.isArray(ledgerFinal.operations) ||
      ledgerFinal.operations.length !== 0
    ) {
      note("ledger-nonzero");
      return null;
    }
    return ledgerFinal;
  } catch (err) {
    if (isHidden || !(err && typeof err === "object" && "code" in err && err.code === "ENOENT")) {
      note(`ledger-unreadable:${err instanceof Error ? err.message : String(err)}`);
    }
    return null;
  }
}
