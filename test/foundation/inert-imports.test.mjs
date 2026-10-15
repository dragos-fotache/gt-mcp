// T01 QA: inert import checks (approved spec §2–§3).
//
// Black-box only: each public artifact is imported in a fresh intercepted
// subprocess with arbitrary argv present in the environment. Expectations:
// exit 0, empty stdout/stderr, and a clean intercept report. Barrels must
// expose no runtime exports (type-only). Server/CLI must expose `main` and no
// seven-tool runtime export. No production or generated sources are read.

import { describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { DIST, evalArgs, importArgs, reportViolations, runNode } from "./harness.mjs";

const ARTIFACTS = [
  ["root barrel", DIST.barrel],
  ["contracts barrel", DIST.contracts],
  ["server entry", DIST.server],
  ["cli entry", DIST.cli],
  ["companion factory", DIST.companion],
];

describe("T01 inert imports (approved spec §3)", () => {
  for (const [name, artifact] of ARTIFACTS) {
    it(`importing ${name} has no observable effects`, { timeout: 30000 }, () => {
      const result = runNode({ args: importArgs(artifact) });
      expect(result.spawnError).toBeNull();
      expect(result.signal).toBeNull();
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe("");
      expect(reportViolations(result.report)).toEqual([]);
    });
  }

  for (const [name, artifact] of ARTIFACTS) {
    it(`importing ${name} preserves argv and a preset nonzero exitCode`, { timeout: 30000 }, () => {
      const code = [
        "process.argv.push('--qa-arbitrary-argv', '--qa-second');",
        "process.exitCode = 41;",
        `await import(${JSON.stringify(pathToFileURL(artifact).href)});`,
        "if (process.exitCode !== 41) { console.error(`import changed exitCode to ${process.exitCode}`); process.exit(99); }",
        "process.exitCode = 0;",
      ].join("\n");
      const result = runNode({ args: evalArgs(code) });
      expect(result.spawnError).toBeNull();
      // The probe resets exitCode to 0 after asserting the import left it
      // untouched, so a 0 here means "import changed nothing".
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toBe("");
      expect(reportViolations(result.report)).toEqual([]);
    });
  }

  it("barrels expose no runtime exports (type-only)", { timeout: 30000 }, () => {
    for (const barrel of [DIST.barrel, DIST.contracts]) {
      const code = `const ns = await import(${JSON.stringify(
        pathToFileURL(barrel).href,
      )}); console.log(JSON.stringify(Object.keys(ns).sort()));`;
      const result = runNode({ args: evalArgs(code) });
      expect(result.spawnError).toBeNull();
      expect(result.exitCode).toBe(0);
      // This probe intentionally prints its own key list; stderr stays empty
      // and the intercept report must still be clean.
      expect(result.stdout.trim()).toBe("[]");
      expect(result.stderr).toBe("");
      expect(reportViolations(result.report)).toEqual([]);
    }
  });

  it("server/cli expose main and no seven-tool runtime export", { timeout: 30000 }, () => {
    const code = [
      `const server = await import(${JSON.stringify(pathToFileURL(DIST.server).href)});`,
      `const cli = await import(${JSON.stringify(pathToFileURL(DIST.cli).href)});`,
      "console.log(JSON.stringify({",
      "  serverKeys: Object.keys(server).sort(),",
      "  cliKeys: Object.keys(cli).sort(),",
      "  serverMain: typeof server.main === 'function',",
      "  cliMain: typeof cli.main === 'function',",
      "}));",
    ].join("\n");
    const result = runNode({ args: evalArgs(code) });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(reportViolations(result.report)).toEqual([]);
    const observed = JSON.parse(result.stdout.trim());
    expect(observed.serverKeys).toContain("main");
    expect(observed.cliKeys).toContain("main");
    expect(observed.serverMain).toBe(true);
    expect(observed.cliMain).toBe(true);
    for (const key of [...observed.serverKeys, ...observed.cliKeys]) {
      expect(key).not.toBe("create_routine");
      expect(key.toLowerCase()).not.toContain("tool");
    }
  });
});
