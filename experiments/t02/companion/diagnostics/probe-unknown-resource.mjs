/**
 * T02 diagnostic unknown-resource probe.
 *
 * ISOLATED DIAGNOSTIC CONFIGURATION ONLY — allowlisted solely in the
 * `unsupported-inventory` scenario. Registers one inert `/t02_unknown`
 * command and connects nothing. The closed launcher profile treats any
 * additional unknown resource/command as unsupported and refuses the
 * target before bind/session_start/connection.
 */

export default function t02UnknownResourceProbe(pi) {
  pi.registerCommand("t02_unknown", {
    description: "SYNTHETIC T02 diagnostic: unknown resource owner (connects nothing).",
    handler: () => {
      // Diagnostic ownership marker only; no MCP connections are made here.
    },
  });
}
