import { describe, expect, it } from "vitest";
import {
  ListToolsResultSchema,
  McpError,
  RELATED_TASK_META_KEY,
} from "@modelcontextprotocol/sdk/types.js";
import { ReadRuntimeError } from "../../dist/runtime/index.js";
import { CASES, CREATE_ARGS, ID, runtimeFixture } from "./fixtures.mjs";
import { connectFixture, expectEnvelope, expectError, rawCall } from "./helpers.mjs";

const INVALID_PARAMS_MESSAGE = /^MCP error -32602: (?:MCP error -32602: )?Invalid parameters\.$/;

// SDK ingress adjudication: whole-message params null/array, array _meta,
// object/boolean/fractional progressToken and invalid related-task metadata
// are explicitly DEFERRED to S3 protocol/transport failure coverage. They are
// not reply-expecting S2 cases, skipped/passed checks or timeout evidence.
// Absent params ARE SDK-admitted; malformed known-tool arguments remain local
// application errors, including null/array/primitive arguments.
describe("S2 protocol/application separation and safe errors", () => {
  it("returns application invalid_arguments for known-tool top-level and nested invalid arguments", async () => {
    const fixture = runtimeFixture();
    const session = await connectFixture(fixture);
    try {
      for (const args of [
        null,
        [],
        7,
        "synthetic-marker",
        false,
        { limit: "20" },
        { extra: true },
      ]) {
        expectError(
          await rawCall(session.client, { name: "list_routines", arguments: args }),
          "invalid_arguments",
          false,
        );
      }
      for (const args of [
        { ...CREATE_ARGS, confirmed: true },
        { ...CREATE_ARGS, name: "\u00a0\u2007" },
        { ...CREATE_ARGS, exercises: [{ exerciseId: ID, sets: [{ weightKg: "0" }] }] },
        { ...CREATE_ARGS, exercises: [{ exerciseId: ID, sets: [], revision: "1" }] },
      ]) {
        expectError(
          await rawCall(session.client, { name: "create_routine", arguments: args }),
          "invalid_arguments",
          false,
        );
      }
      expectError(
        await rawCall(session.client, { name: "get_exercise" }),
        "invalid_arguments",
        false,
      );
      expect(fixture.calls).toEqual([]);
      const result = await rawCall(session.client, {
        name: "search_exercises",
        _meta: { progressToken: 7, synthetic: { writesEnabled: true } },
      });
      expectEnvelope(result, { ok: true, data: CASES[0].data });
      expect(fixture.calls[0].args).toEqual(CASES[0].effective);
    } finally {
      await session.close();
    }
  });

  it("rejects SDK-admitted malformed calls, unknown names and unsupported task authority at protocol level", async () => {
    const fixture = runtimeFixture();
    const session = await connectFixture(fixture);
    try {
      const admittedMalformed = [
        undefined,
        {},
        { name: 7 },
        { name: "synthetic-marker-unknown", extra: true },
        { name: "list_routines", extra: true },
      ];
      for (const params of admittedMalformed) {
        const error = await rawCall(session.client, params).then(
          () => null,
          (failure) => failure,
        );
        expect(error).toBeInstanceOf(McpError);
        expect(error.code).toBe(-32602);
        expect(error.message).toMatch(INVALID_PARAMS_MESSAGE);
        expect(String(error.message)).not.toContain("synthetic-marker");
        expect(error.data).toBeUndefined();
      }
      const unknown = await rawCall(session.client, { name: "synthetic-marker-unknown" }).then(
        () => null,
        (failure) => failure,
      );
      expect(unknown).toBeInstanceOf(McpError);
      expect(unknown.code).toBe(-32602);
      expect(unknown.message).toMatch(/^MCP error -32602: (?:MCP error -32602: )?Unknown tool\.$/);
      expect(unknown.data).toBeUndefined();
      // Task capability rejection may happen inside the pinned SDK before
      // fallback handling. Only this exact safe -32603 is admitted here.
      for (const params of [
        { name: "list_routines", task: { ttl: 1000 } },
        { name: "list_routines", _meta: { [RELATED_TASK_META_KEY]: { taskId: "synthetic-task" } } },
      ]) {
        const error = await rawCall(session.client, params).then(
          () => null,
          (failure) => failure,
        );
        expect(error).toBeInstanceOf(McpError);
        expect([-32602, -32603]).toContain(error.code);
        if (error.code === -32603) {
          expect(error.message).toBe(
            "MCP error -32603: Server does not support task creation (required for tools/call)",
          );
        } else {
          expect(error.message).toMatch(INVALID_PARAMS_MESSAGE);
        }
        expect(error.data).toBeUndefined();
        expect(error).not.toHaveProperty("taskId");
        expect(error.message).not.toMatch(/synthetic-task|synthetic-marker|SYNTHETIC_NATIVE/);
        expect(fixture.calls).toEqual([]);
      }
      expect(session.client.getServerCapabilities()).not.toHaveProperty("tasks");
      expect(fixture.calls).toEqual([]);
    } finally {
      await session.close();
    }
  });

  it("accepts absent/empty list params and rejects SDK-admitted supplied cursors and unknown fields", async () => {
    const fixture = runtimeFixture();
    const session = await connectFixture(fixture);
    try {
      for (const params of [undefined, {}, { _meta: { synthetic: true } }]) {
        const result = await session.client.request(
          { method: "tools/list", ...(params === undefined ? {} : { params }) },
          ListToolsResultSchema,
        );
        expect(result.tools).toHaveLength(7);
        expect(result.nextCursor).toBeUndefined();
      }
      for (const params of [{ cursor: "" }, { cursor: null }, { unknown: true }]) {
        const error = await session.client
          .request({ method: "tools/list", params }, ListToolsResultSchema)
          .then(
            () => null,
            (failure) => failure,
          );
        expect(error).toBeInstanceOf(McpError);
        expect(error.code).toBe(-32602);
        expect(error.message).toMatch(INVALID_PARAMS_MESSAGE);
        expect(error.data).toBeUndefined();
      }
      await expect(
        session.client.request({ method: "synthetic/unregistered" }, ListToolsResultSchema),
      ).rejects.toMatchObject({ code: -32601 });
      expect(fixture.calls).toEqual([]);
    } finally {
      await session.close();
    }
  });

  it("preserves recognized safe read metadata but drops presentation text and rejects foreign/invalid envelopes", async () => {
    let answer = {
      ok: false,
      error: {
        code: "rate_limited",
        retryable: true,
        retryAfterSeconds: 3,
        backendErrorCode: "synthetic_rate",
        message: "SYNTHETIC_NATIVE_DETAIL",
      },
    };
    const fixture = runtimeFixture({ listRoutines: async () => answer });
    const session = await connectFixture(fixture);
    try {
      expectError(await rawCall(session.client, { name: "list_routines" }), "rate_limited", true, {
        retryAfterSeconds: 3,
        backendErrorCode: "synthetic_rate",
      });
      for (const invalid of [
        { ok: false, error: { code: "synthetic_unknown", retryable: false } },
        { ok: false, error: { code: "rate_limited", retryable: false } },
        {
          ok: false,
          error: { code: "network_error", retryable: true, operationId: CREATE_ARGS.operationId },
        },
        { ok: true, data: { items: [], hasMore: false } },
        { ok: true, data: CASES[4].data, privateBinding: "SYNTHETIC_NATIVE_DETAIL" },
      ]) {
        answer = invalid;
        expectError(
          await rawCall(session.client, { name: "list_routines" }),
          "internal_error",
          true,
        );
      }
    } finally {
      await session.close();
    }
  });

  it("maps branded runtime errors only and never inspects arbitrary thrown getters", async () => {
    let failure = new ReadRuntimeError("recovery_unavailable");
    let getterReads = 0;
    const fixture = runtimeFixture({
      listRoutines: async () => {
        throw failure;
      },
    });
    const session = await connectFixture(fixture);
    try {
      expectError(
        await rawCall(session.client, { name: "list_routines" }),
        "recovery_unavailable",
        false,
      );
      failure = new Error("SYNTHETIC_NATIVE_DETAIL");
      expectError(await rawCall(session.client, { name: "list_routines" }), "internal_error", true);
      failure = Object.defineProperties(
        {},
        {
          code: {
            get() {
              getterReads += 1;
              throw new Error("SYNTHETIC_NATIVE_DETAIL");
            },
          },
          message: {
            get() {
              getterReads += 1;
              throw new Error("SYNTHETIC_NATIVE_DETAIL");
            },
          },
        },
      );
      expectError(await rawCall(session.client, { name: "list_routines" }), "internal_error", true);
      expect(getterReads).toBe(0);
    } finally {
      await session.close();
    }
  });
});
