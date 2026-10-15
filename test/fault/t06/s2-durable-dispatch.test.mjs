// T06-S2 QA fault 01 — durable predecessor/body/key, single control
// attempt, atomic same-account success, preparation-failure fence
// (SOURCE-READY, HOLD: authored against the settled S2 work-order public API
// plus the accepted T04 diagnostic facility and T05 loopback TLS fixtures,
// never executed before the coordinator's named frozen relay).
//
// Spec basis: work-order "Rotation, hooks and durable transitions" steps 1-6
// (durable version2 predecessor/token/body/key commit BEFORE T05 handoff, no
// operationBytes, exactly one authRefresh control attempt, same-account
// atomic grant + pending-null commit, operation bytes unchanged) and
// "Ownership, environment and execution grants" (T04 failure fences the
// facade and propagates StorageError; cancelled preparation never
// dispatches). Close/reopen checks stored state, NOT replay (S3 owns exact
// replay). No crash-kill, no generalized harness.
//
// Dispatch ordering is proved by the commit-gate case: the real prepare
// completion is held while dispatch is observably absent, so the single
// request can only follow durability. The content case then pins the exact
// persisted/request bytes. Boundaries: the already-accepted T04 diagnostic
// facility proves the auth/persistence boundary (NOT new Secret Service
// qualification); the unchanged accepted T05 loopback TLS fixtures prove the
// HTTPS dispatch boundary. Synthetic data only; no personal provider.

/* global AbortController, setTimeout */

import { describe, expect, it } from "vitest";
import {
  REFRESH_VAULT_VERSION,
  isSessionError,
  openRefreshSessionState,
} from "../../../dist/auth/index.js";
import { openSessionState } from "../../../dist/auth/index.js";
import { isTransportError } from "../../../dist/http/index.js";
import { isStorageError } from "../../../dist/storage/index.js";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import {
  closeServer,
  readFixtureBytes,
  startLoopbackHttps,
  waitForDeadline,
} from "../t05/helpers.mjs";
import {
  ACCOUNT_A,
  CLOCK_LIVE_MS,
  captureRejection,
  freshSignal,
  grantBodyBytes,
  liveClock,
  teardownAll,
  utf8,
  utf8Text,
} from "../../unit/t06/helpers.mjs";

// Visibly synthetic rotated grant (listed here, so synthetic by provenance).
// Same account as the seeded predecessor; exact millisecond expiry strings.
const ROTATED_ACCESS = "synthetic-qa-t06-s2-access.02";
const ROTATED_REFRESH = "synthetic-qa-t06-s2-refresh.02";
const ROTATED_ACCESS_EXPIRY = "2026-09-27T12:30:00.000Z";
const ROTATED_REFRESH_EXPIRY = "2026-11-27T12:00:00.000Z";
const OPERATIONS = '{"synthetic":"t06-s2-operation-evidence"}';

function rotatedServiceBody() {
  return {
    account: { id: ACCOUNT_A, displayName: null },
    accessToken: ROTATED_ACCESS,
    accessExpiresAt: ROTATED_ACCESS_EXPIRY,
    refreshToken: ROTATED_REFRESH,
    refreshExpiresAt: ROTATED_REFRESH_EXPIRY,
  };
}

// Canonical UUID shape (lowercase hyphenated), asserted for freshly prepared
// auth keys without pinning their random values.
const CANONICAL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Install a bound version1 grant through the accepted S1 entry, then return
// the installed binding. The caller closes/reopens before S2 use.
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

function expectedPrepareBase64(refreshToken) {
  return Buffer.from(utf8(JSON.stringify({ refreshToken }))).toString("base64");
}

// Start an isolated loopback HTTPS server whose response is gated: the test
// observes durable pending evidence and the single dispatched request while
// the response is held, then releases the gate. The handler only gates;
// request capture is owned by the loopback helper.
async function startGatedSuccessServer() {
  const certPem = readFixtureBytes("test-only-loopback-cert.pem");
  const keyPem = readFixtureBytes("test-only-loopback-key.pem");
  let release = null;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const body = Buffer.from(JSON.stringify(rotatedServiceBody()), "utf8");
  const { server, origin, requests } = await startLoopbackHttps(
    { keyPem, certPem, label: "synthetic-qa-t06-s2 durable pair" },
    (req, res) => {
      void req;
      gate.then(() => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(body);
      });
    },
  );
  return { server, origin, requests, certPem, release };
}

// Parse owner vault bytes as JSON without interpreting them as wire data.
async function readVaultRecord(profile) {
  return JSON.parse(utf8Text(await profile.readVaultBytes()));
}

// Pass-through T04 owner capability that holds the FIRST commit completion
// behind release() while delegating every other call to the real isolated
// owner. Rotation cannot reach T05 handoff until the held prepare commit
// completes. Entry is explicitly observable (hasEntered) and the held commit
// argument bytes are snapshotted at entry; a real owner vault read while
// held establishes those bytes as durable, and the test compares the later
// request to that PRE-release snapshot. The real owner.commit promise is tracked immediately
// and independently of the public promise, so its rejection is always
// observed even while the gate is held. No production seam: plain delegation
// plus test-side promise gates.
function makeCommitGateOwner(owner, track) {
  let releaseCommit = null;
  const commitGate = new Promise((resolve) => {
    releaseCommit = resolve;
  });
  let entered = false;
  let heldBytes = null;
  const adapter = {
    get binding() {
      return owner.binding;
    },
    readVaultBytes: (...args) => owner.readVaultBytes(...args),
    readOperationStoreBytes: (...args) => owner.readOperationStoreBytes(...args),
    commit: (...args) => {
      const pending = owner.commit(...args);
      track(pending);
      if (!entered) {
        entered = true;
        heldBytes =
          args[0] !== undefined && args[0].vaultBytes !== undefined
            ? Buffer.from(args[0].vaultBytes)
            : null;
        return commitGate.then(() => pending);
      }
      return pending;
    },
    bindAccount: (...args) => owner.bindAccount(...args),
    advanceSessionGeneration: (...args) => owner.advanceSessionGeneration(...args),
    keyedIntentDigest: (...args) => owner.keyedIntentDigest(...args),
    close: (...args) => owner.close(...args),
  };
  return {
    adapter,
    hasEntered: () => entered,
    heldBytes: () => heldBytes,
    releaseCommit: () => releaseCommit(),
  };
}

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("T06-S2 durable predecessor/body/key and single dispatch", () => {
  it("prepare completion gates dispatch: no request until the durable commit completes", async () => {
    const { server, origin, requests, certPem, release } = await startGatedSuccessServer();
    let facility = null;
    let profile = null;
    let state = null;
    const owned = new Set();
    const track = (pending) => {
      owned.add(pending);
      const drop = () => owned.delete(pending);
      pending.then(drop, drop);
      return pending;
    };
    // Held open for teardown: the storage gate releases on ALL paths BEFORE
    // owned-work settlement below, so a failing assertion can never leave
    // the owned commit unresolved and hang teardown.
    let commitGate = null;
    let bodyError = null;
    try {
      facility = await createStorageTestFacility();
      profile = await facility.provision(origin);
      const installed = await installS1Grant(profile);
      await profile.close();
      profile = await facility.open(installed);
      const gate = makeCommitGateOwner(profile, track);
      commitGate = gate;
      state = await openRefreshSessionState({
        profile: gate.adapter,
        transportConfig: { origin, testCaPem: certPem },
        clock: liveClock(),
      });
      const rotation = track(state.rotateRefresh(state.binding, freshSignal()));
      // Real gate entry first: the prepare commit must actually be held
      // before any no-dispatch claim means anything.
      await waitForDeadline(() => gate.hasEntered());
      // The entry snapshot is copied commit ARGUMENT bytes, not yet proven
      // durable: read the actual owner vault while completion remains held.
      // That real read queues behind the actual commit and must equal the
      // captured snapshot, establishing durability with dispatch still
      // impossible through the held adapter promise.
      const held = JSON.parse(utf8Text(gate.heldBytes()));
      expect(held.version).toBe(REFRESH_VAULT_VERSION);
      expect(held.binding).toEqual(installed);
      expect(held.pendingRefresh).not.toBe(null);
      expect(await readVaultRecord(profile)).toEqual(held);
      // Bounded no-dispatch while durability is established and held.
      await sleepMs(250);
      expect(requests.length).toBe(0);
      gate.releaseCommit();
      await waitForDeadline(() => requests.length === 1);
      // The later request matches the PRE-release snapshot exactly: the
      // dispatched bytes/key were durable before dispatch was possible.
      const stored = await readVaultRecord(profile);
      expect(stored).toEqual(held);
      expect(requests.length).toBe(1);
      const request = requests[0];
      expect(request.method).toBe("POST");
      expect(request.url).toBe("/v1/auth/refresh");
      expect(Buffer.from(request.body).toString("base64")).toBe(held.pendingRefresh.bodyBase64);
      expect(request.headers["idempotency-key"]).toBe(held.pendingRefresh.authKey);
      release();
      expect(await rotation).toBe(undefined);
      expect(requests.length).toBe(1);
    } catch (error) {
      bodyError = error;
    }
    if (commitGate !== null) commitGate.releaseCommit();
    try {
      release();
    } catch {
      // Gate already released on the success path; teardown continues.
    }
    for (const pending of owned) {
      try {
        await pending;
      } catch {
        // Settlement is owned above; teardown only waits for quiet.
      }
    }
    const steps = [];
    if (state !== null) steps.push(async () => state.invalidate());
    if (profile !== null) steps.push(() => profile.close());
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
  });

  it("persists exact version2 pending content and sends one exact control attempt", async () => {
    const { server, origin, requests, certPem, release } = await startGatedSuccessServer();
    let facility = null;
    let profile = null;
    let state = null;
    const owned = new Set();
    const track = (pending) => {
      owned.add(pending);
      const drop = () => owned.delete(pending);
      pending.then(drop, drop);
      return pending;
    };
    let bodyError = null;
    try {
      facility = await createStorageTestFacility();
      profile = await facility.provision(origin);
      const installed = await installS1Grant(profile);
      await profile.close();
      profile = await facility.open(installed);
      const predecessor = JSON.parse(utf8Text(await profile.readVaultBytes())).grant;
      state = await openRefreshSessionState({
        profile,
        transportConfig: { origin, testCaPem: certPem },
        clock: liveClock(),
      });
      const rotation = track(state.rotateRefresh(state.binding, freshSignal()));
      // The single request arrives while the success response is still
      // gated; dispatch ordering itself is proved by the gate case above.
      await waitForDeadline(() => requests.length === 1);
      const stored = await readVaultRecord(profile);
      expect(stored.version).toBe(REFRESH_VAULT_VERSION);
      expect(stored.binding).toEqual(installed);
      expect(stored.grant).toEqual(predecessor);
      expect(stored.pendingRefresh).not.toBe(null);
      expect(stored.pendingRefresh.predecessor).toEqual(predecessor);
      expect(stored.pendingRefresh.refreshToken).toBe(predecessor.refreshToken);
      const expectedBase64 = expectedPrepareBase64(predecessor.refreshToken);
      expect(stored.pendingRefresh.bodyBase64).toBe(expectedBase64);
      expect(CANONICAL_UUID.test(stored.pendingRefresh.authKey)).toBe(true);
      // The dispatched request carries detached copies of the DURABLE stored
      // body and key: exact path, method, body bytes, and auth key kind.
      expect(requests.length).toBe(1);
      const request = requests[0];
      expect(request.method).toBe("POST");
      expect(request.url).toBe("/v1/auth/refresh");
      expect(Buffer.from(request.body).toString("base64")).toBe(expectedBase64);
      expect(request.headers["idempotency-key"]).toBe(stored.pendingRefresh.authKey);
      release();
      const outcome = await rotation;
      expect(outcome).toBe(undefined);
      expect(requests.length).toBe(1);
    } catch (error) {
      bodyError = error;
    }
    try {
      release();
    } catch {
      // Gate already released on the success path; teardown continues.
    }
    for (const pending of owned) {
      try {
        await pending;
      } catch {
        // Settlement is owned above; teardown only waits for quiet.
      }
    }
    const steps = [];
    if (state !== null) steps.push(async () => state.invalidate());
    if (profile !== null) steps.push(() => profile.close());
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
  });
});

describe("T06-S2 atomic same-account success, operations unchanged", () => {
  it("commits the returned grant with pending null, keeps operation bytes, survives reopen", async () => {
    const { server, origin, requests, certPem, release } = await startGatedSuccessServer();
    let facility = null;
    let profile = null;
    let state = null;
    let bodyError = null;
    try {
      facility = await createStorageTestFacility();
      profile = await facility.provision(origin);
      const installed = await installS1Grant(profile);
      await profile.close();
      profile = await facility.open(installed);
      await profile.commit({ operationBytes: utf8(OPERATIONS) });
      const operationsBefore = await profile.readOperationStoreBytes();
      // A separate test-owned CA view is passed to the facade; the pristine
      // fixture stays reserved for the server and reopened facades.
      const passedCa = Buffer.from(certPem);
      const transportConfig = { origin, testCaPem: passedCa, budgets: { maxAttempts: 1 } };
      state = await openRefreshSessionState({
        profile,
        transportConfig,
        clock: liveClock(),
      });
      // Caller-side mutation after capture must not affect the facade: the
      // nested budgets change to an invalid value and the passed CA view is
      // destroyed IN PLACE, so any reread would fail observably.
      transportConfig.origin = "https://mutated.example.invalid";
      transportConfig.budgets.maxAttempts = 99;
      passedCa.fill(0);
      release();
      const outcome = await state.rotateRefresh(state.binding, freshSignal());
      expect(outcome).toBe(undefined);
      expect(requests.length).toBe(1);
      const stored = await readVaultRecord(profile);
      expect(stored.version).toBe(2);
      // Atomic joint update: the returned same-account grant is installed
      // together with cleared pending evidence; binding never changes.
      expect(stored.binding).toEqual(installed);
      expect(stored.pendingRefresh).toBe(null);
      expect(stored.grant).toEqual({
        accountUuid: ACCOUNT_A,
        accessToken: ROTATED_ACCESS,
        accessExpiresAt: ROTATED_ACCESS_EXPIRY,
        refreshToken: ROTATED_REFRESH,
        refreshExpiresAt: ROTATED_REFRESH_EXPIRY,
      });
      expect(await profile.readOperationStoreBytes()).toEqual(operationsBefore);
      expect(utf8Text(operationsBefore)).toBe(OPERATIONS);
      // Close/reopen checks stored state, NOT replay: the committed grant
      // opens cleanly with no pending and the same binding.
      state.invalidate();
      state = null;
      await profile.close();
      profile = await facility.open(installed);
      const reopened = await readVaultRecord(profile);
      expect(reopened).toEqual(stored);
      expect(await profile.readOperationStoreBytes()).toEqual(operationsBefore);
      const again = await openRefreshSessionState({
        profile,
        transportConfig: { origin, testCaPem: certPem },
        clock: liveClock(),
      });
      try {
        expect(again.binding).toEqual(installed);
      } finally {
        again.invalidate();
      }
    } catch (error) {
      bodyError = error;
    }
    try {
      release();
    } catch {
      // Gate already released on the success path; teardown continues.
    }
    const steps = [];
    if (state !== null) steps.push(async () => state.invalidate());
    if (profile !== null) steps.push(() => profile.close());
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
  });
});

describe("T06-S2 synchronous clock-triggered abort before commit", () => {
  it("abort observed between clock callback and commit prevents commit and dispatch", async () => {
    const { server, origin, requests, certPem, release } = await startGatedSuccessServer();
    let facility = null;
    let profile = null;
    let state = null;
    let bodyError = null;
    try {
      facility = await createStorageTestFacility();
      profile = await facility.provision(origin);
      const installed = await installS1Grant(profile);
      await profile.close();
      profile = await facility.open(installed);
      // The trusted epoch clock aborts the rotation signal synchronously
      // on its first armed query. This proves a representative
      // clock-triggered abort prevents the prepare commit (no write, no
      // dispatch); it does not independently pin the final
      // post-serialization callback site, which source audit verifies.
      const controller = new AbortController();
      const nowMs = CLOCK_LIVE_MS;
      let abortOnRead = false;
      const clock = {
        nowMs: () => {
          if (abortOnRead) controller.abort();
          return nowMs;
        },
      };
      state = await openRefreshSessionState({
        profile,
        transportConfig: { origin, testCaPem: certPem },
        clock,
      });
      const before = await profile.readVaultBytes();
      abortOnRead = true;
      const error = await captureRejection(state.rotateRefresh(state.binding, controller.signal));
      expect(error.code).toBe("operation_interrupted");
      expect(isSessionError(error) || isTransportError(error)).toBe(true);
      expect(requests.length).toBe(0);
      expect(await profile.readVaultBytes()).toEqual(before);
      // Caller-side abort fences nothing: a fresh-signal retry on the same
      // facade proceeds to a single dispatch and success.
      abortOnRead = false;
      release();
      expect(await state.rotateRefresh(state.binding, freshSignal())).toBe(undefined);
      expect(requests.length).toBe(1);
    } catch (error) {
      bodyError = error;
    }
    try {
      release();
    } catch {
      // Gate already released on the success path; teardown continues.
    }
    const steps = [];
    if (state !== null) steps.push(async () => state.invalidate());
    if (profile !== null) steps.push(() => profile.close());
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
  });
});

describe("T06-S2 representative preparation failure", () => {
  it("pre-prepare commit failure reports StorageError, dispatches nothing, leaves vault untouched", async () => {
    const { server, origin, requests, certPem, release } = await startGatedSuccessServer();
    let facility = null;
    let profile = null;
    let state = null;
    let bodyError = null;
    try {
      facility = await createStorageTestFacility();
      profile = await facility.provision(origin);
      const installed = await installS1Grant(profile);
      await profile.close();
      profile = await facility.open(installed);
      const before = await profile.readVaultBytes();
      state = await openRefreshSessionState({
        profile,
        transportConfig: { origin, testCaPem: certPem },
        clock: liveClock(),
      });
      // commit.before.prepare fires before any PREPARED anchor attempt, so
      // the documented T04 semantic is definite old-state io_failure: no
      // durable pending exists and no dispatch may follow.
      await facility.armFault({ point: "commit.before.prepare", action: "throw" });
      const error = await captureRejection(state.rotateRefresh(state.binding, freshSignal()));
      expect(isStorageError(error)).toBe(true);
      expect(isSessionError(error)).toBe(false);
      expect(error.code).toBe("io_failure");
      expect(requests.length).toBe(0);
      expect(await profile.readVaultBytes()).toEqual(before);
      // The T04 failure permanently fences this facade: a same-facade
      // repeat cannot join or start a rotation.
      const repeat = await captureRejection(state.rotateRefresh(state.binding, freshSignal()));
      expect(isSessionError(repeat)).toBe(true);
      expect(repeat.code).toBe("operation_interrupted");
      expect(requests.length).toBe(0);
      await facility.clearFault();
      // Reopened state is the untouched version1 grant with no pending, so
      // a fresh facade opens unblocked (retry itself belongs to the caller;
      // this check dispatches nothing further).
      state.invalidate();
      state = null;
      await profile.close();
      profile = await facility.open(installed);
      expect(await profile.readVaultBytes()).toEqual(before);
      const fresh = await openRefreshSessionState({
        profile,
        transportConfig: { origin, testCaPem: certPem },
        clock: liveClock(),
      });
      try {
        expect(fresh.binding).toEqual(installed);
      } finally {
        fresh.invalidate();
      }
      expect(requests.length).toBe(0);
    } catch (error) {
      bodyError = error;
    }
    try {
      release();
    } catch {
      // Gate was never needed on this path; teardown continues.
    }
    const steps = [];
    if (state !== null) steps.push(async () => state.invalidate());
    if (profile !== null) steps.push(() => profile.close());
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
  });
});
