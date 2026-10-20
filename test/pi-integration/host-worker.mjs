// Fixed T17 SDK print journey: actual Pi agent/MCP/codemode, scripted model only.
import fs from "node:fs";
import path from "node:path";
import { setTimeout, clearTimeout } from "node:timers";
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
import {
  fauxProvider,
  fauxAssistantMessage,
  fauxToolCall,
  getCurrentTools,
} from "@earendil-works/pi-ai";
import { createDefaultTransport } from "../../node_modules/@earendil-works/pi-coding-agent/dist/extensions/mcp/runtime.js";

const [inputFile, outputFile] = process.argv.slice(2);
const input = JSON.parse(fs.readFileSync(inputFile, "utf8"));
if (process.env.GT_S3_ISOLATION_CONFIRMED !== "t08-s3-isolated")
  throw new Error("Private T17 runner required");
const agentDir = process.env.PI_CODING_AGENT_DIR;
if (!agentDir || !path.resolve(agentDir).startsWith(process.env.GT_S3_PRIVATE_ROOT + path.sep))
  throw new Error("Private Pi agent directory required");

const report = { starts: [], shutdowns: [], requests: [], calls: [], results: [], protocols: [] };
let session,
  inventory,
  loads = 0;
const scripted = fauxProvider({
  provider: "t17-scripted",
  models: [
    {
      id: "t17-fixture",
      name: "T17 fixture turns",
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 32768,
      maxTokens: 4096,
    },
  ],
});
scripted.setResponses(
  input.turns.map((turn) => (context) => {
    report.requests.push(getCurrentTools(context.messages).map((tool) => tool.name));
    return turn.calls
      ? fauxAssistantMessage(
          turn.calls.map((call) => fauxToolCall(call.tool, call.args)),
          { stopReason: "toolUse" },
        )
      : fauxAssistantMessage(turn.text, { stopReason: "stop" });
  }),
);
const modelRuntime = await ModelRuntime.create({
  authPath: path.join(agentDir, "auth.json"),
  modelsPath: null,
  modelsStorePath: path.join(agentDir, "models-store.json"),
  allowModelNetwork: false,
  refreshOnCreate: false,
});
modelRuntime.registerNativeProvider(scripted.provider);
const extensionFactories = [
  { name: "t17-codemode", factory: createCodemodeExtension({ mode: "on" }) },
  { name: "t17-search", factory: createToolSearchExtension() },
  {
    name: "t17-mcp",
    factory: createMcpExtension({
      // Return Pi's unchanged default transport. This passive listener records only
      // public initialize/list-tools metadata; it never substitutes messages/calls.
      createTransport(entry, cwd, authProvider) {
        const transport = createDefaultTransport(entry, cwd, authProvider);
        transport.onMessage((message) => {
          if (message.result?.protocolVersion)
            report.protocols.push(message.result.protocolVersion);
          if (message.result?.tools) report.wireTools = message.result.tools;
        });
        return transport;
      },
      loadConfig: () => {
        loads++;
        return {
          servers: [
            {
              name: "gymtracka",
              config: {
                command: process.execPath,
                args: [input.serverEntry, "--config", input.configPath],
                exposure: input.exposure,
                env: { WRITES_ENABLED: "true", GYMTRACKA_MCP_WRITES_ENABLED: "true" },
              },
              source: "t17-explicit-private-sdk",
            },
          ],
          errors: [],
          autoEnableCodemode: true,
        };
      },
      logPath: path.join(agentDir, "mcp.log"),
    }),
  },
  {
    name: "t17-observer",
    factory: (pi) => {
      pi.on("session_start", (event, ctx) => {
        report.starts.push({ reason: event.reason, mode: ctx.mode, hasUI: ctx.hasUI });
      });
      pi.on("session_shutdown", (event) => {
        report.shutdowns.push(event.reason);
      });
      pi.on("tool_call", (event) => {
        report.calls.push({
          name: event.toolName,
          id: event.toolCallId,
          parent: event.parentToolCallId ?? null,
        });
      });
    },
  },
];
const runtime = await createAgentSessionRuntime(
  async ({ cwd, agentDir, sessionManager }) => {
    const services = await createAgentSessionServices({
      cwd,
      agentDir,
      settingsManager: SettingsManager.inMemory({
        defaultTools: [],
        retry: { enabled: false, maxRetries: 0 },
        compaction: { enabled: false },
      }),
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
    inventory = {
      paths: loaded.extensions.map((extension) => extension.path),
      errors: loaded.errors.length,
    };
    const created = await createAgentSessionFromServices({
      services,
      sessionManager,
      model: scripted.getModel(),
      thinkingLevel: "off",
    });
    return { ...created, services, diagnostics: services.diagnostics };
  },
  { cwd: path.dirname(inputFile), agentDir, sessionManager: SessionManager.inMemory() },
);
session = runtime.session;
const unsubscribe = session.subscribe((event) => {
  if (event.type === "tool_execution_end") {
    report.results.push({
      name: event.toolName,
      id: event.toolCallId,
      parent: event.parentToolCallId ?? null,
      isError: event.isError,
      result: event.result,
    });
  }
});
let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  void session.abort();
}, 25000);
try {
  await session.bindExtensions({ mode: "print" });
  await session.prompt("Run the explicit synthetic T17 tool journey.");
  report.tools = session.getAllTools();
  report.active = session.getActiveToolNames();
  report.inventory = inventory;
  report.configLoads = loads;
  report.timedOut = timedOut;
} finally {
  clearTimeout(timer);
  unsubscribe();
  await runtime.dispose();
}
fs.writeFileSync(outputFile, JSON.stringify(report), { mode: 0o600 });
if (timedOut) throw new Error("T17 host journey timed out");
