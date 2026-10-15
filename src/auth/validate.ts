/**
 * T06-S1 pure validation — own-data shapes, bindings, bytes, signals,
 * clocks, strict duplicate-free JSON, expiry instants, and token checks.
 *
 * Every boundary value is captured without invoking user code: own property
 * descriptors are read first (never through getters), symbols/accessors/
 * non-plain prototypes/cycles are rejected, and native exceptions from
 * hostile inputs map to a caller-chosen failure. No IO, logging, timers,
 * network, or global state occurs here.
 */

import { URL } from "node:url";
import { SessionError } from "./errors.js";

export const MIN_EPOCH_MS = -62167219200000 as const;
export const MAX_EPOCH_MS = 253402300799999 as const;

const CANONICAL_UUID_RE: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface ParsedBinding {
  readonly origin: string;
  readonly accountUuid: string | null;
  readonly sessionGeneration: number;
  readonly profileGenerationId: string;
}

type Entries = Array<[string, unknown]>;

function failArguments(): never {
  throw new SessionError("invalid_arguments");
}

/** Capture every own enumerable string-keyed data property without invoking accessors. */
export function captureEntries(value: unknown): Entries {
  try {
    if (typeof value !== "object" || value === null) {
      failArguments();
    }
    const proto: unknown = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      failArguments();
    }
    const entries: Entries = [];
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        failArguments();
      }
      const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(
        value,
        key,
      );
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        typeof descriptor.get === "function" ||
        typeof descriptor.set === "function"
      ) {
        failArguments();
      }
      entries.push([key, descriptor.value]);
    }
    return entries;
  } catch (error) {
    if (error instanceof SessionError) {
      throw error;
    }
    failArguments();
  }
}

function lookup(entries: Entries, key: string): { found: boolean; value: unknown } {
  for (const entry of entries) {
    if (entry[0] === key) {
      return { found: true, value: entry[1] };
    }
  }
  return { found: false, value: undefined };
}

export function assertExactKeys(entries: Entries, allowed: readonly string[]): void {
  for (const entry of entries) {
    if (!allowed.includes(entry[0])) {
      failArguments();
    }
  }
}

export function isCanonicalUuid(value: unknown): value is string {
  return typeof value === "string" && CANONICAL_UUID_RE.test(value);
}

/**
 * Canonical HTTPS origin: the input must already be in exact canonical
 * form (https scheme, no credentials, root path only, no query/fragment,
 * lowercase host, no explicit default port). Mirrors accepted T04 rules.
 */
export function isCanonicalOriginText(text: string): boolean {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return false;
  }
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    return false;
  }
  return text === `https://${url.host}`;
}

function assertOrigin(value: unknown): string {
  if (typeof value !== "string" || !isCanonicalOriginText(value)) {
    failArguments();
  }
  return value;
}

function assertGeneration(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    failArguments();
  }
  return value;
}

/** Validate an exact four-field binding shape and return a frozen detached copy. */
export function assertBinding(value: unknown): ParsedBinding {
  const entries: Entries = captureEntries(value);
  assertExactKeys(entries, ["origin", "accountUuid", "sessionGeneration", "profileGenerationId"]);
  const originRaw = lookup(entries, "origin");
  const accountRaw = lookup(entries, "accountUuid");
  const generationRaw = lookup(entries, "sessionGeneration");
  const profileRaw = lookup(entries, "profileGenerationId");
  if (!originRaw.found || !accountRaw.found || !generationRaw.found || !profileRaw.found) {
    failArguments();
  }
  const origin: string = assertOrigin(originRaw.value);
  const accountUuid: string | null =
    accountRaw.value === null
      ? null
      : isCanonicalUuid(accountRaw.value)
        ? (accountRaw.value as string)
        : failArguments();
  const sessionGeneration: number = assertGeneration(generationRaw.value);
  if (!isCanonicalUuid(profileRaw.value)) {
    failArguments();
  }
  return Object.freeze({
    origin,
    accountUuid,
    sessionGeneration,
    profileGenerationId: profileRaw.value as string,
  });
}

/** Non-throwing capture-equality check for isCurrent: false on any malformed input. */
export function isBindingEqualToCapture(value: unknown, capture: ParsedBinding): boolean {
  try {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    const proto: unknown = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      return false;
    }
    const keys: Array<string> = [];
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        return false;
      }
      const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(
        value,
        key,
      );
      if (
        descriptor === undefined ||
        !descriptor.enumerable ||
        typeof descriptor.get === "function" ||
        typeof descriptor.set === "function"
      ) {
        return false;
      }
      keys.push(key);
    }
    if (keys.length !== 4) {
      return false;
    }
    for (const required of ["origin", "accountUuid", "sessionGeneration", "profileGenerationId"]) {
      if (!keys.includes(required)) {
        return false;
      }
    }
    const read = (name: string): unknown => {
      const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(
        value,
        name,
      );
      return descriptor === undefined ? undefined : (descriptor as { value: unknown }).value;
    };
    const origin: unknown = read("origin");
    const accountUuid: unknown = read("accountUuid");
    const sessionGeneration: unknown = read("sessionGeneration");
    const profileGenerationId: unknown = read("profileGenerationId");
    if (typeof origin !== "string" || origin !== capture.origin) {
      return false;
    }
    if (accountUuid === null) {
      if (capture.accountUuid !== null) {
        return false;
      }
    } else if (typeof accountUuid !== "string" || accountUuid !== capture.accountUuid) {
      return false;
    }
    if (sessionGeneration !== capture.sessionGeneration) {
      return false;
    }
    if (profileGenerationId !== capture.profileGenerationId) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function bindingsEqual(a: ParsedBinding, b: ParsedBinding): boolean {
  return (
    a.origin === b.origin &&
    a.accountUuid === b.accountUuid &&
    a.sessionGeneration === b.sessionGeneration &&
    a.profileGenerationId === b.profileGenerationId
  );
}

/** Require a genuine AbortSignal; abort itself is reported by the caller. */
export function assertSignal(value: unknown): AbortSignal {
  if (!(value instanceof AbortSignal)) {
    failArguments();
  }
  return value;
}

export function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new SessionError("operation_interrupted");
  }
}

/** Clock readings must be finite safe integers inside the backend epoch range. */
export function assertClockMs(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isSafeInteger(value) ||
    value < MIN_EPOCH_MS ||
    value > MAX_EPOCH_MS
  ) {
    failArguments();
  }
  return value;
}

/** Validate a byte view and return an independent copy. Rejects shared/detached/resizable. */
export function copyByteView(value: unknown): Uint8Array {
  try {
    if (!(value instanceof Uint8Array)) {
      failArguments();
    }
    const view: Uint8Array = value;
    const backing: unknown = (view as { buffer?: unknown }).buffer;
    if (typeof SharedArrayBuffer !== "undefined" && backing instanceof SharedArrayBuffer) {
      failArguments();
    }
    if (backing instanceof ArrayBuffer && (backing as { resizable?: unknown }).resizable === true) {
      failArguments();
    }
    try {
      Uint8Array.prototype.slice.call(view, 0, 0);
    } catch {
      failArguments();
    }
    return new Uint8Array(view);
  } catch (error) {
    if (error instanceof SessionError) {
      throw error;
    }
    failArguments();
  }
}

/** Header-safe bearer token: nonempty visible ASCII 0x21..0x7e (accepted T05 rule). */
export function isHeaderSafeToken(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  for (let index = 0; index < value.length; index += 1) {
    const unit: number = value.charCodeAt(index);
    if (unit < 0x21 || unit > 0x7e) {
      return false;
    }
  }
  return true;
}

/**
 * Opaque refresh token: a nonempty string treated as data. Per the settled
 * work order this imposes no spelling grammar: dots, JSON-represented NUL,
 * account-shaped strings, or equality with another field are all accepted.
 * Only the access token carries the T05 header-safety constraint.
 */
export function isOpaqueRefreshToken(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

// ---------------------------------------------------------------------------
// Strict duplicate-free JSON.
// ---------------------------------------------------------------------------

class JsonShapeError extends Error {}

function isWhitespace(unit: number): boolean {
  return unit === 0x20 || unit === 0x09 || unit === 0x0a || unit === 0x0d;
}

function parseStringRaw(text: string, start: number): { raw: string; next: number } {
  // text[start] === '"'. Validates escapes; returns the raw literal slice.
  let pos: number = start + 1;
  while (pos < text.length) {
    const unit: number = text.charCodeAt(pos);
    if (unit === 0x22) {
      return { raw: text.slice(start, pos + 1), next: pos + 1 };
    }
    if (unit === 0x5c) {
      const esc: number = text.charCodeAt(pos + 1);
      if (Number.isNaN(esc)) {
        throw new JsonShapeError("unterminated escape");
      }
      if (esc === 0x75) {
        // \uXXXX
        const hex: string = text.slice(pos + 2, pos + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
          throw new JsonShapeError("bad unicode escape");
        }
        pos += 6;
        continue;
      }
      if (
        esc === 0x22 ||
        esc === 0x5c ||
        esc === 0x2f ||
        esc === 0x62 ||
        esc === 0x66 ||
        esc === 0x6e ||
        esc === 0x72 ||
        esc === 0x74
      ) {
        pos += 2;
        continue;
      }
      throw new JsonShapeError("bad escape");
    }
    if (unit < 0x20) {
      throw new JsonShapeError("unescaped control");
    }
    pos += 1;
  }
  throw new JsonShapeError("unterminated string");
}

const NUMBER_RE: RegExp = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/;

function skipWs(text: string, pos: number): number {
  while (pos < text.length && isWhitespace(text.charCodeAt(pos))) {
    pos += 1;
  }
  return pos;
}

/**
 * Validate complete JSON with per-object duplicate-key rejection on decoded
 * key strings (including escaped-key duplicates). Throws JsonShapeError.
 */
function validateNoDuplicates(text: string): void {
  let pos: number = skipWs(text, 0);
  if (pos >= text.length) {
    throw new JsonShapeError("empty");
  }
  // Explicit stack to avoid recursion on hostile nesting.
  // Frames: 0 = array, 1 = object expecting key or end, 2 = object expecting colon,
  // 3 = object expecting value, 4 = object expecting comma or end.
  const kinds: Array<number> = [];
  const keySets: Array<Set<string> | null> = [];
  const pendingKeys: Array<string | null> = [];
  let expectValue: boolean = true;

  const pushFrame = (kind: number): void => {
    kinds.push(kind);
    keySets.push(kind === 1 ? new Set<string>() : null);
    pendingKeys.push(null);
  };
  const popFrame = (): void => {
    kinds.pop();
    keySets.pop();
    pendingKeys.pop();
    afterValue();
  };
  const afterValue = (): void => {
    if (kinds.length === 0) {
      expectValue = false;
      return;
    }
    const top: number | undefined = kinds[kinds.length - 1];
    if (top === 0) {
      // array: value done; loop handles comma/end.
      expectValue = false;
    } else if (top === 3) {
      kinds[kinds.length - 1] = 4;
      expectValue = false;
    } else {
      throw new JsonShapeError("state");
    }
  };

  const readLiteral = (word: string): void => {
    if (text.startsWith(word, pos)) {
      pos += word.length;
      afterValue();
      return;
    }
    throw new JsonShapeError("literal");
  };

  while (pos < text.length) {
    pos = skipWs(text, pos);
    if (pos >= text.length) {
      break;
    }
    const unit: number = text.charCodeAt(pos);
    if (expectValue) {
      if (unit === 0x7b) {
        pos += 1;
        pushFrame(1);
        pos = skipWs(text, pos);
        if (pos < text.length && text.charCodeAt(pos) === 0x7d) {
          pos += 1;
          popFrame();
        } else {
          // A nonempty object expects a key next, not a bare value: route
          // the following string through the object-key path below.
          expectValue = false;
        }
        continue;
      }
      if (unit === 0x5b) {
        pos += 1;
        pushFrame(0);
        pos = skipWs(text, pos);
        if (pos < text.length && text.charCodeAt(pos) === 0x5d) {
          pos += 1;
          popFrame();
        }
        continue;
      }
      if (unit === 0x22) {
        const parsed = parseStringRaw(text, pos);
        pos = parsed.next;
        afterValue();
        continue;
      }
      if (unit === 0x74) {
        readLiteral("true");
        continue;
      }
      if (unit === 0x66) {
        readLiteral("false");
        continue;
      }
      if (unit === 0x6e) {
        readLiteral("null");
        continue;
      }
      if (unit === 0x2d || (unit >= 0x30 && unit <= 0x39)) {
        const rest: string = text.slice(pos);
        const match: RegExpMatchArray | null = NUMBER_RE.exec(rest);
        if (match === null) {
          throw new JsonShapeError("number");
        }
        pos += match[0].length;
        afterValue();
        continue;
      }
      throw new JsonShapeError("value");
    }
    // Not expecting a bare value: structural characters for enclosing frames.
    if (kinds.length === 0) {
      throw new JsonShapeError("trailing");
    }
    const top: number | undefined = kinds[kinds.length - 1];
    if (top === 0) {
      if (unit === 0x2c) {
        pos += 1;
        expectValue = true;
        continue;
      }
      if (unit === 0x5d) {
        pos += 1;
        popFrame();
        continue;
      }
      throw new JsonShapeError("array");
    }
    if (top === 1) {
      if (unit !== 0x22) {
        throw new JsonShapeError("key");
      }
      const parsed = parseStringRaw(text, pos);
      let key: string;
      try {
        key = JSON.parse(parsed.raw) as string;
      } catch {
        throw new JsonShapeError("key decode");
      }
      const set: Set<string> | null | undefined = keySets[keySets.length - 1];
      if (set === null || set === undefined) {
        throw new JsonShapeError("state");
      }
      if (set.has(key)) {
        throw new JsonShapeError("duplicate key");
      }
      set.add(key);
      pendingKeys[pendingKeys.length - 1] = key;
      pos = parsed.next;
      kinds[kinds.length - 1] = 2;
      continue;
    }
    if (top === 2) {
      if (unit !== 0x3a) {
        throw new JsonShapeError("colon");
      }
      pos += 1;
      kinds[kinds.length - 1] = 3;
      expectValue = true;
      continue;
    }
    if (top === 4) {
      if (unit === 0x2c) {
        pos += 1;
        kinds[kinds.length - 1] = 1;
        continue;
      }
      if (unit === 0x7d) {
        pos += 1;
        popFrame();
        continue;
      }
      throw new JsonShapeError("object");
    }
    throw new JsonShapeError("state");
  }
  if (kinds.length !== 0 || expectValue) {
    throw new JsonShapeError("incomplete");
  }
}

/** Decode UTF-8 fatally and parse duplicate-free JSON. Throws the provided SessionError code. */
export function parseStrictJson(text: string): unknown {
  try {
    validateNoDuplicates(text);
  } catch {
    throw new SessionError("state_corrupt");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new SessionError("state_corrupt");
  }
}

/** Same as parseStrictJson but throws invalid_grant (service response bodies). */
export function parseStrictGrantJson(text: string): unknown {
  try {
    validateNoDuplicates(text);
  } catch {
    throw new SessionError("invalid_grant");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new SessionError("invalid_grant");
  }
}

export function decodeUtf8Fatal(bytes: Uint8Array, grant: false): string;
export function decodeUtf8Fatal(bytes: Uint8Array, grant: true): string;
export function decodeUtf8Fatal(bytes: Uint8Array, grant: boolean): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new SessionError(grant ? "invalid_grant" : "state_corrupt");
  }
}

// ---------------------------------------------------------------------------
// Expiry instants (accepted T03 timestamp semantics).
// ---------------------------------------------------------------------------

const TIMESTAMP_PATTERN: RegExp = new RegExp(
  "^([0-9]{4})-([0-9]{2})-([0-9]{2})" +
    "[Tt]([0-9]{2}):([0-9]{2}):([0-9]{2})" +
    "(?:\\.([0-9]+))?" +
    "(?:[Zz]|\\+00:00)(?![\\s\\S])",
);

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 1:
    case 3:
    case 5:
    case 7:
    case 8:
    case 10:
    case 12:
      return 31;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    case 2:
      return isLeapYear(year) ? 29 : 28;
    default:
      return 0;
  }
}

function daysFromCivil(year: number, month: number, day: number): number {
  const adjustedYear: number = month <= 2 ? year - 1 : year;
  const era: number = Math.floor(adjustedYear / 400);
  const yearOfEra: number = adjustedYear - era * 400;
  const dayOfYear: number =
    Math.floor((153 * (month > 2 ? month - 3 : month + 9) + 2) / 5) + day - 1;
  const dayOfEra: number =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

/**
 * Derive exact epoch milliseconds for a valid expiry string, or null when
 * the string violates the accepted timestamp rule (non-UTC offset, leap
 * second, nonzero sub-millisecond digits, out-of-range calendar, range).
 * No rounding is ever applied: digits after the third must all be zero.
 */
export function expiryToMs(value: unknown): number | null {
  if (typeof value !== "string") {
    return null;
  }
  const match: RegExpMatchArray | null = TIMESTAMP_PATTERN.exec(value);
  if (match === null) {
    return null;
  }
  const year: number = Number.parseInt(match[1] ?? "", 10);
  const month: number = Number.parseInt(match[2] ?? "", 10);
  const day: number = Number.parseInt(match[3] ?? "", 10);
  const hour: number = Number.parseInt(match[4] ?? "", 10);
  const minute: number = Number.parseInt(match[5] ?? "", 10);
  const second: number = Number.parseInt(match[6] ?? "", 10);
  const fraction: string = match[7] ?? "";
  if (
    !Number.isSafeInteger(year) ||
    !Number.isSafeInteger(month) ||
    !Number.isSafeInteger(day) ||
    !Number.isSafeInteger(hour) ||
    !Number.isSafeInteger(minute) ||
    !Number.isSafeInteger(second)
  ) {
    return null;
  }
  if (month < 1 || month > 12) {
    return null;
  }
  if (day < 1 || day > daysInMonth(year, month)) {
    return null;
  }
  if (hour > 23 || minute > 59 || second > 59) {
    return null;
  }
  if (fraction.length > 3) {
    const extra: string = fraction.slice(3);
    if (!/^[0]+$/.test(extra)) {
      return null;
    }
  }
  const millisText: string =
    fraction.length === 0 ? "0" : (fraction.slice(0, 3) + "000").slice(0, 3);
  const millis: number = Number.parseInt(millisText, 10);
  const epochMs: number =
    daysFromCivil(year, month, day) * 86400000 +
    hour * 3600000 +
    minute * 60000 +
    second * 1000 +
    millis;
  if (epochMs < MIN_EPOCH_MS || epochMs > MAX_EPOCH_MS) {
    return null;
  }
  return epochMs;
}
