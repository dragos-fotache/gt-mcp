// T08-S1 QA: validate-before-auth/dispatch + writesEnabled safety (spec section 4).
// Malformed/nested/coerced inputs MUST fail invalid_arguments with retryable
// false on a CONFIGURED runtime, including one whose grant is expired (proving
// validation precedes refresh preparation). Invalid signal => invalid_arguments;
// a valid pre-aborted call => operation_interrupted exactly, even when
// unconfigured (settled precedence). True writesEnabled exposes no mutation
// surface while reads stay usable. Prepared inputs REQUIRED; NOT RUN now.
/* global AbortController */

import { describe, expect, it } from "vitest";

import {
  abortedSignal,
  expectExactErr,
  expectOkEnvelope,
  freshSignal,
  requiredEnv,
} from "./helpers.mjs";
import { EXPECTED_SEARCH_PAGE } from "./fixtures.mjs";
import { openReadRuntime } from "../../dist/runtime/index.js";

describe("S1 validate before auth", () => {
  it("malformed UUID fails invalid_arguments on a configured runtime", async () => {
    const rt = await openReadRuntime({
      configPath: requiredEnv("GT_S1_CONFIGURED_CONFIG"),
    });
    try {
      const bad = await rt.getExercise({ exerciseId: "not-a-uuid" }, freshSignal());
      expectExactErr(bad, "invalid_arguments", false);
    } finally {
      await rt.close();
    }
  });

  it("nested/coerced inputs fail invalid_arguments before any refresh", async () => {
    const rt = await openReadRuntime({
      configPath: requiredEnv("GT_S1_EXPIRED_GRANT_CONFIG"),
    });
    try {
      const cases = [{ limit: "20" }, { limit: 0 }, { pageToken: "" }, { search: 42 }, null];
      for (const args of cases) {
        const res = await rt.searchExercises(args, freshSignal());
        expectExactErr(res, "invalid_arguments", false);
      }
    } finally {
      await rt.close();
    }
  });

  it("invalid signal fails invalid_arguments; pre-aborted valid call is interrupted", async () => {
    const rt = await openReadRuntime({});
    try {
      const badSignal = await rt.searchExercises({}, null);
      expectExactErr(badSignal, "invalid_arguments", false);
      const aborted = await rt.searchExercises({}, abortedSignal());
      expectExactErr(aborted, "operation_interrupted", true);
    } finally {
      await rt.close();
    }
  });

  it("writesEnabled:true snapshot exposes no mutation surface", async () => {
    const rt = await openReadRuntime({
      configPath: requiredEnv("GT_S1_WRITES_CONFIG"),
    });
    try {
      expect(rt).not.toHaveProperty("createRoutine");
      expect(typeof rt.searchExercises).toBe("function");
      expect(typeof rt.close).toBe("function");
      const res = await rt.searchExercises({}, freshSignal());
      expectOkEnvelope(res);
      expect(res.data).toEqual(EXPECTED_SEARCH_PAGE);
    } finally {
      await rt.close();
    }
  });

  it("already-aborted signals yield operation_interrupted for any abort reason", async () => {
    // S1 section 4 accepts native AbortSignal; cancellation-reason values are
    // never interpreted. Valid args + pre-aborted signal MUST report
    // operation_interrupted regardless of the arbitrary abort(reason) value.
    const rt = await openReadRuntime({});
    try {
      const reasons = ["synthetic-reason", 42, null, true, { code: "synthetic-code" }];
      for (const reason of reasons) {
        const controller = new AbortController();
        controller.abort(reason);
        const res = await rt.searchExercises({}, controller.signal);
        expectExactErr(res, "operation_interrupted", true);
      }
    } finally {
      await rt.close();
    }
  });

  it("abort-reason properties are never inspected", async () => {
    const rt = await openReadRuntime({});
    try {
      const reason = {};
      Object.defineProperty(reason, "code", {
        enumerable: true,
        get() {
          throw new Error("reason must not be inspected");
        },
      });
      const controller = new AbortController();
      controller.abort(reason);
      const res = await rt.getExercise(
        { exerciseId: "cccccccc-cccc-cccc-cccc-cccccccccccc" },
        controller.signal,
      );
      expectExactErr(res, "operation_interrupted", true);
    } finally {
      await rt.close();
    }
  });
});
