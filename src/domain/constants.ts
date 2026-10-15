/**
 * T03 frozen public constants. Tool order matches tools.md first-release
 * catalogue table order; the approved spec pins this exact readonly order.
 */

export const TOOL_NAMES = [
  "search_exercises",
  "get_exercise",
  "list_workouts",
  "get_workout",
  "list_routines",
  "get_routine",
  "create_routine",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export const READ_TOOL_NAMES = [
  "search_exercises",
  "get_exercise",
  "list_workouts",
  "get_workout",
  "list_routines",
  "get_routine",
] as const;

export type ReadToolName = (typeof READ_TOOL_NAMES)[number];

/** Version domain for creation-intent identity material (keyed-digest input). */
export const INTENT_IDENTITY_VERSION = "gymtracka-create-intent-v1";

/** Exact decimal text of the maximum positive Int64 revision. */
export const INT64_MAX_TEXT = "9223372036854775807";

/**
 * Backend UUID syntax from tools.md (lowercase hyphenated; no version check).
 * The absolute end uses a negative lookahead instead of `$` alone because
 * JavaScript `$` can match before a trailing line terminator.
 */
export const UUID_PATTERN_SOURCE =
  "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?![\\s\\S])";

export const UUID_PATTERN = new RegExp(UUID_PATTERN_SOURCE);

/** Creation-intent documented defaults. */
export const DEFAULT_PAGE_LIMIT = 20;
export const DEFAULT_SEARCH_TEXT = "";
export const DEFAULT_REST_DURATION_SECONDS = 30;

/** Int32 bounds shared by repetitions, positions and rest durations. */
export const INT32_MIN = 0;
export const INT32_MAX = 2147483647;

/** Page limit bounds. */
export const PAGE_LIMIT_MIN = 1;
export const PAGE_LIMIT_MAX = 200;
