/**
 * Strict tool-argument schemas and runtime validation. Pinned Zod 4.5.4 is the
 * single source of truth for input runtime validation; JSON Schemas published
 * in toolSchemas are generated from these Zod schemas with one documented
 * mechanical adjustment (defaulted properties are input-optional, so they are
 * removed from the generated `required` list which describes output-side
 * presence). Runtime refinements that JSON Schema cannot express (Unicode
 * nonblank names, weight finiteness) are enforced here and documented.
 */
import { z, type ZodType } from "zod";
import {
  DEFAULT_PAGE_LIMIT,
  DEFAULT_REST_DURATION_SECONDS,
  DEFAULT_SEARCH_TEXT,
  INT32_MAX,
  INT32_MIN,
  PAGE_LIMIT_MAX,
  PAGE_LIMIT_MIN,
  TOOL_NAMES,
  UUID_PATTERN,
  type ToolName,
} from "./constants.js";
import { deepDetached, sanitizeJsonValue } from "./clone.js";
import { CodecError } from "./errors.js";
import { canonicalizeZero, isNonBlankName } from "./scalars.js";

function invalidArguments(): CodecError {
  return new CodecError("invalid_arguments", "Invalid tool arguments.");
}

const uuidField = z.string().regex(UUID_PATTERN);
const int32Field = z.number().int().min(INT32_MIN).max(INT32_MAX);
const nullableInt32Field = z.number().int().min(INT32_MIN).max(INT32_MAX).nullable();
const nullableWeightField = z
  .number()
  .min(0)
  .max(Number.MAX_VALUE)
  .refine((value) => Number.isFinite(value), "Invalid weight.")
  .nullable();
const nonBlankNameField = z
  .string()
  .min(1)
  .refine((value) => isNonBlankName(value), "Invalid name.");

const limitField = z
  .number()
  .int()
  .min(PAGE_LIMIT_MIN)
  .max(PAGE_LIMIT_MAX)
  .optional()
  .default(DEFAULT_PAGE_LIMIT);
const pageTokenField = z.string().min(1).optional();
const searchField = z.string().optional().default(DEFAULT_SEARCH_TEXT);
const idArrayField = z.array(uuidField).optional().default([]);

const searchExercisesSchema = z.strictObject({
  search: searchField,
  muscleGroupIds: idArrayField,
  equipmentIds: idArrayField,
  limit: limitField,
  pageToken: pageTokenField,
});

const listWorkoutsSchema = z.strictObject({
  status: z.enum(["active", "finished"]).optional(),
  limit: limitField,
  pageToken: pageTokenField,
});

const listRoutinesSchema = z.strictObject({
  limit: limitField,
  pageToken: pageTokenField,
});

const getExerciseSchema = z.strictObject({ exerciseId: uuidField });
const getWorkoutSchema = z.strictObject({ workoutId: uuidField });
const getRoutineSchema = z.strictObject({ routineId: uuidField });

const createSetParseSchema = z.strictObject({
  repetitions: nullableInt32Field.optional(),
  weightKg: nullableWeightField.optional(),
});

const createEntryParseSchema = z.strictObject({
  exerciseId: uuidField,
  restDurationSeconds: int32Field.optional(),
  sets: z.array(createSetParseSchema),
});

const createRootParseSchema = z.strictObject({
  name: nonBlankNameField,
  exercises: z.array(createEntryParseSchema).min(1),
});

const createSetNormalizeSchema = z.strictObject({
  repetitions: nullableInt32Field.optional().default(null),
  weightKg: nullableWeightField.optional().default(null),
});

const createEntryNormalizeSchema = z.strictObject({
  exerciseId: uuidField,
  restDurationSeconds: int32Field.optional().default(DEFAULT_REST_DURATION_SECONDS),
  sets: z.array(createSetNormalizeSchema),
});

const createRootNormalizeSchema = z.strictObject({
  name: nonBlankNameField,
  exercises: z.array(createEntryNormalizeSchema).min(1),
});

type CreateNormalized = z.output<typeof createRootNormalizeSchema>;

export interface NormalizedIntentSet {
  readonly repetitions: number | null;
  readonly weightKg: number | null;
}

export interface NormalizedIntentEntry {
  readonly exerciseId: string;
  readonly restDurationSeconds: number;
  readonly sets: readonly NormalizedIntentSet[];
}

export interface NormalizedIntent {
  readonly name: string;
  readonly exercises: readonly NormalizedIntentEntry[];
}

export interface IntentIdentityMaterial {
  readonly version: "gymtracka-create-intent-v1";
  readonly canonicalJson: string;
}

/** Concrete readonly shapes for strictly parsed per-tool arguments. */
export interface ParsedSearchExercisesArgs {
  readonly search: string;
  readonly muscleGroupIds: readonly string[];
  readonly equipmentIds: readonly string[];
  readonly limit: number;
  readonly pageToken?: string;
}

export interface ParsedListWorkoutsArgs {
  readonly status?: "active" | "finished";
  readonly limit: number;
  readonly pageToken?: string;
}

export interface ParsedListRoutinesArgs {
  readonly limit: number;
  readonly pageToken?: string;
}

export interface ParsedGetExerciseArgs {
  readonly exerciseId: string;
}

export interface ParsedGetWorkoutArgs {
  readonly workoutId: string;
}

export interface ParsedGetRoutineArgs {
  readonly routineId: string;
}

export interface ParsedCreateSet {
  readonly repetitions?: number | null;
  readonly weightKg?: number | null;
}

export interface ParsedCreateEntry {
  readonly exerciseId: string;
  readonly restDurationSeconds?: number;
  readonly sets: readonly ParsedCreateSet[];
}

export interface ParsedCreateRoutineArgs {
  readonly name: string;
  readonly exercises: readonly ParsedCreateEntry[];
}

/** Union of all strictly parsed per-tool argument shapes. */
export type ParsedArguments =
  | ParsedSearchExercisesArgs
  | ParsedListWorkoutsArgs
  | ParsedListRoutinesArgs
  | ParsedGetExerciseArgs
  | ParsedGetWorkoutArgs
  | ParsedGetRoutineArgs
  | ParsedCreateRoutineArgs;

function isToolName(value: unknown): value is ToolName {
  return typeof value === "string" && (TOOL_NAMES as readonly string[]).includes(value);
}

function requireRecord(input: unknown): void {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalidArguments();
  }
}

/**
 * Strict validated detached arguments. Read defaults are expanded
 * (limit=20, search="", filter arrays=[]); optional status/pageToken omission
 * is preserved. Create arguments are validated without default expansion; use
 * normalizeIntent for creation defaults. Unknown tool names fail locally.
 */
export function parseArguments(
  toolName: "search_exercises",
  input: unknown,
): ParsedSearchExercisesArgs;
export function parseArguments(toolName: "list_workouts", input: unknown): ParsedListWorkoutsArgs;
export function parseArguments(toolName: "list_routines", input: unknown): ParsedListRoutinesArgs;
export function parseArguments(toolName: "get_exercise", input: unknown): ParsedGetExerciseArgs;
export function parseArguments(toolName: "get_workout", input: unknown): ParsedGetWorkoutArgs;
export function parseArguments(toolName: "get_routine", input: unknown): ParsedGetRoutineArgs;
export function parseArguments(toolName: "create_routine", input: unknown): ParsedCreateRoutineArgs;
export function parseArguments(toolName: ToolName, input: unknown): ParsedArguments;
export function parseArguments(toolName: string, input: unknown): ParsedArguments;
export function parseArguments(toolName: string, input: unknown): unknown {
  input = sanitizeJsonValue(input, "invalid_arguments");
  if (!isToolName(toolName)) {
    throw invalidArguments();
  }
  requireRecord(input);
  switch (toolName) {
    case "search_exercises": {
      const parsed = searchExercisesSchema.safeParse(input);
      if (!parsed.success) {
        throw invalidArguments();
      }
      return deepDetached(parsed.data);
    }
    case "list_workouts": {
      const parsed = listWorkoutsSchema.safeParse(input);
      if (!parsed.success) {
        throw invalidArguments();
      }
      return deepDetached(parsed.data);
    }
    case "list_routines": {
      const parsed = listRoutinesSchema.safeParse(input);
      if (!parsed.success) {
        throw invalidArguments();
      }
      return deepDetached(parsed.data);
    }
    case "get_exercise": {
      const parsed = getExerciseSchema.safeParse(input);
      if (!parsed.success) {
        throw invalidArguments();
      }
      return deepDetached(parsed.data);
    }
    case "get_workout": {
      const parsed = getWorkoutSchema.safeParse(input);
      if (!parsed.success) {
        throw invalidArguments();
      }
      return deepDetached(parsed.data);
    }
    case "get_routine": {
      const parsed = getRoutineSchema.safeParse(input);
      if (!parsed.success) {
        throw invalidArguments();
      }
      return deepDetached(parsed.data);
    }
    case "create_routine": {
      const parsed = createRootParseSchema.safeParse(input);
      if (!parsed.success) {
        throw invalidArguments();
      }
      return deepDetached(parsed.data);
    }
  }
}

function normalizeSet(
  set: CreateNormalized["exercises"][number]["sets"][number],
): NormalizedIntentSet {
  return {
    repetitions:
      set.repetitions === null || set.repetitions === undefined
        ? null
        : canonicalizeZero(set.repetitions),
    weightKg:
      set.weightKg === null || set.weightKg === undefined ? null : canonicalizeZero(set.weightKg),
  };
}

/**
 * Validate complete create_routine arguments and return exactly
 * {name, exercises} with defaults expanded (rest 30, repetitions/weight null).
 * Accepted -0 values canonicalize to
 * +0. Names, array order, repeated references, null and zero are preserved.
 */
export function normalizeIntent(input: unknown): NormalizedIntent {
  input = sanitizeJsonValue(input, "invalid_arguments");
  requireRecord(input);
  const parsed = createRootNormalizeSchema.safeParse(input);
  if (!parsed.success) {
    throw invalidArguments();
  }
  const exercises: NormalizedIntentEntry[] = parsed.data.exercises.map((entry) => ({
    exerciseId: entry.exerciseId,
    restDurationSeconds: canonicalizeZero(entry.restDurationSeconds),
    sets: entry.sets.map((set) => normalizeSet(set)),
  }));
  return { name: parsed.data.name, exercises };
}

/**
 * Versioned deterministic identity material for keyed digests. canonicalJson
 * is JSON.stringify of normalizeIntent with fixed property order; downstream
 * keyed digest input must use UTF-8 encoding of this string. No hash keys are
 * provisioned and no admission happens here.
 */
export function intentIdentityMaterial(input: unknown): IntentIdentityMaterial {
  const intent = normalizeIntent(input);
  return {
    version: "gymtracka-create-intent-v1",
    canonicalJson: JSON.stringify(intent),
  };
}

/**
 * Generate the published input JSON Schema for a tool from its Zod source.
 * Defaulted properties document normalization but stay input-optional, so
 * they are removed from the generated output-side `required` lists at every
 * nesting level (properties, items and combiners).
 */
export function buildInputJsonSchema(toolName: ToolName): Record<string, unknown> {
  let schema: ZodType;
  switch (toolName) {
    case "search_exercises":
      schema = searchExercisesSchema;
      break;
    case "list_workouts":
      schema = listWorkoutsSchema;
      break;
    case "list_routines":
      schema = listRoutinesSchema;
      break;
    case "get_exercise":
      schema = getExerciseSchema;
      break;
    case "get_workout":
      schema = getWorkoutSchema;
      break;
    case "get_routine":
      schema = getRoutineSchema;
      break;
    case "create_routine":
      schema = createRootNormalizeSchema;
      break;
  }
  const generated = z.toJSONSchema(schema) as Record<string, unknown>;
  relaxRequired(generated);
  return { ...generated };
}

/** Recursively drop defaulted properties from `required` lists in place. */
function relaxRequired(node: unknown): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      relaxRequired(item);
    }
    return;
  }
  if (typeof node !== "object" || node === null) {
    return;
  }
  const record = node as Record<string, unknown>;
  const properties = record["properties"];
  const required = record["required"];
  if (typeof properties === "object" && properties !== null && Array.isArray(required)) {
    const props = properties as Record<string, unknown>;
    record["required"] = required.filter((key) => {
      if (typeof key !== "string") {
        return true;
      }
      const prop = props[key];
      if (typeof prop !== "object" || prop === null) {
        return true;
      }
      return !("default" in (prop as Record<string, unknown>));
    });
  }
  for (const key of ["properties", "$defs"] as const) {
    const group = record[key];
    if (typeof group === "object" && group !== null) {
      for (const prop of Object.values(group as Record<string, unknown>)) {
        relaxRequired(prop);
      }
    }
  }
  for (const key of ["items", "additionalProperties"] as const) {
    if (record[key] !== undefined) {
      relaxRequired(record[key]);
    }
  }
  for (const key of ["anyOf", "oneOf", "allOf", "prefixItems"] as const) {
    const value = record[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        relaxRequired(item);
      }
    }
  }
}
