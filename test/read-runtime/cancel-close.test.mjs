// T08-S1 QA: cancellation/fence/close/release (spec section 5).
// Same-process isolated build (provisioned profile + held synthetic HTTPS +
// installed relay-prepared grant) gives real boundary synchronization: a held
// read MUST settle operation_interrupted on abort/close with no late success
// after release; malformed input MUST dispatch nothing (live and expired
// grants); begun durable refresh MUST settle safely under close; effective
// paging/filter/token context MUST be observable on the wire; the default
// search MUST carry limit=20. Reopen after release MUST succeed. Unconfigured
// close is idempotent. Relay trust via NODE_EXTRA_CA_CERTS; NOT RUN now.
/* global AbortController, setTimeout */

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { expectExactErr, expectOkEnvelope, requiredEnv } from "./helpers.mjs";
import {
  EXPECTED_SEARCH_PAGE,
  EXPECTED_SEARCH_PAGE_LAST,
  SYNTHETIC_UUIDS,
  createHeldFixture,
  prepareIsolatedProfile,
  s1RelayResponder,
  writeStartupPair,
} from "./fixtures.mjs";
import { openReadRuntime } from "../../dist/runtime/index.js";

async function buildIsolatedRuntime(grantFileEnv) {
  const base = requiredEnv("GT_S1_ISOLATED_BASE");
  const busAddress = requiredEnv("GT_S1_TEST_BUS");
  const grantBytes = new Uint8Array(fs.readFileSync(requiredEnv(grantFileEnv)));
  const key = new Uint8Array(fs.readFileSync(requiredEnv("GT_S1_FIXTURE_KEY_FILE")));
  const cert = new Uint8Array(fs.readFileSync(requiredEnv("GT_S1_FIXTURE_CERT_FILE")));
  const scratch = fs.mkdtempSync(path.join(base, "gt-s1-qa-"));
  fs.chmodSync(scratch, 0o700);
  const acquired = { fixture: null };
  const releasePartial = async (setupError) => {
    // Conservative posture: owner release cannot be established on this path
    // (prepareIsolatedProfile may have rejected on profile.close, or
    // openReadRuntime on startup-owner close). The scratch holding durable
    // roots is ALWAYS retained for later named private relay cleanup after
    // confirmed release. Listener closure is attempted but is not
    // owner-release proof. Summaries stay fixed/safe: no native or private
    // path detail is interpolated.
    let listenerFailed = false;
    if (acquired.fixture) {
      try {
        await acquired.fixture.close();
      } catch {
        listenerFailed = true;
      }
      acquired.fixture = null;
    }
    if (listenerFailed) {
      throw new Error(
        "BLOCKED: isolated setup failed and listener teardown failed; scratch retained for private relay cleanup",
        { cause: setupError },
      );
    }
    throw setupError;
  };
  try {
    const profileRoot = path.join(scratch, "profile");
    const anchorRoot = path.join(scratch, "anchor");
    const fixture = createHeldFixture({ key, cert });
    acquired.fixture = fixture;
    const origin = await fixture.listen();
    fixture.setResponder(s1RelayResponder);
    const profileGenerationId = randomUUID();
    const binding = await prepareIsolatedProfile({
      profileRoot,
      anchorRoot,
      busAddress,
      origin,
      profileGenerationId,
      grantBytes,
    });
    const { configPath } = writeStartupPair({
      dir: scratch,
      origin,
      profileRoot,
      anchorRoot,
      busAddress,
      descriptorBinding: binding,
    });
    const rt = await openReadRuntime({ configPath });
    return {
      rt,
      fixture,
      scratch,
      configPath,
      async cleanup() {
        // Release every remaining resource despite an earlier close error,
        // preserving the first failure; close() itself settles durable work.
        // Durable roots are removed only after the owner release succeeded.
        let firstError = null;
        try {
          await rt.close();
        } catch (e) {
          firstError = e;
        }
        try {
          await fixture.close();
        } catch (e) {
          firstError ??= e;
        }
        if (!firstError) {
          try {
            fs.rmSync(scratch, { recursive: true, force: true });
          } catch (e) {
            firstError = e;
          }
        }
        if (firstError) throw firstError;
      },
    };
  } catch (setupError) {
    await releasePartial(setupError);
  }
}

async function waitForRequests(fixture, count) {
  for (let i = 0; i < 200 && fixture.requests.length < count; i++) {
    await new Promise((r) => setTimeout(r, 10));
  }
  expect(fixture.requests.length).toBe(count);
}

async function waitForRefreshRequest(fixture) {
  let refresh = null;
  for (let i = 0; i < 200 && !refresh; i++) {
    refresh = fixture.requests.find(
      (r) => r.method === "POST" && (r.target ?? "").startsWith("/v1/auth/refresh"),
    );
    if (!refresh) await new Promise((r) => setTimeout(r, 10));
  }
  expect(refresh).toBeDefined();
  expect(refresh.method).toBe("POST");
  expect(refresh.target.startsWith("/v1/auth/refresh")).toBe(true);
  return refresh;
}

describe("S1 cancellation and close", () => {
  it("close is idempotent and unconfigured close performs no storage action", async () => {
    const rt = await openReadRuntime({});
    await rt.close();
    await rt.close();
  });

  it("malformed input dispatches nothing at the isolated boundary", async () => {
    const built = await buildIsolatedRuntime("GT_S1_GRANT_BYTES_FILE");
    try {
      const res = await built.rt.searchExercises({ limit: "20" }, new AbortController().signal);
      expectExactErr(res, "invalid_arguments", false);
      expect(built.fixture.requests.length).toBe(0);
    } finally {
      await built.cleanup();
    }
  });

  it("malformed input with an expired grant prepares no refresh or request", async () => {
    const built = await buildIsolatedRuntime("GT_S1_EXPIRED_GRANT_BYTES_FILE");
    try {
      const res = await built.rt.searchExercises({ limit: "20" }, new AbortController().signal);
      expectExactErr(res, "invalid_arguments", false);
      expect(built.fixture.requests.length).toBe(0);
    } finally {
      await built.cleanup();
    }
  });

  it("default search carries limit=20 and maps the held first page", async () => {
    const built = await buildIsolatedRuntime("GT_S1_GRANT_BYTES_FILE");
    try {
      const res = await built.rt.searchExercises({}, new AbortController().signal);
      expectOkEnvelope(res);
      expect(res.data).toEqual(EXPECTED_SEARCH_PAGE);
      const last = built.fixture.requests[built.fixture.requests.length - 1];
      expect(last.target).toMatch(/limit=20/);
    } finally {
      await built.cleanup();
    }
  });

  it("effective filter/limit/token context is observable on the wire", async () => {
    const built = await buildIsolatedRuntime("GT_S1_GRANT_BYTES_FILE");
    try {
      const signal = new AbortController().signal;
      const first = await built.rt.searchExercises(
        {
          search: "Synthetic",
          muscleGroupIds: [SYNTHETIC_UUIDS.muscle],
          limit: 2,
        },
        signal,
      );
      expectOkEnvelope(first);
      expect(first.data).toEqual(EXPECTED_SEARCH_PAGE);
      const firstTarget = built.fixture.requests[built.fixture.requests.length - 1].target;
      expect(firstTarget).toMatch(/q=synthetic/);
      expect(firstTarget).toMatch(new RegExp(`muscleGroupId=${SYNTHETIC_UUIDS.muscle}`));
      expect(firstTarget).toMatch(/limit=2/);
      const second = await built.rt.searchExercises(
        {
          search: "Synthetic",
          muscleGroupIds: [SYNTHETIC_UUIDS.muscle],
          limit: 2,
          pageToken: first.data.nextPageToken,
        },
        signal,
      );
      expectOkEnvelope(second);
      expect(second.data).toEqual(EXPECTED_SEARCH_PAGE_LAST);
      const secondTarget = built.fixture.requests[built.fixture.requests.length - 1].target;
      expect(secondTarget).toMatch(/q=synthetic/);
      expect(secondTarget).toMatch(new RegExp(`muscleGroupId=${SYNTHETIC_UUIDS.muscle}`));
      expect(secondTarget).toMatch(/limit=2/);
      expect(secondTarget).toMatch(/pageToken=synthetic-continuation-1/);
    } finally {
      await built.cleanup();
    }
  });

  it("aborted held read settles interrupted with no late success", async () => {
    const built = await buildIsolatedRuntime("GT_S1_GRANT_BYTES_FILE");
    try {
      const release = built.fixture.holdNext();
      const controller = new AbortController();
      const pending = built.rt.searchExercises({ limit: 5 }, controller.signal);
      await waitForRequests(built.fixture, 1);
      controller.abort();
      const settled = await pending;
      expectExactErr(settled, "operation_interrupted", true);
      expect(built.fixture.requests.length).toBe(1);
      release();
      await new Promise((r) => setTimeout(r, 50));
      const fresh = await built.rt.searchExercises({}, new AbortController().signal);
      expectOkEnvelope(fresh);
      expect(fresh.data).toEqual(EXPECTED_SEARCH_PAGE);
    } finally {
      await built.cleanup();
    }
  });

  it("close during a held read resolves and suppresses the late success", async () => {
    const built = await buildIsolatedRuntime("GT_S1_GRANT_BYTES_FILE");
    let releaseGate = null;
    try {
      releaseGate = built.fixture.holdNext();
      const pending = built.rt.searchExercises({ limit: 5 }, new AbortController().signal);
      await waitForRequests(built.fixture, 1);
      await built.rt.close();
      const settled = await pending;
      expectExactErr(settled, "operation_interrupted", true);
    } finally {
      if (releaseGate) releaseGate();
      await new Promise((r) => setTimeout(r, 50));
      await built.cleanup();
    }
  });

  it("begun durable refresh settles safely under close; owner reopens", async () => {
    const built = await buildIsolatedRuntime("GT_S1_EXPIRED_GRANT_BYTES_FILE");
    const releaseGates = [];
    try {
      // One deterministic scenario: expired access forces a live refresh
      // dispatch; the held refresh request is the begun owned durable work.
      // Two gates cover either dispatch order; the POST /v1/auth/refresh
      // oracle below pins the actual refresh request.
      releaseGates.push(built.fixture.holdNext(), built.fixture.holdNext());
      const pending = built.rt.searchExercises({ limit: 5 }, new AbortController().signal);
      await waitForRefreshRequest(built.fixture);
      await built.rt.close();
      const settled = await pending;
      expectExactErr(settled, "operation_interrupted", true);
      for (const release of releaseGates) release();
      releaseGates.length = 0;
      await new Promise((r) => setTimeout(r, 50));
      // The released owner is acquirable again: reopening the same prepared
      // config must succeed and close cleanly.
      const reopened = await openReadRuntime({ configPath: built.configPath });
      await reopened.close();
    } finally {
      for (const release of releaseGates) release();
      await new Promise((r) => setTimeout(r, 50));
      await built.cleanup();
    }
  });

  it("closed runtime rejects new reads as operation_interrupted", async () => {
    const rt = await openReadRuntime({
      configPath: requiredEnv("GT_S1_CONFIGURED_CONFIG"),
    });
    await rt.close();
    const res = await rt.getExercise(
      { exerciseId: SYNTHETIC_UUIDS.exerciseA },
      new AbortController().signal,
    );
    expectExactErr(res, "operation_interrupted", true);
  });

  it("second explicit opener succeeds after first release", async () => {
    const configPath = requiredEnv("GT_S1_CONFIGURED_CONFIG");
    const first = await openReadRuntime({ configPath });
    await first.close();
    const second = await openReadRuntime({ configPath });
    try {
      const res = await second.searchExercises({}, new AbortController().signal);
      expectOkEnvelope(res);
    } finally {
      await second.close();
    }
  });
});
