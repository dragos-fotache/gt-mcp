// T06-S5 QA fault 01 — live-grant resource path, offline fence-first
// sign-out with retained-credential cleanup and window accounting,
// same-account replacement of uncertain evidence across restart,
// retained-evidence fencing, lifecycle races with begun-commit settlement,
// owned-install-commit integration, and definite/ambiguous failures
// (REPAIRED r4: reopen-before-read discipline with current-facade tracking,
// real delegated advance-ack ordering, tightened no-renewal window oracle,
// withS5-owned begun-commit lifecycle, commit-hold replacement
// integration; authored against the settled S5 work order plus the common
// lifecycle adjudication, never executed before the coordinator's named
// frozen relay).
//
// Spec basis: "Lifecycle admission, durability and races" (detached capture
// equality; single admission with concurrent/repeated =>
// operation_interrupted; fence-before-await; begun-commit settlement with
// no rollback; reread/validate against last acknowledged owned state;
// advanceSessionGeneration ONCE with old generation+1; opaque operation
// bytes preserved), "signOut" (no caller AbortSignal; fence/settle/advance
// with grant/pending/superseded cleared; bounded best-effort logout per
// distinct token under ONE shared monotonic totalDeadlineMs window with no
// per-token renewal and no new dispatch after window expiry — the window
// covers the final wire handoff, not merely iteration start;
// offline/failed cleanup cannot undo acknowledged local clearing;
// invalidate during signOut stops network only) and "replaceGrant"
// (foreground same-origin service bytes; same-account or
// operation_interrupted with no fence/IO; expired refresh =>
// reauthentication_required with no fence/IO; expired access installs;
// superseded append of latest settled grant plus exact pending under the
// old binding; replacement waits for already-begun owned install commits
// and retains the latest acknowledged evidence; retained entries
// permanently fenced from bearer/refresh/replay/selection/authority;
// already-aborted input rejects before admission with no new fence;
// post-admission cancellation before advance prevents it and leaves the
// facade fenced; abort/invalidate after advance begins suppresses success
// with operation_interrupted while the committed target stays explicitly
// reopenable). Resource legs keep ALL S4 semantics including
// final-delivery suppression with dispatched/outcomeUnknown metadata. A
// generation transition invalidates every old-capture T04 handle except
// close: post-action vault/operation reads always follow explicit
// close/open of the returned binding with current-facade tracking, never a
// stale handle.
//
// Boundaries: accepted T04 diagnostic facility + unchanged T05 loopback TLS
// fixtures and T05 unit wire builders only; synthetic data; no personal
// provider. Bound owners are established through the accepted S1 entry
// (install/close/reopen) before seeds are committed by the tests, never by
// production. Every launched facade promise is registered immediately with
// rejection handling via ctx.launch and settled on all paths; every
// responder execution is tracked; ALL owned waits are cancellable and
// released on teardown; every derived promise is awaited or provably
// rejection-free; cleanup failures fold honestly alongside body and
// responder failures. Fixture roots are owned by the diagnostic facility; no
// HOME/TMPDIR overrides, no external DNS/network.
//
// SYNTHETIC PROVENANCE: every UUID/token/timestamp below is fabricated for
// isolated QA use only (see ../../unit/t06/s5-helpers.mjs). No real
// credentials, tokens, account IDs, private paths, or raw backend bodies
// are included.

/* global clearTimeout, setTimeout */

import { describe, expect, it } from "vitest";
import {
  isSessionError,
  openLifecycleSessionState,
  openSessionState,
} from "../../../dist/auth/index.js";
import { isTransportError } from "../../../dist/http/index.js";
import { isStorageError } from "../../../dist/storage/index.js";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import { closeServer, readFixtureBytes, startLoopbackHttps } from "../t05/helpers.mjs";
import { routineWire, workoutListWire, workoutSummaryWire } from "../../unit/t05/helpers.mjs";
import {
  abortedSignal,
  captureRejection,
  freshSignal,
  grantBodyBytes,
  teardownAll,
} from "../../unit/t06/helpers.mjs";
import {
  S5_ACCESS_EXPIRY,
  S5_ACCOUNT,
  S5_ACCOUNT_OTHER,
  S5_BEARER,
  S5_REFRESH,
  S5_REFRESH_EXPIRY,
  S5_ROTATED_BEARER,
  S5_ROTATED_REFRESH,
  S5_ROUTINE,
  S5_RESOURCE_KEY,
  S5_SUPERSEDED_REFRESH,
  makeAdvanceGateOwner,
  makeAdvanceObserverOwner,
  makeInstallGateOwner,
  s5Clock,
  s5DraftBodyBytes,
  s5ServiceBytes,
  s5Utf8,
  s5Utf8Text,
  s5ValidPending,
  s5VaultGrant,
  s5Version2Bytes,
  s5Version3Bytes,
  s5Version3Entry,
} from "../../unit/t06/s5-helpers.mjs";

const GATE_RELEASED = "s5-gate-released";
const DEFAULT_OPS = s5Utf8('{"s5":"opaque-operation-evidence"}');

function isGateRelease(error) {
  return error !== null && typeof error === "object" && error.message === GATE_RELEASED;
}

function noContent(res) {
  res.writeHead(204);
  res.end();
}

function json(res, status, obj) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(Buffer.from(JSON.stringify(obj), "utf8"));
}

function errorBrandOk(error, code) {
  return (isSessionError(error) || isTransportError(error)) && error.code === code;
}

function liveGrant() {
  return s5VaultGrant();
}

// Open one S5 case on an owned loopback origin: server first, then bound
// owner via the accepted S1 entry, then the test-committed vault seed.
// ctx.launch registers every facade promise immediately (original outcome
// preserved for assertions) with rejection handling; gates.waitFor is a
// cancellable owned wait (cleared timers, no lingering polling);
// gates.defer registers failure-path cleanups; ctx.ownState defers facade
// invalidation; ctx.closeServer destroys owned loopback networking for
// offline cases. Teardown releases ALL gates, runs deferred cleanups,
// destroys owned networking, awaits ALL owned calls/responders (folding
// unexpected failure-path rejections, ignoring only explicit owned
// teardown cancellation), then closes — folding body, responder, settle
// and teardown failures honestly instead of dropping any.
async function withS5(options, fn) {
  const { seed, seedOps, transportBudgets, handleLogout, handleRefresh, handleResource } = options;
  const certPem = readFixtureBytes("test-only-loopback-cert.pem");
  const keyPem = readFixtureBytes("test-only-loopback-key.pem");
  const requests = [];
  const counts = { logout: 0, refresh: 0, resource: 0 };
  const inFlight = new Set();
  const owned = new Set();
  const activeWaits = new Set();
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
          reject(new Error("synthetic-qa-t06-s5: owned wait deadline exceeded"));
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
  const ctx = {
    requests,
    counts,
    gates,
    launch,
    certPem,
    state: null,
    profile: null,
    facility: null,
    binding: null,
    origin: null,
    opsBefore: null,
  };
  ctx.ownState = (state) => {
    gates.defer(() => state.invalidate());
    return state;
  };
  ctx.closeServer = async () => {
    if (server !== null) {
      await closeServer(server);
      server = null;
    }
  };
  const track = (task) => {
    const settled = task
      .catch((error) => {
        if (isGateRelease(error)) return;
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
  let bodyError = null;
  try {
    const started = await startLoopbackHttps(
      { keyPem, certPem, label: "synthetic-qa-t06-s5 lifecycle pair" },
      (req, res, record) => {
        track(
          (async () => {
            requests.push(record);
            if (req.method === "POST" && req.url === "/v1/auth/logout") {
              counts.logout += 1;
              if (typeof handleLogout === "function")
                await handleLogout(req, res, record, counts, gates);
              else noContent(res);
            } else if (req.method === "POST" && req.url === "/v1/auth/refresh") {
              counts.refresh += 1;
              if (typeof handleRefresh === "function")
                await handleRefresh(req, res, record, counts, gates);
              else json(res, 500, { errorCode: "internal_error" });
            } else {
              counts.resource += 1;
              if (typeof handleResource === "function")
                await handleResource(req, res, record, counts, gates);
              else if (req.method === "GET" && req.url.startsWith("/v1/workouts")) {
                json(res, 200, workoutListWire([workoutSummaryWire({ id: S5_ROUTINE })]));
              } else json(res, 404, { errorCode: "not_found" });
            }
          })(),
        );
      },
    );
    server = started.server;
    ctx.origin = started.origin;
    const origin = started.origin;
    const facility = await createStorageTestFacility();
    ctx.facility = facility;
    let profile = await facility.provision(origin);
    ctx.profile = profile;
    const installer = await openSessionState({ profile, clock: s5Clock() });
    let installed;
    try {
      installed = await installer.installInitialGrant(
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
      installer.invalidate();
    }
    await profile.close();
    profile = await facility.open(installed);
    ctx.profile = profile;
    ctx.binding = profile.binding;
    const seedBytes =
      typeof seed === "function"
        ? await seed({ profile, binding: profile.binding })
        : s5Version2Bytes({ binding: profile.binding, grant: liveGrant(), pendingRefresh: null });
    await profile.commit({
      vaultBytes: seedBytes,
      operationBytes: seedOps ?? DEFAULT_OPS,
    });
    ctx.opsBefore = await profile.readOperationStoreBytes();
    const openState = async (owner) =>
      ctx.ownState(
        await openLifecycleSessionState({
          profile: owner,
          transportConfig: {
            origin,
            testCaPem: certPem,
            ...(transportBudgets === undefined ? {} : { budgets: transportBudgets }),
          },
          clock: s5Clock(),
        }),
      );
    ctx.openState = openState;
    ctx.state = await openState(profile);
    await fn(ctx);
    await gates.waitFor(() => inFlight.size === 0);
    if (handlerError !== null) throw handlerError;
  } catch (error) {
    bodyError = error;
  }
  gates.releaseAll();
  for (const cleanup of deferred) {
    try {
      cleanup();
    } catch (error) {
      if (handlerError === null) handlerError = error;
      else
        handlerError = new AggregateError(
          [handlerError, error],
          "synthetic-qa-t06-s5: multiple owned failures",
        );
    }
  }
  let serverError = null;
  try {
    if (server !== null) await closeServer(server);
  } catch (error) {
    serverError = error;
  }
  const outcomes = await Promise.allSettled([...inFlight, ...owned]);
  let settleError = null;
  if (bodyError !== null) {
    const stray = outcomes.filter(
      (outcome) => outcome.status === "rejected" && !isGateRelease(outcome.reason),
    );
    if (stray.length > 0)
      settleError = new AggregateError(
        stray.map((outcome) => outcome.reason),
        "synthetic-qa-t06-s5: unsettled owned work on failure path",
      );
  }
  let teardownError = null;
  try {
    await teardownAll([
      ...(ctx.profile === null ? [] : [() => ctx.profile.close()]),
      ...(ctx.facility === null ? [] : [() => ctx.facility.cleanup()]),
    ]);
  } catch (error) {
    teardownError = error;
  }
  const failures = [bodyError, handlerError, serverError, settleError, teardownError].filter(
    (error) => error !== null,
  );
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1)
    throw new AggregateError(failures, "synthetic-qa-t06-s5: multiple owned failures");
}

function logoutBodies(ctx) {
  return ctx.requests
    .filter((record) => record.url === "/v1/auth/logout")
    .map((record) => JSON.parse(record.body.toString("utf8")));
}

function refreshBodies(ctx) {
  return ctx.requests
    .filter((record) => record.url === "/v1/auth/refresh")
    .map((record) => JSON.parse(record.body.toString("utf8")));
}

async function readVaultRecord(profile) {
  return JSON.parse(s5Utf8Text(await profile.readVaultBytes()));
}

// Advance to the acknowledged binding under test ownership: invalidate the
// acting facade as required, close the stale owner (whose capture can no
// longer read after the generation transition), reopen the returned
// binding, open a fresh facade and track it as the current ctx.state for
// any later handoff. Deferred teardown invalidates every issued facade.
async function reopenOnBinding(ctx, next) {
  ctx.state.invalidate();
  await ctx.profile.close();
  const profile = await ctx.facility.open(next);
  ctx.profile = profile;
  ctx.binding = next;
  const state = await ctx.openState(profile);
  ctx.state = state;
  return { profile, binding: next, state };
}

describe("t06-s5 lifecycle races and durability", () => {
  it("serves a live-grant read and leaves opaque operations untouched", async () => {
    await withS5({}, async (ctx) => {
      const result = await ctx.launch(ctx.state.listWorkouts(ctx.binding, {}, freshSignal()));
      expect(result.status).toBe(200);
      expect(result.data.items.length).toBe(1);
      expect(result.data.items[0].id).toBe(S5_ROUTINE);
      expect(ctx.counts.resource).toBe(1);
      expect(ctx.counts.refresh).toBe(0);
      expect(ctx.counts.logout).toBe(0);
      expect(await ctx.profile.readOperationStoreBytes()).toEqual(ctx.opsBefore);
    });
  });

  it("sign-out clears before delayed logout completes", async () => {
    let logoutReleased = false;
    let firstReceiptAck = null;
    let advanceObserved = null;
    await withS5(
      {
        handleLogout: async (req, res, record, counts, gates) => {
          void req;
          void record;
          void counts;
          // Capture event-state AT first receipt: a conforming
          // implementation acknowledges the delegated durable advance
          // before any logout wire receipt. No timestamp comparison.
          if (firstReceiptAck === null)
            firstReceiptAck =
              advanceObserved !== null && advanceObserved.advanceAcknowledgedAt !== null;
          try {
            await gates.waitFor(() => logoutReleased);
          } catch (error) {
            if (!isGateRelease(error)) throw error;
            noContent(res);
            return;
          }
          noContent(res);
        },
      },
      async (ctx) => {
        ctx.state.invalidate();
        const { adapter, observed } = makeAdvanceObserverOwner(ctx.profile);
        advanceObserved = observed;
        const state = await ctx.openState(adapter);
        ctx.state = state;
        const pending = ctx.launch(state.signOut(ctx.binding));
        ctx.gates.defer(() => {
          logoutReleased = true;
        });
        let settled = false;
        const observe = pending.then(
          () => {
            settled = true;
          },
          () => {
            settled = true;
          },
        );
        await ctx.gates.waitFor(() => firstReceiptAck !== null);
        expect(firstReceiptAck).toBe(true);
        expect(logoutBodies(ctx)).toEqual([{ refreshToken: S5_REFRESH }]);
        expect(settled).toBe(false);
        logoutReleased = true;
        const next = await pending;
        await observe;
        expect(next.sessionGeneration).toBe(ctx.binding.sessionGeneration + 1);
        expect(next.origin).toBe(ctx.binding.origin);
        expect(next.accountUuid).toBe(ctx.binding.accountUuid);
        expect(next.profileGenerationId).toBe(ctx.binding.profileGenerationId);
        const stale = await captureRejection(state.listWorkouts(ctx.binding, {}, freshSignal()));
        expect(errorBrandOk(stale, "operation_interrupted")).toBe(true);
        const reopened = await reopenOnBinding(ctx, next);
        const record = await readVaultRecord(reopened.profile);
        expect(record.version).toBe(3);
        expect(record.grant).toBeNull();
        expect(record.pendingRefresh).toBeNull();
        expect(record.superseded).toEqual([]);
        expect(await reopened.profile.readOperationStoreBytes()).toEqual(ctx.opsBefore);
      },
    );
  });

  it("sign-out cleans each distinct retained credential exactly once", async () => {
    const retained = s5VaultGrant({
      accessToken: "synthetic-qa-t06-s5-access.00",
      refreshToken: S5_SUPERSEDED_REFRESH,
    });
    await withS5(
      {
        seed: ({ binding }) =>
          s5Version3Bytes({
            binding,
            grant: liveGrant(),
            pendingRefresh: null,
            superseded: [
              s5Version3Entry({
                binding: { ...binding, sessionGeneration: 0 },
                grant: retained,
              }),
            ],
          }),
      },
      async (ctx) => {
        const next = await ctx.launch(ctx.state.signOut(ctx.binding));
        expect(next.sessionGeneration).toBe(ctx.binding.sessionGeneration + 1);
        expect(ctx.counts.logout).toBe(2);
        expect(
          logoutBodies(ctx)
            .map((body) => body.refreshToken)
            .sort(),
        ).toEqual([S5_REFRESH, S5_SUPERSEDED_REFRESH].sort());
        const reopened = await reopenOnBinding(ctx, next);
        const record = await readVaultRecord(reopened.profile);
        expect(record.grant).toBeNull();
        expect(record.superseded).toEqual([]);
        expect(await reopened.profile.readOperationStoreBytes()).toEqual(ctx.opsBefore);
      },
    );
  });

  it("sign-out deduplicates identical retained wire bodies", async () => {
    await withS5(
      {
        seed: ({ binding }) =>
          s5Version3Bytes({
            binding,
            grant: liveGrant(),
            pendingRefresh: null,
            superseded: [
              s5Version3Entry({
                binding: { ...binding, sessionGeneration: 0 },
                grant: liveGrant(),
              }),
            ],
          }),
      },
      async (ctx) => {
        await ctx.launch(ctx.state.signOut(ctx.binding));
        expect(ctx.counts.logout).toBe(1);
        expect(logoutBodies(ctx)).toEqual([{ refreshToken: S5_REFRESH }]);
      },
    );
  });

  it("failed cleanup keeps acknowledged clearing without renewed dispatch", async () => {
    await withS5(
      {
        transportBudgets: { totalDeadlineMs: 200 },
        seed: ({ binding }) =>
          s5Version3Bytes({
            binding,
            grant: liveGrant(),
            pendingRefresh: null,
            superseded: [
              s5Version3Entry({
                binding: { ...binding, sessionGeneration: 0 },
                grant: s5VaultGrant({
                  accessToken: "synthetic-qa-t06-s5-access.00",
                  refreshToken: S5_SUPERSEDED_REFRESH,
                }),
              }),
            ],
          }),
        handleLogout: async (req, res) => {
          void req;
          await new Promise((resolve) => setTimeout(resolve, 1500));
          noContent(res);
        },
      },
      async (ctx) => {
        const next = await ctx.launch(ctx.state.signOut(ctx.binding));
        expect(next.sessionGeneration).toBe(ctx.binding.sessionGeneration + 1);
        // The held first attempt consumes the original shared window
        // (the client cancels it around the 200ms deadline instead of
        // waiting out the delayed server): no second token dispatch may
        // admit afterwards, so at most one logout request goes out in
        // total. Exact elapsed-window proof stays with source audit.
        const bodies = logoutBodies(ctx).map((body) => body.refreshToken);
        expect(bodies.length <= 1).toBe(true);
        const reopened = await reopenOnBinding(ctx, next);
        const record = await readVaultRecord(reopened.profile);
        expect(record.grant).toBeNull();
        expect(record.superseded).toEqual([]);
        expect(await reopened.profile.readOperationStoreBytes()).toEqual(ctx.opsBefore);
      },
    );
  });

  it("offline cleanup failure keeps acknowledged clearing", async () => {
    await withS5({}, async (ctx) => {
      await ctx.closeServer();
      const next = await ctx.launch(ctx.state.signOut(ctx.binding));
      expect(next.sessionGeneration).toBe(ctx.binding.sessionGeneration + 1);
      expect(ctx.requests.length).toBe(0);
      const reopened = await reopenOnBinding(ctx, next);
      const record = await readVaultRecord(reopened.profile);
      expect(record.grant).toBeNull();
      expect(record.superseded).toEqual([]);
      expect(await reopened.profile.readOperationStoreBytes()).toEqual(ctx.opsBefore);
    });
  });

  it("same-account replacement retains exact fenced evidence across restart", async () => {
    await withS5(
      {
        seed: ({ binding }) => {
          const grant = liveGrant();
          return s5Version2Bytes({ binding, grant, pendingRefresh: s5ValidPending(grant) });
        },
      },
      async (ctx) => {
        const before = await readVaultRecord(ctx.profile);
        expect(before.pendingRefresh).not.toBeNull();
        const previous = ctx.binding;
        ctx.state.invalidate();
        await ctx.profile.close();
        ctx.profile = await ctx.facility.open(previous);
        const replacement = await ctx.openState(ctx.profile);
        ctx.state = replacement;
        const next = await ctx.launch(
          replacement.replaceGrant(ctx.binding, s5ServiceBytes(), freshSignal()),
        );
        expect(next.sessionGeneration).toBe(previous.sessionGeneration + 1);
        expect(ctx.counts.logout).toBe(0);
        expect(ctx.counts.refresh).toBe(0);
        const reopened = await reopenOnBinding(ctx, next);
        const stored = await readVaultRecord(reopened.profile);
        expect(stored.version).toBe(3);
        expect(stored.grant.accessToken).toBe(S5_ROTATED_BEARER);
        expect(stored.grant.refreshToken).toBe(S5_ROTATED_REFRESH);
        expect(stored.pendingRefresh).toBeNull();
        expect(stored.superseded.length).toBe(1);
        expect(stored.superseded[0].binding).toEqual(previous);
        expect(stored.superseded[0].grant).toEqual(before.grant);
        expect(stored.superseded[0].pendingRefresh).toEqual(before.pendingRefresh);
        expect(await reopened.profile.readOperationStoreBytes()).toEqual(ctx.opsBefore);
        const third = await ctx.launch(
          reopened.state.replaceGrant(
            next,
            s5ServiceBytes({
              accessToken: "synthetic-qa-t06-s5-access.03",
              accessExpiresAt: "2026-09-27T13:00:00.000Z",
              refreshToken: "synthetic-qa-t06-s5-refresh.03",
              refreshExpiresAt: "2026-11-29T12:00:00.000Z",
            }),
            freshSignal(),
          ),
        );
        expect(third.sessionGeneration).toBe(next.sessionGeneration + 1);
        const regrown = await reopenOnBinding(ctx, third);
        const grown = await readVaultRecord(regrown.profile);
        expect(grown.superseded.length).toBe(2);
        expect(grown.superseded.map((entry) => entry.binding.sessionGeneration)).toEqual([
          previous.sessionGeneration,
          next.sessionGeneration,
        ]);
        expect(grown.superseded[1].binding).toEqual(next);
        expect(grown.superseded[1].grant.accessToken).toBe(S5_ROTATED_BEARER);
        expect(grown.superseded[1].pendingRefresh).toBeNull();
        expect(await regrown.profile.readOperationStoreBytes()).toEqual(ctx.opsBefore);
      },
    );
  });

  it("foreign-grant replacement refuses without fencing or IO", async () => {
    await withS5(
      {
        handleResource: (req, res) => {
          void req;
          json(res, 200, workoutListWire([workoutSummaryWire({ id: S5_ROUTINE })]));
        },
      },
      async (ctx) => {
        const seeded = await ctx.profile.readVaultBytes();
        const foreign = s5ServiceBytes({
          account: { id: S5_ACCOUNT_OTHER, displayName: null },
        });
        const error = await captureRejection(
          ctx.state.replaceGrant(ctx.binding, foreign, freshSignal()),
        );
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("operation_interrupted");
        expect(ctx.requests.length).toBe(0);
        expect(await ctx.profile.readVaultBytes()).toEqual(seeded);
        const result = await ctx.launch(ctx.state.listWorkouts(ctx.binding, {}, freshSignal()));
        expect(result.status).toBe(200);
      },
    );
  });

  it("retained predecessor never supplies bearer, replay or rotation", async () => {
    await withS5(
      {
        seed: ({ binding }) => {
          const grant = liveGrant();
          return s5Version2Bytes({ binding, grant, pendingRefresh: s5ValidPending(grant) });
        },
        handleRefresh: (req, res, record) => {
          void req;
          void record;
          json(res, 200, {
            account: { id: S5_ACCOUNT, displayName: null },
            accessToken: "synthetic-qa-t06-s5-access.03",
            accessExpiresAt: "2026-09-27T13:00:00.000Z",
            refreshToken: "synthetic-qa-t06-s5-refresh.03",
            refreshExpiresAt: "2026-11-29T12:00:00.000Z",
          });
        },
        handleResource: (() => {
          let calls = 0;
          return (req, res, record) => {
            void record;
            calls += 1;
            if (calls === 1 && req.headers["authorization"] === `Bearer ${S5_ROTATED_BEARER}`) {
              json(res, 401, { errorCode: "authentication_required" });
              return;
            }
            json(res, 200, workoutListWire([workoutSummaryWire({ id: S5_ROUTINE })]));
          };
        })(),
      },
      async (ctx) => {
        const previous = ctx.binding;
        const next = await ctx.launch(
          ctx.state.replaceGrant(ctx.binding, s5ServiceBytes(), freshSignal()),
        );
        const reopened = await reopenOnBinding(ctx, next);
        const result = await ctx.launch(reopened.state.listWorkouts(next, {}, freshSignal()));
        expect(result.status).toBe(200);
        expect(ctx.counts.refresh).toBe(1);
        expect(refreshBodies(ctx)).toEqual([{ refreshToken: S5_ROTATED_REFRESH }]);
        const wireBodies = ctx.requests.map((record) => record.body.toString("utf8"));
        expect(wireBodies.some((body) => body.includes(S5_REFRESH))).toBe(false);
        const stored = await readVaultRecord(reopened.profile);
        expect(stored.superseded.length).toBe(1);
        expect(stored.superseded[0].binding).toEqual(previous);
        expect(stored.superseded[0].grant.refreshToken).toBe(S5_REFRESH);
        expect(stored.grant.refreshToken).toBe("synthetic-qa-t06-s5-refresh.03");
        expect(await reopened.profile.readOperationStoreBytes()).toEqual(ctx.opsBefore);
      },
    );
  });

  it("replacement waits for a begun owned install commit and retains latest evidence", async () => {
    let refreshReleased = false;
    await withS5(
      {
        handleRefresh: async (req, res, record, counts, gates) => {
          void req;
          void record;
          void counts;
          try {
            await gates.waitFor(() => refreshReleased);
          } catch (error) {
            if (!isGateRelease(error)) throw error;
            json(res, 500, { errorCode: "internal_error" });
            return;
          }
          json(res, 200, {
            account: { id: S5_ACCOUNT, displayName: null },
            accessToken: "synthetic-qa-t06-s5-access.03",
            accessExpiresAt: "2026-09-27T13:00:00.000Z",
            refreshToken: "synthetic-qa-t06-s5-refresh.03",
            refreshExpiresAt: "2026-11-29T12:00:00.000Z",
          });
        },
        handleResource: (() => {
          let calls = 0;
          return (req, res, record) => {
            void record;
            calls += 1;
            if (calls === 1) {
              json(res, 401, { errorCode: "authentication_required" });
              return;
            }
            json(res, 200, workoutListWire([workoutSummaryWire({ id: S5_ROUTINE })]));
          };
        })(),
      },
      async (ctx) => {
        ctx.state.invalidate();
        const gate = makeInstallGateOwner(ctx.profile);
        ctx.gates.defer(() => {
          gate.release();
        });
        const state = await ctx.openState(gate.adapter);
        ctx.state = state;
        const read = ctx.launch(state.listWorkouts(ctx.binding, {}, freshSignal()));
        ctx.gates.defer(() => {
          refreshReleased = true;
        });
        await ctx.gates.waitFor(() =>
          ctx.requests.some((record) => record.url === "/v1/auth/refresh"),
        );
        gate.arm();
        refreshReleased = true;
        await ctx.gates.waitFor(() => gate.hasEntered());
        // The owned install commit is begun but held: replacement must not
        // advance before it settles. The final vault proves the order —
        // racing ahead would retain stale evidence or be clobbered.
        const replacement = ctx.launch(
          state.replaceGrant(ctx.binding, s5ServiceBytes(), freshSignal()),
        );
        gate.release();
        const next = await replacement;
        expect(next.sessionGeneration).toBe(ctx.binding.sessionGeneration + 1);
        const readError = await captureRejection(read);
        expect(errorBrandOk(readError, "operation_interrupted")).toBe(true);
        expect(ctx.counts.resource).toBe(1);
        expect(ctx.counts.refresh).toBe(1);
        const reopened = await reopenOnBinding(ctx, next);
        const stored = await readVaultRecord(reopened.profile);
        expect(stored.version).toBe(3);
        expect(stored.grant.refreshToken).toBe(S5_ROTATED_REFRESH);
        expect(stored.pendingRefresh).toBeNull();
        expect(stored.superseded.length).toBe(1);
        expect(stored.superseded[0].grant.accessToken).toBe("synthetic-qa-t06-s5-access.03");
        expect(stored.superseded[0].grant.refreshToken).toBe("synthetic-qa-t06-s5-refresh.03");
        expect(stored.superseded[0].pendingRefresh).toBeNull();
        expect(await reopened.profile.readOperationStoreBytes()).toEqual(ctx.opsBefore);
      },
    );
  });

  it("concurrent lifecycle actions admit exactly one", async () => {
    await withS5({}, async (ctx) => {
      const first = ctx.launch(ctx.state.signOut(ctx.binding));
      const second = ctx.launch(ctx.state.signOut(ctx.binding));
      const outcomes = await Promise.allSettled([first, second]);
      const fulfilled = outcomes.filter((outcome) => outcome.status === "fulfilled");
      const rejected = outcomes.filter((outcome) => outcome.status === "rejected");
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
      expect(errorBrandOk(rejected[0].reason, "operation_interrupted")).toBe(true);
      expect(ctx.counts.logout).toBe(1);
    });
    await withS5({}, async (ctx) => {
      const first = ctx.launch(ctx.state.signOut(ctx.binding));
      const second = ctx.launch(
        ctx.state.replaceGrant(ctx.binding, s5ServiceBytes(), freshSignal()),
      );
      const outcomes = await Promise.allSettled([first, second]);
      const fulfilled = outcomes.filter((outcome) => outcome.status === "fulfilled");
      const rejected = outcomes.filter((outcome) => outcome.status === "rejected");
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
      expect(errorBrandOk(rejected[0].reason, "operation_interrupted")).toBe(true);
      expect(ctx.counts.logout <= 1).toBe(true);
      expect(ctx.counts.refresh).toBe(0);
    });
  });

  it("invalidate during a begun replacement commit suppresses success without rollback", async () => {
    await withS5({}, async (ctx) => {
      ctx.state.invalidate();
      const gate = makeAdvanceGateOwner(ctx.profile);
      gate.arm();
      const state = await ctx.openState(gate.adapter);
      ctx.state = state;
      const pendingOp = ctx.launch(
        state.replaceGrant(ctx.binding, s5ServiceBytes(), freshSignal()),
      );
      void pendingOp.then(
        () => {},
        () => {},
      );
      try {
        await ctx.gates.waitFor(() => gate.hasEntered());
      } finally {
        gate.release();
      }
      state.invalidate();
      const error = await captureRejection(pendingOp);
      expect(errorBrandOk(error, "operation_interrupted")).toBe(true);
      await gate.adapter.close();
      const expected = {
        ...ctx.binding,
        sessionGeneration: ctx.binding.sessionGeneration + 1,
      };
      ctx.profile = await ctx.facility.open(expected);
      const stored = await readVaultRecord(ctx.profile);
      expect(stored.version).toBe(3);
      expect(stored.grant.refreshToken).toBe(S5_ROTATED_REFRESH);
      expect(stored.superseded.length).toBe(1);
    });
  });

  it("invalidate during admitted sign-out keeps the acknowledged clearing", async () => {
    let logoutReleased = false;
    await withS5(
      {
        handleLogout: async (req, res, record, counts, gates) => {
          void req;
          void record;
          void counts;
          try {
            await gates.waitFor(() => logoutReleased);
          } catch (error) {
            if (!isGateRelease(error)) throw error;
            noContent(res);
            return;
          }
          noContent(res);
        },
      },
      async (ctx) => {
        const pending = ctx.launch(ctx.state.signOut(ctx.binding));
        ctx.gates.defer(() => {
          logoutReleased = true;
        });
        await ctx.gates.waitFor(() =>
          ctx.requests.some((record) => record.url === "/v1/auth/logout"),
        );
        ctx.state.invalidate();
        logoutReleased = true;
        const next = await pending;
        expect(next.sessionGeneration).toBe(ctx.binding.sessionGeneration + 1);
        const reopened = await reopenOnBinding(ctx, next);
        const stored = await readVaultRecord(reopened.profile);
        expect(stored.grant).toBeNull();
        expect(stored.superseded).toEqual([]);
      },
    );
  });

  it("a fenced stale mutation keeps dispatched uncertainty without data", async () => {
    let draftReleased = false;
    await withS5(
      {
        handleResource: (() => {
          return async (req, res, record, counts, gates) => {
            void record;
            void counts;
            if (req.method === "POST" && req.url === "/v1/routines") {
              try {
                await gates.waitFor(() => draftReleased);
              } catch (error) {
                if (!isGateRelease(error)) throw error;
                json(res, 500, { errorCode: "internal_error" });
                return;
              }
              json(res, 201, routineWire({ id: S5_ROUTINE }));
              return;
            }
            json(res, 200, workoutListWire([workoutSummaryWire({ id: S5_ROUTINE })]));
          };
        })(),
      },
      async (ctx) => {
        const draftBytes = s5DraftBodyBytes();
        const draft = ctx.launch(
          ctx.state.createDraft(
            ctx.binding,
            S5_ROUTINE,
            draftBytes,
            S5_RESOURCE_KEY,
            freshSignal(),
          ),
        );
        await ctx.gates.waitFor(() =>
          ctx.requests.some((record) => record.method === "POST" && record.url === "/v1/routines"),
        );
        const observed = ctx.requests.find(
          (record) => record.method === "POST" && record.url === "/v1/routines",
        );
        expect(observed.body.toString("utf8")).toBe(Buffer.from(draftBytes).toString("utf8"));
        const next = await ctx.launch(ctx.state.signOut(ctx.binding));
        expect(next.sessionGeneration).toBe(ctx.binding.sessionGeneration + 1);
        draftReleased = true;
        const error = await captureRejection(draft);
        expect(isTransportError(error)).toBe(true);
        expect(error.code).toBe("operation_interrupted");
        expect(error.dispatched).toBe(true);
        expect(error.outcomeUnknown).toBe(true);
        expect(error.attempts).toBe(1);
        expect("data" in Object(error)).toBe(false);
      },
    );
  });

  it("a fenced stale read keeps dispatched certainty without data", async () => {
    let readReleased = false;
    await withS5(
      {
        handleResource: async (req, res, record, counts, gates) => {
          void req;
          void record;
          void counts;
          try {
            await gates.waitFor(() => readReleased);
          } catch (error) {
            if (!isGateRelease(error)) throw error;
            json(res, 500, { errorCode: "internal_error" });
            return;
          }
          json(res, 200, workoutListWire([workoutSummaryWire({ id: S5_ROUTINE })]));
        },
      },
      async (ctx) => {
        const read = ctx.launch(ctx.state.listWorkouts(ctx.binding, {}, freshSignal()));
        await ctx.gates.waitFor(() => ctx.requests.length > 0);
        const next = await ctx.launch(ctx.state.signOut(ctx.binding));
        expect(next.sessionGeneration).toBe(ctx.binding.sessionGeneration + 1);
        readReleased = true;
        const error = await captureRejection(read);
        expect(isTransportError(error)).toBe(true);
        expect(error.code).toBe("operation_interrupted");
        expect(error.dispatched).toBe(true);
        expect(error.outcomeUnknown).toBe(false);
        expect("data" in Object(error)).toBe(false);
      },
    );
  });

  it("an in-flight refresh rotation is fenced without late success", async () => {
    let refreshReleased = false;
    await withS5(
      {
        handleRefresh: async (req, res, record, counts, gates) => {
          void req;
          void record;
          void counts;
          try {
            await gates.waitFor(() => refreshReleased);
          } catch (error) {
            if (!isGateRelease(error)) throw error;
            json(res, 500, { errorCode: "internal_error" });
            return;
          }
          json(res, 200, {
            account: { id: S5_ACCOUNT, displayName: null },
            accessToken: "synthetic-qa-t06-s5-access.03",
            accessExpiresAt: "2026-09-27T13:00:00.000Z",
            refreshToken: "synthetic-qa-t06-s5-refresh.03",
            refreshExpiresAt: "2026-11-29T12:00:00.000Z",
          });
        },
        handleResource: (() => {
          let calls = 0;
          return (req, res, record) => {
            void record;
            calls += 1;
            if (calls === 1) {
              json(res, 401, { errorCode: "authentication_required" });
              return;
            }
            json(res, 200, workoutListWire([workoutSummaryWire({ id: S5_ROUTINE })]));
          };
        })(),
      },
      async (ctx) => {
        const read = ctx.launch(ctx.state.listWorkouts(ctx.binding, {}, freshSignal()));
        ctx.gates.defer(() => {
          refreshReleased = true;
        });
        await ctx.gates.waitFor(() =>
          ctx.requests.some((record) => record.url === "/v1/auth/refresh"),
        );
        const next = await ctx.launch(ctx.state.signOut(ctx.binding));
        expect(next.sessionGeneration).toBe(ctx.binding.sessionGeneration + 1);
        refreshReleased = true;
        const error = await captureRejection(read);
        expect(errorBrandOk(error, "operation_interrupted")).toBe(true);
        expect(ctx.counts.refresh).toBe(1);
        const reopened = await reopenOnBinding(ctx, next);
        const stored = await readVaultRecord(reopened.profile);
        expect(stored.grant).toBeNull();
        expect(stored.superseded).toEqual([]);
        expect(await reopened.profile.readOperationStoreBytes()).toEqual(ctx.opsBefore);
      },
    );
  });

  it("already-aborted input rejects before admission without fencing", async () => {
    await withS5({}, async (ctx) => {
      const seeded = await ctx.profile.readVaultBytes();
      const first = await captureRejection(
        ctx.state.replaceGrant(ctx.binding, s5ServiceBytes(), abortedSignal()),
      );
      expect(errorBrandOk(first, "operation_interrupted")).toBe(true);
      expect(await ctx.profile.readVaultBytes()).toEqual(seeded);
      expect(ctx.requests.length).toBe(0);
      const next = await ctx.launch(
        ctx.state.replaceGrant(ctx.binding, s5ServiceBytes(), freshSignal()),
      );
      expect(next.sessionGeneration).toBe(ctx.binding.sessionGeneration + 1);
      expect(ctx.counts.logout).toBe(0);
      expect(ctx.counts.refresh).toBe(0);
      const reopened = await reopenOnBinding(ctx, next);
      const stored = await readVaultRecord(reopened.profile);
      expect(stored.grant.refreshToken).toBe(S5_ROTATED_REFRESH);
      expect(stored.superseded.length).toBe(1);
    });
  });

  it("definite pre-prepare failure keeps old state with io_failure and no dispatch", async () => {
    await withS5({}, async (ctx) => {
      const seeded = await ctx.profile.readVaultBytes();
      await ctx.facility.armFault({ point: "commit.before.prepare", action: "throw" });
      try {
        const error = await captureRejection(ctx.state.signOut(ctx.binding));
        expect(isStorageError(error)).toBe(true);
        expect(isSessionError(error)).toBe(false);
        expect(error.code).toBe("io_failure");
        expect(ctx.requests.length).toBe(0);
        expect(await ctx.profile.readVaultBytes()).toEqual(seeded);
      } finally {
        await ctx.facility.clearFault();
      }
      ctx.state.invalidate();
      await ctx.profile.close();
      ctx.profile = await ctx.facility.open(ctx.binding);
      const reopened = await ctx.openState(ctx.profile);
      ctx.state = reopened;
      expect(reopened.binding).toEqual(ctx.binding);
    });
  });

  it("ambiguous transition failure fences without silent repair", async () => {
    await withS5({}, async (ctx) => {
      await ctx.facility.armFault({ point: "commit.anchor.prepared", action: "throw" });
      let error;
      try {
        error = await captureRejection(ctx.state.signOut(ctx.binding));
      } finally {
        await ctx.facility.clearFault();
      }
      expect(isStorageError(error)).toBe(true);
      expect(error.code).toBe("commit_ambiguous");
      expect(ctx.requests.length).toBe(0);
      const retry = await captureRejection(ctx.state.signOut(ctx.binding));
      expect(isStorageError(retry) || isSessionError(retry)).toBe(true);
      const fencedRead = await captureRejection(ctx.profile.readVaultBytes());
      expect(isStorageError(fencedRead)).toBe(true);
      expect(fencedRead.code).toBe("commit_ambiguous");
      await ctx.profile.close();
      ctx.profile = null;
      const reopenError = await captureRejection(ctx.facility.open(ctx.binding));
      expect(isStorageError(reopenError)).toBe(true);
      expect(reopenError.code).toBe("commit_ambiguous");
    });
  });
});
