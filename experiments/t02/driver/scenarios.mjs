/**
 * T02 scenario registry (public API per approved spec §7).
 *
 * Each entry is a finite, named configuration: no arbitrary executables,
 * scripts, or service URLs are accepted by the driver. QA derives verdicts
 * from the report observations; `expect` notes here are Developer-side
 * configuration intent, not test verdicts.
 */

export const SEED_OPERATION_ID = "55555555-5555-4555-8555-555555555555";
export const SEED_EXERCISE_ID = "11111111-1111-4111-8111-111111111111";
export const SEED_ROUTINE_NAME = "SYNTHETIC T02 Routine";
export const SEED_ALT_OPERATION_ID = "66666666-6666-4666-8666-666666666666";
// Independently computed canonical seed SHA256 (approved spec §5).
export const SEED_DIGEST = "71a6d7acdeb769821f1b6231f206853c8e9423fec5989a68312b06fa8e6cd456";

export function seedCreateArgs(operationId = SEED_OPERATION_ID) {
  return {
    operationId,
    name: SEED_ROUTINE_NAME,
    exercises: [
      {
        exerciseId: SEED_EXERCISE_ID,
        sets: [{ repetitions: 0, weightKg: 0 }, {}],
      },
    ],
  };
}

const doneText = (scenario) => `SYNTHETIC T02 turn complete: ${scenario}`;

function directTurns(scenario, args = seedCreateArgs()) {
  return [
    { calls: [{ tool: "mcp__synth_gt__create_routine", args }] },
    { text: doneText(scenario) },
  ];
}

function deferredTurns(scenario, args = seedCreateArgs()) {
  return [
    { calls: [{ tool: "tool_search", args: { query: "synthetic routine creation" } }] },
    { calls: [{ tool: "mcp__synth_gt__create_routine", args }] },
    { text: doneText(scenario) },
  ];
}

function codemodeTurns(scenario, args = seedCreateArgs()) {
  const code = `const r = await tools.mcp__synth_gt__create_routine(${JSON.stringify(args)}); return JSON.stringify({ synthetic: true, isError: !!r.isError });`;
  return [{ calls: [{ tool: "codemode", args: { code } }] }, { text: doneText(scenario) }];
}

function nestedTurns(scenario, args = seedCreateArgs()) {
  return [{ calls: [{ tool: "t02_orchestrate", args }] }, { text: doneText(scenario) }];
}

function readThenCreateTurns(scenario) {
  return [
    { calls: [{ tool: "mcp__synth_gt__get_exercise", args: { exerciseId: SEED_EXERCISE_ID } }] },
    { calls: [{ tool: "mcp__synth_gt__create_routine", args: seedCreateArgs() }] },
    { text: doneText(scenario) },
  ];
}

// R2 readonly route turns only. Shared PTY helpers below are unchanged.
function r2DeferredTurns(scenario) {
  return [
    { calls: [{ tool: "tool_search", args: { query: "mcp__synth_gt", limit: 7 } }] },
    { calls: [{ tool: "mcp__synth_gt__get_exercise", args: { exerciseId: SEED_EXERCISE_ID } }] },
    { calls: [{ tool: "mcp__synth_gt__create_routine", args: seedCreateArgs() }] },
    { text: doneText(scenario) },
  ];
}

const R2_CODEMODE_PREAMBLE = '// @options: {"timeout_ms":10000,"max_output_tokens":1000}';

function r2CodemodeScript() {
  const readArgs = JSON.stringify({ exerciseId: SEED_EXERCISE_ID });
  const createArgs = JSON.stringify(seedCreateArgs());
  return [
    R2_CODEMODE_PREAMBLE,
    `const read = await tools.mcp__synth_gt__get_exercise(${readArgs});`,
    `if (read.isError) { throw new Error("SYNTHETIC T02 nested read failed"); }`,
    `const created = await tools.mcp__synth_gt__create_routine(${createArgs});`,
    `return JSON.stringify({ synthetic: true, readOk: true, createIsError: !!created.isError });`,
  ].join("\n");
}

function r2CodemodeTurns(scenario) {
  return [
    { calls: [{ tool: "codemode", args: { code: r2CodemodeScript() } }] },
    { text: doneText(scenario) },
  ];
}

// exposure: fixture server exposure registered by the companion.
// defaultTools: SDK settings override (null = leave; [] = builtins off).
// bindMode: SDK bindExtensions mode. diagnostics: allowlisted diagnostic aliases.
const SDK_PRINT = { harness: "sdk", layer: "sdk-pipeline", bindMode: "print", ui: "none" };

export const SCENARIOS = {
  // --- SDK read-only route coverage (refusal expected; reads succeed) ---
  "direct-readonly": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    turns: (s) => readThenCreateTurns(s),
  },
  "deferred-readonly": {
    ...SDK_PRINT,
    exposure: "deferred",
    defaultTools: ["tool_search"],
    turns: (s) => r2DeferredTurns(s),
  },
  "codemode-readonly": {
    ...SDK_PRINT,
    exposure: "codemode",
    defaultTools: ["codemode"],
    turns: (s) => r2CodemodeTurns(s),
  },
  "nested-readonly": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    turns: (s) => nestedTurns(s),
  },
  // --- Absent vs connected-readonly ---
  "no-companion": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    companion: false,
    turns: (s) => directTurns(s),
  },
  "generic-readonly": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    turns: (s) => readThenCreateTurns(s),
  },
  // --- Static / collision conflicts ---
  // Closed launcher configuration descriptors: names only (insertion
  // order significant). The driver writes the single safe fixture
  // descriptor per name; no runnable commands live in the registry.
  "static-shadow": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    staticMcp: { names: ["synth-gt"] },
    turns: (s) => directTurns(s),
  },
  "normalized-collision": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    staticMcp: { names: ["synth-gt", "synth_gt"] },
    turns: (s) => directTurns(s),
  },
  "normalized-collision-reversed": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    staticMcp: { names: ["synth_gt", "synth-gt"] },
    turns: (s) => directTurns(s),
  },
  // --- Unsupported resource profiles (refused before enablement) ---
  "replacement-mcp": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    diagnostics: ["probe-replacement-mcp"],
    turns: (s) => directTurns(s),
  },
  "replacement-codemode": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    diagnostics: ["probe-replacement-codemode"],
    turns: (s) => directTurns(s),
  },
  "missing-mcp": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    noMcpBuiltin: true,
    turns: (s) => directTurns(s),
  },
  "unsupported-inventory": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    diagnostics: ["probe-unknown-resource"],
    turns: (s) => directTurns(s),
  },
  // --- Modes / UI absence (SDK binds truthful non-tui modes) ---
  "mode-print": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    turns: (s) => directTurns(s),
  },
  "mode-json": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    bindMode: "json",
    turns: (s) => directTurns(s),
  },
  "mode-rpc-has-ui": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    bindMode: "rpc",
    turns: (s) => directTurns(s),
  },
  "no-ui": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    bindMode: "tui",
    turns: (s) => directTurns(s),
  },
  // --- Binding channel ---
  "binding-missing": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    binding: "missing",
    turns: (s) => directTurns(s),
  },
  "binding-ambiguous": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    binding: "ambiguous",
    turns: (s) => directTurns(s),
  },
  // --- Hidden tool ---
  "hidden-tool": {
    ...SDK_PRINT,
    exposure: "direct",
    defaultTools: [],
    hideCreate: true,
    turns: (s) => readThenCreateTurns(s),
  },

  // --- PTY genuine-approval routes (tui-interactive only) ---
  "direct-approve": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "direct",
    approval: "enter",
    turns: (s) => directTurns(s),
  },
  "deferred-approve": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "deferred",
    approval: "enter",
    turns: (s) => deferredTurns(s),
  },
  "codemode-approve": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "codemode",
    approval: "enter",
    turns: (s) => codemodeTurns(s),
  },
  "nested-approve": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "direct",
    approval: "enter",
    turns: (s) => nestedTurns(s),
  },
  "direct-reject": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "direct",
    approval: "deny",
    turns: (s) => directTurns(s),
  },
  "deferred-reject": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "deferred",
    approval: "deny",
    turns: (s) => deferredTurns(s),
  },
  "codemode-reject": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "codemode",
    approval: "deny",
    turns: (s) => codemodeTurns(s),
  },
  "nested-reject": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "direct",
    approval: "deny",
    turns: (s) => nestedTurns(s),
  },
  "handler-failure": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "direct",
    approval: "enter",
    diagnostics: ["aa-t02-throwing-gate"],
    turns: (s) => directTurns(s),
  },
  "approval-dismiss": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "direct",
    approval: "esc",
    turns: (s) => directTurns(s),
  },
  "approval-cancel": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "direct",
    approval: "cancel",
    turns: (s) => directTurns(s),
  },
  "approval-timeout": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "direct",
    approval: "timeout",
    turns: (s) => directTurns(s),
  },
  "mutator-boundary": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "direct",
    approval: "enter",
    diagnostics: ["zz-t02-mutator"],
    turns: (s) => directTurns(s),
  },
  "sidecar-unavailable": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "direct",
    approval: "enter",
    sidecarFault: "unavailable",
    turns: (s) => directTurns(s),
  },
  "sidecar-malformed": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "direct",
    approval: "enter",
    sidecarFault: "malform",
    turns: (s) => directTurns(s),
  },
  "sidecar-stale": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "direct",
    approval: "enter",
    sidecarFault: "stale",
    turns: (s) => directTurns(s),
  },
  "binding-invalidate": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "direct",
    approval: "enter",
    invalidate: "binding",
    turns: (s) => directTurns(s),
  },
  "reload-invalidate": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "direct",
    approval: "enter",
    invalidate: "reload",
    turns: (s) => directTurns(s),
  },
  "shutdown-invalidate": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "direct",
    approval: "enter",
    invalidate: "shutdown",
    turns: (s) => directTurns(s),
  },
  // --- Isolated diagnostic controls (invert the usual zero-effect expectation) ---
  "calibration-unguarded": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "direct",
    approval: "enter",
    control: "unguarded",
    turns: (s) => directTurns(s),
  },
  "calibration-mutation": {
    harness: "pty",
    layer: "tui-interactive",
    exposure: "direct",
    approval: "enter",
    diagnostics: ["zz-t02-mutator"],
    control: "mutation",
    turns: (s) => directTurns(s),
  },
};

export function getScenario(name) {
  const entry = SCENARIOS[name];
  if (!entry) throw new Error(`t02-driver: unknown scenario: ${name}`);
  return { name, companion: true, binding: "ok", ...entry };
}

export function scenarioNames() {
  return Object.keys(SCENARIOS);
}
