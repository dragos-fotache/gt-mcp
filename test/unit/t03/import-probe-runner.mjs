// T03 QA import probe runner (own harness, synthetic use only).
//
// Shared by the domain surface suite and the artifact-free controls suite.
// This module never imports the moving dist artifact: only node builtins and
// vitest assertions. The child probe imports import-deny-setup.mjs (own
// harness) and then the caller-chosen target.
//
// Honesty notes (read before relying on results):
// - The allowlist child env denies credential/private-state inheritance; it
//   is NOT filesystem containment and NOT network containment. Writes can
//   only be observed (sandbox tree check), not prevented by env.
// - Deny/record method patches plus handle/resource deltas observe the rest;
//   coordinator source audit accompanies execution. This harness is NOT an
//   OS sandbox.
// - Fail-closed setup gate: the probe inspects the patch summary immediately
//   after arming and aborts BEFORE importing the target when any patch
//   failed or ESM sync is off; restoration and reporting stay in finally, so
//   a broken harness can never silently run the target unguarded.

import { expect } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PROBE = [
  `const setup = await import(process.env.QA_T03_DENY_SETUP);`,
  `const handle = setup.installProbe();`,
  `const precheck = handle.summary();`,
  `const setupReport = {`,
  `  patchedCount: precheck.patched.length,`,
  `  failureKinds: precheck.failures.map((entry) => entry.kind),`,
  `  esmSync: precheck.esmSync,`,
  `};`,
  `const LIST = ["uncaughtException", "unhandledRejection", "warning", "exit"];`,
  `const snapshot = (label) => ({`,
  `  label,`,
  `  globals: Object.getOwnPropertyNames(globalThis).sort(),`,
  `  listeners: Object.fromEntries(LIST.map((name) => [name, process.listenerCount(name)])),`,
  `  resources: process.getActiveResourcesInfo().sort(),`,
  `  argv: process.argv.slice(0),`,
  `  cwd: process.cwd(),`,
  `});`,
  `const before = snapshot("before");`,
  `const beforeSet = new Set(before.globals);`,
  `let importError = null;`,
  `let setupError = null;`,
  `try {`,
  `  if (precheck.failures.length > 0 || !precheck.esmSync) {`,
  `    setupError = "deny setup incomplete: " + precheck.failures.length + " patch failures, esmSync=" + precheck.esmSync;`,
  `  } else {`,
  `    try {`,
  `      await import(process.env.QA_T03_DOMAIN_TARGET);`,
  `    } catch (error) {`,
  `      importError = error && error.message ? String(error.message) : String(error);`,
  `    }`,
  `  }`,
  `} finally {`,
  `  handle.restore();`,
  `}`,
  `await new Promise((resolve) => setImmediate(resolve));`,
  `await new Promise((resolve) => setImmediate(resolve));`,
  `const after = snapshot("after");`,
  `const newGlobals = after.globals.filter((name) => !beforeSet.has(name)).map((name) => {`,
  `  let descriptor = null;`,
  `  try {`,
  `    descriptor = Object.getOwnPropertyDescriptor(globalThis, name);`,
  `  } catch (error) {`,
  `    descriptor = null;`,
  `  }`,
  `  const hasValue = !!descriptor && Object.prototype.hasOwnProperty.call(descriptor, "value");`,
  `  return {`,
  `    name,`,
  `    hasValue,`,
  `    valueType: hasValue ? typeof descriptor.value : null,`,
  `    isNull: hasValue ? descriptor.value === null : null,`,
  `    accessor: !!descriptor && ("get" in descriptor || "set" in descriptor),`,
  `  };`,
  `});`,
  `const post = handle.summary();`,
  `process.stdout.write(JSON.stringify({ before, after, newGlobals, violations: handle.violations, importError, setupError, setupReport, restoreErrorKeys: post.restoreErrors.map((entry) => entry.key) }) + "\\n");`,
].join("\n");

export function listTree(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      out.push(path.relative(root, full));
      if (entry.isDirectory()) walk(full);
    }
  };
  walk(root);
  return out.sort();
}

export function runImportProbe({ setupHref, targetHref }) {
  // Parent temporary roots are explicit: one temp scope serves as cwd and as
  // every home/cache location; it starts empty and is removed by callers.
  // Child PATH prepends the provisioned runtime directory (never hardcoded
  // system paths alone) so the child observes the same toolchain selection.
  const scope = fs.mkdtempSync(path.join(os.tmpdir(), "gt-mcp-t03-qa-import-"));
  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", PROBE, "--", "--qa-synthetic-arg", "7"],
    {
      cwd: scope,
      encoding: "utf8",
      timeout: 30000,
      env: {
        PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin`,
        HOME: scope,
        TMPDIR: scope,
        TMP: scope,
        TEMP: scope,
        XDG_CONFIG_HOME: scope,
        XDG_DATA_HOME: scope,
        XDG_STATE_HOME: scope,
        XDG_CACHE_HOME: scope,
        NO_COLOR: "1",
        QA_T03_DENY_SETUP: setupHref,
        QA_T03_DOMAIN_TARGET: targetHref,
      },
    },
  );
  return { scope, result };
}

export function readReport(result) {
  return JSON.parse(String(result.stdout));
}

function expectProbeBasics(scope, result, report, label) {
  expect(result.error ?? null, `${label}: spawn must succeed`).toBeNull();
  expect(result.signal ?? null, `${label}: no signal`).toBeNull();
  expect(result.status, `${label}: exit code`).toBe(0);
  expect(result.stderr, `${label}: stderr must be empty`).toBe("");
  expect(report.setupError ?? null, `${label}: deny setup must complete`).toBeNull();
  expect(report.setupReport.failureKinds, `${label}: all deny patches apply`).toEqual([]);
  expect(report.setupReport.esmSync, `${label}: ESM sync applied`).toBe(true);
  expect(report.setupReport.patchedCount > 0, `${label}: deny paths armed`).toBe(true);
  expect(report.restoreErrorKeys ?? [], `${label}: restore must succeed`).toEqual([]);
}

export function expectCleanImport(scope, result, label) {
  const report = readReport(result);
  expectProbeBasics(scope, result, report, label);
  expect(report.importError, `${label}: import must succeed`).toBeNull();
  expect(report.violations, `${label}: no forbidden attempts`).toEqual([]);
  expect(report.after.globals, `${label}: no new globals`).toEqual(report.before.globals);
  expect(report.newGlobals ?? [], `${label}: no new global descriptors`).toEqual([]);
  expect(report.after.listeners, `${label}: no new listeners`).toEqual(report.before.listeners);
  expect(report.after.resources, `${label}: no new handles`).toEqual(report.before.resources);
  expect(report.after.cwd, `${label}: cwd unchanged`).toBe(scope);
  expect(report.after.argv, `${label}: argv passthrough`).toContain("--qa-synthetic-arg");
  expect(listTree(scope), `${label}: sandbox tree must stay empty`).toEqual([]);
}

// Verified pinned-vendor globals only (adjudication
// the pinned-Zod import contract): exactly the two named own
// DATA properties with nonnull object values and no accessors. No wildcard,
// prefix, or blanket ignores; any other added/removed global name fails.
// Descriptor categories only — registry/config contents are never recorded.
export const EXPECTED_VENDOR_GLOBALS = Object.freeze([
  "__zod_globalConfig",
  "__zod_globalRegistry",
]);

export function expectZodVendorGlobals(scope, result, label) {
  const report = readReport(result);
  expectProbeBasics(scope, result, report, label);
  expect(report.importError, `${label}: import must succeed`).toBeNull();
  expect(report.violations, `${label}: no forbidden attempts`).toEqual([]);
  for (const name of EXPECTED_VENDOR_GLOBALS) {
    expect(report.before.globals, `${label}: ${name} must be an addition`).not.toContain(name);
  }
  // Exact-union equality: the documented promise is no additions beyond the
  // verified pair AND no removals of preexisting names. newGlobals alone
  // cannot catch a removed preexisting name, so compare the full sorted set.
  expect([...report.after.globals].sort()).toEqual(
    [...report.before.globals, ...EXPECTED_VENDOR_GLOBALS].sort(),
  );
  const actual = [...(report.newGlobals ?? [])].sort((a, b) =>
    String(a.name).localeCompare(String(b.name)),
  );
  expect(
    actual.map((entry) => entry.name),
    `${label}: exactly the verified vendor set`,
  ).toEqual([...EXPECTED_VENDOR_GLOBALS].sort());
  for (const entry of actual) {
    expect(entry.hasValue, `${label}: ${entry.name} must be a data descriptor`).toBe(true);
    expect(entry.valueType, `${label}: ${entry.name} must hold an object`).toBe("object");
    expect(entry.isNull, `${label}: ${entry.name} must be nonnull`).toBe(false);
    expect(entry.accessor, `${label}: ${entry.name} must have no accessors`).toBe(false);
  }
  expect(report.after.listeners, `${label}: no new listeners`).toEqual(report.before.listeners);
  expect(report.after.resources, `${label}: no new handles`).toEqual(report.before.resources);
  expect(report.after.cwd, `${label}: cwd unchanged`).toBe(scope);
  expect(report.after.argv, `${label}: argv passthrough`).toContain("--qa-synthetic-arg");
  expect(listTree(scope), `${label}: sandbox tree must stay empty`).toEqual([]);
}

export function expectDeniedImport(scope, result, label, kind) {
  const report = readReport(result);
  expectProbeBasics(scope, result, report, label);
  expect(report.violations, `${label}: deny triggers and records`).toEqual([kind]);
  expect(String(report.importError), `${label}: import fails on the deny`).toContain("forbidden");
  expect(listTree(scope), `${label}: sandbox tree must stay empty`).toEqual([]);
}

export function withScope(targetHref, setupHref, check, label) {
  const { scope, result } = runImportProbe({ setupHref, targetHref });
  try {
    check(scope, result, label);
  } finally {
    fs.rmSync(scope, { recursive: true, force: true });
  }
}
