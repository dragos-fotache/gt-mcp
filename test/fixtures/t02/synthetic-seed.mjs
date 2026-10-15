// T02 QA labeled synthetic fixtures (Stage 2, t02-approved-experiment-spec §§4-5).
//
// SYNTHETIC PROVENANCE: every value below is fabricated for black-box QA use
// only, derived solely from the coordinator-approved experiment spec. UUIDs use
// canonical syntax because they exercise valid-input paths; they are synthetic
// because they are listed here, never because of a prefix. The published seed
// below mirrors spec §5 so QA can independently recompute the canonical intent
// digest without reading any experiment source. data.synthetic appears ONLY in
// fixture envelopes per the spec; no product schema expansion is implied.

import { createHash } from "node:crypto";

export const SYNTHETIC_LABEL = "synthetic-qa-t02-pipeline";

// Published synthetic seed (spec §5). Rest is omitted to exercise the
// restDurationSeconds=30 default; the bare {} set exercises null defaults.
export const SEED = Object.freeze({
  operationId: "55555555-5555-4555-8555-555555555555",
  exerciseId: "11111111-1111-4111-8111-111111111111",
  name: "SYNTHETIC T02 Routine",
  input: Object.freeze({
    operationId: "55555555-5555-4555-8555-555555555555",
    name: "SYNTHETIC T02 Routine",
    exercises: Object.freeze([
      Object.freeze({
        exerciseId: "11111111-1111-4111-8111-111111111111",
        sets: Object.freeze([
          Object.freeze({ repetitions: 0, weightKg: 0 }),
          Object.freeze({}),
        ]),
      }),
    ]),
  }),
});

// Canonical intent digest, implemented independently from spec §5 only:
// preserve name/Unicode/case/array order/repeated references/zero/null;
// insert only restDurationSeconds=30, repetitions=null, weightKg=null;
// recursively sort object keys (never arrays); UTF-8 JSON; SHA256.
// Throws on unknown properties, coercion-prone values, or invalid types so a
// malformed QA-side input fails loudly instead of producing a guess digest.
export function canonicalDigest(input) {
  const normalized = normalizeCreationInput(input);
  const bytes = Buffer.from(JSON.stringify(sortKeys(normalized)), "utf8");
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizeCreationInput(input) {
  assertPlainObject(input, "input");
  const allowedRoot = new Set(["operationId", "name", "exercises"]);
  rejectUnknown(input, allowedRoot, "input");
  assertUuid(input.operationId, "operationId");
  assertString(input.name, "name");
  if (!Array.isArray(input.exercises) || input.exercises.length < 1) {
    throw new Error("canonicalDigest: exercises must be a non-empty array");
  }
  return {
    operationId: input.operationId,
    name: input.name,
    exercises: input.exercises.map(normalizeEntry),
  };
}

function normalizeEntry(entry) {
  assertPlainObject(entry, "exercise entry");
  const allowed = new Set(["exerciseId", "restDurationSeconds", "sets"]);
  rejectUnknown(entry, allowed, "exercise entry");
  assertUuid(entry.exerciseId, "exerciseId");
  const rest =
    entry.restDurationSeconds === undefined ? 30 : entry.restDurationSeconds;
  assertInt32(rest, "restDurationSeconds");
  if (!Array.isArray(entry.sets)) {
    throw new Error("canonicalDigest: sets must be an array");
  }
  return {
    exerciseId: entry.exerciseId,
    restDurationSeconds: rest,
    sets: entry.sets.map(normalizeSet),
  };
}

function normalizeSet(set) {
  assertPlainObject(set, "set");
  const allowed = new Set(["repetitions", "weightKg"]);
  rejectUnknown(set, allowed, "set");
  const repetitions = set.repetitions === undefined ? null : set.repetitions;
  const weightKg = set.weightKg === undefined ? null : set.weightKg;
  if (repetitions !== null) assertInt32(repetitions, "repetitions");
  if (weightKg !== null) assertWeight(weightKg, "weightKg");
  return { repetitions, weightKg };
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeys(value[key]);
    return out;
  }
  return value;
}

function assertPlainObject(value, what) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`canonicalDigest: ${what} must be a plain object`);
  }
}

function rejectUnknown(obj, allowed, what) {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      throw new Error(`canonicalDigest: unknown ${what} property ${key}`);
    }
  }
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function assertUuid(value, what) {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new Error(`canonicalDigest: ${what} must be a canonical UUID`);
  }
}

function assertString(value, what) {
  if (typeof value !== "string") {
    throw new Error(`canonicalDigest: ${what} must be a string`);
  }
}

function assertInt32(value, what) {
  if (!Number.isInteger(value) || value < 0 || value > 2147483647) {
    throw new Error(`canonicalDigest: ${what} must be an Int32`);
  }
}

function assertWeight(value, what) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1.7976931348623157e308
  ) {
    throw new Error(`canonicalDigest: ${what} must be a finite weight`);
  }
}

// Lazy so a broken seed fails at assertion time with context, not at import.
export function seedDigest() {
  return canonicalDigest(SEED.input);
}

// Fixed public calibration vector (spec §5). The helper must reproduce this
// exact SHA, not merely agree with itself.
export const EXPECTED_SEED_SHA =
  "71a6d7acdeb769821f1b6231f206853c8e9423fec5989a68312b06fa8e6cd456";

// Finite scenario registry (spec §7). The driver accepts no other scenario;
// the helper refuses anything not listed here.
export const SCENARIOS = Object.freeze({
  ptyApprove: [
    "direct-approve",
    "deferred-approve",
    "codemode-approve",
    "nested-approve",
  ],
  ptyReject: [
    "direct-reject",
    "deferred-reject",
    "codemode-reject",
    "nested-reject",
  ],
  sdkReadonly: [
    "direct-readonly",
    "deferred-readonly",
    "codemode-readonly",
    "nested-readonly",
  ],
  registration: [
    "no-companion",
    "generic-readonly",
    "static-shadow",
    "normalized-collision",
    "normalized-collision-reversed",
    "replacement-mcp",
    "replacement-codemode",
    "missing-mcp",
    "unsupported-inventory",
    "hidden-tool",
  ],
  modes: ["mode-print", "mode-json", "mode-rpc-has-ui", "no-ui"],
  gateFailure: [
    "handler-failure",
    "approval-dismiss",
    "approval-cancel",
    "approval-timeout",
  ],
  integrity: [
    "mutator-boundary",
    "sidecar-unavailable",
    "sidecar-malformed",
    "sidecar-stale",
  ],
  lifecycle: [
    "binding-missing",
    "binding-ambiguous",
    "binding-invalidate",
    "reload-invalidate",
    "shutdown-invalidate",
  ],
  calibration: ["calibration-unguarded", "calibration-mutation"],
});

export const ALL_SCENARIOS = Object.freeze(
  Object.values(SCENARIOS).flat(),
);

// Refusal codes published by spec §5.
export const REFUSAL = Object.freeze({
  needsApproval: "write_approval_required",
  invalidArgs: "invalid_arguments",
  integrityMismatch: "input_integrity_mismatch",
  bindingUnavailable: "binding_unavailable",
});

// Seven fixture tool names; creation is the single gated write analogue.
export const FIXTURE_TOOLS = Object.freeze([
  "search_exercises",
  "get_exercise",
  "list_workouts",
  "get_workout",
  "list_routines",
  "get_routine",
  "create_routine",
]);
