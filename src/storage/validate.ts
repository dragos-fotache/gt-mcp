/**
 * T04 protected storage — pure argument validation.
 *
 * Every public and IPC boundary validates exact own-data shapes before any
 * IO: no unknown fields, no coercion, no accessor invocation, no cycles.
 * Validation captures all own property descriptors first (Reflect.ownKeys
 * plus getOwnPropertyDescriptor never invoke user getters/setters) and
 * then reads only the captured values, so exotic inputs cannot execute
 * accessor/iterator/trap code through validation. Symbols, non-enumerable
 * properties, accessors, foreign prototypes, and cycles are rejected;
 * native exceptions from hostile inputs are mapped to invalid_argument,
 * never propagated. Byte views are validated (real Uint8Array/Buffer only,
 * no SharedArrayBuffer backing, no detached views) within the operational
 * plaintext budget and copied before queuing.
 */

import path from "node:path";
import { URL } from "node:url";
import { StorageError } from "./errors.js";
import type { OpenRequest, ProvisionRequest, StorageBinding } from "./types.js";

export const MAX_STORE_BYTES = 268435456 as const;
export const DIGEST_KEY_VERSION = "gymtracka-digest-v1" as const;
export const MIN_TIMEOUT_MS = 1 as const;
export const MAX_TIMEOUT_MS = 15000 as const;
export const DEFAULT_TIMEOUT_MS = 5000 as const;

const CANONICAL_UUID_RE: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// D-Bus server GUID: 32 lowercase hexadecimal characters per the address
// specification. Uppercase, truncated, or padded guids are not canonical.
const BUS_GUID_RE: RegExp = /^[0-9a-f]{32}$/;
// Single Unix filesystem address with an optional guid; no tcp, abstract,
// unixexec, autostart, or multi-address fallback.
const BUS_ADDRESS_RE: RegExp = /^unix:(path|socket)=([^,;]+?)(?:,guid=([0-9a-fA-F]+))?$/;

function fail(): never {
  throw new StorageError("invalid_argument");
}

export type CapturedEntries = Array<[string, unknown]>;

/**
 * Capture every own property without invoking user code. Exotic-input
 * traps may run during capture; any native exception they raise maps to
 * invalid_argument. Callers must read only captured values afterwards.
 */
export function captureEntries(value: unknown): CapturedEntries {
  try {
    if (typeof value !== "object" || value === null) {
      fail();
    }
    const proto: unknown = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      fail();
    }
    const entries: CapturedEntries = [];
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        fail();
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
        fail();
      }
      entries.push([key, descriptor.value]);
    }
    return entries;
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    fail();
  }
}

function lookup(entries: CapturedEntries, key: string): unknown {
  for (const [name, entryValue] of entries) {
    if (name === key) {
      return entryValue;
    }
  }
  fail();
}

export function assertExactKeys(entries: CapturedEntries, allowed: readonly string[]): void {
  for (const [key] of entries) {
    if (!allowed.includes(key)) {
      fail();
    }
  }
}

/**
 * Capture and gate an exact-shape boundary value in one step. All
 * subsequent reads must use requiredField/optionalField on the captured
 * entries, never the original object.
 */
export function captureShape(value: unknown, allowed: readonly string[]): CapturedEntries {
  const captured: CapturedEntries = captureEntries(value);
  assertExactKeys(captured, allowed);
  return captured;
}

export function requiredField(entries: CapturedEntries, key: string): unknown {
  for (const [name, entryValue] of entries) {
    if (name === key) {
      return entryValue;
    }
  }
  fail();
}

export function optionalField(entries: CapturedEntries, key: string): unknown {
  for (const [name, entryValue] of entries) {
    if (name === key) {
      return entryValue;
    }
  }
  return undefined;
}

export function assertUuid(value: unknown): string {
  if (typeof value !== "string" || !CANONICAL_UUID_RE.test(value)) {
    fail();
  }
  return value;
}

/**
 * Canonical HTTPS origin via an actual URL parser. The input must already
 * be in exact canonical form: https scheme, no credentials, no path beyond
 * root, no query/fragment, lowercase host, no explicit default port.
 * Bracketed IPv6 literals are accepted; invalid hosts, whitespace, ports,
 * userinfo, and noncanonical spellings are rejected.
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

export function assertOrigin(value: unknown): string {
  if (typeof value !== "string" || !isCanonicalOriginText(value)) {
    fail();
  }
  return value;
}

export function assertGeneration(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    fail();
  }
  return value;
}

export function assertBinding(value: unknown): StorageBinding {
  const entries: CapturedEntries = captureEntries(value);
  assertExactKeys(entries, ["origin", "accountUuid", "sessionGeneration", "profileGenerationId"]);
  const origin: string = assertOrigin(lookup(entries, "origin"));
  const accountRaw: unknown = lookup(entries, "accountUuid");
  const accountUuid: string | null = accountRaw === null ? null : assertUuid(accountRaw);
  const sessionGeneration: number = assertGeneration(lookup(entries, "sessionGeneration"));
  const profileGenerationId: string = assertUuid(lookup(entries, "profileGenerationId"));
  return Object.freeze({
    origin,
    accountUuid,
    sessionGeneration,
    profileGenerationId,
  });
}

function isContained(container: string, candidate: string): boolean {
  if (container === "/") {
    return candidate.startsWith("/") && candidate !== "/";
  }
  const relative: string = path.relative(container, candidate);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

/**
 * Resolve and shape-check roots. Returns canonical absolute paths and
 * rejects identity/overlap (including the filesystem-root edge case, which
 * naive separator concatenation mishandles). Symlink and safety checks
 * happen against the filesystem (fsutil) before any protected IO.
 */
export function assertLocationRoots(
  profileRoot: unknown,
  anchorRoot: unknown,
): { profileRoot: string; anchorRoot: string } {
  if (typeof profileRoot !== "string" || typeof anchorRoot !== "string") {
    fail();
  }
  if (
    profileRoot.includes("\0") ||
    anchorRoot.includes("\0") ||
    !path.isAbsolute(profileRoot) ||
    !path.isAbsolute(anchorRoot)
  ) {
    fail();
  }
  const profile: string = path.resolve(profileRoot);
  const anchor: string = path.resolve(anchorRoot);
  if (profile === anchor || isContained(anchor, profile) || isContained(profile, anchor)) {
    fail();
  }
  return { profileRoot: profile, anchorRoot: anchor };
}

export function assertBusAddress(value: unknown): {
  socketPath: string;
  address: string;
} {
  if (typeof value !== "string" || value.includes("\0")) {
    fail();
  }
  const match: RegExpMatchArray | null = BUS_ADDRESS_RE.exec(value);
  if (match === null || match[2] === undefined) {
    fail();
  }
  const socketPath: string = match[2];
  if (!path.isAbsolute(socketPath)) {
    fail();
  }
  const guid: string | undefined = match[3];
  if (guid !== undefined && !BUS_GUID_RE.test(guid)) {
    fail();
  }
  return { socketPath, address: value };
}

export function assertTimeoutMs(value: unknown): number {
  if (value === undefined) {
    return DEFAULT_TIMEOUT_MS;
  }
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < MIN_TIMEOUT_MS ||
    value > MAX_TIMEOUT_MS
  ) {
    fail();
  }
  return value;
}

function isDetachedView(view: Uint8Array): boolean {
  try {
    Uint8Array.prototype.slice.call(view, 0, 0);
    return false;
  } catch {
    return true;
  }
}

/**
 * Validate a byte view within the operational plaintext budget. All
 * metadata access is guarded: exotic views must not execute user traps or
 * leak native exceptions. Over-budget material reports resource_exhausted
 * before any copy/IPC/persistence.
 */
export function assertByteView(value: unknown, allowEmpty: boolean): Uint8Array {
  try {
    if (!(value instanceof Uint8Array)) {
      fail();
    }
    const view: Uint8Array = value;
    if (view.buffer instanceof SharedArrayBuffer || isDetachedView(view)) {
      fail();
    }
    if (view.byteLength > MAX_STORE_BYTES) {
      throw new StorageError("resource_exhausted");
    }
    if (!allowEmpty && view.byteLength === 0) {
      fail();
    }
    return view;
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    fail();
  }
}

export function copyBytes(view: Uint8Array): Uint8Array {
  try {
    return new Uint8Array(view);
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError("invalid_argument");
  }
}

export function assertProvisionRequest(value: unknown): ProvisionRequest {
  const entries: CapturedEntries = captureEntries(value);
  assertExactKeys(entries, [
    "profileRoot",
    "anchorRoot",
    "origin",
    "profileGenerationId",
    "secretServiceBusAddress",
    "timeoutMs",
  ]);
  const roots: { profileRoot: string; anchorRoot: string } = assertLocationRoots(
    lookup(entries, "profileRoot"),
    lookup(entries, "anchorRoot"),
  );
  const origin: string = assertOrigin(lookup(entries, "origin"));
  const profileGenerationId: string = assertUuid(lookup(entries, "profileGenerationId"));
  const access: { socketPath: string; address: string } = assertBusAddress(
    lookup(entries, "secretServiceBusAddress"),
  );
  const timeoutMs: number = assertTimeoutMs(optionalField(entries, "timeoutMs"));
  return {
    profileRoot: roots.profileRoot,
    anchorRoot: roots.anchorRoot,
    origin,
    profileGenerationId,
    secretServiceBusAddress: access.address,
    timeoutMs,
  };
}

export function assertOpenRequest(value: unknown): OpenRequest {
  const entries: CapturedEntries = captureEntries(value);
  assertExactKeys(entries, [
    "profileRoot",
    "anchorRoot",
    "expectedBinding",
    "secretServiceBusAddress",
    "timeoutMs",
  ]);
  const roots: { profileRoot: string; anchorRoot: string } = assertLocationRoots(
    lookup(entries, "profileRoot"),
    lookup(entries, "anchorRoot"),
  );
  const expectedBinding: StorageBinding = assertBinding(lookup(entries, "expectedBinding"));
  const access: { socketPath: string; address: string } = assertBusAddress(
    lookup(entries, "secretServiceBusAddress"),
  );
  const timeoutMs: number = assertTimeoutMs(optionalField(entries, "timeoutMs"));
  return {
    profileRoot: roots.profileRoot,
    anchorRoot: roots.anchorRoot,
    expectedBinding,
    secretServiceBusAddress: access.address,
    timeoutMs,
  };
}

/**
 * Two-phase update validation: all fields are type- and budget-checked
 * before any byte is copied, so over-budget material never reaches
 * copy/IPC/persistence.
 */
export function assertStoreUpdate(value: unknown): {
  vaultBytes?: Uint8Array;
  operationBytes?: Uint8Array;
} {
  const entries: CapturedEntries = captureEntries(value);
  assertExactKeys(entries, ["vaultBytes", "operationBytes"]);
  let vault: Uint8Array | undefined;
  let ops: Uint8Array | undefined;
  let present: boolean = false;
  for (const [key, entryValue] of entries) {
    if (key === "vaultBytes" || key === "operationBytes") {
      present = true;
      const checked: Uint8Array = assertByteView(entryValue, true);
      if (key === "vaultBytes") {
        vault = checked;
      } else {
        ops = checked;
      }
    }
  }
  if (!present) {
    fail();
  }
  const out: { vaultBytes?: Uint8Array; operationBytes?: Uint8Array } = {};
  if (vault !== undefined) {
    out.vaultBytes = copyBytes(vault);
  }
  if (ops !== undefined) {
    out.operationBytes = copyBytes(ops);
  }
  return out;
}
