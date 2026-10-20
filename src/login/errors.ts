/** Fixed, credential-free failures for trusted local login. */
export type LoginErrorCode =
  | "invalid_arguments"
  | "configuration_required"
  | "recovery_required"
  | "state_corrupt"
  | "state_version_unsupported"
  | "login_required"
  | "sign_in_failed"
  | "account_status_failed"
  | "retry_later"
  | "attempt_expired"
  | "operation_interrupted"
  | "internal_error";

const CODES: ReadonlySet<string> = new Set([
  "invalid_arguments",
  "configuration_required",
  "recovery_required",
  "state_corrupt",
  "state_version_unsupported",
  "login_required",
  "sign_in_failed",
  "account_status_failed",
  "retry_later",
  "attempt_expired",
  "operation_interrupted",
  "internal_error",
]);
const BRAND = new WeakSet<object>();

export class LoginError extends Error {
  readonly code: LoginErrorCode;
  constructor(code: LoginErrorCode) {
    const safe = CODES.has(code) ? code : "internal_error";
    super(`Login failure: ${safe}.`);
    this.name = "LoginError";
    this.code = safe;
    this.stack = `LoginError: ${this.message}`;
    Object.freeze(this);
    BRAND.add(this);
  }
}

export function isLoginError(value: unknown): value is LoginError {
  return typeof value === "object" && value !== null && BRAND.has(value);
}
