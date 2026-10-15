/**
 * T02 R3 isolated SDK worker: prebind refusal + hidden reachability.
 *
 * Child-process entry spawned by driver/run.mjs with a complete explicit
 * environment. First module in this process importing Pi. Covers exactly the
 * ten registered R3 SDK scenarios:
 *
 *   static-shadow, normalized-collision, normalized-collision-reversed,
 *   replacement-mcp, replacement-codemode, missing-mcp,
 *   unsupported-inventory, binding-missing, binding-ambiguous (refused
 *   before bind, then observed through a separately labeled closed
 *   refusal-probe session), and hidden-tool (supported bound readonly
 *   target with the creation tool hidden).
 *
 * The first nine cases deliberately fail at the launcher-owned prebind
 * boundary: the rejected target is never bound, then its actual native
 * unbound runtime is disposed and a SEPARATELY LABELED closed absence-only
 * refusal-probe runtime obtains a real unknown-tool call/result. This is
 * not per-call companion proof. Hidden uses the actual target runtime and
 * the connected readonly fixture; no probe session exists there.
 *
 * No runtime emits canned calls/results/gates or substitutes static
 * intended flags for inventory, binding/file state, tool reachability or
 * actual contexts.
 *
 * Trace travels only via the owned shared journal (T02_SHARED_JOURNAL,
 * producer `sdk-worker` for launcher/pi records); the companion appends as
 * producer `companion` and the fixture (hidden only) as producer `fixture`.
 * Stdout carries one JSON result line. No process.exit: exitCode is set and
 * the process finishes naturally with flushed stdio.
 */

import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { openSharedJournal } from "./event-journal.mjs";
import { SEED_DIGEST, getScenario } from "./scenarios.mjs";
import t02Companion from "../dist/index.js";
import t02ReplacementMcpProbe from "../companion/diagnostics/probe-replacement-mcp.mjs";
import t02ReplacementCodemodeProbe from "../companion/diagnostics/probe-replacement-codemode.mjs";
import t02UnknownResourceProbe from "../companion/diagnostics/probe-unknown-resource.mjs";
import {
  createScriptedProvider,
  SCRIPTED_PROVIDER_ID,
  SCRIPTED_MODEL_ID,
} from "../driver-files/t02-scripted-provider.mjs";
import {
  ModelRuntime,
  SessionManager,
  SettingsManager,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  createCodemodeExtension,
  createMcpExtension,
  createToolSearchExtension,
} from "@earendil-works/pi-coding-agent";

const PROMPT_BUDGET_MS = 50_000;
const EXPECTED_TOOL_PREFIX = "mcp__synth_gt__";
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
const CREATE_TOOL = `${EXPECTED_TOOL_PREFIX}create_routine`;
const READ_TOOL = `${EXPECTED_TOOL_PREFIX}get_exercise`;
const ORCHESTRATOR_TOOL = "t02_orchestrate";
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
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ALLOWED_STATIC_NAMES = ["synth-gt", "synth_gt"];

function parseArgs(argv) {
  const get = (flag) => {
    const i = argv.indexOf(flag);
    if (i === -1 || i + 1 >= argv.length) {
      process.stderr.write(`t02-preflight-worker: missing ${flag}\n`);
      process.exitCode = 2;
      throw new Error(`missing-${flag}`);
    }
    return argv[i + 1];
  };
  return { repoRoot: get("--repo-root"), scenario: get("--scenario") };
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    process.stderr.write(`t02-preflight-worker: missing required environment: ${name}\n`);
    process.exitCode = 1;
    throw new Error(`missing-env:${name}`);
  }
  return value;
}

function optionalEnv(name) {
  const value = process.env[name];
  return value === undefined || value === "" ? null : value;
}

async function main() {
  let journal = null;
  try {
    const { scenario, repoRoot } = parseArgs(process.argv.slice(2));
    if (!R3_SCENARIOS.includes(scenario)) {
      throw new Error(
        `preflight worker authorizes only ${R3_SCENARIOS.join(",")} (got ${scenario})`,
      );
    }
    journal = openSharedJournal(requiredEnv("T02_SHARED_JOURNAL"), "sdk-worker");
    const outcome = await runR3({ scenario, journal, repoRoot });
    journal.close();
    journal = null;
    process.stdout.write(`${JSON.stringify(outcome.result)}\n`);
    process.exitCode = outcome.completed ? 0 : 1;
  } catch (err) {
    try {
      journal?.close();
    } catch {
      // ignore close failure; exit code reports failure
    }
    try {
      process.stdout.write(`${JSON.stringify({ completed: false })}\n`);
    } catch {
      // ignore stdout failure; exit code reports failure
    }
    process.stderr.write(
      `t02-preflight-worker: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exitCode = 1;
  }
}

async function runR3({ scenario, journal, repoRoot }) {
  // Explicit launcher-owned fixture entry for static-descriptor validation.
  // Absent profiles never spawn it; hidden connects through the companion.
  const approvedFixture = join(repoRoot, "experiments", "t02", "fixture-server", "server.mjs");
  try {
    readFileSync(approvedFixture, "utf8");
  } catch {
    throw new Error("approved-fixture-unreadable");
  }
  const registry = getScenario(scenario);
  if (registry.harness !== "sdk")
    throw new Error(`r3-harness-mismatch:${String(registry.harness)}`);

  if (scenario === "hidden-tool") {
    return runHidden({ scenario, journal, repoRoot, approvedFixture });
  }
  const target = await runRefusedTarget({ scenario, journal, approvedFixture });
  const probe = await runRefusalProbe({ scenario, journal, repoRoot, reason: target.reason });
  const completed = target.completed && probe.completed;
  return {
    completed,
    result: {
      completed,
      runtime: probe.runtime,
      seedDigest: SEED_DIGEST,
      limits: { promptError: probe.promptError, timeoutFired: probe.timeoutFired },
    },
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function namespaceOf(server) {
  return `mcp__${String(server).replace(/-/g, "_")}`;
}

function qualifiedReadTools() {
  return READ_TOOLS.map((name) => `${EXPECTED_TOOL_PREFIX}${name}`);
}

function requireExactNames(actual, expected, what) {
  if (!Array.isArray(actual)) throw new Error(`${what}-not-array`);
  if (
    actual.length !== expected.length ||
    !expected.every((n) => actual.includes(n)) ||
    !actual.every((n) => expected.includes(n))
  ) {
    throw new Error(`${what}-mismatch:[${actual.join(",")}]`);
  }
}

function requireNoDuplicates(list, what) {
  if (!Array.isArray(list)) throw new Error(`${what}-not-array`);
  if (new Set(list).size !== list.length) throw new Error(`${what}-duplicates`);
}

function fileExists(path) {
  try {
    readFileSync(path);
    return true;
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") return false;
    throw new Error(`filesystem-unreadable:${err instanceof Error ? err.message : String(err)}`, {
      cause: err,
    });
  }
}

function listSocks(dir) {
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".sock"));
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") return [];
    throw new Error(`filesystem-unreadable:${err instanceof Error ? err.message : String(err)}`, {
      cause: err,
    });
  }
}

function isValidTuple(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  if (
    keys.length !== 4 ||
    !keys.includes("origin") ||
    !keys.includes("accountUuid") ||
    !keys.includes("sessionGeneration") ||
    !keys.includes("profileGenerationId")
  ) {
    return false;
  }
  if (value.origin !== "synthetic://t02") return false;
  if (typeof value.accountUuid !== "string" || !UUID_RE.test(value.accountUuid)) return false;
  if (typeof value.profileGenerationId !== "string" || !UUID_RE.test(value.profileGenerationId)) {
    return false;
  }
  if (
    typeof value.sessionGeneration !== "number" ||
    !Number.isInteger(value.sessionGeneration) ||
    value.sessionGeneration < 0
  ) {
    return false;
  }
  return true;
}

// Trusted binding check from real file data/cardinality only. Values never
// enter journals, reports, session entries, model arguments or results.
function readBindingCheck(scenario) {
  const bindingPath = optionalEnv("T02_BINDING_FILE");
  if (scenario === "binding-missing") {
    if (bindingPath !== null) throw new Error("binding-file-unexpectedly-present");
    return { present: false, candidateCount: 0, valid: false, reason: "binding-missing" };
  }
  if (bindingPath === null) throw new Error("binding-file-unset");
  let raw;
  try {
    raw = readFileSync(bindingPath, "utf8");
  } catch {
    throw new Error("binding-file-unreadable");
  }
  if (raw.length === 0) throw new Error("binding-file-empty");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("binding-file-malformed");
  }
  if (scenario === "binding-ambiguous") {
    if (!Array.isArray(parsed) || parsed.length !== 2) {
      throw new Error("binding-ambiguous-shape");
    }
    if (!parsed.every(isValidTuple)) throw new Error("binding-ambiguous-invalid-candidate");
    if (JSON.stringify(parsed[0]) === JSON.stringify(parsed[1])) {
      throw new Error("binding-ambiguous-identical");
    }
    return { present: true, candidateCount: 2, valid: false, reason: "binding-ambiguous" };
  }
  if (!isValidTuple(parsed)) throw new Error("binding-file-invalid");
  return { present: true, candidateCount: 1, valid: true, reason: "binding-ok" };
}

// Closed launcher-owned static configuration boundary. Reads the actual
// private agent-root mcp.json once and validates the exact closed
// command/args/path/flags/timeout/policy before trusting the snapshot.
// Raw argv/paths never enter observations; only safe alias/config fields.
function readStaticSnapshot({ agentDir, ledgerPath, sharedJournalPath, approvedFixture }) {
  const configPath = join(agentDir, "mcp.json");
  let raw;
  try {
    raw = readFileSync(configPath, "utf8");
  } catch {
    throw new Error("static-config-unreadable");
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("static-config-malformed");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("static-config-shape");
  }
  const topKeys = Object.keys(parsed);
  if (!topKeys.every((k) => k === "mcpServers" || k === "autoEnableCodemode")) {
    throw new Error("static-config-top-fields");
  }
  if (parsed.autoEnableCodemode !== false) throw new Error("static-config-codemode-flag");
  const servers = parsed.mcpServers ?? {};
  if (typeof servers !== "object" || servers === null || Array.isArray(servers)) {
    throw new Error("static-config-servers-shape");
  }
  const names = Object.keys(servers);
  for (const name of names) {
    if (!ALLOWED_STATIC_NAMES.includes(name)) throw new Error(`static-config-name:${name}`);
  }
  const expectedArgs = [
    approvedFixture,
    "--t02-ledger-file",
    ledgerPath,
    "--t02-event-journal",
    sharedJournalPath,
  ];
  for (const name of names) {
    const entry = servers[name];
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`static-config-entry:${name}`);
    }
    if (entry.command !== process.execPath) throw new Error(`static-config-command:${name}`);
    if (
      !Array.isArray(entry.args) ||
      entry.args.length !== expectedArgs.length ||
      !expectedArgs.every((a, i) => entry.args[i] === a)
    ) {
      throw new Error(`static-config-args:${name}`);
    }
    if (entry.timeout !== 10) throw new Error(`static-config-timeout:${name}`);
    if (entry.exposure !== "direct") throw new Error(`static-config-exposure:${name}`);
    if (entry.enabled !== true) throw new Error(`static-config-enabled:${name}`);
    if (
      entry.env !== undefined ||
      entry.cwd !== undefined ||
      entry.url !== undefined ||
      entry.headers !== undefined ||
      entry.auth !== undefined ||
      entry.type === "http"
    ) {
      throw new Error(`static-config-extra:${name}`);
    }
    const argText = entry.args.join(" ");
    if (argText.includes("--t02-sidecar") || argText.includes("--t02-binding-file")) {
      throw new Error(`static-config-channel:${name}`);
    }
  }
  const snapshot = {
    servers: names.map((name) => ({
      name,
      config: servers[name],
      source: "t02-r3-launcher",
      scope: "global",
    })),
    errors: [],
    autoEnableCodemode: false,
  };
  const settings = {
    names,
    entries: names.map((name) => ({
      name,
      namespace: namespaceOf(name),
      enabled: true,
      exposure: "direct",
      resourceAlias: "fixture:t02",
      policy: "readonly",
    })),
  };
  return { snapshot, settings };
}

function classifyResult(result) {
  try {
    const content = result?.content;
    if (!Array.isArray(content)) return { code: null, reason: "no-content" };
    const text = content
      .filter((b) => b && b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("\n");
    try {
      const parsed = JSON.parse(text);
      if (
        parsed &&
        typeof parsed === "object" &&
        parsed.ok === false &&
        parsed.error &&
        typeof parsed.error.code === "string"
      ) {
        return {
          code: parsed.error.code,
          reason:
            typeof parsed.error.message === "string" ? parsed.error.message : "execution-refusal",
        };
      }
      if (parsed && typeof parsed === "object" && parsed.ok === true) {
        return { code: null, reason: "success" };
      }
    } catch {
      // fall through to text categories below
    }
    if (/was blocked/i.test(text)) return { code: null, reason: "host-block" };
    if (/not found/i.test(text)) return { code: null, reason: "unknown-tool" };
    return { code: null, reason: "unstructured", detail: text.slice(0, 200) };
  } catch {
    return { code: null, reason: "unparseable" };
  }
}

function probeRuntime(repoRoot) {
  let npm;
  try {
    npm = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim().split("\n")[0].trim();
  } catch {
    throw new Error("npm-probe-failed");
  }
  const readVersion = (segments) => {
    try {
      const pkg = JSON.parse(
        readFileSync(join(repoRoot, "node_modules", ...segments, "package.json"), "utf8"),
      );
      return typeof pkg.version === "string" ? pkg.version : "unknown";
    } catch {
      return "unknown";
    }
  };
  const lockRefs = (() => {
    try {
      const lock = JSON.parse(readFileSync(join(repoRoot, "package-lock.json"), "utf8"));
      const entry = (name) => lock.packages?.[`node_modules/${name}`] ?? {};
      return {
        pi: entry("@earendil-works/pi-coding-agent").integrity ?? "unknown",
        piAi: entry("@earendil-works/pi-ai").integrity ?? "unknown",
        sdk: entry("@modelcontextprotocol/sdk").integrity ?? "unknown",
        zod: entry("zod").integrity ?? "unknown",
      };
    } catch {
      return { pi: "unknown", piAi: "unknown", sdk: "unknown", zod: "unknown" };
    }
  })();
  return {
    piAi: readVersion(["@earendil-works", "pi-ai"]),
    record: {
      node: process.version,
      npm,
      pi: readVersion(["@earendil-works", "pi-coding-agent"]),
      piAi: readVersion(["@earendil-works", "pi-ai"]),
      sdk: readVersion(["@modelcontextprotocol", "sdk"]),
      zod: readVersion(["zod"]),
      piIntegrity: lockRefs.pi,
      piAiIntegrity: lockRefs.piAi,
      sdkIntegrity: lockRefs.sdk,
      zodIntegrity: lockRefs.zod,
      protocol: "2025-11-25(candidate)",
    },
  };
}

async function createModelRuntime(agentDir) {
  const modelRuntime = await ModelRuntime.create({
    authPath: join(agentDir, "auth.json"),
    modelsPath: null,
    modelsStorePath: join(agentDir, "models-store.json"),
    allowModelNetwork: false,
    refreshOnCreate: false,
  });
  return modelRuntime;
}

function createSettings() {
  return SettingsManager.inMemory({
    defaultTools: [],
    retry: { enabled: false, maxRetries: 0 },
    compaction: { enabled: false },
  });
}

// ---------------------------------------------------------------------------
// Target inventory expectations (actual SDK loader, R3 replaceable flags)
// ---------------------------------------------------------------------------

const TARGET_BASE_HANDLERS = {
  "<inline:t02-companion>": {
    handlers: ["session_shutdown", "session_start", "tool_call"],
    tools: [ORCHESTRATOR_TOOL],
    commands: [],
    replaceable: false,
  },
  "<inline:t02-codemode>": { handlers: [], tools: ["codemode"], commands: [], replaceable: true },
  "<inline:t02-search>": { handlers: [], tools: ["tool_search"], commands: [], replaceable: false },
  "<inline:t02-mcp>": {
    handlers: [
      "before_agent_start",
      "mcp_servers_change",
      "session_shutdown",
      "session_start",
      "tool_call",
      "turn_start",
    ],
    tools: [],
    commands: ["mcp"],
    replaceable: true,
  },
  "<inline:t02-observer>": {
    handlers: ["session_shutdown", "session_start"],
    tools: [],
    commands: [],
    replaceable: false,
  },
};

function expectedTargetProfile(scenario) {
  const base = { ...TARGET_BASE_HANDLERS };
  if (scenario === "replacement-mcp") {
    delete base["<inline:t02-mcp>"];
    base["<inline:t02-replacement-mcp>"] = {
      handlers: [],
      tools: [],
      commands: ["mcp"],
      replaceable: false,
    };
  } else if (scenario === "replacement-codemode") {
    delete base["<inline:t02-codemode>"];
    base["<inline:t02-replacement-codemode>"] = {
      handlers: [],
      tools: ["codemode"],
      commands: [],
      replaceable: false,
    };
  } else if (scenario === "missing-mcp") {
    delete base["<inline:t02-mcp>"];
  } else if (scenario === "unsupported-inventory") {
    base["<inline:t02-unknown-resource>"] = {
      handlers: [],
      tools: [],
      commands: ["t02_unknown"],
      replaceable: false,
    };
  }
  return base;
}

function checkInventoryShape(loaded, expected, what) {
  const problems = [];
  const byPath = new Map((loaded.extensions ?? []).map((ext) => [String(ext.path), ext]));
  const sameSet = (actual, wanted) => {
    const a = [...actual].sort().join(",");
    const w = [...wanted].sort().join(",");
    return a === w;
  };
  if (byPath.size !== Object.keys(expected).length) {
    problems.push(`entry-count:${byPath.size}`);
  }
  for (const [path, want] of Object.entries(expected)) {
    const ext = byPath.get(path);
    if (!ext) {
      problems.push(`missing:${path}`);
      continue;
    }
    if (!sameSet(ext.handlers?.keys() ?? [], want.handlers)) {
      problems.push(`handlers:${path}:[${[...(ext.handlers?.keys() ?? [])].sort().join(",")}]`);
    }
    if (!sameSet(ext.tools?.keys() ?? [], want.tools)) {
      problems.push(`tools:${path}:[${[...(ext.tools?.keys() ?? [])].sort().join(",")}]`);
    }
    if (!sameSet(ext.commands?.keys() ?? [], want.commands)) {
      problems.push(`commands:${path}:[${[...(ext.commands?.keys() ?? [])].sort().join(",")}]`);
    }
    const replaceable = ext.replaceable === true;
    if (replaceable !== want.replaceable) {
      problems.push(`replaceable:${path}:${String(ext.replaceable)}`);
    }
  }
  for (const err of loaded.errors ?? []) problems.push(`loader-error:${err.path}:${err.error}`);
  const rawWarnings = Array.isArray(loaded.warnings) ? loaded.warnings : [];
  if (rawWarnings.length > 0) problems.push(`loader-warnings:${rawWarnings.length}`);
  if (problems.length > 0) throw new Error(`${what}-mismatch:${problems.join(";")}`);
  return { byPath, rawWarnings };
}

function recordTargetInventory(journal, loaded, byPath, rawWarnings) {
  journal.record("launcher", "resource_inventory", {
    runtimeRole: "target",
    inventoryProvenance: "actual-sdk-loader",
    resourceAliases: [
      "experimental-companion:t02",
      "builtin:codemode",
      "builtin:tool-search",
      "builtin:mcp",
      "observer:t02",
    ],
    inlineProfiles: [...byPath.entries()].map(([path, ext]) => ({
      path,
      handlers: [...(ext.handlers?.keys() ?? [])].sort(),
      tools: [...(ext.tools?.keys() ?? [])].sort(),
      commands: [...(ext.commands?.keys() ?? [])].sort(),
      replaceable: ext.replaceable === true,
    })),
    loaderErrors: (loaded.errors ?? []).map((e) => ({ path: String(e.path), error: e.error })),
    loaderWarnings: rawWarnings.map((w) => ({
      source:
        w && typeof w.path === "string" && w.path.startsWith("<inline:") ? w.path : "external",
      warning: w && typeof w.warning === "string" ? w.warning : "unknown",
    })),
  });
}

// Derive the specific refusal reason from observed evidence only — never
// from the scenario name alone. Static conflicts, resource faults and
// binding faults are mutually exclusive per closed profile.
function deriveReason({ names, byPath, binding }) {
  const namespaces = names.map(namespaceOf);
  const staticShadow = names.length === 1 && namespaces[0] === namespaceOf("synth-gt");
  const normalizedCollision =
    names.length === 2 && namespaces.every((ns) => ns === namespaceOf("synth-gt"));
  const hasNativeMcp = byPath.has("<inline:t02-mcp>");
  const hasNativeCodemode = byPath.has("<inline:t02-codemode>");
  const diagMcp = byPath.get("<inline:t02-replacement-mcp>");
  const diagCodemode = byPath.get("<inline:t02-replacement-codemode>");
  const unknown = byPath.get("<inline:t02-unknown-resource>");
  const hasDiagMcp = diagMcp !== undefined && [...(diagMcp.commands?.keys() ?? [])].includes("mcp");
  const hasDiagCodemode =
    diagCodemode !== undefined && [...(diagCodemode.tools?.keys() ?? [])].includes("codemode");
  const hasUnknown =
    unknown !== undefined && [...(unknown.commands?.keys() ?? [])].includes("t02_unknown");
  if (staticShadow) return "static-shadow";
  if (normalizedCollision) return "normalized-collision";
  if (hasUnknown) return "unsupported-inventory";
  if (!hasNativeMcp && hasDiagMcp) return "replacement-mcp";
  if (!hasNativeCodemode && hasDiagCodemode) return "replacement-codemode";
  if (!hasNativeMcp && !hasDiagMcp) return "missing-mcp";
  if (binding.present === false) return "binding-missing";
  if (binding.present === true && binding.valid === false) return "binding-ambiguous";
  throw new Error("refusal-reason-undetermined");
}

// ---------------------------------------------------------------------------
// Refused target phase (first nine): observe, refuse before bind, dispose
// ---------------------------------------------------------------------------

function buildTargetFactories({ scenario, snapshot, counters, runDir, observer }) {
  const loadConfigCalls = counters;
  const mcpFactory = createMcpExtension({
    loadConfig: () => {
      loadConfigCalls.calls += 1;
      return snapshot;
    },
    createTransport: (entry) => {
      loadConfigCalls.attempts += 1;
      throw new Error(
        `t02-r3: target transport creation refused (prebind refusal): ${entry?.name ?? "unknown"}`,
      );
    },
    logPath: join(runDir, "mcp.log"),
  });
  const factories = [{ name: "t02-companion", factory: t02Companion }];
  if (scenario !== "replacement-codemode") {
    factories.push({
      name: "t02-codemode",
      factory: createCodemodeExtension({ mode: "on", models: false }),
      replaceable: true,
    });
  }
  factories.push({ name: "t02-search", factory: createToolSearchExtension() });
  if (scenario !== "replacement-mcp" && scenario !== "missing-mcp") {
    factories.push({ name: "t02-mcp", factory: mcpFactory, replaceable: true });
  } else if (scenario === "missing-mcp") {
    // Neither native MCP nor replacement /mcp owner is loaded.
  }
  factories.push({ name: "t02-observer", factory: observer });
  if (scenario === "replacement-mcp") {
    factories.push({ name: "t02-replacement-mcp", factory: t02ReplacementMcpProbe });
  } else if (scenario === "replacement-codemode") {
    factories.push({ name: "t02-replacement-codemode", factory: t02ReplacementCodemodeProbe });
  } else if (scenario === "unsupported-inventory") {
    factories.push({ name: "t02-unknown-resource", factory: t02UnknownResourceProbe });
  }
  return factories;
}

function makeTargetObserver(capture) {
  return (pi) => {
    try {
      const regs = pi.getMcpServers();
      if (!Array.isArray(regs)) throw new Error("unknown-registrations");
      capture.initialRegistrations = regs.map((s) => s.name);
    } catch (err) {
      throw new Error(
        `registrations-unavailable:${err instanceof Error ? err.message : String(err)}`,
        { cause: err },
      );
    }
    pi.on("session_start", (event, ctx) => {
      capture.starts.push({
        reason: event.reason,
        mode: ctx?.mode ?? null,
        hasUI: ctx?.hasUI ?? null,
      });
    });
    pi.on("session_shutdown", (event) => {
      capture.shutdowns.push({ reason: event.reason });
      try {
        capture.regsAtShutdown = (pi.getMcpServers() ?? []).map((s) => s.name);
      } catch {
        capture.regsAtShutdown = null;
      }
    });
  };
}

async function runRefusedTarget({ scenario, journal, approvedFixture }) {
  const runDir = requiredEnv("T02_RUN_DIR");
  const agentDir = requiredEnv("PI_CODING_AGENT_DIR");
  const ledgerPath = requiredEnv("T02_LEDGER_FILE");
  const sharedJournalPath = requiredEnv("T02_SHARED_JOURNAL");
  const cwd = process.cwd();

  if (fileExists(ledgerPath)) throw new Error("unexpected-ledger-file");

  // Trusted file evidence is read before any Pi import below uses it; the
  // observations are recorded inside the runtime factory in Pi order.
  const binding = readBindingCheck(scenario);
  const { snapshot, settings } = readStaticSnapshot({
    agentDir,
    ledgerPath,
    sharedJournalPath,
    approvedFixture,
  });

  const counters = { calls: 0, attempts: 0 };
  const capture = { starts: [], shutdowns: [], initialRegistrations: null, regsAtShutdown: null };
  const extensionFactories = buildTargetFactories({
    scenario,
    snapshot,
    counters,
    runDir,
    observer: makeTargetObserver(capture),
  });

  const dummyHandle = createScriptedProvider([{ text: "SYNTHETIC T02 target standby" }]);
  const modelRuntime = await createModelRuntime(agentDir);
  modelRuntime.registerNativeProvider(dummyHandle.provider);
  const settingsManager = createSettings();

  let prebindReason = null;
  const runtime = await createAgentSessionRuntime(
    async ({ cwd: factoryCwd, agentDir: factoryAgentDir, sessionManager }) => {
      const services = await createAgentSessionServices({
        cwd: factoryCwd,
        agentDir: factoryAgentDir,
        settingsManager,
        modelRuntime,
        resourceLoaderOptions: {
          extensionFactories,
          noExtensions: true,
          noSkills: true,
          noPromptTemplates: true,
          noThemes: true,
          noContextFiles: true,
        },
      });
      const loaded = services.resourceLoader.getExtensions();
      const expected = expectedTargetProfile(scenario);
      const { byPath, rawWarnings } = checkInventoryShape(loaded, expected, "target-profile");
      recordTargetInventory(journal, loaded, byPath, rawWarnings);
      journal.record("launcher", "static_settings", {
        runtimeRole: "target",
        settingsProvenance: "launcher-owned-loadConfig",
        names: settings.names,
        entries: settings.entries,
      });
      journal.record("launcher", "binding_check", {
        runtimeRole: "target",
        present: binding.present,
        candidateCount: binding.candidateCount,
        valid: binding.valid,
        reason: binding.reason,
      });
      const reason = deriveReason({ names: settings.names, byPath, binding });
      if (reason !== EXPECTED_REASON[scenario]) {
        throw new Error(`refusal-reason-mismatch:${reason}`);
      }
      prebindReason = reason;
      if (
        !Array.isArray(capture.initialRegistrations) ||
        capture.initialRegistrations.length !== 0
      ) {
        throw new Error("target-registrations-not-empty");
      }
      journal.record("launcher", "prebind_check", {
        runtimeRole: "target",
        supported: false,
        reason,
        targetBound: false,
        targetLoadConfigCalls: counters.calls,
        targetTransportAttempts: counters.attempts,
        registrations: capture.initialRegistrations,
      });
      const created = await createAgentSessionFromServices({
        services,
        sessionManager,
        model: dummyHandle.getModel(),
        thinkingLevel: "off",
        excludeTools: [ORCHESTRATOR_TOOL],
      });
      return {
        session: created.session,
        services,
        extensionsResult: created.extensionsResult,
        diagnostics: [...services.diagnostics],
      };
    },
    { cwd, agentDir, sessionManager: SessionManager.inMemory() },
  );

  // The target is never bound: callback count stays 0 and no config connects.
  if (counters.calls !== 0) throw new Error(`target-loadconfig-called:${counters.calls}`);
  if (counters.attempts !== 0) throw new Error(`target-transport-attempted:${counters.attempts}`);
  await runtime.dispose();
  if (capture.starts.length !== 0) throw new Error("target-session-started");
  if (capture.shutdowns.length < 1) throw new Error("missing-target-shutdown");
  if (!Array.isArray(capture.regsAtShutdown) || capture.regsAtShutdown.length !== 0) {
    throw new Error("target-shutdown-registrations");
  }
  journal.record("launcher", "target_disposed", {
    runtimeRole: "target",
    shutdownObserved: true,
    targetBound: false,
  });
  if (fileExists(ledgerPath)) throw new Error("unexpected-ledger-file");
  if (listSocks(runDir).length > 0) throw new Error("unexpected-sockets");

  return { completed: true, reason: prebindReason };
}

// ---------------------------------------------------------------------------
// Refusal-probe phase (first nine): closed no-companion unavailable attempt
// ---------------------------------------------------------------------------

function makeProbeObserver(capture) {
  let snapshotFn = null;
  const factory = (pi) => {
    snapshotFn = () => {
      const regs = pi.getMcpServers();
      if (!Array.isArray(regs)) throw new Error("unknown-registrations");
      return regs.map((s) => s.name);
    };
    pi.on("session_start", (event, ctx) => {
      capture.starts.push({
        reason: event.reason,
        mode: ctx?.mode ?? null,
        hasUI: ctx?.hasUI ?? null,
        registrations: snapshotFn(),
      });
    });
    pi.on("session_shutdown", (event) => {
      capture.shutdowns.push({ reason: event.reason });
      try {
        capture.regsAtShutdown = snapshotFn();
      } catch {
        capture.regsAtShutdown = null;
      }
    });
  };
  return { factory, snapshot: () => snapshotFn?.() };
}

async function runRefusalProbe({ scenario, journal, repoRoot, reason }) {
  const turnsPath = requiredEnv("T02_TURNS_FILE");
  const ledgerPath = requiredEnv("T02_LEDGER_FILE");
  const runDir = requiredEnv("T02_RUN_DIR");
  const agentDir = requiredEnv("PI_CODING_AGENT_DIR");
  const cwd = process.cwd();

  let turns;
  try {
    turns = JSON.parse(readFileSync(turnsPath, "utf8"));
  } catch {
    throw new Error("turns-unreadable-or-malformed");
  }
  const handle = createScriptedProvider(turns);
  const model = handle.getModel();
  if (!model || model.provider !== SCRIPTED_PROVIDER_ID || model.id !== SCRIPTED_MODEL_ID) {
    throw new Error("provider-identity-mismatch");
  }
  const modelRuntime = await createModelRuntime(agentDir);
  modelRuntime.registerNativeProvider(handle.provider);
  const settingsManager = createSettings();

  let loadConfigCalls = 0;
  let transportAttempts = 0;
  const mcpFactory = createMcpExtension({
    loadConfig: () => {
      loadConfigCalls += 1;
      journal.record("launcher", "mcp-load-config", { call: loadConfigCalls, servers: 0 });
      return { servers: [], errors: [], autoEnableCodemode: false };
    },
    createTransport: (entry) => {
      transportAttempts += 1;
      journal.record("launcher", "mcp-transport-attempt", {
        attempt: transportAttempts,
        server: entry?.name ?? null,
      });
      throw new Error("t02-r3-probe: transport creation refused (absence-only profile)");
    },
    logPath: join(runDir, "mcp.log"),
  });
  const capture = { starts: [], shutdowns: [], regsAtShutdown: null };
  const probeObserver = makeProbeObserver(capture);
  const extensionFactories = [
    { name: "t02-codemode", factory: createCodemodeExtension({ mode: "on", models: false }) },
    { name: "t02-search", factory: createToolSearchExtension() },
    { name: "t02-mcp", factory: mcpFactory },
    { name: "t02-observer", factory: probeObserver.factory },
  ];

  const runtime = await createAgentSessionRuntime(
    async ({ cwd: factoryCwd, agentDir: factoryAgentDir, sessionManager }) => {
      const services = await createAgentSessionServices({
        cwd: factoryCwd,
        agentDir: factoryAgentDir,
        settingsManager,
        modelRuntime,
        resourceLoaderOptions: {
          extensionFactories,
          noExtensions: true,
          noSkills: true,
          noPromptTemplates: true,
          noThemes: true,
          noContextFiles: true,
        },
      });
      const loaded = services.resourceLoader.getExtensions();
      const expected = {
        "<inline:t02-codemode>": { handlers: [], tools: ["codemode"], commands: [] },
        "<inline:t02-search>": { handlers: [], tools: ["tool_search"], commands: [] },
        "<inline:t02-mcp>": {
          handlers: [
            "before_agent_start",
            "mcp_servers_change",
            "session_shutdown",
            "session_start",
            "tool_call",
            "turn_start",
          ],
          tools: [],
          commands: ["mcp"],
        },
        "<inline:t02-observer>": {
          handlers: ["session_shutdown", "session_start"],
          tools: [],
          commands: [],
        },
      };
      const byPath = new Map((loaded.extensions ?? []).map((ext) => [String(ext.path), ext]));
      const sameSet = (actual, wanted) => {
        const a = [...actual].sort().join(",");
        const w = [...wanted].sort().join(",");
        return a === w;
      };
      if (byPath.size !== Object.keys(expected).length) {
        throw new Error(`probe-profile-mismatch:entry-count:${byPath.size}`);
      }
      for (const [path, want] of Object.entries(expected)) {
        const ext = byPath.get(path);
        if (!ext) throw new Error(`probe-profile-mismatch:missing:${path}`);
        if (
          !sameSet(ext.handlers?.keys() ?? [], want.handlers) ||
          !sameSet(ext.tools?.keys() ?? [], want.tools) ||
          !sameSet(ext.commands?.keys() ?? [], want.commands)
        ) {
          throw new Error(`probe-profile-mismatch:${path}`);
        }
      }
      for (const err of loaded.errors ?? []) {
        throw new Error(`probe-profile-mismatch:loader-error:${err.path}`);
      }
      if ((loaded.warnings ?? []).length > 0) {
        throw new Error("probe-profile-mismatch:loader-warnings");
      }
      journal.record("launcher", "resource_inventory", {
        runtimeRole: "refusal-probe",
        inventoryProvenance: "actual-sdk-loader",
        resourceAliases: ["builtin:codemode", "builtin:tool-search", "builtin:mcp", "observer:t02"],
        inlineProfiles: [...byPath.entries()].map(([path, ext]) => ({
          path,
          handlers: [...(ext.handlers?.keys() ?? [])].sort(),
          tools: [...(ext.tools?.keys() ?? [])].sort(),
          commands: [...(ext.commands?.keys() ?? [])].sort(),
          replaceable: ext.replaceable === true,
        })),
        loaderErrors: [],
        loaderWarnings: [],
      });
      const created = await createAgentSessionFromServices({
        services,
        sessionManager,
        model: handle.getModel(),
        thinkingLevel: "off",
        excludeTools: [ORCHESTRATOR_TOOL],
      });
      return {
        session: created.session,
        services,
        extensionsResult: created.extensionsResult,
        diagnostics: [...services.diagnostics],
      };
    },
    { cwd, agentDir, sessionManager: SessionManager.inMemory() },
  );

  const session = runtime.session;
  let promptError = null;
  let timeoutFired = false;
  try {
    await session.bindExtensions({ mode: "print" });
    journal.record("launcher", "session", { transition: "start", reason: "bind-mode:print" });
    if (capture.starts.length !== 1) {
      throw new Error(`probe-start-observations:${capture.starts.length}`);
    }
    const startCtx = capture.starts[0];
    if (startCtx.mode !== "print")
      throw new Error(`unexpected-probe-mode:${String(startCtx.mode)}`);
    if (startCtx.hasUI !== false) throw new Error("unexpected-probe-hasUI");
    if (!Array.isArray(startCtx.registrations) || startCtx.registrations.length !== 0) {
      throw new Error("probe-registrations-not-empty");
    }
    journal.record("launcher", "session-context", {
      runtimeRole: "refusal-probe",
      transition: "start",
      reason: startCtx.reason ?? null,
      mode: startCtx.mode,
      hasUI: startCtx.hasUI,
      uiInjected: false,
      registrations: startCtx.registrations,
    });
    journal.record("launcher", "preflight", {
      runtimeRole: "refusal-probe",
      mode: startCtx.mode,
      hasUI: startCtx.hasUI,
      uiInjected: false,
      supported: false,
      reason,
      targetBound: false,
      inventoryProvenance: "actual-sdk-loader",
      resourceAliases: ["builtin:codemode", "builtin:tool-search", "builtin:mcp", "observer:t02"],
      boundMode: "print",
    });
    if (loadConfigCalls < 1) throw new Error("probe-loadconfig-not-observed");
    if (transportAttempts !== 0) throw new Error("probe-transport-attempted");
    if (fileExists(ledgerPath)) throw new Error("unexpected-ledger-file");
    journal.record("launcher", "registration", {
      runtimeRole: "refusal-probe",
      server: "synth-gt",
      policy: "none",
      registered: false,
      connected: false,
      spawned: false,
      reason,
      loadConfigCalls,
      transportAttempts,
    });

    const started = new Map();
    const ended = new Map();
    const unsubscribe = session.subscribe((event) => {
      if (!event || typeof event.type !== "string") return;
      if (event.type === "tool_execution_start") {
        started.set(event.toolCallId, event.toolName ?? null);
        journal.record("pi", "tool_call", {
          name: event.toolName ?? null,
          toolCallId: event.toolCallId ?? null,
          parentToolCallId: event.parentToolCallId ?? null,
        });
      } else if (event.type === "tool_execution_end") {
        ended.set(event.toolCallId, true);
        const parsed = classifyResult(event.result);
        journal.record("pi", "tool_result", {
          name: event.toolName ?? null,
          toolCallId: event.toolCallId ?? null,
          parentToolCallId: event.parentToolCallId ?? null,
          isError: event.isError === true,
          code: parsed.code,
          reason: parsed.reason,
        });
      }
    });
    const timer = setTimeout(() => {
      timeoutFired = true;
      try {
        const maybe = session.abort();
        if (maybe && typeof maybe.catch === "function") maybe.catch(() => {});
      } catch {
        // ignore abort errors; the timeout itself is the observation
      }
    }, PROMPT_BUDGET_MS);
    try {
      await session.prompt(`SYNTHETIC T02 ${scenario}`);
    } catch (err) {
      promptError = err instanceof Error ? err.message : String(err);
    } finally {
      clearTimeout(timer);
      unsubscribe();
    }
    journal.record("launcher", "prompt", { error: promptError, timeoutFired });

    if (started.size !== 1 || ended.size !== 1) throw new Error("probe-pipeline-count");
    for (const [toolCallId, name] of started) {
      if (!ended.has(toolCallId)) throw new Error(`probe-missing-end:${String(toolCallId)}`);
      if (name !== CREATE_TOOL) throw new Error(`probe-unexpected-call:${String(name)}`);
      if (typeof toolCallId !== "string" || toolCallId.length === 0) {
        throw new Error("probe-invalid-call-id");
      }
    }
    const regsAfter = probeObserver.snapshot();
    if (!Array.isArray(regsAfter) || regsAfter.length !== 0) {
      throw new Error("probe-postcall-registrations");
    }
    journal.record("launcher", "registration_check", {
      registrations: regsAfter,
      loadConfigCalls,
      transportAttempts,
    });
    if (transportAttempts !== 0) throw new Error("probe-postcall-transports");
    if (fileExists(ledgerPath)) throw new Error("unexpected-ledger-file");
    if (listSocks(runDir).length > 0) throw new Error("unexpected-sockets");
  } finally {
    await runtime.dispose();
  }
  if (capture.shutdowns.length < 1) throw new Error("missing-probe-shutdown");
  journal.record("launcher", "session", {
    transition: "shutdown",
    reason: capture.shutdowns.map((s) => s.reason ?? "unknown").join(","),
  });

  const info = probeRuntime(repoRoot);
  journal.record("launcher", "provider", {
    piAiVersion: info.piAi,
    provider: SCRIPTED_PROVIDER_ID,
    model: SCRIPTED_MODEL_ID,
  });
  journal.record("launcher", "runtime", info.record);
  journal.record("launcher", "worker_cleanup", {
    shutdownObserved: true,
    ledgerAbsent: true,
    listenersClosed: true,
    rootsRemoved: false,
    remainingListeners: 0,
  });
  return {
    completed: promptError === null && !timeoutFired,
    runtime: info.record,
    promptError,
    timeoutFired,
  };
}

// ---------------------------------------------------------------------------
// Hidden target: supported bound readonly target, creation hidden
// ---------------------------------------------------------------------------

function captureSurface(session, journal, phase) {
  const activeTools = session.getActiveToolNames();
  const callableTools = session.getCallableToolNames();
  const allEntries = session.getAllTools();
  if (!Array.isArray(activeTools) || !Array.isArray(callableTools) || !Array.isArray(allEntries)) {
    throw new Error(`hidden-surface-not-array:${phase}`);
  }
  const allTools = allEntries.map((t) => t?.name).filter((n) => typeof n === "string");
  requireNoDuplicates(activeTools, `hidden-surface:${phase}:active`);
  requireNoDuplicates(callableTools, `hidden-surface:${phase}:callable`);
  requireNoDuplicates(allTools, `hidden-surface:${phase}:all`);
  // Hidden means actual exposure:hidden from getAllTools, never
  // registered-minus-callable.
  const hiddenTools = allEntries
    .filter((t) => t && t.exposure === "hidden")
    .map((t) => t.name)
    .filter((n) => typeof n === "string");
  requireNoDuplicates(hiddenTools, `hidden-surface:${phase}:hidden`);
  const fixtureTools = callableTools
    .filter((n) => n.startsWith(EXPECTED_TOOL_PREFIX))
    .map((n) => n.slice(EXPECTED_TOOL_PREFIX.length));
  const surface = { activeTools, callableTools, hiddenTools, fixtureTools };
  journal.record("launcher", "tool_surface", { phase, ...surface });
  return surface;
}

async function runHidden({ scenario, journal, repoRoot, approvedFixture }) {
  const turnsPath = requiredEnv("T02_TURNS_FILE");
  const ledgerPath = requiredEnv("T02_LEDGER_FILE");
  const runDir = requiredEnv("T02_RUN_DIR");
  const agentDir = requiredEnv("PI_CODING_AGENT_DIR");
  const fixtureEntry = requiredEnv("T02_FIXTURE_ENTRY");
  const sharedJournalPath = requiredEnv("T02_SHARED_JOURNAL");
  const cwd = process.cwd();

  if (fixtureEntry !== approvedFixture) throw new Error("fixture-entry-mismatch");
  try {
    readFileSync(fixtureEntry, "utf8");
  } catch {
    throw new Error("approved-fixture-unreadable");
  }
  if (process.env.T02_HIDE_CREATE !== "1") throw new Error("hide-create-not-set");

  let turns;
  try {
    turns = JSON.parse(readFileSync(turnsPath, "utf8"));
  } catch {
    throw new Error("turns-unreadable-or-malformed");
  }

  const binding = readBindingCheck(scenario);
  if (!binding.valid) throw new Error(`hidden-binding-invalid:${binding.reason}`);
  const { settings } = readStaticSnapshot({
    agentDir,
    ledgerPath,
    sharedJournalPath,
    approvedFixture,
  });
  if (settings.names.length !== 0) throw new Error("hidden-static-not-empty");

  // Native MCP loadConfig is empty: the companion's own registerMcpServer
  // call owns the single readonly fixture. Default native transport.
  let loadConfigCalls = 0;
  const mcpFactory = createMcpExtension({
    loadConfig: () => {
      loadConfigCalls += 1;
      journal.record("launcher", "mcp-load-config", { call: loadConfigCalls, servers: 0 });
      return { servers: [], errors: [], autoEnableCodemode: false };
    },
    logPath: join(runDir, "mcp.log"),
  });
  const sessionRef = { current: null };
  let connectedDone = false;
  const handle = createScriptedProvider(turns, {
    onRequest: () => {
      const session = sessionRef.current;
      if (!session) throw new Error("hidden-first-request-no-session");
      // First-request surface: six reads active/callable, create hidden.
      const first = captureSurface(session, journal, "first-request");
      requireExactNames(first.activeTools, qualifiedReadTools(), "hidden-first-active");
      requireExactNames(first.callableTools, qualifiedReadTools(), "hidden-first-callable");
      requireExactNames(first.hiddenTools, [CREATE_TOOL], "hidden-first-hidden");
      requireExactNames(first.fixtureTools, READ_TOOLS, "hidden-first-fixture");
      if (!fileExists(ledgerPath)) throw new Error("unobserved-fixture-discovery");
      // Connected surface pairs actual fixture discovery with availability.
      const connected = captureSurface(session, journal, "connected");
      requireExactNames(connected.activeTools, qualifiedReadTools(), "hidden-connected-active");
      requireExactNames(connected.callableTools, qualifiedReadTools(), "hidden-connected-callable");
      requireExactNames(connected.hiddenTools, [CREATE_TOOL], "hidden-connected-hidden");
      requireExactNames(connected.fixtureTools, READ_TOOLS, "hidden-connected-fixture");
      journal.record("launcher", "registration", {
        server: "synth-gt",
        policy: "readonly",
        registered: true,
        connected: true,
        spawned: true,
        reason: "companion-entry-native-discovery-child-ledger",
        loadConfigCalls,
      });
      connectedDone = true;
    },
  });
  const model = handle.getModel();
  if (!model || model.provider !== SCRIPTED_PROVIDER_ID || model.id !== SCRIPTED_MODEL_ID) {
    throw new Error("provider-identity-mismatch");
  }
  const modelRuntime = await createModelRuntime(agentDir);
  modelRuntime.registerNativeProvider(handle.provider);
  const settingsManager = createSettings();

  const observed = { starts: [], shutdowns: [], regsAtShutdown: [] };
  const observerFactory = (pi) => {
    pi.on("session_start", (event, ctx) => {
      observed.starts.push({
        reason: event.reason,
        mode: ctx?.mode ?? null,
        hasUI: ctx?.hasUI ?? null,
        registrations: (pi.getMcpServers() ?? []).map((s) => s.name),
      });
    });
    pi.on("session_shutdown", (event) => {
      observed.shutdowns.push({ reason: event.reason });
      try {
        observed.regsAtShutdown = (pi.getMcpServers() ?? []).map((s) => s.name);
      } catch {
        observed.regsAtShutdown = null;
      }
    });
  };
  const extensionFactories = [
    { name: "t02-companion", factory: t02Companion },
    {
      name: "t02-codemode",
      factory: createCodemodeExtension({ mode: "on", models: false }),
      replaceable: true,
    },
    { name: "t02-search", factory: createToolSearchExtension() },
    { name: "t02-mcp", factory: mcpFactory, replaceable: true },
    { name: "t02-observer", factory: observerFactory },
  ];

  const runtime = await createAgentSessionRuntime(
    async ({ cwd: factoryCwd, agentDir: factoryAgentDir, sessionManager }) => {
      const services = await createAgentSessionServices({
        cwd: factoryCwd,
        agentDir: factoryAgentDir,
        settingsManager,
        modelRuntime,
        resourceLoaderOptions: {
          extensionFactories,
          noExtensions: true,
          noSkills: true,
          noPromptTemplates: true,
          noThemes: true,
          noContextFiles: true,
        },
      });
      const loaded = services.resourceLoader.getExtensions();
      const expected = expectedTargetProfile(scenario);
      const { byPath, rawWarnings } = checkInventoryShape(loaded, expected, "hidden-profile");
      recordTargetInventory(journal, loaded, byPath, rawWarnings);
      journal.record("launcher", "static_settings", {
        runtimeRole: "target",
        settingsProvenance: "launcher-owned-loadConfig",
        names: settings.names,
        entries: settings.entries,
      });
      journal.record("launcher", "binding_check", {
        runtimeRole: "target",
        present: binding.present,
        candidateCount: binding.candidateCount,
        valid: binding.valid,
        reason: binding.reason,
      });
      journal.record("launcher", "prebind_check", {
        runtimeRole: "target",
        supported: true,
        reason: "profile-ok",
        targetBound: false,
        targetLoadConfigCalls: 0,
        targetTransportAttempts: 0,
        registrations: [],
      });
      const created = await createAgentSessionFromServices({
        services,
        sessionManager,
        model: handle.getModel(),
        thinkingLevel: "off",
        excludeTools: [ORCHESTRATOR_TOOL],
      });
      return {
        session: created.session,
        services,
        extensionsResult: created.extensionsResult,
        diagnostics: [...services.diagnostics],
      };
    },
    { cwd, agentDir, sessionManager: SessionManager.inMemory() },
  );

  const session = runtime.session;
  sessionRef.current = session;
  let promptError = null;
  let timeoutFired = false;
  try {
    await session.bindExtensions({ mode: "print" });
    journal.record("launcher", "session", { transition: "start", reason: "bind-mode:print" });
    if (observed.starts.length !== 1) {
      throw new Error(`hidden-start-observations:${observed.starts.length}`);
    }
    const startCtx = observed.starts[0];
    if (startCtx.mode !== "print") throw new Error("unexpected-hidden-mode");
    if (startCtx.hasUI !== false) throw new Error("unexpected-hidden-hasUI");
    journal.record("launcher", "session-context", {
      transition: "start",
      reason: startCtx.reason ?? null,
      mode: startCtx.mode,
      hasUI: startCtx.hasUI,
      uiInjected: false,
      registrations: startCtx.registrations,
    });
    journal.record("launcher", "preflight", {
      mode: startCtx.mode,
      hasUI: startCtx.hasUI,
      uiInjected: false,
      supported: true,
      reason: "hidden-readonly-profile",
      inventoryProvenance: "actual-sdk-loader",
      resourceAliases: [
        "experimental-companion:t02",
        "builtin:codemode",
        "builtin:tool-search",
        "builtin:mcp",
        "observer:t02",
      ],
      boundMode: "print",
    });

    const started = new Map();
    const ended = new Map();
    const endInfo = new Map();
    const startOrder = [];
    const unsubscribe = session.subscribe((event) => {
      if (!event || typeof event.type !== "string") return;
      if (event.type === "tool_execution_start") {
        started.set(event.toolCallId, event.toolName ?? null);
        startOrder.push(event.toolCallId);
        journal.record("pi", "tool_call", {
          name: event.toolName ?? null,
          toolCallId: event.toolCallId ?? null,
          parentToolCallId: event.parentToolCallId ?? null,
        });
      } else if (event.type === "tool_execution_end") {
        ended.set(event.toolCallId, true);
        const parsed = classifyResult(event.result);
        endInfo.set(event.toolCallId, {
          isError: event.isError === true,
          code: parsed.code,
          reason: parsed.reason,
        });
        journal.record("pi", "tool_result", {
          name: event.toolName ?? null,
          toolCallId: event.toolCallId ?? null,
          parentToolCallId: event.parentToolCallId ?? null,
          isError: event.isError === true,
          code: parsed.code,
          reason: parsed.reason,
        });
      }
    });
    const timer = setTimeout(() => {
      timeoutFired = true;
      try {
        const maybe = session.abort();
        if (maybe && typeof maybe.catch === "function") maybe.catch(() => {});
      } catch {
        // ignore abort errors; the timeout itself is the observation
      }
    }, PROMPT_BUDGET_MS);
    try {
      await session.prompt(`SYNTHETIC T02 ${scenario}`);
    } catch (err) {
      promptError = err instanceof Error ? err.message : String(err);
    } finally {
      clearTimeout(timer);
      unsubscribe();
    }
    journal.record("launcher", "prompt", { error: promptError, timeoutFired });

    if (!connectedDone) throw new Error("hidden-discovery-unobserved");
    if (started.size !== 2 || ended.size !== 2) throw new Error("hidden-pipeline-count");
    const readId = startOrder.find((id) => started.get(id) === READ_TOOL);
    const createId = startOrder.find((id) => started.get(id) === CREATE_TOOL);
    if (!readId || !createId) throw new Error("hidden-endpoint-mismatch");
    for (const [toolCallId] of ended) {
      if (!started.has(toolCallId)) throw new Error(`hidden-extra-end:${String(toolCallId)}`);
    }
    const readEnd = endInfo.get(readId);
    const createEnd = endInfo.get(createId);
    if (!readEnd || readEnd.isError !== false || readEnd.code !== null) {
      throw new Error("hidden-read-failed");
    }
    // Unreachable hidden tool: native unavailable result, never a print-mode
    // gate denial and never a receiver execution code.
    if (!createEnd || createEnd.isError !== true) throw new Error("hidden-create-not-denied");
    if (createEnd.code !== null) throw new Error(`hidden-create-code:${String(createEnd.code)}`);
    if (createEnd.reason !== "unknown-tool") throw new Error("hidden-create-not-unavailable");
    if (loadConfigCalls < 1) throw new Error("hidden-loadconfig-not-observed");
    if (!fileExists(ledgerPath)) throw new Error("missing-ledger-file");
  } finally {
    await runtime.dispose();
  }
  if (observed.shutdowns.length < 1) throw new Error("missing-hidden-shutdown");
  journal.record("launcher", "session", {
    transition: "shutdown",
    reason: observed.shutdowns.map((s) => s.reason ?? "unknown").join(","),
  });

  const info = probeRuntime(repoRoot);
  journal.record("launcher", "provider", {
    piAiVersion: info.piAi,
    provider: SCRIPTED_PROVIDER_ID,
    model: SCRIPTED_MODEL_ID,
  });
  journal.record("launcher", "runtime", info.record);
  if (listSocks(runDir).length > 0) throw new Error("unexpected-sockets");
  journal.record("launcher", "worker_cleanup", {
    shutdownObserved: true,
    ledgerPresent: true,
    listenersClosed: true,
    rootsRemoved: false,
    remainingListeners: 0,
  });
  const completed = promptError === null && !timeoutFired;
  return {
    completed,
    result: {
      completed,
      runtime: info.record,
      seedDigest: SEED_DIGEST,
      limits: { promptError, timeoutFired },
    },
  };
}

main().catch((err) => {
  process.stderr.write(
    `t02-preflight-worker: fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exitCode = 1;
});
