/* global AbortController */
import { describe, it, expect } from "vitest";
import { openToolRuntime } from "../../../dist/runtime/index.js";
import { fixture, args } from "./s1-helpers.mjs";
describe("T21 configured runtime write boundary", () => {
  it.each([false, true])(
    "startup writesEnabled %s gates mutations",
    async (enabled) => {
      const f = await fixture({ writesEnabled: enabled });
      let runtime;
      try {
        runtime = await openToolRuntime({ configPath: f.configPath });
        f.config.writesEnabled = !enabled;
        f.write(f.config);
        const result = await runtime.createRoutine(args(), new AbortController().signal);
        expect(result.ok).toBe(enabled);
        if (!enabled)
          expect(result.error).toMatchObject({ code: "configuration_required", retryable: false });
        expect(f.mutations()).toHaveLength(enabled ? 3 : 0);
      } finally {
        await runtime?.close();
        await f.close();
      }
    },
    30000,
  );
  it("cancellation stops unsent steps without a recovery record", async () => {
    const f = await fixture();
    let runtime;
    try {
      f.state.hold = "draft";
      runtime = await openToolRuntime({ configPath: f.configPath });
      const controller = new AbortController();
      const running = runtime.createRoutine(args(), controller.signal);
      await f.entered;
      controller.abort();
      f.release();
      const result = await running;
      expect(result.error).toMatchObject({ code: "operation_interrupted", retryable: false });
      expect(f.mutations()).toHaveLength(1);
      await runtime.close();
      runtime = null;
      expect(await f.inspect()).toEqual(["credentials.enc", "owner.lock"]);
    } finally {
      f.release();
      await runtime?.close();
      await f.close();
    }
  }, 30000);
});
