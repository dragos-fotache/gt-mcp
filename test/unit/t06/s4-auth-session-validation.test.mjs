// T06-S4 QA unit 01 — authenticated session surface, open validation and
// entry gates (REPAIRED r1, HOLD: authored against the settled S4 work order
// plus the common interface adjudication, never executed before the
// coordinator's named frozen relay).
//
// Spec basis: work-order "Settled additive public API" (eight runtime
// exports; nine method signatures exactly the T05 BackendTransport ones;
// expose binding/nine methods/invalidate ONLY; read-only factory open of
// empty/v1/v2; invalid/foreign/corrupt/unsupported fails closed; config
// validated without discarding unknown keys or invalid maxAttempts before
// the S4 retry policy) with adjudication entry classes (Session/state gates
// stay SessionError; trusted T05 config propagates the original safe
// TransportError; origin mismatch is SessionError invalid_arguments;
// malformed route IDs/keys/query/body may be either safe invalid_arguments
// brand; only body-byte budget overflow is TransportError request_too_large)
// and step 1 (missing grant => authentication_required; malformed caller =>
// invalid_arguments; foreign/invalidated => operation_interrupted). No
// network use: every case either opens state only or rejects before
// dispatch. Behavioral capture, pre-auth validation, held-auth identity and
// delivery boundaries belong to the S4 fault files under owned loopback.
//
// Bound owners are established through the accepted S1 entry (isolated
// install, invalidate, close, reopen on the returned binding) before any
// grant-state seed, so vault plaintext always matches the T04 binding under
// test. Genuinely pre-auth cases use a separate fresh-owner helper. Owned
// cleanup never swallows close/cleanup failures and never masks a body
// failure behind teardown.
//
// SYNTHETIC PROVENANCE: every UUID/token/timestamp below is fabricated for
// isolated QA use only (see ./s4-helpers.mjs). No real credentials, tokens,
// account IDs, private paths, or raw backend bodies are included.

import { describe, expect, it } from "vitest";
import * as authNamespace from "../../../dist/auth/index.js";
import {
  REFRESH_VAULT_VERSION,
  SESSION_VAULT_VERSION,
  SessionError,
  isSessionError,
  openAuthenticatedSessionState,
} from "../../../dist/auth/index.js";
import { isTransportError } from "../../../dist/http/index.js";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import {
  abortedSignal,
  captureRejection,
  freshSignal,
  grantBodyBytes,
  teardownAll,
} from "./helpers.mjs";
import {
  S4_ACCOUNT,
  S4_ORIGIN,
  S4_PROFILE,
  S4_RESOURCE_KEY,
  S4_ROUTINE,
  combineS4Failures,
  s4Clock,
  s4VaultGrant,
  s4Version2Bytes,
} from "./s4-helpers.mjs";

const NINE_METHODS = [
  "searchExercises",
  "getExercise",
  "listWorkouts",
  "getWorkout",
  "listRoutines",
  "getRoutine",
  "createDraft",
  "populateDraft",
  "saveRoutine",
];

const DOCUMENTED_FACADE_KEYS = [...NINE_METHODS, "binding", "invalidate"];

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

const KNOWN_SESSION_CODES = [
  "invalid_arguments",
  "invalid_grant",
  "state_corrupt",
  "state_version_unsupported",
  "authentication_required",
  "reauthentication_required",
  "operation_interrupted",
];

// Establish a genuinely bound owner through the accepted S1 entry: isolated
// install of the synthetic S4 grant, S1 invalidate, close, reopen on the
// returned binding. fn receives { facility, profile, binding }. Resources
// are protected from first acquisition; close/cleanup failures propagate
// honestly and a secondary teardown failure never masks a body failure.
async function withBoundOwner(fn) {
  let facility = null;
  let profile = null;
  let bodyError = null;
  try {
    facility = await createStorageTestFacility();
    profile = await facility.provision(S4_ORIGIN);
    const s1 = await authNamespace.openSessionState({ profile, clock: s4Clock() });
    let installed;
    try {
      installed = await s1.installInitialGrant(
        profile.binding,
        grantBodyBytes({ account: { id: S4_ACCOUNT, displayName: null } }),
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
  combineS4Failures(bodyError, teardownError);
}

// Genuinely pre-auth owner: no S1 install, no grant. Same honest
// acquisition/teardown protection as withBoundOwner.
async function withFreshOwner(fn) {
  let facility = null;
  let profile = null;
  let bodyError = null;
  try {
    facility = await createStorageTestFacility();
    profile = await facility.provision(S4_ORIGIN);
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
  combineS4Failures(bodyError, teardownError);
}

async function openS4(profile, transportConfig = { origin: S4_ORIGIN }) {
  return openAuthenticatedSessionState({
    profile,
    transportConfig,
    clock: s4Clock(),
  });
}

describe("t06-s4 authenticated session surface and entry gates", () => {
  it("exposes exactly the ten runtime exports with vault versions 1/2/3", () => {
    expect(Object.keys(authNamespace).sort()).toEqual([...EXPECTED_EXPORT_KEYS].sort());
    expect(typeof authNamespace.openAuthenticatedSessionState).toBe("function");
    expect(typeof authNamespace.openLifecycleSessionState).toBe("function");
    expect(typeof authNamespace.isSessionError).toBe("function");
    expect(new SessionError("authentication_required")).toBeInstanceOf(Error);
    expect(SESSION_VAULT_VERSION).toBe(1);
    expect(REFRESH_VAULT_VERSION).toBe(2);
    expect(authNamespace.LIFECYCLE_VAULT_VERSION).toBe(3);
  });

  it("adds no new SessionError code: an invented code never round-trips", () => {
    for (const code of KNOWN_SESSION_CODES) {
      expect(new SessionError(code).code).toBe(code);
    }
    let probe;
    try {
      probe = new SessionError("refresh_required").code;
    } catch {
      probe = "invalid_arguments";
    }
    expect(probe).not.toBe("refresh_required");
    expect(KNOWN_SESSION_CODES).toContain(probe);
  });

  it("opens read-only on an empty vault without migration", async () => {
    await withFreshOwner(async ({ profile, binding }) => {
      const before = await profile.readVaultBytes();
      expect(before.length).toBe(0);
      const state = await openS4(profile);
      try {
        expect(state.binding).toEqual(binding);
        const after = await profile.readVaultBytes();
        expect(Buffer.from(after)).toEqual(Buffer.from(before));
      } finally {
        state.invalidate();
      }
    });
  });

  it("opens read-only on settled version2 state without vault mutation", async () => {
    await withBoundOwner(async ({ profile, binding }) => {
      await profile.commit({
        vaultBytes: s4Version2Bytes({ binding, grant: s4VaultGrant() }),
      });
      const seeded = await profile.readVaultBytes();
      const state = await openS4(profile);
      try {
        expect(state.binding).toEqual(binding);
        const afterOpen = await profile.readVaultBytes();
        expect(Buffer.from(afterOpen)).toEqual(Buffer.from(seeded));
      } finally {
        state.invalidate();
      }
    });
  });

  it("rejects a no-grant resource call with authentication_required", async () => {
    await withFreshOwner(async ({ profile, binding }) => {
      const state = await openS4(profile);
      try {
        const error = await captureRejection(state.listWorkouts(binding, {}, freshSignal()));
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("authentication_required");
      } finally {
        state.invalidate();
      }
    });
  });

  it("rejects malformed callers with invalid_arguments in either safe brand", async () => {
    await withBoundOwner(async ({ profile, binding }) => {
      const state = await openS4(profile);
      try {
        const badGeneration = { ...binding, sessionGeneration: -1 };
        const malformed = await captureRejection(
          state.listWorkouts(badGeneration, {}, freshSignal()),
        );
        expect(isSessionError(malformed) || isTransportError(malformed)).toBe(true);
        expect(malformed.code).toBe("invalid_arguments");
        const noSignal = await captureRejection(state.listWorkouts(binding, {}, null));
        expect(isSessionError(noSignal) || isTransportError(noSignal)).toBe(true);
        expect(noSignal.code).toBe("invalid_arguments");
      } finally {
        state.invalidate();
      }
    });
  });

  it("rejects aborted, foreign and invalidated callers with operation_interrupted", async () => {
    await withBoundOwner(async ({ profile, binding }) => {
      const state = await openS4(profile);
      const aborted = await captureRejection(state.listWorkouts(binding, {}, abortedSignal()));
      expect(isSessionError(aborted) || isTransportError(aborted)).toBe(true);
      expect(aborted.code).toBe("operation_interrupted");
      const foreign = { ...binding, profileGenerationId: S4_PROFILE };
      expect(foreign.profileGenerationId).not.toBe(binding.profileGenerationId);
      const foreignError = await captureRejection(state.listWorkouts(foreign, {}, freshSignal()));
      expect(isSessionError(foreignError) || isTransportError(foreignError)).toBe(true);
      expect(foreignError.code).toBe("operation_interrupted");
      state.invalidate();
      const afterInvalidate = await captureRejection(
        state.listWorkouts(binding, {}, freshSignal()),
      );
      expect(isSessionError(afterInvalidate) || isTransportError(afterInvalidate)).toBe(true);
      expect(afterInvalidate.code).toBe("operation_interrupted");
    });
  });

  it("exposes exactly the documented facade keys and nothing else enumerable", async () => {
    await withBoundOwner(async ({ profile, binding }) => {
      const state = await openS4(profile);
      try {
        expect(state.binding).toEqual(binding);
        for (const name of DOCUMENTED_FACADE_KEYS) {
          expect(typeof state[name] !== "undefined").toBe(true);
        }
        for (const name of NINE_METHODS) {
          expect(typeof state[name]).toBe("function");
        }
        expect(typeof state.invalidate).toBe("function");
        expect(Object.keys(state).sort()).toEqual([...DOCUMENTED_FACADE_KEYS].sort());
        for (const forbidden of [
          "rotateRefresh",
          "recoverRefresh",
          "hooks",
          "selectCredential",
          "installInitialGrant",
          "sender",
          "send",
          "request",
          "credentials",
          "grant",
          "pendingRefresh",
          "transport",
          "profile",
          "clock",
        ]) {
          expect(forbidden in Object(state)).toBe(false);
        }
      } finally {
        state.invalidate();
      }
    });
  });

  it("rejects a mismatched transport origin at open with invalid_arguments", async () => {
    await withBoundOwner(async ({ profile }) => {
      const error = await captureRejection(
        openAuthenticatedSessionState({
          profile,
          transportConfig: { origin: "https://other.example.invalid" },
          clock: s4Clock(),
        }),
      );
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("invalid_arguments");
    });
  });

  it("surfaces invalid maxAttempts as TransportError invalid_arguments, not a silent cap", async () => {
    await withBoundOwner(async ({ profile }) => {
      const error = await captureRejection(
        openAuthenticatedSessionState({
          profile,
          transportConfig: { origin: S4_ORIGIN, budgets: { maxAttempts: 99 } },
          clock: s4Clock(),
        }),
      );
      expect(isTransportError(error)).toBe(true);
      expect(error.code).toBe("invalid_arguments");
    });
  });

  it("rejects invalid route arguments in either safe brand before any dispatch", async () => {
    await withBoundOwner(async ({ profile, binding }) => {
      const state = await openS4(profile);
      try {
        const badId = await captureRejection(
          state.getRoutine(binding, "not-a-uuid", freshSignal()),
        );
        expect(isSessionError(badId) || isTransportError(badId)).toBe(true);
        expect(badId.code).toBe("invalid_arguments");
        const badBody = await captureRejection(
          state.createDraft(binding, S4_ROUTINE, "not-bytes", S4_RESOURCE_KEY, freshSignal()),
        );
        expect(isSessionError(badBody) || isTransportError(badBody)).toBe(true);
        expect(badBody.code).toBe("invalid_arguments");
      } finally {
        state.invalidate();
      }
    });
  });

  it("invalidate is synchronous, idempotent and permanent", async () => {
    await withBoundOwner(async ({ profile, binding }) => {
      const state = await openS4(profile);
      state.invalidate();
      state.invalidate();
      const error = await captureRejection(state.getRoutine(binding, S4_ROUTINE, freshSignal()));
      expect(isSessionError(error) || isTransportError(error)).toBe(true);
      expect(error.code).toBe("operation_interrupted");
    });
  });
});
