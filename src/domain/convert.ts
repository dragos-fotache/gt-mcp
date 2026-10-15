/**
 * Backend wire conversion: walk lossless-parsed success data, validate known
 * numeric positions with their exact original tokens, project revisions to
 * canonical decimal strings, canonicalize relationship ordering, preserve
 * additive convenience fields as plain JSON, and normalize terminal page
 * tokens. Every failure throws invalid_backend_response.
 */
import { isValidTimestamp } from "./datetime.js";
import { CodecError } from "./errors.js";
import { JsonNumber, toPlainJson } from "./lossless.js";
import { getOwn, hasOwnKey, setOwn } from "./clone.js";
import {
  validateProjectedExercise,
  validateProjectedRoutine,
  validateProjectedWorkout,
  validateProjectedWorkoutSummary,
} from "./projected.js";
import { evaluateJsonIntegerToken } from "./revision.js";
import { canonicalizeZero, isUuid } from "./scalars.js";

const RESPONSE = "invalid_backend_response" as const;

function fail(message: string): never {
  throw new CodecError(RESPONSE, message);
}

type RawRecord = { [key: string]: unknown };

function asRawRecord(value: unknown, message: string): RawRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(message);
  }
  return value as RawRecord;
}

function asRawArray(value: unknown, message: string): unknown[] {
  if (!Array.isArray(value)) {
    fail(message);
  }
  return value as unknown[];
}

function hasKey(record: RawRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

/** Exact integral token in 1..9223372036854775807 projected to decimal text. */
function convertRevision(value: unknown): string {
  if (!(value instanceof JsonNumber)) {
    fail("Invalid revision.");
  }
  const token = (value as JsonNumber).token;
  const evaluated = evaluateJsonIntegerToken(token);
  if (evaluated === null || evaluated < 1n || evaluated > 9223372036854775807n) {
    fail("Invalid revision.");
  }
  return (evaluated as bigint).toString(10);
}

/** Exact integral token in Int32 range projected to a plain number. */
function convertInt32(value: unknown): number {
  if (!(value instanceof JsonNumber)) {
    fail("Invalid integer field.");
  }
  const evaluated = evaluateJsonIntegerToken((value as JsonNumber).token);
  if (evaluated === null || evaluated < 0n || evaluated > 2147483647n) {
    fail("Invalid integer field.");
  }
  return Number(evaluated);
}

function convertNullableInt32(value: unknown): number | null {
  if (value === null) {
    return null;
  }
  return convertInt32(value);
}

/** Declared finite double weight (or null); no arbitrary-precision semantics. */
function convertWeight(value: unknown): number | null {
  if (value === null) {
    return null;
  }
  if (!(value instanceof JsonNumber)) {
    fail("Invalid weight field.");
  }
  const numeric = (value as JsonNumber).value;
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > Number.MAX_VALUE) {
    fail("Invalid weight field.");
  }
  return canonicalizeZero(numeric);
}

function convertUuid(value: unknown): string {
  if (!isUuid(value)) {
    fail("Invalid identifier.");
  }
  return value as string;
}

function convertString(value: unknown): string {
  if (typeof value !== "string") {
    fail("Invalid string field.");
  }
  return value as string;
}

function convertBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") {
    fail("Invalid boolean field.");
  }
  return value as boolean;
}

function convertTimestamp(value: unknown): string {
  if (!isValidTimestamp(value)) {
    fail("Invalid timestamp.");
  }
  return value as string;
}

function convertOptionalStringOrNull(record: RawRecord, key: string): string | null | undefined {
  if (!hasKey(record, key)) {
    return undefined;
  }
  const value = record[key];
  if (value !== null && typeof value !== "string") {
    fail("Invalid optional field.");
  }
  return value as string | null;
}

function convertMuscleRef(value: unknown): Record<string, unknown> {
  const rec = asRawRecord(value, "Invalid muscle relationship.");
  const out: Record<string, unknown> = {
    id: convertUuid(rec["id"]),
    name: convertString(rec["name"]),
  };
  const role = rec["type"];
  if (role !== "primary" && role !== "secondary" && role !== "tertiary") {
    fail("Invalid muscle relationship.");
  }
  out["type"] = role as string;
  for (const key of Object.keys(rec)) {
    if (key !== "id" && key !== "name" && key !== "type") {
      setOwn(out, key, toPlainJson(getOwn(rec, key)));
    }
  }
  return out;
}

function convertEquipmentRef(value: unknown): Record<string, unknown> {
  const rec = asRawRecord(value, "Invalid equipment relationship.");
  const out: Record<string, unknown> = {
    id: convertUuid(rec["id"]),
    name: convertString(rec["name"]),
  };
  if (hasKey(rec, "numItems")) {
    out["numItems"] = convertNullableInt32(rec["numItems"]);
  }
  for (const key of Object.keys(rec)) {
    if (key !== "id" && key !== "name" && key !== "numItems") {
      setOwn(out, key, toPlainJson(getOwn(rec, key)));
    }
  }
  return out;
}

function muscleRank(role: string): number {
  if (role === "primary") {
    return 0;
  }
  if (role === "secondary") {
    return 1;
  }
  return 2;
}

function compareRecordsById(a: Record<string, unknown>, b: Record<string, unknown>): number {
  const left = a["id"] as string;
  const right = b["id"] as string;
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Canonical emission: muscles by role then UUID, equipment by UUID. */
function sortRelationships(
  muscles: Record<string, unknown>[],
  equipment: Record<string, unknown>[],
): { muscles: Record<string, unknown>[]; equipment: Record<string, unknown>[] } {
  const sortedMuscles = [...muscles].sort((a, b) => {
    const rank = muscleRank(a["type"] as string) - muscleRank(b["type"] as string);
    return rank !== 0 ? rank : compareRecordsById(a, b);
  });
  const sortedEquipment = [...equipment].sort(compareRecordsById);
  return { muscles: sortedMuscles, equipment: sortedEquipment };
}

/** Projected Exercise with preserved convenience fields and sorted relations. */
export function convertExercise(value: unknown): Record<string, unknown> {
  const rec = asRawRecord(value, "Invalid exercise record.");
  const muscles = asRawArray(rec["muscleGroups"], "Invalid muscle relationship.").map((item) =>
    convertMuscleRef(item),
  );
  const equipment = asRawArray(rec["equipment"], "Invalid equipment relationship.").map((item) =>
    convertEquipmentRef(item),
  );
  const sorted = sortRelationships(muscles, equipment);
  const out: Record<string, unknown> = {
    id: convertUuid(rec["id"]),
    name: convertString(rec["name"]),
    type: convertString(rec["type"]),
  };
  for (const key of ["category", "difficultyLevel", "forceType", "mechanics"] as const) {
    const optional = convertOptionalStringOrNull(rec, key);
    if (optional !== undefined) {
      out[key] = optional;
    }
  }
  if (hasKey(rec, "instructions")) {
    const instructions = rec["instructions"];
    if (instructions === null) {
      out["instructions"] = null;
    } else {
      const list = asRawArray(instructions, "Invalid instructions.");
      out["instructions"] = list.map((item) => convertString(item));
    }
  }
  out["isUserCreated"] = convertBoolean(rec["isUserCreated"]);
  if (hasKey(rec, "revision")) {
    const revision = rec["revision"];
    out["revision"] = revision === null ? null : convertRevision(revision);
  }
  out["muscleGroups"] = sorted.muscles;
  out["equipment"] = sorted.equipment;
  for (const key of Object.keys(rec)) {
    if (!hasOwnKey(out, key)) {
      setOwn(out, key, toPlainJson(getOwn(rec, key)));
    }
  }
  validateProjectedExercise(out, RESPONSE);
  return out;
}

function convertWorkoutSummaryFields(rec: RawRecord, out: Record<string, unknown>): void {
  out["id"] = convertUuid(rec["id"]);
  out["name"] = convertString(rec["name"]);
  const status = rec["status"];
  if (status !== "active" && status !== "finished") {
    fail("Invalid workout status.");
  }
  out["status"] = status;
  out["startedAt"] = convertTimestamp(rec["startedAt"]);
  if (hasKey(rec, "finishedAt")) {
    const finishedAt = rec["finishedAt"];
    out["finishedAt"] = finishedAt === null ? null : convertTimestamp(finishedAt);
  }
  out["revision"] = convertRevision(rec["revision"]);
  if (hasKey(rec, "totalVolumeKg")) {
    const volume = rec["totalVolumeKg"];
    if (!(volume instanceof JsonNumber)) {
      fail("Invalid workout volume.");
    }
    const numeric = (volume as JsonNumber).value;
    if (!Number.isFinite(numeric)) {
      fail("Invalid workout volume.");
    }
    out["totalVolumeKg"] = numeric;
  }
}

/** Projected WorkoutSummary. */
export function convertWorkoutSummary(value: unknown): Record<string, unknown> {
  const rec = asRawRecord(value, "Invalid workout summary.");
  const out: Record<string, unknown> = {};
  convertWorkoutSummaryFields(rec, out);
  for (const key of Object.keys(rec)) {
    if (!hasOwnKey(out, key)) {
      setOwn(out, key, toPlainJson(getOwn(rec, key)));
    }
  }
  validateProjectedWorkoutSummary(out, RESPONSE);
  return out;
}

function convertWorkoutSet(value: unknown): Record<string, unknown> {
  const rec = asRawRecord(value, "Invalid workout set.");
  const out: Record<string, unknown> = {
    id: convertUuid(rec["id"]),
    position: convertInt32(rec["position"]),
  };
  if (hasKey(rec, "repetitions")) {
    out["repetitions"] = convertNullableInt32(rec["repetitions"]);
  }
  if (hasKey(rec, "weightKg")) {
    out["weightKg"] = convertWeight(rec["weightKg"]);
  }
  out["isCompleted"] = convertBoolean(rec["isCompleted"]);
  if (hasKey(rec, "restSeconds")) {
    out["restSeconds"] = convertNullableInt32(rec["restSeconds"]);
  }
  for (const key of Object.keys(rec)) {
    if (!hasOwnKey(out, key)) {
      setOwn(out, key, toPlainJson(getOwn(rec, key)));
    }
  }
  return out;
}

function convertWorkoutEntry(value: unknown): Record<string, unknown> {
  const rec = asRawRecord(value, "Invalid workout exercise.");
  const sets = asRawArray(rec["sets"], "Invalid workout sets.").map((item) =>
    convertWorkoutSet(item),
  );
  const out: Record<string, unknown> = {
    id: convertUuid(rec["id"]),
    exerciseId: convertUuid(rec["exerciseId"]),
    position: convertInt32(rec["position"]),
    notes: convertString(rec["notes"]),
    restDurationSeconds: convertInt32(rec["restDurationSeconds"]),
    sets,
  };
  if (!hasKey(rec, "exerciseName")) {
    fail("Invalid workout exercise.");
  }
  out["exerciseName"] = convertString(rec["exerciseName"]);
  for (const key of Object.keys(rec)) {
    if (!hasOwnKey(out, key)) {
      setOwn(out, key, toPlainJson(getOwn(rec, key)));
    }
  }
  return out;
}

/** Projected Workout aggregate. */
export function convertWorkout(value: unknown): Record<string, unknown> {
  const rec = asRawRecord(value, "Invalid workout record.");
  const out: Record<string, unknown> = {};
  convertWorkoutSummaryFields(rec, out);
  out["exercises"] = asRawArray(rec["exercises"], "Invalid workout exercises.").map((item) =>
    convertWorkoutEntry(item),
  );
  for (const key of Object.keys(rec)) {
    if (!hasOwnKey(out, key)) {
      setOwn(out, key, toPlainJson(getOwn(rec, key)));
    }
  }
  validateProjectedWorkout(out, RESPONSE);
  return out;
}

function convertRoutineSet(value: unknown): Record<string, unknown> {
  const rec = asRawRecord(value, "Invalid routine set.");
  if (hasKey(rec, "isCompleted") || hasKey(rec, "restSeconds")) {
    fail("Invalid routine set.");
  }
  const out: Record<string, unknown> = {
    id: convertUuid(rec["id"]),
    position: convertInt32(rec["position"]),
  };
  if (hasKey(rec, "repetitions")) {
    out["repetitions"] = convertNullableInt32(rec["repetitions"]);
  }
  if (hasKey(rec, "weightKg")) {
    out["weightKg"] = convertWeight(rec["weightKg"]);
  }
  for (const key of Object.keys(rec)) {
    if (!hasOwnKey(out, key)) {
      setOwn(out, key, toPlainJson(getOwn(rec, key)));
    }
  }
  return out;
}

function convertRoutineEntry(value: unknown): Record<string, unknown> {
  const rec = asRawRecord(value, "Invalid routine exercise.");
  const sets = asRawArray(rec["sets"], "Invalid routine sets.").map((item) =>
    convertRoutineSet(item),
  );
  const out: Record<string, unknown> = {
    id: convertUuid(rec["id"]),
    exerciseId: convertUuid(rec["exerciseId"]),
    position: convertInt32(rec["position"]),
    restDurationSeconds: convertInt32(rec["restDurationSeconds"]),
    sets,
  };
  if (!hasKey(rec, "exerciseName")) {
    fail("Invalid routine exercise.");
  }
  out["exerciseName"] = convertString(rec["exerciseName"]);
  for (const key of Object.keys(rec)) {
    if (!hasOwnKey(out, key)) {
      setOwn(out, key, toPlainJson(getOwn(rec, key)));
    }
  }
  return out;
}

/** Projected Routine aggregate. */
export function convertRoutine(value: unknown): Record<string, unknown> {
  const rec = asRawRecord(value, "Invalid routine record.");
  const out: Record<string, unknown> = {
    id: convertUuid(rec["id"]),
    name: convertString(rec["name"]),
    isDraft: convertBoolean(rec["isDraft"]),
    revision: convertRevision(rec["revision"]),
    exercises: asRawArray(rec["exercises"], "Invalid routine exercises.").map((item) =>
      convertRoutineEntry(item),
    ),
  };
  for (const key of Object.keys(rec)) {
    if (!hasOwnKey(out, key)) {
      setOwn(out, key, toPlainJson(getOwn(rec, key)));
    }
  }
  validateProjectedRoutine(out, RESPONSE);
  return out;
}
