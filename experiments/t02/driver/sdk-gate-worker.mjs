/**
 * T02 companion-managed gate worker: direct-readonly/sdk (R1) plus
 * deferred/codemode/nested-readonly/sdk (R2).
 *
 * Child-process entry spawned by driver/run.mjs with a complete explicit
 * environment. First module in this process importing Pi. The original
 * compiled companion (`experiments/t02/dist/index.js`, never a staged copy)
 * is loaded FIRST as a named inline extension; installed
 * codemode/search/MCP/observer factories follow. Native MCP loadConfig is
 * empty: the companion's own registerMcpServer call owns the single readonly
 * fixture. Route loadouts (default tools, model-tool exclusions, codemode
 * options) are bounded per scenario below.
 *
 * A strict private synthetic tuple file (launcher-owned T02_BINDING_FILE)
 * enables the companion's read-only registration, never write capability.
 * No sidecar/binding flags reach the receiver; print binding, no injected
 * UI, approvals, or listeners.
 *
 * Trace travels only via the owned shared journal (T02_SHARED_JOURNAL,
 * producer `sdk-worker` for launcher/pi records); the companion appends as
 * producer `companion` and the fixture as producer `fixture`. Stdout carries
 * one JSON result line. No process.exit: exitCode is set and the process
 * finishes naturally with flushed stdio.
 */

import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { openSharedJournal } from "./event-journal.mjs";
import { SEED_DIGEST, getScenario } from "./scenarios.mjs";
import t02Companion from "../dist/index.js";
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
const CREATE_TOOL = `${EXPECTED_TOOL_PREFIX}create_routine`;
const READ_TOOL = `${EXPECTED_TOOL_PREFIX}get_exercise`;
const ORCHESTRATOR_TOOL = "t02_orchestrate";
const SEARCH_TOOL = "tool_search";
const CODEMODE_TOOL = "codemode";
const GATE_ROUTES = [
  "direct-readonly",
  "deferred-readonly",
  "codemode-readonly",
  "nested-readonly",
];
const R2_ROUTES = ["deferred-readonly", "codemode-readonly", "nested-readonly"];
// Public model-tool exclusion per route. Nested keeps the orchestrator.
const ROUTE_EXCLUDE_TOOLS = {
  "direct-readonly": [ORCHESTRATOR_TOOL],
  "deferred-readonly": [ORCHESTRATOR_TOOL],
  "codemode-readonly": [ORCHESTRATOR_TOOL],
  "nested-readonly": [],
};
// Extra active tool per R2 route besides the seven fixture tools.
const ROUTE_EXTRA_ACTIVE = {
  "deferred-readonly": [SEARCH_TOOL],
  "codemode-readonly": [CODEMODE_TOOL],
  "nested-readonly": [ORCHESTRATOR_TOOL],
};
// Exact first-request callable sets per R2 route (genuine loader behavior:
// indirect tools are not callable before wrapper discovery/startup sync).
const ROUTE_FIRST_CALLABLE = {
  "deferred-readonly": [],
  "codemode-readonly": [],
  "nested-readonly": [...qualifiedFixtureTools(), ORCHESTRATOR_TOOL],
};
// Exact connected sets per R2 route: active/callable tables from genuine
// discovery observations. Hidden exposure stays empty in every profile.
const ROUTE_CONNECTED_SETS = {
  "deferred-readonly": {
    active: [SEARCH_TOOL, ...qualifiedFixtureTools()],
    callable: qualifiedFixtureTools(),
  },
  "codemode-readonly": {
    active: [CODEMODE_TOOL],
    callable: qualifiedFixtureTools(),
  },
  "nested-readonly": {
    active: [...qualifiedFixtureTools(), ORCHESTRATOR_TOOL],
    callable: [...qualifiedFixtureTools(), ORCHESTRATOR_TOOL],
  },
};

function parseArgs(argv) {
  const get = (flag) => {
    const i = argv.indexOf(flag);
    if (i === -1 || i + 1 >= argv.length) {
      process.stderr.write(`t02-gate-worker: missing ${flag}\n`);
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
    process.stderr.write(`t02-gate-worker: missing required environment: ${name}\n`);
    process.exitCode = 1;
    throw new Error(`missing-env:${name}`);
  }
  return value;
}

async function main() {
  try {
    const { scenario, repoRoot } = parseArgs(process.argv.slice(2));
    if (!GATE_ROUTES.includes(scenario))
      throw new Error(`gate worker authorizes only ${GATE_ROUTES.join(",")} (got ${scenario})`);
    if (typeof t02Companion !== "function") throw new Error("companion-factory-not-function");
    const journal = openSharedJournal(requiredEnv("T02_SHARED_JOURNAL"), "sdk-worker");
    const outcome = await runGate({ scenario, journal, repoRoot });
    journal.close();
    process.stdout.write(`${JSON.stringify(outcome.result)}\n`);
    process.exitCode = outcome.completed ? 0 : 1;
  } catch (err) {
    try {
      process.stdout.write(`${JSON.stringify({ completed: false })}\n`);
    } catch {
      // ignore stdout failure; exit code reports failure
    }
    process.stderr.write(`t02-gate-worker: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  }
}

async function runGate({ scenario, journal, repoRoot }) {
  const turnsPath = requiredEnv("T02_TURNS_FILE");
  const ledgerPath = requiredEnv("T02_LEDGER_FILE");
  const runDir = requiredEnv("T02_RUN_DIR");
  const agentDir = requiredEnv("PI_CODING_AGENT_DIR");
  const fixtureEntry = requiredEnv("T02_FIXTURE_ENTRY");
  const bindingFile = requiredEnv("T02_BINDING_FILE");
  const cwd = process.cwd();

  // Explicit launcher-owned fixture entry, verified against the approved path.
  // The companion resolves this same original path from its compiled location;
  // the worker never pre-spawns or substitutes it.
  const approvedFixture = join(repoRoot, "experiments", "t02", "fixture-server", "server.mjs");
  if (fixtureEntry !== approvedFixture) {
    throw new Error("fixture-entry-mismatch");
  }
  try {
    readFileSync(fixtureEntry, "utf8");
  } catch {
    throw new Error("approved-fixture-unreadable");
  }
  // Strict private synthetic tuple must exist before startup. Its values stay
  // private companion data: only presence is observed here, never contents.
  const bindingBytes = readBindingBytes(bindingFile);
  journal.record("launcher", "binding_present", { bytes: bindingBytes });

  let turns;
  try {
    turns = JSON.parse(readFileSync(turnsPath, "utf8"));
  } catch {
    throw new Error("turns-unreadable-or-malformed");
  }

  // Bounded route loadout from the scenario registry. R1 keeps its accepted
  // direct profile; R2 routes use their fixed exposure/default-tools setup.
  const registry = getScenario(scenario);
  const isR2 = R2_ROUTES.includes(scenario);
  const routeDefaultTools = Array.isArray(registry.defaultTools) ? registry.defaultTools : [];
  const routeExcludeTools = ROUTE_EXCLUDE_TOOLS[scenario] ?? [ORCHESTRATOR_TOOL];
  let connectedRegistered = false;
  let searchObserved = null;

  // First-request observation (faux factory hook, once only). Direct keeps
  // its accepted seven-name inventory; R2 routes record exact phase
  // active/callable/hidden sets from the selected session APIs.
  let inventoryObserved = null;
  const handle = createScriptedProvider(turns, {
    onRequest: () => {
      if (inventoryObserved !== null) return;
      const session = sessionRef.current;
      if (scenario === "direct-readonly") {
        const active = session?.getActiveToolNames();
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
        if (!fileExists(ledgerPath)) throw new Error("unobserved-fixture-discovery");
        // Connected readonly confirmation: only after actual native discovery
        // and startup, never from the companion's pending declaration alone.
        emitConnectedRegistration(journal, loadConfigCalls);
        return;
      }
      // R2 indirect routes: exact first-request sets per loadout. Callable
      // stays a fixture-only subset here; fixtureTools records the allowed
      // actually-discovered subset without forcing empty.
      if (!session) throw new Error("first-request-no-session");
      const surface = captureSurface(session, journal, "first-request");
      requireExactNames(
        surface.callableTools,
        ROUTE_FIRST_CALLABLE[scenario] ?? [],
        "first-request-callable",
      );
      requireExactNames(surface.hiddenTools, [], "first-request-hidden");
      for (const name of surface.callableTools) {
        if (
          !name.startsWith(EXPECTED_TOOL_PREFIX) &&
          !(ROUTE_EXTRA_ACTIVE[scenario] ?? []).includes(name)
        ) {
          throw new Error(`first-request-unrelated-callable:${name}`);
        }
      }
      if (scenario === "nested-readonly") {
        // Direct discovery already complete: seven fixture plus orchestrator.
        requireExactNames(
          surface.activeTools,
          [...qualifiedFixtureTools(), ORCHESTRATOR_TOOL],
          "first-request-active",
        );
        inventoryObserved = surface.activeTools;
        // Connected surface pairs actual fixture tool_list with availability.
        assertConnectedSurface(session, journal, scenario);
        if (!fileExists(ledgerPath)) throw new Error("unobserved-fixture-discovery");
        emitConnectedRegistration(journal, loadConfigCalls);
        connectedRegistered = true;
      } else {
        requireExactNames(
          surface.activeTools,
          ROUTE_EXTRA_ACTIVE[scenario] ?? [],
          "first-request-active",
        );
        inventoryObserved = surface.activeTools;
      }
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
    defaultTools: routeDefaultTools,
    retry: { enabled: false, maxRetries: 0 },
    compaction: { enabled: false },
  });

  // Native MCP loadConfig is empty: the companion's registerMcpServer call
  // owns the only fixture. No manual pre-spawn, no generic substitute.
  let loadConfigCalls = 0;
  const mcpFactory = createMcpExtension({
    loadConfig: () => {
      loadConfigCalls += 1;
      journal.record("launcher", "mcp-load-config", { call: loadConfigCalls, servers: 0 });
      return { servers: [], errors: [], autoEnableCodemode: false };
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

  // Companion FIRST, then installed codemode/search/MCP/observer. The R2
  // codemode route needs no model-service capability (models:false).
  const extensionFactories = [
    { name: "t02-companion", factory: t02Companion },
    {
      name: "t02-codemode",
      factory:
        scenario === "codemode-readonly"
          ? createCodemodeExtension({ mode: "on", models: false })
          : createCodemodeExtension({ mode: "on" }),
    },
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
      assertExactProfile(services.resourceLoader.getExtensions(), journal, scenario);
      const created = await createAgentSessionFromServices({
        services,
        sessionManager,
        model: handle.getModel(),
        thinkingLevel: "off",
        excludeTools: routeExcludeTools,
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
      reason: "exact-inline-companion-profile-and-observed-print-noUI",
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
    const endOrder = [];
    const turnResults = [];
    const unsubscribe = session.subscribe((event) => {
      if (!event || typeof event.type !== "string") return;
      if (event.type === "tool_execution_start") {
        started.set(event.toolCallId, event.toolName ?? null);
        startOrder.push({
          toolCallId: event.toolCallId ?? null,
          name: event.toolName ?? null,
          parent: event.parentToolCallId ?? null,
        });
        // Safe join key only: the actual creation event's own operationId.
        // Full args never enter the journal.
        const record = {
          name: event.toolName ?? null,
          toolCallId: event.toolCallId ?? null,
          parentToolCallId: event.parentToolCallId ?? null,
        };
        if (event.toolName === CREATE_TOOL) {
          const args = event.args;
          if (args && typeof args === "object" && typeof args.operationId === "string") {
            record.operationId = args.operationId;
          }
        }
        journal.record("pi", "tool_call", record);
        // Codemode connected surface: inner read start arrives after native
        // MCP discovery wait, never from a constant list.
        if (
          isR2 &&
          scenario === "codemode-readonly" &&
          event.toolName === READ_TOOL &&
          (event.parentToolCallId ?? null) !== null &&
          !connectedRegistered
        ) {
          assertConnectedSurface(session, journal, scenario);
          if (!fileExists(ledgerPath)) throw new Error("unobserved-fixture-discovery");
          emitConnectedRegistration(journal, loadConfigCalls);
          connectedRegistered = true;
        }
      } else if (event.type === "tool_execution_end") {
        ended.set(event.toolCallId, true);
        endOrder.push({
          toolCallId: event.toolCallId ?? null,
          name: event.toolName ?? null,
        });
        const parsed = classifyResult(event.result);
        endInfo.set(event.toolCallId, {
          isError: event.isError === true,
          code: parsed.code,
          reason: parsed.reason,
          name: event.toolName ?? null,
          parent: event.parentToolCallId ?? null,
        });
        journal.record("pi", "tool_result", {
          name: event.toolName ?? null,
          toolCallId: event.toolCallId ?? null,
          parentToolCallId: event.parentToolCallId ?? null,
          isError: event.isError === true,
          code: parsed.code,
          reason: parsed.reason,
        });
        // Deferred discovery: the actual search end carries loaded names.
        if (isR2 && scenario === "deferred-readonly" && event.toolName === SEARCH_TOOL) {
          const loaded = event.result?.details?.loaded;
          searchObserved = {
            toolCallId: event.toolCallId ?? null,
            loadedTools: Array.isArray(loaded) ? [...loaded] : null,
            isError: event.isError === true,
          };
          journal.record("pi", "search_loaded", {
            toolCallId: event.toolCallId ?? null,
            loadedTools: searchObserved.loadedTools,
          });
          if (!connectedRegistered && event.isError !== true && Array.isArray(loaded)) {
            assertConnectedSurface(session, journal, scenario);
            if (!fileExists(ledgerPath)) throw new Error("unobserved-fixture-discovery");
            emitConnectedRegistration(journal, loadConfigCalls);
            connectedRegistered = true;
          }
        }
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

    // First-request observation must have fired. Direct-readonly keeps its
    // accepted seven-name inventory assertion; R2 routes assert their exact
    // phase surfaces inside the native hooks above.
    if (inventoryObserved === null) throw new Error("inventory-not-observed");
    if (!isR2) {
      const unqualified = inventoryObserved.map((t) => t.replace(/^mcp__synth_gt__/, ""));
      if (unqualified.length !== 7 || !EXPECTED_TOOLS.every((t) => unqualified.includes(t))) {
        throw new Error(`inventory-mismatch:${unqualified.join(",")}`);
      }
    }

    // R2 indirect routes verify their exact native endpoints/parents here;
    // the direct-readonly block below is the preserved R1 path.
    if (isR2) {
      verifyR2Endpoints({
        scenario,
        started,
        ended,
        startOrder,
        endOrder,
        endInfo,
        searchObserved,
        connectedRegistered,
      });
    } else {
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
      let sawCreateDenial = false;
      for (const toolCallId of started.keys()) {
        const turn = turnByCallId.get(toolCallId);
        if (!turn) throw new Error(`unmatched-turn:${String(toolCallId)}`);
        const callName = started.get(toolCallId);
        if (callName === READ_TOOL) {
          if (turn.isError !== false || turn.code !== null)
            throw new Error(`unexpected-read:${turn.reason ?? "unknown"}`);
          sawReadSuccess = true;
        } else if (callName === CREATE_TOOL) {
          // Genuine host gate denial: isError without a structured receiver
          // code. Unavailable/unknown-tool is not a pass for this connected
          // case; write_approval_required would be the wrong (generic) route.
          if (turn.isError !== true) throw new Error("creation-not-denied");
          if (turn.code !== null) throw new Error(`unexpected-create-code:${String(turn.code)}`);
          if (turn.reason === "unknown-tool") throw new Error("creation-unavailable-not-connected");
          sawCreateDenial = true;
        }
      }
      if (!sawReadSuccess) throw new Error("missing-read-success");
      if (!sawCreateDenial) throw new Error("missing-create-denial");
    }

    const ledgerExists = fileExists(ledgerPath);
    if (!ledgerExists) throw new Error("missing-ledger-file");
    if (loadConfigCalls < 1) throw new Error("loadConfig-not-observed");
  } finally {
    // Genuine shutdown first: dispose awaits shutdown handlers before the
    // session itself is disposed. Bare session.dispose is not evidence.
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

function qualifiedFixtureTools() {
  return EXPECTED_TOOLS.map((name) => `${EXPECTED_TOOL_PREFIX}${name}`);
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

// Actual selected-runtime tool surface from the public session APIs.
// Never intended settings, constant lists, arguments, scripts or paths.
function captureSurface(session, journal, phase) {
  const activeTools = session.getActiveToolNames();
  const callableTools = session.getCallableToolNames();
  const allEntries = session.getAllTools();
  if (!Array.isArray(activeTools) || !Array.isArray(callableTools) || !Array.isArray(allEntries)) {
    throw new Error(`surface-not-array:${phase}`);
  }
  const allTools = allEntries.map((t) => t?.name).filter((n) => typeof n === "string");
  requireNoDuplicates(activeTools, `surface:${phase}:active`);
  requireNoDuplicates(callableTools, `surface:${phase}:callable`);
  requireNoDuplicates(allTools, `surface:${phase}:all`);
  // Hidden means actual exposure:hidden from getAllTools, never
  // registered-minus-callable: inactive builtins and model-only
  // search/codemode are not hidden exposure.
  const hiddenTools = allEntries
    .filter((t) => t && t.exposure === "hidden")
    .map((t) => t.name)
    .filter((n) => typeof n === "string");
  requireNoDuplicates(hiddenTools, `surface:${phase}:hidden`);
  // Fixture availability is observed from callable names: codemode/deferred
  // exposures are callable without ever becoming active, so active alone
  // cannot establish the seven connected fixture tools.
  const fixtureTools = callableTools
    .filter((n) => n.startsWith(EXPECTED_TOOL_PREFIX))
    .map((n) => n.slice(EXPECTED_TOOL_PREFIX.length));
  const surface = { activeTools, callableTools, hiddenTools, fixtureTools };
  journal.record("launcher", "tool_surface", { phase, ...surface });
  return surface;
}

// Connected surface: exact tabled active/callable sets per route, empty
// hidden exposure, and all seven unqualified fixture names available.
function assertConnectedSurface(session, journal, route) {
  const expected = ROUTE_CONNECTED_SETS[route];
  if (!expected) throw new Error(`connected-sets-unknown:${route}`);
  const surface = captureSurface(session, journal, "connected");
  requireExactNames(surface.activeTools, expected.active, "connected-active");
  requireExactNames(surface.callableTools, expected.callable, "connected-callable");
  requireExactNames(surface.hiddenTools, [], "connected-hidden");
  requireExactNames(surface.fixtureTools, EXPECTED_TOOLS, "connected-fixture");
  return surface;
}

function emitConnectedRegistration(journal, loadConfigCalls) {
  journal.record("launcher", "registration", {
    server: "synth-gt",
    policy: "readonly",
    registered: true,
    connected: true,
    spawned: true,
    reason: "companion-entry-native-discovery-child-ledger",
    loadConfigCalls,
  });
}

// R2 endpoint verification from genuine execution events only. Inner calls
// never appear in the transcript, so turn_end cannot join them; native
// IDs/parents and actual end outcomes are decisive.
function verifyR2Endpoints({
  scenario,
  started,
  ended,
  startOrder,
  endOrder,
  endInfo,
  searchObserved,
  connectedRegistered,
}) {
  if (started.size !== 3 || ended.size !== 3) throw new Error("unexpected-pipeline-call-count");
  if (new Set(startOrder.map((e) => e.toolCallId)).size !== 3) throw new Error("duplicate-call-id");
  for (const toolCallId of ended.keys()) {
    if (!started.has(toolCallId)) throw new Error(`extra-end:${String(toolCallId)}`);
  }
  for (const toolCallId of started.keys()) {
    if (!ended.has(toolCallId)) throw new Error(`missing-end:${String(toolCallId)}`);
  }
  const indexOf = (list, id) => list.findIndex((e) => e.toolCallId === id);
  const startsOf = (name) => startOrder.filter((e) => e.name === name).map((e) => e.toolCallId);
  const endOf = (id) => {
    const info = endInfo.get(id);
    if (!info) throw new Error(`missing-end-info:${String(id)}`);
    return info;
  };
  const requireDeniedCreation = (id) => {
    const end = endOf(id);
    if (end.isError !== true) throw new Error("creation-not-denied");
    if (end.code !== null) throw new Error(`unexpected-create-code:${String(end.code)}`);
    if (end.reason === "unknown-tool") throw new Error("creation-unavailable-not-connected");
  };

  if (scenario === "deferred-readonly") {
    const search = startsOf(SEARCH_TOOL);
    const reads = startsOf(READ_TOOL);
    const creates = startsOf(CREATE_TOOL);
    if (search.length !== 1 || reads.length !== 1 || creates.length !== 1) {
      throw new Error("deferred-endpoint-mismatch");
    }
    const [searchId] = search;
    const [readId] = reads;
    const [createId] = creates;
    // Deferred calls are direct model calls with null parents.
    for (const entry of startOrder) {
      if (entry.parent !== null) throw new Error("non-direct-parent");
    }
    const order = [searchId, readId, createId].map((id) => indexOf(startOrder, id));
    if (!(order[0] < order[1] && order[1] < order[2])) throw new Error("deferred-call-order");
    const searchEnd = endOf(searchId);
    if (searchEnd.isError !== false) throw new Error("search-not-loaded");
    const readEnd = endOf(readId);
    if (readEnd.isError !== false || readEnd.code !== null) {
      throw new Error(`unexpected-read:${readEnd.reason ?? "unknown"}`);
    }
    requireDeniedCreation(createId);
    // The actual search ID joins seven actually loaded tools.
    if (!searchObserved) throw new Error("search-not-observed");
    if (searchObserved.toolCallId !== searchId) throw new Error("search-id-mismatch");
    if (searchObserved.isError !== false) throw new Error("search-not-loaded");
    requireExactNames(searchObserved.loadedTools, qualifiedFixtureTools(), "search-loaded");
    if (!connectedRegistered) throw new Error("connected-registration-missing");
    return;
  }

  // Codemode/nested: one outer call with two nested children carrying the
  // actual outer ID as parent. Outer causal bounds enclose the children.
  const outerName = scenario === "codemode-readonly" ? CODEMODE_TOOL : ORCHESTRATOR_TOOL;
  const outers = startsOf(outerName);
  if (outers.length !== 1) throw new Error("outer-endpoint-mismatch");
  const [outerId] = outers;
  const outerStart = startOrder.find((e) => e.toolCallId === outerId);
  if (!outerStart || outerStart.parent !== null) throw new Error("outer-parent-not-null");
  const children = startOrder.filter((e) => e.parent === outerId);
  if (children.length !== 2) throw new Error("inner-endpoint-mismatch");
  const readStart = children.find((e) => e.name === READ_TOOL);
  const createStart = children.find((e) => e.name === CREATE_TOOL);
  if (!readStart || !createStart) throw new Error("inner-endpoint-names");
  if (
    indexOf(startOrder, outerId) > indexOf(startOrder, readStart.toolCallId) ||
    indexOf(startOrder, readStart.toolCallId) > indexOf(startOrder, createStart.toolCallId)
  ) {
    throw new Error("inner-call-order");
  }
  if (
    indexOf(endOrder, readStart.toolCallId) > indexOf(endOrder, createStart.toolCallId) ||
    indexOf(endOrder, createStart.toolCallId) > indexOf(endOrder, outerId)
  ) {
    throw new Error("outer-causal-bounds");
  }
  const readEnd = endOf(readStart.toolCallId);
  if (readEnd.isError !== false || readEnd.code !== null) {
    throw new Error(`unexpected-read:${readEnd.reason ?? "unknown"}`);
  }
  requireDeniedCreation(createStart.toolCallId);
  if (!connectedRegistered) throw new Error("connected-registration-missing");
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

function readBindingBytes(path) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new Error("binding-file-unreadable", { cause: err });
  }
  if (raw.length === 0) throw new Error("binding-file-empty");
  return Buffer.byteLength(raw, "utf8");
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

function assertExactProfile(loaded, journal, scenario) {
  const problems = [];
  const byPath = new Map((loaded.extensions ?? []).map((ext) => [String(ext.path), ext]));
  const expected = {
    "<inline:t02-companion>": {
      handlers: ["session_shutdown", "session_start", "tool_call"],
      tools: [ORCHESTRATOR_TOOL],
      commands: [],
    },
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
  // R2 prebind warning review (§6): actual loader warnings must be empty.
  // Recorded with safe inline/external categories, never raw private paths.
  // The direct-readonly R1 historical record shape is unchanged.
  const isR2Review = R2_ROUTES.includes(scenario);
  const rawWarnings = Array.isArray(loaded.warnings) ? loaded.warnings : [];
  const loaderWarnings = rawWarnings.map((w) => ({
    source: w && typeof w.path === "string" && w.path.startsWith("<inline:") ? w.path : "external",
    warning: w && typeof w.warning === "string" ? w.warning : "unknown",
  }));
  journal.record("launcher", "resource_inventory", {
    inventoryProvenance: "actual-sdk-loader",
    resourceAliases: [
      "experimental-companion:t02",
      "builtin:codemode",
      "builtin:tool-search",
      "builtin:mcp",
      "observer:t02",
    ],
    boundMode: "print",
    inlineProfiles: [...byPath.entries()].map(([path, ext]) => ({
      path,
      handlers: [...(ext.handlers?.keys() ?? [])].sort(),
      tools: [...(ext.tools?.keys() ?? [])].sort(),
      commands: [...(ext.commands?.keys() ?? [])].sort(),
    })),
    loaderErrors: (loaded.errors ?? []).map((e) => ({ path: String(e.path), error: e.error })),
    staticMcp: [],
    ...(isR2Review ? { loaderWarnings } : {}),
  });
  if (problems.length > 0) throw new Error(`profile-mismatch:${problems.join(";")}`);
  if (isR2Review && rawWarnings.length > 0) {
    throw new Error(`loader-warnings:${rawWarnings.length}`);
  }
}

main().catch((err) => {
  process.stderr.write(
    `t02-gate-worker: fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exitCode = 1;
});
