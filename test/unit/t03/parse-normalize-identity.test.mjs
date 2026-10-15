// T03 QA: strict arguments, intent normalization and identity material
// (spec sections 2-4; scenarios M03, C02, C03 and C06 schema aspects).
//
// Black-box only through dist/domain/index.js. No guard/journal/host claims.

import { describe, expect, it } from "vitest";
import {
  BLANK_NAMES,
  EXPECTED_TOOL_NAMES,
  INTENT_VERSION,
  NONBLANK_EDGE_NAMES,
  SYNTHETIC_UUIDS,
  clone,
  validCreateInput,
} from "./fixtures.mjs";
import { expectCodecError, expectSafeMessage } from "./helpers.mjs";

import {
  CodecError,
  intentIdentityMaterial,
  normalizeIntent,
  parseArguments,
} from "../../../dist/domain/index.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("T03 CodecError library categories (spec section 2)", () => {
  it("is an Error with exactly the three local codes", () => {
    for (const code of ["invalid_arguments", "invalid_backend_response", "invalid_tool_result"]) {
      const error = new CodecError(code);
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CodecError);
      expect(error.code).toBe(code);
      expect(String(error.message).length > 0).toBe(true);
    }
  });

  it("messages never include raw input or IDs", () => {
    const error = new CodecError("invalid_arguments");
    expectSafeMessage(error, [SYNTHETIC_UUIDS.operation, "Upper Body A"]);
  });

  it("new CodecError(code, message?) honors an explicit generic message", () => {
    const explicit = new CodecError("invalid_arguments", "synthetic explicit note");
    expect(explicit).toBeInstanceOf(CodecError);
    expect(explicit.code).toBe("invalid_arguments");
    expect(String(explicit.message)).toContain("synthetic explicit note");
    const fallback = new CodecError("invalid_backend_response", undefined);
    expect(String(fallback.message).length > 0).toBe(true);
  });
});

describe("T03 parseArguments read defaults and strictness (M03)", () => {
  it("expands documented read defaults and preserves omission", () => {
    expect(parseArguments("list_workouts", {})).toEqual({ limit: 20 });
    expect(parseArguments("list_routines", {})).toEqual({ limit: 20 });
    expect(parseArguments("get_exercise", { exerciseId: SYNTHETIC_UUIDS.exerciseA })).toEqual({
      exerciseId: SYNTHETIC_UUIDS.exerciseA,
    });
    expect(parseArguments("search_exercises", {})).toEqual({
      search: "",
      muscleGroupIds: [],
      equipmentIds: [],
      limit: 20,
    });
  });

  it("preserves opaque page tokens byte-for-byte", () => {
    const token = "tok 1/+=~opaque";
    const parsed = parseArguments("list_workouts", { pageToken: token });
    expect(parsed.pageToken).toBe(token);
  });

  it("unknown tool names fail locally", () => {
    expectCodecError(() => parseArguments("no_such_tool", {}), "invalid_arguments");
  });

  it("rejects nested unknown fields at every level (C03)", () => {
    expectCodecError(
      () => parseArguments("get_exercise", { exerciseId: SYNTHETIC_UUIDS.exerciseA, bogus: 1 }),
      "invalid_arguments",
    );
    const nested = clone(validCreateInput());
    nested.exercises[0].bogus = 1;
    expectCodecError(() => parseArguments("create_routine", nested), "invalid_arguments");
    const deep = clone(validCreateInput());
    deep.exercises[0].sets[0].bogus = 1;
    expectCodecError(() => parseArguments("create_routine", deep), "invalid_arguments");
  });

  it("rejects coercion, malformed UUIDs and out-of-range numerics", () => {
    expectCodecError(() => parseArguments("list_workouts", { limit: "20" }), "invalid_arguments");
    expectCodecError(() => parseArguments("list_workouts", { limit: 0 }), "invalid_arguments");
    expectCodecError(() => parseArguments("list_workouts", { limit: 201 }), "invalid_arguments");
    expectCodecError(() => parseArguments("list_workouts", { pageToken: "" }), "invalid_arguments");
    expectCodecError(
      () => parseArguments("list_workouts", { pageToken: null }),
      "invalid_arguments",
    );
    expectCodecError(
      () => parseArguments("get_exercise", { exerciseId: "18EA675E-1426-4A4C-A9CD-D726D7DF9A34" }),
      "invalid_arguments",
    );
    expectCodecError(
      () => parseArguments("get_exercise", { exerciseId: "not-a-uuid" }),
      "invalid_arguments",
    );
    const bad = clone(validCreateInput());
    bad.exercises[0].restDurationSeconds = -1;
    expectCodecError(() => parseArguments("create_routine", bad), "invalid_arguments");
    const overflow = clone(validCreateInput());
    overflow.exercises[0].restDurationSeconds = 2147483648;
    expectCodecError(() => parseArguments("create_routine", overflow), "invalid_arguments");
    const nonfinite = clone(validCreateInput());
    nonfinite.exercises[0].sets[0].weightKg = Number.POSITIVE_INFINITY;
    expectCodecError(() => parseArguments("create_routine", nonfinite), "invalid_arguments");
    const nan = clone(validCreateInput());
    nan.exercises[0].sets[0].weightKg = Number.NaN;
    expectCodecError(() => parseArguments("create_routine", nan), "invalid_arguments");
  });

  it("rejects blank Unicode names and preserves valid names exactly", () => {
    for (const blank of BLANK_NAMES) {
      const input = clone(validCreateInput({ name: blank }));
      expectCodecError(() => parseArguments("create_routine", input), "invalid_arguments");
    }
    for (const name of NONBLANK_EDGE_NAMES) {
      const parsed = parseArguments("create_routine", clone(validCreateInput({ name })));
      expect(parsed.name).toBe(name);
    }
    const spaced = parseArguments("create_routine", clone(validCreateInput({ name: "  A  " })));
    expect(spaced.name).toBe("  A  ");
  });

  it("create arguments return without default expansion", () => {
    const minimal = {
      operationId: SYNTHETIC_UUIDS.operation,
      name: "Upper Body A",
      exercises: [{ exerciseId: SYNTHETIC_UUIDS.exerciseA, sets: [{}] }],
    };
    const parsed = parseArguments("create_routine", clone(minimal));
    expect("restDurationSeconds" in parsed.exercises[0]).toBe(false);
    expect("repetitions" in parsed.exercises[0].sets[0]).toBe(false);
    expect("weightKg" in parsed.exercises[0].sets[0]).toBe(false);
  });

  it("never mutates inputs and returns detached values", () => {
    const input = validCreateInput();
    const snapshot = clone(input);
    const parsed = parseArguments("create_routine", input);
    expect(input).toEqual(snapshot);
    expect(parsed.exercises).not.toBe(input.exercises);
    parsed.exercises[0].sets[0].repetitions = 999;
    expect(input.exercises[0].sets[0].repetitions).toBe(8);
  });
});

describe("T03 normalizeIntent defaults and exact shape (C02)", () => {
  it("expands rest=30 and null set values with exact key order", () => {
    const intent = normalizeIntent({
      operationId: SYNTHETIC_UUIDS.operation,
      name: "Upper Body A",
      exercises: [{ exerciseId: SYNTHETIC_UUIDS.exerciseA, sets: [{}] }],
    });
    expect(Object.keys(intent)).toEqual(["name", "exercises"]);
    expect(Object.keys(intent.exercises[0])).toEqual(["exerciseId", "restDurationSeconds", "sets"]);
    expect(Object.keys(intent.exercises[0].sets[0])).toEqual(["repetitions", "weightKg"]);
    expect(intent.exercises[0].restDurationSeconds).toBe(30);
    expect(intent.exercises[0].sets[0]).toEqual({ repetitions: null, weightKg: null });
    expect("operationId" in intent).toBe(false);
  });

  it("preserves zero, empty sets and repeated references", () => {
    const intent = normalizeIntent({
      operationId: SYNTHETIC_UUIDS.operation,
      name: "Z",
      exercises: [
        { exerciseId: SYNTHETIC_UUIDS.exerciseA, restDurationSeconds: 0, sets: [] },
        {
          exerciseId: SYNTHETIC_UUIDS.exerciseA,
          sets: [{ repetitions: 0, weightKg: 0 }],
        },
      ],
    });
    expect(intent.exercises).toHaveLength(2);
    expect(intent.exercises[0].sets).toEqual([]);
    expect(intent.exercises[0].restDurationSeconds).toBe(0);
    expect(intent.exercises[1].sets[0]).toEqual({ repetitions: 0, weightKg: 0 });
  });

  it("explicit rest null is invalid; empty exercises invalid", () => {
    const nullRest = clone(validCreateInput());
    nullRest.exercises[0].restDurationSeconds = null;
    expectCodecError(() => normalizeIntent(nullRest), "invalid_arguments");
    expectCodecError(
      () => normalizeIntent({ operationId: SYNTHETIC_UUIDS.operation, name: "A", exercises: [] }),
      "invalid_arguments",
    );
  });

  it("canonicalizes accepted -0 to +0 (spec clarification)", () => {
    const negZero = {
      operationId: SYNTHETIC_UUIDS.operation,
      name: "Z",
      exercises: [
        {
          exerciseId: SYNTHETIC_UUIDS.exerciseA,
          sets: [{ repetitions: -0, weightKg: -0 }],
        },
      ],
    };
    const intent = normalizeIntent(negZero);
    expect(Object.is(intent.exercises[0].sets[0].weightKg, -0)).toBe(false);
    expect(Object.is(intent.exercises[0].sets[0].weightKg, 0)).toBe(true);
    expect(Object.is(intent.exercises[0].sets[0].repetitions, -0)).toBe(false);
    const materialNeg = intentIdentityMaterial(negZero);
    const materialPos = intentIdentityMaterial({
      operationId: SYNTHETIC_UUIDS.operationOther,
      name: "Z",
      exercises: [
        {
          exerciseId: SYNTHETIC_UUIDS.exerciseA,
          sets: [{ repetitions: 0, weightKg: 0 }],
        },
      ],
    });
    expect(materialNeg.canonicalJson).toBe(materialPos.canonicalJson);
  });

  it("accepts canonical UUIDs and rejects narrower version checks", () => {
    expect(UUID_RE.test(SYNTHETIC_UUIDS.operation)).toBe(true);
    const upper = clone(validCreateInput());
    upper.operationId = "75CF9367-6BCD-4CA3-9A57-0C0D8E1F0151";
    expectCodecError(() => normalizeIntent(upper), "invalid_arguments");
  });

  it("accepts lowercase UUIDs with non-RFC version/variant nibbles", () => {
    // The documented regex constrains syntax only: version nibble 0 and
    // variant nibble c are not RFC 4122 values but match the pattern.
    const freeId = "aaaaaaaa-aaaa-0aaa-caaa-aaaaaaaaaaaa";
    expect(UUID_RE.test(freeId)).toBe(true);
    const input = clone(validCreateInput());
    input.operationId = freeId;
    expect(normalizeIntent(input).exercises).toHaveLength(1);
    expect(parseArguments("get_exercise", { exerciseId: freeId }).exerciseId).toBe(freeId);
  });

  it("applies API-level Int32 validation to parsed JS numbers", () => {
    // Boundary note: these inputs are already-parsed JS numbers, so they
    // cover ordinary argument validation only. Exact-source traps (fractional
    // tokens that round to valid integers) are covered through raw wire JSON
    // in backend-response.test.mjs, where original token text is preserved.
    for (const rest of [8.5, 0.5, 2147483647.5]) {
      const input = clone(validCreateInput());
      input.exercises[0].restDurationSeconds = rest;
      expectCodecError(() => normalizeIntent(input), "invalid_arguments");
    }
    for (const repetitions of [8.5, 0.1]) {
      const input = clone(validCreateInput());
      input.exercises[0].sets[0].repetitions = repetitions;
      expectCodecError(() => normalizeIntent(input), "invalid_arguments");
    }
    // Integral-valued doubles are exact integers, including exponent spellings.
    for (const rest of [100, 100.0, 1e2]) {
      const input = clone(validCreateInput());
      input.exercises[0].restDurationSeconds = rest;
      expect(normalizeIntent(input).exercises[0].restDurationSeconds).toBe(100);
    }
    const max = clone(validCreateInput());
    max.exercises[0].restDurationSeconds = 2147483647;
    expect(normalizeIntent(max).exercises[0].restDurationSeconds).toBe(2147483647);
    const over = clone(validCreateInput());
    over.exercises[0].restDurationSeconds = 2147483648;
    expectCodecError(() => normalizeIntent(over), "invalid_arguments");
    // Weight is a finite double: fractions are valid, nonfinite is not.
    const fractional = clone(validCreateInput());
    fractional.exercises[0].sets[0].weightKg = 40.5;
    expect(normalizeIntent(fractional).exercises[0].sets[0].weightKg).toBe(40.5);
  });

  it("imposes no new domain caps: long names and large counts pass through", () => {
    const longName = `n${"a".repeat(500)}`;
    const manyEntries = Array.from({ length: 50 }, (_, index) => ({
      exerciseId: index % 2 === 0 ? SYNTHETIC_UUIDS.exerciseA : SYNTHETIC_UUIDS.exerciseB,
      sets: Array.from({ length: 4 }, () => ({ repetitions: 8, weightKg: 40 })),
    }));
    const intent = normalizeIntent({
      operationId: SYNTHETIC_UUIDS.operation,
      name: longName,
      exercises: manyEntries,
    });
    expect(intent.name).toBe(longName);
    expect(intent.name.length).toBe(501);
    expect(intent.exercises).toHaveLength(50);
    expect(intent.exercises[49].sets).toHaveLength(4);
    const manySets = {
      operationId: SYNTHETIC_UUIDS.operation,
      name: "Upper Body A",
      exercises: [
        {
          exerciseId: SYNTHETIC_UUIDS.exerciseA,
          sets: Array.from({ length: 100 }, (_, index) => ({
            repetitions: index,
            weightKg: index,
          })),
        },
      ],
    };
    expect(normalizeIntent(manySets).exercises[0].sets).toHaveLength(100);
  });
});

describe("T03 intentIdentityMaterial equivalence (C06 schema aspect)", () => {
  it("returns the frozen version and JSON of normalizeIntent", () => {
    const input = validCreateInput();
    const material = intentIdentityMaterial(clone(input));
    expect(Object.keys(material).sort()).toEqual(["canonicalJson", "version"]);
    expect(material.version).toBe(INTENT_VERSION);
    expect(material.canonicalJson).toBe(JSON.stringify(normalizeIntent(clone(input))));
  });

  it("equalizes key order, omitted/explicit defaults and 40/40.0", () => {
    // Identical arrays/counts/values: base carries one entry with two sets,
    // so the reordered spelling must carry the same two sets.
    const base = validCreateInput();
    const reordered = {
      exercises: [
        {
          sets: [
            { weightKg: 40, repetitions: 8 },
            { weightKg: 40, repetitions: 8 },
          ],
          exerciseId: SYNTHETIC_UUIDS.exerciseA,
          restDurationSeconds: 90,
        },
      ],
      name: "Upper Body A",
      operationId: SYNTHETIC_UUIDS.operationOther,
    };
    expect(intentIdentityMaterial(base).canonicalJson).toBe(
      intentIdentityMaterial(reordered).canonicalJson,
    );
    const omitted = {
      operationId: SYNTHETIC_UUIDS.operation,
      name: "Upper Body A",
      exercises: [{ exerciseId: SYNTHETIC_UUIDS.exerciseA, sets: [{ repetitions: 8 }] }],
    };
    const explicit = {
      operationId: SYNTHETIC_UUIDS.operation,
      name: "Upper Body A",
      exercises: [
        {
          exerciseId: SYNTHETIC_UUIDS.exerciseA,
          restDurationSeconds: 30,
          sets: [{ repetitions: 8, weightKg: null }],
        },
      ],
    };
    expect(intentIdentityMaterial(omitted).canonicalJson).toBe(
      intentIdentityMaterial(explicit).canonicalJson,
    );
    const forty = {
      operationId: SYNTHETIC_UUIDS.operation,
      name: "Upper Body A",
      exercises: [
        {
          exerciseId: SYNTHETIC_UUIDS.exerciseA,
          sets: [{ repetitions: 8, weightKg: 40 }],
        },
      ],
    };
    const fortyPoint = {
      operationId: SYNTHETIC_UUIDS.operation,
      name: "Upper Body A",
      exercises: [
        {
          exerciseId: SYNTHETIC_UUIDS.exerciseA,
          sets: [{ repetitions: 8, weightKg: 40.0 }],
        },
      ],
    };
    expect(intentIdentityMaterial(forty).canonicalJson).toBe(
      intentIdentityMaterial(fortyPoint).canonicalJson,
    );
  });

  it("keeps names, order, values and references significant", () => {
    const base = intentIdentityMaterial(validCreateInput()).canonicalJson;
    const renamed = clone(validCreateInput({ name: "Upper Body B" }));
    expect(intentIdentityMaterial(renamed).canonicalJson).not.toBe(base);
    // Same-length exercise arrays with swapped content: order is significant.
    const entryA = {
      exerciseId: SYNTHETIC_UUIDS.exerciseA,
      sets: [
        { repetitions: 8, weightKg: 40 },
        { repetitions: 6, weightKg: 30 },
      ],
    };
    const entryB = { exerciseId: SYNTHETIC_UUIDS.exerciseB, sets: [] };
    const orderAB = intentIdentityMaterial({
      operationId: SYNTHETIC_UUIDS.operation,
      name: "Upper Body A",
      exercises: [clone(entryA), clone(entryB)],
    }).canonicalJson;
    const orderBA = intentIdentityMaterial({
      operationId: SYNTHETIC_UUIDS.operation,
      name: "Upper Body A",
      exercises: [clone(entryB), clone(entryA)],
    }).canonicalJson;
    expect(orderBA).not.toBe(orderAB);
    // Same-length set arrays with swapped content: set order is significant.
    const setsForward = intentIdentityMaterial({
      operationId: SYNTHETIC_UUIDS.operation,
      name: "Upper Body A",
      exercises: [{ exerciseId: SYNTHETIC_UUIDS.exerciseA, sets: clone(entryA.sets) }],
    }).canonicalJson;
    const setsSwapped = intentIdentityMaterial({
      operationId: SYNTHETIC_UUIDS.operation,
      name: "Upper Body A",
      exercises: [
        { exerciseId: SYNTHETIC_UUIDS.exerciseA, sets: [...clone(entryA.sets)].reverse() },
      ],
    }).canonicalJson;
    expect(setsSwapped).not.toBe(setsForward);
    // Differing counts are differing intents.
    const single = clone(validCreateInput());
    single.exercises = [{ exerciseId: SYNTHETIC_UUIDS.exerciseB, sets: [] }];
    expect(intentIdentityMaterial(single).canonicalJson).not.toBe(base);
  });

  it("is stable across TOOL_NAMES order and input identity", () => {
    expect([...EXPECTED_TOOL_NAMES]).toHaveLength(7);
    const first = intentIdentityMaterial(validCreateInput());
    const second = intentIdentityMaterial(validCreateInput());
    expect(first.canonicalJson).toBe(second.canonicalJson);
    expect(first).not.toBe(second);
  });
});

describe("T03 JSON boundaries: own fields, prototypes, non-JSON values", () => {
  it("required fields must be own data, never inherited", () => {
    const inherited = Object.create({ exerciseId: SYNTHETIC_UUIDS.exerciseA });
    expectCodecError(() => parseArguments("get_exercise", inherited), "invalid_arguments");
    const inheritedUnknown = Object.assign(Object.create({ bogus: 1 }), {
      exerciseId: SYNTHETIC_UUIDS.exerciseA,
    });
    expect(parseArguments("get_exercise", inheritedUnknown)).toEqual({
      exerciseId: SYNTHETIC_UUIDS.exerciseA,
    });
  });

  it("prototype-named unknown fields reject without prototype effects", () => {
    for (const name of ["__proto__", "constructor", "toString"]) {
      const input = JSON.parse(
        `{"operationId":${JSON.stringify(SYNTHETIC_UUIDS.operation)},"name":"Upper Body A",` +
          `"exercises":[{"exerciseId":${JSON.stringify(SYNTHETIC_UUIDS.exerciseA)},"sets":[]}],"${name}":1}`,
      );
      expect(Object.prototype.hasOwnProperty.call(input, name)).toBe(true);
      expectCodecError(() => normalizeIntent(input), "invalid_arguments");
    }
    expect({}.polluted).toBeUndefined();
  });

  it("rejects non-JSON values with CodecError instead of coercing or executing", () => {
    const withFunction = { limit: 20, onDone: () => {} };
    expectCodecError(() => parseArguments("list_workouts", withFunction), "invalid_arguments");
    let executed = false;
    const withGetter = {};
    Object.defineProperty(withGetter, "limit", {
      enumerable: true,
      configurable: true,
      get() {
        executed = true;
        return 20;
      },
    });
    expectCodecError(() => parseArguments("list_workouts", withGetter), "invalid_arguments");
    expect(executed, "accessor must never execute").toBe(false);
    expectCodecError(
      () => parseArguments("get_exercise", { exerciseId: undefined }),
      "invalid_arguments",
    );
    expectCodecError(() => parseArguments("list_workouts", { limit: 20n }), "invalid_arguments");
    const cyclic = { limit: 20 };
    cyclic.self = cyclic;
    expectCodecError(() => parseArguments("list_workouts", cyclic), "invalid_arguments");
  });
});

describe("T03 canonical exactness: entire values, preserved whitespace", () => {
  const EDGES = [
    "x",
    " ",
    String.fromCharCode(10),
    String.fromCharCode(13),
    String.fromCharCode(9),
    String.fromCodePoint(0x2028),
    String.fromCodePoint(0x2029),
  ];

  it("UUIDs are exactly 36 chars: no prefix matches or boundary suffixes", () => {
    expect(SYNTHETIC_UUIDS.exerciseA.length).toBe(36);
    const truncated = SYNTHETIC_UUIDS.exerciseA.slice(0, 35);
    expectCodecError(
      () => parseArguments("get_exercise", { exerciseId: truncated }),
      "invalid_arguments",
    );
    expectCodecError(
      () => parseArguments("get_exercise", { exerciseId: `${SYNTHETIC_UUIDS.exerciseA}0` }),
      "invalid_arguments",
    );
    for (const edge of EDGES) {
      expectCodecError(
        () => parseArguments("get_exercise", { exerciseId: `${SYNTHETIC_UUIDS.exerciseA}${edge}` }),
        "invalid_arguments",
      );
      const operation = clone(validCreateInput());
      operation.operationId = `${SYNTHETIC_UUIDS.operation}${edge}`;
      expectCodecError(() => normalizeIntent(operation), "invalid_arguments");
    }
  });

  it("valid inner whitespace is preserved, never trimmed or capped", () => {
    const multiline = "Line1\nLine2";
    expect(
      parseArguments("create_routine", clone(validCreateInput({ name: multiline }))).name,
    ).toBe(multiline);
    const tabbed = "\tindented\t";
    expect(parseArguments("create_routine", clone(validCreateInput({ name: tabbed }))).name).toBe(
      tabbed,
    );
    const spaced = "  spaced query  ";
    expect(parseArguments("search_exercises", { search: spaced }).search).toBe(spaced);
    const token = "tok\nwith\nlines";
    expect(parseArguments("list_workouts", { pageToken: token }).pageToken).toBe(token);
  });
});
