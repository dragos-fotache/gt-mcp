// T06-S4 QA fault 02 — concurrent 401s share one rotation (including a
// delayed older-401 staged past durable installation), follower abort stays
// local without dispatching, leader cancellation and held-commit/invalidate
// suppress late delivery while retaining durable evidence, and
// representative unresolved auth maps to reauthentication_required
// (REPAIRED r2, HOLD: authored against the settled S4 work order plus the
// common interface adjudication, never executed before the coordinator's
// named frozen relay).
//
// Spec basis: work-order steps 5-7 (newer usable grant reused without
// redundant rotation; shared cycle joined; repeated401 and unresolved auth
// keep exact retained pending evidence) and "Concurrency, cancellation and
// durability" (ONE serialized auth controller; first valid caller starting
// an auth cycle is its cancellation leader; follower abort rejects that
// follower only; leader abort cancels owned auth network and propagates
// interruption to live followers with no replacement election; begun owned
// commits await safely with suppressed late success and no rollback;
// invalidate synchronous/idempotent/permanent) with adjudication
// clarifications (a caller arriving during active auth joins even before
// pending acknowledgement; owned vault transitions are not external drift;
// 401 revision is the actually selected bearer; every cycle needs terminal
// usable access+refresh with post-clock checks; interruption may surface as
// SessionError OR T05 TransportError operation_interrupted at the observing
// boundary). Cohorts are staged before any 401 is released; leadership is
// tied to explicit release order plus observed cycle effects, never bare
// invocation order or server counts alone. A few meaningful boundary cases,
// not a race cross-product.
//
// Boundaries: accepted T04 diagnostic facility + unchanged T05 loopback TLS
// fixtures only (success bodies reuse accepted T05 unit wire builders for
// the exact fixed-route schemas); synthetic data; no personal provider.
// Bound owners are established through the accepted S1 entry
// (install/close/reopen) before seeds are committed by the tests, never by
// production. The held-commit case reuses the accepted QA public-owner
// adapter pattern, but starts and tracks the REAL owner commit immediately
// and holds ONLY its acknowledgement: while held, the test reads the real
// owner's vault to prove the successor already installed. Every launched
// facade promise is registered immediately with rejection handling via
// ctx.launch; staged unanswered responses are registered and destroyed on
// teardown; ALL owned waits are cancellable with cleared timers; deferred
// cleanups (e.g. commit-gate release) run on all paths; body, responder and
// teardown failures fold honestly. Fixture roots are owned by the
// diagnostic facility; no HOME/TMPDIR overrides.

/* global AbortController, clearTimeout, setTimeout */

import { describe, expect, it } from "vitest";
import {
  isSessionError,
  openAuthenticatedSessionState,
  openSessionState,
} from "../../../dist/auth/index.js";
import { isTransportError } from "../../../dist/http/index.js";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import { closeServer, readFixtureBytes, startLoopbackHttps } from "../t05/helpers.mjs";
import { routineListWire, routineWire } from "../../unit/t05/helpers.mjs";
import {
  captureRejection,
  freshSignal,
  grantBodyBytes,
  teardownAll,
} from "../../unit/t06/helpers.mjs";
import {
  S4_ACCOUNT,
  S4_PROFILE,
  S4_ROTATED_BEARER,
  S4_ROUTINE,
  s4Clock,
  s4ServiceBody,
  s4Utf8Text,
  s4VaultGrant,
  s4Version2Bytes,
} from "../../unit/t06/s4-helpers.mjs";

const GATE_RELEASED = "s4-gate-released";

function json(res, status, obj) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(Buffer.from(JSON.stringify(obj), "utf8"));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Cancellation may surface as SessionError OR T05 TransportError with
// operation_interrupted at the observing boundary (adjudication entry
// classes). Accept both module-created brands; where the TransportError
// brand surfaces, its safe metadata must be preserved, not stripped.
function expectInterrupted(error) {
  const branded =
    (isSessionError(error) || isTransportError(error)) && error.code === "operation_interrupted";
  expect(branded).toBe(true);
  if (isTransportError(error)) {
    expect(typeof error.dispatched).toBe("boolean");
    expect(typeof error.outcomeUnknown).toBe("boolean");
  }
}

// Trusted profile-capability adapter reusing the accepted QA public-owner
// pattern (cf. makeBindGateOwner): delegates every call to the actual
// isolated T04 owner. Differences required by the held-acknowledgement
// boundary: commit STARTS the real owner commit immediately and tracks its
// independent settlement; after hold(), only the facade-visible
// acknowledgement waits behind release(). Tests register release() via
// gates.defer so failure paths can never strand the acknowledgement.
function makeCommitGateOwner(owner) {
  let setReleased;
  const released = new Promise((resolve) => {
    setReleased = resolve;
  });
  const pendingCommits = new Set();
  let held = false;
  let entered = false;
  const adapter = {
    get binding() {
      return owner.binding;
    },
    readVaultBytes: (...args) => owner.readVaultBytes(...args),
    readOperationStoreBytes: (...args) => owner.readOperationStoreBytes(...args),
    commit: (...args) => {
      const real = owner.commit(...args);
      const tracked = real.then(
        (value) => {
          pendingCommits.delete(tracked);
          return value;
        },
        (error) => {
          pendingCommits.delete(tracked);
          throw error;
        },
      );
      pendingCommits.add(tracked);
      tracked.catch(() => {});
      if (held && !entered) {
        entered = true;
        return released.then(() => real);
      }
      return real;
    },
    bindAccount: (...args) => owner.bindAccount(...args),
    advanceSessionGeneration: (...args) => owner.advanceSessionGeneration(...args),
    keyedIntentDigest: (...args) => owner.keyedIntentDigest(...args),
    close: (...args) => owner.close(...args),
  };
  return {
    adapter,
    hold: () => {
      held = true;
    },
    hasEntered: () => entered,
    release: () => setReleased(),
    awaitedCommits: () => Promise.allSettled([...pendingCommits]),
  };
}

// Shared harness: owned loopback server, S1-installed bound owner, seeded
// v2 state, open S4 facade (optionally on a caller-wrapped owner, e.g. the
// commit-gate adapter). ctx.launch registers every facade promise
// immediately with rejection handling and returns the original for
// assertions; staged unanswered responses register via gates.stage and are
// destroyed on teardown release; gates.waitFor is cancellable with cleared
// timers; gates.defer runs on all paths. Teardown releases gates, runs
// deferred cleanups, destroys owned networking, awaits ALL owned
// calls/commits/responders, then closes — folding body, responder and
// teardown failures instead of dropping any.
async function withS4Concurrent(options, fn) {
  const { grant, pendingRefresh, responders } = options;
  const certPem = readFixtureBytes("test-only-loopback-cert.pem");
  const keyPem = readFixtureBytes("test-only-loopback-key.pem");
  const requests = [];
  const counts = { refresh: 0, resource: 0, resource401: 0, resourceSuccess: 0 };
  const inFlight = new Set();
  const owned = new Set();
  const activeWaits = new Set();
  const staged = new Set();
  const deferred = [];
  let releaseGates = null;
  const gatesReleased = new Promise((resolve) => {
    releaseGates = resolve;
  });
  const cancellableWait = (predicate, timeoutMs = 5000) =>
    new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const entry = { timer: null };
      entry.cancel = () => {
        if (entry.timer !== null) {
          clearTimeout(entry.timer);
          entry.timer = null;
        }
        activeWaits.delete(entry);
        reject(new Error(GATE_RELEASED));
      };
      activeWaits.add(entry);
      const poll = () => {
        let ok;
        try {
          ok = predicate();
        } catch (error) {
          activeWaits.delete(entry);
          reject(error);
          return;
        }
        if (ok) {
          activeWaits.delete(entry);
          resolve();
          return;
        }
        if (Date.now() >= deadline) {
          activeWaits.delete(entry);
          reject(new Error("synthetic-qa-t06-s4: owned wait deadline exceeded"));
          return;
        }
        entry.timer = setTimeout(poll, 10);
      };
      poll();
    });
  void gatesReleased.then(() => {
    for (const entry of [...activeWaits]) entry.cancel();
  });
  const gates = {
    waitFor: (predicate, timeoutMs) => cancellableWait(predicate, timeoutMs),
    stage: (entry) => {
      staged.add(entry);
      return entry;
    },
    unstage: (entry) => staged.delete(entry),
    defer: (cleanup) => deferred.push(cleanup),
    releaseAll: () => releaseGates(),
  };
  const launch = (promise) => {
    const tracked = promise.then(
      (value) => {
        owned.delete(tracked);
        return value;
      },
      (error) => {
        owned.delete(tracked);
        throw error;
      },
    );
    owned.add(tracked);
    tracked.catch(() => {});
    return promise;
  };
  let handlerError = null;
  let server = null;
  let origin;
  let facility = null;
  let profile = null;
  let state = null;
  let bodyError = null;
  const ctx = { requests, counts, gates, launch, certPem };
  const track = (task) => {
    const settled = task
      .catch((error) => {
        if (error !== null && typeof error === "object" && error.message === GATE_RELEASED) return;
        throw error;
      })
      .finally(() => {
        inFlight.delete(tracked);
      });
    const tracked = settled;
    inFlight.add(tracked);
    tracked.catch((error) => {
      if (handlerError === null) handlerError = error;
    });
    return tracked;
  };
  try {
    const started = await startLoopbackHttps(
      { keyPem, certPem, label: "synthetic-qa-t06-s4 concurrency pair" },
      (req, res, record) => {
        track(
          (async () => {
            requests.push(record);
            if (req.method === "POST" && req.url === "/v1/auth/refresh") {
              counts.refresh += 1;
              await responders.onRefresh(req, res, record, counts, gates);
            } else {
              counts.resource += 1;
              await responders.onResource(req, res, record, counts, gates);
            }
          })(),
        );
      },
    );
    server = started.server;
    origin = started.origin;
    ctx.origin = origin;
    facility = await createStorageTestFacility();
    profile = await facility.provision(origin);
    const s1 = await openSessionState({ profile, clock: s4Clock() });
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
    await profile.commit({
      vaultBytes: s4Version2Bytes({ binding: profile.binding, grant, pendingRefresh }),
    });
    const facadeProfile =
      typeof options.wrapProfile === "function" ? options.wrapProfile(profile) : profile;
    state = await openAuthenticatedSessionState({
      profile: facadeProfile,
      transportConfig: { origin, testCaPem: certPem },
      clock: s4Clock(),
    });
    ctx.state = state;
    ctx.profile = profile;
    ctx.binding = profile.binding;
    await fn(ctx);
    await gates.waitFor(() => inFlight.size === 0);
    if (handlerError !== null) throw handlerError;
  } catch (error) {
    bodyError = error;
  }
  gates.releaseAll();
  for (const stagedEntry of [...staged]) {
    try {
      stagedEntry.res.destroy();
    } catch {
      // Best effort: teardown is already closing the server, which
      // destroys every owned connection; a failed destroy here only
      // means that connection is already gone.
    }
    staged.delete(stagedEntry);
  }
  for (const cleanup of deferred) {
    try {
      cleanup();
    } catch (error) {
      if (handlerError === null) handlerError = error;
      else
        handlerError = new AggregateError(
          [handlerError, error],
          "synthetic-qa-t06-s4: multiple owned failures",
        );
    }
  }
  let serverError = null;
  try {
    if (server !== null) await closeServer(server);
  } catch (error) {
    serverError = error;
  }
  await Promise.allSettled([...inFlight, ...owned]);
  let teardownError = null;
  try {
    await teardownAll([
      ...(state === null ? [] : [() => state.invalidate()]),
      ...(profile === null ? [] : [() => profile.close()]),
      ...(facility === null ? [] : [() => facility.cleanup()]),
    ]);
  } catch (error) {
    teardownError = error;
  }
  const failures = [bodyError, handlerError, serverError, teardownError].filter(
    (error) => error !== null,
  );
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1)
    throw new AggregateError(failures, "synthetic-qa-t06-s4: multiple owned failures");
}

const LIVE_GRANT = () => s4VaultGrant();
const OLD_BEARER = () => s4VaultGrant().accessToken;

function routineSuccess(res) {
  json(res, 200, routineListWire([routineWire({ id: S4_ROUTINE, isDraft: false })]));
}

function oldBearer401ThenSuccess(oldBearer) {
  return (req, res, record, counts) => {
    if ((record.headers["authorization"] ?? null) === `Bearer ${oldBearer}`) {
      counts.resource401 += 1;
      json(res, 401, { errorCode: "reauthentication_required" });
    } else {
      counts.resourceSuccess += 1;
      routineSuccess(res);
    }
  };
}

// Stage an old-bearer leg without answering: the caller stays dispatched
// while the test drives explicit release order. Registered so teardown
// destroys any entry the body never answers.
function stageOldLeg(gates, held, req, res, record) {
  held.push(gates.stage({ req, res, record }));
}

function releaseStaged401(gates, held, index, counts) {
  const entry = held[index];
  gates.unstage(entry);
  counts.resource401 += 1;
  json(entry.res, 401, { errorCode: "reauthentication_required" });
}

describe("t06-s4 shared refresh, cancellation and durable evidence", () => {
  it("shares one rotation across a staged three-leg cohort", async () => {
    const held = [];
    await withS4Concurrent(
      {
        grant: LIVE_GRANT(),
        pendingRefresh: null,
        responders: {
          onRefresh: (req, res) => json(res, 200, s4ServiceBody()),
          onResource: (req, res, record, counts, gates) => {
            if ((record.headers["authorization"] ?? null) === `Bearer ${OLD_BEARER()}`) {
              stageOldLeg(gates, held, req, res, record);
              return;
            }
            counts.resourceSuccess += 1;
            routineSuccess(res);
          },
        },
      },
      async ({ state, binding, counts, gates, requests, launch }) => {
        // Stage the full cohort BEFORE releasing any 401: with no cycle in
        // flight each arrival legitimately dispatches its own old-bearer
        // leg, so no conforming join-before-dispatch scheduling is
        // penalized and no count assumes unstaged arrivals.
        const a = launch(state.listRoutines(binding, {}, freshSignal()));
        await gates.waitFor(() => held.length >= 1);
        const b = launch(state.listRoutines(binding, {}, freshSignal()));
        await gates.waitFor(() => held.length >= 2);
        const c = launch(state.listRoutines(binding, {}, freshSignal()));
        await gates.waitFor(() => held.length >= 3);
        for (let index = 0; index < held.length; index += 1) {
          releaseStaged401(gates, held, index, counts);
        }
        const outcomes = await Promise.all([a, b, c]);
        for (const result of outcomes) {
          expect(result.status).toBe(200);
        }
        expect(counts.resource401).toBe(3);
        expect(counts.refresh).toBe(1);
        expect(counts.resource).toBe(6);
        const retries = requests.filter(
          (record) =>
            record.url === "/v1/routines?limit=20" &&
            (record.headers["authorization"] ?? null) === `Bearer ${S4_ROTATED_BEARER}`,
        );
        expect(retries.length).toBe(3);
      },
    );
  });

  it("reuses the installed successor for a delayed older-401 with no second rotation", async () => {
    const held = [];
    await withS4Concurrent(
      {
        grant: LIVE_GRANT(),
        pendingRefresh: null,
        responders: {
          onRefresh: (req, res) => json(res, 200, s4ServiceBody()),
          onResource: (req, res, record, counts, gates) => {
            if ((record.headers["authorization"] ?? null) === `Bearer ${OLD_BEARER()}`) {
              stageOldLeg(gates, held, req, res, record);
              return;
            }
            counts.resourceSuccess += 1;
            routineSuccess(res);
          },
        },
      },
      async ({ state, binding, profile, counts, gates, requests, launch }) => {
        const first = launch(state.listRoutines(binding, {}, freshSignal()));
        await gates.waitFor(() => held.length >= 1);
        const second = launch(state.listRoutines(binding, {}, freshSignal()));
        await gates.waitFor(() => held.length >= 2);
        // Explicit leader: the first arrival's 401 is released first, so it
        // alone starts the auth cycle; the other leg stays staged.
        releaseStaged401(gates, held, 0, counts);
        await gates.waitFor(() => counts.refresh >= 1);
        const leaderResult = await first;
        expect(leaderResult.status).toBe(200);
        const stored = JSON.parse(s4Utf8Text(await profile.readVaultBytes()));
        expect(stored.grant.accessToken).toBe(S4_ROTATED_BEARER);
        expect(stored.pendingRefresh).toBe(null);
        // Delayed older-401, released only after the successor is durably
        // installed and the leader's retry completed.
        releaseStaged401(gates, held, 1, counts);
        const delayedResult = await second;
        expect(delayedResult.status).toBe(200);
        expect(counts.refresh).toBe(1);
        const retries = requests.filter(
          (record) =>
            record.url === "/v1/routines?limit=20" &&
            (record.headers["authorization"] ?? null) === `Bearer ${S4_ROTATED_BEARER}`,
        );
        expect(retries.length).toBe(2);
      },
    );
  });

  it("joins a follower during held auth without a second dispatch and keeps abort local", async () => {
    let releaseRefresh = false;
    await withS4Concurrent(
      {
        grant: LIVE_GRANT(),
        pendingRefresh: null,
        responders: {
          onRefresh: async (req, res, record, counts, gates) => {
            await gates.waitFor(() => releaseRefresh);
            json(res, 200, s4ServiceBody());
          },
          onResource: oldBearer401ThenSuccess(OLD_BEARER()),
        },
      },
      async ({ state, binding, counts, gates, launch }) => {
        const leader = launch(state.listRoutines(binding, {}, freshSignal()));
        await gates.waitFor(() => counts.refresh >= 1);
        const followerCtl = new AbortController();
        const followerCall = launch(state.listRoutines(binding, {}, followerCtl.signal));
        await sleep(250);
        expect(counts.resource).toBe(1);
        followerCtl.abort();
        expectInterrupted(await captureRejection(followerCall));
        releaseRefresh = true;
        const leaderResult = await leader;
        expect(leaderResult.status).toBe(200);
        expect(counts.refresh).toBe(1);
        expect(counts.resource).toBe(2);
      },
    );
  });

  it("propagates leader cancellation to a sequenced joined follower with no new leader", async () => {
    const held = [];
    let releaseRefresh = false;
    await withS4Concurrent(
      {
        grant: LIVE_GRANT(),
        pendingRefresh: null,
        responders: {
          onRefresh: async (req, res, record, counts, gates) => {
            await gates.waitFor(() => releaseRefresh);
            json(res, 200, s4ServiceBody());
          },
          onResource: (req, res, record, counts, gates) => {
            if ((record.headers["authorization"] ?? null) === `Bearer ${OLD_BEARER()}`) {
              stageOldLeg(gates, held, req, res, record);
              return;
            }
            routineSuccess(res);
          },
        },
      },
      async ({ state, binding, profile, counts, gates, launch }) => {
        // Sequence the intended leader's arrival BEFORE the other call
        // exists: its released 401 provably starts the cycle (refresh
        // observed while no other leg exists), so leadership is tied to an
        // observed boundary, not invocation order.
        const leaderCtl = new AbortController();
        const leaderCall = launch(state.listRoutines(binding, {}, leaderCtl.signal));
        await gates.waitFor(() => held.length >= 1);
        releaseStaged401(gates, held, 0, counts);
        await gates.waitFor(() => counts.refresh >= 1);
        // Follower arrives during held auth and joins: it must not dispatch
        // a second old-bearer leg (bounded check before cancellation).
        const followerCall = launch(state.listRoutines(binding, {}, freshSignal()));
        await sleep(250);
        expect(counts.resource).toBe(1);
        leaderCtl.abort();
        releaseRefresh = true;
        expectInterrupted(await captureRejection(leaderCall));
        expectInterrupted(await captureRejection(followerCall));
        expect(counts.refresh).toBe(1);
        expect(counts.resource).toBe(1);
        await sleep(250);
        expect(counts.refresh).toBe(1);
        const stored = JSON.parse(s4Utf8Text(await profile.readVaultBytes()));
        expect(stored.pendingRefresh).not.toBe(null);
        expect(stored.pendingRefresh.predecessor).toEqual(LIVE_GRANT());
      },
    );
  });

  it("holds a real owned success commit unacknowledged, then settles interruption without rollback", async () => {
    let commitGate = null;
    let releaseRefreshResponse = false;
    await withS4Concurrent(
      {
        grant: LIVE_GRANT(),
        pendingRefresh: null,
        wrapProfile: (profile) => {
          commitGate = makeCommitGateOwner(profile);
          return commitGate.adapter;
        },
        responders: {
          onRefresh: async (req, res, record, counts, gates) => {
            await gates.waitFor(() => releaseRefreshResponse);
            json(res, 200, s4ServiceBody());
          },
          onResource: oldBearer401ThenSuccess(OLD_BEARER()),
        },
      },
      async ({ state, binding, profile, counts, gates, launch }) => {
        gates.defer(() => commitGate.release());
        const leaderCtl = new AbortController();
        const leaderCall = launch(state.listRoutines(binding, {}, leaderCtl.signal));
        await gates.waitFor(() => counts.refresh >= 1);
        // The prepare commit already completed (refresh dispatched proves
        // durability was awaited); arm the gate so the NEXT commit — the
        // joint success installation — is the one held.
        commitGate.hold();
        const followerCall = launch(state.listRoutines(binding, {}, freshSignal()));
        releaseRefreshResponse = true;
        await gates.waitFor(() => commitGate.hasEntered());
        // Owned success commit begun with its acknowledgement held: the
        // REAL commit already runs independently. Prove the durable
        // successor installed while the facade still waits, with no retry
        // dispatched and neither joined caller settled. Bounded through
        // the local cancellable wait so the deadline timer is cleared on
        // settle, failure, or teardown release — the owned commit itself
        // is never terminated by this diagnostic bound.
        let commitSettled = false;
        commitGate.awaitedCommits().then(
          () => {
            commitSettled = true;
          },
          () => {
            commitSettled = true;
          },
        );
        await gates.waitFor(() => commitSettled, 5000);
        const whileHeld = JSON.parse(s4Utf8Text(await profile.readVaultBytes()));
        expect(whileHeld.grant.accessToken).toBe(S4_ROTATED_BEARER);
        expect(whileHeld.pendingRefresh).toBe(null);
        let leaderSettled = false;
        let followerSettled = false;
        leaderCall.then(
          () => {
            leaderSettled = true;
          },
          () => {
            leaderSettled = true;
          },
        );
        followerCall.then(
          () => {
            followerSettled = true;
          },
          () => {
            followerSettled = true;
          },
        );
        await sleep(250);
        expect(leaderSettled).toBe(false);
        expect(followerSettled).toBe(false);
        expect(counts.resource).toBe(1);
        // Cancel at the commit boundary, then release the acknowledgement:
        // safe interruption, installed state kept, no rollback, no retry.
        leaderCtl.abort();
        commitGate.release();
        expectInterrupted(await captureRejection(leaderCall));
        expectInterrupted(await captureRejection(followerCall));
        expect(counts.refresh).toBe(1);
        expect(counts.resource).toBe(1);
        const stored = JSON.parse(s4Utf8Text(await profile.readVaultBytes()));
        expect(stored.grant.accessToken).toBe(S4_ROTATED_BEARER);
        expect(stored.pendingRefresh).toBe(null);
      },
    );
  });

  it("suppresses late success after invalidate with no rollback of durable evidence", async () => {
    let releaseRefresh = false;
    await withS4Concurrent(
      {
        grant: LIVE_GRANT(),
        pendingRefresh: null,
        responders: {
          onRefresh: async (req, res, record, counts, gates) => {
            await gates.waitFor(() => releaseRefresh);
            json(res, 200, s4ServiceBody());
          },
          onResource: oldBearer401ThenSuccess(OLD_BEARER()),
        },
      },
      async ({ state, binding, profile, counts, gates, launch }) => {
        const pending = launch(state.listRoutines(binding, {}, freshSignal()));
        await gates.waitFor(() => counts.refresh >= 1);
        state.invalidate();
        releaseRefresh = true;
        expectInterrupted(await captureRejection(pending));
        expect(counts.resource).toBe(1);
        const stored = JSON.parse(s4Utf8Text(await profile.readVaultBytes()));
        expect(stored.pendingRefresh).not.toBe(null);
      },
    );
  });

  it("maps unresolved rate-limited auth to reauthentication_required and retains evidence", async () => {
    await withS4Concurrent(
      {
        grant: LIVE_GRANT(),
        pendingRefresh: null,
        responders: {
          onRefresh: (req, res) => json(res, 429, { errorCode: "rate_limited" }),
          onResource: oldBearer401ThenSuccess(OLD_BEARER()),
        },
      },
      async ({ state, binding, profile, counts, launch }) => {
        const error = await captureRejection(
          launch(state.listRoutines(binding, {}, freshSignal())),
        );
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("reauthentication_required");
        expect(counts.refresh).toBe(1);
        expect(counts.resource).toBe(1);
        const stored = JSON.parse(s4Utf8Text(await profile.readVaultBytes()));
        expect(stored.pendingRefresh).not.toBe(null);
        expect(stored.grant).toEqual(LIVE_GRANT());
      },
    );
  });

  it("maps legacy-precision refresh to reauthentication_required without deleting evidence", async () => {
    await withS4Concurrent(
      {
        grant: LIVE_GRANT(),
        pendingRefresh: null,
        responders: {
          onRefresh: (req, res) =>
            json(res, 200, s4ServiceBody({ accessExpiresAt: "2026-09-27T12:15:00.123456789Z" })),
          onResource: oldBearer401ThenSuccess(OLD_BEARER()),
        },
      },
      async ({ state, binding, profile, counts, launch }) => {
        const error = await captureRejection(
          launch(state.listRoutines(binding, {}, freshSignal())),
        );
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("reauthentication_required");
        expect(counts.refresh).toBe(1);
        expect(counts.resource).toBe(1);
        const stored = JSON.parse(s4Utf8Text(await profile.readVaultBytes()));
        expect(stored.pendingRefresh).not.toBe(null);
      },
    );
  });

  it("rejects a foreign caller before any auth change or dispatch", async () => {
    await withS4Concurrent(
      {
        grant: LIVE_GRANT(),
        pendingRefresh: null,
        responders: {
          onRefresh: (req, res) => json(res, 200, s4ServiceBody()),
          onResource: (req, res) => routineSuccess(res),
        },
      },
      async ({ state, binding, counts, launch }) => {
        const foreign = { ...binding, profileGenerationId: S4_PROFILE };
        expect(foreign.profileGenerationId).not.toBe(binding.profileGenerationId);
        const error = await captureRejection(
          launch(state.listRoutines(foreign, {}, freshSignal())),
        );
        expect(isSessionError(error) || isTransportError(error)).toBe(true);
        expect(error.code).toBe("operation_interrupted");
        expect(counts.refresh).toBe(0);
        expect(counts.resource).toBe(0);
      },
    );
  });
});
