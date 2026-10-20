/** Validate canonical envelopes, remove runtime presentation text, then budget the whole result. */
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { makeToolResult } from "../domain/index.js";
import type { ToolName, ToolResultEnvelope } from "../domain/index.js";
import type { ToolErrorObject } from "../domain/index.js";
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

const CREATION_CODES = new Set([...Object.keys(RETRYABLE), "concurrent_modification"]);
const CONTEXT_KEYS = ["routineId", "lastConfirmedStep", "outcomeUnknown"] as const;
const DISABLED_MESSAGE = "Routine creation is disabled in the operator configuration.";

/** Validate before taking any history; malformed/private results cannot decorate fallbacks. */
export function creationEnvelope(value: unknown): ToolResultEnvelope {
  const envelope = makeToolResult("create_routine", value).structuredContent;
  if (envelope.ok) return envelope;
  const error = envelope.error;
  if (
    !CREATION_CODES.has(error.code) ||
    error.retryable !== false ||
    (error.retryAfterSeconds !== undefined && !Number.isSafeInteger(error.retryAfterSeconds)) ||
    (error.backendErrorCode !== undefined && !/^[a-z][a-z0-9_]*$/.test(error.backendErrorCode)) ||
    (CONTEXT_KEYS.some((key) => error[key] !== undefined) &&
      CONTEXT_KEYS.some((key) => error[key] === undefined))
  )
    throw new Error("Invalid creation envelope.");
  const safe = { ...error };
  delete safe.message;
  return {
    ok: false,
    error: {
      ...safe,
      ...(error.code === "configuration_required" ? { message: DISABLED_MESSAGE } : {}),
    },
  };
}

/** Only a fully validated runtime receipt/error establishes current-call context. */
export function creationFailure(
  envelope: ToolResultEnvelope,
  code: "operation_interrupted" | "result_too_large" | "internal_error",
): ToolResultEnvelope {
  let history: Partial<ToolErrorObject> = {};
  if (envelope.ok) {
    // Callers pass the create_routine validator's receipt, never arbitrary tool data.
    const receipt = makeToolResult("create_routine", envelope).structuredContent;
    if (receipt.ok && "routineId" in receipt.data) {
      history = {
        routineId: receipt.data.routineId as string,
        lastConfirmedStep: "save",
        outcomeUnknown: false,
      };
    }
  } else {
    const { routineId, lastConfirmedStep, outcomeUnknown } = envelope.error;
    if (
      routineId !== undefined &&
      lastConfirmedStep !== undefined &&
      outcomeUnknown !== undefined
    ) {
      history = { routineId, lastConfirmedStep, outcomeUnknown };
    }
  }
  return { ok: false, error: { code, retryable: false, ...history } };
}

export function failure(code: string, message?: string, tool?: ToolName): ToolResultEnvelope {
  return {
    ok: false,
    error: {
      code,
      retryable: tool !== "create_routine" && RETRYABLE[code] === true,
      ...(message === undefined ? {} : { message }),
    },
  };
}

export function thrownReadFailure(error: unknown, tool?: ToolName): ToolResultEnvelope {
  return failure(isReadRuntimeError(error) ? error.code : "internal_error", undefined, tool);
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
    return sdkResult(tool, failure("internal_error", undefined, tool));
  }
}

export function boundedCreationResult(value: unknown, budget: number): CallToolResult {
  let envelope: ToolResultEnvelope;
  try {
    envelope = creationEnvelope(value);
  } catch {
    return sdkResult("create_routine", failure("internal_error", undefined, "create_routine"));
  }
  try {
    const result = sdkResult("create_routine", envelope);
    if (Buffer.byteLength(JSON.stringify(result), "utf8") <= budget) return result;
    return sdkResult("create_routine", creationFailure(envelope, "result_too_large"));
  } catch {
    return sdkResult("create_routine", creationFailure(envelope, "internal_error"));
  }
}
