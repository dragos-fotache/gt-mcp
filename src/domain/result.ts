/**
 * Tool-result envelope validation. Validates a projected envelope
 * ({ok:true,data} or {ok:false,error} with exact roots) including known
 * runtime record invariants, and returns detached
 * {structuredContent, content, isError} where content is exactly one text
 * block serializing the structured content. Failures throw
 * invalid_tool_result. No HTTP mapping or auth/admission decisions happen here.
 *
 * JSON compatibility is enforced before validation: unknown additive values
 * cannot carry undefined, functions, symbols, BigInts, non-finite numbers,
 * accessor properties, symbol keys, cycles or toJSON behaviors that would
 * silently disappear, coerce, change or execute user callbacks during
 * serialization. Anything unusable is rejected with invalid_tool_result.
 */
import { TOOL_NAMES, type ToolName } from "./constants.js";
import { getOwn, sanitizeJsonValue } from "./clone.js";
import { CodecError } from "./errors.js";
import {
  validateErrorObject,
  validateProjectedExercise,
  validateProjectedPageToken,
  validateProjectedRoutine,
  validateProjectedWorkout,
  validateProjectedWorkoutSummary,
  validateSavedRoutineResult,
  type ProjectedData,
} from "./projected.js";

const RESULT = "invalid_tool_result" as const;

function fail(message: string): never {
  throw new CodecError(RESULT, message);
}

function isToolName(value: unknown): value is ToolName {
  return typeof value === "string" && (TOOL_NAMES as readonly string[]).includes(value);
}

export interface ToolResultContent {
  readonly type: "text";
  readonly text: string;
}

export interface ToolErrorObject {
  readonly code: string;
  readonly retryable: boolean;
  readonly message?: string;
  readonly backendErrorCode?: string;
  readonly retryAfterSeconds?: number;
  readonly routineId?: string;
  readonly lastConfirmedStep?: "none" | "draft" | "populate" | "save";
  readonly outcomeUnknown?: boolean;
}

export type ToolResultEnvelope =
  | { readonly ok: true; readonly data: ProjectedData }
  | { readonly ok: false; readonly error: ToolErrorObject };

export interface ToolResult {
  readonly structuredContent: ToolResultEnvelope;
  readonly content: readonly [ToolResultContent];
  readonly isError: boolean;
}

/** Plain-object check for the sanitized envelope root. */
function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail("Invalid tool envelope.");
  }
  return value as Record<string, unknown>;
}

function validateDataPage(
  data: Record<string, unknown>,
  withCatalogueVersion: boolean,
  validateItem: (item: unknown) => void,
): void {
  if (withCatalogueVersion && typeof getOwn(data, "catalogueVersion") !== "string") {
    fail("Invalid result page.");
  }
  const items = getOwn(data, "items");
  if (!Array.isArray(items)) {
    fail("Invalid result page.");
  }
  for (const item of items as unknown[]) {
    validateItem(item);
  }
  validateProjectedPageToken(data, RESULT);
}

function validateData(toolName: ToolName, data: unknown): void {
  switch (toolName) {
    case "search_exercises":
      validateDataPage(asRecord(data), true, (item) => validateProjectedExercise(item, RESULT));
      return;
    case "get_exercise":
      validateProjectedExercise(data, RESULT);
      return;
    case "list_workouts":
      validateDataPage(asRecord(data), false, (item) =>
        validateProjectedWorkoutSummary(item, RESULT),
      );
      return;
    case "get_workout":
      validateProjectedWorkout(data, RESULT);
      return;
    case "list_routines": {
      const record = asRecord(data);
      validateDataPage(record, false, (item) => validateProjectedRoutine(item, RESULT));
      const items = getOwn(record, "items");
      for (const item of items as unknown[]) {
        if (getOwn(item as Record<string, unknown>, "isDraft") !== false) {
          fail("Invalid routine list item.");
        }
      }
      return;
    }
    case "get_routine":
      validateProjectedRoutine(data, RESULT);
      return;
    case "create_routine":
      validateSavedRoutineResult(data, RESULT);
      return;
  }
}

/**
 * Validate a projected tool envelope and return the detached MCP result
 * triple. isError equals !structuredContent.ok. The envelope must already be
 * JSON-compatible; projected pages must carry an explicit nextPageToken.
 */
export function makeToolResult(toolName: string, envelope: unknown): ToolResult {
  if (!isToolName(toolName)) {
    fail("Unknown tool.");
  }
  const record = asRecord(sanitizeJsonValue(envelope, RESULT));
  const keys = Object.keys(record);
  const ok = getOwn(record, "ok");
  if (ok === true) {
    if (keys.length !== 2 || !hasOwn(record, "data")) {
      fail("Invalid tool envelope.");
    }
    validateData(toolName, getOwn(record, "data"));
  } else if (ok === false) {
    if (keys.length !== 2 || !hasOwn(record, "error")) {
      fail("Invalid tool envelope.");
    }
    const error = getOwn(record, "error");
    validateErrorObject(error, RESULT);
    if (toolName === "create_routine") {
      const creationError = error as ToolErrorObject;
      if (creationError.retryable !== false)
        fail("Creation cannot resume through a new tool call.");
      const context = [
        creationError.routineId,
        creationError.lastConfirmedStep,
        creationError.outcomeUnknown,
      ];
      if (
        context.some((value) => value !== undefined) &&
        context.some((value) => value === undefined)
      )
        fail("Invalid creation context.");
    }
  } else {
    fail("Invalid tool envelope.");
  }
  const structuredContent = record as unknown as ToolResultEnvelope;
  const text = JSON.stringify(structuredContent);
  return {
    structuredContent,
    content: [{ type: "text", text }],
    isError: (getOwn(record, "ok") as boolean) !== true,
  };
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}
