// T01 QA: interception calibration mirror (approved spec §3).
//
// Vitest twin of the plain-node calibration runner: replays the same QA-owned
// synthetic probes against the interception preload and asserts each violation
// class is actually detected. Runs with the independent suite post-relay; the
// plain-node runner (`run-calibration.mjs`) provides the same evidence now.
// No production targets are executed here — only QA fixture probes.

import { describe, expect, it } from "vitest";
import { evalArgs, reportViolations, runNode } from "./harness.mjs";
import { CASES } from "./calibration-cases.mjs";

describe("T01 interception calibration (QA-owned probes only)", () => {
  for (const probe of CASES) {
    it(probe.name, { timeout: 30000 }, () => {
      const run = runNode({ args: evalArgs(probe.code) });
      expect(run.spawnError).toBeNull();
      const violations = reportViolations(run.report);
      if (probe.expectExit !== undefined) {
        expect(run.exitCode, `exit code (signal ${run.signal})`).toBe(probe.expectExit);
      }
      if (probe.expectExitNonZero) {
        expect(run.exitCode, `expected nonzero exit (signal ${run.signal})`).not.toBe(0);
        expect(run.exitCode).not.toBeNull();
      }
      for (const wanted of probe.expectViolations ?? []) {
        expect(
          violations.some((v) => v.includes(wanted)),
          `expected a violation containing ${JSON.stringify(wanted)}; observed ${JSON.stringify(violations)}`,
        ).toBe(true);
      }
      if (probe.expectClean) {
        expect(violations, "expected a clean intercept report").toEqual([]);
      }
      if (probe.expectOut !== undefined) {
        expect(run.stdout).toBe(probe.expectOut);
      }
    });
  }
});
