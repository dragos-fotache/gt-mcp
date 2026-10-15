/**
 * T06-S1 session state — private session-vault reader, initial
 * service-grant installation, exact expiry decisions, and T05-compatible
 * captured-identity hooks.
 *
 * Internal partial capability only: version-1 grant/no-grant storage with
 * read-only hooks. No refresh, lifecycle, browser, MCP, or write wiring.
 * The caller-owned T04 profile is never closed, reopened, or reacquired
 * here; only its documented methods are used.
 */

import type {
  BearerRouteName,
  CallBinding,
  CredentialMaterial,
  DispatchSummary,
  SessionHooks,
} from "../http/index.js";
import type { ProfileSession, StorageBinding } from "../storage/index.js";
import { SessionError } from "./errors.js";
import {
  assertBinding,
  assertClockMs,
  assertSignal,
  bindingsEqual,
  captureEntries,
  copyByteView,
  isBindingEqualToCapture,
  throwIfAborted,
} from "./validate.js";
import type { ParsedBinding } from "./validate.js";
import { decodeVaultBytes, encodeVaultBytes, parseServiceGrant } from "./vault.js";
import type { VaultGrantRecord } from "./vault.js";

export interface SessionClock {
  nowMs(): number;
}

export interface SessionStateOptions {
  readonly profile: ProfileSession;
  readonly clock?: SessionClock;
}

export interface SessionState {
  readonly binding: StorageBinding;
  readonly hooks: SessionHooks;
  installInitialGrant(
    captured: CallBinding,
    serviceGrantBytes: Uint8Array,
    signal: AbortSignal,
  ): Promise<StorageBinding>;
  invalidate(): void;
}

type ClockCapture = { readonly fn: () => number } | null;

const READ_ROUTES: ReadonlySet<string> = new Set([
  "search_exercises",
  "get_exercise",
  "list_workouts",
  "get_workout",
  "list_routines",
  "get_routine",
]);

const MUTATION_ROUTES: ReadonlySet<string> = new Set([
  "create_draft",
  "populate_draft",
  "save_routine",
]);

const ADMITTED_DISPATCH: ReadonlySet<string> = new Set([
  "search_exercises",
  "get_exercise",
  "list_workouts",
  "get_workout",
  "list_routines",
  "get_routine",
  "auth_challenge",
  "auth_exchange",
]);

const ROUTE_TABLE: Readonly<Record<string, { method: string; keyKind: string | null }>> = {
  search_exercises: { method: "GET", keyKind: null },
  get_exercise: { method: "GET", keyKind: null },
  list_workouts: { method: "GET", keyKind: null },
  get_workout: { method: "GET", keyKind: null },
  list_routines: { method: "GET", keyKind: null },
  get_routine: { method: "GET", keyKind: null },
  create_draft: { method: "POST", keyKind: "resource" },
  populate_draft: { method: "PUT", keyKind: "resource" },
  save_routine: { method: "POST", keyKind: "resource" },
  auth_challenge: { method: "POST", keyKind: null },
  auth_exchange: { method: "POST", keyKind: "auth" },
  auth_refresh: { method: "POST", keyKind: "auth" },
  auth_logout: { method: "POST", keyKind: null },
  account_status: { method: "POST", keyKind: null },
};

function failArguments(): never {
  throw new SessionError("invalid_arguments");
}

function failInterrupted(): never {
  throw new SessionError("operation_interrupted");
}

/** Read a method without invoking accessors: own descriptor, then one prototype level. */
function captureMethod(owner: object, name: string): (...args: Array<never>) => unknown {
  const readFrom = (target: object): unknown => {
    const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(
      target,
      name,
    );
    if (descriptor === undefined) {
      return undefined;
    }
    if (typeof descriptor.get === "function" || typeof descriptor.set === "function") {
      failArguments();
    }
    return (descriptor as { value: unknown }).value;
  };
  let candidate: unknown = readFrom(owner);
  if (candidate === undefined) {
    const proto: unknown = Object.getPrototypeOf(owner);
    if (proto !== null && (typeof proto === "object" || typeof proto === "function")) {
      candidate = readFrom(proto as object);
    }
  }
  if (typeof candidate !== "function") {
    failArguments();
  }
  return candidate as (...args: Array<never>) => unknown;
}

/**
 * Read the owner's documented binding. The T04 binding may be an own data
 * property or an own getter on the trusted profile capability; a getter is
 * invoked once here with the owner as receiver and its result validated.
 * Ordinary data arguments/bindings never take this path and still reject
 * accessor invocation.
 */
function captureOwnerBinding(owner: object): ParsedBinding {
  const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(
    owner,
    "binding",
  );
  if (descriptor !== undefined && typeof descriptor.get === "function") {
    let value: unknown;
    try {
      value = Reflect.apply(descriptor.get, owner, []);
    } catch {
      failArguments();
    }
    return assertBinding(value);
  }
  if (descriptor === undefined) {
    // Guarded direct read for capability objects that expose the documented
    // binding without an own property.
    try {
      return assertBinding((owner as { binding: unknown }).binding);
    } catch (error) {
      if (error instanceof SessionError) {
        throw error;
      }
      failArguments();
    }
  }
  if (typeof descriptor.set === "function") {
    failArguments();
  }
  return assertBinding((descriptor as { value: unknown }).value);
}

/**
 * Capture the trusted clock's nowMs receiver method. SessionClock is a
 * trusted capability: nowMs may be an own function property or a prototype
 * method (for example a class instance), resolved once here with its
 * receiver preserved. Ordinary data arguments keep their exact-shape rules.
 */
function captureClock(clockValue: unknown): ClockCapture {
  if (clockValue === undefined) {
    return null;
  }
  if (typeof clockValue !== "object" || clockValue === null) {
    failArguments();
  }
  const readMethod = (target: object): unknown => {
    const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(
      target,
      "nowMs",
    );
    if (descriptor === undefined) {
      return undefined;
    }
    if (
      typeof descriptor.get === "function" ||
      typeof descriptor.set === "function" ||
      typeof (descriptor as { value: unknown }).value !== "function"
    ) {
      failArguments();
    }
    return (descriptor as { value: unknown }).value;
  };
  let fn: unknown = readMethod(clockValue);
  if (fn === undefined) {
    const proto: unknown = Object.getPrototypeOf(clockValue);
    if (proto !== null && (typeof proto === "object" || typeof proto === "function")) {
      fn = readMethod(proto);
    }
  }
  if (typeof fn !== "function") {
    failArguments();
  }
  const receiver: unknown = clockValue;
  const method: (this: unknown) => number = fn as (this: unknown) => number;
  return {
    fn: () => method.call(receiver),
  };
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  for (let index = 0; index < a.byteLength; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }
  return true;
}

function freezeBinding(binding: ParsedBinding): StorageBinding {
  return Object.freeze({
    origin: binding.origin,
    accountUuid: binding.accountUuid,
    sessionGeneration: binding.sessionGeneration,
    profileGenerationId: binding.profileGenerationId,
  });
}

function toCallBinding(binding: ParsedBinding): CallBinding {
  return {
    origin: binding.origin,
    accountUuid: binding.accountUuid,
    sessionGeneration: binding.sessionGeneration,
    profileGenerationId: binding.profileGenerationId,
  };
}

export async function openSessionState(options: SessionStateOptions): Promise<SessionState> {
  // Synchronous capture before yielding: exact option shape, method
  // receivers, option values. Caller-owned objects are never mutated/frozen.
  const entries = captureEntries(options);
  let hasProfile = false;
  let hasClock = false;
  for (const entry of entries) {
    if (entry[0] === "profile") {
      hasProfile = true;
    } else if (entry[0] === "clock") {
      hasClock = true;
    } else {
      failArguments();
    }
  }
  if (!hasProfile) {
    failArguments();
  }
  let profileRaw: unknown = undefined;
  let clockRaw: unknown = undefined;
  for (const entry of entries) {
    if (entry[0] === "profile") {
      profileRaw = entry[1];
    } else if (entry[0] === "clock") {
      clockRaw = entry[1];
    }
  }
  if (typeof profileRaw !== "object" || profileRaw === null) {
    failArguments();
  }
  const owner: object = profileRaw;
  const readVaultFn = captureMethod(owner, "readVaultBytes");
  const bindAccountFn = captureMethod(owner, "bindAccount");
  const ownerBinding: ParsedBinding = captureOwnerBinding(owner);
  const clock: ClockCapture = hasClock ? captureClock(clockRaw) : null;

  // Opening establishes no facade; owner failures propagate unchanged.
  const vaultResult: unknown = await Reflect.apply(
    readVaultFn as (this: unknown) => unknown,
    owner,
    [],
  );
  if (!(vaultResult instanceof Uint8Array)) {
    throw new SessionError("operation_interrupted");
  }
  const vaultBytes: Uint8Array = new Uint8Array(vaultResult);

  const decoded = decodeVaultBytes(vaultBytes, ownerBinding);
  return createSession(
    owner,
    readVaultFn,
    bindAccountFn,
    ownerBinding,
    vaultBytes,
    decoded.grant,
    clock,
  );
}

interface FacadeRefs {
  readonly owner: object;
  readonly readVaultFn: (...args: Array<never>) => unknown;
  readonly bindAccountFn: (...args: Array<never>) => unknown;
  readonly capture: ParsedBinding;
  readonly vaultSnapshot: Uint8Array;
  readonly grant: VaultGrantRecord | null;
  readonly clock: ClockCapture;
  fenced: boolean;
  /** Monotonic fence epoch: distinguishes the internal transition fence
   * from an explicit external invalidate arriving mid-commit. */
  fenceCount: number;
  tail: Promise<void>;
}

function createSession(
  owner: object,
  readVaultFn: (...args: Array<never>) => unknown,
  bindAccountFn: (...args: Array<never>) => unknown,
  capture: ParsedBinding,
  vaultSnapshot: Uint8Array,
  grant: VaultGrantRecord | null,
  clock: ClockCapture,
): SessionState {
  const refs: FacadeRefs = {
    owner,
    readVaultFn,
    bindAccountFn,
    capture,
    vaultSnapshot: new Uint8Array(vaultSnapshot),
    grant,
    clock,
    fenced: false,
    fenceCount: 0,
    tail: Promise.resolve(),
  };

  const fence = (): void => {
    refs.fenced = true;
    refs.fenceCount += 1;
  };

  const nowMs = (): number => {
    let raw: unknown;
    try {
      raw = refs.clock === null ? Date.now() : refs.clock.fn();
    } catch {
      throw new SessionError("invalid_arguments");
    }
    return assertClockMs(raw);
  };

  /** Serialize facade async operations; prior rejections never break the chain. */
  const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
    const run: Promise<T> = refs.tail.then(work, work);
    refs.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  const readOwnerVault = async (): Promise<Uint8Array> => {
    let result: unknown;
    try {
      result = await Reflect.apply(refs.readVaultFn, refs.owner, []);
    } catch (error) {
      fence();
      throw error;
    }
    if (!(result instanceof Uint8Array)) {
      fence();
      failInterrupted();
    }
    return new Uint8Array(result);
  };

  /** Establish owner validity and unchanged captured vault; fence closed on drift. */
  const checkOwnerUnchanged = async (): Promise<void> => {
    const current: Uint8Array = await readOwnerVault();
    if (refs.fenced) {
      failInterrupted();
    }
    if (!bytesEqual(current, refs.vaultSnapshot)) {
      fence();
      failInterrupted();
    }
  };

  /**
   * Compare a detached entry snapshot against the live capture. The snapshot
   * is parsed before yielding, so no caller-owned object is reread after an
   * await. Malformed hook bindings are fence failures, not local arg
   * repairs: T05 maps every hook failure to operation_interrupted.
   */
  const assertLiveCapture = (snapshot: ParsedBinding): void => {
    if (!bindingsEqual(snapshot, refs.capture)) {
      fence();
      failInterrupted();
    }
    if (refs.fenced) {
      failInterrupted();
    }
  };

  const isCurrent = (binding: CallBinding): boolean => {
    if (refs.fenced) {
      return false;
    }
    return isBindingEqualToCapture(binding, refs.capture);
  };

  const checkBinding = async (
    point: "pre-send" | "pre-delivery",
    binding: CallBinding,
    signal: AbortSignal,
  ): Promise<void> => {
    if (point !== "pre-send" && point !== "pre-delivery") {
      throw new SessionError("invalid_arguments");
    }
    const caller: AbortSignal = assertSignal(signal);
    // Detached entry snapshot before yielding; the queued work below never
    // rereads the mutable caller object. Malformed captures fence per hook mapping.
    let snapshot: ParsedBinding;
    try {
      snapshot = assertBinding(binding);
    } catch {
      fence();
      throw new SessionError("operation_interrupted");
    }
    throwIfAborted(caller);
    return enqueue(async () => {
      throwIfAborted(caller);
      assertLiveCapture(snapshot);
      throwIfAborted(caller);
      await checkOwnerUnchanged();
      if (refs.fenced) {
        failInterrupted();
      }
      throwIfAborted(caller);
    });
  };

  const selectCredential = async (
    binding: CallBinding,
    route: BearerRouteName,
    signal: AbortSignal,
  ): Promise<CredentialMaterial | null> => {
    if (typeof route !== "string" || (!READ_ROUTES.has(route) && !MUTATION_ROUTES.has(route))) {
      throw new SessionError("invalid_arguments");
    }
    const caller: AbortSignal = assertSignal(signal);
    let snapshot: ParsedBinding;
    try {
      snapshot = assertBinding(binding);
    } catch {
      fence();
      throw new SessionError("operation_interrupted");
    }
    throwIfAborted(caller);
    return enqueue(async (): Promise<CredentialMaterial | null> => {
      throwIfAborted(caller);
      assertLiveCapture(snapshot);
      throwIfAborted(caller);
      await checkOwnerUnchanged();
      if (refs.fenced) {
        failInterrupted();
      }
      throwIfAborted(caller);
      if (MUTATION_ROUTES.has(route)) {
        // S1 keeps writes unavailable: no bearer is ever selected for mutations.
        return null;
      }
      const held: VaultGrantRecord | null = refs.grant;
      if (held === null) {
        return null;
      }
      const now: number = nowMs();
      if (now >= held.refreshExpiresMs) {
        // S1 has no refresh: an expired refresh yields no credential.
        return null;
      }
      if (now >= held.accessExpiresMs) {
        // Expired access is never selected, though it may remain stored.
        return null;
      }
      return Object.freeze({
        bearerToken: held.accessToken,
        forBinding: Object.freeze({ ...toCallBinding(refs.capture) }),
      });
    });
  };

  const beforeDispatch = async (
    binding: CallBinding,
    summary: DispatchSummary,
    signal: AbortSignal,
  ): Promise<void> => {
    const caller: AbortSignal = assertSignal(signal);
    let snapshot: ParsedBinding;
    try {
      snapshot = assertBinding(binding);
    } catch {
      fence();
      throw new SessionError("operation_interrupted");
    }
    validateSummary(summary);
    // Detached primitives before yielding; the queued work never rereads the
    // mutable caller summary object (target/identity stay out of diagnostics).
    const label: string = (summary as DispatchSummary).routeLabel;
    throwIfAborted(caller);
    return enqueue(async () => {
      throwIfAborted(caller);
      assertLiveCapture(snapshot);
      throwIfAborted(caller);
      await checkOwnerUnchanged();
      if (refs.fenced) {
        failInterrupted();
      }
      throwIfAborted(caller);
      if (!ADMITTED_DISPATCH.has(label)) {
        // Mutations, refresh/logout, and account_status require later slices.
        failInterrupted();
      }
    });
  };

  const installInitialGrant = async (
    captured: CallBinding,
    serviceGrantBytes: Uint8Array,
    signal: AbortSignal,
  ): Promise<StorageBinding> => {
    const caller: AbortSignal = assertSignal(signal);
    let preAuth: ParsedBinding;
    try {
      preAuth = assertBinding(captured);
    } catch {
      throw new SessionError("invalid_arguments");
    }
    // Copy byte arguments and capture bindings before yielding.
    const bodyCopy: Uint8Array = copyByteView(serviceGrantBytes);
    throwIfAborted(caller);
    return enqueue(async () => {
      throwIfAborted(caller);
      if (refs.fenced) {
        failInterrupted();
      }
      if (!bindingsEqual(preAuth, refs.capture)) {
        // Not this invocation's pre-auth binding; no persistence, no fence.
        failInterrupted();
      }
      if (refs.capture.accountUuid !== null || refs.grant !== null) {
        // Already-bound profiles (even signed out or the same UUID) are not
        // replaceable in S1; same-account replacement belongs to S5.
        failInterrupted();
      }
      const grant = parseServiceGrant(bodyCopy);
      const now: number = nowMs();
      if (now >= grant.refreshExpiresMs) {
        // Expired refresh is rejected with no vault/binding mutation.
        throw new SessionError("reauthentication_required");
      }
      throwIfAborted(caller);
      // Re-establish that no external vault change slipped in before commit.
      await checkOwnerUnchanged();
      if (refs.fenced) {
        failInterrupted();
      }
      throwIfAborted(caller);
      // Immediate pre-commit expiry recheck: a refresh deadline that expired
      // while queued or during owner validation must not bypass rejection.
      // No persistence and no fence on this path.
      const commitNow: number = nowMs();
      if (commitNow >= grant.refreshExpiresMs) {
        throw new SessionError("reauthentication_required");
      }
      // Fence this facade synchronously before the storage transition: no
      // await sits between the fence and the bindAccount invocation below.
      const fenceMark: number = refs.fenceCount;
      fence();
      const replacement: Uint8Array = encodeVaultBytes(
        {
          origin: refs.capture.origin,
          accountUuid: grant.accountUuid,
          sessionGeneration: 1,
          profileGenerationId: refs.capture.profileGenerationId,
        },
        {
          accountUuid: grant.accountUuid,
          accessToken: grant.accessToken,
          accessExpiresAt: grant.accessExpiresAt,
          accessExpiresMs: grant.accessExpiresMs,
          refreshToken: grant.refreshToken,
          refreshExpiresAt: grant.refreshExpiresAt,
          refreshExpiresMs: grant.refreshExpiresMs,
        },
      );
      // The storage commit cannot be retracted once begun: await it to
      // completion even if cancellation arrives mid-commit. The original
      // safe T04 StorageError propagates; the facade stays fenced and
      // private state is never deleted or reinitialized here.
      const committed: unknown = await Reflect.apply(refs.bindAccountFn, refs.owner, [
        grant.accountUuid,
        replacement,
      ]);
      if (caller.aborted || refs.fenceCount !== fenceMark + 1) {
        // Suppress success after mid-commit signal cancellation or an explicit
        // external invalidate during the unresolved commit. Durable state is
        // preserved for explicit trusted reopen and the fence stays
        // permanent. The internal transition fence alone (epoch unchanged)
        // still permits ordinary success below. No late delivery.
        failInterrupted();
      }
      let next: ParsedBinding;
      try {
        next = assertBinding(committed);
      } catch {
        failInterrupted();
      }
      if (
        next.origin !== refs.capture.origin ||
        next.accountUuid !== grant.accountUuid ||
        next.sessionGeneration !== 1 ||
        next.profileGenerationId !== refs.capture.profileGenerationId
      ) {
        failInterrupted();
      }
      return freezeBinding(next);
    });
  };

  const invalidate = (): void => {
    // Synchronous, idempotent, permanent local cancellation fence. No IO,
    // no credential clearing: not sign-out/logout.
    fence();
  };

  const binding: StorageBinding = freezeBinding(capture);
  const hooks: SessionHooks = Object.freeze({
    isCurrent,
    checkBinding,
    selectCredential,
    beforeDispatch,
  });
  return Object.freeze({
    binding,
    hooks,
    installInitialGrant,
    invalidate,
  });
}

function validateSummary(summary: DispatchSummary): void {
  const entries = captureEntries(summary);
  const allowed: ReadonlyArray<string> = [
    "routeLabel",
    "method",
    "target",
    "bodyByteLength",
    "keyKind",
    "attempt",
  ];
  for (const entry of entries) {
    if (!allowed.includes(entry[0])) {
      failArguments();
    }
  }
  let routeLabel: unknown;
  let method: unknown;
  let target: unknown;
  let bodyByteLength: unknown;
  let keyKind: unknown;
  let attempt: unknown;
  let count = 0;
  for (const entry of entries) {
    count += 1;
    if (entry[0] === "routeLabel") {
      routeLabel = entry[1];
    } else if (entry[0] === "method") {
      method = entry[1];
    } else if (entry[0] === "target") {
      target = entry[1];
    } else if (entry[0] === "bodyByteLength") {
      bodyByteLength = entry[1];
    } else if (entry[0] === "keyKind") {
      keyKind = entry[1];
    } else if (entry[0] === "attempt") {
      attempt = entry[1];
    }
  }
  if (count !== allowed.length) {
    failArguments();
  }
  // Recognized labels are exactly the fixed T05 table's own keys: inherited
  // Object property names (toString, constructor, ...) are unknown summaries
  // and fail invalid_arguments without acquiring route meaning.
  if (
    typeof routeLabel !== "string" ||
    !Object.prototype.hasOwnProperty.call(ROUTE_TABLE, routeLabel)
  ) {
    failArguments();
  }
  const table = ROUTE_TABLE[routeLabel as string] as { method: string; keyKind: string | null };
  if (method !== table.method) {
    failArguments();
  }
  // Target shape is checked but never copied into diagnostics or state.
  if (typeof target !== "string" || target.length === 0) {
    failArguments();
  }
  if (
    typeof bodyByteLength !== "number" ||
    !Number.isSafeInteger(bodyByteLength) ||
    bodyByteLength < 0
  ) {
    failArguments();
  }
  if (keyKind !== table.keyKind) {
    failArguments();
  }
  if (typeof attempt !== "number" || !Number.isSafeInteger(attempt) || attempt < 1) {
    failArguments();
  }
}
