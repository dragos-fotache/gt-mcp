/**
 * Backend success-data decoding for the six read tools. Parses raw wire JSON
 * losslessly (exact number tokens, mandatory duplicate-key rejection),
 * projects known revisions/integers/weights with exact checks, validates the
 * full projected record, and returns detached canonical data. Failures throw
 * invalid_backend_response and never fabricate confirmation. Unknown tool
 * names fail locally as invalid_arguments.
 */
import {
  convertExercise,
  convertRoutine,
  convertWorkout,
  convertWorkoutSummary,
} from "./convert.js";
import { READ_TOOL_NAMES } from "./constants.js";
import type { ReadToolName } from "./constants.js";
import { deepDetached, hasOwnKey, setOwn } from "./clone.js";
import { CodecError } from "./errors.js";
import { parseLosslessJson, toPlainJson } from "./lossless.js";
import { isUuid } from "./scalars.js";
import type {
  DecodedReadData,
  ExerciseRecord,
  RoutineListPage,
  RoutineRecord,
  SearchExercisesPage,
  WorkoutListPage,
  WorkoutRecord,
} from "./projected.js";

function failResponse(message: string): never {
  throw new CodecError("invalid_backend_response", message);
}

function isReadTool(value: string): value is (typeof READ_TOOL_NAMES)[number] {
  return (READ_TOOL_NAMES as readonly string[]).includes(value);
}

type RawRecord = { [key: string]: unknown };

function asRootRecord(value: unknown): RawRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    failResponse("Invalid backend response.");
  }
  return value as RawRecord;
}

function hasKey(record: RawRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function convertItems(
  value: unknown,
  convert: (item: unknown) => Record<string, unknown>,
): unknown[] {
  if (!Array.isArray(value)) {
    failResponse("Invalid backend page.");
  }
  return (value as unknown[]).map((item) => convert(item));
}

/** Page envelope with terminal-token normalization (omission becomes null). */
function convertPage(
  root: RawRecord,
  items: unknown[],
  withCatalogueVersion: boolean,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (withCatalogueVersion) {
    if (typeof root["catalogueVersion"] !== "string") {
      failResponse("Invalid catalogue version.");
    }
    out["catalogueVersion"] = root["catalogueVersion"] as string;
  }
  out["items"] = items;
  if (typeof root["hasMore"] !== "boolean") {
    failResponse("Invalid backend page.");
  }
  const hasMore = root["hasMore"] as boolean;
  out["hasMore"] = hasMore;
  let token: string | null = null;
  if (hasKey(root, "nextPageToken")) {
    const raw = root["nextPageToken"];
    if (raw !== null) {
      if (typeof raw !== "string" || (raw as string).length === 0) {
        failResponse("Invalid page token.");
      }
      token = raw as string;
    }
  }
  if (hasMore && token === null) {
    failResponse("Invalid page token.");
  }
  if (!hasMore && token !== null) {
    failResponse("Invalid page token.");
  }
  out["nextPageToken"] = token;
  for (const key of Object.keys(root)) {
    if (!hasOwnKey(out, key)) {
      setOwn(out, key, toPlainJson(root[key]));
    }
  }
  return out;
}

/**
 * Parse and validate backend SUCCESS DATA for a read tool (not an HTTP/MCP
 * envelope). Get tools accept an optional canonical expectedId that must
 * match the root id; expectedId on a list/search is invalid. Wire numeric
 * revisions become exact decimal strings; wire string revisions are invalid.
 */
export function decodeBackendResponse(
  readToolName: "search_exercises",
  rawJson: string,
  expectedId?: undefined,
): SearchExercisesPage;
export function decodeBackendResponse(
  readToolName: "get_exercise",
  rawJson: string,
  expectedId?: string,
): ExerciseRecord;
export function decodeBackendResponse(
  readToolName: "list_workouts",
  rawJson: string,
  expectedId?: undefined,
): WorkoutListPage;
export function decodeBackendResponse(
  readToolName: "get_workout",
  rawJson: string,
  expectedId?: string,
): WorkoutRecord;
export function decodeBackendResponse(
  readToolName: "list_routines",
  rawJson: string,
  expectedId?: undefined,
): RoutineListPage;
export function decodeBackendResponse(
  readToolName: "get_routine",
  rawJson: string,
  expectedId?: string,
): RoutineRecord;
export function decodeBackendResponse(
  readToolName: ReadToolName,
  rawJson: string,
  expectedId?: string,
): DecodedReadData;
export function decodeBackendResponse(
  readToolName: string,
  rawJson: string,
  expectedId?: string,
): DecodedReadData;
export function decodeBackendResponse(
  readToolName: string,
  rawJson: string,
  expectedId?: string,
): unknown {
  if (!isReadTool(readToolName)) {
    failResponse("Unknown read tool.");
  }
  const parsed = parseLosslessJson(rawJson);
  const root = asRootRecord(parsed);
  const wantsId = expectedId !== undefined;
  switch (readToolName) {
    case "search_exercises": {
      if (wantsId) {
        failResponse("Unexpected expectedId for a page.");
      }
      const items = convertItems(root["items"], convertExercise);
      return deepDetached(convertPage(root, items, true));
    }
    case "get_exercise": {
      const record = convertExercise(root);
      checkExpectedId(record, expectedId);
      return deepDetached(record);
    }
    case "list_workouts": {
      if (wantsId) {
        failResponse("Unexpected expectedId for a page.");
      }
      const items = convertItems(root["items"], convertWorkoutSummary);
      return deepDetached(convertPage(root, items, false));
    }
    case "get_workout": {
      const record = convertWorkout(root);
      checkExpectedId(record, expectedId);
      return deepDetached(record);
    }
    case "list_routines": {
      if (wantsId) {
        failResponse("Unexpected expectedId for a page.");
      }
      const items = convertItems(root["items"], (item) => {
        const record = convertRoutine(item);
        if (record["isDraft"] !== false) {
          failResponse("Invalid routine list item.");
        }
        return record;
      });
      return deepDetached(convertPage(root, items, false));
    }
    case "get_routine": {
      const record = convertRoutine(root);
      checkExpectedId(record, expectedId);
      return deepDetached(record);
    }
  }
}

function checkExpectedId(record: Record<string, unknown>, expectedId: string | undefined): void {
  if (expectedId === undefined) {
    return;
  }
  if (!isUuid(expectedId)) {
    failResponse("Invalid expected identifier.");
  }
  if (record["id"] !== expectedId) {
    failResponse("Identifier mismatch.");
  }
}
