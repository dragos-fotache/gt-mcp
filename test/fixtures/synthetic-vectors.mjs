// T01 QA labeled synthetic vectors (Stage 2, approved spec §6).
//
// SYNTHETIC PROVENANCE: every value below is fabricated for black-box QA use
// only. Provenance is carried by this file's label and documentation — not by
// malformed identifiers. UUID fixtures below use canonical UUID syntax (as
// required for valid-input cases); they are synthetic because they are listed
// here, never because of a prefix. No credential-looking fixture is needed for
// T01 and none is provided.

export const SYNTHETIC_LABEL = "synthetic-qa-t01-foundation";

// Canonical-syntax, purely synthetic UUIDs for any valid-input placeholder use.
export const SYNTHETIC_UUIDS = Object.freeze({
  profile: "11111111-1111-4111-8111-111111111111",
  account: "22222222-2222-4222-8222-222222222222",
  sessionGeneration: "33333333-3333-4333-8333-333333333333",
  profileGeneration: "44444444-4444-4444-8444-444444444444",
  operation: "55555555-5555-4555-8555-555555555555",
});

// Exact observable vectors from the approved spec §3. Tests compare child output
// against these; the strings are normative expectations, not implementation.
export const EXPECT = Object.freeze({
  EXIT_NOT_IMPLEMENTED: 78,
  EXIT_OK: 0,
  serverStderr: "GymTracka MCP server is not implemented (T01 foundation).\n",
  cliHelpStdout:
    "GymTracka MCP foundation\nUsage: gymtracka-mcp --help\nDomain commands are not implemented.\n",
  cliOtherStderr: "GymTracka MCP CLI commands are not implemented (T01 foundation).\n",
});
