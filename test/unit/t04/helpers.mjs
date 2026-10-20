// T04 QA unit helpers — synthetic fixtures only. No production imports,
// no provider contact, no personal paths. Derived from the approved spec.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const QA_ORIGIN = "https://storage-qa.example.invalid";
export const QA_ORIGIN_OTHER = "https://storage-qa-other.example.invalid";
export const ACCOUNT_A = "11111111-1111-4111-8111-111111111111";
export const ACCOUNT_B = "22222222-2222-4222-8222-222222222222";
export const PGID_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const PGID_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

// Syntactically valid but unroutable bus address for argument-shape tests.
// Invalid-argument cases reject before any connection attempt.
export const UNUSED_BUS = "unix:path=/tmp/t04-qa-nonexistent-bus-xyz.sock";

// Full approved StorageErrorCode catalogue (22 codes, spec section 3).
export const ALL_CODES = [
  "invalid_argument",
  "unsupported_platform",
  "key_not_found",
  "key_locked",
  "key_ambiguous",
  "key_unavailable",
  "provider_failure",
  "store_missing",
  "store_corrupt",
  "store_version_unsupported",
  "resource_exhausted",
  "binding_mismatch",
  "generation_mismatch",
  "already_provisioned",
  "incomplete_provision",
  "not_provisioned",
  "locked_by_other_owner",
  "not_owner",
  "commit_ambiguous",
  "io_failure",
];

export function tempRoot(prefix = "t04-qa-") {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function removeRoot(root) {
  rmSync(root, { recursive: true, force: true });
}

export function canaryBytes(label) {
  return Buffer.from(`t04-qa-canary:${label}:deadbeef`, "utf8");
}

export function assertStorageError(err, code) {
  if (typeof err !== "object" || err === null) throw new Error("expected an error object");
  if (err.name !== "StorageError")
    throw new Error(`expected name StorageError, got ${String(err.name)}`);
  if (err.code !== code) throw new Error(`expected code ${code}, got ${String(err.code)}`);
  if (err.message !== `Storage failure: ${code}.`) {
    throw new Error(`unexpected message ${JSON.stringify(err.message)}`);
  }
  if (err.stack !== `StorageError: Storage failure: ${code}.`) {
    throw new Error(`unexpected stack ${JSON.stringify(err.stack)}`);
  }
  if ("cause" in err) throw new Error("error must not carry a cause field");
}

// Closes an unexpectedly acquired session so a failed expectation can
// never masquerade as a leaked-holder contention cascade. Best-effort:
// close itself may legitimately reject on a fenced handle.
async function closeIfSession(value) {
  if (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof value.close === "function"
  ) {
    try {
      await value.close();
    } catch {
      // Best-effort release only; the expectation failure below is authoritative.
    }
  }
}

// Awaits promise; returns the StorageError when it rejects with code,
// throws when the call unexpectedly succeeds (after closing any leaked handle).
export async function expectCode(promise, code) {
  let value;
  try {
    value = await promise;
  } catch (err) {
    assertStorageError(err, code);
    return err;
  }
  await closeIfSession(value);
  throw new Error(`expected rejection with code ${code}, but the call succeeded`);
}

// Rejects with any sanitized StorageError (for explicitly unspecified mappings).
// Shape-validated for whatever code arrives; no cause chain is attached.
export async function expectFailClosed(promise, what) {
  const outcome = await promise.then(
    (value) => ({ settled: "fulfilled", value }),
    (err) => ({ settled: "rejected", err }),
  );
  if (outcome.settled === "fulfilled") {
    await closeIfSession(outcome.value);
    throw new Error(`expected fail-closed StorageError for ${what}, but the call succeeded`);
  }
  const err = outcome.err;
  if (
    typeof err !== "object" ||
    err === null ||
    err.name !== "StorageError" ||
    typeof err.code !== "string"
  ) {
    throw new Error(`expected sanitized StorageError for ${what}, got ${String(err && err.name)}`);
  }
  assertStorageError(err, err.code);
  return err;
}
