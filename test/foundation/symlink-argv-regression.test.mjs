// T01 QA: symlink-invocation + argv-match import-inertness regression tests
// (approved spec §3, coordinator black-box finding).
//
// Regression: npm-style symlink invocation of the advertised bin commands
// silently yielded exit 0 with empty output for both CLI and server. The
// clarified contract requires: direct invocation through an ordinary
// filesystem symlink (as npm creates for bin commands) produces the same
// specified results as direct-path invocation; and importing an entry while
// argv[1] happens to equal its public path remains inert (argument values
// alone cannot turn an import into direct execution).
//
// Black-box only: temporary symlinks live in the synthetic scope and are
// cleaned afterward; no production or generated sources are read.

import { describe, expect, it } from "vitest";
import { pathToFileURL } from "node:url";
import { DIST, evalArgs, reportViolations, runNode, runNodeViaLink } from "./harness.mjs";
import { EXPECT } from "../fixtures/synthetic-vectors.mjs";
import fs from "node:fs";
import path from "node:path";
import { runServer, syntheticScope, USAGE } from "../stdio-server/helpers.mjs";

describe("T01 symlink invocation matches direct-path behavior (approved spec §3)", () => {
  for (const argv of [[], ["--stdio"], ["--help", "extra-arg"]]) {
    it(
      `server through symlink with argv ${JSON.stringify(argv)} follows S3 startup`,
      { timeout: 30000 },
      () => {
        const scope = syntheticScope();
        try {
          const link = path.join(scope.dir, "synthetic-server-bin.js");
          fs.symlinkSync(DIST.server, link);
          const result = runServer({ entry: link, args: argv });
          expect(result.error).toBeUndefined();
          expect(result.signal).toBeNull();
          expect(result.status).toBe(argv.length ? 64 : 0);
          expect(result.stdout).toBe("");
          expect(result.stderr).toBe(argv.length ? USAGE : "");
        } finally {
          scope.cleanup();
        }
      },
    );
  }

  it(
    "CLI through symlink with exactly --help prints exact help to stdout",
    { timeout: 30000 },
    () => {
      const result = runNodeViaLink({ target: DIST.cli, argv: ["--help"] });
      expect(result.spawnError).toBeNull();
      expect(result.exitCode).toBe(EXPECT.EXIT_OK);
      expect(result.stdout).toBe(EXPECT.cliHelpStdout);
      expect(result.stderr).toBe("");
      expect(reportViolations(result.report)).toEqual([]);
    },
  );

  for (const argv of [[], ["--version"], ["login"]]) {
    it(
      `CLI through symlink with argv ${JSON.stringify(argv)} exits 78 with exact stderr`,
      { timeout: 30000 },
      () => {
        const result = runNodeViaLink({ target: DIST.cli, argv });
        expect(result.spawnError).toBeNull();
        expect(result.exitCode).toBe(EXPECT.EXIT_NOT_IMPLEMENTED);
        expect(result.stdout).toBe("");
        expect(result.stderr).toBe(EXPECT.cliOtherStderr);
        expect(reportViolations(result.report)).toEqual([]);
      },
    );
  }
});

describe("T01 argv-match import inertness (approved spec §3)", () => {
  for (const [name, artifact] of [
    ["server entry", DIST.server],
    ["cli entry", DIST.cli],
  ]) {
    it(
      `importing ${name} stays inert when argv[1] equals its public path`,
      { timeout: 30000 },
      () => {
        // argv[1] mimics direct execution exactly (node <path> --help), yet an
        // import must never dispatch: values alone cannot trigger execution.
        // The probe asserts a preset exitCode is untouched (reset to 0 only by
        // the probe itself), so a 0 below means "import changed nothing".
        const code = [
          `process.argv = [process.execPath, ${JSON.stringify(artifact)}, "--help"];`,
          "process.exitCode = 41;",
          `await import(${JSON.stringify(pathToFileURL(artifact).href)});`,
          "if (process.exitCode !== 41) { console.error(`import changed exitCode to ${process.exitCode}`); process.exit(99); }",
          "process.exitCode = 0;",
        ].join("\n");
        const result = runNode({ args: evalArgs(code) });
        expect(result.spawnError).toBeNull();
        expect(result.exitCode).toBe(EXPECT.EXIT_OK);
        expect(result.stdout).toBe("");
        expect(result.stderr).toBe("");
        expect(reportViolations(result.report)).toEqual([]);
      },
    );
  }
});
