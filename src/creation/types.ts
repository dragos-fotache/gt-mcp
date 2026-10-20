import type { AuthenticatedSessionState } from "../auth/index.js";
import type { SavedRoutineResult, ToolErrorObject } from "../domain/index.js";
import type { StorageBinding } from "../storage/index.js";

export type CreationStep = "draft" | "populate" | "save";
export type LastConfirmedStep = "none" | CreationStep;
export interface CreationError extends ToolErrorObject {
  readonly retryable: false;
}
export type CreationOutcome =
  | { readonly ok: true; readonly data: SavedRoutineResult }
  | { readonly ok: false; readonly error: CreationError };
export type CreationServiceSession = Pick<
  AuthenticatedSessionState,
  "binding" | "getExercise" | "createDraft" | "populateDraft" | "saveRoutine"
>;
export interface CreationServiceOptions {
  readonly session: CreationServiceSession;
  readonly writesEnabled: boolean;
  readonly maxRequestBytes?: number;
}
export interface CreationService {
  create(binding: StorageBinding, args: unknown, signal: AbortSignal): Promise<CreationOutcome>;
}
export interface CreationContext {
  readonly routineId: string;
  readonly lastConfirmedStep: LastConfirmedStep;
  readonly outcomeUnknown: boolean;
}
