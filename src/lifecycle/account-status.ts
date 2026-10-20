/** Trusted foreground accountStatus proof. No import-time IO or durable Google-token journal. */
import { randomUUID } from "node:crypto";
import {
  assertBinding,
  assertSignal,
  bindingsEqual,
  captureEntries,
  copyByteView,
  expiryToMs,
  isCanonicalUuid,
} from "../auth/validate.js";
import {
  createBackendTransport,
  DEFAULT_TRANSPORT_BUDGETS,
  isTransportError,
} from "../http/index.js";
import type { TrustedTransportConfig, SessionHooks } from "../http/index.js";
import { LoginError, isLoginError } from "../login/errors.js";
import { configPathFrom, loadConfiguredLoginSettings } from "../login/configured.js";
import type { ConfiguredLoginOptions } from "../login/configured.js";
import { loadLoginConfiguration } from "../login/configuration.js";
import { storageRequest } from "../login/configured.js";
import { exactRecord, isOpaqueGoogleToken, validateSettings } from "../login/records.js";
import type { LoginSettings } from "../login/records.js";
import type { LoginChallenge } from "../login/transaction.js";
import { startAccountStatusBrowserHelper } from "../login/browser.js";
import type { AccountStatusBrowserHelper } from "../login/browser.js";
import { parseStrictMetadataJson } from "../runtime/files.js";
import { isStorageError, openProfile } from "../storage/index.js";
import type { ProfileSession, StorageBinding } from "../storage/types.js";
import { removeOwnedProfile } from "./owned-removal.js";

export interface AccountStatusOutcome {
  readonly state: "active" | "deleted";
}
export interface AccountStatusTransaction {
  readonly binding: StorageBinding;
  start(signal: AbortSignal): Promise<LoginChallenge>;
  submit(attemptId: string, idToken: string, signal: AbortSignal): Promise<AccountStatusOutcome>;
  cancel(): Promise<void>;
  close(): Promise<void>;
}
export interface AccountStatusTransactionOptions {
  readonly profile: ProfileSession;
  readonly transportConfig: TrustedTransportConfig;
  readonly settings: LoginSettings;
}

interface VerifiedDeletion {
  readonly owner: ProfileSession;
  readonly binding: StorageBinding;
  readonly verify: (signal: AbortSignal) => Promise<void>;
}
// The mint remains module-private; public results never carry this authority.
const DELETIONS = new WeakMap<object, VerifiedDeletion>();

function safe(error: unknown): LoginError {
  if (isLoginError(error)) return error;
  if (isStorageError(error)) return new LoginError("recovery_required");
  if (isTransportError(error))
    return new LoginError(
      error.code === "invalid_arguments" ? "invalid_arguments" : "account_status_failed",
    );
  return new LoginError("recovery_required");
}
function signalFrom(value: unknown): AbortSignal {
  try {
    return assertSignal(value);
  } catch {
    throw new LoginError("invalid_arguments");
  }
}

/** Internal trusted cleanup entry: raw receipts, booleans and copied objects cannot authorize it. */
export async function applyVerifiedAccountDeletion(
  capability: unknown,
  signalInput: AbortSignal,
): Promise<AccountStatusOutcome> {
  const signal = signalFrom(signalInput);
  const verified =
    typeof capability === "object" && capability !== null ? DELETIONS.get(capability) : undefined;
  if (verified === undefined) throw new LoginError("invalid_arguments");
  DELETIONS.delete(capability as object);
  try {
    await verified.verify(signal);
    await removeOwnedProfile(verified.owner, verified.binding, signal);
    return Object.freeze({ state: "deleted" });
  } catch (error) {
    throw safe(error);
  }
}

function responseState(bytes: Uint8Array, source: StorageBinding): "active" | "deleted" {
  try {
    const parsed = parseStrictMetadataJson(bytes);
    const deleted = parsed["state"] === "deleted";
    const record = exactRecord(
      parsed,
      deleted ? ["accountId", "state", "deletedAt", "purgeBy"] : ["accountId", "state"],
    );
    if (
      !isCanonicalUuid(record["accountId"]) ||
      record["accountId"] !== source.accountUuid ||
      !["active", "deleted"].includes(record["state"] as string)
    )
      throw new LoginError("account_status_failed");
    if (deleted) {
      const at = expiryToMs(record["deletedAt"]),
        by = expiryToMs(record["purgeBy"]);
      if (at === null || by === null || by - at !== 86400000)
        throw new LoginError("account_status_failed");
    }
    return deleted ? "deleted" : "active";
  } catch {
    throw new LoginError("account_status_failed");
  }
}

/** Trusted composition over a caller-owned actual production profile; never closes that owner. */
export async function openAccountStatusTransaction(
  options: AccountStatusTransactionOptions,
): Promise<AccountStatusTransaction> {
  try {
    return await open(options);
  } catch (error) {
    throw safe(error);
  }
}
async function open(options: AccountStatusTransactionOptions): Promise<AccountStatusTransaction> {
  let fields: Record<string, unknown>;
  let source: StorageBinding;
  try {
    fields = exactRecord(options, ["profile", "transportConfig", "settings"]);
    validateSettings(fields["settings"]);
    const candidate = fields["profile"] as ProfileSession;
    if (
      typeof candidate !== "object" ||
      candidate === null ||
      typeof candidate.readVaultBytes !== "function" ||
      typeof candidate.removeProfile !== "function"
    )
      throw new LoginError("invalid_arguments");
    source = Object.freeze(assertBinding(candidate.binding));
  } catch {
    throw new LoginError("invalid_arguments");
  }
  const profile = fields["profile"] as ProfileSession;
  if (source.accountUuid === null) throw new LoginError("login_required");
  let config: TrustedTransportConfig;
  try {
    const captured = Object.fromEntries(captureEntries(fields["transportConfig"]));
    config = {
      ...captured,
      ...(captured["budgets"] === undefined
        ? {}
        : { budgets: Object.fromEntries(captureEntries(captured["budgets"])) }),
      ...(captured["testCaPem"] === undefined
        ? {}
        : { testCaPem: copyByteView(captured["testCaPem"]) }),
    } as unknown as TrustedTransportConfig;
  } catch {
    throw new LoginError("invalid_arguments");
  }
  if (config.origin !== source.origin) throw new LoginError("configuration_required");
  let stage: "idle" | "starting" | "ready" | "submitting" | "settled" = "idle";
  let challenge: LoginChallenge | null = null;
  let active: Promise<unknown> | null = null;
  let controller: AbortController | null = null;
  let cancelled = false;
  let closed = false;
  let poisoned = false;
  const check = (signal: AbortSignal): void => {
    if (signal.aborted || cancelled || closed) throw new LoginError("operation_interrupted");
  };
  const verify = async (signal: AbortSignal): Promise<void> => {
    check(signal);
    try {
      if (!bindingsEqual(assertBinding(profile.binding), source))
        throw new LoginError("recovery_required");
      const bytes = await profile.readVaultBytes();
      bytes.fill(0);
      if (!bindingsEqual(assertBinding(profile.binding), source))
        throw new LoginError("recovery_required");
    } catch {
      poisoned = true;
      throw new LoginError("recovery_required");
    }
    check(signal);
  };
  const hooks: SessionHooks = {
    checkBinding: async (_point, binding, signal) => {
      if (!bindingsEqual(binding, source)) throw new LoginError("operation_interrupted");
      await verify(signal);
    },
    selectCredential: async () => null,
    isCurrent: (binding) =>
      !poisoned && !closed && !cancelled && stage !== "settled" && bindingsEqual(binding, source),
    beforeDispatch: async (_binding, summary, signal) => {
      if (
        summary.attempt !== 1 ||
        (summary.routeLabel !== "auth_challenge" && summary.routeLabel !== "account_status") ||
        (summary.routeLabel === "account_status" && stage !== "submitting")
      )
        throw new LoginError("account_status_failed");
      await verify(signal);
    },
  };
  // Validate the complete supplied config before applying the purpose-specific cap.
  createBackendTransport(config, { session: hooks });
  const transport = createBackendTransport(
    { ...config, budgets: { ...config.budgets, maxAttempts: 1 } },
    { session: hooks },
  );
  await verify(new AbortController().signal);
  const run = <Result>(
    input: AbortSignal,
    action: (signal: AbortSignal) => Promise<Result>,
  ): Promise<Result> => {
    let caller: AbortSignal;
    try {
      caller = signalFrom(input);
      check(caller);
    } catch (error) {
      stage = "settled";
      return Promise.reject(safe(error));
    }
    if (active !== null) return Promise.reject(new LoginError("operation_interrupted"));
    const owned = new AbortController();
    controller = owned;
    const abort = (): void => owned.abort();
    caller.addEventListener("abort", abort, { once: true });
    const work = Promise.resolve()
      .then(() => action(owned.signal))
      .catch((error: unknown) => {
        stage = "settled";
        challenge = null;
        const failure = safe(error);
        if (poisoned || failure.code === "recovery_required")
          throw new LoginError("recovery_required");
        if (owned.signal.aborted || cancelled || closed)
          throw new LoginError("operation_interrupted");
        throw failure;
      })
      .finally(() => {
        caller.removeEventListener("abort", abort);
        active = null;
        controller = null;
      });
    active = work;
    return work;
  };
  const expire = (current: LoginChallenge): void => {
    if (Date.now() >= (expiryToMs(current.expiresAt) ?? -Infinity))
      throw new LoginError("attempt_expired");
  };
  return Object.freeze({
    binding: source,
    start: (signal: AbortSignal) => {
      if (stage !== "idle" || active !== null)
        return Promise.reject(new LoginError("operation_interrupted"));
      stage = "starting";
      return run(signal, async (owned) => {
        const raw = (
          await transport.authChallenge(
            source,
            new TextEncoder().encode('{"purpose":"accountStatus"}'),
            owned,
          )
        ).rawBodyBytes;
        try {
          let r: Record<string, unknown>;
          try {
            r = exactRecord(parseStrictMetadataJson(raw), ["challengeId", "nonce", "expiresAt"]);
          } catch {
            throw new LoginError("account_status_failed");
          }
          if (
            !isCanonicalUuid(r["challengeId"]) ||
            typeof r["nonce"] !== "string" ||
            r["nonce"].length === 0 ||
            expiryToMs(r["expiresAt"]) === null
          )
            throw new LoginError("account_status_failed");
          const fresh = Object.freeze({
            attemptId: randomUUID(),
            challengeId: r["challengeId"],
            nonce: r["nonce"],
            expiresAt: r["expiresAt"] as string,
          });
          expire(fresh);
          check(owned);
          challenge = fresh;
          stage = "ready";
          return fresh;
        } finally {
          raw.fill(0);
        }
      });
    },
    submit: (attemptId: string, idToken: string, signal: AbortSignal) => {
      if (!isCanonicalUuid(attemptId) || !isOpaqueGoogleToken(idToken))
        return Promise.reject(new LoginError("invalid_arguments"));
      if (
        stage !== "ready" ||
        challenge === null ||
        challenge.attemptId !== attemptId ||
        active !== null
      )
        return Promise.reject(new LoginError("operation_interrupted"));
      const admitted = challenge;
      challenge = null;
      stage = "submitting";
      const body = new TextEncoder().encode(
        JSON.stringify({
          accountId: source.accountUuid,
          challengeId: admitted.challengeId,
          idToken,
        }),
      );
      const work = run(signal, async (owned) => {
        expire(admitted);
        check(owned);
        let raw: Uint8Array | undefined;
        try {
          raw = (await transport.accountStatus(source, body, owned)).rawBodyBytes;
          check(owned);
          expire(admitted);
          const state = responseState(raw, source);
          await verify(owned);
          let result: AccountStatusOutcome;
          if (state === "active") result = Object.freeze({ state: "active" });
          else {
            const capability = Object.freeze({});
            DELETIONS.set(capability, { owner: profile, binding: source, verify });
            result = await applyVerifiedAccountDeletion(capability, owned);
          }
          stage = "settled";
          check(owned);
          return result;
        } finally {
          raw?.fill(0);
        }
      });
      return work.finally(() => body.fill(0));
    },
    cancel: async () => {
      cancelled = true;
      challenge = null;
      controller?.abort();
      try {
        await active;
      } catch {
        /* Original caller owns its safe outcome. */
      }
    },
    close: async () => {
      closed = true;
      challenge = null;
      controller?.abort();
      try {
        await active;
      } catch {
        /* No proof is journaled or replayed. */
      }
    },
  });
}

export async function openConfiguredAccountStatusBrowserHelper(
  options: ConfiguredLoginOptions,
  signalInput: AbortSignal,
): Promise<AccountStatusBrowserHelper> {
  const signal = signalFrom(signalInput);
  if (signal.aborted) throw new LoginError("operation_interrupted");
  const fields = configPathFrom(options, ["loginConfigPath"]);
  let profile: ProfileSession | undefined;
  let transaction: AccountStatusTransaction | undefined;
  try {
    const configPath = fields["configPath"] as string;
    const c = await loadLoginConfiguration(configPath);
    const settings: LoginSettings = await loadConfiguredLoginSettings(
      c,
      configPath,
      fields["loginConfigPath"] as string,
    );
    if (signal.aborted) throw new LoginError("operation_interrupted");
    profile = await openProfile(storageRequest(c));
    if (profile.binding.accountUuid === null) throw new LoginError("login_required");
    transaction = await openAccountStatusTransaction({
      profile,
      settings,
      transportConfig: {
        origin: c.canonicalOrigin,
        ...(c.budgets === undefined ? {} : { budgets: c.budgets }),
      },
    });
    const ownedProfile = profile,
      inner = transaction;
    let closing: Promise<void> | null = null;
    const owned: AccountStatusTransaction = Object.freeze({
      ...inner,
      close: () => {
        closing ??= (async () => {
          try {
            await inner.close();
          } finally {
            await ownedProfile.close();
          }
        })();
        return closing;
      },
    });
    return await startAccountStatusBrowserHelper({
      transaction: owned,
      settings,
      maxRequestBytes: c.budgets?.maxRequestBytes ?? DEFAULT_TRANSPORT_BUDGETS.maxRequestBytes,
      signal,
    });
  } catch (error) {
    try {
      await transaction?.close();
      await profile?.close();
    } catch {
      throw new LoginError("recovery_required");
    }
    throw safe(error);
  }
}
