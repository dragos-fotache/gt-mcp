// Public SDK boundary only. No target execution until a named frozen relay.
import { expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { createReadToolServer } from "../../dist/protocol/index.js";
import { ajvValidator } from "../unit/t03/helpers.mjs";

export { ajvValidator };

export async function connectFixture(fixture, options = {}) {
  const server = createReadToolServer({ runtime: fixture.runtime, ...options });
  return connectServer(server);
}

export async function connectServer(server) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client(
    { name: "synthetic-s2-qa", version: "0.0.0" },
    {
      jsonSchemaValidator: ajvValidator(),
    },
  );
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  } catch (error) {
    await server.close();
    throw error;
  }
  return {
    server,
    client,
    clientTransport,
    serverTransport,
    async close() {
      try {
        await server.close();
      } finally {
        await client.close();
      }
    },
  };
}

// Deliberately use generic public request for malformed arguments/params. This
// reaches the wire without a client convenience method normalizing it first.
export function rawCall(client, params, options) {
  return client.request(
    { method: "tools/call", ...(params === undefined ? {} : { params }) },
    CallToolResultSchema,
    options,
  );
}

export function expectedResult(envelope) {
  return {
    structuredContent: envelope,
    content: [{ type: "text", text: JSON.stringify(envelope) }],
    isError: !envelope.ok,
  };
}

export function expectEnvelope(result, envelope) {
  // JSON object member insertion order is not prescribed. Values and array
  // ordering remain exact; text must serialize the ACTUAL structured value.
  expect(result.structuredContent).toStrictEqual(envelope);
  expect(Object.keys(result).sort()).toEqual(["content", "isError", "structuredContent"]);
  expect(result.content).toStrictEqual([
    { type: "text", text: JSON.stringify(result.structuredContent) },
  ]);
  expect(result.isError).toBe(!envelope.ok);
}

export function expectError(result, code, retryable, extra = {}) {
  // Preserve a useful safe-code failure identity before a whole-envelope diff.
  expect(result.structuredContent?.error?.code).toBe(code);
  expectEnvelope(result, { ok: false, error: { code, retryable, ...extra } });
}

export function resultBytes(envelope) {
  // Independent contract oracle; never import T03 makeToolResult or adapter helpers.
  return Buffer.byteLength(JSON.stringify(expectedResult(envelope)), "utf8");
}
