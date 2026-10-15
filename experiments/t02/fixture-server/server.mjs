/**
 * T02 synthetic fixture MCP server (`synth-gt`).
 *
 * SYNTHETIC FEASIBILITY FIXTURE ONLY — counters and fixed records, no backend,
 * no network, no domain writes. All effects are labeled in-memory counters.
 *
 * Public entry (approved spec §4):
 *   node experiments/t02/fixture-server/server.mjs [--t02-sidecar <sock>]
 *     [--t02-binding-file <file>] [--t02-ledger-file <file>] [--t02-event-journal <file>]
 *
 * Without sidecar+binding inputs the server stays read-only: reads are served,
 * `create_routine` returns `write_approval_required`. Diagnostics and the
 * effect ledger use stderr (`T02-LEDGER ` JSONL prefix) and/or the owned
 * ledger file; stdout carries only stdio MCP traffic.
 */

import { createHash } from "node:crypto";
import { openSync, readFileSync, writeSync, closeSync } from "node:fs";
import { connect } from "node:net";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { openSharedJournal } from "../driver/event-journal.mjs";

const SEED_EXERCISE_ID = "11111111-1111-4111-8111-111111111111";
const SEED_LABEL = "SYNTHETIC T02 Exercise";
const CATALOGUE_VERSION = "synthetic-t02-1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LEDGER_PREFIX = "T02-LEDGER ";
// Shared event journal (optional trusted launch flag; no schema change).
// Use the same protected, checked append writer as the SDK observer.
let eventJournal = null;
const journalLayer = () => process.env["T02_LAYER"] ?? "sdk-pipeline";

function journalOpen(path) {
  try {
    eventJournal = openSharedJournal(path, "fixture");
  } catch (err) {
    process.stderr.write(
      `t02-fixture: cannot open event journal: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(2);
  }
}

function journalRecord(type, fields) {
  if (eventJournal === null) return;
  try {
    eventJournal.record("fixture", type, fields, journalLayer());
  } catch (err) {
    process.stderr.write(
      `t02-fixture: journal write failed: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
}

// Transparent observation of real SDK-generated protocol responses.
class ObservedTransport extends StdioServerTransport {
  async send(message) {
    observeProtocolMessage(message);
    return super.send(message);
  }
}

function observeProtocolMessage(message) {
  try {
    const result = message?.result;
    if (!result || typeof result !== "object") return;
    if (typeof result.protocolVersion === "string" && message?.id !== undefined) {
      journalRecord("protocol", { negotiated: result.protocolVersion });
    }
    if (Array.isArray(result.tools)) {
      journalRecord("tool_list", {
        tools: result.tools.map((t) => t?.name).filter((n) => typeof n === "string"),
      });
    }
  } catch (err) {
    process.stderr.write(
      `t02-fixture: protocol observation failed: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    process.exit(1);
  }
}
const SIDECAR_FRAME_LIMIT = 64 * 1024;
const SIDECAR_DEADLINE_MS = 2000;
const MAX_WIRE_BYTES = 1024 * 1024;

const SYNTHETIC_FIRST_LINE =
  "SYNTHETIC T02 FEASIBILITY FIXTURE — counters only, no backend, no writes.";

// ---------------------------------------------------------------------------
// Strict validation (authoritative; mirrors the companion gate independently).
// ---------------------------------------------------------------------------

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value, allowed) {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== allowed.length) {
    // Length differs: still check membership for a precise unknown-field report.
  }
  const set = new Set(allowed);
  return keys.every((k) => set.has(k)) && keys.length === allowed.length;
}

function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

function isInt32(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2147483647;
}

function isWeight(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1.7976931348623157e308
  );
}

function isNonBlankName(value) {
  return typeof value === "string" && value.length > 0 && /\S/u.test(value);
}

function isUuidArray(value) {
  return Array.isArray(value) && value.every(isUuid);
}

function checkPageArgs(args) {
  if (
    !exactKeys(
      args,
      ["limit", "pageToken"].filter((k) => k in args),
    )
  )
    return "unknown-or-missing-fields";
  if ("limit" in args) {
    if (
      typeof args.limit !== "number" ||
      !Number.isInteger(args.limit) ||
      args.limit < 1 ||
      args.limit > 200
    ) {
      return "invalid-limit";
    }
  }
  if ("pageToken" in args) {
    if (typeof args.pageToken !== "string" || args.pageToken.length === 0)
      return "invalid-pageToken";
  }
  return null;
}

function checkCreateArgs(args) {
  if (
    !exactKeys(
      args,
      ["operationId", "name", "exercises"].filter((k) => k in args),
    )
  ) {
    return "root-fields";
  }
  if (!isUuid(args.operationId)) return "operationId";
  if (!isNonBlankName(args.name)) return "name";
  if (!Array.isArray(args.exercises) || args.exercises.length === 0) return "exercises";
  for (const entry of args.exercises) {
    if (
      !exactKeys(
        entry,
        ["exerciseId", "restDurationSeconds", "sets"].filter((k) => k in entry),
      )
    ) {
      return "entry-fields";
    }
    if (!isUuid(entry.exerciseId)) return "entry.exerciseId";
    if ("restDurationSeconds" in entry && !isInt32(entry.restDurationSeconds)) {
      return "entry.restDurationSeconds";
    }
    if (!Array.isArray(entry.sets)) return "entry.sets";
    for (const set of entry.sets) {
      if (
        !exactKeys(
          set,
          ["repetitions", "weightKg"].filter((k) => k in set),
        )
      )
        return "set-fields";
      if ("repetitions" in set && !(set.repetitions === null || isInt32(set.repetitions))) {
        return "set.repetitions";
      }
      if ("weightKg" in set && !(set.weightKg === null || isWeight(set.weightKg))) {
        return "set.weightKg";
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Canonical intent (§5 of the approved spec).
// ---------------------------------------------------------------------------

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

function canonicalCreateIntent(args) {
  return canonicalize({
    operationId: args.operationId,
    name: args.name,
    exercises: args.exercises.map((entry) => ({
      exerciseId: entry.exerciseId,
      restDurationSeconds: "restDurationSeconds" in entry ? entry.restDurationSeconds : 30,
      sets: entry.sets.map((set) => ({
        repetitions: "repetitions" in set ? set.repetitions : null,
        weightKg: "weightKg" in set ? set.weightKg : null,
      })),
    })),
  });
}

function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

// ---------------------------------------------------------------------------
// Envelopes.
// ---------------------------------------------------------------------------

function successEnvelope(data) {
  return { ok: true, data: { synthetic: true, ...data } };
}

function refusalEnvelope(code, message) {
  return { ok: false, error: { code, retryable: false, ...(message ? { message } : {}) } };
}

function toResult(envelope, isError) {
  const text = JSON.stringify(envelope);
  return { content: [{ type: "text", text }], structuredContent: envelope, isError };
}

// ---------------------------------------------------------------------------
// Ledger (fixture-origin; stderr channel and/or owned file, never stdout).
// ---------------------------------------------------------------------------

let ledgerFd = null;

function emitLedger(record) {
  const line = `${LEDGER_PREFIX}${JSON.stringify(record)}\n`;
  try {
    process.stderr.write(line);
  } catch {
    // stderr best-effort; the owned file below is authoritative when configured.
  }
  if (ledgerFd !== null) {
    try {
      writeSync(ledgerFd, line);
    } catch {
      // Owned-file write failure must not alter MCP behavior; recorded by driver
      // as a missing-ledger observation, never a silent pass.
    }
  }
}

// ---------------------------------------------------------------------------
// Strict binding file + sidecar channel (receiver side).
// ---------------------------------------------------------------------------

const BINDING_FIELDS = ["origin", "accountUuid", "sessionGeneration", "profileGenerationId"];

function loadBindingFile(path) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  if (Buffer.byteLength(raw, "utf8") > SIDECAR_FRAME_LIMIT)
    return { ok: false, reason: "too-large" };
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!isPlainObject(parsed) || !exactKeys(parsed, BINDING_FIELDS)) {
    return { ok: false, reason: "fields" };
  }
  if (parsed.origin !== "synthetic://t02") return { ok: false, reason: "origin" };
  if (!isUuid(parsed.accountUuid)) return { ok: false, reason: "accountUuid" };
  if (!isUuid(parsed.profileGenerationId)) return { ok: false, reason: "profileGenerationId" };
  if (
    typeof parsed.sessionGeneration !== "number" ||
    !Number.isInteger(parsed.sessionGeneration) ||
    parsed.sessionGeneration < 0
  ) {
    return { ok: false, reason: "sessionGeneration" };
  }
  return { ok: true, binding: parsed };
}

function sidecarQuery(sockPath, request) {
  return new Promise((resolve) => {
    const payload = `${JSON.stringify(request)}\n`;
    if (Buffer.byteLength(payload, "utf8") > SIDECAR_FRAME_LIMIT) {
      resolve({ ok: false, reason: "request-too-large" });
      return;
    }
    let done = false;
    const finish = (result) => {
      if (done) return;
      done = true;
      try {
        socket.destroy();
      } catch {
        // ignore
      }
      resolve(result);
    };
    const timer = setTimeout(() => finish({ ok: false, reason: "deadline" }), SIDECAR_DEADLINE_MS);
    let socket;
    try {
      socket = connect(sockPath);
    } catch {
      clearTimeout(timer);
      resolve({ ok: false, reason: "connect-throw" });
      return;
    }
    let buffer = "";
    socket.on("connect", () => {
      socket.write(payload, (err) => {
        if (err) {
          clearTimeout(timer);
          finish({ ok: false, reason: "write" });
        }
      });
    });
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      if (Buffer.byteLength(buffer, "utf8") > SIDECAR_FRAME_LIMIT) {
        clearTimeout(timer);
        finish({ ok: false, reason: "frame-too-large" });
        return;
      }
      const nl = buffer.indexOf("\n");
      if (nl !== -1) {
        const first = buffer.slice(0, nl);
        const rest = buffer.slice(nl + 1);
        clearTimeout(timer);
        if (rest.length > 0) {
          finish({ ok: false, reason: "extra-frame" });
          return;
        }
        let parsed;
        try {
          parsed = JSON.parse(first);
        } catch {
          finish({ ok: false, reason: "malformed" });
          return;
        }
        finish({ ok: true, response: parsed });
      }
    });
    socket.on("error", () => {
      clearTimeout(timer);
      finish({ ok: false, reason: "connect" });
    });
    socket.on("close", () => {
      clearTimeout(timer);
      finish({ ok: false, reason: "closed" });
    });
  });
}

const VERDICT_FIELDS = [
  "operationId",
  "origin",
  "accountUuid",
  "sessionGeneration",
  "profileGenerationId",
  "approvedDigest",
  "decision",
  "reason",
];

function checkVerdict(response, request) {
  if (!isPlainObject(response) || !exactKeys(response, VERDICT_FIELDS)) return "fields";
  for (const field of [
    "operationId",
    "origin",
    "accountUuid",
    "sessionGeneration",
    "profileGenerationId",
  ]) {
    if (response[field] !== request[field]) return "tuple-mismatch";
  }
  if (
    typeof response.decision !== "string" ||
    (response.decision !== "allow" && response.decision !== "deny")
  ) {
    return "decision";
  }
  if (typeof response.reason !== "string") return "reason";
  if (!(
    response.approvedDigest === null ||
    (typeof response.approvedDigest === "string" && /^[0-9a-f]{64}$/.test(response.approvedDigest))
  )) {
    return "approvedDigest";
  }
  return null;
}

// ---------------------------------------------------------------------------
// Server.
// ---------------------------------------------------------------------------

function parseLaunchArgs(argv) {
  const out = { sidecar: null, bindingFile: null, ledgerFile: null, journalFile: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--t02-sidecar") out.sidecar = argv[(i += 1)] ?? null;
    else if (argv[i] === "--t02-binding-file") out.bindingFile = argv[(i += 1)] ?? null;
    else if (argv[i] === "--t02-ledger-file") out.ledgerFile = argv[(i += 1)] ?? null;
    else if (argv[i] === "--t02-event-journal") out.journalFile = argv[(i += 1)] ?? null;
    else {
      process.stderr.write(`t02-fixture: unknown argument (refused): ${argv[i]}\n`);
      process.exit(2);
    }
  }
  return out;
}

const READ_ANNOTATIONS = { readOnlyHint: true, idempotentHint: true, openWorldHint: true };
const CREATE_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

function seedExerciseRecord() {
  return {
    exerciseId: SEED_EXERCISE_ID,
    name: SEED_LABEL,
    muscleGroupIds: [],
    equipmentIds: [],
    revision: null,
  };
}

function emptyPage(extra) {
  return { items: [], hasMore: false, nextPageToken: null, ...extra };
}

async function main() {
  const launch = parseLaunchArgs(process.argv.slice(2));
  if (launch.ledgerFile) {
    try {
      ledgerFd = openSync(launch.ledgerFile, "a", 0o600);
    } catch (err) {
      process.stderr.write(
        `t02-fixture: cannot open ledger file: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      process.exit(2);
    }
  }
  if (launch.journalFile) journalOpen(launch.journalFile);
  journalRecord("fixture_startup", {
    server: "synth-gt",
    sidecar: launch.sidecar !== null,
    binding: launch.bindingFile !== null,
    ledger: launch.ledgerFile !== null,
    journal: launch.journalFile !== null,
  });

  const counters = new Map();
  let totalDispatches = 0;
  const counted = (operationId, digest) => {
    const prev = counters.get(operationId) ?? { dispatches: 0, digest };
    const next = { dispatches: prev.dispatches + 1, digest };
    counters.set(operationId, next);
    totalDispatches += 1;
    const record = {
      event: "dispatch",
      operationId,
      digest,
      dispatches: next.dispatches,
      totalDispatches,
    };
    emitLedger(record);
    journalRecord("effect_ledger", {
      operationId,
      digest,
      counter: next.dispatches,
      final: false,
    });
    return record;
  };

  const server = new McpServer({ name: "synth-gt", version: "0.2.0" }, { capabilities: {} });
  const shape = (fields) => z.object(fields).strict();

  server.registerTool(
    "search_exercises",
    {
      description: `${SYNTHETIC_FIRST_LINE} Search fixed synthetic catalogue records.`,
      inputSchema: shape({
        search: z.string().optional(),
        muscleGroupIds: z.array(z.string()).optional(),
        equipmentIds: z.array(z.string()).optional(),
        limit: z.number().optional(),
        pageToken: z.string().optional(),
      }),
      annotations: READ_ANNOTATIONS,
    },
    async (args) => {
      const pageError = checkPageArgs({
        ...(args.limit !== undefined ? { limit: args.limit } : {}),
        ...(args.pageToken !== undefined ? { pageToken: args.pageToken } : {}),
      });
      if (pageError) return toResult(refusalEnvelope("invalid_arguments", pageError), true);
      if (args.search !== undefined && typeof args.search !== "string") {
        return toResult(refusalEnvelope("invalid_arguments", "search"), true);
      }
      if (args.muscleGroupIds !== undefined && !isUuidArray(args.muscleGroupIds)) {
        return toResult(refusalEnvelope("invalid_arguments", "muscleGroupIds"), true);
      }
      if (args.equipmentIds !== undefined && !isUuidArray(args.equipmentIds)) {
        return toResult(refusalEnvelope("invalid_arguments", "equipmentIds"), true);
      }
      return toResult(
        successEnvelope({
          catalogueVersion: CATALOGUE_VERSION,
          ...emptyPage({ items: [seedExerciseRecord()] }),
        }),
        false,
      );
    },
  );

  server.registerTool(
    "get_exercise",
    {
      description: `${SYNTHETIC_FIRST_LINE} Read one fixed synthetic exercise record.`,
      inputSchema: shape({ exerciseId: z.string() }),
      annotations: READ_ANNOTATIONS,
    },
    async (args) => {
      if (!isUuid(args.exerciseId))
        return toResult(refusalEnvelope("invalid_arguments", "exerciseId"), true);
      if (args.exerciseId !== SEED_EXERCISE_ID) {
        return toResult(refusalEnvelope("not_found", "unknown synthetic exercise"), true);
      }
      return toResult(successEnvelope(seedExerciseRecord()), false);
    },
  );

  server.registerTool(
    "list_workouts",
    {
      description: `${SYNTHETIC_FIRST_LINE} List fixed synthetic workouts (always empty).`,
      inputSchema: shape({
        status: z.string().optional(),
        limit: z.number().optional(),
        pageToken: z.string().optional(),
      }),
      annotations: READ_ANNOTATIONS,
    },
    async (args) => {
      if (args.status !== undefined && args.status !== "active" && args.status !== "finished") {
        return toResult(refusalEnvelope("invalid_arguments", "status"), true);
      }
      const pageError = checkPageArgs({
        ...(args.limit !== undefined ? { limit: args.limit } : {}),
        ...(args.pageToken !== undefined ? { pageToken: args.pageToken } : {}),
      });
      if (pageError) return toResult(refusalEnvelope("invalid_arguments", pageError), true);
      return toResult(successEnvelope(emptyPage({})), false);
    },
  );

  server.registerTool(
    "get_workout",
    {
      description: `${SYNTHETIC_FIRST_LINE} Read one synthetic workout (always not_found).`,
      inputSchema: shape({ workoutId: z.string() }),
      annotations: READ_ANNOTATIONS,
    },
    async (args) => {
      if (!isUuid(args.workoutId))
        return toResult(refusalEnvelope("invalid_arguments", "workoutId"), true);
      return toResult(refusalEnvelope("not_found", "no synthetic workouts"), true);
    },
  );

  server.registerTool(
    "list_routines",
    {
      description: `${SYNTHETIC_FIRST_LINE} List synthetic routines (always empty).`,
      inputSchema: shape({ limit: z.number().optional(), pageToken: z.string().optional() }),
      annotations: READ_ANNOTATIONS,
    },
    async (args) => {
      const pageError = checkPageArgs({
        ...(args.limit !== undefined ? { limit: args.limit } : {}),
        ...(args.pageToken !== undefined ? { pageToken: args.pageToken } : {}),
      });
      if (pageError) return toResult(refusalEnvelope("invalid_arguments", pageError), true);
      return toResult(successEnvelope(emptyPage({})), false);
    },
  );

  server.registerTool(
    "get_routine",
    {
      description: `${SYNTHETIC_FIRST_LINE} Read one synthetic routine (always not_found).`,
      inputSchema: shape({ routineId: z.string() }),
      annotations: READ_ANNOTATIONS,
    },
    async (args) => {
      if (!isUuid(args.routineId))
        return toResult(refusalEnvelope("invalid_arguments", "routineId"), true);
      return toResult(refusalEnvelope("not_found", "no synthetic routines"), true);
    },
  );

  server.registerTool(
    "create_routine",
    {
      description: `${SYNTHETIC_FIRST_LINE} Synthetic creation counter. Requires a sidecar approval verdict bound to the trusted tuple; otherwise refused. Never a real saved receipt.`,
      inputSchema: shape({
        operationId: z.string(),
        name: z.string(),
        exercises: z.array(z.unknown()),
      }),
      annotations: CREATE_ANNOTATIONS,
    },
    async (args) => {
      const wire = JSON.stringify(args);
      if (Buffer.byteLength(wire, "utf8") > MAX_WIRE_BYTES) {
        return toResult(refusalEnvelope("invalid_arguments", "wire-too-large"), true);
      }
      const invalid = checkCreateArgs(args);
      if (invalid) return toResult(refusalEnvelope("invalid_arguments", invalid), true);
      const canonical = canonicalCreateIntent(args);
      const receivedDigest = sha256Hex(Buffer.from(JSON.stringify(canonical), "utf8"));
      const operationId = args.operationId;
      // Fixture-origin receiver observation (flat §8 fields), emitted to the
      // ledger channel and the shared journal before the corresponding action.
      const check = (approvedDigest, tupleMatch, generationMatch, decision, reason) => {
        const record = {
          event: "receiver_check",
          operationId,
          receivedDigest,
          approvedDigest,
          tupleMatch,
          generationMatch,
          decision,
          reason,
        };
        emitLedger(record);
        journalRecord("receiver_check", record);
      };

      if (!launch.sidecar || !launch.bindingFile) {
        check(null, false, false, "deny", "no-sidecar");
        return toResult(refusalEnvelope("write_approval_required", "no-sidecar"), true);
      }
      const binding = loadBindingFile(launch.bindingFile);
      if (!binding.ok) {
        check(null, false, false, "deny", `binding-${binding.reason}`);
        return toResult(refusalEnvelope("binding_unavailable", `binding-${binding.reason}`), true);
      }
      const request = {
        operationId,
        origin: binding.binding.origin,
        accountUuid: binding.binding.accountUuid,
        sessionGeneration: binding.binding.sessionGeneration,
        profileGenerationId: binding.binding.profileGenerationId,
        receivedDigest,
      };
      const queried = await sidecarQuery(launch.sidecar, request);
      if (!queried.ok) {
        check(null, true, true, "deny", `sidecar-${queried.reason}`);
        return toResult(refusalEnvelope("binding_unavailable", `sidecar-${queried.reason}`), true);
      }
      const verdictProblem = checkVerdict(queried.response, request);
      if (verdictProblem) {
        check(
          typeof queried.response?.approvedDigest === "string"
            ? queried.response.approvedDigest
            : null,
          verdictProblem !== "tuple-mismatch",
          verdictProblem !== "tuple-mismatch",
          "deny",
          `verdict-${verdictProblem}`,
        );
        return toResult(refusalEnvelope("binding_unavailable", `verdict-${verdictProblem}`), true);
      }
      const verdict = queried.response;
      const tupleMatch = true;
      const generationMatch = true;
      if (
        verdict.decision !== "allow" ||
        verdict.approvedDigest === null ||
        verdict.approvedDigest !== receivedDigest
      ) {
        if (
          verdict.decision === "allow" ||
          (verdict.approvedDigest !== null && verdict.approvedDigest !== receivedDigest)
        ) {
          check(verdict.approvedDigest, tupleMatch, generationMatch, "deny", "digest-mismatch");
          return toResult(refusalEnvelope("input_integrity_mismatch", "digest-mismatch"), true);
        }
        check(
          verdict.approvedDigest,
          tupleMatch,
          generationMatch,
          "deny",
          verdict.reason || "denied",
        );
        return toResult(
          refusalEnvelope("write_approval_required", verdict.reason || "denied"),
          true,
        );
      }
      check(verdict.approvedDigest, tupleMatch, generationMatch, "allow", "approved");
      const observed = counted(operationId, receivedDigest);
      return toResult(
        successEnvelope({ operationId, dispatches: observed.dispatches, digest: receivedDigest }),
        false,
      );
    },
  );

  let finalized = false;
  const finalize = () => {
    // Exactly-once finalization across stdin end/close/termination stimuli.
    if (finalized) return;
    finalized = true;
    const operations = [...counters.entries()].map(([operationId, value]) => ({
      operationId,
      digest: value.digest,
      dispatches: value.dispatches,
    }));
    // No-admission final: explicit null operationId/digest per §8 (a
    // gate-blocked call was never admitted, so no seed is stamped here).
    // Nonempty serialization is preserved unchanged for future profiles.
    const noAdmission = operations.length === 0;
    emitLedger({
      event: "final",
      ...(noAdmission ? { operationId: null, digest: null } : {}),
      totalDispatches,
      operations,
    });
    journalRecord("effect_ledger", {
      ...(noAdmission ? { operationId: null, digest: null } : {}),
      operations,
      counter: totalDispatches,
      final: true,
    });
    if (ledgerFd !== null) {
      try {
        closeSync(ledgerFd);
      } catch {
        // ignore close errors during shutdown
      }
      ledgerFd = null;
    }
  };
  process.on("SIGTERM", () => {
    finalize();
    process.exit(0);
  });

  const transport = new ObservedTransport();
  await server.connect(transport);
  // Final zero/non-zero counter proof is emitted when stdin closes (parent teardown).
  const closeInput = () => {
    finalize();
    process.exit(0);
  };
  process.stdin.once("end", closeInput);
  process.stdin.once("close", closeInput);
}

main().catch((err) => {
  process.stderr.write(`t02-fixture: fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
