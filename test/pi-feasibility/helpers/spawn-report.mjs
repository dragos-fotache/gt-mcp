// T02 QA driver-spawn helper (t02-approved-experiment-spec §§3-4).
//
// Black-box only: launches the PUBLIC driver entry with a finite-registry
// scenario, a sanitized disposable environment, and an operator-owned --out
// path. Never invents scenarios, URLs, or entry paths. Driver exit 0 means the
// observation completed; it is NOT the test verdict — callers must inspect the
// report with report-checks.mjs. Raw driver stderr is never embedded in
// assertion messages; failures carry a redacted summary only, so no private
// absolute path can leak into evidence.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { ALL_SCENARIOS } from "../../fixtures/t02/synthetic-seed.mjs";

export const DRIVER = "experiments/t02/driver/run.mjs";
export const SCENARIO_TIMEOUT_MS = 90000;

function disposableEnv() {
  const root = mkdtempSync(join(tmpdir(), "gt-mcp-t02-qa-"));
  const allow = new Map();
  for (const key of [
    "PATH",
    "LANG",
    "LC_ALL",
    "LANGUAGE",
    "TERM",
    "TZ",
    "NO_COLOR",
    "HOME",
  ]) {
    if (process.env[key] !== undefined) allow.set(key, process.env[key]);
  }
  // Disposable identity roots: the driver bootstrap owns its own isolation,
  // but QA never donates personal HOME/XDG state to the child.
  allow.set("HOME", root);
  allow.set("XDG_CONFIG_HOME", join(root, "config"));
  allow.set("XDG_DATA_HOME", join(root, "data"));
  allow.set("XDG_STATE_HOME", join(root, "state"));
  allow.set("XDG_CACHE_HOME", join(root, "cache"));
  allow.set("TMPDIR", root);
  // Pi isolation, using official Pi variable names (environment-variables.md):
  // disposable agent dir + session dir, offline posture, no telemetry or
  // version-check network activity. PI_AGENT_DIR/T02_QA_OFFLINE alone are not
  // Pi isolation and are not set.
  allow.set("PI_CODING_AGENT_DIR", join(root, "pi-agent"));
  allow.set("PI_CODING_AGENT_SESSION_DIR", join(root, "pi-sessions"));
  allow.set("PI_OFFLINE", "1");
  allow.set("PI_TELEMETRY", "false");
  allow.set("PI_SKIP_VERSION_CHECK", "1");
  return { env: Object.fromEntries(allow), root };
}

export function redact(text, roots) {
  let out = String(text);
  for (const root of roots) {
    if (root) out = out.split(root).join("<disposable>");
  }
  const home = process.env.HOME;
  if (home) out = out.split(home).join("<home>");
  return out;
}

// Runs one finite-registry scenario. Returns { report, wallMs, root } where
// report is the parsed stdout JSON report. Throws a redacted Error when the
// driver cannot be launched, exits nonzero, or emits unparsable output.
// Callers MUST remove the disposable root via cleanup() in a finally block.
export function runScenario(scenario, harness) {
  if (!ALL_SCENARIOS.includes(scenario)) {
    throw new Error(
      `refusing unknown scenario ${JSON.stringify(scenario)}: not in the spec §7 registry`,
    );
  }
  if (harness !== "sdk" && harness !== "pty") {
    throw new Error(`refusing unknown harness ${JSON.stringify(harness)}`);
  }
  const { env, root } = disposableEnv();
  const outPath = join(root, "report.json");
  const args = [DRIVER, "--scenario", scenario, "--harness", harness, "--out", outPath];
  const started = Date.now();
  let proc;
  try {
    proc = spawnSync(process.execPath, args, {
      cwd: resolve("."),
      env,
      encoding: "utf8",
      timeout: SCENARIO_TIMEOUT_MS,
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch (err) {
    rmSync(root, { recursive: true, force: true });
    throw new Error(
      `driver spawn failed for ${scenario}/${harness}: ${redact(String(err?.message ?? err), [root])}`,
    );
  }
  const wallMs = Date.now() - started;
  const roots = [root];
  if (proc.error) {
    const message =
      `driver process error for ${scenario}/${harness}: ` +
      `${redact(String(proc.error.message), roots)}`;
    rmSync(root, { recursive: true, force: true });
    throw new Error(message);
  }
  if (proc.status !== 0) {
    const message =
      `driver exit ${proc.status} (not a verdict) for ${scenario}/${harness}; ` +
      `signal ${proc.signal ?? "none"}; wall ${wallMs}ms; ` +
      `stderr tail: ${redact((proc.stderr ?? "").slice(-2000), roots)}`;
    rmSync(root, { recursive: true, force: true });
    throw new Error(message);
  }
  let report;
  try {
    report = JSON.parse(proc.stdout);
  } catch {
    rmSync(root, { recursive: true, force: true });
    throw new Error(
      `driver stdout was not a single JSON report for ${scenario}/${harness}; ` +
        `stdout head: ${redact((proc.stdout ?? "").slice(0, 500), roots)}`,
    );
  }
  // Cross-check the operator-owned --out file agrees with stdout.
  try {
    const fileReport = JSON.parse(readFileSync(outPath, "utf8"));
    if (JSON.stringify(fileReport) !== JSON.stringify(report)) {
      throw new Error("--out file disagrees with stdout report");
    }
  } catch (err) {
    rmSync(root, { recursive: true, force: true });
    throw new Error(
      `driver --out mismatch for ${scenario}/${harness}: ${redact(String(err?.message ?? err), roots)}`,
    );
  }
  return { report, wallMs, root };
}

export function cleanup(root) {
  rmSync(root, { recursive: true, force: true });
}
