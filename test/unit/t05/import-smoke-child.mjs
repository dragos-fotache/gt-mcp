// Isolated import-smoke child: snapshots listeners/resources, imports ONLY
// the emitted public entry, snapshots again, prints exactly one JSON line.
// No shims, no builtin rewriting, no violator family. Import-time IO/timers/
// network/process/global-handler assurance beyond this smoke belongs to the
// coordinator production source audit, never to QA implementation reads.

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

// Adjudicated baseline: harness-owned standard streams are materialized
// with zero-byte writes (no observable output) BEFORE the baseline
// snapshot, so lazy wrapping of the already-open descriptors cannot appear
// as an import delta. Coordinator native controls establish zero NEW
// resources with this ordering for warmed target and plain node:http alike.
process.stdout.write("");
process.stderr.write("");

const before = { listeners: listenerSnapshot(), resources: resourceCounts() };
await import("../../../dist/http/index.js");
const after = { listeners: listenerSnapshot(), resources: resourceCounts() };

process.stdout.write(`${JSON.stringify({ clean: true, before, after })}\n`);
