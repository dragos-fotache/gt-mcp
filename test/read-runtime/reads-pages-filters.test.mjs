// T08-S1 QA: representative paging/filter/saved-list/own-draft/foreign-not-found
// (spec section 4 + tools.md paging). The prepared fixture serves exactly two
// search pages; the continuation MUST be exercised and match literally. The
// prepared own draft MUST succeed by explicit get and stay out of the saved
// list; the foreign id MUST fail not_found with retryable false. NOT RUN now.
/* global AbortController */

import { describe, expect, it } from "vitest";

import { expectExactErr, expectOkEnvelope, requiredEnv } from "./helpers.mjs";
import {
  EXPECTED_DRAFT,
  EXPECTED_SEARCH_PAGE,
  EXPECTED_SEARCH_PAGE_LAST,
  SYNTHETIC_UUIDS,
} from "./fixtures.mjs";
import { openReadRuntime } from "../../dist/runtime/index.js";

describe("S1 paging/filter/draft visibility", () => {
  it("effective filter plus continuation round-trips both pages exactly", async () => {
    const rt = await openReadRuntime({
      configPath: requiredEnv("GT_S1_CONFIGURED_CONFIG"),
    });
    try {
      const args = {
        search: "Synthetic",
        muscleGroupIds: [SYNTHETIC_UUIDS.muscle],
        limit: 2,
      };
      const first = await rt.searchExercises(args, new AbortController().signal);
      expectOkEnvelope(first);
      expect(first.data).toEqual(EXPECTED_SEARCH_PAGE);
      expect(first.data.hasMore).toBe(true);
      const second = await rt.searchExercises(
        { ...args, pageToken: first.data.nextPageToken },
        new AbortController().signal,
      );
      expectOkEnvelope(second);
      expect(second.data).toEqual(EXPECTED_SEARCH_PAGE_LAST);
    } finally {
      await rt.close();
    }
  });

  it("saved-only list excludes drafts; own draft succeeds by explicit get", async () => {
    const rt = await openReadRuntime({
      configPath: requiredEnv("GT_S1_CONFIGURED_CONFIG"),
    });
    try {
      const signal = new AbortController().signal;
      const list = await rt.listRoutines({ limit: 20 }, signal);
      expectOkEnvelope(list);
      expect(list.data.items.map((i) => i.id)).not.toContain(SYNTHETIC_UUIDS.routineDraft);
      const own = await rt.getRoutine({ routineId: SYNTHETIC_UUIDS.routineDraft }, signal);
      expectOkEnvelope(own);
      expect(own.data).toEqual(EXPECTED_DRAFT);
    } finally {
      await rt.close();
    }
  });

  it("foreign routine get fails not_found without retry", async () => {
    const rt = await openReadRuntime({
      configPath: requiredEnv("GT_S1_CONFIGURED_CONFIG"),
    });
    try {
      const res = await rt.getRoutine(
        { routineId: SYNTHETIC_UUIDS.foreignRoutine },
        new AbortController().signal,
      );
      expectExactErr(res, "not_found", false);
    } finally {
      await rt.close();
    }
  });
});
