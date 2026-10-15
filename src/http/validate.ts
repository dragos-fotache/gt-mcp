/**
 * T05 synchronous validation primitives: origin gate, call bindings, budgets,
 * byte capture, strict JSON scanning, and frozen request-shape checks.
 *
 * Every validator reads own data properties only and never invokes getters,
 * setters, toJSON, or Proxy traps beyond a reflective failure it converts to
 * a safe local failure. Accepted bytes are inspected but never reserialized.
 * Distinct local failures separate invalid input (ValidationFailure),
 * operational size overflow (SizeFailure), and unusable clocks (ClockFault).
 */

import type { TransportBudgets } from "./index.js";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const SAFE_CODE_PATTERN = /^[a-z][a-z0-9_]*$/;
export const RETRY_AFTER_PATTERN = /^[1-9][0-9]*$/;

export class ValidationFailure extends Error {
  public constructor() {
    super("invalid transport input");
  }
}

export class SizeFailure extends Error {
  public constructor() {
    super("transport budget overflow");
  }
}

export class ClockFault extends Error {
  public constructor() {
    super("clock fault");
  }
}

export function fail(): never {
  throw new ValidationFailure();
}

export function failSize(): never {
  throw new SizeFailure();
}

/** True for plain objects (Object.prototype or null) and nothing else. */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  let prototype: unknown;
  try {
    prototype = Object.getPrototypeOf(value);
  } catch {
    return false;
  }
  return prototype === Object.prototype || prototype === null;
}

/**
 * Exact own data fields with required/optional split. Optional members stay
 * optional (absent is valid) while explicit undefined, unknown keys, symbol
 * keys, accessor descriptors, and non-plain prototypes reject — all without
 * invoking getters. No enumerability requirement is invented.
 */
export function checkOwnFields(
  value: unknown,
  required: ReadonlyArray<string>,
  optional: ReadonlyArray<string> = [],
): Record<string, unknown> {
  if (!isPlainRecord(value)) {
    fail();
  }
  let keys: Array<string | symbol>;
  try {
    keys = Reflect.ownKeys(value);
  } catch {
    fail();
  }
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (typeof key !== "string") {
      fail();
    }
    if (!required.includes(key) && !optional.includes(key)) {
      fail();
    }
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      fail();
    }
    if (
      descriptor === undefined ||
      !Object.prototype.hasOwnProperty.call(descriptor, "value") ||
      typeof (descriptor as { get?: unknown }).get !== "undefined" ||
      typeof (descriptor as { set?: unknown }).set !== "undefined"
    ) {
      fail();
    }
    const field = (descriptor as { value: unknown }).value;
    if (field === undefined) {
      fail();
    }
    out[key] = field;
  }
  for (const name of required) {
    if (!Object.prototype.hasOwnProperty.call(out, name)) {
      fail();
    }
  }
  return out;
}

export function isCanonicalUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** Header/opaque token: nonempty visible ASCII 0x21..0x7e, no whitespace. */
export function isHeaderSafeToken(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit < 0x21 || unit > 0x7e) {
      return false;
    }
  }
  return true;
}

/** Normalized head accounting shared by adapter and upper-layer rechecks. */
export function measureHeadBytes(
  status: number,
  pairs: ReadonlyArray<readonly [string, string]>,
): number {
  let total = Buffer.byteLength(`HTTP/1.1 ${status} \r\n`, "ascii") + 2;
  for (const pair of pairs) {
    total += Buffer.byteLength(`${pair[0]}: ${pair[1]}\r\n`, "utf8");
  }
  return total;
}

/**
 * Actual trailer bytes: field lines plus the terminator when fields exist.
 * Trailers never contribute another HTTP status line; absent trailers add 0.
 */
export function measureTrailerBytes(pairs: ReadonlyArray<readonly [string, string]>): number {
  if (pairs.length === 0) {
    return 0;
  }
  let total = 0;
  for (const pair of pairs) {
    total += Buffer.byteLength(`${pair[0]}: ${pair[1]}\r\n`, "utf8");
  }
  return total + 2;
}

// ---------------------------------------------------------------------------
// Origin gate (raw lexical checks BEFORE URL parsing, then canonicalization).
// ---------------------------------------------------------------------------

export interface CanonicalOrigin {
  readonly canonical: string;
  readonly isHttps: boolean;
  readonly socketHost: string;
  readonly port: number;
  readonly hostHeader: string;
  /** Bare host text as written before normalization (fixture-trust checks). */
  readonly rawHost: string;
}

function hasControlOrWhitespace(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit <= 0x20 || unit === 0x7f || (unit >= 0x80 && unit <= 0x9f)) {
      return true;
    }
  }
  return false;
}

/** Bare host text from a raw authority (no normalization applied). */
function rawBareHost(authority: string): string {
  if (authority.startsWith("[")) {
    const end = authority.indexOf("]");
    if (end < 0) {
      fail();
    }
    const tail = authority.slice(end + 1);
    if (tail !== "" && !/^:[0-9]+$/.test(tail)) {
      fail();
    }
    return authority.slice(1, end);
  }
  const colon = authority.indexOf(":");
  if (colon >= 0 && authority.indexOf(":", colon + 1) >= 0) {
    fail();
  }
  return colon < 0 ? authority : authority.slice(0, colon);
}

export function isLiteralLoopbackHost(rawHost: string): boolean {
  return rawHost === "127.0.0.1" || rawHost === "::1";
}

export function canonicalizeOrigin(raw: unknown, allowInsecureLoopback: boolean): CanonicalOrigin {
  if (typeof raw !== "string" || raw.length === 0) {
    fail();
  }
  const schemeEnd = raw.indexOf("://");
  if (schemeEnd < 0) {
    fail();
  }
  const scheme = raw.slice(0, schemeEnd);
  const rest = raw.slice(schemeEnd + 3);
  const isHttps = scheme === "https";
  const isHttp = scheme === "http";
  if ((!isHttps && !isHttp) || scheme !== scheme.toLowerCase()) {
    fail();
  }
  // Raw lexical gate: nothing after the scheme may rely on normalization.
  if (
    rest.length === 0 ||
    rest.includes("@") ||
    rest.includes("\\") ||
    rest.includes("?") ||
    rest.includes("#") ||
    hasControlOrWhitespace(raw)
  ) {
    fail();
  }
  // Exactly one trailing slash allowed, no other path.
  let authority = rest;
  if (rest.endsWith("/")) {
    if (rest.length === 1 || rest.slice(0, -1).includes("/")) {
      fail();
    }
    authority = rest.slice(0, -1);
  } else if (rest.includes("/")) {
    fail();
  }
  if (authority.length === 0 || authority.endsWith(":")) {
    fail();
  }
  const bare = rawBareHost(authority);
  let parsed: URL;
  try {
    parsed = new URL(`${scheme}://${authority}`);
  } catch {
    fail();
  }
  if (
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    fail();
  }
  // Note: WHATWG URL normalizes empty path to "/"; the raw gate above
  // already rejected any extra slash/path before parsing.
  const hostname = parsed.hostname;
  if (hostname === "" || hostname.endsWith(".")) {
    fail();
  }
  let portNumber: number;
  if (parsed.port === "") {
    portNumber = isHttps ? 443 : 80;
  } else {
    if (!/^[1-9][0-9]*$/.test(parsed.port)) {
      fail();
    }
    portNumber = Number(parsed.port);
    if (!Number.isSafeInteger(portNumber) || portNumber > 65535) {
      fail();
    }
  }
  if (isHttp) {
    if (allowInsecureLoopback !== true) {
      fail();
    }
    if (!isLiteralLoopbackHost(bare)) {
      fail();
    }
  }
  // Socket hostname strips IPv6 brackets; Host header keeps URL.host.
  const socketHost =
    hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
  return {
    canonical: parsed.origin,
    isHttps,
    socketHost,
    port: portNumber,
    hostHeader: parsed.host,
    rawHost: bare,
  };
}

// ---------------------------------------------------------------------------
// Budgets.
// ---------------------------------------------------------------------------

const BUDGET_FIELDS: ReadonlyArray<keyof TransportBudgets> = [
  "maxRequestBytes",
  "maxRequestTargetBytes",
  "maxResponseBytes",
  "maxProjectedResultBytes",
  "maxHeadBytes",
  "maxHeaderCount",
  "perAttemptTimeoutMs",
  "totalDeadlineMs",
  "maxAttempts",
  "baseRetryDelayMs",
  "maxRetryDelayMs",
];

const BUDGET_RANGES: Readonly<Record<keyof TransportBudgets, readonly [number, number]>> = {
  maxRequestBytes: [64, 16777216],
  maxRequestTargetBytes: [64, 65536],
  maxResponseBytes: [64, 16777216],
  maxProjectedResultBytes: [64, 16777216],
  maxHeadBytes: [4096, 131072],
  maxHeaderCount: [10, 1000],
  perAttemptTimeoutMs: [50, 120000],
  totalDeadlineMs: [100, 600000],
  maxAttempts: [1, 5],
  baseRetryDelayMs: [0, 10000],
  maxRetryDelayMs: [0, 60000],
};

export const DEFAULT_TRANSPORT_BUDGET_VALUES: TransportBudgets = {
  maxRequestBytes: 262144,
  maxRequestTargetBytes: 4096,
  maxResponseBytes: 1048576,
  maxProjectedResultBytes: 1048576,
  maxHeadBytes: 32768,
  maxHeaderCount: 100,
  perAttemptTimeoutMs: 10000,
  totalDeadlineMs: 60000,
  maxAttempts: 3,
  baseRetryDelayMs: 500,
  maxRetryDelayMs: 5000,
};

export function resolveBudgets(partial: unknown): TransportBudgets {
  if (partial === undefined) {
    return { ...DEFAULT_TRANSPORT_BUDGET_VALUES };
  }
  const fields = checkOwnFields(partial, [], BUDGET_FIELDS as ReadonlyArray<string>);
  const resolved: Record<string, number> = {
    ...DEFAULT_TRANSPORT_BUDGET_VALUES,
  };
  for (const name of BUDGET_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(fields, name)) {
      continue;
    }
    const value = fields[name];
    const range = BUDGET_RANGES[name];
    if (
      typeof value !== "number" ||
      !Number.isSafeInteger(value) ||
      value < range[0] ||
      value > range[1]
    ) {
      fail();
    }
    resolved[name] = value;
  }
  if ((resolved["baseRetryDelayMs"] as number) > (resolved["maxRetryDelayMs"] as number)) {
    fail();
  }
  return resolved as unknown as TransportBudgets;
}

// ---------------------------------------------------------------------------
// Byte capture: kind checks and size gate BEFORE any allocation; only exact
// Uint8Array/Buffer prototypes accepted so subclass getter shadows cannot
// alter observed lengths.
// ---------------------------------------------------------------------------

function bufferPrototype(): object {
  return (Buffer as unknown as { prototype: object }).prototype;
}

/**
 * Descriptor-safe byte-view check: exact Uint8Array/Buffer prototypes with
 * no own shadow properties, so user-defined buffer/byteLength getters never
 * execute during validation. Returns the view for copying, or null.
 */
export function checkByteView(value: unknown): Uint8Array | null {
  try {
    if (!(value instanceof Uint8Array)) {
      return null;
    }
    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Uint8Array.prototype && prototype !== bufferPrototype()) {
      return null;
    }
    for (const name of ["buffer", "byteLength", "byteOffset", "length"]) {
      if (Object.prototype.hasOwnProperty.call(value, name)) {
        return null;
      }
    }
    const backing: unknown = (value as Uint8Array).buffer;
    if (typeof backing !== "object" || backing === null || backing instanceof SharedArrayBuffer) {
      return null;
    }
    // Reject subclassed backing stores BEFORE any resizable/detached
    // lookup: an ArrayBuffer subclass prototype getter must never execute.
    // Only the genuine ArrayBuffer prototype reaches native accessors.
    let backingProto: unknown;
    try {
      backingProto = Object.getPrototypeOf(backing);
    } catch {
      return null;
    }
    if (backingProto !== ArrayBuffer.prototype) {
      return null;
    }
    for (const name of ["resizable", "detached"]) {
      if (Object.prototype.hasOwnProperty.call(backing, name)) {
        return null;
      }
    }
    const buffer = backing as ArrayBuffer;
    // Runtime ArrayBuffer properties; structural view keeps the compiler
    // lib unchanged.
    const features = buffer as unknown as {
      readonly resizable?: boolean;
      readonly detached?: boolean;
    };
    if (features.resizable === true || features.detached === true) {
      return null;
    }
    const length = (value as Uint8Array).byteLength;
    const offset = (value as Uint8Array).byteOffset;
    if (
      !Number.isSafeInteger(length) ||
      !Number.isSafeInteger(offset) ||
      length < 0 ||
      offset < 0
    ) {
      return null;
    }
    return value as Uint8Array;
  } catch {
    return null;
  }
}

export function captureBodyBytes(value: unknown, limit: number | null): Uint8Array {
  const view = checkByteView(value);
  if (view === null) {
    fail();
  }
  const length = view.byteLength;
  if (limit !== null && length > limit) {
    failSize();
  }
  try {
    const copy = new Uint8Array(length);
    copy.set(view);
    return copy;
  } catch (error) {
    if (error instanceof ValidationFailure || error instanceof SizeFailure) {
      throw error;
    }
    fail();
  }
}

export function decodeUtf8Fatal(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    fail();
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail();
  }
}

// ---------------------------------------------------------------------------
// Strict JSON scanner: complete object JSON, duplicate-key-free at every
// level (decoded key comparison catches escaped-key duplicates). Iterative
// explicit-stack design: no hidden depth restriction applies; input size is
// bounded by the byte budgets before scanning. Used for request-shape
// inspection and control/error envelopes — never for resource responses,
// which go directly to the T03 lossless decoder.
// ---------------------------------------------------------------------------

export type StrictJson = string | number | boolean | null | StrictJsonArray | StrictJsonObject;
export type StrictJsonArray = Array<StrictJson>;
export interface StrictJsonObject {
  [key: string]: StrictJson | undefined;
}

type Token =
  | { readonly kind: "braceOpen" }
  | { readonly kind: "braceClose" }
  | { readonly kind: "bracketOpen" }
  | { readonly kind: "bracketClose" }
  | { readonly kind: "colon" }
  | { readonly kind: "comma" }
  | { readonly kind: "string"; readonly value: string }
  | { readonly kind: "number"; readonly value: number }
  | { readonly kind: "literal"; readonly value: boolean | null };

function tokenize(text: string): Array<Token> {
  const tokens: Array<Token> = [];
  let position = 0;
  const skipWhitespace = (): void => {
    while (position < text.length) {
      const unit = text.charCodeAt(position) as number;
      if (unit === 0x20 || unit === 0x09 || unit === 0x0a || unit === 0x0d) {
        position += 1;
      } else {
        return;
      }
    }
  };
  const readString = (): string => {
    // Assumes text[position] === '"'.
    position += 1;
    let out = "";
    for (;;) {
      if (position >= text.length) {
        fail();
      }
      const unit = text.charCodeAt(position) as number;
      if (unit === 0x22) {
        position += 1;
        return out;
      }
      if (unit === 0x5c) {
        position += 1;
        if (position >= text.length) {
          fail();
        }
        const escaped = text[position] as string;
        if (escaped === '"') {
          out += '"';
        } else if (escaped === "\\") {
          out += "\\";
        } else if (escaped === "/") {
          out += "/";
        } else if (escaped === "b") {
          out += "\b";
        } else if (escaped === "f") {
          out += "\f";
        } else if (escaped === "n") {
          out += "\n";
        } else if (escaped === "r") {
          out += "\r";
        } else if (escaped === "t") {
          out += "\t";
        } else if (escaped === "u") {
          const digits = text.slice(position + 1, position + 5);
          if (!/^[0-9a-fA-F]{4}$/.test(digits)) {
            fail();
          }
          out += String.fromCharCode(Number.parseInt(digits, 16));
          position += 4;
        } else {
          fail();
        }
        position += 1;
        continue;
      }
      if (unit < 0x20) {
        fail();
      }
      out += text[position] as string;
      position += 1;
    }
  };
  const readNumber = (): number => {
    const start = position;
    if (text[position] === "-") {
      position += 1;
    }
    const intStart = position;
    while (position < text.length) {
      const character = text[position] as string;
      if (character < "0" || character > "9") {
        break;
      }
      position += 1;
    }
    const intText = text.slice(intStart, position);
    if (intText.length === 0 || (intText.length > 1 && intText.startsWith("0"))) {
      fail();
    }
    if (text[position] === ".") {
      position += 1;
      const fracStart = position;
      while (position < text.length) {
        const character = text[position] as string;
        if (character < "0" || character > "9") {
          break;
        }
        position += 1;
      }
      if (position === fracStart) {
        fail();
      }
    }
    const marker = text[position];
    if (marker === "e" || marker === "E") {
      position += 1;
      const sign = text[position];
      if (sign === "+" || sign === "-") {
        position += 1;
      }
      const expStart = position;
      while (position < text.length) {
        const character = text[position] as string;
        if (character < "0" || character > "9") {
          break;
        }
        position += 1;
      }
      if (position === expStart) {
        fail();
      }
    }
    const value = Number(text.slice(start, position));
    if (!Number.isFinite(value)) {
      fail();
    }
    return value;
  };
  try {
    for (;;) {
      skipWhitespace();
      if (position >= text.length) {
        return tokens;
      }
      const character = text[position] as string;
      if (character === "{") {
        tokens.push({ kind: "braceOpen" });
        position += 1;
      } else if (character === "}") {
        tokens.push({ kind: "braceClose" });
        position += 1;
      } else if (character === "[") {
        tokens.push({ kind: "bracketOpen" });
        position += 1;
      } else if (character === "]") {
        tokens.push({ kind: "bracketClose" });
        position += 1;
      } else if (character === ":") {
        tokens.push({ kind: "colon" });
        position += 1;
      } else if (character === ",") {
        tokens.push({ kind: "comma" });
        position += 1;
      } else if (character === '"') {
        tokens.push({ kind: "string", value: readString() });
      } else if (character === "-" || (character >= "0" && character <= "9")) {
        tokens.push({ kind: "number", value: readNumber() });
      } else if (text.startsWith("true", position)) {
        tokens.push({ kind: "literal", value: true });
        position += 4;
      } else if (text.startsWith("false", position)) {
        tokens.push({ kind: "literal", value: false });
        position += 5;
      } else if (text.startsWith("null", position)) {
        tokens.push({ kind: "literal", value: null });
        position += 4;
      } else {
        fail();
      }
    }
  } catch (error) {
    if (error instanceof ValidationFailure || error instanceof SizeFailure) {
      throw error;
    }
    fail();
  }
}

interface ObjectFrame {
  readonly kind: "obj";
  readonly record: StrictJsonObject;
  readonly seen: Set<string>;
  state: "key" | "colon" | "value" | "comma";
  pendingKey: string | null;
  fresh: boolean;
}

interface ArrayFrame {
  readonly kind: "arr";
  readonly items: StrictJsonArray;
  state: "value" | "comma";
  empty: boolean;
}

export function parseStrictObject(text: string): StrictJsonObject {
  let tokens: Array<Token>;
  try {
    tokens = tokenize(text);
  } catch (error) {
    if (error instanceof ValidationFailure || error instanceof SizeFailure) {
      throw error;
    }
    fail();
  }
  if (tokens.length === 0 || tokens[0]?.kind !== "braceOpen") {
    fail();
  }
  const stack: Array<ObjectFrame | ArrayFrame> = [];
  let root: StrictJsonObject | null = null;
  const deliver = (value: StrictJson): void => {
    const parent = stack[stack.length - 1];
    if (parent === undefined) {
      fail();
    }
    if (parent.kind === "obj") {
      if (parent.state !== "value" || parent.pendingKey === null) {
        fail();
      }
      parent.record[parent.pendingKey] = value;
      parent.pendingKey = null;
      parent.state = "comma";
      return;
    }
    if (parent.state !== "value") {
      fail();
    }
    parent.items.push(value);
    parent.empty = false;
    parent.state = "comma";
  };
  try {
    let position = 0;
    while (position < tokens.length) {
      const token = tokens[position] as Token;
      position += 1;
      switch (token.kind) {
        case "braceOpen": {
          const parent = stack[stack.length - 1];
          if (parent !== undefined) {
            if (parent.kind === "obj" && parent.state !== "value") {
              fail();
            }
            if (parent.kind === "arr" && parent.state !== "value") {
              fail();
            }
          } else if (position !== 1) {
            fail();
          }
          stack.push({
            kind: "obj",
            record: Object.create(null) as StrictJsonObject,
            seen: new Set<string>(),
            state: "key",
            pendingKey: null,
            fresh: true,
          });
          break;
        }
        case "bracketOpen": {
          const parent = stack[stack.length - 1];
          if (parent === undefined) {
            fail();
          }
          if (parent.kind === "obj" && parent.state !== "value") {
            fail();
          }
          if (parent.kind === "arr" && parent.state !== "value") {
            fail();
          }
          stack.push({ kind: "arr", items: [], state: "value", empty: true });
          break;
        }
        case "braceClose": {
          const frame = stack.pop();
          if (frame === undefined || frame.kind !== "obj") {
            fail();
          }
          if (frame.pendingKey !== null) {
            fail();
          }
          if (frame.state === "key" && !frame.fresh) {
            fail();
          }
          if (frame.state !== "key" && frame.state !== "comma") {
            fail();
          }
          const completed: StrictJsonObject = frame.record;
          if (stack.length === 0) {
            if (root !== null || position !== tokens.length) {
              fail();
            }
            root = completed;
          } else {
            deliver(completed);
          }
          break;
        }
        case "bracketClose": {
          const frame = stack.pop();
          if (frame === undefined || frame.kind !== "arr") {
            fail();
          }
          if (frame.state === "value" && !frame.empty) {
            fail();
          }
          if (frame.state !== "value" && frame.state !== "comma") {
            fail();
          }
          deliver(frame.items);
          break;
        }
        case "colon": {
          const frame = stack[stack.length - 1];
          if (frame === undefined || frame.kind !== "obj" || frame.state !== "colon") {
            fail();
          }
          frame.state = "value";
          break;
        }
        case "comma": {
          const frame = stack[stack.length - 1];
          if (frame === undefined) {
            fail();
          }
          if (frame.kind === "obj") {
            if (frame.state !== "comma") {
              fail();
            }
            frame.state = "key";
            frame.fresh = false;
          } else {
            if (frame.state !== "comma") {
              fail();
            }
            frame.state = "value";
          }
          break;
        }
        case "string": {
          const frame = stack[stack.length - 1];
          if (frame === undefined) {
            fail();
          }
          if (frame.kind === "obj") {
            if (frame.state === "key") {
              if (frame.seen.has(token.value)) {
                fail();
              }
              frame.seen.add(token.value);
              frame.pendingKey = token.value;
              frame.state = "colon";
              frame.fresh = false;
            } else if (frame.state === "value") {
              deliver(token.value);
            } else {
              fail();
            }
          } else {
            if (frame.state !== "value") {
              fail();
            }
            deliver(token.value);
          }
          break;
        }
        case "number":
        case "literal": {
          const frame = stack[stack.length - 1];
          if (frame === undefined) {
            fail();
          }
          if (frame.kind === "obj") {
            if (frame.state !== "value") {
              fail();
            }
            deliver(token.value);
          } else {
            if (frame.state !== "value") {
              fail();
            }
            deliver(token.value);
          }
          break;
        }
      }
    }
  } catch (error) {
    if (error instanceof ValidationFailure || error instanceof SizeFailure) {
      throw error;
    }
    fail();
  }
  if (root === null || stack.length !== 0) {
    fail();
  }
  return root;
}

/** Exact key set on a strict object; values stay untouched. */
export function requireExactKeys(record: StrictJsonObject, allowed: ReadonlyArray<string>): void {
  const keys = Object.keys(record);
  if (keys.length !== allowed.length) {
    fail();
  }
  for (const key of keys) {
    if (!allowed.includes(key)) {
      fail();
    }
  }
}

function requireUuidField(record: StrictJsonObject, key: string): string {
  const value = record[key];
  if (!isCanonicalUuid(value)) {
    fail();
  }
  return value;
}

function requireNonemptyString(record: StrictJsonObject, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    fail();
  }
  return value;
}

// ---------------------------------------------------------------------------
// Frozen request-shape checks. Each returns extracted cross-check values;
// the ORIGINAL captured bytes (never a scratch object) are what get sent.
// ---------------------------------------------------------------------------

export type ControlShape =
  | { readonly kind: "challenge" }
  | { readonly kind: "exchange"; readonly challengeId: string; readonly idToken: string }
  | { readonly kind: "refresh"; readonly refreshToken: string }
  | { readonly kind: "logout"; readonly refreshToken: string }
  | {
      readonly kind: "accountStatus";
      readonly accountId: string;
      readonly challengeId: string;
      readonly idToken: string;
    };

export function checkChallengeShape(record: StrictJsonObject): void {
  if (Object.keys(record).length === 0) {
    return;
  }
  requireExactKeys(record, ["purpose"]);
  const purpose = record["purpose"];
  if (purpose !== "signIn" && purpose !== "accountStatus") {
    fail();
  }
}

export function checkExchangeShape(record: StrictJsonObject): ControlShape {
  requireExactKeys(record, ["challengeId", "idToken"]);
  return {
    kind: "exchange",
    challengeId: requireUuidField(record, "challengeId"),
    idToken: requireNonemptyString(record, "idToken"),
  };
}

export function checkRefreshShape(
  record: StrictJsonObject,
  kind: "refresh" | "logout",
): ControlShape {
  requireExactKeys(record, ["refreshToken"]);
  const token = requireNonemptyString(record, "refreshToken");
  return kind === "refresh"
    ? { kind: "refresh", refreshToken: token }
    : { kind: "logout", refreshToken: token };
}

export function checkAccountStatusShape(record: StrictJsonObject): ControlShape {
  requireExactKeys(record, ["accountId", "challengeId", "idToken"]);
  return {
    kind: "accountStatus",
    accountId: requireUuidField(record, "accountId"),
    challengeId: requireUuidField(record, "challengeId"),
    idToken: requireNonemptyString(record, "idToken"),
  };
}

export function checkDraftShape(record: StrictJsonObject, expectedRoutineId: string): void {
  requireExactKeys(record, ["id"]);
  const id = requireUuidField(record, "id");
  if (id !== expectedRoutineId) {
    fail();
  }
}

export function checkSaveShape(record: StrictJsonObject): void {
  requireExactKeys(record, ["name"]);
  requireNonemptyString(record, "name");
}

export function checkPopulateShape(record: StrictJsonObject, routineId: string): void {
  requireExactKeys(record, ["id", "name", "isDraft", "exercises"]);
  const id = requireUuidField(record, "id");
  if (id !== routineId) {
    fail();
  }
  if (typeof record["name"] !== "string") {
    fail();
  }
  if (record["isDraft"] !== true) {
    fail();
  }
  if (!Array.isArray(record["exercises"])) {
    fail();
  }
}

/**
 * Error envelope: strict object with own nonempty errorCode string.
 * Backend message (absent/string/null per OpenAPI 1.0.0) is type-checked
 * but never interpreted: other types are malformed, while content never
 * affects the safety of an otherwise-safe code.
 */
export function readErrorCode(record: StrictJsonObject): string {
  const code = record["errorCode"];
  if (typeof code !== "string" || code.length === 0) {
    fail();
  }
  const message = record["message"];
  if (message !== undefined && message !== null && typeof message !== "string") {
    fail();
  }
  return code;
}
