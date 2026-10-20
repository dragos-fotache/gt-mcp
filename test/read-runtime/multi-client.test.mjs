/* global AbortController */
import fs from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { describe, it, expect } from "vitest";
import { openReadRuntime, openToolRuntime } from "../../dist/runtime/index.js";
import { signOutProfile } from "../../dist/lifecycle/index.js";
import { fixture, args, signal } from "../fault/t15/s1-helpers.mjs";
import { signIn } from "../login/configured-helpers.mjs";
import { prepareIsolatedProfile } from "./fixtures.mjs";

describe("S2 per-invocation credential ownership", () => {
  it("two idle runtimes release startup ownership and remain usable independently", async () => {
    const f = await fixture();
    let first, second;
    try {
      first = await openReadRuntime({ configPath: f.configPath });
      second = await openReadRuntime({ configPath: f.configPath });
      const owner = await f.open();
      await owner.close();
      expect(f.requests).toHaveLength(0);
      expect((await first.listRoutines({}, signal())).ok).toBe(true);
      await first.close();
      expect((await second.listRoutines({}, signal())).ok).toBe(true);
      expect(f.requests).toHaveLength(2);
    } finally {
      await first?.close();
      await second?.close();
      await f.close();
    }
  });

  it("keeps ownership across a held creation while a second runtime waits", async () => {
    const f = await fixture();
    let first, second, creating, reading;
    try {
      first = await openToolRuntime({ configPath: f.configPath });
      second = await openReadRuntime({ configPath: f.configPath });
      f.state.hold = "draft";
      creating = first.createRoutine(args(), signal());
      await f.entered;
      const count = f.requests.length;
      reading = second.listRoutines({}, signal());
      await delay(75);
      expect(f.requests).toHaveLength(count);
      await expect(f.open()).rejects.toMatchObject({ code: "locked_by_other_owner" });
      await expect(signOutProfile({ configPath: f.configPath }, signal())).rejects.toMatchObject({
        code: "locked_by_other_owner",
      });
      f.release();
      expect((await creating).ok).toBe(true);
      expect((await reading).ok).toBe(true);
      expect(f.mutations()).toHaveLength(3);
    } finally {
      f.release();
      await Promise.allSettled([creating, reading]);
      await first?.close();
      await second?.close();
      await f.close();
    }
  });

  it("validates and denies writes before waiting; cancellation and close stop queued calls", async () => {
    const f = await fixture({ writesEnabled: false });
    let runtime, owner;
    try {
      runtime = await openToolRuntime({ configPath: f.configPath });
      owner = await f.open();
      expect((await runtime.listRoutines({ limit: "bad" }, signal())).error.code).toBe(
        "invalid_arguments",
      );
      expect((await runtime.createRoutine(args(), signal())).error).toMatchObject({
        code: "configuration_required",
        retryable: false,
      });
      const controller = new AbortController();
      const pending = runtime.listRoutines({}, controller.signal);
      await delay(75);
      controller.abort("synthetic-private-reason");
      expect((await pending).error).toMatchObject({
        code: "operation_interrupted",
        retryable: true,
      });
      expect(f.requests).toHaveLength(0);
      await owner.close();
      owner = null;
      expect((await runtime.listRoutines({}, signal())).ok).toBe(true);
      owner = await f.open();
      const queued = runtime.listRoutines({}, signal());
      await delay(75);
      await runtime.close();
      expect((await queued).error.code).toBe("operation_interrupted");
      expect(f.requests).toHaveLength(1);
      // The waiter's close must not terminate the independent incumbent.
      expect((await owner.readVaultBytes()).byteLength).toBeGreaterThan(0);
    } finally {
      await owner?.close();
      await runtime?.close();
      await f.close();
    }
  });

  it("observes sign-out and same-account reauthentication without retaining old credentials", async () => {
    const f = await fixture();
    let runtime;
    try {
      runtime = await openReadRuntime({ configPath: f.configPath });
      expect((await runtime.listRoutines({}, signal())).ok).toBe(true);
      const next = await signOutProfile({ configPath: f.configPath }, signal());
      expect(next.sessionGeneration).toBeGreaterThan(f.binding.sessionGeneration);
      const count = f.requests.length;
      expect((await runtime.listRoutines({}, signal())).error.code).toBe("authentication_required");
      expect(f.requests).toHaveLength(count);
      const authenticated = await signIn(f);
      expect(authenticated.sessionGeneration).toBeGreaterThan(next.sessionGeneration);
      expect((await runtime.listRoutines({}, signal())).ok).toBe(true);
    } finally {
      await runtime?.close();
      await f.close();
    }
  });

  it("refuses a recreated same-account profile at the same path", async () => {
    const f = await fixture();
    let runtime;
    try {
      runtime = await openReadRuntime({ configPath: f.configPath });
      fs.renameSync(f.storage.profileRoot, f.storage.profileRoot + "-retained-synthetic");
      const replacement = await prepareIsolatedProfile({
        profileRoot: f.storage.profileRoot,
        busAddress: f.storage.secretServiceBusAddress,
        origin: f.origin,
        grantBytes: Buffer.from(JSON.stringify(f.grant)),
      });
      expect(replacement.profileGenerationId).not.toBe(f.binding.profileGenerationId);
      expect((await runtime.listRoutines({}, signal())).error.code).toBe("recovery_unavailable");
      expect(f.requests).toHaveLength(0);
    } finally {
      await runtime?.close();
      await f.close();
    }
  });
});
