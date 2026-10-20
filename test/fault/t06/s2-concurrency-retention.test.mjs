// T06-S2 QA fault 02 — serialized single rotation, uncertain/failure
// retention, blocked repeat/reopen, commit-failure and cancel fences
// (SOURCE-READY, HOLD: authored against the settled S2 work-order public API
// plus the accepted T04 diagnostic facility and T05 loopback TLS fixtures,
// never executed before the coordinator's named frozen relay).
//
// Spec basis: work-order "Rotation, hooks and durable transitions" steps 2-6
// (overlapping valid calls share ONE prepared attempt/key/network/commit;
// invalid/foreign calls never join and never fence a valid shared attempt;
// transport/bad-response/cancel/invalidation after prepare retains exact
// pending/predecessor unless the atomic success commit completed;
// idempotency_key_reused never proves settlement; no new dispatch while
// pending remains; T04 failure fences), the clarified error mapping (lost
// connection => original TransportError network_error; HTTP200 invalid JSON
// => original TransportError internal_error; both dispatched/attempts1/
// outcomeUnknown; valid-JSON invalid grant => SessionError invalid_grant;
// cancellation/invalidation => operation_interrupted in either family), the
// concurrency paragraph (first caller owns cancellation; followers may abort
// only their own waits; leader abort cancels T05; live followers observe the
// shared failed outcome; no late success), invalidate semantics (settle owned
// work, suppress late success, no rollback; completed success stays
// installed), and step 5 (same-account required else invalid_grant; legacy
// nonzero submillisecond expiry never rounded, invalid_grant; returned
// refresh expired at pre-commit recheck => reauthentication_required).
// Exact restart recovery belongs to S3; no crash-kill or exhaustive
// cross-product here.
//
// Boundaries: accepted T04 diagnostic facility + unchanged T05 loopback TLS
// fixtures only; synthetic data; no personal provider; no generalized
// harness. The harness box below always owns the CURRENT reopened profile
// and facade, so teardown closes the live holder before facility cleanup on
// every path without masking body errors.

/* global AbortController, setTimeout */

import { describe, expect, it } from "vitest";
import { isSessionError, openRefreshSessionState } from "../../../dist/auth/index.js";
import { openSessionState } from "../../../dist/auth/index.js";
import { isStorageError } from "../../../dist/storage/index.js";
import { isTransportError } from "../../../dist/http/index.js";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import {
  closeServer,
  readFixtureBytes,
  startLoopbackHttps,
  waitForDeadline,
} from "../t05/helpers.mjs";
import {
  ACCOUNT_A,
  ACCOUNT_B,
  captureRejection,
  freshSignal,
  grantBodyBytes,
  liveClock,
  teardownAll,
  utf8Text,
} from "../../unit/t06/helpers.mjs";

const ROTATED_ACCESS = "synthetic-qa-t06-s2-access.02";
const ROTATED_REFRESH = "synthetic-qa-t06-s2-refresh.02";
const ROTATED_ACCESS_EXPIRY = "2026-09-27T12:30:00.000Z";
const ROTATED_REFRESH_EXPIRY = "2026-11-27T12:00:00.000Z";
const LEGACY_ACCESS_EXPIRY = "2026-09-27T12:30:00.123456789Z";
const EXPIRED_RETURNED_REFRESH = "2026-08-01T00:00:00.000Z";

function serviceBody(overrides = {}) {
  return {
    account: { id: ACCOUNT_A, displayName: null },
    accessToken: ROTATED_ACCESS,
    accessExpiresAt: ROTATED_ACCESS_EXPIRY,
    refreshToken: ROTATED_REFRESH,
    refreshExpiresAt: ROTATED_REFRESH_EXPIRY,
    ...overrides,
  };
}

function serviceBytes(overrides = {}) {
  return Buffer.from(JSON.stringify(serviceBody(overrides)), "utf8");
}

// Response behaviors keyed by test. Gated success holds the response until
// the test releases it; every other behavior responds immediately. Request
// capture is owned by the loopback helper; the record already exists when
// the handler runs, so destroy still leaves requests.length === 1.
function responderBehavior(kind, gate) {
  return (req, res) => {
    void req;
    if (kind === "gated-success") {
      gate.then(() => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(serviceBytes());
      });
    } else if (kind === "destroy") {
      res.socket.destroy();
    } else if (kind === "malformed") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end("not-json{");
    } else if (kind === "mismatch") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(serviceBytes({ account: { id: ACCOUNT_B, displayName: null } }));
    } else if (kind === "legacy-precision") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(serviceBytes({ accessExpiresAt: LEGACY_ACCESS_EXPIRY }));
    } else if (kind === "expired-returned-refresh") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(serviceBytes({ refreshExpiresAt: EXPIRED_RETURNED_REFRESH }));
    }
  };
}

async function installS1Grant(profile) {
  const installer = await openSessionState({ profile, clock: liveClock() });
  const installed = await installer.installInitialGrant(
    installer.binding,
    grantBodyBytes(),
    freshSignal(),
  );
  installer.invalidate();
  return installed;
}

async function readVaultRecord(profile) {
  return JSON.parse(utf8Text(await profile.readVaultBytes()));
}

// Bounded negative-observation sleep: asserts nothing by itself; callers
// check an unsettled/undispatched condition after it.
function sleepBounded(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Cancellation/invalidation must land on operation_interrupted in either the
// Session or Transport family; no unrelated code satisfies cancellation.
function expectCancellation(error) {
  expect(error.code).toBe("operation_interrupted");
  expect(isSessionError(error) || isTransportError(error)).toBe(true);
}

// Shared harness: isolated loopback server + diagnostic facility + settled S1
// grant + reopened owner + open S2 facade. h.profile/h.state are accessors
// over the teardown box, so tests that close/reopen assign the CURRENT owner
// and teardown closes the live holder before cleanup on ALL paths. An
// optional wrapOwner adapts the reopened owner (e.g. a commit gate) before
// the facade opens; the real owner stays the teardown-closed handle.
// Fixture roots are owned by the diagnostic facility; no HOME/TMPDIR
// overrides here.
async function withRotationHarness(kind, fn, wrapOwner = null) {
  const certPem = readFixtureBytes("test-only-loopback-cert.pem");
  const keyPem = readFixtureBytes("test-only-loopback-key.pem");
  let release = null;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const { server, origin, requests } = await startLoopbackHttps(
    { keyPem, certPem, label: "synthetic-qa-t06-s2 retention pair" },
    responderBehavior(kind, gate),
  );
  let facility = null;
  const box = { profile: null, state: null };
  const owned = new Set();
  const track = (pending) => {
    owned.add(pending);
    const drop = () => owned.delete(pending);
    pending.then(drop, drop);
    return pending;
  };
  // Every storage/response gate registers here and releases on ALL paths
  // BEFORE owned-work settlement below, so a failing assertion can never
  // leave an owned commit unresolved and hang teardown.
  const gateReleases = [];
  const registerRelease = (releaseFn) => {
    gateReleases.push(releaseFn);
  };
  let bodyError = null;
  try {
    facility = await createStorageTestFacility();
    // The current holder enters the box immediately after each successful
    // provision/open, so even a later setup failure keeps it owned.
    box.profile = await facility.provision(origin);
    const installed = await installS1Grant(box.profile);
    await box.profile.close();
    box.profile = await facility.open(installed);
    const predecessor = JSON.parse(utf8Text(await box.profile.readVaultBytes())).grant;
    const ownerForFacade =
      wrapOwner === null ? box.profile : wrapOwner(box.profile, { track, registerRelease });
    const state = await openRefreshSessionState({
      profile: ownerForFacade,
      transportConfig: { origin, testCaPem: certPem },
      clock: liveClock(),
    });
    box.state = state;
    const h = {
      get profile() {
        return box.profile;
      },
      set profile(next) {
        box.profile = next;
      },
      get state() {
        return box.state;
      },
      set state(next) {
        box.state = next;
      },
      server,
      origin,
      requests,
      certPem,
      release,
      facility,
      installed,
      predecessor,
      track,
      owned,
    };
    await fn(h);
  } catch (error) {
    bodyError = error;
  }
  for (const releaseFn of gateReleases) {
    try {
      releaseFn();
    } catch {
      // Resolve-only test gates never throw; teardown continues.
    }
  }
  try {
    release();
  } catch {
    // Gate already released on paths that completed; teardown continues.
  }
  for (const pending of owned) {
    try {
      await pending;
    } catch {
      // Settlement is owned by the body; teardown only waits for quiet.
    }
  }
  const steps = [];
  if (box.state !== null) steps.push(async () => box.state.invalidate());
  if (box.profile !== null) steps.push(() => box.profile.close());
  if (facility !== null) steps.push(() => facility.cleanup());
  steps.push(() => closeServer(server));
  let teardownError = null;
  try {
    await teardownAll(steps);
  } catch (error) {
    teardownError = error;
  }
  if (bodyError !== null) throw bodyError;
  if (teardownError !== null) throw teardownError;
}

describe("T06-S2 concurrent rotations share one attempt", () => {
  it("overlapping valid calls share one key, dispatch, and commit; foreign calls never join or fence", async () => {
    await withRotationHarness("gated-success", async (h) => {
      const first = h.track(h.state.rotateRefresh(h.state.binding, freshSignal()));
      const second = h.track(h.state.rotateRefresh(h.state.binding, freshSignal()));
      // Malformed/foreign invocations reject without cancelling or fencing
      // the otherwise valid shared attempt.
      const foreign = { ...h.state.binding, accountUuid: ACCOUNT_B };
      const rejected = await captureRejection(h.state.rotateRefresh(foreign, freshSignal()));
      expect(isSessionError(rejected)).toBe(true);
      expect(rejected.code).toBe("operation_interrupted");
      await waitForDeadline(() => h.requests.length === 1);
      h.release();
      expect(await first).toBe(undefined);
      expect(await second).toBe(undefined);
      expect(h.requests.length).toBe(1);
      const stored = await readVaultRecord(h.profile);
      expect(stored.pendingRefresh).toBe(null);
      expect(stored.grant.refreshToken).toBe(ROTATED_REFRESH);
      // A later explicit nonoverlapping call starts a distinct rotation
      // with a new key and a second dispatch, not a replay of the first.
      const firstKey = h.requests[0].headers["idempotency-key"];
      const third = h.track(h.state.rotateRefresh(h.state.binding, freshSignal()));
      await waitForDeadline(() => h.requests.length === 2);
      expect(h.requests[1].headers["idempotency-key"]).not.toBe(firstKey);
      expect(await third).toBe(undefined);
      expect(h.requests.length).toBe(2);
    });
  });
});

describe("T06-S2 uncertain outcome retains exact pending", () => {
  it("lost response keeps predecessor/body/key; repeat and reopen dispatch nothing new", async () => {
    await withRotationHarness("destroy", async (h) => {
      const failed = await captureRejection(
        h.track(h.state.rotateRefresh(h.state.binding, freshSignal())),
      );
      // Original T05 failure, not an invented SessionError: lost connection
      // in a valid unaborted attempt is network_error, dispatched, one
      // attempt, outcome unknown.
      expect(isTransportError(failed)).toBe(true);
      expect(failed.code).toBe("network_error");
      expect(failed.dispatched).toBe(true);
      expect(failed.attempts).toBe(1);
      expect(failed.outcomeUnknown).toBe(true);
      expect(h.requests.length).toBe(1);
      const retained = await readVaultRecord(h.profile);
      expect(retained.version).toBe(2);
      expect(retained.grant).toEqual(h.predecessor);
      expect(retained.pendingRefresh).not.toBe(null);
      expect(retained.pendingRefresh.predecessor).toEqual(h.predecessor);
      expect(retained.pendingRefresh.refreshToken).toBe(h.predecessor.refreshToken);
      const retainedKey = retained.pendingRefresh.authKey;
      const retainedBody = retained.pendingRefresh.bodyBase64;
      // Same-facade repeat is blocked without a new key, commit, or dispatch.
      const repeat = await captureRejection(h.state.rotateRefresh(h.state.binding, freshSignal()));
      expect(isSessionError(repeat)).toBe(true);
      expect(repeat.code).toBe("reauthentication_required");
      expect(h.requests.length).toBe(1);
      expect(await readVaultRecord(h.profile)).toEqual(retained);
      // Reopened state is still the blocked pending record: no new key or
      // dispatch, never a silent clear, rekey, or replay. The box now owns
      // the reopened profile, so teardown closes the live holder.
      h.state.invalidate();
      h.state = null;
      await h.profile.close();
      h.profile = await h.facility.open(h.installed);
      expect(await readVaultRecord(h.profile)).toEqual(retained);
      const reopened = await openRefreshSessionState({
        profile: h.profile,
        transportConfig: { origin: h.origin, testCaPem: h.certPem },
        clock: liveClock(),
      });
      try {
        const blocked = await captureRejection(
          reopened.rotateRefresh(reopened.binding, freshSignal()),
        );
        expect(isSessionError(blocked)).toBe(true);
        expect(blocked.code).toBe("reauthentication_required");
        expect(h.requests.length).toBe(1);
        const reread = await readVaultRecord(h.profile);
        expect(reread).toEqual(retained);
        expect(reread.pendingRefresh.authKey).toBe(retainedKey);
        expect(reread.pendingRefresh.bodyBase64).toBe(retainedBody);
      } finally {
        reopened.invalidate();
      }
    });
  });
});

describe("T06-S2 invalid responses retain exact pending", () => {
  it("invalid-JSON body keeps pending and blocks further dispatch", async () => {
    await withRotationHarness("malformed", async (h) => {
      const failed = await captureRejection(
        h.track(h.state.rotateRefresh(h.state.binding, freshSignal())),
      );
      // HTTP200 with invalid JSON is TransportError internal_error,
      // dispatched, one attempt, outcome unknown.
      expect(isTransportError(failed)).toBe(true);
      expect(failed.code).toBe("internal_error");
      expect(failed.dispatched).toBe(true);
      expect(failed.attempts).toBe(1);
      expect(failed.outcomeUnknown).toBe(true);
      expect(h.requests.length).toBe(1);
      const retained = await readVaultRecord(h.profile);
      expect(retained.grant).toEqual(h.predecessor);
      expect(retained.pendingRefresh.predecessor).toEqual(h.predecessor);
      const repeat = await captureRejection(h.state.rotateRefresh(h.state.binding, freshSignal()));
      expect(isSessionError(repeat)).toBe(true);
      expect(repeat.code).toBe("reauthentication_required");
      expect(h.requests.length).toBe(1);
      expect(await readVaultRecord(h.profile)).toEqual(retained);
    });
  });

  it("account mismatch rejects invalid_grant without adopting the account", async () => {
    await withRotationHarness("mismatch", async (h) => {
      const failed = await captureRejection(
        h.track(h.state.rotateRefresh(h.state.binding, freshSignal())),
      );
      // Valid JSON with invalid grant fields reaches S2 grant validation.
      expect(isSessionError(failed)).toBe(true);
      expect(failed.code).toBe("invalid_grant");
      expect(h.requests.length).toBe(1);
      const retained = await readVaultRecord(h.profile);
      expect(retained.grant).toEqual(h.predecessor);
      expect(retained.grant.accountUuid).toBe(ACCOUNT_A);
      expect(retained.pendingRefresh.predecessor).toEqual(h.predecessor);
      const repeat = await captureRejection(h.state.rotateRefresh(h.state.binding, freshSignal()));
      expect(isSessionError(repeat)).toBe(true);
      expect(repeat.code).toBe("reauthentication_required");
      expect(h.requests.length).toBe(1);
      expect(await readVaultRecord(h.profile)).toEqual(retained);
    });
  });

  it("legacy nonzero submillisecond expiry rejects invalid_grant without rounding", async () => {
    await withRotationHarness("legacy-precision", async (h) => {
      const failed = await captureRejection(
        h.track(h.state.rotateRefresh(h.state.binding, freshSignal())),
      );
      expect(isSessionError(failed)).toBe(true);
      expect(failed.code).toBe("invalid_grant");
      expect(h.requests.length).toBe(1);
      const retained = await readVaultRecord(h.profile);
      expect(retained.grant).toEqual(h.predecessor);
      expect(retained.pendingRefresh.predecessor).toEqual(h.predecessor);
      const repeat = await captureRejection(h.state.rotateRefresh(h.state.binding, freshSignal()));
      expect(isSessionError(repeat)).toBe(true);
      expect(repeat.code).toBe("reauthentication_required");
      expect(h.requests.length).toBe(1);
      expect(await readVaultRecord(h.profile)).toEqual(retained);
    });
  });

  it("expired returned refresh rejects reauthentication_required without installing", async () => {
    await withRotationHarness("expired-returned-refresh", async (h) => {
      const failed = await captureRejection(
        h.track(h.state.rotateRefresh(h.state.binding, freshSignal())),
      );
      // The returned grant is otherwise valid, but its refresh deadline is
      // already past at the immediate pre-commit recheck: retain pending
      // unchanged, install nothing.
      expect(isSessionError(failed)).toBe(true);
      expect(failed.code).toBe("reauthentication_required");
      expect(h.requests.length).toBe(1);
      const retained = await readVaultRecord(h.profile);
      expect(retained.grant).toEqual(h.predecessor);
      expect(retained.pendingRefresh.predecessor).toEqual(h.predecessor);
      const repeat = await captureRejection(h.state.rotateRefresh(h.state.binding, freshSignal()));
      expect(isSessionError(repeat)).toBe(true);
      expect(repeat.code).toBe("reauthentication_required");
      expect(h.requests.length).toBe(1);
      expect(await readVaultRecord(h.profile)).toEqual(retained);
    });
  });
});

describe("T06-S2 success-installation failure and cancellation fences", () => {
  it("failed success installation fences the facade while the T04 owner stays usable", async () => {
    await withRotationHarness("gated-success", async (h) => {
      // S2 prepare is the first matching commit; success installation is the
      // second. Occurrence 2 faults only the success commit BEFORE any
      // PREPARED write, so the documented T04 semantic is definite old-state
      // io_failure: the T04 owner stays usable while the AUTH facade fences.
      await h.facility.armFault({
        point: "replace.before.rename",
        action: "throw",
        occurrence: 2,
      });
      h.release();
      const failed = await captureRejection(
        h.track(h.state.rotateRefresh(h.state.binding, freshSignal())),
      );
      expect(isStorageError(failed)).toBe(true);
      expect(failed.code).toBe("io_failure");
      expect(h.requests.length).toBe(1);
      // The still-usable owner reads the durable prepare record: exact
      // predecessor/body/key retained, never cleaned or re-initialized.
      const retained = await readVaultRecord(h.profile);
      expect(retained.grant).toEqual(h.predecessor);
      expect(retained.pendingRefresh.predecessor).toEqual(h.predecessor);
      await h.facility.clearFault();
      // The T04 failure permanently fences this facade: no late success or
      // further dispatch from it.
      const repeat = await captureRejection(h.state.rotateRefresh(h.state.binding, freshSignal()));
      expect(isSessionError(repeat)).toBe(true);
      expect(repeat.code).toBe("operation_interrupted");
      expect(h.requests.length).toBe(1);
      expect(await readVaultRecord(h.profile)).toEqual(retained);
    });
  });

  it("follower abort stays local while leader and a live follower succeed", async () => {
    await withRotationHarness("gated-success", async (h) => {
      const leader = h.track(h.state.rotateRefresh(h.state.binding, freshSignal()));
      const live = h.track(h.state.rotateRefresh(h.state.binding, freshSignal()));
      const local = new AbortController();
      const localWait = h.track(h.state.rotateRefresh(h.state.binding, local.signal));
      // Aborting only its own wait reports operation_interrupted without
      // cancelling or rekeying the shared attempt.
      local.abort();
      expectCancellation(await captureRejection(localWait));
      await waitForDeadline(() => h.requests.length === 1);
      h.release();
      // Leader and the still-live follower share the single successful
      // outcome; the locally-aborted waiter never observes late success.
      expect(await leader).toBe(undefined);
      expect(await live).toBe(undefined);
      expect(h.requests.length).toBe(1);
      const stored = await readVaultRecord(h.profile);
      expect(stored.pendingRefresh).toBe(null);
      expect(stored.grant.refreshToken).toBe(ROTATED_REFRESH);
    });
  });

  it("leader abort is observed by a still-live follower with operation_interrupted", async () => {
    await withRotationHarness("gated-success", async (h) => {
      const leaderControl = new AbortController();
      const first = h.track(h.state.rotateRefresh(h.state.binding, leaderControl.signal));
      const second = h.track(h.state.rotateRefresh(h.state.binding, freshSignal()));
      await waitForDeadline(() => h.requests.length === 1);
      // The leader abort cancels the shared attempt; the nonaborted live
      // follower gets the shared failed outcome, never late success.
      leaderControl.abort();
      expectCancellation(await captureRejection(first));
      expectCancellation(await captureRejection(second));
      expect(h.requests.length).toBe(1);
      const retained = await readVaultRecord(h.profile);
      expect(retained.grant).toEqual(h.predecessor);
      expect(retained.pendingRefresh.predecessor).toEqual(h.predecessor);
    });
  });

  it("invalidation during flight suppresses late success and retains pending", async () => {
    await withRotationHarness("gated-success", async (h) => {
      const flight = h.track(h.state.rotateRefresh(h.state.binding, freshSignal()));
      await waitForDeadline(() => h.requests.length === 1);
      // Invalidation before the final commit prevents installation: even a
      // released response cannot deliver late success, and the completed
      // prepare stays pending with no rollback.
      h.state.invalidate();
      h.release();
      expectCancellation(await captureRejection(flight));
      expect(h.requests.length).toBe(1);
      const retained = await readVaultRecord(h.profile);
      expect(retained.grant).toEqual(h.predecessor);
      expect(retained.pendingRefresh.predecessor).toEqual(h.predecessor);
      h.state = null;
    });
  });

  it("cancellation during the owned final commit settles safely with the grant installed", async () => {
    let successGate = null;
    const holdSuccessCommit = (owner, { track, registerRelease }) => {
      let releaseSuccess = null;
      const gate = new Promise((resolve) => {
        releaseSuccess = resolve;
      });
      registerRelease(() => releaseSuccess());
      let vaultCommits = 0;
      let started = false;
      const adapter = {
        get binding() {
          return owner.binding;
        },
        readVaultBytes: (...args) => owner.readVaultBytes(...args),
        commit: (...args) => {
          // The real owned commit is tracked immediately, independently of
          // the public promise, so its outcome is always observed.
          const pending = track(owner.commit(...args));
          if (args[0] !== undefined && args[0].vaultBytes !== undefined) {
            vaultCommits += 1;
            // The first vault commit is prepare (pass through); the second
            // is the owned final success commit, held until the test
            // cancels and then releases it.
            if (vaultCommits === 2) {
              started = true;
              return gate.then(() => pending);
            }
          }
          return pending;
        },
        bindAccount: (...args) => owner.bindAccount(...args),
        advanceSessionGeneration: (...args) => owner.advanceSessionGeneration(...args),
        close: (...args) => owner.close(...args),
      };
      successGate = {
        hasStarted: () => started,
        releaseSuccess: () => releaseSuccess(),
      };
      return adapter;
    };
    await withRotationHarness(
      "gated-success",
      async (h) => {
        const flight = h.track(h.state.rotateRefresh(h.state.binding, freshSignal()));
        await waitForDeadline(() => h.requests.length === 1);
        h.release();
        await waitForDeadline(() => successGate.hasStarted());
        // Cancellation during the owned commit cannot retract it: the
        // implementation awaits owned completion safely, then suppresses
        // the late success instead of delivering it.
        h.state.invalidate();
        successGate.releaseSuccess();
        expectCancellation(await captureRejection(flight));
        expect(h.requests.length).toBe(1);
        // The completed success commit stays installed (grant + pending
        // null, binding unchanged): suppression is not rollback.
        const stored = await readVaultRecord(h.profile);
        expect(stored.version).toBe(2);
        expect(stored.binding).toEqual(h.installed);
        expect(stored.pendingRefresh).toBe(null);
        expect(stored.grant).toEqual({
          accountUuid: ACCOUNT_A,
          accessToken: ROTATED_ACCESS,
          accessExpiresAt: ROTATED_ACCESS_EXPIRY,
          refreshToken: ROTATED_REFRESH,
          refreshExpiresAt: ROTATED_REFRESH_EXPIRY,
        });
        h.state = null;
      },
      holdSuccessCommit,
    );
  });

  it("leader abort during the owned final commit waits for completion, then suppresses success", async () => {
    let commitGate = null;
    const holdFinalCommit = (owner, { track, registerRelease }) => {
      let releaseCommit = null;
      const gate = new Promise((resolve) => {
        releaseCommit = resolve;
      });
      registerRelease(() => releaseCommit());
      let vaultCommits = 0;
      let started = false;
      let settled = false;
      const adapter = {
        get binding() {
          return owner.binding;
        },
        readVaultBytes: (...args) => owner.readVaultBytes(...args),
        commit: (...args) => {
          // The real owned commit is tracked immediately, independently of
          // the public promise, so its outcome is always observed.
          const pending = track(owner.commit(...args));
          if (args[0] !== undefined && args[0].vaultBytes !== undefined) {
            vaultCommits += 1;
            if (vaultCommits === 2) {
              started = true;
              return gate.then(() => pending);
            }
          }
          return pending;
        },
        bindAccount: (...args) => owner.bindAccount(...args),
        advanceSessionGeneration: (...args) => owner.advanceSessionGeneration(...args),
        close: (...args) => owner.close(...args),
      };
      commitGate = {
        hasStarted: () => started,
        isSettled: () => settled,
        markSettled: () => {
          settled = true;
        },
        releaseCommit: () => releaseCommit(),
      };
      return adapter;
    };
    await withRotationHarness(
      "gated-success",
      async (h) => {
        const leader = new AbortController();
        const flight = h.track(h.state.rotateRefresh(h.state.binding, leader.signal));
        void flight.then(
          () => commitGate.markSettled(),
          () => commitGate.markSettled(),
        );
        await waitForDeadline(() => h.requests.length === 1);
        h.release();
        await waitForDeadline(() => commitGate.hasStarted());
        // The leader abort cannot settle the public call while its owned
        // storage commit remains unresolved.
        leader.abort();
        await sleepBounded(250);
        expect(commitGate.isSettled()).toBe(false);
        commitGate.releaseCommit();
        // Owned completion is awaited safely, then the late success is
        // suppressed; the completed grant stays installed, no rollback.
        expectCancellation(await captureRejection(flight));
        expect(h.requests.length).toBe(1);
        const stored = await readVaultRecord(h.profile);
        expect(stored.version).toBe(2);
        expect(stored.binding).toEqual(h.installed);
        expect(stored.pendingRefresh).toBe(null);
        expect(stored.grant.refreshToken).toBe(ROTATED_REFRESH);
        h.state = null;
      },
      holdFinalCommit,
    );
  });
});
