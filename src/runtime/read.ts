/**
 * T08 trusted read runtime — private implementation behind the S1 public entry.
 *
 * The index facade preserves openReadRuntime, ReadRuntimeError and
 * isReadRuntimeError; S2 shares the private snapshot opener. Importing
 * this module performs no filesystem,
 * provider, network, output, timer, process, or handler effects.
 *
 * Startup composes the accepted capabilities without new protocols: a
 * protected strict version-1 config/descriptor snapshot, one existing T04
 * profile owner opened once with the exact descriptor binding, and either
 * the T06 bound lifecycle facade (nonnull account) or validated
 * null-account state via S1 openSessionState (authenticated-unavailable
 * reads). Missing config is a safe unavailable runtime; malformed/unsafe/
 * incompatible selected metadata is fatal (configuration_required);
 * storage/session opening failure is fatal (recovery_unavailable). The
 * factory performs no auth/resource request, refresh, migration, write, or
 * operation read, and the runtime exposes six canonical read envelopes plus
 * close: no mutation, login, provider injection, descriptor writes,
 * authority getters, or control escape hatch. Product writes stay disabled
 * even when the config snapshot contains writesEnabled:true.
 */

import type {
  ExerciseRecord,
  RoutineListPage,
  RoutineRecord,
  SearchExercisesPage,
  ToolErrorObject,
  WorkoutListPage,
  WorkoutRecord,
} from "../domain/index.js";
import { makeToolResult, parseArguments } from "../domain/index.js";
import type { AuthenticatedSessionState, LifecycleSessionState } from "../auth/index.js";
import { isSessionError, openLifecycleSessionState, openSessionState } from "../auth/index.js";
import type { SessionState } from "../auth/index.js";
import type { CallBinding } from "../http/index.js";
import { isTransportError } from "../http/index.js";
import type { TransportError } from "../http/index.js";
import type { ProfileSession } from "../storage/index.js";
import { isStorageError, openProfile } from "../storage/index.js";
import {
  assertFileSeparation,
  combineStartup,
  validateConfigRecord,
  validateDescriptorRecord,
} from "./config.js";
import type { ValidatedBinding, ValidatedConfig, ValidatedStartup } from "./config.js";
import { isReadRuntimeError, ReadRuntimeError } from "./errors.js";
import type { ReadRuntimeErrorCode } from "./errors.js";
import { loadProtectedFile, parseStrictMetadataJson } from "./files.js";
import { DEFAULT_MAX_TOOL_RESULT_BYTES } from "./protocolBudget.js";

export { ReadRuntimeError, isReadRuntimeError };
export type { ReadRuntimeErrorCode };

export interface ReadRuntimeOptions {
  readonly configPath?: string;
}

export type ReadEnvelope<T> =
  { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: ToolErrorObject };

export interface ReadRuntime {
  searchExercises(args: unknown, signal: AbortSignal): Promise<ReadEnvelope<SearchExercisesPage>>;
  getExercise(args: unknown, signal: AbortSignal): Promise<ReadEnvelope<ExerciseRecord>>;
  listWorkouts(args: unknown, signal: AbortSignal): Promise<ReadEnvelope<WorkoutListPage>>;
  getWorkout(args: unknown, signal: AbortSignal): Promise<ReadEnvelope<WorkoutRecord>>;
  listRoutines(args: unknown, signal: AbortSignal): Promise<ReadEnvelope<RoutineListPage>>;
  getRoutine(args: unknown, signal: AbortSignal): Promise<ReadEnvelope<RoutineRecord>>;
  close(): Promise<void>;
}

const CONFIG_MAX_BYTES = 65536;
const DESCRIPTOR_MAX_BYTES = 4096;

type ReadRoute =
  | "search_exercises"
  | "get_exercise"
  | "list_workouts"
  | "get_workout"
  | "list_routines"
  | "get_routine";

function failArguments(): never {
  throw new ReadRuntimeError("invalid_arguments");
}

function failConfiguration(): never {
  throw new ReadRuntimeError("configuration_required");
}

function failRecovery(): never {
  throw new ReadRuntimeError("recovery_unavailable");
}

function failInternal(): never {
  throw new ReadRuntimeError("internal_error");
}

/**
 * Capture exact own-data entries without invoking accessors or mutating
 * the caller. Symbols, non-data descriptors, and foreign prototypes reject.
 */
function captureEntries(value: unknown): Array<[string, unknown]> {
  if (typeof value !== "object" || value === null) {
    failArguments();
  }
  let proto: unknown;
  try {
    proto = Object.getPrototypeOf(value);
  } catch {
    failArguments();
  }
  if (proto !== Object.prototype && proto !== null) {
    failArguments();
  }
  let keys: Array<string | symbol>;
  try {
    keys = Reflect.ownKeys(value);
  } catch {
    failArguments();
  }
  const entries: Array<[string, unknown]> = [];
  for (const key of keys) {
    if (typeof key !== "string") {
      failArguments();
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      failArguments();
    }
    if (
      descriptor === undefined ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      typeof (descriptor as { get?: unknown }).get !== "undefined" ||
      typeof (descriptor as { set?: unknown }).set !== "undefined"
    ) {
      failArguments();
    }
    entries.push([key, (descriptor as { value: unknown }).value]);
  }
  return entries;
}

/**
 * Validate the factory caller shape. Invalid caller shape, unknown or
 * invalid fields, and configPath syntax/normalization failures are
 * invalid_arguments. Malformed/unsafe/incompatible selected config or
 * descriptor metadata found after selection is configuration_required.
 * A genuinely absent selected config file (like no selection) yields a
 * safe unconfigured runtime, not a failure.
 */
function captureFactorySelection(options: ReadRuntimeOptions): string | undefined {
  const entries: Array<[string, unknown]> = captureEntries(options);
  let seen = false;
  let raw: unknown = undefined;
  for (const entry of entries) {
    if (entry[0] !== "configPath") {
      failArguments();
    }
    if (seen) {
      failArguments();
    }
    seen = true;
    raw = entry[1];
  }
  if (!seen) {
    return undefined;
  }
  if (typeof raw !== "string" || raw.length === 0 || raw.includes("\0")) {
    failArguments();
  }
  const candidate: string = raw;
  if (!candidate.startsWith("/")) {
    failArguments();
  }
  if (
    candidate !== normalizeAbsolute(candidate) ||
    candidate.split("/").includes(".") ||
    candidate.split("/").includes("..")
  ) {
    failArguments();
  }
  return candidate;
}

function normalizeAbsolute(candidate: string): string {
  const parts: Array<string> = [];
  for (const segment of candidate.split("/")) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  return `/${parts.join("/")}`;
}

function errorEnvelope(
  code: string,
  retryable: boolean,
  backendErrorCode?: string | null,
  retryAfterSeconds?: number | null,
): ToolErrorObject {
  const base: { code: string; retryable: boolean } = { code, retryable };
  const withBackend: { code: string; retryable: boolean; backendErrorCode?: string } =
    typeof backendErrorCode === "string" && backendErrorCode.length > 0
      ? { ...base, backendErrorCode }
      : base;
  if (
    typeof retryAfterSeconds === "number" &&
    Number.isSafeInteger(retryAfterSeconds) &&
    retryAfterSeconds >= 1
  ) {
    return { ...withBackend, retryAfterSeconds };
  }
  return withBackend;
}

const LOCAL_RETRYABLE: Readonly<Record<string, boolean>> = {
  invalid_arguments: false,
  configuration_required: false,
  recovery_unavailable: false,
  authentication_required: false,
  reauthentication_required: false,
  operation_interrupted: true,
  internal_error: true,
};

function localEnvelope(code: keyof typeof LOCAL_RETRYABLE): ReadEnvelope<never> {
  return {
    ok: false,
    error: errorEnvelope(code, LOCAL_RETRYABLE[code] === true),
  };
}

function transportEnvelope(error: TransportError): ReadEnvelope<never> {
  return {
    ok: false,
    error: errorEnvelope(
      error.code,
      error.retryable,
      error.backendErrorCode,
      error.retryAfterSeconds,
    ),
  };
}

interface OwnedState {
  readonly owner: ProfileSession | null;
  readonly session: LifecycleSessionState | SessionState | null;
  readonly binding: CallBinding | null;
  readonly nullAccount: boolean;
  readonly unconfigured: boolean;
  fenced: boolean;
  closing: boolean;
  closed: boolean;
  readonly controllers: Set<AbortController>;
  readonly pending: Set<Promise<void>>;
  closeOutcome: Promise<void> | null;
}

// Native AbortSignal intrinsics captured once at module scope. Branding,
// abort-state reads, and listener operations below always run these
// intrinsics with the caller value as receiver, so shadowed/forged caller
// properties, getters, and abort reasons are never invoked or inspected.
const NATIVE_ADD_LISTENER: AbortSignal["addEventListener"] = AbortSignal.prototype.addEventListener;
const NATIVE_REMOVE_LISTENER: AbortSignal["removeEventListener"] =
  AbortSignal.prototype.removeEventListener;

/**
 * Read abort state through the captured native aborted getter with the
 * candidate as receiver. Genuine signals yield their native boolean;
 * slotless forgeries fail the receiver brand check natively before any
 * caller code can run. Never touches reason or caller-owned properties.
 */
function readNativeAborted(value: object): boolean | null {
  let getter: unknown;
  try {
    const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(
      AbortSignal.prototype,
      "aborted",
    );
    getter = descriptor === undefined ? undefined : (descriptor as { get?: unknown }).get;
  } catch {
    return null;
  }
  if (typeof getter !== "function") {
    return null;
  }
  try {
    const aborted: unknown = Reflect.apply(getter as (this: unknown) => unknown, value, []);
    return aborted === true ? true : aborted === false ? false : null;
  } catch {
    return null;
  }
}

/**
 * Brand a caller value as a usable native AbortSignal and capture its
 * abort state in one intrinsic step. Genuine signals (aborted or not)
 * brand via the native getter; forgeries such as
 * Object.create(AbortSignal.prototype) with shadowed fields fail closed.
 * Returns null for every invalid native input.
 */
function brandSignal(value: unknown): { signal: AbortSignal; aborted: boolean } | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  try {
    if (!(value instanceof AbortSignal)) {
      return null;
    }
  } catch {
    return null;
  }
  const aborted: boolean | null = readNativeAborted(value);
  if (aborted === null) {
    return null;
  }
  return { signal: value, aborted };
}

interface OwnedLink {
  readonly owned: AbortController;
  forward: (() => void) | null;
  readonly caller: AbortSignal;
  callerAborted: boolean;
}

/**
 * Link a runtime-owned cancellation signal to the caller signal. Any
 * failure interacting with the caller signal is a local caller-shape
 * failure (invalid_arguments), never a raw rejection. The caller listener
 * is removed explicitly when the invocation settles (see makeReadMethod),
 * not only when it later aborts.
 */
function linkOwnedSignal(
  state: OwnedState,
  caller: AbortSignal,
  initiallyAborted: boolean,
): OwnedLink {
  const owned: AbortController = new AbortController();
  const link: OwnedLink = { owned, forward: null, caller, callerAborted: false };
  if (initiallyAborted) {
    owned.abort();
    link.callerAborted = true;
    return link;
  }
  const forward = (): void => {
    // The only caller-driven abort path: records genuine caller
    // cancellation before aborting the owned signal, so delivery guards
    // can distinguish it from internal recovery fencing (which aborts
    // owned signals without setting this flag).
    link.callerAborted = true;
    owned.abort();
  };
  link.forward = forward;
  try {
    Reflect.apply(NATIVE_ADD_LISTENER, caller, ["abort", forward, { once: true }]);
  } catch {
    throw new ReadRuntimeError("invalid_arguments");
  }
  state.controllers.add(owned);
  // The same observed link object is retained through invocation and
  // delivery; its callerAborted flag is the single cancellation record.
  return link;
}

function detachOwnedLink(state: OwnedState, link: OwnedLink): void {
  state.controllers.delete(link.owned);
  if (link.forward !== null) {
    try {
      Reflect.apply(NATIVE_REMOVE_LISTENER, link.caller, ["abort", link.forward]);
    } catch {
      // Listener removal is best-effort cleanup; settlement stands.
    }
  }
}

async function dispatchRead(
  state: OwnedState,
  route: ReadRoute,
  effectiveArgs: unknown,
  link: OwnedLink,
): Promise<ReadEnvelope<unknown>> {
  const owned: AbortController = link.owned;
  // Precedence: closing/closed and genuine caller cancellation beat the
  // recovery fence; fence beats residual owned-signal state; then
  // unconfigured beats null-account.
  if (state.closing || state.closed || link.callerAborted) {
    return localEnvelope("operation_interrupted");
  }
  if (state.fenced) {
    return localEnvelope("recovery_unavailable");
  }
  if (owned.signal.aborted) {
    return localEnvelope("operation_interrupted");
  }
  if (state.unconfigured || state.session === null || state.binding === null) {
    return localEnvelope("configuration_required");
  }
  if (state.nullAccount) {
    return localEnvelope("authentication_required");
  }
  const session: LifecycleSessionState | SessionState = state.session;
  if (!isBoundLifecycle(session)) {
    return localEnvelope("authentication_required");
  }
  const binding: CallBinding = state.binding;
  const invocation: Promise<ReadEnvelope<unknown>> = (async () => {
    try {
      const data: unknown = await invokeBoundRead(
        session,
        binding,
        route,
        effectiveArgs,
        owned.signal,
      );
      // Recheck immediately before success delivery, not merely before
      // awaiting the backend: no late successful data. Genuine caller
      // cancellation (observed at link time) and close beat the recovery
      // fence, but an owned abort caused by internal fencing must not
      // overwrite the required recovery_unavailable result.
      if (state.closing || state.closed) {
        return localEnvelope("operation_interrupted");
      }
      if (link.callerAborted) {
        return localEnvelope("operation_interrupted");
      }
      if (state.fenced) {
        return localEnvelope("recovery_unavailable");
      }
      if (owned.signal.aborted) {
        return localEnvelope("operation_interrupted");
      }
      let validated: unknown;
      try {
        const checked = makeToolResult(route, { ok: true, data });
        validated = (checked.structuredContent as { data: unknown }).data;
      } catch {
        return localEnvelope("internal_error");
      }
      return { ok: true, data: validated };
    } catch (error: unknown) {
      return mapInvocationFailure(state, error);
    }
  })();
  const tracked: Promise<void> = invocation.then(
    () => undefined,
    () => undefined,
  );
  state.pending.add(tracked);
  void tracked.then(() => {
    state.pending.delete(tracked);
  });
  return invocation;
}

function isBoundLifecycle(
  session: LifecycleSessionState | SessionState,
): session is LifecycleSessionState & AuthenticatedSessionState {
  return (
    typeof (session as AuthenticatedSessionState).searchExercises === "function" &&
    typeof (session as AuthenticatedSessionState).getExercise === "function"
  );
}

async function invokeBoundRead(
  session: LifecycleSessionState & AuthenticatedSessionState,
  binding: CallBinding,
  route: ReadRoute,
  effectiveArgs: unknown,
  signal: AbortSignal,
): Promise<unknown> {
  switch (route) {
    case "search_exercises": {
      const result = await session.searchExercises(binding, effectiveArgs, signal);
      return result.data;
    }
    case "list_workouts": {
      const result = await session.listWorkouts(binding, effectiveArgs, signal);
      return result.data;
    }
    case "list_routines": {
      const result = await session.listRoutines(binding, effectiveArgs, signal);
      return result.data;
    }
    case "get_exercise": {
      const id: string = (effectiveArgs as { exerciseId: string }).exerciseId;
      const result = await session.getExercise(binding, id, signal);
      return result.data;
    }
    case "get_workout": {
      const id: string = (effectiveArgs as { workoutId: string }).workoutId;
      const result = await session.getWorkout(binding, id, signal);
      return result.data;
    }
    case "get_routine": {
      const id: string = (effectiveArgs as { routineId: string }).routineId;
      const result = await session.getRoutine(binding, id, signal);
      return result.data;
    }
  }
}

function fenceState(state: OwnedState): void {
  if (!state.fenced) {
    state.fenced = true;
    for (const owned of state.controllers) {
      try {
        owned.abort();
      } catch {
        // Aborting owned signals never fails the fencing path.
      }
    }
  }
}

/**
 * Conservative invocation mapping: known T05 failures preserve safe
 * code/retryable plus optional nonnull retry metadata and never copy
 * messages, correlation/dispatch metadata, or creation IDs. Recognized auth
 * codes and recognized interruption remain unchanged: a live caller alone
 * never establishes corrupt/unsupported storage or permanently unavailable
 * auth, so operation_interrupted is preserved rather than inferred into
 * permanent recovery. Established unsafe owner/state conditions (storage
 * failures, corrupt/unsupported session state) fence this runtime as
 * recovery_unavailable; future valid calls return the same unavailable
 * code until explicit close. Unexpected faults are internal_error.
 */
function mapInvocationFailure(state: OwnedState, error: unknown): ReadEnvelope<never> {
  if (isTransportError(error)) {
    if (error.code === "operation_interrupted") {
      return localEnvelope("operation_interrupted");
    }
    return transportEnvelope(error);
  }
  if (isSessionError(error)) {
    if (error.code === "authentication_required" || error.code === "reauthentication_required") {
      return localEnvelope(error.code);
    }
    if (error.code === "operation_interrupted") {
      return localEnvelope("operation_interrupted");
    }
    fenceState(state);
    return localEnvelope("recovery_unavailable");
  }
  if (isStorageError(error)) {
    fenceState(state);
    return localEnvelope("recovery_unavailable");
  }
  if (isReadRuntimeError(error)) {
    fenceState(state);
    return localEnvelope("recovery_unavailable");
  }
  return localEnvelope("internal_error");
}

function makeReadMethod<T>(
  state: OwnedState,
  route: ReadRoute,
): (args: unknown, signal: AbortSignal) => Promise<ReadEnvelope<T>> {
  return async (args: unknown, signal: AbortSignal): Promise<ReadEnvelope<T>> => {
    // Brand the native caller signal and capture its abort state through
    // the native getter, then validate matching T03 tool arguments before
    // any auth work or dispatch. Forged signals fail locally here.
    const branded: { signal: AbortSignal; aborted: boolean } | null = brandSignal(signal);
    if (branded === null) {
      return localEnvelope("invalid_arguments");
    }
    let effective: unknown;
    try {
      effective = parseArguments(route, args);
    } catch {
      return localEnvelope("invalid_arguments");
    }
    let link: OwnedLink;
    try {
      link = linkOwnedSignal(state, branded.signal, branded.aborted);
    } catch {
      return localEnvelope("invalid_arguments");
    }
    try {
      const outcome: ReadEnvelope<unknown> = await dispatchRead(state, route, effective, link);
      // Final outer delivery fence after awaited dispatch: a queued
      // abort/close cannot still deliver success, and internal fencing
      // is never overwritten by its own owned-signal abort.
      if (state.closing || state.closed) {
        return localEnvelope("operation_interrupted");
      }
      if (link.callerAborted) {
        return localEnvelope("operation_interrupted");
      }
      if (state.fenced) {
        return localEnvelope("recovery_unavailable");
      }
      if (link.owned.signal.aborted) {
        return localEnvelope("operation_interrupted");
      }
      if (outcome.ok) {
        // Data was validated against its matching result contract above.
        return { ok: true, data: outcome.data as T };
      }
      return outcome;
    } finally {
      detachOwnedLink(state, link);
    }
  };
}

function toCallBinding(startup: ValidatedStartup): CallBinding {
  return Object.freeze({
    origin: startup.binding.origin,
    accountUuid: startup.binding.accountUuid,
    sessionGeneration: startup.binding.sessionGeneration,
    profileGenerationId: startup.binding.profileGenerationId,
  });
}

async function closeState(state: OwnedState): Promise<void> {
  state.closing = true;
  for (const owned of state.controllers) {
    try {
      owned.abort();
    } catch {
      // Owned abort never fails close.
    }
  }
  const outstanding: Array<Promise<void>> = [...state.pending];
  if (outstanding.length > 0) {
    await Promise.allSettled(outstanding);
  }
  // Invalidate the retained session facade before releasing the owner so
  // no further bearer selection can occur during owner teardown. If
  // invalidation faults, the safe owner release is still attempted; any
  // failure stays a sanitized internal_error, never a false success.
  let failed = false;
  const session: LifecycleSessionState | SessionState | null = state.session;
  if (session !== null) {
    try {
      session.invalidate();
    } catch {
      failed = true;
    }
  }
  const owner: ProfileSession | null = state.owner;
  if (owner !== null) {
    try {
      await owner.close();
    } catch {
      failed = true;
    }
  }
  state.controllers.clear();
  if (failed) {
    failInternal();
  }
  state.closed = true;
}

function createRuntime(state: OwnedState): ReadRuntime {
  const searchExercises: ReadRuntime["searchExercises"] = makeReadMethod<SearchExercisesPage>(
    state,
    "search_exercises",
  );
  const getExercise: ReadRuntime["getExercise"] = makeReadMethod<ExerciseRecord>(
    state,
    "get_exercise",
  );
  const listWorkouts: ReadRuntime["listWorkouts"] = makeReadMethod<WorkoutListPage>(
    state,
    "list_workouts",
  );
  const getWorkout: ReadRuntime["getWorkout"] = makeReadMethod<WorkoutRecord>(state, "get_workout");
  const listRoutines: ReadRuntime["listRoutines"] = makeReadMethod<RoutineListPage>(
    state,
    "list_routines",
  );
  const getRoutine: ReadRuntime["getRoutine"] = makeReadMethod<RoutineRecord>(state, "get_routine");
  const close = async (): Promise<void> => {
    if (state.closeOutcome !== null) {
      return state.closeOutcome;
    }
    // Synchronously fence admission: concurrent/duplicate close shares one
    // terminal outcome. Successful close stays successful; failed close
    // stays a safe sanitized internal_error rejection, never a false
    // success or a raw native fault.
    const outcome: Promise<void> = (async (): Promise<void> => {
      try {
        await closeState(state);
      } catch (error: unknown) {
        if (isReadRuntimeError(error)) {
          throw error;
        }
        throw new ReadRuntimeError("internal_error");
      }
    })();
    state.closeOutcome = outcome;
    return outcome;
  };
  return {
    searchExercises,
    getExercise,
    listWorkouts,
    getWorkout,
    listRoutines,
    getRoutine,
    close,
  };
}

function createUnconfiguredState(): OwnedState {
  return {
    owner: null,
    session: null,
    binding: null,
    nullAccount: false,
    unconfigured: true,
    fenced: false,
    closing: false,
    closed: false,
    controllers: new Set<AbortController>(),
    pending: new Set<Promise<void>>(),
    closeOutcome: null,
  };
}

/**
 * Open a trusted read runtime. Invalid factory caller shape, unknown or
 * invalid fields, and configPath syntax/normalization failures reject with
 * ReadRuntimeError(invalid_arguments). A missing selection or genuinely
 * absent selected config file resolves to a safe unconfigured runtime whose
 * reads report configuration_required. Malformed/unsafe/incompatible
 * selected config/descriptor metadata rejects with
 * ReadRuntimeError(configuration_required) with no fallback opening.
 * Storage opening failure rejects with
 * ReadRuntimeError(recovery_unavailable); auth-state corruption or an
 * unsupported session version likewise, while unknown factory faults reject
 * with ReadRuntimeError(internal_error). A startup failure after acquiring
 * the profile closes the owner before rejecting; if that close itself
 * fails, the factory reports internal_error.
 */
export async function openReadRuntime(options: ReadRuntimeOptions): Promise<ReadRuntime> {
  return (await openReadRuntimeSnapshot(options)).runtime;
}

/** Private S2 composition: exactly one validated startup snapshot for both layers. */
export async function openReadRuntimeSnapshot(options: ReadRuntimeOptions): Promise<{
  readonly runtime: ReadRuntime;
  readonly maxToolResultBytes: number;
}> {
  const selected: string | undefined = captureFactorySelection(options);
  if (selected === undefined) {
    return {
      runtime: createRuntime(createUnconfiguredState()),
      maxToolResultBytes: DEFAULT_MAX_TOOL_RESULT_BYTES,
    };
  }
  const configLoad = await loadProtectedFile(selected, CONFIG_MAX_BYTES);
  if (configLoad.status === "missing") {
    return {
      runtime: createRuntime(createUnconfiguredState()),
      maxToolResultBytes: DEFAULT_MAX_TOOL_RESULT_BYTES,
    };
  }
  // Complete config schema and selector/separation validation happens
  // before any descriptor file access, so an invalid metadata selector can
  // never direct reads at operation evidence or other private files. Once
  // a valid config exists, an absent descriptor is fatal.
  let startup: ValidatedStartup;
  try {
    const configRecord: Record<string, unknown> = parseStrictMetadataJson(configLoad.bytes);
    const config: ValidatedConfig = validateConfigRecord(configRecord);
    assertFileSeparation(config, selected);
    const descriptorLoad = await loadProtectedFile(config.descriptorPath, DESCRIPTOR_MAX_BYTES);
    if (descriptorLoad.status === "missing") {
      failConfiguration();
    }
    const descriptorRecord: Record<string, unknown> = parseStrictMetadataJson(
      (descriptorLoad as { bytes: Uint8Array }).bytes,
    );
    const binding: ValidatedBinding = validateDescriptorRecord(
      descriptorRecord,
      config.canonicalOrigin,
    );
    startup = combineStartup(config, binding);
  } catch (error: unknown) {
    if (isReadRuntimeError(error)) {
      throw error;
    }
    failConfiguration();
  }
  let owner: ProfileSession;
  try {
    owner = await openProfile({
      profileRoot: startup.profileRoot,
      anchorRoot: startup.anchorRoot,
      secretServiceBusAddress: startup.secretServiceBusAddress,
      ...(startup.timeoutMs === undefined ? {} : { timeoutMs: startup.timeoutMs }),
      expectedBinding: {
        origin: startup.binding.origin,
        accountUuid: startup.binding.accountUuid,
        sessionGeneration: startup.binding.sessionGeneration,
        profileGenerationId: startup.binding.profileGenerationId,
      },
    });
  } catch (error: unknown) {
    if (isReadRuntimeError(error)) {
      throw error;
    }
    failRecovery();
  }
  const acquired: ProfileSession = owner;
  const releaseOwner = async (): Promise<void> => {
    try {
      await acquired.close();
    } catch {
      failInternal();
    }
  };
  const nullAccount: boolean = startup.binding.accountUuid === null;
  let session: LifecycleSessionState | SessionState;
  try {
    if (nullAccount) {
      session = await openSessionState({ profile: acquired });
    } else {
      const budgets: ValidatedStartup["budgets"] = startup.budgets;
      session = await openLifecycleSessionState({
        profile: acquired,
        transportConfig: {
          origin: startup.canonicalOrigin,
          ...(budgets === undefined ? {} : { budgets }),
        },
      });
    }
  } catch (error: unknown) {
    await releaseOwner();
    if (isReadRuntimeError(error)) {
      throw error;
    }
    if (isSessionError(error) || isStorageError(error)) {
      failRecovery();
    }
    failInternal();
  }
  const opened: LifecycleSessionState | SessionState = session;
  const state: OwnedState = {
    owner: acquired,
    session: opened,
    binding: toCallBinding(startup),
    nullAccount,
    unconfigured: false,
    fenced: false,
    closing: false,
    closed: false,
    controllers: new Set<AbortController>(),
    pending: new Set<Promise<void>>(),
    closeOutcome: null,
  };
  return { runtime: createRuntime(state), maxToolResultBytes: startup.maxToolResultBytes };
}
