/**
 * T08-S2 portable seven-tool adapter. Import is inert; no stdio/process entry.
 * The adapter owns its transferred runtime and one SDK transport lifecycle.
 */
export { createReadToolServer, openConfiguredReadToolServer } from "./adapter.js";
export type {
  ReadToolServerOptions,
  ConfiguredReadToolServerOptions,
  ReadToolServer,
} from "./adapter.js";
export { ReadToolServerError, isReadToolServerError } from "./errors.js";
export type { ReadToolServerErrorCode } from "./errors.js";
export { DEFAULT_MAX_TOOL_RESULT_BYTES } from "../runtime/protocolBudget.js";
