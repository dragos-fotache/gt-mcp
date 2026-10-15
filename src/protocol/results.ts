/** Validate canonical envelopes, remove runtime presentation text, then budget the whole result. */
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { makeToolResult } from "../domain/index.js";
import type { ToolName, ToolResultEnvelope } from "../domain/index.js";
import { isReadRuntimeError } from "../runtime/index.js";

const RETRYABLE: Readonly<Record<string, boolean>> = {
  invalid_arguments: false,
  configuration_required: false,
  authentication_required: false,
  reauthentication_required: false,
  recovery_unavailable: false,
  validation_error: false,
  invalid_page_token: false,
  page_expired: false,
  read_only: false,
  not_found: false,
  idempotency_key_reused: false,
  id_collision: false,
  invalid_state: false,
  invalid_reference: false,
  request_too_large: false,
  result_too_large: false,
  rate_limited: true,
  temporarily_unavailable: true,
  internal_error: true,
  network_error: true,
  operation_interrupted: true,
  backend_error: false,
};

export function failure(code: string, message?: string): ToolResultEnvelope {
  return {
    ok: false,
    error: {
      code,
      retryable: RETRYABLE[code] === true,
      ...(message === undefined ? {} : { message }),
    },
  };
}

export function thrownReadFailure(error: unknown): ToolResultEnvelope {
  return failure(isReadRuntimeError(error) ? error.code : "internal_error");
}

export function readEnvelope(tool: ToolName, value: unknown): ToolResultEnvelope {
  // T03 clones JSON without accessors/toJSON and rejects noncanonical roots/data.
  const envelope = makeToolResult(tool, value).structuredContent;
  if (envelope.ok) return envelope;
  const error = envelope.error;
  const keys = Object.keys(error);
  if (
    !Object.prototype.hasOwnProperty.call(RETRYABLE, error.code) ||
    error.retryable !== RETRYABLE[error.code] ||
    keys.some(
      (key) =>
        !["code", "retryable", "message", "backendErrorCode", "retryAfterSeconds"].includes(key),
    ) ||
    (error.retryAfterSeconds !== undefined && !Number.isSafeInteger(error.retryAfterSeconds)) ||
    (error.backendErrorCode !== undefined && !/^[a-z][a-z0-9_]*$/.test(error.backendErrorCode))
  ) {
    throw new Error("Invalid read envelope.");
  }
  return {
    ok: false,
    error: {
      code: error.code,
      retryable: error.retryable,
      ...(error.backendErrorCode === undefined ? {} : { backendErrorCode: error.backendErrorCode }),
      ...(error.retryAfterSeconds === undefined
        ? {}
        : { retryAfterSeconds: error.retryAfterSeconds }),
    },
  };
}

function sdkResult(tool: ToolName, envelope: unknown): CallToolResult {
  const canonical = makeToolResult(tool, envelope);
  // Explicit validation replaces the SDK stock call-handler wrapper we bypass.
  // Parse a mutable detached content tuple; T03 remains the envelope authority.
  return CallToolResultSchema.parse({
    structuredContent: canonical.structuredContent,
    content: canonical.content.map((block) => ({ ...block })),
    isError: canonical.isError,
  });
}

export function boundedResult(tool: ToolName, envelope: unknown, budget: number): CallToolResult {
  try {
    const result = sdkResult(tool, envelope);
    if (Buffer.byteLength(JSON.stringify(result), "utf8") <= budget) return result;
    return sdkResult(tool, failure("result_too_large"));
  } catch {
    // Fixed fallback is valid and fits the minimum; never recurse over a fault.
    return sdkResult(tool, failure("internal_error"));
  }
}
