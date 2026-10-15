/**
 * T08-S1 trusted read runtime — sanitized factory/close failures.
 *
 * Every ReadRuntimeError carries only a fixed generic message derived from
 * its code. No paths, bindings, file excerpts, native messages, causes, or
 * stacks with filesystem locations ever leave this module. Recognition uses
 * a private brand so hostile getters, instanceof traps, or forged
 * descriptors cannot spoof it. Importing this module performs no IO,
 * network, logging, timers, processes, or global-handler installation.
 */

export type ReadRuntimeErrorCode =
  "invalid_arguments" | "configuration_required" | "recovery_unavailable" | "internal_error";

const KNOWN_CODES: Readonly<Record<ReadRuntimeErrorCode, true>> = {
  invalid_arguments: true,
  configuration_required: true,
  recovery_unavailable: true,
  internal_error: true,
};

const BRAND = new WeakSet<object>();

function failureMessage(code: ReadRuntimeErrorCode): string {
  return `Read runtime failure: ${code}.`;
}

export class ReadRuntimeError extends Error {
  declare public readonly code: ReadRuntimeErrorCode;

  public constructor(code: ReadRuntimeErrorCode) {
    const safe: ReadRuntimeErrorCode =
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
    this.name = "ReadRuntimeError";
    // Fixed stack: no native frames, paths, or module locations.
    this.stack = `ReadRuntimeError: ${failureMessage(safe)}`;
    BRAND.add(this);
  }
}

export function isReadRuntimeError(value: unknown): value is ReadRuntimeError {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  try {
    return BRAND.has(value);
  } catch {
    return false;
  }
}
