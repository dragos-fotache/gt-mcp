// T08-S1 QA: canonical data/error preservation (spec section 4).
// The prepared exercise carries a RAW numeric Int64-max wire revision; the
// runtime boundary MUST project the literal string "9223372036854775807" and
// the complete record MUST equal the independently specified value. The
// controlled expired-token rejection MUST map exactly to page_expired with
// retryable false. No conditional assertions. NOT RUN now.
/* global AbortController */

import { describe, expect, it } from "vitest";

import { expectExactErr, expectOkEnvelope, requiredEnv } from "./helpers.mjs";
import { EXPECTED_EXERCISE, EXPECTED_SEARCH_PAGE } from "./fixtures.mjs";
import { openReadRuntime } from "../../dist/runtime/index.js";
import { SYNTHETIC_UUIDS } from "./fixtures.mjs";

describe("S1 canonical preservation", () => {
  it("exact Int64-max revision text is preserved with the complete record", async () => {
    const rt = await openReadRuntime({
      configPath: requiredEnv("GT_S1_CONFIGURED_CONFIG"),
    });
    try {
      const res = await rt.getExercise(
        { exerciseId: SYNTHETIC_UUIDS.exerciseB },
        new AbortController().signal,
      );
      expectOkEnvelope(res);
      expect(res.data).toEqual(EXPECTED_EXERCISE);
      expect(res.data.revision).toBe("9223372036854775807");
    } finally {
      await rt.close();
    }
  });

  it("complete page preserves nulls/order; envelopes carry no raw metadata", async () => {
    const rt = await openReadRuntime({
      configPath: requiredEnv("GT_S1_CONFIGURED_CONFIG"),
    });
    try {
      const res = await rt.searchExercises({}, new AbortController().signal);
      expectOkEnvelope(res);
      expect(res.data).toEqual(EXPECTED_SEARCH_PAGE);
      const text = JSON.stringify(res);
      expect(text).not.toMatch(/correlationId|dispatched|rawBody|Bearer /);
    } finally {
      await rt.close();
    }
  });

  it("expired page token maps exactly to page_expired without retry", async () => {
    const rt = await openReadRuntime({
      configPath: requiredEnv("GT_S1_CONFIGURED_CONFIG"),
    });
    try {
      const res = await rt.listWorkouts(
        { limit: 5, pageToken: "synthetic-expired-token" },
        new AbortController().signal,
      );
      expectExactErr(res, "page_expired", false);
    } finally {
      await rt.close();
    }
  });
});
