import { randomUUID } from "node:crypto";
import { isSessionError } from "../auth/errors.js";
import {
  assertBinding,
  assertClockMs,
  assertSignal,
  bindingsEqual,
  captureEntries,
  copyByteView,
  expiryToMs,
  isCanonicalUuid,
} from "../auth/validate.js";
import {
  decodeCanonicalBase64,
  decodeLifecycleVaultBytes,
  encodeBodyBase64,
  encodeLifecycleVaultBytes,
  parseServiceGrant,
} from "../auth/vault.js";
import {
  createBackendTransport,
  DEFAULT_TRANSPORT_BUDGETS,
  isTransportError,
} from "../http/index.js";
import type { SessionHooks, TrustedTransportConfig } from "../http/index.js";
import type { ProfileSession, StorageBinding } from "../storage/index.js";
import { parseStrictMetadataJson } from "../runtime/files.js";
import { LoginError, isLoginError } from "./errors.js";
import {
  decodeLoginEnvelope,
  decodePriorVault,
  encodeLoginEnvelope,
  isOpaqueGoogleToken,
  validateSettings,
} from "./records.js";
import type { LoginEnvelope, LoginSettings } from "./records.js";

export interface LoginChallenge {
  readonly attemptId: string;
  readonly challengeId: string;
  readonly nonce: string;
  readonly expiresAt: string;
}

export interface LoginTransactionOptions {
  readonly profile: ProfileSession;
  readonly transportConfig: TrustedTransportConfig;
  readonly settings: LoginSettings;
  readonly clock?: { nowMs(): number };
}

export interface LoginTransaction {
  readonly binding: StorageBinding;
  start(signal: AbortSignal): Promise<LoginChallenge>;
  submit(attemptId: string, idToken: string, signal: AbortSignal): Promise<StorageBinding>;
  resume(signal: AbortSignal): Promise<StorageBinding>;
  cancel(): Promise<void>;
  close(): Promise<void>;
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  return Buffer.from(a).equals(Buffer.from(b));
}

function safe(error: unknown): LoginError {
  if (isLoginError(error)) return error;
  if (isTransportError(error) && error.code === "invalid_arguments")
    return new LoginError("invalid_arguments");
  if (isSessionError(error)) {
    if (error.code === "state_corrupt" || error.code === "state_version_unsupported")
      return new LoginError(error.code);
    if (error.code === "invalid_arguments") return new LoginError("invalid_arguments");
  }
  return new LoginError("recovery_required");
}

/** Opens a trusted composition over a caller-owned T04 owner. No ambient facilities. */
export async function openLoginTransaction(
  options: LoginTransactionOptions,
): Promise<LoginTransaction> {
  try {
    return await open(options);
  } catch (error) {
    throw safe(error);
  }
}

async function open(options: LoginTransactionOptions): Promise<LoginTransaction> {
  const fields = Object.fromEntries(captureEntries(options));
  if (
    Object.keys(fields).some(
      (key) => !["profile", "transportConfig", "settings", "clock"].includes(key),
    )
  )
    throw new LoginError("invalid_arguments");
  const settings = validateSettings(fields["settings"]);
  const profile = fields["profile"] as ProfileSession;
  if (typeof profile !== "object" || profile === null) throw new LoginError("invalid_arguments");
  for (const key of [
    "readVaultBytes",
    "commit",
    "bindAccount",
    "advanceSessionGeneration",
  ] as const) {
    if (typeof profile[key] !== "function") throw new LoginError("invalid_arguments");
  }
  // These are explicitly trusted capabilities; methods retain their receivers.
  const readVault = profile.readVaultBytes.bind(profile);
  const commit = profile.commit.bind(profile);
  const bindAccount = profile.bindAccount.bind(profile);
  const advance = profile.advanceSessionGeneration.bind(profile);
  const source = Object.freeze(assertBinding(profile.binding));
  if (source.accountUuid === null && source.sessionGeneration !== 0)
    throw new LoginError("state_corrupt");
  const configFields = Object.fromEntries(captureEntries(fields["transportConfig"]));
  const config: TrustedTransportConfig = {
    ...configFields,
    ...(configFields["budgets"] === undefined
      ? {}
      : { budgets: Object.fromEntries(captureEntries(configFields["budgets"])) }),
    ...(configFields["testCaPem"] === undefined
      ? {}
      : { testCaPem: copyByteView(configFields["testCaPem"]) }),
  } as unknown as TrustedTransportConfig;
  const clock = fields["clock"] as { nowMs(): number } | undefined;
  if (
    clock !== undefined &&
    (typeof clock !== "object" || clock === null || typeof clock.nowMs !== "function")
  )
    throw new LoginError("invalid_arguments");
  const clockFn = clock === undefined ? Date.now : clock.nowMs.bind(clock);
  const now = (): number => {
    try {
      return assertClockMs(clockFn());
    } catch {
      throw new LoginError("internal_error");
    }
  };
  const maxRequestBytes =
    config.budgets?.maxRequestBytes ?? DEFAULT_TRANSPORT_BUDGETS.maxRequestBytes;
  let expected: Uint8Array = new Uint8Array();
  let pending: LoginEnvelope | null = null;
  let challenge: LoginChallenge | null = null;
  let poisoned = false;
  let closed = false;
  let cancelled = false;
  let completed = false;
  let closing = false;
  let active: Promise<unknown> | null = null;
  let activeAbort: AbortController | null = null;
  let cancelWork: Promise<void> | null = null;
  let exchangeDispatch = false;

  const recovery = (): never => {
    poisoned = true;
    throw new LoginError("recovery_required");
  };
  const checkSignal = (signal: AbortSignal): void => {
    if (signal.aborted || cancelled || closed) throw new LoginError("operation_interrupted");
  };
  const checkDeadline = (): void => {
    const deadline = pending?.exchange.challengeExpiresAt ?? challenge?.expiresAt;
    if (deadline === undefined || now() >= (expiryToMs(deadline) ?? -Infinity))
      throw new LoginError("attempt_expired");
  };
  const verify = async (): Promise<void> => {
    if (poisoned) recovery();
    try {
      if (
        !bindingsEqual(assertBinding(profile.binding), source) ||
        !equalBytes(copyByteView(await readVault()), expected)
      )
        recovery();
    } catch {
      recovery();
    }
  };
  const write = async (bytes: Uint8Array): Promise<void> => {
    await verify();
    try {
      await commit({ vaultBytes: bytes });
    } catch {
      recovery();
    }
    expected = new Uint8Array(bytes);
  };
  const restore = async (): Promise<void> => {
    if (poisoned) recovery();
    if (completed) return;
    if (pending !== null) {
      const prior = decodePriorVault(pending.priorVaultBase64);
      await write(prior);
      pending = null;
    }
    challenge = null;
  };
  const hooks: SessionHooks = {
    checkBinding: async (_point, binding, signal) => {
      checkSignal(signal);
      if (!bindingsEqual(binding, source)) throw new LoginError("operation_interrupted");
      await verify();
      checkSignal(signal);
    },
    selectCredential: async () => null,
    isCurrent: (binding) =>
      !poisoned && !completed && !closed && !cancelled && bindingsEqual(binding, source),
    beforeDispatch: async (_binding, summary, signal) => {
      await verify();
      checkSignal(signal);
      if (summary.routeLabel === "auth_exchange") {
        if (
          !exchangeDispatch ||
          pending === null ||
          pending.exchange.sendsReserved < 1 ||
          summary.attempt !== 1
        )
          recovery();
        checkDeadline();
        checkSignal(signal);
      }
    },
  };
  // T05 remains authoritative for config shape/budgets; construction performs no IO.
  const transport = createBackendTransport(config, { session: hooks });
  if (new URL(config.origin).origin !== source.origin)
    throw new LoginError("configuration_required");
  expected = copyByteView(await readVault());
  pending = decodeLoginEnvelope(expected, source, maxRequestBytes);
  // Expired temporary credentials are cleared by the next trusted entry.
  if (pending !== null && now() >= (expiryToMs(pending.exchange.challengeExpiresAt) ?? -Infinity))
    await restore();

  const run = <T>(
    signalInput: AbortSignal,
    fn: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> => {
    let caller: AbortSignal;
    try {
      caller = assertSignal(signalInput);
    } catch {
      return Promise.reject(new LoginError("invalid_arguments"));
    }
    if (active !== null || closed || cancelled || completed)
      return Promise.reject(new LoginError("operation_interrupted"));
    if (poisoned) return Promise.reject(new LoginError("recovery_required"));
    if (caller.aborted) return Promise.reject(new LoginError("operation_interrupted"));
    const controller = new AbortController();
    const abort = (): void => controller.abort();
    caller.addEventListener("abort", abort, { once: true });
    activeAbort = controller;
    const work = Promise.resolve()
      .then(() => fn(controller.signal))
      .catch(async (error: unknown) => {
        if (poisoned) throw new LoginError("recovery_required");
        const failure = safe(error);
        if (
          !closing &&
          !completed &&
          (controller.signal.aborted || failure.code === "attempt_expired")
        ) {
          await restore();
          throw new LoginError(
            controller.signal.aborted ? "operation_interrupted" : "attempt_expired",
          );
        }
        throw failure;
      })
      .finally(() => {
        caller.removeEventListener("abort", abort);
        active = null;
        activeAbort = null;
        exchangeDispatch = false;
      });
    active = work;
    return work;
  };

  const exchange = async (signal: AbortSignal): Promise<StorageBinding> => {
    if (pending === null) throw new LoginError("login_required");
    checkSignal(signal);
    checkDeadline();
    const e = pending.exchange;
    if (e.sendsReserved >= 2) throw new LoginError("login_required");
    if (e.retryNotBeforeMs !== null && now() < e.retryNotBeforeMs)
      throw new LoginError("retry_later");
    const reserved: LoginEnvelope = {
      ...pending,
      exchange: { ...e, sendsReserved: e.sendsReserved + 1 },
    };
    await write(encodeLoginEnvelope(reserved));
    pending = reserved;
    checkSignal(signal);
    checkDeadline();
    exchangeDispatch = true;
    let body: Uint8Array;
    try {
      body = (
        await transport.authExchange(source, decodeCanonicalBase64(e.bodyBase64), e.authKey, signal)
      ).rawBodyBytes;
    } catch (error) {
      if (poisoned) recovery();
      checkSignal(signal);
      checkDeadline();
      if (isTransportError(error)) {
        if (error.retryAfterSeconds !== null) {
          const delayedUntil = now() + error.retryAfterSeconds * 1000;
          // Retry-After replaces backoff and is not capped by maxRetryDelayMs.
          // A delay beyond the attempt cannot authorize another send.
          const retryNotBeforeMs = Number.isSafeInteger(delayedUntil)
            ? delayedUntil
            : (expiryToMs(e.challengeExpiresAt) ?? Number.MAX_SAFE_INTEGER);
          const delayed: LoginEnvelope = {
            ...reserved,
            exchange: { ...reserved.exchange, retryNotBeforeMs },
          };
          await write(encodeLoginEnvelope(delayed));
          pending = delayed;
        }
        if (
          !error.outcomeUnknown &&
          error.status !== null &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 408 &&
          error.status !== 429
        ) {
          await restore();
          throw new LoginError("sign_in_failed");
        }
        throw new LoginError(error.retryable ? "retry_later" : "sign_in_failed");
      }
      throw safe(error);
    }
    checkSignal(signal);
    checkDeadline();
    let fresh;
    try {
      fresh = parseServiceGrant(body);
    } catch {
      throw new LoginError("sign_in_failed");
    }
    if (source.accountUuid !== null && fresh.accountUuid !== source.accountUuid) {
      await restore();
      throw new LoginError("sign_in_failed");
    }
    if (now() >= fresh.refreshExpiresMs) {
      await restore();
      throw new LoginError("sign_in_failed");
    }
    const prior = decodeLifecycleVaultBytes(decodePriorVault(reserved.priorVaultBase64), source);
    const retained = [...prior.superseded];
    if (prior.grant !== null)
      retained.push({ binding: source, grant: prior.grant, pendingRefresh: prior.pendingRefresh });
    const target: StorageBinding = Object.freeze({
      ...source,
      accountUuid: fresh.accountUuid,
      sessionGeneration: source.sessionGeneration + 1,
    });
    if (!Number.isSafeInteger(target.sessionGeneration)) recovery();
    const targetBytes = encodeLifecycleVaultBytes(target, fresh, null, retained);
    await verify();
    // No cancellation callback or storage await between the final gate and transition.
    checkSignal(signal);
    checkDeadline();
    if (now() >= fresh.refreshExpiresMs) {
      await restore();
      throw new LoginError("sign_in_failed");
    }
    checkSignal(signal);
    let result: StorageBinding;
    try {
      result =
        source.accountUuid === null
          ? await bindAccount(fresh.accountUuid, targetBytes)
          : await advance(targetBytes);
      if (!bindingsEqual(assertBinding(result), target)) recovery();
    } catch {
      recovery();
    }
    // Once begun, the durable transition is never undone, including on cancellation.
    completed = true;
    pending = null;
    challenge = null;
    expected.fill(0);
    expected = new Uint8Array();
    checkSignal(signal);
    return target;
  };

  const facade: LoginTransaction = {
    binding: source,
    start: (signal) =>
      run(signal, async (owned) => {
        if (pending !== null || challenge !== null) throw new LoginError("login_required");
        await verify();
        checkSignal(owned);
        let bytes: Uint8Array;
        try {
          bytes = (
            await transport.authChallenge(
              source,
              new TextEncoder().encode('{"purpose":"signIn"}'),
              owned,
            )
          ).rawBodyBytes;
        } catch (error) {
          if (poisoned) recovery();
          checkSignal(owned);
          if (isTransportError(error)) throw new LoginError("sign_in_failed");
          throw safe(error);
        }
        let r: Record<string, unknown>;
        try {
          r = parseStrictMetadataJson(bytes);
        } catch {
          throw new LoginError("sign_in_failed");
        }
        const expiry = expiryToMs(r["expiresAt"]);
        if (
          !isCanonicalUuid(r["challengeId"]) ||
          typeof r["nonce"] !== "string" ||
          r["nonce"].length === 0 ||
          expiry === null ||
          expiry <= now()
        )
          throw new LoginError("sign_in_failed");
        checkSignal(owned);
        challenge = Object.freeze({
          attemptId: randomUUID(),
          challengeId: r["challengeId"],
          nonce: r["nonce"],
          expiresAt: r["expiresAt"] as string,
        });
        return challenge;
      }),
    submit: (attemptId, idToken, signal) => {
      if (!isCanonicalUuid(attemptId) || !isOpaqueGoogleToken(idToken))
        return Promise.reject(new LoginError("invalid_arguments"));
      // Consume callback admission synchronously before any await/async run.
      if (active !== null || challenge === null || challenge.attemptId !== attemptId)
        return Promise.reject(new LoginError("operation_interrupted"));
      const admitted = challenge;
      challenge = null;
      return run(signal, async (owned) => {
        const body = new TextEncoder().encode(
          JSON.stringify({ challengeId: admitted.challengeId, idToken }),
        );
        if (body.byteLength > maxRequestBytes) throw new LoginError("invalid_arguments");
        if (now() >= (expiryToMs(admitted.expiresAt) ?? -Infinity))
          throw new LoginError("attempt_expired");
        checkSignal(owned);
        const prepared: LoginEnvelope = {
          version: 4,
          binding: source,
          priorVaultBase64: encodeBodyBase64(expected),
          exchange: {
            attemptId: admitted.attemptId,
            challengeId: admitted.challengeId,
            challengeExpiresAt: admitted.expiresAt,
            googleWebClientId: settings.googleWebClientId,
            browserOrigin: settings.browserOrigin,
            authKey: randomUUID(),
            bodyBase64: encodeBodyBase64(body),
            sendsReserved: 0,
            retryNotBeforeMs: null,
          },
        };
        await write(encodeLoginEnvelope(prepared));
        pending = prepared;
        return exchange(owned);
      });
    },
    resume: (signal) => run(signal, exchange),
    cancel: () => {
      if (closed) return Promise.reject(new LoginError("operation_interrupted"));
      if (cancelWork !== null) return cancelWork;
      cancelled = true;
      activeAbort?.abort();
      cancelWork = (async () => {
        try {
          await active;
        } catch {
          /* Active caller receives its own safe failure. */
        }
        if (poisoned) recovery();
        await restore();
      })();
      return cancelWork;
    },
    close: async () => {
      closing = true;
      closed = true;
      activeAbort?.abort();
      try {
        await active;
      } catch {
        /* Preserve unresolved evidence for explicit reopen. */
      }
      try {
        if (cancelWork !== null) await cancelWork;
      } finally {
        challenge = null;
        pending = null;
        expected.fill(0);
        expected = new Uint8Array();
      }
    },
  };
  return Object.freeze(facade);
}
