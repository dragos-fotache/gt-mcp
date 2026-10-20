// Only disposable private Pi roots; no ambient model credentials or project config.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";
import { ajvValidator, expectEnvelope } from "../read-protocol/helpers.mjs";
import { args } from "../create-stdio/helpers.mjs";
export { fixture, args, uuid } from "../create-stdio/helpers.mjs";

export const PREFIX = "mcp__gymtracka__";
export const TOOLS = [
  "search_exercises",
  "get_exercise",
  "list_workouts",
  "get_workout",
  "list_routines",
  "get_routine",
  "create_routine",
];
const worker = fileURLToPath(new URL("./host-worker.mjs", import.meta.url));
const serverEntry = fileURLToPath(new URL("../../dist/protocol/server.js", import.meta.url));
export const direct = (name, args = {}) => ({ tool: PREFIX + name, args });
export const code = (source) => ({ tool: "codemode", args: { code: source } });

export async function host(f, exposure, turns) {
  const dir = fs.mkdtempSync(path.join(path.dirname(f.configPath), "pi-"));
  const agentDir = path.join(dir, "agent");
  fs.mkdirSync(agentDir, { mode: 0o700 });
  const input = path.join(dir, "input.json"),
    output = path.join(dir, "output.json");
  fs.writeFileSync(
    input,
    JSON.stringify({
      serverEntry,
      configPath: f.configPath,
      exposure,
      turns: [...turns, { text: "Synthetic journey complete." }],
    }),
    { mode: 0o600 },
  );
  const env = {};
  for (const name of [
    "PATH",
    "HOME",
    "XDG_DATA_HOME",
    "XDG_CONFIG_HOME",
    "XDG_CACHE_HOME",
    "XDG_RUNTIME_DIR",
    "DBUS_SESSION_BUS_ADDRESS",
    "LD_LIBRARY_PATH",
    "NODE_EXTRA_CA_CERTS",
    "GT_S3_ISOLATION_CONFIRMED",
    "GT_S3_PRIVATE_ROOT",
  ]) {
    if (process.env[name] !== undefined) env[name] = process.env[name];
  }
  env.PI_CODING_AGENT_DIR = agentDir;
  env.PI_OFFLINE = "1";
  const child = spawn(process.execPath, [worker, input, output], { cwd: dir, env, stdio: "pipe" });
  let stdout = "",
    stderr = "";
  child.stdin.end();
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const result = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (status, signal) => resolve({ status, signal }));
  });
  if (result.status !== 0 || result.signal !== null)
    throw new Error(`T17 private worker failed (${result.status}/${result.signal}): ${stderr}`);
  expect(stdout).toBe("");
  expect(stderr).toBe("");
  const report = JSON.parse(fs.readFileSync(output, "utf8"));
  expect(report.starts).toHaveLength(1);
  expect(report.starts[0]).toMatchObject({ mode: "print", hasUI: false });
  expect(report.shutdowns.length).toBeGreaterThan(0);
  expect(report.configLoads).toBe(1);
  expect(report.timedOut).toBe(false);
  expect(report.protocols).toEqual(["2025-11-25"]);
  expect(report.inventory).toEqual({
    paths: [
      "<inline:t17-codemode>",
      "<inline:t17-search>",
      "<inline:t17-mcp>",
      "<inline:t17-observer>",
    ],
    errors: 0,
  });
  expect(JSON.stringify(report)).not.toContain(f.grant.accessToken);
  expect(JSON.stringify(report)).not.toContain(f.grant.refreshToken);
  const tools = report.tools.filter((tool) => tool.name.startsWith(PREFIX));
  expect(report.wireTools.map((tool) => tool.name)).toEqual(TOOLS);
  expect(tools.map((tool) => tool.name.slice(PREFIX.length)).sort()).toEqual([...TOOLS].sort());
  for (const tool of tools) {
    expect(tool.parameters.type).toBe("object");
    const wire = report.wireTools.find((item) => PREFIX + item.name === tool.name);
    expect(tool.parameters).toEqual(wire.inputSchema);
    expect(wire.outputSchema.type).toBe("object");
    expect(tool.annotations).toMatchObject({
      readOnlyHint: tool.name !== PREFIX + "create_routine",
      idempotentHint: tool.name !== PREFIX + "create_routine",
      openWorldHint: true,
    });
  }
  const creation = report.wireTools.find((tool) => tool.name === "create_routine");
  const validateInput = ajvValidator().getValidator(creation.inputSchema);
  expect(validateInput(args()).valid).toBe(true);
  // Removed recovery identity must be rejected by the actual advertised schema.
  expect(
    validateInput({ ...args(), operationId: "00000000-0000-4000-8000-000000000017" }).valid,
  ).toBe(false);
  return report;
}

export function results(report, name) {
  return report.results.filter((event) => event.name === PREFIX + name);
}

export function envelope(report, event, expected) {
  const value = event.result.structuredContent;
  expectEnvelope(value, expected);
  expect(event.result.content).toEqual(value.content);
  expect(event.isError).toBe(!expected.ok);
  const schema = report.wireTools.find((tool) => PREFIX + tool.name === event.name).outputSchema;
  const validate = ajvValidator().getValidator(schema);
  expect(validate(expected).valid).toBe(true);
}
