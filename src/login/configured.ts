/** Explicit trusted setup/login/recovery. Configured production paths have no overrides. */
import path from "node:path";
import { copyByteView } from "../auth/validate.js";
import { loadProtectedFile, parseStrictMetadataJson } from "../runtime/files.js";
import { openProfile, provisionProfile } from "../storage/index.js";
import type { ProfileSession, StorageBinding } from "../storage/index.js";
import { LoginError, isLoginError } from "./errors.js";
import { loadLoginConfiguration } from "./configuration.js";
import type { ValidatedConfig } from "../runtime/config.js";
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

export function configPathFrom(
  options: unknown,
  extra: readonly string[] = [],
): Record<string, unknown> {
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

export function storageRequest(c: ValidatedConfig) {
  return {
    profileRoot: c.profileRoot,
    origin: c.canonicalOrigin,
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
    const config = await loadLoginConfiguration(fields["configPath"] as string);
    const profile = await provisionProfile(storageRequest(config));
    try {
      return Object.freeze({ ...profile.binding });
    } finally {
      await closeOwner(profile);
    }
  });
}

export async function loadConfiguredLoginSettings(
  c: ValidatedConfig,
  configPath: string,
  loginPath: string,
): Promise<LoginSettings> {
  const contained = (root: string): boolean =>
    loginPath === root || loginPath.startsWith(`${root}/`);
  if (loginPath === configPath || contained(c.profileRoot))
    throw new LoginError("configuration_required");
  let settings;
  try {
    const loaded = await loadProtectedFile(loginPath, 65536);
    if (loaded.status !== "ok") throw new LoginError("configuration_required");
    settings = validateSettings(parseStrictMetadataJson(loaded.bytes));
  } catch {
    throw new LoginError("configuration_required");
  }
  return settings;
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
    const c = await loadLoginConfiguration(configPath);
    const settings = await loadConfiguredLoginSettings(c, configPath, loginPath);
    const profile = await openProfile(storageRequest(c));
    let transaction: LoginTransaction;
    try {
      transaction = await openLoginTransaction({
        profile,
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
    const config = await loadLoginConfiguration(fields["configPath"] as string);
    const profile = await openProfile(storageRequest(config));
    try {
      const bytes = copyByteView(await profile.readVaultBytes());
      try {
        const pending = decodeLoginEnvelope(
          bytes,
          profile.binding,
          config.budgets?.maxRequestBytes ?? DEFAULT_TRANSPORT_BUDGETS.maxRequestBytes,
        );
        if (pending !== null) throw new LoginError("recovery_required");
        return Object.freeze({ ...profile.binding });
      } finally {
        bytes.fill(0);
      }
    } finally {
      await closeOwner(profile);
    }
  });
}
