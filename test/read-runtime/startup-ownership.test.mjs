// T08-S1 QA: existing owner/auth boundary (spec section 3).
// Null-account/empty-grant yields authenticated-unavailable runtime
// (authentication_required on reads, exact). Conflicting owner binding is a
// storage opening failure (recovery_unavailable, exact); stale descriptor
// binding is incompatible metadata (configuration_required, exact). Prepared
// isolated inputs are REQUIRED; missing env BLOCKS the test, never passes.
// Isolated provider/store/HTTPS required; NOT RUN now.
/* global AbortController */

import { describe, expect, it } from "vitest";

import { expectExactErr, requiredEnv } from "./helpers.mjs";
import { openReadRuntime } from "../../dist/runtime/index.js";

describe("S1 owner/auth boundary", () => {
  it("signed-out (null-account) configured runtime reports authentication_required", async () => {
    const rt = await openReadRuntime({
      configPath: requiredEnv("GT_S1_SIGNED_OUT_CONFIG"),
    });
    try {
      const res = await rt.listRoutines({}, new AbortController().signal);
      expectExactErr(res, "authentication_required", false);
    } finally {
      await rt.close();
    }
  });

  it("conflicting owner binding fails recovery_unavailable without reset/provision", async () => {
    await expect(
      openReadRuntime({ configPath: requiredEnv("GT_S1_CONFLICT_CONFIG") }),
    ).rejects.toMatchObject({
      name: "ReadRuntimeError",
      code: "recovery_unavailable",
    });
  });
});
