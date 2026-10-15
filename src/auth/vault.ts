/**
 * T06-S1 private vault records — versioned credential state inside the
 * T04-encrypted vault. Plaintext here is UTF-8 duplicate-key-free JSON and
 * is never wire JSON or model output. T04 remains the encryption and
 * atomicity owner; this module only shapes the bytes it carries.
 */

import { SessionError } from "./errors.js";
import {
  assertBinding,
  decodeUtf8Fatal,
  expiryToMs,
  isCanonicalUuid,
  isHeaderSafeToken,
  isOpaqueRefreshToken,
  parseStrictGrantJson,
  parseStrictJson,
} from "./validate.js";
import type { ParsedBinding } from "./validate.js";

export interface VaultGrantRecord {
  readonly accountUuid: string;
  readonly accessToken: string;
  readonly accessExpiresAt: string;
  readonly accessExpiresMs: number;
  readonly refreshToken: string;
  readonly refreshExpiresAt: string;
  readonly refreshExpiresMs: number;
}

export interface DecodedVault {
  /** Null grant means no usable credentials (uninitialized or signed out). */
  readonly grant: VaultGrantRecord | null;
}

export interface ServiceGrant {
  readonly accountUuid: string;
  readonly accessToken: string;
  readonly accessExpiresAt: string;
  readonly accessExpiresMs: number;
  readonly refreshToken: string;
  readonly refreshExpiresAt: string;
  readonly refreshExpiresMs: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function ownKeys(value: object): Array<string> {
  const out: Array<string> = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      throw new SessionError("state_corrupt");
    }
    const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable) {
      throw new SessionError("state_corrupt");
    }
    out.push(key);
  }
  return out;
}

function readField(value: Record<string, unknown>, key: string): unknown {
  const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined) {
    throw new SessionError("state_corrupt");
  }
  if (typeof descriptor.get === "function" || typeof descriptor.set === "function") {
    throw new SessionError("state_corrupt");
  }
  return descriptor.value;
}

function decodeStoredGrant(value: unknown, binding: ParsedBinding): VaultGrantRecord {
  if (!isPlainObject(value)) {
    throw new SessionError("state_corrupt");
  }
  const keys: Array<string> = ownKeys(value);
  const expected: Array<string> = [
    "accountUuid",
    "accessToken",
    "accessExpiresAt",
    "refreshToken",
    "refreshExpiresAt",
  ];
  if (keys.length !== expected.length) {
    throw new SessionError("state_corrupt");
  }
  for (const name of expected) {
    if (!keys.includes(name)) {
      throw new SessionError("state_corrupt");
    }
  }
  const accountUuid: unknown = readField(value, "accountUuid");
  const accessToken: unknown = readField(value, "accessToken");
  const accessExpiresAt: unknown = readField(value, "accessExpiresAt");
  const refreshToken: unknown = readField(value, "refreshToken");
  const refreshExpiresAt: unknown = readField(value, "refreshExpiresAt");
  if (!isCanonicalUuid(accountUuid)) {
    throw new SessionError("state_corrupt");
  }
  if (!isHeaderSafeToken(accessToken)) {
    throw new SessionError("state_corrupt");
  }
  const accessMs: number | null = expiryToMs(accessExpiresAt);
  const refreshMs: number | null = expiryToMs(refreshExpiresAt);
  if (accessMs === null || refreshMs === null) {
    throw new SessionError("state_corrupt");
  }
  if (!isOpaqueRefreshToken(refreshToken)) {
    throw new SessionError("state_corrupt");
  }
  if (binding.accountUuid === null || accountUuid !== binding.accountUuid) {
    throw new SessionError("state_corrupt");
  }
  return Object.freeze({
    accountUuid,
    accessToken,
    accessExpiresAt: accessExpiresAt as string,
    accessExpiresMs: accessMs,
    refreshToken: refreshToken as string,
    refreshExpiresAt: refreshExpiresAt as string,
    refreshExpiresMs: refreshMs,
  });
}

/**
 * Decode vault bytes against the owner's live binding. Zero-length input is
 * the accepted uninitialized/cleared state (no credentials). Any other
 * malformed, mismatched, or unknown content fails closed; unsupported
 * integer versions report state_version_unsupported without mutation.
 */
export function decodeVaultBytes(bytes: Uint8Array, owner: ParsedBinding): DecodedVault {
  if (bytes.byteLength === 0) {
    return { grant: null };
  }
  const text: string = decodeUtf8Fatal(bytes, false);
  if (text.startsWith("﻿")) {
    throw new SessionError("state_corrupt");
  }
  const root: unknown = parseStrictJson(text);
  if (!isPlainObject(root)) {
    throw new SessionError("state_corrupt");
  }
  // Version is decided before any version1-specific shape check so a
  // syntactically valid future-version object (which may carry new fields)
  // reports state_version_unsupported instead of state_corrupt.
  const version: unknown = readField(root, "version");
  if (typeof version !== "number" || !Number.isSafeInteger(version)) {
    throw new SessionError("state_corrupt");
  }
  if (version !== 1) {
    throw new SessionError("state_version_unsupported");
  }
  const keys: Array<string> = ownKeys(root);
  if (keys.length !== 3 || !keys.includes("version") || !keys.includes("binding")) {
    throw new SessionError("state_corrupt");
  }
  if (!keys.includes("grant")) {
    throw new SessionError("state_corrupt");
  }
  let stored: ParsedBinding;
  try {
    stored = assertBinding(readField(root, "binding"));
  } catch (error) {
    if (error instanceof SessionError && error.code === "invalid_arguments") {
      throw new SessionError("state_corrupt");
    }
    throw error;
  }
  if (
    stored.origin !== owner.origin ||
    stored.accountUuid !== owner.accountUuid ||
    stored.sessionGeneration !== owner.sessionGeneration ||
    stored.profileGenerationId !== owner.profileGenerationId
  ) {
    throw new SessionError("state_corrupt");
  }
  const grantRaw: unknown = readField(root, "grant");
  if (grantRaw === null) {
    return { grant: null };
  }
  return { grant: decodeStoredGrant(grantRaw, stored) };
}

/**
 * T06-S2 private version-2 refresh records — durable exact predecessor
 * and request identity for a single prepared rotation, plus the atomic
 * same-account successor grant. Plaintext remains strict UTF-8
 * duplicate-key-free JSON inside the T04-encrypted vault. T04 still owns
 * encryption/atomicity; this module only shapes the bytes it carries.
 *
 * S1 behavior above is unchanged: decodeVaultBytes still refuses version2
 * with state_version_unsupported, and encodeVaultBytes still writes
 * version1. Only fresh-rotation preparation explicitly upgrades version1
 * to version2 in the same atomic commit that installs pending evidence.
 */

export interface VaultPendingRefresh {
  readonly predecessor: VaultGrantRecord;
  readonly refreshToken: string;
  readonly bodyBase64: string;
  readonly authKey: string;
}

export interface DecodedRefreshVault {
  readonly grant: VaultGrantRecord | null;
  readonly pendingRefresh: VaultPendingRefresh | null;
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

/** Re-expose stored-grant validation for version-2 records (same S1 rules). */
export function assertStoredGrant(value: unknown, binding: ParsedBinding): VaultGrantRecord {
  return decodeStoredGrant(value, binding);
}

/**
 * Build the exact refresh request bytes ONCE: UTF-8
 * JSON.stringify({refreshToken}) with that single property, no
 * whitespace/BOM. The same bytes are persisted as bodyBase64, never a
 * reconstructed object.
 */
export function buildRefreshRequestBytes(refreshToken: string): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({ refreshToken }));
}

/** Canonical padded RFC4648 base64 of exact bytes. */
export function encodeBodyBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

/**
 * Decode canonical padded RFC4648 base64, rejecting non-canonical
 * spellings (wrong charset, misplaced padding, non-round-tripping text).
 */
export function decodeCanonicalBase64(value: unknown): Uint8Array {
  if (typeof value !== "string" || value.length === 0 || value.length % 4 !== 0) {
    throw new SessionError("state_corrupt");
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new SessionError("state_corrupt");
  }
  const padIndex: number = value.indexOf("=");
  if (padIndex >= 0 && value.slice(padIndex) !== "=" && value.slice(padIndex) !== "==") {
    throw new SessionError("state_corrupt");
  }
  let raw: Buffer;
  try {
    raw = Buffer.from(value, "base64");
  } catch {
    throw new SessionError("state_corrupt");
  }
  if (raw.toString("base64") !== value) {
    throw new SessionError("state_corrupt");
  }
  return new Uint8Array(raw);
}

/**
 * Validate pending refresh evidence against its installed grant: exact
 * fields, predecessor equal to the grant field-for-field (including
 * original expiry spellings), token identical to the predecessor token,
 * canonical base64 body that is strict UTF-8 single-field JSON byte-equal
 * to the settled serialization for that token, canonical auth UUID.
 * Pending is allowed only with a nonnull grant.
 */
export function assertPendingRefresh(
  value: unknown,
  grant: VaultGrantRecord | null,
  binding: ParsedBinding,
): VaultPendingRefresh {
  if (grant === null) {
    throw new SessionError("state_corrupt");
  }
  if (!isPlainObject(value)) {
    throw new SessionError("state_corrupt");
  }
  const record: Record<string, unknown> = value;
  const keys: Array<string> = ownKeys(record);
  const expected: Array<string> = ["predecessor", "refreshToken", "bodyBase64", "authKey"];
  if (keys.length !== expected.length) {
    throw new SessionError("state_corrupt");
  }
  for (const name of expected) {
    if (!keys.includes(name)) {
      throw new SessionError("state_corrupt");
    }
  }
  const predecessor: VaultGrantRecord = decodeStoredGrant(
    readField(record, "predecessor"),
    binding,
  );
  if (
    predecessor.accountUuid !== grant.accountUuid ||
    predecessor.accessToken !== grant.accessToken ||
    predecessor.accessExpiresAt !== grant.accessExpiresAt ||
    predecessor.refreshToken !== grant.refreshToken ||
    predecessor.refreshExpiresAt !== grant.refreshExpiresAt
  ) {
    throw new SessionError("state_corrupt");
  }
  const refreshToken: unknown = readField(record, "refreshToken");
  if (!isOpaqueRefreshToken(refreshToken) || refreshToken !== predecessor.refreshToken) {
    throw new SessionError("state_corrupt");
  }
  const bodyBytes: Uint8Array = decodeCanonicalBase64(readField(record, "bodyBase64"));
  const bodyText: string = decodeUtf8Fatal(bodyBytes, false);
  const body: unknown = parseStrictJson(bodyText);
  if (!isPlainObject(body)) {
    throw new SessionError("state_corrupt");
  }
  const bodyKeys: Array<string> = ownKeys(body);
  if (bodyKeys.length !== 1 || bodyKeys[0] !== "refreshToken") {
    throw new SessionError("state_corrupt");
  }
  if (readField(body, "refreshToken") !== refreshToken) {
    throw new SessionError("state_corrupt");
  }
  if (!bytesEqual(bodyBytes, buildRefreshRequestBytes(refreshToken))) {
    throw new SessionError("state_corrupt");
  }
  const authKey: unknown = readField(record, "authKey");
  if (!isCanonicalUuid(authKey)) {
    throw new SessionError("state_corrupt");
  }
  return Object.freeze({
    predecessor,
    refreshToken,
    bodyBase64: readField(record, "bodyBase64") as string,
    authKey,
  });
}

/** Encode a version-2 vault record with fixed key order (duplicate-free by construction). */
export function encodeRefreshVaultBytes(
  binding: ParsedBinding,
  grant: VaultGrantRecord | null,
  pending: VaultPendingRefresh | null,
): Uint8Array {
  const record: {
    version: number;
    binding: ParsedBinding;
    grant: unknown;
    pendingRefresh: unknown;
  } = {
    version: 2,
    binding: {
      origin: binding.origin,
      accountUuid: binding.accountUuid,
      sessionGeneration: binding.sessionGeneration,
      profileGenerationId: binding.profileGenerationId,
    },
    grant:
      grant === null
        ? null
        : {
            accountUuid: grant.accountUuid,
            accessToken: grant.accessToken,
            accessExpiresAt: grant.accessExpiresAt,
            refreshToken: grant.refreshToken,
            refreshExpiresAt: grant.refreshExpiresAt,
          },
    pendingRefresh:
      pending === null
        ? null
        : {
            predecessor: {
              accountUuid: pending.predecessor.accountUuid,
              accessToken: pending.predecessor.accessToken,
              accessExpiresAt: pending.predecessor.accessExpiresAt,
              refreshToken: pending.predecessor.refreshToken,
              refreshExpiresAt: pending.predecessor.refreshExpiresAt,
            },
            refreshToken: pending.refreshToken,
            bodyBase64: pending.bodyBase64,
            authKey: pending.authKey,
          },
  };
  return new TextEncoder().encode(JSON.stringify(record));
}

/**
 * Decode vault bytes against the owner's live binding for refresh use.
 * Accepts zero-length cleared state, validated S1 version1 (read-only,
 * pending null), or version2. Unknown integer versions report
 * state_version_unsupported before version-specific validation;
 * malformed state/binding/fields report state_corrupt. Never writes,
 * migrates, generates keys, or dispatches: pending is returned as
 * blocked recovery state for the caller to refuse.
 */
export function decodeRefreshVaultBytes(
  bytes: Uint8Array,
  owner: ParsedBinding,
): DecodedRefreshVault {
  if (bytes.byteLength === 0) {
    return { grant: null, pendingRefresh: null };
  }
  const text: string = decodeUtf8Fatal(bytes, false);
  if (text.startsWith("﻿")) {
    throw new SessionError("state_corrupt");
  }
  const root: unknown = parseStrictJson(text);
  if (!isPlainObject(root)) {
    throw new SessionError("state_corrupt");
  }
  const version: unknown = readField(root, "version");
  if (typeof version !== "number" || !Number.isSafeInteger(version)) {
    throw new SessionError("state_corrupt");
  }
  if (version !== 1 && version !== 2) {
    throw new SessionError("state_version_unsupported");
  }
  if (version === 1) {
    return { grant: decodeVaultBytes(bytes, owner).grant, pendingRefresh: null };
  }
  const keys: Array<string> = ownKeys(root);
  if (
    keys.length !== 4 ||
    !keys.includes("version") ||
    !keys.includes("binding") ||
    !keys.includes("grant") ||
    !keys.includes("pendingRefresh")
  ) {
    throw new SessionError("state_corrupt");
  }
  let stored: ParsedBinding;
  try {
    stored = assertBinding(readField(root, "binding"));
  } catch (error) {
    if (error instanceof SessionError && error.code === "invalid_arguments") {
      throw new SessionError("state_corrupt");
    }
    throw error;
  }
  if (
    stored.origin !== owner.origin ||
    stored.accountUuid !== owner.accountUuid ||
    stored.sessionGeneration !== owner.sessionGeneration ||
    stored.profileGenerationId !== owner.profileGenerationId
  ) {
    throw new SessionError("state_corrupt");
  }
  const grantRaw: unknown = readField(root, "grant");
  const grant: VaultGrantRecord | null =
    grantRaw === null ? null : decodeStoredGrant(grantRaw, stored);
  const pendingRaw: unknown = readField(root, "pendingRefresh");
  const pendingRefresh: VaultPendingRefresh | null =
    pendingRaw === null ? null : assertPendingRefresh(pendingRaw, grant, stored);
  return { grant, pendingRefresh };
}
export function encodeVaultBytes(
  binding: ParsedBinding,
  grant: VaultGrantRecord | null,
): Uint8Array {
  const record: {
    version: number;
    binding: ParsedBinding;
    grant: unknown;
  } = {
    version: 1,
    binding: {
      origin: binding.origin,
      accountUuid: binding.accountUuid,
      sessionGeneration: binding.sessionGeneration,
      profileGenerationId: binding.profileGenerationId,
    },
    grant:
      grant === null
        ? null
        : {
            accountUuid: grant.accountUuid,
            accessToken: grant.accessToken,
            accessExpiresAt: grant.accessExpiresAt,
            refreshToken: grant.refreshToken,
            refreshExpiresAt: grant.refreshExpiresAt,
          },
  };
  return new TextEncoder().encode(JSON.stringify(record));
}

function readGrantField(
  value: Record<string, unknown>,
  key: string,
): { present: boolean; value: unknown } {
  const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, key);
  if (descriptor === undefined) {
    return { present: false, value: undefined };
  }
  if (typeof descriptor.get === "function" || typeof descriptor.set === "function") {
    throw new SessionError("invalid_grant");
  }
  if (!descriptor.enumerable) {
    throw new SessionError("invalid_grant");
  }
  return { present: true, value: descriptor.value };
}

/**
 * T06-S5 retained superseded evidence — exact predecessor binding, grant,
 * and pending record fenced from all credential use. Original strings are
 * retained losslessly; each entry is validated against THAT entry's binding.
 */
export interface VaultSupersededEntry {
  readonly binding: ParsedBinding;
  readonly grant: VaultGrantRecord;
  readonly pendingRefresh: VaultPendingRefresh | null;
}

export interface DecodedLifecycleVault {
  readonly grant: VaultGrantRecord | null;
  readonly pendingRefresh: VaultPendingRefresh | null;
  readonly superseded: VaultSupersededEntry[];
}

function decodeSupersededEntry(value: unknown, current: ParsedBinding): VaultSupersededEntry {
  if (!isPlainObject(value)) {
    throw new SessionError("state_corrupt");
  }
  const record: Record<string, unknown> = value;
  const keys: Array<string> = ownKeys(record);
  if (
    keys.length !== 3 ||
    !keys.includes("binding") ||
    !keys.includes("grant") ||
    !keys.includes("pendingRefresh")
  ) {
    throw new SessionError("state_corrupt");
  }
  let entryBinding: ParsedBinding;
  try {
    entryBinding = assertBinding(readField(record, "binding"));
  } catch (error) {
    if (error instanceof SessionError && error.code === "invalid_arguments") {
      throw new SessionError("state_corrupt");
    }
    throw error;
  }
  if (
    entryBinding.origin !== current.origin ||
    entryBinding.accountUuid !== current.accountUuid ||
    entryBinding.profileGenerationId !== current.profileGenerationId
  ) {
    throw new SessionError("state_corrupt");
  }
  if (entryBinding.sessionGeneration >= current.sessionGeneration) {
    throw new SessionError("state_corrupt");
  }
  const grantRaw: unknown = readField(record, "grant");
  if (grantRaw === null) {
    throw new SessionError("state_corrupt");
  }
  const grant: VaultGrantRecord = decodeStoredGrant(grantRaw, entryBinding);
  const pendingRaw: unknown = readField(record, "pendingRefresh");
  const pendingRefresh: VaultPendingRefresh | null =
    pendingRaw === null ? null : assertPendingRefresh(pendingRaw, grant, entryBinding);
  return Object.freeze({
    binding: entryBinding,
    grant,
    pendingRefresh,
  });
}

/** Encode a version-3 vault record with fixed key order (duplicate-free by construction). */
export function encodeLifecycleVaultBytes(
  binding: ParsedBinding,
  grant: VaultGrantRecord | null,
  pending: VaultPendingRefresh | null,
  superseded: ReadonlyArray<VaultSupersededEntry>,
): Uint8Array {
  const record: {
    version: number;
    binding: ParsedBinding;
    grant: unknown;
    pendingRefresh: unknown;
    superseded: unknown;
  } = {
    version: 3,
    binding: {
      origin: binding.origin,
      accountUuid: binding.accountUuid,
      sessionGeneration: binding.sessionGeneration,
      profileGenerationId: binding.profileGenerationId,
    },
    grant:
      grant === null
        ? null
        : {
            accountUuid: grant.accountUuid,
            accessToken: grant.accessToken,
            accessExpiresAt: grant.accessExpiresAt,
            refreshToken: grant.refreshToken,
            refreshExpiresAt: grant.refreshExpiresAt,
          },
    pendingRefresh:
      pending === null
        ? null
        : {
            predecessor: {
              accountUuid: pending.predecessor.accountUuid,
              accessToken: pending.predecessor.accessToken,
              accessExpiresAt: pending.predecessor.accessExpiresAt,
              refreshToken: pending.predecessor.refreshToken,
              refreshExpiresAt: pending.predecessor.refreshExpiresAt,
            },
            refreshToken: pending.refreshToken,
            bodyBase64: pending.bodyBase64,
            authKey: pending.authKey,
          },
    superseded: superseded.map((entry) => ({
      binding: {
        origin: entry.binding.origin,
        accountUuid: entry.binding.accountUuid,
        sessionGeneration: entry.binding.sessionGeneration,
        profileGenerationId: entry.binding.profileGenerationId,
      },
      grant: {
        accountUuid: entry.grant.accountUuid,
        accessToken: entry.grant.accessToken,
        accessExpiresAt: entry.grant.accessExpiresAt,
        refreshToken: entry.grant.refreshToken,
        refreshExpiresAt: entry.grant.refreshExpiresAt,
      },
      pendingRefresh:
        entry.pendingRefresh === null
          ? null
          : {
              predecessor: {
                accountUuid: entry.pendingRefresh.predecessor.accountUuid,
                accessToken: entry.pendingRefresh.predecessor.accessToken,
                accessExpiresAt: entry.pendingRefresh.predecessor.accessExpiresAt,
                refreshToken: entry.pendingRefresh.predecessor.refreshToken,
                refreshExpiresAt: entry.pendingRefresh.predecessor.refreshExpiresAt,
              },
              refreshToken: entry.pendingRefresh.refreshToken,
              bodyBase64: entry.pendingRefresh.bodyBase64,
              authKey: entry.pendingRefresh.authKey,
            },
    })),
  };
  return new TextEncoder().encode(JSON.stringify(record));
}

/**
 * Decode vault bytes against the owner's live binding for lifecycle use.
 * Accepts zero-length cleared state, validated S1 version1 (pending null,
 * no superseded), validated S2 version2 (no superseded), or strict
 * version3 with permanently fenced superseded evidence. Unknown integer
 * versions report state_version_unsupported before version-specific shape
 * checks; malformed state/binding/fields report state_corrupt. Never
 * writes, migrates, generates keys, or dispatches. Retained entries keep
 * the same origin/account/profile as current with strictly older and
 * strictly increasing generations; each grant/pending is validated against
 * THAT entry's binding with original strings retained losslessly.
 */
export function decodeLifecycleVaultBytes(
  bytes: Uint8Array,
  owner: ParsedBinding,
): DecodedLifecycleVault {
  if (bytes.byteLength === 0) {
    return { grant: null, pendingRefresh: null, superseded: [] };
  }
  const text: string = decodeUtf8Fatal(bytes, false);
  if (text.startsWith("﻿")) {
    throw new SessionError("state_corrupt");
  }
  const root: unknown = parseStrictJson(text);
  if (!isPlainObject(root)) {
    throw new SessionError("state_corrupt");
  }
  const version: unknown = readField(root, "version");
  if (typeof version !== "number" || !Number.isSafeInteger(version)) {
    throw new SessionError("state_corrupt");
  }
  if (version !== 1 && version !== 2 && version !== 3) {
    throw new SessionError("state_version_unsupported");
  }
  if (version === 1) {
    const grant = decodeVaultBytes(bytes, owner).grant;
    return { grant, pendingRefresh: null, superseded: [] };
  }
  if (version === 2) {
    const decoded = decodeRefreshVaultBytes(bytes, owner);
    return { grant: decoded.grant, pendingRefresh: decoded.pendingRefresh, superseded: [] };
  }
  const keys: Array<string> = ownKeys(root);
  if (
    keys.length !== 5 ||
    !keys.includes("version") ||
    !keys.includes("binding") ||
    !keys.includes("grant") ||
    !keys.includes("pendingRefresh") ||
    !keys.includes("superseded")
  ) {
    throw new SessionError("state_corrupt");
  }
  let stored: ParsedBinding;
  try {
    stored = assertBinding(readField(root, "binding"));
  } catch (error) {
    if (error instanceof SessionError && error.code === "invalid_arguments") {
      throw new SessionError("state_corrupt");
    }
    throw error;
  }
  if (
    stored.origin !== owner.origin ||
    stored.accountUuid !== owner.accountUuid ||
    stored.sessionGeneration !== owner.sessionGeneration ||
    stored.profileGenerationId !== owner.profileGenerationId
  ) {
    throw new SessionError("state_corrupt");
  }
  const grantRaw: unknown = readField(root, "grant");
  const grant: VaultGrantRecord | null =
    grantRaw === null ? null : decodeStoredGrant(grantRaw, stored);
  const pendingRaw: unknown = readField(root, "pendingRefresh");
  const pendingRefresh: VaultPendingRefresh | null =
    pendingRaw === null ? null : assertPendingRefresh(pendingRaw, grant, stored);
  const supersededRaw: unknown = readField(root, "superseded");
  if (!Array.isArray(supersededRaw)) {
    throw new SessionError("state_corrupt");
  }
  const superseded: VaultSupersededEntry[] = [];
  let previousGeneration = -1;
  let seenFirst = false;
  for (const entryRaw of supersededRaw) {
    const entry: VaultSupersededEntry = decodeSupersededEntry(entryRaw, stored);
    if (!seenFirst) {
      seenFirst = true;
    } else if (entry.binding.sessionGeneration <= previousGeneration) {
      throw new SessionError("state_corrupt");
    }
    previousGeneration = entry.binding.sessionGeneration;
    superseded.push(entry);
  }
  return { grant, pendingRefresh, superseded };
}

/**
 * Parse a complete private UTF-8 service response body into a ServiceSession
 * grant. Required account/id, tokens, and expiries are enforced; displayName
 * must be string/null when present; additive fields are tolerated but
 * dropped. Duplicate keys anywhere or any invalid field fail invalid_grant.
 */
export function parseServiceGrant(bytes: Uint8Array): ServiceGrant {
  const text: string = decodeUtf8Fatal(bytes, true);
  if (text.startsWith("﻿")) {
    throw new SessionError("invalid_grant");
  }
  const root: unknown = parseStrictGrantJson(text);
  if (!isPlainObject(root)) {
    throw new SessionError("invalid_grant");
  }
  const accountField = readGrantField(root, "account");
  const accessField = readGrantField(root, "accessToken");
  const accessExpiryField = readGrantField(root, "accessExpiresAt");
  const refreshField = readGrantField(root, "refreshToken");
  const refreshExpiryField = readGrantField(root, "refreshExpiresAt");
  if (
    !accountField.present ||
    !accessField.present ||
    !accessExpiryField.present ||
    !refreshField.present ||
    !refreshExpiryField.present
  ) {
    throw new SessionError("invalid_grant");
  }
  if (!isPlainObject(accountField.value)) {
    throw new SessionError("invalid_grant");
  }
  const account: Record<string, unknown> = accountField.value;
  const idField = readGrantField(account, "id");
  if (!idField.present || !isCanonicalUuid(idField.value)) {
    throw new SessionError("invalid_grant");
  }
  const accountUuid: string = idField.value as string;
  const nameField = readGrantField(account, "displayName");
  if (nameField.present && typeof nameField.value !== "string" && nameField.value !== null) {
    throw new SessionError("invalid_grant");
  }
  if (!isHeaderSafeToken(accessField.value)) {
    throw new SessionError("invalid_grant");
  }
  const accessToken: string = accessField.value as string;
  const accessMs: number | null = expiryToMs(accessExpiryField.value);
  const refreshMs: number | null = expiryToMs(refreshExpiryField.value);
  if (accessMs === null || refreshMs === null) {
    throw new SessionError("invalid_grant");
  }
  if (!isOpaqueRefreshToken(refreshField.value)) {
    throw new SessionError("invalid_grant");
  }
  return Object.freeze({
    accountUuid,
    accessToken,
    accessExpiresAt: accessExpiryField.value as string,
    accessExpiresMs: accessMs,
    refreshToken: refreshField.value as string,
    refreshExpiresAt: refreshExpiryField.value as string,
    refreshExpiresMs: refreshMs,
  });
}
