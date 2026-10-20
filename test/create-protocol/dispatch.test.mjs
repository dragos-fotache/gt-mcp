/* global AbortController */
// Official SDK boundary over a small trusted runtime capability; no backend simulation.
import { setImmediate } from "node:timers/promises";
import { describe, it, expect } from "vitest";
import { createToolServer, createReadToolServer } from "../../dist/protocol/index.js";
import { toolSchemas } from "../../dist/domain/index.js";
import { runtimeFixture, CREATE_ARGS, ROUTINE_ID, deferred } from "../read-protocol/fixtures.mjs";
import {
  connectServer,
  rawCall,
  expectEnvelope,
  expectError,
  resultBytes,
  ajvValidator,
} from "../read-protocol/helpers.mjs";

const HISTORY = {
  routineId: ROUTINE_ID,
  lastConfirmedStep: "draft",
  outcomeUnknown: true,
};
const RECEIPT = {
  ok: true,
  data: { routineId: ROUTINE_ID, status: "saved" },
};
const stopped = (code, retryable, extra = {}) => ({
  ok: false,
  error: { code, retryable, ...extra },
});

function capability(create) {
  const fixture = runtimeFixture();
  fixture.runtime.createRoutine = create;
  return fixture;
}

describe("T15-S2 official SDK creation adapter", () => {
  it("captures a creation capability with its receiver, keeps seven schemas/hints and preserves read-only construction", async () => {
    let effective, requestSignal;
    const observed = {};
    const fixture = capability(async function (args, signal) {
      observed.receiver = this;
      effective = args;
      requestSignal = signal;
      return RECEIPT;
    });
    const server = createToolServer({ runtime: fixture.runtime });
    fixture.runtime.createRoutine = () => {
      throw new Error("synthetic replaced method");
    };
    const session = await connectServer(server);
    const read = await connectServer(createReadToolServer({ runtime: fixture.runtime }));
    try {
      const tools = (await session.client.listTools()).tools;
      const old = (await read.client.listTools()).tools;
      expect(tools).toHaveLength(7);
      for (const [i, tool] of tools.entries()) {
        expect({ ...tool, description: old[i].description }).toEqual(old[i]);
        expect(tool.inputSchema).toEqual(toolSchemas[tool.name].inputSchema);
        expect(tool.outputSchema).toEqual({
          ...toolSchemas[tool.name].outputSchema,
          type: "object",
        });
      }
      expect(tools[6].description).toMatch(
        /config-file writesEnabled is true.*without per-routine confirmation/,
      );
      expectEnvelope(
        await session.client.callTool({ name: "create_routine", arguments: CREATE_ARGS }),
        RECEIPT,
      );
      expect(observed.receiver).toBe(fixture.runtime);
      expect(requestSignal.aborted).toBe(false);
      expect(effective).toEqual(CREATE_ARGS);
      expectError(
        await read.client.callTool({ name: "create_routine", arguments: CREATE_ARGS }),
        "configuration_required",
        false,
        { message: "Routine creation is unavailable in this build." },
      );
    } finally {
      await session.close();
      await read.close();
    }
    expect(fixture.closeCount).toBe(2);
  });

  it("preserves canonical saved, uncertain, retry, rejection/conflict and interrupted results without native messages", async () => {
    let value = RECEIPT;
    const f = capability(async () => value);
    const s = await connectServer(createToolServer({ runtime: f.runtime }));
    try {
      const tool = (await s.client.listTools()).tools.find((t) => t.name === "create_routine");
      const validate = ajvValidator().getValidator(tool.outputSchema);
      for (const envelope of [
        RECEIPT,
        stopped("internal_error", false, HISTORY),
        stopped("rate_limited", false, {
          ...HISTORY,
          backendErrorCode: "rate_limited",
          retryAfterSeconds: 17,
        }),
        stopped("concurrent_modification", false, {
          ...HISTORY,
          outcomeUnknown: false,
          backendErrorCode: "concurrent_modification",
        }),
        stopped("validation_error", false, {
          ...HISTORY,
          outcomeUnknown: false,
          backendErrorCode: "validation_error",
        }),
        stopped("operation_interrupted", false, HISTORY),
      ]) {
        value = envelope.ok
          ? envelope
          : { ok: false, error: { ...envelope.error, message: "SYNTHETIC_NATIVE_DETAIL" } };
        const result = await s.client.callTool({ name: "create_routine", arguments: CREATE_ARGS });
        expectEnvelope(result, envelope);
        expect(validate(result.structuredContent).valid).toBe(true);
        expect(JSON.stringify(result)).not.toContain("SYNTHETIC_NATIVE_DETAIL");
      }
    } finally {
      await s.close();
    }
  });

  it("validates before dispatch and separates protocol errors from safe execution failures", async () => {
    let calls = 0;
    let value;
    const f = capability(async () => {
      calls++;
      if (value instanceof Error) throw value;
      return value;
    });
    const s = await connectServer(createToolServer({ runtime: f.runtime }));
    try {
      await expect(rawCall(s.client, { name: "unknown" })).rejects.toMatchObject({ code: -32602 });
      expectError(
        await rawCall(s.client, {
          name: "create_routine",
          arguments: { ...CREATE_ARGS, writesEnabled: true },
        }),
        "invalid_arguments",
        false,
      );
      expect(calls).toBe(0);
      for (value of [
        stopped("network_error", true, HISTORY),
        stopped("network_error", false, { routineId: ROUTINE_ID }),
        stopped("network_error", true, { routineId: ROUTINE_ID }),
        stopped("unrecognized_code", true, HISTORY),
        { ...RECEIPT, privateData: "SYNTHETIC_NATIVE_DETAIL" },
        new Error("SYNTHETIC_NATIVE_DETAIL"),
      ]) {
        expectError(
          await rawCall(s.client, { name: "create_routine", arguments: CREATE_ARGS }),
          "internal_error",
          false,
        );
      }
      let accessed = 0;
      value = Object.defineProperty({}, "ok", {
        enumerable: true,
        get() {
          accessed++;
          return false;
        },
      });
      expectError(
        await rawCall(s.client, { name: "create_routine", arguments: CREATE_ARGS }),
        "internal_error",
        false,
      );
      expect(accessed).toBe(0);
    } finally {
      await s.close();
    }
    const missing = runtimeFixture();
    expect(() => createToolServer({ runtime: missing.runtime })).toThrowError(/invalid_arguments/);
    expect(missing.closeCount).toBe(0);
    expect(() => createToolServer({ runtime: f.runtime, writesEnabled: true })).toThrowError(
      /invalid_arguments/,
    );
  });

  it("measures the complete UTF-8 result and preserves admitted history in an oversized fallback", async () => {
    const envelope = stopped("backend_error", false, {
      ...HISTORY,
      backendErrorCode: "synthetic_" + "x".repeat(2500),
    });
    const bytes = resultBytes(envelope);
    expect(bytes).toBeGreaterThan(4096);
    for (const budget of [bytes, bytes - 1, 4096]) {
      const f = capability(async () => envelope);
      const s = await connectServer(
        createToolServer({ runtime: f.runtime, maxToolResultBytes: budget }),
      );
      try {
        const result = await s.client.callTool({ name: "create_routine", arguments: CREATE_ARGS });
        expectEnvelope(
          result,
          budget === bytes ? envelope : stopped("result_too_large", false, HISTORY),
        );
        expect(Buffer.byteLength(JSON.stringify(result), "utf8")).toBeLessThanOrEqual(budget);
      } finally {
        await s.close();
      }
    }
  });

  it.each([
    ["stopped", stopped("internal_error", false, HISTORY), HISTORY],
    ["saved", RECEIPT, { ...HISTORY, lastConfirmedStep: "save", outcomeUnknown: false }],
  ])(
    "late %s completion during graceful close delivers interrupted truthful history",
    async (_, returned, history) => {
      const entered = deferred(),
        finish = deferred(),
        cleanup = deferred(),
        closing = deferred();
      const f = capability(async () => {
        entered.resolve();
        await finish.promise;
        return returned;
      });
      f.runtime.close = async () => {
        closing.resolve();
        await cleanup.promise;
      };
      const s = await connectServer(createToolServer({ runtime: f.runtime }));
      const pending = s.client.callTool({ name: "create_routine", arguments: CREATE_ARGS });
      await entered.promise;
      const closed = s.server.close();
      try {
        await closing.promise;
        finish.resolve();
        expectError(await pending, "operation_interrupted", false, history);
      } finally {
        finish.resolve();
        cleanup.resolve();
        await closed;
        await s.client.close();
      }
    },
  );

  it("passes caller cancellation to creation and emits no late success when the SDK suppresses delivery", async () => {
    const entered = deferred(),
      finish = deferred();
    let signal,
      successes = 0;
    const f = capability(async (_, requestSignal) => {
      signal = requestSignal;
      entered.resolve();
      await finish.promise;
      return RECEIPT;
    });
    const s = await connectServer(createToolServer({ runtime: f.runtime }));
    const send = s.serverTransport.send.bind(s.serverTransport);
    s.serverTransport.send = async (message, options) => {
      if (message.result?.structuredContent?.ok) successes++;
      return send(message, options);
    };
    const controller = new AbortController();
    const pending = rawCall(
      s.client,
      { name: "create_routine", arguments: CREATE_ARGS },
      { signal: controller.signal },
    ).then(
      () => false,
      () => true,
    );
    try {
      await entered.promise;
      controller.abort();
      expect(await pending).toBe(true);
      await setImmediate();
      expect(signal.aborted).toBe(true);
      finish.resolve();
      await setImmediate();
      await s.client.ping();
      expect(successes).toBe(0);
    } finally {
      finish.resolve();
      await s.close();
    }
  });
});
