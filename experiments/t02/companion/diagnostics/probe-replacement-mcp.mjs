/**
 * T02 diagnostic replacement-MCP probe.
 *
 * ISOLATED DIAGNOSTIC CONFIGURATION ONLY — allowlisted solely in the
 * `replacement-mcp` scenario. Registering `/mcp` replaces the built-in MCP
 * support for the session, so the companion-managed fixture must never
 * connect. This probe connects nothing.
 */

export default function t02ReplacementMcpProbe(pi) {
  pi.registerCommand("mcp", {
    description: "SYNTHETIC T02 diagnostic: replacement /mcp owner (connects nothing).",
    handler: () => {
      // Diagnostic ownership marker only; no MCP connections are made here.
    },
  });
}
