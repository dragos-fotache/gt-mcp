// T01 QA calibration runner (plain node, no test framework).
//
// Executes ONLY the QA-owned synthetic probes from calibration-cases.mjs in
// fresh intercepted subprocesses — never production targets. Runnable now:
// `node test/foundation/run-calibration.mjs [--json <path>]`.
// Exit 0 when every probe behaves as specified; exit 1 otherwise with a
// per-case table. A `--json` path receives the machine-readable results for
// evidence transcription.

import assert from "node:assert/strict";
import fs from "node:fs";
import { evalArgs, reportViolations, runNode } from "./harness.mjs";
import { CASES } from "./calibration-cases.mjs";

const jsonOut = process.argv[2] === "--json" ? process.argv[3] : undefined;

const results = [];
let failed = 0;

for (const probe of CASES) {
  const run = runNode({ args: evalArgs(probe.code) });
  const violations = reportViolations(run.report);
  const problems = [];
  if (run.spawnError) problems.push(`spawn: ${run.spawnError}`);
  if (probe.expectExit !== undefined && run.exitCode !== probe.expectExit) {
    problems.push(`exit ${run.exitCode} (signal ${run.signal}) !== expected ${probe.expectExit}`);
  }
  if (probe.expectExitNonZero && !(run.exitCode !== null && run.exitCode !== 0)) {
    problems.push(`expected nonzero exit, got ${run.exitCode} (signal ${run.signal})`);
  }
  for (const wanted of probe.expectViolations ?? []) {
    if (!violations.some((v) => v.includes(wanted))) {
      problems.push(
        `missing violation ${JSON.stringify(wanted)}; observed ${JSON.stringify(violations)}`,
      );
    }
  }
  if (probe.expectClean && violations.length > 0) {
    problems.push(`expected clean report; observed ${JSON.stringify(violations)}`);
  }
  if (probe.expectOut !== undefined) {
    try {
      assert.equal(run.stdout, probe.expectOut);
    } catch {
      problems.push(
        `stdout ${JSON.stringify(run.stdout)} !== expected ${JSON.stringify(probe.expectOut)}`,
      );
    }
  }
  const ok = problems.length === 0;
  if (!ok) failed += 1;
  results.push({ name: probe.name, ok, exitCode: run.exitCode, violations, problems });
  console.log(`${ok ? "PASS" : "FAIL"}  ${probe.name}`);
  for (const problem of problems) console.log(`      - ${problem}`);
}

console.log(
  failed === 0
    ? `\ncalibration: ${results.length}/${results.length} probes behaved as specified`
    : `\ncalibration: ${failed}/${results.length} probes MISBEHAVED`,
);

if (jsonOut) {
  fs.writeFileSync(jsonOut, JSON.stringify({ results }, null, 2));
}

process.exit(failed === 0 ? 0 : 1);
