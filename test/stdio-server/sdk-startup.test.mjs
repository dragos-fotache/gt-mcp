import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResultSchema, ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { toolSchemas } from "../../dist/domain/index.js";
import { ajvValidator } from "../unit/t03/helpers.mjs";
import { CASES, CREATE_ARGS, DESCRIPTIONS, TOOL_NAMES } from "../read-protocol/fixtures.mjs";
import { CONFIG_FAILURE, SERVER, USAGE, runServer, syntheticScope } from "./helpers.mjs";

async function sdkSession(args, env) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER, ...args],
    env,
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr.on("data", (chunk) => (stderr += chunk.toString()));
  const client = new Client(
    { name: "synthetic-s3-sdk", version: "0.0.0" },
    { jsonSchemaValidator: ajvValidator() },
  );
  try {
    await client.connect(transport);
    return { client, transport, stderr: () => stderr };
  } catch (error) {
    await transport.close();
    throw error;
  }
}

function expectError(result, code, extra = {}) {
  expect(result).toEqual({
    structuredContent: { ok: false, error: { code, retryable: false, ...extra } },
    content: [{ type: "text", text: JSON.stringify(result.structuredContent) }],
    isError: true,
  });
}

describe("S3 actual SDK stdio delivery", () => {
  for (const missingConfig of [false, true]) {
    it(`initializes and serves the exact unconfigured surface (missing selected config=${missingConfig})`, async () => {
      const scope = syntheticScope();
      let session;
      try {
        session = await sdkSession(
          missingConfig ? ["--config", path.join(scope.dir, "absent.json")] : [],
          scope.env,
        );
        const { client } = session;
        expect(client.getServerVersion()).toEqual({ name: "gymtracka-mcp", version: "0.0.0" });
        expect(client.getServerCapabilities()).toEqual({ tools: {} });
        const catalogue = await client.listTools();
        expect(Object.keys(catalogue)).toEqual(["tools"]);
        expect(catalogue.tools.map(({ name }) => name)).toEqual(TOOL_NAMES);
        for (const [index, tool] of catalogue.tools.entries()) {
          expect(tool).toEqual({
            name: TOOL_NAMES[index],
            description:
              index < 6
                ? DESCRIPTIONS[index]
                : "Create a saved routine when operator config-file writesEnabled is true. Any connected client may request valid authenticated creation without per-routine confirmation. Each call starts fresh; repeating it may duplicate a routine. Interrupted attempts cannot be resumed.",
            inputSchema: toolSchemas[tool.name].inputSchema,
            outputSchema: { ...toolSchemas[tool.name].outputSchema, type: "object" },
            annotations:
              index < 6
                ? { readOnlyHint: true, idempotentHint: true, openWorldHint: true }
                : {
                    readOnlyHint: false,
                    destructiveHint: false,
                    idempotentHint: false,
                    openWorldHint: true,
                  },
          });
        }
        await client.ping();
        for (const row of CASES)
          expectError(
            await client.callTool({ name: row.name, arguments: row.args }),
            "configuration_required",
          );
        expectError(
          await client.callTool({ name: "create_routine", arguments: CREATE_ARGS }),
          "configuration_required",
          { message: "Routine creation is disabled in the operator configuration." },
        );
        expectError(
          await client.request(
            { method: "tools/call", params: { name: "get_exercise", arguments: null } },
            CallToolResultSchema,
          ),
          "invalid_arguments",
        );
        const unknown = await client
          .request(
            { method: "tools/call", params: { name: "synthetic-secret-name" } },
            CallToolResultSchema,
          )
          .then(
            () => null,
            (error) => error,
          );
        expect(unknown.code).toBe(-32602);
        // SDK wraps the server's McpError text again on receipt, as established
        // by accepted S2 boundary checks; no supplied name/data may escape.
        expect(unknown.message).toMatch(
          /^MCP error -32602: (?:MCP error -32602: )?Unknown tool\.$/,
        );
        expect(unknown.data).toBeUndefined();
        await expect(
          client.request(
            { method: "tools/list", params: { cursor: "synthetic-cursor" } },
            ListToolsResultSchema,
          ),
        ).rejects.toMatchObject({ code: -32602 });
        // Valid-envelope protocol errors do not terminate the connection.
        expect((await client.listTools()).tools).toHaveLength(7);
      } finally {
        if (session) {
          await session.client.close();
          expect(session.stderr()).toBe("");
        }
        scope.cleanup();
      }
    });
  }

  it("rejects unsupported argv and nonnormalized/relative paths before opening supplied configuration", () => {
    for (const args of [
      ["--help"],
      ["--stdio"],
      ["--config"],
      ["--config", "relative.json"],
      ["--config", "/tmp/synthetic/../config.json"],
      ["--config", "/tmp/config.json", "--writes-enabled"],
    ]) {
      const result = runServer({ args });
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status).toBe(64);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe(USAGE);
    }
  });

  it("fails safely for malformed and unsafe selected config without echoing its path or contents", () => {
    const scope = syntheticScope();
    try {
      const selected = path.join(scope.dir, "synthetic-sensitive-config.json");
      for (const content of [
        "synthetic-secret-invalid-json",
        JSON.stringify({ version: 1, syntheticSecret: "must-not-escape" }),
      ]) {
        fs.writeFileSync(selected, content, { mode: 0o600 });
        const result = runServer({ args: ["--config", selected] });
        expect(result.error).toBeUndefined();
        expect(result.status).toBe(78);
        expect(result.stdout).toBe("");
        expect(result.stderr).toBe(CONFIG_FAILURE);
      }
    } finally {
      scope.cleanup();
    }
  });
});
