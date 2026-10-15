// T06-S5 QA unit 01 — lifecycle surface, read-only opening, strict v3
// validation, older-factory refusal and clock-callback interruption
// priority (REPAIRED r3: post-admission cancellation boundary, exact
// version codes/keys, duplicate-older seeds; authored against the settled
// S5 work order plus the common lifecycle adjudication, never executed
// before the coordinator's named frozen relay).
//
// Spec basis: "Settled additive public API" (ten runtime exports; flat
// facade binding/nine S4 resource methods/invalidate/signOut/replaceGrant
// ONLY; bound nonnull account with null => authentication_required;
// read-only opening of empty/v1/v2/v3 with no mutation/migration/network;
// no extra error codes) and "Private version3 evidence contract" (strict
// duplicate-key-free UTF-8 JSON with exact fields; same
// origin/account/profileGenerationId with strictly older increasing
// generations; lossless original strings; malformed/duplicates =>
// state_corrupt; unsupported integer version =>
// state_version_unsupported; older factories still refuse v3 safely) plus
// replaceGrant validation (invalid_grant; expired refresh =>
// reauthentication_required with no fence/IO) and the common adjudication
// entry-vs-admitted cancellation split (already-aborted input rejects
// before admission with no new fence; post-admission cancellation before
// advance prevents it and leaves the facade fenced; a clock-callback
// abort/invalidate wins over an expired/invalid reading at each boundary;
// explicit invalidate itself is a permanent local fence).
//
// Bound owners are established through the accepted S1 entry (isolated
// install, invalidate, close, reopen on the returned binding) before any
// grant-state seed, so vault plaintext always matches the T04 binding under
// test. Genuinely pre-auth cases use a separate fresh-owner helper. Owned
// cleanup never swallows close/cleanup failures and never masks a body
// failure behind teardown. No network use: every case either opens state
// only or rejects before admission. Behavioral replacement/sign-out oracles
// belong to the S5 fault file under owned loopback.
//
// SYNTHETIC PROVENANCE: every UUID/token/timestamp below is fabricated for
// isolated QA use only (see ./s5-helpers.mjs). No real credentials, tokens,
// account IDs, private paths, or raw backend bodies are included.

/* global AbortController */

import { describe, expect, it } from "vitest";
import * as authNamespace from "../../../dist/auth/index.js";
import {
  LIFECYCLE_VAULT_VERSION,
  REFRESH_VAULT_VERSION,
  SESSION_VAULT_VERSION,
  SessionError,
  isSessionError,
  openAuthenticatedSessionState,
  openLifecycleSessionState,
  openRecoverableRefreshSessionState,
  openRefreshSessionState,
  openSessionState,
} from "../../../dist/auth/index.js";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import {
  captureRejection,
  freshSignal,
  grantBodyBytes,
  syntheticVaultGrant,
  teardownAll,
  version1Bytes,
} from "./helpers.mjs";
import {
  S5_ACCESS_EXPIRY,
  S5_ACCOUNT,
  S5_ACCOUNT_OTHER,
  S5_BEARER,
  S5_CLOCK_LIVE_MS,
  S5_EXPIRED_REFRESH_EXPIRY,
  S5_ORIGIN,
  S5_REFRESH,
  S5_REFRESH_EXPIRY,
  combineS5Failures,
  s5Clock,
  s5ServiceBytes,
  s5Utf8,
  s5ValidPending,
  s5VaultGrant,
  s5Version2Bytes,
  s5Version3Bytes,
  s5Version3Entry,
} from "./s5-helpers.mjs";

const EXPECTED_EXPORT_KEYS = [
  "LIFECYCLE_VAULT_VERSION",
  "REFRESH_VAULT_VERSION",
  "SESSION_VAULT_VERSION",
  "SessionError",
  "isSessionError",
  "openAuthenticatedSessionState",
  "openLifecycleSessionState",
  "openRecoverableRefreshSessionState",
  "openRefreshSessionState",
  "openSessionState",
];

const EXPECTED_FACADE_KEYS = [
  "binding",
  "createDraft",
  "getExercise",
  "getRoutine",
  "getWorkout",
  "invalidate",
  "listRoutines",
  "listWorkouts",
  "populateDraft",
  "replaceGrant",
  "saveRoutine",
  "searchExercises",
  "signOut",
];

const KNOWN_SESSION_CODES = [
  "invalid_arguments",
  "invalid_grant",
  "state_corrupt",
  "state_version_unsupported",
  "authentication_required",
  "reauthentication_required",
  "operation_interrupted",
];

function lifecycleConfig(origin) {
  return { origin };
}

async function openLifecycle(profile, clock = s5Clock()) {
  return openLifecycleSessionState({
    profile,
    transportConfig: lifecycleConfig(profile.binding.origin),
    clock,
  });
}

// Establish a genuinely bound owner through the accepted S1 entry: isolated
// install of the synthetic S5 grant, S1 invalidate, close, reopen on the
// returned binding. fn receives { facility, profile, binding }. Resources
// are protected from first acquisition; close/cleanup failures propagate
// honestly and a secondary teardown failure never masks a body failure.
async function withBoundOwner(fn) {
  let facility = null;
  let profile = null;
  let bodyError = null;
  try {
    facility = await createStorageTestFacility();
    profile = await facility.provision(S5_ORIGIN);
    const s1 = await openSessionState({ profile, clock: s5Clock() });
    let installed;
    try {
      installed = await s1.installInitialGrant(
        profile.binding,
        grantBodyBytes({
          account: { id: S5_ACCOUNT, displayName: null },
          accessToken: S5_BEARER,
          accessExpiresAt: S5_ACCESS_EXPIRY,
          refreshToken: S5_REFRESH,
          refreshExpiresAt: S5_REFRESH_EXPIRY,
        }),
        freshSignal(),
      );
    } finally {
      s1.invalidate();
    }
    await profile.close();
    profile = await facility.open(installed);
    await fn({ facility, profile, binding: profile.binding });
  } catch (error) {
    bodyError = error;
  }
  let teardownError = null;
  try {
    await teardownAll([
      ...(profile === null ? [] : [() => profile.close()]),
      ...(facility === null ? [] : [() => facility.cleanup()]),
    ]);
  } catch (error) {
    teardownError = error;
  }
  combineS5Failures(bodyError, teardownError);
}

// Genuinely pre-auth owner: no S1 install, no grant. Same honest
// acquisition/teardown protection as withBoundOwner.
async function withFreshOwner(fn) {
  let facility = null;
  let profile = null;
  let bodyError = null;
  try {
    facility = await createStorageTestFacility();
    profile = await facility.provision(S5_ORIGIN);
    await fn({ facility, profile, binding: profile.binding });
  } catch (error) {
    bodyError = error;
  }
  let teardownError = null;
  try {
    await teardownAll([
      ...(profile === null ? [] : [() => profile.close()]),
      ...(facility === null ? [] : [() => facility.cleanup()]),
    ]);
  } catch (error) {
    teardownError = error;
  }
  combineS5Failures(bodyError, teardownError);
}

describe("t06-s5 lifecycle surface, opening and v3 validation", () => {
  it("exposes exactly the ten runtime exports with vault versions 1/2/3", () => {
    expect(Object.keys(authNamespace).sort()).toEqual([...EXPECTED_EXPORT_KEYS].sort());
    expect(typeof authNamespace.openLifecycleSessionState).toBe("function");
    expect(typeof authNamespace.openAuthenticatedSessionState).toBe("function");
    expect(typeof authNamespace.isSessionError).toBe("function");
    expect(new SessionError("authentication_required")).toBeInstanceOf(Error);
    expect(SESSION_VAULT_VERSION).toBe(1);
    expect(REFRESH_VAULT_VERSION).toBe(2);
    expect(LIFECYCLE_VAULT_VERSION).toBe(3);
  });

  it("adds no new SessionError code: an invented code never round-trips", () => {
    for (const code of KNOWN_SESSION_CODES) {
      expect(new SessionError(code).code).toBe(code);
    }
    let probe;
    try {
      probe = new SessionError("signed_out").code;
    } catch {
      probe = "invalid_arguments";
    }
    expect(probe).not.toBe("signed_out");
    expect(KNOWN_SESSION_CODES).toContain(probe);
  });

  it("requires a bound nonnull account at open (null => authentication_required)", async () => {
    await withFreshOwner(async ({ profile, binding }) => {
      expect(binding.accountUuid).toBeNull();
      const before = await profile.readVaultBytes();
      expect(before.length).toBe(0);
      const error = await captureRejection(openLifecycle(profile));
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("authentication_required");
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });

  it("opens read-only on empty/v1/v2/v3 vaults without mutation", async () => {
    await withBoundOwner(async ({ profile, binding }) => {
      const liveGrant = s5VaultGrant();
      const pending = s5ValidPending(liveGrant);
      const retainedEntry = s5Version3Entry({
        binding: { ...binding, sessionGeneration: 0 },
        grant: s5VaultGrant({
          accessToken: "synthetic-qa-t06-s5-access.00",
          refreshToken: "synthetic-qa-t06-s5-refresh.00",
        }),
        pendingRefresh: null,
      });
      const seeds = [
        new Uint8Array(0),
        version1Bytes({
          origin: binding.origin,
          accountUuid: binding.accountUuid,
          sessionGeneration: binding.sessionGeneration,
          profileGenerationId: binding.profileGenerationId,
          grant: syntheticVaultGrant({ accountUuid: S5_ACCOUNT }),
        }),
        s5Version2Bytes({ binding, grant: liveGrant, pendingRefresh: pending }),
        s5Version3Bytes({
          binding,
          grant: liveGrant,
          pendingRefresh: null,
          superseded: [retainedEntry],
        }),
      ];
      for (const seed of seeds) {
        await profile.commit({ vaultBytes: seed });
        const seeded = await profile.readVaultBytes();
        const state = await openLifecycle(profile);
        try {
          expect(state.binding).toEqual(binding);
          expect(typeof state.signOut).toBe("function");
          expect(typeof state.replaceGrant).toBe("function");
          expect(typeof state.invalidate).toBe("function");
          const afterOpen = await profile.readVaultBytes();
          expect(Buffer.from(afterOpen)).toEqual(Buffer.from(seeded));
        } finally {
          state.invalidate();
        }
      }
    });
  });

  it("rejects malformed v3 retention as state_corrupt without mutation", async () => {
    await withBoundOwner(async ({ profile, binding }) => {
      const liveGrant = s5VaultGrant();
      const older = { ...binding, sessionGeneration: 0 };
      const malformed = [
        s5Version3Bytes({
          binding,
          grant: liveGrant,
          pendingRefresh: null,
          superseded: [
            s5Version3Entry({ binding: older, grant: liveGrant }),
            s5Version3Entry({ binding: { ...older }, grant: liveGrant }),
          ],
        }),
        s5Version3Bytes({
          binding,
          grant: liveGrant,
          pendingRefresh: null,
          superseded: [
            s5Version3Entry({
              binding: {
                origin: binding.origin,
                accountUuid: S5_ACCOUNT_OTHER,
                sessionGeneration: 0,
                profileGenerationId: binding.profileGenerationId,
              },
              grant: s5VaultGrant({ accountUuid: S5_ACCOUNT_OTHER }),
            }),
          ],
        }),
      ];
      for (const seed of malformed) {
        await profile.commit({ vaultBytes: seed });
        const seeded = await profile.readVaultBytes();
        const error = await captureRejection(openLifecycle(profile));
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("state_corrupt");
        expect(await profile.readVaultBytes()).toEqual(seeded);
      }
    });
  });

  it("older factories refuse v3 with state_version_unsupported and no erasure", async () => {
    await withBoundOwner(async ({ profile, binding }) => {
      const liveGrant = s5VaultGrant();
      await profile.commit({
        vaultBytes: s5Version3Bytes({
          binding,
          grant: liveGrant,
          pendingRefresh: null,
          superseded: [
            s5Version3Entry({
              binding: { ...binding, sessionGeneration: 0 },
              grant: liveGrant,
            }),
          ],
        }),
      });
      const seeded = await profile.readVaultBytes();
      // Deferred invocations: each rejecting attempt is observed
      // immediately, so an assertion failure can never leave a started
      // promise unobserved.
      const openers = [
        () => openSessionState({ profile, clock: s5Clock() }),
        () =>
          openRefreshSessionState({
            profile,
            transportConfig: lifecycleConfig(binding.origin),
            clock: s5Clock(),
          }),
        () =>
          openRecoverableRefreshSessionState({
            profile,
            transportConfig: lifecycleConfig(binding.origin),
            clock: s5Clock(),
          }),
        () =>
          openAuthenticatedSessionState({
            profile,
            transportConfig: lifecycleConfig(binding.origin),
            clock: s5Clock(),
          }),
      ];
      for (const start of openers) {
        const error = await captureRejection(start());
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("state_version_unsupported");
      }
      expect(await profile.readVaultBytes()).toEqual(seeded);
    });
  });

  it("rejects malformed service bytes with invalid_grant and no fence", async () => {
    await withBoundOwner(async ({ profile, binding }) => {
      const state = await openLifecycle(profile);
      try {
        const seeded = await profile.readVaultBytes();
        const first = await captureRejection(
          state.replaceGrant(binding, s5Utf8('{"bogus":true}'), freshSignal()),
        );
        expect(isSessionError(first)).toBe(true);
        expect(first.code).toBe("invalid_grant");
        expect(await profile.readVaultBytes()).toEqual(seeded);
        const repeat = await captureRejection(
          state.replaceGrant(binding, s5Utf8("not-json"), freshSignal()),
        );
        expect(isSessionError(repeat)).toBe(true);
        expect(repeat.code).toBe("invalid_grant");
        expect(await profile.readVaultBytes()).toEqual(seeded);
      } finally {
        state.invalidate();
      }
    });
  });

  it("rejects expired-refresh replacement with reauthentication_required and no fence", async () => {
    await withBoundOwner(async ({ profile, binding }) => {
      const state = await openLifecycle(profile);
      try {
        const seeded = await profile.readVaultBytes();
        const staleBytes = Buffer.from(
          JSON.stringify({
            account: { id: S5_ACCOUNT, displayName: null },
            accessToken: "synthetic-qa-t06-s5-access.stale",
            accessExpiresAt: S5_ACCESS_EXPIRY,
            refreshToken: "synthetic-qa-t06-s5-refresh.stale",
            refreshExpiresAt: S5_EXPIRED_REFRESH_EXPIRY,
          }),
          "utf8",
        );
        const first = await captureRejection(
          state.replaceGrant(binding, staleBytes, freshSignal()),
        );
        expect(isSessionError(first)).toBe(true);
        expect(first.code).toBe("reauthentication_required");
        expect(await profile.readVaultBytes()).toEqual(seeded);
        const repeat = await captureRejection(
          state.replaceGrant(binding, staleBytes, freshSignal()),
        );
        expect(isSessionError(repeat)).toBe(true);
        expect(repeat.code).toBe("reauthentication_required");
        expect(await profile.readVaultBytes()).toEqual(seeded);
      } finally {
        state.invalidate();
      }
    });
  });

  it("post-admission clock abort wins over an expired reading and fences", async () => {
    await withBoundOwner(async ({ profile, binding }) => {
      const controller = new AbortController();
      const expiredMs = Date.parse("2026-12-01T00:00:00.000Z");
      let calls = 0;
      const racingClock = {
        nowMs: () => {
          calls += 1;
          if (calls === 1) return S5_CLOCK_LIVE_MS;
          controller.abort();
          return expiredMs;
        },
      };
      const state = await openLifecycle(profile, racingClock);
      try {
        const seeded = await profile.readVaultBytes();
        const error = await captureRejection(
          state.replaceGrant(binding, s5ServiceBytes(), controller.signal),
        );
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("operation_interrupted");
        expect(await profile.readVaultBytes()).toEqual(seeded);
        expect(calls > 1).toBe(true);
        const repeat = await captureRejection(
          state.replaceGrant(binding, s5ServiceBytes(), freshSignal()),
        );
        expect(isSessionError(repeat)).toBe(true);
        expect(repeat.code).toBe("operation_interrupted");
        expect(await profile.readVaultBytes()).toEqual(seeded);
      } finally {
        state.invalidate();
      }
    });
  });

  it("clock-callback invalidate wins over an invalid reading and fences", async () => {
    await withBoundOwner(async ({ profile, binding }) => {
      let state = null;
      const racingClock = {
        nowMs: () => {
          if (state !== null) state.invalidate();
          return NaN;
        },
      };
      state = await openLifecycle(profile, racingClock);
      try {
        const seeded = await profile.readVaultBytes();
        const error = await captureRejection(
          state.replaceGrant(binding, s5ServiceBytes(), freshSignal()),
        );
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("operation_interrupted");
        expect(await profile.readVaultBytes()).toEqual(seeded);
        const repeat = await captureRejection(
          state.replaceGrant(binding, s5ServiceBytes(), freshSignal()),
        );
        expect(isSessionError(repeat)).toBe(true);
        expect(repeat.code).toBe("operation_interrupted");
        expect(await profile.readVaultBytes()).toEqual(seeded);
      } finally {
        state.invalidate();
      }
    });
  });

  it("exposes exactly the flat facade keys and nothing else", async () => {
    await withBoundOwner(async ({ profile, binding }) => {
      const state = await openLifecycle(profile);
      try {
        expect(state.binding).toEqual(binding);
        expect(Object.keys(state).sort()).toEqual([...EXPECTED_FACADE_KEYS].sort());
        for (const name of EXPECTED_FACADE_KEYS) {
          if (name !== "binding") expect(typeof state[name]).toBe("function");
        }
      } finally {
        state.invalidate();
      }
    });
  });
});
