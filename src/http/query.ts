/**
 * T05 read-query handling: T03 parseArguments validation/defaults, backend
 * normalization (toLowerCase, sorted/deduplicated UUID filters), and exact
 * OpenAPI serialization via ordered URLSearchParams with "+" -> "%20".
 */

import {
  parseArguments,
  type ParsedListRoutinesArgs,
  type ParsedListWorkoutsArgs,
  type ParsedSearchExercisesArgs,
} from "../domain/index.js";
import { fail } from "./validate.js";

export interface BuiltTarget {
  readonly target: string;
  readonly pageToken: string | null;
}

function sortedUnique(values: ReadonlyArray<string>): Array<string> {
  const copy = [...values].sort();
  const out: Array<string> = [];
  for (const value of copy) {
    if (out.length === 0 || out[out.length - 1] !== value) {
      out.push(value);
    }
  }
  return out;
}

function encodePairs(pairs: ReadonlyArray<readonly [string, string]>): string {
  const params = new URLSearchParams();
  for (const pair of pairs) {
    params.append(pair[0], pair[1]);
  }
  return params.toString().replace(/\+/g, "%20");
}

function parseListArgs(
  tool: "search_exercises" | "list_workouts" | "list_routines",
  queryInput: unknown,
): ParsedSearchExercisesArgs | ParsedListWorkoutsArgs | ParsedListRoutinesArgs {
  let parsed: unknown;
  try {
    parsed = parseArguments(tool, queryInput);
  } catch {
    fail();
  }
  return parsed as ParsedSearchExercisesArgs | ParsedListWorkoutsArgs | ParsedListRoutinesArgs;
}

export function buildSearchTarget(queryInput: unknown): BuiltTarget {
  const parsed = parseListArgs("search_exercises", queryInput) as ParsedSearchExercisesArgs;
  const pairs: Array<readonly [string, string]> = [];
  const lowered = parsed.search.toLowerCase();
  if (lowered !== "") {
    pairs.push(["q", lowered]);
  }
  for (const id of sortedUnique(parsed.muscleGroupIds)) {
    pairs.push(["muscleGroupId", id]);
  }
  for (const id of sortedUnique(parsed.equipmentIds)) {
    pairs.push(["equipmentId", id]);
  }
  pairs.push(["limit", String(parsed.limit)]);
  if (parsed.pageToken !== undefined) {
    pairs.push(["pageToken", parsed.pageToken]);
  }
  const query = encodePairs(pairs);
  return {
    target: `/v1/catalogue/exercises?${query}`,
    pageToken: parsed.pageToken ?? null,
  };
}

export function buildListWorkoutsTarget(queryInput: unknown): BuiltTarget {
  const parsed = parseListArgs("list_workouts", queryInput) as ParsedListWorkoutsArgs;
  const pairs: Array<readonly [string, string]> = [];
  if (parsed.status !== undefined) {
    pairs.push(["status", parsed.status]);
  }
  pairs.push(["limit", String(parsed.limit)]);
  if (parsed.pageToken !== undefined) {
    pairs.push(["pageToken", parsed.pageToken]);
  }
  const query = encodePairs(pairs);
  return {
    target: `/v1/workouts?${query}`,
    pageToken: parsed.pageToken ?? null,
  };
}

export function buildListRoutinesTarget(queryInput: unknown): BuiltTarget {
  const parsed = parseListArgs("list_routines", queryInput) as ParsedListRoutinesArgs;
  const pairs: Array<readonly [string, string]> = [];
  pairs.push(["limit", String(parsed.limit)]);
  if (parsed.pageToken !== undefined) {
    pairs.push(["pageToken", parsed.pageToken]);
  }
  const query = encodePairs(pairs);
  return {
    target: `/v1/routines?${query}`,
    pageToken: parsed.pageToken ?? null,
  };
}
