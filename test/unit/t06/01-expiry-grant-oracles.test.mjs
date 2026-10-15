// T06-S1 QA 01 — vault version, grant validation, and initial installation
// (SOURCE-READY, HOLD: authored against the settled work-order public API,
// never executed before the coordinator's named frozen relay).
//
/* global AbortController */

// Spec basis: work-order sections "Public entry and API", "Vault version and
// grant validation", plus the common clarification (opaque refresh DATA,
// prototype clock support, future-version-first ordering, no auth
// byte/depth caps). Every case awaits a real openSessionState /
// installInitialGrant outcome and asserts a literal contract result. Valid
// seeds and expected bindings always derive the profile identity from the
// test's own issued owner binding; every invalid case alters only its
// claimed fault. No placeholders, skips, or self-oracle assertions.

import { describe, expect, it } from "vitest";
import {
  SESSION_VAULT_VERSION,
  isSessionError,
  openSessionState,
  SessionError,
} from "../../../dist/auth/index.js";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import { waitForDeadline } from "../../fault/t05/helpers.mjs";
import {
  ACCESS_EXPIRY,
  ACCESS_EXPIRY_MS,
  ACCOUNT_A,
  ACCOUNT_B,
  BEARER_A,
  CLOCK_LIVE_MS,
  ORIGIN,
  REFRESH_A,
  REFRESH_EXPIRY,
  REFRESH_EXPIRY_MS,
  abortedSignal,
  captureRejection,
  detachedBytes,
  freshSignal,
  grantBodyBytes,
  liveClock,
  makeBindGateOwner,
  makeClock,
  makeValidationGateOwner,
  sharedBackingBytes,
  syntheticGrantBody,
  teardownAll,
  utf8,
  utf8Text,
  version1Bytes,
} from "./helpers.mjs";

// Provision one isolated diagnostic facility + owner profile, run fn, then
// close the owner and remove the facility even when fn fails. Execution
// happens only after the frozen relay; this helper performs no work at
// import time.
async function withOwner(fn, origin = ORIGIN) {
  const facility = await createStorageTestFacility();
  let profile = null;
  let bodyError = null;
  try {
    profile = await facility.provision(origin);
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

// Unbound version-1 seed matching the test's own issued owner identity, so
// only the caller-supplied fault can cause rejection.
function issuedSeed(profile, overrides = {}) {
  const issued = profile.binding;
  return {
    origin: issued.origin,
    sessionGeneration: 0,
    profileGenerationId: issued.profileGenerationId,
    ...overrides,
  };
}

describe("T06-S1 public surface and error identity", () => {
  it("publishes SESSION_VAULT_VERSION as the literal 1", () => {
    expect(SESSION_VAULT_VERSION).toBe(1);
    expect(liveClock().nowMs()).toBe(CLOCK_LIVE_MS);
  });

  it("round-trips SessionError codes and discriminates foreign errors", () => {
    for (const code of [
      "invalid_arguments",
      "invalid_grant",
      "state_corrupt",
      "state_version_unsupported",
      "authentication_required",
      "reauthentication_required",
      "operation_interrupted",
    ]) {
      const error = new SessionError(code);
      expect(error.code).toBe(code);
      expect(isSessionError(error)).toBe(true);
    }
    expect(isSessionError(new Error("plain"))).toBe(false);
    expect(isSessionError(null)).toBe(false);
    expect(isSessionError({ code: "invalid_grant" })).toBe(false);
  });

  it("accepts a prototype SessionClock method with its receiver preserved", async () => {
    class FixedClock {
      constructor(ms) {
        this.ms = ms;
      }
      nowMs() {
        return this.ms;
      }
    }
    await withOwner(async ({ profile }) => {
      const issued = profile.binding.profileGenerationId;
      const state = await openSessionState({
        profile,
        clock: new FixedClock(CLOCK_LIVE_MS),
      });
      try {
        const installed = await state.installInitialGrant(
          state.binding,
          grantBodyBytes(),
          freshSignal(),
        );
        expect(installed).toEqual({
          origin: ORIGIN,
          accountUuid: ACCOUNT_A,
          sessionGeneration: 1,
          profileGenerationId: issued,
        });
      } finally {
        state.invalidate();
      }
    });
  });
});

describe("T06-S1 uninitialized and null-grant vaults select nothing", () => {
  it("zero-length vault opens with no usable credentials", async () => {
    await withOwner(async ({ profile }) => {
      const state = await openSessionState({
        profile,
        clock: liveClock(),
      });
      try {
        expect(state.binding.accountUuid).toBe(null);
        expect(state.binding.sessionGeneration).toBe(0);
        expect(Object.isFrozen(state.binding)).toBe(true);
        expect(
          await state.hooks.selectCredential(state.binding, "get_routine", freshSignal()),
        ).toBe(null);
      } finally {
        state.invalidate();
      }
    });
  });

  it("valid version-1 null-grant record opens with no usable credentials", async () => {
    await withOwner(async ({ profile }) => {
      await profile.commit({ vaultBytes: version1Bytes(issuedSeed(profile)) });
      const state = await openSessionState({
        profile,
        clock: liveClock(),
      });
      try {
        expect(state.binding.accountUuid).toBe(null);
        expect(
          await state.hooks.selectCredential(state.binding, "list_routines", freshSignal()),
        ).toBe(null);
      } finally {
        state.invalidate();
      }
    });
  });
});

describe("T06-S1 corrupt vaults fail closed as state_corrupt", () => {
  function vaultGrant() {
    return {
      accountUuid: ACCOUNT_A,
      accessToken: BEARER_A,
      accessExpiresAt: ACCESS_EXPIRY,
      refreshToken: REFRESH_A,
      refreshExpiresAt: REFRESH_EXPIRY,
    };
  }

  const corruptBuilders = {
    "malformed JSON": () => utf8('{"version":1,'),
    "malformed UTF-8": () => new Uint8Array([0x7b, 0xff, 0x7d]),
    "duplicate keys": (seed) =>
      utf8(
        `{"version":1,"version":1,"binding":{"origin":"${seed.origin}","accountUuid":null,"sessionGeneration":0,"profileGenerationId":"${seed.profileGenerationId}"},"grant":null}`,
      ),
    "extra top-level field": (seed) =>
      utf8(JSON.stringify({ ...version1RecordOf(seed), extraField: true })),
    "missing grant field": (seed) => {
      const record = version1RecordOf(seed);
      delete record.grant;
      return utf8(JSON.stringify(record));
    },
    "binding origin mismatch": (seed) =>
      version1Bytes({ ...seed, origin: "https://other.example.invalid" }),
    "unbound profile containing a grant": (seed) => version1Bytes({ ...seed, grant: vaultGrant() }),
  };

  function version1RecordOf(seed) {
    return {
      version: 1,
      binding: {
        origin: seed.origin,
        accountUuid: null,
        sessionGeneration: 0,
        profileGenerationId: seed.profileGenerationId,
      },
      grant: null,
    };
  }

  for (const [name, build] of Object.entries(corruptBuilders)) {
    it(`rejects ${name} without repair`, async () => {
      await withOwner(async ({ profile }) => {
        const bytes = build(issuedSeed(profile));
        await profile.commit({ vaultBytes: bytes });
        const error = await captureRejection(openSessionState({ profile, clock: liveClock() }));
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("state_corrupt");
        expect(await profile.readVaultBytes()).toEqual(bytes);
      });
    });
  }

  it("rejects a grant-account mismatch under an exactly matched binding", async () => {
    const facility = await createStorageTestFacility();
    let profile = null;
    try {
      profile = await facility.provision(ORIGIN);
      const installer = await openSessionState({
        profile,
        clock: liveClock(),
      });
      const installed = await installer.installInitialGrant(
        installer.binding,
        grantBodyBytes(),
        freshSignal(),
      );
      installer.invalidate();
      await profile.close();
      profile = await facility.open(installed);
      const tampered = version1Bytes({
        origin: installed.origin,
        accountUuid: installed.accountUuid,
        sessionGeneration: installed.sessionGeneration,
        profileGenerationId: installed.profileGenerationId,
        grant: { ...vaultGrant(), accountUuid: ACCOUNT_B },
      });
      await profile.commit({ vaultBytes: tampered });
      const error = await captureRejection(openSessionState({ profile, clock: liveClock() }));
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("state_corrupt");
      expect(await profile.readVaultBytes()).toEqual(tampered);
    } finally {
      const steps = [];
      if (profile !== null) steps.push(() => profile.close());
      steps.push(() => facility.cleanup());
      await teardownAll(steps);
    }
  });
});

describe("T06-S1 unsupported vault version is refused without migration", () => {
  it("well-formed version 2 rejects state_version_unsupported, bytes intact", async () => {
    await withOwner(async ({ profile }) => {
      const seed = issuedSeed(profile);
      const bytes = utf8(
        JSON.stringify({
          version: 2,
          binding: {
            origin: seed.origin,
            accountUuid: null,
            sessionGeneration: 0,
            profileGenerationId: seed.profileGenerationId,
          },
          grant: null,
        }),
      );
      await profile.commit({ vaultBytes: bytes });
      const error = await captureRejection(openSessionState({ profile, clock: liveClock() }));
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("state_version_unsupported");
      expect(await profile.readVaultBytes()).toEqual(bytes);
    });
  });

  it("rejects future versions with additional fields before version1 checks", async () => {
    await withOwner(async ({ profile }) => {
      const bytes = utf8(
        JSON.stringify({
          version: 3,
          futureField: "future extension record",
        }),
      );
      await profile.commit({ vaultBytes: bytes });
      const error = await captureRejection(openSessionState({ profile, clock: liveClock() }));
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("state_version_unsupported");
      expect(await profile.readVaultBytes()).toEqual(bytes);
    });
  });
});

describe("T06-S1 invalid service grants reject as invalid_grant", () => {
  async function installCase(bodyBytes) {
    let observed = null;
    await withOwner(async ({ profile }) => {
      const state = await openSessionState({
        profile,
        clock: liveClock(),
      });
      try {
        observed = await captureRejection(
          state.installInitialGrant(state.binding, bodyBytes, freshSignal()),
        );
      } finally {
        state.invalidate();
      }
    });
    return observed;
  }

  it("rejects a grant missing each required field", async () => {
    for (const key of ["accessToken", "accessExpiresAt", "refreshToken", "refreshExpiresAt"]) {
      const body = syntheticGrantBody();
      delete body[key];
      const error = await installCase(utf8(JSON.stringify(body)));
      expect(error.code, `missing ${key}`).toBe("invalid_grant");
    }
    const noAccount = syntheticGrantBody();
    delete noAccount.account;
    expect((await installCase(utf8(JSON.stringify(noAccount)))).code).toBe("invalid_grant");
  });

  it("rejects whitespace-bearing bearer and non-canonical account UUID", async () => {
    const spaced = await installCase(grantBodyBytes({ accessToken: "has space" }));
    expect(spaced.code).toBe("invalid_grant");
    const upper = await installCase(
      grantBodyBytes({
        account: { id: ACCOUNT_A.toUpperCase(), displayName: null },
      }),
    );
    expect(upper.code).toBe("invalid_grant");
  });

  it("rejects nonzero sub-millisecond expiry", async () => {
    const bad = await installCase(
      grantBodyBytes({ accessExpiresAt: "2026-09-27T12:15:00.123456789Z" }),
    );
    expect(bad.code).toBe("invalid_grant");
    const micro = await installCase(
      grantBodyBytes({ refreshExpiresAt: "2026-10-27T12:00:00.000001Z" }),
    );
    expect(micro.code).toBe("invalid_grant");
  });

  it("rejects duplicate keys, invalid UTF-8, and non-bytes coercion", async () => {
    const dupe = await installCase(
      utf8(
        `{"account":{"id":"${ACCOUNT_A}","displayName":null},"account":{"id":"${ACCOUNT_A}"},"accessToken":"${BEARER_A}","accessExpiresAt":"${ACCESS_EXPIRY}","refreshToken":"${REFRESH_A}","refreshExpiresAt":"${REFRESH_EXPIRY}"}`,
      ),
    );
    expect(dupe.code).toBe("invalid_grant");
    const badUtf8 = await installCase(new Uint8Array([0x7b, 0xff, 0x7d]));
    expect(badUtf8.code).toBe("invalid_grant");
    await withOwner(async ({ profile }) => {
      const state = await openSessionState({
        profile,
        clock: liveClock(),
      });
      try {
        const coerced = await captureRejection(
          state.installInitialGrant(
            state.binding,
            JSON.stringify(syntheticGrantBody()),
            freshSignal(),
          ),
        );
        expect(isSessionError(coerced)).toBe(true);
        expect(coerced.code).toBe("invalid_arguments");
        const shared = await captureRejection(
          state.installInitialGrant(state.binding, sharedBackingBytes(), freshSignal()),
        );
        expect(shared.code).toBe("invalid_arguments");
        const detached = await captureRejection(
          state.installInitialGrant(state.binding, detachedBytes(), freshSignal()),
        );
        expect(detached.code).toBe("invalid_arguments");
      } finally {
        state.invalidate();
      }
    });
  });
});

describe("T06-S1 refresh token is opaque data, not identity authority", () => {
  it("accepts JWT-like, account-shaped, and repeated refresh material", async () => {
    for (const refreshToken of [
      "synthetic-header.synthetic-claims.synthetic-signature",
      ACCOUNT_A,
      BEARER_A,
    ]) {
      await withOwner(async ({ profile }) => {
        const issued = profile.binding.profileGenerationId;
        const state = await openSessionState({
          profile,
          clock: liveClock(),
        });
        try {
          const installed = await state.installInitialGrant(
            state.binding,
            grantBodyBytes({ refreshToken }),
            freshSignal(),
          );
          expect(installed).toEqual({
            origin: ORIGIN,
            accountUuid: ACCOUNT_A,
            sessionGeneration: 1,
            profileGenerationId: issued,
          });
        } finally {
          state.invalidate();
        }
      });
    }
  });
});

describe("T06-S1 zero sub-millisecond tail installs with exact strings kept", () => {
  it("round-trips the original expiry spellings byte for byte", async () => {
    const facility = await createStorageTestFacility();
    let profile = null;
    try {
      profile = await facility.provision(ORIGIN);
      const issued = profile.binding.profileGenerationId;
      const installer = await openSessionState({
        profile,
        clock: liveClock(),
      });
      const accessExpiresAt = "2026-09-27T12:15:00.123000000Z";
      const refreshExpiresAt = "2026-10-27T12:00:00.000000Z";
      const installed = await installer.installInitialGrant(
        installer.binding,
        grantBodyBytes({ accessExpiresAt, refreshExpiresAt }),
        freshSignal(),
      );
      expect(installed).toEqual({
        origin: ORIGIN,
        accountUuid: ACCOUNT_A,
        sessionGeneration: 1,
        profileGenerationId: issued,
      });
      installer.invalidate();
      await profile.close();
      profile = await facility.open(installed);
      expect(utf8Text(await profile.readVaultBytes())).toContain(accessExpiresAt);
      expect(utf8Text(await profile.readVaultBytes())).toContain(refreshExpiresAt);
      expect(utf8Text(await profile.readVaultBytes())).not.toContain("2026-09-27T12:15:00.123Z");
    } finally {
      const steps = [];
      if (profile !== null) steps.push(() => profile.close());
      steps.push(() => facility.cleanup());
      await teardownAll(steps);
    }
  });
});

describe("T06-S1 expired refresh rejects without mutation", () => {
  it("reauthentication_required leaves vault and binding untouched", async () => {
    await withOwner(async ({ profile }) => {
      const state = await openSessionState({
        profile,
        clock: makeClock(REFRESH_EXPIRY_MS),
      });
      try {
        const error = await captureRejection(
          state.installInitialGrant(state.binding, grantBodyBytes(), freshSignal()),
        );
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("reauthentication_required");
        expect(state.binding.accountUuid).toBe(null);
        expect((await profile.readVaultBytes()).length).toBe(0);
        expect(
          await state.hooks.selectCredential(state.binding, "get_routine", freshSignal()),
        ).toBe(null);
      } finally {
        state.invalidate();
      }
    });
  });

  it("expiry equality (now >= expiry) counts as expired", async () => {
    await withOwner(async ({ profile }) => {
      const atExpiry = await openSessionState({
        profile,
        clock: makeClock(REFRESH_EXPIRY_MS),
      });
      try {
        const error = await captureRejection(
          atExpiry.installInitialGrant(atExpiry.binding, grantBodyBytes(), freshSignal()),
        );
        expect(error.code).toBe("reauthentication_required");
      } finally {
        atExpiry.invalidate();
      }
    });
  });

  it("expired access installs but is never selected (S1 has no refresh)", async () => {
    const facility = await createStorageTestFacility();
    let profile = null;
    try {
      profile = await facility.provision(ORIGIN);
      const installer = await openSessionState({
        profile,
        clock: liveClock(),
      });
      const installed = await installer.installInitialGrant(
        installer.binding,
        grantBodyBytes(),
        freshSignal(),
      );
      expect(installed.sessionGeneration).toBe(1);
      installer.invalidate();
      await profile.close();
      profile = await facility.open(installed);
      const late = await openSessionState({
        profile,
        clock: makeClock(ACCESS_EXPIRY_MS),
      });
      try {
        expect(late.binding).toEqual(installed);
        expect(await late.hooks.selectCredential(late.binding, "get_routine", freshSignal())).toBe(
          null,
        );
      } finally {
        late.invalidate();
      }
    } finally {
      const steps = [];
      if (profile !== null) steps.push(() => profile.close());
      steps.push(() => facility.cleanup());
      await teardownAll(steps);
    }
  });
});

describe("T06-S1 argument, clock, and abort validation", () => {
  it("invalid clock fails grant-deadline evaluation with invalid_arguments", async () => {
    await withOwner(async ({ profile }) => {
      const state = await openSessionState({
        profile,
        clock: { nowMs: () => Number.NaN },
      });
      try {
        const error = await captureRejection(
          state.installInitialGrant(state.binding, grantBodyBytes(), freshSignal()),
        );
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("invalid_arguments");
        expect((await profile.readVaultBytes()).length).toBe(0);
      } finally {
        state.invalidate();
      }
    });
  });

  it("missing AbortSignal and aborted signal fail safely", async () => {
    await withOwner(async ({ profile }) => {
      const state = await openSessionState({
        profile,
        clock: liveClock(),
      });
      try {
        const missing = await captureRejection(
          state.installInitialGrant(state.binding, grantBodyBytes(), null),
        );
        expect(missing.code).toBe("invalid_arguments");
        const aborted = await captureRejection(
          state.installInitialGrant(state.binding, grantBodyBytes(), abortedSignal()),
        );
        expect(aborted.code).toBe("operation_interrupted");
        expect((await profile.readVaultBytes()).length).toBe(0);
      } finally {
        state.invalidate();
      }
    });
  });

  it("immediate same-task abort prevents the queued install before commit", async () => {
    // Aborting in the same task prevents queued work before the storage
    // transition begins: operation_interrupted with no vault/binding
    // mutation. This covers prevention-before-commit only; mid-bind
    // cancellation is covered separately below with bind-entry proof, and
    // no permanent-fence claim is made for this prevented case.
    const facility = await createStorageTestFacility();
    let profile = null;
    try {
      profile = await facility.provision(ORIGIN);
      const preAuth = profile.binding;
      const state = await openSessionState({
        profile,
        clock: liveClock(),
      });
      try {
        const controller = new AbortController();
        const pending = state.installInitialGrant(
          state.binding,
          grantBodyBytes(),
          controller.signal,
        );
        controller.abort();
        const error = await captureRejection(pending);
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("operation_interrupted");
        expect(state.binding.accountUuid).toBe(null);
        expect((await profile.readVaultBytes()).length).toBe(0);
      } finally {
        state.invalidate();
      }
      await profile.close();
      profile = await facility.open(preAuth);
      const reopened = await openSessionState({
        profile,
        clock: liveClock(),
      });
      try {
        expect(reopened.binding).toEqual(preAuth);
        expect(
          await reopened.hooks.selectCredential(reopened.binding, "get_routine", freshSignal()),
        ).toBe(null);
      } finally {
        reopened.invalidate();
      }
    } finally {
      const steps = [];
      if (profile !== null) steps.push(() => profile.close());
      steps.push(() => facility.cleanup());
      await teardownAll(steps);
    }
  });

  it("rechecks refresh expiry after owner validation starts, before commit", async () => {
    // The read gate observes the install's owner-validation read after the
    // initial open. Advancing the mutable clock to the exact refresh
    // boundary while that validation is unresolved must still be rejected
    // at the pre-commit recheck: a formerly-live deadline must not bypass
    // rejection by expiring while queued. No clock-call quota is assumed.
    const facility = await createStorageTestFacility();
    let profile = null;
    try {
      profile = await facility.provision(ORIGIN);
      const clockBox = { now: CLOCK_LIVE_MS };
      const gate = makeValidationGateOwner(profile);
      const state = await openSessionState({
        profile: gate.adapter,
        clock: { nowMs: () => clockBox.now },
      });
      gate.arm();
      let pending = null;
      try {
        pending = state.installInitialGrant(state.binding, grantBodyBytes(), freshSignal());
        // Immediate rejection handling for this owned install; the
        // finally below always releases the gate and settles it before
        // the owner is closed, even when the wait or an assertion fails.
        pending.then(null, () => undefined);
        await waitForDeadline(() => gate.hasStarted());
        clockBox.now = REFRESH_EXPIRY_MS;
        gate.release();
        const error = await captureRejection(pending);
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("reauthentication_required");
        expect(state.binding.accountUuid).toBe(null);
        expect((await profile.readVaultBytes()).length).toBe(0);
      } finally {
        gate.release();
        if (pending !== null) await Promise.allSettled([pending]);
        state.invalidate();
      }
    } finally {
      const steps = [];
      if (profile !== null) steps.push(() => profile.close());
      steps.push(() => facility.cleanup());
      await teardownAll(steps);
    }
  });

  // Runs one install through the bind gate and cancels it only after the
  // declared public bindAccount entry is observed, then releases the owned
  // storage commit to finish. Returns the suppression outcome plus the
  // explicit same-account reopen observation. Proves mid-bind timing: an
  // unresolved outer promise alone is never the entry evidence.
  async function gatedBindOutcome(mode) {
    const facility = await createStorageTestFacility();
    let profile = null;
    let outcome = null;
    let bodyError = null;
    try {
      profile = await facility.provision(ORIGIN);
      const issued = profile.binding.profileGenerationId;
      const gate = makeBindGateOwner(profile);
      const state = await openSessionState({
        profile: gate.adapter,
        clock: liveClock(),
      });
      let pending = null;
      try {
        const controller = new AbortController();
        pending = state.installInitialGrant(
          state.binding,
          grantBodyBytes(),
          mode === "abort" ? controller.signal : freshSignal(),
        );
        // Immediate rejection handling for this owned install; the
        // finally below always releases the gate and settles it before
        // the owner is closed, even when the wait or an assertion fails.
        pending.then(null, () => undefined);
        await waitForDeadline(() => gate.hasEntered());
        if (mode === "abort") controller.abort();
        else state.invalidate();
        gate.release();
        const error = await captureRejection(pending);
        outcome = {
          error,
          fenced: state.hooks.isCurrent(state.binding) === false,
          issued,
        };
      } finally {
        gate.release();
        if (pending !== null) await Promise.allSettled([pending]);
        state.invalidate();
      }
      await profile.close();
      profile = await facility.open({
        origin: ORIGIN,
        accountUuid: ACCOUNT_A,
        sessionGeneration: 1,
        profileGenerationId: issued,
      });
      const reopened = await openSessionState({
        profile,
        clock: liveClock(),
      });
      try {
        outcome.reopenedBinding = reopened.binding;
        outcome.selected = await reopened.hooks.selectCredential(
          reopened.binding,
          "get_routine",
          freshSignal(),
        );
      } finally {
        reopened.invalidate();
      }
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
    return outcome;
  }

  it("abort during the declared bind suppresses success; committed grant retained", async () => {
    // The owned storage commit is allowed to finish, but no success is
    // delivered: operation_interrupted with a permanently fenced facade,
    // while the committed same-account grant is retained for explicit
    // reopen (not an empty-preauth rollback).
    const outcome = await gatedBindOutcome("abort");
    expect(isSessionError(outcome.error)).toBe(true);
    expect(outcome.error.code).toBe("operation_interrupted");
    expect(outcome.fenced).toBe(true);
    expect(outcome.reopenedBinding.accountUuid).toBe(ACCOUNT_A);
    expect(outcome.reopenedBinding.sessionGeneration).toBe(1);
    expect(outcome.selected.bearerToken).toBe(BEARER_A);
  });

  it("explicit invalidate during the declared bind suppresses handoff likewise", async () => {
    const outcome = await gatedBindOutcome("invalidate");
    expect(isSessionError(outcome.error)).toBe(true);
    expect(outcome.error.code).toBe("operation_interrupted");
    expect(outcome.fenced).toBe(true);
    expect(outcome.reopenedBinding.accountUuid).toBe(ACCOUNT_A);
    expect(outcome.reopenedBinding.sessionGeneration).toBe(1);
    expect(outcome.selected.bearerToken).toBe(BEARER_A);
  });
});

describe("T06-S1 successful initial installation", () => {
  it("returns the new binding only, fences the old facade, keeps operations", async () => {
    const facility = await createStorageTestFacility();
    let profile = null;
    try {
      profile = await facility.provision(ORIGIN);
      const issued = profile.binding.profileGenerationId;
      const operations = utf8('{"synthetic":"operation-evidence"}');
      await profile.commit({ operationBytes: operations });
      const state = await openSessionState({
        profile,
        clock: liveClock(),
      });
      const input = grantBodyBytes();
      const call = state.installInitialGrant(state.binding, input, freshSignal());
      input.fill(0);
      const installed = await call;
      expect(installed).toEqual({
        origin: ORIGIN,
        accountUuid: ACCOUNT_A,
        sessionGeneration: 1,
        profileGenerationId: issued,
      });
      expect(state.hooks.isCurrent(state.binding)).toBe(false);
      const stale = await captureRejection(
        state.hooks.checkBinding("pre-send", state.binding, freshSignal()),
      );
      expect(stale.code).toBe("operation_interrupted");
      state.invalidate();
      await profile.close();
      profile = await facility.open(installed);
      expect(await profile.readOperationStoreBytes()).toEqual(operations);
      const vaultText = utf8Text(await profile.readVaultBytes());
      expect(vaultText).toContain(ACCESS_EXPIRY);
      expect(vaultText).toContain(REFRESH_EXPIRY);
      const again = await openSessionState({
        profile,
        clock: liveClock(),
      });
      try {
        expect(again.binding).toEqual(installed);
        const selected = await again.hooks.selectCredential(
          again.binding,
          "get_routine",
          freshSignal(),
        );
        expect(selected.bearerToken).toBe(BEARER_A);
        expect(selected.forBinding).toEqual(installed);
      } finally {
        again.invalidate();
      }
    } finally {
      const steps = [];
      if (profile !== null) steps.push(() => profile.close());
      steps.push(() => facility.cleanup());
      await teardownAll(steps);
    }
  });

  it("rejects replacement on an already-bound profile without persistence", async () => {
    const facility = await createStorageTestFacility();
    let profile = null;
    try {
      profile = await facility.provision(ORIGIN);
      const first = await openSessionState({
        profile,
        clock: liveClock(),
      });
      const installed = await first.installInitialGrant(
        first.binding,
        grantBodyBytes(),
        freshSignal(),
      );
      first.invalidate();
      await profile.close();
      profile = await facility.open(installed);
      const second = await openSessionState({
        profile,
        clock: liveClock(),
      });
      try {
        const sameAccount = await captureRejection(
          second.installInitialGrant(second.binding, grantBodyBytes(), freshSignal()),
        );
        expect(sameAccount.code).toBe("operation_interrupted");
        const otherAccount = await captureRejection(
          second.installInitialGrant(
            second.binding,
            grantBodyBytes({
              account: { id: ACCOUNT_B, displayName: null },
            }),
            freshSignal(),
          ),
        );
        expect(otherAccount.code).toBe("operation_interrupted");
        expect(second.binding).toEqual(installed);
        const kept = await second.hooks.selectCredential(
          second.binding,
          "get_routine",
          freshSignal(),
        );
        expect(kept.bearerToken).toBe(BEARER_A);
      } finally {
        second.invalidate();
      }
    } finally {
      const steps = [];
      if (profile !== null) steps.push(() => profile.close());
      steps.push(() => facility.cleanup());
      await teardownAll(steps);
    }
  });
});
