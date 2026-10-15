/**
 * T06-S1 session errors — sanitized typed failures.
 *
 * Every SessionError carries only a fixed generic message derived from its
 * code. No account identifiers, token material, expiry strings, vault bytes,
 * paths, native messages, causes, or stacks with filesystem locations ever
 * leave this module. Recognition uses a private brand so hostile getters,
 * instanceof traps, or forged descriptors cannot spoof it.
 */

export type SessionErrorCode =
  | "invalid_arguments"
  | "invalid_grant"
  | "state_corrupt"
  | "state_version_unsupported"
  | "authentication_required"
  | "reauthentication_required"
  | "operation_interrupted";

const KNOWN_CODES: Readonly<Record<SessionErrorCode, true>> = {
  invalid_arguments: true,
  invalid_grant: true,
  state_corrupt: true,
  state_version_unsupported: true,
  authentication_required: true,
  reauthentication_required: true,
  operation_interrupted: true,
};

const BRAND = new WeakSet<object>();

function failureMessage(code: SessionErrorCode): string {
  return `Session failure: ${code}.`;
}

export class SessionError extends Error {
  declare public readonly code: SessionErrorCode;

  public constructor(code: SessionErrorCode) {
    const safe: SessionErrorCode =
      typeof code === "string" && Object.prototype.hasOwnProperty.call(KNOWN_CODES, code)
        ? code
        : "invalid_arguments";
    super(failureMessage(safe));
    Object.defineProperty(this, "code", {
      value: safe,
      writable: false,
      enumerable: true,
      configurable: false,
    });
    this.name = "SessionError";
    // Fixed stack: no native frames, paths, or module locations.
    this.stack = `SessionError: ${failureMessage(safe)}`;
    BRAND.add(this);
  }
}

export function isSessionError(value: unknown): value is SessionError {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  try {
    return BRAND.has(value);
  } catch {
    return false;
  }
}
