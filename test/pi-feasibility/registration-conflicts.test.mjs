// T02 QA: R3 SDK prebind refusal + hidden reachability (spec §14).
//
// Layer sdk-pipeline (print, no injected UI). The first eight cases here refuse
// the actual target profile BEFORE bind/session_start/connection and then
// observe one actual unknown-tool creation attempt on a separately identified
// closed refusal-probe session (source:none/not-spawned, no invented ledger).
// binding-missing/binding-ambiguous live in lifecycle-binding.test.mjs under
// the same §14 predicate. hidden-tool is the single connected exception:
// a supported print/no-UI bound target with one readonly fixture where the
// six reads stay callable and creation is unreachable (unknown-tool, no gate).
// Six accepted SDK profiles (S1/S2A/direct/deferred/codemode/nested readonly)
// are regressions in readonly-sdk.test.mjs and stay untouched.

import { describe, it } from "vitest";
import { cleanup, runScenario } from "./helpers/spawn-report.mjs";
import { expectR3HiddenTool, expectR3PrebindRefusal } from "./helpers/report-checks.mjs";

const TIMEOUT = 120000;

describe("T02 R3 static/normalized conflicts refuse before bind (spec §14)", () => {
  for (const scenario of [
    "static-shadow",
    "normalized-collision",
    "normalized-collision-reversed",
  ]) {
    it(
      `${scenario}: prebind refusal with exact static/binding evidence, probe unknown-tool`,
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

describe("T02 R3 replacement/missing/unsupported profiles refuse before bind (spec §14)", () => {
  for (const scenario of [
    "replacement-mcp",
    "replacement-codemode",
    "missing-mcp",
    "unsupported-inventory",
  ]) {
    it(
      `${scenario}: prebind refusal with exact inventory/binding evidence, probe unknown-tool`,
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

describe("T02 R3 hidden tool stays unreachable on a connected fixture (spec §14)", () => {
  it(
    "hidden-tool: six reads callable, creation hidden, read success then unknown-tool, final zero",
    { timeout: TIMEOUT },
    () => {
      const { report, root } = runScenario("hidden-tool", "sdk");
      try {
        expectR3HiddenTool(report);
      } finally {
        cleanup(root);
      }
    },
  );
});
