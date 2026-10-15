/* global AbortController */
import { setImmediate } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createReadToolServer, isReadToolServerError } from "../../dist/protocol/index.js";
import { CASES, CREATE_ARGS, deferred, runtimeFixture } from "./fixtures.mjs";
import { connectFixture, expectError, rawCall } from "./helpers.mjs";

// Narrow observation of this fixture transport's public send, not a general
// interception layer. Only a counter escapes; no protocol bodies logged.
function observeSuccess(transport) {
  const send = transport.send.bind(transport);
  let count = 0;
  transport.send = async (message, options) => {
    if (message.result?.structuredContent?.ok === true) count += 1;
    return send(message, options);
  };
  return () => count;
}

describe("S2 owned cancellation and close", () => {
  it("passes SDK cancellation to a held read, emits no late success and keeps runtime usable", async () => {
    const began = deferred();
    const gate = deferred();
    let signal;
    let held = true;
    const fixture = runtimeFixture({
      listRoutines: async (args, requestSignal) => {
        expect(args).toEqual({ limit: 20 });
        signal = requestSignal;
        began.resolve();
        if (held) await gate.promise;
        return { ok: true, data: CASES[4].data };
      },
    });
    const session = await connectFixture(fixture);
    const successCount = observeSuccess(session.serverTransport);
    const controller = new AbortController();
    const outcome = rawCall(
      session.client,
      { name: "list_routines" },
      { signal: controller.signal },
    ).then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
    try {
      await began.promise;
      controller.abort();
      expect((await outcome).value?.structuredContent?.ok).not.toBe(true);
      await setImmediate();
      expect(signal.aborted).toBe(true);
      gate.resolve();
      await setImmediate();
      await session.client.ping();
      expect(successCount()).toBe(0);
      expect(fixture.closeCount).toBe(0);
      held = false;
      expect((await rawCall(session.client, { name: "list_routines" })).structuredContent.ok).toBe(
        true,
      );
    } finally {
      gate.resolve();
      await session.close();
    }
    expect(fixture.closeCount).toBe(1);
  });

  it("fences close synchronously, validates before interruption, awaits persistence then closes once", async () => {
    const closeBegan = deferred();
    const persistence = deferred();
    const fixture = runtimeFixture({
      close: async () => {
        closeBegan.resolve();
        await persistence.promise;
      },
    });
    const session = await connectFixture(fixture);
    let transportClosed = false;
    const oldClose = session.serverTransport.onclose;
    session.serverTransport.onclose = () => {
      transportClosed = true;
      oldClose?.();
    };
    let completed = false;
    const first = session.server.close().then(() => {
      completed = true;
    });
    const second = session.server.close();
    try {
      await closeBegan.promise;
      expect(completed).toBe(false);
      expect(transportClosed).toBe(false);
      expectError(
        await rawCall(session.client, { name: "list_routines", arguments: { limit: "20" } }),
        "invalid_arguments",
        false,
      );
      expectError(
        await rawCall(session.client, { name: "list_routines" }),
        "operation_interrupted",
        true,
      );
      expectError(
        await rawCall(session.client, { name: "create_routine", arguments: CREATE_ARGS }),
        "operation_interrupted",
        true,
      );
      expect(fixture.calls).toEqual([]);
      persistence.resolve();
      await Promise.all([first, second]);
      expect(transportClosed).toBe(true);
      await session.server.close();
      expect(fixture.closeCount).toBe(1);
    } finally {
      persistence.resolve();
      await session.client.close();
      await session.server.close();
    }
  });

  it("disconnect owns teardown, suppresses late success and retains cleanup failure safely", async () => {
    const began = deferred();
    const read = deferred();
    const closed = deferred();
    const unhandled = [];
    const onUnhandled = (error) => {
      unhandled.push(error);
    };
    process.on("unhandledRejection", onUnhandled);
    const fixture = runtimeFixture({
      listRoutines: async () => {
        began.resolve();
        await read.promise;
        return { ok: true, data: CASES[4].data };
      },
      close: async () => {
        closed.resolve();
        throw new Error("SYNTHETIC_NATIVE_CLEANUP_DETAIL");
      },
    });
    const session = await connectFixture(fixture);
    const successCount = observeSuccess(session.serverTransport);
    const outcome = rawCall(session.client, { name: "list_routines" }).then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
    try {
      await began.promise;
      // Closing server-side public transport models an SDK-observed disconnect.
      await session.serverTransport.close();
      await closed.promise;
      read.resolve();
      await setImmediate();
      expect((await outcome).value?.structuredContent?.ok).not.toBe(true);
      expect(successCount()).toBe(0);
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const failure = await session.server.close().then(
          () => null,
          (error) => error,
        );
        expect(isReadToolServerError(failure)).toBe(true);
        expect(failure.code).toBe("internal_error");
        expect(`${failure.message}\n${failure.stack}`).not.toContain(
          "SYNTHETIC_NATIVE_CLEANUP_DETAIL",
        );
        expect(failure.cause).toBeUndefined();
      }
      await setImmediate();
      expect(unhandled).toEqual([]);
      expect(fixture.closeCount).toBe(1);
    } finally {
      read.resolve();
      await session.client.close();
      await session.server.close().catch(() => undefined); // expected safe retained rejection asserted above
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("rejects reconnection and closes transferred ownership on a begun connect failure", async () => {
    const fixture = runtimeFixture();
    const session = await connectFixture(fixture);
    try {
      const [, next] = InMemoryTransport.createLinkedPair();
      await expect(session.server.connect(next)).rejects.toMatchObject({
        code: "invalid_arguments",
      });
      await next.close();
    } finally {
      await session.close();
    }
    const failed = runtimeFixture();
    const server = createReadToolServer({ runtime: failed.runtime });
    const [, transport] = InMemoryTransport.createLinkedPair();
    transport.start = async () => {
      throw new Error("SYNTHETIC_NATIVE_CONNECT_DETAIL");
    };
    const error = await server.connect(transport).then(
      () => null,
      (failure) => failure,
    );
    expect(isReadToolServerError(error)).toBe(true);
    expect(`${error.message}\n${error.stack}`).not.toContain("SYNTHETIC_NATIVE_CONNECT_DETAIL");
    await server.close();
    expect(failed.closeCount).toBe(1);
  });
});
