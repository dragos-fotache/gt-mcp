/* global AbortController */
import fs from "node:fs";
import { describe, it, expect } from "vitest";
import { openToolRuntime } from "../../../dist/runtime/index.js";
import { fixture, args } from "./s2-fixture.mjs";
describe("T21 actual credential owner and HTTPS creation", () => {
  it("creates twice with fresh identity and no operation record", async () => {
    const f = await fixture();
    let runtime;
    try {
      const before = fs.readFileSync(`${f.storage.profileRoot}/credentials.enc`);
      runtime = await openToolRuntime({ configPath: f.configPath });
      const first = await runtime.createRoutine(args(), new AbortController().signal),
        second = await runtime.createRoutine(args(), new AbortController().signal);
      expect(first.ok && second.ok).toBe(true);
      expect(first.data.routineId).not.toBe(second.data.routineId);
      expect(f.mutations().map((r) => r.method)).toEqual([
        "POST",
        "PUT",
        "POST",
        "POST",
        "PUT",
        "POST",
      ]);
      expect(new Set(f.mutations().map((r) => r.key)).size).toBe(6);
      const body = JSON.parse(f.mutations()[1].body);
      expect(body.name).toBe(args().name);
      expect(body.isDraft).toBe(true);
      expect(body.exercises.map((e) => [e.position, e.restDurationSeconds, e.sets])).toEqual([
        [
          0,
          30,
          [{ id: body.exercises[0].sets[0].id, position: 0, repetitions: null, weightKg: null }],
        ],
        [1, 30, []],
      ]);
      await runtime.close();
      runtime = null;
      expect(await f.inspect()).toEqual(["credentials.enc", "owner.lock"]);
      expect(fs.readFileSync(`${f.storage.profileRoot}/credentials.enc`)).toEqual(before);
    } finally {
      await runtime?.close();
      await f.close();
    }
  }, 30000);
  it("uses the same exact bytes/key for the existing one-refresh HTTP retry", async () => {
    const f = await fixture();
    let runtime;
    try {
      f.state.authRetry = "populate";
      f.config.transportBudgets = {
        maxAttempts: 2,
        perAttemptTimeoutMs: 2000,
        totalDeadlineMs: 5000,
      };
      f.write(f.config);
      runtime = await openToolRuntime({ configPath: f.configPath });
      const outcome = await runtime.createRoutine(args(), new AbortController().signal);
      expect(outcome).toMatchObject({ ok: true });
      expect(f.requests.filter((r) => r.target === "/v1/auth/refresh")).toHaveLength(1);
      const puts = f.mutations().filter((r) => r.method === "PUT");
      expect(puts).toHaveLength(2);
      expect(puts[0].key).toBe(puts[1].key);
      expect(puts[0].body.equals(puts[1].body)).toBe(true);
    } finally {
      await runtime?.close();
      await f.close();
    }
  }, 30000);
  it("rate limiting stops creation without expanding the auth facade retry policy", async () => {
    const f = await fixture();
    let runtime;
    try {
      f.state.rateLimited = "populate";
      runtime = await openToolRuntime({ configPath: f.configPath });
      expect(await runtime.createRoutine(args(), new AbortController().signal)).toMatchObject({
        ok: false,
        error: {
          code: "rate_limited",
          retryable: false,
          retryAfterSeconds: 1,
          lastConfirmedStep: "draft",
          outcomeUnknown: false,
        },
      });
      expect(f.mutations().map((r) => r.method)).toEqual(["POST", "PUT"]);
    } finally {
      await runtime?.close();
      await f.close();
    }
  }, 30000);
});
