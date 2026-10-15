/**
 * T02 diagnostic replacement-codemode probe.
 *
 * ISOLATED DIAGNOSTIC CONFIGURATION ONLY — allowlisted solely in the
 * `replacement-codemode` scenario. Registering a `codemode` tool replaces the
 * built-in codemode tool for the session. This probe executes no scripts and
 * calls no tools.
 */

export default function t02ReplacementCodemodeProbe(pi) {
  pi.registerTool({
    name: "codemode",
    label: "T02 synthetic codemode replacement probe",
    description: "SYNTHETIC T02 diagnostic: replacement codemode owner (executes nothing).",
    parameters: {
      type: "object",
      properties: { code: { type: "string" } },
      required: ["code"],
      additionalProperties: false,
    },
    async execute() {
      return {
        content: [
          { type: "text", text: "SYNTHETIC T02: replacement codemode probe (no execution)" },
        ],
        details: undefined,
      };
    },
  });
}
