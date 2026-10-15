/**
 * T05 fixed-origin backend transport — factory, per-call orchestration,
 * hook order, bounded retries, sticky uncertainty, and response mapping.
 *
 * Implements the approved public specification exactly (including the
 * message-null correction). All capture and validation runs synchronously
 * at method entry before yielding; methods always settle as promises. Wire
 * handoff marks conservative dispatch; uncertainty is sticky across
 * attempts and only a full validated, within-budget, unfenced success for
 * the same request settles it.
 */

import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { decodeBackendResponse, type ReadToolName, type RoutineRecord } from "../domain/index.js";
import {
  TransportError,
  isTransportError,
  type TransportErrorCode,
  type TransportEvent,
} from "./errors.js";
import { buildListRoutinesTarget, buildListWorkoutsTarget, buildSearchTarget } from "./query.js";
import {
  SAFE_CODE_PATTERN,
  RETRY_AFTER_PATTERN,
  ClockFault,
  SizeFailure,
  canonicalizeOrigin,
  captureBodyBytes,
  checkAccountStatusShape,
  checkChallengeShape,
  checkDraftShape,
  checkExchangeShape,
  checkOwnFields,
  checkPopulateShape,
  checkRefreshShape,
  checkSaveShape,
  decodeUtf8Fatal,
  fail,
  failSize,
  isCanonicalUuid,
  isHeaderSafeToken,
  isLiteralLoopbackHost,
  parseStrictObject,
  readErrorCode,
  resolveBudgets,
  type CanonicalOrigin,
  type StrictJsonObject,
} from "./validate.js";
import { checkRawWireResponse, createProductionWire } from "./wire.js";
import type {
  BackendTransport,
  BearerRouteName,
  CallBinding,
  CapturedWireRequest,
  ControlResult,
  DispatchSummary,
  ExerciseResult,
  HttpWire,
  LogoutResult,
  MutationResult,
  MutationRouteName,
  RawWireResponse,
  ResultMeta,
  RoutineListResult,
  RoutineResult,
  RouteName,
  SearchExercisesResult,
  SessionHooks,
  TransportBudgets,
  TransportDeps,
  TrustedTransportConfig,
  WorkoutListResult,
  WorkoutResult,
} from "./index.js";

// ---------------------------------------------------------------------------
// Route table.
// ---------------------------------------------------------------------------

type ControlKind = "challenge" | "exchange" | "refresh" | "logout" | "status";
type DecodeTool =
  | "search_exercises"
  | "get_exercise"
  | "list_workouts"
  | "get_workout"
  | "list_routines"
  | "get_routine";

interface RouteDef {
  readonly label: RouteName;
  readonly method: "GET" | "POST" | "PUT";
  readonly path: string;
  readonly auth: "bearer" | "none";
  readonly keyKind: "resource" | "auth" | null;
  readonly expectedStatus: number;
  readonly bodyMode: "none" | "required";
  readonly decode: DecodeTool;
  readonly control: ControlKind | null;
}

const ROUTES: Readonly<Record<RouteName, RouteDef>> = {
  search_exercises: {
    label: "search_exercises",
    method: "GET",
    path: "/v1/catalogue/exercises",
    auth: "bearer",
    keyKind: null,
    expectedStatus: 200,
    bodyMode: "none",
    decode: "search_exercises",
    control: null,
  },
  get_exercise: {
    label: "get_exercise",
    method: "GET",
    path: "/v1/exercises/",
    auth: "bearer",
    keyKind: null,
    expectedStatus: 200,
    bodyMode: "none",
    decode: "get_exercise",
    control: null,
  },
  list_workouts: {
    label: "list_workouts",
    method: "GET",
    path: "/v1/workouts",
    auth: "bearer",
    keyKind: null,
    expectedStatus: 200,
    bodyMode: "none",
    decode: "list_workouts",
    control: null,
  },
  get_workout: {
    label: "get_workout",
    method: "GET",
    path: "/v1/workouts/",
    auth: "bearer",
    keyKind: null,
    expectedStatus: 200,
    bodyMode: "none",
    decode: "get_workout",
    control: null,
  },
  list_routines: {
    label: "list_routines",
    method: "GET",
    path: "/v1/routines",
    auth: "bearer",
    keyKind: null,
    expectedStatus: 200,
    bodyMode: "none",
    decode: "list_routines",
    control: null,
  },
  get_routine: {
    label: "get_routine",
    method: "GET",
    path: "/v1/routines/",
    auth: "bearer",
    keyKind: null,
    expectedStatus: 200,
    bodyMode: "none",
    decode: "get_routine",
    control: null,
  },
  create_draft: {
    label: "create_draft",
    method: "POST",
    path: "/v1/routines",
    auth: "bearer",
    keyKind: "resource",
    expectedStatus: 201,
    bodyMode: "required",
    decode: "get_routine",
    control: null,
  },
  populate_draft: {
    label: "populate_draft",
    method: "PUT",
    path: "/v1/routines/",
    auth: "bearer",
    keyKind: "resource",
    expectedStatus: 200,
    bodyMode: "required",
    decode: "get_routine",
    control: null,
  },
  save_routine: {
    label: "save_routine",
    method: "POST",
    path: "/v1/routines/",
    auth: "bearer",
    keyKind: "resource",
    expectedStatus: 200,
    bodyMode: "required",
    decode: "get_routine",
    control: null,
  },
  auth_challenge: {
    label: "auth_challenge",
    method: "POST",
    path: "/v1/auth/google/challenge",
    auth: "none",
    keyKind: null,
    expectedStatus: 200,
    bodyMode: "required",
    decode: "get_routine",
    control: "challenge",
  },
  auth_exchange: {
    label: "auth_exchange",
    method: "POST",
    path: "/v1/auth/google",
    auth: "none",
    keyKind: "auth",
    expectedStatus: 200,
    bodyMode: "required",
    decode: "get_routine",
    control: "exchange",
  },
  auth_refresh: {
    label: "auth_refresh",
    method: "POST",
    path: "/v1/auth/refresh",
    auth: "none",
    keyKind: "auth",
    expectedStatus: 200,
    bodyMode: "required",
    decode: "get_routine",
    control: "refresh",
  },
  auth_logout: {
    label: "auth_logout",
    method: "POST",
    path: "/v1/auth/logout",
    auth: "none",
    keyKind: null,
    expectedStatus: 204,
    bodyMode: "required",
    decode: "get_routine",
    control: "logout",
  },
  account_status: {
    label: "account_status",
    method: "POST",
    path: "/v1/account/status",
    auth: "none",
    keyKind: null,
    expectedStatus: 200,
    bodyMode: "required",
    decode: "get_routine",
    control: "status",
  },
};

function routeDef(label: RouteName): RouteDef {
  return ROUTES[label];
}

function isControlRoute(label: RouteName): boolean {
  return routeDef(label).control !== null;
}

function isGetRoute(label: RouteName): boolean {
  return routeDef(label).method === "GET";
}

// ---------------------------------------------------------------------------
// Known backend code -> allowed statuses (mismatch is malformed, not unknown).
// Includes documented out-of-scope capability codes so wrong-status use is
// detected rather than silently mapped.
// ---------------------------------------------------------------------------

const CODE_STATUS: Readonly<Record<string, ReadonlyArray<number>>> = {
  invalid_request: [400],
  invalid_cursor: [400],
  invalid_page_token: [400],
  invalid_snapshot_token: [400],
  authentication_required: [401],
  reauthentication_required: [401],
  invalid_google_credential: [401],
  read_only: [403],
  not_found: [404],
  idempotency_key_reused: [409],
  id_collision: [409],
  invalid_state: [409],
  source_shape_changed: [409],
  history_shape_changed: [409],
  exercise_in_use: [409],
  cursor_expired: [410],
  snapshot_expired: [410],
  page_expired: [410],
  validation_error: [422],
  duplicate_mutation_id: [422],
  invalid_reference: [422],
  request_too_large: [413],
  rate_limited: [429],
  temporarily_unavailable: [503],
  internal_error: [500],
};

interface MappedKnown {
  readonly code: TransportErrorCode;
  readonly backendErrorCode: string;
}

/** Documented status-matched pair with a direct TransportErrorCode. */
function mapKnownCode(code: string, status: number): MappedKnown | null {
  const allowed = CODE_STATUS[code];
  if (allowed === undefined || !allowed.includes(status)) {
    return null;
  }
  switch (code) {
    case "invalid_request":
      return { code: "validation_error", backendErrorCode: code };
    case "invalid_page_token":
      return { code: "invalid_page_token", backendErrorCode: code };
    case "authentication_required":
      return { code: "authentication_required", backendErrorCode: code };
    case "reauthentication_required":
      return { code: "reauthentication_required", backendErrorCode: code };
    case "invalid_google_credential":
      return { code: "authentication_required", backendErrorCode: code };
    case "read_only":
      return { code: "read_only", backendErrorCode: code };
    case "not_found":
      return { code: "not_found", backendErrorCode: code };
    case "idempotency_key_reused":
      return { code: "idempotency_key_reused", backendErrorCode: code };
    case "id_collision":
      return { code: "id_collision", backendErrorCode: code };
    case "invalid_state":
      return { code: "invalid_state", backendErrorCode: code };
    case "page_expired":
      return { code: "page_expired", backendErrorCode: code };
    case "validation_error":
      return { code: "validation_error", backendErrorCode: code };
    case "invalid_reference":
      return { code: "invalid_reference", backendErrorCode: code };
    case "rate_limited":
      return { code: "rate_limited", backendErrorCode: code };
    case "temporarily_unavailable":
      return { code: "temporarily_unavailable", backendErrorCode: code };
    case "internal_error":
      return { code: "internal_error", backendErrorCode: code };
    default:
      return null;
  }
}

type CodeClass =
  | { readonly kind: "mapped"; readonly mapped: MappedKnown }
  | { readonly kind: "other-safe"; readonly code: string }
  | { readonly kind: "bad" };

/**
 * Three-tier envelope-code classification: directly mapped pairs, other
 * documented-or-unknown-but-safe codes (sensitive scrub applies to unknown
 * ones only), and mismatch/unsafe codes. Documented codes skip the
 * sensitive-value screens so synthetic tokens cannot disable mapping.
 */
function classifyEnvelopeCode(
  code: string,
  status: number,
  sensitive: ReadonlyArray<string>,
): CodeClass {
  if (!SAFE_CODE_PATTERN.test(code)) {
    return { kind: "bad" };
  }
  if (Object.prototype.hasOwnProperty.call(CODE_STATUS, code)) {
    const allowed = CODE_STATUS[code] as ReadonlyArray<number>;
    if (!allowed.includes(status)) {
      return { kind: "bad" };
    }
    const mapped = mapKnownCode(code, status);
    if (mapped !== null) {
      return { kind: "mapped", mapped };
    }
    return { kind: "other-safe", code };
  }
  if (/[0-9a-f]{32,}/.test(code)) {
    return { kind: "bad" };
  }
  for (const value of sensitive) {
    if (value !== "" && code.includes(value)) {
      return { kind: "bad" };
    }
  }
  return { kind: "other-safe", code };
}

// ---------------------------------------------------------------------------
// Factory-time capture. All callbacks are snapshot-bound at factory time:
// later property replacement cannot change transport behavior, while the
// captured receiver binding is preserved for legitimate owner state.
// ---------------------------------------------------------------------------

interface BoundHook<F> {
  readonly fn: F;
  readonly self: object;
}

function snapshotHook<F>(owner: object, fn: unknown): BoundHook<F> {
  if (typeof fn !== "function") {
    fail();
  }
  return { fn: fn as F, self: owner };
}

function invokeHook(
  ref: BoundHook<(...args: Array<never>) => unknown>,
  ...args: Array<unknown>
): unknown {
  const fn = ref.fn as unknown as (...callArgs: Array<unknown>) => unknown;
  return fn.call(ref.self, ...args);
}

interface CapturedSession {
  readonly checkBinding: BoundHook<SessionHooks["checkBinding"]>;
  readonly selectCredential: BoundHook<SessionHooks["selectCredential"]>;
  readonly beforeDispatch: BoundHook<SessionHooks["beforeDispatch"]>;
  readonly isCurrent: BoundHook<SessionHooks["isCurrent"]>;
}

interface CapturedClock {
  readonly nowMs: BoundHook<() => number>;
}

interface CapturedSleeper {
  readonly sleep: BoundHook<(ms: number, signal: AbortSignal) => Promise<unknown>>;
}

interface CapturedWire {
  readonly sendRaw: BoundHook<HttpWire["sendRaw"]>;
}

interface CapturedConfig {
  readonly origin: CanonicalOrigin;
  readonly budgets: TransportBudgets;
  readonly session: CapturedSession;
  readonly clock: CapturedClock;
  readonly sleeper: CapturedSleeper;
  readonly wire: CapturedWire;
  readonly onEvent: ((event: TransportEvent) => void) | null;
}

function captureSession(value: unknown): CapturedSession {
  const fields = checkOwnFields(value, [
    "checkBinding",
    "selectCredential",
    "beforeDispatch",
    "isCurrent",
  ]);
  const owner: object = typeof value === "object" && value !== null ? value : Object.create(null);
  return {
    checkBinding: snapshotHook<SessionHooks["checkBinding"]>(owner, fields["checkBinding"]),
    selectCredential: snapshotHook<SessionHooks["selectCredential"]>(
      owner,
      fields["selectCredential"],
    ),
    beforeDispatch: snapshotHook<SessionHooks["beforeDispatch"]>(owner, fields["beforeDispatch"]),
    isCurrent: snapshotHook<SessionHooks["isCurrent"]>(owner, fields["isCurrent"]),
  };
}

function defaultSleeper(): CapturedSleeper["sleep"] {
  const sleeper = {
    sleep(ms: number, signal: AbortSignal): Promise<void> {
      return new Promise<void>((resolve, reject) => {
        if (signal.aborted) {
          reject(new Error("aborted"));
          return;
        }
        const timer = setTimeout(() => {
          signal.removeEventListener("abort", onAbort);
          resolve();
        }, ms);
        const onAbort = (): void => {
          clearTimeout(timer);
          reject(new Error("aborted"));
        };
        signal.addEventListener("abort", onAbort, { once: true });
      });
    },
  };
  return { fn: sleeper.sleep.bind(sleeper), self: sleeper };
}

function defaultClock(): CapturedClock["nowMs"] {
  const clock = {
    nowMs(): number {
      return performance.now();
    },
  };
  return { fn: clock.nowMs.bind(clock), self: clock };
}

// ---------------------------------------------------------------------------
// Per-call plan (all synchronous at entry).
// ---------------------------------------------------------------------------

interface CallPlan {
  readonly def: RouteDef;
  readonly target: string;
  readonly body: Uint8Array | null;
  readonly key: string | null;
  readonly expectedId: string | null;
  readonly sensitive: ReadonlyArray<string>;
}

interface Entry {
  readonly frozen: CallBinding;
  readonly caller: AbortSignal;
  readonly start: number;
  readonly correlationId: string;
}

type QueryPlan =
  | {
      readonly kind: "query";
      readonly build: (input: unknown) => {
        readonly target: string;
        readonly pageToken: string | null;
      };
      readonly queryInput: unknown;
    }
  | { readonly kind: "id"; readonly pathPrefix: string; readonly id: unknown };

function validateBinding(value: unknown, canonical: string, bearer: boolean): CallBinding {
  const fields = checkOwnFields(
    value,
    ["origin", "accountUuid", "sessionGeneration", "profileGenerationId"],
    [],
  );
  if (fields["origin"] !== canonical) {
    fail();
  }
  const accountUuid = fields["accountUuid"];
  if (bearer) {
    if (!isCanonicalUuid(accountUuid)) {
      fail();
    }
  } else if (accountUuid !== null && !isCanonicalUuid(accountUuid)) {
    fail();
  }
  const generation = fields["sessionGeneration"];
  if (typeof generation !== "number" || !Number.isSafeInteger(generation) || generation < 0) {
    fail();
  }
  if (!isCanonicalUuid(fields["profileGenerationId"])) {
    fail();
  }
  return Object.freeze({
    origin: fields["origin"] as string,
    accountUuid: accountUuid as string | null,
    sessionGeneration: generation,
    profileGenerationId: fields["profileGenerationId"] as string,
  });
}

/**
 * Method entry: monotonic clock sampled FIRST (timing includes all later
 * capture/validation), then signal and binding checks. Clock failure is a
 * ClockFault (internal_error); validation failures stay invalid_arguments.
 */
function beginEntry(
  host: CapturedConfig,
  def: RouteDef,
  binding: unknown,
  signal: unknown,
  correlationId: string,
): Entry {
  let start: number;
  try {
    start = invokeHook(host.clock.nowMs) as number;
  } catch {
    throw new ClockFault();
  }
  if (typeof start !== "number" || !Number.isFinite(start)) {
    throw new ClockFault();
  }
  if (!(signal instanceof AbortSignal)) {
    fail();
  }
  const frozen = validateBinding(binding, host.origin.canonical, def.auth === "bearer");
  return { frozen, caller: signal, start, correlationId };
}

function scratchBody(body: Uint8Array): StrictJsonObject {
  return parseStrictObject(decodeUtf8Fatal(body));
}

// ---------------------------------------------------------------------------
// Call state, clock, signals, events.
// ---------------------------------------------------------------------------

class HookAbort extends Error {
  public constructor() {
    super("hook aborted");
  }
}

class CallState {
  public attempts = 0;
  public everDispatched = false;
  public uncertain = false;
  private lastSample: number;
  private readonly startMs: number;

  public constructor(
    private readonly config: CapturedConfig,
    public readonly correlationId: string,
    start: number,
    public readonly deadlineMs: number,
  ) {
    this.lastSample = start;
    this.startMs = start;
  }

  public now(): number {
    let sample: number;
    try {
      sample = invokeHook(this.config.clock.nowMs) as number;
    } catch {
      throw new ClockFault();
    }
    if (typeof sample !== "number" || !Number.isFinite(sample)) {
      throw new ClockFault();
    }
    if (sample < this.lastSample) {
      throw new ClockFault();
    }
    this.lastSample = sample;
    return sample;
  }

  public outcomeUnknown(isGet: boolean): boolean {
    return isGet ? false : this.uncertain;
  }

  /** Reporting-only elapsed; decision gates always use now() directly. */
  public elapsedNow(): number {
    try {
      return Math.max(0, this.now() - this.startMs);
    } catch {
      return Math.max(0, this.lastSample - this.startMs);
    }
  }

  public raise(def: RouteDef, pending: PendingError): never {
    const elapsedMs = this.elapsedNow();
    const error = new TransportError(pending.code, {
      backendErrorCode: pending.backendErrorCode,
      retryAfterSeconds: pending.retryAfterSeconds,
      status: pending.status,
      dispatched: this.everDispatched,
      outcomeUnknown: this.outcomeUnknown(isGetRoute(def.label)),
      attempts: this.attempts,
      elapsedMs,
      correlationId: this.correlationId,
    });
    this.emit(def, error.code, pending.status, elapsedMs);
    throw error;
  }

  public emit(
    def: RouteDef,
    code: TransportErrorCode | "ok",
    status: number | null,
    elapsedMs: number,
  ): void {
    const handler = this.config.onEvent;
    if (handler === null) {
      return;
    }
    const event: TransportEvent = Object.freeze({
      routeLabel: def.label,
      code,
      status,
      attempts: this.attempts,
      elapsedMs: Math.max(0, elapsedMs),
      dispatched: this.everDispatched,
      outcomeUnknown: this.outcomeUnknown(isGetRoute(def.label)),
      correlationId: this.correlationId,
    });
    try {
      const result = (handler as (event: TransportEvent) => unknown)(event);
      if (result instanceof Promise) {
        result.then(undefined, () => undefined);
      }
    } catch {
      // Listener faults cannot change the outcome or leak.
    }
  }
}

/** Await a hook raced against the internal abort; classify timeout vs abort. */
/**
 * Await a hook raced against the internal abort; classify timeout vs abort.
 * Settlement handlers attach synchronously BEFORE any abort check, so a
 * hook that aborts-then-rejects can never leak an unhandled rejection.
 * Abort always wins the race once handlers are attached.
 */
async function awaitHook<T>(
  promise: unknown,
  internal: AbortSignal,
  caller: AbortSignal,
): Promise<T> {
  const pending = promise as Promise<T>;
  return new Promise<T>((resolve, reject) => {
    let done = false;
    const cleanup = (): void => {
      internal.removeEventListener("abort", onAbort);
    };
    const onAbort = (): void => {
      if (done) {
        return;
      }
      done = true;
      cleanup();
      if (caller.aborted) {
        reject(new HookAbort());
      } else {
        reject(new ClockFault());
      }
    };
    pending.then(
      (value) => {
        if (done) {
          return;
        }
        done = true;
        cleanup();
        resolve(value);
      },
      (error: unknown) => {
        if (done) {
          return;
        }
        done = true;
        cleanup();
        reject(error);
      },
    );
    if (internal.aborted) {
      onAbort();
    } else {
      internal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

/** Link caller abort + a deadline timer into one internal signal. */
function linkSignal(
  caller: AbortSignal,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(
    () => {
      controller.abort();
    },
    Math.max(0, timeoutMs),
  );
  const onCallerAbort = (): void => {
    controller.abort();
  };
  if (caller.aborted) {
    controller.abort();
  } else {
    caller.addEventListener("abort", onCallerAbort, { once: true });
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      caller.removeEventListener("abort", onCallerAbort);
    },
  };
}

function deepFreezeJson(value: unknown): void {
  const seen = new WeakSet<object>();
  const visit = (node: unknown): void => {
    if (typeof node !== "object" || node === null || seen.has(node)) {
      return;
    }
    seen.add(node);
    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }
      Object.freeze(node);
      return;
    }
    for (const key of Object.keys(node)) {
      visit((node as Record<string, unknown>)[key]);
    }
    Object.freeze(node);
  };
  visit(value);
}

// ---------------------------------------------------------------------------
// Factory.
// ---------------------------------------------------------------------------

export function createBackendTransport(
  config: TrustedTransportConfig,
  deps: TransportDeps,
): BackendTransport {
  try {
    const fields = checkOwnFields(
      config,
      ["origin"],
      ["budgets", "allowInsecureLoopback", "testCaPem"],
    );
    if (
      fields["allowInsecureLoopback"] !== undefined &&
      typeof fields["allowInsecureLoopback"] !== "boolean"
    ) {
      fail();
    }
    const allowLoopback = fields["allowInsecureLoopback"] === true;
    const budgets = resolveBudgets(fields["budgets"]);
    if (process.env["NODE_TLS_REJECT_UNAUTHORIZED"] === "0") {
      fail();
    }
    const canonical = canonicalizeOrigin(fields["origin"], allowLoopback);
    let testCa: Uint8Array | null = null;
    if (fields["testCaPem"] !== undefined) {
      const ca = captureBodyBytes(fields["testCaPem"], null);
      if (ca.byteLength === 0) {
        fail();
      }
      // Fixture trust requires the RAW host text to be a literal loopback
      // address (normalized socketHost alone would admit 127.1/0x7f000001).
      if (!canonical.isHttps || !isLiteralLoopbackHost(canonical.rawHost)) {
        fail();
      }
      testCa = ca;
    }
    const captured = captureDeps(deps, canonical, testCa);
    const host: CapturedConfig = {
      origin: canonical,
      budgets,
      session: captured.session,
      clock: captured.clock,
      sleeper: captured.sleeper,
      wire: captured.wire,
      onEvent: captured.onEvent,
    };
    return Object.freeze(buildTransport(host));
  } catch (error) {
    if (isTransportError(error)) {
      throw error;
    }
    throw new TransportError("invalid_arguments", {});
  }
}

function captureDeps(
  deps: unknown,
  origin: CanonicalOrigin,
  testCa: Uint8Array | null,
): {
  session: CapturedConfig["session"];
  clock: CapturedConfig["clock"];
  sleeper: CapturedConfig["sleeper"];
  wire: CapturedConfig["wire"];
  onEvent: CapturedConfig["onEvent"];
} {
  const fields = checkOwnFields(deps, ["session"], ["clock", "sleeper", "wire", "onEvent"]);
  const session = captureSession(fields["session"]);
  let clock: CapturedConfig["clock"] = { nowMs: defaultClock() };
  if (fields["clock"] !== undefined) {
    const clockFields = checkOwnFields(fields["clock"], ["nowMs"], []);
    const owner: object =
      typeof fields["clock"] === "object" && fields["clock"] !== null
        ? fields["clock"]
        : Object.create(null);
    const nowMs = snapshotHook<() => number>(owner, clockFields["nowMs"]);
    clock = {
      nowMs: {
        fn: () => {
          const value = invokeHook(nowMs) as unknown;
          if (typeof value !== "number") {
            fail();
          }
          return value;
        },
        self: owner,
      },
    };
  }
  let sleeper: CapturedConfig["sleeper"] = { sleep: defaultSleeper() };
  if (fields["sleeper"] !== undefined) {
    const sleeperFields = checkOwnFields(fields["sleeper"], ["sleep"], []);
    const owner: object =
      typeof fields["sleeper"] === "object" && fields["sleeper"] !== null
        ? fields["sleeper"]
        : Object.create(null);
    const sleepRaw = snapshotHook<(ms: number, signal: AbortSignal) => unknown>(
      owner,
      sleeperFields["sleep"],
    );
    const sleeperSelf = {
      sleep(ms: number, signal: AbortSignal): Promise<void> {
        let result: unknown;
        try {
          result = invokeHook(sleepRaw, ms, signal);
        } catch {
          return Promise.reject(new Error("sleeper fault"));
        }
        if (result instanceof Promise) {
          return result.then(
            () => undefined,
            () => {
              throw new Error("sleeper fault");
            },
          );
        }
        return Promise.reject(new Error("sleeper fault"));
      },
    };
    sleeper = { sleep: { fn: sleeperSelf.sleep.bind(sleeperSelf), self: sleeperSelf } };
  }
  let wire: CapturedConfig["wire"];
  if (fields["wire"] !== undefined) {
    const wireFields = checkOwnFields(fields["wire"], ["sendRaw"], []);
    const owner: object =
      typeof fields["wire"] === "object" && fields["wire"] !== null
        ? fields["wire"]
        : Object.create(null);
    wire = {
      sendRaw: snapshotHook<HttpWire["sendRaw"]>(owner, wireFields["sendRaw"]),
    };
  } else {
    const production = createProductionWire({
      isHttps: origin.isHttps,
      socketHost: origin.socketHost,
      port: origin.port,
      testCaPem: testCa,
    });
    wire = { sendRaw: { fn: production.sendRaw, self: production } };
  }
  let onEvent: CapturedConfig["onEvent"] = null;
  if (fields["onEvent"] !== undefined) {
    if (typeof fields["onEvent"] !== "function") {
      fail();
    }
    onEvent = fields["onEvent"] as (event: TransportEvent) => void;
  }
  return { session, clock, sleeper, wire, onEvent };
}

function buildTransport(host: CapturedConfig): BackendTransport {
  return {
    searchExercises: (b, queryInput, signal) =>
      runRead<SearchExercisesResult>(host, routeDef("search_exercises"), b, signal, {
        kind: "query",
        build: buildSearchTarget,
        queryInput,
      }),
    getExercise: (b, exerciseId, signal) =>
      runRead<ExerciseResult>(host, routeDef("get_exercise"), b, signal, {
        kind: "id",
        pathPrefix: routeDef("get_exercise").path,
        id: exerciseId,
      }),
    listWorkouts: (b, queryInput, signal) =>
      runRead<WorkoutListResult>(host, routeDef("list_workouts"), b, signal, {
        kind: "query",
        build: buildListWorkoutsTarget,
        queryInput,
      }),
    getWorkout: (b, workoutId, signal) =>
      runRead<WorkoutResult>(host, routeDef("get_workout"), b, signal, {
        kind: "id",
        pathPrefix: routeDef("get_workout").path,
        id: workoutId,
      }),
    listRoutines: (b, queryInput, signal) =>
      runRead<RoutineListResult>(host, routeDef("list_routines"), b, signal, {
        kind: "query",
        build: buildListRoutinesTarget,
        queryInput,
      }),
    getRoutine: (b, routineId, signal) =>
      runRead<RoutineResult>(host, routeDef("get_routine"), b, signal, {
        kind: "id",
        pathPrefix: routeDef("get_routine").path,
        id: routineId,
      }),
    createDraft: (b, expectedRoutineId, body, resourceKey, signal) =>
      runMutation(host, routeDef("create_draft"), b, signal, {
        body,
        key: resourceKey,
        expectedId: expectedRoutineId,
        shape: "draft",
      }),
    populateDraft: (b, routineId, body, resourceKey, signal) =>
      runMutation(host, routeDef("populate_draft"), b, signal, {
        body,
        key: resourceKey,
        expectedId: routineId,
        shape: "populate",
      }),
    saveRoutine: (b, routineId, body, resourceKey, signal) =>
      runMutation(host, routeDef("save_routine"), b, signal, {
        body,
        key: resourceKey,
        expectedId: routineId,
        shape: "save",
      }),
    authChallenge: (b, body, signal) =>
      runControl(host, routeDef("auth_challenge"), b, signal, {
        body,
        key: null,
        shape: "challenge",
      }),
    authExchange: (b, body, authKey, signal) =>
      runControl(host, routeDef("auth_exchange"), b, signal, {
        body,
        key: authKey,
        shape: "exchange",
      }),
    authRefresh: (b, body, authKey, signal) =>
      runControl(host, routeDef("auth_refresh"), b, signal, {
        body,
        key: authKey,
        shape: "refresh",
      }),
    authLogout: (b, body, signal) => runLogout(host, routeDef("auth_logout"), b, signal, body),
    accountStatus: (b, body, signal) =>
      runControl(host, routeDef("account_status"), b, signal, {
        body,
        key: null,
        shape: "status",
      }),
  };
}

// ---------------------------------------------------------------------------
// Method entries: plan building is synchronous; failures reject as promises.
// ---------------------------------------------------------------------------

type MutationShape = "draft" | "populate" | "save";
type ControlShapeName = "challenge" | "exchange" | "refresh" | "logout" | "status";

interface MutationArgs {
  readonly body: unknown;
  readonly key: unknown;
  readonly expectedId: unknown;
  readonly shape: MutationShape;
}

interface ControlArgs {
  readonly body: unknown;
  readonly key: unknown;
  readonly shape: ControlShapeName;
}

/**
 * Plan-phase failures (nothing dispatched): invalid input, size overflow,
 * and unusable entry clock map to their specified codes with predispatch
 * attempts/dispatched semantics. Terminal attempt-loop TransportErrors pass
 * through untouched (their event was already emitted exactly once).
 */
function entryFailure(
  host: CapturedConfig,
  def: RouteDef,
  correlationId: string,
  error: unknown,
): never {
  if (isTransportError(error)) {
    throw error;
  }
  let code: TransportErrorCode = "invalid_arguments";
  if (error instanceof SizeFailure) {
    code = "request_too_large";
  } else if (error instanceof ClockFault) {
    code = "internal_error";
  }
  const failure = new TransportError(code, {
    backendErrorCode: null,
    retryAfterSeconds: null,
    status: null,
    dispatched: false,
    outcomeUnknown: false,
    attempts: 0,
    elapsedMs: 0,
    correlationId,
  });
  emitTerminal(host, def, code, correlationId);
  throw failure;
}

function emitTerminal(
  host: CapturedConfig,
  def: RouteDef,
  code: TransportErrorCode,
  correlationId: string,
): void {
  const handler = host.onEvent;
  if (handler === null) {
    return;
  }
  const event: TransportEvent = Object.freeze({
    routeLabel: def.label,
    code,
    status: null,
    attempts: 0,
    elapsedMs: 0,
    dispatched: false,
    outcomeUnknown: false,
    correlationId,
  });
  try {
    const result = (handler as (event: TransportEvent) => unknown)(event);
    if (result instanceof Promise) {
      result.then(undefined, () => undefined);
    }
  } catch {
    // Listener faults cannot change the outcome or leak.
  }
}

function runRead<Outcome>(
  host: CapturedConfig,
  def: RouteDef,
  binding: unknown,
  signal: unknown,
  plan: QueryPlan,
): Promise<Outcome> {
  const run = async (): Promise<Outcome> => {
    const correlationId = randomUUID();
    try {
      const entry = beginEntry(host, def, binding, signal, correlationId);
      let target: string;
      let expectedId: string | null = null;
      let pageToken: string | null = null;
      if (plan.kind === "query") {
        const built = plan.build(plan.queryInput);
        target = built.target;
        pageToken = built.pageToken;
      } else {
        if (!isCanonicalUuid(plan.id)) {
          fail();
        }
        expectedId = plan.id;
        target = `${plan.pathPrefix}${expectedId}`;
      }
      const sensitive: Array<string> = [];
      if (expectedId !== null) {
        sensitive.push(expectedId);
      }
      if (pageToken !== null) {
        sensitive.push(pageToken);
      }
      if (entry.frozen.accountUuid !== null) {
        sensitive.push(entry.frozen.accountUuid);
      }
      const call: CallPlan = {
        def,
        target,
        body: null,
        key: null,
        expectedId,
        sensitive,
      };
      const outcome = await executeCall(host, entry, call);
      return outcome as Outcome;
    } catch (error) {
      entryFailure(host, def, correlationId, error);
    }
  };
  return run();
}

function runMutation(
  host: CapturedConfig,
  def: RouteDef,
  binding: unknown,
  signal: unknown,
  args: MutationArgs,
): Promise<MutationResult> {
  const run = async (): Promise<MutationResult> => {
    const correlationId = randomUUID();
    try {
      const entry = beginEntry(host, def, binding, signal, correlationId);
      if (!isCanonicalUuid(args.expectedId)) {
        fail();
      }
      const expectedId = args.expectedId;
      if (!isCanonicalUuid(args.key)) {
        fail();
      }
      const key = args.key;
      // Size gate runs BEFORE allocation: over-budget bodies never allocate.
      const body = captureBodyBytes(args.body, host.budgets.maxRequestBytes);
      const record = scratchBody(body);
      let target: string;
      if (args.shape === "draft") {
        checkDraftShape(record, expectedId);
        target = def.path;
      } else if (args.shape === "populate") {
        checkPopulateShape(record, expectedId);
        target = `${def.path}${expectedId}`;
      } else {
        checkSaveShape(record);
        target = `${def.path}${expectedId}/save`;
      }
      const sensitive: Array<string> = [expectedId, key];
      if (entry.frozen.accountUuid !== null) {
        sensitive.push(entry.frozen.accountUuid);
      }
      const call: CallPlan = {
        def,
        target,
        body,
        key,
        expectedId,
        sensitive,
      };
      const outcome = await executeCall(host, entry, call);
      return outcome as MutationResult;
    } catch (error) {
      entryFailure(host, def, correlationId, error);
    }
  };
  return run();
}

function runControl(
  host: CapturedConfig,
  def: RouteDef,
  binding: unknown,
  signal: unknown,
  args: ControlArgs,
): Promise<ControlResult> {
  const run = async (): Promise<ControlResult> => {
    const correlationId = randomUUID();
    try {
      const entry = beginEntry(host, def, binding, signal, correlationId);
      const body = captureBodyBytes(args.body, host.budgets.maxRequestBytes);
      const record = scratchBody(body);
      const strings: Array<string> = [];
      if (args.shape === "challenge") {
        checkChallengeShape(record);
      } else if (args.shape === "exchange") {
        const shape = checkExchangeShape(record);
        if (shape.kind !== "exchange") {
          fail();
        }
        strings.push(shape.challengeId, shape.idToken);
      } else if (args.shape === "refresh") {
        const shape = checkRefreshShape(record, "refresh");
        if (shape.kind !== "refresh") {
          fail();
        }
        strings.push(shape.refreshToken);
      } else {
        const shape = checkAccountStatusShape(record);
        if (shape.kind !== "accountStatus") {
          fail();
        }
        if (entry.frozen.accountUuid !== null && entry.frozen.accountUuid !== shape.accountId) {
          fail();
        }
        strings.push(shape.accountId, shape.challengeId, shape.idToken);
      }
      let key: string | null = null;
      if (args.key !== null) {
        if (!isCanonicalUuid(args.key)) {
          fail();
        }
        key = args.key;
        strings.push(key);
      } else if (def.keyKind !== null) {
        fail();
      }
      if (entry.frozen.accountUuid !== null) {
        strings.push(entry.frozen.accountUuid);
      }
      const call: CallPlan = {
        def,
        target: def.path,
        body,
        key,
        expectedId: null,
        sensitive: strings,
      };
      const outcome = await executeCall(host, entry, call);
      return outcome as ControlResult;
    } catch (error) {
      entryFailure(host, def, correlationId, error);
    }
  };
  return run();
}

function runLogout(
  host: CapturedConfig,
  def: RouteDef,
  binding: unknown,
  signal: unknown,
  body: unknown,
): Promise<LogoutResult> {
  const run = async (): Promise<LogoutResult> => {
    const correlationId = randomUUID();
    try {
      const entry = beginEntry(host, def, binding, signal, correlationId);
      const captured = captureBodyBytes(body, host.budgets.maxRequestBytes);
      const record = scratchBody(captured);
      const shape = checkRefreshShape(record, "logout");
      if (shape.kind !== "logout") {
        fail();
      }
      const strings: Array<string> = [shape.refreshToken];
      if (entry.frozen.accountUuid !== null) {
        strings.push(entry.frozen.accountUuid);
      }
      const call: CallPlan = {
        def,
        target: def.path,
        body: captured,
        key: null,
        expectedId: null,
        sensitive: strings,
      };
      const outcome = await executeCall(host, entry, call);
      return outcome as LogoutResult;
    } catch (error) {
      entryFailure(host, def, correlationId, error);
    }
  };
  return run();
}

// ---------------------------------------------------------------------------
// Attempt loop.
// ---------------------------------------------------------------------------

interface PendingError {
  readonly code: TransportErrorCode;
  readonly backendErrorCode: string | null;
  readonly retryAfterSeconds: number | null;
  readonly status: number | null;
}

type CallOutcome =
  | SearchExercisesResult
  | ExerciseResult
  | WorkoutListResult
  | WorkoutResult
  | RoutineListResult
  | RoutineResult
  | MutationResult
  | ControlResult
  | LogoutResult;

async function executeCall(
  host: CapturedConfig,
  entry: Entry,
  call: CallPlan,
): Promise<CallOutcome> {
  const deadlineMs = entry.start + host.budgets.totalDeadlineMs;
  const state = new CallState(host, entry.correlationId, entry.start, deadlineMs);
  // Profile-generation fence joins the sensitive screen centrally.
  const sensitive: ReadonlyArray<string> = [entry.frozen.profileGenerationId, ...call.sensitive];
  const maxIterations = isControlRoute(call.def.label) ? 1 : host.budgets.maxAttempts;
  try {
    let pending: { readonly delayMs: number; readonly error: PendingError } | null = null;
    for (;;) {
      if (pending !== null) {
        const waiting = pending;
        pending = null;
        const slept = await sleepBetweenAttempts(host, state, entry, waiting.delayMs, deadlineMs);
        if (!slept) {
          if (!isGetRoute(call.def.label) && state.everDispatched) {
            // Abort while waiting for retry after dispatch is conservative
            // uncertainty, even when the last mapped error was definite.
            state.uncertain = true;
          }
          if (entry.caller.aborted) {
            state.raise(call.def, {
              code: "operation_interrupted",
              backendErrorCode: null,
              retryAfterSeconds: null,
              status: null,
            });
          }
          // A sleeper that cannot complete in budget preserves the
          // original mapped error: the retry cannot fit.
          state.raise(call.def, waiting.error);
        }
      }
      const step = await runAttempt(host, state, entry, call, sensitive, deadlineMs);
      if (step.kind === "success") {
        return step.outcome;
      }
      if (step.kind === "retry") {
        let remaining: number;
        try {
          remaining = deadlineMs - state.now();
        } catch {
          state.raise(call.def, {
            code: "internal_error",
            backendErrorCode: null,
            retryAfterSeconds: null,
            status: null,
          });
          throw new TransportError("internal_error", {});
        }
        if (state.attempts >= maxIterations || step.delayMs >= remaining) {
          state.raise(call.def, step.error);
        }
        pending = { delayMs: step.delayMs, error: step.error };
        continue;
      }
      state.raise(call.def, step.error);
    }
  } catch (error) {
    if (isTransportError(error)) {
      throw error;
    }
    // Unexpected loop failure: centralize with retained dispatch history
    // instead of fabricating a fresh predispatch error.
    state.raise(call.def, {
      code: state.everDispatched ? "internal_error" : "invalid_arguments",
      backendErrorCode: null,
      retryAfterSeconds: null,
      status: null,
    });
    throw new TransportError("internal_error", {});
  }
}

async function sleepBetweenAttempts(
  host: CapturedConfig,
  state: CallState,
  entry: Entry,
  delayMs: number,
  deadlineMs: number,
): Promise<boolean> {
  if (entry.caller.aborted) {
    return false;
  }
  // Race the sleep against the REMAINING total deadline (not the sleep
  // duration itself): arming a same-delay abort timer would cancel every
  // ordinary positive backoff before the sleeper fires.
  let remainingMs: number;
  try {
    remainingMs = Math.max(1, deadlineMs - state.now());
  } catch {
    return false;
  }
  const linked = linkSignal(entry.caller, remainingMs);
  try {
    await awaitHook(
      invokeHook(host.sleeper.sleep, delayMs, linked.signal),
      linked.signal,
      entry.caller,
    );
    return true;
  } catch {
    return false;
  } finally {
    linked.cleanup();
  }
}

type AttemptStep =
  | { readonly kind: "success"; readonly outcome: CallOutcome }
  | { readonly kind: "fail"; readonly error: PendingError }
  | { readonly kind: "retry"; readonly error: PendingError; readonly delayMs: number };

function localPending(code: TransportErrorCode): PendingError {
  return { code, backendErrorCode: null, retryAfterSeconds: null, status: null };
}

/** Remaining-budget gate between hooks: expired or broken clock stops now. */
function budgetGate(state: CallState, deadlineMs: number): AttemptStep | null {
  try {
    if (state.now() >= deadlineMs) {
      return { kind: "fail", error: localPending("network_error") };
    }
    return null;
  } catch {
    return { kind: "fail", error: localPending("internal_error") };
  }
}

async function runAttempt(
  host: CapturedConfig,
  state: CallState,
  entry: Entry,
  call: CallPlan,
  sensitive: ReadonlyArray<string>,
  deadlineMs: number,
): Promise<AttemptStep> {
  const budgets = host.budgets;
  try {
    // 1. Abort/deadline, then pre-send fence.
    if (entry.caller.aborted) {
      return { kind: "fail", error: localPending("operation_interrupted") };
    }
    if (state.now() >= deadlineMs) {
      return { kind: "fail", error: localPending("network_error") };
    }
    const preSend = linkSignal(entry.caller, Math.max(1, deadlineMs - state.now()));
    try {
      await awaitHook(
        invokeHook(host.session.checkBinding, "pre-send", entry.frozen, preSend.signal),
        preSend.signal,
        entry.caller,
      );
    } catch (error) {
      preSend.cleanup();
      return hookStep(error, entry.caller);
    } finally {
      preSend.cleanup();
    }
    const gatedAfterPreSend = budgetGate(state, deadlineMs);
    if (gatedAfterPreSend !== null) {
      return gatedAfterPreSend;
    }

    // 2. Credential selection for bearer routes.
    let bearerToken: string | null = null;
    if (call.def.auth === "bearer") {
      const selected = await selectBearer(host, state, entry, call.def, deadlineMs);
      if (selected.kind === "fail") {
        return selected.step;
      }
      bearerToken = selected.token;
      const gatedAfterCredential = budgetGate(state, deadlineMs);
      if (gatedAfterCredential !== null) {
        return gatedAfterCredential;
      }
    }

    // 3. Immutable headers + request-head budget, then beforeDispatch.
    let headers: ReadonlyArray<readonly [string, string]>;
    try {
      headers = buildHeaders(host, call, bearerToken);
    } catch (error) {
      if (error instanceof SizeFailure) {
        return { kind: "fail", error: localPending("request_too_large") };
      }
      return { kind: "fail", error: localPending("invalid_arguments") };
    }
    const gatedBeforeDispatch = budgetGate(state, deadlineMs);
    if (gatedBeforeDispatch !== null) {
      return gatedBeforeDispatch;
    }
    const summary: DispatchSummary = Object.freeze({
      routeLabel: call.def.label,
      method: call.def.method,
      target: call.target,
      bodyByteLength: call.body === null ? 0 : call.body.byteLength,
      keyKind: call.def.keyKind,
      attempt: state.attempts + 1,
    });
    const dispatchHook = linkSignal(entry.caller, Math.max(1, deadlineMs - state.now()));
    try {
      await awaitHook(
        invokeHook(host.session.beforeDispatch, entry.frozen, summary, dispatchHook.signal),
        dispatchHook.signal,
        entry.caller,
      );
    } catch (error) {
      dispatchHook.cleanup();
      return hookStep(error, entry.caller);
    } finally {
      dispatchHook.cleanup();
    }

    // 4. Final synchronous guard chain, handoff preparation, then the exact
    // conservative dispatch mark immediately before wire invocation. No
    // await occurs between the guard and the sender call.
    if (entry.caller.aborted) {
      return { kind: "fail", error: localPending("operation_interrupted") };
    }
    const guardNow = state.now();
    if (guardNow >= deadlineMs) {
      return { kind: "fail", error: localPending("network_error") };
    }
    if (process.env["NODE_TLS_REJECT_UNAUTHORIZED"] === "0") {
      return { kind: "fail", error: localPending("invalid_arguments") };
    }
    let current: unknown;
    try {
      current = invokeHook(host.session.isCurrent, entry.frozen);
    } catch {
      return { kind: "fail", error: localPending("operation_interrupted") };
    }
    if (current !== true) {
      return { kind: "fail", error: localPending("operation_interrupted") };
    }
    const remaining = Math.max(1, deadlineMs - guardNow);
    const wireRequest: CapturedWireRequest = {
      origin: host.origin.canonical,
      method: call.def.method,
      target: call.target,
      headers,
      body: call.body === null ? new Uint8Array(0) : Buffer.from(call.body),
    };
    const wireBudget = {
      timeoutMs: Math.min(budgets.perAttemptTimeoutMs, remaining),
      maxResponseBytes: budgets.maxResponseBytes,
      maxHeadBytes: budgets.maxHeadBytes,
      maxHeaderCount: budgets.maxHeaderCount,
    };
    const wireSignal = linkSignal(entry.caller, wireBudget.timeoutMs);
    // Post-sync-guard recheck: isCurrent may have consumed CPU time or
    // synchronously aborted the caller. No send unless still live.
    if (entry.caller.aborted) {
      wireSignal.cleanup();
      return { kind: "fail", error: localPending("operation_interrupted") };
    }
    try {
      if (state.now() >= deadlineMs) {
        wireSignal.cleanup();
        return { kind: "fail", error: localPending("network_error") };
      }
    } catch {
      wireSignal.cleanup();
      return { kind: "fail", error: localPending("internal_error") };
    }
    // Conservative handoff mark immediately BEFORE invoking the valid
    // captured sender: a sender that performs its side effect then throws
    // synchronously was still entered, so attempts/dispatch record first
    // with no await between the guard and the call.
    state.attempts += 1;
    state.everDispatched = true;
    let sent: Promise<unknown>;
    try {
      sent = invokeHook(
        host.wire.sendRaw,
        wireRequest,
        wireBudget,
        wireSignal.signal,
      ) as Promise<unknown>;
    } catch {
      wireSignal.cleanup();
      // Entered sender with no promise: same counted-attempt,
      // potentially-committed network rule as a rejection.
      if (!isGetRoute(call.def.label)) {
        state.uncertain = true;
      }
      if (entry.caller.aborted) {
        return { kind: "fail", error: localPending("operation_interrupted") };
      }
      const thrown: PendingError = {
        code: "network_error",
        backendErrorCode: null,
        retryAfterSeconds: null,
        status: null,
      };
      if (isControlRoute(call.def.label)) {
        return { kind: "fail", error: thrown };
      }
      return { kind: "retry", error: thrown, delayMs: backoffDelay(host, state) };
    }
    let raw: RawWireResponse;
    try {
      const settled = (async (): Promise<RawWireResponse> => {
        try {
          return checkRawWireResponse(await sent);
        } catch {
          return { ok: false, kind: "network", status: null };
        }
      })();
      let onAbort: (() => void) | null = null;
      try {
        const abortPromise = new Promise<{ readonly settled: false }>((resolve) => {
          if (wireSignal.signal.aborted) {
            resolve({ settled: false });
            return;
          }
          onAbort = (): void => {
            resolve({ settled: false });
          };
          wireSignal.signal.addEventListener("abort", onAbort, { once: true });
        });
        const raced = await Promise.race([
          settled.then((value) => ({ settled: true as const, value })),
          abortPromise,
        ]);
        if (!raced.settled) {
          if (!isGetRoute(call.def.label)) {
            state.uncertain = true;
          }
          if (entry.caller.aborted) {
            return { kind: "fail", error: localPending("operation_interrupted") };
          }
          return { kind: "fail", error: localPending("network_error") };
        }
        raw = raced.value;
      } finally {
        if (onAbort !== null) {
          wireSignal.signal.removeEventListener("abort", onAbort);
        }
      }
    } finally {
      wireSignal.cleanup();
    }

    // 5a. Wire transport failures (no received response).
    if (!raw.ok) {
      return wireFailureStep(host, state, entry, call, raw.kind, raw.status);
    }

    // 5b. Received response: upper-layer budget recheck (also guards
    // injected doubles), then mapping, then the pre-delivery gate before
    // deliver-or-retry.
    const gateCheck = enforceWireBudgets(host, state, call, raw);
    if (gateCheck !== null) {
      return gateCheck;
    }
    // Selected credentials join the unknown-code screen: a safe-looking
    // errorCode containing the exact bearer is unsafe, never retained.
    const screening: Array<string> = [...sensitive];
    if (bearerToken !== null) {
      screening.push(bearerToken);
    }
    const mapped = mapResponse(state, call, raw, screening);
    const gate = await preDeliveryGate(host, state, entry, deadlineMs);
    if (gate === "fenced") {
      // Suppression after receipt is conservative uncertainty for ANY
      // received non-GET result, not only success.
      if (!isGetRoute(call.def.label)) {
        state.uncertain = true;
      }
      return { kind: "fail", error: localPending("operation_interrupted") };
    }
    if (gate === "expired") {
      if (!isGetRoute(call.def.label)) {
        state.uncertain = true;
      }
      return { kind: "fail", error: localPending("network_error") };
    }
    if (gate === "clock") {
      if (!isGetRoute(call.def.label)) {
        state.uncertain = true;
      }
      return { kind: "fail", error: localPending("internal_error") };
    }
    if (mapped.kind === "success") {
      return buildSuccess(host, state, entry, call, raw);
    }
    if (!mapped.retryableAuto || isControlRoute(call.def.label)) {
      return { kind: "fail", error: mapped.error };
    }
    const delayMs = mapped.retryAfterMs ?? backoffDelay(host, state);
    return { kind: "retry", error: mapped.error, delayMs };
  } catch (error) {
    if (error instanceof ClockFault) {
      return { kind: "fail", error: localPending("internal_error") };
    }
    throw error;
  }
}

function hookStep(error: unknown, caller: AbortSignal): AttemptStep {
  if (error instanceof HookAbort || caller.aborted) {
    return { kind: "fail", error: localPending("operation_interrupted") };
  }
  if (error instanceof ClockFault) {
    // Hook deadline without a terminal mapped error.
    return { kind: "fail", error: localPending("network_error") };
  }
  return { kind: "fail", error: localPending("operation_interrupted") };
}

async function selectBearer(
  host: CapturedConfig,
  state: CallState,
  entry: Entry,
  def: RouteDef,
  deadlineMs: number,
): Promise<
  | { readonly kind: "fail"; readonly step: AttemptStep }
  | { readonly kind: "ok"; readonly token: string }
> {
  const failWith = (
    code: TransportErrorCode,
  ): { readonly kind: "fail"; readonly step: AttemptStep } => ({
    kind: "fail",
    step: { kind: "fail", error: localPending(code) },
  });
  let remainingMs: number;
  try {
    remainingMs = Math.max(1, deadlineMs - state.now());
  } catch {
    return failWith("internal_error");
  }
  const linked = linkSignal(entry.caller, remainingMs);
  let material: unknown;
  try {
    material = await awaitHook(
      invokeHook(
        host.session.selectCredential,
        entry.frozen,
        def.label as BearerRouteName,
        linked.signal,
      ),
      linked.signal,
      entry.caller,
    );
  } catch (error) {
    linked.cleanup();
    if (error instanceof HookAbort || entry.caller.aborted) {
      return failWith("operation_interrupted");
    }
    if (error instanceof ClockFault) {
      return failWith("network_error");
    }
    return failWith("operation_interrupted");
  } finally {
    linked.cleanup();
  }
  if (material === null) {
    return failWith("authentication_required");
  }
  try {
    const fields = checkOwnFields(material, ["bearerToken", "forBinding"], []);
    if (!isHeaderSafeToken(fields["bearerToken"])) {
      return failWith("authentication_required");
    }
    const binding = checkOwnFields(
      fields["forBinding"],
      ["origin", "accountUuid", "sessionGeneration", "profileGenerationId"],
      [],
    );
    if (
      binding["origin"] !== entry.frozen.origin ||
      binding["accountUuid"] !== entry.frozen.accountUuid ||
      binding["sessionGeneration"] !== entry.frozen.sessionGeneration ||
      binding["profileGenerationId"] !== entry.frozen.profileGenerationId
    ) {
      return failWith("authentication_required");
    }
    return { kind: "ok", token: fields["bearerToken"] as string };
  } catch {
    return failWith("authentication_required");
  }
}

function buildHeaders(
  host: CapturedConfig,
  call: CallPlan,
  bearerToken: string | null,
): ReadonlyArray<readonly [string, string]> {
  const bodyLength = call.body === null ? 0 : call.body.byteLength;
  const headers: Array<readonly [string, string]> = [
    Object.freeze(["host", host.origin.hostHeader] as const),
    Object.freeze(["connection", "close"] as const),
    Object.freeze(["accept", "application/json"] as const),
    Object.freeze(["accept-encoding", "identity"] as const),
    Object.freeze(["content-length", String(bodyLength)] as const),
  ];
  if (call.body !== null) {
    headers.push(Object.freeze(["content-type", "application/json; charset=utf-8"] as const));
  }
  if (call.key !== null) {
    headers.push(Object.freeze(["idempotency-key", call.key] as const));
  }
  if (bearerToken !== null) {
    headers.push(Object.freeze(["authorization", `Bearer ${bearerToken}`] as const));
  }
  let headBytes = Buffer.byteLength(`${call.def.method} ${call.target} HTTP/1.1\r\n`, "ascii");
  for (const pair of headers) {
    headBytes += Buffer.byteLength(`${pair[0]}: ${pair[1]}\r\n`, "ascii");
  }
  headBytes += 2;
  if (headBytes > host.budgets.maxRequestTargetBytes) {
    failSize();
  }
  return Object.freeze(headers);
}

async function preDeliveryGate(
  host: CapturedConfig,
  state: CallState,
  entry: Entry,
  deadlineMs: number,
): Promise<"pass" | "fenced" | "expired" | "clock"> {
  // Remaining (not total) budget gates hook entry; an already-expired
  // budget never starts another awaited hook.
  try {
    if (state.now() >= deadlineMs) {
      return "expired";
    }
  } catch {
    return "clock";
  }
  let remaining: number;
  try {
    remaining = Math.max(1, deadlineMs - state.now());
  } catch {
    return "clock";
  }
  const linked = linkSignal(entry.caller, remaining);
  try {
    await awaitHook(
      invokeHook(host.session.checkBinding, "pre-delivery", entry.frozen, linked.signal),
      linked.signal,
      entry.caller,
    );
  } catch (error) {
    linked.cleanup();
    if (entry.caller.aborted || error instanceof HookAbort) {
      return "fenced";
    }
    if (error instanceof ClockFault) {
      // Hook deadline with a live caller: deadline expiry, not a fence.
      return "expired";
    }
    return "fenced";
  } finally {
    linked.cleanup();
  }
  if (entry.caller.aborted) {
    return "fenced";
  }
  try {
    if (state.now() >= deadlineMs) {
      return "expired";
    }
  } catch {
    return "clock";
  }
  let current: unknown;
  try {
    current = invokeHook(host.session.isCurrent, entry.frozen);
  } catch {
    return "fenced";
  }
  if (current !== true) {
    return "fenced";
  }
  // Post-sync-guard recheck for EVERY received outcome (success, error,
  // or retry): isCurrent may have consumed CPU time or synchronously
  // aborted the caller. No authorized result is delivered past a fresh
  // abort or deadline edge.
  if (entry.caller.aborted) {
    return "fenced";
  }
  try {
    if (state.now() >= deadlineMs) {
      return "expired";
    }
  } catch {
    return "clock";
  }
  return "pass";
}

function wireFailureStep(
  host: CapturedConfig,
  state: CallState,
  entry: Entry,
  call: CallPlan,
  kind: "network" | "malformed" | "response_too_large",
  status: number | null,
): AttemptStep {
  const nonGet = !isGetRoute(call.def.label);
  if (kind === "network") {
    if (entry.caller.aborted) {
      if (nonGet) {
        state.uncertain = true;
      }
      return { kind: "fail", error: { ...localPending("operation_interrupted"), status } };
    }
    if (nonGet) {
      state.uncertain = true;
    }
    const error: PendingError = {
      code: "network_error",
      backendErrorCode: null,
      retryAfterSeconds: null,
      status,
    };
    if (isControlRoute(call.def.label)) {
      return { kind: "fail", error };
    }
    return { kind: "retry", error, delayMs: backoffDelay(host, state) };
  }
  if (kind === "response_too_large") {
    if (nonGet) {
      state.uncertain = true;
    }
    return {
      kind: "fail",
      error: {
        code: "result_too_large",
        backendErrorCode: null,
        retryAfterSeconds: null,
        status,
      },
    };
  }
  if (nonGet) {
    state.uncertain = true;
  }
  return {
    kind: "fail",
    error: { code: "internal_error", backendErrorCode: null, retryAfterSeconds: null, status },
  };
}

function backoffDelay(host: CapturedConfig, state: CallState): number {
  const base = host.budgets.baseRetryDelayMs;
  const cap = host.budgets.maxRetryDelayMs;
  const grown = base * 2 ** Math.max(0, state.attempts - 1);
  return Math.min(cap, grown);
}

// ---------------------------------------------------------------------------
// Upper-layer wire budget recheck (also guards injected doubles).
// ---------------------------------------------------------------------------

function enforceWireBudgets(
  host: CapturedConfig,
  state: CallState,
  call: CallPlan,
  response: Extract<RawWireResponse, { ok: true }>,
): AttemptStep | null {
  const nonGet = !isGetRoute(call.def.label);
  const malformed = (): AttemptStep => {
    if (nonGet) {
      state.uncertain = true;
    }
    return {
      kind: "fail",
      error: {
        code: "internal_error",
        backendErrorCode: null,
        retryAfterSeconds: null,
        status: response.status,
      },
    };
  };
  if (response.body.byteLength > host.budgets.maxResponseBytes) {
    if (nonGet) {
      state.uncertain = true;
    }
    return {
      kind: "fail",
      error: {
        code: "result_too_large",
        backendErrorCode: null,
        retryAfterSeconds: null,
        status: response.status,
      },
    };
  }
  let headBytes = Buffer.byteLength(`HTTP/1.1 ${response.status} \r\n`, "ascii") + 2;
  const seen = new Set<string>();
  let duplicates = false;
  for (const pair of response.rawHeaders) {
    headBytes += Buffer.byteLength(`${pair[0]}: ${pair[1]}\r\n`, "utf8");
    const name = pair[0].toLowerCase();
    if (
      name === "content-type" ||
      name === "content-length" ||
      name === "content-encoding" ||
      name === "retry-after"
    ) {
      if (seen.has(name)) {
        duplicates = true;
      }
      seen.add(name);
    }
  }
  if (
    response.rawHeaders.length > host.budgets.maxHeaderCount ||
    headBytes > host.budgets.maxHeadBytes ||
    duplicates
  ) {
    return malformed();
  }
  const map = headerMap(response.rawHeaders);
  const encoding = singleHeader(map, "content-encoding");
  if (encoding === "duplicate") {
    return malformed();
  }
  if (encoding !== null && encoding.trim().toLowerCase() !== "identity") {
    return malformed();
  }
  if (!contentLengthMatches(map, response.body.byteLength)) {
    return malformed();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Response mapping.
// ---------------------------------------------------------------------------

interface MappedSuccess {
  readonly kind: "success";
}

interface MappedError {
  readonly kind: "error";
  readonly error: PendingError;
  readonly retryableAuto: boolean;
  readonly retryAfterMs: number | null;
}

function headerMap(
  rawHeaders: ReadonlyArray<readonly [string, string]>,
): Map<string, Array<string>> {
  const map = new Map<string, Array<string>>();
  for (const pair of rawHeaders) {
    const name = pair[0].toLowerCase();
    const list = map.get(name);
    if (list === undefined) {
      map.set(name, [pair[1]]);
    } else {
      list.push(pair[1]);
    }
  }
  return map;
}

function singleHeader(map: Map<string, Array<string>>, name: string): string | null | "duplicate" {
  const list = map.get(name);
  if (list === undefined) {
    return null;
  }
  if (list.length !== 1) {
    return "duplicate";
  }
  return list[0] as string;
}

function jsonContentTypeOk(map: Map<string, Array<string>>): boolean {
  const raw = singleHeader(map, "content-type");
  if (raw === null || raw === "duplicate") {
    return false;
  }
  const parts = raw.split(";");
  if ((parts[0] as string).trim().toLowerCase() !== "application/json") {
    return false;
  }
  let charsetSeen = false;
  for (let index = 1; index < parts.length; index += 1) {
    const parameter = (parts[index] as string).trim();
    const equals = parameter.indexOf("=");
    if (equals < 0) {
      continue;
    }
    if (parameter.slice(0, equals).trim().toLowerCase() !== "charset") {
      continue;
    }
    if (charsetSeen) {
      return false;
    }
    charsetSeen = true;
    let value = parameter.slice(equals + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      value = value.slice(1, -1);
    }
    if (!/^utf-?8$/i.test(value)) {
      return false;
    }
  }
  return true;
}

function identityEncodingOk(map: Map<string, Array<string>>): boolean {
  const raw = singleHeader(map, "content-encoding");
  if (raw === "duplicate") {
    return false;
  }
  if (raw === null) {
    return true;
  }
  return raw.trim().toLowerCase() === "identity";
}

function contentLengthMatches(map: Map<string, Array<string>>, actual: number): boolean {
  const raw = singleHeader(map, "content-length");
  if (raw === null) {
    return true;
  }
  if (raw === "duplicate") {
    return false;
  }
  const trimmed = trimOws(raw);
  if (!/^[0-9]+$/.test(trimmed)) {
    return false;
  }
  try {
    return BigInt(trimmed) === BigInt(actual);
  } catch {
    return false;
  }
}

function trimOws(value: string): string {
  return value.replace(/^[ \t]+/, "").replace(/[ \t]+$/, "");
}

function parseRetryAfter(
  map: Map<string, Array<string>>,
):
  | { readonly kind: "absent" }
  | { readonly kind: "malformed" }
  | { readonly kind: "value"; readonly seconds: number | null } {
  const list = map.get("retry-after");
  if (list === undefined) {
    return { kind: "absent" };
  }
  if (list.length !== 1) {
    return { kind: "malformed" };
  }
  const trimmed = trimOws(list[0] as string);
  if (!RETRY_AFTER_PATTERN.test(trimmed)) {
    return { kind: "absent" };
  }
  // Expose every value at or below MAX_SAFE_INTEGER; longer digit strings
  // compare lexicographically (equal length) against the maximum.
  if (trimmed.length < 16) {
    return { kind: "value", seconds: Number(trimmed) };
  }
  if (trimmed.length === 16 && trimmed <= "9007199254740991") {
    return { kind: "value", seconds: Number(trimmed) };
  }
  // Unrepresentably huge: prohibit retry, expose null, never overflow.
  return { kind: "value", seconds: null };
}

function readEnvelope(body: Uint8Array): {
  readonly ok: boolean;
  readonly code: string | null;
} {
  let text: string;
  try {
    text = decodeUtf8Fatal(body);
  } catch {
    return { ok: false, code: null };
  }
  let record: StrictJsonObject;
  try {
    record = parseStrictObject(text);
  } catch {
    return { ok: false, code: null };
  }
  try {
    return { ok: true, code: readErrorCode(record) };
  } catch {
    return { ok: false, code: null };
  }
}

function readEnvelopeStrict(
  body: Uint8Array,
  map: Map<string, Array<string>>,
): { readonly ok: boolean; readonly code: string | null } {
  if (body.byteLength === 0) {
    return { ok: false, code: null };
  }
  if (!jsonContentTypeOk(map) || !identityEncodingOk(map)) {
    return { ok: false, code: null };
  }
  if (!contentLengthMatches(map, body.byteLength)) {
    return { ok: false, code: null };
  }
  return readEnvelope(body);
}

function mapResponse(
  state: CallState,
  call: CallPlan,
  response: Extract<RawWireResponse, { ok: true }>,
  sensitive: ReadonlyArray<string>,
): MappedSuccess | MappedError {
  const nonGet = !isGetRoute(call.def.label);
  const malformed = (retryAfterExposed: number | null): MappedError => {
    if (nonGet) {
      state.uncertain = true;
    }
    return {
      kind: "error",
      error: {
        code: "internal_error",
        backendErrorCode: null,
        retryAfterSeconds: retryAfterExposed,
        status: response.status,
      },
      retryableAuto: false,
      retryAfterMs: null,
    };
  };
  const map = headerMap(response.rawHeaders);
  const retryAfter = parseRetryAfter(map);
  if (retryAfter.kind === "malformed") {
    return malformed(null);
  }
  const exposed = retryAfter.kind === "value" ? retryAfter.seconds : null;
  const retryAfterMs =
    retryAfter.kind === "value" && retryAfter.seconds !== null ? retryAfter.seconds * 1000 : null;
  // Unrepresentably huge values prohibit automatic retry (no overflow fallback).
  const retryAllowed = !(retryAfter.kind === "value" && retryAfter.seconds === null);
  const { status } = response;

  if (status === call.def.expectedStatus) {
    return { kind: "success" };
  }

  if (status >= 300 && status <= 399) {
    if (nonGet) {
      state.uncertain = true;
    }
    return {
      kind: "error",
      error: {
        code: "internal_error",
        backendErrorCode: null,
        retryAfterSeconds: null,
        status,
      },
      retryableAuto: false,
      retryAfterMs: null,
    };
  }

  if (status === 413) {
    let retained: string | null = null;
    if (response.body.byteLength > 0 && contentLengthMatches(map, response.body.byteLength)) {
      const envelope = readEnvelope(response.body);
      // Only the safe MATCHING request_too_large code is retained.
      if (envelope.ok && envelope.code === "request_too_large") {
        retained = envelope.code;
      } else if (envelope.ok && envelope.code !== null) {
        const classified = classifyEnvelopeCode(envelope.code, status, sensitive);
        if (classified.kind === "bad") {
          return malformed(exposed);
        }
      }
    }
    return {
      kind: "error",
      error: {
        code: "request_too_large",
        backendErrorCode: retained,
        retryAfterSeconds: exposed,
        status,
      },
      retryableAuto: false,
      retryAfterMs: null,
    };
  }

  if (status === 500 || status === 502 || status === 504) {
    if (nonGet) {
      state.uncertain = true;
    }
    if (response.body.byteLength === 0 && contentLengthMatches(map, 0)) {
      return {
        kind: "error",
        error: {
          code: "internal_error",
          backendErrorCode: null,
          retryAfterSeconds: exposed,
          status,
        },
        retryableAuto: retryAllowed,
        retryAfterMs,
      };
    }
    const envelope = readEnvelopeStrict(response.body, map);
    if (!envelope.ok || envelope.code === null) {
      return {
        kind: "error",
        error: {
          code: "internal_error",
          backendErrorCode: null,
          retryAfterSeconds: exposed,
          status,
        },
        retryableAuto: false,
        retryAfterMs: null,
      };
    }
    // Only a valid SAFE status-consistent envelope qualifies for retry.
    const classified = classifyEnvelopeCode(envelope.code, status, sensitive);
    if (classified.kind === "bad") {
      return {
        kind: "error",
        error: {
          code: "internal_error",
          backendErrorCode: null,
          retryAfterSeconds: exposed,
          status,
        },
        retryableAuto: false,
        retryAfterMs: null,
      };
    }
    const retained =
      classified.kind === "mapped" ? classified.mapped.backendErrorCode : classified.code;
    return {
      kind: "error",
      error: {
        code: "internal_error",
        backendErrorCode: retained,
        retryAfterSeconds: exposed,
        status,
      },
      retryableAuto: retryAllowed,
      retryAfterMs,
    };
  }

  if (status === 429 || status === 503) {
    const expected = status === 429 ? "rate_limited" : "temporarily_unavailable";
    const envelope = readEnvelopeStrict(response.body, map);
    if (envelope.ok && envelope.code !== null) {
      const classified = classifyEnvelopeCode(envelope.code, status, sensitive);
      if (classified.kind === "mapped" && classified.mapped.code === expected) {
        if (nonGet && status === 503) {
          state.uncertain = true;
        }
        return {
          kind: "error",
          error: {
            code: classified.mapped.code as "rate_limited" | "temporarily_unavailable",
            backendErrorCode: classified.mapped.backendErrorCode,
            retryAfterSeconds: exposed,
            status,
          },
          retryableAuto: retryAllowed,
          retryAfterMs,
        };
      }
      // Unknown-safe codes: excluded on 429 (malformed); on 503 they are
      // unrecognized-5xx (internal_error, retryable, no automatic retry).
      if (classified.kind === "other-safe") {
        if (status === 503) {
          if (nonGet) {
            state.uncertain = true;
          }
          return {
            kind: "error",
            error: {
              code: "internal_error",
              backendErrorCode: classified.code,
              retryAfterSeconds: exposed,
              status,
            },
            retryableAuto: false,
            retryAfterMs: null,
          };
        }
        return malformed(exposed);
      }
    }
    return malformed(exposed);
  }

  if (status >= 400 && status <= 499) {
    const envelope = readEnvelopeStrict(response.body, map);
    if (!envelope.ok || envelope.code === null) {
      return malformed(exposed);
    }
    const classified = classifyEnvelopeCode(envelope.code, status, sensitive);
    if (classified.kind === "mapped") {
      return {
        kind: "error",
        error: {
          code: classified.mapped.code,
          backendErrorCode: classified.mapped.backendErrorCode,
          retryAfterSeconds: exposed,
          status,
        },
        retryableAuto: false,
        retryAfterMs: null,
      };
    }
    if (classified.kind === "other-safe") {
      return {
        kind: "error",
        error: {
          code: "backend_error",
          backendErrorCode: classified.code,
          retryAfterSeconds: exposed,
          status,
        },
        retryableAuto: false,
        retryAfterMs: null,
      };
    }
    return malformed(exposed);
  }

  // Wrong-2xx, final 1xx, other 5xx: malformed, no automatic retry.
  return malformed(exposed);
}

// ---------------------------------------------------------------------------
// Success construction with post-decode delivery gate.
// ---------------------------------------------------------------------------

function buildSuccess(
  host: CapturedConfig,
  state: CallState,
  entry: Entry,
  call: CallPlan,
  response: Extract<RawWireResponse, { ok: true }>,
): AttemptStep {
  const nonGet = !isGetRoute(call.def.label);
  const malformed = (): AttemptStep => {
    if (nonGet) {
      state.uncertain = true;
    }
    return {
      kind: "fail",
      error: {
        code: "internal_error",
        backendErrorCode: null,
        retryAfterSeconds: null,
        status: response.status,
      },
    };
  };
  // Final delivery gate: recheck abort/deadline/liveness AFTER decode and
  // serialization work. Never deliver success past the deadline.
  const deliveryGate = (): AttemptStep | null => {
    const suppress = (code: TransportErrorCode): AttemptStep => {
      if (nonGet) {
        state.uncertain = true;
      }
      return {
        kind: "fail",
        error: {
          code,
          backendErrorCode: null,
          retryAfterSeconds: null,
          status: response.status,
        },
      };
    };
    if (entry.caller.aborted) {
      return suppress("operation_interrupted");
    }
    try {
      if (state.now() >= state.deadlineMs) {
        return suppress("network_error");
      }
    } catch {
      return suppress("internal_error");
    }
    let current: unknown;
    try {
      current = invokeHook(host.session.isCurrent, entry.frozen);
    } catch {
      return suppress("operation_interrupted");
    }
    if (current !== true) {
      return suppress("operation_interrupted");
    }
    // Post-sync-guard recheck: isCurrent may have consumed CPU time or
    // synchronously aborted the caller. Never deliver past a fresh edge.
    if (entry.caller.aborted) {
      return suppress("operation_interrupted");
    }
    try {
      if (state.now() >= state.deadlineMs) {
        return suppress("network_error");
      }
    } catch {
      return suppress("internal_error");
    }
    return null;
  };
  const map = headerMap(response.rawHeaders);
  if (call.def.label === "auth_logout") {
    const length = singleHeader(map, "content-length");
    if (length === "duplicate") {
      return malformed();
    }
    if (length !== null && trimOws(length).replace(/^0+/, "") !== "") {
      return malformed();
    }
    if (map.has("transfer-encoding")) {
      return malformed();
    }
    if (response.body.byteLength !== 0) {
      return malformed();
    }
    const gate = deliveryGate();
    if (gate !== null) {
      return gate;
    }
    state.uncertain = false;
    const elapsed = state.elapsedNow();
    const outcome: LogoutResult = Object.freeze({
      attempts: state.attempts,
      elapsedMs: elapsed,
      correlationId: entry.correlationId,
      dispatched: true,
      status: 204,
    });
    state.emit(call.def, "ok", response.status, elapsed);
    return { kind: "success", outcome };
  }
  if (!jsonContentTypeOk(map) || !identityEncodingOk(map)) {
    return malformed();
  }
  if (response.body.byteLength === 0) {
    return malformed();
  }
  if (!contentLengthMatches(map, response.body.byteLength)) {
    return malformed();
  }
  let text: string;
  try {
    text = decodeUtf8Fatal(response.body);
  } catch {
    return malformed();
  }
  if (call.def.control === null) {
    let data: unknown;
    try {
      if (call.expectedId !== null) {
        data = decodeBackendResponse(call.def.decode as ReadToolName, text, call.expectedId);
      } else {
        data = decodeBackendResponse(call.def.decode as ReadToolName, text);
      }
    } catch {
      return malformed();
    }
    const projected = Buffer.byteLength(JSON.stringify(data) as string, "utf8");
    if (projected > host.budgets.maxProjectedResultBytes) {
      // Projected overflow sets sticky uncertainty: no canonical
      // confirmation reached the caller.
      if (nonGet) {
        state.uncertain = true;
      }
      return {
        kind: "fail",
        error: {
          code: "result_too_large",
          backendErrorCode: null,
          retryAfterSeconds: null,
          status: response.status,
        },
      };
    }
    deepFreezeJson(data);
    const gate = deliveryGate();
    if (gate !== null) {
      return gate;
    }
    // Validated, within budget, unfenced: this settles transport uncertainty.
    state.uncertain = false;
    const elapsed = state.elapsedNow();
    const meta: ResultMeta = {
      attempts: state.attempts,
      elapsedMs: elapsed,
      correlationId: entry.correlationId,
      dispatched: true,
    };
    if (call.def.keyKind === "resource" && call.key !== null) {
      const rawBodyBytes = Buffer.from(response.body);
      const outcome: MutationResult = Object.freeze({
        ...meta,
        status: response.status as 200 | 201,
        routeLabel: call.def.label as MutationRouteName,
        resourceKey: call.key,
        rawBodyBytes,
        data: data as RoutineRecord,
      });
      state.emit(call.def, "ok", response.status, elapsed);
      return { kind: "success", outcome };
    }
    const outcome = Object.freeze({ ...meta, status: 200, data });
    state.emit(call.def, "ok", response.status, elapsed);
    return { kind: "success", outcome: outcome as CallOutcome };
  }
  let controlRecord: StrictJsonObject;
  try {
    controlRecord = parseStrictObject(text);
  } catch {
    return malformed();
  }
  void controlRecord;
  const gate = deliveryGate();
  if (gate !== null) {
    return gate;
  }
  state.uncertain = false;
  const elapsed = state.elapsedNow();
  const rawBodyBytes = Buffer.from(response.body);
  const outcome: ControlResult = Object.freeze({
    attempts: state.attempts,
    elapsedMs: elapsed,
    correlationId: entry.correlationId,
    dispatched: true,
    status: 200,
    rawBodyBytes,
  });
  state.emit(call.def, "ok", response.status, elapsed);
  return { kind: "success", outcome };
}
