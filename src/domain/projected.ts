/**
 * Validators for projected (canonical plain-JSON) records. Decode and
 * result-envelope paths share these checks; the error code is parameterized
 * (invalid_backend_response for wire reads, invalid_tool_result for tool
 * envelopes) while messages stay generic and data-free.
 */
import { isValidTimestamp } from "./datetime.js";
import type { CodecErrorCode } from "./errors.js";
import { CodecError } from "./errors.js";
import { isCanonicalRevisionString } from "./revision.js";
import { isInt32Value, isNonBlankName, isUuid, isWeightValue } from "./scalars.js";

function fail(code: CodecErrorCode, message: string): never {
  throw new CodecError(code, message);
}

function asRecord(value: unknown, code: CodecErrorCode, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(code, message);
  }
  return value as Record<string, unknown>;
}

function asArray(value: unknown, code: CodecErrorCode, message: string): unknown[] {
  if (!Array.isArray(value)) {
    fail(code, message);
  }
  return value as unknown[];
}

export function checkUuid(value: unknown, code: CodecErrorCode): string {
  if (!isUuid(value)) {
    fail(code, "Invalid identifier.");
  }
  return value as string;
}

export function checkString(value: unknown, code: CodecErrorCode): string {
  if (typeof value !== "string") {
    fail(code, "Invalid string field.");
  }
  return value as string;
}

export function checkBoolean(value: unknown, code: CodecErrorCode): boolean {
  if (typeof value !== "boolean") {
    fail(code, "Invalid boolean field.");
  }
  return value as boolean;
}

export function checkRevision(value: unknown, code: CodecErrorCode): string {
  if (!isCanonicalRevisionString(value)) {
    fail(code, "Invalid revision.");
  }
  return value as string;
}

export function checkInt32(value: unknown, code: CodecErrorCode): number {
  if (!isInt32Value(value)) {
    fail(code, "Invalid integer field.");
  }
  return value as number;
}

export function checkNullableInt32(value: unknown, code: CodecErrorCode): number | null {
  if (value === null) {
    return null;
  }
  return checkInt32(value, code);
}

export function checkWeight(value: unknown, code: CodecErrorCode): number | null {
  if (!isWeightValue(value)) {
    fail(code, "Invalid weight field.");
  }
  return value as number | null;
}

export function checkTimestamp(value: unknown, code: CodecErrorCode): string {
  if (!isValidTimestamp(value)) {
    fail(code, "Invalid timestamp.");
  }
  return value as string;
}

export function checkName(value: unknown, code: CodecErrorCode): string {
  if (typeof value !== "string") {
    fail(code, "Invalid name.");
  }
  return value as string;
}

export function checkCreateName(value: unknown, code: CodecErrorCode): string {
  if (typeof value !== "string" || !isNonBlankName(value)) {
    fail(code, "Invalid name.");
  }
  return value as string;
}

function hasKey(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function optionalStringOrNull(
  record: Record<string, unknown>,
  key: string,
  code: CodecErrorCode,
): void {
  if (!hasKey(record, key)) {
    return;
  }
  const value = record[key];
  if (value !== null && typeof value !== "string") {
    fail(code, "Invalid optional field.");
  }
}

const MUSCLE_ROLES = ["primary", "secondary", "tertiary"] as const;

export function roleRank(role: string): number {
  const index = (MUSCLE_ROLES as readonly string[]).indexOf(role);
  return index;
}

function checkMuscleRef(value: unknown, code: CodecErrorCode): void {
  const rec = asRecord(value, code, "Invalid muscle relationship.");
  checkUuid(rec["id"], code);
  checkString(rec["name"], code);
  if (typeof rec["type"] !== "string" || roleRank(rec["type"]) < 0) {
    fail(code, "Invalid muscle relationship.");
  }
}

function checkEquipmentRef(value: unknown, code: CodecErrorCode): void {
  const rec = asRecord(value, code, "Invalid equipment relationship.");
  checkUuid(rec["id"], code);
  checkString(rec["name"], code);
  if (hasKey(rec, "numItems")) {
    checkNullableInt32(rec["numItems"], code);
  }
}

function checkRelationshipDuplicates(
  muscles: unknown[],
  equipment: unknown[],
  code: CodecErrorCode,
): void {
  // Catalogue membership is keyed by muscle UUID and role. Bundled records may
  // reference one muscle in distinct roles; custom overlap is checked below.
  const muscleMemberships = new Set<string>();
  for (const item of muscles) {
    const rec = item as Record<string, unknown>;
    const membership = `${rec["id"] as string}:${rec["type"] as string}`;
    if (muscleMemberships.has(membership)) {
      fail(code, "Invalid muscle relationship.");
    }
    muscleMemberships.add(membership);
  }
  const equipmentIds = new Set<string>();
  for (const item of equipment) {
    const id = (item as Record<string, unknown>)["id"] as string;
    if (equipmentIds.has(id)) {
      fail(code, "Invalid equipment relationship.");
    }
    equipmentIds.add(id);
  }
}

/** Projected Exercise record with custom/bundled invariants. */
export function validateProjectedExercise(value: unknown, code: CodecErrorCode): void {
  const rec = asRecord(value, code, "Invalid exercise record.");
  checkUuid(rec["id"], code);
  checkName(rec["name"], code);
  const type = checkString(rec["type"], code);
  const isUserCreated = checkBoolean(rec["isUserCreated"], code);
  const muscles = asArray(rec["muscleGroups"], code, "Invalid muscle relationship.");
  const equipment = asArray(rec["equipment"], code, "Invalid equipment relationship.");
  for (const item of muscles) {
    checkMuscleRef(item, code);
  }
  for (const item of equipment) {
    checkEquipmentRef(item, code);
  }
  checkRelationshipDuplicates(muscles, equipment, code);
  optionalStringOrNull(rec, "category", code);
  optionalStringOrNull(rec, "difficultyLevel", code);
  optionalStringOrNull(rec, "forceType", code);
  optionalStringOrNull(rec, "mechanics", code);
  if (hasKey(rec, "instructions")) {
    const instructions = rec["instructions"];
    if (instructions !== null) {
      const list = asArray(instructions, code, "Invalid instructions.");
      for (const item of list) {
        checkString(item, code);
      }
    }
  }
  const hasRevision = hasKey(rec, "revision");
  if (isUserCreated) {
    if (type !== "reps") {
      fail(code, "Invalid custom exercise.");
    }
    if (!hasRevision || rec["revision"] === null) {
      fail(code, "Invalid custom exercise revision.");
    }
    checkRevision(rec["revision"], code);
    let primaryCount = 0;
    const secondaryIds = new Set<string>();
    let primaryId: string | null = null;
    for (const item of muscles) {
      const role = (item as Record<string, unknown>)["type"] as string;
      const id = (item as Record<string, unknown>)["id"] as string;
      if (role === "tertiary") {
        fail(code, "Invalid custom exercise.");
      }
      if (role === "primary") {
        primaryCount += 1;
        primaryId = id;
      } else {
        secondaryIds.add(id);
      }
    }
    if (primaryCount > 1) {
      fail(code, "Invalid custom exercise.");
    }
    if (primaryId !== null && secondaryIds.has(primaryId)) {
      fail(code, "Invalid custom exercise.");
    }
    if (equipment.length > 1) {
      fail(code, "Invalid custom exercise.");
    }
  } else if (hasRevision && rec["revision"] !== null) {
    checkRevision(rec["revision"], code);
  }
}

function validateWorkoutSummaryFields(
  rec: Record<string, unknown>,
  code: CodecErrorCode,
): { status: string; finishedAt: string | null } {
  checkUuid(rec["id"], code);
  checkName(rec["name"], code);
  const status = rec["status"];
  if (status !== "active" && status !== "finished") {
    fail(code, "Invalid workout status.");
  }
  checkTimestamp(rec["startedAt"], code);
  let finishedAt: string | null = null;
  if (hasKey(rec, "finishedAt")) {
    const raw = rec["finishedAt"];
    if (raw !== null) {
      finishedAt = checkTimestamp(raw, code);
    }
  }
  if (status === "active" && finishedAt !== null) {
    fail(code, "Invalid active workout.");
  }
  if (status === "finished" && finishedAt === null) {
    fail(code, "Invalid finished workout.");
  }
  checkRevision(rec["revision"], code);
  if (hasKey(rec, "totalVolumeKg")) {
    const volume = rec["totalVolumeKg"];
    if (typeof volume !== "number" || !Number.isFinite(volume)) {
      fail(code, "Invalid workout volume.");
    }
  }
  return { status: status as string, finishedAt };
}

/** Projected WorkoutSummary record (observable summary invariants only). */
export function validateProjectedWorkoutSummary(value: unknown, code: CodecErrorCode): void {
  const rec = asRecord(value, code, "Invalid workout summary.");
  validateWorkoutSummaryFields(rec, code);
}

function checkFamilyDistinct(ids: string[], code: CodecErrorCode): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      fail(code, "Duplicate aggregate identity.");
    }
    seen.add(id);
  }
}

function validateWorkoutSet(
  value: unknown,
  index: number,
  code: CodecErrorCode,
): { id: string; isCompleted: boolean } {
  const rec = asRecord(value, code, "Invalid workout set.");
  const id = checkUuid(rec["id"], code);
  checkInt32(rec["position"], code);
  if (rec["position"] !== index) {
    fail(code, "Invalid set position.");
  }
  const repetitions = hasKey(rec, "repetitions")
    ? checkNullableInt32(rec["repetitions"], code)
    : null;
  const weightKg = hasKey(rec, "weightKg") ? checkWeight(rec["weightKg"], code) : null;
  const isCompleted = checkBoolean(rec["isCompleted"], code);
  if (hasKey(rec, "restSeconds")) {
    checkNullableInt32(rec["restSeconds"], code);
  }
  if (isCompleted && (repetitions === null || weightKg === null)) {
    fail(code, "Invalid completed set.");
  }
  return { id, isCompleted };
}

function validateWorkoutEntry(
  value: unknown,
  index: number,
  code: CodecErrorCode,
): { ids: string[]; completedSets: number; totalSets: number } {
  const rec = asRecord(value, code, "Invalid workout exercise.");
  const id = checkUuid(rec["id"], code);
  checkUuid(rec["exerciseId"], code);
  checkInt32(rec["position"], code);
  if (rec["position"] !== index) {
    fail(code, "Invalid entry position.");
  }
  checkString(rec["notes"], code);
  checkInt32(rec["restDurationSeconds"], code);
  checkString(rec["exerciseName"], code);
  const sets = asArray(rec["sets"], code, "Invalid workout sets.");
  const ids = [id];
  let completedSets = 0;
  sets.forEach((set, setIndex) => {
    const result = validateWorkoutSet(set, setIndex, code);
    ids.push(result.id);
    if (result.isCompleted) {
      completedSets += 1;
    }
  });
  return { ids, completedSets, totalSets: sets.length };
}

/** Projected Workout aggregate with domain invariants. */
export function validateProjectedWorkout(value: unknown, code: CodecErrorCode): void {
  const rec = asRecord(value, code, "Invalid workout record.");
  const { status } = validateWorkoutSummaryFields(rec, code);
  const entries = asArray(rec["exercises"], code, "Invalid workout exercises.");
  const ids: string[] = [rec["id"] as string];
  let completedSets = 0;
  let totalSets = 0;
  entries.forEach((entry, entryIndex) => {
    const result = validateWorkoutEntry(entry, entryIndex, code);
    ids.push(...result.ids);
    completedSets += result.completedSets;
    totalSets += result.totalSets;
  });
  checkFamilyDistinct(ids, code);
  if (status === "finished") {
    if (totalSets === 0 || completedSets !== totalSets) {
      fail(code, "Invalid finished workout.");
    }
    for (const entry of entries) {
      const sets = (entry as Record<string, unknown>)["sets"] as unknown[];
      if (sets.length === 0) {
        fail(code, "Invalid finished workout.");
      }
    }
  }
}

function validateRoutineSet(value: unknown, index: number, code: CodecErrorCode): string {
  const rec = asRecord(value, code, "Invalid routine set.");
  const id = checkUuid(rec["id"], code);
  checkInt32(rec["position"], code);
  if (rec["position"] !== index) {
    fail(code, "Invalid set position.");
  }
  if (hasKey(rec, "repetitions")) {
    checkNullableInt32(rec["repetitions"], code);
  }
  if (hasKey(rec, "weightKg")) {
    checkWeight(rec["weightKg"], code);
  }
  if (hasKey(rec, "isCompleted") || hasKey(rec, "restSeconds")) {
    fail(code, "Invalid routine set.");
  }
  return id;
}

function validateRoutineEntry(value: unknown, index: number, code: CodecErrorCode): string[] {
  const rec = asRecord(value, code, "Invalid routine exercise.");
  const id = checkUuid(rec["id"], code);
  checkUuid(rec["exerciseId"], code);
  checkInt32(rec["position"], code);
  if (rec["position"] !== index) {
    fail(code, "Invalid entry position.");
  }
  checkInt32(rec["restDurationSeconds"], code);
  checkString(rec["exerciseName"], code);
  const sets = asArray(rec["sets"], code, "Invalid routine sets.");
  const ids = [id];
  sets.forEach((set, setIndex) => {
    ids.push(validateRoutineSet(set, setIndex, code));
  });
  return ids;
}

/** Projected Routine aggregate. No save-eligibility constraints are imposed. */
export function validateProjectedRoutine(value: unknown, code: CodecErrorCode): void {
  const rec = asRecord(value, code, "Invalid routine record.");
  checkUuid(rec["id"], code);
  checkName(rec["name"], code);
  checkBoolean(rec["isDraft"], code);
  checkRevision(rec["revision"], code);
  const entries = asArray(rec["exercises"], code, "Invalid routine exercises.");
  const ids: string[] = [rec["id"] as string];
  entries.forEach((entry, entryIndex) => {
    ids.push(...validateRoutineEntry(entry, entryIndex, code));
  });
  checkFamilyDistinct(ids, code);
}

/**
 * Page envelope correlation: nonempty token iff hasMore. The token key must
 * be explicitly present (decode normalizes backend omission to null; projected
 * result data must carry it).
 */
export function validateProjectedPageToken(
  record: Record<string, unknown>,
  code: CodecErrorCode,
): void {
  const hasMore = checkBoolean(record["hasMore"], code);
  if (!hasKey(record, "nextPageToken")) {
    fail(code, "Invalid page token.");
  }
  const token = record["nextPageToken"];
  if (hasMore) {
    if (typeof token !== "string" || token.length === 0) {
      fail(code, "Invalid page token.");
    }
    return;
  }
  if (token !== null) {
    fail(code, "Invalid page token.");
  }
}

/** Exact invocation-local result {routineId, status:"saved"}. */
export function validateSavedRoutineResult(value: unknown, code: CodecErrorCode): void {
  const rec = asRecord(value, code, "Invalid creation result.");
  const keys = Object.keys(rec);
  if (keys.length !== 2) {
    fail(code, "Invalid creation result.");
  }
  checkUuid(rec["routineId"], code);
  if (rec["status"] !== "saved") {
    fail(code, "Invalid creation result.");
  }
}

const ERROR_KEYS = new Set([
  "code",
  "retryable",
  "message",
  "backendErrorCode",
  "retryAfterSeconds",
  "routineId",
  "lastConfirmedStep",
  "outcomeUnknown",
]);

const LAST_CONFIRMED_STEPS = ["none", "draft", "populate", "save"] as const;

/** Strict error object: required nonempty code + boolean retryable. */
export function validateErrorObject(value: unknown, code: CodecErrorCode): void {
  const rec = asRecord(value, code, "Invalid error envelope.");
  for (const key of Object.keys(rec)) {
    if (!ERROR_KEYS.has(key)) {
      fail(code, "Invalid error envelope.");
    }
  }
  if (typeof rec["code"] !== "string" || (rec["code"] as string).length === 0) {
    fail(code, "Invalid error envelope.");
  }
  checkBoolean(rec["retryable"], code);
  if (hasKey(rec, "message") && typeof rec["message"] !== "string") {
    fail(code, "Invalid error envelope.");
  }
  if (hasKey(rec, "backendErrorCode")) {
    if (
      typeof rec["backendErrorCode"] !== "string" ||
      (rec["backendErrorCode"] as string).length === 0
    ) {
      fail(code, "Invalid error envelope.");
    }
  }
  if (hasKey(rec, "retryAfterSeconds")) {
    const retryAfter = rec["retryAfterSeconds"];
    if (
      typeof retryAfter !== "number" ||
      !Number.isInteger(retryAfter) ||
      (retryAfter as number) < 1
    ) {
      fail(code, "Invalid error envelope.");
    }
  }
  if (hasKey(rec, "routineId")) {
    checkUuid(rec["routineId"], code);
  }
  if (hasKey(rec, "lastConfirmedStep")) {
    if (!(LAST_CONFIRMED_STEPS as readonly string[]).includes(rec["lastConfirmedStep"] as string)) {
      fail(code, "Invalid error envelope.");
    }
  }
  if (hasKey(rec, "outcomeUnknown")) {
    checkBoolean(rec["outcomeUnknown"], code);
  }
}

/**
 * Concrete readonly TypeScript shapes for projected records and pages.
 * Known fields are precisely typed; genuinely additive convenience fields
 * are carried as unknown values under the string index.
 */
export interface MuscleRef {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly [key: string]: unknown;
}

export interface EquipmentRef {
  readonly id: string;
  readonly name: string;
  readonly numItems?: number | null;
  readonly [key: string]: unknown;
}

export interface ExerciseRecord {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly category?: string | null;
  readonly difficultyLevel?: string | null;
  readonly forceType?: string | null;
  readonly mechanics?: string | null;
  readonly instructions?: readonly string[] | null;
  readonly isUserCreated: boolean;
  readonly revision?: string | null;
  readonly muscleGroups: readonly MuscleRef[];
  readonly equipment: readonly EquipmentRef[];
  readonly [key: string]: unknown;
}

export interface WorkoutSummaryRecord {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly startedAt: string;
  readonly finishedAt?: string | null;
  readonly revision: string;
  readonly totalVolumeKg?: number;
  readonly [key: string]: unknown;
}

export interface WorkoutSetRecord {
  readonly id: string;
  readonly position: number;
  readonly repetitions?: number | null;
  readonly weightKg?: number | null;
  readonly isCompleted: boolean;
  readonly restSeconds?: number | null;
  readonly [key: string]: unknown;
}

export interface WorkoutEntryRecord {
  readonly id: string;
  readonly exerciseId: string;
  readonly position: number;
  readonly notes: string;
  readonly restDurationSeconds: number;
  readonly sets: readonly WorkoutSetRecord[];
  readonly exerciseName: string;
  readonly [key: string]: unknown;
}

export interface WorkoutRecord extends WorkoutSummaryRecord {
  readonly exercises: readonly WorkoutEntryRecord[];
}

export interface RoutineSetRecord {
  readonly id: string;
  readonly position: number;
  readonly repetitions?: number | null;
  readonly weightKg?: number | null;
  readonly [key: string]: unknown;
}

export interface RoutineEntryRecord {
  readonly id: string;
  readonly exerciseId: string;
  readonly position: number;
  readonly restDurationSeconds: number;
  readonly sets: readonly RoutineSetRecord[];
  readonly exerciseName: string;
  readonly [key: string]: unknown;
}

export interface RoutineRecord {
  readonly id: string;
  readonly name: string;
  readonly isDraft: boolean;
  readonly revision: string;
  readonly exercises: readonly RoutineEntryRecord[];
  readonly [key: string]: unknown;
}

export interface SearchExercisesPage {
  readonly catalogueVersion: string;
  readonly items: readonly ExerciseRecord[];
  readonly hasMore: boolean;
  readonly nextPageToken: string | null;
  readonly [key: string]: unknown;
}

export interface WorkoutListPage {
  readonly items: readonly WorkoutSummaryRecord[];
  readonly hasMore: boolean;
  readonly nextPageToken: string | null;
  readonly [key: string]: unknown;
}

export interface RoutineListPage {
  readonly items: readonly RoutineRecord[];
  readonly hasMore: boolean;
  readonly nextPageToken: string | null;
  readonly [key: string]: unknown;
}

export interface SavedRoutineResult {
  readonly routineId: string;
  readonly status: "saved";
}

/** Concrete decoded shapes for the six read tools (creation excluded). */
export type DecodedReadData =
  | SearchExercisesPage
  | ExerciseRecord
  | WorkoutListPage
  | WorkoutRecord
  | RoutineListPage
  | RoutineRecord;

/** Concrete projected data shapes returned for the six reads and creation. */
export type ProjectedData =
  | SearchExercisesPage
  | ExerciseRecord
  | WorkoutListPage
  | WorkoutRecord
  | RoutineListPage
  | RoutineRecord
  | SavedRoutineResult;
