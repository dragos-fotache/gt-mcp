// T02 QA: non-tui/no-UI modes cannot register write capability (spec §§6-8).
//
// Actual ctx.mode is distinguished from hasUI. mode-rpc-has-ui exercises the
// genuine RPC adapter: preflight must show actual mode:rpc AND hasUI:true
// (never faked inside a print context, never injected), with no terminal
// approval and no guarded capability. The no-ui probe binds mode:tui without
// UI to establish that missing UI blocks; it is sdk-pipeline, never TUI.

import { describe, expect, it } from "vitest";
import { cleanup, runScenario } from "./helpers/spawn-report.mjs";
import {
  expectCleanup,
  expectDenialResult,
  expectEnvelope,
  expectNoEffectOutcome,
  expectNoGuardedConnected,
  expectTraceWellFormed,
  recordsOfType,
} from "./helpers/report-checks.mjs";
import { REFUSAL } from "../fixtures/t02/synthetic-seed.mjs";

const TIMEOUT = 120000;
const LAYER = "sdk-pipeline";

function checkReadOnlyMode(scenario) {
  const { report, root } = runScenario(scenario, "sdk");
  try {
    expectEnvelope(report, { scenario, harness: "sdk", layer: LAYER });
    expectTraceWellFormed(report, { allowedLayers: [LAYER, "logic-control"] });
    expectNoGuardedConnected(report, scenario);
    expect(recordsOfType(report, "approval_prompt").length, "no approval").toBe(0);
    expectDenialResult(report, {
      codes: [REFUSAL.needsApproval, REFUSAL.invalidArgs],
      allowNullHostCode: true,
    });
    expectNoEffectOutcome(report);
    expectCleanup(report);
  } finally {
    cleanup(root);
  }
}

describe("T02 non-tui and no-UI modes stay read-only (spec §7)", () => {
  for (const scenario of ["mode-print", "mode-json", "mode-rpc-has-ui", "no-ui"]) {
    it(
      `${scenario}: no write-capable registration, no auto-approve, no-effect outcome`,
      { timeout: TIMEOUT },
      () => checkReadOnlyMode(scenario),
    );
  }

  it("mode-rpc-has-ui: actual mode rpc AND hasUI true, no UI injection", { timeout: TIMEOUT }, () => {
    const { report, root } = runScenario("mode-rpc-has-ui", "sdk");
    try {
      const preflights = recordsOfType(report, "preflight");
      expect(preflights.length, "preflight record present").toBeGreaterThan(0);
      const rpc = preflights.filter((p) => p.mode === "rpc");
      expect(rpc.length, "genuine rpc mode observed").toBeGreaterThan(0);
      for (const preflight of rpc) {
        expect(preflight.hasUI, "hasUI true in RPC adapter").toBe(true);
        expect(preflight.uiInjected ?? false, "no injected UI").toBe(false);
      }
    } finally {
      cleanup(root);
    }
  });

  it("no-ui: mode tui without UI still blocks writes", { timeout: TIMEOUT }, () => {
    const { report, root } = runScenario("no-ui", "sdk");
    try {
      const preflights = recordsOfType(report, "preflight");
      expect(preflights.length, "preflight record present").toBeGreaterThan(0);
      expect(
        preflights.some((p) => p.mode === "tui"),
        "tui mode bound without UI context",
      ).toBe(true);
      for (const preflight of preflights) {
        expect(preflight.uiInjected ?? false, "no injected UI").toBe(false);
      }
      expectNoGuardedConnected(report, "no-ui");
      expectNoEffectOutcome(report);
    } finally {
      cleanup(root);
    }
  });
});
