// T08-S1 QA: one meaningful success per each of the six reads (spec section 4).
// Shared {ok:true,data} envelopes carry complete canonical T03 data compared
// against independently specified fixture values (literal, including the exact
// Int64-max revision string). No SDK framing; no mutation surface even when
// writesEnabled:true. Prepared isolated inputs REQUIRED; NOT RUN now.
/* global AbortController */

import { describe, expect, it } from "vitest";

import { expectOkEnvelope, requiredEnv } from "./helpers.mjs";
import {
  EXPECTED_EXERCISE,
  EXPECTED_ROUTINE,
  EXPECTED_ROUTINE_PAGE,
  EXPECTED_SEARCH_PAGE,
  EXPECTED_WORKOUT,
  EXPECTED_WORKOUT_PAGE,
  SYNTHETIC_UUIDS,
} from "./fixtures.mjs";
import { openReadRuntime } from "../../dist/runtime/index.js";

describe("S1 six canonical reads", () => {
  it("runtime exposes six reads plus close, no mutation or authority surface", async () => {
    const rt = await openReadRuntime({
      configPath: requiredEnv("GT_S1_CONFIGURED_CONFIG"),
    });
    try {
      for (const m of [
        "searchExercises",
        "getExercise",
        "listWorkouts",
        "getWorkout",
        "listRoutines",
        "getRoutine",
        "close",
      ]) {
        expect(typeof rt[m]).toBe("function");
      }
      expect(rt).not.toHaveProperty("createRoutine");
      expect(rt).not.toHaveProperty("writesEnabled");
      expect(rt).not.toHaveProperty("binding");
      expect(rt).not.toHaveProperty("credential");
    } finally {
      await rt.close();
    }
  });

  it("searchExercises maps the first page with defaults (limit 20)", async () => {
    const rt = await openReadRuntime({
      configPath: requiredEnv("GT_S1_CONFIGURED_CONFIG"),
    });
    try {
      const res = await rt.searchExercises({}, new AbortController().signal);
      expectOkEnvelope(res);
      expect(res.data).toEqual(EXPECTED_SEARCH_PAGE);
    } finally {
      await rt.close();
    }
  });

  it("getExercise maps the complete canonical record with exact revision", async () => {
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

  it("getWorkout maps the complete canonical record", async () => {
    const rt = await openReadRuntime({
      configPath: requiredEnv("GT_S1_CONFIGURED_CONFIG"),
    });
    try {
      const res = await rt.getWorkout(
        { workoutId: SYNTHETIC_UUIDS.workout },
        new AbortController().signal,
      );
      expectOkEnvelope(res);
      expect(res.data).toEqual(EXPECTED_WORKOUT);
    } finally {
      await rt.close();
    }
  });

  it("getRoutine maps the complete canonical saved record", async () => {
    const rt = await openReadRuntime({
      configPath: requiredEnv("GT_S1_CONFIGURED_CONFIG"),
    });
    try {
      const res = await rt.getRoutine(
        { routineId: SYNTHETIC_UUIDS.routineSaved },
        new AbortController().signal,
      );
      expectOkEnvelope(res);
      expect(res.data).toEqual(EXPECTED_ROUTINE);
    } finally {
      await rt.close();
    }
  });

  it("listWorkouts/listRoutines map complete pages with terminal tokens", async () => {
    const rt = await openReadRuntime({
      configPath: requiredEnv("GT_S1_CONFIGURED_CONFIG"),
    });
    try {
      const signal = new AbortController().signal;
      const w = await rt.listWorkouts({}, signal);
      expectOkEnvelope(w);
      expect(w.data).toEqual(EXPECTED_WORKOUT_PAGE);
      const r = await rt.listRoutines({}, signal);
      expectOkEnvelope(r);
      expect(r.data).toEqual(EXPECTED_ROUTINE_PAGE);
      for (const item of r.data.items) expect(item.isDraft).toBe(false);
    } finally {
      await rt.close();
    }
  });
});
