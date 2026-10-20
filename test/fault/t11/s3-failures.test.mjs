/* global AbortController */
import { describe, it, expect } from "vitest";
import { openToolRuntime } from "../../../dist/runtime/index.js";
import { fixture, args } from "../t10/s2-fixture.mjs";
describe("T21 visibility failure", () => {
  it("rejects invisible references before any mutation", async () => {
    const f = await fixture();
    let runtime;
    try {
      f.state.invisible = true;
      runtime = await openToolRuntime({ configPath: f.configPath });
      expect(await runtime.createRoutine(args(), new AbortController().signal)).toEqual({
        ok: false,
        error: { code: "invalid_reference", retryable: false },
      });
      expect(f.mutations()).toEqual([]);
    } finally {
      await runtime?.close();
      await f.close();
    }
  }, 30000);
});
