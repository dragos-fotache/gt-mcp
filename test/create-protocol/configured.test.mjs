// Actual isolated provider/ext4/private-CA HTTPS via official SDK and compiled stdio.
import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { openConfiguredToolServer } from "../../dist/protocol/index.js";
import { fixture, args } from "../fault/t15/s1-helpers.mjs";
import { rawCall, expectEnvelope, expectError, ajvValidator } from "../read-protocol/helpers.mjs";
import { SERVER } from "../stdio-server/helpers.mjs";

const DISABLED = { message: "Routine creation is disabled in the operator configuration." };

async function processSession(configPath) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER, "--config", configPath],
    env: process.env,
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr.on("data", (c) => {
    stderr += c.toString();
  });
  const exited = new Promise((resolve) => {
    transport.onclose = resolve;
  });
  const client = new Client(
    { name: "synthetic-t15-s2", version: "0" },
    { jsonSchemaValidator: ajvValidator() },
  );
  try {
    await client.connect(transport);
  } catch (error) {
    await client.close();
    throw error;
  }
  return {
    client,
    stderr: () => stderr,
    async close() {
      if (transport.pid !== null) process.kill(transport.pid, "SIGTERM");
      await exited;
      await client.close();
    },
  };
}

describe("T15-S2 configured protocol and compiled entry", () => {
  it("false policy is immutable through client metadata, annotations, extra args and a file edit; reads stay usable", async () => {
    const f = await fixture({ writesEnabled: false });
    let s;
    try {
      const server = await openConfiguredToolServer({ configPath: f.configPath });
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const client = new Client(
        { name: "synthetic-writes-enabled", version: "0", writesEnabled: true },
        {
          jsonSchemaValidator: ajvValidator(),
          capabilities: { experimental: { syntheticPermission: { writesEnabled: true } } },
        },
      );
      s = {
        client,
        async close() {
          await server.close();
          await client.close();
        },
      };
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      await s.client.listTools();
      for (const params of [
        {
          name: "create_routine",
          arguments: args(),
          _meta: {
            writesEnabled: true,
            clientInfo: { writesEnabled: true },
            annotations: { writesEnabled: true },
          },
        },
        { name: "create_routine", arguments: args() },
      ])
        expectError(await rawCall(s.client, params), "configuration_required", false, DISABLED);
      expectError(
        await rawCall(s.client, {
          name: "create_routine",
          arguments: { ...args(), writesEnabled: true },
        }),
        "invalid_arguments",
        false,
      );
      await expect(
        rawCall(s.client, {
          name: "create_routine",
          arguments: args(),
          annotations: { writesEnabled: true },
        }),
      ).rejects.toMatchObject({ code: -32602 });
      f.write({ ...f.config, writesEnabled: true });
      expectError(
        await s.client.callTool({ name: "create_routine", arguments: args() }),
        "configuration_required",
        false,
        DISABLED,
      );
      expect(f.requests).toHaveLength(0);
      expectEnvelope(await s.client.callTool({ name: "list_routines" }), {
        ok: true,
        data: { items: [], hasMore: false, nextPageToken: null },
      });
      expect(f.mutations()).toHaveLength(0);
      await s.close();
      s = undefined;
      expect(await f.inspect()).toEqual(["credentials.enc", "owner.lock"]);
    } finally {
      if (s) await s.close();
      await f.close();
    }
  }, 30000);

  it("compiled stdio enabled call saves one receipt and disabled call has no admission or mutation", async () => {
    for (const writesEnabled of [true, false]) {
      const f = await fixture({ writesEnabled });
      let s;
      try {
        s = await processSession(f.configPath);
        expect((await s.client.listTools()).tools).toHaveLength(7);
        expect(f.requests).toHaveLength(0);
        const result = await s.client.callTool({ name: "create_routine", arguments: args() });
        if (writesEnabled) {
          const root = f.mutations()[0] && JSON.parse(f.mutations()[0].body).id;
          expectEnvelope(result, {
            ok: true,
            data: { routineId: root, status: "saved" },
          });
          expect(f.mutations().map((r) => r.method)).toEqual(["POST", "PUT", "POST"]);
          expect(f.mutations()[2].target).toBe(`/v1/routines/${root}/save`);
        } else {
          expectError(result, "configuration_required", false, DISABLED);
          expect(f.requests).toHaveLength(0);
        }
        await s.close();
        expect(s.stderr()).toBe("");
        s = undefined;
        expect(await f.inspect()).toEqual(["credentials.enc", "owner.lock"]);
      } finally {
        if (s) await s.close();
        await f.close();
      }
    }
  }, 30000);
});
