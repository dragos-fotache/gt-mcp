/**
 * T06-S2 durable refresh rotation — private refresh-session facade with
 * version-2 pending evidence, serialized single-attempt rotation, and
 * internal T05 dispatch hooks.
 *
 * Internal partial capability only: refresh-only rotation with blocked
 * recovery state. No restart replay, second-key retry, recovered-grant
 * follow-on rotation, resource 401 orchestration, sign-out/replacement,
 * initial login, browser, CLI/MCP/config guard, or cleanup wiring. S1
 * exports/behavior are unchanged; version-1 state is only ever upgraded
 * to version2 inside the same atomic commit that installs pending
 * evidence. Opening never writes, migrates, generates keys, dispatches,
 * or treats pending as settled.
 *
 * The caller-owned T04 profile is never closed, reopened, or reacquired
 * here; only its documented readVaultBytes/commit methods are used, and
 * operation bytes are never read, parsed, or modified.
 */

import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import { createBackendTransport } from "../http/index.js";
import type {
  BackendTransport,
  CallBinding,
  CredentialMaterial,
  DispatchSummary,
  SessionHooks,
  TrustedTransportConfig,
} from "../http/index.js";
import type { ProfileSession, StorageBinding } from "../storage/index.js";
import { SessionError } from "./errors.js";
import type { SessionClock } from "./session.js";
import {
  assertBinding,
  assertClockMs,
  assertSignal,
  bindingsEqual,
  captureEntries,
  isBindingEqualToCapture,
  throwIfAborted,
} from "./validate.js";
import type { ParsedBinding } from "./validate.js";
import {
  buildRefreshRequestBytes,
  decodeCanonicalBase64,
  decodeRefreshVaultBytes,
  encodeBodyBase64,
  encodeRefreshVaultBytes,
  parseServiceGrant,
} from "./vault.js";
import type { VaultGrantRecord, VaultPendingRefresh } from "./vault.js";

export interface RefreshSessionStateOptions {
  readonly profile: ProfileSession;
  readonly transportConfig: TrustedTransportConfig;
  readonly clock?: SessionClock;
}

export interface RefreshSessionState {
  readonly binding: StorageBinding;
  rotateRefresh(captured: CallBinding, signal: AbortSignal): Promise<void>;
  invalidate(): void;
}

type ClockCapture = { readonly fn: () => number } | null;

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
 * method with its receiver preserved. Ordinary data arguments keep their
 * exact-shape rules.
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

// ---------------------------------------------------------------------------
// Config-origin normalization (mirrors accepted T05 raw gates so the
// comparison below uses the same canonical origin T05 dispatches to).
// Runs only after the T05 factory has authoritatively validated the
// config, so a factory-accepted origin always normalizes here and bad
// configs propagate their safe TransportError untouched.
// ---------------------------------------------------------------------------

function hasControlOrWhitespace(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    const unit: number = text.charCodeAt(index);
    if (unit <= 0x20 || unit === 0x7f || (unit >= 0x80 && unit <= 0x9f)) {
      return true;
    }
  }
  return false;
}

function rawBareHost(authority: string): string {
  if (authority.startsWith("[")) {
    const end: number = authority.indexOf("]");
    if (end < 0) {
      failArguments();
    }
    const tail: string = authority.slice(end + 1);
    if (tail !== "" && !/^:[0-9]+$/.test(tail)) {
      failArguments();
    }
    return authority.slice(1, end);
  }
  const colon: number = authority.indexOf(":");
  if (colon >= 0 && authority.indexOf(":", colon + 1) >= 0) {
    failArguments();
  }
  return colon < 0 ? authority : authority.slice(0, colon);
}

function canonicalizeConfigOrigin(raw: unknown, allowLoopback: boolean): string {
  if (typeof raw !== "string" || raw.length === 0) {
    failArguments();
  }
  const schemeEnd: number = raw.indexOf("://");
  if (schemeEnd < 0) {
    failArguments();
  }
  const scheme: string = raw.slice(0, schemeEnd);
  const rest: string = raw.slice(schemeEnd + 3);
  const isHttp: boolean = scheme === "http";
  if ((scheme !== "https" && !isHttp) || scheme !== scheme.toLowerCase()) {
    failArguments();
  }
  if (
    rest.length === 0 ||
    rest.includes("@") ||
    rest.includes("\\") ||
    rest.includes("?") ||
    rest.includes("#") ||
    hasControlOrWhitespace(raw)
  ) {
    failArguments();
  }
  let authority: string = rest;
  if (rest.endsWith("/")) {
    if (rest.length === 1 || rest.slice(0, -1).includes("/")) {
      failArguments();
    }
    authority = rest.slice(0, -1);
  } else if (rest.includes("/")) {
    failArguments();
  }
  if (authority.length === 0 || authority.endsWith(":")) {
    failArguments();
  }
  const bare: string = rawBareHost(authority);
  let parsed: URL;
  try {
    parsed = new URL(`${scheme}://${authority}`);
  } catch {
    failArguments();
  }
  if (
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    failArguments();
  }
  const hostname: string = parsed.hostname;
  if (hostname === "" || hostname.endsWith(".")) {
    failArguments();
  }
  if (parsed.port !== "") {
    if (!/^[1-9][0-9]*$/.test(parsed.port)) {
      failArguments();
    }
    const portNumber: number = Number(parsed.port);
    if (!Number.isSafeInteger(portNumber) || portNumber > 65535) {
      failArguments();
    }
  }
  if (isHttp) {
    if (allowLoopback !== true) {
      failArguments();
    }
    if (bare !== "127.0.0.1" && bare !== "::1") {
      failArguments();
    }
  }
  return parsed.origin;
}

// ---------------------------------------------------------------------------
// Facade state.
// ---------------------------------------------------------------------------

interface ActiveRotation {
  readonly snapshot: ParsedBinding;
  readonly leaderSignal: AbortSignal;
  readonly dispatch: AbortController;
  readonly outcome: Promise<void>;
}

interface RefreshRefs {
  readonly owner: object;
  readonly readVaultFn: (...args: Array<never>) => unknown;
  readonly commitFn: (...args: Array<never>) => unknown;
  readonly capture: ParsedBinding;
  readonly clock: ClockCapture;
  transport: BackendTransport | null;
  vaultSnapshot: Uint8Array;
  grant: VaultGrantRecord | null;
  pending: VaultPendingRefresh | null;
  fenced: boolean;
  rotation: ActiveRotation | null;
}

function fenceRefs(refs: RefreshRefs): void {
  refs.fenced = true;
}

function nowMs(refs: RefreshRefs): number {
  let raw: unknown;
  try {
    raw = refs.clock === null ? Date.now() : refs.clock.fn();
  } catch {
    throw new SessionError("invalid_arguments");
  }
  return assertClockMs(raw);
}

async function readOwnerVault(refs: RefreshRefs): Promise<Uint8Array> {
  let result: unknown;
  try {
    result = await Reflect.apply(refs.readVaultFn, refs.owner, []);
  } catch (error) {
    fenceRefs(refs);
    throw error;
  }
  if (!(result instanceof Uint8Array)) {
    fenceRefs(refs);
    failInterrupted();
  }
  return new Uint8Array(result);
}

/** Establish owner validity and unchanged expected vault bytes; fence closed on drift. */
async function checkOwnerMatches(refs: RefreshRefs, expected: Uint8Array): Promise<void> {
  const current: Uint8Array = await readOwnerVault(refs);
  if (refs.fenced) {
    failInterrupted();
  }
  if (!bytesEqual(current, expected)) {
    fenceRefs(refs);
    failInterrupted();
  }
}

/**
 * A T04 commit cannot be retracted once begun: await its owned completion
 * even if cancellation arrives mid-commit. A T04 failure permanently
 * fences this facade and propagates its original safe StorageError; state
 * is never cleaned or reinitialized here.
 */
async function commitVaultBytes(refs: RefreshRefs, bytes: Uint8Array): Promise<void> {
  try {
    await Reflect.apply(refs.commitFn, refs.owner, [{ vaultBytes: bytes }]);
  } catch (error) {
    fenceRefs(refs);
    throw error;
  }
}

/** Validate the T05 dispatch-summary shape without copying target/identity into state. */
function captureDispatchGate(summary: DispatchSummary): {
  readonly routeLabel: string;
  readonly method: string;
  readonly target: string;
  readonly bodyByteLength: number;
  readonly keyKind: string | null;
  readonly attempt: number;
} {
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
  if (entries.length !== allowed.length) {
    failArguments();
  }
  let routeLabel: unknown;
  let method: unknown;
  let target: unknown;
  let bodyByteLength: unknown;
  let keyKind: unknown;
  let attempt: unknown;
  for (const entry of entries) {
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
  if (
    typeof routeLabel !== "string" ||
    typeof method !== "string" ||
    typeof target !== "string" ||
    target.length === 0 ||
    typeof bodyByteLength !== "number" ||
    !Number.isSafeInteger(bodyByteLength) ||
    bodyByteLength < 0 ||
    (typeof keyKind !== "string" && keyKind !== null) ||
    typeof attempt !== "number" ||
    !Number.isSafeInteger(attempt) ||
    attempt < 1
  ) {
    failArguments();
  }
  return { routeLabel, method, target, bodyByteLength, keyKind, attempt };
}

/**
 * Private T05 session hooks. They deliberately hold no queue lock: T05
 * invokes them while the prepared rotation awaits dispatch on this same
 * facade, so blocking on rotation state would deadlock. They validate the
 * current four-field identity, exclusive owner, expected vault bytes, and
 * the local fence directly.
 */
function buildInternalHooks(refs: RefreshRefs): SessionHooks {
  const checkBinding = async (
    point: "pre-send" | "pre-delivery",
    binding: CallBinding,
    signal: AbortSignal,
  ): Promise<void> => {
    if (point !== "pre-send" && point !== "pre-delivery") {
      throw new SessionError("invalid_arguments");
    }
    const caller: AbortSignal = assertSignal(signal);
    let snapshot: ParsedBinding;
    try {
      snapshot = assertBinding(binding);
    } catch {
      fenceRefs(refs);
      throw new SessionError("operation_interrupted");
    }
    throwIfAborted(caller);
    if (!bindingsEqual(snapshot, refs.capture) || refs.fenced) {
      fenceRefs(refs);
      failInterrupted();
    }
    throwIfAborted(caller);
    await checkOwnerMatches(refs, refs.vaultSnapshot);
    if (refs.fenced) {
      failInterrupted();
    }
    throwIfAborted(caller);
  };

  // S2 exposes no bearer selection and controls never request one.
  const selectCredential = async (): Promise<CredentialMaterial | null> => {
    throw new SessionError("operation_interrupted");
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
      fenceRefs(refs);
      throw new SessionError("operation_interrupted");
    }
    const gate = captureDispatchGate(summary);
    throwIfAborted(caller);
    if (!bindingsEqual(snapshot, refs.capture) || refs.fenced) {
      fenceRefs(refs);
      failInterrupted();
    }
    throwIfAborted(caller);
    // Exactly one control attempt is admitted, and only while this
    // facade's prepared rotation is active: auth_refresh, POST
    // /v1/auth/refresh, auth key, attempt 1, exact persisted body length.
    if (refs.rotation === null || refs.pending === null) {
      failInterrupted();
    }
    if (
      gate.routeLabel !== "auth_refresh" ||
      gate.method !== "POST" ||
      gate.target !== "/v1/auth/refresh" ||
      gate.keyKind !== "auth" ||
      gate.attempt !== 1
    ) {
      failInterrupted();
    }
    const expected: Uint8Array = decodeCanonicalBase64(refs.pending.bodyBase64);
    if (gate.bodyByteLength !== expected.byteLength) {
      failInterrupted();
    }
    throwIfAborted(caller);
  };

  const isCurrent = (binding: CallBinding): boolean => {
    if (refs.fenced) {
      return false;
    }
    return isBindingEqualToCapture(binding, refs.capture);
  };

  return { checkBinding, selectCredential, beforeDispatch, isCurrent };
}

export async function openRefreshSessionState(
  options: RefreshSessionStateOptions,
): Promise<RefreshSessionState> {
  // Synchronous capture before yielding: exact option shape and trusted
  // capability receivers. Caller-owned objects are never mutated/frozen.
  const entries = captureEntries(options);
  let hasProfile = false;
  let hasConfig = false;
  let hasClock = false;
  for (const entry of entries) {
    if (entry[0] === "profile") {
      hasProfile = true;
    } else if (entry[0] === "transportConfig") {
      hasConfig = true;
    } else if (entry[0] === "clock") {
      hasClock = true;
    } else {
      failArguments();
    }
  }
  if (!hasProfile || !hasConfig) {
    failArguments();
  }
  let profileRaw: unknown = undefined;
  let configRaw: unknown = undefined;
  let clockRaw: unknown = undefined;
  for (const entry of entries) {
    if (entry[0] === "profile") {
      profileRaw = entry[1];
    } else if (entry[0] === "transportConfig") {
      configRaw = entry[1];
    } else if (entry[0] === "clock") {
      clockRaw = entry[1];
    }
  }
  if (typeof profileRaw !== "object" || profileRaw === null) {
    failArguments();
  }
  const owner: object = profileRaw;
  const readVaultFn = captureMethod(owner, "readVaultBytes");
  const commitFn = captureMethod(owner, "commit");
  const ownerBinding: ParsedBinding = captureOwnerBinding(owner);
  const clock: ClockCapture = hasClock ? captureClock(clockRaw) : null;
  // Complete trusted-config capture BEFORE the first await: the unchanged
  // T05 factory runs synchronously here on the caller's original config
  // object, so its authoritative shape validation, nested budget/CA-byte
  // copying, and safe TransportError contract apply with no gap for later
  // caller mutation. Unknown keys (including special property names)
  // stay visible to T05, which rejects them; this facade drops nothing
  // and invokes no prototype setter during capture.
  const refs: RefreshRefs = {
    owner,
    readVaultFn,
    commitFn,
    capture: ownerBinding,
    clock,
    transport: null,
    vaultSnapshot: new Uint8Array(0),
    grant: null,
    pending: null,
    fenced: false,
    rotation: null,
  };
  const hooks: SessionHooks = buildInternalHooks(refs);
  const transport: BackendTransport = createBackendTransport(
    configRaw as unknown as TrustedTransportConfig,
    { session: hooks },
  );
  refs.transport = transport;
  // Post-factory reads are safe: the accepted config is a plain record
  // whose own properties T05 proved to be data values, so no accessor
  // is invoked here. Config origin must normalize to the owner's
  // captured canonical origin before any mutation or network; any
  // mismatch fails closed without touching state or the network.
  const validatedConfig = configRaw as unknown as {
    readonly origin?: unknown;
    readonly allowInsecureLoopback?: unknown;
  };
  const allowLoopback: boolean = validatedConfig.allowInsecureLoopback === true;
  let canonical: string;
  try {
    canonical = canonicalizeConfigOrigin(validatedConfig.origin, allowLoopback);
  } catch {
    failArguments();
  }
  if (canonical !== ownerBinding.origin) {
    failArguments();
  }

  // Opening establishes no rotation; owner failures propagate unchanged.
  // No write, migration, key generation, or dispatch happens here, and
  // pending evidence opens as blocked recovery state.
  const vaultResult: unknown = await Reflect.apply(
    readVaultFn as (this: unknown) => unknown,
    owner,
    [],
  );
  if (!(vaultResult instanceof Uint8Array)) {
    throw new SessionError("operation_interrupted");
  }
  const vaultBytes: Uint8Array = new Uint8Array(vaultResult);
  const decoded = decodeRefreshVaultBytes(vaultBytes, ownerBinding);
  refs.vaultSnapshot = new Uint8Array(vaultBytes);
  refs.grant = decoded.grant;
  refs.pending = decoded.pendingRefresh;
  return createRefreshFacade(refs);
}

function createRefreshFacade(refs: RefreshRefs): RefreshSessionState {
  const rotateRefresh = async (captured: CallBinding, signal: AbortSignal): Promise<void> => {
    // Synchronous entry section (no await before the rotation decision
    // below): capture caller identity and abort, then either join the one
    // shared prepared attempt or synchronously become its leader.
    const caller: AbortSignal = assertSignal(signal);
    let snapshot: ParsedBinding;
    try {
      snapshot = assertBinding(captured);
    } catch {
      throw new SessionError("invalid_arguments");
    }
    throwIfAborted(caller);
    if (refs.fenced) {
      failInterrupted();
    }
    if (!bindingsEqual(snapshot, refs.capture)) {
      // Not this facade's identity; no shared result, no persistence, no fence.
      failInterrupted();
    }
    const active: ActiveRotation | null = refs.rotation;
    if (active !== null) {
      return attachToRotation(refs, active, snapshot, caller);
    }
    const dispatch = new AbortController();
    const gate = createOutcomeGate();
    const rotation: ActiveRotation = {
      snapshot,
      leaderSignal: caller,
      dispatch,
      outcome: gate.outcome,
    };
    refs.rotation = rotation;
    const onLeaderAbort = (): void => {
      dispatch.abort();
    };
    if (caller.aborted) {
      dispatch.abort();
    } else {
      caller.addEventListener("abort", onLeaderAbort, { once: true });
    }
    void runLeaderRotation(refs, rotation, gate, onLeaderAbort);
    return attachLeaderToRotation(refs, rotation, snapshot, caller);
  };

  const invalidate = (): void => {
    // Synchronous, idempotent, permanent local cancellation fence. No IO,
    // no credential clearing: not sign-out/logout. Cancels owned network
    // work; a commit already begun is still awaited to completion by its
    // owner, with late success suppressed.
    fenceRefs(refs);
    const active: ActiveRotation | null = refs.rotation;
    if (active !== null) {
      active.dispatch.abort();
    }
  };

  const binding: StorageBinding = freezeBinding(refs.capture);
  return Object.freeze({ binding, rotateRefresh, invalidate });
}

function createOutcomeGate(): {
  readonly outcome: Promise<void>;
  resolve(): void;
  reject(error: unknown): void;
} {
  let resolveGate: (() => void) | undefined;
  let rejectGate: ((error: unknown) => void) | undefined;
  const outcome = new Promise<void>((resolve, reject) => {
    resolveGate = resolve;
    rejectGate = reject;
  });
  return {
    outcome,
    resolve: (): void => {
      resolveGate?.();
    },
    reject: (error: unknown): void => {
      rejectGate?.(error);
    },
  };
}

/**
 * Leader wait: unlike followers, the leader owns the storage/network
 * attempt, so its public promise never settles on cancellation while an
 * owned prepare/final commit remains unresolved. It awaits owned
 * completion through the shared outcome and then reports interruption,
 * keeping installed/pending state with no rollback. No caller listener
 * is attached here (dispatch cancellation is wired separately at
 * rotation creation); the shared outcome always settles because owned
 * commits are awaited to completion inside the leader flow.
 */
function attachLeaderToRotation(
  refs: RefreshRefs,
  rotation: ActiveRotation,
  snapshot: ParsedBinding,
  caller: AbortSignal,
): Promise<void> {
  return rotation.outcome.then(() => {
    if (caller.aborted || refs.fenced || !bindingsEqual(snapshot, refs.capture)) {
      throw new SessionError("operation_interrupted");
    }
  });
}

/**
 * Attach a validated caller to the one shared prepared attempt. A
 * follower may abort its own wait (operation_interrupted) without
 * cancelling or rekeying the leader's attempt; a leader abort cancels
 * T05 and nonaborted followers receive the shared failed outcome. Every
 * waiter rechecks its captured identity, the local fence, and its own
 * signal before success, so a cancelled follower never gets late
 * success. Listeners are cleaned up on every outcome.
 */
function attachToRotation(
  refs: RefreshRefs,
  rotation: ActiveRotation,
  snapshot: ParsedBinding,
  caller: AbortSignal,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (caller.aborted) {
      reject(new SessionError("operation_interrupted"));
      return;
    }
    let done = false;
    const cleanup = (): void => {
      caller.removeEventListener("abort", onAbort);
    };
    const onAbort = (): void => {
      if (done) {
        return;
      }
      done = true;
      cleanup();
      reject(new SessionError("operation_interrupted"));
    };
    caller.addEventListener("abort", onAbort, { once: true });
    rotation.outcome.then(
      () => {
        if (done) {
          return;
        }
        done = true;
        cleanup();
        if (caller.aborted || refs.fenced || !bindingsEqual(snapshot, refs.capture)) {
          reject(new SessionError("operation_interrupted"));
          return;
        }
        resolve();
      },
      (error: unknown) => {
        if (done) {
          return;
        }
        done = true;
        cleanup();
        if (caller.aborted) {
          reject(new SessionError("operation_interrupted"));
          return;
        }
        reject(error);
      },
    );
  });
}

async function runLeaderRotation(
  refs: RefreshRefs,
  rotation: ActiveRotation,
  gate: { resolve(): void; reject(error: unknown): void },
  onLeaderAbort: () => void,
): Promise<void> {
  try {
    await executeLeaderRotation(refs, rotation);
    gate.resolve();
  } catch (error) {
    gate.reject(error);
  } finally {
    rotation.leaderSignal.removeEventListener("abort", onLeaderAbort);
    if (refs.rotation === rotation) {
      refs.rotation = null;
    }
  }
}

async function executeLeaderRotation(refs: RefreshRefs, rotation: ActiveRotation): Promise<void> {
  const caller: AbortSignal = rotation.leaderSignal;
  if (refs.fenced) {
    failInterrupted();
  }
  if (!bindingsEqual(rotation.snapshot, refs.capture)) {
    failInterrupted();
  }
  const held: VaultGrantRecord | null = refs.grant;
  if (held === null || refs.capture.accountUuid === null) {
    // Cleared/uninitialized vault (including untouched version1
    // null-grant state): no credentials, no write, no dispatch.
    throw new SessionError("authentication_required");
  }
  if (refs.pending !== null) {
    // Blocked recovery state: an existing pending record — opened or
    // prepared by an unsuccessful attempt on this facade — is never
    // silently cleared, rekeyed, superseded, or replayed here. No key
    // allocation, commit, or dispatch.
    throw new SessionError("reauthentication_required");
  }
  {
    const now: number = nowMs(refs);
    if (now >= held.refreshExpiresMs) {
      // Expired refresh rejects with no write/dispatch. Expired access
      // alone permits rotation.
      throw new SessionError("reauthentication_required");
    }
  }
  throwIfAborted(caller);
  // Revalidate owner and unchanged captured vault after the awaits above.
  await checkOwnerMatches(refs, refs.vaultSnapshot);
  if (refs.fenced) {
    failInterrupted();
  }
  throwIfAborted(caller);
  // Immediately before the prepare commit, recheck abort, the local
  // fence, the unchanged owner, and the live predecessor refresh expiry.
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  await checkOwnerMatches(refs, refs.vaultSnapshot);
  if (refs.fenced) {
    failInterrupted();
  }
  {
    const commitNow: number = nowMs(refs);
    if (commitNow >= held.refreshExpiresMs) {
      throw new SessionError("reauthentication_required");
    }
  }
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  // Prepare exactly one new attempt: one auth UUID, one serialization of
  // the exact request bytes. Blocked paths above allocate no key.
  const authKey: string = randomUUID();
  const requestBytes: Uint8Array = buildRefreshRequestBytes(held.refreshToken);
  const pending: VaultPendingRefresh = Object.freeze({
    predecessor: held,
    refreshToken: held.refreshToken,
    bodyBase64: encodeBodyBase64(requestBytes),
    authKey,
  });
  // Persist the full version2 predecessor/token/body/key through T04 and
  // await durability BEFORE the T05 handoff. This same commit explicitly
  // upgrades version1 state; operation bytes are never committed here.
  const preparedBytes: Uint8Array = encodeRefreshVaultBytes(refs.capture, held, pending);
  // Immediate boundary recheck after the awaited owner validation and
  // synchronous serialization above, directly before the commit
  // invocation: clock/expiry validation runs first, then final
  // abort/local-fence checks with no further caller callback or await
  // before the invocation, so a clock callback that aborts or
  // invalidates while returning a live instant cannot slip a commit
  // through. An expiry observed here retains nothing written and
  // reports reauthentication_required.
  {
    const prepareNow: number = nowMs(refs);
    if (prepareNow >= held.refreshExpiresMs) {
      throw new SessionError("reauthentication_required");
    }
  }
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  await commitVaultBytes(refs, preparedBytes);
  refs.vaultSnapshot = new Uint8Array(preparedBytes);
  refs.pending = pending;
  // A cancelled preparation retains its durable pending record but never
  // dispatches.
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  // Dispatch detached copies of the DURABLE stored body and auth key:
  // exactly one T05 control attempt, no sleeps, auto retry, 401 retry,
  // or response-driven route/origin change. Controls need no bearer.
  const durableBody: Uint8Array = decodeCanonicalBase64(refs.pending.bodyBase64);
  const durableKey: string = refs.pending.authKey;
  const dispatchBinding: CallBinding = toCallBinding(refs.capture);
  const transport: BackendTransport | null = refs.transport;
  if (transport === null) {
    failInterrupted();
  }
  // Transport errors (including definite 401/409/429), cancellation, or
  // invalidation after prepare leave the exact pending/predecessor
  // evidence intact: no state is touched on this path. The safe typed
  // error propagates unchanged; an idempotency_key_reused conflict never
  // proves settlement.
  const result = await transport.authRefresh(
    dispatchBinding,
    durableBody,
    durableKey,
    rotation.dispatch.signal,
  );
  const rawBody: Uint8Array = result.rawBodyBytes;
  // Validate the returned private ServiceSession with S1 exact rules,
  // including lossless expiries, duplicate-key rejection, and
  // additive-field stripping. Legacy nonzero submillisecond expiries
  // fail here as invalid_grant: never rounded or retried.
  const successor: VaultGrantRecord = parseServiceGrant(rawBody);
  if (successor.accountUuid !== refs.capture.accountUuid) {
    // Same-account rotation only; never adopt another account.
    throw new SessionError("invalid_grant");
  }
  {
    // Returned refresh must be live at the immediate pre-commit recheck;
    // an expired refresh retains pending unchanged. Valid expired access
    // may be persisted without follow-on rotation.
    const preCommitNow: number = nowMs(refs);
    if (preCommitNow >= successor.refreshExpiresMs) {
      throw new SessionError("reauthentication_required");
    }
  }
  // Recheck current owner/expected pending bytes, signal, and
  // invalidation before committing.
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  await checkOwnerMatches(refs, refs.vaultSnapshot);
  if (refs.fenced) {
    failInterrupted();
  }
  throwIfAborted(caller);
  // One atomic T04 commit installs the returned grant together with
  // clearing pending evidence; clearing never precedes installation.
  const settledBytes: Uint8Array = encodeRefreshVaultBytes(refs.capture, successor, null);
  // Immediate boundary recheck after the owner-validation awaits and
  // synchronous serialization above, directly before the commit
  // invocation: clock/expiry validation runs first, then final
  // abort/local-fence checks with no further caller callback or await
  // before the invocation. An expired returned refresh keeps exact
  // pending unchanged and reports reauthentication_required, without
  // installation.
  {
    const commitNow: number = nowMs(refs);
    if (commitNow >= successor.refreshExpiresMs) {
      throw new SessionError("reauthentication_required");
    }
  }
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  await commitVaultBytes(refs, settledBytes);
  refs.vaultSnapshot = new Uint8Array(settledBytes);
  refs.grant = successor;
  refs.pending = null;
  // Return only after final caller/fence checks. An abort or
  // invalidation during the success commit suppresses late success
  // while the completed commit stays installed; no rollback.
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
}
