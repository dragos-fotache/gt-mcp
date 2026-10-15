// T02 QA: R1 S2B direct-readonly/sdk companion gate (spec §11) plus R2
// indirect readonly routes (spec §13) and absent/generic baselines
// (specs §§7-8/10).
//
// Layer: sdk-pipeline (scripted local provider through the actual pinned Pi
// agent loop/hooks; mode print, no injected UI). R1 S2B is the strict
// companion-managed profile: exactly one companion-origin synchronous gate
// before registration denies the actual creation call in observed print/no-UI
// mode, reads succeed on the connected read-only fixture, and the fixture's
// own final zero ledger plus real cleanup close the run. No receiver_check,
// sidecar verdict, approval prompt, or guarded capability may be invented,
// and the generic S2A receiver refusal (structured write_approval_required
// with no gate) must not pass the S2B case. Exactly seven tools may stay
// advertised while creation is unavailable: tool_list carries the seven
// unqualified fixture names from actual MCP discovery (source:fixture),
// listing is not capability. no-companion (absent, policy:none) vs
// generic-readonly (connected receiver refusal) stay distinguished per
// specs §§8/10-11: absence asserts spawn absence + actual unavailable call,
// never an invented ledger. R2 (spec §13) gives each indirect route its own
// native call/parent joins: deferred proves tool_search-loaded discovery with
// null-parent read/create; codemode/nested prove inner calls carrying the
// actual outer native ID with inner denial independent of the outer result.
// R3-R11 slices are held.

import { describe, expect, it } from "vitest";
import { cleanup, runScenario } from "./helpers/spawn-report.mjs";
import {
  expectCleanup,
  expectCodemodeReadonly,
  expectDeferredReadonly,
  expectDenialResult,
  expectDirectReadonlyS2B,
  expectEnvelope,
  expectNestedReadonly,
  expectNoEffectOutcome,
  expectReadSuccess,
  expectTraceWellFormed,
  recordsOfType,
} from "./helpers/report-checks.mjs";
import { FIXTURE_TOOLS, REFUSAL } from "../fixtures/t02/synthetic-seed.mjs";

const TIMEOUT = 120000;
const LAYER = "sdk-pipeline";

describe("T02 R2 deferred-readonly/sdk search-loaded route (spec §13)", () => {
  it(
    "deferred-readonly: tool_search loads, null-parent read/create denied, fixture final zero",
    { timeout: TIMEOUT },
    () => {
      const { report, root } = runScenario("deferred-readonly", "sdk");
      try {
        expectDeferredReadonly(report);
      } finally {
        cleanup(root);
      }
    },
  );
});

describe("T02 R2 codemode-readonly/sdk script route (spec §13)", () => {
  it(
    "codemode-readonly: inner calls carry outer ID, inner denial holds, fixture final zero",
    { timeout: TIMEOUT },
    () => {
      const { report, root } = runScenario("codemode-readonly", "sdk");
      try {
        expectCodemodeReadonly(report);
      } finally {
        cleanup(root);
      }
    },
  );
});

describe("T02 R2 nested-readonly/sdk orchestrate route (spec §13)", () => {
  it(
    "nested-readonly: inner calls carry orchestrate ID, inner denial holds, fixture final zero",
    { timeout: TIMEOUT },
    () => {
      const { report, root } = runScenario("nested-readonly", "sdk");
      try {
        expectNestedReadonly(report);
      } finally {
        cleanup(root);
      }
    },
  );
});

describe("T02 R1 S2B direct-readonly/sdk companion gate (spec §11)", () => {
  it(
    "direct-readonly: synchronous companion gate denies in print/no-UI, reads succeed, fixture final zero",
    { timeout: TIMEOUT },
    () => {
      const { report, root } = runScenario("direct-readonly", "sdk");
      try {
        expectDirectReadonlyS2B(report);
      } finally {
        cleanup(root);
      }
    },
  );
});

describe("T02 absent vs connected-readonly registration (spec §§7-8)", () => {
  it(
    "no-companion: policy none, spawn absence, actual unavailable call",
    { timeout: TIMEOUT },
    () => {
      const { report, root } = runScenario("no-companion", "sdk");
      try {
        expectEnvelope(report, { scenario: "no-companion", harness: "sdk", layer: LAYER });
        expectTraceWellFormed(report, { allowedLayers: [LAYER, "logic-control"] });
        const registrations = recordsOfType(report, "registration");
        const writable = registrations.filter((r) => r.policy === "guarded");
        expect(writable.length, "no guarded registration without companion").toBe(0);
        // Unavailable-tool observations may carry a null host code with a safe
        // reason; they must never be fabricated into a fixture refusal.
        expectDenialResult(report, {
          codes: [REFUSAL.needsApproval, REFUSAL.invalidArgs],
          allowNullHostCode: true,
        });
        expect(report.effects.observation).toBe("not-spawned");
        expectNoEffectOutcome(report);
        // Preflight-refused/absent case: registration/spawn absence plus
        // attempted-call failure and no child effect source (spec §7).
        const preflights = recordsOfType(report, "preflight");
        expect(preflights.length, "preflight record present").toBeGreaterThan(0);
        expectCleanup(report);
      } finally {
        cleanup(root);
      }
    },
  );

  it(
    "generic-readonly: connected fixture stays read-only, seven tools listed",
    { timeout: TIMEOUT },
    () => {
      const { report, root } = runScenario("generic-readonly", "sdk");
      try {
        expectEnvelope(report, {
          scenario: "generic-readonly",
          harness: "sdk",
          layer: LAYER,
        });
        expectTraceWellFormed(report, { allowedLayers: [LAYER, "logic-control"] });
        // Tool presence is not capability: all seven unqualified names advertised
        // from actual MCP discovery, never from a driver constant list.
        const listed = recordsOfType(report, "tool_list");
        expect(listed.length, "tool_list from actual discovery").toBeGreaterThan(0);
        for (const entry of listed) {
          expect(entry.source).toBe("fixture");
          expect(entry.tools.length, "exactly the seven fixture names").toBe(7);
          for (const name of FIXTURE_TOOLS) {
            expect(entry.tools.includes(name), `advertised ${name}`).toBe(true);
          }
        }
        expectDenialResult(report, { codes: [REFUSAL.needsApproval] });
        expect(report.effects.observation).toBe("fixture-final");
        expectNoEffectOutcome(report);
        // S2A bounded profile (spec §10): generic read-only default with no
        // approval companion, sidecar, binding file, or approval listener.
        // No gate_installed/approval observation may exist for this profile;
        // creation actually reaches the receiver, which refuses it, and the
        // zero-effect evidence is the receiver's own final ledger (asserted
        // above). get_exercise genuinely succeeds on the same connection.
        expect(
          recordsOfType(report, "gate_installed").length,
          "no fabricated gate for the generic profile",
        ).toBe(0);
        expect(
          recordsOfType(report, "approval_prompt").length,
          "no approval prompt for the generic profile",
        ).toBe(0);
        expectReadSuccess(report, "get_exercise");
        // Actual SDK context remains print/no UI (spec §10): explicit false
        // fields, never defaulted when missing.
        const preflights = recordsOfType(report, "preflight");
        expect(preflights.length, "preflight record present").toBeGreaterThan(0);
        for (const preflight of preflights) {
          expect(preflight.mode, "print context").toBe("print");
          expect(preflight.hasUI, "explicit hasUI false").toBe(false);
          expect(preflight.uiInjected, "explicit uiInjected false").toBe(false);
        }
        expectCleanup(report);
      } finally {
        cleanup(root);
      }
    },
  );
});
