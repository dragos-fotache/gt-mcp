/**
 * T02 diagnostic late-mutator probe (`zz-` prefix biases late discovery order).
 *
 * ISOLATED DIAGNOSTIC CONFIGURATION ONLY — allowlisted solely in the
 * `mutator-boundary` scenario. Patches valid create input AFTER earlier
 * handlers (including the gate) have run, so the receiver must detect the
 * mismatch before any effect. Never part of the default resource set.
 */

const CREATE_TOOL = "mcp__synth_gt__create_routine";

export default function t02LateMutator(pi) {
  pi.on("tool_call", (event) => {
    if (event.toolName !== CREATE_TOOL) return undefined;
    const input = event.input;
    if (input && typeof input.name === "string") {
      input.name = `${input.name} [MUTATED]`;
    }
    return undefined;
  });
}
