// T02 QA: gate failure + approval dismissal/cancellation/timeout (spec §§6-8).
//
// handler-failure runs genuine PTY: an actual gate exception/error (reason
// error) must block before any effect — fail-closed, never fail-open.
// Dismiss/cancel/timeout share stimulus genuine-pty under the exact schema;
// they are distinguished by approval_prompt decision=deny with DISTINCT reason
// values (dismiss/cancel/timeout), compared against the invoked trigger.
// Late approval after cancellation must not dispatch.

import { describe, expect, it } from "vitest";
import { cleanup, runScenario } from "./helpers/spawn-report.mjs";
import {
  creationCalls,
  expectCleanup,
  expectEnvelope,
  expectNoEffectOutcome,
  expectPromptsForCalls,
  expectTraceWellFormed,
  recordsOfType,
} from "./helpers/report-checks.mjs";
import { SEED } from "../fixtures/t02/synthetic-seed.mjs";

const TIMEOUT = 120000;
const EXPECTED_REASON = {
  "approval-dismiss": "dismiss",
  "approval-cancel": "cancel",
  "approval-timeout": "timeout",
};

describe("T02 actual gate failure blocks before effect (spec §7)", () => {
  it("handler-failure: exception in the real gate leaves the no-effect outcome", { timeout: TIMEOUT }, () => {
    const { report, root } = runScenario("handler-failure", "pty");
    try {
      expectEnvelope(report, {
        scenario: "handler-failure",
        harness: "pty",
        layer: "tui-interactive",
      });
      expectTraceWellFormed(report, { allowedLayers: ["tui-interactive"] });
      const calls = creationCalls(report, {});
      expectPromptsForCalls(report, calls, {
        stimulus: "genuine-pty",
        decision: "deny",
        reason: "error",
      });
      const invocations = recordsOfType(report, "gate_invocation").filter(
        (r) => r.operationId === SEED.operationId,
      );
      expect(invocations.length, "failing gate invocation recorded").toBeGreaterThan(0);
      for (const invocation of invocations) {
        expect(invocation.decision === "deny" || invocation.error === true).toBe(true);
      }
      expectNoEffectOutcome(report);
      expectCleanup(report);
    } finally {
      cleanup(root);
    }
  });
});

describe("T02 dismissal, cancel, and timeout are distinct denials (spec §6)", () => {
  for (const [scenario, reason] of Object.entries(EXPECTED_REASON)) {
    it(
      `${scenario}: deny with reason ${reason}, blocked before dispatch`,
      { timeout: TIMEOUT },
      () => {
        const { report, root } = runScenario(scenario, "pty");
        try {
          expectEnvelope(report, {
            scenario,
            harness: "pty",
            layer: "tui-interactive",
          });
          expectTraceWellFormed(report, { allowedLayers: ["tui-interactive"] });
          const calls = creationCalls(report, {});
          // Exact schema: stimulus stays genuine-pty; the trigger is carried
          // by decision=deny plus the distinct reason, joined per call.
          expectPromptsForCalls(report, calls, {
            stimulus: "genuine-pty",
            decision: "deny",
            reason,
          });
          expectNoEffectOutcome(report);
          expectCleanup(report);
        } finally {
          cleanup(root);
        }
      },
    );
  }

  it("dismiss, cancel, and timeout reasons differ across triggers", { timeout: TIMEOUT }, () => {
    const seen = new Map();
    for (const scenario of Object.keys(EXPECTED_REASON)) {
      const { report, root } = runScenario(scenario, "pty");
      try {
        const reasons = new Set(
          recordsOfType(report, "approval_prompt")
            .filter((r) => r.operationId === SEED.operationId)
            .map((r) => r.reason),
        );
        expect(reasons.size, `single reason in ${scenario}`).toBe(1);
        seen.set(scenario, [...reasons][0]);
      } finally {
        cleanup(root);
      }
    }
    expect(new Set(seen.values()).size, "three distinct reasons observed").toBe(3);
    for (const [scenario, reason] of seen) {
      expect(reason, `reason matches trigger ${scenario}`).toBe(EXPECTED_REASON[scenario]);
    }
  });
});
