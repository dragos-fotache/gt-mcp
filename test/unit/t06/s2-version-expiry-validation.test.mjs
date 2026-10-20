// T06-S2 QA unit 01 — version2/migration/expiry validation table
// (SOURCE-READY, HOLD: authored against the settled S2 work-order public API,
// never executed before the coordinator's named frozen relay).
//
// Spec basis: work-order sections "Settled additive public API" (REFRESH_
// VAULT_VERSION=2, S1 exports unchanged), "Private version2 record and
// migration" (exact version2 shape, predecessor equality, canonical
// bodyBase64/authKey, version1 read-only open with write-on-prepare
// migration, unknown-version/malformed ordering, blocked pending), and
// "Rotation, hooks and durable transitions" step 1 (live refresh expiry,
// equality now >= expiry is expired). No network use: every case either
// opens state only or rejects before dispatch, so no T05/loopback fixture
// is needed here. Strict no-dispatch proofs with a server-observed single
// request belong to the S2 fault files, not this table.
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
import { REFRESH_VAULT_VERSION, openRefreshSessionState } from "../../../dist/auth/index.js";
import {
  SESSION_VAULT_VERSION,
  isSessionError,
  openSessionState,
} from "../../../dist/auth/index.js";
import { isTransportError } from "../../../dist/http/index.js";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import { waitForDeadline } from "../../fault/t05/helpers.mjs";
import {
  ACCESS_EXPIRY,
  ACCOUNT_A,
  ACCOUNT_B,
  CLOCK_LIVE_MS,
  ORIGIN,
  REFRESH_EXPIRY,
  REFRESH_EXPIRY_MS,
  abortedSignal,
  captureRejection,
  freshSignal,
  grantBodyBytes,
  liveClock,
  makeClock,
  syntheticVaultGrant,
  teardownAll,
  utf8,
  utf8Text,
  version1Bytes,
} from "./helpers.mjs";

// S2 synthetic origin, disjoint from the S1 helper origin so S2 vault seeds
// can never be mistaken for S1 evidence.
const S2_ORIGIN = "https://t06-s2-qa.example.invalid";

// Canonical lowercase UUID with alphabetic hex digits, used ONLY as stored
// pending auth-key material in seeds (listed here, so synthetic by
// provenance). Fresh rotations must allocate their own key via node:crypto
// randomUUID; no test asserts its value, only its canonical shape when
// observed through durable bytes. Alphabetic digits guarantee the
// uppercase variant below is actually noncanonical.
const PENDING_KEY = "abcdefab-abcd-4abc-8abc-abcdefabcdef";

// Exact prepare serialization per work order: UTF-8 JSON.stringify with the
// single refreshToken property, no whitespace/BOM. Tests serialize this
// themselves (never production) to build expected pending evidence.
function prepareBodyBytes(refreshToken) {
  return utf8(JSON.stringify({ refreshToken }));
}

function prepareBodyBase64(refreshToken) {
  return Buffer.from(prepareBodyBytes(refreshToken)).toString("base64");
}

// Private version-2 vault plaintext record per work order:
// { version: 2, binding, grant: null | S1 grant,
//   pendingRefresh: null | { predecessor, refreshToken, bodyBase64, authKey } }.
// Serialized by the test (never by production) to seed owner vault bytes
// through the diagnostic facility before opening.
function version2Record({ binding, grant = null, pendingRefresh = null } = {}) {
  return { version: 2, binding, grant, pendingRefresh };
}

function validPending(grant) {
  return {
    predecessor: { ...grant },
    refreshToken: grant.refreshToken,
    bodyBase64: prepareBodyBase64(grant.refreshToken),
    authKey: PENDING_KEY,
  };
}

function version2Bytes(options) {
  return utf8(JSON.stringify(version2Record(options)));
}

// Establish a genuinely bound owner through the accepted S1 entry: isolated
// install, S1 invalidate, close, reopen on the returned binding. The vault
// then holds settled version1 state whose binding equals the T04 capture.
// fn receives { facility, profile, installed }. No work at import time.
async function withBoundS2Owner(fn) {
  const facility = await createStorageTestFacility();
  let profile = null;
  let bodyError = null;
  try {
    profile = await facility.provision(S2_ORIGIN);
    const installer = await openSessionState({ profile, clock: liveClock() });
    const installed = await installer.installInitialGrant(
      installer.binding,
      grantBodyBytes(),
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
async function withPreAuthS2Owner(fn) {
  const facility = await createStorageTestFacility();
  let profile = null;
  let bodyError = null;
  try {
    profile = await facility.provision(S2_ORIGIN);
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

function s2Config(overrides = {}) {
  return { origin: S2_ORIGIN, ...overrides };
}

async function openS2(profile, clockMs = CLOCK_LIVE_MS, config = s2Config()) {
  return openRefreshSessionState({ profile, transportConfig: config, clock: makeClock(clockMs) });
}

describe("T06-S2 version constants preserve S1", () => {
  it("publishes REFRESH_VAULT_VERSION 2 while SESSION_VAULT_VERSION stays 1", () => {
    expect(REFRESH_VAULT_VERSION).toBe(2);
    expect(SESSION_VAULT_VERSION).toBe(1);
  });
});

describe("T06-S2 version1 read-only open", () => {
  it("opens a validated version1 grant without writing or migrating", async () => {
    await withBoundS2Owner(async ({ profile, installed }) => {
      const before = await profile.readVaultBytes();
      const state = await openS2(profile);
      try {
        expect(state.binding).toEqual(installed);
        expect(await profile.readVaultBytes()).toEqual(before);
      } finally {
        state.invalidate();
      }
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });

  it("opens a zero-length cleared vault without inventing state", async () => {
    await withPreAuthS2Owner(async ({ profile }) => {
      expect((await profile.readVaultBytes()).length).toBe(0);
      const state = await openS2(profile);
      try {
        expect(state.binding).toEqual(profile.binding);
        expect((await profile.readVaultBytes()).length).toBe(0);
      } finally {
        state.invalidate();
      }
    });
  });

  it("rotation with no grant rejects authentication_required without mutation", async () => {
    await withPreAuthS2Owner(async ({ profile }) => {
      const binding = profile.binding;
      await profile.commit({ vaultBytes: version1Bytes({ ...binding, grant: null }) });
      const before = await profile.readVaultBytes();
      const state = await openS2(profile);
      try {
        const error = await captureRejection(state.rotateRefresh(state.binding, freshSignal()));
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("authentication_required");
        expect(await profile.readVaultBytes()).toEqual(before);
      } finally {
        state.invalidate();
      }
    });
  });
});

describe("T06-S2 version ordering: unknown versions before field checks", () => {
  it("unknown integer version rejects state_version_unsupported, preserving bytes", async () => {
    await withBoundS2Owner(async ({ profile, installed }) => {
      // Deliberately unsupported version with matching binding but missing
      // version-specific fields, so only the version gate can reject it.
      const record = { version: 99, binding: { ...installed } };
      await profile.commit({ vaultBytes: utf8(JSON.stringify(record)) });
      const before = await profile.readVaultBytes();
      const error = await captureRejection(openS2(profile));
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("state_version_unsupported");
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });

  it("malformed vault rejects state_corrupt, preserving bytes", async () => {
    await withBoundS2Owner(async ({ profile }) => {
      await profile.commit({ vaultBytes: utf8('{"version":2,"binding":') });
      const before = await profile.readVaultBytes();
      const error = await captureRejection(openS2(profile));
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("state_corrupt");
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });

  it("S1 opener still refuses version2 without erasure", async () => {
    await withBoundS2Owner(async ({ profile, installed }) => {
      const grant = syntheticVaultGrant();
      await profile.commit({
        vaultBytes: version2Bytes({ binding: { ...installed }, grant, pendingRefresh: null }),
      });
      const before = await profile.readVaultBytes();
      const error = await captureRejection(openSessionState({ profile, clock: liveClock() }));
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("state_version_unsupported");
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });
});

describe("T06-S2 pending validation: exact predecessor/body/key", () => {
  it("blocked pending rejects rotation with reauthentication_required and no new key, commit, or dispatch", async () => {
    await withBoundS2Owner(async ({ profile, installed }) => {
      const grant = syntheticVaultGrant();
      expect(grant.accountUuid).toBe(ACCOUNT_A);
      await profile.commit({
        vaultBytes: version2Bytes({
          binding: { ...installed },
          grant,
          pendingRefresh: validPending(grant),
        }),
      });
      const before = await profile.readVaultBytes();
      const state = await openS2(profile);
      try {
        const error = await captureRejection(state.rotateRefresh(state.binding, freshSignal()));
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("reauthentication_required");
        // No key allocation, commit, or dispatch: durable bytes identical.
        expect(await profile.readVaultBytes()).toEqual(before);
      } finally {
        state.invalidate();
      }
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });

  it("predecessor field mismatch rejects state_corrupt on open", async () => {
    await withBoundS2Owner(async ({ profile, installed }) => {
      const grant = syntheticVaultGrant();
      const pending = validPending(grant);
      pending.predecessor.accessToken = "synthetic-qa-t06-mutated.99";
      await profile.commit({
        vaultBytes: version2Bytes({ binding: { ...installed }, grant, pendingRefresh: pending }),
      });
      const before = await profile.readVaultBytes();
      const error = await captureRejection(openS2(profile));
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("state_corrupt");
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });

  it("non-exact bodyBase64 rejects state_corrupt on open", async () => {
    await withBoundS2Owner(async ({ profile, installed }) => {
      const grant = syntheticVaultGrant();
      const pending = validPending(grant);
      // Reconstructed object with trailing whitespace is not the settled
      // exact bytes.
      pending.bodyBase64 = Buffer.from(
        utf8(`${JSON.stringify({ refreshToken: grant.refreshToken })} `),
      ).toString("base64");
      await profile.commit({
        vaultBytes: version2Bytes({ binding: { ...installed }, grant, pendingRefresh: pending }),
      });
      const before = await profile.readVaultBytes();
      const error = await captureRejection(openS2(profile));
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("state_corrupt");
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });

  it("refreshToken differing from predecessor rejects state_corrupt on open", async () => {
    await withBoundS2Owner(async ({ profile, installed }) => {
      const grant = syntheticVaultGrant();
      const pending = validPending(grant);
      pending.refreshToken = "synthetic-qa-t06-other-refresh.99";
      await profile.commit({
        vaultBytes: version2Bytes({ binding: { ...installed }, grant, pendingRefresh: pending }),
      });
      const before = await profile.readVaultBytes();
      const error = await captureRejection(openS2(profile));
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("state_corrupt");
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });

  it("non-canonical authKey rejects state_corrupt on open", async () => {
    await withBoundS2Owner(async ({ profile, installed }) => {
      const grant = syntheticVaultGrant();
      const pending = validPending(grant);
      pending.authKey = PENDING_KEY.toUpperCase();
      // The fixture genuinely changes value: alphabetic hex digits differ.
      expect(pending.authKey).not.toBe(PENDING_KEY);
      await profile.commit({
        vaultBytes: version2Bytes({ binding: { ...installed }, grant, pendingRefresh: pending }),
      });
      const before = await profile.readVaultBytes();
      const error = await captureRejection(openS2(profile));
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("state_corrupt");
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });

  it("pending without a grant rejects state_corrupt on open", async () => {
    await withBoundS2Owner(async ({ profile, installed }) => {
      const grant = syntheticVaultGrant();
      await profile.commit({
        vaultBytes: version2Bytes({
          binding: { ...installed },
          grant: null,
          pendingRefresh: validPending(grant),
        }),
      });
      const before = await profile.readVaultBytes();
      const error = await captureRejection(openS2(profile));
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("state_corrupt");
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });
});

describe("T06-S2 transport config capture and validation", () => {
  it("captures config before first await; synchronous caller mutation is ignored", async () => {
    await withBoundS2Owner(async ({ profile, installed }) => {
      const config = s2Config({ budgets: { maxAttempts: 1 } });
      const opening = openRefreshSessionState({
        profile,
        transportConfig: config,
        clock: liveClock(),
      });
      // Synchronous caller mutation after the call returns must not affect
      // the already-captured config. The nested mutation targets an invalid
      // value (99): a shallow reread would fail observably with a safe
      // TransportError, while deep capture opens unchanged.
      config.origin = ORIGIN;
      config.budgets.maxAttempts = 99;
      const state = await opening;
      try {
        expect(state.binding).toEqual(installed);
        // The implementation never mutates caller-owned objects either:
        // our own mutations are intact, nothing else changed them.
        expect(config.origin).toBe(ORIGIN);
        expect(config.budgets).toEqual({ maxAttempts: 99 });
      } finally {
        state.invalidate();
      }
    });
  });

  it("unknown option field rejects invalid_arguments without mutation", async () => {
    await withBoundS2Owner(async ({ profile }) => {
      const before = await profile.readVaultBytes();
      const error = await captureRejection(
        openRefreshSessionState({
          profile,
          transportConfig: s2Config(),
          clock: liveClock(),
          probeField: 1,
        }),
      );
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("invalid_arguments");
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });

  it("valid vault with bad transport budgets rejects safe TransportError", async () => {
    await withBoundS2Owner(async ({ profile }) => {
      const before = await profile.readVaultBytes();
      const error = await captureRejection(
        openS2(profile, CLOCK_LIVE_MS, s2Config({ budgets: { maxAttempts: 99 } })),
      );
      // Bad T05 config propagates its safe TransportError, not a SessionError.
      expect(isTransportError(error)).toBe(true);
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });
});

describe("T06-S2 exact expiry and config guards", () => {
  it("refresh expiry equality (now == expiry) rejects reauthentication_required without write", async () => {
    await withBoundS2Owner(async ({ profile }) => {
      const before = await profile.readVaultBytes();
      const state = await openS2(profile, REFRESH_EXPIRY_MS);
      try {
        const error = await captureRejection(state.rotateRefresh(state.binding, freshSignal()));
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("reauthentication_required");
        expect(await profile.readVaultBytes()).toEqual(before);
      } finally {
        state.invalidate();
      }
    });
  });

  it("expired refresh rejects reauthentication_required without write", async () => {
    await withBoundS2Owner(async ({ profile }) => {
      const before = await profile.readVaultBytes();
      const state = await openS2(profile, REFRESH_EXPIRY_MS + 1);
      try {
        const error = await captureRejection(state.rotateRefresh(state.binding, freshSignal()));
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("reauthentication_required");
        expect(await profile.readVaultBytes()).toEqual(before);
      } finally {
        state.invalidate();
      }
    });
  });

  it("expiry reached during awaited owner validation rejects without commit", async () => {
    await withBoundS2Owner(async ({ profile }) => {
      let nowMs = CLOCK_LIVE_MS;
      const clock = { nowMs: () => nowMs };
      // Hold the first owner validation read behind a test gate (same shape
      // as the accepted S1 validation-gate pattern), expire the trusted
      // clock while it is unresolved, then release: the post-await and
      // pre-commit expiry rechecks must reject with no write or dispatch.
      let releaseRead = null;
      const readGate = new Promise((resolve) => {
        releaseRead = resolve;
      });
      let armed = false;
      let started = false;
      const adapter = {
        get binding() {
          return profile.binding;
        },
        readVaultBytes: (...args) => {
          if (armed && !started) {
            started = true;
            return readGate.then(() => profile.readVaultBytes(...args));
          }
          return profile.readVaultBytes(...args);
        },
        commit: (...args) => profile.commit(...args),
        bindAccount: (...args) => profile.bindAccount(...args),
        advanceSessionGeneration: (...args) => profile.advanceSessionGeneration(...args),
        close: (...args) => profile.close(...args),
      };
      const before = await profile.readVaultBytes();
      const state = await openRefreshSessionState({
        profile: adapter,
        transportConfig: s2Config(),
        clock,
      });
      let rotation = null;
      try {
        armed = true;
        rotation = state.rotateRefresh(state.binding, freshSignal());
        await waitForDeadline(() => started);
        nowMs = REFRESH_EXPIRY_MS;
        releaseRead();
        const error = await captureRejection(rotation);
        rotation = null;
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("reauthentication_required");
        expect(await profile.readVaultBytes()).toEqual(before);
      } finally {
        if (rotation !== null) {
          releaseRead();
          await captureRejection(rotation);
        }
        state.invalidate();
      }
    });
  });

  it("transport config origin mismatch rejects invalid_arguments before mutation", async () => {
    await withBoundS2Owner(async ({ profile }) => {
      const before = await profile.readVaultBytes();
      const error = await captureRejection(openS2(profile, CLOCK_LIVE_MS, { origin: ORIGIN }));
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("invalid_arguments");
      expect(await profile.readVaultBytes()).toEqual(before);
    });
  });

  it("aborted entry signal rejects operation_interrupted without mutation", async () => {
    await withBoundS2Owner(async ({ profile }) => {
      const before = await profile.readVaultBytes();
      const state = await openS2(profile);
      try {
        const error = await captureRejection(state.rotateRefresh(state.binding, abortedSignal()));
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("operation_interrupted");
        expect(await profile.readVaultBytes()).toEqual(before);
      } finally {
        state.invalidate();
      }
    });
  });

  it("foreign binding rejects operation_interrupted without mutation", async () => {
    await withBoundS2Owner(async ({ profile }) => {
      const before = await profile.readVaultBytes();
      const state = await openS2(profile);
      try {
        const foreign = { ...state.binding, accountUuid: ACCOUNT_B };
        const error = await captureRejection(state.rotateRefresh(foreign, freshSignal()));
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("operation_interrupted");
        expect(await profile.readVaultBytes()).toEqual(before);
      } finally {
        state.invalidate();
      }
    });
  });

  it("preserves original valid expiry spellings through a read-only open", async () => {
    await withBoundS2Owner(async ({ profile, installed }) => {
      const state = await openS2(profile);
      try {
        const text = utf8Text(await profile.readVaultBytes());
        expect(text).toContain(ACCESS_EXPIRY);
        expect(text).toContain(REFRESH_EXPIRY);
        expect(state.binding).toEqual(installed);
      } finally {
        state.invalidate();
      }
    });
  });
});
