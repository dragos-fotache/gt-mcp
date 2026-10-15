/**
 * T06-S4 authenticated requests — shared auth controller plus fixed-route
 * bearer resource orchestration with one 401 refresh-and-retry.
 *
 * Internal partial capability only: composes accepted S3 exact recovery with
 * nine fixed T05 resource methods. No sign-out/replacement/logout,
 * browser/login, CLI/MCP wiring, config loader/writesEnabled guard,
 * journals/creation workflow, caching, or cleanup. No new provider,
 * transport seam, arbitrary route/header/sender, account adoption, external
 * dependency (beyond the accepted T05 runtime entry plus the public T03
 * query parser for exact pre-refresh validation), or shared-contract change.
 * Product writes remain disabled; the three mutation methods are internal
 * composition capabilities for later guarded slices, not a delivered write
 * tool. S1/S2/S3 files, exports, behavior, and strict v1/v2 vault formats
 * are unchanged. Opening is read-only; no migration, key allocation,
 * network, credential refresh, or operation reads.
 *
 * The caller-owned T04 profile is never closed, reopened, or reacquired
 * here; only its documented readVaultBytes/commit methods are used, and
 * operation bytes are never read, parsed, or modified.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import { parseArguments } from "../domain/index.js";
import { createBackendTransport, TransportError, isTransportError } from "../http/index.js";
import type {
  BackendTransport,
  CallBinding,
  CredentialMaterial,
  DispatchSummary,
  ExerciseResult,
  MutationResult,
  RoutineListResult,
  RoutineResult,
  SearchExercisesResult,
  SessionHooks,
  TrustedTransportConfig,
  WorkoutListResult,
  WorkoutResult,
} from "../http/index.js";
import type { StorageBinding } from "../storage/index.js";
import { SessionError } from "./errors.js";
import type { RefreshSessionStateOptions } from "./refresh.js";
import {
  assertBinding,
  assertClockMs,
  assertSignal,
  bindingsEqual,
  captureEntries,
  isBindingEqualToCapture,
  isCanonicalUuid,
  parseStrictJson,
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

export type AuthenticatedResourceTransport = Pick<
  BackendTransport,
  | "searchExercises"
  | "getExercise"
  | "listWorkouts"
  | "getWorkout"
  | "listRoutines"
  | "getRoutine"
  | "createDraft"
  | "populateDraft"
  | "saveRoutine"
>;

export interface AuthenticatedSessionState extends AuthenticatedResourceTransport {
  readonly binding: StorageBinding;
  invalidate(): void;
}

type ClockCapture = { readonly fn: () => number } | null;

function failArguments(): never {
  throw new SessionError("invalid_arguments");
}

function failInterrupted(): never {
  throw new SessionError("operation_interrupted");
}

function failTransportArguments(details?: { readonly correlationId?: string }): never {
  throw new TransportError("invalid_arguments", {
    backendErrorCode: null,
    retryAfterSeconds: null,
    status: null,
    dispatched: false,
    outcomeUnknown: false,
    attempts: 0,
    elapsedMs: 0,
    correlationId: details?.correlationId ?? randomUUID(),
  });
}

function failTransportTooLarge(): never {
  throw new TransportError("request_too_large", {
    backendErrorCode: null,
    retryAfterSeconds: null,
    status: null,
    dispatched: false,
    outcomeUnknown: false,
    attempts: 0,
    elapsedMs: 0,
    correlationId: randomUUID(),
  });
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
// T05-exact byte-view capture for resource bodies (no weaker acceptance).
// Mirrors the accepted transport gate: exact Uint8Array/Buffer prototypes,
// no own shadow properties, no SharedArrayBuffer/resizable/detached store,
// size gate before allocation, independent copy. Failures preserve T05
// safe codes (invalid_arguments vs request_too_large).
// ---------------------------------------------------------------------------

function bufferPrototype(): object {
  return (Buffer as unknown as { prototype: object }).prototype;
}

function checkResourceByteView(value: unknown): Uint8Array {
  try {
    if (!(value instanceof Uint8Array)) {
      failTransportArguments();
    }
    const view: Uint8Array = value;
    const prototype: unknown = Object.getPrototypeOf(view);
    if (prototype !== Uint8Array.prototype && prototype !== bufferPrototype()) {
      failTransportArguments();
    }
    for (const name of ["buffer", "byteLength", "byteOffset", "length"]) {
      if (Object.prototype.hasOwnProperty.call(view, name)) {
        failTransportArguments();
      }
    }
    const backing: unknown = (view as Uint8Array).buffer;
    if (typeof backing !== "object" || backing === null || backing instanceof SharedArrayBuffer) {
      failTransportArguments();
    }
    let backingProto: unknown;
    try {
      backingProto = Object.getPrototypeOf(backing);
    } catch {
      failTransportArguments();
    }
    if (backingProto !== ArrayBuffer.prototype) {
      failTransportArguments();
    }
    for (const name of ["resizable", "detached"]) {
      if (Object.prototype.hasOwnProperty.call(backing, name)) {
        failTransportArguments();
      }
    }
    const buffer = backing as ArrayBuffer;
    const features = buffer as unknown as {
      readonly resizable?: boolean;
      readonly detached?: boolean;
    };
    if (features.resizable === true || features.detached === true) {
      failTransportArguments();
    }
    const length: number = (view as Uint8Array).byteLength;
    const offset: number = (view as Uint8Array).byteOffset;
    if (
      !Number.isSafeInteger(length) ||
      !Number.isSafeInteger(offset) ||
      length < 0 ||
      offset < 0
    ) {
      failTransportArguments();
    }
    try {
      Uint8Array.prototype.slice.call(view, 0, 0);
    } catch {
      failTransportArguments();
    }
    return view;
  } catch (error) {
    if (isTransportError(error)) {
      throw error;
    }
    failTransportArguments();
  }
}

function captureResourceBodyBytes(value: unknown, limit: number): Uint8Array {
  const view: Uint8Array = checkResourceByteView(value);
  if (view.byteLength > limit) {
    failTransportTooLarge();
  }
  try {
    const copy = new Uint8Array(view.byteLength);
    copy.set(view);
    return copy;
  } catch (error) {
    if (isTransportError(error)) {
      throw error;
    }
    failTransportArguments();
  }
}

function decodeResourceBodyText(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    failTransportArguments();
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    failTransportArguments();
  }
}

function isPlainJsonObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Strict duplicate-free object parse with T05 semantics (not weaker). */
function parseResourceBodyObject(bytes: Uint8Array): Record<string, unknown> {
  const text: string = decodeResourceBodyText(bytes);
  let parsed: unknown;
  try {
    // Reuses the accepted strict duplicate-free validator (escaped-key
    // duplicates included); SessionError here means malformed JSON.
    parsed = parseStrictJson(text);
  } catch {
    failTransportArguments();
  }
  if (!isPlainJsonObject(parsed)) {
    failTransportArguments();
  }
  return parsed;
}

function readBodyField(
  record: Record<string, unknown>,
  key: string,
): { present: boolean; value: unknown } {
  const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(record, key);
  if (descriptor === undefined) {
    return { present: false, value: undefined };
  }
  if (typeof descriptor.get === "function" || typeof descriptor.set === "function") {
    failTransportArguments();
  }
  if (!descriptor.enumerable) {
    failTransportArguments();
  }
  return { present: true, value: descriptor.value };
}

function requireExactBodyKeys(
  record: Record<string, unknown>,
  allowed: ReadonlyArray<string>,
): void {
  const keys: Array<string> = Object.keys(record);
  if (keys.length !== allowed.length) {
    failTransportArguments();
  }
  for (const key of keys) {
    if (!allowed.includes(key)) {
      failTransportArguments();
    }
  }
}

function checkDraftBody(record: Record<string, unknown>, expectedRoutineId: string): void {
  requireExactBodyKeys(record, ["id"]);
  const id = readBodyField(record, "id");
  if (!id.present || !isCanonicalUuid(id.value) || id.value !== expectedRoutineId) {
    failTransportArguments();
  }
}

function checkSaveBody(record: Record<string, unknown>): void {
  requireExactBodyKeys(record, ["name"]);
  const name = readBodyField(record, "name");
  if (!name.present || typeof name.value !== "string" || (name.value as string).length === 0) {
    failTransportArguments();
  }
}

function checkPopulateBody(record: Record<string, unknown>, routineId: string): void {
  requireExactBodyKeys(record, ["id", "name", "isDraft", "exercises"]);
  const id = readBodyField(record, "id");
  if (!id.present || !isCanonicalUuid(id.value) || id.value !== routineId) {
    failTransportArguments();
  }
  const name = readBodyField(record, "name");
  if (!name.present || typeof name.value !== "string") {
    failTransportArguments();
  }
  const draft = readBodyField(record, "isDraft");
  if (!draft.present || draft.value !== true) {
    failTransportArguments();
  }
  const exercises = readBodyField(record, "exercises");
  if (!exercises.present || !Array.isArray(exercises.value)) {
    failTransportArguments();
  }
}

// ---------------------------------------------------------------------------
// Facade state. One serialized auth controller; resource networking may
// overlap. grantRevision is private volatile concurrency bookkeeping (not
// a vault field): incremented on every durable successor install so
// concurrent delayed 401s reuse the installed successor.
// ---------------------------------------------------------------------------

interface ActiveAuth {
  readonly snapshot: ParsedBinding;
  readonly leaderSignal: AbortSignal;
  readonly dispatch: AbortController;
  readonly outcome: Promise<void>;
}

interface AuthRefs {
  readonly owner: object;
  readonly readVaultFn: (...args: Array<never>) => unknown;
  readonly commitFn: (...args: Array<never>) => unknown;
  readonly capture: ParsedBinding;
  readonly clock: ClockCapture;
  transport: BackendTransport | null;
  vaultSnapshot: Uint8Array;
  /** In-flight owned commit target, published synchronously before the commit await. */
  vaultTransition: Uint8Array | null;
  grant: VaultGrantRecord | null;
  pending: VaultPendingRefresh | null;
  fenced: boolean;
  /** Explicit local invalidate (vs storage-failure fence): genuine interruption priority. */
  invalidated: boolean;
  active: ActiveAuth | null;
  grantRevision: number;
  /** Monotonic auth-cycle epoch, incremented synchronously on every leader publish. */
  authSeq: number;
  maxRequestBytes: number;
  resources: Set<AbortController>;
}

/** One shared auth cycle per preflight/reactive stage, including hook joins. */
interface StageUse {
  used: boolean;
}

/**
 * Per-leg bookkeeping, isolated per leg via AsyncLocalStorage (private,
 * no API change, no mutable caller aliases): the actually selected bearer
 * revision, the synchronous handoff admission token, the owning stage for
 * one-cycle accounting, and the private joined-auth provenance for mapping
 * outside the generic T05 hook boundary.
 */
interface LegCtx {
  revision: number | null;
  admitSeq: number | null;
  admitted: boolean;
  stage: StageUse | null;
  joinError: { readonly error: unknown } | null;
}

const legStore = new AsyncLocalStorage<LegCtx>();

function fenceRefs(refs: AuthRefs): void {
  refs.fenced = true;
}

function nowMs(refs: AuthRefs): number {
  let raw: unknown;
  try {
    raw = refs.clock === null ? Date.now() : refs.clock.fn();
  } catch {
    throw new SessionError("invalid_arguments");
  }
  return assertClockMs(raw);
}

async function readOwnerVault(refs: AuthRefs): Promise<Uint8Array> {
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

/**
 * Establish owner validity and expected vault bytes; fence closed on drift.
 * Tolerance is bounded to actual owned transition/read overlap (read
 * provenance, never permanent history): a read begun before an owned
 * acknowledgement may complete against its start snapshot, and a read may
 * observe the synchronously published in-flight owned target or the live
 * snapshot at comparison time. A fresh read after acknowledgement with no
 * in-flight owned transition must observe current durable bytes; an
 * external rollback to any historical record fences. No awaiting of the
 * shared auth cycle happens here, so auth-owned hooks can never deadlock.
 */
async function checkOwnerMatches(refs: AuthRefs, expected: Uint8Array): Promise<void> {
  const startSnapshot: Uint8Array = refs.vaultSnapshot;
  const startTransition: Uint8Array | null = refs.vaultTransition;
  const current: Uint8Array = await readOwnerVault(refs);
  if (refs.fenced) {
    failInterrupted();
  }
  if (bytesEqual(current, expected) || bytesEqual(current, startSnapshot)) {
    return;
  }
  if (startTransition !== null && bytesEqual(current, startTransition)) {
    return;
  }
  const liveTransition: Uint8Array | null = refs.vaultTransition;
  if (liveTransition !== null && bytesEqual(current, liveTransition)) {
    return;
  }
  if (bytesEqual(current, refs.vaultSnapshot)) {
    return;
  }
  fenceRefs(refs);
  failInterrupted();
}

/** Publish an owned commit target synchronously before its commit await. */
function beginOwnedCommit(refs: AuthRefs, bytes: Uint8Array): void {
  refs.vaultTransition = new Uint8Array(bytes);
}

/** Install the acked snapshot synchronously after durable acknowledgement. */
function endOwnedCommitSuccess(refs: AuthRefs, bytes: Uint8Array): void {
  refs.vaultSnapshot = new Uint8Array(bytes);
  refs.vaultTransition = null;
}

/**
 * A T04 commit cannot be retracted once begun: await its owned completion
 * even if cancellation arrives mid-commit. A T04 failure permanently
 * fences this facade and propagates its original safe StorageError; state
 * is never cleaned or reinitialized here.
 */
async function commitVaultBytes(refs: AuthRefs, bytes: Uint8Array): Promise<void> {
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

const RESOURCE_ROUTES: Readonly<Record<string, { method: string; keyKind: string | null }>> = {
  search_exercises: { method: "GET", keyKind: null },
  get_exercise: { method: "GET", keyKind: null },
  list_workouts: { method: "GET", keyKind: null },
  get_workout: { method: "GET", keyKind: null },
  list_routines: { method: "GET", keyKind: null },
  get_routine: { method: "GET", keyKind: null },
  create_draft: { method: "POST", keyKind: "resource" },
  populate_draft: { method: "PUT", keyKind: "resource" },
  save_routine: { method: "POST", keyKind: "resource" },
};

/**
 * Private T05 session hooks. They deliberately hold no auth-controller
 * lock: T05 invokes them while an auth cycle or resource leg awaits
 * dispatch on this same facade, so blocking would deadlock. They validate
 * four-field identity, exclusive owner with expected vault bytes, and the
 * local fence directly. Owned rotation updates expected vault atomically,
 * so exact-byte comparison still passes for unrelated in-flight resources
 * (current and expected advance together); only external drift fences.
 */
function buildInternalHooks(refs: AuthRefs): SessionHooks {
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

  const selectCredential = async (
    binding: CallBinding,
    route: string,
    signal: AbortSignal,
  ): Promise<CredentialMaterial | null> => {
    const caller: AbortSignal = assertSignal(signal);
    let snapshot: ParsedBinding;
    try {
      snapshot = assertBinding(binding);
    } catch {
      fenceRefs(refs);
      throw new SessionError("operation_interrupted");
    }
    if (
      typeof route !== "string" ||
      Object.prototype.hasOwnProperty.call(RESOURCE_ROUTES, route) === false
    ) {
      throw new SessionError("invalid_arguments");
    }
    throwIfAborted(caller);
    if (!bindingsEqual(snapshot, refs.capture) || refs.fenced) {
      fenceRefs(refs);
      failInterrupted();
    }
    throwIfAborted(caller);
    // Admission closes at actual selection: a resource arriving while a
    // shared cycle is active joins it (even before its pending prepare is
    // acknowledged) instead of sending the apparently-live predecessor.
    // Controls never call selectCredential, so awaiting here can never
    // deadlock a control hook on its own cycle. Joins consume the leg's
    // stage (one cycle per stage); join failures record provenance for
    // S4 mapping outside the generic T05 hook boundary.
    const activeAtEntry: ActiveAuth | null = refs.active;
    if (activeAtEntry !== null) {
      const store: LegCtx | undefined = legStore.getStore();
      const stage: StageUse | null = store?.stage ?? null;
      if (stage !== null && stage.used) {
        throw new SessionError("operation_interrupted");
      }
      if (stage !== null) {
        stage.used = true;
      }
      try {
        await attachToAuth(refs, activeAtEntry, snapshot, caller);
      } catch (joinError) {
        if (store !== undefined && store.joinError === null) {
          store.joinError = { error: joinError };
        }
        throw new SessionError("operation_interrupted");
      }
      throwIfAborted(caller);
      if (refs.fenced) {
        failInterrupted();
      }
      if (!bindingsEqual(snapshot, refs.capture)) {
        fenceRefs(refs);
        failInterrupted();
      }
      throwIfAborted(caller);
    }
    await checkOwnerMatches(refs, refs.vaultSnapshot);
    if (refs.fenced) {
      failInterrupted();
    }
    throwIfAborted(caller);
    // Pending predecessor is never selected as bearer. No pending and
    // live access+refresh is the only selectable state here; expired
    // material yields null (orchestration rejoins auth between legs;
    // a null here means terminally unusable with no active cycle, so the
    // leg fails authentication_required without dispatch).
    // The revision actually selected is recorded synchronously with the
    // grant read into the per-leg async context, so the later 401
    // decision identifies the dispatched bearer rather than pre-hook state.
    if (refs.pending !== null) {
      return null;
    }
    const held: VaultGrantRecord | null = refs.grant;
    const selectedRevision: number = refs.grantRevision;
    if (held === null) {
      return null;
    }
    const now: number = nowMs(refs);
    throwIfAborted(caller);
    if (refs.fenced) {
      failInterrupted();
    }
    if (!bindingsEqual(snapshot, refs.capture)) {
      fenceRefs(refs);
      failInterrupted();
    }
    if (refs.pending !== null || refs.grant !== held) {
      return null;
    }
    if (now >= held.refreshExpiresMs || now >= held.accessExpiresMs) {
      return null;
    }
    const store: LegCtx | undefined = legStore.getStore();
    if (store !== undefined) {
      store.revision = selectedRevision;
    }
    return Object.freeze({
      bearerToken: held.accessToken,
      forBinding: Object.freeze({ ...toCallBinding(refs.capture) }),
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
    if (gate.routeLabel === "auth_refresh") {
      // Exactly one control attempt per dispatch, only while durable
      // pending evidence is held: replay uses the original durable
      // body/key, the optional fresh rotation uses its own newly
      // durable body/key. Each dispatch checks currently persisted
      // evidence; no bearer, route, or origin change is admitted.
      if (refs.active === null || refs.pending === null) {
        failInterrupted();
      }
      if (
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
      return;
    }
    if (Object.prototype.hasOwnProperty.call(RESOURCE_ROUTES, gate.routeLabel)) {
      const table = RESOURCE_ROUTES[gate.routeLabel] as { method: string; keyKind: string | null };
      if (gate.method !== table.method || gate.keyKind !== table.keyKind || gate.attempt !== 1) {
        failInterrupted();
      }
      // Handoff admission likewise joins a late-started shared cycle
      // rather than sending during its unresolved prepare/commit. The
      // auth_refresh branch above never waits, so control hooks cannot
      // deadlock on their own cycle. Awaited followers revalidate below.
      // The synchronous admission token is published at the end of this
      // handoff gate (no await between it and return); the sync isCurrent
      // at actual wire time enforces it race-safely (see below).
      const activeAtHandoff: ActiveAuth | null = refs.active;
      if (activeAtHandoff !== null) {
        const handoffStore: LegCtx | undefined = legStore.getStore();
        const handoffStage: StageUse | null = handoffStore?.stage ?? null;
        if (handoffStage !== null && handoffStage.used) {
          throw new SessionError("operation_interrupted");
        }
        if (handoffStage !== null) {
          handoffStage.used = true;
        }
        try {
          await attachToAuth(refs, activeAtHandoff, snapshot, caller);
        } catch (joinError) {
          if (handoffStore !== undefined && handoffStore.joinError === null) {
            handoffStore.joinError = { error: joinError };
          }
          throw new SessionError("operation_interrupted");
        }
        throwIfAborted(caller);
        if (!bindingsEqual(snapshot, refs.capture) || refs.fenced) {
          fenceRefs(refs);
          failInterrupted();
        }
        throwIfAborted(caller);
      }
      throwIfAborted(caller);
      const admitStore: LegCtx | undefined = legStore.getStore();
      if (admitStore !== undefined) {
        admitStore.admitSeq = refs.active === null && refs.pending === null ? refs.authSeq : null;
      }
      return;
    }
    failInterrupted();
  };

  /**
   * Synchronous race-safe admission at actual wire/delivery time. No await
   * may occur here. Control dispatches (no per-leg store) keep binding/
   * fence semantics so auth never blocks its own cycle. Resource legs:
   * the first call per attempt (pre-send handoff) requires the admission
   * token published synchronously at the end of resource beforeDispatch to
   * still match the live auth epoch with no unresolved cycle/pending; it is
   * then consumed so the second call (pre-delivery) tolerates owned
   * transitions during flight (owner ring + final current-deadline guard
   * govern delivery) instead of invalidating unrelated responses.
   */
  const isCurrent = (binding: CallBinding): boolean => {
    if (refs.fenced) {
      return false;
    }
    if (!isBindingEqualToCapture(binding, refs.capture)) {
      return false;
    }
    const store: LegCtx | undefined = legStore.getStore();
    if (store === undefined) {
      return true;
    }
    if (store.admitted) {
      return true;
    }
    if (store.admitSeq === null || store.admitSeq !== refs.authSeq) {
      return false;
    }
    if (refs.active !== null || refs.pending !== null) {
      return false;
    }
    store.admitted = true;
    return true;
  };

  return { checkBinding, selectCredential, beforeDispatch, isCurrent };
}

export async function openAuthenticatedSessionState(
  options: RefreshSessionStateOptions,
): Promise<AuthenticatedSessionState> {
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
  const refs: AuthRefs = {
    owner,
    readVaultFn,
    commitFn,
    capture: ownerBinding,
    clock,
    transport: null,
    vaultSnapshot: new Uint8Array(0),
    vaultTransition: null,
    grant: null,
    pending: null,
    fenced: false,
    invalidated: false,
    active: null,
    grantRevision: 0,
    authSeq: 0,
    maxRequestBytes: 262144,
    resources: new Set<AbortController>(),
  };
  const hooks: SessionHooks = buildInternalHooks(refs);
  // Validate the caller's complete original config first (bad configs,
  // unknown keys, and invalid maxAttempts propagate their safe
  // TransportError untouched). Only then cap resource attempts privately:
  // each S4 resource leg uses T05 maxAttempts=1 while controls already
  // use attempt 1. T05 itself is unchanged for direct callers.
  createBackendTransport(configRaw as unknown as TrustedTransportConfig, { session: hooks });
  const validatedConfig = configRaw as unknown as {
    readonly origin?: unknown;
    readonly allowInsecureLoopback?: unknown;
    readonly budgets?: unknown;
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
  let cappedBudgets: Record<string, unknown> | undefined;
  {
    const budgetsRaw: unknown = validatedConfig.budgets;
    if (budgetsRaw !== undefined) {
      // Post-factory reads are safe: the accepted config is a proven
      // plain record of data values, so no accessor is invoked here.
      const budgetEntries = captureEntries(budgetsRaw);
      cappedBudgets = {};
      for (const entry of budgetEntries) {
        (cappedBudgets as Record<string, unknown>)[entry[0]] = entry[1];
      }
      cappedBudgets["maxAttempts"] = 1;
      const maxRequestRaw: unknown = cappedBudgets["maxRequestBytes"];
      if (typeof maxRequestRaw === "number") {
        refs.maxRequestBytes = maxRequestRaw;
      }
    } else {
      cappedBudgets = { maxAttempts: 1 };
    }
  }
  const cappedConfig: Record<string, unknown> = {
    origin: validatedConfig.origin,
  };
  if (validatedConfig.allowInsecureLoopback !== undefined) {
    cappedConfig["allowInsecureLoopback"] = validatedConfig.allowInsecureLoopback;
  }
  {
    const testCaRaw: unknown = (validatedConfig as Record<string, unknown>)["testCaPem"];
    if (testCaRaw !== undefined) {
      cappedConfig["testCaPem"] = testCaRaw;
    }
  }
  cappedConfig["budgets"] = cappedBudgets;
  const transport: BackendTransport = createBackendTransport(
    cappedConfig as unknown as TrustedTransportConfig,
    { session: hooks },
  );
  refs.transport = transport;

  // Opening establishes no auth cycle; owner failures propagate unchanged.
  // No write, migration, key generation, or dispatch happens here, and
  // pending evidence opens as exact S3 recovery state (never settled).
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
  return createAuthenticatedFacade(refs);
}

// ---------------------------------------------------------------------------
// Shared auth controller (exact S3 recovery + durable fresh rotation).
// One serialized cycle; concurrent valid resource needs coordinate here
// instead of S3 mixed-kind refusal. Resource networking itself overlaps.
// ---------------------------------------------------------------------------

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
 * keeping installed/pending state with no rollback.
 */
function attachLeaderToAuth(
  refs: AuthRefs,
  cycle: ActiveAuth,
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
 * Attach a validated caller to the one shared auth cycle. A follower may
 * abort its own wait (operation_interrupted) without cancelling or
 * rekeying the leader's attempt; a leader abort cancels T05 and
 * nonaborted followers receive the shared failed outcome. Every waiter
 * rechecks captured identity, fence, and its own signal before success.
 */
function attachToAuth(
  refs: AuthRefs,
  cycle: ActiveAuth,
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

async function runLeaderAuth(
  refs: AuthRefs,
  cycle: ActiveAuth,
  gate: { resolve(): void; reject(error: unknown): void },
  onLeaderAbort: () => void,
  execute: (refs: AuthRefs, cycle: ActiveAuth) => Promise<void>,
): Promise<void> {
  try {
    await execute(refs, cycle);
    // Terminal settlement recheck AFTER all async cycle work: a leader
    // cancellation arriving in this gap must fail the shared outcome for
    // live followers rather than resolve success. Installed state stays.
    if (cycle.leaderSignal.aborted || refs.fenced || !bindingsEqual(cycle.snapshot, refs.capture)) {
      gate.reject(new SessionError("operation_interrupted"));
    } else {
      gate.resolve();
    }
  } catch (error) {
    gate.reject(error);
  } finally {
    cycle.leaderSignal.removeEventListener("abort", onLeaderAbort);
    if (refs.active === cycle) {
      refs.active = null;
    }
  }
}

function enterAuthCycle(
  refs: AuthRefs,
  snapshot: ParsedBinding,
  caller: AbortSignal,
  execute: (refs: AuthRefs, cycle: ActiveAuth) => Promise<void>,
): { readonly cycle: ActiveAuth; readonly isLeader: boolean } {
  const current: ActiveAuth | null = refs.active;
  if (current !== null) {
    return { cycle: current, isLeader: false };
  }
  const dispatch = new AbortController();
  const gate = createOutcomeGate();
  const cycle: ActiveAuth = {
    snapshot,
    leaderSignal: caller,
    dispatch,
    outcome: gate.outcome,
  };
  refs.authSeq += 1;
  refs.active = cycle;
  const onLeaderAbort = (): void => {
    dispatch.abort();
  };
  if (caller.aborted) {
    dispatch.abort();
  } else {
    caller.addEventListener("abort", onLeaderAbort, { once: true });
  }
  void runLeaderAuth(refs, cycle, gate, onLeaderAbort, execute);
  return { cycle, isLeader: true };
}

async function joinOrStartAuth(
  refs: AuthRefs,
  snapshot: ParsedBinding,
  caller: AbortSignal,
  execute: (refs: AuthRefs, cycle: ActiveAuth) => Promise<void>,
): Promise<void> {
  const entered = enterAuthCycle(refs, snapshot, caller, execute);
  if (entered.isLeader) {
    return attachLeaderToAuth(refs, entered.cycle, snapshot, caller);
  }
  return attachToAuth(refs, entered.cycle, snapshot, caller);
}

/**
 * Dispatch the currently durable prepared attempt (exactly one T05
 * control call with detached copies of the durable body/key) and
 * atomically install its validated same-account successor with pending
 * cleared. Any transport error, bad response, cancellation, or
 * invalidation after prepare leaves the exact pending/predecessor
 * evidence intact.
 */
async function dispatchPreparedAttempt(refs: AuthRefs, cycle: ActiveAuth): Promise<void> {
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
  const successor: VaultGrantRecord = parseServiceGrant(rawBody);
  if (successor.accountUuid !== refs.capture.accountUuid) {
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
 * without follow-on rotation on this path.
 */
async function installSuccessorGrant(
  refs: AuthRefs,
  cycle: ActiveAuth,
  successor: VaultGrantRecord,
): Promise<void> {
  const caller: AbortSignal = cycle.leaderSignal;
  {
    const preCommitNow: number = nowMs(refs);
    if (preCommitNow >= successor.refreshExpiresMs) {
      throw new SessionError("reauthentication_required");
    }
  }
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  await checkOwnerMatches(refs, refs.vaultSnapshot);
  if (refs.fenced) {
    failInterrupted();
  }
  throwIfAborted(caller);
  const settledBytes: Uint8Array = encodeRefreshVaultBytes(refs.capture, successor, null);
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
  beginOwnedCommit(refs, settledBytes);
  await commitVaultBytes(refs, settledBytes);
  endOwnedCommitSuccess(refs, settledBytes);
  refs.grant = successor;
  refs.pending = null;
  refs.grantRevision += 1;
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
}

/** Fresh-only rotation: S2 semantics with durable prepare, one dispatch, atomic install. */
async function executeFreshRotation(refs: AuthRefs, cycle: ActiveAuth): Promise<void> {
  const caller: AbortSignal = cycle.leaderSignal;
  if (refs.fenced) {
    failInterrupted();
  }
  if (!bindingsEqual(cycle.snapshot, refs.capture)) {
    failInterrupted();
  }
  const held: VaultGrantRecord | null = refs.grant;
  if (held === null || refs.capture.accountUuid === null) {
    throw new SessionError("authentication_required");
  }
  if (refs.pending !== null) {
    // A consumed uncertain predecessor is never rotated under another
    // key here; exact recovery owns pending evidence.
    throw new SessionError("reauthentication_required");
  }
  {
    const now: number = nowMs(refs);
    if (now >= held.refreshExpiresMs) {
      throw new SessionError("reauthentication_required");
    }
  }
  throwIfAborted(caller);
  await checkOwnerMatches(refs, refs.vaultSnapshot);
  if (refs.fenced) {
    failInterrupted();
  }
  throwIfAborted(caller);
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
  const authKey: string = randomUUID();
  const requestBytes: Uint8Array = buildRefreshRequestBytes(held.refreshToken);
  const pending: VaultPendingRefresh = Object.freeze({
    predecessor: held,
    refreshToken: held.refreshToken,
    bodyBase64: encodeBodyBase64(requestBytes),
    authKey,
  });
  const preparedBytes: Uint8Array = encodeRefreshVaultBytes(refs.capture, held, pending);
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
  beginOwnedCommit(refs, preparedBytes);
  await commitVaultBytes(refs, preparedBytes);
  endOwnedCommitSuccess(refs, preparedBytes);
  refs.pending = pending;
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  await dispatchPreparedAttempt(refs, cycle);
  // Terminal usability: EVERY cycle requires live access+refresh with
  // post-clock leader/fence checks. An installed expired-access grant
  // fails the shared cycle (followers share it) without another rotation.
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  const installed: VaultGrantRecord | null = refs.grant;
  if (installed === null) {
    failInterrupted();
  }
  const doneNow: number = nowMs(refs);
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

/** Exact S3 recovery: original replay first, then at most one distinct fresh rotation. */
async function executeRecovery(refs: AuthRefs, cycle: ActiveAuth): Promise<void> {
  const caller: AbortSignal = cycle.leaderSignal;
  if (refs.fenced) {
    failInterrupted();
  }
  if (!bindingsEqual(cycle.snapshot, refs.capture)) {
    failInterrupted();
  }
  const held: VaultGrantRecord | null = refs.grant;
  if (held === null || refs.capture.accountUuid === null) {
    throw new SessionError("authentication_required");
  }
  if (refs.pending !== null) {
    await replayOriginalAttempt(refs, cycle);
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
      throw new SessionError("reauthentication_required");
    }
    if (now >= recovered.accessExpiresMs) {
      await runFreshRotation(refs, cycle, recovered);
      return;
    }
    throwIfAborted(caller);
    if (refs.fenced) {
      failInterrupted();
    }
    if (!bindingsEqual(cycle.snapshot, refs.capture)) {
      failInterrupted();
    }
    return;
  }
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
      throw new SessionError("reauthentication_required");
    }
    if (now >= held.accessExpiresMs) {
      await runFreshRotation(refs, cycle, held);
      return;
    }
  }
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  if (!bindingsEqual(cycle.snapshot, refs.capture)) {
    failInterrupted();
  }
}

async function replayOriginalAttempt(refs: AuthRefs, cycle: ActiveAuth): Promise<void> {
  const caller: AbortSignal = cycle.leaderSignal;
  const pending: VaultPendingRefresh | null = refs.pending;
  if (pending === null) {
    failInterrupted();
  }
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
  const result = await transport.authRefresh(
    dispatchBinding,
    durableBody,
    durableKey,
    cycle.dispatch.signal,
  );
  const rawBody: Uint8Array = result.rawBodyBytes;
  const successor: VaultGrantRecord = parseServiceGrant(rawBody);
  if (successor.accountUuid !== refs.capture.accountUuid) {
    throw new SessionError("invalid_grant");
  }
  await installSuccessorGrant(refs, cycle, successor);
}

async function runFreshRotation(
  refs: AuthRefs,
  cycle: ActiveAuth,
  predecessor: VaultGrantRecord,
): Promise<void> {
  const caller: AbortSignal = cycle.leaderSignal;
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
  const authKey: string = randomUUID();
  const requestBytes: Uint8Array = buildRefreshRequestBytes(predecessor.refreshToken);
  const pending: VaultPendingRefresh = Object.freeze({
    predecessor,
    refreshToken: predecessor.refreshToken,
    bodyBase64: encodeBodyBase64(requestBytes),
    authKey,
  });
  const preparedBytes: Uint8Array = encodeRefreshVaultBytes(refs.capture, predecessor, pending);
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
  beginOwnedCommit(refs, preparedBytes);
  await commitVaultBytes(refs, preparedBytes);
  endOwnedCommitSuccess(refs, preparedBytes);
  refs.pending = pending;
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  await dispatchPreparedAttempt(refs, cycle);
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  const installed: VaultGrantRecord | null = refs.grant;
  if (installed === null) {
    failInterrupted();
  }
  const doneNow: number = nowMs(refs);
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  if (!bindingsEqual(cycle.snapshot, refs.capture)) {
    failInterrupted();
  }
  // A fresh result with expired access but live refresh is already
  // installed; report reauthentication_required instead of looping.
  // A valid refresh returning expired access is installed, then fails
  // closed — never another rotation within this auth cycle.
  if (doneNow >= installed.refreshExpiresMs || doneNow >= installed.accessExpiresMs) {
    throw new SessionError("reauthentication_required");
  }
}

// ---------------------------------------------------------------------------
// Preflight (before first bearer selection) and reactive (after an
// eligible 401) auth needs. Pending always takes exact S3 recovery
// priority; its predecessor is never selected as bearer.
// ---------------------------------------------------------------------------

function currentGrantUsable(refs: AuthRefs, now: number): boolean {
  const held: VaultGrantRecord | null = refs.grant;
  if (held === null || refs.pending !== null) {
    return false;
  }
  return now < held.accessExpiresMs && now < held.refreshExpiresMs;
}

/** Use the stage's single shared cycle; fail closed if already consumed. */
async function stageJoin(
  stage: StageUse,
  refs: AuthRefs,
  snapshot: ParsedBinding,
  caller: AbortSignal,
  execute: (refs: AuthRefs, cycle: ActiveAuth) => Promise<void>,
): Promise<void> {
  if (stage.used) {
    throw new SessionError("reauthentication_required");
  }
  stage.used = true;
  await joinOrStartAuth(refs, snapshot, caller, execute);
}

async function ensurePreflightAuth(
  refs: AuthRefs,
  snapshot: ParsedBinding,
  caller: AbortSignal,
  stage: StageUse,
): Promise<void> {
  if (refs.fenced) {
    failInterrupted();
  }
  if (!bindingsEqual(snapshot, refs.capture)) {
    failInterrupted();
  }
  // Join an already active cycle even before its pending prepare is
  // acknowledged: the predecessor may still appear live locally while
  // its replacement is being prepared. Followers receive that cycle's
  // outcome with follower-local cancellation. This consumes the stage's
  // single shared cycle: usability is rechecked after it, but any still-
  // expired deadline or further pending afterwards fails closed rather
  // than silently starting another cycle in this same preflight stage.
  if (refs.active !== null) {
    await stageJoin(stage, refs, snapshot, caller, executeRecovery);
    if (refs.fenced) {
      failInterrupted();
    }
    if (!bindingsEqual(snapshot, refs.capture)) {
      failInterrupted();
    }
  }
  const held: VaultGrantRecord | null = refs.grant;
  if (held === null || refs.capture.accountUuid === null) {
    throw new SessionError("authentication_required");
  }
  if (refs.pending !== null) {
    await stageJoin(stage, refs, snapshot, caller, executeRecovery);
    return;
  }
  const now: number = nowMs(refs);
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  if (!bindingsEqual(snapshot, refs.capture)) {
    failInterrupted();
  }
  // Recheck pending after the clock callback (a concurrent install
  // could have cleared it or a new failure installed it).
  if (refs.pending !== null) {
    await stageJoin(stage, refs, snapshot, caller, executeRecovery);
    return;
  }
  const current: VaultGrantRecord | null = refs.grant;
  if (current === null) {
    throw new SessionError("authentication_required");
  }
  if (now >= current.refreshExpiresMs) {
    throw new SessionError("reauthentication_required");
  }
  if (now >= current.accessExpiresMs) {
    await stageJoin(stage, refs, snapshot, caller, executeFreshRotation);
    return;
  }
}

async function ensureReactiveAuth(
  refs: AuthRefs,
  snapshot: ParsedBinding,
  caller: AbortSignal,
  dispatchRevision: number,
  stage: StageUse,
): Promise<void> {
  if (refs.fenced) {
    failInterrupted();
  }
  if (!bindingsEqual(snapshot, refs.capture)) {
    failInterrupted();
  }
  // Pending always wins: exact S3 recovery, never a fresh rotation
  // under another key over a consumed uncertain predecessor.
  if (refs.pending !== null) {
    await stageJoin(stage, refs, snapshot, caller, executeRecovery);
    return;
  }
  // Another caller already durably installed a newer usable grant:
  // reuse it for the one retry without a redundant rotation. Delayed
  // 401s from the older revision share the successor.
  if (refs.grantRevision > dispatchRevision) {
    const now: number = nowMs(refs);
    throwIfAborted(caller);
    if (refs.fenced) {
      failInterrupted();
    }
    if (refs.pending === null && currentGrantUsable(refs, now)) {
      return;
    }
    // Newer revision is not usable (or pending arrived): fall through
    // to shared-cycle join / recovery below.
    if (refs.pending !== null) {
      await stageJoin(stage, refs, snapshot, caller, executeRecovery);
      return;
    }
  }
  if (refs.active !== null) {
    // A shared cycle is active: join it. A live recovered successor
    // satisfies this step; an expired recovered access permits its one
    // distinct rotation inside that cycle.
    await stageJoin(stage, refs, snapshot, caller, executeRecovery);
    return;
  }
  if (refs.pending !== null) {
    await stageJoin(stage, refs, snapshot, caller, executeRecovery);
    return;
  }
  // Same revision, no pending: force one durable fresh rotation even
  // when access's local deadline is live (backend authorization is
  // authoritative). A live recovered successor from a just-joined
  // recovery satisfies instead; expired recovered access permits its
  // one distinct rotation inside recovery.
  await stageJoin(stage, refs, snapshot, caller, executeFreshRotation);
}

/** Map auth-stage failures to the S4 resource boundary (pending retained, no secrets). */
function mapAuthFailure(error: unknown): never {
  if (error instanceof SessionError) {
    if (error.code === "operation_interrupted" || error.code === "authentication_required") {
      throw error;
    }
    if (
      error.code === "invalid_grant" ||
      error.code === "reauthentication_required" ||
      error.code === "invalid_arguments"
    ) {
      if (error.code === "invalid_arguments") {
        throw error;
      }
      throw new SessionError("reauthentication_required");
    }
    throw error;
  }
  if (isTransportError(error)) {
    if (error.code === "operation_interrupted") {
      throw error;
    }
    // Network/rate-limit/409/legacy-precision and every other safe auth
    // TransportError means unresolved auth: never silently settled.
    throw new SessionError("reauthentication_required");
  }
  throw error;
}

function isEligibleFirst401(error: unknown): boolean {
  if (!isTransportError(error)) {
    return false;
  }
  if (error.status !== 401) {
    return false;
  }
  if (error.code !== "authentication_required" && error.code !== "reauthentication_required") {
    return false;
  }
  // Only a validated, delivered definite rejection permits refresh.
  // Malformed 401s, fencing/overflow, and uncertain mutation loss never
  // start auth refresh here.
  if (error.dispatched !== true || error.outcomeUnknown !== false) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Resource orchestration: at most two single-attempt legs, one shared auth
// cycle per stage, unchanged captured identity across the retry.
// ---------------------------------------------------------------------------

type LegDispatcher<T> = (signal: AbortSignal) => Promise<T>;

interface LegMeta {
  readonly attempts: number;
  readonly elapsedMs: number;
  readonly correlationId: string;
  readonly status: number;
}

function readLegMeta(value: unknown): LegMeta | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const attempts: unknown = record["attempts"];
  const elapsedMs: unknown = record["elapsedMs"];
  const correlationId: unknown = record["correlationId"];
  const status: unknown = record["status"];
  if (
    typeof attempts !== "number" ||
    typeof elapsedMs !== "number" ||
    typeof correlationId !== "string" ||
    typeof status !== "number"
  ) {
    return null;
  }
  return { attempts, elapsedMs, correlationId, status };
}

/** Suppress a received success conservatively: no late success, no downgrade. */
function suppressDeliveredSuccess(
  meta: LegMeta | null,
  isMutation: boolean,
  reason: "operation_interrupted" | "reauthentication_required" | "invalid_arguments",
): never {
  throw new TransportError(reason, {
    backendErrorCode: null,
    retryAfterSeconds: null,
    status: meta?.status ?? null,
    dispatched: true,
    outcomeUnknown: isMutation,
    attempts: meta?.attempts ?? 0,
    elapsedMs: meta?.elapsedMs ?? 0,
    correlationId: meta?.correlationId ?? "",
  });
}

/**
 * Final delivery guard: synchronous, called immediately after the final
 * awaited owner validation with no further await/caller callback before
 * the actual resource outcome settlement. Identity, clock, abort/fence
 * (AFTER the clock callback), and the CURRENT durably installed session's
 * exact expiries are rechecked. A historical dispatched bearer's expiry
 * alone never fences an accepted same-binding response while the installed
 * successor is usable (rotation is not sign-out/replacement). Suppressed
 * mutation successes keep dispatched/outcomeUnknown instead of downgrading
 * to a pre-dispatch error.
 */
function checkFinalDelivery<T>(
  refs: AuthRefs,
  snapshot: ParsedBinding,
  caller: AbortSignal,
  received: T,
  isMutation: boolean,
): void {
  const meta: LegMeta | null = readLegMeta(received);
  if (!bindingsEqual(snapshot, refs.capture)) {
    suppressDeliveredSuccess(meta, isMutation, "operation_interrupted");
  }
  let now: number;
  try {
    now = nowMs(refs);
  } catch {
    suppressDeliveredSuccess(meta, isMutation, "invalid_arguments");
  }
  if (caller.aborted || refs.fenced) {
    suppressDeliveredSuccess(meta, isMutation, "operation_interrupted");
  }
  if (!bindingsEqual(snapshot, refs.capture)) {
    suppressDeliveredSuccess(meta, isMutation, "operation_interrupted");
  }
  const installed: VaultGrantRecord | null = refs.grant;
  if (installed === null) {
    suppressDeliveredSuccess(meta, isMutation, "reauthentication_required");
  }
  if (now >= installed.accessExpiresMs || now >= installed.refreshExpiresMs) {
    suppressDeliveredSuccess(meta, isMutation, "reauthentication_required");
  }
}

async function withResourceSignal<T>(
  refs: AuthRefs,
  caller: AbortSignal,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  refs.resources.add(controller);
  const onCallerAbort = (): void => {
    controller.abort();
  };
  // Tracked controllers are aborted synchronously by invalidate().
  if (caller.aborted) {
    controller.abort();
  } else {
    caller.addEventListener("abort", onCallerAbort, { once: true });
  }
  try {
    return await run(controller.signal);
  } finally {
    caller.removeEventListener("abort", onCallerAbort);
    refs.resources.delete(controller);
  }
}

/**
 * Map hook-boundary join/null outcomes outside generic T05 mapping.
 * A leg that never dispatched because a hook joined shared auth carries
 * the PRIVATE joined outcome: unresolved auth maps to safe
 * reauthentication_required via the specified S4 mapping, while actual
 * abort/fence/storage distinctions are preserved. A null credential with
 * retained pending evidence likewise means unresolved auth, not missing
 * login. Genuine missing material stays authentication_required.
 */
function mapHookJoinProvenance<T>(
  refs: AuthRefs,
  caller: AbortSignal,
  ctx: LegCtx,
  error: T,
): void {
  if (!isTransportError(error)) {
    return;
  }
  if (error.dispatched !== false) {
    return;
  }
  // Genuine observing-boundary interruption wins over any earlier recorded
  // join cause: an abort/invalidate arriving after the join recording must
  // not be overwritten by reauth from that earlier rejection. Storage-error
  // provenance still propagates (mapAuthFailure rethrows it) when storage
  // itself fenced; explicit local invalidate preserves interruption.
  if (caller.aborted || refs.invalidated) {
    return;
  }
  const joined: { readonly error: unknown } | null = ctx.joinError;
  if (joined !== null && error.code === "operation_interrupted") {
    mapAuthFailure(joined.error);
  }
  if (!refs.fenced && refs.pending !== null) {
    // Unresolved retained evidence (admission block or null selection
    // with no active cycle to join): not missing login. Genuine aborts,
    // fences, and dispatched outcomes keep their own semantics below.
    if (error.code === "authentication_required" || error.code === "operation_interrupted") {
      throw new SessionError("reauthentication_required");
    }
  }
}

async function orchestrateResource<T>(
  refs: AuthRefs,
  snapshot: ParsedBinding,
  caller: AbortSignal,
  dispatch: LegDispatcher<T>,
  isMutation: boolean,
): Promise<T> {
  // Preflight: join any active shared auth cycle (even before its pending
  // prepare is acknowledged) and ensure usable credentials before the
  // first bearer selection. Factory never does this. Each stage owns at
  // most one shared cycle, including hook joins during its legs.
  const preStage: StageUse = { used: false };
  try {
    await ensurePreflightAuth(refs, snapshot, caller, preStage);
  } catch (error) {
    mapAuthFailure(error);
  }
  throwIfAborted(caller);
  if (refs.fenced) {
    failInterrupted();
  }
  if (!bindingsEqual(snapshot, refs.capture)) {
    failInterrupted();
  }
  await checkOwnerMatches(refs, refs.vaultSnapshot);
  if (refs.fenced) {
    failInterrupted();
  }
  throwIfAborted(caller);
  const firstCtx: LegCtx = {
    revision: null,
    admitSeq: null,
    admitted: false,
    stage: preStage,
    joinError: null,
  };
  let first: T;
  try {
    first = await legStore.run(firstCtx, () => withResourceSignal(refs, caller, dispatch));
  } catch (error) {
    mapHookJoinProvenance(refs, caller, firstCtx, error);
    if (!isEligibleFirst401(error)) {
      throw error;
    }
    // The revision identifies the bearer actually selected for that leg
    // (recorded synchronously with selection in its async context), not
    // pre-hook state. Fall back to current revision only if the context
    // was unavailable; that forces rather than reuses, which stays safe.
    const dispatchRevision: number = firstCtx.revision ?? refs.grantRevision;
    // One reactive refresh-and-retry only, on its own single-cycle stage.
    const reStage: StageUse = { used: false };
    try {
      await ensureReactiveAuth(refs, snapshot, caller, dispatchRevision, reStage);
    } catch (authError) {
      mapAuthFailure(authError);
    }
    throwIfAborted(caller);
    if (refs.fenced) {
      failInterrupted();
    }
    if (!bindingsEqual(snapshot, refs.capture)) {
      failInterrupted();
    }
    await checkOwnerMatches(refs, refs.vaultSnapshot);
    if (refs.fenced) {
      failInterrupted();
    }
    throwIfAborted(caller);
    const secondCtx: LegCtx = {
      revision: null,
      admitSeq: null,
      admitted: false,
      stage: reStage,
      joinError: null,
    };
    try {
      const second: T = await legStore.run(secondCtx, () =>
        withResourceSignal(refs, caller, dispatch),
      );
      // Final delivery inline: the synchronous guard below runs in the
      // same tick as this owner await's continuation, with no further
      // await before the actual return. A received success is never
      // downgraded to a bare pre-dispatch error.
      try {
        await checkOwnerMatches(refs, refs.vaultSnapshot);
      } catch (error) {
        if (error instanceof SessionError && error.code === "operation_interrupted") {
          suppressDeliveredSuccess(readLegMeta(second), isMutation, "operation_interrupted");
        }
        throw error;
      }
      checkFinalDelivery(refs, snapshot, caller, second, isMutation);
      return second;
    } catch (secondError) {
      mapHookJoinProvenance(refs, caller, secondCtx, secondError);
      if (isEligibleFirst401(secondError)) {
        // Repeated definite 401: both legs were definite rejection
        // under the one-attempt policy, not mutation settlement.
        throw new SessionError("reauthentication_required");
      }
      throw secondError;
    }
  }
  // Final delivery inline: the synchronous guard below runs in the same
  // tick as this owner await's continuation, with no further await before
  // the actual return.
  try {
    await checkOwnerMatches(refs, refs.vaultSnapshot);
  } catch (error) {
    if (error instanceof SessionError && error.code === "operation_interrupted") {
      suppressDeliveredSuccess(readLegMeta(first), isMutation, "operation_interrupted");
    }
    throw error;
  }
  checkFinalDelivery(refs, snapshot, caller, first, isMutation);
  return first;
}

// ---------------------------------------------------------------------------
// Per-method entry capture: all own-data arguments/config/budgets/CA views,
// method receivers, and nested values before the first await. Local invalid
// route arguments/bodies/queries reject before preparing refresh or
// dispatching any request, using accepted T03/T05 semantics.
// ---------------------------------------------------------------------------

function captureQuery(
  tool: "search_exercises" | "list_workouts" | "list_routines",
  input: unknown,
): unknown {
  try {
    return parseArguments(tool, input);
  } catch {
    failTransportArguments();
  }
}

function captureId(value: unknown): string {
  if (!isCanonicalUuid(value)) {
    failTransportArguments();
  }
  return value as string;
}

function captureKey(value: unknown): string {
  if (!isCanonicalUuid(value)) {
    failTransportArguments();
  }
  return value as string;
}

function captureMutationBody(
  refs: AuthRefs,
  body: unknown,
  expectedId: string,
  shape: "draft" | "populate" | "save",
): Uint8Array {
  const copied: Uint8Array = captureResourceBodyBytes(body, refs.maxRequestBytes);
  const record: Record<string, unknown> = parseResourceBodyObject(copied);
  if (shape === "draft") {
    checkDraftBody(record, expectedId);
  } else if (shape === "save") {
    checkSaveBody(record);
  } else {
    checkPopulateBody(record, expectedId);
  }
  return copied;
}

function createAuthenticatedFacade(refs: AuthRefs): AuthenticatedSessionState {
  const searchExercises = async (
    captured: CallBinding,
    queryInput: unknown,
    signal: AbortSignal,
  ): Promise<SearchExercisesResult> => {
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
      failInterrupted();
    }
    const query: unknown = captureQuery("search_exercises", queryInput);
    throwIfAborted(caller);
    if (refs.grant === null) {
      throw new SessionError("authentication_required");
    }
    const binding: CallBinding = toCallBinding(snapshot);
    const transport: BackendTransport | null = refs.transport;
    if (transport === null) {
      failInterrupted();
    }
    return orchestrateResource<SearchExercisesResult>(
      refs,
      snapshot,
      caller,
      (legSignal) => transport.searchExercises(binding, query, legSignal),
      false,
    );
  };

  const getExercise = async (
    captured: CallBinding,
    exerciseId: string,
    signal: AbortSignal,
  ): Promise<ExerciseResult> => {
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
      failInterrupted();
    }
    const id: string = captureId(exerciseId);
    throwIfAborted(caller);
    if (refs.grant === null) {
      throw new SessionError("authentication_required");
    }
    const binding: CallBinding = toCallBinding(snapshot);
    const transport: BackendTransport | null = refs.transport;
    if (transport === null) {
      failInterrupted();
    }
    return orchestrateResource<ExerciseResult>(
      refs,
      snapshot,
      caller,
      (legSignal) => transport.getExercise(binding, id, legSignal),
      false,
    );
  };

  const listWorkouts = async (
    captured: CallBinding,
    queryInput: unknown,
    signal: AbortSignal,
  ): Promise<WorkoutListResult> => {
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
      failInterrupted();
    }
    const query: unknown = captureQuery("list_workouts", queryInput);
    throwIfAborted(caller);
    if (refs.grant === null) {
      throw new SessionError("authentication_required");
    }
    const binding: CallBinding = toCallBinding(snapshot);
    const transport: BackendTransport | null = refs.transport;
    if (transport === null) {
      failInterrupted();
    }
    return orchestrateResource<WorkoutListResult>(
      refs,
      snapshot,
      caller,
      (legSignal) => transport.listWorkouts(binding, query, legSignal),
      false,
    );
  };

  const getWorkout = async (
    captured: CallBinding,
    workoutId: string,
    signal: AbortSignal,
  ): Promise<WorkoutResult> => {
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
      failInterrupted();
    }
    const id: string = captureId(workoutId);
    throwIfAborted(caller);
    if (refs.grant === null) {
      throw new SessionError("authentication_required");
    }
    const binding: CallBinding = toCallBinding(snapshot);
    const transport: BackendTransport | null = refs.transport;
    if (transport === null) {
      failInterrupted();
    }
    return orchestrateResource<WorkoutResult>(
      refs,
      snapshot,
      caller,
      (legSignal) => transport.getWorkout(binding, id, legSignal),
      false,
    );
  };

  const listRoutines = async (
    captured: CallBinding,
    queryInput: unknown,
    signal: AbortSignal,
  ): Promise<RoutineListResult> => {
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
      failInterrupted();
    }
    const query: unknown = captureQuery("list_routines", queryInput);
    throwIfAborted(caller);
    if (refs.grant === null) {
      throw new SessionError("authentication_required");
    }
    const binding: CallBinding = toCallBinding(snapshot);
    const transport: BackendTransport | null = refs.transport;
    if (transport === null) {
      failInterrupted();
    }
    return orchestrateResource<RoutineListResult>(
      refs,
      snapshot,
      caller,
      (legSignal) => transport.listRoutines(binding, query, legSignal),
      false,
    );
  };

  const getRoutine = async (
    captured: CallBinding,
    routineId: string,
    signal: AbortSignal,
  ): Promise<RoutineResult> => {
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
      failInterrupted();
    }
    const id: string = captureId(routineId);
    throwIfAborted(caller);
    if (refs.grant === null) {
      throw new SessionError("authentication_required");
    }
    const binding: CallBinding = toCallBinding(snapshot);
    const transport: BackendTransport | null = refs.transport;
    if (transport === null) {
      failInterrupted();
    }
    return orchestrateResource<RoutineResult>(
      refs,
      snapshot,
      caller,
      (legSignal) => transport.getRoutine(binding, id, legSignal),
      false,
    );
  };

  const createDraft = async (
    captured: CallBinding,
    expectedRoutineId: string,
    body: Uint8Array,
    resourceKey: string,
    signal: AbortSignal,
  ): Promise<MutationResult> => {
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
      failInterrupted();
    }
    const id: string = captureId(expectedRoutineId);
    const key: string = captureKey(resourceKey);
    const bytes: Uint8Array = captureMutationBody(refs, body, id, "draft");
    throwIfAborted(caller);
    if (refs.grant === null) {
      throw new SessionError("authentication_required");
    }
    const binding: CallBinding = toCallBinding(snapshot);
    const transport: BackendTransport | null = refs.transport;
    if (transport === null) {
      failInterrupted();
    }
    return orchestrateResource<MutationResult>(
      refs,
      snapshot,
      caller,
      (legSignal) => transport.createDraft(binding, id, new Uint8Array(bytes), key, legSignal),
      true,
    );
  };

  const populateDraft = async (
    captured: CallBinding,
    routineId: string,
    body: Uint8Array,
    resourceKey: string,
    signal: AbortSignal,
  ): Promise<MutationResult> => {
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
      failInterrupted();
    }
    const id: string = captureId(routineId);
    const key: string = captureKey(resourceKey);
    const bytes: Uint8Array = captureMutationBody(refs, body, id, "populate");
    throwIfAborted(caller);
    if (refs.grant === null) {
      throw new SessionError("authentication_required");
    }
    const binding: CallBinding = toCallBinding(snapshot);
    const transport: BackendTransport | null = refs.transport;
    if (transport === null) {
      failInterrupted();
    }
    return orchestrateResource<MutationResult>(
      refs,
      snapshot,
      caller,
      (legSignal) => transport.populateDraft(binding, id, new Uint8Array(bytes), key, legSignal),
      true,
    );
  };

  const saveRoutine = async (
    captured: CallBinding,
    routineId: string,
    body: Uint8Array,
    resourceKey: string,
    signal: AbortSignal,
  ): Promise<MutationResult> => {
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
      failInterrupted();
    }
    const id: string = captureId(routineId);
    const key: string = captureKey(resourceKey);
    const bytes: Uint8Array = captureMutationBody(refs, body, id, "save");
    throwIfAborted(caller);
    if (refs.grant === null) {
      throw new SessionError("authentication_required");
    }
    const binding: CallBinding = toCallBinding(snapshot);
    const transport: BackendTransport | null = refs.transport;
    if (transport === null) {
      failInterrupted();
    }
    return orchestrateResource<MutationResult>(
      refs,
      snapshot,
      caller,
      (legSignal) => transport.saveRoutine(binding, id, new Uint8Array(bytes), key, legSignal),
      true,
    );
  };

  const invalidate = (): void => {
    // Synchronous, idempotent, permanent local cancellation fence. No IO,
    // no credential deletion. Cancels owned resource/auth network; a
    // commit already begun is still awaited to completion by its owner,
    // with late success suppressed.
    fenceRefs(refs);
    refs.invalidated = true;
    const current: ActiveAuth | null = refs.active;
    if (current !== null) {
      current.dispatch.abort();
    }
    for (const controller of refs.resources) {
      try {
        controller.abort();
      } catch {
        // Abort is infallible; ignore defensive failures.
      }
    }
  };

  const binding: StorageBinding = freezeBinding(refs.capture);
  return Object.freeze({
    binding,
    searchExercises,
    getExercise,
    listWorkouts,
    getWorkout,
    listRoutines,
    getRoutine,
    createDraft,
    populateDraft,
    saveRoutine,
    invalidate,
  });
}
