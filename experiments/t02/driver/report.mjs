/**
 * T02 report assembly + budget enforcement.
 *
 * Report root per approved spec §4:
 * {synthetic, scenario, harness, layer, runtime, completed, trace, effects, limits}
 * exit0 means the observation completed; it is NOT the test verdict.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

export const BUDGETS = {
  scenarioMs: 60_000,
  approvalMs: 10_000,
  mcpRequestMs: 10_000,
  sidecarFrameBytes: 64 * 1024,
  verdictMs: 2_000,
  wireBytes: 1024 * 1024,
  traceBytes: 4 * 1024 * 1024,
  ptyBytes: 4 * 1024 * 1024,
  maxEffects: 100,
};

export function collectRuntime(repoRoot) {
  const node = process.version;
  let npm = "unknown";
  try {
    npm = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
  } catch {
    // record unknown; never fail report assembly on version probing
  }
  let pi = "unknown";
  let sdk = "unknown";
  let piIntegrity = "unknown";
  let sdkIntegrity = "unknown";
  try {
    const lock = JSON.parse(readFileSync(`${repoRoot}/package-lock.json`, "utf8"));
    const piEntry = lock.packages?.["node_modules/@earendil-works/pi-coding-agent"];
    const sdkEntry = lock.packages?.["node_modules/@modelcontextprotocol/sdk"];
    pi = piEntry?.version ?? "unknown";
    sdk = sdkEntry?.version ?? "unknown";
    piIntegrity = piEntry?.integrity ?? "unknown";
    sdkIntegrity = sdkEntry?.integrity ?? "unknown";
  } catch {
    // record unknown
  }
  return { node, npm, pi, sdk, piIntegrity, sdkIntegrity, protocol: "2025-11-25(candidate)" };
}

export function buildReport({
  scenario,
  harness,
  layer,
  runtime,
  trace,
  effects,
  limits,
  completed,
}) {
  const encoded = JSON.stringify({
    synthetic: true,
    scenario,
    harness,
    layer,
    runtime,
    completed,
    trace,
    effects,
    limits,
  });
  if (Buffer.byteLength(encoded, "utf8") > BUDGETS.traceBytes) {
    return {
      synthetic: true,
      scenario,
      harness,
      layer,
      runtime,
      completed: false,
      trace: [],
      effects: { error: "trace_too_large" },
      limits: { ...limits, traceBudgetExceeded: true },
    };
  }
  return { synthetic: true, scenario, harness, layer, runtime, completed, trace, effects, limits };
}
