import { Buffer } from "node:buffer";
import crypto from "node:crypto";
import { StorageError } from "../errors.js";
import { evaluateJsonIntegerToken } from "../../domain/revision.js";
import { assertBinding, assertUuid, MAX_STORE_BYTES } from "../validate.js";
import type { StorageBinding } from "./types.js";

export const MAX_RECORD_BYTES = 4 * MAX_STORE_BYTES + 65536;
const MAX_PLAIN_BYTES = 4 * Math.ceil(MAX_STORE_BYTES / 3) + 16384;
const INFO = "gymtracka-credential-record-v1";
const FORMAT = "gymtracka-credentials";

function corrupt(): never {
  throw new StorageError("store_corrupt");
}

/** JSON grammar first; then compare decoded object-key tokens, including escapes. */
function strictJson(bytes: Uint8Array): unknown {
  try {
    if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) corrupt();
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const parsed: unknown = JSON.parse(
      text,
      (_key: string, value: unknown, context?: { source?: string }) => {
        // Validate the original token so rounding cannot turn a fraction or
        // out-of-range generation into an accepted integer. Equivalent integral
        // decimal/exponent spellings remain valid JSON integers.
        if (typeof value === "number") {
          const source = context?.source;
          if (!Number.isSafeInteger(value) || source === undefined || source.length > 65536)
            corrupt();
          const exact = evaluateJsonIntegerToken(source);
          if (
            !Number.isSafeInteger(value) ||
            exact === null ||
            exact < 0n ||
            exact > BigInt(Number.MAX_SAFE_INTEGER) ||
            exact !== BigInt(value)
          )
            corrupt();
        }
        return value;
      },
    );
    const stack: Array<Set<string> | null> = [];
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (char === "{") stack.push(new Set());
      else if (char === "[") stack.push(null);
      else if (char === "}" || char === "]") stack.pop();
      else if (char === '"') {
        const start = i++;
        while (text[i] !== '"') i += text[i] === "\\" ? 2 : 1;
        let next = i + 1;
        while (/\s/.test(text[next] ?? "x")) next += 1;
        if (text[next] === ":") {
          const key: string = JSON.parse(text.slice(start, i + 1)) as string;
          const keys = stack.at(-1);
          if (keys == null || keys.has(key)) corrupt();
          keys.add(key);
        }
      }
    }
    return parsed;
  } catch {
    return corrupt();
  }
}

function shape(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) corrupt();
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== keys.length || keys.some((k) => !Object.hasOwn(record, k)))
    corrupt();
  return record;
}

function base64(value: unknown, max: number, exact?: number, vault = false): Buffer {
  if (typeof value !== "string") corrupt();
  const overflow = (): never => {
    throw new StorageError(vault ? "resource_exhausted" : "store_corrupt");
  };
  if (value.length > 4 * Math.ceil(max / 3)) overflow();
  // Size before decoding. Canonical roundtrip also rejects bad padding/pad bits.
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  if (value.length % 4 !== 0) corrupt();
  const length = (value.length / 4) * 3 - padding;
  if (length > max) overflow();
  if (exact !== undefined && length !== exact) corrupt();
  const decoded = Buffer.from(value, "base64");
  if (decoded.toString("base64") !== value) corrupt();
  return decoded;
}

export interface RecordHeader {
  readonly profileGenerationId: string;
  readonly salt: Buffer;
  readonly nonce: Buffer;
  readonly ciphertext: Buffer;
  readonly tag: Buffer;
  readonly aad: Buffer;
}

/** Unverified ID is only a key lookup hint; never account/deletion authority. */
export function parseHeader(bytes: Uint8Array): RecordHeader {
  if (bytes.byteLength > MAX_RECORD_BYTES) corrupt();
  const env = shape(strictJson(bytes), [
    "format",
    "version",
    "profileGenerationId",
    "saltBase64",
    "nonceBase64",
    "ciphertextBase64",
    "tagBase64",
  ]);
  if (env["format"] !== FORMAT) corrupt();
  if (
    typeof env["version"] === "number" &&
    Number.isInteger(env["version"]) &&
    env["version"] !== 1
  )
    throw new StorageError("store_version_unsupported");
  if (env["version"] !== 1) corrupt();
  let id: string;
  try {
    id = assertUuid(env["profileGenerationId"]);
  } catch {
    return corrupt();
  }
  const salt = base64(env["saltBase64"], 32, 32);
  const nonce = base64(env["nonceBase64"], 12, 12);
  const ciphertext = base64(env["ciphertextBase64"], MAX_PLAIN_BYTES);
  const tag = base64(env["tagBase64"], 16, 16);
  return {
    profileGenerationId: id,
    salt,
    nonce,
    ciphertext,
    tag,
    aad: Buffer.from(JSON.stringify([FORMAT, 1, id, env["saltBase64"], env["nonceBase64"]])),
  };
}

export function openRecord(
  header: RecordHeader,
  master: Uint8Array,
  origin: string,
): { binding: StorageBinding; vault: Uint8Array } {
  const key = Buffer.from(crypto.hkdfSync("sha256", master, header.salt, INFO, 32));
  let plain: Buffer | undefined;
  let partial: Buffer | undefined;
  try {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, header.nonce);
    decipher.setAAD(header.aad);
    decipher.setAuthTag(header.tag);
    partial = decipher.update(header.ciphertext);
    plain = Buffer.concat([partial, decipher.final()]);
    if (plain.byteLength > MAX_PLAIN_BYTES) corrupt();
    const payload = shape(strictJson(plain), ["version", "binding", "vaultBase64"]);
    if (payload["version"] !== 1) corrupt();
    let binding: StorageBinding;
    try {
      binding = assertBinding(payload["binding"]);
    } catch {
      return corrupt();
    }
    if (binding.profileGenerationId !== header.profileGenerationId || binding.origin !== origin)
      throw new StorageError("binding_mismatch");
    const vault = base64(payload["vaultBase64"], MAX_STORE_BYTES, undefined, true);
    return { binding, vault };
  } catch (error) {
    if (error instanceof StorageError) throw error;
    return corrupt();
  } finally {
    key.fill(0);
    partial?.fill(0);
    plain?.fill(0);
  }
}

export function sealRecord(master: Uint8Array, binding: StorageBinding, vault: Uint8Array): Buffer {
  if (vault.byteLength > MAX_STORE_BYTES) throw new StorageError("resource_exhausted");
  const salt = crypto.randomBytes(32);
  const nonce = crypto.randomBytes(12);
  const saltBase64 = salt.toString("base64");
  const nonceBase64 = nonce.toString("base64");
  const key = Buffer.from(crypto.hkdfSync("sha256", master, salt, INFO, 32));
  const plain = Buffer.from(
    JSON.stringify({ version: 1, binding, vaultBase64: Buffer.from(vault).toString("base64") }),
  );
  try {
    if (plain.byteLength > MAX_PLAIN_BYTES) throw new StorageError("resource_exhausted");
    const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
    cipher.setAAD(
      Buffer.from(
        JSON.stringify([FORMAT, 1, binding.profileGenerationId, saltBase64, nonceBase64]),
      ),
    );
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
    return Buffer.from(
      JSON.stringify({
        format: FORMAT,
        version: 1,
        profileGenerationId: binding.profileGenerationId,
        saltBase64,
        nonceBase64,
        ciphertextBase64: ciphertext.toString("base64"),
        tagBase64: cipher.getAuthTag().toString("base64"),
      }),
    );
  } finally {
    key.fill(0);
    plain.fill(0);
  }
}
