/**
 * T02 S2A connected readonly worker: generic-readonly/sdk only.
 *
 * Child-process entry spawned by driver/run.mjs with a complete explicit
 * environment. First module in this process importing Pi. Native MCP
 * connection to the fixture's generic read-only default WITHOUT the
 * experimental approval companion, sidecar, binding file, or listener.
 * Tests default receiver refusal + native connected discovery, never
 * approval-gate feasibility.
 *
 * Trace travels only via the owned shared journal (T02_SHARED_JOURNAL,
 * producer `sdk-worker`); the fixture appends as producer `fixture`.
 * Stdout carries one JSON result line. No process.exit: exitCode is set and
 * the process finishes naturally with flushed stdio.
 */

import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { openSharedJournal } from "./event-journal.mjs";
import { SEED_DIGEST } from "./scenarios.mjs";
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

function parseArgs(argv) {
  const get = (flag) => {
    const i = argv.indexOf(flag);
    if (i === -1 || i + 1 >= argv.length) {
      process.stderr.write(`t02-readonly-worker: missing ${flag}\n`);
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
    process.stderr.write(`t02-readonly-worker: missing required environment: ${name}\n`);
    process.exitCode = 1;
    throw new Error(`missing-env:${name}`);
  }
  return value;
}

async function main() {
  try {
    const { scenario, repoRoot } = parseArgs(process.argv.slice(2));
    if (scenario !== "generic-readonly")
      throw new Error(`S2A authorizes only generic-readonly (got ${scenario})`);
    const journal = openSharedJournal(requiredEnv("T02_SHARED_JOURNAL"), "sdk-worker");
    const outcome = await runReadonly({ scenario, journal, repoRoot });
    journal.close();
    process.stdout.write(`${JSON.stringify(outcome.result)}\n`);
    process.exitCode = outcome.completed ? 0 : 1;
  } catch (err) {
    try {
      process.stdout.write(`${JSON.stringify({ completed: false })}\n`);
    } catch {
      // ignore stdout failure; exit code reports failure
    }
    process.stderr.write(
      `t02-readonly-worker: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exitCode = 1;
  }
}

async function runReadonly({ scenario, journal, repoRoot }) {
  const turnsPath = requiredEnv("T02_TURNS_FILE");
  const ledgerPath = requiredEnv("T02_LEDGER_FILE");
  const runDir = requiredEnv("T02_RUN_DIR");
  const agentDir = requiredEnv("PI_CODING_AGENT_DIR");
  const fixtureEntry = requiredEnv("T02_FIXTURE_ENTRY");
  const cwd = process.cwd();

  // Explicit launcher-owned fixture entry, verified against the approved path.
  const approvedFixture = join(repoRoot, "experiments", "t02", "fixture-server", "server.mjs");
  if (fixtureEntry !== approvedFixture) {
    throw new Error("fixture-entry-mismatch");
  }

  let turns;
  try {
    turns = JSON.parse(readFileSync(turnsPath, "utf8"));
  } catch {
    throw new Error("turns-unreadable-or-malformed");
  }

  // First-request inventory observation (faux factory hook, once only).
  let inventoryObserved = null;
  const handle = createScriptedProvider(turns, {
    onRequest: () => {
      if (inventoryObserved !== null) return;
      const active = sessionRef.current?.getActiveToolNames();
      if (
        !Array.isArray(active) ||
        active.length !== EXPECTED_TOOLS.length ||
        !EXPECTED_TOOLS.every((name) => active.includes(`${EXPECTED_TOOL_PREFIX}${name}`))
      ) {
        throw new Error("first-request-inventory-mismatch");
      }
      inventoryObserved = active;
      journal.record("launcher", "first-request-inventory", {
        tools: active.map((name) => name.slice(EXPECTED_TOOL_PREFIX.length)),
      });
      if (loadConfigCalls < 1 || !fileExists(ledgerPath))
        throw new Error("unobserved-fixture-discovery");
      journal.record("launcher", "registration", {
        server: "synth-gt",
        policy: "readonly",
        registered: true,
        connected: true,
        spawned: true,
        reason: "configured-entry-native-discovery-child-ledger",
        loadConfigCalls,
      });
    },
  });
  const sessionRef = { current: null };
  const model = handle.getModel();
  if (!model || model.provider !== SCRIPTED_PROVIDER_ID || model.id !== SCRIPTED_MODEL_ID) {
    throw new Error("provider-identity-mismatch");
  }

  const modelRuntime = await ModelRuntime.create({
    authPath: join(agentDir, "auth.json"),
    modelsPath: null,
    modelsStorePath: join(agentDir, "models-store.json"),
    allowModelNetwork: false,
    refreshOnCreate: false,
  });
  modelRuntime.registerNativeProvider(handle.provider);

  const settingsManager = SettingsManager.inMemory({
    defaultTools: [],
    retry: { enabled: false, maxRetries: 0 },
    compaction: { enabled: false },
  });

  // Native MCP: explicit empty-then-one profile via loadConfig; default
  // transport (no pre-spawn, no mock). No sidecar/binding flags: the
  // receiver stays on its read-only default.
  let loadConfigCalls = 0;
  const mcpFactory = createMcpExtension({
    loadConfig: () => {
      loadConfigCalls += 1;
      journal.record("launcher", "mcp-load-config", { call: loadConfigCalls, servers: 1 });
      return {
        servers: [
          {
            name: "synth-gt",
            config: {
              command: process.execPath,
              args: [
                fixtureEntry,
                "--t02-ledger-file",
                ledgerPath,
                "--t02-event-journal",
                requiredEnv("T02_SHARED_JOURNAL"),
              ],
              exposure: "direct",
            },
            source: "t02-s2a-native",
          },
        ],
        errors: [],
        autoEnableCodemode: false,
      };
    },
    logPath: join(runDir, "mcp.log"),
  });

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
    { name: "t02-codemode", factory: createCodemodeExtension({ mode: "on" }) },
    { name: "t02-search", factory: createToolSearchExtension() },
    { name: "t02-mcp", factory: mcpFactory },
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
      assertExactProfile(services.resourceLoader.getExtensions(), journal);
      const created = await createAgentSessionFromServices({
        services,
        sessionManager,
        model: handle.getModel(),
        thinkingLevel: "off",
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
      throw new Error(`session-start-observations:${observed.starts.length}`);
    }
    const startCtx = observed.starts[0];
    journal.record("launcher", "session-context", {
      transition: "start",
      reason: startCtx.reason ?? null,
      mode: startCtx.mode,
      hasUI: startCtx.hasUI,
      uiInjected: false,
      registrations: startCtx.registrations,
    });
    if (startCtx.mode !== "print")
      throw new Error(`unexpected-actual-mode:${String(startCtx.mode)}`);
    if (startCtx.hasUI !== false)
      throw new Error(`unexpected-actual-hasUI:${String(startCtx.hasUI)}`);

    journal.record("launcher", "preflight", {
      mode: startCtx.mode,
      hasUI: startCtx.hasUI,
      uiInjected: false,
      supported: true,
      reason: "exact-inline-profile-and-observed-print-noUI",
      inventoryProvenance: "actual-sdk-loader",
      resourceAliases: ["builtin:codemode", "builtin:tool-search", "builtin:mcp", "observer:t02"],
      boundMode: "print",
    });

    // No approval companion exists in this generic profile; the gate is never
    // weakened. Registration readonly is confirmed below by configuration,
    // native discovery, and owned child observations.
    const started = new Map();
    const ended = new Map();
    const turnResults = [];
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
      } else if (event.type === "turn_end" && Array.isArray(event.toolResults)) {
        for (const result of event.toolResults) turnResults.push(turnResultSummary(result));
      }
    });

    const timer = setTimeout(() => {
      timeoutFired = true;
      try {
        const maybe = session.abort();
        if (maybe && typeof maybe.catch === "function") {
          maybe.catch(() => {
            // abort rejection is itself an observation, not a crash
          });
        }
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

    // First-request inventory must have observed all seven qualified names.
    if (inventoryObserved === null) throw new Error("inventory-not-observed");
    const unqualified = inventoryObserved.map((t) => t.replace(/^mcp__synth_gt__/, ""));
    if (unqualified.length !== 7 || !EXPECTED_TOOLS.every((t) => unqualified.includes(t))) {
      throw new Error(`inventory-mismatch:${unqualified.join(",")}`);
    }

    // Endpoint verification with joined outcomes.
    if (started.size !== 2 || ended.size !== 2) throw new Error("unexpected-pipeline-call-count");
    for (const [toolCallId] of ended) {
      if (!started.has(toolCallId)) throw new Error(`extra-end:${String(toolCallId)}`);
    }
    for (const [toolCallId, name] of started) {
      if (!ended.has(toolCallId)) throw new Error(`missing-end:${String(toolCallId)}`);
      if (typeof name !== "string" || !name.startsWith(EXPECTED_TOOL_PREFIX)) {
        throw new Error(`unexpected-call:${String(name)}`);
      }
    }
    const turnByCallId = new Map(turnResults.map((r) => [r.toolCallId, r]));
    let sawReadSuccess = false;
    let sawCreateRefusal = false;
    for (const toolCallId of started.keys()) {
      const turn = turnByCallId.get(toolCallId);
      if (!turn) throw new Error(`unmatched-turn:${String(toolCallId)}`);
      const callName = started.get(toolCallId);
      if (callName === `${EXPECTED_TOOL_PREFIX}get_exercise`) {
        if (turn.isError !== false || turn.code !== null)
          throw new Error(`unexpected-read:${turn.reason ?? "unknown"}`);
        sawReadSuccess = true;
      } else if (callName === `${EXPECTED_TOOL_PREFIX}create_routine`) {
        if (turn.isError !== true || turn.code !== "write_approval_required") {
          throw new Error(`unexpected-create:${turn.code ?? turn.reason ?? "unknown"}`);
        }
        sawCreateRefusal = true;
      }
    }
    if (!sawReadSuccess) throw new Error("missing-read-success");
    if (!sawCreateRefusal) throw new Error("missing-create-refusal");

    // Registration readonly, confirmed by configuration + discovery + child.
    const ledgerExists = fileExists(ledgerPath);
    if (!ledgerExists) throw new Error("missing-ledger-file");
    if (loadConfigCalls !== 1) throw new Error("unexpected-config-reload");
  } finally {
    await runtime.dispose();
  }

  if (observed.shutdowns.length < 1) throw new Error("missing-shutdown-observation");
  journal.record("launcher", "session", {
    transition: "shutdown",
    reason: observed.shutdowns.map((s) => s.reason ?? "unknown").join(","),
  });

  const runtimeInfo = probeRuntime(repoRoot);
  journal.record("launcher", "provider", {
    piAiVersion: runtimeInfo.piAi,
    provider: SCRIPTED_PROVIDER_ID,
    model: SCRIPTED_MODEL_ID,
  });
  journal.record("launcher", "runtime", runtimeInfo.record);
  const sockFiles = listSocks(runDir);
  if (sockFiles.length > 0) throw new Error(`unexpected-sockets:${sockFiles.join(",")}`);
  journal.record("launcher", "worker_cleanup", {
    shutdownObserved: true,
    ledgerPresent: true,
    listenersClosed: true,
    rootsRemoved: false,
    remainingListeners: 0,
  });

  return {
    completed: promptError === null && !timeoutFired,
    result: {
      completed: promptError === null && !timeoutFired,
      runtime: runtimeInfo.record,
      seedDigest: SEED_DIGEST,
      limits: { promptError, timeoutFired },
    },
  };
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
      if (parsed && typeof parsed === "object" && parsed.ok === true)
        return { code: null, reason: "success" };
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

function turnResultSummary(result) {
  const summary = {
    toolCallId: result?.toolCallId ?? null,
    toolName: result?.toolName ?? null,
    isError: result?.isError === true,
    code: null,
    reason: "unstructured",
  };
  const parsed = classifyResult(result);
  summary.code = parsed.code;
  summary.reason = parsed.reason;
  return summary;
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

function assertExactProfile(loaded, journal) {
  const problems = [];
  const byPath = new Map((loaded.extensions ?? []).map((ext) => [String(ext.path), ext]));
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
  }
  for (const err of loaded.errors ?? []) problems.push(`loader-error:${err.path}:${err.error}`);
  journal.record("launcher", "resource_inventory", {
    inventoryProvenance: "actual-sdk-loader",
    resourceAliases: ["builtin:codemode", "builtin:tool-search", "builtin:mcp", "observer:t02"],
    boundMode: "print",
    inlineProfiles: [...byPath.entries()].map(([path, ext]) => ({
      path,
      handlers: [...(ext.handlers?.keys() ?? [])].sort(),
      tools: [...(ext.tools?.keys() ?? [])].sort(),
      commands: [...(ext.commands?.keys() ?? [])].sort(),
    })),
    loaderErrors: (loaded.errors ?? []).map((e) => ({ path: String(e.path), error: e.error })),
    staticMcp: [],
  });
  if (problems.length > 0) throw new Error(`profile-mismatch:${problems.join(";")}`);
}

main().catch((err) => {
  process.stderr.write(
    `t02-readonly-worker: fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exitCode = 1;
});
