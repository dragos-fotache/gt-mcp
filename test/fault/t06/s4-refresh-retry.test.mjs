// T06-S4 QA fault 01 — live read, expired-access preflight, pending replay
// before dispatch, single 401 refresh-and-retry with exact request identity,
// and no-loop/no-expansion on repeated, malformed and noneligible 401s
// (REPAIRED r2, HOLD: authored against the settled S4 work order plus the
// common interface adjudication, never executed before the coordinator's
// named frozen relay).
//
// Spec basis: work-order steps 1-7 (entry gates; pending exact S3 recovery
// priority before bearer dispatch; expired access/live refresh permits one
// durable fresh rotation; ONLY a validated delivered 401 with
// authentication_required/reauthentication_required permits one reactive
// refresh-and-retry; retry uses unchanged binding/method/route/ids/exact
// body bytes/resource key with only bearer changed; repeated401 =>
// reauthentication_required) with adjudication entry classes (malformed
// route/body may be either safe invalid_arguments brand; body-byte budget
// overflow is TransportError request_too_large; interruption either brand),
// preflight-vs-head-budget timing (malformed/size reject before auth
// preparation) and final delivery (a received success suppressed for
// abort/fence/expiry/clock becomes a safe final-leg TransportError with
// dispatched=true and conservative mutation outcomeUnknown). Bounded policy
// (each leg maxAttempts=1; noneligible failure preserves its original T05
// error, especially dispatched/outcomeUnknown mutation uncertainty). One
// representative mutation (createDraft, plus one saveRoutine size case)
// covers bytes/resource-key identity; every route is NOT repeated.
// Concurrency, cancellation and unresolved-auth mapping belong to S4 fault 02.
//
// Boundaries: accepted T04 diagnostic facility + unchanged T05 loopback TLS
// fixtures only (success bodies reuse accepted T05 unit wire builders for
// the exact fixed-route schemas); synthetic data; no personal provider.
// Bound owners are established through the accepted S1 entry
// (install/close/reopen) before seeds are committed by the tests, never by
// production. Every launched facade promise is registered immediately with
// rejection handling via ctx.launch and settled on all paths; every
// responder execution is tracked; ALL owned waits are cancellable and
// released on teardown; cleanup failures fold honestly alongside body and
// responder failures. Fixture roots are owned by the diagnostic facility; no
// HOME/TMPDIR overrides, no external DNS/network.

/* global clearTimeout, setTimeout */

import { describe, expect, it } from "vitest";
import {
  isSessionError,
  openAuthenticatedSessionState,
  openSessionState,
} from "../../../dist/auth/index.js";
import { isTransportError } from "../../../dist/http/index.js";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import { closeServer, readFixtureBytes, startLoopbackHttps } from "../t05/helpers.mjs";
import {
  bundledExerciseWire,
  routineListWire,
  routineWire,
  searchPageWire,
  workoutListWire,
  workoutSummaryWire,
} from "../../unit/t05/helpers.mjs";
import {
  captureRejection,
  freshSignal,
  grantBodyBytes,
  teardownAll,
} from "../../unit/t06/helpers.mjs";
import {
  S4_ACCOUNT,
  S4_CANONICAL_UUID,
  S4_PENDING_KEY,
  S4_RESOURCE_KEY,
  S4_ROTATED_BEARER,
  S4_ROTATED_REFRESH,
  S4_ROUTINE,
  S4_WORKOUT,
  s4Clock,
  s4DraftBodyBytes,
  s4PrepareBodyBase64,
  s4ServiceBody,
  s4Utf8,
  s4Utf8Text,
  s4ValidPending,
  s4VaultGrant,
  s4Version2Bytes,
  S4_CLOCK_LIVE_MS,
  S4_EXPIRED_ACCESS_EXPIRY,
  S4_REFRESH_EXPIRY,
} from "../../unit/t06/s4-helpers.mjs";

const GATE_RELEASED = "s4-gate-released";

function json(res, status, obj) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(Buffer.from(JSON.stringify(obj), "utf8"));
}

// Open one S4 case on an owned loopback origin: server first, then bound
// owner via the accepted S1 entry, then the test-committed v2 seed, then
// the S4 facade. ctx.launch registers every facade promise immediately
// (original outcome preserved for assertions) with rejection handling;
// gates.waitFor is a cancellable owned wait (cleared timers, no lingering
// polling); gates.defer registers failure-path cleanups; teardown releases
// ALL gates, runs deferred cleanups, destroys owned networking, awaits ALL
// owned calls/responders, then closes — folding body, responder and
// teardown failures honestly instead of dropping any.
async function withS4(options, fn) {
  const { grant, pendingRefresh, handleRefresh, handleResource } = options;
  const certPem = readFixtureBytes("test-only-loopback-cert.pem");
  const keyPem = readFixtureBytes("test-only-loopback-key.pem");
  const requests = [];
  const counts = { refresh: 0, resource: 0 };
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
      { keyPem, certPem, label: "synthetic-qa-t06-s4 retry pair" },
      (req, res, record) => {
        track(
          (async () => {
            requests.push(record);
            if (req.method === "POST" && req.url === "/v1/auth/refresh") {
              counts.refresh += 1;
              await handleRefresh(req, res, record, counts, gates);
            } else {
              counts.resource += 1;
              await handleResource(req, res, record, counts, gates);
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
    const transportConfig =
      typeof options.buildTransportConfig === "function"
        ? options.buildTransportConfig(origin, certPem)
        : { origin, testCaPem: certPem };
    state = await openAuthenticatedSessionState({
      profile,
      transportConfig,
      clock: options.clock ?? s4Clock(),
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

function bearerOf(record) {
  return record.headers["authorization"] ?? null;
}

function errorBrandOk(error, code) {
  return (isSessionError(error) || isTransportError(error)) && error.code === code;
}

describe("t06-s4 single refresh-and-retry with exact request identity", () => {
  it("serves an ordinary live-grant read with the current bearer and no refresh", async () => {
    await withS4(
      {
        grant: s4VaultGrant(),
        pendingRefresh: null,
        handleRefresh: (req, res) => json(res, 200, s4ServiceBody()),
        handleResource: (req, res) => json(res, 200, searchPageWire([bundledExerciseWire()])),
      },
      async ({ state, binding, counts, requests, launch }) => {
        const result = await launch(state.searchExercises(binding, {}, freshSignal()));
        expect(result.status).toBe(200);
        expect(result.attempts).toBe(1);
        expect(result.dispatched).toBe(true);
        expect(counts.refresh).toBe(0);
        expect(counts.resource).toBe(1);
        expect(bearerOf(requests[0])).toBe(`Bearer ${s4VaultGrant().accessToken}`);
      },
    );
  });

  it("preflights expired access with one durable fresh rotation before dispatch", async () => {
    await withS4(
      {
        grant: s4VaultGrant({ accessExpiresAt: S4_EXPIRED_ACCESS_EXPIRY }),
        pendingRefresh: null,
        handleRefresh: (req, res) => json(res, 200, s4ServiceBody()),
        handleResource: (req, res) =>
          json(res, 200, routineListWire([routineWire({ id: S4_ROUTINE, isDraft: false })])),
      },
      async ({ state, binding, profile, counts, requests, launch }) => {
        const result = await launch(state.listRoutines(binding, {}, freshSignal()));
        expect(result.status).toBe(200);
        expect(counts.refresh).toBe(1);
        expect(counts.resource).toBe(1);
        const refreshRecord = requests[0];
        expect(refreshRecord.url).toBe("/v1/auth/refresh");
        expect(S4_CANONICAL_UUID.test(refreshRecord.headers["idempotency-key"] ?? "")).toBe(true);
        expect(bearerOf(requests[1])).toBe(`Bearer ${S4_ROTATED_BEARER}`);
        const stored = JSON.parse(s4Utf8Text(await profile.readVaultBytes()));
        expect(stored.grant.accessToken).toBe(S4_ROTATED_BEARER);
        expect(stored.grant.refreshToken).toBe(S4_ROTATED_REFRESH);
        expect(stored.pendingRefresh).toBe(null);
      },
    );
  });

  it("replays pending exactly before bearer dispatch with no fresh rotation", async () => {
    const predecessor = s4VaultGrant({ accessExpiresAt: S4_EXPIRED_ACCESS_EXPIRY });
    await withS4(
      {
        grant: predecessor,
        pendingRefresh: s4ValidPending(predecessor),
        handleRefresh: (req, res) => json(res, 200, s4ServiceBody()),
        handleResource: (req, res) =>
          json(res, 200, workoutListWire([workoutSummaryWire({ id: S4_WORKOUT })])),
      },
      async ({ state, binding, profile, counts, requests, launch }) => {
        const result = await launch(state.listWorkouts(binding, {}, freshSignal()));
        expect(result.status).toBe(200);
        expect(counts.refresh).toBe(1);
        expect(counts.resource).toBe(1);
        const replay = requests[0];
        expect(replay.url).toBe("/v1/auth/refresh");
        const expectedBody = Buffer.from(s4PrepareBodyBase64(predecessor.refreshToken), "base64");
        expect(Buffer.from(replay.body)).toEqual(expectedBody);
        expect(replay.headers["idempotency-key"]).toBe(S4_PENDING_KEY);
        const stored = JSON.parse(s4Utf8Text(await profile.readVaultBytes()));
        expect(stored.grant.accessToken).toBe(S4_ROTATED_BEARER);
        expect(stored.pendingRefresh).toBe(null);
      },
    );
  });

  it("retries one valid 401 with unchanged mutation identity under the rotated bearer", async () => {
    const draftBody = s4DraftBodyBytes(S4_ROUTINE);
    const entrySnapshot = Buffer.from(draftBody);
    await withS4(
      {
        grant: s4VaultGrant(),
        pendingRefresh: null,
        handleRefresh: (req, res) => json(res, 200, s4ServiceBody()),
        handleResource: (req, res, record, counts) => {
          if (counts.resource === 1) {
            json(res, 401, { errorCode: "reauthentication_required" });
          } else {
            json(res, 201, routineWire({ id: S4_ROUTINE, name: "", isDraft: true }));
          }
        },
      },
      async ({ state, binding, profile, counts, requests, launch }) => {
        const result = await launch(
          state.createDraft(binding, S4_ROUTINE, draftBody, S4_RESOURCE_KEY, freshSignal()),
        );
        expect(result.status).toBe(201);
        expect(result.resourceKey).toBe(S4_RESOURCE_KEY);
        expect(counts.refresh).toBe(1);
        expect(counts.resource).toBe(2);
        const first = requests[0];
        const retry = requests[2];
        for (const leg of [first, retry]) {
          expect(leg.method).toBe("POST");
          expect(leg.url).toBe("/v1/routines");
          expect(Buffer.from(leg.body)).toEqual(entrySnapshot);
          expect(leg.headers["idempotency-key"]).toBe(S4_RESOURCE_KEY);
        }
        expect(bearerOf(first)).toBe(`Bearer ${s4VaultGrant().accessToken}`);
        expect(bearerOf(retry)).toBe(`Bearer ${S4_ROTATED_BEARER}`);
        expect(Buffer.from(result.rawBodyBytes).length).toBeGreaterThan(0);
        const stored = JSON.parse(s4Utf8Text(await profile.readVaultBytes()));
        expect(stored.grant.accountUuid).toBe(S4_ACCOUNT);
        expect(stored.grant.refreshToken).toBe(S4_ROTATED_REFRESH);
      },
    );
  });

  it("retains entry snapshots when caller mutates body and binding during held auth", async () => {
    const draftBody = s4DraftBodyBytes(S4_ROUTINE);
    const entrySnapshot = Buffer.from(draftBody);
    let releaseRefresh = false;
    await withS4(
      {
        grant: s4VaultGrant(),
        pendingRefresh: null,
        handleRefresh: async (req, res, record, counts, gates) => {
          await gates.waitFor(() => releaseRefresh);
          json(res, 200, s4ServiceBody());
        },
        handleResource: (req, res, record, counts) => {
          if (counts.resource === 1) {
            json(res, 401, { errorCode: "reauthentication_required" });
          } else {
            json(res, 201, routineWire({ id: S4_ROUTINE, name: "", isDraft: true }));
          }
        },
      },
      async ({ state, binding, counts, requests, gates, launch }) => {
        const callerBinding = { ...binding };
        const pending = launch(
          state.createDraft(callerBinding, S4_ROUTINE, draftBody, S4_RESOURCE_KEY, freshSignal()),
        );
        await gates.waitFor(() => counts.refresh >= 1);
        draftBody.fill(0x58);
        callerBinding.sessionGeneration = 999;
        releaseRefresh = true;
        const result = await pending;
        expect(result.status).toBe(201);
        expect(counts.refresh).toBe(1);
        expect(counts.resource).toBe(2);
        expect(Buffer.from(requests[0].body)).toEqual(entrySnapshot);
        expect(Buffer.from(requests[2].body)).toEqual(entrySnapshot);
        expect(requests[2].headers["idempotency-key"]).toBe(S4_RESOURCE_KEY);
      },
    );
  });

  it("maps a repeated 401 to reauthentication_required with no further replay", async () => {
    await withS4(
      {
        grant: s4VaultGrant(),
        pendingRefresh: null,
        handleRefresh: (req, res) => json(res, 200, s4ServiceBody()),
        handleResource: (req, res) => json(res, 401, { errorCode: "authentication_required" }),
      },
      async ({ state, binding, counts, launch }) => {
        const error = await captureRejection(
          launch(state.getRoutine(binding, S4_ROUTINE, freshSignal())),
        );
        expect(isSessionError(error)).toBe(true);
        expect(error.code).toBe("reauthentication_required");
        expect(counts.refresh).toBe(1);
        expect(counts.resource).toBe(2);
      },
    );
  });

  it("never starts auth refresh for a malformed 401 with a mismatched code", async () => {
    await withS4(
      {
        grant: s4VaultGrant(),
        pendingRefresh: null,
        handleRefresh: (req, res) => json(res, 200, s4ServiceBody()),
        handleResource: (req, res) => json(res, 401, { errorCode: "not_found" }),
      },
      async ({ state, binding, counts, launch }) => {
        const error = await captureRejection(
          launch(state.getRoutine(binding, S4_ROUTINE, freshSignal())),
        );
        expect(isTransportError(error)).toBe(true);
        expect(error.code).toBe("internal_error");
        expect(counts.refresh).toBe(0);
        expect(counts.resource).toBe(1);
      },
    );
  });

  it("preserves a noneligible 403 without any auth dispatch", async () => {
    await withS4(
      {
        grant: s4VaultGrant(),
        pendingRefresh: null,
        handleRefresh: (req, res) => json(res, 200, s4ServiceBody()),
        handleResource: (req, res) => json(res, 403, { errorCode: "read_only" }),
      },
      async ({ state, binding, counts, launch }) => {
        const error = await captureRejection(
          launch(state.getRoutine(binding, S4_ROUTINE, freshSignal())),
        );
        expect(isTransportError(error)).toBe(true);
        expect(error.code).toBe("read_only");
        expect(counts.refresh).toBe(0);
        expect(counts.resource).toBe(1);
      },
    );
  });

  it("preserves resource loss uncertainty without auth replay", async () => {
    await withS4(
      {
        grant: s4VaultGrant(),
        pendingRefresh: null,
        handleRefresh: (req, res) => json(res, 200, s4ServiceBody()),
        handleResource: (req, res) => {
          res.destroy();
        },
      },
      async ({ state, binding, counts, launch }) => {
        const error = await captureRejection(
          launch(
            state.createDraft(
              binding,
              S4_ROUTINE,
              s4DraftBodyBytes(S4_ROUTINE),
              S4_RESOURCE_KEY,
              freshSignal(),
            ),
          ),
        );
        expect(isTransportError(error)).toBe(true);
        expect(error.code).toBe("network_error");
        expect(error.dispatched).toBe(true);
        expect(error.outcomeUnknown).toBe(true);
        expect(counts.refresh).toBe(0);
        expect(counts.resource).toBe(1);
      },
    );
  });

  it("suppresses a received mutation success at final delivery with conservative uncertainty", async () => {
    let nowMs = S4_CLOCK_LIVE_MS;
    let releaseLeg = false;
    await withS4(
      {
        grant: s4VaultGrant(),
        pendingRefresh: null,
        clock: { nowMs: () => nowMs },
        handleRefresh: (req, res) => json(res, 200, s4ServiceBody()),
        handleResource: async (req, res, record, counts, gates) => {
          await gates.waitFor(() => releaseLeg);
          json(res, 201, routineWire({ id: S4_ROUTINE, name: "", isDraft: true }));
        },
      },
      async ({ state, binding, counts, gates, launch }) => {
        const pending = launch(
          state.createDraft(
            binding,
            S4_ROUTINE,
            s4DraftBodyBytes(S4_ROUTINE),
            S4_RESOURCE_KEY,
            freshSignal(),
          ),
        );
        await gates.waitFor(() => counts.resource >= 1);
        nowMs = Date.parse(S4_REFRESH_EXPIRY) + 1;
        releaseLeg = true;
        const error = await captureRejection(pending);
        expect(isTransportError(error)).toBe(true);
        expect(error.code).toBe("reauthentication_required");
        expect(error.dispatched).toBe(true);
        expect(error.outcomeUnknown).toBe(true);
        expect(error.data).toBe(undefined);
        expect(counts.refresh).toBe(0);
        expect(counts.resource).toBe(1);
      },
    );
  });

  it("rejects local invalid and oversized requests before any auth change or dispatch", async () => {
    await withS4(
      {
        grant: s4VaultGrant({ accessExpiresAt: S4_EXPIRED_ACCESS_EXPIRY }),
        pendingRefresh: null,
        handleRefresh: (req, res) => json(res, 200, s4ServiceBody()),
        handleResource: (req, res) =>
          json(res, 200, routineListWire([routineWire({ id: S4_ROUTINE, isDraft: false })])),
      },
      async ({ state, binding, profile, counts, launch }) => {
        const before = await profile.readVaultBytes();
        const badId = await captureRejection(
          launch(state.getRoutine(binding, "not-a-uuid", freshSignal())),
        );
        expect(errorBrandOk(badId, "invalid_arguments")).toBe(true);
        const badBody = await captureRejection(
          launch(
            state.createDraft(binding, S4_ROUTINE, "not-bytes", S4_RESOURCE_KEY, freshSignal()),
          ),
        );
        expect(errorBrandOk(badBody, "invalid_arguments")).toBe(true);
        const oversized = s4Utf8(JSON.stringify({ name: `synthetic-${"n".repeat(300000)}` }));
        const tooLarge = await captureRejection(
          launch(state.saveRoutine(binding, S4_ROUTINE, oversized, S4_RESOURCE_KEY, freshSignal())),
        );
        expect(isTransportError(tooLarge)).toBe(true);
        expect(tooLarge.code).toBe("request_too_large");
        expect(counts.refresh).toBe(0);
        expect(counts.resource).toBe(0);
        const after = await profile.readVaultBytes();
        expect(Buffer.from(after)).toEqual(Buffer.from(before));
      },
    );
  });

  it("captures transport config at open against the owned loopback destination", async () => {
    let captured = null;
    await withS4(
      {
        grant: s4VaultGrant(),
        pendingRefresh: null,
        buildTransportConfig: (origin, certPem) => {
          captured = { origin, testCaPem: certPem };
          return captured;
        },
        handleRefresh: (req, res) => json(res, 200, s4ServiceBody()),
        handleResource: (req, res) =>
          json(res, 200, routineListWire([routineWire({ id: S4_ROUTINE, isDraft: false })])),
      },
      async ({ state, binding, requests, origin, launch }) => {
        const first = await launch(state.listRoutines(binding, {}, freshSignal()));
        expect(first.status).toBe(200);
        expect(requests[0].headers.host.startsWith("127.0.0.1:")).toBe(true);
        // Non-network sentinel: syntactically invalid as an origin, so any
        // re-read of caller config fails locally without touching DNS.
        captured.origin = "not-an-origin-sentinel";
        const second = await launch(state.listRoutines(binding, {}, freshSignal()));
        expect(second.status).toBe(200);
        expect(requests[1].headers.host.startsWith("127.0.0.1:")).toBe(true);
        expect(requests[1].url).toBe("/v1/routines?limit=20");
        expect(origin.startsWith("https://127.0.0.1:")).toBe(true);
      },
    );
  });
});
