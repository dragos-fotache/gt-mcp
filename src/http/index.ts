/**
 * T05 fixed-origin backend transport — public production entry.
 *
 * Exact runtime exports: createBackendTransport, TransportError,
 * isTransportError, DEFAULT_TRANSPORT_BUDGETS, TRANSPORT_IDENTITY_VERSION.
 * Importing this module performs no IO, output, timers, network, processes,
 * listeners, or global handlers. The only transitive exception is the public
 * T03 pinned-Zod in-memory-registry calibration, reused for the T03 entry
 * imports below.
 */

import type {
  ExerciseRecord,
  RoutineListPage,
  RoutineRecord,
  SearchExercisesPage,
  WorkoutListPage,
  WorkoutRecord,
} from "../domain/index.js";
import {
  TransportError,
  isTransportError,
  type TransportErrorCode,
  type TransportErrorFields,
  type TransportEvent,
} from "./errors.js";
import { createBackendTransport as createTransport } from "./transport.js";
import { DEFAULT_TRANSPORT_BUDGET_VALUES } from "./validate.js";

export { TransportError, isTransportError };
export type { TransportErrorCode, TransportErrorFields, TransportEvent };

export type ReadRouteName =
  | "search_exercises"
  | "get_exercise"
  | "list_workouts"
  | "get_workout"
  | "list_routines"
  | "get_routine";
export type MutationRouteName = "create_draft" | "populate_draft" | "save_routine";
export type ControlRouteName =
  "auth_challenge" | "auth_exchange" | "auth_refresh" | "auth_logout" | "account_status";
export type BearerRouteName = ReadRouteName | MutationRouteName;
export type RouteName = BearerRouteName | ControlRouteName;

export interface CallBinding {
  readonly origin: string;
  readonly accountUuid: string | null;
  readonly sessionGeneration: number;
  readonly profileGenerationId: string;
}

export interface TransportBudgets {
  readonly maxRequestBytes: number;
  readonly maxRequestTargetBytes: number;
  readonly maxResponseBytes: number;
  readonly maxProjectedResultBytes: number;
  readonly maxHeadBytes: number;
  readonly maxHeaderCount: number;
  readonly perAttemptTimeoutMs: number;
  readonly totalDeadlineMs: number;
  readonly maxAttempts: number;
  readonly baseRetryDelayMs: number;
  readonly maxRetryDelayMs: number;
}

export interface TrustedTransportConfig {
  readonly origin: string;
  readonly budgets?: Partial<TransportBudgets>;
  readonly allowInsecureLoopback?: boolean;
  readonly testCaPem?: Uint8Array;
}

export interface DispatchSummary {
  readonly routeLabel: RouteName;
  readonly method: "GET" | "POST" | "PUT";
  readonly target: string;
  readonly bodyByteLength: number;
  readonly keyKind: "resource" | "auth" | null;
  readonly attempt: number;
}

export interface CredentialMaterial {
  readonly bearerToken: string;
  readonly forBinding: CallBinding;
}

export interface SessionHooks {
  checkBinding(
    point: "pre-send" | "pre-delivery",
    binding: CallBinding,
    signal: AbortSignal,
  ): Promise<void>;
  selectCredential(
    binding: CallBinding,
    route: BearerRouteName,
    signal: AbortSignal,
  ): Promise<CredentialMaterial | null>;
  beforeDispatch(
    binding: CallBinding,
    summary: DispatchSummary,
    signal: AbortSignal,
  ): Promise<void>;
  isCurrent(binding: CallBinding): boolean;
}

export interface Clock {
  nowMs(): number;
}

export interface Sleeper {
  sleep(ms: number, signal: AbortSignal): Promise<void>;
}

export interface CapturedWireRequest {
  readonly origin: string;
  readonly method: "GET" | "POST" | "PUT";
  readonly target: string;
  readonly headers: ReadonlyArray<readonly [string, string]>;
  readonly body: Uint8Array;
}

export interface AttemptBudget {
  readonly timeoutMs: number;
  readonly maxResponseBytes: number;
  readonly maxHeadBytes: number;
  readonly maxHeaderCount: number;
}

export type RawWireResponse =
  | {
      readonly ok: true;
      readonly status: number;
      readonly rawHeaders: ReadonlyArray<readonly [string, string]>;
      readonly body: Uint8Array;
    }
  | {
      readonly ok: false;
      readonly kind: "network" | "malformed" | "response_too_large";
      readonly status: number | null;
    };

export interface HttpWire {
  sendRaw(
    request: CapturedWireRequest,
    budget: AttemptBudget,
    signal: AbortSignal,
  ): Promise<RawWireResponse>;
}

export interface TransportDeps {
  readonly session: SessionHooks;
  readonly clock?: Clock;
  readonly sleeper?: Sleeper;
  readonly wire?: HttpWire;
  readonly onEvent?: (event: TransportEvent) => void;
}

export interface ResultMeta {
  readonly attempts: number;
  readonly elapsedMs: number;
  readonly correlationId: string;
  readonly dispatched: true;
}

export interface SearchExercisesResult extends ResultMeta {
  readonly status: 200;
  readonly data: SearchExercisesPage;
}

export interface ExerciseResult extends ResultMeta {
  readonly status: 200;
  readonly data: ExerciseRecord;
}

export interface WorkoutListResult extends ResultMeta {
  readonly status: 200;
  readonly data: WorkoutListPage;
}

export interface WorkoutResult extends ResultMeta {
  readonly status: 200;
  readonly data: WorkoutRecord;
}

export interface RoutineListResult extends ResultMeta {
  readonly status: 200;
  readonly data: RoutineListPage;
}

export interface RoutineResult extends ResultMeta {
  readonly status: 200;
  readonly data: RoutineRecord;
}

export interface MutationResult extends ResultMeta {
  readonly status: 200 | 201;
  readonly routeLabel: MutationRouteName;
  readonly resourceKey: string;
  readonly rawBodyBytes: Uint8Array;
  readonly data: RoutineRecord;
}

export interface ControlResult extends ResultMeta {
  readonly status: 200;
  readonly rawBodyBytes: Uint8Array;
}

export interface LogoutResult extends ResultMeta {
  readonly status: 204;
}

export interface BackendTransport {
  searchExercises(
    b: CallBinding,
    queryInput: unknown,
    signal: AbortSignal,
  ): Promise<SearchExercisesResult>;
  getExercise(b: CallBinding, exerciseId: string, signal: AbortSignal): Promise<ExerciseResult>;
  listWorkouts(
    b: CallBinding,
    queryInput: unknown,
    signal: AbortSignal,
  ): Promise<WorkoutListResult>;
  getWorkout(b: CallBinding, workoutId: string, signal: AbortSignal): Promise<WorkoutResult>;
  listRoutines(
    b: CallBinding,
    queryInput: unknown,
    signal: AbortSignal,
  ): Promise<RoutineListResult>;
  getRoutine(b: CallBinding, routineId: string, signal: AbortSignal): Promise<RoutineResult>;
  createDraft(
    b: CallBinding,
    expectedRoutineId: string,
    body: Uint8Array,
    resourceKey: string,
    signal: AbortSignal,
  ): Promise<MutationResult>;
  populateDraft(
    b: CallBinding,
    routineId: string,
    body: Uint8Array,
    resourceKey: string,
    signal: AbortSignal,
  ): Promise<MutationResult>;
  saveRoutine(
    b: CallBinding,
    routineId: string,
    body: Uint8Array,
    resourceKey: string,
    signal: AbortSignal,
  ): Promise<MutationResult>;
  authChallenge(b: CallBinding, body: Uint8Array, signal: AbortSignal): Promise<ControlResult>;
  authExchange(
    b: CallBinding,
    body: Uint8Array,
    authKey: string,
    signal: AbortSignal,
  ): Promise<ControlResult>;
  authRefresh(
    b: CallBinding,
    body: Uint8Array,
    authKey: string,
    signal: AbortSignal,
  ): Promise<ControlResult>;
  authLogout(b: CallBinding, body: Uint8Array, signal: AbortSignal): Promise<LogoutResult>;
  accountStatus(b: CallBinding, body: Uint8Array, signal: AbortSignal): Promise<ControlResult>;
}

export const DEFAULT_TRANSPORT_BUDGETS: TransportBudgets = Object.freeze({
  ...DEFAULT_TRANSPORT_BUDGET_VALUES,
});

export const TRANSPORT_IDENTITY_VERSION = "gymtracka-transport-v1";

export function createBackendTransport(
  config: TrustedTransportConfig,
  deps: TransportDeps,
): BackendTransport {
  return createTransport(config, deps);
}
