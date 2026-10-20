import { isSessionError } from "../auth/index.js";
import { CodecError } from "../domain/index.js";
import { isTransportError } from "../http/index.js";
import { isStorageError } from "../storage/index.js";
import { CreationFault } from "./boundary.js";
import type { CreationContext, CreationError } from "./types.js";

/** Current invocation only; never retain native messages, IDs or error objects. */
export function classifyCreationFailure(
  failure: unknown,
  context?: CreationContext,
): CreationError {
  let code = "internal_error";
  let extra = {};
  let outcomeUnknown = context?.outcomeUnknown ?? false;
  if (isTransportError(failure)) {
    code = failure.code;
    // The transport knows whether a rejected/failed HTTP mutation could commit.
    if (context?.outcomeUnknown) outcomeUnknown = failure.outcomeUnknown;
    extra = {
      ...(failure.backendErrorCode === null ? {} : { backendErrorCode: failure.backendErrorCode }),
      ...(failure.retryAfterSeconds === null
        ? {}
        : { retryAfterSeconds: failure.retryAfterSeconds }),
    };
  } else if (isSessionError(failure)) {
    code = [
      "authentication_required",
      "reauthentication_required",
      "operation_interrupted",
      "invalid_arguments",
    ].includes(failure.code)
      ? failure.code
      : "recovery_unavailable";
  } else if (isStorageError(failure)) code = "recovery_unavailable";
  else if (failure instanceof CreationFault) code = failure.code;
  else if (failure instanceof CodecError) code = "invalid_arguments";
  return {
    code,
    retryable: false,
    ...extra,
    ...(context === undefined ? {} : { ...context, outcomeUnknown }),
  };
}
