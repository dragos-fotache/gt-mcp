/**
 * Trusted runtime entry. The T15 tool opener adds guarded creation while retaining
 * the read-only opener/capability and existing sanitized error boundary.
 */
export { openReadRuntime, openToolRuntime, ReadRuntimeError, isReadRuntimeError } from "./read.js";
export type {
  ReadRuntimeOptions,
  ReadEnvelope,
  ReadRuntime,
  ToolRuntime,
  ReadRuntimeErrorCode,
} from "./read.js";
