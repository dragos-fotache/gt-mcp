// T03 QA: published tool names and self-contained schemas (spec sections 2-3, 6).
//
// Black-box only: imports the emitted public entry dist/domain/index.js.
// Validates all fourteen schemas locally with the SDK-owned Ajv2020 provider
// and both envelope branches per tool. No transport/guard/journal/host claims.

import { describe, expect, it } from "vitest";
import {
  EXPECTED_TOOL_NAMES,
  INT64_MAX,
  INT64_MAX_PLUS_ONE,
  SYNTHETIC_UUIDS,
  TWO_POW_53_PLUS_ONE,
  clone,
  validCreateInput,
} from "./fixtures.mjs";
import {
  DRAFT_2020_12_URI,
  ajvValidator,
  collectNonstandardKeywords,
  collectRefs,
  collectSchemaUris,
} from "./helpers.mjs";

import { TOOL_NAMES, toolSchemas } from "../../../dist/domain/index.js";

const U = SYNTHETIC_UUIDS;
const MUSCLE = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";

// Configured per spec section 7: SDK-owned Ajv2020 + formats (draft2020-12),
// no coercion/default insertion/removal; schemas passed through unmodified.
const provider = ajvValidator();

function compile(schema) {
  return provider.getValidator(schema);
}

// Synthetic projected records (string revisions, as success data carries them).
function bundledExercise() {
  return {
    id: U.exerciseA,
    name: "Synthetic Press",
    type: "reps",
    isUserCreated: false,
    muscleGroups: [{ id: MUSCLE, name: "Synthetic Chest", type: "primary" }],
    equipment: [],
  };
}

function customExercise(revision = "9") {
  return {
    ...bundledExercise(),
    id: U.exerciseB,
    name: "Synthetic Curl",
    isUserCreated: true,
    revision,
  };
}

function routineRecord(revision = "5") {
  return {
    id: U.routine,
    name: "Upper Body A",
    isDraft: false,
    revision,
    exercises: [
      {
        id: U.entryOne,
        exerciseId: U.exerciseA,
        exerciseName: "Synthetic Press",
        position: 0,
        restDurationSeconds: 30,
        sets: [{ id: U.setOne, position: 0, repetitions: 8, weightKg: 40 }],
      },
    ],
  };
}

function workoutSummary(revision = "3") {
  return {
    id: U.routine,
    name: "Morning Workout",
    status: "active",
    startedAt: "2024-05-01T12:00:00.000Z",
    finishedAt: null,
    revision,
  };
}

function workoutRecord(revision = "3") {
  return {
    ...workoutSummary(revision),
    exercises: [
      {
        id: U.entryOne,
        exerciseId: U.exerciseA,
        exerciseName: "Synthetic Press",
        position: 0,
        notes: "",
        restDurationSeconds: 30,
        sets: [
          {
            id: U.setOne,
            position: 0,
            repetitions: null,
            weightKg: null,
            isCompleted: false,
            restSeconds: null,
          },
        ],
      },
    ],
  };
}

function receipt() {
  return { routineId: U.routine, status: "saved" };
}

function successEnvelope(name) {
  switch (name) {
    case "search_exercises":
      return {
        ok: true,
        data: {
          catalogueVersion: "synthetic-v1",
          items: [bundledExercise()],
          hasMore: false,
          nextPageToken: null,
        },
      };
    case "get_exercise":
      return { ok: true, data: bundledExercise() };
    case "list_workouts":
      return { ok: true, data: { items: [workoutSummary()], hasMore: false, nextPageToken: null } };
    case "get_workout":
      return { ok: true, data: workoutRecord() };
    case "list_routines":
      return { ok: true, data: { items: [routineRecord()], hasMore: false, nextPageToken: null } };
    case "get_routine":
      return { ok: true, data: routineRecord() };
    case "create_routine":
      return { ok: true, data: receipt() };
    default:
      throw new Error(`unknown tool in test: ${name}`);
  }
}

// Revision-bearing success envelope: custom exercise for the two exercise
// reads (bundled items carry no revision), record shapes otherwise.
function revisionEnvelope(name) {
  switch (name) {
    case "search_exercises":
      return {
        ok: true,
        data: {
          catalogueVersion: "synthetic-v1",
          items: [customExercise()],
          hasMore: false,
          nextPageToken: null,
        },
      };
    case "get_exercise":
      return { ok: true, data: customExercise() };
    default:
      return successEnvelope(name);
  }
}

function withRevisions(value, revision) {
  if (Array.isArray(value)) return value.map((item) => withRevisions(item, revision));
  if (value !== null && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = key === "revision" ? revision : withRevisions(item, revision);
    }
    return out;
  }
  return value;
}

describe("T03 TOOL_NAMES exact order (spec section 2)", () => {
  it("publishes the seven tools in the frozen order", () => {
    expect(Array.isArray(TOOL_NAMES)).toBe(true);
    expect([...TOOL_NAMES]).toEqual([...EXPECTED_TOOL_NAMES]);
  });
});

describe("T03 toolSchemas map shape (spec section 2)", () => {
  it("is keyed by exactly the seven names with input/output pairs", () => {
    expect(Object.keys(toolSchemas).sort()).toEqual([...EXPECTED_TOOL_NAMES].sort());
    for (const name of EXPECTED_TOOL_NAMES) {
      const entry = toolSchemas[name];
      expect(Object.keys(entry).sort()).toEqual(["inputSchema", "outputSchema"]);
      for (const schema of [entry.inputSchema, entry.outputSchema]) {
        expect(schema !== null && typeof schema === "object" && !Array.isArray(schema)).toBe(true);
      }
    }
  });

  it("all fourteen schemas compile locally with the SDK Ajv2020 provider", () => {
    for (const name of EXPECTED_TOOL_NAMES) {
      expect(() => compile(toolSchemas[name].inputSchema), `${name} input compiles`).not.toThrow();
      expect(
        () => compile(toolSchemas[name].outputSchema),
        `${name} output compiles`,
      ).not.toThrow();
    }
  });

  it("schemas are self-contained: local $refs; standard $schema URI allowed", () => {
    for (const name of EXPECTED_TOOL_NAMES) {
      for (const [kind, schema] of Object.entries(toolSchemas[name])) {
        for (const { ref, path } of collectRefs(schema)) {
          expect(ref.startsWith("#"), `${name} ${kind} ${path} must be a local ref`).toBe(true);
        }
        // The standard draft2020-12 $schema URI is dialect identification,
        // not a network fetch; any other $schema URI is not approved here.
        for (const { uri, path } of collectSchemaUris(schema)) {
          expect(uri, `${name} ${kind} ${path} dialect`).toBe(DRAFT_2020_12_URI);
        }
      }
    }
  });

  it("schemas use only standard draft 2020-12 keywords at schema nodes", () => {
    for (const name of EXPECTED_TOOL_NAMES) {
      for (const [kind, schema] of Object.entries(toolSchemas[name])) {
        const bad = collectNonstandardKeywords(schema);
        expect(bad, `${name} ${kind} nonstandard keywords`).toEqual([]);
      }
    }
  });
});

describe("T03 compiled success envelopes for all seven tools (M02)", () => {
  it.each(EXPECTED_TOOL_NAMES)("output schema accepts a valid %s success envelope", (name) => {
    const validate = compile(toolSchemas[name].outputSchema);
    const result = validate(successEnvelope(name));
    expect(result.valid, `${name} success: ${result.errorMessage}`).toBe(true);
  });

  it("output schema accepts a nonterminal page", () => {
    const validate = compile(toolSchemas.list_routines.outputSchema);
    const envelope = successEnvelope("list_routines");
    envelope.data.hasMore = true;
    envelope.data.nextPageToken = "tok";
    expect(validate(envelope).valid).toBe(true);
  });

  it("output schemas accept boundary revision strings", () => {
    for (const name of [
      "search_exercises",
      "get_exercise",
      "list_workouts",
      "get_workout",
      "list_routines",
      "get_routine",
    ]) {
      const validate = compile(toolSchemas[name].outputSchema);
      for (const revision of ["1", TWO_POW_53_PLUS_ONE, INT64_MAX]) {
        const result = validate(withRevisions(revisionEnvelope(name), revision));
        expect(result.valid, `${name} revision ${revision}: ${result.errorMessage}`).toBe(true);
      }
    }
  });

  it("output schemas reject noncanonical/zero/overflow/numeric revisions", () => {
    for (const name of [
      "search_exercises",
      "get_exercise",
      "list_workouts",
      "get_workout",
      "list_routines",
      "get_routine",
    ]) {
      const validate = compile(toolSchemas[name].outputSchema);
      for (const revision of [INT64_MAX_PLUS_ONE, "0", "01", ""]) {
        expect(validate(withRevisions(revisionEnvelope(name), revision)).valid).toBe(false);
      }
      // Projected revisions are strings; a raw wire number is not valid data.
      expect(validate(withRevisions(revisionEnvelope(name), 7)).valid).toBe(false);
    }
  });
});

describe("T03 output error envelopes cover the failure branch (M02)", () => {
  const minimalError = (code = "invalid_arguments") => ({
    ok: false,
    error: { code, retryable: false },
  });

  it.each(EXPECTED_TOOL_NAMES)("output schema of %s accepts a minimal error envelope", (name) => {
    const validate = compile(toolSchemas[name].outputSchema);
    const result = validate(minimalError());
    expect(result.valid, `${name} error branch: ${result.errorMessage}`).toBe(true);
  });

  it.each(EXPECTED_TOOL_NAMES)("output schema of %s rejects branch violations", (name) => {
    const validate = compile(toolSchemas[name].outputSchema);
    expect(validate({ ok: true }).valid).toBe(false);
    expect(validate({ ok: false }).valid).toBe(false);
    expect(validate({ ok: false, error: { code: "", retryable: false } }).valid).toBe(false);
    expect(validate({ ok: true, data: {}, extra: 1 }).valid).toBe(false);
    expect(validate({ ok: false, error: { code: "x", retryable: false }, extra: 1 }).valid).toBe(
      false,
    );
    expect(validate({ ok: false, error: { code: "x", retryable: false, bogus: 1 } }).valid).toBe(
      false,
    );
  });

  it.each(EXPECTED_TOOL_NAMES)("output schema of %s preserves unknown error codes", (name) => {
    const validate = compile(toolSchemas[name].outputSchema);
    const result = validate(minimalError("some_future_code"));
    expect(result.valid, `${name} future code: ${result.errorMessage}`).toBe(true);
  });

  it("saved receipt branch of create_routine is exact", () => {
    const validate = compile(toolSchemas.create_routine.outputSchema);
    const good = validate({ ok: true, data: receipt() });
    expect(good.valid, `receipt: ${good.errorMessage}`).toBe(true);
    expect(validate({ ok: true, data: { ...receipt(), extra: 1 } }).valid).toBe(false);
  });
});

describe("T03 compiled strict input matrices (M03 schema aspect)", () => {
  const validInputs = {
    search_exercises: [
      {},
      { search: "press" },
      { search: "", muscleGroupIds: [], equipmentIds: [], limit: 20 },
      { limit: 1, pageToken: "tok" },
      { muscleGroupIds: [U.exerciseA], equipmentIds: [U.exerciseB], limit: 200 },
    ],
    get_exercise: [{ exerciseId: U.exerciseA }],
    list_workouts: [{}, { status: "active" }, { status: "finished", limit: 200, pageToken: "x" }],
    get_workout: [{ workoutId: U.routine }],
    list_routines: [{}, { limit: 1 }],
    get_routine: [{ routineId: U.routine }],
    create_routine: [
      validCreateInput(),
      {
        name: "Upper Body A",
        exercises: [{ exerciseId: U.exerciseA, sets: [{}] }],
      },
    ],
  };

  it.each(EXPECTED_TOOL_NAMES)("input schema of %s accepts valid inputs", (name) => {
    const validate = compile(toolSchemas[name].inputSchema);
    for (const input of validInputs[name]) {
      const result = validate(clone(input));
      expect(result.valid, `${name} ${JSON.stringify(input)}: ${result.errorMessage}`).toBe(true);
    }
  });

  it.each(EXPECTED_TOOL_NAMES)("input schema of %s rejects unknown fields", (name) => {
    const validate = compile(toolSchemas[name].inputSchema);
    const base = clone(validInputs[name][0]);
    expect(validate({ ...base, bogus: 1 }).valid).toBe(false);
  });

  it("input schemas reject nested unknown fields and bad types/ranges", () => {
    const create = compile(toolSchemas.create_routine.inputSchema);
    const entryBogus = clone(validCreateInput());
    entryBogus.exercises[0].bogus = 1;
    expect(create(entryBogus).valid).toBe(false);
    const setBogus = clone(validCreateInput());
    setBogus.exercises[0].sets[0].bogus = 1;
    expect(create(setBogus).valid).toBe(false);
    const stringReps = clone(validCreateInput());
    stringReps.exercises[0].sets[0].repetitions = "8";
    expect(create(stringReps).valid).toBe(false);
    const emptyName = clone(validCreateInput({ name: "" }));
    expect(create(emptyName).valid).toBe(false);
    const badId = clone(validCreateInput());
    badId.operationId = "not-a-uuid";
    expect(create(badId).valid).toBe(false);
    const negativeRest = clone(validCreateInput());
    negativeRest.exercises[0].restDurationSeconds = -1;
    expect(create(negativeRest).valid).toBe(false);

    const search = compile(toolSchemas.search_exercises.inputSchema);
    expect(search({ limit: "20" }).valid).toBe(false);
    expect(search({ limit: 0 }).valid).toBe(false);
    expect(search({ limit: 201 }).valid).toBe(false);
    expect(search({ pageToken: "" }).valid).toBe(false);
    expect(search({ muscleGroupIds: ["x"] }).valid).toBe(false);

    const workouts = compile(toolSchemas.list_workouts.inputSchema);
    expect(workouts({ status: "archived" }).valid).toBe(false);
    const get = compile(toolSchemas.get_exercise.inputSchema);
    expect(get({ exerciseId: "nope" }).valid).toBe(false);
  });
});

describe("T03 compiled page token iff correlation (JSON clarifications)", () => {
  it.each(["list_workouts", "list_routines", "search_exercises"])(
    "output schema of %s requires token iff hasMore",
    (name) => {
      const validate = compile(toolSchemas[name].outputSchema);
      const live = successEnvelope(name);
      live.data.hasMore = true;
      live.data.nextPageToken = "tok";
      expect(validate(live).valid).toBe(true);
      const missing = successEnvelope(name);
      missing.data.hasMore = true;
      missing.data.nextPageToken = null;
      expect(validate(missing).valid).toBe(false);
      const stray = successEnvelope(name);
      stray.data.hasMore = false;
      stray.data.nextPageToken = "tok";
      expect(validate(stray).valid).toBe(false);
    },
  );
});

describe("T03 schema-expressible known-field invariants (JSON clarifications)", () => {
  it("list_routines items must be non-draft at schema level", () => {
    const validate = compile(toolSchemas.list_routines.outputSchema);
    const envelope = successEnvelope("list_routines");
    envelope.data.items[0].isDraft = true;
    expect(validate(envelope).valid).toBe(false);
  });

  it("routine-set completion fields are rejected at schema level", () => {
    const validate = compile(toolSchemas.get_routine.outputSchema);
    const envelope = successEnvelope("get_routine");
    envelope.data.exercises[0].sets[0].isCompleted = false;
    expect(validate(envelope).valid).toBe(false);
    const rest = successEnvelope("get_routine");
    rest.data.exercises[0].sets[0].restSeconds = null;
    expect(validate(rest).valid).toBe(false);
  });

  it("custom exercise canonical constraints hold at schema level", () => {
    const validate = compile(toolSchemas.get_exercise.outputSchema);
    const badType = { ok: true, data: { ...customExercise(), type: "cardio" } };
    expect(validate(badType).valid).toBe(false);
    const noRevision = { ok: true, data: { ...customExercise() } };
    delete noRevision.data.revision;
    expect(validate(noRevision).valid).toBe(false);
    const twoEquipment = {
      ok: true,
      data: {
        ...customExercise(),
        equipment: [
          { id: U.exerciseA, name: "One" },
          { id: U.exerciseB, name: "Two" },
        ],
      },
    };
    expect(validate(twoEquipment).valid).toBe(false);
  });

  it("status enums, boolean shapes and date-time formats hold at schema level", () => {
    const workout = compile(toolSchemas.get_workout.outputSchema);
    const archived = successEnvelope("get_workout");
    archived.data.status = "archived";
    expect(workout(archived).valid).toBe(false);
    const routine = compile(toolSchemas.get_routine.outputSchema);
    const stringDraft = successEnvelope("get_routine");
    stringDraft.data.isDraft = "false";
    expect(routine(stringDraft).valid).toBe(false);
    const badDate = successEnvelope("get_workout");
    badDate.data.startedAt = "not-a-date";
    expect(workout(badDate).valid).toBe(false);
  });
});

describe("T03 compiled canonical exactness (where expressible)", () => {
  const EDGES = [
    " ",
    String.fromCharCode(10),
    String.fromCharCode(13),
    String.fromCodePoint(0x2028),
    String.fromCodePoint(0x2029),
  ];

  it("input UUID schemas reject boundary-suffixed values", () => {
    const validate = compile(toolSchemas.get_exercise.inputSchema);
    for (const edge of EDGES) {
      expect(validate({ exerciseId: `${U.exerciseA}${edge}` }).valid).toBe(false);
    }
    expect(validate({ exerciseId: U.exerciseA.slice(0, 35) }).valid).toBe(false);
  });

  it("output revision schemas reject boundary-suffixed strings", () => {
    const validate = compile(toolSchemas.list_routines.outputSchema);
    for (const edge of EDGES) {
      expect(validate(withRevisions(revisionEnvelope("list_routines"), `5${edge}`)).valid).toBe(
        false,
      );
    }
    // Embedded line breaks are unambiguously non-numeric for anchored patterns.
    expect(validate(withRevisions(revisionEnvelope("list_routines"), "5\n5")).valid).toBe(false);
  });

  it("output timestamp schemas reject boundary-suffixed values", () => {
    const validate = compile(toolSchemas.get_workout.outputSchema);
    const envelope = successEnvelope("get_workout");
    envelope.data.startedAt = "2024-05-01T12:00:00.000Z\n";
    expect(validate(envelope).valid).toBe(false);
  });
});
