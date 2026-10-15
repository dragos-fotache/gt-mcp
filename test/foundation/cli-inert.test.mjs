// T01 QA: inert CLI entry checks (approved spec §3).
//
// Black-box only: `main(args, io)` returns 0 with the exact help text for
// exactly `--help`, and 78 with the exact stderr text for any other args
// (including none). Direct execution wires `io` to stdio and never dispatches
// on import. `main` must not call process.exit itself: the subprocess probes
// below would fail to print their JSON markers if it did.

import { describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { DIST, evalArgs, execArgs, reportViolations, runNode } from "./harness.mjs";
import { EXPECT } from "../fixtures/synthetic-vectors.mjs";

const CLI_URL = pathToFileURL(DIST.cli).href;

function mainProbeCall(argsLiteral) {
  return [
    `const ns = await import(${JSON.stringify(CLI_URL)});`,
    "const out = []; const err = [];",
    `const rc = ns.main(${argsLiteral}, { stdout: (t) => out.push(t), stderr: (t) => err.push(t) });`,
    "console.log(JSON.stringify({ rc, out, err }));",
  ].join("\n");
}

describe("T01 inert CLI entry (approved spec §3)", () => {
  it("direct execution with exactly --help prints exact help to stdout", { timeout: 30000 }, () => {
    const result = runNode({ args: execArgs(DIST.cli, ["--help"]) });
    expect(result.spawnError).toBeNull();
    expect(result.exitCode).toBe(EXPECT.EXIT_OK);
    expect(result.stdout).toBe(EXPECT.cliHelpStdout);
    expect(result.stderr).toBe("");
    expect(reportViolations(result.report)).toEqual([]);
  });

  for (const argv of [[], ["--version"], ["login"], ["logout"], ["--help", "extra"]]) {
    it(
      `direct execution with argv ${JSON.stringify(argv)} exits 78 with exact stderr`,
      { timeout: 30000 },
      () => {
        const result = runNode({ args: execArgs(DIST.cli, argv) });
        expect(result.spawnError).toBeNull();
        expect(result.exitCode).toBe(EXPECT.EXIT_NOT_IMPLEMENTED);
        expect(result.stdout).toBe("");
        expect(result.stderr).toBe(EXPECT.cliOtherStderr);
        expect(reportViolations(result.report)).toEqual([]);
      },
    );
  }

  it('main(["--help"], io) returns 0 with exact stdout and no stderr', { timeout: 30000 }, () => {
    const result = runNode({ args: evalArgs(mainProbeCall('["--help"]')) });
    expect(result.exitCode).toBe(EXPECT.EXIT_OK);
    expect(result.stderr).toBe("");
    expect(reportViolations(result.report)).toEqual([]);
    const observed = JSON.parse(result.stdout.trim());
    expect(observed.rc).toBe(0);
    expect(observed.out.join("")).toBe(EXPECT.cliHelpStdout);
    expect(observed.err.join("")).toBe("");
  });

  for (const argsLiteral of [
    "[]",
    '["--version"]',
    '["login"]',
    '["logout"]',
    '["--help", "extra"]',
  ]) {
    it(
      `main(${argsLiteral}, io) returns 78 with exact stderr and empty stdout`,
      { timeout: 30000 },
      () => {
        const result = runNode({ args: evalArgs(mainProbeCall(argsLiteral)) });
        expect(result.exitCode).toBe(EXPECT.EXIT_OK);
        expect(result.stderr).toBe("");
        expect(reportViolations(result.report)).toEqual([]);
        const observed = JSON.parse(result.stdout.trim());
        expect(observed.rc).toBe(EXPECT.EXIT_NOT_IMPLEMENTED);
        expect(observed.out.join("")).toBe("");
        expect(observed.err.join("")).toBe(EXPECT.cliOtherStderr);
      },
    );
  }

  it("importing the CLI never dispatches commands from argv", { timeout: 30000 }, () => {
    const code = [
      'process.argv = ["node", "gymtracka-mcp", "login"];',
      `await import(${JSON.stringify(CLI_URL)});`,
    ].join("\n");
    const result = runNode({ args: evalArgs(code) });
    expect(result.exitCode).toBe(EXPECT.EXIT_OK);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
    expect(reportViolations(result.report)).toEqual([]);
  });
});
