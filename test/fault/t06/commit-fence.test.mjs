// T06-S1 QA fault 01 — durable commit fence and isolated boundary
// integration (SOURCE-READY, HOLD: authored against the settled work-order
// public API plus the accepted T04 diagnostic facility and T05 transport,
// never executed before the coordinator's named frozen relay).
//
// Spec basis: work-order "Proportional acceptance" items 2–3 and sections
// "Vault version and grant validation" (fence-before-transition, one
// bindAccount, storage-failure propagation, cancellation semantics) and
// "Hooks and fences" (T05 composition, response suppression).
//
// Boundaries: the already-accepted T04 diagnostic facility proves the
// auth/persistence boundary (NOT new Secret Service qualification); the
// unchanged accepted T05 transport proves the read/fence HTTP boundary.
// Synthetic data only; no creation; no general interceptor/proxy/fault
// cross-product framework; no personal provider.

import { describe, expect, it } from "vitest";
import { isSessionError, openSessionState } from "../../../dist/auth/index.js";
import { isStorageError } from "../../../dist/storage/index.js";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import { createBackendTransport, isTransportError } from "../../../dist/http/index.js";
import {
  closeServer,
  readFixtureBytes,
  startLoopbackHttps,
  waitForDeadline,
} from "../t05/helpers.mjs";
import {
  ACCOUNT_B,
  BEARER_A,
  ORIGIN,
  captureRejection,
  freshSignal,
  grantBodyBytes,
  liveClock,
  teardownAll,
  utf8,
  utf8Text,
} from "../../unit/t06/helpers.mjs";

// Visibly synthetic canonical UUIDs for the HTTP boundary (listed here, so
// synthetic by provenance, never by malformed spelling).
const ROUTINE_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const RESOURCE_KEY = "33333333-3333-4333-8333-333333333333";

function routineRecord() {
  return {
    id: ROUTINE_ID,
    name: "",
    isDraft: true,
    revision: 1,
    exercises: [],
  };
}

describe("T06-S1 real T04 diagnostic persistence integration", () => {
  it("installs, closes, reopens with exact expiries, binding, and operations", async () => {
    const facility = await createStorageTestFacility();
    let profile = null;
    try {
      profile = await facility.provision(ORIGIN);
      const issued = profile.binding.profileGenerationId;
      const operations = utf8('{"synthetic":"operation-evidence"}');
      await profile.commit({ operationBytes: operations });
      const installer = await openSessionState({
        profile,
        clock: liveClock(),
      });
      const installed = await installer.installInitialGrant(
        installer.binding,
        grantBodyBytes(),
        freshSignal(),
      );
      expect(installed).toEqual({
        origin: ORIGIN,
        accountUuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        sessionGeneration: 1,
        profileGenerationId: issued,
      });
      installer.invalidate();
      await profile.close();
      profile = await facility.open(installed);
      expect(await profile.readOperationStoreBytes()).toEqual(operations);
      const vaultText = utf8Text(await profile.readVaultBytes());
      expect(vaultText).toContain("2026-09-27T12:15:00.000Z");
      expect(vaultText).toContain("2026-10-27T12:00:00.000Z");
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
});

describe("T06-S1 representative commit-failure fence", () => {
  it("pre-prepare failure keeps old state, fences the facade, reports io_failure", async () => {
    // commit.before.prepare fires before any PREPARED anchor attempt, so the
    // documented T04 semantic is definite old-state io_failure (not an
    // ambiguous durable failure): the owner stays readable and the S1
    // facade is permanently fenced with no vault/binding mutation.
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
        await facility.armFault({
          point: "commit.before.prepare",
          action: "throw",
        });
        const error = await captureRejection(
          state.installInitialGrant(state.binding, grantBodyBytes(), freshSignal()),
        );
        expect(isStorageError(error)).toBe(true);
        expect(isSessionError(error)).toBe(false);
        expect(error.code).toBe("io_failure");
        expect(state.hooks.isCurrent(state.binding)).toBe(false);
        expect((await profile.readVaultBytes()).length).toBe(0);
        expect(state.binding).toEqual(preAuth);
      } finally {
        state.invalidate();
        await facility.clearFault();
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
});

describe("T06-S1 real T05 read/fence HTTP integration", () => {
  async function withInstalledLoopback(fn) {
    const certPem = readFixtureBytes("test-only-loopback-cert.pem");
    const keyPem = readFixtureBytes("test-only-loopback-key.pem");
    let release = null;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const { server, origin, requests } = await startLoopbackHttps(
      { keyPem, certPem, label: "synthetic-qa-t06-s1 loopback pair" },
      (req, res) => {
        // Body capture is owned by the loopback helper; the handler only
        // gates the response so dispatch-vs-delivery fences are observable.
        void req;
        gate.then(() => {
          const body = Buffer.from(JSON.stringify(routineRecord()), "utf8");
          res.writeHead(200, { "content-type": "application/json" });
          res.end(body);
        });
      },
    );
    // Owned in-flight transport calls are tracked so a wait/assertion
    // failure still settles them: invalidate first (fences delivery), then
    // release the gate, then await settlement before teardown. Teardown
    // attempts every step and propagates the first failure without
    // masking the test body's own failure.
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
      state = await openSessionState({
        profile,
        clock: liveClock(),
      });
      const transport = createBackendTransport(
        { origin, testCaPem: new Uint8Array(certPem) },
        { session: state.hooks },
      );
      await fn({ transport, state, installed, requests, release, track });
    } catch (error) {
      bodyError = error;
    }
    if (state !== null) state.invalidate();
    release();
    await Promise.allSettled([...owned]);
    const steps = [];
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
  }

  it("dispatches a valid bearer read with the exact stored token", async () => {
    await withInstalledLoopback(async ({ transport, installed, requests, release, track }) => {
      const pending = track(transport.getRoutine(installed, ROUTINE_ID, freshSignal()));
      await waitForDeadline(() => requests.length > 0);
      release();
      const result = await pending;
      expect(result.status).toBe(200);
      expect(result.data.id).toBe(ROUTINE_ID);
      expect(requests.length).toBe(1);
      expect(requests[0].headers.authorization).toBe(`Bearer ${BEARER_A}`);
    });
  });

  it("suppresses delivery when invalidated after dispatch before response", async () => {
    await withInstalledLoopback(
      async ({ transport, state, installed, requests, release, track }) => {
        const pending = track(transport.getRoutine(installed, ROUTINE_ID, freshSignal()));
        await waitForDeadline(() => requests.length > 0);
        state.invalidate();
        release();
        const error = await captureRejection(pending);
        expect(isTransportError(error)).toBe(true);
        expect(error.code).toBe("operation_interrupted");
        expect(requests.length).toBe(1);
      },
    );
  });

  it("rejects a foreign binding before dispatch as operation_interrupted", async () => {
    await withInstalledLoopback(async ({ transport, installed, requests, release }) => {
      // T05 maps the rejected fence hook to operation_interrupted, not to
      // a credential error; nothing is dispatched.
      const error = await captureRejection(
        transport.getRoutine({ ...installed, accountUuid: ACCOUNT_B }, ROUTINE_ID, freshSignal()),
      );
      expect(isTransportError(error)).toBe(true);
      expect(error.code).toBe("operation_interrupted");
      expect(requests.length).toBe(0);
      release();
    });
  });

  it("withholds credentials on mutation routes as authentication_required", async () => {
    await withInstalledLoopback(async ({ transport, installed, requests, release }) => {
      // Current live capture with a mutation route: S1 selects null, so
      // T05 reports missing/invalid credential material. This case runs
      // on an unfenced facade, isolated from the fence cases above.
      const error = await captureRejection(
        transport.createDraft(
          installed,
          ROUTINE_ID,
          utf8(JSON.stringify({ id: ROUTINE_ID })),
          RESOURCE_KEY,
          freshSignal(),
        ),
      );
      expect(isTransportError(error)).toBe(true);
      expect(error.code).toBe("authentication_required");
      expect(requests.length).toBe(0);
      release();
    });
  });
});
