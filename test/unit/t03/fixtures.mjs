// T03 QA synthetic fixtures (approved schema/codec spec).
//
// SYNTHETIC PROVENANCE: every UUID, name, timestamp and numeric token below is
// fabricated for black-box QA use only. Listed here, never a real catalogue,
// account or backend value. No credentials, tokens, private paths or raw
// request/response bodies.

export const SYNTHETIC_LABEL = "synthetic-qa-t03-schemas-codecs";

export const SYNTHETIC_UUIDS = Object.freeze({
  operation: "75cf9367-6bcd-4ca3-9a57-0c0d8e1f0151",
  operationOther: "0e9b4c2a-1f3d-4b5c-9d6e-7f8a9b0c1d2e",
  routine: "6b3728e2-c87a-485b-b694-a1ee0c6e31a2",
  entryOne: "2d9a2a1e-b405-4325-8a5e-c6d2cf3d1979",
  entryTwo: "3e8b3b2f-c516-4366-9f7f-d8e8e0f1086a",
  exerciseA: "18ea675e-1426-4a4c-a9cd-d726d7df9a34",
  exerciseB: "29fb786f-2537-4b5d-b0de-e837e8f00a45",
  setOne: "5402c522-15b0-4b46-99f8-146eb5d85c85",
  setTwo: "453210b1-af4c-4f45-a3ad-034cdacaa307",
  setThree: "664321c2-b05d-4056-bebe-145debcbb418",
  foreign: "ffffffff-ffff-4fff-bfff-ffffffffffff",
});

export const EXPECTED_TOOL_NAMES = Object.freeze([
  "search_exercises",
  "get_exercise",
  "list_workouts",
  "get_workout",
  "list_routines",
  "get_routine",
  "create_routine",
]);

export const EXPECTED_READ_TOOLS = Object.freeze([
  "search_exercises",
  "get_exercise",
  "list_workouts",
  "get_workout",
  "list_routines",
  "get_routine",
]);

export const INTENT_VERSION = "gymtracka-create-intent-v1";

export const INT64_MAX = "9223372036854775807";
export const INT64_MAX_PLUS_ONE = "9223372036854775808";
export const TWO_POW_53_MINUS_ONE = "9007199254740991";
export const TWO_POW_53 = "9007199254740992";
export const TWO_POW_53_PLUS_ONE = "9007199254740993";

const cp = (...points) => String.fromCodePoint(...points);

// Blank per approved spec section 3: empty plus each listed blank code point
// (and mixes). Built from code points so review never depends on glyphs.
export const BLANK_NAMES = Object.freeze([
  "",
  cp(0x0020),
  cp(0x00a0),
  cp(0x1680),
  cp(0x2003),
  cp(0x2028),
  cp(0x2029),
  cp(0x3000),
  cp(0x0009, 0x000a, 0x000d),
  cp(0x001c, 0x001f),
  cp(0x2000, 0x200a),
  cp(0x202f, 0x205f),
  cp(0x0020, 0x00a0, 0x2003),
]);

// U+0085, U+180E, U+200B and U+FEFF are NOT in the blank set: each alone (or
// with a visible character) is nonblank per spec and must be preserved.
export const NONBLANK_EDGE_NAMES = Object.freeze([
  cp(0x0085),
  cp(0x180e),
  cp(0x200b),
  cp(0xfeff),
  "a",
  "Upper Body A",
  `a${cp(0x200b)}`,
]);

// projectRevision clarification: the parameter is raw numeric token TEXT.
// "40" means the numeric token 40; token text containing JSON quotes rejects.
export const VALID_REVISION_TOKENS = Object.freeze([
  ["1", "1"],
  ["40", "40"],
  ["9007199254740991", "9007199254740991"],
  ["9007199254740993", "9007199254740993"],
  ["9223372036854775807", "9223372036854775807"],
  ["40.0", "40"],
  ["4e1", "40"],
  ["4E1", "40"],
  ["40e0", "40"],
  ["1.00e3", "1000"],
  ["4.5e1", "45"],
  ["4e01", "40"],
  ["40e00", "40"],
  ["1E3", "1000"],
  ["1e0000000", "1"],
  ["300e-1", "30"],
]);

export const INVALID_REVISION_TOKENS = Object.freeze([
  "",
  " ",
  " 40",
  "40 ",
  "+40",
  "01",
  "00",
  "-1",
  "-0",
  "0x28",
  "NaN",
  "Infinity",
  "-Infinity",
  "null",
  '"40"',
  "'40'",
  "4.05e1",
  "40.5",
  "1e-1",
  "9223372036854775808",
  "99999999999999999999",
  "1e100",
  "--1",
  "0",
  "0.0",
  "0e0",
  "0e-1",
  "-0.0",
  "4e",
  "e10",
  ".5",
  "5.",
]);

// Minimal valid creation arguments (synthetic IDs only).
export function validCreateInput(overrides = {}) {
  return {
    name: "Upper Body A",
    exercises: [
      {
        exerciseId: SYNTHETIC_UUIDS.exerciseA,
        restDurationSeconds: 90,
        sets: [
          { repetitions: 8, weightKg: 40 },
          { repetitions: 8, weightKg: 40 },
        ],
      },
    ],
    ...overrides,
  };
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
