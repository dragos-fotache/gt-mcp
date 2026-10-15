/**
 * T02 shared append-only event journal (cross-process, S2A).
 *
 * The bootstrap creates the file once (empty, mode 0600) before workers or
 * fixture start and never rewrites received events. Each producer opens with
 * O_APPEND and performs exactly one synchronous write per bounded record, so
 * concurrent single-syscall appends cannot interleave. Protected keys
 * (producer, pseq, source, layer, type, seq) can never be overwritten by
 * payload fields. Producer-local sequences start at 1 per producer; the
 * parent assigns global seq in file order after known closure and validates
 * every producer's increasing sequence. Per-record cap 64KiB; the parent
 * rejects an over-aggregate file before reading/reporting success.
 * Local Linux filesystem only.
 *
 * Reader profiles: the default `generic-readonly` profile permits only the
 * established `fixture` and `sdk-worker` producers, preserving S2A
 * provenance exactly. The `direct-readonly` profile additionally permits
 * producer `companion` with source `companion` for the companion-managed
 * gate route; no other provenance is relaxed.
 */

import { openSync, writeSync, closeSync, readFileSync, statSync, fstatSync } from "node:fs";

export const RECORD_CAP_BYTES = 64 * 1024;
export const AGGREGATE_CAP_BYTES = 4 * 1024 * 1024;

const RESERVED_KEYS = new Set(["producer", "pseq", "source", "layer", "type", "seq"]);

export function openSharedJournal(path, producer) {
  if (typeof producer !== "string" || producer.length === 0) {
    throw new Error("t02-journal: producer ID required");
  }
  const fd = openSync(path, "a", 0o600);
  let pseq = 0;
  let closed = false;
  return {
    producer,
    record(source, type, fields, layer = "sdk-pipeline") {
      if (closed) throw new Error("t02-journal: write after close");
      pseq += 1;
      const safe = {};
      for (const [key, value] of Object.entries(fields ?? {})) {
        if (!RESERVED_KEYS.has(key)) safe[key] = value;
      }
      const line = `${JSON.stringify({ producer, pseq, source, type, layer, ...safe })}\n`;
      const size = Buffer.byteLength(line, "utf8");
      if (size > RECORD_CAP_BYTES) throw new Error("t02-journal: record-budget-exceeded");
      if (fstatSync(fd).size + size > AGGREGATE_CAP_BYTES) {
        throw new Error("t02-journal: aggregate-budget-exceeded");
      }
      const written = writeSync(fd, line, null, "utf8");
      if (written !== size) throw new Error("t02-journal: partial-write");
    },
    close() {
      if (!closed) {
        closed = true;
        closeSync(fd);
      }
    },
  };
}

export function readSharedJournal(path, profile = "generic-readonly") {
  const allowCompanion = profile === "direct-readonly";
  let size;
  try {
    size = statSync(path).size;
  } catch (err) {
    throw new Error(`t02-journal: unreadable:${err instanceof Error ? err.message : String(err)}`, {
      cause: err,
    });
  }
  if (size > AGGREGATE_CAP_BYTES) throw new Error("t02-journal: aggregate-budget-exceeded");
  const raw = readFileSync(path, "utf8");
  if (!raw.endsWith("\n")) throw new Error("t02-journal: incomplete-record");
  const lines = raw.slice(0, -1).split("\n");
  if (
    lines.some(
      (line) => line.length === 0 || Buffer.byteLength(line, "utf8") + 1 > RECORD_CAP_BYTES,
    )
  ) {
    throw new Error("t02-journal: invalid-record-size");
  }
  const records = lines.map((l) => JSON.parse(l));
  const seen = new Map();
  let seq = 0;
  for (const rec of records) {
    if (!rec || typeof rec !== "object" || Array.isArray(rec) || Object.hasOwn(rec, "seq")) {
      throw new Error("t02-journal: malformed-record");
    }
    const { producer, pseq, source, type, layer } = rec;
    if (typeof producer !== "string" || producer.length === 0)
      throw new Error("t02-journal: bad-producer");
    if (!Number.isInteger(pseq) || pseq < 1) throw new Error("t02-journal: bad-pseq");
    if (typeof source !== "string" || typeof type !== "string" || typeof layer !== "string") {
      throw new Error("t02-journal: bad-envelope");
    }
    const allowedSources =
      producer === "fixture"
        ? ["fixture"]
        : producer === "sdk-worker"
          ? ["launcher", "pi"]
          : producer === "companion" && allowCompanion
            ? ["companion"]
            : [];
    if (!allowedSources.includes(source) || layer !== "sdk-pipeline" || type.length === 0) {
      throw new Error("t02-journal: unsupported-provenance");
    }
    const expected = (seen.get(producer) ?? 0) + 1;
    if (pseq !== expected) throw new Error(`t02-journal: pseq-gap:${producer}:${pseq}`);
    seen.set(producer, pseq);
    seq += 1;
    rec.seq = seq;
  }
  return records;
}
