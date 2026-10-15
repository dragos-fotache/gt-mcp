/**
 * T04 protected storage — encrypted envelope format and anchor records.
 *
 * Envelope (all integers big-endian):
 *   magic "GTMS2" (5) | version u16 (1) | family u8 (1 vault, 2 operations,
 *   3 anchor) | salt (32) | nonce (12) | plaintextLength u64 | ciphertext |
 *   GCM tag (16). Header is 60 bytes; total is exactly 76+plaintextLength.
 *
 * Record keys are HKDF-SHA256 over the immutable master key with the
 * per-envelope random salt and family info, so cross-store ciphertext
 * cannot be swapped. Data-store AAD binds the full header plus the JSON
 * array [origin, accountUuid, profileGenerationId]; anchor AAD binds the
 * header plus the profileGenerationId only (recoverable before the
 * decrypted binding is compared). Random salts+nonces give probabilistic
 * collision resistance; the commit sequence cap is enforced by the engine.
 */

import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { StorageError } from "./errors.js";
import { MAX_STORE_BYTES, isCanonicalOriginText } from "./validate.js";
import type { StorageBinding } from "./types.js";

export const ENVELOPE_MAGIC: string = "GTMS2";
export const DIGEST_KEY_VERSION_TEXT: string = "gymtracka-digest-v1";
export const ENVELOPE_VERSION: number = 1;
export const ENVELOPE_HEADER_LEN: number = 60;
export const ENVELOPE_TAG_LEN: number = 16;
export const SALT_LEN: number = 32;
export const NONCE_LEN: number = 12;
export const MASTER_KEY_LEN: number = 32;

export type StoreFamily = "vault" | "operations" | "anchor";

const FAMILY_ID: Record<StoreFamily, number> = {
  vault: 1,
  operations: 2,
  anchor: 3,
};

const ID_FAMILY: Record<number, StoreFamily> = {
  1: "vault",
  2: "operations",
  3: "anchor",
};

function familyId(family: StoreFamily): number {
  return FAMILY_ID[family];
}

export function recordKey(masterKey: Uint8Array, salt: Uint8Array, family: StoreFamily): Buffer {
  return Buffer.from(
    crypto.hkdfSync("sha256", masterKey, salt, `gymtracka-storage-v1:${family}`, 32),
  );
}

function buildHeader(
  family: StoreFamily,
  salt: Uint8Array,
  nonce: Uint8Array,
  plaintextLength: bigint,
): Buffer {
  const header: Buffer = Buffer.alloc(ENVELOPE_HEADER_LEN);
  header.write(ENVELOPE_MAGIC, 0, "ascii");
  header.writeUInt16BE(ENVELOPE_VERSION, 5);
  header.writeUInt8(familyId(family), 7);
  Buffer.from(salt).copy(header, 8);
  Buffer.from(nonce).copy(header, 40);
  header.writeBigUInt64BE(plaintextLength, 52);
  return header;
}

export function sealEnvelope(
  family: StoreFamily,
  masterKey: Uint8Array,
  plaintext: Uint8Array,
  aadExtra: Uint8Array,
): Buffer {
  if (plaintext.byteLength > MAX_STORE_BYTES) {
    throw new StorageError("resource_exhausted");
  }
  const salt: Buffer = crypto.randomBytes(SALT_LEN);
  const nonce: Buffer = crypto.randomBytes(NONCE_LEN);
  const key: Buffer = recordKey(masterKey, salt, family);
  const header: Buffer = buildHeader(family, salt, nonce, BigInt(plaintext.byteLength));
  const cipher: crypto.CipherGCM = crypto.createCipheriv("aes-256-gcm", key, nonce, {
    authTagLength: ENVELOPE_TAG_LEN,
  });
  cipher.setAAD(Buffer.concat([header, Buffer.from(aadExtra)]));
  const ciphertext: Buffer = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag: Buffer = cipher.getAuthTag();
  key.fill(0);
  return Buffer.concat([header, ciphertext, tag]);
}

export interface OpenedEnvelope {
  plaintext: Uint8Array;
  family: StoreFamily;
}

export interface EnvelopeHeader {
  family: StoreFamily;
  plaintextLength: bigint;
}

/**
 * Structural header/length/version gates without key material. Runs
 * before any digest comparison per the published data-file order:
 * unknown families and recognized-unknown versions fail here, never as
 * digest mismatches. Expected-family matching stays at decryption time,
 * so recognized sibling-family blobs hit the digest mismatch first.
 */
export function parseEnvelopeHeader(fileBytes: Uint8Array): EnvelopeHeader {
  if (fileBytes.byteLength < ENVELOPE_HEADER_LEN + ENVELOPE_TAG_LEN) {
    throw new StorageError("store_corrupt");
  }
  const file: Buffer = Buffer.from(fileBytes);
  if (file.subarray(0, 5).toString("ascii") !== ENVELOPE_MAGIC) {
    throw new StorageError("store_corrupt");
  }
  const version: number = file.readUInt16BE(5);
  if (version !== ENVELOPE_VERSION) {
    throw new StorageError("store_version_unsupported");
  }
  const family: StoreFamily | undefined = ID_FAMILY[file.readUInt8(7)];
  if (family === undefined) {
    throw new StorageError("store_corrupt");
  }
  const plaintextLength: bigint = file.readBigUInt64BE(52);
  if (plaintextLength > BigInt(MAX_STORE_BYTES)) {
    throw new StorageError("store_corrupt");
  }
  const expectedTotal: bigint = BigInt(ENVELOPE_HEADER_LEN + ENVELOPE_TAG_LEN) + plaintextLength;
  if (BigInt(file.byteLength) !== expectedTotal) {
    throw new StorageError("store_corrupt");
  }
  return { family, plaintextLength };
}

/**
 * Parse and authenticate one envelope file. Structural/version failures and
 * anchor AEAD failures are store_corrupt; data-store AEAD failure after a
 * digest match indicates state inconsistent with the commit and is reported
 * with the caller-selected dataAadFailure code (fence_mismatch).
 */
export function openEnvelope(
  expectedFamily: StoreFamily,
  masterKey: Uint8Array,
  aadExtra: Uint8Array,
  fileBytes: Uint8Array,
  dataAadFailure: "fence_mismatch" | "store_corrupt" = "fence_mismatch",
): OpenedEnvelope {
  if (fileBytes.byteLength < ENVELOPE_HEADER_LEN + ENVELOPE_TAG_LEN) {
    throw new StorageError("store_corrupt");
  }
  const file: Buffer = Buffer.from(fileBytes);
  if (file.subarray(0, 5).toString("ascii") !== ENVELOPE_MAGIC) {
    throw new StorageError("store_corrupt");
  }
  const version: number = file.readUInt16BE(5);
  if (version !== ENVELOPE_VERSION) {
    throw new StorageError("store_version_unsupported");
  }
  const familyByte: number = file.readUInt8(7);
  const family: StoreFamily | undefined = ID_FAMILY[familyByte];
  if (family === undefined || family !== expectedFamily) {
    throw new StorageError("store_corrupt");
  }
  const salt: Buffer = file.subarray(8, 40);
  const nonce: Buffer = file.subarray(40, 52);
  const plaintextLength: bigint = file.readBigUInt64BE(52);
  if (plaintextLength > BigInt(MAX_STORE_BYTES)) {
    throw new StorageError("store_corrupt");
  }
  const expectedTotal: bigint = BigInt(ENVELOPE_HEADER_LEN + ENVELOPE_TAG_LEN) + plaintextLength;
  if (BigInt(file.byteLength) !== expectedTotal) {
    throw new StorageError("store_corrupt");
  }
  const header: Buffer = file.subarray(0, ENVELOPE_HEADER_LEN);
  const ciphertext: Buffer = file.subarray(
    ENVELOPE_HEADER_LEN,
    ENVELOPE_HEADER_LEN + Number(plaintextLength),
  );
  const tag: Buffer = file.subarray(ENVELOPE_HEADER_LEN + Number(plaintextLength));
  const key: Buffer = recordKey(masterKey, salt, family);
  try {
    const decipher: crypto.DecipherGCM = crypto.createDecipheriv("aes-256-gcm", key, nonce, {
      authTagLength: ENVELOPE_TAG_LEN,
    });
    decipher.setAAD(Buffer.concat([header, Buffer.from(aadExtra)]));
    decipher.setAuthTag(tag);
    const plaintext: Buffer = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return { plaintext: new Uint8Array(plaintext), family };
  } catch {
    if (family === "anchor") {
      throw new StorageError("store_corrupt");
    }
    throw new StorageError(dataAadFailure);
  } finally {
    key.fill(0);
  }
}

export function dataAad(
  origin: string,
  accountUuid: string | null,
  profileGenerationId: string,
): Buffer {
  return Buffer.from(JSON.stringify([origin, accountUuid, profileGenerationId]), "utf8");
}

export function anchorAad(profileGenerationId: string): Buffer {
  return Buffer.from(profileGenerationId, "utf8");
}

export function sha256Hex(data: Uint8Array): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

const HEX64_RE: RegExp = /^[0-9a-f]{64}$/;
const DECIMAL_RE: RegExp = /^(0|[1-9][0-9]*)$/;
const MAX_U64: bigint = (BigInt(1) << BigInt(64)) - BigInt(1);

export type AnchorPhase = "PROVISIONING" | "PREPARED" | "COMMITTED";

export interface AnchorDigests {
  vault: string;
  ops: string;
}

export interface AnchorRootCommitment {
  path: string;
  dev: string;
  ino: string;
}

export interface AnchorRecord {
  v: 1;
  phase: AnchorPhase;
  seq: string;
  binding: StorageBinding;
  digests: AnchorDigests;
  roots: {
    profile: AnchorRootCommitment;
    anchor: AnchorRootCommitment;
    euid: number;
  };
  lock: { dev: string; ino: string };
  target?: {
    seq: string;
    binding: StorageBinding;
    digests: AnchorDigests;
  };
}

function encodeBinding(binding: StorageBinding): string {
  return (
    `{"origin":${JSON.stringify(binding.origin)},` +
    `"accountUuid":${binding.accountUuid === null ? "null" : JSON.stringify(binding.accountUuid)},` +
    `"sessionGeneration":${binding.sessionGeneration},` +
    `"profileGenerationId":${JSON.stringify(binding.profileGenerationId)}}`
  );
}

function encodeDigests(digests: AnchorDigests): string {
  return `{"vault":${JSON.stringify(digests.vault)},"ops":${JSON.stringify(digests.ops)}}`;
}

function encodeCommitment(commitment: AnchorRootCommitment): string {
  return (
    `{"path":${JSON.stringify(commitment.path)},` +
    `"dev":${JSON.stringify(commitment.dev)},` +
    `"ino":${JSON.stringify(commitment.ino)}}`
  );
}

export function encodeAnchorRecord(record: AnchorRecord): Buffer {
  let text: string =
    `{"v":1,"phase":${JSON.stringify(record.phase)},` +
    `"seq":${JSON.stringify(record.seq)},` +
    `"binding":${encodeBinding(record.binding)},` +
    `"digests":${encodeDigests(record.digests)},` +
    `"roots":{"profile":${encodeCommitment(record.roots.profile)},` +
    `"anchor":${encodeCommitment(record.roots.anchor)},` +
    `"euid":${record.roots.euid}},` +
    `"lock":{"dev":${JSON.stringify(record.lock.dev)},"ino":${JSON.stringify(record.lock.ino)}}`;
  if (record.target !== undefined) {
    text +=
      `,"target":{"seq":${JSON.stringify(record.target.seq)},` +
      `"binding":${encodeBinding(record.target.binding)},` +
      `"digests":${encodeDigests(record.target.digests)}}`;
  }
  text += "}";
  return Buffer.from(text, "utf8");
}

function assertRecordShape(value: unknown): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new StorageError("store_corrupt");
  }
}

function assertExactRecordKeys(value: Record<string, unknown>, allowed: readonly string[]): void {
  const keys: string[] = Object.keys(value);
  if (keys.length !== allowed.length) {
    throw new StorageError("store_corrupt");
  }
  for (const key of keys) {
    if (!allowed.includes(key)) {
      throw new StorageError("store_corrupt");
    }
  }
}

function readStringField(record: Record<string, unknown>, field: string): string {
  const value: unknown = record[field];
  if (typeof value !== "string") {
    throw new StorageError("store_corrupt");
  }
  return value;
}

function readDecimalField(record: Record<string, unknown>, field: string): string {
  const text: string = readStringField(record, field);
  if (!DECIMAL_RE.test(text)) {
    throw new StorageError("store_corrupt");
  }
  try {
    if (BigInt(text) > MAX_U64) {
      throw new StorageError("store_corrupt");
    }
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError("store_corrupt");
  }
  return text;
}

function readHex64Field(record: Record<string, unknown>, field: string): string {
  const text: string = readStringField(record, field);
  if (!HEX64_RE.test(text)) {
    throw new StorageError("store_corrupt");
  }
  return text;
}

const CANONICAL_UUID_RE: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function parseAnchorBinding(value: unknown): StorageBinding {
  assertRecordShape(value);
  assertExactRecordKeys(value, [
    "origin",
    "accountUuid",
    "sessionGeneration",
    "profileGenerationId",
  ]);
  const origin: string = readStringField(value, "origin");
  if (!isCanonicalOriginText(origin)) {
    throw new StorageError("store_corrupt");
  }
  const accountRaw: unknown = value["accountUuid"];
  if (accountRaw !== null) {
    if (typeof accountRaw !== "string" || !CANONICAL_UUID_RE.test(accountRaw)) {
      throw new StorageError("store_corrupt");
    }
  }
  const generationRaw: unknown = value["sessionGeneration"];
  if (
    typeof generationRaw !== "number" ||
    !Number.isSafeInteger(generationRaw) ||
    generationRaw < 0
  ) {
    throw new StorageError("store_corrupt");
  }
  const generationId: string = readStringField(value, "profileGenerationId");
  if (!CANONICAL_UUID_RE.test(generationId)) {
    throw new StorageError("store_corrupt");
  }
  return Object.freeze({
    origin,
    accountUuid: accountRaw,
    sessionGeneration: generationRaw,
    profileGenerationId: generationId,
  });
}

function parseAnchorDigests(value: unknown): AnchorDigests {
  assertRecordShape(value);
  assertExactRecordKeys(value, ["vault", "ops"]);
  return Object.freeze({
    vault: readHex64Field(value, "vault"),
    ops: readHex64Field(value, "ops"),
  });
}

function parseAnchorCommitment(value: unknown): AnchorRootCommitment {
  assertRecordShape(value);
  assertExactRecordKeys(value, ["path", "dev", "ino"]);
  const commitmentPath: string = readStringField(value, "path");
  if (!commitmentPath.startsWith("/") || commitmentPath.includes("\0")) {
    throw new StorageError("store_corrupt");
  }
  return Object.freeze({
    path: commitmentPath,
    dev: readDecimalField(value, "dev"),
    ino: readDecimalField(value, "ino"),
  });
}

export function parseAnchorRecord(plaintext: Uint8Array): AnchorRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(plaintext).toString("utf8"));
  } catch {
    throw new StorageError("store_corrupt");
  }
  assertRecordShape(parsed);
  const hasTarget: boolean = Object.prototype.hasOwnProperty.call(parsed, "target");
  assertExactRecordKeys(
    parsed,
    hasTarget
      ? ["v", "phase", "seq", "binding", "digests", "roots", "lock", "target"]
      : ["v", "phase", "seq", "binding", "digests", "roots", "lock"],
  );
  if (parsed["v"] !== 1) {
    throw new StorageError("store_corrupt");
  }
  const phaseRaw: unknown = parsed["phase"];
  if (phaseRaw !== "PROVISIONING" && phaseRaw !== "PREPARED" && phaseRaw !== "COMMITTED") {
    throw new StorageError("store_corrupt");
  }
  const seq: string = readDecimalField(parsed, "seq");
  const binding: StorageBinding = parseAnchorBinding(parsed["binding"]);
  const digests: AnchorDigests = parseAnchorDigests(parsed["digests"]);
  const rootsRaw: unknown = parsed["roots"];
  assertRecordShape(rootsRaw);
  assertExactRecordKeys(rootsRaw, ["profile", "anchor", "euid"]);
  const euidRaw: unknown = rootsRaw["euid"];
  if (typeof euidRaw !== "number" || !Number.isSafeInteger(euidRaw) || euidRaw < 0) {
    throw new StorageError("store_corrupt");
  }
  const roots: AnchorRecord["roots"] = Object.freeze({
    profile: parseAnchorCommitment(rootsRaw["profile"]),
    anchor: parseAnchorCommitment(rootsRaw["anchor"]),
    euid: euidRaw,
  });
  const lockRaw: unknown = parsed["lock"];
  assertRecordShape(lockRaw);
  assertExactRecordKeys(lockRaw, ["dev", "ino"]);
  const lock: { dev: string; ino: string } = Object.freeze({
    dev: readDecimalField(lockRaw, "dev"),
    ino: readDecimalField(lockRaw, "ino"),
  });
  if (!hasTarget) {
    return { v: 1, phase: phaseRaw, seq, binding, digests, roots, lock };
  }
  const targetRaw: unknown = parsed["target"];
  assertRecordShape(targetRaw);
  assertExactRecordKeys(targetRaw, ["seq", "binding", "digests"]);
  const target: { seq: string; binding: StorageBinding; digests: AnchorDigests } = Object.freeze({
    seq: readDecimalField(targetRaw, "seq"),
    binding: parseAnchorBinding(targetRaw["binding"]),
    digests: parseAnchorDigests(targetRaw["digests"]),
  });
  return { v: 1, phase: phaseRaw, seq, binding, digests, roots, lock, target };
}

export function nextSeq(seq: string): string {
  const next: bigint = BigInt(seq) + BigInt(1);
  if (next > MAX_U64) {
    throw new StorageError("resource_exhausted");
  }
  return next.toString(10);
}

const DIGEST_INFO_PREFIX: string = "gymtracka-digest-v1";

export function deriveDigestKey(
  masterKey: Uint8Array,
  origin: string,
  accountUuid: string,
  profileGenerationId: string,
): Buffer {
  const info: Buffer = Buffer.concat([
    Buffer.from(DIGEST_INFO_PREFIX, "utf8"),
    Buffer.from([0]),
    Buffer.from(origin, "utf8"),
    Buffer.from([0]),
    Buffer.from(accountUuid, "utf8"),
    Buffer.from([0]),
    Buffer.from(profileGenerationId, "utf8"),
  ]);
  return Buffer.from(crypto.hkdfSync("sha256", masterKey, Buffer.alloc(0), info, 32));
}

export function hmacIntentDigest(digestKey: Uint8Array, identityMaterialUtf8: Uint8Array): Buffer {
  const hmac: crypto.Hmac = crypto.createHmac("sha256", digestKey);
  hmac.update(DIGEST_KEY_VERSION_TEXT);
  hmac.update(Buffer.from([0]));
  hmac.update(identityMaterialUtf8);
  return hmac.digest();
}

export function scrubBytes(buffer: Uint8Array): void {
  buffer.fill(0);
}
