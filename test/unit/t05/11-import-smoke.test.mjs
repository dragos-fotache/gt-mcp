// T05 unit: small isolated import smoke for the public transport entry. A
// bounded child imports only dist/http/index.js and reports listener/resource
// snapshots; the parent asserts a prompt clean exit, empty stderr, a single
// JSON line and no persistent changes. No shim loader, no global builtin
// rewriting, no violator family: this smoke is not a sandbox proof, and the
// coordinator production source audit closes the import-time evidence.

import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CHILD = new URL("./import-smoke-child.mjs", import.meta.url);

// Small standard-library bounded child invocation: byte- and time-bounded
// collection with kill and observed close. No generic collector framework.
async function runSmokeChild(timeoutMs = 8000) {
  // Standard builtin bounded invocation: timeout, maxBuffer and killSignal
  // keep the parent loop responsive. Any rejection (nonzero exit, timeout,
  // overflow) fails the calling test outright.
  const { stdout, stderr } = await execFileAsync(process.execPath, [CHILD.pathname], {
    env: {},
    timeout: timeoutMs,
    maxBuffer: 65536,
    killSignal: "SIGKILL",
  });
  return { stdout, stderr };
}

function deltaCounts(before, after) {
  const delta = {};
  for (const type of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const change = (after[type] ?? 0) - (before[type] ?? 0);
    if (change !== 0) delta[type] = change;
  }
  return delta;
}

describe("isolated import smoke (bounded, no sandbox claim)", () => {
  it("imports the public entry with a prompt clean exit and no residue", async () => {
    const child = await runSmokeChild();
    expect(child.stderr).toBe("");
    const lines = child.stdout.split("\n").filter((line) => line.length > 0);
    expect(lines.length).toBe(1);
    const report = JSON.parse(lines[0]);
    expect(report.clean).toBe(true);
    expect(report.after.listeners).toEqual(report.before.listeners);
    expect(deltaCounts(report.before.resources, report.after.resources)).toEqual({});
  });
});
