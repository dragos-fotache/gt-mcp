// T02 QA: final-dispatched-input integrity + sidecar channel faults (spec §§5-8).
//
// The sidecar is a candidate mechanism under investigation, not a waiver: its
// verdict must be checked by the receiver BEFORE a synthetic counter changes,
// and digest comparison runs over freshly validated/normalized RECEIVED
// arguments. mutator-boundary uses the known diagnostic late handler on the
// genuine PTY path: the published seed input is genuinely approved (approved
// digest is the valid 64-hex seed SHA), then changed after approval, and the
// receiver must record a real denial with input_integrity_mismatch and a zero
// final. Post-hoc detection alone would be insufficient. Channel-fault cases
// require a real fixture-origin receiver_check denial with reason — an
// unavailable listener may emit no companion verdict at all, so verdict loops
// over possibly-empty sets prove nothing and are not used.

import { describe, expect, it } from "vitest";
import { cleanup, runScenario } from "./helpers/spawn-report.mjs";
import {
  expectCleanup,
  expectEnvelope,
  expectNoEffectOutcome,
  expectTraceWellFormed,
  recordsOfType,
} from "./helpers/report-checks.mjs";
import { EXPECTED_SEED_SHA, REFUSAL, SEED } from "../fixtures/t02/synthetic-seed.mjs";

const TIMEOUT = 120000;
const LAYER = "tui-interactive";
const HEX64 = /^[0-9a-f]{64}$/;

function expectValidDigest(value, what) {
  expect(value, `${what} is a valid non-null 64-hex digest`).toMatch(HEX64);
}

describe("T02 post-approval mutation is detected before effect (spec §§5-7)", () => {
  it("mutator-boundary: seed approval, genuine difference, mismatch refusal", { timeout: TIMEOUT }, () => {
    const { report, root } = runScenario("mutator-boundary", "pty");
    try {
      expectEnvelope(report, { scenario: "mutator-boundary", harness: "pty", layer: LAYER });
      expectTraceWellFormed(report, { allowedLayers: [LAYER] });
      // Genuine approval happened first for the valid seed input.
      const invocations = recordsOfType(report, "gate_invocation").filter(
        (r) => r.operationId === SEED.operationId,
      );
      expect(invocations.length, "gate invocation recorded").toBeGreaterThan(0);
      expect(
        invocations.some((r) => r.decision === "approve" && r.approvedDigest === EXPECTED_SEED_SHA),
        "published seed input genuinely approved",
      ).toBe(true);
      // The receiver saw genuinely different bytes than approved and refused.
      const receivers = recordsOfType(report, "receiver_check").filter(
        (r) => r.operationId === SEED.operationId,
      );
      expect(receivers.length, "fixture-origin receiver_check denial").toBeGreaterThan(0);
      for (const r of receivers) {
        expect(r.source).toBe("fixture");
        expectValidDigest(r.approvedDigest, "approvedDigest");
        expectValidDigest(r.receivedDigest, "receivedDigest");
        expect(r.approvedDigest, "approved digest is the known seed").toBe(EXPECTED_SEED_SHA);
        expect(r.receivedDigest === r.approvedDigest, "digests genuinely differ").toBe(false);
        expect(r.decision).toBe("deny");
        expect(r.reason).toBe(REFUSAL.integrityMismatch);
      }
      const results = recordsOfType(report, "tool_result").filter((r) => r.isError === true);
      expect(results.length, "mismatch error result present").toBeGreaterThan(0);
      for (const result of results) {
        expect(result.code).toBe(REFUSAL.integrityMismatch);
      }
      expectNoEffectOutcome(report);
      expectCleanup(report);
    } finally {
      cleanup(root);
    }
  });
});

describe("T02 sidecar channel faults refuse with zero effects (spec §§6-7)", () => {
  for (const scenario of ["sidecar-unavailable", "sidecar-malformed", "sidecar-stale"]) {
    it(
      `${scenario}: genuine approval, real receiver denial, no-effect outcome`,
      { timeout: TIMEOUT },
      () => {
        const { report, root } = runScenario(scenario, "pty");
        try {
          expectEnvelope(report, { scenario, harness: "pty", layer: LAYER });
          expectTraceWellFormed(report, { allowedLayers: [LAYER] });
          // Approval was genuine; the fault is downstream of it.
          const prompts = recordsOfType(report, "approval_prompt").filter(
            (r) => r.operationId === SEED.operationId,
          );
          expect(prompts.length, "genuine approval_prompt").toBeGreaterThan(0);
          for (const prompt of prompts) {
            expect(prompt.stimulus).toBe("genuine-pty");
            expect(prompt.decision).toBe("approve");
          }
          // The receiver — not an optional companion verdict — denies.
          const receivers = recordsOfType(report, "receiver_check").filter(
            (r) => r.operationId === SEED.operationId,
          );
          expect(receivers.length, "fixture-origin receiver_check denial").toBeGreaterThan(0);
          for (const r of receivers) {
            expect(r.source).toBe("fixture");
            expect(r.decision, "no allow on faulty channel").toBe("deny");
            expect(r.reason, "denial reason recorded").toBeTypeOf("string");
          }
          expectNoEffectOutcome(report);
          expectCleanup(report);
        } finally {
          cleanup(root);
        }
      },
    );
  }
});

describe("T02 calibration controls prove the harness can see (spec §7)", () => {
  it("calibration-unguarded: ledger observes the permitted effect", { timeout: TIMEOUT }, () => {
    // If this control fails, ALL zero-effect evidence is void.
    const { report, root } = runScenario("calibration-unguarded", "sdk");
    try {
      expect(report.synthetic).toBe(true);
      const ledgers = recordsOfType(report, "effect_ledger");
      expect(ledgers.length, "ledger records present").toBeGreaterThan(0);
      const finals = ledgers.filter((r) => r.final === true);
      expect(finals.length).toBe(1);
      expect(finals[0].source).toBe("fixture");
      expect(finals[0].counter, "deliberately permitted effect observed").toBeGreaterThan(0);
    } finally {
      cleanup(root);
    }
  });

  it("calibration-mutation: valid digests visibly and genuinely differ", { timeout: TIMEOUT }, () => {
    // If this control fails, ALL integrity evidence is void.
    const { report, root } = runScenario("calibration-mutation", "sdk");
    try {
      expect(report.synthetic).toBe(true);
      const receivers = recordsOfType(report, "receiver_check");
      expect(receivers.length, "receiver_check records present").toBeGreaterThan(0);
      const differing = receivers.filter((r) => {
        if (typeof r.approvedDigest !== "string" || typeof r.receivedDigest !== "string") {
          return false;
        }
        return (
          HEX64.test(r.approvedDigest) &&
          HEX64.test(r.receivedDigest) &&
          r.receivedDigest !== r.approvedDigest
        );
      });
      expect(differing.length, "genuine digest difference observed").toBeGreaterThan(0);
    } finally {
      cleanup(root);
    }
  });
});
