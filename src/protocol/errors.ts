/** Fixed safe factory/close errors; recognition never inspects caller properties. */
export type ReadToolServerErrorCode =
  "invalid_arguments" | "configuration_required" | "recovery_unavailable" | "internal_error";

const BRAND = new WeakSet<object>();
const CODES: Readonly<Record<ReadToolServerErrorCode, true>> = {
  invalid_arguments: true,
  configuration_required: true,
  recovery_unavailable: true,
  internal_error: true,
};

export class ReadToolServerError extends Error {
  declare readonly code: ReadToolServerErrorCode;

  constructor(code: ReadToolServerErrorCode) {
    const safe: ReadToolServerErrorCode =
      typeof code === "string" && Object.prototype.hasOwnProperty.call(CODES, code)
        ? code
        : "invalid_arguments";
    super(`Read tool server failure: ${safe}.`);
    Object.defineProperty(this, "code", {
      value: safe,
      writable: false,
      configurable: false,
      enumerable: true,
    });
    this.name = "ReadToolServerError";
    this.stack = `ReadToolServerError: Read tool server failure: ${safe}.`;
    BRAND.add(this);
  }
}

export function isReadToolServerError(value: unknown): value is ReadToolServerError {
  return typeof value === "object" && value !== null && BRAND.has(value);
}
