/**
 * T08-S1 strict version-1 startup schemas: operator config plus private
 * binding descriptor.
 *
 * All nonoptional fields are required; unknown keys are rejected at every
 * schema object level. `writesEnabled` omitted means false and only a
 * strict boolean is accepted. Transport budget omissions receive accepted
 * T05 defaults via the authoritative T05 factory, which also enforces
 * value/range/interfield constraints on the exact supplied shape — S1 adds
 * no insecure-origin/test-CA/sender fields. `serviceOrigin` is canonicalized
 * with the accepted canonical-origin gates (HTTPS only in S1) and the
 * descriptor origin must be the identical canonical origin. Roots and the
 * descriptor path are absolute normalized paths; storage/bus UUID/
 * generation rules follow the accepted T04 grammar. Config and descriptor
 * must be separate files outside both storage roots. Every validation
 * failure here throws ReadRuntimeError(configuration_required) with a fixed
 * generic message: malformed/unsafe/incompatible selected metadata is
 * fatal, never "missing", and never exposes excerpts or native detail.
 *
 * This module parses detached JSON records only; it performs no IO.
 */

import path from "node:path";
import { createBackendTransport } from "../http/index.js";
import type { SessionHooks, TransportBudgets } from "../http/index.js";
import { ReadRuntimeError } from "./errors.js";
import { DEFAULT_MAX_TOOL_RESULT_BYTES, isToolResultBudget } from "./protocolBudget.js";

function failConfiguration(): never {
  throw new ReadRuntimeError("configuration_required");
}

const CANONICAL_UUID_RE: RegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
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
  readonly anchorRoot: string;
  readonly secretServiceBusAddress: string;
  readonly timeoutMs: number | undefined;
  readonly descriptorPath: string;
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

function assertUuid(value: unknown): string {
  if (typeof value !== "string" || !CANONICAL_UUID_RE.test(value)) {
    failConfiguration();
  }
  return value;
}

function assertGeneration(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    failConfiguration();
  }
  return value;
}

const VALIDATION_HOOKS: SessionHooks = {
  checkBinding: async (): Promise<void> => undefined,
  selectCredential: async () => null,
  beforeDispatch: async (): Promise<void> => undefined,
  isCurrent: (): boolean => true,
};

/**
 * Validate the supplied budgets shape with the authoritative T05 factory
 * (unknown fields, coercion, and range/interfield violations reject there)
 * and return a detached copy for the lifecycle transport configuration.
 */
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
    "bindingDescriptorPath",
    "writesEnabled",
    "transportBudgets",
    "protocol",
  ]);
  if (
    !hasOwn(record, "version") ||
    !hasOwn(record, "serviceOrigin") ||
    !hasOwn(record, "storage") ||
    !hasOwn(record, "bindingDescriptorPath")
  ) {
    failConfiguration();
  }
  if (typeof record["version"] !== "number" || record["version"] !== 1) {
    failConfiguration();
  }
  const canonicalOrigin: string = canonicalizeServiceOrigin(record["serviceOrigin"]);
  const storageRaw: unknown = record["storage"];
  if (!isPlainRecord(storageRaw)) {
    failConfiguration();
  }
  const storage: Record<string, unknown> = storageRaw as Record<string, unknown>;
  requireExactKeys(storage, ["profileRoot", "anchorRoot", "secretServiceBusAddress", "timeoutMs"]);
  if (
    !hasOwn(storage, "profileRoot") ||
    !hasOwn(storage, "anchorRoot") ||
    !hasOwn(storage, "secretServiceBusAddress")
  ) {
    failConfiguration();
  }
  const profileRoot: string = assertAbsoluteNormalizedPath(storage["profileRoot"]);
  const anchorRoot: string = assertAbsoluteNormalizedPath(storage["anchorRoot"]);
  if (
    profileRoot === anchorRoot ||
    isContained(anchorRoot, profileRoot) ||
    isContained(profileRoot, anchorRoot)
  ) {
    failConfiguration();
  }
  const secretServiceBusAddress: string = assertBusAddress(storage["secretServiceBusAddress"]);
  const timeoutMs: number | undefined = assertTimeout(
    hasOwn(storage, "timeoutMs") ? storage["timeoutMs"] : undefined,
  );
  const descriptorPath: string = assertAbsoluteNormalizedPath(record["bindingDescriptorPath"]);
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
    anchorRoot,
    secretServiceBusAddress,
    timeoutMs,
    descriptorPath,
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
  if (
    config.descriptorPath === configPath ||
    isContained(config.profileRoot, configPath) ||
    isContained(config.anchorRoot, configPath) ||
    isContained(config.profileRoot, config.descriptorPath) ||
    isContained(config.anchorRoot, config.descriptorPath)
  ) {
    failConfiguration();
  }
}

export function validateDescriptorRecord(
  record: Record<string, unknown>,
  canonicalOrigin: string,
): ValidatedBinding {
  requireExactKeys(record, ["version", "binding"]);
  if (!hasOwn(record, "version") || !hasOwn(record, "binding")) {
    failConfiguration();
  }
  if (typeof record["version"] !== "number" || record["version"] !== 1) {
    failConfiguration();
  }
  const bindingRaw: unknown = record["binding"];
  if (!isPlainRecord(bindingRaw)) {
    failConfiguration();
  }
  const binding: Record<string, unknown> = bindingRaw as Record<string, unknown>;
  requireExactKeys(binding, ["origin", "accountUuid", "sessionGeneration", "profileGenerationId"]);
  if (
    !hasOwn(binding, "origin") ||
    !hasOwn(binding, "accountUuid") ||
    !hasOwn(binding, "sessionGeneration") ||
    !hasOwn(binding, "profileGenerationId")
  ) {
    failConfiguration();
  }
  if (typeof binding["origin"] !== "string" || binding["origin"] !== canonicalOrigin) {
    failConfiguration();
  }
  const accountRaw: unknown = binding["accountUuid"];
  const accountUuid: string | null = accountRaw === null ? null : assertUuid(accountRaw);
  const sessionGeneration: number = assertGeneration(binding["sessionGeneration"]);
  const profileGenerationId: string = assertUuid(binding["profileGenerationId"]);
  return { origin: canonicalOrigin, accountUuid, sessionGeneration, profileGenerationId };
}

/**
 * Combine an already separated config with its validated binding.
 * Descriptor schema/origin/config incompatibility is
 * configuration_required before any storage opening, while an internally
 * valid same-origin descriptor that later proves stale versus the durable
 * T04 binding fails at storage opening instead (recovery_unavailable),
 * with no automatic repair.
 */
export function combineStartup(
  config: ValidatedConfig,
  binding: ValidatedBinding,
): ValidatedStartup {
  return {
    canonicalOrigin: config.canonicalOrigin,
    profileRoot: config.profileRoot,
    anchorRoot: config.anchorRoot,
    secretServiceBusAddress: config.secretServiceBusAddress,
    timeoutMs: config.timeoutMs,
    descriptorPath: config.descriptorPath,
    writesEnabled: config.writesEnabled,
    maxToolResultBytes: config.maxToolResultBytes,
    budgets: config.budgets,
    binding,
  };
}
