/** Strict config2 startup schema. Config stays outside the selected private profile.
 * No descriptor/anchor selectors, legacy mode or ambient configuration overrides. */

import path from "node:path";
import { createBackendTransport } from "../http/index.js";
import type { SessionHooks, TransportBudgets } from "../http/index.js";
import { ReadRuntimeError } from "./errors.js";
import { DEFAULT_MAX_TOOL_RESULT_BYTES, isToolResultBudget } from "./protocolBudget.js";

function failConfiguration(): never {
  throw new ReadRuntimeError("configuration_required");
}

const BUS_GUID_RE: RegExp = /^[0-9a-f]{32}$/;
const BUS_ADDRESS_RE: RegExp = /^unix:(path|socket)=([^,;]+?)(?:,guid=([0-9a-fA-F]+))?$/;

const MIN_TIMEOUT_MS = 1;
const MAX_TIMEOUT_MS = 15000;

const BUDGET_KEYS: ReadonlyArray<keyof TransportBudgets> = [
  "maxRequestBytes",
  "maxRequestTargetBytes",
  "maxResponseBytes",
  "maxProjectedResultBytes",
  "maxHeadBytes",
  "maxHeaderCount",
  "perAttemptTimeoutMs",
  "totalDeadlineMs",
  "maxAttempts",
  "baseRetryDelayMs",
  "maxRetryDelayMs",
];

export interface ValidatedBinding {
  readonly origin: string;
  readonly accountUuid: string | null;
  readonly sessionGeneration: number;
  readonly profileGenerationId: string;
}

export interface ValidatedConfig {
  readonly canonicalOrigin: string;
  readonly profileRoot: string;
  readonly secretServiceBusAddress: string;
  readonly timeoutMs: number | undefined;
  readonly writesEnabled: boolean;
  readonly maxToolResultBytes: number;
  readonly budgets: Partial<TransportBudgets> | undefined;
}

export interface ValidatedStartup extends ValidatedConfig {
  readonly binding: ValidatedBinding;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function requireExactKeys(record: Record<string, unknown>, allowed: ReadonlyArray<string>): void {
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) {
      failConfiguration();
    }
  }
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function hasControlOrWhitespace(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    const unit: number | undefined = text.charCodeAt(index);
    if (unit === undefined) {
      failConfiguration();
    }
    const code: number = unit as number;
    if (code <= 0x20 || code === 0x7f || (code >= 0x80 && code <= 0x9f)) {
      return true;
    }
  }
  return false;
}

function rawBareHost(authority: string): string {
  if (authority.startsWith("[")) {
    const end: number = authority.indexOf("]");
    if (end < 0) {
      failConfiguration();
    }
    const tail: string = authority.slice(end + 1);
    if (tail !== "" && !/^:[0-9]+$/.test(tail)) {
      failConfiguration();
    }
    return authority.slice(1, end);
  }
  const colon: number = authority.indexOf(":");
  if (colon >= 0 && authority.indexOf(":", colon + 1) >= 0) {
    failConfiguration();
  }
  return colon < 0 ? authority : authority.slice(0, colon);
}

/** Strict canonical HTTPS origin (S1 accepts no insecure/test-CA origin). */
function canonicalizeServiceOrigin(raw: unknown): string {
  if (typeof raw !== "string" || raw.length === 0) {
    failConfiguration();
  }
  const origin: string = raw;
  const schemeEnd: number = origin.indexOf("://");
  if (schemeEnd < 0) {
    failConfiguration();
  }
  const scheme: string = origin.slice(0, schemeEnd);
  const rest: string = origin.slice(schemeEnd + 3);
  if (scheme !== "https") {
    failConfiguration();
  }
  if (
    rest.length === 0 ||
    rest.includes("@") ||
    rest.includes("\\") ||
    rest.includes("?") ||
    rest.includes("#") ||
    hasControlOrWhitespace(origin)
  ) {
    failConfiguration();
  }
  let authority: string = rest;
  if (rest.endsWith("/")) {
    if (rest.length === 1 || rest.slice(0, -1).includes("/")) {
      failConfiguration();
    }
    authority = rest.slice(0, -1);
  } else if (rest.includes("/")) {
    failConfiguration();
  }
  if (authority.length === 0 || authority.endsWith(":")) {
    failConfiguration();
  }
  rawBareHost(authority);
  let parsed: URL;
  try {
    parsed = new URL(`https://${authority}`);
  } catch {
    failConfiguration();
  }
  const url: URL = parsed as URL;
  if (
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    failConfiguration();
  }
  if (url.hostname === "" || url.hostname.endsWith(".")) {
    failConfiguration();
  }
  if (url.port !== "") {
    if (!/^[1-9][0-9]*$/.test(url.port)) {
      failConfiguration();
    }
    const portNumber: number = Number(url.port);
    if (!Number.isSafeInteger(portNumber) || portNumber > 65535) {
      failConfiguration();
    }
  }
  return url.origin;
}

function assertAbsoluteNormalizedPath(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    failConfiguration();
  }
  const candidate: string = value;
  if (!path.posix.isAbsolute(candidate) || path.posix.normalize(candidate) !== candidate) {
    failConfiguration();
  }
  for (const segment of candidate.split("/")) {
    if (segment === "." || segment === "..") {
      failConfiguration();
    }
  }
  return candidate;
}

function assertBusAddress(value: unknown): string {
  if (typeof value !== "string") {
    failConfiguration();
  }
  const address: string = value;
  const match: RegExpMatchArray | null = BUS_ADDRESS_RE.exec(address);
  if (match === null || match[2] === undefined) {
    failConfiguration();
  }
  const socketPath: string = match[2];
  if (!path.posix.isAbsolute(socketPath)) {
    failConfiguration();
  }
  const guid: string | undefined = match[3];
  if (guid !== undefined && !BUS_GUID_RE.test(guid)) {
    failConfiguration();
  }
  return address;
}

function assertTimeout(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    failConfiguration();
  }
  const timeout: number = value;
  if (timeout < MIN_TIMEOUT_MS || timeout > MAX_TIMEOUT_MS) {
    failConfiguration();
  }
  return timeout;
}

const VALIDATION_HOOKS: SessionHooks = {
  checkBinding: async (): Promise<void> => undefined,
  selectCredential: async () => null,
  beforeDispatch: async (): Promise<void> => undefined,
  isCurrent: (): boolean => true,
};
function assertBudgets(
  value: unknown,
  canonicalOrigin: string,
): Partial<TransportBudgets> | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isPlainRecord(value)) {
    failConfiguration();
  }
  const record: Record<string, unknown> = value;
  requireExactKeys(record, BUDGET_KEYS as ReadonlyArray<string>);
  const copy: Record<string, unknown> = {};
  for (const key of BUDGET_KEYS) {
    if (hasOwn(record, key)) {
      copy[key] = record[key];
    }
  }
  try {
    createBackendTransport(
      { origin: canonicalOrigin, budgets: copy as Partial<TransportBudgets> },
      { session: VALIDATION_HOOKS },
    );
  } catch {
    failConfiguration();
  }
  return copy as Partial<TransportBudgets>;
}

/**
 * Validate the operator config record: complete schema, canonical origin,
 * T05 budget constraints, roots, bus, and descriptor selector shape. No
 * descriptor file access happens before this succeeds.
 */
export function validateConfigRecord(record: Record<string, unknown>): ValidatedConfig {
  requireExactKeys(record, [
    "version",
    "serviceOrigin",
    "storage",
    "writesEnabled",
    "transportBudgets",
    "protocol",
  ]);
  if (
    !hasOwn(record, "version") ||
    !hasOwn(record, "serviceOrigin") ||
    !hasOwn(record, "storage")
  ) {
    failConfiguration();
  }
  if (typeof record["version"] !== "number" || record["version"] !== 2) {
    failConfiguration();
  }
  const canonicalOrigin: string = canonicalizeServiceOrigin(record["serviceOrigin"]);
  const storageRaw: unknown = record["storage"];
  if (!isPlainRecord(storageRaw)) {
    failConfiguration();
  }
  const storage: Record<string, unknown> = storageRaw as Record<string, unknown>;
  requireExactKeys(storage, ["profileRoot", "secretServiceBusAddress", "timeoutMs"]);
  if (!hasOwn(storage, "profileRoot") || !hasOwn(storage, "secretServiceBusAddress")) {
    failConfiguration();
  }
  const profileRoot: string = assertAbsoluteNormalizedPath(storage["profileRoot"]);
  const secretServiceBusAddress: string = assertBusAddress(storage["secretServiceBusAddress"]);
  const timeoutMs: number | undefined = assertTimeout(
    hasOwn(storage, "timeoutMs") ? storage["timeoutMs"] : undefined,
  );
  const writesRaw: unknown = hasOwn(record, "writesEnabled") ? record["writesEnabled"] : undefined;
  if (writesRaw !== undefined && typeof writesRaw !== "boolean") {
    failConfiguration();
  }
  const writesEnabled: boolean = writesRaw === true;
  const budgets: Partial<TransportBudgets> | undefined = assertBudgets(
    hasOwn(record, "transportBudgets") ? record["transportBudgets"] : undefined,
    canonicalOrigin,
  );
  let maxToolResultBytes: number = DEFAULT_MAX_TOOL_RESULT_BYTES;
  if (hasOwn(record, "protocol")) {
    const protocol: unknown = record["protocol"];
    if (!isPlainRecord(protocol)) {
      failConfiguration();
    }
    requireExactKeys(protocol, ["maxToolResultBytes"]);
    if (hasOwn(protocol, "maxToolResultBytes")) {
      const budget: unknown = protocol["maxToolResultBytes"];
      if (!isToolResultBudget(budget)) {
        failConfiguration();
      }
      maxToolResultBytes = budget;
    }
  }
  return {
    canonicalOrigin,
    profileRoot,
    secretServiceBusAddress,
    timeoutMs,
    writesEnabled,
    maxToolResultBytes,
    budgets,
  };
}

function isContained(container: string, candidate: string): boolean {
  if (candidate === container) {
    return true;
  }
  if (container === "/") {
    return candidate.startsWith("/") && candidate !== "/";
  }
  return candidate.startsWith(`${container}/`);
}

/**
 * Validate config/descriptor file separation: the config and descriptor
 * must be separate files outside both storage roots, so an invalid
 * metadata selector can never direct reads at operation evidence or other
 * private files. Runs after config schema validation and before any
 * descriptor file access.
 */
export function assertFileSeparation(config: ValidatedConfig, configPath: string): void {
  if (isContained(config.profileRoot, configPath)) failConfiguration();
}
