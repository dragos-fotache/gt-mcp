/**
 * T05 fixed-origin backend transport — safe error and event surface.
 *
 * TransportError carries only specified readonly own fields with a fixed
 * generic message. No cause, stack payload, request, binding, body, token,
 * backend message, or native exception data is ever attached. Instances are
 * frozen at runtime; recognition uses a private WeakSet so hostile getters,
 * instanceof traps, or forged descriptors cannot spoof it.
 */

export type TransportErrorCode =
  | "invalid_arguments"
  | "authentication_required"
  | "reauthentication_required"
  | "validation_error"
  | "invalid_page_token"
  | "page_expired"
  | "read_only"
  | "not_found"
  | "idempotency_key_reused"
  | "id_collision"
  | "invalid_state"
  | "invalid_reference"
  | "request_too_large"
  | "result_too_large"
  | "rate_limited"
  | "temporarily_unavailable"
  | "internal_error"
  | "network_error"
  | "operation_interrupted"
  | "backend_error";

export interface TransportErrorFields {
  readonly backendErrorCode: string | null;
  readonly retryAfterSeconds: number | null;
  readonly status: number | null;
  readonly dispatched: boolean;
  readonly outcomeUnknown: boolean;
  readonly attempts: number;
  readonly elapsedMs: number;
  readonly correlationId: string;
}

export interface TransportEvent {
  readonly routeLabel:
    | "search_exercises"
    | "get_exercise"
    | "list_workouts"
    | "get_workout"
    | "list_routines"
    | "get_routine"
    | "create_draft"
    | "populate_draft"
    | "save_routine"
    | "auth_challenge"
    | "auth_exchange"
    | "auth_refresh"
    | "auth_logout"
    | "account_status";
  readonly code: TransportErrorCode | "ok";
  readonly status: number | null;
  readonly attempts: number;
  readonly elapsedMs: number;
  readonly dispatched: boolean;
  readonly outcomeUnknown: boolean;
  readonly correlationId: string;
}

const KNOWN_CODES: Readonly<Record<TransportErrorCode, true>> = {
  invalid_arguments: true,
  authentication_required: true,
  reauthentication_required: true,
  validation_error: true,
  invalid_page_token: true,
  page_expired: true,
  read_only: true,
  not_found: true,
  idempotency_key_reused: true,
  id_collision: true,
  invalid_state: true,
  invalid_reference: true,
  request_too_large: true,
  result_too_large: true,
  rate_limited: true,
  temporarily_unavailable: true,
  internal_error: true,
  network_error: true,
  operation_interrupted: true,
  backend_error: true,
};

/** retryable is derived from the code table; it is never caller-supplied. */
const RETRYABLE_CODES: Readonly<Record<TransportErrorCode, boolean>> = {
  invalid_arguments: false,
  authentication_required: false,
  reauthentication_required: false,
  validation_error: false,
  invalid_page_token: false,
  page_expired: false,
  read_only: false,
  not_found: false,
  idempotency_key_reused: false,
  id_collision: false,
  invalid_state: false,
  invalid_reference: false,
  request_too_large: false,
  result_too_large: false,
  rate_limited: true,
  temporarily_unavailable: true,
  internal_error: true,
  network_error: true,
  operation_interrupted: true,
  backend_error: false,
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SAFE_CODE_PATTERN = /^[a-z][a-z0-9_]*$/;

const FIELD_NAMES: ReadonlyArray<keyof TransportErrorFields> = [
  "backendErrorCode",
  "retryAfterSeconds",
  "status",
  "dispatched",
  "outcomeUnknown",
  "attempts",
  "elapsedMs",
  "correlationId",
];

const BRAND = new WeakSet<object>();

function isDataDescriptor(value: unknown): value is { value: unknown } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return (
    Object.prototype.hasOwnProperty.call(value, "value") &&
    typeof (value as { get?: unknown }).get === "undefined" &&
    typeof (value as { set?: unknown }).set === "undefined"
  );
}

/** Read an own data property without invoking accessors; undefined when absent. */
function readOwn(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined || !isDataDescriptor(descriptor)) {
    return undefined;
  }
  return descriptor.value;
}

function hasOnlyKnownOwnFields(value: object, allowed: ReadonlyArray<string>): boolean {
  const keys = Reflect.ownKeys(value);
  for (const key of keys) {
    if (typeof key !== "string" || !allowed.includes(key)) {
      return false;
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !isDataDescriptor(descriptor)) {
      return false;
    }
  }
  return true;
}

function isSafeIntegerIn(value: unknown, min: number, max: number): boolean {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
}

export class TransportError extends Error implements TransportErrorFields {
  public readonly code: TransportErrorCode;
  public readonly retryable: boolean;
  public readonly backendErrorCode: string | null;
  public readonly retryAfterSeconds: number | null;
  public readonly status: number | null;
  public readonly dispatched: boolean;
  public readonly outcomeUnknown: boolean;
  public readonly attempts: number;
  public readonly elapsedMs: number;
  public readonly correlationId: string;

  public constructor(code: TransportErrorCode, details?: Partial<TransportErrorFields>) {
    let safe: NormalizedInput;
    try {
      safe = normalizeConstructorInput(code, details);
    } catch {
      safe = { code: "invalid_arguments", fields: DEFAULT_FIELDS };
    }
    super(`Transport failure: ${safe.code}.`);
    this.code = safe.code;
    this.retryable = RETRYABLE_CODES[this.code] === true;
    this.backendErrorCode = safe.fields.backendErrorCode;
    this.retryAfterSeconds = safe.fields.retryAfterSeconds;
    this.status = safe.fields.status;
    this.dispatched = safe.fields.dispatched;
    this.outcomeUnknown = safe.fields.outcomeUnknown;
    this.attempts = safe.fields.attempts;
    this.elapsedMs = safe.fields.elapsedMs;
    this.correlationId = safe.fields.correlationId;
    this.name = "TransportError";
    delete (this as { stack?: unknown }).stack;
    Object.freeze(this);
    BRAND.add(this);
  }
}

interface NormalizedInput {
  readonly code: TransportErrorCode;
  readonly fields: TransportErrorFields;
}

const DEFAULT_FIELDS: TransportErrorFields = {
  backendErrorCode: null,
  retryAfterSeconds: null,
  status: null,
  dispatched: false,
  outcomeUnknown: false,
  attempts: 0,
  elapsedMs: 0,
  correlationId: "",
};

function normalizeConstructorInput(code: unknown, details: unknown): NormalizedInput {
  if (typeof code !== "string" || !Object.prototype.hasOwnProperty.call(KNOWN_CODES, code)) {
    return { code: "invalid_arguments", fields: DEFAULT_FIELDS };
  }
  const validCode = code as TransportErrorCode;
  if (details === undefined) {
    return { code: validCode, fields: DEFAULT_FIELDS };
  }
  if (
    typeof details !== "object" ||
    details === null ||
    Array.isArray(details) ||
    !hasOnlyKnownOwnFields(details, FIELD_NAMES as ReadonlyArray<string>)
  ) {
    return { code: "invalid_arguments", fields: DEFAULT_FIELDS };
  }
  const source = details as Record<string, unknown>;
  const backendErrorCode = readOwn(source, "backendErrorCode");
  const retryAfterSeconds = readOwn(source, "retryAfterSeconds");
  const status = readOwn(source, "status");
  const dispatched = readOwn(source, "dispatched");
  const outcomeUnknown = readOwn(source, "outcomeUnknown");
  const attempts = readOwn(source, "attempts");
  const elapsedMs = readOwn(source, "elapsedMs");
  const correlationId = readOwn(source, "correlationId");
  if (
    (backendErrorCode !== undefined &&
      backendErrorCode !== null &&
      (typeof backendErrorCode !== "string" ||
        backendErrorCode.length === 0 ||
        !SAFE_CODE_PATTERN.test(backendErrorCode))) ||
    (retryAfterSeconds !== undefined &&
      retryAfterSeconds !== null &&
      !isSafeIntegerIn(retryAfterSeconds, 1, Number.MAX_SAFE_INTEGER)) ||
    (status !== undefined && status !== null && !isSafeIntegerIn(status, 100, 599)) ||
    (dispatched !== undefined && typeof dispatched !== "boolean") ||
    (outcomeUnknown !== undefined && typeof outcomeUnknown !== "boolean") ||
    (attempts !== undefined && !isSafeIntegerIn(attempts, 0, 5)) ||
    (elapsedMs !== undefined &&
      (typeof elapsedMs !== "number" || !Number.isFinite(elapsedMs) || elapsedMs < 0)) ||
    (correlationId !== undefined &&
      correlationId !== "" &&
      (typeof correlationId !== "string" || !UUID_PATTERN.test(correlationId)))
  ) {
    return { code: "invalid_arguments", fields: DEFAULT_FIELDS };
  }
  return {
    code: validCode,
    fields: {
      backendErrorCode: backendErrorCode === undefined ? null : (backendErrorCode as string | null),
      retryAfterSeconds:
        retryAfterSeconds === undefined ? null : (retryAfterSeconds as number | null),
      status: status === undefined ? null : (status as number | null),
      dispatched: dispatched === undefined ? false : dispatched,
      outcomeUnknown: outcomeUnknown === undefined ? false : outcomeUnknown,
      attempts: attempts === undefined ? 0 : (attempts as number),
      elapsedMs: elapsedMs === undefined ? 0 : (elapsedMs as number),
      correlationId: correlationId === undefined ? "" : correlationId,
    },
  };
}

export function isTransportError(value: unknown): value is TransportError {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  try {
    return BRAND.has(value);
  } catch {
    return false;
  }
}
