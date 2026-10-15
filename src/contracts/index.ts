/**
 * T01 foundation typed boundaries (proposed interface specification, revised
 * per coordinator review).
 *
 * These are the injectable boundaries from docs/architecture.md, expressed as
 * TypeScript types only. There are no runtime implementations, mock stores,
 * default service configuration, or validation logic in this module.
 *
 * The signatures below are proposed for coordinator review before finalization;
 * owning tasks (T02-T15) refine them. They must not be read as settled wire
 * schemas. Opaque not-yet-decided representations use `unknown`, never `any`,
 * and every object type is readonly.
 */

/** Immutable identity captured for one invocation: configured origin, service-confirmed account, local session generation, and the external profile-generation fence. The session generation and profile-generation ID are distinct fences; they must not be conflated. */
export interface ProfileBinding {
  readonly origin: string;
  readonly accountUuid: string;
  readonly sessionGeneration: number;
  readonly profileGenerationId: string;
}

/** Trusted operator configuration selected outside model-facing tools. Exact field shapes for budgets/ports are later-task decisions; no defaults are provided here. */
export interface TrustedConfiguration {
  readonly serviceOrigin: string;
  readonly profileLocation: string;
  readonly writesEnabled: boolean;
}

/**
 * Protected provisioning/opening, ownership lock, atomic vault writes, atomic
 * journal persistence, and the external generation fence. The generation
 * marker lives outside the journal store so a missing/reset store cannot
 * silently appear to be a fresh empty profile. No implicit creation on read.
 * Journal entry shapes are owned by the operation-journal task.
 */
export interface ProfileStore {
  readonly binding: ProfileBinding;
  acquireOwnership(): Promise<unknown>;
  releaseOwnership(): Promise<unknown>;
  loadVault(): Promise<unknown>;
  storeVault(payload: unknown): Promise<unknown>;
  loadJournal(operationId: string): Promise<unknown>;
  persistJournalStep(operationId: string, step: unknown): Promise<unknown>;
  loadGenerationMarker(): Promise<unknown>;
}

/** Pre-send versus pre-delivery binding verification point. */
export type BindingCheckPoint = "pre-send" | "pre-delivery";

/**
 * Dedicated opaque credential selection, pending-refresh settlement, serialized
 * rotation, and pre-send/pre-delivery binding checks. Refresh is serialized
 * across calls and processes sharing the profile: concurrent callers share one
 * attempt, a lost response retries the exact persisted predecessor
 * token/body/key, and no replacement key is minted while an uncertain refresh
 * remains. Credentials stay internal.
 */
export interface SessionProvider {
  readonly binding: ProfileBinding;
  selectCredential(): Promise<unknown>;
  verifyBinding(point: BindingCheckPoint): Promise<unknown>;
  settlePendingRefresh(): Promise<unknown>;
}

/** Creation mutation methods. Only the three creation steps use mutations. */
export type CreationMutationMethod = "POST" | "PUT";

/**
 * Exact persisted identity shared by every creation mutation: exact UTF-8 body
 * bytes and the stable resource key. Dispatch replays these stored bytes; it
 * never re-serializes arguments and never takes caller URLs or headers.
 * `readonly` guards the reference, not the bytes: storage ownership/copy and
 * replay-from-stored-bytes enforcement are later-task (operation/store)
 * guarantees, recorded here as a constraint on those owners.
 */
export interface MutationIdentityBase {
  readonly body: Uint8Array;
  readonly resourceKey: string;
}

/** Draft step identity: exactly POST /v1/routines. */
export interface DraftMutationIdentity extends MutationIdentityBase {
  readonly method: "POST";
  readonly route: "/v1/routines";
}

/**
 * Populate step identity: exactly PUT /v1/routines/{id} with the allocated
 * routine ID substituted. Runtime ID/path validation is T05/T09
 * responsibility; no runtime code exists at T01.
 */
export interface PopulateMutationIdentity extends MutationIdentityBase {
  readonly method: "PUT";
  readonly route: `/v1/routines/${string}`;
}

/**
 * Save step identity: exactly POST /v1/routines/{id}/save with the allocated
 * routine ID substituted. Runtime ID/path validation is T05/T09
 * responsibility; no runtime code exists at T01.
 */
export interface SaveMutationIdentity extends MutationIdentityBase {
  readonly method: "POST";
  readonly route: `/v1/routines/${string}/save`;
}

/** Closed union of the three creation-step identities. */
export type MutationIdentity =
  DraftMutationIdentity | PopulateMutationIdentity | SaveMutationIdentity;

/**
 * Typed allowlisted-route client. The allowlist is this method set: six
 * semantic reads plus the three creation steps, each creation step taking only
 * its matching discriminated step identity plus an abort signal. Read
 * filter/paging shapes are owned by the schema/transport tasks and remain
 * `unknown` here. Callers supply no URLs, headers, or credentials.
 */
export interface BackendClient {
  readonly binding: ProfileBinding;
  searchExercises(request: unknown, signal: AbortSignal): Promise<unknown>;
  getExercise(request: unknown, signal: AbortSignal): Promise<unknown>;
  listWorkouts(request: unknown, signal: AbortSignal): Promise<unknown>;
  getWorkout(request: unknown, signal: AbortSignal): Promise<unknown>;
  listRoutines(request: unknown, signal: AbortSignal): Promise<unknown>;
  getRoutine(request: unknown, signal: AbortSignal): Promise<unknown>;
  createDraft(identity: DraftMutationIdentity, signal: AbortSignal): Promise<unknown>;
  populateDraft(identity: PopulateMutationIdentity, signal: AbortSignal): Promise<unknown>;
  saveRoutine(identity: SaveMutationIdentity, signal: AbortSignal): Promise<unknown>;
}

/** Strict tool-argument validation, documented-default normalization, lossless backend numeric parsing, millisecond-UTC checks, and decimal-string revision projection. */
export interface SchemaCodec {
  parseArguments(toolName: string, input: unknown): unknown;
  normalizeIntent(input: unknown): unknown;
  projectRevision(value: unknown): unknown;
}

/** Exclusive admission/execution, immutable step bytes and keys, dispatch/confirmation commits, versioned keyed intent identity, and terminal minimization. */
export interface OperationRepository {
  readonly binding: ProfileBinding;
  admit(operationId: string, intent: unknown): Promise<unknown>;
  recordDispatch(operationId: string, step: string): Promise<unknown>;
  recordConfirmation(operationId: string, step: string, response: unknown): Promise<unknown>;
  loadTerminal(operationId: string): Promise<unknown>;
}

/** Creation orchestration only. No stdout, interactive login, or Pi access. */
export interface RoutineCreationService {
  readonly binding: ProfileBinding;
  create(operationId: string, intent: unknown): Promise<unknown>;
}

/**
 * Trusted non-credential profile/session context for the companion, including
 * the profile-generation fence alongside the session generation. Never carries
 * credentials.
 */
export interface CompanionBinding {
  readonly origin: string;
  readonly accountUuid: string;
  readonly sessionGeneration: number;
  readonly profileGenerationId: string;
}

/**
 * Retained approved operationId/intent outside the model response. Every call
 * carries its CompanionBinding so retained intent is always verified against
 * the current profile/session context and can never move to a different
 * binding. Labels remain transient authorized observations and are not
 * persisted here.
 */
export interface IntentStore {
  retain(binding: CompanionBinding, operationId: string, intent: unknown): Promise<unknown>;
  load(binding: CompanionBinding, operationId: string): Promise<unknown>;
}

/** Injectable clock for deterministic tests. */
export interface Clock {
  nowMs(): number;
}

/** Injectable UUID generator for deterministic tests. */
export interface UuidGenerator {
  generate(): string;
}

/** Injectable sleeper for bounded retry delays. */
export interface Sleeper {
  sleep(ms: number): Promise<void>;
}

/** Injectable process/file fault point. A test seam only; never a production authentication bypass. */
export interface FaultInjector {
  readonly enabled: boolean;
  trigger(point: string): Promise<unknown>;
}

/** Injectable transport for deterministic tests. */
export interface Transport {
  send(request: unknown, signal: AbortSignal): Promise<unknown>;
}
