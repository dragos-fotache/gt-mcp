# T02 R3 — bounded SDK preflight / binding / hidden reachability

**PARKED / HISTORICAL ONLY:** the user parks T02 and selects
[configuration-only routine creation](../decisions/routine-creation-config-policy.md):
no custom/external permission extension or per-routine approval. Shared MCP
draft0.2 supersedes the old product approval policy. Preserve this document as
the original experiment/design/succession record; do not rewrite old assertions
or failures as current-policy passes. No further R3–R11 execution, automatic
succession or artifact QA relay is authorized. R3 remains an unaccepted candidate.
All "latest", "OPEN", authorization and next-slice instructions below are
historical and overridden by this parking notice.

**Audience:** coordinator/Developer ONLY. QA receives public spec §14, never
this design or coordinator source/probe/readiness records.
**Owner:** coordinator / w4:p2K, fresh Developer / w4:p2G.
**Status:** DESIGN COMPLETE; bounded Developer window authorized by the direct
assignment message. QA target execution remains CLOSED until exact artifact relay.
Standing authority: fixed R3 only, after TAKEOVER and both fresh oriented READY.
13 slices total:4 accepted +9 remaining; six SDK profiles accepted,35 unverified.

## Scope and ownership

Exactly ten /sdk targets: static-shadow, normalized-collision,
normalized-collision-reversed, replacement-mcp, replacement-codemode, missing-mcp,
unsupported-inventory, binding-missing, binding-ambiguous, hidden-tool.
Regressions: no-companion, generic-readonly, direct-readonly, deferred-readonly,
codemode-readonly, nested-readonly, all sdk. No other diagnostic/target/harness.

Developer allowed package (all paths below under experiments/t02/):

- NEW driver/sdk-preflight-worker.mjs; optionally NEW driver/r3-report.mjs for
  parent report validation. No alternate public harness or arbitrary option.
- driver/run.mjs: bounded dispatch/input setup/shared-journal/report call only;
  preserve accepted branches and their existing assertions.
- driver/scenarios.mjs: replace three static placeholders with closed launcher
  configuration descriptors; fix the two collision insertion orders; set
  unsupported-inventory to include companion and actual unknown diagnostic;
  hidden turns become read then create. No registry name/count/harness changes.
- NEW companion/diagnostics/probe-unknown-resource.mjs: known noop command only.
  Existing probe-replacement-mcp.mjs and probe-replacement-codemode.mjs only if
  narrowly necessary to retain the inert replacement ownership signatures.
- metadata.json: accurate implemented/launchable/candidate paths/profiles only.
  Do NOT mark R3 accepted before independent acceptance/window closure.
- companion/index.ts only for a narrowly necessary hidden/preflight correction;
  no approval/sidecar/TUI redesign or future-slice changes. Current hidden support
  is already implemented as trusted T02_HIDE_CREATE=1 in the readonly branch.

Generated dist produced solely by t02:build. Preserve fixture server, accepted
sdk workers, provider, roots, report/journal protections, schemas, package/config/
lockfile, production src/ and companion/src/. If changes to a preserved path are
necessary, STOP with exact specification-level need before editing it.
No QA source/fixtures/plans/evidence/diagnostics reads or tests. No staging/commit,
credentials/live service, user Pi configuration/shared-docs/local .pi change.
No new dependency/compiler exception/scope or slice expansion.

## Coordinator-selected architecture (not delegated discovery)

Public observable authority: docs/decisions/t02-approved-experiment-spec.md §14,
plus unchanged §§1–13 and shared tools/C10–C12. Use pinned Node24.21.0,
npm11.19.0/Pi1.1.0 and the locked host-resolved unbundled runtime.

First nine cases deliberately fail at the **launcher-owned prebind boundary**.
Never bind the rejected target, never rely on print refusal. Dispose its actual
native unbound runtime, then create a SEPARATELY LABELED closed absence-only
refusal-probe runtime to obtain a real unknown-tool call/result. This is not
per-call companion proof; do not claim the rejected profile bound successfully.
Hidden uses the actual target runtime and connected readonly fixture; no probe.
No runtime emits canned calls/results/gates or substitutes static intended flags
for inventory, binding/file state, tool reachability or actual contexts.

### Common native setup

Reuse accepted ModelRuntime.create with explicit disposable authPath, modelsPath:
null, modelsStorePath, allowModelNetwork:false, refreshOnCreate:false; register
native scripted handle.provider and pass SAME modelRuntime/handle.getModel into
services/session. In-memory settings defaultTools:[], retry disabled/maxRetries:0,
compaction disabled. Provider turns from fixed registry, no live fallback.

Use public createAgentSessionServices / createAgentSessionFromServices inside
createAgentSessionRuntime. No Pi internals imports, loader overrides, patched
pipeline, synthetic contexts or event invocation. All resource discovery disabled
(noExtensions/noSkills/noPromptTemplates/noThemes/noContextFiles:true).
Original compiled companion import path, never relocation/pre-spawn.
excludeTools:[t02_orchestrate] on both target/probe; no models capability in
native codemode factory: createCodemodeExtension({mode:'on',models:false}).

The target order is companion, native codemode, native tool-search, native MCP,
observer, optional known diagnostic last. Named inline aliases t02-companion,
t02-codemode, t02-search, t02-mcp, t02-observer. **Mark native codemode and MCP
replaceable:true in R3 ONLY** so actual loader omission proves replacement;
load/register diagnostics normally. Never manually filter the returned inventory.
Missing-MCP omits the native factory AND has no /mcp diagnostic. Unknown profile
adds probe-unknown-resource, which registers only inert /t02_unknown; companion
remains present, unlike obsolete companion:false scaffold. Observer registers
only actual session_start/session_shutdown handlers and snapshots registrations.

Before target bind, inspect actual resourceLoader.getExtensions(): errors,
warnings, names, handler/tool/command maps and replaceable flags. Record safe
inline aliases and explicit arrays. For supported/non-resource fault profiles
require the accepted five-entry exact signature (same R2 handlers/tools/commands),
with R3 replaceable flags as above. Replacement-MCP must actually omit native
MCP and include /mcp diagnostic owner; codemode replacement analogously must omit
native codemode and include diagnostic codemode tool. Missing must omit both
native MCP and replacement /mcp. Unknown must include the actual extra command.
Unexpected differences/errors/warnings block the harness, not become the expected
negative. Inline replaceable omission has ZERO loader warnings on pinned runtime;
record actual warnings, never fabricate a builtin warning.

### Static settings: closed actual callback boundary

Replace command:'node'/args:['shadow*'] placeholders. Bootstrap writes private
0600 agent-root mcp.json ONLY, with autoEnableCodemode:false and these entries:
process.execPath, original approved fixture path, --t02-ledger-file <owned ledger>,
--t02-event-journal <owned journal>, timeout:10, exposure:'direct', enabled:true.
No sidecar/binding flags, env expansion/commands, shell, network or unknown entry.
This is an inert-by-default readonly fixture even if a safety guard faults.
Never write repository .pi. All static files are disposable launcher-owned state.

static-shadow: one 'synth-gt'. normalized-collision: two entries in insertion order
['synth-gt','synth_gt']. reversed: ['synth_gt','synth-gt']. Both collision entries
use the SAME safe fixture descriptor; only order changes. For other profiles the
static configuration is empty. Registry descriptors supply names, not runnable
arbitrary commands. Worker validates exact closed command/args/path/flags/timeout/
policy before trusting the snapshot. Any mismatch blocks execution.

Read this actual private file once into the native createMcpExtension loadConfig
callback's closed immutable LoadedMcpConfig-shaped snapshot (servers array with
name/config/source/scope:global, errors:[], autoEnableCodemode:false). Preflight
examines the SAME snapshot; do not log one set and give another to native MCP.
This callback boundary is public and launcher-owned; NO internal loadMcpConfig
import, default-parser emulation claim or ambient CLI claim. Because the target
is refused before bind, callback invocation count stays 0 and no config is
connected. Snapshot field/shape checks are not runtime/native parser proof.

Static observation preserves raw insertion order and normalized namespace using
hyphen-to-underscore rule for these two allowed names. One exact shadow vs two
normalized colliding names yield distinct specific preflight reasons from actual
contents, never scenarioName alone. Complete all inventory/static/binding checks
before deciding. Expose only §14 safe alias/config fields, never raw argv/paths.

Wrap native target createTransport with an accounting **fail-closed guard** for
first nine profiles: record safe server alias/count then THROW before spawn.
It must never be called, since target is never bound. Hidden uses default native
transport, not a custom pre-spawn/replacement. Guard is secondary safety, not the
observed refusal stimulus. Strictly count any attempt as failure, not a pass.

### Trusted binding checks

Ordinary profiles receive the same strict single synthetic binding as R1/R2.
Missing: no file, no T02_BINDING_FILE value; don't seed an empty file.
Ambiguous: trusted launcher-owned file contains an array of TWO distinct, fully
valid candidate objects with exact four binding fields; use synthetic values
only (e.g. same synthetic account/origin/profile with generations7 and8).
Each must be independently checked as a valid tuple; cardinality2 refuses BOTH.
Good object count1; absence count0. Invalid unrelated/malformed content is harness
failure, not accepted binding ambiguity. Candidate arrays are a trusted negative
stimulus, not a new approved product binding schema. No tuple values/filenames or
hashes enter reports, session entries, model arguments/results or instructions.
Binding faults have otherwise supported inventory and empty static settings.
Decision is based on real file data/cardinality, never annotations or labels.

### Refused target and native probe lifecycle

Construct native target runtime, observe actual inventory/snapshot/file state,
record prebind_check (§14) with reason derived from checks; supported:false,
targetBound:false, targetLoadConfigCalls:0, targetTransportAttempts:0,
registrations:[] from actual registered-server snapshot. No bind/prompt/start.
Call await targetRuntime.dispose(): pinned public teardown emits genuine shutdown
even for unbound target and closes companion journal descriptor. Require observer
shutdown, no target startup/transports/registration/ledger/socket. Record
source:launcher target_disposed after awaited disposal. Do not invent target mode.

Create native refusal-probe runtime with only accepted no-companion codemode/
search/MCP/observer profile; empty loadConfig and guarded-throw transport accounting,
no diagnostics/static settings/companion. Never reopen/reload companion. Record
its own runtimeRole:refusal-probe inventory separately. Actual native bind print,
observe ctx.mode/hasUI (no UI), source:launcher preflight summary supported:false
and the SAME specific refusal reason. Source:launcher none registration before
call with all same-record registered/connected/spawned:false booleans from actual
state. One direct creation turn, then done; exactly one actual native start/end,
null parent, joined ID, isError:true/code:null/reason:unknown-tool. After prompt
recheck empty registration/config, zero transports, ledger absent and sockets0.
await probeRuntime.dispose and observe native shutdown before worker cleanup.

Keep ONE sdk-worker shared-journal writer throughout; original companion is
loaded/disposed exactly once per scenario, so its pseq does not reset. Journal
reader retains the existing companion-enabled provenance profile and all caps.
All callbacks append into the SAME physical order. No merged/sorted trace logs.

### Hidden target

Single supported target (normal five-entry inventory), empty static set, good
single binding, T02_HIDE_CREATE=1, exposure direct. No second runtime. Gate installs
at actual factory load, target prebind_check supported:true/reason:profile-ok,
targetBound:false; bind native print without injected UI; actual preflight
supported:true/reason:hidden-readonly-profile. Existing companion owns ONE readonly
native fixture. First native request waits for direct discovery. Capture actual
active/callable arrays and ToolInfo.exposure:hidden via public session methods.
Exactly six reads active/callable, create hidden. Record one first-request surface
and one connected surface, explicit six unqualified fixtureTools (callable-derived),
one connected registration after fixture listing and before read/create. Hidden
registration is NOT inferred from omission or an inactive/model-only tool.

Turns: native get_exercise public seed first; require real success, then actual
direct creation attempt with public seed. Native hidden unavailable-tool result
is error/code:null/reason:unknown-tool, with real ID/null parent. No creation gate
invocation or receiver check; any mode-not-tui gate denial is WRONG for hidden.
Exactly two native start/end pairs and order read.call<read.result<create.call<
create.result. Require actual seven-tool fixture listing and negotiated protocol,
readonly registration, exactly-one fixture-origin final0 with explicit nulls and
operations:[], own ledger final0, native shutdown and final parent cleanup.

## Parent dispatch / completion design

New worker uses shared-journal channel for all ten R3 cases. run.mjs dispatches
only these10 plus accepted6; keeps existing accepted assemblies untouched.
Write binding/static inputs and set T02_HIDE_CREATE only for hidden. All child
environment from existing buildExperimentEnv/prepareRoots before any Pi import.
Target worker budget55s, prompt<=50s, MCP10s; parent waits close/reap and group
ESRCH before reading/report/removal, no detached survivor pass. Physical journal
reader readSharedJournal(...,'direct-readonly') retains provenance/caps/pseq checks.
R3 parent report validation may be isolated in r3-report.mjs, no cross-slice refactor.

Validate §14 observations/causal order/real ID joins independently of worker result.
Absent9 require no fixture record or ledger, no registration declaration, gate
invocation/approval/sidecar/receiver/guarded capability, zero native transports and
actual unavailable attempt. Do not turn missing/malformed connected ledger into
absence. Hidden requires actual listing/surfaces/read/unavailable create/final0.
No positive intermediate effects, no nullable omitted-field equivalence.
All missing/unexpected fields, cleanup uncertainty, oversized/malformed journal,
failed probe/output/run => completed:false/exit1/effects unverified:null, never0.
On healthy observed denial exit0 is not QA verdict. Root/stdout/out contract unchanged.

No production change or guarded registration anywhere in R3. Static/collision
is launcher-level rejection, not native parser/PTY/standalone companion certification.
R5 remains the fixed later interactive corroboration. R1 ambient CLI, IPC and
non-OS-sandbox limitations remain. Budget/failure calibration remains R10.

## Review checkpoint and permitted execution

Coordinator has read pinned extensions/MCP/SDK/TUI/codemode/config/settings docs,
relevant public declarations/native source and SDK14/full-control/session-runtime/
permission-gate/dynamic-tools examples, plus authority/spec/accepted records.
A disposable coordinator wiring probe observed actual replaceable MCP omission
(no errors/warnings, loadConfig0), genuine unbound native shutdown/no spawn, and
actual hidden six-read active/callable surface plus native hidden unknown-tool
result and fixture final0. Those are mechanism probes ONLY, not R3 readiness or
QA acceptance. Probe highlighted journal producer reset on reloading companion;
this design avoids any companion reload/two-companion sequence. No API ambiguity
is delegated. Any departure requires coordinator decision first.

Run these four permitted checks serially (no suite/whole-file tests/diagnostics):
export PATH="$T01_NODE_HOME/bin:$PATH" for EACH shell; verify selected versions.
1. npm run typecheck
2. npm run t02:build
3. npm run lint:t02
4. npm run format:check:t02

Then public run.mjs diagnostics, serially, exactly R3 ten + accepted six /sdk,
using private disposable output paths, not repo artifacts. No npm test/check,
no Vitest, PTY/RPC/future registry runs. Preserve stderr/output agreement and exit/
completion boundaries; unknown owned resources STOP, never global kill or polling.

Send one asynchronous artifact-ready milestone to coordinator/w4:p2K with
changed paths, four check results, exact named diagnostic results, safe observations,
artifact/metadata/lock SHA256 and owned-resource closure. Do not self-certify QA.
Then STOP ALL source/build/diagnostic/metadata writes/runs; frozen coordinator
review then exact QA relay. Coordinator sends specification-level fixes only.
Metadata acceptance reconciliation happens after QA window closure in separate
bounded Developer-owned window. Any check/failure/security/API uncertainty stops
this slice/chain; no skipped gate or new slice to evade it.
