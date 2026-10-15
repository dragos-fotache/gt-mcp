// T03 QA: backend success-data decoding (spec sections 2 and 5).
// Scenarios M09 and R08 schema aspects. Wire revisions are JSON NUMBERS;
// wire string revisions are invalid. Duplicate keys reject (mandatory).
//
// Black-box only through dist/domain/index.js. Synthetic records only.

import { describe, expect, it } from "vitest";
import { EXPECTED_READ_TOOLS, SYNTHETIC_UUIDS } from "./fixtures.mjs";
import { expectCodecError } from "./helpers.mjs";

import { decodeBackendResponse } from "../../../dist/domain/index.js";

const U = SYNTHETIC_UUIDS;
const MUSCLE = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";

function bundledExerciseWire() {
  return JSON.stringify({
    id: U.exerciseA,
    name: "Synthetic Press",
    type: "reps",
    category: null,
    difficultyLevel: null,
    forceType: null,
    mechanics: null,
    instructions: null,
    isUserCreated: false,
    muscleGroups: [{ id: MUSCLE, name: "Synthetic Chest", type: "primary" }],
    equipment: [],
  });
}

function customExerciseWire(revisionToken) {
  return (
    `{"id":${JSON.stringify(U.exerciseB)},"name":"Synthetic Curl",` +
    `"type":"reps","isUserCreated":true,"revision":${revisionToken},` +
    `"muscleGroups":[{"id":${JSON.stringify(MUSCLE)},"name":"Synthetic Arm","type":"primary"}],` +
    `"equipment":[]}`
  );
}

function routineEntryWire(setId, position, reps = 8, weight = 40) {
  return {
    id: position === 0 ? U.entryOne : U.entryTwo,
    exerciseId: U.exerciseA,
    exerciseName: "Synthetic Press",
    position,
    restDurationSeconds: 30,
    sets: [{ id: setId, position: 0, repetitions: reps, weightKg: weight }],
  };
}

function routineWire(revisionToken, { isDraft = false, exercises = null } = {}) {
  const entries = exercises ?? [routineEntryWire(U.setOne, 0)];
  const body = {
    id: U.routine,
    name: "Upper Body A",
    isDraft,
    exercises: entries,
  };
  return (
    `{"id":${JSON.stringify(body.id)},"name":${JSON.stringify(body.name)},` +
    `"isDraft":${isDraft},"revision":${revisionToken},` +
    `"exercises":${JSON.stringify(entries)}}`
  );
}

function activeWorkoutWire(revisionToken) {
  const body = {
    id: U.routine,
    name: "Morning Workout",
    status: "active",
    startedAt: "2024-05-01T12:00:00.000Z",
    finishedAt: null,
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
  return (
    `{"id":${JSON.stringify(body.id)},"name":${JSON.stringify(body.name)},` +
    `"status":"active","startedAt":${JSON.stringify(body.startedAt)},"finishedAt":null,` +
    `"revision":${revisionToken},"exercises":${JSON.stringify(body.exercises)}}`
  );
}

function finishedWorkoutWire(revisionToken, finishedAt = "2024-05-01T13:00:00.000Z") {
  const body = {
    id: U.routine,
    name: "Morning Workout",
    status: "finished",
    startedAt: "2024-05-01T12:00:00.000Z",
    finishedAt,
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
            repetitions: 8,
            weightKg: 40,
            isCompleted: true,
            restSeconds: null,
          },
        ],
      },
    ],
  };
  return (
    `{"id":${JSON.stringify(body.id)},"name":${JSON.stringify(body.name)},` +
    `"status":"finished","startedAt":${JSON.stringify(body.startedAt)},` +
    `"finishedAt":${JSON.stringify(finishedAt)},` +
    `"revision":${revisionToken},"exercises":${JSON.stringify(body.exercises)}}`
  );
}

describe("T03 decodeBackendResponse reads (six tools)", () => {
  it("supports exactly the six read tools", () => {
    expect([...EXPECTED_READ_TOOLS]).toHaveLength(6);
    expectCodecError(
      () => decodeBackendResponse("create_routine", routineWire("5")),
      "invalid_backend_response",
    );
    expectCodecError(() => decodeBackendResponse("no_such_tool", "{}"), "invalid_backend_response");
  });

  it("projects numeric wire revisions to exact decimal strings", () => {
    const decoded = decodeBackendResponse("get_routine", routineWire("5"));
    expect(decoded.revision).toBe("5");
    expect(typeof decoded.revision).toBe("string");
    const big = decodeBackendResponse("get_routine", routineWire("9007199254740993"));
    expect(big.revision).toBe("9007199254740993");
    const max = decodeBackendResponse("get_routine", routineWire("9223372036854775807"));
    expect(max.revision).toBe("9223372036854775807");
  });

  it("wire string revisions are invalid (M09)", () => {
    const body = JSON.parse(routineWire("5"));
    body.revision = "5";
    expectCodecError(
      () => decodeBackendResponse("get_routine", JSON.stringify(body)),
      "invalid_backend_response",
    );
  });

  it("preserves IDs, order and nullable values", () => {
    const decoded = decodeBackendResponse("get_routine", routineWire("5"));
    expect(decoded.id).toBe(U.routine);
    expect(decoded.exercises[0].exerciseId).toBe(U.exerciseA);
    expect(decoded.exercises[0].sets[0].repetitions).toBe(8);
  });

  it("bundled null/absent revisions stay null/absent; custom requires revision", () => {
    const bundled = decodeBackendResponse("get_exercise", bundledExerciseWire());
    expect("revision" in bundled ? bundled.revision : null).toBeNull();
    const custom = decodeBackendResponse("get_exercise", customExerciseWire("9"));
    expect(custom.revision).toBe("9");
    const missing = JSON.parse(customExerciseWire("9"));
    delete missing.revision;
    expectCodecError(
      () => decodeBackendResponse("get_exercise", JSON.stringify(missing)),
      "invalid_backend_response",
    );
  });

  it("expectedId must match for gets; forbidden on lists/search", () => {
    const ok = decodeBackendResponse("get_routine", routineWire("5"), U.routine);
    expect(ok.id).toBe(U.routine);
    expectCodecError(
      () => decodeBackendResponse("get_routine", routineWire("5"), U.foreign),
      "invalid_backend_response",
    );
    expectCodecError(
      () => decodeBackendResponse("list_routines", routineWire("5"), U.routine),
      "invalid_backend_response",
    );
    expectCodecError(
      () =>
        decodeBackendResponse(
          "search_exercises",
          JSON.stringify({
            catalogueVersion: "v1",
            items: [],
            hasMore: false,
            nextPageToken: null,
          }),
          U.routine,
        ),
      "invalid_backend_response",
    );
  });

  it("rejects MCP/HTTP envelopes, trailing and malformed JSON (R08 aspect)", () => {
    const envelope = JSON.stringify({ ok: true, data: JSON.parse(routineWire("5")) });
    expectCodecError(
      () => decodeBackendResponse("get_routine", envelope),
      "invalid_backend_response",
    );
    expectCodecError(
      () => decodeBackendResponse("get_routine", `${routineWire("5")} trailing`),
      "invalid_backend_response",
    );
    expectCodecError(() => decodeBackendResponse("get_routine", ""), "invalid_backend_response");
    expectCodecError(
      () => decodeBackendResponse("get_routine", routineWire("5").slice(0, 20)),
      "invalid_backend_response",
    );
  });

  it("duplicate object keys reject (mandatory, not waivable)", () => {
    const dup =
      `{"id":${JSON.stringify(U.routine)},"name":"A","name":"B",` +
      `"isDraft":false,"revision":5,"exercises":[]}`;
    expectCodecError(() => decodeBackendResponse("get_routine", dup), "invalid_backend_response");
    const nestedDup =
      `{"id":${JSON.stringify(U.routine)},"name":"A","isDraft":false,"revision":5,` +
      `"exercises":[{"id":${JSON.stringify(U.entryOne)},"id":${JSON.stringify(U.entryTwo)},` +
      `"exerciseId":${JSON.stringify(U.exerciseA)},"exerciseName":"S",` +
      `"position":0,"restDurationSeconds":30,"sets":[]}]}`;
    expectCodecError(
      () => decodeBackendResponse("get_routine", nestedDup),
      "invalid_backend_response",
    );
  });

  it("tolerates and preserves additive convenience fields", () => {
    const body = JSON.parse(routineWire("5"));
    body.xTheme = "dark";
    body.exercises[0].xNote = 1;
    body.totalVolumeKg = 640;
    const decoded = decodeBackendResponse("get_routine", JSON.stringify(body));
    expect(decoded.xTheme).toBe("dark");
    expect(decoded.exercises[0].xNote).toBe(1);
    expect(decoded.revision).toBe("5");
  });
});

describe("T03 decodeBackendResponse domain invariants (spec section 5)", () => {
  it("routine-set completion fields are invalid domain data", () => {
    const body = JSON.parse(routineWire("5"));
    body.exercises[0].sets[0].isCompleted = false;
    expectCodecError(
      () => decodeBackendResponse("get_routine", JSON.stringify(body)),
      "invalid_backend_response",
    );
  });

  it("positions must equal array index; no repair", () => {
    const body = JSON.parse(routineWire("5"));
    body.exercises[0].position = 3;
    expectCodecError(
      () => decodeBackendResponse("get_routine", JSON.stringify(body)),
      "invalid_backend_response",
    );
  });

  it("family UUIDs must be distinct; repeated exerciseId stays valid", () => {
    const body = JSON.parse(routineWire("5"));
    body.exercises.push({
      id: U.entryTwo,
      exerciseId: U.exerciseA,
      exerciseName: "Synthetic Press",
      position: 1,
      restDurationSeconds: 30,
      sets: [],
    });
    const decoded = decodeBackendResponse("get_routine", JSON.stringify(body));
    expect(decoded.exercises).toHaveLength(2);
    const clash = JSON.parse(routineWire("5"));
    clash.exercises[0].sets[0].id = clash.exercises[0].id;
    expectCodecError(
      () => decodeBackendResponse("get_routine", JSON.stringify(clash)),
      "invalid_backend_response",
    );
  });

  it("list_routines items must be non-draft", () => {
    const draft = JSON.parse(routineWire("5", { isDraft: true }));
    const page = JSON.stringify({ items: [draft], hasMore: false, nextPageToken: null });
    expectCodecError(
      () => decodeBackendResponse("list_routines", page),
      "invalid_backend_response",
    );
    const saved = JSON.stringify({
      items: [JSON.parse(routineWire("5"))],
      hasMore: false,
      nextPageToken: null,
    });
    expect(decodeBackendResponse("list_routines", saved).items).toHaveLength(1);
  });

  it("workout finish invariants hold", () => {
    expect(decodeBackendResponse("get_workout", activeWorkoutWire("3")).status).toBe("active");
    expect(decodeBackendResponse("get_workout", finishedWorkoutWire("4")).status).toBe("finished");
    const unfinished = JSON.parse(finishedWorkoutWire("4"));
    unfinished.exercises[0].sets[0].isCompleted = false;
    unfinished.exercises[0].sets[0].repetitions = null;
    expectCodecError(
      () => decodeBackendResponse("get_workout", JSON.stringify(unfinished)),
      "invalid_backend_response",
    );
    const activeFinished = JSON.parse(activeWorkoutWire("3"));
    activeFinished.finishedAt = "2024-05-01T13:00:00.000Z";
    expectCodecError(
      () => decodeBackendResponse("get_workout", JSON.stringify(activeFinished)),
      "invalid_backend_response",
    );
  });

  it("calendar values enforce UTC, ms precision and real dates", () => {
    for (const stamp of [
      "2024-05-01T12:00:00Z",
      "2024-05-01t12:00:00.000z",
      "2024-05-01T12:00:00.000+00:00",
      "2024-05-01T12:00:00.0000Z",
      "0000-01-01T00:00:00.000Z",
      "9999-12-31T23:59:59.999Z",
    ]) {
      const decoded = decodeBackendResponse("get_workout", finishedWorkoutWire("4", stamp));
      expect(decoded.finishedAt).toBe(stamp);
    }
    // A bare timestamp without an explicit UTC suffix is not a valid instant.
    for (const stamp of [
      "2024-05-01T12:00:00.0000",
      "2024-05-01T12:00:00+01:00",
      "2024-05-01T12:00:00.0001Z",
      "2023-12-31T23:59:60.000Z",
      "not-a-date",
      "2024-13-01T00:00:00.000Z",
      "2024-02-30T00:00:00.000Z",
      "2024-05-01",
      "10000-01-01T00:00:00.000Z",
    ]) {
      expectCodecError(
        () => decodeBackendResponse("get_workout", finishedWorkoutWire("4", stamp)),
        "invalid_backend_response",
      );
    }
  });

  it("finished time may precede start after clock correction", () => {
    const decoded = decodeBackendResponse(
      "get_workout",
      finishedWorkoutWire("4", "2024-05-01T11:00:00.000Z"),
    );
    expect(decoded.finishedAt).toBe("2024-05-01T11:00:00.000Z");
    expect(decoded.exercises[0].position).toBe(0);
  });

  it("preserves absence versus explicit null", () => {
    const absent = JSON.parse(activeWorkoutWire("3"));
    delete absent.exercises[0].sets[0].repetitions;
    const decodedAbsent = decodeBackendResponse("get_workout", JSON.stringify(absent));
    expect("repetitions" in decodedAbsent.exercises[0].sets[0]).toBe(false);
    const explicit = JSON.parse(activeWorkoutWire("3"));
    explicit.exercises[0].sets[0].repetitions = null;
    const decodedNull = decodeBackendResponse("get_workout", JSON.stringify(explicit));
    expect(decodedNull.exercises[0].sets[0].repetitions).toBeNull();
    const noCategory = JSON.parse(bundledExerciseWire());
    delete noCategory.category;
    expect("category" in decodeBackendResponse("get_exercise", JSON.stringify(noCategory))).toBe(
      false,
    );
  });

  it("pages normalize omitted terminal tokens to null", () => {
    const omitted = JSON.stringify({
      items: [JSON.parse(routineWire("5"))],
      hasMore: false,
    });
    const decoded = decodeBackendResponse("list_routines", omitted);
    expect(decoded.nextPageToken).toBeNull();
    const live = JSON.stringify({
      catalogueVersion: "synthetic-v1",
      items: [JSON.parse(bundledExerciseWire())],
      hasMore: false,
      nextPageToken: null,
    });
    expect(decodeBackendResponse("search_exercises", live).catalogueVersion).toBe("synthetic-v1");
  });
});

describe("T03 custom exercise relationships (spec section 5)", () => {
  const LEG = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
  const ARM = "cccccccc-cccc-4ccc-cccc-cccccccccccc";

  function customWith(groups, equipment = []) {
    const body = JSON.parse(customExerciseWire("9"));
    body.muscleGroups = groups;
    body.equipment = equipment;
    return JSON.stringify(body);
  }

  const named = (id, name, type) => ({ id, name, type });

  it("accepts primary plus secondary membership and emits canonical order", () => {
    const wire = customWith([
      named(ARM, "Synthetic Arm", "secondary"),
      named(MUSCLE, "Synthetic Chest", "primary"),
    ]);
    const decoded = decodeBackendResponse("get_exercise", wire);
    expect(decoded.muscleGroups.map((group) => group.type)).toEqual(["primary", "secondary"]);
    expect(decoded.muscleGroups.map((group) => group.id)).toEqual([MUSCLE, ARM]);
  });

  it("emits bundled equipment by ascending UUID", () => {
    // Multi-equipment ordering is exercised on a bundled record: custom
    // exercises allow at most one equipment row (rejected below). Lexical
    // ascending UUID order puts bbbb... before cccc....
    const bundled = JSON.parse(bundledExerciseWire());
    bundled.equipment = [
      { id: ARM, name: "Synthetic Bell" },
      { id: LEG, name: "Synthetic Band" },
    ];
    const decoded = decodeBackendResponse("get_exercise", JSON.stringify(bundled));
    expect(decoded.equipment.map((item) => item.id)).toEqual([LEG, ARM]);
  });

  it("preserves instruction-string order", () => {
    const parsed = JSON.parse(customExerciseWire("9"));
    parsed.instructions = ["second", "first"];
    const decoded = decodeBackendResponse("get_exercise", JSON.stringify(parsed));
    expect(decoded.instructions).toEqual(["second", "first"]);
  });

  it("rejects duplicate, overlapping and tertiary custom relationships", () => {
    const duplicate = customWith([
      named(MUSCLE, "Synthetic Chest", "primary"),
      named(MUSCLE, "Synthetic Chest", "secondary"),
    ]);
    expectCodecError(
      () => decodeBackendResponse("get_exercise", duplicate),
      "invalid_backend_response",
    );
    const twoPrimary = customWith([
      named(MUSCLE, "Synthetic Chest", "primary"),
      named(ARM, "Synthetic Arm", "primary"),
    ]);
    expectCodecError(
      () => decodeBackendResponse("get_exercise", twoPrimary),
      "invalid_backend_response",
    );
    const tertiary = customWith([named(MUSCLE, "Synthetic Chest", "tertiary")]);
    expectCodecError(
      () => decodeBackendResponse("get_exercise", tertiary),
      "invalid_backend_response",
    );
    const twoEquipment = customWith(
      [named(MUSCLE, "Synthetic Chest", "primary")],
      [
        { id: ARM, name: "Synthetic Bell" },
        { id: LEG, name: "Synthetic Band" },
      ],
    );
    expectCodecError(
      () => decodeBackendResponse("get_exercise", twoEquipment),
      "invalid_backend_response",
    );
  });

  it("bundled rows may carry tertiary membership", () => {
    const bundled = JSON.parse(bundledExerciseWire());
    bundled.muscleGroups = [
      { id: MUSCLE, name: "Synthetic Chest", type: "primary" },
      { id: ARM, name: "Synthetic Arm", type: "secondary" },
      { id: LEG, name: "Synthetic Leg", type: "tertiary" },
    ];
    const decoded = decodeBackendResponse("get_exercise", JSON.stringify(bundled));
    expect(decoded.muscleGroups.map((group) => group.type)).toEqual([
      "primary",
      "secondary",
      "tertiary",
    ]);
  });
});

describe("T03 exact-source Int32 traps (spec section 5)", () => {
  // Raw wire fixtures preserve ORIGINAL numeric token text: the token is
  // interpolated into the JSON string verbatim, never JSON.parse/stringify
  // round-tripped (which would collapse each trap into a plain valid integer
  // before the implementation ever sees it). Every token below is fractional
  // yet lands on (or beside) a valid integer once rounded to a JS number, so
  // only exact-source integrality checks reject it.
  const FRACTION_400 = "0".repeat(400) + "1";

  function routineWithTokens({ rest, position, reps } = {}) {
    const set =
      reps === undefined
        ? "[]"
        : `[{"id":${JSON.stringify(U.setOne)},"position":0,"repetitions":${reps}}]`;
    return (
      `{"id":${JSON.stringify(U.routine)},"name":"Upper Body A","isDraft":false,"revision":5,` +
      `"exercises":[{"id":${JSON.stringify(U.entryOne)},"exerciseId":${JSON.stringify(U.exerciseA)},` +
      `"exerciseName":"Synthetic Press","position":${position ?? "0"},"restDurationSeconds":${rest ?? "30"},"sets":${set}}]}`
    );
  }

  it.each([
    ["rest rounds to 30", { rest: `30.${FRACTION_400}` }],
    ["rest rounds to Int32 max", { rest: "2147483647.0000000001" }],
    ["position rounds to 0", { position: `0.${FRACTION_400}` }],
    ["repetitions rounds to 8", { reps: `8.${FRACTION_400}` }],
    ["rest exponent is fractional", { rest: "1e-20" }],
  ])("fractional token %s rejects before rounded conversion", (_label, tokens) => {
    expectCodecError(
      () => decodeBackendResponse("get_routine", routineWithTokens(tokens)),
      "invalid_backend_response",
    );
  });

  it("plain integer spellings decode exactly", () => {
    const decoded = decodeBackendResponse("get_routine", routineWithTokens({}));
    expect(decoded.exercises[0].restDurationSeconds).toBe(30);
    expect(decoded.exercises[0].position).toBe(0);
  });

  it("equipment numItems fractional trap rejects", () => {
    const BAND = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
    const wire =
      `{"id":${JSON.stringify(U.exerciseA)},"name":"Synthetic Press","type":"reps",` +
      `"isUserCreated":false,"muscleGroups":[{"id":${JSON.stringify(MUSCLE)},"name":"Synthetic Chest","type":"primary"}],` +
      `"equipment":[{"id":${JSON.stringify(BAND)},"name":"Synthetic Band","numItems":1.${FRACTION_400}}]}`;
    expectCodecError(() => decodeBackendResponse("get_exercise", wire), "invalid_backend_response");
  });
});

describe("T03 JSON boundaries: prototype names, escapes, pages, numerals", () => {
  it("prototype-named additive fields stay ordinary own data", () => {
    const raw =
      `{"id":${JSON.stringify(U.routine)},"name":"Upper Body A","isDraft":false,"revision":5,` +
      `"__proto__":{"polluted":true},"constructor":1,"toString":"kept","exercises":[]}`;
    const parsed = JSON.parse(raw);
    for (const name of ["__proto__", "constructor", "toString"]) {
      expect(Object.prototype.hasOwnProperty.call(parsed, name)).toBe(true);
    }
    const decoded = decodeBackendResponse("get_routine", raw);
    for (const name of ["__proto__", "constructor", "toString"]) {
      expect(Object.prototype.hasOwnProperty.call(decoded, name)).toBe(true);
    }
    // Null-prototype records are permitted output, so no exact prototype
    // identity is asserted: what matters is own-key preservation plus no
    // attacker-controlled or global prototype effects.
    expect({}.polluted).toBeUndefined();
    expect(decoded.revision).toBe("5");
  });

  it("prototype names do not bypass known-field validation", () => {
    const body = JSON.parse(routineWire("5"));
    body.revision = "5";
    const raw = JSON.stringify(body).replace(/^{/, '{"__proto__":1,');
    expectCodecError(() => decodeBackendResponse("get_routine", raw), "invalid_backend_response");
  });

  it("escaped strings follow ordinary JSON code-unit semantics", () => {
    const escapedName = '"A\\u0041pple"';
    const raw = `{"id":${JSON.stringify(U.routine)},"name":${escapedName},"isDraft":false,"revision":5,"exercises":[]}`;
    expect(decodeBackendResponse("get_routine", raw).name).toBe("AApple");
    const pair = '"\\uD83D\\uDE00"';
    const pairRaw = `{"id":${JSON.stringify(U.routine)},"name":${pair},"isDraft":false,"revision":5,"exercises":[]}`;
    expect(decodeBackendResponse("get_routine", pairRaw).name).toBe("😀");
    const quotes = '"a\\"b\\\\c"';
    const quoteRaw = `{"id":${JSON.stringify(U.routine)},"name":${quotes},"isDraft":false,"revision":5,"exercises":[]}`;
    expect(decodeBackendResponse("get_routine", quoteRaw).name).toBe('a"b\\c');
  });

  it("page tokens correlate iff with hasMore", () => {
    const live = JSON.stringify({
      items: [JSON.parse(routineWire("5"))],
      hasMore: true,
      nextPageToken: "tok",
    });
    expect(decodeBackendResponse("list_routines", live).nextPageToken).toBe("tok");
    for (const page of [
      { items: [], hasMore: true, nextPageToken: null },
      { items: [], hasMore: true },
      { items: [], hasMore: false, nextPageToken: "tok" },
    ]) {
      expectCodecError(
        () => decodeBackendResponse("list_routines", JSON.stringify(page)),
        "invalid_backend_response",
      );
    }
    const searchLive = JSON.stringify({
      catalogueVersion: "synthetic-v1",
      items: [],
      hasMore: true,
      nextPageToken: "tok",
    });
    expect(decodeBackendResponse("search_exercises", searchLive).nextPageToken).toBe("tok");
    expectCodecError(
      () =>
        decodeBackendResponse(
          "search_exercises",
          JSON.stringify({ catalogueVersion: "synthetic-v1", items: [], hasMore: true }),
        ),
      "invalid_backend_response",
    );
  });

  it("exact integral spellings decode exactly, including zero Int32 forms", () => {
    const spelled =
      `{"id":${JSON.stringify(U.routine)},"name":"Upper Body A","isDraft":false,"revision":5,` +
      `"exercises":[{"id":${JSON.stringify(U.entryOne)},"exerciseId":${JSON.stringify(U.exerciseA)},` +
      `"exerciseName":"Synthetic Press","position":0E0,"restDurationSeconds":3e1,"sets":[]}]}`;
    const decoded = decodeBackendResponse("get_routine", spelled);
    expect(decoded.exercises[0].restDurationSeconds).toBe(30);
    expect(decoded.exercises[0].position).toBe(0);
    // Mantissa/exponent compensation is exactness by VALUE, not lexical
    // shape: 30e-1 means 3 however it is spelled. Short synthetic tokens
    // only (negligible parse cost); no long-mantissa stress fixture is added.
    const compensated = spelled.replace("3e1", "30e-1");
    expect(decodeBackendResponse("get_routine", compensated).exercises[0].restDurationSeconds).toBe(
      3,
    );
    for (const rest of ["0e0", "-0"]) {
      const zero =
        `{"id":${JSON.stringify(U.routine)},"name":"Upper Body A","isDraft":false,"revision":5,` +
        `"exercises":[{"id":${JSON.stringify(U.entryOne)},"exerciseId":${JSON.stringify(U.exerciseA)},` +
        `"exerciseName":"Synthetic Press","position":0,"restDurationSeconds":${rest},"sets":[]}]}`;
      const zeroDecoded = decodeBackendResponse("get_routine", zero);
      expect(zeroDecoded.exercises[0].restDurationSeconds).toBe(0);
      expect(Object.is(zeroDecoded.exercises[0].restDurationSeconds, -0)).toBe(false);
    }
  });

  it("unrepresentable additive wire numbers fail closed", () => {
    const raw =
      `{"id":${JSON.stringify(U.routine)},"name":"Upper Body A","isDraft":false,"revision":5,` +
      `"exercises":[],"xExtra":1e1000}`;
    expect(JSON.parse(raw).xExtra).toBe(Infinity);
    expectCodecError(() => decodeBackendResponse("get_routine", raw), "invalid_backend_response");
  });

  it("non-string rawJson fails without fabrication", () => {
    for (const raw of [42, null, {}, []]) {
      expectCodecError(() => decodeBackendResponse("get_routine", raw), "invalid_backend_response");
    }
  });
});

describe("T03 canonical exactness: entire UUID/timestamp values", () => {
  const EDGES = [
    String.fromCharCode(10),
    String.fromCharCode(13),
    String.fromCodePoint(0x2028),
    String.fromCodePoint(0x2029),
  ];

  it("timestamps reject trailing line boundaries", () => {
    for (const edge of EDGES) {
      expectCodecError(
        () =>
          decodeBackendResponse(
            "get_workout",
            finishedWorkoutWire("4", `2024-05-01T12:00:00.000Z${edge}`),
          ),
        "invalid_backend_response",
      );
    }
  });

  it("UUID fields reject trailing line boundaries", () => {
    for (const edge of EDGES) {
      const body = JSON.parse(routineWire("5"));
      body.id = `${U.routine}${edge}`;
      expectCodecError(
        () => decodeBackendResponse("get_routine", JSON.stringify(body)),
        "invalid_backend_response",
      );
    }
  });
});
