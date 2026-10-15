// T04 QA fault helpers — diagnostic-facility lifecycle, disk snapshots,
// fail-closed assertions. Synthetic fixtures only; no personal paths.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { setTimeout } from "node:timers";
import { createStorageTestFacility } from "../../../dist/storage/test-facility.js";
import { QA_ORIGIN } from "../../unit/t04/helpers.mjs";

export { QA_ORIGIN };

export function storeFiles(locations) {
  return [
    join(locations.profileRoot, "vault.bin"),
    join(locations.profileRoot, "operations.bin"),
    join(locations.anchorRoot, "anchor.bin"),
  ];
}

export function snapshotFiles(paths) {
  return new Map(paths.map((p) => [p, Buffer.from(readFileSync(p))]));
}

export function restoreFiles(snapshot) {
  for (const [p, bytes] of snapshot) writeFileSync(p, bytes);
}

export function listDirNames(dir) {
  return readdirSync(dir).sort();
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Approved isolated FIFO helper: preinstalled /usr/bin/mkfifo, direct argv,
// no shell. Node24 exposes no fs.mkfifoSync.
export function makeFifo(path, mode = 0o600) {
  const result = spawnSync("/usr/bin/mkfifo", ["-m", mode.toString(8), path], {
    encoding: "utf8",
    timeout: 15000,
  });
  if (result.status !== 0) {
    throw new Error(
      `blocked: mkfifo fixture helper failed: ${String(result.stderr ?? "").slice(0, 200)}`,
    );
  }
}

export function killPid(pid) {
  try {
    process.kill(pid, "SIGKILL");
  } catch {
    // Already exited; the test asserts the resulting fenced state.
  }
}

// Runs fn with a fresh facility; always releases the issued root afterwards.
export async function withFacility(fn) {
  const facility = await createStorageTestFacility();
  try {
    await fn(facility);
  } finally {
    await facility.cleanup();
  }
}
