// T02 QA: R3 binding prebind refusal (spec §14) + lifecycle invalidation (spec §§6-8).
//
// R3 binding cases refuse the target BEFORE bind on exact binding_check
// evidence (missing 0 candidates, ambiguous 2 valid candidates neither
// selected) and then observe one actual unknown-tool creation attempt on a
// closed refusal-probe session (source:none/not-spawned). Binding is never
// inferred from labels/annotations and never alters tool schemas.
//
// Invalidation cases assert a genuine sequence ordered by seq: a real approval
// or pending dispatch BEFORE the session transition, then AT LEAST ONE actual
// post-invalidation denial or capability-withdrawal observation AFTER it.
// Looping over optional convenience flags without count/order would be
// vacuous, so afterInvalidation flags are never consulted here. No impossible
// whole-system atomic sign-out claim is made.

import { describe, expect, it } from "vitest";
import { cleanup, runScenario } from "./helpers/spawn-report.mjs";
import {
  expectCleanup,
  expectEnvelope,
  expectNoEffectOutcome,
  expectR3PrebindRefusal,
  expectTraceWellFormed,
  recordsOfType,
} from "./helpers/report-checks.mjs";
import { SEED } from "../fixtures/t02/synthetic-seed.mjs";

const TIMEOUT = 120000;

describe("T02 R3 missing/ambiguous binding refuses before bind (spec §14)", () => {
  for (const scenario of ["binding-missing", "binding-ambiguous"]) {
    it(
      `${scenario}: exact binding_check evidence, prebind refusal, probe unknown-tool`,
      { timeout: TIMEOUT },
      () => {
        const { report, root } = runScenario(scenario, "sdk");
        try {
          expectR3PrebindRefusal(report, { scenario });
        } finally {
          cleanup(root);
        }
      },
    );
  }
});

describe("T02 invalidation fences pending verdicts and withdraws capability (spec §§6-8)", () => {
  for (const scenario of ["binding-invalidate", "reload-invalidate", "shutdown-invalidate"]) {
    it(
      `${scenario}: approval before, denial/withdrawal after invalidation`,
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
          // The invalidation transition and its seq.
          const sessions = recordsOfType(report, "session").filter((r) =>
            ["invalidate", "reload", "shutdown"].includes(r.transition),
          );
          expect(sessions.length, "invalidation transition recorded").toBeGreaterThan(0);
          const invSeq = Math.min(...sessions.map((r) => r.seq));
          // Genuine approval or pending dispatch strictly before invalidation.
          const befores = report.trace.filter(
            (r) =>
              r.seq < invSeq &&
              r.operationId === SEED.operationId &&
              ((r.type === "approval_prompt" && r.decision === "approve") ||
                (r.type === "gate_invocation" && r.decision === "approve") ||
                (r.type === "receiver_check" && r.decision === "allow")),
          );
          expect(befores.length, "approval/pending dispatch before invalidation").toBeGreaterThan(
            0,
          );
          // At least one ACTUAL post-invalidation denial or withdrawal after it.
          const afters = report.trace.filter((r) => r.seq > invSeq);
          const denials = afters.filter(
            (r) =>
              (r.type === "sidecar_verdict" && r.decision === "deny") ||
              (r.type === "receiver_check" && r.decision === "deny") ||
              (r.type === "tool_result" && r.isError === true),
          );
          const withdrawals = afters.filter(
            (r) =>
              r.type === "registration" &&
              (r.policy === "none" || r.connected === false || r.registered === false),
          );
          expect(
            denials.length + withdrawals.length,
            "post-invalidation denial/withdrawal observed",
          ).toBeGreaterThan(0);
          // No guarded registration may remain connected after invalidation
          // (pre-invalidation guarded setup is expected and left alone).
          const lateGuarded = recordsOfType(report, "registration").filter(
            (r) => r.seq > invSeq && r.policy === "guarded" && r.connected === true,
          );
          expect(lateGuarded.length, "no guarded registration after invalidation").toBe(0);
          expectNoEffectOutcome(report);
          expectCleanup(report);
        } finally {
          cleanup(root);
        }
      },
    );
  }
});
