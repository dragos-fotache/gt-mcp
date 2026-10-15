/* global AbortController */
import { describe, it, expect } from "vitest";
import { openLoginTransaction, isLoginError } from "../../dist/login/index.js";
import { StorageError } from "../../dist/storage/index.js";
import { openLifecycleSessionState } from "../../dist/auth/index.js";
import {
  ACCOUNT,
  OTHER_ACCOUNT,
  NOW,
  DEADLINE,
  SETTINGS,
  CHALLENGE,
  signal,
  bytes,
  record,
  binding,
  grant,
  pendingRefresh,
  serviceGrant,
  preparedVault,
  memoryProfile,
  memoryMetadata,
  backend,
  jsonResponse,
} from "./helpers.mjs";

async function open(fixture, initial, options = {}) {
  const source = options.source ?? binding(fixture.origin);
  const profile = memoryProfile(source, initial);
  const metadata = memoryMetadata(source, profile.state.events);
  const clock = options.clock ?? {
    now: NOW,
    nowMs() {
      return this.now;
    },
  };
  const transaction = await openLoginTransaction({
    profile: profile.owner,
    transportConfig: fixture.config,
    metadata: metadata.metadata,
    settings: SETTINGS,
    clock,
  });
  return { transaction, profile, metadata, clock };
}

async function safeFailure(promise, code) {
  const error = await promise.then(
    () => {
      throw new Error("expected safe login failure");
    },
    (value) => value,
  );
  expect(isLoginError(error)).toBe(true);
  if (code !== undefined) expect(error.code).toBe(code);
  expect(String(error.stack ?? "")).not.toMatch(/synthetic-qa|file:\/\/|\/home\/|127\.0\.0\.1/);
  expect(error).not.toHaveProperty("cause");
  expect(JSON.stringify(error)).not.toMatch(/synthetic-qa|127\.0\.0\.1|idToken|refreshToken/);
  return error;
}

describe("T07-S1 protected foreground transaction", () => {
  it("durably prepares and reserves before send, then publishes initial bind in receipt order", async () => {
    let selected;
    let atDispatch;
    const fixture = await backend((req, res, request) => {
      atDispatch = { vault: record(selected.profile.state.vault), request };
      jsonResponse(res, 200, serviceGrant());
    });
    try {
      selected = await open(fixture);
      const attempt = await selected.transaction.start(signal());
      expect(attempt).toMatchObject({
        challengeId: CHALLENGE,
        nonce: "synthetic-qa-t07-nonce",
        expiresAt: DEADLINE,
      });
      expect(record(fixture.requests[0].body)).toEqual({ purpose: "signIn" });
      expect(selected.profile.state.commits).toHaveLength(0);
      const result = await selected.transaction.submit(
        attempt.attemptId,
        "synthetic-qa-t07-google",
        signal(),
      );
      expect(atDispatch.vault.version).toBe(4);
      expect(atDispatch.vault.exchange.sendsReserved).toBe(1);
      expect(Buffer.from(atDispatch.vault.exchange.bodyBase64, "base64")).toEqual(
        atDispatch.request.body,
      );
      expect(atDispatch.vault.exchange.authKey).toBe(atDispatch.request.headers["idempotency-key"]);
      expect(atDispatch.request.headers.authorization).toBeUndefined();
      expect(result).toEqual(binding(fixture.origin, ACCOUNT, 1));
      expect(selected.metadata.state.descriptor).toEqual(result);
      expect(selected.metadata.state.receipt).toBeNull();
      expect(selected.profile.state.events.slice(-4)).toEqual([
        "receipt",
        "transition",
        "descriptor",
        "receipt-removed",
      ]);
      const installed = record(selected.profile.state.vault);
      expect(installed).toEqual({
        version: 3,
        binding: result,
        grant: { ...serviceGrant(), accountUuid: ACCOUNT, account: undefined },
        pendingRefresh: null,
        superseded: [],
      });
      expect(installed.grant.accessExpiresAt).toBe("2026-10-14T12:00:00.000000Z");
      expect(selected.profile.state.operationReads).toBe(0);
      // Accepted T06 can open the installed format under the verified target.
      const reopened = memoryProfile(result, selected.profile.state.vault);
      const auth = await openLifecycleSessionState({
        profile: reopened.owner,
        transportConfig: fixture.config,
        clock: selected.clock,
      });
      expect(auth.binding).toEqual(result);
      await selected.transaction.close();
      expect(selected.profile.state.closes).toBe(0);
    } finally {
      await fixture.close();
    }
  });

  it("retains uncertain evidence and allows only one byte-identical explicit restart replay", async () => {
    const fixture = await backend((req) => req.socket.destroy());
    try {
      const first = await open(fixture);
      const attempt = await first.transaction.start(signal());
      await safeFailure(
        first.transaction.submit(attempt.attemptId, "synthetic-qa-t07-google", signal()),
      );
      const once = Buffer.from(first.profile.state.vault);
      expect(record(once).exchange.sendsReserved).toBe(1);
      await first.transaction.close();
      expect(first.profile.state.vault).toEqual(once);
      await safeFailure(first.transaction.cancel(), "operation_interrupted");
      expect(first.profile.state.vault).toEqual(once);
      const second = await open(fixture, once);
      await safeFailure(second.transaction.resume(signal()));
      expect(record(second.profile.state.vault).exchange.sendsReserved).toBe(2);
      const exchanges = fixture.requests.filter((r) => r.url === "/v1/auth/google");
      expect(exchanges).toHaveLength(2);
      expect(exchanges[1].body).toEqual(exchanges[0].body);
      expect(exchanges[1].headers["idempotency-key"]).toBe(exchanges[0].headers["idempotency-key"]);
      await safeFailure(second.transaction.resume(signal()));
      expect(fixture.requests).toHaveLength(3);
      // No third send on another process lifetime either.
      const third = await open(fixture, second.profile.state.vault);
      await safeFailure(third.transaction.resume(signal()));
      expect(fixture.requests).toHaveLength(3);
      await second.transaction.close();
      await third.transaction.close();
    } finally {
      await fixture.close();
    }
  });

  it("persists bounded Retry-After, prevents early resume and keeps the original deadline", async () => {
    const fixture = await backend((req, res) =>
      jsonResponse(res, 503, { errorCode: "temporarily_unavailable" }, [["retry-after", "30"]]),
    );
    try {
      const selected = await open(fixture);
      const attempt = await selected.transaction.start(signal());
      await safeFailure(
        selected.transaction.submit(attempt.attemptId, "synthetic-qa-t07-google", signal()),
        "retry_later",
      );
      const once = record(selected.profile.state.vault);
      expect(once.exchange.retryNotBeforeMs).toBe(NOW + 30000);
      await safeFailure(selected.transaction.resume(signal()), "retry_later");
      expect(fixture.requests).toHaveLength(2);
      selected.clock.now += 30000;
      await safeFailure(selected.transaction.resume(signal()), "retry_later");
      expect(fixture.requests).toHaveLength(3);
      expect(record(selected.profile.state.vault).exchange.challengeExpiresAt).toBe(DEADLINE);
      await selected.transaction.close();
    } finally {
      await fixture.close();
    }
  });

  it("preserves current pending/superseded evidence on same-account replacement", async () => {
    const fixture = await backend((req, res) => jsonResponse(res, 200, serviceGrant()));
    try {
      const source = binding(fixture.origin, ACCOUNT, 3);
      const current = grant();
      const pending = pendingRefresh(current);
      const retained = {
        binding: binding(fixture.origin, ACCOUNT, 1),
        grant: grant({ refreshToken: "synthetic-qa-t07-older" }),
        pendingRefresh: null,
      };
      const prior = {
        version: 3,
        binding: source,
        grant: current,
        pendingRefresh: pending,
        superseded: [retained],
      };
      const selected = await open(fixture, bytes(prior), { source });
      const attempt = await selected.transaction.start(signal());
      const result = await selected.transaction.submit(
        attempt.attemptId,
        "synthetic-qa-t07-google",
        signal(),
      );
      expect(result.sessionGeneration).toBe(4);
      const installed = record(selected.profile.state.vault);
      expect(installed.pendingRefresh).toBeNull();
      expect(installed.superseded).toEqual([
        retained,
        { binding: source, grant: current, pendingRefresh: pending },
      ]);
      expect(selected.profile.state.operationReads).toBe(0);
      await selected.transaction.close();
    } finally {
      await fixture.close();
    }
  });

  it("refuses a service-confirmed different account and restores exact predecessor bytes", async () => {
    const fixture = await backend((req, res) =>
      jsonResponse(res, 200, serviceGrant(OTHER_ACCOUNT)),
    );
    try {
      const source = binding(fixture.origin, ACCOUNT, 2);
      const prior = Buffer.from(
        `{ "version": 1, "binding": ${JSON.stringify(source)}, "grant": ${JSON.stringify(grant())} }`,
      );
      const selected = await open(fixture, prior, { source });
      const attempt = await selected.transaction.start(signal());
      await safeFailure(
        selected.transaction.submit(attempt.attemptId, "synthetic-qa-t07-google", signal()),
        "sign_in_failed",
      );
      expect(selected.profile.state.vault).toEqual(prior);
      expect(selected.profile.state.events).not.toContain("transition");
      expect(selected.metadata.state.receipt).toBeNull();
      await selected.transaction.close();
    } finally {
      await fixture.close();
    }
  });

  it("cancel settles active exchange and restores prior bytes without installing", async () => {
    let reached;
    const received = new Promise((resolve) => {
      reached = resolve;
    });
    const fixture = await backend(() => reached());
    try {
      const selected = await open(fixture);
      const attempt = await selected.transaction.start(signal());
      const submitted = selected.transaction.submit(
        attempt.attemptId,
        "synthetic-qa-t07-google",
        signal(),
      );
      const rejected = safeFailure(submitted, "operation_interrupted");
      rejected.catch(() => {});
      await received;
      await selected.transaction.cancel();
      await rejected;
      expect(selected.profile.state.vault).toEqual(Buffer.alloc(0));
      expect(selected.profile.state.events).not.toContain("transition");
      await selected.transaction.close();
    } finally {
      await fixture.close();
    }
  });

  it("clears expired v4 on open and never dispatches its credential", async () => {
    const fixture = await backend(() => {
      throw new Error("expired exchange dispatched");
    });
    try {
      const selected = await open(
        fixture,
        preparedVault(binding(fixture.origin), Buffer.alloc(0), {
          challengeExpiresAt: "2026-10-15T12:00:00.000Z",
        }),
      );
      expect(selected.profile.state.vault).toEqual(Buffer.alloc(0));
      await safeFailure(selected.transaction.resume(signal()));
      expect(fixture.requests).toHaveLength(0);
      await selected.transaction.close();
    } finally {
      await fixture.close();
    }
  });

  it("rejects duplicate callback admission synchronously without a second send", async () => {
    let complete;
    let reached;
    const received = new Promise((resolve) => {
      reached = resolve;
    });
    const fixture = await backend((req, res) => {
      complete = () => jsonResponse(res, 200, serviceGrant());
      reached();
    });
    try {
      const selected = await open(fixture);
      const attempt = await selected.transaction.start(signal());
      const first = selected.transaction.submit(
        attempt.attemptId,
        "synthetic-qa-t07-google",
        signal(),
      );
      first.catch(() => {});
      await safeFailure(
        selected.transaction.submit(attempt.attemptId, "synthetic-qa-t07-other", signal()),
        "operation_interrupted",
      );
      await received;
      complete();
      await first;
      expect(fixture.requests.filter((r) => r.url === "/v1/auth/google")).toHaveLength(1);
      await selected.transaction.close();
    } finally {
      await fixture.close();
    }
  });

  it("preparation failure sends nothing and fences the uncertain storage state", async () => {
    const fixture = await backend(() => {
      throw new Error("unprepared exchange dispatched");
    });
    try {
      const selected = await open(fixture);
      selected.profile.state.beforeCommit = () => {
        throw new StorageError("commit_ambiguous");
      };
      const attempt = await selected.transaction.start(signal());
      await safeFailure(
        selected.transaction.submit(attempt.attemptId, "synthetic-qa-t07-google", signal()),
        "recovery_required",
      );
      await safeFailure(selected.transaction.start(signal()), "recovery_required");
      expect(fixture.requests).toHaveLength(1);
      await selected.transaction.close();
    } finally {
      await fixture.close();
    }
  });

  it("a malformed service grant preserves v4 while definite credential rejection restores prior bytes", async () => {
    for (const malformed of [true, false]) {
      const fixture = await backend((req, res) => {
        if (malformed)
          jsonResponse(res, 200, {
            ...serviceGrant(),
            refreshExpiresAt: "2026-11-15T12:00:00.0001Z",
          });
        else jsonResponse(res, 401, { errorCode: "invalid_google_credential" });
      });
      try {
        const selected = await open(fixture);
        const attempt = await selected.transaction.start(signal());
        await safeFailure(
          selected.transaction.submit(attempt.attemptId, "synthetic-qa-t07-google", signal()),
          "sign_in_failed",
        );
        if (malformed) expect(record(selected.profile.state.vault).version).toBe(4);
        else expect(selected.profile.state.vault).toEqual(Buffer.alloc(0));
        expect(selected.profile.state.events).not.toContain("transition");
        await selected.transaction.close();
      } finally {
        await fixture.close();
      }
    }
  });

  it("rechecks the original deadline after durable send reservation, preventing expired dispatch", async () => {
    const fixture = await backend(() => {
      throw new Error("expired exchange dispatched");
    });
    try {
      const selected = await open(fixture);
      const attempt = await selected.transaction.start(signal());
      selected.profile.state.beforeCommit = (update) => {
        if (update.vaultBytes.byteLength === 0) return;
        const value = record(update.vaultBytes);
        if (value.version === 4 && value.exchange.sendsReserved === 1)
          selected.clock.now = Date.parse(DEADLINE);
      };
      await safeFailure(
        selected.transaction.submit(attempt.attemptId, "synthetic-qa-t07-google", signal()),
        "attempt_expired",
      );
      expect(fixture.requests).toHaveLength(1);
      expect(selected.profile.state.vault).toEqual(Buffer.alloc(0));
      await selected.transaction.close();
    } finally {
      await fixture.close();
    }
  });

  it("publication ambiguity preserves installed target and receipt through cancellation", async () => {
    const fixture = await backend((req, res) => jsonResponse(res, 200, serviceGrant()));
    try {
      const selected = await open(fixture);
      selected.metadata.state.failPublish = true;
      const attempt = await selected.transaction.start(signal());
      await safeFailure(
        selected.transaction.submit(attempt.attemptId, "synthetic-qa-t07-google", signal()),
        "recovery_required",
      );
      const installed = Buffer.from(selected.profile.state.vault);
      expect(record(installed).version).toBe(3);
      expect(selected.metadata.state.receipt.to).toEqual(selected.profile.state.binding);
      await safeFailure(selected.transaction.cancel(), "recovery_required");
      expect(selected.profile.state.vault).toEqual(installed);
      expect(selected.metadata.state.receipt).not.toBeNull();
      await safeFailure(selected.transaction.close(), "recovery_required");
      expect(selected.metadata.state.receipt).not.toBeNull();
    } finally {
      await fixture.close();
    }
  });

  it("cancellation during begun install waits and cannot overwrite committed target", async () => {
    let entered;
    let release;
    const begun = new Promise((resolve) => {
      entered = resolve;
    });
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const fixture = await backend((req, res) => jsonResponse(res, 200, serviceGrant()));
    try {
      const selected = await open(fixture);
      selected.profile.state.beforeTransition = async () => {
        entered();
        await gate;
      };
      const attempt = await selected.transaction.start(signal());
      const controller = new AbortController();
      const submitted = safeFailure(
        selected.transaction.submit(
          attempt.attemptId,
          "synthetic-qa-t07-google",
          controller.signal,
        ),
        "operation_interrupted",
      );
      submitted.catch(() => {});
      await begun;
      controller.abort();
      release();
      await submitted;
      expect(record(selected.profile.state.vault).version).toBe(3);
      expect(selected.profile.state.binding.accountUuid).toBe(ACCOUNT);
      await selected.transaction.close();
    } finally {
      release?.();
      await fixture.close();
    }
  });

  it("caller cancellation from the final clock check prevents installation", async () => {
    const fixture = await backend((req, res) => jsonResponse(res, 200, serviceGrant()));
    const controller = new AbortController();
    let selected;
    const clock = {
      nowMs() {
        if (selected?.metadata.state.receipt !== null && selected !== undefined) controller.abort();
        return NOW;
      },
    };
    try {
      selected = await open(fixture, undefined, { clock });
      const attempt = await selected.transaction.start(signal());
      await safeFailure(
        selected.transaction.submit(
          attempt.attemptId,
          "synthetic-qa-t07-google",
          controller.signal,
        ),
        "operation_interrupted",
      );
      expect(selected.profile.state.events).not.toContain("transition");
      expect(selected.profile.state.vault).toEqual(Buffer.alloc(0));
      expect(selected.metadata.state.receipt).toBeNull();
      await selected.transaction.close();
    } finally {
      await fixture.close();
    }
  });
});
