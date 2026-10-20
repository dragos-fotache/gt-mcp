/**
 * T03 portable domain entry: strict schemas, intent normalization, lossless
 * codecs and result envelopes. Importing this module is effect-free: it
 * performs no IO, output, timers, processes, network, state loads or global
 * handler registration; it only builds pure validation/projection primitives.
 */
export { TOOL_NAMES, INTENT_IDENTITY_VERSION } from "./constants.js";
export type { ToolName, ReadToolName } from "./constants.js";
export { CodecError } from "./errors.js";
export type { CodecErrorCode } from "./errors.js";
export { parseArguments, normalizeIntent, intentIdentityMaterial } from "./inputs.js";
export type {
  NormalizedIntent,
  NormalizedIntentEntry,
  NormalizedIntentSet,
  IntentIdentityMaterial,
  ParsedSearchExercisesArgs,
  ParsedListWorkoutsArgs,
  ParsedListRoutinesArgs,
  ParsedGetExerciseArgs,
  ParsedGetWorkoutArgs,
  ParsedGetRoutineArgs,
  ParsedCreateSet,
  ParsedCreateEntry,
  ParsedCreateRoutineArgs,
  ParsedArguments,
} from "./inputs.js";
export { projectRevision } from "./revision.js";
export { decodeBackendResponse } from "./decode.js";
export { buildRoutineInput } from "./routineInput.js";
export type { RoutineInput, RoutineInputEntry, RoutineInputSet } from "./routineInput.js";
export { makeToolResult } from "./result.js";
export type {
  ToolResult,
  ToolResultContent,
  ToolResultEnvelope,
  ToolErrorObject,
} from "./result.js";
export type {
  ProjectedData,
  DecodedReadData,
  SavedRoutineResult,
  ExerciseRecord,
  MuscleRef,
  EquipmentRef,
  WorkoutSummaryRecord,
  WorkoutSetRecord,
  WorkoutEntryRecord,
  WorkoutRecord,
  RoutineSetRecord,
  RoutineEntryRecord,
  RoutineRecord,
  SearchExercisesPage,
  WorkoutListPage,
  RoutineListPage,
} from "./projected.js";
export { toolSchemas } from "./schemas.js";
export type { ToolSchemas } from "./schemas.js";
