// T05 unit: builtin import-interception harness for inert imports. Children
// install ESM resolve-hook shims (frozen module namespaces) plus
// mutable-global patches BEFORE importing exactly one target, so IO, network,
// process launch, timers, listeners, exit and writes cannot complete silently
// before any snapshot. Calibration controls import ONLY synthetic violator
// modules — never src/dist/production — and each must be rejected with its
// violation tag; the canary file must remain byte-identical afterwards.
// Runs at relay time against the frozen built target.

import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { collectChild } from "./spawn-collect.mjs";

const RUNNER = new URL("./import-child-fixture.mjs", import.meta.url);
const REGISTER = new URL("./import-intercept-register.mjs", import.meta.url);
const CONTROLS = new URL("./intercept-controls/", import.meta.url);
const CANARY = new URL("./intercept-controls/mutation-target.txt", import.meta.url);
const CANARY_TEXT = "synthetic-qa-canary-do-not-modify\n";

async function runImportChild(targetPath, timeoutMs = 8000) {
  const child = spawn(process.execPath, ["--import", REGISTER.pathname, RUNNER.pathname], {
    env: { SYNTHETIC_QA_IMPORT_TARGET: targetPath },
    stdio: ["ignore", "pipe", "pipe"],
  });
  return collectChild(child, { timeoutMs });
}

function reportLines(child) {
  return child.stdout.split("\n").filter((line) => line.length > 0);
}

function deltaCounts(before, after) {
  const delta = {};
  for (const type of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const change = (after[type] ?? 0) - (before[type] ?? 0);
    if (change !== 0) delta[type] = change;
  }
  return delta;
}

// Every committed violator control with its exact expected violation tag.
// The table below is the normative coverage list: each row must correspond
// to an existing file under intercept-controls/, and the runner asserts the
// tag, the nonzero exit and the empty stdout for each.
const VIOLATIONS = [
  ["fs-write.mjs", "synthetic-qa-violation:fs-write"],
  ["fs-read-private.mjs", "synthetic-qa-violation:fs-read"],
  ["fs-read-js.mjs", "synthetic-qa-violation:fs-read"],
  ["fs-open-write.mjs", "synthetic-qa-violation:fs-write"],
  ["fs-open-read.mjs", "synthetic-qa-violation:fs-read"],
  ["fs-default-append.mjs", "synthetic-qa-violation:fs-write"],
  ["fs-bare-write.mjs", "synthetic-qa-violation:fs-write"],
  ["fs-promises-write.mjs", "synthetic-qa-violation:fs-write"],
  ["fs-nested-promises-write.mjs", "synthetic-qa-violation:fs-write"],
  ["net.mjs", "synthetic-qa-violation:net"],
  ["net-socket.mjs", "synthetic-qa-violation:net"],
  ["timer.mjs", "synthetic-qa-violation:timer"],
  ["timer-cleared.mjs", "synthetic-qa-violation:timer"],
  ["timers-node.mjs", "synthetic-qa-violation:timer"],
  ["listener.mjs", "synthetic-qa-violation:listener"],
  ["events-prototype.mjs", "synthetic-qa-violation:listener"],
  ["spawn.mjs", "synthetic-qa-violation:process-spawn"],
  ["stdout.mjs", "synthetic-qa-violation:stdout"],
  ["http2-control.mjs", "synthetic-qa-violation:http2"],
  ["tls-control.mjs", "synthetic-qa-violation:tls"],
  ["cjs-require.mjs", "synthetic-qa-violation:cjs-require"],
];

describe("interception calibration controls (artifact-free, no target)", () => {
  it("clean and multi-module synthetic imports pass with no violation", async () => {
    for (const control of ["clean.mjs", "multi-module-a.mjs"]) {
      const child = await runImportChild(new URL(control, CONTROLS).pathname);
      expect(child.timedOut).toBe(false);
      expect(child.code).toBe(0);
      expect(child.signal).toBe(null);
      expect(child.truncated).toBe(false);
      expect(child.stderr).toBe("");
      const lines = reportLines(child);
      expect(lines.length).toBe(1);
      expect(JSON.parse(lines[0]).clean).toBe(true);
    }
  });

  for (const [control, tag] of VIOLATIONS) {
    it(`${control} is rejected with ${tag}`, async () => {
      const child = await runImportChild(new URL(control, CONTROLS).pathname);
      expect(child.timedOut).toBe(false);
      expect(child.code).not.toBe(0);
      expect(child.truncated).toBe(false);
      expect(child.stderr.includes(tag)).toBe(true);
      expect(child.stdout).toBe("");
    });
  }

  it("exit control is recorded, then honored", async () => {
    const child = await runImportChild(new URL("exit.mjs", CONTROLS).pathname);
    expect(child.timedOut).toBe(false);
    expect(child.code).toBe(7);
    expect(child.stderr.includes("synthetic-qa-violation:exit")).toBe(true);
  });

  it("no file mutation escaped the filesystem controls", async () => {
    expect(readFileSync(CANARY, "utf8")).toBe(CANARY_TEXT);
  });

  it("wedged children are killed and reaped within budget", async () => {
    const child = await runImportChild(new URL("hang.mjs", CONTROLS).pathname, 6000);
    expect(child.timedOut).toBe(true);
  }, 10000);
});

describe("collector byte boundaries (no target, shared helper)", () => {
  it("truncates multibyte output at 65536 retained bytes", async () => {
    const child = spawn(process.execPath, ["-e", "process.stdout.write('é'.repeat(40000))"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const result = await collectChild(child, { timeoutMs: 8000 });
    // 40000 × U+00E9 is 80000 UTF-8 bytes: character counting would keep it
    // all, byte counting must truncate at exactly the cap.
    expect(result.truncated).toBe(true);
    expect(Buffer.byteLength(result.stdout, "utf8")).toBe(65536);
  });

  it("keeps split multibyte chunks intact within a stream", async () => {
    // A multibyte character split across two chunks of the SAME stream must
    // reassemble via the per-stream decoder. (A split across two different
    // streams is inherently unrecoverable per stream; each side decodes its
    // own bytes with replacement for the orphan half.)
    const child = spawn(
      process.execPath,
      ["-e", "const b=Buffer.from('é'.repeat(100),'utf8');process.stdout.write(b.subarray(0,151));process.stdout.write(b.subarray(151))"],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    const result = await collectChild(child, { timeoutMs: 8000 });
    expect(result.truncated).toBe(false);
    expect(result.stdout).toBe("é".repeat(100));
  });
});

describe("child import interception: target is inert", () => {
  it("imports with empty stderr, one JSON report line and no new handles/listeners", async () => {
    const target = new URL("../../../dist/http/index.js", import.meta.url).pathname;
    const child = await runImportChild(target);
    expect(child.timedOut).toBe(false);
    expect(child.code).toBe(0);
    expect(child.signal).toBe(null);
    expect(child.truncated).toBe(false);
    expect(child.stderr).toBe("");
    const lines = reportLines(child);
    expect(lines.length).toBe(1);
    const report = JSON.parse(lines[0]);
    expect(report.clean).toBe(true);
    expect(report.after.listeners).toEqual(report.before.listeners);
    expect(deltaCounts(report.before.resources, report.after.resources)).toEqual({});
  });
});
