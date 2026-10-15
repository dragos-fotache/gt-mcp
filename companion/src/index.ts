/**
 * Inert T01 Pi companion extension factory.
 *
 * Synchronous factory accepting the Pi ExtensionAPI via an erased type-only
 * import. At T01 it returns undefined and makes zero calls on the supplied
 * API, starts no resources, and connects/registers nothing. This proves inert
 * scaffolding only — not Pi loading, gate feasibility, or host compatibility.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function createCompanion(_pi: ExtensionAPI): undefined {
  void _pi;
  return undefined;
}
