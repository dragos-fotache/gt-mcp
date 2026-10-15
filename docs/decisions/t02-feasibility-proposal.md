# T02 feasibility proposal — Pi registration and approval-gate spike (Stage 1)

**State:** Stage 1 independent Developer preparation. No experiment code, no
configuration/dependency changes, no host execution yet. Only this file is
written at this stage.
**Prerequisite:** T01 accepted. Production `src/`, `companion/`, CLI and server
entries remain inert; nothing below alters them.
**Normative order:** shared MCP draft (0.1-draft) and backend v1 contract
(`shared-docs/`, baseline `9a96dcb`), `docs/decisions/t01-approved-foundation-spec.md`,
`docs/decisions/t01-implementation-adr.md`, `docs/architecture.md`,
`docs/verification.md` (C10–C12), `docs/tasks/t02-pi-feasibility.md`.

## 1. Selected runtime identity (immutable pins)

All identities below were verified against the installed tree and the root
`package-lock.json`, not taken from documentation alone. No install was run for
this proposal; the lockfile is unchanged.

| Component                         | Version                                  | Registry / source identity                                                               | Integrity                                                                                         |
| --------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Node.js                           | 24.21.0 (LTS Krypton)                    | `https://nodejs.org/dist/index.json` (coordinator-verified SHASUMS256 at T01)            | T01 evidence                                                                                      |
| npm                               | 11.19.0                                  | bundled with Node 24.21.0                                                                | —                                                                                                 |
| `@earendil-works/pi-coding-agent` | 1.1.0                                    | `https://registry.npmjs.org/@earendil-works/pi-coding-agent/-/pi-coding-agent-1.1.0.tgz` | `sha512-SeEi/4hdcHNgA9UWlefZl7ZZpm3dzi2OoxNjDHsBJ9o298LNOtbL4DGKgitlEj6uCTccvtw6f2hlCkTPVJ2RXg==` |
| `@earendil-works/pi-agent-core`   | 1.1.0                                    | locked transitive (see lockfile)                                                         | lockfile                                                                                          |
| `@earendil-works/pi-ai`           | 1.1.0                                    | locked transitive                                                                        | lockfile                                                                                          |
| `@earendil-works/pi-mcp`          | 1.1.0                                    | `https://registry.npmjs.org/@earendil-works/pi-mcp/-/pi-mcp-1.1.0.tgz`                   | `sha512-xGKwvu3SvVTeoIx8Z7UGoJprB4VK20wKORMhufcWGx61fIauhu3J+UqfB5eeoF1oE/geYBA598K6nh1SdABQkg==` |
| `@earendil-works/pi-codemode`     | 1.1.0                                    | locked transitive                                                                        | lockfile                                                                                          |
| `@modelcontextprotocol/sdk`       | 1.32.1                                   | `https://registry.npmjs.org/@modelcontextprotocol/sdk/-/sdk-1.32.1.tgz`                  | `sha512-2DdE+SJDtzLEEWzY1ZjY7Q+VcPhcV1KisD3zI4u0XZyktsjHum1mwbMI+JaulUBi2OZk+KJAi2uPXzxichPkdw==` |
| MCP wire protocol (SDK)           | `LATEST_PROTOCOL_VERSION = '2025-11-25'` | `node_modules/@modelcontextprotocol/sdk/dist/esm/types.js`                               | installed source                                                                                  |

Verified SDK surface used by this proposal (executed `node --input-type=module`
probes only, no host runs): `McpServer` with `registerTool`/`connect`,
`StdioServerTransport`, `SUPPORTED_PROTOCOL_VERSIONS` including `2025-11-25`
with `DEFAULT_NEGOTIATED_PROTOCOL_VERSION = '2025-03-26'`. Protocol
**candidate** remains `2025-11-25`; no negotiated-version support is claimed
until Stage 2 connects the fixture through the real MCP extension.

Permitted production-only checks repeated for this proposal (pinned toolchain,
`$T01_NODE_HOME/bin` in PATH): `typecheck`, `lint:production`,
`format:check:production`, `build` — all exit 0. QA paths were never read or
executed.

## 2. Source-based hypotheses (not behavioral evidence)

Per coordinator ruling, source inspection is hypothesis, **not** behavioral pass
evidence. Each item below was located in the installed 1.1.0 declarations plus
the corresponding shipped `.js` (and doc agreement where noted), but every
H-item requires Stage 2 behavioral confirmation through the harnesses in §3
before any claim is made. Nothing in this section is a pass.

- **F1. Gate invocation point.** `pi-agent-core` `prepareToolCall`
  (`dist/agent-loop.js`): unknown tool → immediate error; schema validation;
  then `beforeToolCall` hooks with the **validated** args; `block` → error
  result; any throw (including from a `tool_call` handler) → immediate error
  result. **Fail-closed on handler failure is implemented**, matching the
  extensions doc. No re-validation exists anywhere after the hooks.
- **F2. Mutation visibility.** `dist/core/extensions/types.d.ts`: “`event.input`
  is mutable. Mutate it in place … Later `tool_call` handlers see earlier
  mutations. **No re-validation is performed after mutation**.” `runner.js`
  `emitToolCall` passes the **same** event object to every handler in extension
  load/registration order; the first `{block:true}` short-circuits; there is no
  try/catch, so a throw propagates to `_beforeToolCall`, which rethrows and
  blocks. Consequence: a handler registered **after** the gate can change the
  dispatched input after approval, and execution uses the mutated object
  (`prepared.args === validatedArgs` by reference). **The C12 mutation risk is
  real in this runtime**; freezing one object or trusting annotations is
  insufficient (see §6).
- **F3. Nested uniformity.** `agent-session.js` `_executeNestedToolCall` routes
  `ctx.executeTool` through the same `runToolCall` with the same
  `beforeToolCall`/`afterToolCall` hooks, `parentToolCallId` set, ids
  `<parent>/<n>`; never rejects (failures return `isError`). Codemode scripts
  call tools via `ctx.executeTool` (`extensions/codemode/execute.js`). The gate
  therefore sees direct, tool-search-loaded, codemode-nested and
  tool-nested calls uniformly, each carrying `parentToolCallId` when nested.
- **F4. Registration precedence and collisions.** MCP extension `index.js`
  `registeredServers()`: a `mcp.json` entry takes precedence over a registered
  server of the **same namespace**; the overridden registration is reported and
  **skipped, never connected**. `config.js` rejects names differing only in
  `-`/`_` with a recorded error. Tool names are
  `mcp__<server>__<tool>` sanitized with `[^A-Za-z0-9_]` → `_`, with a
  sha256-8hex suffix on collision (`tools.js` `createMcpToolCallName`
  equivalent `createMcpToolName`); namespace is `mcp__<server>` with `-` → `_`
  (`mcp-servers.js` `mcpNamespace`).
- **F5. Exposure and withdrawal.** Default exposure `codemode`; `direct`
  declares to the model; `deferred` loads via `tool_search`; `hidden` is
  unreachable; tools cannot be unregistered, so withdrawal is re-registration
  as `hidden`. The MCP extension auto-activates `codemode`/`tool_search` as
  needed. A replacement MCP runtime (an extension registering `/mcp`, e.g.
  `pi-mcp-adapter` style) takes over `mcp.json`/connections; shell `pi mcp`
  commands always use the built-in implementation.
- **F6. Modes and dialogs.** `ExtensionMode = "tui" | "rpc" | "json" | "print"`;
  `hasUI` is true in TUI **and** RPC; only `ctx.mode === "tui"` qualifies for
  terminal UI (`ctx.ui.custom()`); JSON/print have no UI. RPC forwards
  `select`/`confirm`/`input` as `extension_ui_request`/`response`; dismissal or
  timeout resolves `undefined` (select/input) or `false` (confirm)
  (`docs/rpc-extension-ui.md`). The gate MUST treat both as denial.
- **F7. Model-text truncation.** `MCP_OUTPUT_MAX_BYTES = 20*1024`: model-facing
  MCP text is middle-truncated with a marker and the full text spilled to a
  temp file; codemode scripts receive the **complete** `CallToolResult`
  including `structuredContent`. The approval preview must therefore render the
  full intent through its own scrollable UI, never through truncated
  model-facing text.
- **F8. Session persistence is plaintext.** `appendEntry` writes `custom`
  entries into the session JSONL file (`docs/session-format.md`), which is
  plaintext, branch-relative, and within backup/export paths. It is an
  observation log, **not** a credential or approved-intent vault.
- **F9. Deterministic local driving surface.** Custom providers may implement
  `streamSimple` with a strict contract (assistant message setup, one `start`,
  balanced content/tool events with parsed args by `toolcall_end`, exactly one
  terminal `done`/`error`, instrumentation hooks `onPayload`/`onResponse`/
  `onProviderStreamEvent`, abort as aborted result). A scripted in-process
  provider can therefore drive the **real** agent loop offline with canned
  turns. SDK sessions do not load built-ins; `createCodemodeExtension`,
  `createToolSearchExtension`, `createMcpExtension` plus `bindExtensions()`
  reproduce the CLI pipeline (example `14-codemode-mcp.ts`).
- **F10. Disposable isolation surface.** `PI_CODING_AGENT_DIR`,
  `PI_CODING_AGENT_SESSION_DIR` (or `--session-dir`), `PI_OFFLINE=1`,
  `PI_SKIP_VERSION_CHECK`, `PI_TELEMETRY=0`, disposable HOME/XDG roots,
  in-memory `SessionManager`, `--no-mcp` for one-run exclusion. Isolation is
  effective only when applied **before** Pi modules are imported (§8): the
  driver sanitizes the child env, writes disposable roots, then
  dynamic-imports Pi (never top-level static Pi imports in the launcher).
- **F11. SDK entry and mode binding.** Public entry `createAgentSession()`
  (`@earendil-works/pi-coding-agent`, `core/sdk.ts`); session mode and UI are
  launcher-bound via `session.bindExtensions({ mode, uiContext })`
  (`ExtensionBindings`, `agent-session.d.ts`). Runner default is
  `mode = "print"` (`runner.js` `ExtensionRunner`; `_extensionMode = "print"`
  in `agent-session.js`); interactive startup binds `"tui"`
  (`modes/interactive/interactive-mode.js`). A caller-supplied `uiContext`
  is therefore launcher-visible injected UI and must be labeled as such,
  never presented as CLI TUI evidence. Gate records must capture `ctx.mode`
  from the actual gate context, not from driver intent.
- **F12. Launcher-side loaded-resource inventory.** `ResourceLoader`
  exposes `getExtensions(): LoadExtensionsResult` (`core/resource-loader.d.ts`)
  with per-extension `path`, `resolvedPath`, `sourceInfo`, `handlers`/`tools`/
  `commands` maps, plus `errors`/`warnings` (`core/extensions/types.ts`).
  Example `12-full-control.ts` demonstrates a launcher-owned explicit loader;
  example `14-codemode-mcp.ts` wires the real builtin MCP/codemode/search
  extensions. Distinction (coordinator ruling): the **launcher** can prove
  actual loaded-resource metadata before `bindExtensions`/connect; a
  **companion inside an arbitrary CLI session** has no equivalent inventory
  hook. Preflight inventory proof is therefore a launcher property of the
  named experiment only, and R1 (§10) records the production limitation.
- **F13. Single-spawn registration.** Servers registered while extensions load
  connect at session start; servers registered later connect immediately
  (`docs/extensions.md`); the MCP extension spawns the stdio child. The
  companion must **not** pre-spawn a second fixture process. When nothing
  connects registrations (e.g. replaced builtin), the runner emits a
  `register_mcp_server` extension error (`runner.js`
  `reportUnhandledMcpServers`) — a post-registration observable the driver
  asserts absent.

## 3. Proposed experiment architecture (Stage 2, for approval)

All paths are tentative pending the coordinator-approved spec; no file below
exists yet. Everything lives under `experiments/t02/` so T01 production
entries are untouched and inert. QA must be able to exercise all of §4 without
reading these internals.

```text
experiments/t02/
  fixture-server/          # synthetic stdio MCP server (official SDK only)
    server.mjs             # 7 synthetic tools; create_* = labeled counters only
  companion/               # experimental Pi extension (gate + registration)
    index.ts               # registerMcpServer, tool_call gate, approval UI,
                           # binding load, digest store, sidecar socket server
    mutator.ts             # deliberately late-registered input-patching probe
                           # (negative-case configuration only, never default)
  driver/                  # deterministic harness (SDK + PTY)
    run.mjs                # scenario runner: builds disposable roots, spawns
                           # fixture + Pi session/CLI, emits trace JSONL
    scripted-provider.mjs  # canned-turn local provider (F9 contract)
    scenarios.json         # fixed turns: direct/deferred/codemode/nested +
                           # negative matrix with seeded UUIDs
  build/                   # compiled companion output (tsc, unbundled)
  metadata.json            # versions, integrity, launch paths (generated, checked in)
```

- **Fixture server.** `McpServer({name:'synth-gt', version})` over
  `StdioServerTransport`, seven tools mirroring the shared draft **names with
  a synthetic server namespace** (`mcp__synth_gt__search_exercises`, …,
  `mcp__synth_gt__create_routine`). Six read tools return fixed synthetic
  catalogue records. The fixture boots **read-only by default**: `create_routine`
  with no established sidecar approval returns the execution-error envelope
  with `write_approval_required` and never touches the ledger. A standalone
  launch with no sidecar rendezvous is explicitly supported and stays
  read-only (reads served, creation refused) — this distinguishes “present
  but read-only” (N-matrix) from “absent registration”. On each create call
  the fixture (1) strictly validates args (unknown fields rejected),
  (2) canonicalizes received args, (3) obtains a sidecar verdict bound to the
  full tuple (§6) and compares digests **before** any counter change,
  (4) only then increments its in-memory effect ledger and returns the
  shared-draft envelope shape with `data.synthetic === true`. Refusal returns
  the execution-error envelope with the ledger untouched.
  Fixed `description` first line: `SYNTHETIC T02 FEASIBILITY FIXTURE — counters
only, no backend, no writes.`
- **Companion (gate-first, never connect-before-gate).** The extension factory
  installs the `tool_call` gate **synchronously at load**, before any async
  work. `session_start` then runs **preflight before any registration**:
  (a) launcher-asserted loader inventory (F12) shows exactly the allowlisted
  extensions, tools, and commands with no errors/warnings beyond the recorded
  baseline; (b) static `mcp.json` scan (agent dir + trusted project path)
  shows no shadowing/colliding `synth-gt` entry; (c) the effective-settings
  copy shows builtin MCP support present (no `-builtin:mcp`); (d) binding
  file present and unambiguous (§7). Any preflight failure → **no
  `registerMcpServer` call, no connection, no write-capable fixture** — gate
  denial after connect is not relied upon. Only on preflight success does the
  companion open its sidecar listener and call
  `pi.registerMcpServer("synth-gt", { command, args: [server.mjs,
"--t02-sidecar", sockPath], exposure: "direct" })`; the MCP extension
  performs the single stdio spawn (F13) with the socket path delivered in the
  fixture’s argv (sole rendezvous description; no fd inheritance). The gate
  for `mcp__synth_gt__create_routine` requires `ctx.mode === "tui"` read
  from the actual gate context (F6/F11; rpc/json/print → deny with reason).
  renders the **full** canonical intent in a scrollable `ctx.ui.custom()`
  view built from `Text`/layout components: all C0/C1 control characters,
  ANSI CSI/OSC sequences (including OSC 8 hyperlinks), and other
  non-printables are escaped to visible forms (control pictures/backslash
  escapes), never interpreted; Markdown is not rendered, so hostile labels
  are inert by escaping, not merely by avoiding Markdown. Overlong content is
  folded only with explicit omission markers and remains fully scrollable.
  Approval asks `ctx.ui.confirm`; on approval stores
  `sha256(canonical args)` keyed by the full `(origin, accountUuid,
sessionGeneration, profileGenerationId, operationId)` tuple and serves
  sidecar verdicts (§6). Deny/dismiss/timeout/handler-throw → block (F1/F6).
  No injected/scripted UI exists on any approval path: SDK-harness approvals
  are impossible by construction (truthful non-`tui` mode binding), and genuine
  approvals occur only in the PTY harness with the real TUI dialog.
  `session_shutdown` closes the listener and drops in-memory approvals;
  reload therefore invalidates retained intent. Fixture teardown follows F4
  semantics (stdin close, SIGTERM, then group SIGKILL).
- **Driver.** Two harnesses plus controls, sharing one trace emitter. The
  launcher sanitizes the env, writes disposable roots and the resource
  allowlist, asserts the actual `loader.getExtensions()` inventory (F12)
  **before** `bindExtensions`/connect, then drives scenarios:
  1. **SDK pipeline harness:** `createAgentSession` with in-memory session
     manager, launcher-owned explicit loader carrying exactly the allowlisted
     compiled companion plus the real builtin MCP/codemode/search extensions
     (F12; cf. examples 12/14), scripted provider with canned turns per
     scenario, truthful `bindExtensions({ mode: "print" })` with **no
     injected uiContext**. Counts as **sdk-pipeline** evidence only: gate
     invocation on every route (direct/deferred/codemode/nested, each with
     `parentToolCallId` where nested), mode-denial paths, read-only default,
     preflight/registration observables. Approvals are structurally impossible
     here, so no approval claim is made from this harness.
  2. **CLI/PTY harness:** real `pi` CLI binary (installed 1.1.0 bundle) under
     `script(1)` with a PTY, piped keystrokes answering the **genuine** TUI
     confirm dialog, disposable HOME/XDG/agent dir, same scripted provider
     shipped as a disposable extension. The **only** harness where a genuine
     approval (real `tui` mode, real dialog) can produce a dispatch. Captures
     the ANSI stream. Counts as **pty-tui** evidence.
  3. **Pure-logic checks**: canonicalization/digest/envelope assertions with
     no Pi loaded (control layer only, never pipeline evidence).
     Fake event/handler-order simulations are controls, not evidence; every
     acceptance claim cites a trace from harness 1 or 2, tagged per §4.

## 4. Public contract for QA (no implementation reads needed)

- **Launch paths (exact, Stage 2 to confirm):**
  - Fixture standalone: `node experiments/t02/fixture-server/server.mjs`
    (stdio MCP on stdio; no sidecar → reads served, `create_routine` returns
    `write_approval_required`). With `--t02-sidecar <sock>` it additionally
    consults verdicts; refusal paths are identical without it.
  - Companion: `experiments/t02/build/index.js`, loaded via disposable agent
    dir `extensions/` only.
  - Driver: `node experiments/t02/driver/run.mjs --scenario <name>
--harness <sdk|pty> --out <trace.jsonl>` with `PI_OFFLINE=1`,
    `PI_SKIP_VERSION_CHECK=1`, `PI_TELEMETRY=0`.
- **Tool surface:** exactly the seven `mcp__synth_gt__*` tools listed in §3;
  `create_routine` input shape mirrors the shared draft (`operationId`, `name`,
  `exercises`) with fixed synthetic UUID seeds published in `scenarios.json`;
  no new model-facing approval fields, no credentials, no product endpoints.
- **Envelopes:** success `{ok:true, data:{synthetic:true, operationId,
ledger:{dispatches:n}, …}}`, `isError:false`; execution refusal
  `{ok:false, error:{code, message, operationId}}`, `isError:true`. Envelope
  root keys stay exactly `ok` plus `data`/`error`; the `synthetic` marker lives
  inside `data`, so no product schema expansion is implied.
- **Trace (JSONL, one record per line; provenance-tagged):** every record
  carries `harness: "sdk"|"pty"`, `provider: "scripted-local"`, and
  `ui: "none"|"real-tui"` — there is no injected approval UI on any path.
  `preamble{boundMode, uiInjected: false, loaderInventory[], argv[],
envAllowlistHash}` records the launcher-owned `getExtensions()` metadata
  (F12: actual loaded paths, `resolvedPath`s, `sourceInfo`, registered
  tool/command names, errors/warnings) — loader-origin proof, not a driver
  self-report or a filesystem hash. Per-call records: `gate_invocation{
toolCallId, parentToolCallId?, mode (from the actual gate context),
exposure, inputDigest, decision, reason}` (companion-origin);
  `sidecar_verdict{operationId, tupleGeneration, digestMatch, decision}`
  (companion-origin) paired with `receiver_check{operationId,
receivedDigest, approvedDigest, decision}` (fixture-origin);
  `effect_ledger{operationId, dispatches}` (fixture-origin, read from the
  fixture stderr channel, never stdout); `registration{server, source,
overriddenBy?, connectedTools[]}`; `session{reason}` for
  start/shutdown/reload; `attempted_input{operationId, canonicalJson}`
  (synthetic seeds only, local trace file — never model args/results, never
  session JSONL). The trace independently shows attempted input, approved
  digest, receiver digest, and server-origin counter/verdict; driver success
  declarations alone prove nothing. Digests are hex sha256 over canonical
  JSON (sorted keys, UTF-8).
- **Determinism:** seeded UUIDs, canned provider turns, no wall-clock in
  digests, socket path under `TMPDIR`-unique disposable dir; rerun yields
  byte-identical trace except timestamps/paths, which QA masks.

## 5. Negative matrix and zero-effect assertions

Each case names the observable assertion on trace + ledger (counters stay 0
unless stated). “No write-capable registration” means the fixture is absent,
refused registration, or connected read-only with every create dispatch
refused and ledger `dispatches: 0`. A connected read-only fixture serving
reads while refusing creation is the passing default state, distinct from
absence. Unguarded/mutating configurations below are isolated, explicit
diagnostic configurations, never default or ambient.

| #   | Configuration                                                                                                                                | Expected observable                                                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N1  | Companion absent (fixture not registered)                                                                                                    | `registration` absent; create call → unknown-tool error; ledger 0                                                                                                                   |
| N2  | Static `mcp.json` entry shadows `synth-gt`                                                                                                   | `registration.overriddenBy` set; companion registration skipped (F4); ledger 0                                                                                                      |
| N3  | `-`/`_` colliding server name registered                                                                                                     | startup records config error; conflicting server never connects (F4)                                                                                                                |
| N4  | Replacement MCP runtime (probe ext registers `/mcp`)                                                                                         | loader inventory (F12) shows a non-allowlisted command/tool owner → preflight refuses registration; experiment aborts as BLOCKED before enablement; ledger 0                        |
| N5  | `rpc`/`json`/`print` mode approval attempt                                                                                                   | gate denies (`mode !== tui`, F6); block reason recorded; ledger 0                                                                                                                   |
| N6  | RPC dismissal/timeout of dialog                                                                                                              | resolves deny (F6); ledger 0                                                                                                                                                        |
| N7  | Gate handler throws                                                                                                                          | call blocked fail-closed (F1); ledger 0                                                                                                                                             |
| N8a | Unsupported inventory: extra/unknown extension file in the disposable set                                                                    | `loader.getExtensions()` mismatch vs allowlist → preflight refuses **before enablement**; no `registerMcpServer`, no connection; preamble records the offending `path`/`sourceInfo` |
| N8b | Permitted late-mutator probe (explicit diagnostic config, PTY harness only): genuine approval, then a later-registered handler patches input | refused **at the effect boundary**: `receiver_check` shows `receivedDigest != approvedDigest`, `digestMatch:false`, ledger 0 (§6)                                                   |
| N9  | `hidden` re-registration of create tool                                                                                                      | call unreachable; ledger 0                                                                                                                                                          |
| N10 | Reload/shutdown between approval and dispatch                                                                                                | in-memory approval dropped; sidecar closed; redispatch refused; ledger 0                                                                                                            |
| N11 | Missing/ambiguous binding file or label                                                                                                      | gate denies before rendering; ledger 0 (§7)                                                                                                                                         |
| N12 | Sign-out/reauth simulation (generation bump)                                                                                                 | prior approvals fenced; redispatch refused until re-approval; ledger unchanged                                                                                                      |
| N13 | Sidecar unavailable/malformed/stale at dispatch (killed listener, corrupt frame, bumped generation)                                          | fixture denies without counter change; `receiver_check.decision: deny-unavailable/malformed/stale` (§6)                                                                             |

## 6. Final-input integrity (C12 mechanism)

**Mechanism (candidate, per ruling; post-hoc-only detection is rejected):
gate-record digest + effect-boundary re-verification over a companion-owned
local channel + launcher-proved closed set.**

1. The gate canonicalizes the validated input it approved and stores
   `sha256(canonical)` keyed by the full `(origin, accountUuid,
sessionGeneration, profileGenerationId, operationId)` tuple in companion
   memory.
2. Rendezvous (single description): the companion opens a Unix-socket listener
   under the disposable dir (`0700`) during preflight-success `session_start`
   and passes the socket path to the fixture **once, in the fixture’s spawn
   argv** supplied via `registerMcpServer` config. No fd inheritance, no env
   transport, no path in tool args/results/session records.
3. The fixture’s create handler strictly validates args (unknown fields
   rejected on this side too), canonicalizes the args **as received over the
   wire** (i.e., after every in-process mutation, F2), and sends a strict
   sidecar request `{operationId, origin, accountUuid, sessionGeneration,
profileGenerationId, receivedDigest}` (unknown fields rejected on the
   companion side too). The companion replies with a verdict bound to the
   full tuple; the fixture compares the approved digest against its own
   `receivedDigest` **before** any counter change. Match (same tuple, same
   digest, generation current, listener alive) → dispatch (counter++);
   unavailable/malformed/stale/mismatch/unknown → refusal error, counter
   unchanged (N13). Verdicts are single-call and never cached in the fixture
   beyond the in-flight call; listener close (shutdown/reload) fails all
   later verdicts closed (N10).
4. The closed set is proved by the launcher, not self-declared: the trace
   preamble carries the actual `loader.getExtensions()` metadata (F12) —
   exact `path`/`resolvedPath`/`sourceInfo`, registered tool/command names,
   errors/warnings — asserted equal to the allowlist before `bindExtensions`/
   connect. Filesystem hashes and argv records are corroboration only.

Why this is sufficient for the spike: freezing the gate-side object cannot help
(F2 — later handlers receive the same reference and there is no re-validation);
trusting `clientInfo`/annotations is explicitly excluded by the shared draft;
the sidecar moves the integrity decision to the effect boundary, where mutation
is already complete and observable. Socket paths, binding values, and approval
artifacts never enter model args/results or plaintext session records; the
local trace file carries synthetic attempted inputs and digests only. A hostile
**in-process** extension is outside the boundary by Pi’s own trust model
(“load extensions only from sources you trust”); N8a rejects uncertified
inventories before enablement while N8b proves a permitted late mutator is
stopped at the boundary. If coordinator review finds the sidecar channel
insufficient (e.g., same-uid in-process forgery must be in scope), T02 stays
**blocked** and requests contract review — no weaker flag, no annotation
trust, no post-hoc-only detection will be substituted.

## 7. Trusted noncredential binding channel (labels + retained intent)

- **Channel.** Companion-only file `t02-binding.json` in the disposable agent
  dir (written by the driver, never by the model): `{origin:
"synthetic://t02", accountUuid: <fixed synthetic UUID>, sessionGeneration:
n, profileGenerationId: <fixed synthetic UUID>}`. The companion reads it with
  `node:fs` at `session_start`; it is never part of tool schemas, results, or
  model context. Exercise labels shown in previews come from fixture results
  but are stamped with the binding in gate records; a label that is
  missing/ambiguous (no exact fixture `exerciseId` match) fails closed (N11).
- **Invalidation.** Binding lives in companion memory; `session_shutdown`
  (quit/reload/new/resume/fork) drops it; the driver simulates sign-out by
  bumping `sessionGeneration` and re-running `session_start`, after which old
  tuple keys no longer match (N12) and in-flight verdicts fail closed (N13).
  Reload also drops the sidecar listener, so retained intent cannot survive
  restart except by explicit re-approval — re-prompting on recovery is
  acceptable per C12.
- **Record hygiene.** Binding values (origin/account/generations) never enter
  model args/results or session JSONL: gate/session records carry the session
  generation number and digests only. Synthetic attempted inputs appear solely
  in the local trace file (§4), which is a test artifact, not a session
  record.
- **Scope honesty.** `appendEntry`/session JSONL may carry a noncredential
  observation log (gate decisions with digests, no names/UUIDs beyond synthetic
  seeds) because F8 makes it plaintext; durable encrypted intent storage and
  full approval UX are T04/T13/T14, explicitly **not** fabricated here. The
  fixture’s retention file (disposable dir, `0600`) is documented as a test
  double, not the production mechanism.

## 8. Dependencies, scripts, reproduction (no changes now)

- **New dependencies: none proposed.** Fixture uses `@modelcontextprotocol/sdk`
  1.32.1 (already locked); companion uses the locked Pi 1.1.0 dev package
  type-only plus stdlib (`node:crypto`, `node:fs`, `node:net`,
  `node:child_process`); driver uses stdlib + Pi/SDK packages; PTY via
  `script(1)` (util-linux, preinstalled — verify in Stage 2, no npm package).
- **Manifest/script edits: none in Stage 1.** Stage 2 will need coordinator
  approval for: `experiments/t02` sources, companion `tsconfig`/build entry,
  and runner scripts (e.g. `t02:driver`). Request that edit window now; no
  floating ranges, no Pi peer changes, no root config relaxation.
- **Launcher allowlist and preflight observables (public, Stage 2 to pin):**
  exact disposable agent-dir file inventory (companion build, scripted
  provider, binding file, settings with `defaultTools` limited to fixture +
  codemode/search tools); exact driver argv; env allowlist
  (`PI_OFFLINE=1`, `PI_SKIP_VERSION_CHECK=1`, `PI_TELEMETRY=0`,
  `PI_CODING_AGENT_DIR`/`SESSION_DIR` → disposable, `TMPDIR` → disposable,
  `PATH` → pinned toolchain first) with all `*_API_KEY`/`*_TOKEN`/
  credential-bearing entries stripped; `loader.getExtensions()` metadata vs
  allowlist; `bindExtensions({mode, uiContext})` record (`uiContext` always
  absent → `uiInjected: false`); static `mcp.json` scan result;
  `register_mcp_server` unhandled-error absence (F13). Sanitization and root
  creation happen **before** any Pi import; the launcher dynamic-imports Pi
  only afterward.
- **Budgets (public, Stage 2 to pin):** MCP per-request timeout explicit
  (default 60 s); codemode `timeout_ms` explicit per scenario; fixture
  ledger capped (e.g. refuse beyond N dispatches per operationId with a
  distinct error); trace byte cap with explicit truncation error (never silent
  loss); PTY runs gated on `agent_settled`, never fixed sleeps.
- **No-live-provider controls:** `PI_OFFLINE=1`; disposable agent dir ships no
  `auth.json`/`models.json` credentials; `ModelRuntime.create` pointed at the
  disposable dir; the only registered provider is the scripted local one;
  any provider-auth error aborts the run as BLOCKED (never falls back to
  ambient credentials).
- **Lifecycle invalidation-before-verdict limits:** a verdict is valid only
  for its in-flight call while the listener is open and the generation is
  current; shutdown/reload closes the listener first, so no verdict can
  outlive its session; the fixture holds no approval cache across calls.
- **Expected reproduction (Stage 2, exact commands to be pinned in the
  approved spec):**
  ```sh
  # $T01_NODE_HOME is provisioned by the coordinator; never commit a literal path.
  export PATH="$T01_NODE_HOME/bin:$PATH"
  export PI_OFFLINE=1 PI_SKIP_VERSION_CHECK=1 PI_TELEMETRY=0
  node experiments/t02/driver/run.mjs --scenario direct-readonly --harness sdk --out ./t02-sdk.jsonl
  node experiments/t02/driver/run.mjs --scenario mutator-boundary --harness pty --out ./t02-pty.jsonl
  ```
- **Supported configuration (bounded):** Linux x64, Node 24.21.0/npm 11.19.0,
  Pi 1.1.0 built-in MCP/codemode/tool-search, stdio fixture, `tui` mode for
  approvals, closed experiment extension set, disposable roots, offline/
  scripted-provider operation. Everything else (remote MCP, other hosts,
  JSON/RPC/print writes, llama.cpp live models, OS secret stores) is an
  explicit failure boundary per §5, not a supported path.

## 9. Decisions needed from the coordinator (no implementation until answered)

Ruled since the Stage 1 draft (recorded here for shared-spec traceability):
scripted local provider through the real agent loop/hooks = sdk-pipeline
(not TUI); sidecar re-verification is a candidate, post-hoc-only rejected;
closed disposable set acceptable for the named launcher only; source
inspection is hypothesis, not pass evidence. Remaining:

1. Approve `experiments/t02/` layout, server name `synth-gt`, the §4
   launch/trace/envelope/tagging contract, and the §8 launcher
   allowlist/preflight/budget/no-live-provider set as the shared
   QA-exercisable surface.
2. Confirm the §6 strict sidecar protocol (tuple-bound verdicts, bilateral
   unknown-field rejection, single argv rendezvous, single-use/generation-
   checked verdicts) as the Stage 2 integrity candidate.
3. Confirm harness/layer tagging (§4: `harness`/`provider`/`ui`, actual
   gate-context `mode`, `uiInjected: false`) as sufficient separation of
   sdk-pipeline vs pty-tui evidence; llama.cpp live models deferred as
   unnecessary nondeterminism for the spike.
4. Grant the Stage 2 manifest/script/build edit window (sole-owner,
   serialized with QA’s `test/pi-feasibility/` work).
5. Rule on the remaining sub-question: may the fixture envelope carry the
   `data.synthetic` marker, or must refusal/success payloads be byte-shaped
   exactly like future product envelopes? (5a on inventory proof is superseded
   by the F12 loader-metadata ruling.)

## 10. Risks and blockers carried into Stage 2

- **R1 (standing production limitation):** the closed set is proved by the
  launcher for the named experiment only (F12 loader metadata before
  `bindExtensions`/connect). A standalone companion in an arbitrary ambient
  CLI session has no equivalent inventory hook and therefore **cannot certify
  that setup** — N8a/N4 preflight logic does not transfer. Any production
  use needs a separate integration decision (T13/T14/T17), not an extension
  of this spike.
- **R2:** `import.meta.main`-style API maturity risks do not apply here, but
  the scripted provider must implement the full `streamSimple` event/instrumentation
  contract; deviation makes the provider “behave differently from built-ins”
  (custom-provider doc) and would downgrade pipeline evidence to simulation.
- **R3:** PTY/TUI evidence depends on `script(1)` availability and the real CLI
  bundle’s startup under disposable roots; flaky terminal timing must be
  absorbed with `agent_settled`-gated reads, never sleeps-as-proof.
- **R4:** MCP SDK v1 maintenance horizon (≥6 months after v2’s 2026-07-27
  release per upstream README) is a release-review risk carried from T01.
- **R5:** all H-items in §2 are source-based hypotheses until Stage 2
  behavioral confirmation; F11–F13 rest on coordinator-cited declarations
  (verified present in the installed tree) but claim no behavior yet.
- Unresolved security/runtime feasibility keeps T02 blocked per the work order;
  no workaround or simulator will be presented as done.
