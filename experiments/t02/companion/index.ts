/**
 * T02 experimental companion — synthetic approval gate + registration.
 *
 * EXPERIMENT ONLY. Never loaded outside the named disposable launcher. The
 * factory installs the `tool_call` gate synchronously at load, before any
 * registration or connection can occur.
 */

import type {
  ExtensionAPI,
  ExtensionContext,
  McpExposure,
  SessionShutdownEvent,
  SessionStartEvent,
  ToolCallEvent,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { openSharedJournal, type T02SharedJournalWriter } from "../driver/event-journal.mjs";
import { createHash, randomBytes } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { createServer, type Server, type Socket } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SERVER_NAME = "synth-gt";
const CREATE_TOOL = "mcp__synth_gt__create_routine";
const ORCHESTRATOR_TOOL = "t02_orchestrate";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const FRAME_LIMIT = 64 * 1024;
const APPROVAL_WAIT_MS = 10_000;
const BINDING_FIELDS = [
  "origin",
  "accountUuid",
  "sessionGeneration",
  "profileGenerationId",
] as const;
const REQUEST_FIELDS = [...BINDING_FIELDS, "operationId", "receivedDigest"] as const;

type Binding = {
  origin: string;
  accountUuid: string;
  sessionGeneration: number;
  profileGenerationId: string;
};

type SessionState = {
  mode: string;
  scenario: string;
  exposure: string;
  binding: Binding | null;
  policy: "none" | "readonly" | "guarded";
  sockPath: string | null;
  listener: Server | null;
  registered: boolean;
};

const state: SessionState = {
  mode: "unknown",
  scenario: "",
  exposure: "",
  binding: null,
  policy: "none",
  sockPath: null,
  listener: null,
  registered: false,
};

const approvals = new Map<string, string>();
let traceSeq = 0;
let traceOk = false;
// Shared append-only channel (launcher-owned journal, producer `companion`).
// Opened once at factory load when T02_SHARED_JOURNAL is supplied; while
// active every observation routes through its protected single-append
// writer. Null preserves the legacy separate trace-file behavior.
let sharedJournal: T02SharedJournalWriter | null = null;

function approvalKey(binding: Binding, operationId: string): string {
  return [
    binding.origin,
    binding.accountUuid,
    String(binding.sessionGeneration),
    binding.profileGenerationId,
    operationId,
  ].join("\u0000");
}

// ---------------------------------------------------------------------------
// Trace (companion-origin; owned file from launcher env, never session JSONL).
// ---------------------------------------------------------------------------

function trace(type: string, fields: Record<string, unknown>): boolean {
  const layer = process.env["T02_LAYER"] ?? "unknown";
  const owned = sharedJournal;
  if (owned) {
    try {
      owned.record("companion", type, fields, layer);
      return true;
    } catch {
      return false;
    }
  }
  const path = process.env["T02_TRACE_FILE"];
  if (!path) return false;
  traceSeq += 1;
  const line = `${JSON.stringify({ seq: traceSeq, source: "companion", type, layer, ...fields })}\n`;
  try {
    appendFileSync(path, line, { encoding: "utf8" });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Visible escaping for the approval preview (escaping, never interpretation).
// ---------------------------------------------------------------------------

export function escapeVisibleLine(line: string): string {
  let out = "";
  for (const ch of line) {
    const code = ch.codePointAt(0) ?? 0;
    if (ch === "\t") {
      out += "\\t";
    } else if (code === 0x1b) {
      out += "<ESC>";
    } else if (code < 0x20 || (code >= 0x7f && code <= 0x9f)) {
      out += `\\u{${code.toString(16)}}`;
    } else if (code === 0x2028 || code === 0x2029 || code === 0xfeff) {
      out += `\\u{${code.toString(16)}}`;
    } else {
      out += ch;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Strict validation + canonical intent (independent mirror of the receiver).
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: unknown, allowed: readonly string[]): boolean {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  return (
    keys.length === allowed.length && keys.every((k) => (allowed as readonly string[]).includes(k))
  );
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function isInt32(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2147483647;
}

function isWeight(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1.7976931348623157e308
  );
}

function isNonBlankName(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && /\S/u.test(value);
}

function checkCreateArgs(args: unknown): string | null {
  if (!isPlainObject(args)) return "not-object";
  const present = (k: string): boolean => Object.prototype.hasOwnProperty.call(args, k);
  if (
    !exactKeys(
      args,
      ["operationId", "name", "exercises"].filter((k) => present(k)),
    )
  )
    return "root-fields";
  if (!isUuid(args["operationId"])) return "operationId";
  if (!isNonBlankName(args["name"])) return "name";
  if (!Array.isArray(args["exercises"]) || args["exercises"].length === 0) return "exercises";
  for (const entry of args["exercises"] as unknown[]) {
    if (!isPlainObject(entry)) return "entry-object";
    const epresent = (k: string): boolean => Object.prototype.hasOwnProperty.call(entry, k);
    if (
      !exactKeys(
        entry,
        ["exerciseId", "restDurationSeconds", "sets"].filter((k) => epresent(k)),
      )
    ) {
      return "entry-fields";
    }
    if (!isUuid(entry["exerciseId"])) return "entry.exerciseId";
    if (epresent("restDurationSeconds") && !isInt32(entry["restDurationSeconds"]))
      return "entry.restDurationSeconds";
    if (!Array.isArray(entry["sets"])) return "entry.sets";
    for (const set of entry["sets"] as unknown[]) {
      if (!isPlainObject(set)) return "set-object";
      const spresent = (k: string): boolean => Object.prototype.hasOwnProperty.call(set, k);
      if (
        !exactKeys(
          set,
          ["repetitions", "weightKg"].filter((k) => spresent(k)),
        )
      )
        return "set-fields";
      if (
        spresent("repetitions") &&
        !(set["repetitions"] === null || isInt32(set["repetitions"]))
      ) {
        return "set.repetitions";
      }
      if (spresent("weightKg") && !(set["weightKg"] === null || isWeight(set["weightKg"]))) {
        return "set.weightKg";
      }
    }
  }
  return null;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) out[key] = canonicalize(value[key]);
    return out;
  }
  return value;
}

function canonicalCreateIntent(args: Record<string, unknown>): Record<string, unknown> {
  const exercises = args["exercises"] as Array<Record<string, unknown>>;
  return canonicalize({
    operationId: args["operationId"],
    name: args["name"],
    exercises: exercises.map((entry) => ({
      exerciseId: entry["exerciseId"],
      restDurationSeconds: Object.prototype.hasOwnProperty.call(entry, "restDurationSeconds")
        ? entry["restDurationSeconds"]
        : 30,
      sets: (entry["sets"] as Array<Record<string, unknown>>).map((set) => ({
        repetitions: Object.prototype.hasOwnProperty.call(set, "repetitions")
          ? set["repetitions"]
          : null,
        weightKg: Object.prototype.hasOwnProperty.call(set, "weightKg") ? set["weightKg"] : null,
      })),
    })),
  }) as Record<string, unknown>;
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex");
}

// ---------------------------------------------------------------------------
// Binding file (companion-private; never model args/results/session entries).
// ---------------------------------------------------------------------------

function loadBindingFile(
  path: string,
): { ok: true; binding: Binding } | { ok: false; reason: string } {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  if (Buffer.byteLength(raw, "utf8") > FRAME_LIMIT) return { ok: false, reason: "too-large" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!exactKeys(parsed, BINDING_FIELDS)) return { ok: false, reason: "fields" };
  const record = parsed as Record<string, unknown>;
  if (record["origin"] !== "synthetic://t02") return { ok: false, reason: "origin" };
  if (!isUuid(record["accountUuid"])) return { ok: false, reason: "accountUuid" };
  if (!isUuid(record["profileGenerationId"])) return { ok: false, reason: "profileGenerationId" };
  if (
    typeof record["sessionGeneration"] !== "number" ||
    !Number.isInteger(record["sessionGeneration"]) ||
    (record["sessionGeneration"] as number) < 0
  ) {
    return { ok: false, reason: "sessionGeneration" };
  }
  return {
    ok: true,
    binding: {
      origin: record["origin"] as string,
      accountUuid: record["accountUuid"] as string,
      sessionGeneration: record["sessionGeneration"] as number,
      profileGenerationId: record["profileGenerationId"] as string,
    },
  };
}

// ---------------------------------------------------------------------------
// Sidecar listener (companion side; verdicts bound to the full tuple).
// ---------------------------------------------------------------------------

function tupleOf(binding: Binding): Record<string, unknown> {
  return {
    origin: binding.origin,
    accountUuid: binding.accountUuid,
    sessionGeneration: binding.sessionGeneration,
    profileGenerationId: binding.profileGenerationId,
  };
}

function handleSidecarFrame(frame: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(frame);
  } catch {
    return { decision: "deny", reason: "malformed" };
  }
  if (!exactKeys(parsed, REQUEST_FIELDS)) {
    return { decision: "deny", reason: "fields" };
  }
  const req = parsed as Record<string, unknown>;
  const binding = state.binding;
  if (!binding) return { decision: "deny", reason: "no-binding" };
  const expected = tupleOf(binding);
  for (const field of BINDING_FIELDS) {
    if (req[field] !== expected[field]) {
      return {
        ...expected,
        operationId: typeof req["operationId"] === "string" ? req["operationId"] : null,
        approvedDigest: null,
        decision: "deny",
        reason: "tuple-mismatch",
      };
    }
  }
  if (typeof req["operationId"] !== "string" || !isUuid(req["operationId"])) {
    return {
      ...expected,
      operationId: null,
      approvedDigest: null,
      decision: "deny",
      reason: "operationId",
    };
  }
  if (typeof req["receivedDigest"] !== "string" || !/^[0-9a-f]{64}$/.test(req["receivedDigest"])) {
    return {
      ...expected,
      operationId: req["operationId"],
      approvedDigest: null,
      decision: "deny",
      reason: "receivedDigest",
    };
  }
  const approved = approvals.get(approvalKey(binding, req["operationId"] as string)) ?? null;
  if (approved === null) {
    return {
      ...expected,
      operationId: req["operationId"],
      approvedDigest: null,
      decision: "deny",
      reason: "no-approval",
    };
  }
  return {
    ...expected,
    operationId: req["operationId"],
    approvedDigest: approved,
    decision: "allow",
    reason: "approved",
  };
}

function openSidecarListener(sockPath: string): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer((socket: Socket) => {
      let buffer = "";
      let answered = false;
      const answer = (frame: string): void => {
        if (answered) return;
        answered = true;
        // Diagnostic fault injection (explicit scenarios only): malformed or
        // stale responses so the receiver must refuse before any effect.
        const fault = process.env["T02_SIDECAR_FAULT"];
        if (fault === "malform") {
          try {
            trace("sidecar_fault", { mode: "malform", at: "verdict" });
            socket.write("{malformed-verdict\n", () => {
              socket.end();
            });
          } catch {
            try {
              socket.destroy();
            } catch {
              // ignore
            }
          }
          return;
        }
        const verdict = handleSidecarFrame(frame);
        if (fault === "stale" && verdict["decision"] === "allow") {
          trace("sidecar_fault", { mode: "stale", at: "verdict" });
          (verdict as Record<string, unknown>)["sessionGeneration"] =
            (state.binding?.sessionGeneration ?? 0) + 1;
        }
        // Companion-origin verdict observation (flat §8 fields). The requested
        // digest/tuple come from the wire frame, not from gate memory.
        let requested: Record<string, unknown> | null = null;
        try {
          const parsedFrame: unknown = JSON.parse(frame);
          if (isPlainObject(parsedFrame)) requested = parsedFrame;
        } catch {
          requested = null;
        }
        const sessionTuple = state.binding ? tupleOf(state.binding) : null;
        const tupleMatch =
          requested !== null &&
          sessionTuple !== null &&
          (BINDING_FIELDS as readonly string[]).every(
            (field) => requested?.[field] === sessionTuple[field],
          );
        const generationMatch =
          requested !== null &&
          sessionTuple !== null &&
          requested["sessionGeneration"] === sessionTuple["sessionGeneration"];
        trace("sidecar_verdict", {
          operationId:
            typeof requested?.["operationId"] === "string" ? requested["operationId"] : null,
          receivedDigest:
            typeof requested?.["receivedDigest"] === "string" ? requested["receivedDigest"] : null,
          approvedDigest:
            typeof verdict["approvedDigest"] === "string" ? verdict["approvedDigest"] : null,
          tupleMatch,
          generationMatch,
          decision: verdict["decision"] ?? "deny",
          reason: typeof verdict["reason"] === "string" ? verdict["reason"] : "unknown",
        });
        try {
          socket.write(`${JSON.stringify(verdict)}\n`, () => {
            socket.end();
          });
        } catch {
          try {
            socket.destroy();
          } catch {
            // ignore
          }
        }
      };
      socket.on("data", (chunk: Buffer) => {
        buffer += chunk.toString("utf8");
        if (Buffer.byteLength(buffer, "utf8") > FRAME_LIMIT) {
          if (!answered) {
            answered = true;
            try {
              socket.write(
                `${JSON.stringify({ decision: "deny", reason: "frame-too-large" })}\n`,
                () => socket.end(),
              );
            } catch {
              socket.destroy();
            }
          }
          return;
        }
        const nl = buffer.indexOf("\n");
        if (nl !== -1) {
          const first = buffer.slice(0, nl);
          const rest = buffer.slice(nl + 1);
          if (rest.length > 0) {
            answered = true;
            try {
              socket.write(`${JSON.stringify({ decision: "deny", reason: "extra-frame" })}\n`, () =>
                socket.end(),
              );
            } catch {
              socket.destroy();
            }
            return;
          }
          answer(first);
        }
      });
      socket.on("error", () => {
        // Faults fail closed: no verdict is produced for errored sockets.
      });
    });
    server.on("error", (err: unknown) => {
      reject(err instanceof Error ? err : new Error(String(err)));
    });
    server.listen(sockPath, () => {
      resolve(server);
    });
  });
}

// ---------------------------------------------------------------------------
// Approval preview component (duck-typed; no host imports at runtime).
// ---------------------------------------------------------------------------

type MinimalTui = { requestRender: (force?: boolean) => void };
type MinimalComponent = {
  render: (width: number) => string[];
  handleInput?: (data: string) => void;
  invalidate: () => void;
  dispose?: () => void;
};

function previewComponent(
  lines: string[],
  done: (approved: boolean, stimulus: string) => void,
  tui: MinimalTui,
): MinimalComponent {
  let offset = 0;
  const render = (width: number): string[] => {
    const w = Math.max(20, Math.min(width, 100));
    const out: string[] = [];
    out.push("SYNTHETIC T02 approval preview (counters only, no backend)".slice(0, w));
    out.push(
      `Esc/n/q deny · Enter/y approve · arrows/j/k scroll (${offset + 1}/${lines.length})`.slice(
        0,
        w,
      ),
    );
    out.push("─".repeat(Math.min(w, 78)));
    const height = 20;
    for (let i = 0; i < height; i += 1) {
      const line = lines[offset + i];
      out.push((line ?? "").slice(0, w));
    }
    return out;
  };
  const finish = (approved: boolean, stimulus: string): void => {
    done(approved, stimulus);
  };
  return {
    render,
    invalidate: () => undefined,
    handleInput: (data: string) => {
      if (data === "\r" || data === "\n" || data === "y" || data === "Y")
        finish(true, `key:${JSON.stringify(data)}`);
      else if (data === "\u001b") finish(false, "key:dismiss");
      else if (data === "\u0003") finish(false, "key:cancel");
      else if (data === "n" || data === "N" || data === "q")
        finish(false, `key:${JSON.stringify(data)}`);
      else if (data === "\u001b[A" || data === "k") offset = Math.max(0, offset - 1);
      else if (data === "\u001b[B" || data === "j")
        offset = Math.min(Math.max(0, lines.length - 1), offset + 1);
      else if (data === " " || data === "\u001b[6~")
        offset = Math.min(Math.max(0, lines.length - 1), offset + 20);
      else if (data === "\u001b[5~") offset = Math.max(0, offset - 20);
      else return;
      try {
        tui.requestRender();
      } catch {
        // render failure must not break the decision path
      }
    },
  };
}

async function askApproval(
  ctx: ExtensionContext,
  canonical: Record<string, unknown>,
): Promise<{ approved: boolean; stimulus: string }> {
  const pretty = JSON.stringify(canonical, null, 2).split("\n").map(escapeVisibleLine);
  const lines = ["operation: create_routine (SYNTHETIC)", ...pretty];
  const ui = ctx.ui as unknown as {
    custom?: (
      factory: (
        tui: MinimalTui,
        theme: unknown,
        keybindings: unknown,
        done: (r: boolean) => void,
      ) => MinimalComponent | Promise<MinimalComponent>,
    ) => Promise<boolean>;
  };
  const custom = ui.custom;
  if (typeof custom !== "function") return { approved: false, stimulus: "no-custom-ui" };
  const decision = await Promise.race([
    (async () => {
      let stimulus = "unknown";
      const approved = await custom((tui, _theme, _keys, done) => {
        void _theme;
        void _keys;
        return previewComponent(
          lines,
          (value, stim) => {
            stimulus = stim;
            done(value);
          },
          tui,
        );
      });
      return { approved, stimulus };
    })(),
    new Promise<{ approved: false; stimulus: string }>((resolve) => {
      setTimeout(() => resolve({ approved: false, stimulus: "timeout" }), APPROVAL_WAIT_MS);
    }),
  ]);
  return decision;
}

// ---------------------------------------------------------------------------
// Gate (installed synchronously at factory load).
// ---------------------------------------------------------------------------

function gateResult(
  block: boolean,
  reason: string,
): { block: boolean; reason: string } | undefined {
  return block ? { block: true, reason } : undefined;
}

async function gate(
  event: ToolCallEvent,
  ctx: ExtensionContext,
): Promise<{ block: boolean; reason: string } | undefined> {
  if (event.toolName !== CREATE_TOOL) return undefined;
  const mode = (ctx as { mode?: unknown }).mode;
  const actualMode = typeof mode === "string" ? mode : "unknown";
  const input = (event as { input?: unknown }).input;
  const invalid = checkCreateArgs(input);
  const attemptedDigest = invalid
    ? null
    : sha256Hex(JSON.stringify(canonicalCreateIntent(input as Record<string, unknown>)));
  const record = (decision: string, reason: string, approvedDigest: string | null = null): void => {
    trace("gate_invocation", {
      toolCallId: (event as { toolCallId?: unknown }).toolCallId ?? null,
      parentToolCallId: (event as { parentToolCallId?: unknown }).parentToolCallId ?? null,
      mode: actualMode,
      hasUI: hasUi(ctx),
      operationId:
        isPlainObject(input) && typeof input["operationId"] === "string"
          ? input["operationId"]
          : null,
      attemptedDigest,
      approvedDigest,
      decision,
      reason,
    });
  };
  if (invalid) {
    record("deny", `invalid_arguments:${invalid}`);
    return gateResult(true, `t02 invalid_arguments:${invalid}`);
  }
  if (actualMode !== "tui") {
    record("deny", `mode-not-tui:${actualMode}`);
    return gateResult(true, `t02 mode-not-tui:${actualMode}`);
  }
  if (!state.binding) {
    record("deny", "binding-unavailable");
    return gateResult(true, "t02 binding-unavailable");
  }
  // Evidence availability gates the run: if the owned trace file was never
  // writable this session, no observations can be produced, so block.
  if (!traceOk) {
    record("deny", "trace-unavailable");
    return gateResult(true, "t02 trace-unavailable");
  }
  let approval: { approved: boolean; stimulus: string };
  try {
    approval = await askApproval(ctx, canonicalCreateIntent(input as Record<string, unknown>));
  } catch (err) {
    record("deny", `ui-error:${err instanceof Error ? err.message : String(err)}`);
    return gateResult(true, "t02 ui-error");
  }
  trace("approval_prompt", {
    toolCallId: (event as { toolCallId?: unknown }).toolCallId ?? null,
    operationId:
      isPlainObject(input) && typeof input["operationId"] === "string"
        ? input["operationId"]
        : null,
    stimulus: "genuine-pty",
    key: approval.stimulus,
    decision: approval.approved ? "approved" : "denied",
    reason: approval.approved ? "approved" : `denied:${approval.stimulus}`,
  });
  if (!approval.approved) {
    record("deny", `approval-denied:${approval.stimulus}`);
    return gateResult(true, "t02 approval-denied");
  }
  const binding = state.binding;
  const operationId = (input as Record<string, unknown>)["operationId"] as string;
  const key = approvalKey(binding, operationId);
  const digest = attemptedDigest as string;
  const existing = approvals.get(key);
  if (existing !== undefined && existing !== digest) {
    record("deny", "conflicting-intent");
    return gateResult(true, "t02 conflicting-intent");
  }
  approvals.set(key, digest);
  record("allow", "approved", digest);
  // Diagnostic fault injection (explicit scenarios only): break the channel
  // after a genuine approval so the receiver must refuse before any effect.
  if (process.env["T02_SIDECAR_FAULT"] === "unavailable" && state.listener) {
    const listener = state.listener;
    state.listener = null;
    trace("sidecar_fault", { mode: "unavailable", at: "post-approval" });
    try {
      listener.close();
    } catch {
      // ignore; queries will fail closed on connect
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Preflight + registration (session_start; never before gate installation).
// ---------------------------------------------------------------------------

function agentDir(): string {
  const override = process.env["PI_CODING_AGENT_DIR"];
  if (override) return override;
  return join(homedir(), ".pi", "agent");
}

function readStaticServers(path: string): Array<{ name: string }> {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [{ name: "<unparseable>" }];
  }
  if (!isPlainObject(parsed) || !isPlainObject(parsed["mcpServers"])) {
    return parsed !== null && typeof parsed === "object" ? [{ name: "<invalid-shape>" }] : [];
  }
  return Object.keys(parsed["mcpServers"] as Record<string, unknown>).map((name) => ({ name }));
}

function namespaceOf(server: string): string {
  return `mcp__${server.replace(/-/g, "_")}`;
}

function fixturePath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "fixture-server", "server.mjs");
}

function hasUi(ctx: ExtensionContext): boolean {
  return (ctx as { hasUI?: unknown }).hasUI === true;
}

async function onStart(
  pi: ExtensionAPI,
  event: SessionStartEvent,
  ctx: ExtensionContext,
): Promise<void> {
  const mode = (ctx as { mode?: unknown }).mode;
  state.mode = typeof mode === "string" ? mode : "unknown";
  state.scenario = process.env["T02_SCENARIO"] ?? "";
  state.exposure = process.env["T02_EXPOSURE"] ?? "";
  state.binding = null;
  state.policy = "none";
  state.sockPath = null;
  state.listener = null;
  state.registered = false;
  approvals.clear();

  traceOk = trace("session", {
    transition: "start",
    reason: event.reason,
    mode: state.mode,
    hasUI: hasUi(ctx),
  });

  // Preflight (a): scenario allowlist for exposure selection.
  const exposure: McpExposure | null =
    state.exposure === "direct" || state.exposure === "deferred" || state.exposure === "codemode"
      ? state.exposure
      : null;
  if (!exposure) {
    trace("registration", {
      server: SERVER_NAME,
      policy: "none",
      registered: false,
      connected: null,
      spawned: null,
      reason: `unsupported-exposure:${state.exposure}`,
    });
    return;
  }
  // Preflight (b): binding file present and unambiguous.
  const bindingPath = process.env["T02_BINDING_FILE"];
  if (!bindingPath) {
    trace("registration", {
      server: SERVER_NAME,
      policy: "none",
      registered: false,
      connected: null,
      spawned: null,
      reason: "binding-missing",
    });
    return;
  }
  const loaded = loadBindingFile(bindingPath);
  if (!loaded.ok) {
    trace("registration", {
      server: SERVER_NAME,
      policy: "none",
      registered: false,
      connected: null,
      spawned: null,
      reason: `binding-${loaded.reason}`,
    });
    return;
  }
  state.binding = loaded.binding;
  // Preflight (c): static configuration shadow / normalized collision scan.
  const staticNames = [
    ...readStaticServers(join(agentDir(), "mcp.json")),
    ...readStaticServers(join(ctx.cwd, ".pi", "mcp.json")),
  ];
  for (const entry of staticNames) {
    if (entry.name === "<unparseable>" || entry.name === "<invalid-shape>") {
      trace("registration", {
        server: SERVER_NAME,
        policy: "none",
        registered: false,
        connected: null,
        spawned: null,
        reason: "static-unparseable",
      });
      state.binding = null;
      return;
    }
    if (namespaceOf(entry.name) === namespaceOf(SERVER_NAME)) {
      trace("registration", {
        server: SERVER_NAME,
        policy: "none",
        registered: false,
        connected: null,
        spawned: null,
        reason: `static-shadow:${entry.name}`,
      });
      state.binding = null;
      return;
    }
  }
  // Preflight (d): builtin MCP support present.
  try {
    const settings = pi.getSettings() as unknown as { extensions?: unknown };
    if (Array.isArray(settings.extensions) && settings.extensions.includes("-builtin:mcp")) {
      trace("registration", {
        server: SERVER_NAME,
        policy: "none",
        registered: false,
        connected: null,
        spawned: null,
        reason: "builtin-mcp-disabled",
      });
      state.binding = null;
      return;
    }
  } catch {
    trace("registration", {
      server: SERVER_NAME,
      policy: "none",
      registered: false,
      connected: null,
      spawned: null,
      reason: "settings-unavailable",
    });
    state.binding = null;
    return;
  }

  const ledgerFile = process.env["T02_LEDGER_FILE"] ?? "";
  const runDir = process.env["T02_RUN_DIR"] ?? tmpdir();
  const ledgerArg = ledgerFile ? ["--t02-ledger-file", ledgerFile] : [];
  // Trusted launcher-owned shared journal for this one fixture's own
  // observations. No sidecar/binding flags: the receiver stays read-only.
  const sharedJournalPath = process.env["T02_SHARED_JOURNAL"] ?? "";
  const journalArg = sharedJournalPath ? ["--t02-event-journal", sharedJournalPath] : [];

  if (state.mode !== "tui") {
    // Unsupported modes get a generic read-only fixture: no sidecar, so the
    // receiver can never approve creation. Never a write-enabled connection.
    // T02_HIDE_CREATE (explicit hidden-tool scenario) withdraws creation.
    const toolExposure =
      process.env["T02_HIDE_CREATE"] === "1" ? { create_routine: "hidden" as const } : undefined;
    try {
      pi.registerMcpServer(SERVER_NAME, {
        command: process.execPath,
        args: [fixturePath(), ...ledgerArg, ...journalArg],
        exposure,
        // Narrow budget enforcement: per-request timeout for this one
        // readonly fixture (seconds). No sidecar/binding flags.
        timeout: 10,
        ...(toolExposure ? { toolExposure } : {}),
      });
      state.policy = "readonly";
      state.registered = true;
      trace("registration", {
        server: SERVER_NAME,
        policy: "readonly",
        registered: true,
        connected: null,
        spawned: null,
        reason: `mode:${state.mode}`,
        exposure,
      });
      // Declaration of the successful API return with pending connection
      // state. This is not connected proof: the worker confirms public
      // registration:readonly only after actual native discovery/startup.
      trace("registration_declared", {
        server: SERVER_NAME,
        policy: "readonly",
        registered: true,
        connected: false,
        spawned: false,
        reason: "register-return-connection-pending",
        exposure,
      });
    } catch (err) {
      trace("registration", {
        server: SERVER_NAME,
        policy: "none",
        registered: false,
        connected: null,
        spawned: null,
        reason: `register-throw:${err instanceof Error ? err.message : String(err)}`,
      });
    }
    return;
  }

  // TUI mode: guarded registration with the sidecar listener first.
  try {
    mkdirSync(runDir, { recursive: true });
  } catch {
    trace("registration", {
      server: SERVER_NAME,
      policy: "none",
      registered: false,
      connected: null,
      spawned: null,
      reason: "rundir-unavailable",
    });
    state.binding = null;
    return;
  }
  const sockPath = join(runDir, `t02-sidecar-${randomBytes(8).toString("hex")}.sock`);
  let listener: Server;
  try {
    listener = await openSidecarListener(sockPath);
  } catch (err) {
    trace("registration", {
      policy: "none",
      reason: `listener:${err instanceof Error ? err.message : String(err)}`,
    });
    state.binding = null;
    return;
  }
  state.sockPath = sockPath;
  state.listener = listener;
  try {
    pi.registerMcpServer(SERVER_NAME, {
      command: process.execPath,
      args: [
        fixturePath(),
        "--t02-sidecar",
        sockPath,
        "--t02-binding-file",
        bindingPath,
        ...ledgerArg,
      ],
      exposure,
    });
    state.policy = "guarded";
    state.registered = true;
    trace("registration", {
      server: SERVER_NAME,
      policy: "guarded",
      registered: true,
      connected: null,
      spawned: null,
      reason: "preflight-ok",
      exposure,
    });
  } catch (err) {
    state.policy = "none";
    state.binding = null;
    try {
      listener.close();
    } catch {
      // ignore
    }
    state.listener = null;
    trace("registration", {
      server: SERVER_NAME,
      policy: "none",
      registered: false,
      connected: null,
      spawned: null,
      reason: `register-throw:${err instanceof Error ? err.message : String(err)}`,
    });
  }
}

async function onStop(event: SessionShutdownEvent): Promise<void> {
  // Teardown invalidates approval/listener before withdrawal.
  trace("session", { transition: "shutdown", reason: event.reason });
  approvals.clear();
  state.binding = null;
  state.policy = "none";
  state.registered = false;
  const listener = state.listener;
  const sockPath = state.sockPath;
  state.listener = null;
  state.sockPath = null;
  if (listener) {
    await new Promise<void>((resolve) => {
      try {
        listener.close(() => resolve());
      } catch {
        resolve();
      }
    });
  }
  if (sockPath) {
    try {
      const { unlinkSync } = await import("node:fs");
      unlinkSync(sockPath);
    } catch {
      // Disposable-root cleanup owns leftovers; absence is driver-observed.
    }
  }
  // Release the owned shared-channel descriptor after the last companion
  // observation. Process exit reclaims it on paths that never shut down.
  if (sharedJournal) {
    const owned = sharedJournal;
    sharedJournal = null;
    try {
      owned.close();
    } catch {
      // ignore; descriptor release is best-effort here
    }
  }
}

// ---------------------------------------------------------------------------
// Nested-path orchestrator (synthetic diagnostic tool for nested-approve).
// ---------------------------------------------------------------------------

const orchestrateParams = Type.Object(
  {
    operationId: Type.String(),
    name: Type.String(),
    exercises: Type.Array(Type.Unknown()),
  },
  { additionalProperties: false },
);

export default function t02Companion(pi: ExtensionAPI): void {
  // Shared channel first (when launcher-owned): every observation from
  // gate_installed onward uses the protected single-append writer while it
  // is active. Absent/unopenable preserves the legacy trace file.
  const sharedPath = process.env["T02_SHARED_JOURNAL"];
  if (sharedPath) {
    try {
      sharedJournal = openSharedJournal(sharedPath, "companion");
    } catch {
      sharedJournal = null;
    }
  }
  // Gate first: synchronous installation before any registration/connection.
  pi.on("tool_call", (event, ctx) => gate(event, ctx));
  // Actual gate installation observation, before any start/registration.
  trace("gate_installed", { handler: "tool_call" });
  pi.on("session_start", (event, ctx) => onStart(pi, event, ctx));
  pi.on("session_shutdown", (event) => onStop(event));

  pi.registerTool({
    name: ORCHESTRATOR_TOOL,
    label: "T02 synthetic orchestrator",
    description:
      "SYNTHETIC T02 diagnostic: forwards its arguments to the synthetic create tool as a nested call. Counters only.",
    parameters: orchestrateParams,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    async execute(_toolCallId, params, _signal, _onUpdate, toolCtx) {
      const args = params as Record<string, unknown>;
      const invalid = checkCreateArgs({
        operationId: args["operationId"],
        name: args["name"],
        exercises: args["exercises"],
      });
      if (invalid) {
        return {
          content: [
            { type: "text", text: `SYNTHETIC T02 orchestrator refused invalid input: ${invalid}` },
          ],
          details: undefined,
          isError: true,
        };
      }
      // Nested-readonly route only: an actual read first, then the creation
      // attempt, both through public nested execution with the owned signal.
      // Native IDs/parents come from the runtime; actual outcomes propagate
      // without type-erasing casts. Other scenarios keep the guarded path.
      if (state.scenario === "nested-readonly") {
        const entries = args["exercises"];
        const first = Array.isArray(entries) ? entries[0] : undefined;
        const firstId =
          isPlainObject(first) && typeof first["exerciseId"] === "string"
            ? first["exerciseId"]
            : null;
        if (firstId === null) {
          return {
            content: [
              {
                type: "text",
                text: "SYNTHETIC T02 orchestrator refused invalid input: entry.exerciseId",
              },
            ],
            details: undefined,
            isError: true,
          };
        }
        const readOutcome = await toolCtx.executeTool(
          "mcp__synth_gt__get_exercise",
          { exerciseId: firstId },
          _signal ? { signal: _signal } : undefined,
        );
        if (readOutcome.isError) {
          return {
            content: readOutcome.result.content,
            details: undefined,
            isError: true,
          };
        }
        const createOutcome = await toolCtx.executeTool(
          CREATE_TOOL,
          {
            operationId: args["operationId"],
            name: args["name"],
            exercises: args["exercises"],
          },
          _signal ? { signal: _signal } : undefined,
        );
        return {
          content: createOutcome.result.content,
          details: undefined,
          isError: createOutcome.isError,
        };
      }
      const outcome = (await (
        toolCtx as unknown as {
          executeTool: (
            name: string,
            callArgs: unknown,
          ) => Promise<{ isError: boolean; result: { content?: unknown; details?: unknown } }>;
        }
      ).executeTool(CREATE_TOOL, {
        operationId: args["operationId"],
        name: args["name"],
        exercises: args["exercises"],
      })) as {
        isError: boolean;
        result: { content?: Array<{ type: string; text?: string }>; details?: unknown };
      };
      const content =
        Array.isArray(outcome?.result?.content) && outcome.result.content.length > 0
          ? (outcome.result.content as Array<{ type: "text"; text: string }>)
          : [{ type: "text" as const, text: "SYNTHETIC T02 orchestrator: empty nested result" }];
      return { content, details: undefined, isError: outcome?.isError === true };
    },
  });
}
