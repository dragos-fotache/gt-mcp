// T01 QA subprocess harness (Stage 2, approved spec §3).
//
// Helpers ONLY: repo-root resolution, synthetic HOME/XDG scoping, child-process
// execution with the interception preload, and violation summarising. No
// production sources are read here; only entry-point paths (per §2) are
// referenced as black-box targets, plus nonsecret package/config metadata in
// the package-contract suite (spec §6).

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(HERE, "..", "..");
export const PRELOAD = path.join(HERE, "preload-intercept.mjs");

// Approved public build artifacts (spec §2). Existence is checked by tests;
// contents are never read by QA.
export const DIST = {
  barrel: path.join(REPO_ROOT, "dist", "index.js"),
  contracts: path.join(REPO_ROOT, "dist", "contracts", "index.js"),
  server: path.join(REPO_ROOT, "dist", "protocol", "server.js"),
  cli: path.join(REPO_ROOT, "dist", "cli", "index.js"),
  companion: path.join(REPO_ROOT, "companion", "dist", "index.js"),
};

export const NODE_BIN = process.execPath;

// A timeout plus clean exit proves termination only, never absence of transient
// effects (spec §3). Every run also returns the preload intercept report; tests
// must assert on the report, and reports carry the documented preload limits.
export function makeSyntheticScope() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gt-mcp-t01-qa-synthetic-"));
  const reportPath = path.join(tmpRoot, "intercept-report.json");
  const xdgConfig = path.join(tmpRoot, ".config");
  const xdgData = path.join(tmpRoot, ".local", "share");
  const xdgState = path.join(tmpRoot, ".local", "state");
  for (const dir of [xdgConfig, xdgData, xdgState]) fs.mkdirSync(dir, { recursive: true });
  const env = {
    ...process.env,
    HOME: tmpRoot,
    XDG_CONFIG_HOME: xdgConfig,
    XDG_DATA_HOME: xdgData,
    XDG_STATE_HOME: xdgState,
    QA_INTERCEPT_REPORT: reportPath,
    QA_REAL_HOME: process.env.HOME ?? "",
    QA_SYNTHETIC_TMP: tmpRoot,
    QA_REPO_ROOT: REPO_ROOT,
  };
  return {
    tmpRoot,
    reportPath,
    env,
    cleanup() {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    },
  };
}

function spawnCapture(args, stdin, timeoutMs, scope) {
  const res = spawnSync(NODE_BIN, args, {
    input: stdin,
    encoding: "utf8",
    timeout: timeoutMs,
    cwd: REPO_ROOT,
    env: scope.env,
  });
  let report;
  try {
    report = JSON.parse(fs.readFileSync(scope.reportPath, "utf8"));
  } catch {
    report = null;
  }
  return {
    exitCode: res.status,
    signal: res.signal,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
    report,
    spawnError: res.error ? String(res.error) : null,
  };
}

export function runNode({ args, stdin, timeoutMs = 20000 }) {
  const scope = makeSyntheticScope();
  try {
    return spawnCapture(args, stdin, timeoutMs, scope);
  } finally {
    scope.cleanup();
  }
}

// Execute an approved artifact through an ordinary filesystem symlink placed in
// the synthetic scope (mirrors how npm exposes bin commands). The child sees
// the symlink path in argv; the preload resolves artifact identity for its
// loader allowance without reading implementation contents.
export function runNodeViaLink({ target, argv = [], stdin, timeoutMs = 20000 }) {
  const scope = makeSyntheticScope();
  const link = path.join(scope.tmpRoot, "qa-bin-link.js");
  try {
    fs.symlinkSync(target, link);
    return spawnCapture(["--import", PRELOAD, link, ...argv], stdin, timeoutMs, scope);
  } finally {
    scope.cleanup();
  }
}

// Import a module in a fresh intercepted process: proves import-time behavior.
export function importArgs(modulePath) {
  return [
    "--import",
    PRELOAD,
    "--input-type=module",
    "-e",
    `await import(${JSON.stringify(pathToFileURL(modulePath).href)});`,
  ];
}

// Evaluate arbitrary probe code in a fresh intercepted process.
export function evalArgs(code) {
  return ["--import", PRELOAD, "--input-type=module", "-e", code];
}

// Directly execute an entry-point file in a fresh intercepted process.
export function execArgs(entryPath, argv = []) {
  return ["--import", PRELOAD, entryPath, ...argv];
}

// Summarise an intercept report as human-readable violation strings.
// Empty array = no intercepted effect attempted. A clean result is bounded by
// the preload's documented limits; tests must not present it as sandbox proof.
export function reportViolations(report) {
  if (!report) return ["intercept report missing (preload did not flush)"];
  const violations = [];
  if (report.fetchCalls) violations.push(`fetch x${report.fetchCalls}`);
  if (report.httpCalls) violations.push(`http/dns x${report.httpCalls}`);
  if (report.listenCalls) violations.push(`listen x${report.listenCalls}`);
  if (report.connectCalls) violations.push(`connect/socket x${report.connectCalls}`);
  if (report.childProcessCalls)
    violations.push(`child-process/worker x${report.childProcessCalls}`);
  if (report.timerCreations) violations.push(`timers x${report.timerCreations}`);
  for (const sub of report.handlerSubscriptions ?? []) violations.push(`handler:${sub}`);
  for (const hit of report.stdinReads ?? []) violations.push(`stdin:${hit}`);
  for (const hit of report.fsPrivateHits ?? []) violations.push(`fs:${hit}`);
  for (const problem of report.uncaught ?? []) violations.push(`uncaught:${problem}`);
  return violations;
}
