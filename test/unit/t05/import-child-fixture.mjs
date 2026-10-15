// Runner child for the import-interception harness. Installs mutable-global
// interception, then dynamically imports exactly one target named by
// SYNTHETIC_QA_IMPORT_TARGET: a synthetic calibration control or, at relay
// time, the built public entry. Module-namespace builtins were already
// redirected to guarding shims via --import registration before this entry
// ran. Reaching the report line means the import produced no intercepted
// effect; the report itself uses the pre-captured original stdout writer.

import { installGlobalInterception } from "./import-intercept-setup.mjs";

const installed = installGlobalInterception();

function listenerSnapshot() {
  const names = ["unhandledRejection", "uncaughtException", "warning", "exit", "SIGTERM", "SIGINT"];
  const snapshot = {};
  for (const name of names) snapshot[name] = process.listenerCount(name);
  return snapshot;
}

function resourceCounts() {
  const counts = {};
  for (const type of process.getActiveResourcesInfo()) {
    counts[type] = (counts[type] ?? 0) + 1;
  }
  return counts;
}

const before = { listeners: listenerSnapshot(), resources: resourceCounts() };
await import(process.env.SYNTHETIC_QA_IMPORT_TARGET);
const after = { listeners: listenerSnapshot(), resources: resourceCounts() };

installed.originalStdoutWrite(`${JSON.stringify({ clean: true, before, after })}\n`);
