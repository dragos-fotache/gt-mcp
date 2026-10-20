// T06-S3 QA fault 01 — exact durable replay, recovered install before
// distinct rotation, restart gap, retention
// (SOURCE-READY, HOLD: authored against the settled S3 work-order public API
// plus the accepted T04 diagnostic facility and T05 loopback TLS fixtures,
// never executed before the coordinator's named frozen relay).
//
// Spec basis: work-order "Recovery transitions and bounded dispatch" steps
// 2-8 (pending replayed explicitly even with locally expired predecessor
// deadlines using original durable body/key; recovered grant atomically
// installed with pending-null BEFORE at most one distinct fresh rotation
// using the recovered token and a distinct key; at most two control
// requests; no-pending restart gap needs no volatile memory; fresh result
// with expired access but live refresh installs then returns
// reauthentication_required without looping; every failed replay retains
// ORIGINAL pending evidence, including definite 401/409; pending never
// rekeys on repeated replay) and the error distinctions (lost connection =>
// T05 network_error; HTTP200 invalid JSON => T05 internal_error; valid JSON
// with invalid grant fields => SessionError invalid_grant;
// idempotency_key_reused never proves settlement). Close/reopen proves
// durable (not volatile) recovery. No crash-kill campaign, no generalized
// harness.
//
// Boundaries: accepted T04 diagnostic facility + unchanged T05 loopback TLS
// fixtures only; synthetic data; no personal provider. The accepted TLS
// helper delivers request bytes on the third handler argument (capture
// record); responders use those bytes, never raw req.body. Responder
// failures are captured into the owning test; response/commit gates always
// settle before owned waits, and secondary teardown failures are reported
// alongside body failures. Fixture roots are owned by the diagnostic
// facility; no HOME/TMPDIR overrides.

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
  S3_CANONICAL_UUID,
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

// Visibly synthetic rotated grant (listed here, so synthetic by provenance).
const ROTATED_ACCESS = "synthetic-qa-t06-s3-access.03";
const ROTATED_REFRESH = "synthetic-qa-t06-s3-refresh.03";
const ROTATED_ACCESS_EXPIRY = "2026-10-15T12:00:00.000Z";
const ROTATED_REFRESH_EXPIRY = "2026-11-28T12:00:00.000Z";

// Clock positions (deterministic trusted epoch clocks, never wall clock):
// MID expires any 09-27 access grant while keeping the .01 refresh (10-27)
// and .02 refresh (11-27) live; LATE additionally expires the .01 refresh
// while keeping the .02 refresh live.
const MID_MS = Date.parse("2026-10-01T00:00:00.000Z");
const LATE_MS = Date.parse("2026-11-01T00:00:00.000Z");

function rotatedServiceBody() {
  return {
    account: { id: s3ServiceBody().account.id, displayName: null },
    accessToken: ROTATED_ACCESS,
    accessExpiresAt: ROTATED_ACCESS_EXPIRY,
    refreshToken: ROTATED_REFRESH,
    refreshExpiresAt: ROTATED_REFRESH_EXPIRY,
  };
}

// Live-access recovered grant for the expired-predecessor case: access still
// live at LATE_MS, refresh live at LATE_MS.
function liveRecoveredBody() {
  return s3ServiceBody({
    accessExpiresAt: "2026-11-15T12:00:00.000Z",
    refreshExpiresAt: "2026-11-27T12:00:00.000Z",
  });
}

// Cancellation/invalidation must land on operation_interrupted in either the
// Session or Transport family; no unrelated code satisfies cancellation.
function expectS3Cancellation(error) {
  expect(error.code).toBe("operation_interrupted");
  expect(isSessionError(error) || isTransportError(error)).toBe(true);
}

// Install a bound S3 grant through the accepted S1 entry, then return the
// installed binding. The caller closes/reopens before S3 use.
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

async function readVaultRecord(profile) {
  return JSON.parse(s3Utf8Text(await profile.readVaultBytes()));
}

function jsonOk(res, obj) {
  const body = Buffer.from(JSON.stringify(obj), "utf8");
  res.writeHead(200, { "content-type": "application/json" });
  res.end(body);
}

function sleepBounded(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Shared case rig: isolated loopback server + diagnostic facility + settled
// S1 grant + reopened owner + seeded vault + open recoverable facade. The
// box owns the CURRENT profile/facade so teardown closes the live holder
// before cleanup on every path. Responder failures are captured into the
// owning test (never orphan server-event throws); response/commit gates
// always settle before owned waits; secondary teardown failures are
// reported alongside body failures. An optional wrapOwner adapts the
// reopened owner (commit spy/gate) before the facade opens; the real owner
// stays the teardown-closed handle. Seeds: "pending" (durable uncertain
// attempt), "gap" (recovered-equivalent grant, pending null), "none".
async function withReplayCase(
  { respond, clock = liveClock(), seed = "pending", wrapOwner = null },
  fn,
) {
  const certPem = readFixtureBytes("test-only-loopback-cert.pem");
  const keyPem = readFixtureBytes("test-only-loopback-key.pem");
  let count = 0;
  const handlerFailures = [];
  const { server, origin, requests } = await startLoopbackHttps(
    { keyPem, certPem, label: "synthetic-qa-t06-s3 replay pair" },
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
    let predecessor = null;
    let seeded = null;
    let gapGrant = null;
    if (seed === "pending") {
      predecessor = s3VaultGrant();
      seeded = s3ValidPending(predecessor);
      await box.profile.commit({
        vaultBytes: s3Version2Bytes({
          binding: { ...installed },
          grant: predecessor,
          pendingRefresh: seeded,
        }),
      });
    } else if (seed === "gap") {
      const service = s3ServiceBody();
      gapGrant = {
        accountUuid: service.account.id,
        accessToken: service.accessToken,
        accessExpiresAt: service.accessExpiresAt,
        refreshToken: service.refreshToken,
        refreshExpiresAt: service.refreshExpiresAt,
      };
      await box.profile.commit({
        vaultBytes: s3Version2Bytes({
          binding: { ...installed },
          grant: gapGrant,
          pendingRefresh: null,
        }),
      });
    }
    const ownerForFacade =
      wrapOwner === null ? box.profile : wrapOwner(box.profile, { track, registerRelease });
    const state = await openRecoverableRefreshSessionState({
      profile: ownerForFacade,
      transportConfig: { origin, testCaPem: certPem },
      clock,
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
      gapGrant,
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

// Pass-through T04 owner capability that records every vault-commit
// argument snapshot in order while delegating to the real isolated owner.
// Invocation order only: durable completion is proved by the acknowledgement
// gate case below, not by this spy. No production seam.
function makeCommitSpyOwner(owner, commits) {
  return {
    get binding() {
      return owner.binding;
    },
    readVaultBytes: (...args) => owner.readVaultBytes(...args),
    commit: (...args) => {
      if (args[0] !== undefined && args[0].vaultBytes !== undefined) {
        commits.push(Buffer.from(args[0].vaultBytes).toString("utf8"));
      }
      return owner.commit(...args);
    },
    bindAccount: (...args) => owner.bindAccount(...args),
    advanceSessionGeneration: (...args) => owner.advanceSessionGeneration(...args),
    close: (...args) => owner.close(...args),
  };
}

describe("T06-S3 exact replay after lost response and reopen", () => {
  it("retains original pending on loss; reopened replay reuses identical body/key and installs", async () => {
    let mode = "destroy";
    const liveGrant = liveRecoveredBody();
    const respond = (record, res) => {
      void record;
      if (mode === "destroy") {
        res.socket.destroy();
        return;
      }
      jsonOk(res, liveGrant);
    };
    await withReplayCase({ respond, clock: makeClock(LATE_MS) }, async (h) => {
      const lost = await captureRejection(
        h.track(h.state.recoverRefresh(h.state.binding, freshSignal())),
      );
      expect(isTransportError(lost)).toBe(true);
      expect(lost.code).toBe("network_error");
      expect(h.requests.length).toBe(1);
      const retained = await readVaultRecord(h.profile);
      expect(retained.pendingRefresh).toEqual(h.seeded);
      expect(retained.grant).toEqual(h.predecessor);
      const retainedKey = retained.pendingRefresh.authKey;
      const retainedBody = retained.pendingRefresh.bodyBase64;
      // Close/reopen: recovery uses durable bytes, never volatile memory.
      h.state.invalidate();
      h.state = null;
      await h.profile.close();
      h.profile = await h.facility.open(h.installed);
      expect(await readVaultRecord(h.profile)).toEqual(retained);
      mode = "success";
      h.state = await openRecoverableRefreshSessionState({
        profile: h.profile,
        transportConfig: { origin: h.origin, testCaPem: h.certPem },
        clock: makeClock(LATE_MS),
      });
      expect(await h.track(h.state.recoverRefresh(h.state.binding, freshSignal()))).toBe(undefined);
      expect(h.requests.length).toBe(2);
      // Both replayed requests carry detached copies of the ORIGINAL
      // durable body and key, even with an expired predecessor deadline.
      for (const request of h.requests) {
        expect(request.method).toBe("POST");
        expect(request.url).toBe("/v1/auth/refresh");
        expect(Buffer.from(request.body).toString("base64")).toBe(retainedBody);
        expect(request.headers["idempotency-key"]).toBe(retainedKey);
      }
      const stored = await readVaultRecord(h.profile);
      expect(stored.pendingRefresh).toBe(null);
      expect(stored.grant.accessToken).toBe(liveGrant.accessToken);
      expect(stored.grant.refreshToken).toBe(liveGrant.refreshToken);
      expect(stored.grant.accessExpiresAt).toBe(liveGrant.accessExpiresAt);
      expect(stored.grant.refreshExpiresAt).toBe(liveGrant.refreshExpiresAt);
    });
  });
});

describe("T06-S3 recovered install precedes one distinct rotation", () => {
  it("commits install, prepare, and success arguments in order with distinct keys", async () => {
    const recovered = s3ServiceBody();
    const rotated = rotatedServiceBody();
    const predecessorToken = s3VaultGrant().refreshToken;
    const respond = (record, res) => {
      const body = JSON.parse(record.body.toString("utf8"));
      if (body.refreshToken === predecessorToken) {
        jsonOk(res, recovered);
        return;
      }
      jsonOk(res, rotated);
    };
    const commits = [];
    await withReplayCase(
      {
        respond,
        clock: makeClock(MID_MS),
        wrapOwner: (owner) => makeCommitSpyOwner(owner, commits),
      },
      async (h) => {
        // At MID_MS the recovered access (09-27T12:30) is expired while its
        // refresh (11-27) is live, so one distinct follow-on rotation follows
        // the replay within the same explicit cycle.
        expect(await h.track(h.state.recoverRefresh(h.state.binding, freshSignal()))).toBe(
          undefined,
        );
        // At most two control requests: original replay plus one rotation.
        expect(h.requests.length).toBe(2);
        const [replay, rotation] = h.requests;
        expect(replay.method).toBe("POST");
        expect(replay.url).toBe("/v1/auth/refresh");
        expect(rotation.method).toBe("POST");
        expect(rotation.url).toBe("/v1/auth/refresh");
        expect(Buffer.from(replay.body).toString("base64")).toBe(
          s3PrepareBodyBase64(predecessorToken),
        );
        // The new request uses the recovered token with a distinct new key.
        expect(Buffer.from(rotation.body).toString("base64")).toBe(
          s3PrepareBodyBase64(recovered.refreshToken),
        );
        expect(rotation.headers["idempotency-key"]).not.toBe(replay.headers["idempotency-key"]);
        expect(S3_CANONICAL_UUID.test(rotation.headers["idempotency-key"])).toBe(true);
        // Invocation order: recovered install (grant .02, pending null),
        // then rotation prepare (predecessor .02), then final install.
        // Durable completion ordering is proved by the acknowledgement
        // gate case below, not by this argument record alone.
        expect(commits.length).toBe(3);
        const [install, prepare, success] = commits.map((text) => JSON.parse(text));
        expect(install.grant.refreshToken).toBe(recovered.refreshToken);
        expect(install.pendingRefresh).toBe(null);
        expect(prepare.grant.refreshToken).toBe(recovered.refreshToken);
        expect(prepare.pendingRefresh.predecessor.refreshToken).toBe(recovered.refreshToken);
        expect(prepare.pendingRefresh.authKey).toBe(rotation.headers["idempotency-key"]);
        expect(success.grant.refreshToken).toBe(ROTATED_REFRESH);
        expect(success.pendingRefresh).toBe(null);
        const stored = await readVaultRecord(h.profile);
        expect(stored.grant.refreshToken).toBe(ROTATED_REFRESH);
        expect(stored.pendingRefresh).toBe(null);
      },
    );
  });

  it("held install acknowledgement blocks prepare/dispatch/settlement; abort during hold retains install", async () => {
    const recovered = s3ServiceBody();
    const rotated = rotatedServiceBody();
    const predecessorToken = s3VaultGrant().refreshToken;
    const respond = (record, res) => {
      const body = JSON.parse(record.body.toString("utf8"));
      if (body.refreshToken === predecessorToken) {
        jsonOk(res, recovered);
        return;
      }
      jsonOk(res, rotated);
    };
    // Public-capability gate on the real isolated recovered-install commit:
    // the real commit runs immediately, but its acknowledgement to the
    // facade is held. Replay needs no prepare commit, so the first vault
    // commit is the recovered install.
    let releaseInstall = null;
    let installStarted = false;
    const holdInstall = (owner, { track, registerRelease }) => {
      const installGate = new Promise((resolve) => {
        releaseInstall = resolve;
      });
      registerRelease(() => releaseInstall());
      let vaultCommits = 0;
      const adapter = {
        get binding() {
          return owner.binding;
        },
        readVaultBytes: (...args) => owner.readVaultBytes(...args),
        commit: (...args) => {
          // The real owned commit is tracked immediately, independently of
          // the public acknowledgement, so its outcome is always observed.
          const pending = track(owner.commit(...args));
          if (args[0] !== undefined && args[0].vaultBytes !== undefined) {
            vaultCommits += 1;
            if (vaultCommits === 1) {
              installStarted = true;
              return installGate.then(() => pending);
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
    await withReplayCase(
      { respond, clock: makeClock(MID_MS), wrapOwner: holdInstall },
      async (h) => {
        const leaderControl = new AbortController();
        let settled = false;
        const flight = h.track(h.state.recoverRefresh(h.state.binding, leaderControl.signal));
        void flight.then(
          () => {
            settled = true;
          },
          () => {
            settled = true;
          },
        );
        await waitForDeadline(() => installStarted);
        // Actual durable recovered grant/pending-null observed through the
        // real owner while the acknowledgement remains held.
        const durable = await waitForVaultRecord(
          h.profile,
          (record) =>
            record.pendingRefresh === null && record.grant.refreshToken === recovered.refreshToken,
        );
        expect(durable.binding).toEqual(h.installed);
        // No distinct prepare/dispatch/public settlement while unresolved:
        // still exactly the one replay request, no pending, leader waiting.
        expect(h.requests.length).toBe(1);
        await sleepBounded(250);
        expect(h.requests.length).toBe(1);
        expect(settled).toBe(false);
        // Cancellation during the owned acknowledgement waits safely, then
        // reports interruption with the installed grant retained.
        leaderControl.abort();
        await sleepBounded(250);
        expect(settled).toBe(false);
        releaseInstall();
        expectS3Cancellation(await captureRejection(flight));
        expect(h.requests.length).toBe(1);
        const stored = await readVaultRecord(h.profile);
        expect(stored.pendingRefresh).toBe(null);
        expect(stored.grant.refreshToken).toBe(recovered.refreshToken);
        expect(stored.binding).toEqual(h.installed);
      },
    );
  });

  it("no-pending restart gap still rotates once after close/reopen", async () => {
    const rotated = rotatedServiceBody();
    const respond = (record, res) => {
      void record;
      jsonOk(res, rotated);
    };
    await withReplayCase({ respond, clock: makeClock(MID_MS), seed: "gap" }, async (h) => {
      h.state.invalidate();
      h.state = null;
      await h.profile.close();
      h.profile = await h.facility.open(h.installed);
      h.state = await openRecoverableRefreshSessionState({
        profile: h.profile,
        transportConfig: { origin: h.origin, testCaPem: h.certPem },
        clock: makeClock(MID_MS),
      });
      // The durable gap grant (expired access, live refresh, pending null)
      // carries no volatile marker, yet recovery still performs the one
      // fresh rotation after reopen.
      expect(await h.track(h.state.recoverRefresh(h.state.binding, freshSignal()))).toBe(undefined);
      expect(h.requests.length).toBe(1);
      expect(Buffer.from(h.requests[0].body).toString("base64")).toBe(
        s3PrepareBodyBase64(h.gapGrant.refreshToken),
      );
      expect(S3_CANONICAL_UUID.test(h.requests[0].headers["idempotency-key"])).toBe(true);
      const stored = await readVaultRecord(h.profile);
      expect(stored.grant.refreshToken).toBe(ROTATED_REFRESH);
      expect(stored.pendingRefresh).toBe(null);
    });
  });

  it("expired-access fresh result installs, then reports reauthentication without looping", async () => {
    const recovered = s3ServiceBody();
    // Fresh result keeps expired access at MID_MS with a live refresh: it
    // must install atomically, then stop instead of rotating again.
    const respond = (record, res) => {
      void record;
      jsonOk(res, recovered);
    };
    await withReplayCase({ respond, clock: makeClock(MID_MS) }, async (h) => {
      // First the replay installs recovered (.02, expired access at MID_MS);
      // the follow-on rotation returns the same expired-access shape, which
      // installs and then reports reauthentication_required: exactly two
      // dispatches, no rollback, no third attempt.
      const error = await captureRejection(
        h.track(h.state.recoverRefresh(h.state.binding, freshSignal())),
      );
      expect(isSessionError(error)).toBe(true);
      expect(error.code).toBe("reauthentication_required");
      expect(h.requests.length).toBe(2);
      const stored = await readVaultRecord(h.profile);
      expect(stored.pendingRefresh).toBe(null);
      expect(stored.grant.refreshToken).toBe(recovered.refreshToken);
      await sleepBounded(250);
      expect(h.requests.length).toBe(2);
    });
  });
});

describe("T06-S3 failed replay retains original evidence without rekey", () => {
  it("lost responses on repeated replay keep the identical body and key", async () => {
    const respond = (record, res) => {
      void record;
      res.socket.destroy();
    };
    await withReplayCase({ respond }, async (h) => {
      const first = await captureRejection(
        h.track(h.state.recoverRefresh(h.state.binding, freshSignal())),
      );
      expect(isTransportError(first)).toBe(true);
      expect(first.code).toBe("network_error");
      const retained = await readVaultRecord(h.profile);
      expect(retained.pendingRefresh).toEqual(h.seeded);
      // Repeated explicit replay never mints another key: same body, key.
      const second = await captureRejection(
        h.track(h.state.recoverRefresh(h.state.binding, freshSignal())),
      );
      expect(isTransportError(second)).toBe(true);
      expect(second.code).toBe("network_error");
      expect(h.requests.length).toBe(2);
      expect(await readVaultRecord(h.profile)).toEqual(retained);
      for (const request of h.requests) {
        expect(Buffer.from(request.body).toString("base64")).toBe(h.seeded.bodyBase64);
        expect(request.headers["idempotency-key"]).toBe(h.seeded.authKey);
      }
    });
  });

  it("definite 409 conflict retains evidence; repeat keeps original identity without settlement", async () => {
    const respond = (record, res) => {
      void record;
      const body = Buffer.from(JSON.stringify({ errorCode: "idempotency_key_reused" }), "utf8");
      res.writeHead(409, { "content-type": "application/json" });
      res.end(body);
    };
    await withReplayCase({ respond }, async (h) => {
      const first = await captureRejection(
        h.track(h.state.recoverRefresh(h.state.binding, freshSignal())),
      );
      // Original safe T05 error, not an invented SessionError: a definite
      // backend conflict on one control attempt, dispatched once.
      expect(isTransportError(first)).toBe(true);
      expect(first.code).toBe("idempotency_key_reused");
      expect(first.dispatched).toBe(true);
      expect(first.attempts).toBe(1);
      expect(h.requests.length).toBe(1);
      const retained = await readVaultRecord(h.profile);
      expect(retained.grant).toEqual(h.predecessor);
      expect(retained.pendingRefresh).toEqual(h.seeded);
      // Explicit repeat still uses the ORIGINAL identity: same body and
      // key, never a rekey; the conflict never proves settlement, so the
      // evidence stays instead of clearing.
      const second = await captureRejection(
        h.track(h.state.recoverRefresh(h.state.binding, freshSignal())),
      );
      expect(isTransportError(second)).toBe(true);
      expect(second.code).toBe("idempotency_key_reused");
      expect(h.requests.length).toBe(2);
      expect(await readVaultRecord(h.profile)).toEqual(retained);
      for (const request of h.requests) {
        expect(Buffer.from(request.body).toString("base64")).toBe(h.seeded.bodyBase64);
        expect(request.headers["idempotency-key"]).toBe(h.seeded.authKey);
      }
    });
  });

  it("different-account replay rejects invalid_grant and retains evidence", async () => {
    const respond = (record, res) => {
      void record;
      jsonOk(
        res,
        s3ServiceBody({
          account: { id: "ffffffff-ffff-4fff-8fff-ffffffffffff", displayName: null },
        }),
      );
    };
    await withReplayCase({ respond }, async (h) => {
      const failed = await captureRejection(
        h.track(h.state.recoverRefresh(h.state.binding, freshSignal())),
      );
      expect(isSessionError(failed)).toBe(true);
      expect(failed.code).toBe("invalid_grant");
      expect(h.requests.length).toBe(1);
      const retained = await readVaultRecord(h.profile);
      expect(retained.pendingRefresh).toEqual(h.seeded);
      expect(retained.grant).toEqual(h.predecessor);
    });
  });

  it("legacy nonzero submillisecond replay rejects invalid_grant and retains evidence", async () => {
    const respond = (record, res) => {
      void record;
      jsonOk(res, s3ServiceBody({ accessExpiresAt: "2026-09-27T12:30:00.123456789Z" }));
    };
    await withReplayCase({ respond }, async (h) => {
      // Receiver clock predates the legacy instant so the rejection pins
      // precision validation, never expiry.
      const failed = await captureRejection(
        h.track(h.state.recoverRefresh(h.state.binding, freshSignal())),
      );
      expect(isSessionError(failed)).toBe(true);
      expect(failed.code).toBe("invalid_grant");
      expect(h.requests.length).toBe(1);
      const retained = await readVaultRecord(h.profile);
      expect(retained.pendingRefresh).toEqual(h.seeded);
      expect(retained.grant).toEqual(h.predecessor);
      // The stored predecessor spelling itself stays exact and lossless.
      expect(s3Utf8Text(await h.profile.readVaultBytes())).toContain(h.predecessor.accessExpiresAt);
    });
  });

  it("invalid-JSON replay reports internal_error and retains evidence", async () => {
    const respond = (record, res) => {
      void record;
      res.writeHead(200, { "content-type": "application/json" });
      res.end("not-json{");
    };
    await withReplayCase({ respond }, async (h) => {
      const failed = await captureRejection(
        h.track(h.state.recoverRefresh(h.state.binding, freshSignal())),
      );
      expect(isTransportError(failed)).toBe(true);
      expect(failed.code).toBe("internal_error");
      expect(h.requests.length).toBe(1);
      expect(await readVaultRecord(h.profile)).toEqual({
        version: 2,
        binding: { ...h.installed },
        grant: h.predecessor,
        pendingRefresh: h.seeded,
      });
    });
  });
});
