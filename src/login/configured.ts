/** Explicit trusted setup/login/recovery. Configured production paths have no overrides. */
import path from "node:path";
import { randomUUID } from "node:crypto";
import { bindingsEqual, copyByteView } from "../auth/validate.js";
import { decodeLifecycleVaultBytes } from "../auth/vault.js";
import { loadProtectedFile, parseStrictMetadataJson } from "../runtime/files.js";
import { isStorageError, openProfile, provisionProfile } from "../storage/index.js";
import type { ProfileSession, StorageBinding } from "../storage/index.js";
import { LoginError, isLoginError } from "./errors.js";
import { openLoginMetadata } from "./metadata.js";
import type { LoginMetadata, LoginReceipt } from "./metadata.js";
import { decodeLoginEnvelope, exactRecord, validateSettings } from "./records.js";
import { DEFAULT_TRANSPORT_BUDGETS } from "../http/index.js";
import { openLoginTransaction } from "./transaction.js";
import type { LoginTransaction } from "./transaction.js";
import { startBrowserLoginHelper } from "./browser.js";
import type { BrowserLoginHelper } from "./browser.js";
import type { LoginSettings } from "./records.js";
import { assertSignal } from "../auth/validate.js";

export interface LoginProfileOptions {
  readonly configPath: string;
}
export interface ConfiguredLoginOptions extends LoginProfileOptions {
  readonly loginConfigPath: string;
}

function configPathFrom(options: unknown, extra: readonly string[] = []): Record<string, unknown> {
  try {
    const record = exactRecord(options, ["configPath", ...extra]);
    for (const value of Object.values(record)) {
      if (
        typeof value !== "string" ||
        !path.posix.isAbsolute(value) ||
        path.posix.normalize(value) !== value ||
        value === "/" ||
        [...value].some((unit) => unit.charCodeAt(0) <= 31 || unit.charCodeAt(0) === 127)
      )
        throw new LoginError("invalid_arguments");
    }
    return record;
  } catch {
    throw new LoginError("invalid_arguments");
  }
}

function storageRequest(metadata: LoginMetadata) {
  const c = metadata.config;
  return {
    profileRoot: c.profileRoot,
    anchorRoot: c.anchorRoot,
    secretServiceBusAddress: c.secretServiceBusAddress,
    ...(c.timeoutMs === undefined ? {} : { timeoutMs: c.timeoutMs }),
  };
}

async function closeOwner(profile: ProfileSession | undefined): Promise<void> {
  if (profile === undefined) return;
  try {
    await profile.close();
  } catch {
    throw new LoginError("recovery_required");
  }
}

async function guarded<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (isLoginError(error)) throw error;
    throw new LoginError("recovery_required");
  }
}

export async function setupLoginProfile(options: LoginProfileOptions): Promise<StorageBinding> {
  const fields = configPathFrom(options);
  return guarded(async () => {
    const metadata = await openLoginMetadata(fields["configPath"] as string);
    if ((await metadata.readReceipt()) !== null || (await metadata.readDescriptor()) !== null)
      throw new LoginError("recovery_required");
    const binding: StorageBinding = Object.freeze({
      origin: metadata.config.canonicalOrigin,
      accountUuid: null,
      sessionGeneration: 0,
      profileGenerationId: randomUUID(),
    });
    const receipt: LoginReceipt = Object.freeze({
      version: 1,
      kind: "provision",
      transitionId: randomUUID(),
      from: null,
      to: binding,
    });
    await metadata.prepareReceipt(receipt);
    let profile: ProfileSession | undefined;
    try {
      profile = await provisionProfile({
        ...storageRequest(metadata),
        origin: binding.origin,
        profileGenerationId: binding.profileGenerationId,
      });
      if (
        !bindingsEqual(profile.binding, binding) ||
        (await profile.readVaultBytes()).byteLength !== 0
      )
        throw new LoginError("recovery_required");
      await metadata.publishDescriptor(null, binding);
      await metadata.removeReceipt(receipt);
    } finally {
      await closeOwner(profile);
    }
    return binding;
  });
}

async function captureConfiguredLogin(options: ConfiguredLoginOptions): Promise<{
  readonly transaction: LoginTransaction;
  readonly settings: LoginSettings;
  readonly maxRequestBytes: number;
}> {
  const fields = configPathFrom(options, ["loginConfigPath"]);
  return guarded(async () => {
    const configPath = fields["configPath"] as string;
    const loginPath = fields["loginConfigPath"] as string;
    const metadata = await openLoginMetadata(configPath);
    const c = metadata.config;
    const contained = (root: string): boolean =>
      loginPath === root || loginPath.startsWith(`${root}/`);
    if (
      [configPath, c.descriptorPath, `${c.descriptorPath}.pending`].includes(loginPath) ||
      contained(c.profileRoot) ||
      contained(c.anchorRoot)
    )
      throw new LoginError("configuration_required");
    let settings;
    try {
      const loaded = await loadProtectedFile(loginPath, 65536);
      if (loaded.status !== "ok") throw new LoginError("configuration_required");
      settings = validateSettings(parseStrictMetadataJson(loaded.bytes));
    } catch {
      throw new LoginError("configuration_required");
    }
    if ((await metadata.readReceipt()) !== null) throw new LoginError("recovery_required");
    const binding = await metadata.readDescriptor();
    if (binding === null) throw new LoginError("configuration_required");
    const profile = await openProfile({ ...storageRequest(metadata), expectedBinding: binding });
    let transaction: LoginTransaction;
    try {
      transaction = await openLoginTransaction({
        profile,
        metadata,
        settings,
        transportConfig: {
          origin: c.canonicalOrigin,
          ...(c.budgets === undefined ? {} : { budgets: c.budgets }),
        },
      });
    } catch (error) {
      await closeOwner(profile);
      throw error;
    }
    let closing: Promise<void> | null = null;
    const owned: LoginTransaction = Object.freeze({
      ...transaction,
      close: () => {
        closing ??= (async () => {
          try {
            await transaction.close();
          } finally {
            await closeOwner(profile);
          }
        })();
        return closing;
      },
    });
    return Object.freeze({
      transaction: owned,
      settings,
      maxRequestBytes: c.budgets?.maxRequestBytes ?? DEFAULT_TRANSPORT_BUDGETS.maxRequestBytes,
    });
  });
}

export async function openConfiguredLoginTransaction(
  options: ConfiguredLoginOptions,
): Promise<LoginTransaction> {
  return (await captureConfiguredLogin(options)).transaction;
}

/** One capture of trusted settings feeds both durable exchange and browser page. */
export async function openConfiguredBrowserLoginHelper(
  options: ConfiguredLoginOptions,
  signal: AbortSignal,
): Promise<BrowserLoginHelper> {
  try {
    assertSignal(signal);
  } catch {
    throw new LoginError("invalid_arguments");
  }
  const captured = await captureConfiguredLogin(options);
  try {
    return await startBrowserLoginHelper({ ...captured, signal });
  } catch (error) {
    await captured.transaction.close();
    throw isLoginError(error) ? error : new LoginError("recovery_required");
  }
}

export async function recoverLoginProfile(options: LoginProfileOptions): Promise<StorageBinding> {
  const fields = configPathFrom(options);
  return guarded(async () => {
    const metadata = await openLoginMetadata(fields["configPath"] as string);
    const receipt = await metadata.readReceipt();
    if (receipt === null) throw new LoginError("recovery_required");
    const descriptor = await metadata.readDescriptor();
    const isCandidate = (b: StorageBinding | null): boolean =>
      b === null
        ? receipt.from === null
        : bindingsEqual(b, receipt.to) || (receipt.from !== null && bindingsEqual(b, receipt.from));
    if (!isCandidate(descriptor)) throw new LoginError("recovery_required");
    let profile: ProfileSession | undefined;
    let verified: StorageBinding = receipt.to;
    try {
      try {
        profile = await openProfile({ ...storageRequest(metadata), expectedBinding: receipt.to });
      } catch (error) {
        if (
          !isStorageError(error) ||
          !["binding_mismatch", "generation_mismatch"].includes(error.code) ||
          receipt.from === null
        )
          throw new LoginError("recovery_required");
        verified = receipt.from;
        profile = await openProfile({ ...storageRequest(metadata), expectedBinding: receipt.from });
      }
      const bytes = copyByteView(await profile.readVaultBytes());
      if (!bindingsEqual(profile.binding, verified)) throw new LoginError("recovery_required");
      if (bindingsEqual(verified, receipt.to)) {
        if (receipt.kind === "provision") {
          if (bytes.byteLength !== 0) throw new LoginError("recovery_required");
        } else {
          const record = parseStrictMetadataJson(bytes);
          if (record["version"] !== 3 || decodeLifecycleVaultBytes(bytes, verified).grant === null)
            throw new LoginError("recovery_required");
        }
      } else {
        decodeLoginEnvelope(
          bytes,
          verified,
          metadata.config.budgets?.maxRequestBytes ?? DEFAULT_TRANSPORT_BUDGETS.maxRequestBytes,
        );
      }
      // Recheck exact receipt after ownership acquisition before metadata mutation.
      const liveReceipt = await metadata.readReceipt();
      if (liveReceipt === null || JSON.stringify(liveReceipt) !== JSON.stringify(receipt))
        throw new LoginError("recovery_required");
      await metadata.publishDescriptor(descriptor, verified);
      await metadata.removeReceipt(receipt);
      return Object.freeze({ ...verified });
    } finally {
      await closeOwner(profile);
    }
  });
}
