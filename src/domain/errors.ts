/**
 * T03 domain codec error. Local library categories only; these are NOT new
 * model-facing error codes. Messages are generic and never echo raw input.
 */
export type CodecErrorCode =
  "invalid_arguments" | "invalid_backend_response" | "invalid_tool_result";

export class CodecError extends Error {
  readonly code: CodecErrorCode;

  /**
   * New with an explicit safe generic message, or with the default generic
   * message. The default keeps one-argument construction safe; internal
   * call sites may pass their own explicit generic message (still never
   * carrying raw input or IDs).
   */
  constructor(code: CodecErrorCode, message: string = "Invalid operation.") {
    super(message);
    this.name = "CodecError";
    this.code = code;
  }
}
