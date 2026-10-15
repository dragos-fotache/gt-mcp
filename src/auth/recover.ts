/**
 * T06-S3 exact refresh recovery — recoverable refresh-session facade with
 * durable original-attempt replay, recovered install-before-fresh prepare,
 * and a bounded at-most-two-request recovery cycle.
 *
 * Internal partial capability only: refresh recovery plus the unchanged S2
 * fresh-only rotation. No resource 401 orchestration, sign-out/replacement,
 * initial login, browser, CLI/MCP/config guard, cleanup, or successor-slice
 * behavior is supplied here. S1/S2 exports and behavior are unchanged; the
 * strict version-2 record, predecessor equality, and version constants are
 * untouched. Opening never writes, migrates, generates keys, dispatches, or
 * treats pending as settled.
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
import type { StorageBinding } from "../storage/index.js";
import { SessionError } from "./errors.js";
import type { RefreshSessionState, RefreshSessionStateOptions } from "./refresh.js";
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

export interface RecoverableRefreshSessionState extends RefreshSessionState {
  recoverRefresh(captured: CallBinding, signal: AbortSignal): Promise<void>;
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
// Facade state. One active cycle at a time: concurrent valid same-kind
// callers share it, while a different-kind call overlapping it rejects
// operation_interrupted without joining, queuing, cancelling, or fencing.
// ---------------------------------------------------------------------------

type CycleKind = "rotate" | "recover";

interface ActiveCycle {
  readonly kind: CycleKind;
  readonly snapshot: ParsedBinding;
  readonly leaderSignal: AbortSignal;
  readonly dispatch: AbortController;
  readonly outcome: Promise<void>;
}

interface RecoverRefs {
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
  active: ActiveCycle | null;
}

function fenceRefs(refs: RecoverRefs): void {
  refs.fenced = true;
}

function nowMs(refs: RecoverRefs): number {
  let raw: unknown;
  try {
    raw = refs.clock === null ? Date.now() : refs.clock.fn();
  } catch {
    throw new SessionError("invalid_arguments");
  }
  return assertClockMs(raw);
}

async function readOwnerVault(refs: RecoverRefs): Promise<Uint8Array> {
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
async function checkOwnerMatches(refs: RecoverRefs, expected: Uint8Array): Promise<void> {
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
async function commitVaultBytes(refs: RecoverRefs, bytes: Uint8Array): Promise<void> {
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
 * invokes them while the active cycle awaits dispatch on this same
 * facade, so blocking on cycle state would deadlock. They validate the
 * current four-field identity, exclusive owner, expected vault bytes, and
 * the local fence directly.
 */
function buildInternalHooks(refs: RecoverRefs): SessionHooks {
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

  // S3 exposes no bearer selection and controls never request one.
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
    // Exactly one control attempt is admitted per dispatch, and only while
    // this facade's active cycle holds durable pending evidence: replay
    // uses the original durable body/key, the optional fresh rotation uses
    // its own newly durable body/key. Each dispatch checks the currently
    // persisted evidence; no bearer, route, or origin change is admitted.
    if (refs.active === null || refs.pending === null) {
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

export async function openRecoverableRefreshSessionState(
  options: RefreshSessionStateOptions,
): Promise<RecoverableRefreshSessionState> {
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
  const refs: RecoverRefs = {
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
    active: null,
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

  // Opening establishes no cycle; owner failures propagate unchanged.
  // No write, migration, key generation, or dispatch happens here, and
  // pending evidence opens as replayable recovery state for recoverRefresh
  // (while rotateRefresh keeps its S2 blocked-recovery refusal).
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
  return createRecoverableFacade(refs);
}

function createRecoverableFacade(refs: RecoverRefs): RecoverableRefreshSessionState {
  const enterCycle = (
    kind: CycleKind,
    captured: CallBinding,
    signal: AbortSignal,
  ): {
    readonly cycle: ActiveCycle;
    readonly snapshot: ParsedBinding;
    readonly caller: AbortSignal;
    readonly isLeader: boolean;
  } => {
    // Synchronous entry section (no await before the cycle decision
    // below): capture caller identity and abort, then either join the one
    // shared same-kind cycle or synchronously become its leader. A
    // different-kind call overlapping an active cycle rejects here without
    // joining, queuing another cycle, cancelling, or fencing the leader.
    // Foreign or malformed callers never join a successful result.
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
    const current: ActiveCycle | null = refs.active;
    if (current !== null) {
      if (current.kind !== kind) {
        failInterrupted();
      }
      return { cycle: current, snapshot, caller, isLeader: false };
    }
    const dispatch = new AbortController();
    const gate = createOutcomeGate();
    const cycle: ActiveCycle = {
      kind,
      snapshot,
      leaderSignal: caller,
      dispatch,
      outcome: gate.outcome,
    };
    refs.active = cycle;
    const onLeaderAbort = (): void => {
      dispatch.abort();
    };
    if (caller.aborted) {
      dispatch.abort();
    } else {
      caller.addEventListener("abort", onLeaderAbort, { once: true });
    }
    if (kind === "rotate") {
      void runLeaderCycle(refs, cycle, gate, onLeaderAbort, executeRotateLeader);
    } else {
      void runLeaderCycle(refs, cycle, gate, onLeaderAbort, executeRecoverLeader);
    }
    return { cycle, snapshot, caller, isLeader: true };
  };

  const rotateRefresh = async (captured: CallBinding, signal: AbortSignal): Promise<void> => {
    const entered = enterCycle("rotate", captured, signal);
    if (entered.isLeader) {
      return attachLeaderToCycle(refs, entered.cycle, entered.snapshot, entered.caller);
    }
    return attachToCycle(refs, entered.cycle, entered.snapshot, entered.caller);
  };

  const recoverRefresh = async (captured: CallBinding, signal: AbortSignal): Promise<void> => {
    const entered = enterCycle("recover", captured, signal);
    if (entered.isLeader) {
      return attachLeaderToCycle(refs, entered.cycle, entered.snapshot, entered.caller);
    }
    return attachToCycle(refs, entered.cycle, entered.snapshot, entered.caller);
  };

  const invalidate = (): void => {
    // Synchronous, idempotent, permanent local cancellation fence. No IO,
    // no credential clearing: not sign-out/logout. Cancels owned network
    // work; a commit already begun is still awaited to completion by its
    // owner, with late success suppressed.
    fenceRefs(refs);
    const current: ActiveCycle | null = refs.active;
    if (current !== null) {
      current.dispatch.abort();
    }
  };

  const binding: StorageBinding = freezeBinding(refs.capture);
  return Object.freeze({ binding, rotateRefresh, recoverRefresh, invalidate });
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
 * cycle creation); the shared outcome always settles because owned
 * commits are awaited to completion inside the leader flow.
 */
function attachLeaderToCycle(
  refs: RecoverRefs,
  cycle: ActiveCycle,
  snapshot: ParsedBinding,
  caller: AbortSignal,
): Promise<void> {
  return cycle.outcome.then(() => {
    if (caller.aborted || refs.fenced || !bindingsEqual(snapshot, refs.capture)) {
      throw new SessionError("operation_interrupted");
    }
  });
}

/**
 * Attach a validated same-kind caller to the one shared cycle. A
 * follower may abort its own wait (operation_interrupted) without
 * cancelling or rekeying the leader's attempt; a leader abort cancels
 * T05 and nonaborted followers receive the shared failed outcome. Every
 * waiter rechecks its captured identity, the local fence, and its own
 * signal before success, so a cancelled follower never gets late
 * success. Listeners are cleaned up on every outcome.
 */
function attachToCycle(
  refs: RecoverRefs,
  cycle: ActiveCycle,
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
    cycle.outcome.then(
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

async function runLeaderCycle(
  refs: RecoverRefs,
  cycle: ActiveCycle,
  gate: { resolve(): void; reject(error: unknown): void },
  onLeaderAbort: () => void,
  execute: (refs: RecoverRefs, cycle: ActiveCycle) => Promise<void>,
): Promise<void> {
  try {
    await execute(refs, cycle);
    gate.resolve();
  } catch (error) {
    gate.reject(error);
  } finally {
    cycle.leaderSignal.removeEventListener("abort", onLeaderAbort);
    if (refs.active === cycle) {
      refs.active = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Fresh-only rotation (S2 semantics): serialized single attempt with
// durable predecessor/body/key preparation, one control dispatch, and
// atomic same-account successor installation. Existing pending blocks
// with reauthentication_required: no key, commit, or dispatch.
// ---------------------------------------------------------------------------

async function executeRotateLeader(refs: RecoverRefs, cycle: ActiveCycle): Promise<void> {
  const caller: AbortSignal = cycle.leaderSignal;
  if (refs.fenced) {
    failInterrupted();
  }
  if (!bindingsEqual(cycle.snapshot, refs.capture)) {
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
    // silently cleared, rekeyed, superseded, or replayed by rotation. No
    // key allocation, commit, or dispatch. Exact replay belongs to
    // recoverRefresh.
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
  await dispatchPreparedAttempt(refs, cycle);
  // Return only after final caller/fence checks. An abort or
  // invalidation during the success commit suppresses late success
  // while the completed commit stays installed; no rollback.
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
}

/**
 * Dispatch the currently durable prepared attempt (exactly one T05
 * control call with detached copies of the durable body/key) and
 * atomically install its validated same-account successor with pending
 * cleared. Any transport error, bad response, cancellation, or
 * invalidation after prepare leaves the exact pending/predecessor
 * evidence intact: no state is touched on those paths. The safe typed
 * error propagates unchanged; an idempotency_key_reused conflict never
 * proves settlement.
 */
async function dispatchPreparedAttempt(refs: RecoverRefs, cycle: ActiveCycle): Promise<void> {
  const pending: VaultPendingRefresh | null = refs.pending;
  if (pending === null) {
    failInterrupted();
  }
  const durableBody: Uint8Array = decodeCanonicalBase64(pending.bodyBase64);
  const durableKey: string = pending.authKey;
  const dispatchBinding: CallBinding = toCallBinding(refs.capture);
  const transport: BackendTransport | null = refs.transport;
  if (transport === null) {
    failInterrupted();
  }
  const result = await transport.authRefresh(
    dispatchBinding,
    durableBody,
    durableKey,
    cycle.dispatch.signal,
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
  await installSuccessorGrant(refs, cycle, successor);
}

/**
 * Atomically install a validated successor grant together with clearing
 * pending evidence; clearing never precedes installation. The returned
 * refresh must be live at the immediate pre-commit recheck; an expired
 * refresh retains pending unchanged and reports
 * reauthentication_required. Valid expired access may be persisted
 * without follow-on rotation on this path. Completed commits stay
 * installed; nothing is rolled back or deleted here.
 */
async function installSuccessorGrant(
  refs: RecoverRefs,
  cycle: ActiveCycle,
  successor: VaultGrantRecord,
): Promise<void> {
  const caller: AbortSignal = cycle.leaderSignal;
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

// ---------------------------------------------------------------------------
// Bounded recovery: explicit original-attempt replay plus at most one
// distinct fresh rotation. The whole cycle (including the optional fresh
// rotation) is shared by concurrent valid recoverRefresh callers.
// ---------------------------------------------------------------------------

async function executeRecoverLeader(refs: RecoverRefs, cycle: ActiveCycle): Promise<void> {
  const caller: AbortSignal = cycle.leaderSignal;
  if (refs.fenced) {
    failInterrupted();
  }
  if (!bindingsEqual(cycle.snapshot, refs.capture)) {
    failInterrupted();
  }
  const held: VaultGrantRecord | null = refs.grant;
  if (held === null || refs.capture.accountUuid === null) {
    // No usable credentials (cleared/empty/v1 null-grant, never migrated
    // by recovery): no write, no dispatch.
    throw new SessionError("authentication_required");
  }
  if (refs.pending !== null) {
    // Replay the original durable attempt explicitly, even if the
    // predecessor access or refresh deadline has expired locally: the
    // backend looks up accepted identical attempts before rejecting
    // consumed input, so no successor deadline is inferred here. The
    // stored predecessor is already structurally valid and lossless
    // from open; it is never selected as bearer authority, rekeyed,
    // rewritten, and no fresh prepare runs before replay settlement.
    await replayOriginalAttempt(refs, cycle);
    // The recovered grant is now durably installed with pending cleared.
    // Finish directly while its access is still live; otherwise perform
    // at most one fresh rotation below. This decision uses durable
    // state only, so a restart/cancellation gap between installation
    // and the next prepare needs no volatile memory.
    throwIfAborted(caller);
    if (refs.fenced) {
      failInterrupted();
    }
    if (!bindingsEqual(cycle.snapshot, refs.capture)) {
      failInterrupted();
    }
    const recovered: VaultGrantRecord | null = refs.grant;
    if (recovered === null) {
      failInterrupted();
    }
    const now: number = nowMs(refs);
    if (now >= recovered.refreshExpiresMs) {
      // Installed but no longer refreshable (the clock advanced past
      // the recovered refresh deadline): keep the installed grant,
      // allocate no key, start no rotation.
      throw new SessionError("reauthentication_required");
    }
    if (now >= recovered.accessExpiresMs) {
      await runFreshRotation(refs, cycle, recovered);
      return;
    }
    // Recovered access still live: finish only after final caller,
    // fence, and identity rechecks following the clock callback above.
    throwIfAborted(caller);
    if (refs.fenced) {
      failInterrupted();
    }
    if (!bindingsEqual(cycle.snapshot, refs.capture)) {
      failInterrupted();
    }
    return;
  }
  // No pending at entry: validate owner, fence, and expiries, then either
  // succeed read-only (live grant), refuse (expired refresh), or run the
  // single permitted fresh rotation (expired access with live refresh).
  // Empty/v1 no-op state never migrates: no commit happens on this path
  // except the authorized fresh preparation below.
  throwIfAborted(caller);
  await checkOwnerMatches(refs, refs.vaultSnapshot);
  if (refs.fenced) {
    failInterrupted();
  }
  throwIfAborted(caller);
  if (!bindingsEqual(cycle.snapshot, refs.capture)) {
    failInterrupted();
  }
  {
    const now: number = nowMs(refs);
    if (now >= held.refreshExpiresMs) {
      // Expired refresh: no commit, no key, no dispatch.
      throw new SessionError("reauthentication_required");
    }
    if (now >= held.accessExpiresMs) {
      await runFreshRotation(refs, cycle, held);
      return;
    }
  }
  // Same post-clock safeguard as the recovered path above: abort, fence,
  // and identity are rechecked after the clock callback before the
  // read-only shared success. No commit happened on this path.
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  if (!bindingsEqual(cycle.snapshot, refs.capture)) {
    failInterrupted();
  }
}

/**
 * Replay the original durable pending attempt with its unchanged stored
 * body bytes and original auth UUID: one control dispatch, no prepare
 * commit (its evidence is already durable), no new key, no rewrite.
 * Every failed replay retains the original full pending evidence,
 * including definite rejections, lost responses, malformed responses,
 * account/precision rejections, and cancellation; only the joint
 * success commit settles it.
 */
async function replayOriginalAttempt(refs: RecoverRefs, cycle: ActiveCycle): Promise<void> {
  const caller: AbortSignal = cycle.leaderSignal;
  const pending: VaultPendingRefresh | null = refs.pending;
  if (pending === null) {
    failInterrupted();
  }
  // After owner/expected-vault, signal, and fence rechecks, hand the
  // unchanged durable decoded body bytes and original auth UUID to the
  // single internal T05 authRefresh attempt.
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  await checkOwnerMatches(refs, refs.vaultSnapshot);
  if (refs.fenced) {
    failInterrupted();
  }
  throwIfAborted(caller);
  if (refs.pending === null || refs.pending.bodyBase64 !== pending.bodyBase64) {
    failInterrupted();
  }
  const durableBody: Uint8Array = decodeCanonicalBase64(pending.bodyBase64);
  const durableKey: string = pending.authKey;
  const dispatchBinding: CallBinding = toCallBinding(refs.capture);
  const transport: BackendTransport | null = refs.transport;
  if (transport === null) {
    failInterrupted();
  }
  // ONE control attempt: POST /v1/auth/refresh, keyKind auth, attempt 1,
  // exact durable body length (gated by the internal hooks). No bearer,
  // no route/origin change, no sleep, no hidden retry. Replay needs no
  // prepare commit because its evidence is already durable.
  const result = await transport.authRefresh(
    dispatchBinding,
    durableBody,
    durableKey,
    cycle.dispatch.signal,
  );
  const rawBody: Uint8Array = result.rawBodyBytes;
  // Validate the returned ServiceSession with S1/S2 rules: strict
  // UTF-8/duplicate-free JSON, required fields, same account, original
  // lossless expiry spellings, additive-field stripping. Invalid/legacy
  // nonzero submillisecond precision or a different account fails
  // invalid_grant with pending retained.
  const successor: VaultGrantRecord = parseServiceGrant(rawBody);
  if (successor.accountUuid !== refs.capture.accountUuid) {
    throw new SessionError("invalid_grant");
  }
  // Atomically commit the returned grant with pending cleared and await
  // durability before the caller considers any distinct rotation. The
  // pre-commit refresh-liveness check inside retains pending unchanged
  // on reauthentication_required.
  await installSuccessorGrant(refs, cycle, successor);
}

/**
 * The single permitted distinct rotation: uses the installed grant's
 * refresh token with a distinct new auth UUID, durably prepares its own
 * predecessor/body/key AFTER that installation and BEFORE dispatch, then
 * dispatches and installs exactly like a fresh S2 attempt. This explicit
 * cycle holds at most two control requests (original replay plus this
 * one rotation), each a T05 attempt 1. An unsuccessful fresh attempt
 * retains its newly durable evidence (with the installed grant as
 * predecessor), never the already-settled old attempt. Before the new
 * prepare begins, failure/cancellation retains the installed grant with
 * pending null.
 */
async function runFreshRotation(
  refs: RecoverRefs,
  cycle: ActiveCycle,
  predecessor: VaultGrantRecord,
): Promise<void> {
  const caller: AbortSignal = cycle.leaderSignal;
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
    const prepareCheck: number = nowMs(refs);
    if (prepareCheck >= predecessor.refreshExpiresMs) {
      throw new SessionError("reauthentication_required");
    }
  }
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  // The old pending was settled atomically with the installation above;
  // this distinct attempt prepares its own evidence with a new auth UUID.
  const authKey: string = randomUUID();
  const requestBytes: Uint8Array = buildRefreshRequestBytes(predecessor.refreshToken);
  const pending: VaultPendingRefresh = Object.freeze({
    predecessor,
    refreshToken: predecessor.refreshToken,
    bodyBase64: encodeBodyBase64(requestBytes),
    authKey,
  });
  const preparedBytes: Uint8Array = encodeRefreshVaultBytes(refs.capture, predecessor, pending);
  // Immediate boundary recheck after the awaited owner validation and
  // synchronous serialization above, directly before the commit
  // invocation: clock/expiry validation first, then final abort/fence
  // checks with no further caller callback or await before it.
  {
    const prepareNow: number = nowMs(refs);
    if (prepareNow >= predecessor.refreshExpiresMs) {
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
  // A cancelled preparation retains its newly durable evidence but never
  // dispatches.
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  await dispatchPreparedAttempt(refs, cycle);
  // Terminal evaluation: a fresh result with expired access but live
  // refresh is already installed atomically above; report
  // reauthentication_required instead of looping. Final expiry checks
  // may also require reauthentication if the clock advanced; the
  // installed grant is never rolled back, no expiry is invented, and no
  // further key is allocated in this cycle. A later explicit invocation
  // is distinct, not an autonomous retry.
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  const installed: VaultGrantRecord | null = refs.grant;
  if (installed === null) {
    failInterrupted();
  }
  const doneNow: number = nowMs(refs);
  // Post-clock cancellation safeguard (C0-1): a trusted clock callback
  // that aborts the leader or invalidates the facade while returning live
  // time must fail the entire shared cycle as operation_interrupted —
  // nonaborted followers receive the shared failure — never resolve
  // success. The installed grant stays installed; no rollback, extra
  // dispatch, or new key. Expiry is evaluated from the captured instant
  // with no further caller callback before the decision.
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  if (!bindingsEqual(cycle.snapshot, refs.capture)) {
    failInterrupted();
  }
  if (doneNow >= installed.refreshExpiresMs || doneNow >= installed.accessExpiresMs) {
    throw new SessionError("reauthentication_required");
  }
}
