/* global AbortController, AbortSignal */
import { describe, it, expect } from "vitest";
import { openToolRuntime, openReadRuntime } from "../../../dist/runtime/index.js";
import { args, signal } from "../t10/helpers.mjs";

describe("T15-S1 public runtime and admission handoff", () => {
  it("keeps the read-only capability and validates create inputs before missing configuration", async () => {
    const read = await openReadRuntime({});
    const runtime = await openToolRuntime({});
    try {
      expect(Object.keys(read).sort()).toEqual([
        "close",
        "getExercise",
        "getRoutine",
        "getWorkout",
        "listRoutines",
        "listWorkouts",
        "searchExercises",
      ]);
      expect(Object.keys(runtime).sort()).toEqual([...Object.keys(read), "createRoutine"].sort());
      for (const value of [
        { ...args(), writesEnabled: true },
        { ...args(), name: "  " },
        { ...args(), exercises: [{ exerciseId: "bad", sets: [] }] },
      ])
        expect(await runtime.createRoutine(value, signal())).toMatchObject({
          ok: false,
          error: { code: "invalid_arguments", retryable: false },
        });
      expect(
        await runtime.createRoutine(args(), Object.create(AbortSignal.prototype)),
      ).toMatchObject({ ok: false, error: { code: "invalid_arguments" } });
      expect(await runtime.createRoutine(args(), signal())).toMatchObject({
        ok: false,
        error: { code: "configuration_required", retryable: false },
      });
      const cancelled = new AbortController();
      cancelled.abort("untrusted synthetic reason");
      expect(await runtime.createRoutine(args(), cancelled.signal)).toMatchObject({
        ok: false,
        error: { code: "operation_interrupted" },
      });
      await runtime.close();
      expect(await runtime.createRoutine(args(), signal())).toMatchObject({
        ok: false,
        error: { code: "operation_interrupted" },
      });
    } finally {
      await read.close();
      await runtime.close();
    }
  });

  it("rejects a caller write-enable mechanism and malformed factory options", async () => {
    for (const options of [
      null,
      { writesEnabled: true },
      { configPath: undefined },
      { configPath: "relative" },
    ])
      await expect(openToolRuntime(options)).rejects.toMatchObject({ code: "invalid_arguments" });
  });

  it("all cancellation/closed-runtime errors remain non-retryable", async () => {
    const runtime = await openToolRuntime({});
    await runtime.close();
    expect(await runtime.createRoutine(args(), signal())).toEqual({
      ok: false,
      error: { code: "operation_interrupted", retryable: false },
    });
  });
});
