/**
 * T02 S1 isolated SDK worker: no-companion unavailable-call baseline.
 *
 * Child-process entry spawned by driver/run.mjs with a complete explicit
 * environment. This is the first module in this process that imports Pi.
 * Single target: the actual attempted creation call and its native
 * unavailable-tool result. No fixture, sidecar, approval, or write path.
 *
 * Trace travels only via the owned append-only journal (T02_JOURNAL_FILE):
 * one checked synchronous write per bounded record, sequence assigned in
 * append order; seq/source/type/layer are protected envelope fields.
 * Stdout carries one JSON result line. No process.exit: exitCode is set and
 * the process finishes naturally with flushed stdio.
 */

import { appendFileSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
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
const JOURNAL_BUDGET_BYTES = 256 * 1024;
const EXPECTED_CREATE_TOOL = "mcp__synth_gt__create_routine";
const RESERVED_KEYS = new Set(["seq", "source", "type", "layer"]);

function fail(message) {
  process.stderr.write(`t02-s1-worker: ${message}\n`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const get = (flag) => {
    const i = argv.indexOf(flag);
    if (i === -1 || i + 1 >= argv.length) {
      process.stderr.write(`t02-s1-worker: missing ${flag}\n`);
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
    fail(`missing required environment: ${name}`);
    throw new Error(`missing-env:${name}`);
  }
  return value;
}

async function main() {
  let journal;
  try {
    const { repoRoot, scenario } = parseArgs(process.argv.slice(2));
    if (scenario !== "no-companion")
      throw new Error(`S1 authorizes only no-companion (got ${scenario})`);
    journal = openJournal(requiredEnv("T02_JOURNAL_FILE"));
    const outcome = await runBaseline({ scenario, journal, repoRoot });
    journal.record("launcher", "worker-done", { completed: outcome.completed });
    process.stdout.write(`${JSON.stringify(outcome.result)}\n`);
    process.exitCode = outcome.completed ? 0 : 1;
  } catch (err) {
    try {
      journal?.record("launcher", "worker-error", {
        message: err instanceof Error ? err.message : String(err),
      });
    } catch {
      // journal itself failed; the exit code still reports failure
    }
    try {
      process.stdout.write(`${JSON.stringify({ completed: false })}\n`);
    } catch {
      // ignore stdout failure; exit code reports failure
    }
    process.exitCode = 1;
  }
}

function openJournal(path) {
  writeFileSync(path, "", { encoding: "utf8", mode: 0o600 });
  let seq = 0;
  let bytes = 0;
  return {
    record(source, type, fields, layer = "sdk-pipeline") {
      seq += 1;
      const safe = {};
      for (const [key, value] of Object.entries(fields ?? {})) {
        if (!RESERVED_KEYS.has(key)) safe[key] = value;
      }
      const line = `${JSON.stringify({ seq, source, type, layer, ...safe })}\n`;
      const size = Buffer.byteLength(line, "utf8");
      if (bytes + size > JOURNAL_BUDGET_BYTES) {
        throw new Error("journal-budget-exceeded");
      }
      appendFileSync(path, line, { encoding: "utf8" });
      bytes += size;
    },
  };
}

async function runBaseline({ scenario, journal, repoRoot }) {
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

  // --- One native scripted provider; abort on identity mismatch ---
  const handle = createScriptedProvider(turns);
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

  // Native MCP factories: explicit empty config + fail-closed transport guard.
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
      throw new Error("t02-s1: transport creation refused (absent profile)");
    },
    logPath: join(runDir, "mcp.log"),
  });

  // Launcher observer: captures genuine session contexts + registrations
  // at start, around the prompt, and at native shutdown.
  const observed = { starts: [], shutdowns: [], regsAtShutdown: null };
  let registrationSnapshot;
  const observerFactory = (pi) => {
    registrationSnapshot = () => {
      const registrations = pi.getMcpServers();
      if (!Array.isArray(registrations)) throw new Error("unknown-registrations");
      return registrations.map((s) => s.name);
    };
    pi.on("session_start", (event, ctx) => {
      observed.starts.push({
        reason: event.reason,
        mode: ctx?.mode ?? null,
        hasUI: ctx?.hasUI ?? null,
        registrations: registrationSnapshot(),
      });
    });
    pi.on("session_shutdown", (event) => {
      observed.shutdowns.push({ reason: event.reason });
      try {
        observed.regsAtShutdown = registrationSnapshot();
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
  let promptError = null;
  let timeoutFired = false;
  try {
    await session.bindExtensions({ mode: "print" });
    journal.record("launcher", "session", { transition: "start", reason: "bind-mode:print" });

    // Actual observed session-start context (not the requested flag).
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
    if ((startCtx.registrations ?? []).length !== 0) {
      throw new Error(`unexpected-registrations:${(startCtx.registrations ?? []).join(",")}`);
    }

    // Public preflight from the real observed context (never nulls).
    journal.record("launcher", "preflight", {
      mode: startCtx.mode,
      hasUI: startCtx.hasUI,
      uiInjected: false,
      supported: true,
      reason: "exact-inline-profile-and-observed-print-noUI-empty-registrations",
      inventoryProvenance: "actual-sdk-loader",
      resourceAliases: ["builtin:codemode", "builtin:tool-search", "builtin:mcp", "observer:t02"],
      boundMode: "print",
    });

    // Registration:none BEFORE the attempted call, from observed state.
    const ledgerPreExists = fileExists(ledgerPath);
    const sockPre = listSocks(runDir);
    if (ledgerPreExists) throw new Error("unexpected-ledger-file");
    if (sockPre.length > 0) throw new Error(`unexpected-sockets:${sockPre.join(",")}`);
    if (loadConfigCalls < 1) throw new Error("loadConfig-not-observed");
    if (transportAttempts !== 0)
      throw new Error(`unexpected-transport-attempts:${transportAttempts}`);
    journal.record("launcher", "registration", {
      server: "synth-gt",
      policy: "none",
      registered: false,
      connected: false,
      spawned: false,
      reason: "observed-empty-config-zero-registrations-zero-transports",
      loadConfigCalls,
      transportAttempts,
    });

    // No fixture tool may exist in this profile.
    const active = session.getActiveToolNames();
    const fixtureTools = active.filter((t) => t.startsWith("mcp__synth_gt__"));
    if (fixtureTools.length > 0) {
      throw new Error(`unexpected-fixture-tools:${fixtureTools.join(",")}`);
    }

    // Genuine runtime event observation: records append inside callbacks.
    const started = new Map();
    const ended = new Map();
    const turnResults = [];
    const entryKinds = [];
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
      } else if (event.type === "entry_appended" && event.entry) {
        entryKinds.push(entryKind(event.entry));
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

    // Endpoint verification: every start joins an end and no end lacks a
    // start; the real expected creation attempt is required. Missing,
    // extra, or unmatched endpoints throw — never a fabricated error result.
    if (started.size === 0) throw new Error("missing-genuine-observations");
    for (const [toolCallId] of ended) {
      if (!started.has(toolCallId)) throw new Error(`extra-end:${String(toolCallId)}`);
    }
    for (const [toolCallId, name] of started) {
      if (!ended.has(toolCallId)) throw new Error(`missing-end:${String(toolCallId)}`);
      if (name !== EXPECTED_CREATE_TOOL) throw new Error(`unexpected-call:${String(name)}`);
    }
    if (started.size !== 1) throw new Error(`unexpected-call-count:${started.size}`);
    const turnByCallId = new Map(turnResults.map((r) => [r.toolCallId, r]));
    for (const toolCallId of started.keys()) {
      const turn = turnByCallId.get(toolCallId);
      if (!turn) throw new Error(`unmatched-turn:${String(toolCallId)}`);
      if (turn.reason !== "unknown-tool" || turn.code !== null || turn.isError !== true) {
        throw new Error(`unexpected-outcome:${turn.reason ?? "unknown"}`);
      }
    }

    const registrationsAfter = registrationSnapshot();
    if (registrationsAfter.length !== 0) throw new Error("postcall-registrations");
    journal.record("launcher", "registration_check", {
      registrations: registrationsAfter,
      loadConfigCalls,
      transportAttempts,
    });
    // Post-call re-affirmation: still no transports, still no fixture tools.
    if (transportAttempts !== 0)
      throw new Error(`postcall-transport-attempts:${transportAttempts}`);
    const activeAfter = session.getActiveToolNames();
    const fixtureAfter = activeAfter.filter((t) => t.startsWith("mcp__synth_gt__"));
    if (fixtureAfter.length > 0) {
      throw new Error(`postcall-fixture-tools:${fixtureAfter.join(",")}`);
    }
  } finally {
    await runtime.dispose();
  }

  // Genuine shutdown observation (observer context, after awaited disposal).
  if (observed.shutdowns.length < 1) throw new Error("missing-shutdown-observation");
  if (!Array.isArray(observed.regsAtShutdown)) throw new Error("unknown-shutdown-registrations");
  if (observed.regsAtShutdown.length !== 0) {
    throw new Error(`shutdown-registrations:${observed.regsAtShutdown.join(",")}`);
  }
  journal.record("launcher", "session", {
    transition: "shutdown",
    reason: observed.shutdowns.map((s) => s.reason ?? "unknown").join(","),
  });

  // Final observations only after awaited disposal.
  const runtimeInfo = probeRuntime(repoRoot);
  journal.record("launcher", "provider", {
    piAiVersion: runtimeInfo.piAi,
    provider: SCRIPTED_PROVIDER_ID,
    model: SCRIPTED_MODEL_ID,
  });
  journal.record("launcher", "runtime", runtimeInfo.record);
  const sockFiles = listSocks(runDir);
  if (sockFiles.length > 0) throw new Error(`unexpected-sockets:${sockFiles.join(",")}`);
  if (fileExists(ledgerPath)) throw new Error("unexpected-ledger-file");
  journal.record("launcher", "worker_cleanup", {
    shutdownObserved: true,
    ledgerAbsent: true,
    listenersClosed: true,
    rootsRemoved: false,
    remainingListeners: 0,
  });

  return {
    completed: promptError === null && !timeoutFired,
    result: {
      completed: promptError === null && !timeoutFired,
      runtime: runtimeInfo.record,
      effects: { source: "none", observation: "not-spawned", total: 0, operations: [] },
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

function entryKind(entry) {
  if (!entry || typeof entry.type !== "string") return "unknown";
  if (entry.type === "message" && entry.message) {
    if (entry.message.role === "toolResult") return "toolResult";
    return `message:${entry.message.role ?? "unknown"}`;
  }
  return entry.type;
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
  let npm;
  try {
    npm = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim().split("\n")[0].trim();
  } catch {
    throw new Error("npm-probe-failed");
  }
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
    `t02-s1-worker: fatal: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exitCode = 1;
});
