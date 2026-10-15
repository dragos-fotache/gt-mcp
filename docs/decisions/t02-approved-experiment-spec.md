# T02 approved isolated experiment specification

**PARKED / HISTORICAL ONLY:** the user parks T02 and selects
[configuration-only routine creation](routine-creation-config-policy.md):
no custom/external permission extension or per-routine approval. Shared MCP
draft0.2 supersedes the old product approval policy. Preserve this document as
the original experiment/design/succession record; do not rewrite old assertions
or failures as current-policy passes. No further R3–R11 execution, automatic
succession or artifact QA relay is authorized. R3 remains an unaccepted candidate.
All "latest", "OPEN", authorization and next-slice instructions below are
historical and overridden by this parking notice.

**Authority:** user-approved T02; coordinator authorizes Stage 2 under this contract.
This supersedes conflicting proposal details without changing the shared MCP/backend
contract. **State:** approved to build/test a synthetic feasibility spike, not proven.

Read T02 task/work order, shared tools and C10-C12, architecture, verification and T01
handoff. QA derives assertions from this file and public specs only, not experiment code.
Developer never reads QA code, fixtures, internal plans/results or test-source diagnostics.

## 1. Scope, evidence layers and decisions (D-T02-1..8)

Approve the local final-input sidecar **as a mechanism to investigate**, not a behavioral
pass or portable consent proof. Its verdict must be checked by the receiver before a
synthetic counter changes. Post-hoc detection alone is insufficient. A same-user external
process or malicious trusted in-process extension is outside the stated non-OS-sandbox
boundary; accidental/unsupported handler mutation through supported Pi paths is in scope.

Accept a scripted local provider that emits valid events through the actual pinned Pi
agent loop/hooks as **sdk-pipeline** evidence. No live model/provider is necessary.
An SDK-supplied mode/UI context is not genuine terminal UI. The initial SDK harness binds
`mode: print`, with no injected UI. Successful approval/effect tests use genuine Pi
interactive mode under a real PTY. Pure handler simulations are **logic-control** only.
Record layers separately: sdk-pipeline, tui-interactive, injected-ui (if explicitly added
later), logic-control. No silent promotion between them.

The named launcher may own a closed resource set. SDK preflight uses the actual
ResourceLoader.getExtensions() result before bindExtensions/connect. A standalone
companion lacks the same inventory interface in arbitrary CLI setups: **R1 is retained**.
For a stock-CLI PTY run, do not label a separate SDK scan as that CLI's loaded inventory.
Either use the genuine exported Pi InteractiveMode/AgentSessionRuntime with a
launcher-owned loader under a PTY, or use stock CLI with explicit no-discovery resource
flags and controlled allowlisted files/argv, tagging inventory provenance as
`controlled-cli-launch` rather than `actual-sdk-loader`. Coordinator source/process review
must corroborate that closed launch; no claim of arbitrary ambient CLI support is allowed.
If neither genuine interactive path can satisfy isolation/preflight, report blocked.
No Pi source patches/fork, private monkey-patched pipeline, or current-agent alterations.

Full production schemas/authorization, durable storage/replay/fork recovery, complete
approval UX and T17 certification remain T03-T17 responsibilities. Synthetic label and
invalidation demos prove only the published local channel/fixture behavior. Production
src/ and companion/src/ entries from T01 remain unchanged and inert.

## 2. Runtime, paths and shared edit window

Use T01's locked Node24.21.0/npm11.19.0/Pi1.1.0/MCP SDK1.32.1/Zod4.5.4 toolchain.
Verify package integrities against lockfile; protocol2025-11-25 remains a candidate until
observed on the fixture. No new dependencies authorized. Host-provided package imports
in experimental extension modules remain type-only or host-resolved/unbundled; declare
actually used host peers with '*' in experimental package metadata if needed. Do not
introduce root runtime Pi deps or rely on unrecorded dependency versions.

Developer owns:

- `experiments/t02/fixture-server/server.mjs` — synthetic seven-tool stdio server.
- `experiments/t02/companion/` — experimental companion, known diagnostic extensions.
- `experiments/t02/driver/` — isolated bootstrap/worker/provider/PTY/scenario runner.
- `experiments/t02/dist/` — generated unbundled extension output (not committed).
- `experiments/t02/tsconfig.json`, experimental manifest/metadata/README as needed.
- Sole-owner root scripts/compiler/lint/format/build config edits needed for these paths;
  no dependency/lockfile updates without a new coordinator decision.
- `docs/decisions/t02-feasibility-adr.md` and T02 notes in compatibility.md.

QA owns `test/pi-feasibility/**/*.test.mjs` and `.mjs` helpers/probes, clearly synthetic
`test/fixtures/t02/`, and `docs/evidence/t02-qa-*`. Never read experiments/ source,
compiled contents, maps or source diffs. Nonsecret metadata and execution of the public
entry points are allowed. QA requests config/script changes through coordinator.
Coordinator owns this spec, task/index/verification/status and combined review evidence.

Scripts: add `t02:build` (only experiment compile), `typecheck:t02` (no emit),
`lint:t02` and `format:check:t02` (Developer experiment paths only), `test:t02`
(`vitest run test/pi-feasibility`). Root check/build/typecheck/lint/format must include
necessary experiment checks and QA tests without changing T01 entry semantics or skipping
existing tests. Add scoped Node globals, not rule suppressions. The known Pi .d.ts TS1543
exception may extend to the isolated experimental extension config **only**, documented
and inherited from companion exception; root source declaration checks stay fully enabled.
Exclude generated dist from lint/format. No pass-with-no-tests or failure masking.

No installs/global changes, staging/commits or publication. Serialize shared builds and
target test execution using artifact-ready/pause messages, not file/output polling.

## 3. Isolation and budgets

Bootstrap first creates disposable HOME/XDG/Pi-agent/session/cwd/TMPDIR roots and constructs
an environment allowlist, then starts worker/imports Pi. Do not inherit provider keys,
tokens, auth commands, NODE_OPTIONS preload hooks, user extensions or personal settings.
Allow pinned PATH, safe locale/TERM plus explicit disposable paths/offline/telemetry flags.
All model tools are fixture tools plus known orchestration/codemode/search; no bash/read/
arbitrary command/network tool exposure. No real-provider fallback. Unexpected provider,
resource, auth request, live network attempt or out-of-scope file access is a blocker.

Sockets and observation files live under a private disposable directory (0700), files
0600 where applicable. Close listeners/children/session handles and remove owned roots
on every outcome. Current Herdr topology/panes/focus and user Pi settings remain untouched.

Operational budgets: one scenario <=60s; approval waiting <=10s; MCP request <=10s;
sidecar frame <=64KiB, verdict deadline <=2s; routine wire/input <=1MiB; trace <=4MiB;
PTY capture <=4MiB; <=100 synthetic effects per run. Exceedance is explicit
budget_exceeded/trace_too_large or driver failure, never a silently truncated pass.
These are experiment transport/process budgets, not new production domain caps.
Use event-driven PTY/input/readiness/agent_settled synchronization; sleeps are not evidence.

## 4. Public launch and result interfaces

Public fixture: `node experiments/t02/fixture-server/server.mjs`.
Optional `--t02-sidecar <local-socket>` plus `--t02-binding-file <trusted-private-file>`
enables consulting the private channel, not automatic approval. Both are trusted launch
metadata, never tool arguments. Receiver and companion independently load the same strict
synthetic binding file, so the receiver can bind its request and verify current generation
before a counter change; it must not accept a tuple supplied through model arguments.
Missing either input/invalid file/no sidecar/unavailable channel always leaves creation
unavailable; reads work.
Fixture stdout carries only stdio MCP. Diagnostics/ledger use a separate stderr/owned-file
channel, never MCP stdout. Exactly one child is launched through registerMcpServer;
companion does not pre-spawn the same fixture.

Public driver:

```sh
node experiments/t02/driver/run.mjs --scenario <name> --harness <sdk|pty> --out <report.json>
```

`--out` is an operator/test output path, never a model tool field. Driver emits the same
single JSON report on stdout (no unrelated logging), exit0 when the observation completed,
exit1 for harness/cleanup/timeout failure, exit2 for invalid driver arguments. **exit0 is
not the test verdict**: QA must inspect the observations. All scenarios are from the finite
registry below; no arbitrary executable/script/service URL accepted.

Report root:
`{synthetic:true, scenario, harness, layer, runtime, completed, trace, effects, limits}`.
`runtime` names exact Node/npm/Pi/SDK versions and lockfile integrity references.
`trace` is ordered records (§7); `effects` is the independently fixture-origin total
counter and per-operation observations. No raw local paths/binding file values or provider
keys in reports/session observation entries. Use relative resource aliases, not private
absolute argv/loaded paths. Optional raw PTY capture stays disposable; evidence is
sanitized and synthetic, not a user's terminal/session capture.

Public compiled companion entry: `experiments/t02/dist/index.js` (additional diagnostic
compiled entries named in metadata). Experimental metadata declares relative entry paths,
versions, layer/runtime profiles, scenario registry and resource aliases; QA may read it.
Production companion package manifest/registration and root .pi stay unchanged.

## 5. Fixture surface, input and canonical intent

Server identity `synth-gt`, normalized namespace `mcp__synth_gt__`; collision alias
`synth_gt`. Seven tool names are the shared names: search_exercises, get_exercise,
list_workouts, get_workout, list_routines, get_routine, create_routine. Six reads publish
readOnlyHint/idempotentHint/openWorldHint true. Creation publishes readOnlyHint false,
destructiveHint false, idempotentHint true, openWorldHint true; annotations do not grant
approval. Clearly describe fixture counters only, no real backend/domain writes.
Exactly seven tools may remain advertised while creation is unavailable.

Creation input follows the shared strict object shape/UUID/Int32/finite weight types:
operationId, name, exercises; ordered entries exerciseId, optional restDurationSeconds,
sets; ordered sets optional nullable repetitions/weightKg. Reject unknown properties,
coercion and invalid types at all object levels on both gate and receiver. No confirmed,
credential, binding, socket path, server name or approval marker argument.
This synthetic validator is not implementation of all backend Unicode/domain rules.

Canonical intent: preserve name/Unicode/case/array order/repeated references/zero/null;
insert only restDurationSeconds=30, repetitions=null, weightKg=null defaults; recursively
sort object keys (not arrays), UTF-8 JSON, SHA256 over those bytes. No whitespace trimming,
casefold/NFC/reordering. Different operationId/intent requires its own explicit approval.
Digest comparison at dispatch is over freshly validated/normalized **received** arguments,
not a shared mutable object captured before later handlers.

Published synthetic seed: operationId `55555555-5555-4555-8555-555555555555`, exerciseId
`11111111-1111-4111-8111-111111111111`, routine name `SYNTHETIC T02 Routine`;
sets `[{repetitions:0,weightKg:0},{}]`, rest omitted. Independently computed canonical
seed SHA256: `71a6d7acdeb769821f1b6231f206853c8e9423fec5989a68312b06fa8e6cd456`.
Use this fixed public vector to calibrate canonicalization, not only helper self-equality.
Read exercise records provide that ID/current synthetic label; account/profile seeds are private-channel test metadata, not
tool fields. Other scenarios may use explicitly documented synthetic UUIDs in metadata.

Fixture success envelope `{ok:true,data:{synthetic:true,...}}`, refusal
`{ok:false,error:{code,retryable:false,message?}}`, exact root keys, matching structured
and serialized-text content, correct isError. `data.synthetic` is allowed **only in this
fixture**; no product schema expansion is implied. Creation data names operationId and
counter dispatches, not a real saved receipt. Default refusal code write_approval_required;
invalid args invalid_arguments; integrity mismatch input_integrity_mismatch; stale or
missing binding binding_unavailable. Reports distinguish protocol/validation errors from
handler execution refusal. Counter dispatch observations are not backend replay evidence.

## 6. Gate, registration, final-input channel and binding

Install gate synchronously at extension factory load before registration/connection.
Capture actual ctx.mode; before creating an approval listener/write-capable registration,
check tui mode, binding, static configuration/normalized-name conflicts, supported runtime
and complete controlled resource profile. Unsupported modes may use a generic **read-only**
fixture for pipeline observations; never a companion-managed write-enabled connection.
Absent/failing/unsupported gate has no write-capable registration. A mode check after
connecting alone does not establish this property. Teardown invalidates approval/listener
before withdrawal; stop fixture with MCP lifecycle, no duplicate/manual spawn.

Allowed resource roles: real Pi builtin MCP/codemode/tool-search, scripted local provider,
experimental companion, nested driver tool, observer; optional named diagnostic late-mutator
or replacement/unknown-resource controls only in their explicit negative/calibration
scenarios. Resource preflight includes metadata/errors/warnings and registered names,
static normalized registration names/effective settings, and provenance (SDK loader vs
controlled CLI launch). Unknown profiles fail before enablement; aliases/static entries
cannot silently override a write-enabled registration. Recheck on reload/reconfiguration.

Approval stimulus is trusted test/operator PTY keystrokes at a genuine per-call native
prompt. Display the complete effective synthetic sample (name/operationId/IDs/ordered
sets/null/zero/rest); escape C0/C1, CSI/OSC/hyperlinks to visible literal representations.
Text widgets alone do not sanitize controls. A viewport may scroll/expand but every value
must remain accessible; no canonical content omissions even with a marker. A basic spike
preview is not T14's completed production UI. Reject/dismiss/cancel/timeout/error blocks
before dispatch, including late approval after cancellation. Reads are ungated.

Private channel binding fields: origin, accountUuid, sessionGeneration, profileGenerationId.
Driver creates a synthetic trusted file before startup; origin is synthetic://t02; no
credentials. Companion loads/verifies it privately, stamps authorized read labels by this
context, retains approved intent/digest/operationId in private memory, never infers binding
from model names/annotations. Labels clear on binding/session invalidation. No approval
artifacts or binding/socket metadata are added to tool schemas/results or appendEntry.
Ordinary synthetic model tool arguments necessarily appear in the disposable model
transcript; do not claim routine input never enters model args. Do not duplicate approved
intent/private channel values into plaintext session observation entries.

Strict one-request/one-response sidecar frame (newline-delimited JSON). Request contains
operationId, full binding tuple and receivedDigest. Response contains the same tuple and
operationId, approvedDigest (string or null), decision allow/deny, safe reason. Reject
unknown fields/wrong types/extra frames/malformed responses/tuple mismatch and stale
approval. A verdict must be requested anew per call, not cached by the fixture; generation
must still be current at the receiver's pre-effect boundary. No sidecar/listener failure
can default to allow. Fixture independently hashes its received input and checks the
bound verdict before increment; receiver records refusal/matched digest plus counter.
Binding invalidated **before** verdict/effect blocks it. A counter already committed before
invalidation cannot be rolled back; no impossible whole-system atomic sign-out guarantee
or production A07 fence is claimed by the spike. Record residual IPC race limits honestly.

In-memory retention is explicitly not T04/T14 encryption/durable recovery. Digest keys
are tuple+operationId; conflicting intent cannot overwrite already approved intent to
make a later mismatch appear authorized. Deliberate unsafe controls remain fixture-only.

## 7. Observations and required scenario registry

Each trace record has seq (monotonic integer), source (launcher/pi/companion/fixture), type,
layer and relevant data. Required types:

- preflight: resource profile/inventory provenance, aliases, static checks, actual bound
  mode, uiInjected, supported/reason; no private paths.
- gate_installed, registration (policy readonly/guarded/none, registered/connected flags),
  session (start/invalidate/reload/shutdown), cleanup (owned resources removed).
- tool_call/tool_result: actual selected-runtime observer, name, toolCallId,
  parentToolCallId or null, isError for results; not fabricated event invocation.
- gate_invocation: actual context mode, toolCallId/parentToolCallId, operationId,
  approved/attempted digest, decision and safe reason; approval_prompt decision/stimulus.
- sidecar_verdict, receiver_check: operationId, receivedDigest, approvedDigest/null,
  tupleMatch, generationMatch, decision/reason; receiver_check is fixture-origin.
- effect_ledger: fixture-origin operationId/digest/counter; never derived solely from
  the gate's decision or a driver's expected outcome.

Fixture-origin zero-counter final observation is required for connected denial cases;
absence of a log record alone is not zero-effect proof. For preflight-refused/absent
cases, report registration/spawn absence plus attempted call failure and no child effect
source. Correlate actual call IDs/parents and digests; driver self-declared success cannot
replace gate/receiver/pipeline observations. Retain full bounded traces or fail explicitly.

Finite scenarios (SDK negatives may bind print/json/rpc/no-UI; PTY genuine approvals):

| Scenario                                                                  | Harness/layer                              | Required observable                                                                                                          |
| ------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| direct-approve, deferred-approve, codemode-approve, nested-approve        | pty / tui-interactive                      | each actual creation invocation gates; genuine approval precedes exactly one matching receiver effect; nested parents linked |
| direct-reject, deferred-reject, codemode-reject, nested-reject            | pty / tui-interactive                      | actual inner gate denies; zero effects; no outer-only gate substitute                                                        |
| direct-readonly, deferred-readonly, codemode-readonly, nested-readonly    | sdk / sdk-pipeline                         | actual creation reaches gate/readonly refusal, no approval/effect; reads succeed                                             |
| no-companion, generic-readonly                                            | sdk                                        | absent vs connected readonly distinguished; no available creation effect                                                     |
| static-shadow, normalized-collision, normalized-collision-reversed        | sdk (PTY corroboration where feasible)     | conflict rejected before write enablement; normalized aliases do not create a second writable path                           |
| replacement-mcp, replacement-codemode, missing-mcp, unsupported-inventory | sdk                                        | unsupported resource profile rejected before write enablement; no unhandled writable registration                            |
| mode-print, mode-json, mode-rpc-has-ui, no-ui                             | sdk (CLI mode observations where feasible) | non-tui/no-UI cannot register write capability or autoapprove; actual ctx.mode distinguished from hasUI                      |
| handler-failure                                                           | pty                                        | actual gate exception/error blocks before effect                                                                             |
| approval-dismiss, approval-cancel, approval-timeout                       | pty                                        | distinct stimulus, no late dispatch/effect                                                                                   |
| mutator-boundary                                                          | pty                                        | known diagnostic late handler changes valid input after genuine approval; receiver detects mismatch before effect            |
| sidecar-unavailable, sidecar-malformed, sidecar-stale                     | pty                                        | genuine approval followed by channel fault yields explicit receiver refusal and zero effect                                  |
| binding-missing, binding-ambiguous                                        | sdk                                        | no write enablement; do not infer binding from labels/annotations                                                            |
| binding-invalidate, reload-invalidate, shutdown-invalidate                | pty                                        | invalidation before pending verdict/effect fences it, withdraws capability/listener; no autonomous continuation              |
| hidden-tool                                                               | sdk                                        | actual runtime unreachable/hidden call gives no effect                                                                       |
| calibration-unguarded                                                     | isolated diagnostic control                | independent fixture ledger observes deliberately permitted counter effect; failure invalidates zero-effect evidence          |
| calibration-mutation                                                      | isolated diagnostic control                | independent received vs approved digest differs and is observable; failure invalidates integrity evidence                    |

The registry is an API: if a harness combination is unavailable/blocked, report it, don't
silently substitute logic control. At minimum actual SDK paths, four positive/negative
PTY routes, actual handler mutation, conflicts/modes/lifecycle and both controls must have
specific passing evidence before T02 acceptance. Additional matrix variants from QA may
be requested through coordinator, not implemented by inspecting experiment internals.
Full hostile/long/narrow production preview and durable replay remain later gates.

## 8. Public observation/metadata clarifications

These are shared interface decisions, not permission to infer internals from tests.
Metadata filename: `experiments/t02/metadata.json`. It contains synthetic:true,
schemaVersion:1, runtime (exact node/npm/pi/sdk strings and integrity references),
entries (relative fixture/companion/driver paths), scenarios (name + supported harnesses),
layers and resourceAliases. All report trace payload fields are **top-level** in each
record, beside seq/source/type/layer; no unspecified payload/data wrapper.

- preflight: mode, hasUI, uiInjected, supported, reason, inventoryProvenance and
  resourceAliases. mode/hasUI observations must come from actual selected-runtime context
  or genuine mode adapter, not a driver's desired flag. Generic read-only fallback is
  recorded separately from guarded-profile preflight rejection.
- registration: server, policy (readonly/guarded/none), registered, connected,
  spawned, reason. Absent/preflight-refused fixture outcomes require an explicit
  policy:none, registered:false, connected:false, spawned:false observation summary
  backed by actual launcher/process state, without inventing a fixture.
- approval_prompt: toolCallId, operationId, stimulus:genuine-pty, decision
  (approve/deny), reason (approved/reject/dismiss/cancel/timeout/error). Capture actual
  native prompt result and separately observed PTY stimulus; no fabricated UI response.
- tool_list: tools (seven unqualified fixture names), source:fixture; emitted only after
  actual MCP discovery, not from a driver's constant list.
- tool_call/tool_result: name, toolCallId, parentToolCallId (string or null);
  tool_result also has isError and code (string or null). code is the actual structured
  execution error code when provided; unstructured host block/unknown-tool errors may
  have code:null with safe reason/category. Do not fabricate write_approval_required to
  make every host exception look like a fixture refusal. Tests must distinguish actual
  gate denial/unavailable-tool observations from receiver execution codes.
- receiver_check/sidecar_verdict: operationId, receivedDigest, approvedDigest (null if
  unknown), tupleMatch, generationMatch, decision (allow/deny), reason. Mismatch/unknown
  cannot be rewritten as approval. Compare actual emitted observations to canonical input.
- effect_ledger: operationId and digest (null if no admitted call), counter, final:boolean,
  source:fixture. Exactly one final observation per connected fixture per scenario;
  intermediate positive records must not precede approval/receiver allow.
- session: transition (start/invalidate/reload/shutdown), reason; seq orders invalidation
  against subsequent verdict/effect. An afterInvalidation convenience flag is not required
  and cannot replace those ordering/attempt assertions.
- cleanup: childrenGone, listenersClosed, rootsRemoved (booleans), remainingChildren:0
  and remainingListeners:0 on completed cleanup. Mere log presence is not cleanup proof.

Report effects is {source:fixture|none, observation:fixture-final|not-spawned,
total:number, operations:[]}. A connected fixture requires its own final zero/positive
ledger. A deliberately absent/preflight-refused fixture instead requires spawned:false,
no connected guarded registration and an actual error result joined to the attempted
creation call (lack of any result is not an unavailable-call outcome); **never invent
a fixture-origin zero ledger for a process that did not exist**. Absence-only profiles
are distinguished from connected read-only refusal profiles in reports and assertions.

SDK mode-rpc-has-ui must exercise the selected runtime's genuine RPC adapter/UI-presence
semantics (e.g. public runRpcMode or stock isolated RPC mode), with actual mode:rpc,
hasUI:true, no terminal approval and no guarded capability. It is sdk-pipeline, not
TUI; do not fake hasUI:true in a print-context report. A deliberate SDK no-ui probe may
bind mode:tui without uiContext to establish that missing UI blocks; it remains
sdk-pipeline and does not claim genuine TUI. Other SDK mode cases bind their real named
mode with no injected approval UI. If an adapter cannot be driven safely, report blocked.

Metadata and scripts are Developer-owned; QA may read them but requests changes via
coordinator. Driver observations need independent fixture/selected-runtime provenance;
self-consistent canned JSON and boolean claims alone do not satisfy acceptance.

## 9. Stage 2 authorization and reporting

Developer may now implement experiments and agreed shared config, run production/experiment
checks and diagnostic reproduction commands, but never QA suite/fixtures/source. QA may
now independently implement tests against this public contract, but executes experiment
artifacts only after coordinator artifact-ready relay. No readiness polling. Both use
relative paths and sanitized commands/results in asynchronous Herdr messages to coordinator.

Milestones: Developer public metadata/scenario/sidecar contract ready; compiled/launchable
artifact ready; permitted checks/isolated host observations; QA test-source ready;
coordinator review; final independent actual-runtime results/clean-snapshot regression.
Flag missing APIs, CLI inventory limits, IPC race limits and security mismatches immediately.
Do not mark T02 done on documentation, mocked hooks, installed dependencies or skipped
interactive cases. Any inability to meet scoped acceptance stays blocked; do not enable
product writes or change the shared contract to hide it.

## 10. Bounded SDK profile clarification

S1 no-companion/sdk is accepted only as an unavailable-call baseline. This is
not approval/gate/connected-fixture/TUI feasibility. All other scenarios require
their own readiness relay and independent evidence.

S2A generic-readonly/sdk is the native MCP connection to the fixture's generic
read-only default **without an approval companion**, sidecar, binding file or
approval listener. Seven tools are genuinely discovered; get_exercise succeeds;
creation actually reaches the receiver and returns write_approval_required.
Its zero-effect evidence is the receiver's own final ledger, not absent spawn
state or an invented gate result. No gate_installed/approval observation may be
fabricated for this generic profile. Tool annotations alone grant no capability.
Actual SDK context remains print/no UI, and source:fixture discovery is paired
with actual selected-runtime tool availability. The fixture's actual negotiated
protocol replaces the candidate string for connected observations.

Companion-managed direct/deferred/codemode/nested readonly gate routes are
separate later profiles; generic receiver refusal does not prove their gate
invocation. No authorization is implied for those routes, PTY/RPC, integrity or
lifecycle scenarios by implementing S2A. The scenario registry/tool schemas,
canonical seed, report origin rules and acceptance requirements are unchanged.

## 11. Companion-managed SDK refusal distinction

S1 and S2A are accepted only as their bounded unavailable-call and generic
connected-receiver baselines. S2B direct-readonly/sdk is a separate actual
companion-managed profile: the synchronously installed gate must deny the
actual creation call in observed print/no-UI mode. Reads still succeed on the
connected read-only fixture; its own exactly-one final zero ledger is required.
An absent unknown-tool branch cannot substitute for this connected outcome.

The selected runtime's genuine gate-block tool_result may contain only the
safe gate reason, without a structured receiver code or the literal word
"blocked". A nullable host code is acceptable only when the same actual native
creation ID joins a genuine companion gate_invocation denial and isError:true
result. Do not invent write_approval_required or a receiver_check for a call
that never reached the receiver. Record safe reason/category from actual
observations and keep the gate decision distinct from S2A's receiver refusal.
No approval/UI injection, write capability, sidecar/listener or synthetic effect
is enabled by this SDK profile. Other companion routes remain separately held.

## 12. R1/S2B causal and discovery observation clarification

This clarifies the existing R1 `direct-readonly/sdk` evidence interface; it does
not authorize another route, layer or write policy. The public operation/digest
and source rules in §§5–8/11 are unchanged.

- Actual selected-runtime availability is recorded as
  `source:launcher`, `type:first-request-inventory`, `tools:[...]` (the seven
  unqualified fixture names), observed at the first native provider request.
  Pair it with fixture-origin discovery, not a launcher-intended constant list.
  A connected readonly `registration` record must itself carry
  `registered:true`, `connected:true`, `spawned:true`, not split across records.
- Optional companion `registration_declared` records describe successful API
  return with connection pending, not connected proof. `gate_installed` precedes
  declarations, registration, fixture startup/discovery and creation calls.
- Exactly one actual direct creation call and one companion gate invocation
  join by a nonempty native toolCallId and public operationId. The gate records
  `mode:print`, `hasUI:false`, `decision:deny`,
  `reason:mode-not-tui:print`, `attemptedDigest:<public seed SHA256>` and
  `approvedDigest:null`; a denied readonly call is not prior approval evidence.
  `call.seq < gate.seq < result.seq`. Exactly one matching `source:pi`
  error result has the creation name, same ID, null direct parent and
  `code:null`. Unknown-tool or generic receiver refusal is not this outcome.
- No intermediate positive ledger may be hidden by a later zero final. Exactly
  one fixture-origin final zero/empty-operation ledger with explicit top-level
  `operationId:null`, `digest:null` and `operations:[]` (not omitted keys) and a
  genuine runtime shutdown precede final parent cleanup; cleanup is last.

These are observable trace assertions. Source/process review still establishes
that observations originate from actual runtime/fixture callbacks and owned
resource closure; canned validator controls alone are not runtime proof.

## 13. R2 indirect SDK refusal observations

R2 covers only `deferred-readonly/sdk`, `codemode-readonly/sdk` and
`nested-readonly/sdk`. These are actual print/no-UI sdk-pipeline routes, not
approval evidence. All existing isolation, gate, canonical seed, final-ledger,
chronology and cleanup requirements remain. Accepted S1/S2A/direct-readonly
profiles are separate regression obligations. No future scenario is authorized.

- Deferred: an actual native `tool_search` call successfully loads the fixture
  tools before the subsequent native get_exercise and create_routine calls.
  Those two calls have null parents. The search result and subsequent actual
  tool surface corroborate discovery; merely declaring deferred exposure is
  insufficient. Reads succeed without gate invocation.
- Codemode: a real native `codemode` call runs a script which first awaits
  get_exercise and then attempts create_routine through the actual nested
  pipeline. Both inner calls carry the outer native ID as parent. The denied
  creation's error may fail the outer script; an outer result alone never
  establishes either read success or inner gate denial.
- Nested: a real native `t02_orchestrate` call first awaits get_exercise and
  then attempts create_routine through public nested execution. Both inner
  calls carry that actual outer ID as parent. The inner denial must be
  observable regardless of the outer result. No transcript-only synthetic
  inner calls or generated parent IDs are accepted.
- Each R2 route has exactly three native tool_call records and three native
  tool_result records: its one search/outer plus one read plus one creation.
  All six have source:pi; call IDs are nonempty and unique, and every call
  joins exactly one later result with the same ID, name and parent. The
  deferred search result and search_loaded observation both follow its call
  and precede the read call. No unrelated/extra native calls can be ignored.
  First-request fixtureTools is an explicit array (empty if undiscovered).
  The creation ID/parent join exactly one companion deny and one native
  isError:true/code:null result in `call < gate < result` order. The gate
  has mode:print, hasUI:false, reason:mode-not-tui:print, public operationId
  and attemptedDigest, approvedDigest:null. No receiver creation check,
  approval prompt, sidecar verdict, guarded registration or effect is allowed.
- `tool_surface` records (source:launcher) describe observations from the
  selected runtime: `phase` (`first-request` or `connected`), `activeTools`,
  `callableTools`, `hiddenTools` (arrays of actual qualified names), and
  `fixtureTools` (the seven unqualified names when connected). They are not
  intended settings. First-request surfaces may precede indirect discovery;
  a later connected surface pairs actual fixture-origin tool_list with native
  availability. Deferred also records `search_loaded` (source:pi), with
  `toolCallId` equal to the actual tool_search ID and `loadedTools` equal to
  its actual result's loaded names, exactly the seven qualified fixture names.
  Neither observation may contain tool arguments, scripts, binding or paths.
  Array order is immaterial; duplicates are invalid. Exactly one surface of
  each phase is required. `hiddenTools:[]` in both phases; no hidden fixture
  or unrelated active/callable tool is allowed. Exact active/callable sets:

  | Route | First-request activeTools | Connected activeTools | Connected callableTools |
  | --- | --- | --- | --- |
  | deferred | tool_search only | tool_search + seven qualified fixture names | seven qualified fixture names |
  | codemode | codemode only | codemode only | seven qualified fixture names |
  | nested | t02_orchestrate + seven qualified fixture names | same | same |

  First-request callableTools for deferred/codemode may contain only a subset
  of the seven fixture names (connection may still be pending); it must not
  contain the model-only outer tool. First-request nested callableTools is
  its complete active set. First-request fixtureTools reflects actual
  registered fixture definitions (possibly absent for indirect profiles);
  connected fixtureTools is exactly seven unqualified names. The connected
  snapshot and registration must follow fixture discovery and precede
  creation; a read success must precede the creation attempt. Outer calls
  have null parents, precede inner calls, and finish after both inner results.
- Each connected route requires its own same-record readonly registration
  registered:true/connected:true/spawned:true after actual discovery, exactly
  one fixture final0 with own operationId:null/digest:null/operations:[],
  genuine runtime shutdown, and last parent cleanup after owned closure.

This adds observable clarification, not scenarios, dependencies, a harness,
write capability, or a weakening of the accepted direct profile's §12 surface.

## 14. R3 SDK prebind refusal and hidden reachability observations

R3 is exactly the ten registered SDK scenarios static-shadow,
normalized-collision, normalized-collision-reversed, replacement-mcp,
replacement-codemode, missing-mcp, unsupported-inventory, binding-missing,
binding-ambiguous and hidden-tool. Six accepted SDK profiles are regressions.
No new scenario, layer, approval policy, dependency or product write is added.
These requirements clarify §§1/6–8, not substitute expected reasons for stimuli.

For the first nine cases the controlled launcher refuses the actual target
profile **before bind/session_start/connection**, independently of print mode.
It then disposes that unbound target and uses a separately identified, closed
no-companion/no-server native session solely to observe an actual unavailable
creation attempt. This is an explicitly labeled refusal-probe session, not a
claim that the rejected profile was successfully bound or that its companion
provided a per-call denial. The probe cannot load static servers or diagnostics,
borrow target registrations, or enable a generic/guarded fallback.

Required flat observations (source:launcher unless otherwise stated):

- One `resource_inventory` for `runtimeRole:target`, obtained from the actual
  SDK loader before binding. Safe `inlineProfiles` identify each entry's
  `path` (named inline alias only), registered `handlers`, `tools`, `commands`
  and `replaceable` boolean. `loaderErrors` and `loaderWarnings` are explicit
  arrays; unexpected errors/warnings fail the harness, not pass a scenario.
  No raw external paths or error bodies. `inventoryProvenance:actual-sdk-loader`.
- One `static_settings` describes the actual closed launcher-owned effective
  MCP configuration, before binding: `runtimeRole:target`,
  `settingsProvenance:launcher-owned-loadConfig`, `names` in insertion order,
  `entries:[{name, namespace, enabled, exposure, resourceAlias, policy}]`.
  Configurations name only the inert-by-default synthetic readonly fixture;
  `enabled:true`, `exposure:direct`, `resourceAlias:fixture:t02`,
  `policy:readonly`. No executable, argv, env, socket or path values in reports.
  An empty static set has explicit `names:[]` and `entries:[]`. This is the
  actual configuration boundary supplied to the native MCP factory, **not**
  a claim of native default-file-parser or arbitrary CLI behavior.
- One `binding_check` records only `runtimeRole:target`, `present`,
  `candidateCount` (0, 1 or 2), `valid`, and safe `reason`.
  Good trusted synthetic binding: true/1/true/`binding-ok`; missing:
  false/0/false/`binding-missing`; ambiguous: true/2/false/`binding-ambiguous`.
  Ambiguity is two independently valid candidate bindings in the trusted
  negative input, not a model label or fabricated boolean. No tuple values,
  hashes of private bindings or filenames are observable. Neither ambiguous
  candidate may be selected. This negative input does not alter tool schemas.
- One `prebind_check` joins that target evidence: `runtimeRole:target`,
  `supported:false`, the specific reason below, `targetBound:false`,
  `targetLoadConfigCalls:0`, `targetTransportAttempts:0`,
  `registrations:[]`. It precedes target disposal and probe binding/attempt.
  Exactly one `target_disposed` follows awaited native target disposal,
  with `runtimeRole:target`, `shutdownObserved:true`, `targetBound:false`.
  Target disposal does not fabricate a start or a bound mode for the target.
- `session-context` for `runtimeRole:refusal-probe` observes actual print,
  hasUI:false, uiInjected:false, empty registrations. Its `preflight` summary
  has those same actual context fields, supported:false, the same specific
  target reason, `targetBound:false`, `inventoryProvenance:actual-sdk-loader`;
  summary is not the earlier decision's stimulus. One same-record
  policy:none/registered:false/connected:false/spawned:false registration
  precedes creation, backed by empty registrations/configuration, zero native
  transport attempts and no ledger/listener. That registration carries explicit
  `runtimeRole:refusal-probe`, `transportAttempts:0` and `loadConfigCalls` as a
  positive integer from the actual native empty-config callback. No separate
  transport-attempt record is required when there were zero attempts; any actual
  attempt is a harness failure, never a verified absence. Probe
  `resource_inventory` is separately labeled and cannot substitute for target
  inventory. `session-context` is the literal hyphenated type; the role and all
  observation fields remain top-level. Namespace `mcp__synth_gt` names the
  server namespace; `mcp__synth_gt__` is the tool-name prefix with its delimiter.
- Exactly one actual source:pi creation `tool_call` and later `tool_result`
  join nonempty native ID/name, explicit null parent, isError:true/code:null,
  reason:unknown-tool. No gate_invocation may substitute for this result.
  No fixture-origin record/ledger, read success, listener, sidecar, approval,
  registration declaration or guarded registration may be invented. Effects
  are source:none/observation:not-spawned/total:0/operations:[], corroborated
  by zero target and probe transport attempts plus process/closure review.

Specific target evidence/refusals (not interchangeable mode-only reasons):

| Target | Required observed distinction | prebind_check/preflight reason |
| --- | --- | --- |
| static-shadow | static names exactly [synth-gt], namespace mcp__synth_gt | static-shadow |
| normalized-collision | names exactly [synth-gt, synth_gt], both namespace mcp__synth_gt | normalized-collision |
| normalized-collision-reversed | names exactly [synth_gt, synth-gt], same normalized namespace; no second writable path | normalized-collision |
| replacement-mcp | actual diagnostic /mcp owner present; native replaceable MCP entry omitted | replacement-mcp |
| replacement-codemode | actual diagnostic codemode owner present; native replaceable codemode entry omitted | replacement-codemode |
| missing-mcp | neither native MCP entry nor replacement /mcp owner loaded | missing-mcp |
| unsupported-inventory | actual additional unknown resource/registered command present, outside supported profile | unsupported-inventory |
| binding-missing | observed missing trusted binding, never labels/annotations | binding-missing |
| binding-ambiguous | two valid trusted candidates, neither selected | binding-ambiguous |

hidden-tool is different: the supported target is actually bound print/no-UI
with one connected readonly fixture and no sidecar/listener. Its
`prebind_check` is supported:true/reason:profile-ok/targetBound:false and its
actual context `preflight` is supported:true/reason:hidden-readonly-profile.
The companion's gate installation precedes readonly declaration/discovery.
There is exactly one first-request and one connected `tool_surface`: both
have the six qualified read names as activeTools/callableTools,
hiddenTools:[mcp__synth_gt__create_routine], and fixtureTools equal to the
six unqualified reads. The actual hidden exposure is obtained from registered
ToolInfo, not registered-minus-callable or lack of model declaration.
Pair this with fixture-origin discovery advertising all seven tools and a
same-record readonly registered/connected/spawned:true observation after
actual discovery and before calls. Exactly two native direct null-parent
calls/results: successful get_exercise followed by actual creation
isError:true/code:null/reason:unknown-tool with a joined native ID. No
creation gate_invocation or receiver_check exists because it is unreachable,
not a print-mode block. One fixture-origin final0 with explicit
operationId:null/digest:null/operations:[] is required; no intermediate effect.

All cases preserve physical append chronology, native shutdown and final
parent cleanup after owned close/reap/listener closure/root removal. Target
and probe resources/lifecycle are distinct; do not reset a producer's sequence
when changing runtime. Limits/unknown cleanup/malformed or missing evidence
fail explicitly and cannot become completed:true or verified zero. Source and
process review corroborate launcher-level refusal and safe entries. This
closed SDK boundary does not certify standalone arbitrary CLI companion
inventory, genuine PTY conflict handling, or OS sandboxing; R5 corroboration
remains held. Existing §§10–13 assertions and six SDK regression obligations
are unchanged.
