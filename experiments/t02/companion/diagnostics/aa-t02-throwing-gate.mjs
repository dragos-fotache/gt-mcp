/**
 * T02 diagnostic throwing-gate probe.
 *
 * ISOLATED DIAGNOSTIC CONFIGURATION ONLY — allowlisted solely in the
 * `handler-failure` scenario. Throws inside a `tool_call` handler for the
 * synthetic create tool, so the pipeline must block fail-closed before any
 * effect. Never part of the default resource set.
 */

const CREATE_TOOL = "mcp__synth_gt__create_routine";

export default function t02ThrowingGate(pi) {
  pi.on("tool_call", (event) => {
    if (event.toolName !== CREATE_TOOL) return undefined;
    throw new Error("SYNTHETIC T02 diagnostic handler failure");
  });
}
