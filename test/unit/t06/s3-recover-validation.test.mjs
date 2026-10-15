// T06-S3 QA unit 01 — recoverable open/entry/no-pending validation table
// (SOURCE-READY, HOLD: authored against the settled S3 work-order public API,
// never executed before the coordinator's named frozen relay).
//
// Spec basis: work-order "Settled additive public API" (seven runtime
// exports, read-only open of cleared empty/v1/v2, strict S2 v2 record and
// predecessor equality unchanged, config/CA capture, unknown keys not lost,
// T05 bad-config TransportError) and "Recovery transitions and bounded
// dispatch" steps 1 and 7 (no-grant authentication_required, malformed
// invalid_arguments, foreign/invalidated operation_interrupted, live-grant
// read-only no-op, expired-refresh reauthentication_required with no
// commit/key/dispatch, empty/v1 no-op never migrates) plus the S2 pending
// refusal boundary (one case reused, not a duplicate matrix). No network
// use: every case either opens state only or rejects before dispatch, so no
// T05/loopback fixture is needed here. Exact replay, follow-on rotation,
// concurrency, and commit/fence boundaries belong to the S3 fault files.
//
// Bound owners are established through the accepted S1 entry (isolated
// install, close, reopen on the returned binding) before any grant-state
// seed, so vault plaintext always matches the T04 binding under test.
// Genuinely pre-auth cases use a separate fresh-owner helper.
//
// SYNTHETIC PROVENANCE: every UUID/token/timestamp below is fabricated for
// isolated QA use only. UUID fixtures use canonical lowercase syntax because
// valid-input cases require it; they are synthetic because they are listed
// here, never because of a prefix. No real credentials, tokens, account IDs,
// private paths, or raw backend bodies are included.

import { describe, expect, it } from "vitest";
import {
  REFRESH_VAULT_VERSION,
  SESSION_VAULT_VERSION,
  isSessionError,
  openRecoverableRefreshSessionState,
  openRefreshSessionState,
  openSessionState,
} from "../../../dist/auth/index.js";
import { isTransportError } from "../../../dist/http/index.js";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import {
  abortedSignal,
  captureRejection,
  freshSignal,
  liveClock,
  makeClock,
  teardownAll,
} from "./helpers.mjs";
import {
  S3_ACCOUNT_OTHER,
  S3_ORIGIN,
  s3ServiceBytes,
  s3ValidPending,
  s3Version2Bytes,
  s3VaultGrant,
} from "./s3-helpers.mjs";

// Establish a genuinely bound owner through the accepted S1 entry: isolated
// install of the synthetic S3 grant, S1 invalidate, close, reopen on the
// returned binding. The vault then holds settled version1 state whose
// binding equals the T04 capture. fn receives { facility, profile,
// installed }. No work at import time.
async function withBoundS3Owner(fn) {
  const facility = await createStorageTestFacility();
  let profile = null;
  let bodyError = null;
  try {
    profile = await facility.provision(S3_ORIGIN);
    const installer = await openSessionState({ profile, clock: liveClock() });
    const installed = await installer.installInitialGrant(
      installer.binding,
      s3ServiceBytes(),
      freshSignal(),
    );
    installer.invalidate();
    await profile.close();
    profile = await facility.open(installed);
    await fn({ facility, profile, installed });
  } catch (error) {
    bodyError = error;
  }
  const steps = [];
  if (profile !== null) steps.push(() => profile.close());
  steps.push(() => facility.cleanup());
  let teardownError = null;
  try {
    await teardownAll(steps);
  } catch (error) {
    teardownError = error;
  }
  if (bodyError !== null) throw bodyError;
  if (teardownError !== null) throw teardownError;
}

// Fresh pre-auth owner (account null, generation 0, zero-length vault) for
// genuinely unbound cases. fn receives { facility, profile }.
async function withPreAuthS3Owner(fn) {
  const facility = await createStorageTestFacility();
  let profile = null;
  let bodyError = null;
  try {
    profile = await facility.provision(S3_ORIGIN);
    await fn({ facility, profile });
  } catch (error) {
    bodyError = error;
  }
  const steps = [];
  if (profile !== null) steps.push(() => profile.close());
  steps.push(() => facility.cleanup());
  let teardownError = null;
  try {
    await teardownAll(steps);
  } catch (error) {
    teardownError = error;
  }
  if (bodyError !== null) throw bodyError;
  if (teardownError !== null) throw teardownError;
}

function s3Config(overrides = {}) {
  return { origin: S3_ORIGIN, ...overrides };
}

async function openS3(profile, config = s3Config()) {
  return openRecoverableRefreshSessionState({
    profile,
    transportConfig: config,
    clock: liveClock(),
  });
}

describe("T06-S3 seven-export surface preserves S1/S2", () => {
  it("publishes openRecoverableRefreshSessionState with version constants 1/2", () => {
    expect(typeof openRecoverableRefreshSessionState).toBe("function");
    expect(typeof openRefreshSessionState).toBe("function");
    expect(typeof openSessionState).toBe("function");
    expect(SESSION_VAULT_VERSION).toBe(1);
    expect(REFRESH_VAULT_VERSION).toBe(2);
  });

  it("opens a recoverable facade with captured binding, rotate, recover, and invalidate", async () => {
    await withBoundS3Owner(async ({ profile, installed }) => {
      const state = await openS3(profile);
      try {
        expect(state.binding).toEqual(installed);
        expect(typeof state.rotateRefresh).toBe("function");
        expect(typeof state.recoverRefresh).toBe("function");
        expect(typeof state.invalidate).toBe("function");
      } finally {
        state.invalidate();
      }
    });
  });
});

describe("T06-S3 read-only open accepts empty/v1/v2 without migration", () => {
  it("opens a zero-length cleared vault without inventing state", async () => {
    await withPreAuthS3Owner(async ({ profile }) => {
      expect((await profile.readVaultBytes()).length).toBe(0);
      const state = await openS3(profile);
      try {
        expect(state.binding).toEqual(profile.binding);
        expect((await profile.readVaultBytes()).length).toBe(0);
      } finally {
        state.invalidate();
      }
    });
  });

  it("opens a validated version1 grant without writing or migrating", async () => {
    await withBoundS3Owner(async ({ profile, installed }) => {
      const before = await profile.readVaultBytes();
      const state = await openS3(profile);
      try {
        expect(state.binding).toEqual(installed);
        expect(await profile.readVaultBytes()).toEqual(before);
      } finally {
        state.invalidate();
      }
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });

  it("opens a version2 grant with pending null without mutation", async () => {
    await withBoundS3Owner(async ({ profile, installed }) => {
      const grant = s3VaultGrant();
      await profile.commit({
        vaultBytes: s3Version2Bytes({ binding: { ...installed }, grant, pendingRefresh: null }),
      });
      const before = await profile.readVaultBytes();
      const state = await openS3(profile);
      try {
        expect(state.binding).toEqual(installed);
        expect(await profile.readVaultBytes()).toEqual(before);
      } finally {
        state.invalidate();
      }
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });
});

describe("T06-S3 recover entry gates reject before dispatch", () => {
  it("no grant rejects authentication_required without mutation", async () => {
    await withPreAuthS3Owner(async ({ profile }) => {
      const before = await profile.readVaultBytes();
      const state = await openS3(profile);
      try {
        const error = await captureRejection(state.recoverRefresh(state.binding, freshSignal()));
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("authentication_required");
        expect(await profile.readVaultBytes()).toEqual(before);
      } finally {
        state.invalidate();
      }
    });
  });

  it("aborted entry signal rejects operation_interrupted without mutation", async () => {
    await withBoundS3Owner(async ({ profile }) => {
      const before = await profile.readVaultBytes();
      const state = await openS3(profile);
      try {
        const error = await captureRejection(state.recoverRefresh(state.binding, abortedSignal()));
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("operation_interrupted");
        expect(await profile.readVaultBytes()).toEqual(before);
      } finally {
        state.invalidate();
      }
    });
  });

  it("malformed caller rejects invalid_arguments without mutation", async () => {
    await withBoundS3Owner(async ({ profile }) => {
      const before = await profile.readVaultBytes();
      const state = await openS3(profile);
      try {
        const error = await captureRejection(state.recoverRefresh(null, freshSignal()));
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("invalid_arguments");
        expect(await profile.readVaultBytes()).toEqual(before);
      } finally {
        state.invalidate();
      }
    });
  });

  it("foreign valid binding rejects operation_interrupted without mutation", async () => {
    await withBoundS3Owner(async ({ profile }) => {
      const before = await profile.readVaultBytes();
      const state = await openS3(profile);
      try {
        const foreign = { ...state.binding, accountUuid: S3_ACCOUNT_OTHER };
        const error = await captureRejection(state.recoverRefresh(foreign, freshSignal()));
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("operation_interrupted");
        expect(await profile.readVaultBytes()).toEqual(before);
      } finally {
        state.invalidate();
      }
    });
  });

  it("invalidated facade rejects operation_interrupted without mutation", async () => {
    await withBoundS3Owner(async ({ profile }) => {
      const before = await profile.readVaultBytes();
      const state = await openS3(profile);
      state.invalidate();
      const error = await captureRejection(state.recoverRefresh(state.binding, freshSignal()));
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("operation_interrupted");
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });
});

describe("T06-S3 no-pending recovery outcomes without dispatch", () => {
  it("live access and refresh grant is a read-only successful no-op", async () => {
    await withBoundS3Owner(async ({ profile, installed }) => {
      const grant = s3VaultGrant();
      await profile.commit({
        vaultBytes: s3Version2Bytes({ binding: { ...installed }, grant, pendingRefresh: null }),
      });
      const before = await profile.readVaultBytes();
      const state = await openS3(profile);
      try {
        expect(await state.recoverRefresh(state.binding, freshSignal())).toBe(undefined);
        expect(await profile.readVaultBytes()).toEqual(before);
        expect(state.binding).toEqual(installed);
      } finally {
        state.invalidate();
      }
    });
  });

  it("expired refresh rejects reauthentication_required with no commit", async () => {
    await withBoundS3Owner(async ({ profile, installed }) => {
      const grant = s3VaultGrant();
      await profile.commit({
        vaultBytes: s3Version2Bytes({ binding: { ...installed }, grant, pendingRefresh: null }),
      });
      const before = await profile.readVaultBytes();
      const expiredClock = makeClock(Date.parse("2026-12-01T00:00:00.000Z"));
      const state = await openRecoverableRefreshSessionState({
        profile,
        transportConfig: s3Config(),
        clock: expiredClock,
      });
      try {
        const error = await captureRejection(state.recoverRefresh(state.binding, freshSignal()));
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("reauthentication_required");
        expect(await profile.readVaultBytes()).toEqual(before);
      } finally {
        state.invalidate();
      }
    });
  });
});

describe("T06-S3 pending blocks fresh rotation; config capture guards", () => {
  it("seeded pending makes rotateRefresh refuse without new key, commit, or dispatch", async () => {
    await withBoundS3Owner(async ({ profile, installed }) => {
      const grant = s3VaultGrant();
      await profile.commit({
        vaultBytes: s3Version2Bytes({
          binding: { ...installed },
          grant,
          pendingRefresh: s3ValidPending(grant),
        }),
      });
      const before = await profile.readVaultBytes();
      const state = await openS3(profile);
      try {
        const error = await captureRejection(state.rotateRefresh(state.binding, freshSignal()));
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("reauthentication_required");
        expect(await profile.readVaultBytes()).toEqual(before);
      } finally {
        state.invalidate();
      }
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });

  it("transport config origin mismatch rejects invalid_arguments before mutation", async () => {
    await withBoundS3Owner(async ({ profile }) => {
      const before = await profile.readVaultBytes();
      const error = await captureRejection(
        openS3(profile, { origin: "https://other.example.invalid" }),
      );
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("invalid_arguments");
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });

  it("valid vault with bad transport budgets rejects safe TransportError", async () => {
    await withBoundS3Owner(async ({ profile }) => {
      const before = await profile.readVaultBytes();
      const error = await captureRejection(
        openS3(profile, s3Config({ budgets: { maxAttempts: 99 } })),
      );
      expect(isTransportError(error)).toBe(true);
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });

  it("captures config before first await; synchronous caller mutation is ignored", async () => {
    await withBoundS3Owner(async ({ profile, installed }) => {
      const config = s3Config({ budgets: { maxAttempts: 1 } });
      const opening = openRecoverableRefreshSessionState({
        profile,
        transportConfig: config,
        clock: liveClock(),
      });
      config.origin = "https://mutated.example.invalid";
      config.budgets.maxAttempts = 99;
      const state = await opening;
      try {
        expect(state.binding).toEqual(installed);
        expect(config.origin).toBe("https://mutated.example.invalid");
        expect(config.budgets).toEqual({ maxAttempts: 99 });
      } finally {
        state.invalidate();
      }
    });
  });
});
