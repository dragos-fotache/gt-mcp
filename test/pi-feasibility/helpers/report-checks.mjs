// T02 QA report/trace/effects assertions (t02-approved-experiment-spec §§4-8).
//
// All checks derive from the approved spec's public report contract. All trace
// payload fields are top-level beside seq/source/type/layer (spec §8). Trace
// records come from the actual selected-runtime observer; nothing here invokes
// fabricated events.
//
// Absent/preflight-refused fixtures (effects.observation not-spawned) require
// spawned:false, no connected guarded registration, and an actual
// unavailable-call outcome — never an invented fixture-origin zero ledger.
// Connected fixtures require their own final ledger observation.

import { expect } from "vitest";
import { FIXTURE_TOOLS, REFUSAL, seedDigest, SEED } from "../../fixtures/t02/synthetic-seed.mjs";

const READ_TOOLS = FIXTURE_TOOLS.filter((t) => t !== "create_routine");

// Read-tool names in exactly the configured synth_gt namespace: the
// unqualified fixture name (as tool_list advertises) or the qualified
// pipeline name mcp__synth_gt__<read>. A foreign server's __<read> suffix
// never qualifies.
const READ_TOOL_NAMES = new Set(READ_TOOLS.flatMap((t) => [t, `mcp__synth_gt__${t}`]));

// Successful results joined to actual read-tool calls. Strictness rules
// (spec §§7/8): a result counts only with explicit isError:false (missing or
// non-boolean isError never qualifies), a nonempty native toolCallId, and a
// call carrying the same ID. An outer codemode/orchestrator success — or any
// foreign-server result — never qualifies as read evidence.
export function readSuccesses(report) {
  const callsById = new Map(recordsOfType(report, "tool_call").map((r) => [r.toolCallId, r]));
  return recordsOfType(report, "tool_result").filter((r) => {
    if (r.isError !== false) return false;
    if (typeof r.toolCallId !== "string" || r.toolCallId.length === 0) return false;
    const call = callsById.get(r.toolCallId);
    if (!call) return false;
    return READ_TOOL_NAMES.has(call.name);
  });
}

const TRACE_SOURCES = new Set(["launcher", "pi", "companion", "fixture"]);

// Successful results joined to one named read tool (unqualified fixture
// name or qualified mcp__synth_gt__ name). Used where the spec names the
// exact read (e.g. S2A get_exercise). Requires a nonempty native toolCallId
// on the result and a MATCHING result/call name, so missing IDs or names
// cannot form a synthetic join.
export function expectReadSuccess(report, tool) {
  const names = new Set([tool, `mcp__synth_gt__${tool}`]);
  const found = readSuccesses(report).filter((r) => {
    if (!names.has(r.name)) return false;
    const call = recordsOfType(report, "tool_call").find((c) => c.toolCallId === r.toolCallId);
    return names.has(call?.name);
  });
  expect(found.length, `actual ${tool} success`).toBeGreaterThan(0);
  return found;
}
const LAYERS = new Set(["sdk-pipeline", "tui-interactive", "injected-ui", "logic-control"]);

// Exact selected pins (T01 handoff + approved spec §2). Reports must name
// them exactly (see assertPinnedVersion); any deviation fails loudly.
export const EXPECTED_RUNTIME_PINS = Object.freeze({
  node: "24.21.0",
  npm: "11.19.0",
  pi: "1.1.0",
  sdk: "1.32.1",
});

// Qualified creation tool name: spec §5 namespace mcp__synth_gt__ plus the
// shared create_routine tool, joined per Pi's mcp__<server>__<tool> rule.
export const CREATION_TOOL = "mcp__synth_gt__create_routine";

// Exact version check: the reported string must equal the pin, optionally
// with a single leading "v". Substring matching would accept near-misses
// such as 24.21.01 or 1.32.10, so it is never used here.
export function assertPinnedVersion(actual, pin, what) {
  expect(typeof actual, `${what} is a string`).toBe("string");
  const stripped = actual.startsWith("v") ? actual.slice(1) : actual;
  expect(stripped, `${what} exactly names pin ${pin}`).toBe(pin);
}

export function expectEnvelope(report, { scenario, harness, layer }) {
  expect(report.synthetic).toBe(true);
  expect(report.scenario).toBe(scenario);
  expect(report.harness).toBe(harness);
  expect(report.layer).toBe(layer);
  expect(report.completed).toBe(true);
  expect(report.runtime).toBeTypeOf("object");
  for (const [key, pin] of Object.entries(EXPECTED_RUNTIME_PINS)) {
    assertPinnedVersion(report.runtime[key], pin, `runtime.${key}`);
  }
  expect(Array.isArray(report.trace)).toBe(true);
  expect(report.effects).toBeTypeOf("object");
  expect(["fixture", "none"].includes(report.effects.source)).toBe(true);
  expect(["fixture-final", "not-spawned"].includes(report.effects.observation)).toBe(true);
  expect(report.effects.total).toBeTypeOf("number");
  expect(Array.isArray(report.effects.operations)).toBe(true);
  expect(report.limits).toBeTypeOf("object");
}

export function expectTraceWellFormed(report, { allowedLayers }) {
  const trace = report.trace;
  let prevSeq = -1;
  for (const record of trace) {
    expect(Number.isInteger(record.seq)).toBe(true);
    expect(record.seq).toBeGreaterThan(prevSeq);
    prevSeq = record.seq;
    expect(TRACE_SOURCES.has(record.source)).toBe(true);
    expect(typeof record.type).toBe("string");
    expect(LAYERS.has(record.layer)).toBe(true);
    if (allowedLayers) {
      expect(
        allowedLayers.includes(record.layer),
        `trace seq ${record.seq} layer ${record.layer} not in [${allowedLayers}]`,
      ).toBe(true);
    }
  }
}

export function recordsOfType(report, type) {
  return report.trace.filter((record) => record.type === type);
}

export function expectPresent(report, type, what) {
  const found = recordsOfType(report, type);
  expect(found.length, `expected trace type ${type} (${what})`).toBeGreaterThan(0);
  return found;
}

// Gate must be installed before any registration/connection (spec §6).
export function expectGateBeforeRegistration(report) {
  const trace = report.trace;
  const gateAt = trace.findIndex((r) => r.type === "gate_installed");
  const regAt = trace.findIndex((r) => r.type === "registration");
  expect(gateAt, "gate_installed precedes registration").toBeGreaterThanOrEqual(0);
  if (regAt >= 0) expect(gateAt).toBeLessThan(regAt);
}

// Cleanup proof is booleans + zero counts, never mere record presence (spec §8).
export function expectCleanup(report) {
  const found = recordsOfType(report, "cleanup");
  expect(found.length, "cleanup record present").toBeGreaterThan(0);
  const last = found[found.length - 1];
  expect(last.childrenGone).toBe(true);
  expect(last.listenersClosed).toBe(true);
  expect(last.rootsRemoved).toBe(true);
  expect(last.remainingChildren).toBe(0);
  expect(last.remainingListeners).toBe(0);
}

// The actual creation tool_call records for one operation, joined by call ID.
// Rejects any nested read: only CREATION_TOOL records qualify. When nested
// (orchestrator nesting AND codemode — codemode is nested too), each parent
// ID must join an actual outer tool_call record in the same trace, not dangle.
export function creationCalls(report, { nested } = {}) {
  const calls = recordsOfType(report, "tool_call").filter(
    (r) => r.name === CREATION_TOOL && r.operationId === SEED.operationId,
  );
  expect(calls.length, "actual creation tool_call records").toBeGreaterThan(0);
  const outerIds = new Set(recordsOfType(report, "tool_call").map((r) => r.toolCallId));
  for (const call of calls) {
    expect(call.toolCallId, "toolCallId present").toBeTypeOf("string");
    if (nested) {
      expect(call.parentToolCallId, "nested parent linkage").toBeTypeOf("string");
      expect(
        outerIds.has(call.parentToolCallId),
        `parent ${call.parentToolCallId} joins an actual outer call`,
      ).toBe(true);
    } else {
      expect(call.parentToolCallId, "direct call has null parent").toBeNull();
    }
  }
  return calls;
}

// No write-capable registration may be connected.
export function expectNoGuardedConnected(report, what) {
  const registrations = recordsOfType(report, "registration");
  const guarded = registrations.filter((r) => r.policy === "guarded" && r.connected === true);
  expect(guarded.length, `no connected guarded registration (${what})`).toBe(0);
  return registrations;
}

// Exactly one matching fixture-origin effect for a genuinely approved seed op,
// with approval and receiver-allow ordered BEFORE the effect seq, and no
// intermediate positive ledger preceding approval/receiver allow.
export function expectSingleSeedEffect(report) {
  const digest = seedDigest();
  const approvals = recordsOfType(report, "approval_prompt").filter(
    (r) => r.operationId === SEED.operationId && r.decision === "approve",
  );
  expect(approvals.length, "genuine approval for seed op").toBeGreaterThan(0);
  const firstApprovalSeq = Math.min(...approvals.map((r) => r.seq));
  const allows = recordsOfType(report, "receiver_check").filter(
    (r) =>
      r.operationId === SEED.operationId &&
      r.decision === "allow" &&
      r.receivedDigest === digest &&
      r.approvedDigest === digest &&
      r.tupleMatch === true &&
      r.generationMatch === true,
  );
  expect(
    allows.length,
    "fixture-origin receiver allow with matching digests and binding matches",
  ).toBeGreaterThan(0);
  for (const r of allows) expect(r.source).toBe("fixture");
  const firstAllowSeq = Math.min(...allows.map((r) => r.seq));
  expect(firstApprovalSeq).toBeLessThan(firstAllowSeq);
  const ledgers = recordsOfType(report, "effect_ledger");
  expect(ledgers.length, "effect_ledger records present").toBeGreaterThan(0);
  for (const ledger of ledgers) {
    expect(ledger.source).toBe("fixture");
    if (ledger.final !== true && ledger.counter > 0) {
      expect(ledger.seq, "no intermediate positive before allow").toBeGreaterThan(firstAllowSeq);
    }
  }
  const finals = ledgers.filter((r) => r.final === true);
  expect(finals.length, "exactly one final effect_ledger").toBe(1);
  const final = finals[0];
  expect(final.operationId).toBe(SEED.operationId);
  expect(final.digest).toBe(digest);
  expect(final.counter).toBe(1);
  expect(final.seq).toBeGreaterThan(firstAllowSeq);
  // Report-level effects must agree with the fixture final ledger.
  expect(report.effects.source).toBe("fixture");
  expect(report.effects.observation).toBe("fixture-final");
  expect(report.effects.total).toBe(1);
  expect(
    report.effects.operations.some(
      (op) => op.operationId === SEED.operationId && op.digest === digest,
    ),
    "effects.operations agrees with final ledger",
  ).toBe(true);
  return { digest, final };
}

// Connected zero-final outcome for companion-managed profiles (spec §8):
// the fixture IS spawned, so absence is not an option — the proof must be
// the connected fixture's own final zero-counter ledger. The not-spawned
// branch (absent unknown-tool) must never substitute here.
export function expectConnectedZeroFinal(report) {
  expect(report.effects.observation, "connected fixture-final required").toBe("fixture-final");
  expect(report.effects.source).toBe("fixture");
  expect(report.effects.total).toBe(0);
  expect(report.effects.operations).toEqual([]);
  const ledgers = recordsOfType(report, "effect_ledger");
  expect(ledgers.length, "effect_ledger records present (absence is not proof)").toBeGreaterThan(0);
  const finals = ledgers.filter((r) => r.final === true);
  expect(finals.length, "exactly one final effect_ledger").toBe(1);
  expect(finals[0].source).toBe("fixture");
  expect(finals[0].counter).toBe(0);
  return "fixture-final";
}

// No-effect outcome, branched on fixture presence (spec §8):
// - not-spawned: an explicit spawned:false absence observation, no connected
//   guarded registration, and an isError:true result joined to the exact
//   attempted creation call — never a bare lack of success, never an empty
//   registration list, never an invented ledger. Success/failure are scoped
//   to the matching call IDs so unrelated read/outer results neither satisfy
//   nor invalidate the outcome.
// - fixture-final: the connected fixture's own final zero-counter ledger.
export function expectNoEffectOutcome(report) {
  expect(report.effects.total).toBe(0);
  expect(report.effects.operations).toEqual([]);
  const calls = recordsOfType(report, "tool_call").filter((r) => r.name === CREATION_TOOL);
  expect(calls.length, "actual unavailable creation call attempted").toBeGreaterThan(0);
  const callIds = new Set(calls.map((c) => c.toolCallId));
  const joinedSuccess = recordsOfType(report, "tool_result").filter(
    (r) => r.isError === false && callIds.has(r.toolCallId),
  );
  expect(joinedSuccess.length, "no success joined to the creation calls").toBe(0);
  if (report.effects.observation === "not-spawned") {
    expect(report.effects.source).toBe("none");
    // Explicit absence observation: at least one registration record must
    // state spawned:false. An empty registration list proves nothing.
    const registrations = recordsOfType(report, "registration");
    const absent = registrations.filter((r) => r.spawned === false);
    expect(absent.length, "explicit spawned:false absence observation").toBeGreaterThan(0);
    for (const reg of registrations) {
      expect(
        reg.policy === "guarded" && reg.connected === true,
        "no connected guarded registration",
      ).toBe(false);
    }
    // An actual unavailable-call outcome: an isError:true result joined to
    // the exact attempted creation call. No result at all is not an outcome.
    const joinedErrors = recordsOfType(report, "tool_result").filter(
      (r) => r.isError === true && callIds.has(r.toolCallId),
    );
    expect(
      joinedErrors.length,
      "isError result joined to the attempted creation call",
    ).toBeGreaterThan(0);
    // And no fixture-origin ledger may be invented for a missing process.
    const ledgers = recordsOfType(report, "effect_ledger");
    expect(ledgers.length, "no invented ledger for absent fixture").toBe(0);
    return "not-spawned";
  }
  expect(report.effects.observation).toBe("fixture-final");
  expect(report.effects.source).toBe("fixture");
  const ledgers = recordsOfType(report, "effect_ledger");
  expect(ledgers.length, "effect_ledger records present (absence is not proof)").toBeGreaterThan(0);
  const finals = ledgers.filter((r) => r.final === true);
  expect(finals.length, "exactly one final effect_ledger").toBe(1);
  expect(finals[0].source).toBe("fixture");
  expect(finals[0].counter).toBe(0);
  return "fixture-final";
}

// Every actual creation invocation on the covered route gated with matching
// digests, joined to its tool_call by toolCallId (never to a nested read).
// Uniqueness is enforced per call: exactly one gate per actual creation call,
// so counts alone with duplicated IDs cannot fool the check.
export function expectGateForRoute(report, { route, nested }) {
  const calls = creationCalls(report, { nested });
  const invocations = recordsOfType(report, "gate_invocation").filter(
    (r) => r.operationId === SEED.operationId,
  );
  for (const call of calls) {
    const mine = invocations.filter((r) => r.toolCallId === call.toolCallId);
    expect(mine.length, `exactly one gate for creation call ${call.toolCallId} (${route})`).toBe(1);
    expect(mine[0].decision).toBe("approve");
    expect(mine[0].approvedDigest).toBe(seedDigest());
    if (nested) {
      expect(mine[0].parentToolCallId).toBe(call.parentToolCallId);
    }
  }
}

// Approval prompts joined per creation call: every actual creation call must
// carry its own prompt record with the expected decision/reason.
export function expectPromptsForCalls(report, calls, { decision, reason, stimulus }) {
  const prompts = recordsOfType(report, "approval_prompt").filter(
    (r) => r.operationId === SEED.operationId,
  );
  for (const call of calls) {
    const mine = prompts.filter((r) => r.toolCallId === call.toolCallId);
    expect(mine.length, `prompt joined to creation call ${call.toolCallId}`).toBeGreaterThan(0);
    for (const prompt of mine) {
      if (stimulus !== undefined) expect(prompt.stimulus).toBe(stimulus);
      expect(prompt.decision).toBe(decision);
      if (reason !== undefined) expect(prompt.reason).toBe(reason);
    }
  }
  return prompts;
}

export function expectInnerDenial(report) {
  const calls = recordsOfType(report, "tool_call").filter(
    (r) => r.name === CREATION_TOOL && r.operationId === SEED.operationId,
  );
  expect(calls.length, "actual creation tool_call present").toBeGreaterThan(0);
  const invocations = recordsOfType(report, "gate_invocation").filter(
    (r) => r.operationId === SEED.operationId,
  );
  for (const call of calls) {
    const mine = invocations.filter((r) => r.toolCallId === call.toolCallId);
    expect(mine.length, `denial joined to creation call ${call.toolCallId}`).toBeGreaterThan(0);
    for (const invocation of mine) {
      expect(invocation.decision).toBe("deny");
    }
  }
}

// Denial on the tool result path. code is the actual structured error code;
// unstructured host blocks may carry code:null with a safe reason — allowed
// only when allowNullHostCode is set, and never fabricated into a fixture
// refusal. At least one error result must be present.
export function expectDenialResult(report, { codes, allowNullHostCode = false }) {
  const results = recordsOfType(report, "tool_result").filter((r) => r.isError === true);
  expect(results.length, "error tool_result present").toBeGreaterThan(0);
  for (const result of results) {
    if (result.code === null) {
      expect(allowNullHostCode, "null host code only where allowed").toBe(true);
      expect(result.reason ?? result.category, "safe reason/category for null code").toBeTypeOf(
        "string",
      );
      continue;
    }
    if (codes) {
      expect(codes.includes(result.code), `denial code ${result.code} in [${codes}]`).toBe(true);
    }
  }
}

// R1 S2B direct-readonly/sdk companion gate (spec §§11-12, coordinator R1 relay).
// Strict companion-managed refusal: exactly one companion-origin gate_installed
// before declarations/registration/startup/discovery/creation, print/no-UI
// preflight, one same-record connected readonly registration, launcher
// first-request inventory paired with fixture-origin discovery plus named
// get_exercise success, exactly one creation call/gate-denial/null-code error
// join carrying the public operationId/digest with null direct parents and
// call.seq < gate.seq < result.seq, no receiver_check/sidecar_verdict/
// approval_prompt, no guarded capability, no hidden positive effect, one
// fixture-origin final zero/empty-operation ledger, shutdown before a last
// cleanup. A generic S2A receiver refusal (structured write_approval_required,
// no gate) or an absent unknown-tool substitute must throw here.
export function expectDirectReadonlyS2B(report) {
  expectEnvelope(report, { scenario: "direct-readonly", harness: "sdk", layer: "sdk-pipeline" });
  expectTraceWellFormed(report, { allowedLayers: ["sdk-pipeline", "logic-control"] });

  // Print/no-UI observation from the actual selected-runtime context.
  const preflights = recordsOfType(report, "preflight");
  expect(preflights.length, "preflight record present").toBeGreaterThan(0);
  for (const preflight of preflights) {
    expect(preflight.mode, "print context").toBe("print");
    expect(preflight.hasUI, "explicit hasUI false").toBe(false);
    expect(preflight.uiInjected, "explicit uiInjected false").toBe(false);
  }

  // Exactly one companion-origin synchronous gate, preceding declarations,
  // registration, fixture startup/discovery and creation calls. A
  // registration_declared record is pending API return, never connected proof.
  const gates = recordsOfType(report, "gate_installed");
  expect(gates.length, "exactly one companion gate_installed").toBe(1);
  expect(gates[0].source, "companion-origin gate").toBe("companion");
  expectGateBeforeRegistration(report);
  const registrations = recordsOfType(report, "registration");
  expect(registrations.length, "registration observations present").toBeGreaterThan(0);
  const declared = recordsOfType(report, "registration_declared");
  expect(
    declared.filter((r) => r.connected === true).length,
    "registration_declared is pending, never connected proof",
  ).toBe(0);
  const startupRecords = [
    ...registrations,
    ...declared,
    ...recordsOfType(report, "tool_list"),
    ...recordsOfType(report, "first-request-inventory"),
    ...recordsOfType(report, "effect_ledger"),
    ...recordsOfType(report, "session"),
  ];
  for (const record of startupRecords) {
    expect(gates[0].seq, `gate precedes ${record.type}`).toBeLessThan(record.seq);
  }

  // Connected readonly capability in one same record: a connected readonly
  // registration must itself carry registered/connected/spawned, not split
  // the proof across records. No guarded capability anywhere.
  expectNoGuardedConnected(report, "R1 S2B");
  expect(
    registrations.filter((r) => r.policy === "guarded").length,
    "no guarded capability invented",
  ).toBe(0);
  expect(
    registrations.filter(
      (r) =>
        r.policy === "readonly" &&
        r.registered === true &&
        r.connected === true &&
        r.spawned === true,
    ).length,
    "one same-record connected readonly registration (not split across records)",
  ).toBeGreaterThan(0);

  // True connected inventory from the fixture: all seven unqualified names
  // from actual MCP discovery, never a driver constant list.
  const listed = recordsOfType(report, "tool_list");
  expect(listed.length, "tool_list from actual discovery").toBeGreaterThan(0);
  for (const entry of listed) {
    expect(entry.source).toBe("fixture");
    expect(entry.tools.length, "exactly the seven fixture names").toBe(7);
    for (const name of FIXTURE_TOOLS) {
      expect(entry.tools.includes(name), `advertised ${name}`).toBe(true);
    }
  }

  // Selected-runtime availability at the first native provider request pairs
  // fixture-origin discovery: launcher-observed seven unqualified names, not
  // a launcher-intended constant list alone.
  const inventories = recordsOfType(report, "first-request-inventory");
  expect(inventories.length, "first-request inventory present").toBeGreaterThan(0);
  for (const entry of inventories) {
    expect(entry.source, "launcher-observed inventory").toBe("launcher");
    expect(entry.tools.length, "exactly the seven fixture names").toBe(7);
    for (const name of FIXTURE_TOOLS) {
      expect(entry.tools.includes(name), `inventoried ${name}`).toBe(true);
    }
  }

  // Actual runtime availability paired with inventory: the named read succeeds
  // under its selected-runtime pipeline name after fixture discovery. The
  // launcher first-request inventory (seven unqualified names at the first
  // native provider request) pairs fixture-origin discovery; a
  // launcher-intended constant list alone is not inventory proof.
  const readSuccess = expectReadSuccess(report, "get_exercise");
  const readCallsById = new Map(recordsOfType(report, "tool_call").map((r) => [r.toolCallId, r]));
  const earliestDiscovery = Math.min(...listed.map((r) => r.seq), ...inventories.map((r) => r.seq));
  for (const success of readSuccess) {
    const readCall = readCallsById.get(success.toolCallId);
    expect(readCall?.name, "selected-runtime read name").toBe("mcp__synth_gt__get_exercise");
    expect(earliestDiscovery, "discovery precedes the first read request").toBeLessThan(
      readCall.seq,
    );
  }

  // Exactly one actual direct creation call carrying the public operationId.
  const calls = recordsOfType(report, "tool_call").filter((r) => r.name === CREATION_TOOL);
  expect(calls.length, "exactly one actual creation call (rejects unknown-tool substitute)").toBe(
    1,
  );
  const call = calls[0];
  expect(call.operationId, "public operationId on creation call").toBe(SEED.operationId);
  expect(call.parentToolCallId, "direct call has null parent").toBeNull();
  expect(call.toolCallId, "toolCallId present").toBeTypeOf("string");
  expect(call.toolCallId.length, "nonempty native toolCallId").toBeGreaterThan(0);
  for (const entry of [...listed, ...inventories]) {
    expect(entry.seq, "discovery/inventory precedes the creation call").toBeLessThan(call.seq);
  }

  // Exactly one companion gate invocation overall, joined to that call: the
  // §12 print-mode denial carries the public attempted digest and a null
  // approved digest — a denied readonly call is not prior approval evidence.
  // A generic receiver refusal has no gate.
  const digest = seedDigest();
  const invocations = recordsOfType(report, "gate_invocation");
  expect(invocations.length, "exactly one gate invocation overall").toBe(1);
  const gate = invocations[0];
  expect(gate.operationId, "gate joins the public operationId").toBe(SEED.operationId);
  expect(gate.toolCallId, "gate joined to the creation call").toBe(call.toolCallId);
  expect(gate.toolCallId.length, "nonempty native toolCallId on gate").toBeGreaterThan(0);
  expect(gate.parentToolCallId, "gate direct parent null").toBeNull();
  expect(gate.source, "companion gate invocation").toBe("companion");
  expect(gate.decision, "gate denies").toBe("deny");
  expect(gate.mode, "gate mode:print").toBe("print");
  expect(gate.hasUI, "gate hasUI:false").toBe(false);
  expect(gate.reason, "gate reason:mode-not-tui:print").toBe("mode-not-tui:print");
  expect(gate.attemptedDigest, "gate attemptedDigest is the public digest").toBe(digest);
  expect(gate.approvedDigest, "denied readonly call carries no prior approval").toBeNull();

  // Actual native error joined to the same call with null host code,
  // corroborated by that gate. A structured write_approval_required here is
  // the generic S2A receiver shape and must not pass this companion case.
  const joined = recordsOfType(report, "tool_result").filter(
    (r) => r.toolCallId === call.toolCallId,
  );
  expect(joined.length, "exactly one result for that creation call").toBe(1);
  const result = joined[0];
  expect(result.source, "native pi result").toBe("pi");
  expect(result.name, "result carries the creation name").toBe(CREATION_TOOL);
  expect(result.parentToolCallId, "result direct parent null").toBeNull();
  expect(result.isError, "error result").toBe(true);
  expect(result.code, "null host code on genuine gate block").toBeNull();
  expect(result.reason ?? result.category, "safe reason/category for null code").toBeTypeOf(
    "string",
  );
  expect(
    joined.filter((r) => r.isError === false).length,
    "no success for that creation call",
  ).toBe(0);
  expect(
    joined.filter((r) => r.code === REFUSAL.needsApproval).length,
    "generic S2A receiver refusal must not pass this companion case",
  ).toBe(0);
  expect(call.seq, "causal order: call before gate").toBeLessThan(gate.seq);
  expect(gate.seq, "causal order: gate before result").toBeLessThan(result.seq);

  // Nothing invented for the blocked creation: no receiver check, no sidecar
  // verdict, no approval prompt.
  expect(recordsOfType(report, "receiver_check").length, "no fabricated receiver_check").toBe(0);
  expect(
    recordsOfType(report, "sidecar_verdict").length,
    "no sidecar verdict on this profile",
  ).toBe(0);
  expect(
    recordsOfType(report, "approval_prompt").length,
    "no approval prompt on print/no-UI path",
  ).toBe(0);

  // No hidden effect: no intermediate positive ledger even when the final is
  // zero; exactly one fixture-origin final zero/empty-operation ledger.
  // Genuine runtime shutdown precedes the final parent cleanup; cleanup is
  // the last trace record.
  const ledgers = recordsOfType(report, "effect_ledger");
  for (const ledger of ledgers) {
    expect(ledger.counter, "no positive effect hidden before the final").toBe(0);
  }
  expectConnectedZeroFinal(report);
  const finals = ledgers.filter((r) => r.final === true);
  expect(finals[0].operationId, "final carries no admitted operation").toBeNull();
  expect(finals[0].digest, "final carries no admitted digest").toBeNull();
  const shutdowns = recordsOfType(report, "session").filter((r) => r.transition === "shutdown");
  expect(shutdowns.length, "genuine runtime shutdown observed").toBeGreaterThan(0);
  const cleanups = recordsOfType(report, "cleanup");
  expectCleanup(report);
  const lastCleanup = cleanups[cleanups.length - 1];
  for (const shutdown of shutdowns) {
    expect(shutdown.seq, "shutdown precedes final cleanup").toBeLessThan(lastCleanup.seq);
  }
  const maxSeq = Math.max(...report.trace.map((r) => r.seq));
  expect(lastCleanup.seq, "cleanup is the last trace record").toBe(maxSeq);
  return { call, gate, result, digest };
}

// ---- R2 indirect SDK refusal routes (spec §13) ----
//
// deferred/codemode/nested-readonly are actual print/no-UI sdk-pipeline
// routes, not approval evidence. They share the §12 closure discipline
// (gate before everything, same-record readonly registration, no invented
// records, explicit-null final zero, shutdown before last cleanup) plus
// per-route native call/parent joins. The accepted R1 predicate above is
// deliberately not refactored: S1/S2A/R1 regressions stay byte-identical.

const READ_QUALIFIED = "mcp__synth_gt__get_exercise";
const FIXTURE_QUALIFIED = FIXTURE_TOOLS.map((t) => `mcp__synth_gt__${t}`);

// Exact R2 surface sets per the §13 table (order immaterial, duplicates invalid).
const R2_SURFACE_TABLE = Object.freeze({
  "deferred-readonly": Object.freeze({
    firstActive: Object.freeze(["tool_search"]),
    connectedActive: Object.freeze(["tool_search", ...FIXTURE_QUALIFIED]),
    connectedCallable: Object.freeze([...FIXTURE_QUALIFIED]),
  }),
  "codemode-readonly": Object.freeze({
    firstActive: Object.freeze(["codemode"]),
    connectedActive: Object.freeze(["codemode"]),
    connectedCallable: Object.freeze([...FIXTURE_QUALIFIED]),
  }),
  "nested-readonly": Object.freeze({
    firstActive: Object.freeze(["t02_orchestrate", ...FIXTURE_QUALIFIED]),
    connectedActive: Object.freeze(["t02_orchestrate", ...FIXTURE_QUALIFIED]),
    connectedCallable: Object.freeze(["t02_orchestrate", ...FIXTURE_QUALIFIED]),
  }),
});

function expectNameSet(actual, expected, what) {
  expect(Array.isArray(actual), `${what} is an array`).toBe(true);
  expect(new Set(actual).size, `${what} has no duplicates`).toBe(actual.length);
  expect([...actual].sort(), `${what} exact members`).toEqual([...expected].sort());
}

function expectNameSubset(actual, allowed, what) {
  expect(Array.isArray(actual), `${what} is an array`).toBe(true);
  expect(new Set(actual).size, `${what} has no duplicates`).toBe(actual.length);
  const allowedSet = new Set(allowed);
  for (const name of actual) {
    expect(allowedSet.has(name), `${what} allows ${name}`).toBe(true);
  }
}

// Selected-runtime tool surfaces (source:launcher) for one R2 route: exactly
// one snapshot per phase, hiddenTools empty in both, exact tabled sets, no
// unrelated names. The connected snapshot and the same-record registration
// must follow fixture discovery and precede the creation call.
function expectR2SurfacesAndRegistration(report, { scenario, createSeq }) {
  const table = R2_SURFACE_TABLE[scenario];
  const firstDiscovery = Math.min(...recordsOfType(report, "tool_list").map((r) => r.seq));
  const surfaces = recordsOfType(report, "tool_surface");
  const first = surfaces.filter((s) => s.phase === "first-request");
  const connected = surfaces.filter((s) => s.phase === "connected");
  expect(first.length, "exactly one first-request surface").toBe(1);
  expect(connected.length, "exactly one connected surface").toBe(1);
  expect(first[0].source, "launcher-observed surface").toBe("launcher");
  expect(connected[0].source, "launcher-observed surface").toBe("launcher");
  expectNameSet(first[0].activeTools, table.firstActive, "first-request activeTools");
  if (scenario === "nested-readonly") {
    expectNameSet(
      first[0].callableTools,
      table.firstActive,
      "first-request nested callableTools is its complete active set",
    );
  } else {
    expectNameSubset(
      first[0].callableTools,
      FIXTURE_QUALIFIED,
      "first-request callableTools holds only fixture names",
    );
  }
  expect(first[0].hiddenTools, "first-request hiddenTools empty").toEqual([]);
  expect(Array.isArray(first[0].fixtureTools), "first-request fixtureTools explicit").toBe(true);
  expectNameSubset(first[0].fixtureTools, FIXTURE_TOOLS, "first-request fixtureTools");
  expectNameSet(connected[0].activeTools, table.connectedActive, "connected activeTools");
  expectNameSet(connected[0].callableTools, table.connectedCallable, "connected callableTools");
  expect(connected[0].hiddenTools, "connected hiddenTools empty").toEqual([]);
  expectNameSet(connected[0].fixtureTools, FIXTURE_TOOLS, "connected fixtureTools");
  expect(firstDiscovery, "connected surface follows discovery").toBeLessThan(connected[0].seq);
  expect(connected[0].seq, "connected surface precedes creation").toBeLessThan(createSeq);
  const regs = recordsOfType(report, "registration").filter(
    (r) =>
      r.policy === "readonly" &&
      r.registered === true &&
      r.connected === true &&
      r.spawned === true,
  );
  expect(
    regs.filter((r) => firstDiscovery < r.seq && r.seq < createSeq).length,
    "same-record registration follows discovery and precedes creation",
  ).toBeGreaterThan(0);
}

// Shared R2 closure: envelope, print/no-UI preflight, companion gate before
// declarations/registration/startup/discovery/creation, one same-record
// connected readonly registration, seven-tool fixture discovery plus launcher
// surfaces, no invented receiver/approval/sidecar/guarded/effect records,
// explicit-null final zero, shutdown before a last cleanup. Route
// call/gate/result joins are asserted per route, not here.
export function expectSdkReadonlyBase(report, { scenario }) {
  expectEnvelope(report, { scenario, harness: "sdk", layer: "sdk-pipeline" });
  expectTraceWellFormed(report, { allowedLayers: ["sdk-pipeline", "logic-control"] });

  const preflights = recordsOfType(report, "preflight");
  expect(preflights.length, "preflight record present").toBeGreaterThan(0);
  for (const preflight of preflights) {
    expect(preflight.mode, "print context").toBe("print");
    expect(preflight.hasUI, "explicit hasUI false").toBe(false);
    expect(preflight.uiInjected, "explicit uiInjected false").toBe(false);
  }

  const gates = recordsOfType(report, "gate_installed");
  expect(gates.length, "exactly one companion gate_installed").toBe(1);
  expect(gates[0].source, "companion-origin gate").toBe("companion");
  expectGateBeforeRegistration(report);
  const declared = recordsOfType(report, "registration_declared");
  expect(
    declared.filter((r) => r.connected === true).length,
    "registration_declared is pending, never connected proof",
  ).toBe(0);
  const startupRecords = [
    ...recordsOfType(report, "registration"),
    ...declared,
    ...recordsOfType(report, "tool_list"),
    ...recordsOfType(report, "first-request-inventory"),
    ...recordsOfType(report, "tool_surface"),
    ...recordsOfType(report, "search_loaded"),
    ...recordsOfType(report, "effect_ledger"),
    ...recordsOfType(report, "session"),
  ];
  for (const record of startupRecords) {
    expect(gates[0].seq, `gate precedes ${record.type}`).toBeLessThan(record.seq);
  }
  for (const record of [
    ...recordsOfType(report, "tool_call"),
    ...recordsOfType(report, "tool_result"),
  ]) {
    expect(record.source, "native route record source:pi").toBe("pi");
  }

  const registrations = recordsOfType(report, "registration");
  expect(registrations.length, "registration observations present").toBeGreaterThan(0);
  expectNoGuardedConnected(report, `R2 ${scenario}`);
  expect(
    registrations.filter((r) => r.policy === "guarded").length,
    "no guarded capability invented",
  ).toBe(0);
  expect(
    registrations.filter(
      (r) =>
        r.policy === "readonly" &&
        r.registered === true &&
        r.connected === true &&
        r.spawned === true,
    ).length,
    "one same-record connected readonly registration (not split across records)",
  ).toBeGreaterThan(0);

  const listed = recordsOfType(report, "tool_list");
  expect(listed.length, "tool_list from actual discovery").toBeGreaterThan(0);
  for (const entry of listed) {
    expect(entry.source).toBe("fixture");
    expect(entry.tools.length, "exactly the seven fixture names").toBe(7);
    for (const name of FIXTURE_TOOLS) {
      expect(entry.tools.includes(name), `advertised ${name}`).toBe(true);
    }
  }
  // A §12 first-request inventory is not an R2 observation; when present it
  // must still carry the seven launcher-observed names.
  for (const entry of recordsOfType(report, "first-request-inventory")) {
    expect(entry.source, "launcher-observed inventory").toBe("launcher");
    expect(entry.tools.length, "exactly the seven fixture names").toBe(7);
    for (const name of FIXTURE_TOOLS) {
      expect(entry.tools.includes(name), `inventoried ${name}`).toBe(true);
    }
  }
  // Route discovery bounds and exact surface sets are asserted per route
  // (expectR2SurfacesAndRegistration) once the creation call is known.

  expect(recordsOfType(report, "receiver_check").length, "no fabricated receiver_check").toBe(0);
  expect(
    recordsOfType(report, "sidecar_verdict").length,
    "no sidecar verdict on this profile",
  ).toBe(0);
  expect(
    recordsOfType(report, "approval_prompt").length,
    "no approval prompt on print/no-UI path",
  ).toBe(0);

  const ledgers = recordsOfType(report, "effect_ledger");
  for (const ledger of ledgers) {
    expect(ledger.counter, "no positive effect hidden before the final").toBe(0);
  }
  expectConnectedZeroFinal(report);
  const finals = ledgers.filter((r) => r.final === true);
  expect(finals[0].operationId, "final carries no admitted operation").toBeNull();
  expect(finals[0].digest, "final carries no admitted digest").toBeNull();
  const shutdowns = recordsOfType(report, "session").filter((r) => r.transition === "shutdown");
  expect(shutdowns.length, "genuine runtime shutdown observed").toBeGreaterThan(0);
  const cleanups = recordsOfType(report, "cleanup");
  expectCleanup(report);
  const lastCleanup = cleanups[cleanups.length - 1];
  for (const shutdown of shutdowns) {
    expect(shutdown.seq, "shutdown precedes final cleanup").toBeLessThan(lastCleanup.seq);
  }
  const maxSeq = Math.max(...report.trace.map((r) => r.seq));
  expect(lastCleanup.seq, "cleanup is the last trace record").toBe(maxSeq);
  return { listed };
}

// Exactly one companion §12 denial joined to one creation call by native ID,
// with call.seq < gate.seq < result.seq. Parent is null for deferred direct
// calls or the actual outer native ID for codemode/nested inner calls.
function expectIndirectCreationDenied(report, call, { parent }) {
  expect(call.name, "creation call name").toBe(CREATION_TOOL);
  expect(call.operationId, "public operationId on creation call").toBe(SEED.operationId);
  expect(call.toolCallId, "toolCallId present").toBeTypeOf("string");
  expect(call.toolCallId.length, "nonempty native toolCallId").toBeGreaterThan(0);
  if (parent === null) {
    expect(call.parentToolCallId, "deferred call has null parent").toBeNull();
  } else {
    expect(call.parentToolCallId, "inner call carries the actual outer ID").toBe(parent);
  }
  const digest = seedDigest();
  const invocations = recordsOfType(report, "gate_invocation");
  expect(invocations.length, "exactly one gate invocation overall").toBe(1);
  const gate = invocations[0];
  expect(gate.operationId, "gate joins the public operationId").toBe(SEED.operationId);
  expect(gate.toolCallId, "gate joined to the creation call").toBe(call.toolCallId);
  expect(gate.parentToolCallId, "gate joins the same parent").toBe(call.parentToolCallId);
  expect(gate.source, "companion gate invocation").toBe("companion");
  expect(gate.decision, "gate denies").toBe("deny");
  expect(gate.mode, "gate mode:print").toBe("print");
  expect(gate.hasUI, "gate hasUI:false").toBe(false);
  expect(gate.reason, "gate reason:mode-not-tui:print").toBe("mode-not-tui:print");
  expect(gate.attemptedDigest, "gate attemptedDigest is the public digest").toBe(digest);
  expect(gate.approvedDigest, "denied readonly call carries no prior approval").toBeNull();
  const joined = recordsOfType(report, "tool_result").filter(
    (r) => r.toolCallId === call.toolCallId,
  );
  expect(joined.length, "exactly one result for that creation call").toBe(1);
  const result = joined[0];
  expect(result.source, "native pi result").toBe("pi");
  expect(result.name, "result carries the creation name").toBe(CREATION_TOOL);
  expect(result.parentToolCallId, "result joins the same parent").toBe(call.parentToolCallId);
  expect(result.isError, "error result").toBe(true);
  expect(result.code, "null host code on genuine gate block").toBeNull();
  expect(result.reason ?? result.category, "safe reason/category for null code").toBeTypeOf(
    "string",
  );
  expect(
    joined.filter((r) => r.code === REFUSAL.needsApproval).length,
    "generic S2A receiver refusal must not pass this companion case",
  ).toBe(0);
  expect(call.seq, "causal order: call before gate").toBeLessThan(gate.seq);
  expect(gate.seq, "causal order: gate before result").toBeLessThan(result.seq);
  return { gate, result, digest };
}

// One real native outer call (codemode script or t02_orchestrate) with a null
// parent and exactly one joined outer result. Inner read/denial evidence
// never comes from the outer result alone.
function expectOuterCall(report, { name }) {
  const outers = recordsOfType(report, "tool_call").filter((r) => r.name === name);
  expect(outers.length, `exactly one actual outer ${name} call`).toBe(1);
  const outer = outers[0];
  expect(outer.source, "native pi outer call").toBe("pi");
  expect(outer.parentToolCallId, "outer call has null parent").toBeNull();
  expect(outer.toolCallId, "outer native ID present").toBeTypeOf("string");
  expect(outer.toolCallId.length, "nonempty outer native ID").toBeGreaterThan(0);
  const results = recordsOfType(report, "tool_result").filter(
    (r) => r.toolCallId === outer.toolCallId,
  );
  expect(results.length, "exactly one outer result").toBe(1);
  expect(results[0].source, "native pi outer result").toBe("pi");
  expect(results[0].name, "outer result carries the outer name").toBe(name);
  expect(results[0].parentToolCallId, "outer result has null parent").toBeNull();
  expect(outer.seq, "outer result after its start").toBeLessThan(results[0].seq);
  return outer;
}

// R2 deferred: tool_search loads first; the subsequent native read and
// creation carry null parents; the read succeeds with no gate invocation.
export function expectDeferredReadonly(report) {
  expectSdkReadonlyBase(report, { scenario: "deferred-readonly" });
  const searches = recordsOfType(report, "tool_call").filter((r) => r.name === "tool_search");
  expect(searches.length, "exactly one actual native tool_search call").toBe(1);
  const search = searches[0];
  expect(search.parentToolCallId, "search call has null parent").toBeNull();
  expect(search.toolCallId, "search native ID present").toBeTypeOf("string");
  expect(search.toolCallId.length, "nonempty native search ID").toBeGreaterThan(0);
  const searchResult = expectEndpointResult(report, search, {
    name: "tool_search",
    error: false,
  });
  const loaded = recordsOfType(report, "search_loaded").filter((r) => r.source === "pi");
  expect(loaded.length, "search_loaded observation present").toBeGreaterThan(0);
  expect(
    loaded.filter(
      (r) =>
        r.toolCallId === search.toolCallId &&
        Array.isArray(r.loadedTools) &&
        r.loadedTools.length === FIXTURE_QUALIFIED.length &&
        new Set(r.loadedTools).size === r.loadedTools.length &&
        [...r.loadedTools].sort().join(",") === [...FIXTURE_QUALIFIED].sort().join(","),
    ).length,
    "search_loaded joins the actual search ID with exactly the seven qualified names",
  ).toBeGreaterThan(0);
  const reads = recordsOfType(report, "tool_call").filter((r) => r.name === READ_QUALIFIED);
  expect(reads.length, "exactly one actual read").toBe(1);
  const read = reads[0];
  expect(read.parentToolCallId, "deferred read has null parent").toBeNull();
  const readResult = expectEndpointResult(report, read, {
    name: READ_QUALIFIED,
    error: false,
  });
  expect(search.seq, "search loads before the read").toBeLessThan(read.seq);
  expect(searchResult.seq, "successful search result precedes the read").toBeLessThan(read.seq);
  const searchLoadedSeqs = loaded
    .filter((r) => r.toolCallId === search.toolCallId)
    .map((r) => r.seq);
  expect(searchLoadedSeqs.length, "search_loaded for the actual search").toBeGreaterThan(0);
  expect(Math.min(...searchLoadedSeqs), "search_loaded precedes the read").toBeLessThan(read.seq);
  const creates = recordsOfType(report, "tool_call").filter((r) => r.name === CREATION_TOOL);
  expect(creates.length, "exactly one actual creation").toBe(1);
  expect(recordsOfType(report, "tool_call").length, "exactly three native starts").toBe(3);
  expect(recordsOfType(report, "tool_result").length, "exactly three native ends").toBe(3);
  expectUniqueCallIds([search, read, creates[0]]);
  expect(search.seq, "search loads before the creation").toBeLessThan(creates[0].seq);
  const denied = expectIndirectCreationDenied(report, creates[0], { parent: null });
  expect(readResult.seq, "read success precedes the creation attempt").toBeLessThan(creates[0].seq);
  expectR2SurfacesAndRegistration(report, {
    scenario: "deferred-readonly",
    createSeq: creates[0].seq,
  });
  return { search, read, create: creates[0], denied };
}

// R2 codemode/nested: a real outer call runs first; both inner calls carry
// its actual native ID as parent; the inner denial holds regardless of the
// outer result. Generated parent IDs and transcript-only inners fail here.
function checkNestedReadonly(report, { scenario, outerName }) {
  expectSdkReadonlyBase(report, { scenario });
  const outer = expectOuterCall(report, { name: outerName });
  const reads = recordsOfType(report, "tool_call").filter((r) => r.name === READ_QUALIFIED);
  expect(reads.length, "exactly one actual inner read").toBe(1);
  const read = reads[0];
  expect(read.parentToolCallId, "inner read carries the actual outer ID").toBe(outer.toolCallId);
  const readResult = expectEndpointResult(report, read, { name: READ_QUALIFIED, error: false });
  const creates = recordsOfType(report, "tool_call").filter((r) => r.name === CREATION_TOOL);
  expect(creates.length, "exactly one actual inner creation").toBe(1);
  expect(recordsOfType(report, "tool_call").length, "exactly three native starts").toBe(3);
  expect(recordsOfType(report, "tool_result").length, "exactly three native ends").toBe(3);
  expectUniqueCallIds([outer, read, creates[0]]);
  expect(outer.seq, "outer call precedes the inner read").toBeLessThan(read.seq);
  expect(read.seq, "inner read precedes the inner creation").toBeLessThan(creates[0].seq);
  const denied = expectIndirectCreationDenied(report, creates[0], { parent: outer.toolCallId });
  expect(readResult.seq, "read success precedes the creation attempt").toBeLessThan(creates[0].seq);
  const outerResults = recordsOfType(report, "tool_result").filter(
    (r) => r.toolCallId === outer.toolCallId,
  );
  expect(outerResults[0].seq, "outer finishes after the inner read result").toBeGreaterThan(
    readResult.seq,
  );
  expect(outerResults[0].seq, "outer finishes after the inner denial result").toBeGreaterThan(
    denied.result.seq,
  );
  expectR2SurfacesAndRegistration(report, { scenario, createSeq: creates[0].seq });
  return { outer, read, create: creates[0], denied };
}

export function expectCodemodeReadonly(report) {
  return checkNestedReadonly(report, { scenario: "codemode-readonly", outerName: "codemode" });
}

export function expectNestedReadonly(report) {
  return checkNestedReadonly(report, {
    scenario: "nested-readonly",
    outerName: "t02_orchestrate",
  });
}

// One native endpoint start/end pair: exactly one later result with the same
// ID, name and parent. Applies to search/read/outer endpoints, not only creation.
function expectEndpointResult(report, call, { name, error }) {
  expect(call.toolCallId, "endpoint native ID present").toBeTypeOf("string");
  expect(call.toolCallId.length, "nonempty endpoint native ID").toBeGreaterThan(0);
  const joined = recordsOfType(report, "tool_result").filter(
    (r) => r.toolCallId === call.toolCallId,
  );
  expect(joined.length, `exactly one later result for ${name}`).toBe(1);
  const result = joined[0];
  expect(result.source, "native pi result").toBe("pi");
  expect(result.name, "result carries the endpoint name").toBe(name);
  expect(result.parentToolCallId, "result joins the endpoint parent").toBe(call.parentToolCallId);
  if (error !== null) {
    expect(result.isError, "endpoint result error flag").toBe(error);
  }
  expect(call.seq, "result after its start").toBeLessThan(result.seq);
  return result;
}

// Route native IDs are unique across the endpoint set.
function expectUniqueCallIds(calls) {
  const ids = calls.map((c) => c.toolCallId);
  for (const id of ids) {
    expect(id, "native ID present").toBeTypeOf("string");
    expect(id.length, "nonempty native ID").toBeGreaterThan(0);
  }
  expect(new Set(ids).size, "unique native call IDs").toBe(ids.length);
}

// ---- R3 SDK prebind refusal and hidden reachability (spec §14) ----
//
// R3 is exactly ten SDK scenarios; six accepted SDK profiles are regressions
// (§§10-13, asserted in readonly-sdk.test.mjs and left untouched here). The
// first nine refuse the actual target profile BEFORE bind/session_start/
// connection and then observe an actual unavailable creation attempt on a
// separately identified closed refusal-probe session. hidden-tool is the
// single connected exception: a supported print/no-UI bound target with one
// readonly fixture where creation is unreachable (unknown-tool), not gated.
// All payload fields are top-level beside seq/source/type/layer (spec §8).

export const R3_PREBIND_REASONS = Object.freeze({
  "static-shadow": "static-shadow",
  "normalized-collision": "normalized-collision",
  "normalized-collision-reversed": "normalized-collision",
  "replacement-mcp": "replacement-mcp",
  "replacement-codemode": "replacement-codemode",
  "missing-mcp": "missing-mcp",
  "unsupported-inventory": "unsupported-inventory",
  "binding-missing": "binding-missing",
  "binding-ambiguous": "binding-ambiguous",
});

export const R3_SCENARIOS = Object.freeze([...Object.keys(R3_PREBIND_REASONS), "hidden-tool"]);

const R3_STATIC_NAMES = Object.freeze({
  "static-shadow": Object.freeze(["synth-gt"]),
  "normalized-collision": Object.freeze(["synth-gt", "synth_gt"]),
  "normalized-collision-reversed": Object.freeze(["synth_gt", "synth-gt"]),
});

const R3_STATIC_NAMESPACE = "mcp__synth_gt";

const R3_BINDING_EXPECTED = Object.freeze({
  "binding-missing": Object.freeze({
    present: false,
    candidateCount: 0,
    valid: false,
    reason: "binding-missing",
  }),
  "binding-ambiguous": Object.freeze({
    present: true,
    candidateCount: 2,
    valid: false,
    reason: "binding-ambiguous",
  }),
});

const R3_GOOD_BINDING = Object.freeze({
  present: true,
  candidateCount: 1,
  valid: true,
  reason: "binding-ok",
});

const SIX_READ_QUALIFIED = FIXTURE_TOOLS.filter((t) => t !== "create_routine").map(
  (t) => `mcp__synth_gt__${t}`,
);
const SIX_READ_UNQUALIFIED = FIXTURE_TOOLS.filter((t) => t !== "create_routine");
const HIDDEN_CREATION_QUALIFIED = "mcp__synth_gt__create_routine";

function expectR3TargetInventory(report, { scenario }) {
  const found = recordsOfType(report, "resource_inventory").filter(
    (r) => r.runtimeRole === "target",
  );
  expect(found.length, `exactly one target resource_inventory in ${scenario}`).toBe(1);
  const inv = found[0];
  expect(inv.source, "launcher-observed target inventory").toBe("launcher");
  expect(inv.inventoryProvenance, "actual SDK loader provenance").toBe("actual-sdk-loader");
  expect(Array.isArray(inv.inlineProfiles), "inlineProfiles explicit array").toBe(true);
  for (const entry of inv.inlineProfiles) {
    expect(entry.path, "named inline alias only").toBeTypeOf("string");
    expect(entry.path.startsWith("/"), "no raw external path").toBe(false);
    expect(Array.isArray(entry.handlers), "handlers array").toBe(true);
    expect(Array.isArray(entry.tools), "tools array").toBe(true);
    expect(Array.isArray(entry.commands), "commands array").toBe(true);
    expect(entry.replaceable, "replaceable boolean").toBeTypeOf("boolean");
  }
  expect(Array.isArray(inv.loaderErrors), "loaderErrors explicit array").toBe(true);
  expect(Array.isArray(inv.loaderWarnings), "loaderWarnings explicit array").toBe(true);
  expect(inv.loaderErrors.length, "no unexpected loader error").toBe(0);
  expect(inv.loaderWarnings.length, "no unexpected loader warning").toBe(0);
  return inv;
}

function expectR3StaticSettings(report, { scenario }) {
  const found = recordsOfType(report, "static_settings");
  expect(found.length, `exactly one static_settings in ${scenario}`).toBe(1);
  const settings = found[0];
  expect(settings.runtimeRole, "target static settings").toBe("target");
  expect(settings.settingsProvenance, "launcher-owned loadConfig provenance").toBe(
    "launcher-owned-loadConfig",
  );
  expect(Array.isArray(settings.names), "names explicit array").toBe(true);
  expect(Array.isArray(settings.entries), "entries explicit array").toBe(true);
  expect(settings.names.length, "names/entries agree").toBe(settings.entries.length);
  const expectedNames = R3_STATIC_NAMES[scenario];
  if (expectedNames) {
    expect([...settings.names], `static names in ${scenario}`).toEqual([...expectedNames]);
    expect(settings.entries.length, "static entries match names").toBe(expectedNames.length);
    settings.entries.forEach((entry, i) => {
      expect(entry.name, "entry name order").toBe(expectedNames[i]);
      expect(entry.namespace, "normalized namespace").toBe(R3_STATIC_NAMESPACE);
      expect(entry.enabled, "inert-by-default enabled").toBe(true);
      expect(entry.exposure, "direct exposure").toBe("direct");
      expect(entry.resourceAlias, "fixture resource alias").toBe("fixture:t02");
      expect(entry.policy, "readonly policy").toBe("readonly");
    });
  } else {
    for (const entry of settings.entries) {
      expect(entry.enabled, "inert-by-default enabled").toBe(true);
      expect(entry.exposure, "direct exposure").toBe("direct");
      expect(entry.resourceAlias, "fixture resource alias").toBe("fixture:t02");
      expect(entry.policy, "readonly policy").toBe("readonly");
    }
  }
  const forbidden = ["executable", "argv", "env", "socket", "path"];
  for (const key of forbidden) {
    expect(settings[key], `no ${key} value in static settings`).toBeUndefined();
    for (const entry of settings.entries) {
      expect(entry[key], `no ${key} value in static entry`).toBeUndefined();
    }
  }
  return settings;
}

function expectR3BindingCheck(report, { scenario }) {
  const found = recordsOfType(report, "binding_check");
  expect(found.length, `exactly one binding_check in ${scenario}`).toBe(1);
  const check = found[0];
  expect(check.runtimeRole, "target binding check").toBe("target");
  const expected = R3_BINDING_EXPECTED[scenario] ?? R3_GOOD_BINDING;
  expect(check.present, "binding present flag").toBe(expected.present);
  expect(check.candidateCount, "binding candidateCount").toBe(expected.candidateCount);
  expect(check.valid, "binding valid flag").toBe(expected.valid);
  expect(check.reason, "binding safe reason").toBe(expected.reason);
  for (const key of ["tuple", "hash", "filename", "accountUuid", "origin"]) {
    expect(check[key], `no private binding ${key} observable`).toBeUndefined();
  }
  return check;
}

function expectR3PrebindAndDisposal(report, { scenario, reason }) {
  const found = recordsOfType(report, "prebind_check");
  expect(found.length, `exactly one prebind_check in ${scenario}`).toBe(1);
  const pre = found[0];
  expect(pre.runtimeRole, "target prebind role").toBe("target");
  expect(pre.supported, "target refused").toBe(false);
  expect(pre.reason, "specific refusal reason").toBe(reason);
  expect(pre.targetBound, "never bound").toBe(false);
  expect(pre.targetLoadConfigCalls, "zero loadConfig calls").toBe(0);
  expect(pre.targetTransportAttempts, "zero transport attempts").toBe(0);
  expect(pre.registrations, "no registrations on refused target").toEqual([]);
  const disposed = recordsOfType(report, "target_disposed");
  expect(disposed.length, `exactly one target_disposed in ${scenario}`).toBe(1);
  expect(disposed[0].runtimeRole, "disposed target role").toBe("target");
  expect(disposed[0].shutdownObserved, "awaited native disposal").toBe(true);
  expect(disposed[0].targetBound, "disposed target never bound").toBe(false);
  expect(pre.seq, "prebind precedes disposal").toBeLessThan(disposed[0].seq);
  return { pre, disposed: disposed[0] };
}

function expectR3RefusalProbe(report, { scenario, reason, preSeq, disposedSeq }) {
  const contexts = recordsOfType(report, "session-context");
  expect(contexts.length, `refusal-probe session-context in ${scenario}`).toBeGreaterThan(0);
  const ctx = contexts.find((r) => r.runtimeRole === "refusal-probe");
  expect(ctx, "refusal-probe context role").toBeTruthy();
  expect(ctx.mode, "actual print mode").toBe("print");
  expect(ctx.hasUI, "explicit hasUI false").toBe(false);
  expect(ctx.uiInjected, "explicit uiInjected false").toBe(false);
  expect(ctx.registrations ?? [], "empty probe registrations").toEqual([]);
  const preflights = recordsOfType(report, "preflight").filter(
    (r) => r.runtimeRole === "refusal-probe",
  );
  expect(preflights.length, `refusal-probe preflight in ${scenario}`).toBeGreaterThan(0);
  for (const preflight of preflights) {
    expect(preflight.mode, "probe print mode").toBe("print");
    expect(preflight.hasUI, "probe hasUI false").toBe(false);
    expect(preflight.uiInjected, "probe uiInjected false").toBe(false);
    expect(preflight.supported, "probe unsupported summary").toBe(false);
    expect(preflight.reason, "probe carries the target reason").toBe(reason);
    expect(preflight.targetBound, "probe never binds target").toBe(false);
    expect(preflight.inventoryProvenance, "probe SDK loader provenance").toBe("actual-sdk-loader");
  }
  const regs = recordsOfType(report, "registration");
  const refusals = regs.filter(
    (r) =>
      r.policy === "none" &&
      r.registered === false &&
      r.connected === false &&
      r.spawned === false &&
      r.runtimeRole === "refusal-probe",
  );
  expect(refusals.length, `same-record refusal registration in ${scenario}`).toBeGreaterThan(0);
  for (const refusal of refusals) {
    expect(refusal.transportAttempts, "zero probe transport attempts").toBe(0);
    expect(
      Number.isInteger(refusal.loadConfigCalls) && refusal.loadConfigCalls > 0,
      "loadConfigCalls positive integer from the actual native empty-config callback",
    ).toBe(true);
  }
  expect(disposedSeq, "refusal registration follows disposal").toBeLessThan(refusals[0].seq);
  expect(preSeq, "prebind precedes probe binding").toBeLessThan(refusals[0].seq);
  return { ctx, preflights, refusals };
}

// Nine prebind-refusal SDK profiles (spec §14): target refused before bind,
// disposed, then one actual unknown-tool creation attempt on the closed
// refusal-probe session. No gate/receiver/sidecar/approval/listener/ledger
// may be invented; effects are source:none/not-spawned/total:0.
export function expectR3PrebindRefusal(report, { scenario }) {
  const reason = R3_PREBIND_REASONS[scenario];
  expect(reason, `R3 prebind reason for ${scenario}`).toBeTypeOf("string");
  expectEnvelope(report, { scenario, harness: "sdk", layer: "sdk-pipeline" });
  expectTraceWellFormed(report, { allowedLayers: ["sdk-pipeline", "logic-control"] });
  const inv = expectR3TargetInventory(report, { scenario });
  const settings = expectR3StaticSettings(report, { scenario });
  const binding = expectR3BindingCheck(report, { scenario });
  const { pre, disposed } = expectR3PrebindAndDisposal(report, { scenario, reason });
  expect(inv.seq, "inventory before prebind").toBeLessThan(pre.seq);
  expect(settings.seq, "settings before prebind").toBeLessThan(pre.seq);
  expect(binding.seq, "binding check before prebind").toBeLessThan(pre.seq);
  const { refusals } = expectR3RefusalProbe(report, {
    scenario,
    reason,
    preSeq: pre.seq,
    disposedSeq: disposed.seq,
  });
  const probeInvs = recordsOfType(report, "resource_inventory").filter(
    (r) => r.runtimeRole === "refusal-probe",
  );
  expect(probeInvs.length, "probe inventory labeled separately").toBeGreaterThan(0);
  const calls = recordsOfType(report, "tool_call").filter((r) => r.name === CREATION_TOOL);
  expect(calls.length, "exactly one actual probe creation call").toBe(1);
  const call = calls[0];
  expect(call.source, "native pi call").toBe("pi");
  expect(call.toolCallId, "nonempty native ID").toBeTypeOf("string");
  expect(call.toolCallId.length, "nonempty native ID").toBeGreaterThan(0);
  expect(call.parentToolCallId, "explicit null parent").toBeNull();
  const joined = recordsOfType(report, "tool_result").filter(
    (r) => r.toolCallId === call.toolCallId,
  );
  expect(joined.length, "exactly one result for that call").toBe(1);
  const result = joined[0];
  expect(result.source, "native pi result").toBe("pi");
  expect(result.name, "result carries the creation name").toBe(CREATION_TOOL);
  expect(result.parentToolCallId, "result explicit null parent").toBeNull();
  expect(result.isError, "error result").toBe(true);
  expect(result.code, "null host code on unknown-tool").toBeNull();
  expect(result.reason, "unknown-tool reason").toBe("unknown-tool");
  expect(call.seq, "result after its start").toBeLessThan(result.seq);
  expect(refusals[0].seq, "registration precedes creation").toBeLessThan(call.seq);
  expect(recordsOfType(report, "gate_invocation").length, "no gate substitute").toBe(0);
  expect(recordsOfType(report, "gate_installed").length, "no gate on probe").toBe(0);
  expect(recordsOfType(report, "receiver_check").length, "no receiver on probe").toBe(0);
  expect(recordsOfType(report, "sidecar_verdict").length, "no sidecar on probe").toBe(0);
  expect(recordsOfType(report, "approval_prompt").length, "no approval on probe").toBe(0);
  expect(recordsOfType(report, "registration_declared").length, "no declaration").toBe(0);
  expect(recordsOfType(report, "effect_ledger").length, "no ledger for absent target").toBe(0);
  expect(recordsOfType(report, "tool_list").length, "no discovery on probe").toBe(0);
  expect(
    recordsOfType(report, "registration").filter((r) => r.policy === "guarded").length,
    "no guarded registration",
  ).toBe(0);
  expect(report.effects.source, "no fixture source").toBe("none");
  expect(report.effects.observation, "not-spawned observation").toBe("not-spawned");
  expect(report.effects.total, "zero total").toBe(0);
  expect(report.effects.operations, "empty operations").toEqual([]);
  expectCleanup(report);
  const cleanups = recordsOfType(report, "cleanup");
  const maxSeq = Math.max(...report.trace.map((r) => r.seq));
  expect(cleanups[cleanups.length - 1].seq, "cleanup is last").toBe(maxSeq);
  return { call, result, reason };
}

// hidden-tool (spec §14): the single connected R3 profile. Supported print/
// no-UI bound target, one readonly fixture, creation unreachable. Both
// tool_surfaces expose exactly the six reads as active/callable with the
// creation name hidden; fixture discovery still advertises all seven.
export function expectR3HiddenTool(report) {
  const scenario = "hidden-tool";
  expectEnvelope(report, { scenario, harness: "sdk", layer: "sdk-pipeline" });
  expectTraceWellFormed(report, { allowedLayers: ["sdk-pipeline", "logic-control"] });
  const pres = recordsOfType(report, "prebind_check");
  expect(pres.length, "exactly one prebind_check").toBe(1);
  expect(pres[0].supported, "supported target").toBe(true);
  expect(pres[0].reason, "profile-ok reason").toBe("profile-ok");
  expect(pres[0].targetBound, "not yet bound at prebind").toBe(false);
  const preflights = recordsOfType(report, "preflight");
  expect(preflights.length, "preflight present").toBeGreaterThan(0);
  for (const preflight of preflights) {
    expect(preflight.mode, "print context").toBe("print");
    expect(preflight.hasUI, "explicit hasUI false").toBe(false);
    expect(preflight.uiInjected, "explicit uiInjected false").toBe(false);
    expect(preflight.supported, "supported hidden profile").toBe(true);
    expect(preflight.reason, "hidden-readonly-profile reason").toBe("hidden-readonly-profile");
  }
  const gates = recordsOfType(report, "gate_installed");
  expect(gates.length, "exactly one companion gate").toBe(1);
  expect(gates[0].source, "companion-origin gate").toBe("companion");
  const surfaces = recordsOfType(report, "tool_surface");
  const first = surfaces.filter((s) => s.phase === "first-request");
  const connected = surfaces.filter((s) => s.phase === "connected");
  expect(first.length, "exactly one first-request surface").toBe(1);
  expect(connected.length, "exactly one connected surface").toBe(1);
  for (const [label, surface] of [
    ["first-request", first[0]],
    ["connected", connected[0]],
  ]) {
    expect(surface.source, `launcher-observed ${label} surface`).toBe("launcher");
    expect([...surface.activeTools].sort(), `${label} activeTools are the six reads`).toEqual(
      [...SIX_READ_QUALIFIED].sort(),
    );
    expect([...surface.callableTools].sort(), `${label} callableTools are the six reads`).toEqual(
      [...SIX_READ_QUALIFIED].sort(),
    );
    expect(surface.hiddenTools, `${label} hides creation`).toEqual([HIDDEN_CREATION_QUALIFIED]);
    expect([...surface.fixtureTools].sort(), `${label} fixtureTools are the six reads`).toEqual(
      [...SIX_READ_UNQUALIFIED].sort(),
    );
  }
  const listed = recordsOfType(report, "tool_list");
  expect(listed.length, "fixture-origin discovery present").toBeGreaterThan(0);
  for (const entry of listed) {
    expect(entry.source).toBe("fixture");
    expect(entry.tools.length, "seven fixture names advertised").toBe(7);
    for (const name of FIXTURE_TOOLS) {
      expect(entry.tools.includes(name), `advertised ${name}`).toBe(true);
    }
  }
  const regs = recordsOfType(report, "registration");
  const readonly = regs.filter(
    (r) =>
      r.policy === "readonly" &&
      r.registered === true &&
      r.connected === true &&
      r.spawned === true,
  );
  expect(readonly.length, "same-record readonly registration").toBeGreaterThan(0);
  const discoverySeq = Math.min(...listed.map((r) => r.seq));
  expect(gates[0].seq, "gate precedes discovery").toBeLessThan(discoverySeq);
  const calls = recordsOfType(report, "tool_call");
  expect(calls.length, "exactly two native calls").toBe(2);
  const reads = calls.filter((r) => r.name === "mcp__synth_gt__get_exercise");
  const creates = calls.filter((r) => r.name === CREATION_TOOL);
  expect(reads.length, "one actual read").toBe(1);
  expect(creates.length, "one actual creation").toBe(1);
  for (const call of [reads[0], creates[0]]) {
    expect(call.source, "native pi call").toBe("pi");
    expect(call.parentToolCallId, "direct null parent").toBeNull();
    expect(call.toolCallId.length, "nonempty native ID").toBeGreaterThan(0);
  }
  const readResults = recordsOfType(report, "tool_result").filter(
    (r) => r.toolCallId === reads[0].toolCallId,
  );
  expect(readResults.length, "exactly one read result").toBe(1);
  expect(readResults[0].isError, "read succeeds").toBe(false);
  const createResults = recordsOfType(report, "tool_result").filter(
    (r) => r.toolCallId === creates[0].toolCallId,
  );
  expect(createResults.length, "exactly one creation result").toBe(1);
  expect(createResults[0].isError, "creation unreachable").toBe(true);
  expect(createResults[0].code, "null host code").toBeNull();
  expect(createResults[0].reason, "unknown-tool reason").toBe("unknown-tool");
  expect(reads[0].seq, "read precedes creation").toBeLessThan(creates[0].seq);
  expect(readResults[0].seq, "read result precedes creation").toBeLessThan(creates[0].seq);
  expect(readonly[0].seq, "registration follows discovery").toBeGreaterThan(discoverySeq);
  expect(readonly[0].seq, "registration precedes calls").toBeLessThan(reads[0].seq);
  expect(
    recordsOfType(report, "gate_invocation").filter((r) => r.operationId !== undefined).length +
      recordsOfType(report, "gate_invocation").filter((r) => r.toolCallId === creates[0].toolCallId)
        .length,
    "no creation gate invocation (unreachable, not blocked)",
  ).toBe(0);
  expect(recordsOfType(report, "receiver_check").length, "no receiver check").toBe(0);
  expect(recordsOfType(report, "sidecar_verdict").length, "no sidecar").toBe(0);
  expectConnectedZeroFinal(report);
  const ledgers = recordsOfType(report, "effect_ledger");
  const finals = ledgers.filter((r) => r.final === true);
  expect(finals[0].operationId, "final carries no admitted operation").toBeNull();
  expect(finals[0].digest, "final carries no admitted digest").toBeNull();
  expectCleanup(report);
  return { read: reads[0], create: creates[0] };
}
