import { describe, expect, it } from "vitest";
import { setTimeout as delay } from "node:timers/promises";
import { INITIALIZE, INPUT_FAILURE, frame, rawServer, runServer } from "./helpers.mjs";

describe("S3 framing and process lifetime", () => {
  it("complete-boundary EOF is silent successful shutdown", () => {
    const result = runServer();
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });

  it("rejects malformed JSON, envelopes, UTF-8, blank/batch records and partial EOF without a guessed response", () => {
    const malformed = [
      "{synthetic-secret-invalid-json}\n",
      "\n",
      "[]\n",
      frame({ jsonrpc: "2.0", id: 7, method: "tools/list", params: null }),
      frame({ jsonrpc: "2.0", id: 7, method: "tools/list", params: [] }),
      frame({ jsonrpc: "2.0", id: 7, method: "tools/list", params: { _meta: [] } }),
      ...[{}, false, 0.5].map((progressToken) =>
        frame({
          jsonrpc: "2.0",
          id: 7,
          method: "tools/call",
          params: { _meta: { progressToken } },
        }),
      ),
      frame({
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: { _meta: { "io.modelcontextprotocol/related-task": {} } },
      }),
      Buffer.from([0xc3, 0x28, 0x0a]),
      Buffer.from([0xe2, 0x82]),
      JSON.stringify(INITIALIZE), // complete JSON value without framing newline
      '{"jsonrpc":"2.0",',
    ];
    for (const input of malformed) {
      const result = runServer({ input });
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status).toBe(65);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe(INPUT_FAILURE);
    }
  });

  it("rejects accumulated ingress above the fixed 10 MiB buffer limit", () => {
    const result = runServer({ input: Buffer.alloc(10485761, 0x20) });
    // Parent EPIPE is possible once the child rejects the bound; child outcome
    // remains the contract, never a successful partial-frame execution.
    if (result.error) expect(result.error.code).toBe("EPIPE");
    expect(result.signal).toBeNull();
    expect(result.status).toBe(65);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(INPUT_FAILURE);
  });

  it("gates tools until both SDK initialization phases complete and retains negotiated protocol", async () => {
    const server = rawServer();
    try {
      for (const [id, method] of [
        [10, "tools/list"],
        [11, "tools/call"],
      ]) {
        server.send({
          jsonrpc: "2.0",
          id,
          method,
          ...(method === "tools/call" ? { params: { name: "list_routines" } } : {}),
        });
        expect(await server.next()).toMatchObject({ jsonrpc: "2.0", id, error: { code: -32600 } });
      }
      server.send(INITIALIZE);
      expect(await server.next()).toMatchObject({
        id: 1,
        result: {
          protocolVersion: "2025-11-25",
          capabilities: { tools: {} },
          serverInfo: { name: "gymtracka-mcp", version: "0.0.0" },
        },
      });
      server.send({ jsonrpc: "2.0", id: 12, method: "tools/list" });
      expect(await server.next()).toMatchObject({ id: 12, error: { code: -32600 } });
      server.send({ jsonrpc: "2.0", method: "notifications/initialized" });
      server.send({ jsonrpc: "2.0", id: 13, method: "tools/list" });
      expect((await server.next()).result.tools).toHaveLength(7);
      server.child.stdin.end();
      expect(await server.exited).toMatchObject({ code: 0, signal: null, stderr: "" });
    } finally {
      await server.cleanup();
    }
  });

  it("accepts valid UTF-8 split across chunks without changing SDK message text", async () => {
    const server = rawServer();
    try {
      const wire = Buffer.from(
        frame({
          ...INITIALIZE,
          params: { ...INITIALIZE.params, clientInfo: { name: "synthetic-💪", version: "0" } },
        }),
      );
      const split = wire.indexOf(Buffer.from("💪")) + 2;
      server.child.stdin.write(wire.subarray(0, split));
      server.child.stdin.write(wire.subarray(split));
      expect(await server.next()).toMatchObject({
        id: 1,
        result: { protocolVersion: "2025-11-25" },
      });
      server.child.stdin.end();
      expect(await server.exited).toMatchObject({ code: 0, signal: null, stderr: "" });
    } finally {
      await server.cleanup();
    }
  });

  for (const [signal, code] of [
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ]) {
    it(`${signal} after startup closes orderly with its fixed status`, async () => {
      const server = rawServer();
      try {
        server.send(INITIALIZE);
        await server.next(); // avoid a pre-Node OS-signal race
        server.child.kill(signal);
        expect(await server.exited).toMatchObject({ code, signal: null, stderr: "" });
      } finally {
        await server.cleanup();
      }
    });
  }

  it("a broken output pipe closes without native diagnostics or a drain wait", async () => {
    const server = rawServer();
    try {
      server.send(INITIALIZE);
      await server.next();
      server.send({ jsonrpc: "2.0", method: "notifications/initialized" });
      server.child.stdout.destroy();
      server.send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
      expect(await server.exited).toMatchObject({
        code: 70,
        signal: null,
        stderr: "GymTracka MCP transport failed.\n",
      });
    } finally {
      await server.cleanup();
    }
  });

  it("healthy output backpressure preserves every complete catalogue response", async () => {
    const server = rawServer();
    try {
      server.send(INITIALIZE);
      await server.next();
      server.send({ jsonrpc: "2.0", method: "notifications/initialized" });
      server.child.stdout.pause();
      // Fixed catalogue replies exceed the local pipe capacity. Pausing the
      // receiver briefly exercises real Node backpressure without interception.
      for (let id = 2; id < 34; id += 1) {
        server.send({ jsonrpc: "2.0", id, method: "tools/list" });
      }
      await delay(100);
      server.child.stdout.resume();
      const ids = [];
      for (let index = 0; index < 32; index += 1) {
        const message = await server.next();
        expect(message.jsonrpc).toBe("2.0");
        expect(message.result.tools).toHaveLength(7);
        ids.push(message.id);
      }
      expect(ids.sort((left, right) => left - right)).toEqual(
        Array.from({ length: 32 }, (_, index) => index + 2),
      );
      server.child.stdin.end();
      expect(await server.exited).toMatchObject({ code: 0, signal: null, stderr: "" });
    } finally {
      server.child.stdout.resume();
      await server.cleanup();
    }
  });

  it("EOF releases pending blocked output without waiting for the client to read", async () => {
    const server = rawServer();
    try {
      server.send(INITIALIZE);
      await server.next();
      server.send({ jsonrpc: "2.0", method: "notifications/initialized" });
      server.child.stdout.pause();
      for (let id = 2; id < 34; id += 1) {
        server.send({ jsonrpc: "2.0", id, method: "tools/list" });
      }
      await delay(100);
      // Observe process exit independently of parent stdout draining. Only
      // afterward resume to collect close/diagnostics and clean the local pipe.
      const processExited = new Promise((resolve) =>
        server.child.once("exit", (code, signal) => resolve({ code, signal })),
      );
      server.child.stdin.end();
      // A test observation bound only: on failure finally resumes the reader
      // and allows graceful fixture cleanup; the delivered server has no timer.
      expect(await Promise.race([processExited, delay(1000).then(() => null)])).toEqual({
        code: 0,
        signal: null,
      });
      server.child.stdout.resume();
      expect(await server.exited).toMatchObject({ code: 0, signal: null, stderr: "" });
    } finally {
      server.child.stdout.resume();
      await server.cleanup();
    }
  });
});
