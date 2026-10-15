// T05 unit: deterministic query serialization asserted on captured wire
// targets. Approved spec section 4 + OpenAPI query parameters.

import { describe, it, expect } from "vitest";
import { createBackendTransport } from "../../../dist/http/index.js";
import {
  MUSCLE_A,
  MUSCLE_B,
  EQUIP_C,
  ROUTINE_R,
  baseConfig,
  baseDeps,
  makeSession,
  makeWire,
  okJson,
  bundledExerciseWire,
  searchPageWire,
  workoutSummaryWire,
  workoutListWire,
  routineListWire,
  routineWire,
  testBinding,
  freshSignal,
} from "./helpers.mjs";

function searchTransport(script) {
  const { session } = makeSession();
  const { wire, captured } = makeWire(script);
  const handle = createBackendTransport(baseConfig(), { ...baseDeps(), session, wire });
  return { handle, captured };
}

describe("search query serialization", () => {
  it("lowercases with toLowerCase, sorts/dedupes UUIDs, fixes order, %20 spaces", async () => {
    const page = searchPageWire([bundledExerciseWire()]);
    const { handle, captured } = searchTransport([okJson(200, page)]);
    await handle.searchExercises(
      testBinding(),
      {
        search: "AB C",
        muscleGroupIds: [MUSCLE_B, MUSCLE_A, MUSCLE_A],
        equipmentIds: [EQUIP_C],
        limit: 5,
      },
      freshSignal(),
    );
    expect(captured[0].request.target).toBe(
      `/v1/catalogue/exercises?q=ab%20c&muscleGroupId=${MUSCLE_A}&muscleGroupId=${MUSCLE_B}&equipmentId=${EQUIP_C}&limit=5`,
    );
  });

  it("omits empty q and empty filters, always emits limit", async () => {
    const page = searchPageWire([bundledExerciseWire()]);
    const { handle, captured } = searchTransport([okJson(200, page)]);
    await handle.searchExercises(testBinding(), {}, freshSignal());
    expect(captured[0].request.target).toBe("/v1/catalogue/exercises?limit=20");
  });

  it("encodes hostile search text as data without route injection", async () => {
    const page = searchPageWire([]);
    const { handle, captured } = searchTransport([okJson(200, page)]);
    await handle.searchExercises(
      testBinding(),
      { search: "a&b=c?d#e%00", limit: 1 },
      freshSignal(),
    );
    const target = captured[0].request.target;
    expect(target.startsWith("/v1/catalogue/exercises?q=")).toBe(true);
    expect(target.includes("&limit=1")).toBe(true);
    // Exactly one q parameter: no smuggled extra parameters.
    expect(
      target
        .split("?")[1]
        .split("&")
        .filter((part) => !part.startsWith("limit=")).length,
    ).toBe(1);
  });

  it("preserves opaque page tokens verbatim across continuations", async () => {
    const token = "synthetic-qa-opaque-token.01+abc/def==";
    const page = searchPageWire([bundledExerciseWire()], { hasMore: true, nextPageToken: token });
    const { handle, captured } = searchTransport([okJson(200, page), okJson(200, page)]);
    await handle.searchExercises(
      testBinding(),
      { search: "press", limit: 1, pageToken: token },
      freshSignal(),
    );
    expect(captured[0].request.target).toContain(`pageToken=${encodeURIComponent(token)}`);
    expect(
      captured[0].request.target.startsWith("/v1/catalogue/exercises?q=press&limit=1&pageToken="),
    ).toBe(true);
  });
});

describe("workout and routine list serialization", () => {
  it("orders status/limit/pageToken for workouts", async () => {
    const page = workoutListWire([workoutSummaryWire()]);
    const { handle, captured } = searchTransport([okJson(200, page)]);
    await handle.listWorkouts(testBinding(), { status: "active", limit: 7 }, freshSignal());
    expect(captured[0].request.target).toBe("/v1/workouts?status=active&limit=7");
  });

  it("orders limit/pageToken for routines", async () => {
    const page = routineListWire([
      routineWire({ isDraft: false, name: "Synthetic QA Saved", revision: 2 }),
    ]);
    const { handle, captured } = searchTransport([okJson(200, page)]);
    await handle.listRoutines(
      testBinding(),
      { limit: 3, pageToken: "synthetic-qa-token" },
      freshSignal(),
    );
    expect(captured[0].request.target).toBe("/v1/routines?limit=3&pageToken=synthetic-qa-token");
  });

  it("single-resource GET carries no query string", async () => {
    const { handle, captured } = searchTransport([
      okJson(200, routineWire({ isDraft: false, name: "Synthetic QA Saved", revision: 2 })),
    ]);
    await handle.getRoutine(testBinding(), ROUTINE_R, freshSignal());
    expect(captured[0].request.target).toBe(`/v1/routines/${ROUTINE_R}`);
  });
});
