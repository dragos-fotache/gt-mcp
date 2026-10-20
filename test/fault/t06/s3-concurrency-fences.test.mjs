// T06-S3 QA fault 02 — shared recovery cycle, follower cancellation,
// mixed-kind rejection, commit/fence boundary
// (SOURCE-READY, HOLD: authored against the settled S3 work-order public API
// plus the accepted T04 diagnostic facility and T05 loopback TLS fixtures,
// never executed before the coordinator's named frozen relay).
//
// Spec basis: work-order "Recovery transitions and bounded dispatch" shared-
// cycle paragraph (concurrent valid recoverRefresh callers share ONE entire
// cycle including its optional fresh rotation; first caller owns
// cancellation; followers may abort their own waits; nonaborted followers
// receive the shared outcome and recheck binding/signal/fence; terminal
// shared-cycle success rechecks cancellation/fence AFTER any trusted
// epoch-clock callback, so a leader abort during that callback yields the
// shared operation_interrupted outcome for nonaborted followers too, with
// already-installed grants retained), the different-kind bound
// (overlapping rotate rejects operation_interrupted without joining,
// queuing, cancelling, or fencing), foreign/malformed isolation, and the
// fence paragraph (invalidate cancels owned network work; begun commits
// settle safely with late success suppressed and no rollback). Opaque
// operation bytes are preserved through the shared success.
//
// Boundaries: accepted T04 diagnostic facility + unchanged T05 loopback TLS
// fixtures only; synthetic data; no personal provider; no generalized
// harness. The accepted TLS helper delivers request bytes on the third
// handler argument (capture record); responders use those bytes, never raw
// req.body. Responder failures are captured into the owning test;
// response/commit gates always settle before owned waits, and secondary
// teardown failures are reported alongside body failures. One post-clock
// regression uses the public durable fresh-result boundary (not private
// sync points or clock-call quotas); exhaustive fault cross-products and
// power-loss proof stay out of scope per the work order.

/* global AbortController, setTimeout */

import { describe, expect, it } from "vitest";
import {
  isSessionError,
  openRecoverableRefreshSessionState,
  openSessionState,
} from "../../../dist/auth/index.js";
import { isTransportError } from "../../../dist/http/index.js";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import {
  closeServer,
  readFixtureBytes,
  startLoopbackHttps,
  waitForDeadline,
} from "../t05/helpers.mjs";
import {
  captureRejection,
  freshSignal,
  liveClock,
  makeClock,
  teardownAll,
} from "../../unit/t06/helpers.mjs";
import {
  combineFailures,
  s3PrepareBodyBase64,
  s3ServiceBody,
  s3ServiceBytes,
  s3Utf8Text,
  s3ValidPending,
  s3Version2Bytes,
  s3VaultGrant,
  waitForVaultRecord,
} from "../../unit/t06/s3-helpers.mjs";
import { S3_ACCOUNT_OTHER } from "../../unit/t06/s3-helpers.mjs";

const S3_MID_MS = Date.parse("2026-10-01T00:00:00.000Z");
const S3_LATE_MS = Date.parse("2026-11-01T00:00:00.000Z");

// Cancellation/invalidation must land on operation_interrupted in either the
// Session or Transport family; no unrelated code satisfies cancellation.
function expectS3Cancellation(error) {
  expect(error.code).toBe("operation_interrupted");
  expect(isSessionError(error) || isTransportError(error)).toBe(true);
}

async function installS3Grant(profile) {
  const installer = await openSessionState({ profile, clock: liveClock() });
  const installed = await installer.installInitialGrant(
    installer.binding,
    s3ServiceBytes(),
    freshSignal(),
  );
  installer.invalidate();
  return installed;
}

async function readS3VaultRecord(profile) {
  return JSON.parse(s3Utf8Text(await profile.readVaultBytes()));
}

function sleepS3(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Shared harness: isolated loopback server + diagnostic facility + settled S1
// grant + reopened owner + seeded pending + open recoverable facade. The box
// owns the CURRENT profile/facade so teardown closes the live holder before
// cleanup on every path. Responder failures are captured into the owning
// test; registered response/commit gates always settle before owned waits;
// secondary teardown failures are reported alongside body failures. An
// optional wrapOwner adapts the reopened owner (commit gate) before the
// facade opens; an optional clock replaces the default epoch clock.
async function withSharedCycleHarness(respond, fn, clockMs = S3_MID_MS, overrides = {}) {
  const certPem = readFixtureBytes("test-only-loopback-cert.pem");
  const keyPem = readFixtureBytes("test-only-loopback-key.pem");
  let count = 0;
  const handlerFailures = [];
  const { server, origin, requests } = await startLoopbackHttps(
    { keyPem, certPem, label: "synthetic-qa-t06-s3 shared cycle" },
    (req, res, record) => {
      void req;
      count += 1;
      try {
        respond(record, res, count);
      } catch (error) {
        handlerFailures.push(error);
        try {
          res.socket.destroy();
        } catch {
          // Best effort: the owning test fails on handlerFailures below.
        }
      }
    },
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
  // Every response/commit gate registers here and releases on ALL paths
  // BEFORE owned-work settlement below, so a failing assertion can never
  // leave owned work unresolved and hang teardown.
  const gateReleases = [];
  const registerRelease = (releaseFn) => {
    gateReleases.push(releaseFn);
  };
  let bodyError = null;
  try {
    facility = await createStorageTestFacility();
    box.profile = await facility.provision(origin);
    const installed = await installS3Grant(box.profile);
    await box.profile.close();
    box.profile = await facility.open(installed);
    const predecessor = s3VaultGrant();
    const seeded = s3ValidPending(predecessor);
    await box.profile.commit({
      vaultBytes: s3Version2Bytes({
        binding: { ...installed },
        grant: predecessor,
        pendingRefresh: seeded,
      }),
    });
    const ownerForFacade =
      overrides.wrapOwner === undefined || overrides.wrapOwner === null
        ? box.profile
        : overrides.wrapOwner(box.profile, { track, registerRelease });
    const state = await openRecoverableRefreshSessionState({
      profile: ownerForFacade,
      transportConfig: { origin, testCaPem: certPem },
      clock: overrides.clock === undefined ? makeClock(clockMs) : overrides.clock,
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
      facility,
      installed,
      predecessor,
      seeded,
      track,
      owned,
      registerRelease,
    };
    await fn(h);
    if (handlerFailures.length > 0) throw handlerFailures[0];
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
  combineFailures(bodyError, teardownError);
}

function cycleResponder(recovered, rotated) {
  const predecessorToken = s3VaultGrant().refreshToken;
  return (record, res) => {
    const body = JSON.parse(record.body.toString("utf8"));
    if (body.refreshToken === predecessorToken) {
      const payload = Buffer.from(JSON.stringify(recovered), "utf8");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(payload);
      return;
    }
    const payload = Buffer.from(JSON.stringify(rotated), "utf8");
    res.writeHead(200, { "content-type": "application/json" });
    res.end(payload);
  };
}

function rotatedLiveBody() {
  return {
    account: { id: s3ServiceBody().account.id, displayName: null },
    accessToken: "synthetic-qa-t06-s3-access.03",
    accessExpiresAt: "2026-10-15T12:00:00.000Z",
    refreshToken: "synthetic-qa-t06-s3-refresh.03",
    refreshExpiresAt: "2026-11-28T12:00:00.000Z",
  };
}

describe("T06-S3 concurrent recover callers share one entire cycle", () => {
  it("two valid callers share replay plus the single follow-on rotation", async () => {
    const recovered = s3ServiceBody();
    await withSharedCycleHarness(cycleResponder(recovered, rotatedLiveBody()), async (h) => {
      const first = h.track(h.state.recoverRefresh(h.state.binding, freshSignal()));
      const second = h.track(h.state.recoverRefresh(h.state.binding, freshSignal()));
      expect(await first).toBe(undefined);
      expect(await second).toBe(undefined);
      // The whole cycle — replay plus its optional fresh rotation — ran
      // once: exactly two control attempts, each T05 attempt1.
      expect(h.requests.length).toBe(2);
      expect(Buffer.from(h.requests[0].body).toString("base64")).toBe(
        s3PrepareBodyBase64(h.predecessor.refreshToken),
      );
      expect(Buffer.from(h.requests[1].body).toString("base64")).toBe(
        s3PrepareBodyBase64(recovered.refreshToken),
      );
      expect(h.requests[1].headers["idempotency-key"]).not.toBe(
        h.requests[0].headers["idempotency-key"],
      );
      const stored = await readS3VaultRecord(h.profile);
      expect(stored.pendingRefresh).toBe(null);
      expect(stored.grant.refreshToken).toBe("synthetic-qa-t06-s3-refresh.03");
      expect(stored.binding).toEqual(h.installed);
    });
  });

  it("follower abort stays local while leader and a live follower succeed", async () => {
    const recovered = s3ServiceBody();
    await withSharedCycleHarness(cycleResponder(recovered, rotatedLiveBody()), async (h) => {
      const leader = h.track(h.state.recoverRefresh(h.state.binding, freshSignal()));
      const live = h.track(h.state.recoverRefresh(h.state.binding, freshSignal()));
      const local = new AbortController();
      const localWait = h.track(h.state.recoverRefresh(h.state.binding, local.signal));
      local.abort();
      expectS3Cancellation(await captureRejection(localWait));
      expect(await leader).toBe(undefined);
      expect(await live).toBe(undefined);
      expect(h.requests.length).toBe(2);
      const stored = await readS3VaultRecord(h.profile);
      expect(stored.pendingRefresh).toBe(null);
      expect(stored.grant.refreshToken).toBe("synthetic-qa-t06-s3-refresh.03");
    });
  });

  it("leader abort is observed by a still-live follower with evidence retained", async () => {
    let release = null;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const recovered = s3ServiceBody();
    const predecessorToken = s3VaultGrant().refreshToken;
    await withSharedCycleHarness(
      (record, res) => {
        const body = JSON.parse(record.body.toString("utf8"));
        if (body.refreshToken === predecessorToken) {
          gate.then(() => {
            const payload = Buffer.from(JSON.stringify(recovered), "utf8");
            res.writeHead(200, { "content-type": "application/json" });
            res.end(payload);
          });
          return;
        }
        const payload = Buffer.from(JSON.stringify(rotatedLiveBody()), "utf8");
        res.writeHead(200, { "content-type": "application/json" });
        res.end(payload);
      },
      async (h) => {
        h.registerRelease(() => release());
        const leaderControl = new AbortController();
        const first = h.track(h.state.recoverRefresh(h.state.binding, leaderControl.signal));
        const second = h.track(h.state.recoverRefresh(h.state.binding, freshSignal()));
        await waitForDeadline(() => h.requests.length === 1);
        leaderControl.abort();
        release();
        expectS3Cancellation(await captureRejection(first));
        expectS3Cancellation(await captureRejection(second));
        expect(h.requests.length).toBe(1);
        const retained = await readS3VaultRecord(h.profile);
        expect(retained.grant).toEqual(h.predecessor);
        expect(retained.pendingRefresh).toEqual(h.seeded);
      },
    );
  });

  it("post-clock leader abort shares interruption with a live follower after durable install", async () => {
    const recovered = s3ServiceBody();
    const rotated = rotatedLiveBody();
    // Trusted epoch clock that aborts the leader while returning live time
    // once armed. Arming happens only while the rotation success commit is
    // suspended on its held acknowledgement, so no clock read can observe
    // the abort before the fresh result is durable. No call quotas: the
    // oracle is public storage, network, and promise behavior.
    const leaderControl = new AbortController();
    let armClockAbort = false;
    const clock = {
      nowMs: () => {
        if (armClockAbort) leaderControl.abort();
        return S3_MID_MS;
      },
    };
    // Public-capability gate on the real rotation success commit (replay
    // install #1, rotation prepare #2, rotation success #3): the real
    // commit runs immediately, but its acknowledgement is held.
    let releaseSuccess = null;
    let successStarted = false;
    const holdSuccess = (owner, { track, registerRelease }) => {
      const gate = new Promise((resolve) => {
        releaseSuccess = resolve;
      });
      registerRelease(() => releaseSuccess());
      let vaultCommits = 0;
      const adapter = {
        get binding() {
          return owner.binding;
        },
        readVaultBytes: (...args) => owner.readVaultBytes(...args),
        commit: (...args) => {
          const pending = track(owner.commit(...args));
          if (args[0] !== undefined && args[0].vaultBytes !== undefined) {
            vaultCommits += 1;
            if (vaultCommits === 3) {
              successStarted = true;
              return gate.then(() => pending);
            }
          }
          return pending;
        },
        bindAccount: (...args) => owner.bindAccount(...args),
        advanceSessionGeneration: (...args) => owner.advanceSessionGeneration(...args),
        close: (...args) => owner.close(...args),
      };
      return adapter;
    };
    await withSharedCycleHarness(
      cycleResponder(recovered, rotated),
      async (h) => {
        const leader = h.track(h.state.recoverRefresh(h.state.binding, leaderControl.signal));
        const follower = h.track(h.state.recoverRefresh(h.state.binding, freshSignal()));
        await waitForDeadline(() => h.requests.length === 2);
        await waitForDeadline(() => successStarted);
        // The fresh rotation result is actually durable before the abort
        // can land: rotated grant installed with pending null.
        const durable = await waitForVaultRecord(
          h.profile,
          (record) =>
            record.pendingRefresh === null && record.grant.refreshToken === rotated.refreshToken,
        );
        expect(durable.binding).toEqual(h.installed);
        armClockAbort = true;
        releaseSuccess();
        // The terminal post-clock recheck observes the aborted leader: the
        // leader reports its own interruption and the nonaborted follower
        // receives the shared operation_interrupted outcome.
        expectS3Cancellation(await captureRejection(leader));
        expectS3Cancellation(await captureRejection(follower));
        // No third dispatch and no rollback: the installed grant stays.
        await sleepS3(250);
        expect(h.requests.length).toBe(2);
        const stored = await readS3VaultRecord(h.profile);
        expect(stored.pendingRefresh).toBe(null);
        expect(stored.grant.refreshToken).toBe(rotated.refreshToken);
        expect(stored.binding).toEqual(h.installed);
      },
      S3_MID_MS,
      { clock, wrapOwner: holdSuccess },
    );
  });
});

describe("T06-S3 mixed-kind and foreign calls never join or damage the cycle", () => {
  it("rotate overlapping an active recover rejects without joining, queuing, or fencing", async () => {
    let release = null;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const recovered = s3ServiceBody();
    await withSharedCycleHarness(
      (record, res) => {
        void record;
        gate.then(() => {
          const payload = Buffer.from(JSON.stringify(recovered), "utf8");
          res.writeHead(200, { "content-type": "application/json" });
          res.end(payload);
        });
      },
      async (h) => {
        h.registerRelease(() => release());
        const leader = h.track(h.state.recoverRefresh(h.state.binding, freshSignal()));
        await waitForDeadline(() => h.requests.length === 1);
        // Different-kind overlap: rejects immediately, never joins the
        // cycle, queues another cycle, or fences the leader.
        const mixed = await captureRejection(h.state.rotateRefresh(h.state.binding, freshSignal()));
        expect(isSessionError(mixed)).toBe(true);
        expect(mixed.code).toBe("operation_interrupted");
        release();
        // The recovered grant has live access at this clock, so the
        // leader finishes after the single replay with no follow-on;
        // the mixed-kind rejection neither joined nor fenced it.
        expect(await leader).toBe(undefined);
        expect(h.requests.length).toBe(1);
      },
      Date.parse("2026-09-01T00:00:00.000Z"),
    );
  });

  it("foreign and malformed calls never join a successful result or damage valid callers", async () => {
    const liveGrant = s3ServiceBody({
      accessExpiresAt: "2026-11-15T12:00:00.000Z",
      refreshExpiresAt: "2026-11-27T12:00:00.000Z",
    });
    await withSharedCycleHarness(
      (record, res) => {
        void record;
        const payload = Buffer.from(JSON.stringify(liveGrant), "utf8");
        res.writeHead(200, { "content-type": "application/json" });
        res.end(payload);
      },
      async (h) => {
        const leader = h.track(h.state.recoverRefresh(h.state.binding, freshSignal()));
        const foreign = { ...h.state.binding, accountUuid: S3_ACCOUNT_OTHER };
        const rejectedForeign = await captureRejection(
          h.state.recoverRefresh(foreign, freshSignal()),
        );
        expect(isSessionError(rejectedForeign)).toBe(true);
        expect(rejectedForeign.code).toBe("operation_interrupted");
        const rejectedMalformed = await captureRejection(
          h.state.recoverRefresh(null, freshSignal()),
        );
        expect(isSessionError(rejectedMalformed)).toBe(true);
        expect(rejectedMalformed.code).toBe("invalid_arguments");
        // At S3_LATE_MS the predecessor refresh is expired locally while the
        // returned refresh is current: the valid leader still installs.
        expect(await leader).toBe(undefined);
        const stored = await readS3VaultRecord(h.profile);
        expect(stored.pendingRefresh).toBe(null);
        expect(stored.grant.refreshToken).toBe(liveGrant.refreshToken);
      },
      S3_LATE_MS,
    );
  });
});

describe("T06-S3 invalidation fence during replay flight", () => {
  it("suppresses late success and retains original pending with no rollback", async () => {
    let release = null;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const recovered = s3ServiceBody();
    await withSharedCycleHarness(
      (record, res) => {
        void record;
        gate.then(() => {
          const payload = Buffer.from(JSON.stringify(recovered), "utf8");
          res.writeHead(200, { "content-type": "application/json" });
          res.end(payload);
        });
      },
      async (h) => {
        h.registerRelease(() => release());
        const flight = h.track(h.state.recoverRefresh(h.state.binding, freshSignal()));
        await waitForDeadline(() => h.requests.length === 1);
        // Invalidation before settlement prevents installation: even the
        // released response cannot deliver late success, and the original
        // pending stays durable with no rollback.
        h.state.invalidate();
        release();
        expectS3Cancellation(await captureRejection(flight));
        expect(h.requests.length).toBe(1);
        const retained = await readS3VaultRecord(h.profile);
        expect(retained.grant).toEqual(h.predecessor);
        expect(retained.pendingRefresh).toEqual(h.seeded);
        h.state = null;
        await sleepS3(250);
        expect(h.requests.length).toBe(1);
        expect(await readS3VaultRecord(h.profile)).toEqual(retained);
      },
    );
  });
});
