// T02 QA self-tests for the report validators (logic-control only).
//
// These tests feed DELIBERATELY canned malformed/missing/incorrect-order
// reports to the validators in helpers/report-checks.mjs, so omissions cannot
// pass silently. They execute no experiment artifact and need no relay: every
// input below is constructed inline. A validator that fails to reject a
// control fails this file loudly.
//
// NOTE: canned approvals/digests here are self-test constants only — they
// carry no pipeline meaning and never count as C10–C12 evidence.

import { describe, expect, it } from "vitest";
import {
  CREATION_TOOL,
  EXPECTED_RUNTIME_PINS,
  assertPinnedVersion,
  expectCleanup,
  expectCodemodeReadonly,
  expectDeferredReadonly,
  expectDirectReadonlyS2B,
  expectEnvelope,
  expectGateForRoute,
  expectNestedReadonly,
  expectNoEffectOutcome,
  expectR3HiddenTool,
  expectR3PrebindRefusal,
  expectSingleSeedEffect,
  expectTraceWellFormed,
  readSuccesses,
} from "./helpers/report-checks.mjs";
import {
  EXPECTED_SEED_SHA,
  FIXTURE_TOOLS,
  REFUSAL,
  SEED,
} from "../fixtures/t02/synthetic-seed.mjs";

const RUNTIME = {
  node: "24.21.0",
  npm: "11.19.0",
  pi: EXPECTED_RUNTIME_PINS.pi,
  sdk: EXPECTED_RUNTIME_PINS.sdk,
};

function baseReport(overrides = {}) {
  return {
    synthetic: true,
    scenario: "direct-approve",
    harness: "pty",
    layer: "tui-interactive",
    completed: true,
    runtime: { ...RUNTIME },
    trace: [],
    effects: { source: "none", observation: "not-spawned", total: 0, operations: [] },
    limits: {},
    ...overrides,
  };
}

function rec(seq, type, extra = {}) {
  return { seq, source: "pi", type, layer: "tui-interactive", ...extra };
}

describe("T02 validator self-tests: envelope (logic-control)", () => {
  it("accepts a well-formed envelope", () => {
    expect(() =>
      expectEnvelope(baseReport(), {
        scenario: "direct-approve",
        harness: "pty",
        layer: "tui-interactive",
      }),
    ).not.toThrow();
  });

  it("rejects synthetic:false, wrong layer, and unpinned runtime", () => {
    expect(() =>
      expectEnvelope(baseReport({ synthetic: false }), {
        scenario: "direct-approve",
        harness: "pty",
        layer: "tui-interactive",
      }),
    ).toThrow();
    expect(() =>
      expectEnvelope(baseReport({ layer: "logic-control" }), {
        scenario: "direct-approve",
        harness: "pty",
        layer: "tui-interactive",
      }),
    ).toThrow();
    expect(() =>
      expectEnvelope(baseReport({ runtime: { ...RUNTIME, node: "26.0.0" } }), {
        scenario: "direct-approve",
        harness: "pty",
        layer: "tui-interactive",
      }),
    ).toThrow();
  });

  it("rejects near-miss versions but tolerates a single leading v", () => {
    expect(() => assertPinnedVersion("24.21.0", "24.21.0", "node")).not.toThrow();
    expect(() => assertPinnedVersion("v24.21.0", "24.21.0", "node")).not.toThrow();
    expect(() => assertPinnedVersion("24.21.01", "24.21.0", "node")).toThrow();
    expect(() => assertPinnedVersion("1.32.10", "1.32.1", "sdk")).toThrow();
    expect(() => assertPinnedVersion("v1.1.01", "1.1.0", "pi")).toThrow();
    expect(() => assertPinnedVersion(undefined, "11.19.0", "npm")).toThrow();
  });

  it("rejects unknown effects observation values", () => {
    expect(() =>
      expectEnvelope(
        baseReport({
          effects: { source: "fixture", observation: "maybe", total: 0, operations: [] },
        }),
        { scenario: "direct-approve", harness: "pty", layer: "tui-interactive" },
      ),
    ).toThrow();
  });
});

describe("T02 validator self-tests: trace order and cleanup (logic-control)", () => {
  it("rejects non-monotonic seq", () => {
    const report = baseReport({
      trace: [rec(0, "gate_installed"), rec(0, "registration")],
    });
    expect(() => expectTraceWellFormed(report, { allowedLayers: ["tui-interactive"] })).toThrow();
  });

  it("rejects cleanup without booleans and zero counts", () => {
    const report = baseReport({ trace: [rec(0, "cleanup")] });
    expect(() => expectCleanup(report)).toThrow();
    const ok = baseReport({
      trace: [
        rec(0, "cleanup", {
          childrenGone: true,
          listenersClosed: true,
          rootsRemoved: true,
          remainingChildren: 0,
          remainingListeners: 0,
        }),
      ],
    });
    expect(() => expectCleanup(ok)).not.toThrow();
    const bad = baseReport({
      trace: [
        rec(0, "cleanup", {
          childrenGone: true,
          listenersClosed: true,
          rootsRemoved: true,
          remainingChildren: 1,
          remainingListeners: 0,
        }),
      ],
    });
    expect(() => expectCleanup(bad)).toThrow();
  });
});

describe("T02 validator self-tests: no-effect branching (logic-control)", () => {
  const call = rec(0, "tool_call", {
    name: CREATION_TOOL,
    operationId: SEED.operationId,
    toolCallId: "c1",
    parentToolCallId: null,
  });
  const errResult = rec(1, "tool_result", { toolCallId: "c1", isError: true });

  it("not-spawned with an invented ledger is rejected", () => {
    const report = baseReport({
      trace: [
        call,
        errResult,
        rec(2, "effect_ledger", { source: "fixture", final: true, counter: 0 }),
      ],
    });
    expect(() => expectNoEffectOutcome(report)).toThrow();
  });

  it("not-spawned requires an actual attempted call", () => {
    const report = baseReport({ trace: [errResult] });
    expect(() => expectNoEffectOutcome(report)).toThrow();
  });

  it("not-spawned passes with spawn absence + failed call + no ledger", () => {
    const report = baseReport({
      trace: [
        rec(0, "registration", {
          server: "synth-gt",
          policy: "none",
          registered: false,
          connected: false,
          spawned: false,
          reason: "no companion",
        }),
        call,
        errResult,
      ],
    });
    expect(expectNoEffectOutcome(report)).toBe("not-spawned");
  });

  it("fixture-final requires its own final zero ledger", () => {
    const missing = baseReport({
      effects: { source: "fixture", observation: "fixture-final", total: 0, operations: [] },
      trace: [call, errResult],
    });
    expect(() => expectNoEffectOutcome(missing)).toThrow();
    const ok = baseReport({
      effects: { source: "fixture", observation: "fixture-final", total: 0, operations: [] },
      trace: [
        call,
        errResult,
        rec(2, "effect_ledger", {
          source: "fixture",
          operationId: null,
          digest: null,
          final: true,
          counter: 0,
        }),
      ],
    });
    expect(expectNoEffectOutcome(ok)).toBe("fixture-final");
  });
});

describe("T02 validator self-tests: effect ordering (logic-control)", () => {
  function orderedReport() {
    return baseReport({
      effects: {
        source: "fixture",
        observation: "fixture-final",
        total: 1,
        operations: [{ operationId: SEED.operationId, digest: EXPECTED_SEED_SHA }],
      },
      trace: [
        rec(0, "approval_prompt", {
          toolCallId: "c1",
          operationId: SEED.operationId,
          stimulus: "genuine-pty",
          decision: "approve",
          reason: "approved",
        }),
        rec(1, "receiver_check", {
          source: "fixture",
          operationId: SEED.operationId,
          receivedDigest: EXPECTED_SEED_SHA,
          approvedDigest: EXPECTED_SEED_SHA,
          tupleMatch: true,
          generationMatch: true,
          decision: "allow",
          reason: "match",
        }),
        rec(2, "effect_ledger", {
          source: "fixture",
          operationId: SEED.operationId,
          digest: EXPECTED_SEED_SHA,
          final: true,
          counter: 1,
        }),
      ],
    });
  }

  it("accepts approval < allow < effect order", () => {
    expect(() => expectSingleSeedEffect(orderedReport())).not.toThrow();
  });

  it("rejects an effect preceding receiver allow", () => {
    const report = orderedReport();
    report.trace[2].seq = 0;
    report.trace[1].seq = 5;
    expect(() => expectSingleSeedEffect(report)).toThrow();
  });

  it("rejects effects/ledger total disagreement", () => {
    const report = orderedReport();
    report.effects.total = 2;
    expect(() => expectSingleSeedEffect(report)).toThrow();
  });
});

describe("T02 validator self-tests: review-gap negatives (logic-control)", () => {
  const absentCall = rec(0, "tool_call", {
    name: CREATION_TOOL,
    operationId: SEED.operationId,
    toolCallId: "c9",
    parentToolCallId: null,
  });
  const absentReg = rec(0, "registration", {
    server: "synth-gt",
    policy: "none",
    registered: false,
    connected: false,
    spawned: false,
    reason: "no companion",
  });

  it("not-spawned with an attempted call but NO result is not an outcome", () => {
    const report = baseReport({ trace: [absentReg, absentCall] });
    expect(() => expectNoEffectOutcome(report)).toThrow();
  });

  it("not-spawned with an empty registration list proves no absence", () => {
    const report = baseReport({
      trace: [absentCall, rec(1, "tool_result", { toolCallId: "c9", isError: true, code: null })],
    });
    expect(() => expectNoEffectOutcome(report)).toThrow();
  });

  it("not-spawned ignores unrelated read/outer results either way", () => {
    const ok = baseReport({
      trace: [
        absentReg,
        absentCall,
        rec(1, "tool_result", { toolCallId: "c9", isError: true, code: null }),
        rec(2, "tool_call", { name: "codemode", toolCallId: "outer" }),
        rec(3, "tool_result", { toolCallId: "outer", isError: false }),
      ],
    });
    expect(expectNoEffectOutcome(ok)).toBe("not-spawned");
    const bad = baseReport({
      trace: [
        absentReg,
        absentCall,
        rec(1, "tool_result", { toolCallId: "c9", isError: true, code: null }),
        rec(2, "tool_result", { toolCallId: "c9", isError: false }),
      ],
    });
    expect(() => expectNoEffectOutcome(bad)).toThrow();
  });

  it("readSuccesses rejects foreign-server suffixes", () => {
    const report = baseReport({
      trace: [
        rec(0, "tool_call", { name: "mcp__foreign__get_exercise", toolCallId: "f1" }),
        rec(1, "tool_result", {
          name: "mcp__foreign__get_exercise",
          toolCallId: "f1",
          isError: false,
        }),
        rec(2, "tool_call", { name: "mcp__synth_gt__get_exercise", toolCallId: "g1" }),
        rec(3, "tool_result", {
          name: "mcp__synth_gt__get_exercise",
          toolCallId: "g1",
          isError: false,
        }),
      ],
    });
    const found = readSuccesses(report);
    expect(found.length).toBe(1);
    expect(found[0].toolCallId).toBe("g1");
  });

  it("readSuccesses requires explicit false, IDs, and joined calls", () => {
    function singleResult(resultExtra) {
      return baseReport({
        trace: [
          rec(0, "tool_call", { name: "mcp__synth_gt__get_exercise", toolCallId: "g1" }),
          rec(1, "tool_result", { name: "mcp__synth_gt__get_exercise", ...resultExtra }),
        ],
      });
    }
    // Missing, truthy-nonboolean, and unjoined results never qualify.
    expect(readSuccesses(singleResult({ toolCallId: "g1" })).length).toBe(0);
    expect(readSuccesses(singleResult({ toolCallId: "g1", isError: 0 })).length).toBe(0);
    expect(readSuccesses(singleResult({ toolCallId: "", isError: false })).length).toBe(0);
    expect(readSuccesses(singleResult({ isError: false })).length).toBe(0);
    expect(readSuccesses(singleResult({ toolCallId: "ghost", isError: false })).length).toBe(0);
    expect(readSuccesses(singleResult({ toolCallId: "g1", isError: false })).length).toBe(1);
  });

  it("receiver allow requires true tuple and generation matches", () => {
    function allowReport(tupleMatch, generationMatch) {
      return baseReport({
        effects: {
          source: "fixture",
          observation: "fixture-final",
          total: 1,
          operations: [{ operationId: SEED.operationId, digest: EXPECTED_SEED_SHA }],
        },
        trace: [
          rec(0, "approval_prompt", {
            toolCallId: "c1",
            operationId: SEED.operationId,
            stimulus: "genuine-pty",
            decision: "approve",
            reason: "approved",
          }),
          rec(1, "receiver_check", {
            source: "fixture",
            operationId: SEED.operationId,
            receivedDigest: EXPECTED_SEED_SHA,
            approvedDigest: EXPECTED_SEED_SHA,
            tupleMatch,
            generationMatch,
            decision: "allow",
            reason: "match",
          }),
          rec(2, "effect_ledger", {
            source: "fixture",
            operationId: SEED.operationId,
            digest: EXPECTED_SEED_SHA,
            final: true,
            counter: 1,
          }),
        ],
      });
    }
    expect(() => expectSingleSeedEffect(allowReport(true, true))).not.toThrow();
    expect(() => expectSingleSeedEffect(allowReport(false, true))).toThrow();
    expect(() => expectSingleSeedEffect(allowReport(true, false))).toThrow();
  });

  it("duplicated gate IDs cannot satisfy per-call uniqueness", () => {
    const report = baseReport({
      trace: [
        rec(0, "tool_call", {
          name: CREATION_TOOL,
          operationId: SEED.operationId,
          toolCallId: "a",
          parentToolCallId: null,
        }),
        rec(1, "tool_call", {
          name: CREATION_TOOL,
          operationId: SEED.operationId,
          toolCallId: "b",
          parentToolCallId: null,
        }),
        rec(2, "gate_invocation", {
          operationId: SEED.operationId,
          toolCallId: "a",
          parentToolCallId: null,
          decision: "approve",
          approvedDigest: EXPECTED_SEED_SHA,
        }),
        rec(3, "gate_invocation", {
          operationId: SEED.operationId,
          toolCallId: "a",
          parentToolCallId: null,
          decision: "approve",
          approvedDigest: EXPECTED_SEED_SHA,
        }),
      ],
    });
    expect(() => expectGateForRoute(report, { route: "direct-approve", nested: false })).toThrow();
  });
});

describe("T02 validator self-tests: named read success (logic-control)", () => {
  it("expectReadSuccess joins the named read and rejects others", async () => {
    const { expectReadSuccess } = await import("./helpers/report-checks.mjs");
    const report = baseReport({
      trace: [
        rec(0, "tool_call", { name: "mcp__synth_gt__get_exercise", toolCallId: "g1" }),
        rec(1, "tool_result", {
          name: "mcp__synth_gt__get_exercise",
          toolCallId: "g1",
          isError: false,
        }),
      ],
    });
    expect(() => expectReadSuccess(report, "get_exercise")).not.toThrow();
    expect(() => expectReadSuccess(report, "search_exercises")).toThrow();
  });

  it("expectReadSuccess rejects mismatched result/call names", async () => {
    const { expectReadSuccess } = await import("./helpers/report-checks.mjs");
    const report = baseReport({
      trace: [
        rec(0, "tool_call", { name: "mcp__synth_gt__search_exercises", toolCallId: "g1" }),
        rec(1, "tool_result", {
          name: "mcp__synth_gt__get_exercise",
          toolCallId: "g1",
          isError: false,
        }),
      ],
    });
    expect(() => expectReadSuccess(report, "get_exercise")).toThrow();
  });
});

describe("T02 validator self-tests: R1 S2B direct-readonly negatives (logic-control)", () => {
  // Canned companion S2B shape per spec §12: synchronous companion gate before
  // declaration/registration/startup/discovery/creation, print/no-UI, one
  // same-record connected readonly registration, launcher first-request
  // inventory paired with fixture discovery, qualified named read success, one
  // creation call/gate-denial/null-code error join on the public
  // operationId/digest with call.seq < gate.seq < result.seq, fixture final
  // zero/empty-operation, shutdown before a last cleanup. Every value below
  // is a self-test constant with no pipeline meaning.
  function s2bBase() {
    return baseReport({
      scenario: "direct-readonly",
      harness: "sdk",
      layer: "sdk-pipeline",
      effects: { source: "fixture", observation: "fixture-final", total: 0, operations: [] },
      trace: [
        rec(0, "preflight", {
          source: "launcher",
          layer: "sdk-pipeline",
          mode: "print",
          hasUI: false,
          uiInjected: false,
        }),
        rec(1, "gate_installed", { source: "companion", layer: "sdk-pipeline" }),
        rec(2, "registration_declared", {
          source: "companion",
          layer: "sdk-pipeline",
          server: "synth-gt",
          policy: "readonly",
          connected: false,
          reason: "connection-pending",
        }),
        rec(3, "registration", {
          source: "launcher",
          layer: "sdk-pipeline",
          server: "synth-gt",
          policy: "readonly",
          registered: true,
          connected: true,
          spawned: true,
          reason: "companion-managed-readonly",
        }),
        rec(4, "tool_list", {
          source: "fixture",
          layer: "sdk-pipeline",
          tools: [...FIXTURE_TOOLS],
        }),
        rec(5, "first-request-inventory", {
          source: "launcher",
          layer: "sdk-pipeline",
          tools: [...FIXTURE_TOOLS],
        }),
        rec(6, "tool_call", {
          layer: "sdk-pipeline",
          name: "mcp__synth_gt__get_exercise",
          toolCallId: "g1",
        }),
        rec(7, "tool_result", {
          layer: "sdk-pipeline",
          name: "mcp__synth_gt__get_exercise",
          toolCallId: "g1",
          isError: false,
        }),
        rec(8, "tool_call", {
          layer: "sdk-pipeline",
          name: CREATION_TOOL,
          operationId: SEED.operationId,
          toolCallId: "c1",
          parentToolCallId: null,
        }),
        rec(9, "gate_invocation", {
          source: "companion",
          layer: "sdk-pipeline",
          operationId: SEED.operationId,
          toolCallId: "c1",
          parentToolCallId: null,
          decision: "deny",
          mode: "print",
          hasUI: false,
          attemptedDigest: EXPECTED_SEED_SHA,
          approvedDigest: null,
          reason: "mode-not-tui:print",
        }),
        rec(10, "tool_result", {
          source: "pi",
          layer: "sdk-pipeline",
          name: CREATION_TOOL,
          toolCallId: "c1",
          parentToolCallId: null,
          isError: true,
          code: null,
          reason: "gate-denied-print-no-ui",
        }),
        rec(11, "effect_ledger", {
          source: "fixture",
          layer: "sdk-pipeline",
          operationId: null,
          digest: null,
          final: true,
          counter: 0,
        }),
        rec(12, "session", {
          source: "launcher",
          layer: "sdk-pipeline",
          transition: "shutdown",
          reason: "scenario-complete",
        }),
        rec(13, "cleanup", {
          source: "launcher",
          layer: "sdk-pipeline",
          childrenGone: true,
          listenersClosed: true,
          rootsRemoved: true,
          remainingChildren: 0,
          remainingListeners: 0,
        }),
      ],
    });
  }

  // Reseat trace seqs by array order after positional swaps, keeping the
  // wellformed monotonic order so causal assertions (not seq order) decide.
  function renumber(report) {
    report.trace.forEach((r, i) => {
      r.seq = i;
    });
    return report;
  }

  // tool_list payload source is "fixture" per spec §8; the rec() default
  // trace source ("pi") is overwritten here for those records.
  function withFixtureToolList(report) {
    for (const r of report.trace) {
      if (r.type === "tool_list") r.source = "fixture";
    }
    return report;
  }

  it("accepts the companion S2B shape", () => {
    expect(() => expectDirectReadonlyS2B(withFixtureToolList(s2bBase()))).not.toThrow();
  });

  it("rejects the generic S2A receiver shape (structured code, no gate)", () => {
    const report = withFixtureToolList(s2bBase());
    report.trace = report.trace.filter(
      (r) => r.type !== "gate_installed" && r.type !== "gate_invocation",
    );
    for (const r of report.trace) {
      if (r.type === "tool_result" && r.toolCallId === "c1") {
        r.code = REFUSAL.needsApproval;
      }
    }
    expect(() => expectDirectReadonlyS2B(report)).toThrow();
  });

  it("rejects the absent unknown-tool substitute (not-spawned, no ledger)", () => {
    const report = baseReport({
      scenario: "direct-readonly",
      harness: "sdk",
      layer: "sdk-pipeline",
      trace: [
        rec(0, "preflight", {
          source: "launcher",
          layer: "sdk-pipeline",
          mode: "print",
          hasUI: false,
          uiInjected: false,
        }),
        rec(1, "registration", {
          source: "launcher",
          layer: "sdk-pipeline",
          server: "synth-gt",
          policy: "none",
          registered: false,
          connected: false,
          spawned: false,
          reason: "no companion",
        }),
        rec(2, "tool_call", {
          layer: "sdk-pipeline",
          name: CREATION_TOOL,
          operationId: SEED.operationId,
          toolCallId: "c9",
          parentToolCallId: null,
        }),
        rec(3, "tool_result", {
          layer: "sdk-pipeline",
          toolCallId: "c9",
          isError: true,
          code: null,
          reason: "unknown-tool",
        }),
        rec(4, "cleanup", {
          source: "launcher",
          layer: "sdk-pipeline",
          childrenGone: true,
          listenersClosed: true,
          rootsRemoved: true,
          remainingChildren: 0,
          remainingListeners: 0,
        }),
      ],
    });
    expect(() => expectDirectReadonlyS2B(report)).toThrow();
  });

  it("rejects invented receiver_check, approval_prompt, and sidecar_verdict", () => {
    const withReceiver = withFixtureToolList(s2bBase());
    withReceiver.trace.push(
      rec(14, "receiver_check", {
        source: "fixture",
        layer: "sdk-pipeline",
        operationId: SEED.operationId,
        receivedDigest: EXPECTED_SEED_SHA,
        approvedDigest: null,
        tupleMatch: false,
        generationMatch: true,
        decision: "deny",
        reason: "no-approval",
      }),
    );
    expect(() => expectDirectReadonlyS2B(withReceiver)).toThrow();
    const withPrompt = withFixtureToolList(s2bBase());
    withPrompt.trace.push(
      rec(14, "approval_prompt", {
        source: "companion",
        layer: "sdk-pipeline",
        toolCallId: "c1",
        operationId: SEED.operationId,
        stimulus: "genuine-pty",
        decision: "deny",
        reason: "reject",
      }),
    );
    expect(() => expectDirectReadonlyS2B(withPrompt)).toThrow();
    const withSidecar = withFixtureToolList(s2bBase());
    withSidecar.trace.push(
      rec(14, "sidecar_verdict", {
        source: "fixture",
        layer: "sdk-pipeline",
        operationId: SEED.operationId,
        receivedDigest: EXPECTED_SEED_SHA,
        approvedDigest: null,
        tupleMatch: true,
        generationMatch: true,
        decision: "deny",
        reason: "no-sidecar",
      }),
    );
    expect(() => expectDirectReadonlyS2B(withSidecar)).toThrow();
  });

  it("rejects guarded capability and non-print gate mode", () => {
    const guarded = withFixtureToolList(s2bBase());
    for (const r of guarded.trace) {
      if (r.type === "registration") {
        r.policy = "guarded";
        r.connected = true;
      }
    }
    expect(() => expectDirectReadonlyS2B(guarded)).toThrow();
    const wrongMode = withFixtureToolList(s2bBase());
    for (const r of wrongMode.trace) {
      if (r.type === "gate_invocation") r.mode = "tui";
    }
    expect(() => expectDirectReadonlyS2B(wrongMode)).toThrow();
  });

  it("rejects duplicated creation calls and gate without public digest", () => {
    const duped = withFixtureToolList(s2bBase());
    duped.trace.push(
      rec(14, "tool_call", {
        layer: "sdk-pipeline",
        name: CREATION_TOOL,
        operationId: SEED.operationId,
        toolCallId: "c2",
        parentToolCallId: null,
      }),
    );
    expect(() => expectDirectReadonlyS2B(duped)).toThrow();
    const noDigest = withFixtureToolList(s2bBase());
    for (const r of noDigest.trace) {
      if (r.type === "gate_invocation") delete r.attemptedDigest;
    }
    expect(() => expectDirectReadonlyS2B(noDigest)).toThrow();
  });

  it("rejects inexact gate denial fields (approval residue, reason, hasUI, digest)", () => {
    const approved = withFixtureToolList(s2bBase());
    for (const r of approved.trace) {
      if (r.type === "gate_invocation") r.approvedDigest = EXPECTED_SEED_SHA;
    }
    expect(() => expectDirectReadonlyS2B(approved)).toThrow();
    const wrongReason = withFixtureToolList(s2bBase());
    for (const r of wrongReason.trace) {
      if (r.type === "gate_invocation") r.reason = "mode-not-tui-print";
    }
    expect(() => expectDirectReadonlyS2B(wrongReason)).toThrow();
    const withUI = withFixtureToolList(s2bBase());
    for (const r of withUI.trace) {
      if (r.type === "gate_invocation") r.hasUI = true;
    }
    expect(() => expectDirectReadonlyS2B(withUI)).toThrow();
    const wrongDigest = withFixtureToolList(s2bBase());
    for (const r of wrongDigest.trace) {
      if (r.type === "gate_invocation") r.attemptedDigest = "0".repeat(64);
    }
    expect(() => expectDirectReadonlyS2B(wrongDigest)).toThrow();
  });

  it("rejects split connected registration and connected declaration", () => {
    const split = withFixtureToolList(s2bBase());
    for (const r of split.trace) {
      if (r.type === "registration") r.spawned = false;
    }
    split.trace.push(
      rec(14, "registration", {
        source: "launcher",
        layer: "sdk-pipeline",
        server: "synth-gt",
        policy: "none",
        registered: false,
        connected: false,
        spawned: true,
        reason: "spawn-only",
      }),
    );
    expect(() => expectDirectReadonlyS2B(split)).toThrow();
    const connectedDeclared = withFixtureToolList(s2bBase());
    for (const r of connectedDeclared.trace) {
      if (r.type === "registration_declared") r.connected = true;
    }
    expect(() => expectDirectReadonlyS2B(connectedDeclared)).toThrow();
  });

  it("rejects hidden positive effects, missing shutdown, and non-last cleanup", () => {
    const hidden = withFixtureToolList(s2bBase());
    for (const r of hidden.trace) {
      if (r.seq >= 11) r.seq += 1;
    }
    hidden.trace.push(
      rec(11, "effect_ledger", {
        source: "fixture",
        layer: "sdk-pipeline",
        operationId: SEED.operationId,
        digest: EXPECTED_SEED_SHA,
        final: false,
        counter: 1,
      }),
    );
    hidden.trace.sort((a, b) => a.seq - b.seq);
    expect(() => expectDirectReadonlyS2B(hidden)).toThrow();
    const noShutdown = withFixtureToolList(s2bBase());
    noShutdown.trace = noShutdown.trace.filter((r) => r.type !== "session");
    expect(() => expectDirectReadonlyS2B(noShutdown)).toThrow();
    const late = withFixtureToolList(s2bBase());
    late.trace.push(
      rec(14, "tool_call", {
        layer: "sdk-pipeline",
        name: "mcp__synth_gt__list_workouts",
        toolCallId: "z9",
      }),
    );
    expect(() => expectDirectReadonlyS2B(late)).toThrow();
  });

  it("rejects extra gate invocations, extra joined results, and causal reorder", () => {
    const twoGates = withFixtureToolList(s2bBase());
    twoGates.trace.push(
      rec(14, "gate_invocation", {
        source: "companion",
        layer: "sdk-pipeline",
        operationId: SEED.operationId,
        toolCallId: "cX",
        parentToolCallId: null,
        decision: "deny",
        mode: "print",
        hasUI: false,
        attemptedDigest: EXPECTED_SEED_SHA,
        approvedDigest: null,
        reason: "mode-not-tui:print",
      }),
    );
    expect(() => expectDirectReadonlyS2B(twoGates)).toThrow();
    const twoResults = withFixtureToolList(s2bBase());
    twoResults.trace.push(
      rec(14, "tool_result", {
        source: "pi",
        layer: "sdk-pipeline",
        name: CREATION_TOOL,
        toolCallId: "c1",
        parentToolCallId: null,
        isError: true,
        code: null,
        reason: "duplicate-report",
      }),
    );
    expect(() => expectDirectReadonlyS2B(twoResults)).toThrow();
    const reordered = renumber(withFixtureToolList(s2bBase()));
    const gateAt = reordered.trace.findIndex((r) => r.type === "gate_invocation");
    const resultAt = reordered.trace.findIndex(
      (r) => r.type === "tool_result" && r.toolCallId === "c1",
    );
    [reordered.trace[gateAt], reordered.trace[resultAt]] = [
      reordered.trace[resultAt],
      reordered.trace[gateAt],
    ];
    renumber(reordered);
    expect(() => expectDirectReadonlyS2B(reordered)).toThrow();
  });

  it("rejects undiscovered or unqualified first reads", () => {
    const lateDiscovery = renumber(withFixtureToolList(s2bBase()));
    const listAt = lateDiscovery.trace.findIndex((r) => r.type === "tool_list");
    const readAt = lateDiscovery.trace.findIndex(
      (r) => r.type === "tool_call" && r.toolCallId === "g1",
    );
    [lateDiscovery.trace[listAt], lateDiscovery.trace[readAt]] = [
      lateDiscovery.trace[readAt],
      lateDiscovery.trace[listAt],
    ];
    renumber(lateDiscovery);
    expect(() => expectDirectReadonlyS2B(lateDiscovery)).toThrow();
    const unqualified = withFixtureToolList(s2bBase());
    for (const r of unqualified.trace) {
      if (r.toolCallId === "g1") r.name = "get_exercise";
    }
    expect(() => expectDirectReadonlyS2B(unqualified)).toThrow();
  });
});

describe("T02 validator self-tests: R2 indirect routes (logic-control)", () => {
  // Canned R2 shapes per spec §13. Shared closure: print/no-UI preflight,
  // companion gate before everything, same-record readonly registration,
  // fixture discovery plus launcher first-request/connected surfaces, exact
  // §12 gate denial, null-code error, explicit-null final zero, shutdown
  // before last cleanup. Every value below is a self-test constant only.
  const SEVEN_Q = FIXTURE_TOOLS.map((t) => `mcp__synth_gt__${t}`);
  const READ_Q = "mcp__synth_gt__get_exercise";

  function r2Prefix(scenario) {
    const table = {
      "deferred-readonly": {
        firstActive: ["tool_search"],
        firstCallable: [],
        connectedActive: ["tool_search", ...SEVEN_Q],
        connectedCallable: [...SEVEN_Q],
      },
      "codemode-readonly": {
        firstActive: ["codemode"],
        firstCallable: [READ_Q],
        connectedActive: ["codemode"],
        connectedCallable: [...SEVEN_Q],
      },
      "nested-readonly": {
        firstActive: ["t02_orchestrate", ...SEVEN_Q],
        firstCallable: ["t02_orchestrate", ...SEVEN_Q],
        connectedActive: ["t02_orchestrate", ...SEVEN_Q],
        connectedCallable: ["t02_orchestrate", ...SEVEN_Q],
      },
    }[scenario];
    return [
      rec(0, "preflight", {
        source: "launcher",
        layer: "sdk-pipeline",
        mode: "print",
        hasUI: false,
        uiInjected: false,
      }),
      rec(1, "gate_installed", { source: "companion", layer: "sdk-pipeline" }),
      rec(2, "tool_list", {
        source: "fixture",
        layer: "sdk-pipeline",
        tools: [...FIXTURE_TOOLS],
      }),
      rec(3, "tool_surface", {
        source: "launcher",
        layer: "sdk-pipeline",
        phase: "first-request",
        activeTools: [...table.firstActive],
        callableTools: [...table.firstCallable],
        hiddenTools: [],
        fixtureTools: [],
      }),
      rec(4, "tool_surface", {
        source: "launcher",
        layer: "sdk-pipeline",
        phase: "connected",
        activeTools: [...table.connectedActive],
        callableTools: [...table.connectedCallable],
        hiddenTools: [],
        fixtureTools: [...FIXTURE_TOOLS],
      }),
      rec(5, "registration", {
        source: "launcher",
        layer: "sdk-pipeline",
        server: "synth-gt",
        policy: "readonly",
        registered: true,
        connected: true,
        spawned: true,
        reason: "companion-managed-readonly",
      }),
    ];
  }

  // Creation-denied tail for the deferred route: error result, explicit-null
  // final zero, shutdown, last cleanup (seqs follow the inline gate at 12).
  function r2Tail() {
    return [
      rec(13, "tool_result", {
        source: "pi",
        layer: "sdk-pipeline",
        name: CREATION_TOOL,
        toolCallId: "c1",
        parentToolCallId: null,
        isError: true,
        code: null,
        reason: "gate-denied-print-no-ui",
      }),
      rec(14, "effect_ledger", {
        source: "fixture",
        layer: "sdk-pipeline",
        operationId: null,
        digest: null,
        final: true,
        counter: 0,
      }),
      rec(15, "session", {
        source: "launcher",
        layer: "sdk-pipeline",
        transition: "shutdown",
        reason: "scenario-complete",
      }),
      rec(16, "cleanup", {
        source: "launcher",
        layer: "sdk-pipeline",
        childrenGone: true,
        listenersClosed: true,
        rootsRemoved: true,
        remainingChildren: 0,
        remainingListeners: 0,
      }),
    ];
  }

  // NOTE: each route builder places its own gate record inline; r2Tail only
  // appends the shared creation-denied tail above.
  function deferredBase() {
    return baseReport({
      scenario: "deferred-readonly",
      harness: "sdk",
      layer: "sdk-pipeline",
      effects: { source: "fixture", observation: "fixture-final", total: 0, operations: [] },
      trace: [
        ...r2Prefix("deferred-readonly"),
        rec(6, "tool_call", {
          layer: "sdk-pipeline",
          name: "tool_search",
          toolCallId: "s1",
          parentToolCallId: null,
        }),
        rec(7, "tool_result", {
          source: "pi",
          layer: "sdk-pipeline",
          name: "tool_search",
          toolCallId: "s1",
          parentToolCallId: null,
          isError: false,
        }),
        rec(8, "search_loaded", {
          source: "pi",
          layer: "sdk-pipeline",
          toolCallId: "s1",
          loadedTools: [...SEVEN_Q],
        }),
        rec(9, "tool_call", {
          layer: "sdk-pipeline",
          name: READ_Q,
          toolCallId: "g1",
          parentToolCallId: null,
        }),
        rec(10, "tool_result", {
          source: "pi",
          layer: "sdk-pipeline",
          name: READ_Q,
          toolCallId: "g1",
          parentToolCallId: null,
          isError: false,
        }),
        rec(11, "tool_call", {
          layer: "sdk-pipeline",
          name: CREATION_TOOL,
          operationId: SEED.operationId,
          toolCallId: "c1",
          parentToolCallId: null,
        }),
        rec(12, "gate_invocation", {
          source: "companion",
          layer: "sdk-pipeline",
          operationId: SEED.operationId,
          toolCallId: "c1",
          parentToolCallId: null,
          decision: "deny",
          mode: "print",
          hasUI: false,
          attemptedDigest: EXPECTED_SEED_SHA,
          approvedDigest: null,
          reason: "mode-not-tui:print",
        }),
        ...r2Tail(),
      ],
    });
  }

  function nestedBase(scenario, outerName) {
    return baseReport({
      scenario,
      harness: "sdk",
      layer: "sdk-pipeline",
      effects: { source: "fixture", observation: "fixture-final", total: 0, operations: [] },
      trace: [
        ...r2Prefix(scenario),
        rec(6, "tool_call", {
          layer: "sdk-pipeline",
          name: outerName,
          toolCallId: "o1",
          parentToolCallId: null,
        }),
        rec(7, "tool_call", {
          layer: "sdk-pipeline",
          name: READ_Q,
          toolCallId: "g1",
          parentToolCallId: "o1",
        }),
        rec(8, "tool_result", {
          source: "pi",
          layer: "sdk-pipeline",
          name: READ_Q,
          toolCallId: "g1",
          parentToolCallId: "o1",
          isError: false,
        }),
        rec(9, "tool_call", {
          layer: "sdk-pipeline",
          name: CREATION_TOOL,
          operationId: SEED.operationId,
          toolCallId: "c1",
          parentToolCallId: "o1",
        }),
        rec(10, "gate_invocation", {
          source: "companion",
          layer: "sdk-pipeline",
          operationId: SEED.operationId,
          toolCallId: "c1",
          parentToolCallId: "o1",
          decision: "deny",
          mode: "print",
          hasUI: false,
          attemptedDigest: EXPECTED_SEED_SHA,
          approvedDigest: null,
          reason: "mode-not-tui:print",
        }),
        rec(11, "tool_result", {
          source: "pi",
          layer: "sdk-pipeline",
          name: CREATION_TOOL,
          toolCallId: "c1",
          parentToolCallId: "o1",
          isError: true,
          code: null,
          reason: "gate-denied-print-no-ui",
        }),
        rec(12, "tool_result", {
          source: "pi",
          layer: "sdk-pipeline",
          name: outerName,
          toolCallId: "o1",
          parentToolCallId: null,
          isError: true,
        }),
        rec(13, "effect_ledger", {
          source: "fixture",
          layer: "sdk-pipeline",
          operationId: null,
          digest: null,
          final: true,
          counter: 0,
        }),
        rec(14, "session", {
          source: "launcher",
          layer: "sdk-pipeline",
          transition: "shutdown",
          reason: "scenario-complete",
        }),
        rec(15, "cleanup", {
          source: "launcher",
          layer: "sdk-pipeline",
          childrenGone: true,
          listenersClosed: true,
          rootsRemoved: true,
          remainingChildren: 0,
          remainingListeners: 0,
        }),
      ],
    });
  }

  // Reseat trace seqs by array order after positional swaps (R2-local copy;
  // the R1 block keeps its own untouched for regression stability).
  function renumber(report) {
    report.trace.forEach((r, i) => {
      r.seq = i;
    });
    return report;
  }

  it("accepts the deferred search-loaded shape", () => {
    expect(() => expectDeferredReadonly(deferredBase())).not.toThrow();
  });

  it("deferred rejects missing search_loaded, failed search, and parented read", () => {
    const missing = deferredBase();
    missing.trace = missing.trace.filter((r) => r.type !== "search_loaded");
    expect(() => expectDeferredReadonly(missing)).toThrow();
    const failed = deferredBase();
    for (const r of failed.trace) {
      if (r.type === "tool_result" && r.toolCallId === "s1") r.isError = true;
    }
    expect(() => expectDeferredReadonly(failed)).toThrow();
    const parented = deferredBase();
    for (const r of parented.trace) {
      if (r.type === "tool_call" && r.toolCallId === "g1") r.parentToolCallId = "o1";
    }
    expect(() => expectDeferredReadonly(parented)).toThrow();
  });

  it("accepts the codemode script shape", () => {
    expect(() => expectCodemodeReadonly(nestedBase("codemode-readonly", "codemode"))).not.toThrow();
  });

  it("codemode rejects generated parents and a missing outer call", () => {
    const ghost = nestedBase("codemode-readonly", "codemode");
    for (const r of ghost.trace) {
      if (r.toolCallId === "g1" || r.toolCallId === "c1") r.parentToolCallId = "ghost";
    }
    expect(() => expectCodemodeReadonly(ghost)).toThrow();
    const noOuter = nestedBase("codemode-readonly", "codemode");
    noOuter.trace = noOuter.trace.filter((r) => !(r.type === "tool_call" && r.toolCallId === "o1"));
    expect(() => expectCodemodeReadonly(noOuter)).toThrow();
  });

  it("accepts the nested orchestrate shape", () => {
    expect(() =>
      expectNestedReadonly(nestedBase("nested-readonly", "t02_orchestrate")),
    ).not.toThrow();
  });

  it("nested rejects the wrong outer and a missing outer result", () => {
    const wrongOuter = nestedBase("nested-readonly", "codemode");
    expect(() => expectNestedReadonly(wrongOuter)).toThrow();
    const noOuterResult = nestedBase("nested-readonly", "t02_orchestrate");
    noOuterResult.trace = noOuterResult.trace.filter(
      (r) => !(r.type === "tool_result" && r.toolCallId === "o1"),
    );
    expect(() => expectNestedReadonly(noOuterResult)).toThrow();
  });

  it("R2 rejects inexact search_loaded", () => {
    const short = deferredBase();
    for (const r of short.trace) {
      if (r.type === "search_loaded") r.loadedTools = [...SEVEN_Q].slice(0, 6);
    }
    expect(() => expectDeferredReadonly(short)).toThrow();
    const unqualified = deferredBase();
    for (const r of unqualified.trace) {
      if (r.type === "search_loaded") r.loadedTools = [...FIXTURE_TOOLS];
    }
    expect(() => expectDeferredReadonly(unqualified)).toThrow();
    const wrongId = deferredBase();
    for (const r of wrongId.trace) {
      if (r.type === "search_loaded") r.toolCallId = "zzz";
    }
    expect(() => expectDeferredReadonly(wrongId)).toThrow();
  });

  it("R2 rejects duplicate phases and non-empty hiddenTools", () => {
    const firstOnly = deferredBase();
    firstOnly.trace = firstOnly.trace.filter(
      (r) => !(r.type === "tool_surface" && r.phase === "connected"),
    );
    expect(() => expectDeferredReadonly(firstOnly)).toThrow();
    const duped = deferredBase();
    duped.trace.push(
      rec(17, "tool_surface", {
        source: "launcher",
        layer: "sdk-pipeline",
        phase: "connected",
        activeTools: ["tool_search", ...SEVEN_Q],
        callableTools: [...SEVEN_Q],
        hiddenTools: [],
        fixtureTools: [...FIXTURE_TOOLS],
      }),
    );
    expect(() => expectDeferredReadonly(duped)).toThrow();
    const hidden = deferredBase();
    for (const r of hidden.trace) {
      if (r.type === "tool_surface" && r.phase === "connected") {
        r.hiddenTools = [READ_Q];
      }
    }
    expect(() => expectDeferredReadonly(hidden)).toThrow();
  });

  it("R2 rejects inexact surface sets", () => {
    const extra = deferredBase();
    for (const r of extra.trace) {
      if (r.type === "tool_surface" && r.phase === "connected") {
        r.activeTools = [...r.activeTools, "mcp__synth_gt__bogus"];
      }
    }
    expect(() => expectDeferredReadonly(extra)).toThrow();
    const outerCallable = nestedBase("codemode-readonly", "codemode");
    for (const r of outerCallable.trace) {
      if (r.type === "tool_surface" && r.phase === "first-request") {
        r.callableTools = ["codemode"];
      }
    }
    expect(() => expectCodemodeReadonly(outerCallable)).toThrow();
  });

  it("R2 rejects misordered discovery/creation/read/outer bounds", () => {
    const lateDiscovery = renumber(deferredBase());
    const listAt = lateDiscovery.trace.findIndex((r) => r.type === "tool_list");
    const surfaceAt = lateDiscovery.trace.findIndex(
      (r) => r.type === "tool_surface" && r.phase === "connected",
    );
    [lateDiscovery.trace[listAt], lateDiscovery.trace[surfaceAt]] = [
      lateDiscovery.trace[surfaceAt],
      lateDiscovery.trace[listAt],
    ];
    renumber(lateDiscovery);
    expect(() => expectDeferredReadonly(lateDiscovery)).toThrow();
    const lateRead = renumber(deferredBase());
    const readResAt = lateRead.trace.findIndex(
      (r) => r.type === "tool_result" && r.toolCallId === "g1",
    );
    const createAt = lateRead.trace.findIndex(
      (r) => r.type === "tool_call" && r.toolCallId === "c1",
    );
    [lateRead.trace[readResAt], lateRead.trace[createAt]] = [
      lateRead.trace[createAt],
      lateRead.trace[readResAt],
    ];
    renumber(lateRead);
    expect(() => expectDeferredReadonly(lateRead)).toThrow();
    const earlyOuter = renumber(nestedBase("nested-readonly", "t02_orchestrate"));
    const createResAt = earlyOuter.trace.findIndex(
      (r) => r.type === "tool_result" && r.toolCallId === "c1",
    );
    const outerResAt = earlyOuter.trace.findIndex(
      (r) => r.type === "tool_result" && r.toolCallId === "o1",
    );
    [earlyOuter.trace[createResAt], earlyOuter.trace[outerResAt]] = [
      earlyOuter.trace[outerResAt],
      earlyOuter.trace[createResAt],
    ];
    renumber(earlyOuter);
    expect(() => expectNestedReadonly(earlyOuter)).toThrow();
    const lateReg = renumber(deferredBase());
    const regAt = lateReg.trace.findIndex((r) => r.type === "registration");
    const ledgerAt = lateReg.trace.findIndex((r) => r.type === "effect_ledger");
    [lateReg.trace[regAt], lateReg.trace[ledgerAt]] = [
      lateReg.trace[ledgerAt],
      lateReg.trace[regAt],
    ];
    renumber(lateReg);
    expect(() => expectDeferredReadonly(lateReg)).toThrow();
  });

  it("R2 rejects non-pi call sources and extra native calls", () => {
    const foreign = deferredBase();
    for (const r of foreign.trace) {
      if (r.type === "tool_call" && r.toolCallId === "s1") r.source = "launcher";
    }
    expect(() => expectDeferredReadonly(foreign)).toThrow();
    const extra = deferredBase();
    extra.trace.push(
      rec(17, "tool_call", {
        source: "pi",
        layer: "sdk-pipeline",
        name: READ_Q,
        toolCallId: "g2",
        parentToolCallId: null,
      }),
    );
    expect(() => expectDeferredReadonly(extra)).toThrow();
  });

  it("R2 rejects wrong endpoint result metadata", () => {
    const wrongRead = deferredBase();
    for (const r of wrongRead.trace) {
      if (r.type === "tool_result" && r.toolCallId === "g1") {
        r.name = "mcp__synth_gt__list_workouts";
      }
    }
    expect(() => expectDeferredReadonly(wrongRead)).toThrow();
    const wrongOuter = nestedBase("nested-readonly", "t02_orchestrate");
    for (const r of wrongOuter.trace) {
      if (r.type === "tool_result" && r.toolCallId === "o1") r.parentToolCallId = "o1";
    }
    expect(() => expectNestedReadonly(wrongOuter)).toThrow();
  });

  it("R2 rejects results before starts", () => {
    const backwards = renumber(deferredBase());
    const callAt = backwards.trace.findIndex(
      (r) => r.type === "tool_call" && r.toolCallId === "s1",
    );
    const resultAt = backwards.trace.findIndex(
      (r) => r.type === "tool_result" && r.toolCallId === "s1",
    );
    [backwards.trace[callAt], backwards.trace[resultAt]] = [
      backwards.trace[resultAt],
      backwards.trace[callAt],
    ];
    renumber(backwards);
    expect(() => expectDeferredReadonly(backwards)).toThrow();
  });

  it("R2 rejects omitted or loose first-request fixtureTools", () => {
    const omitted = deferredBase();
    for (const r of omitted.trace) {
      if (r.type === "tool_surface" && r.phase === "first-request") delete r.fixtureTools;
    }
    expect(() => expectDeferredReadonly(omitted)).toThrow();
    const loose = deferredBase();
    for (const r of loose.trace) {
      if (r.type === "tool_surface" && r.phase === "first-request") {
        r.fixtureTools = ["bogus-definition"];
      }
    }
    expect(() => expectDeferredReadonly(loose)).toThrow();
  });
});

describe("T02 validator self-tests: connected-zero refuses absence (logic-control)", () => {
  it("expectConnectedZeroFinal rejects the not-spawned substitute", async () => {
    const { expectConnectedZeroFinal } = await import("./helpers/report-checks.mjs");
    const absent = baseReport({
      trace: [
        rec(0, "registration", {
          server: "synth-gt",
          policy: "none",
          registered: false,
          connected: false,
          spawned: false,
          reason: "no companion",
        }),
      ],
    });
    expect(() => expectConnectedZeroFinal(absent)).toThrow();
    const connected = baseReport({
      effects: { source: "fixture", observation: "fixture-final", total: 0, operations: [] },
      trace: [
        rec(0, "effect_ledger", {
          source: "fixture",
          operationId: null,
          digest: null,
          final: true,
          counter: 0,
        }),
      ],
    });
    expect(expectConnectedZeroFinal(connected)).toBe("fixture-final");
  });
});

describe("T02 validator self-tests: R3 prebind refusal (logic-control)", () => {
  // Canned §14 static-shadow shape: target inventory/settings/binding join one
  // prebind refusal, awaited disposal, then a closed refusal-probe session
  // observes one actual unknown-tool creation attempt (source:none/not-spawned).
  // Every value below is a self-test constant with no pipeline meaning.
  function r3PrebindBase() {
    return baseReport({
      scenario: "static-shadow",
      harness: "sdk",
      layer: "sdk-pipeline",
      trace: [
        rec(0, "resource_inventory", {
          source: "launcher",
          layer: "sdk-pipeline",
          runtimeRole: "target",
          inventoryProvenance: "actual-sdk-loader",
          inlineProfiles: [
            {
              path: "inline:companion",
              handlers: ["tool_call"],
              tools: ["t02_orchestrate"],
              commands: [],
              replaceable: false,
            },
          ],
          loaderErrors: [],
          loaderWarnings: [],
        }),
        rec(1, "static_settings", {
          source: "launcher",
          layer: "sdk-pipeline",
          runtimeRole: "target",
          settingsProvenance: "launcher-owned-loadConfig",
          names: ["synth-gt"],
          entries: [
            {
              name: "synth-gt",
              namespace: "mcp__synth_gt",
              enabled: true,
              exposure: "direct",
              resourceAlias: "fixture:t02",
              policy: "readonly",
            },
          ],
        }),
        rec(2, "binding_check", {
          source: "launcher",
          layer: "sdk-pipeline",
          runtimeRole: "target",
          present: true,
          candidateCount: 1,
          valid: true,
          reason: "binding-ok",
        }),
        rec(3, "prebind_check", {
          source: "launcher",
          layer: "sdk-pipeline",
          runtimeRole: "target",
          supported: false,
          reason: "static-shadow",
          targetBound: false,
          targetLoadConfigCalls: 0,
          targetTransportAttempts: 0,
          registrations: [],
        }),
        rec(4, "target_disposed", {
          source: "launcher",
          layer: "sdk-pipeline",
          runtimeRole: "target",
          shutdownObserved: true,
          targetBound: false,
        }),
        rec(5, "resource_inventory", {
          source: "launcher",
          layer: "sdk-pipeline",
          runtimeRole: "refusal-probe",
          inventoryProvenance: "actual-sdk-loader",
          inlineProfiles: [],
          loaderErrors: [],
          loaderWarnings: [],
        }),
        rec(6, "session-context", {
          source: "launcher",
          layer: "sdk-pipeline",
          runtimeRole: "refusal-probe",
          mode: "print",
          hasUI: false,
          uiInjected: false,
          registrations: [],
        }),
        rec(7, "preflight", {
          source: "launcher",
          layer: "sdk-pipeline",
          runtimeRole: "refusal-probe",
          mode: "print",
          hasUI: false,
          uiInjected: false,
          supported: false,
          reason: "static-shadow",
          targetBound: false,
          inventoryProvenance: "actual-sdk-loader",
        }),
        rec(8, "registration", {
          source: "launcher",
          layer: "sdk-pipeline",
          runtimeRole: "refusal-probe",
          server: "synth-gt",
          policy: "none",
          registered: false,
          connected: false,
          spawned: false,
          transportAttempts: 0,
          loadConfigCalls: 1,
          reason: "static-shadow",
        }),
        rec(9, "tool_call", {
          layer: "sdk-pipeline",
          name: CREATION_TOOL,
          toolCallId: "c1",
          parentToolCallId: null,
        }),
        rec(10, "tool_result", {
          source: "pi",
          layer: "sdk-pipeline",
          name: CREATION_TOOL,
          toolCallId: "c1",
          parentToolCallId: null,
          isError: true,
          code: null,
          reason: "unknown-tool",
        }),
        rec(11, "cleanup", {
          source: "launcher",
          layer: "sdk-pipeline",
          childrenGone: true,
          listenersClosed: true,
          rootsRemoved: true,
          remainingChildren: 0,
          remainingListeners: 0,
        }),
      ],
    });
  }

  it("accepts the prebind refusal shape", () => {
    expect(() =>
      expectR3PrebindRefusal(r3PrebindBase(), { scenario: "static-shadow" }),
    ).not.toThrow();
  });

  it("rejects an interchangeable mode-only reason", () => {
    const report = r3PrebindBase();
    for (const r of report.trace) {
      if (r.type === "prebind_check") r.reason = "mode-not-tui:print";
    }
    expect(() => expectR3PrebindRefusal(report, { scenario: "static-shadow" })).toThrow();
  });

  it("rejects a gate substitute and an invented fixture ledger", () => {
    const gated = r3PrebindBase();
    gated.trace.push(
      rec(12, "gate_invocation", {
        source: "companion",
        layer: "sdk-pipeline",
        toolCallId: "c1",
        decision: "deny",
      }),
    );
    expect(() => expectR3PrebindRefusal(gated, { scenario: "static-shadow" })).toThrow();
    const ledger = r3PrebindBase();
    ledger.trace.push(
      rec(12, "effect_ledger", {
        source: "fixture",
        layer: "sdk-pipeline",
        operationId: null,
        digest: null,
        final: true,
        counter: 0,
      }),
    );
    expect(() => expectR3PrebindRefusal(ledger, { scenario: "static-shadow" })).toThrow();
  });

  it("rejects a fabricated receiver code on the probe result", () => {
    const report = r3PrebindBase();
    for (const r of report.trace) {
      if (r.type === "tool_result" && r.toolCallId === "c1") {
        r.code = REFUSAL.needsApproval;
      }
    }
    expect(() => expectR3PrebindRefusal(report, { scenario: "static-shadow" })).toThrow();
  });

  it("rejects missing disposal and reordered names", () => {
    const noDisposal = r3PrebindBase();
    noDisposal.trace = noDisposal.trace.filter((r) => r.type !== "target_disposed");
    expect(() => expectR3PrebindRefusal(noDisposal, { scenario: "static-shadow" })).toThrow();
    const renamed = r3PrebindBase();
    for (const r of renamed.trace) {
      if (r.type === "static_settings") r.names = ["synth_gt"];
    }
    expect(() => expectR3PrebindRefusal(renamed, { scenario: "static-shadow" })).toThrow();
  });

  it("rejects probe registration without probe role, attempts, or callback count", () => {
    const noRole = r3PrebindBase();
    for (const r of noRole.trace) {
      if (r.type === "registration") delete r.runtimeRole;
    }
    expect(() => expectR3PrebindRefusal(noRole, { scenario: "static-shadow" })).toThrow();
    const attempted = r3PrebindBase();
    for (const r of attempted.trace) {
      if (r.type === "registration") r.transportAttempts = 1;
    }
    expect(() => expectR3PrebindRefusal(attempted, { scenario: "static-shadow" })).toThrow();
    const noCallback = r3PrebindBase();
    for (const r of noCallback.trace) {
      if (r.type === "registration") r.loadConfigCalls = 0;
    }
    expect(() => expectR3PrebindRefusal(noCallback, { scenario: "static-shadow" })).toThrow();
  });
});

describe("T02 validator self-tests: R3 hidden tool (logic-control)", () => {
  const SIX_Q = FIXTURE_TOOLS.filter((t) => t !== "create_routine").map(
    (t) => `mcp__synth_gt__${t}`,
  );
  const SIX_U = FIXTURE_TOOLS.filter((t) => t !== "create_routine");

  function hiddenBase() {
    return baseReport({
      scenario: "hidden-tool",
      harness: "sdk",
      layer: "sdk-pipeline",
      effects: { source: "fixture", observation: "fixture-final", total: 0, operations: [] },
      trace: [
        rec(0, "prebind_check", {
          source: "launcher",
          layer: "sdk-pipeline",
          supported: true,
          reason: "profile-ok",
          targetBound: false,
        }),
        rec(1, "preflight", {
          source: "launcher",
          layer: "sdk-pipeline",
          mode: "print",
          hasUI: false,
          uiInjected: false,
          supported: true,
          reason: "hidden-readonly-profile",
        }),
        rec(2, "gate_installed", { source: "companion", layer: "sdk-pipeline" }),
        rec(3, "tool_surface", {
          source: "launcher",
          layer: "sdk-pipeline",
          phase: "first-request",
          activeTools: [...SIX_Q],
          callableTools: [...SIX_Q],
          hiddenTools: [CREATION_TOOL],
          fixtureTools: [...SIX_U],
        }),
        rec(4, "tool_surface", {
          source: "launcher",
          layer: "sdk-pipeline",
          phase: "connected",
          activeTools: [...SIX_Q],
          callableTools: [...SIX_Q],
          hiddenTools: [CREATION_TOOL],
          fixtureTools: [...SIX_U],
        }),
        rec(5, "tool_list", {
          source: "fixture",
          layer: "sdk-pipeline",
          tools: [...FIXTURE_TOOLS],
        }),
        rec(6, "registration", {
          source: "launcher",
          layer: "sdk-pipeline",
          server: "synth-gt",
          policy: "readonly",
          registered: true,
          connected: true,
          spawned: true,
          reason: "hidden-readonly",
        }),
        rec(7, "tool_call", {
          layer: "sdk-pipeline",
          name: "mcp__synth_gt__get_exercise",
          toolCallId: "g1",
          parentToolCallId: null,
        }),
        rec(8, "tool_result", {
          source: "pi",
          layer: "sdk-pipeline",
          name: "mcp__synth_gt__get_exercise",
          toolCallId: "g1",
          parentToolCallId: null,
          isError: false,
        }),
        rec(9, "tool_call", {
          layer: "sdk-pipeline",
          name: CREATION_TOOL,
          toolCallId: "c1",
          parentToolCallId: null,
        }),
        rec(10, "tool_result", {
          source: "pi",
          layer: "sdk-pipeline",
          name: CREATION_TOOL,
          toolCallId: "c1",
          parentToolCallId: null,
          isError: true,
          code: null,
          reason: "unknown-tool",
        }),
        rec(11, "effect_ledger", {
          source: "fixture",
          layer: "sdk-pipeline",
          operationId: null,
          digest: null,
          final: true,
          counter: 0,
        }),
        rec(12, "cleanup", {
          source: "launcher",
          layer: "sdk-pipeline",
          childrenGone: true,
          listenersClosed: true,
          rootsRemoved: true,
          remainingChildren: 0,
          remainingListeners: 0,
        }),
      ],
    });
  }

  it("accepts the hidden connected shape", () => {
    expect(() => expectR3HiddenTool(hiddenBase())).not.toThrow();
  });

  it("rejects creation listed as callable and a creation gate", () => {
    const visible = hiddenBase();
    for (const r of visible.trace) {
      if (r.type === "tool_surface") {
        r.activeTools = [...SIX_Q, CREATION_TOOL];
        r.callableTools = [...SIX_Q, CREATION_TOOL];
        r.hiddenTools = [];
      }
    }
    expect(() => expectR3HiddenTool(visible)).toThrow();
    const gated = hiddenBase();
    gated.trace.push(
      rec(13, "gate_invocation", {
        source: "companion",
        layer: "sdk-pipeline",
        toolCallId: "c1",
        decision: "deny",
      }),
    );
    expect(() => expectR3HiddenTool(gated)).toThrow();
  });
});
