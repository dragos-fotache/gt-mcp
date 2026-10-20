/* global AbortController */
import { describe, it, expect } from "vitest";
import { openToolRuntime } from "../../../dist/runtime/index.js";
import { fixture, args } from "../t10/s2-fixture.mjs";
describe("T21 credential reopen does not resume creation", () => {
  it("reopen sends nothing and an explicit next call starts fresh", async () => {
    const f = await fixture();
    let runtime;
    try {
      f.state.reject = "populate";
      runtime = await openToolRuntime({ configPath: f.configPath });
      const first = await runtime.createRoutine(args(), new AbortController().signal);
      expect(first.ok).toBe(false);
      await runtime.close();
      const count = f.requests.length;
      f.state.reject = null;
      runtime = await openToolRuntime({ configPath: f.configPath });
      expect(f.requests).toHaveLength(count);
      const second = await runtime.createRoutine(args(), new AbortController().signal);
      expect(second.ok).toBe(true);
      expect(second.data.routineId).not.toBe(first.error.routineId);
      await runtime.close();
      runtime = null;
      expect(await f.inspect()).toEqual(["credentials.enc", "owner.lock"]);
    } finally {
      await runtime?.close();
      await f.close();
    }
  }, 30000);
});
