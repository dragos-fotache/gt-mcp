/* global AbortController */
import { describe, it, expect } from "vitest";
import { openToolRuntime } from "../../../dist/runtime/index.js";
import { fixture, args } from "./s2-fixture.mjs";
describe("T21 failure stops dependent HTTPS steps", () => {
  for (const [setting, code, unknown] of [
    ["reject", "invalid_state", false],
    ["malformed", "internal_error", true],
  ])
    it(
      setting,
      async () => {
        const f = await fixture();
        let runtime;
        try {
          f.state[setting] = "populate";
          runtime = await openToolRuntime({ configPath: f.configPath });
          const result = await runtime.createRoutine(args(), new AbortController().signal);
          expect(result).toMatchObject({
            ok: false,
            error: { code, retryable: false, lastConfirmedStep: "draft", outcomeUnknown: unknown },
          });
          expect(f.mutations().map((r) => r.method)).toEqual(["POST", "PUT"]);
        } finally {
          await runtime?.close();
          await f.close();
        }
      },
      30000,
    );
});
