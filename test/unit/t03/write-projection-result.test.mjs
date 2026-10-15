// T03 QA: whitelist write projection and tool result envelopes
// (spec sections 2, 4, 6; M02 envelope aspect, C02/C06 write shape).
//
// Black-box only through dist/domain/index.js. Synthetic IDs only. No
// dispatch, admission, permission or persistence claims.

import { describe, expect, it } from "vitest";
import { EXPECTED_TOOL_NAMES, SYNTHETIC_UUIDS, clone, validCreateInput } from "./fixtures.mjs";
import { expectCodecError } from "./helpers.mjs";

import { buildRoutineInput, makeToolResult } from "../../../dist/domain/index.js";

const U = SYNTHETIC_UUIDS;

function identitiesFor(input) {
  return {
    routineId: U.routine,
    exercises: input.exercises.map((entry, index) => ({
      id: index === 0 ? U.entryOne : U.entryTwo,
      setIds: entry.sets.map((_, setIndex) =>
        setIndex === 0 ? U.setOne : setIndex === 1 ? U.setTwo : U.setThree,
      ),
    })),
  };
}

describe("T03 buildRoutineInput whitelist projection", () => {
  it("produces the exact RoutineInput shape with consecutive positions", () => {
    const input = validCreateInput();
    const projected = buildRoutineInput(clone(input), identitiesFor(input));
    expect(Object.keys(projected)).toEqual(["id", "name", "isDraft", "exercises"]);
    expect(projected).toMatchObject({ id: U.routine, name: "Upper Body A", isDraft: true });
    const entry = projected.exercises[0];
    expect(Object.keys(entry).sort()).toEqual(
      ["exerciseId", "id", "position", "restDurationSeconds", "sets"].sort(),
    );
    expect(entry.position).toBe(0);
    expect(entry.restDurationSeconds).toBe(90);
    expect(Object.keys(entry.sets[0]).sort()).toEqual(
      ["id", "position", "repetitions", "weightKg"].sort(),
    );
    expect(entry.sets[0].position).toBe(0);
    expect(entry.sets[1].position).toBe(1);
  });

  it("expands intent defaults into the projection", () => {
    const input = {
      operationId: U.operation,
      name: "Upper Body A",
      exercises: [{ exerciseId: U.exerciseA, sets: [{}] }],
    };
    const projected = buildRoutineInput(clone(input), {
      routineId: U.routine,
      exercises: [{ id: U.entryOne, setIds: [U.setOne] }],
    });
    expect(projected.exercises[0].restDurationSeconds).toBe(30);
    expect(projected.exercises[0].sets[0].repetitions).toBeNull();
    expect(projected.exercises[0].sets[0].weightKg).toBeNull();
  });

  it("never leaks labels, revisions, volume, notes or completion into writes", () => {
    const input = clone(validCreateInput());
    input.exercises[0].exerciseName = "Leaked Label";
    input.exercises[0].notes = "leak";
    input.revision = "5";
    expectCodecError(
      () => buildRoutineInput(input, identitiesFor(validCreateInput())),
      "invalid_arguments",
    );
    const strict = buildRoutineInput(clone(validCreateInput()), identitiesFor(validCreateInput()));
    const text = JSON.stringify(strict);
    expect(text).not.toContain("exerciseName");
    expect(text).not.toContain("revision");
    expect(text).not.toContain("totalVolumeKg");
    expect(text).not.toContain("isCompleted");
    expect(text).not.toContain("restSeconds");
    expect(text).not.toContain("isDraft:false");
    expect(strict.isDraft).toBe(true);
  });

  it("count mismatches and identity violations fail", () => {
    const input = validCreateInput();
    expectCodecError(
      () => buildRoutineInput(clone(input), { routineId: U.routine, exercises: [] }),
      "invalid_arguments",
    );
    const clash = identitiesFor(input);
    clash.exercises[0].setIds[0] = clash.exercises[0].id;
    expectCodecError(() => buildRoutineInput(clone(input), clash), "invalid_arguments");
    const cross = identitiesFor(input);
    cross.routineId = cross.exercises[0].id;
    expectCodecError(() => buildRoutineInput(clone(input), cross), "invalid_arguments");
    expectCodecError(
      () => buildRoutineInput(clone(input), { routineId: "not-a-uuid", exercises: [] }),
      "invalid_arguments",
    );
  });

  it("exerciseId references are not in the identity namespace", () => {
    const input = validCreateInput();
    const ids = identitiesFor(input);
    ids.exercises[0].id = U.exerciseA;
    const projected = buildRoutineInput(clone(input), ids);
    expect(projected.exercises[0].id).toBe(U.exerciseA);
    expect(projected.exercises[0].exerciseId).toBe(U.exerciseA);
  });

  it("never mutates inputs and returns detached projections", () => {
    const input = validCreateInput();
    const ids = identitiesFor(input);
    const snapshot = clone({ input, ids });
    const projected = buildRoutineInput(input, ids);
    expect({ input, ids }).toEqual(snapshot);
    projected.exercises[0].sets[0].repetitions = 999;
    expect(input.exercises[0].sets[0].repetitions).toBe(8);
  });
});

describe("T03 makeToolResult envelopes (M02)", () => {
  it.each(EXPECTED_TOOL_NAMES)("validates both branches for %s", (name) => {
    const dataEnvelope =
      name === "create_routine"
        ? {
            ok: true,
            data: { operationId: U.operation, routineId: U.routine, status: "saved" },
          }
        : name === "search_exercises"
          ? {
              ok: true,
              data: {
                catalogueVersion: "synthetic-v1",
                items: [],
                hasMore: false,
                nextPageToken: null,
              },
            }
          : name.startsWith("list_")
            ? { ok: true, data: { items: [], hasMore: false, nextPageToken: null } }
            : name === "get_exercise"
              ? {
                  ok: true,
                  data: {
                    id: U.exerciseA,
                    name: "Synthetic Press",
                    type: "reps",
                    isUserCreated: false,
                    muscleGroups: [],
                    equipment: [],
                  },
                }
              : name === "get_routine"
                ? {
                    ok: true,
                    data: {
                      id: U.routine,
                      name: "Upper Body A",
                      isDraft: false,
                      revision: "5",
                      exercises: [],
                    },
                  }
                : {
                    ok: true,
                    data: {
                      id: U.routine,
                      name: "Morning Workout",
                      status: "active",
                      startedAt: "2024-05-01T12:00:00.000Z",
                      revision: "5",
                      exercises: [],
                    },
                  };
    const errorEnvelope = { ok: false, error: { code: "invalid_arguments", retryable: false } };
    const success = makeToolResult(name, clone(dataEnvelope));
    expect(success.isError).toBe(false);
    expect(success.structuredContent).toEqual(dataEnvelope);
    const failure = makeToolResult(name, clone(errorEnvelope));
    expect(failure.isError).toBe(true);
    expect(failure.structuredContent).toEqual(errorEnvelope);
  });

  it("content is exactly one text block echoing structuredContent", () => {
    const result = makeToolResult("list_workouts", {
      ok: true,
      data: { items: [], hasMore: false, nextPageToken: null },
    });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe(JSON.stringify(result.structuredContent));
    expect(JSON.parse(result.content[0].text)).toEqual(result.structuredContent);
    expect(result.isError).toBe(!result.structuredContent.ok);
  });

  it("invalid envelopes throw invalid_tool_result", () => {
    for (const bad of [
      { ok: true },
      { ok: false },
      { ok: true, data: {}, extra: 1 },
      { ok: false, error: { code: "", retryable: false } },
      { ok: false, error: { code: "x", retryable: "no" } },
      { ok: false, error: { code: "x", retryable: false, bogus: 1 } },
    ]) {
      expectCodecError(() => makeToolResult("list_workouts", clone(bad)), "invalid_tool_result");
    }
    expectCodecError(
      () => makeToolResult("no_such_tool", { ok: true, data: {} }),
      "invalid_tool_result",
    );
  });

  it("returns detached values", () => {
    const envelope = {
      ok: true,
      data: { items: [], hasMore: false, nextPageToken: null },
    };
    const result = makeToolResult("list_workouts", envelope);
    expect(envelope).toEqual({
      ok: true,
      data: { items: [], hasMore: false, nextPageToken: null },
    });
    result.structuredContent.data.items.push("mutation");
    expect(envelope.data.items).toEqual([]);
  });
});

describe("T03 result JSON boundaries (spec JSON clarifications)", () => {
  it("preserves prototype-named additive data with agreeing text", () => {
    const data = JSON.parse(
      `{"id":${JSON.stringify(U.routine)},"name":"Upper Body A","isDraft":false,"revision":"5",` +
        `"exercises":[],"__proto__":{"polluted":true},"toString":"kept"}`,
    );
    const result = makeToolResult("get_routine", { ok: true, data });
    expect(result.isError).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result.structuredContent.data, "__proto__")).toBe(
      true,
    );
    expect(JSON.parse(result.content[0].text)).toEqual(result.structuredContent);
    expect({}.polluted).toBeUndefined();
  });

  it("rejects unknown envelope fields even with prototype names", () => {
    const envelope = JSON.parse(
      `{"ok":true,"data":{"items":[],"hasMore":false,"nextPageToken":null},"__proto__":1}`,
    );
    expectCodecError(() => makeToolResult("list_workouts", envelope), "invalid_tool_result");
    const badError = JSON.parse(
      `{"ok":false,"error":{"code":"x","retryable":false},"constructor":1}`,
    );
    expectCodecError(() => makeToolResult("list_workouts", badError), "invalid_tool_result");
  });

  it("rejects non-JSON values without structured/text divergence", () => {
    const withFunction = {
      ok: true,
      data: { items: [], hasMore: false, nextPageToken: null, onDone: () => {} },
    };
    expectCodecError(() => makeToolResult("list_workouts", withFunction), "invalid_tool_result");
    const cyclic = { ok: true, data: { items: [], hasMore: false, nextPageToken: null } };
    cyclic.data.self = cyclic;
    expectCodecError(() => makeToolResult("list_workouts", cyclic), "invalid_tool_result");
  });
});
