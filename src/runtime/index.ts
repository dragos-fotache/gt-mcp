/**
 * Trusted read-runtime public entry. Private snapshot composition is shared
 * with the protocol factory; the S1 public exports and behavior are unchanged.
 */
export { openReadRuntime, ReadRuntimeError, isReadRuntimeError } from "./read.js";
export type {
  ReadRuntimeOptions,
  ReadEnvelope,
  ReadRuntime,
  ReadRuntimeErrorCode,
} from "./read.js";
