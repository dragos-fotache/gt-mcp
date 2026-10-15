/**
 * T04 protected storage — sanitized typed errors.
 *
 * Every failure crossing the holder IPC boundary or the public API is a
 * StorageError carrying only a fixed generic message derived from its code.
 * No paths, account/resource identifiers, payload bytes, key material,
 * native messages, causes, or stacks with filesystem locations ever leave
 * the holder. Unknown worker reply codes fence with commit_ambiguous
 * (see ipc.ts), never surface raw content.
 */

export type StorageErrorCode =
  | "invalid_argument"
  | "unsupported_platform"
  | "key_not_found"
  | "key_locked"
  | "key_ambiguous"
  | "key_unavailable"
  | "provider_failure"
  | "store_missing"
  | "store_corrupt"
  | "store_version_unsupported"
  | "resource_exhausted"
  | "binding_mismatch"
  | "generation_mismatch"
  | "fence_mismatch"
  | "anchor_missing"
  | "already_provisioned"
  | "incomplete_provision"
  | "not_provisioned"
  | "locked_by_other_owner"
  | "not_owner"
  | "commit_ambiguous"
  | "io_failure";

export const STORAGE_ERROR_CODES: readonly StorageErrorCode[] = [
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
  "fence_mismatch",
  "anchor_missing",
  "already_provisioned",
  "incomplete_provision",
  "not_provisioned",
  "locked_by_other_owner",
  "not_owner",
  "commit_ambiguous",
  "io_failure",
];

export function isStorageErrorCode(value: unknown): value is StorageErrorCode {
  return typeof value === "string" && (STORAGE_ERROR_CODES as readonly string[]).includes(value);
}

function failureMessage(code: StorageErrorCode): string {
  return `Storage failure: ${code}.`;
}

export class StorageError extends Error {
  declare readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode) {
    const safe: StorageErrorCode = isStorageErrorCode(code) ? code : "invalid_argument";
    super(failureMessage(safe));
    this.name = "StorageError";
    // Runtime-immutable: non-writable, non-configurable own property.
    Object.defineProperty(this, "code", {
      value: safe,
      writable: false,
      enumerable: true,
      configurable: false,
    });
    // Fixed stack: no native frames, paths, or module locations.
    this.stack = `StorageError: ${failureMessage(safe)}`;
  }
}

export function isStorageError(value: unknown): value is StorageError {
  return value instanceof StorageError;
}

/**
 * Coerce an IPC worker reply code. Allowlisted codes reconstruct the exact
 * sanitized error; anything else (unknown, malformed, unparseable) fences
 * the handle with commit_ambiguous per the approved specification.
 */
export function workerCodeToError(code: unknown): StorageError {
  if (isStorageErrorCode(code)) {
    return new StorageError(code);
  }
  return new StorageError("commit_ambiguous");
}
