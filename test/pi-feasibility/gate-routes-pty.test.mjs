// T02 QA: genuine-PTY gate on all four routes, approve + reject (spec §§7-8).
//
// Layer: tui-interactive. Approval stimulus is genuine Pi interactive mode
// under a real PTY at a per-call native prompt (driver-owned); an
// SDK-supplied UI context would be labeled injected-ui and never counts here.
// approval_prompt records carry toolCallId/operationId/stimulus genuine-pty,
// decision approve/deny, and reason. Each approval must precede exactly one
// matching receiver effect (seq-ordered in expectSingleSeedEffect); each
// denial must leave the spec §8 no-effect outcome. Reads are ungated (covered
// in readonly-sdk.test.mjs).

import { describe, expect, it } from "vitest";
import { cleanup, runScenario } from "./helpers/spawn-report.mjs";
import {
  creationCalls,
  expectCleanup,
  expectDenialResult,
  expectEnvelope,
  expectGateBeforeRegistration,
  expectGateForRoute,
  expectInnerDenial,
  expectNoEffectOutcome,
  expectPromptsForCalls,
  expectSingleSeedEffect,
  expectTraceWellFormed,
  recordsOfType,
} from "./helpers/report-checks.mjs";
import { REFUSAL, SEED } from "../fixtures/t02/synthetic-seed.mjs";

const TIMEOUT = 120000;
const LAYER = "tui-interactive";

// Codemode dispatches through an outer codemode call, so it joins parents
// exactly like orchestrator nesting; only direct/deferred have null parents.
const NESTED = new Set([
  "codemode-approve",
  "nested-approve",
  "codemode-reject",
  "nested-reject",
]);

function checkPtyApprove(scenario, { nested }) {
  const { report, root } = runScenario(scenario, "pty");
  try {
    expectEnvelope(report, { scenario, harness: "pty", layer: LAYER });
    expectTraceWellFormed(report, { allowedLayers: [LAYER] });
    expectGateBeforeRegistration(report);
    // Genuine interactive approval joined to every actual creation call.
    const calls = creationCalls(report, { nested });
    expectPromptsForCalls(report, calls, {
      stimulus: "genuine-pty",
      decision: "approve",
      reason: "approved",
    });
    expectGateForRoute(report, { route: scenario, nested });
    expectSingleSeedEffect(report);
    expectCleanup(report);
  } finally {
    cleanup(root);
  }
}

function checkPtyReject(scenario, { nested }) {
  const { report, root } = runScenario(scenario, "pty");
  try {
    expectEnvelope(report, { scenario, harness: "pty", layer: LAYER });
    expectTraceWellFormed(report, { allowedLayers: [LAYER] });
    expectGateBeforeRegistration(report);
    const calls = creationCalls(report, { nested });
    expectPromptsForCalls(report, calls, {
      stimulus: "genuine-pty",
      decision: "deny",
      reason: "reject",
    });
    // No outer-only gate substitute: the denial must be on the inner creation
    // invocation itself (nested) or the direct creation call.
    expectInnerDenial(report);
    if (nested) {
      const invocations = recordsOfType(report, "gate_invocation");
      const outerApprovals = invocations.filter(
        (r) => r.decision === "approve" && !r.parentToolCallId,
      );
      expect(outerApprovals.length, "no outer-only approval substitute").toBe(0);
    }
    expectDenialResult(report, { codes: null });
    expectNoEffectOutcome(report);
    expectCleanup(report);
  } finally {
    cleanup(root);
  }
}

describe("T02 genuine-PTY gate approval on all four routes (spec §7)", () => {
  for (const scenario of [
    "direct-approve",
    "deferred-approve",
    "codemode-approve",
    "nested-approve",
  ]) {
    it(
      `${scenario}: genuine approval precedes exactly one matching effect`,
      { timeout: TIMEOUT },
      () => checkPtyApprove(scenario, { nested: NESTED.has(scenario) }),
    );
  }
});

describe("T02 genuine-PTY gate denial on all four routes (spec §7)", () => {
  for (const scenario of [
    "direct-reject",
    "deferred-reject",
    "codemode-reject",
    "nested-reject",
  ]) {
    it(
      `${scenario}: inner denial leaves the no-effect outcome`,
      { timeout: TIMEOUT },
      () => checkPtyReject(scenario, { nested: NESTED.has(scenario) }),
    );
  }
});

describe("T02 denial codes use the published refusal vocabulary (spec §5)", () => {
  it("reject outcomes carry a known refusal code", { timeout: TIMEOUT }, () => {
    const known = Object.values(REFUSAL);
    const { report, root } = runScenario("direct-reject", "pty");
    try {
      const results = recordsOfType(report, "tool_result").filter(
        (r) => r.isError === true && r.code !== null,
      );
      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(known.includes(result.code), `code ${result.code} is published`).toBe(true);
      }
    } finally {
      cleanup(root);
    }
  });
});
