/** Private T07 exchange envelope. Never a model/tool result or operation journal. */
import {
  captureEntries,
  assertBinding,
  bindingsEqual,
  expiryToMs,
  isCanonicalUuid,
} from "../auth/validate.js";
import {
  decodeCanonicalBase64,
  decodeLifecycleVaultBytes,
  encodeBodyBase64,
} from "../auth/vault.js";
import { MAX_STORE_BYTES } from "../storage/index.js";
import type { StorageBinding } from "../storage/index.js";
import { parseStrictMetadataJson } from "../runtime/files.js";
import { LoginError, isLoginError } from "./errors.js";

export const LOGIN_VAULT_VERSION = 4 as const;

export interface LoginSettings {
  readonly version: 1;
  readonly googleWebClientId: string;
  readonly browserOrigin: string;
}

export interface LoginExchange {
  readonly attemptId: string;
  readonly challengeId: string;
  readonly challengeExpiresAt: string;
  readonly googleWebClientId: string;
  readonly browserOrigin: string;
  readonly authKey: string;
  readonly bodyBase64: string;
  readonly sendsReserved: number;
  readonly retryNotBeforeMs: number | null;
}

export interface LoginEnvelope {
  readonly version: 4;
  readonly binding: StorageBinding;
  readonly priorVaultBase64: string;
  readonly exchange: LoginExchange;
}

export function exactRecord(value: unknown, keys: readonly string[]): Record<string, unknown> {
  const entries = captureEntries(value);
  if (entries.length !== keys.length || entries.some(([key]) => !keys.includes(key))) {
    throw new LoginError("invalid_arguments");
  }
  return Object.fromEntries(entries);
}

export function validateSettings(value: unknown): LoginSettings {
  try {
    const r = exactRecord(value, ["version", "googleWebClientId", "browserOrigin"]);
    const id = r["googleWebClientId"];
    const origin = r["browserOrigin"];
    if (
      r["version"] !== 1 ||
      typeof id !== "string" ||
      !/^[\x21-\x7e]{1,4096}$/.test(id) ||
      typeof origin !== "string"
    ) {
      throw new LoginError("configuration_required");
    }
    const match = /^http:\/\/localhost:([1-9][0-9]*)$/.exec(origin);
    const port = Number(match?.[1]);
    if (match === null || !Number.isInteger(port) || port < 1024 || port > 65535) {
      throw new LoginError("configuration_required");
    }
    return Object.freeze({ version: 1, googleWebClientId: id, browserOrigin: origin });
  } catch {
    throw new LoginError("configuration_required");
  }
}

export function isOpaqueGoogleToken(value: unknown): value is string {
  // An opaque GIS credential is never decoded locally as account authority.
  return typeof value === "string" && value.length > 0;
}

export function decodePriorVault(value: unknown): Uint8Array {
  if (value === "") return new Uint8Array();
  try {
    return decodeCanonicalBase64(value);
  } catch {
    throw new LoginError("state_corrupt");
  }
}

export function decodeLoginEnvelope(
  bytes: Uint8Array,
  binding: StorageBinding,
  maxRequestBytes: number,
): LoginEnvelope | null {
  try {
    if (bytes.byteLength > MAX_STORE_BYTES) throw new LoginError("state_corrupt");
    if (bytes.byteLength === 0) return null;
    const parsed = parseStrictMetadataJson(bytes);
    if (parsed["version"] !== 4) {
      decodeLifecycleVaultBytes(bytes, binding);
      return null;
    }
    const root = exactRecord(parsed, ["version", "binding", "priorVaultBase64", "exchange"]);
    if (!bindingsEqual(assertBinding(root["binding"]), binding))
      throw new LoginError("state_corrupt");
    const prior = decodePriorVault(root["priorVaultBase64"]);
    decodeLifecycleVaultBytes(prior, binding); // Also rejects recursive v4.
    const e = exactRecord(root["exchange"], [
      "attemptId",
      "challengeId",
      "challengeExpiresAt",
      "googleWebClientId",
      "browserOrigin",
      "authKey",
      "bodyBase64",
      "sendsReserved",
      "retryNotBeforeMs",
    ]);
    const settings = validateSettings({
      version: 1,
      googleWebClientId: e["googleWebClientId"],
      browserOrigin: e["browserOrigin"],
    });
    if (
      !isCanonicalUuid(e["attemptId"]) ||
      !isCanonicalUuid(e["challengeId"]) ||
      !isCanonicalUuid(e["authKey"]) ||
      expiryToMs(e["challengeExpiresAt"]) === null ||
      !Number.isInteger(e["sendsReserved"]) ||
      (e["sendsReserved"] as number) < 0 ||
      (e["sendsReserved"] as number) > 2 ||
      (e["retryNotBeforeMs"] !== null &&
        (!Number.isSafeInteger(e["retryNotBeforeMs"]) || (e["retryNotBeforeMs"] as number) < 0))
    ) {
      throw new LoginError("state_corrupt");
    }
    const body = decodeCanonicalBase64(e["bodyBase64"]);
    if (body.byteLength > maxRequestBytes) throw new LoginError("state_corrupt");
    const request = exactRecord(parseStrictMetadataJson(body), ["challengeId", "idToken"]);
    if (request["challengeId"] !== e["challengeId"] || !isOpaqueGoogleToken(request["idToken"]))
      throw new LoginError("state_corrupt");
    return Object.freeze({
      version: 4,
      binding: Object.freeze({ ...binding }),
      priorVaultBase64: encodeBodyBase64(prior),
      exchange: Object.freeze({
        ...e,
        googleWebClientId: settings.googleWebClientId,
        browserOrigin: settings.browserOrigin,
      }) as unknown as LoginExchange,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "state_version_unsupported"
    )
      throw new LoginError("state_version_unsupported");
    if (isLoginError(error) && error.code === "state_version_unsupported") throw error;
    throw new LoginError("state_corrupt");
  }
}

export function encodeLoginEnvelope(envelope: LoginEnvelope): Uint8Array {
  const bytes = new TextEncoder().encode(JSON.stringify(envelope));
  if (bytes.byteLength > MAX_STORE_BYTES) throw new LoginError("recovery_required");
  return bytes;
}
