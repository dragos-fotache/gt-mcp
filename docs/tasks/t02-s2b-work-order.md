# T02 S2B companion-managed SDK refusal

**HISTORICAL / T02 PARKED:** user-selected config-only routine creation supersedes
the custom/external permission-extension plan. Shared MCP draft0.2 is aligned;
no further T02 execution/succession or QA artifact relay. Preserve original evidence
and failures; R3 remains an unaccepted candidate. See
[the current decision](../decisions/routine-creation-config-policy.md).
Instructions/windows below are historical, not current execution permission.

**Audience:** coordinator/Developer only; not QA input.
**Disposition:** R1/S2B ACCEPTED after strict final-ledger repair; the authorized
slice is complete. This work order is retained as design/repair history, not
renewed execution permission. S1/S2A regressions passed; R2-R11 remain paused.
No deferred/codemode/nested, conflicts, modes/RPC, sidecar/integrity, PTY or ADR.
**Execution window CLOSED:** repaired artifact passed strict independent R1
acceptance, S1/S2A selections and34/34 validator controls; coordinator repeats
passed on the same artifact. The first QA explicit-null failure is preserved.
Post-acceptance metadata-only reconciliation is complete. No assertions relaxed,
no next slice assigned. Live replies remain `coordinator` / `w4:p2D`. Stop here.

Historical design, required observations and repair recipe follow; future commands
in this record do not authorize reruns while the slice windows are closed.

## Coordinator-fixed design and genuine API probe

Coordinator ran the current compiled companion through a sanitized disposable
actual AgentSessionRuntime with native faux provider and closed named factories.
Companion loaded FIRST, native MCP empty loadConfig supplied afterward, print
binding; excludeTools:["t02_orchestrate"]. A private synthetic tuple file enabled
its read-only registration, not write capability. The original compiled path
preserved fixture-relative resolution; there is no copied extension.

Actual read succeeded. Actual creation gate recorded mode:print/hasUI:false,
operationId and attempted seed digest, decision:deny/reason:mode-not-tui:print,
matching the native call ID. The execution-end/toolResult was isError:true with
text `t02 mode-not-tui:print`, not a structured receiver envelope and not a
message containing the word "blocked". The initial coordinator probe's textual
"blocked" assumption failed; genuine event inspection resolved it. Both native
execution endpoints exist. Receiver had no creation check, and its own exactly-one
final ledger was zero. Native runtime.dispose triggered genuine shutdown.
This is design wiring evidence only, not S2B artifact acceptance.

Keep gate logic intact. Do not fabricate write_approval_required or a receiver
check for a call stopped before receiver execution. Public section8/11 explains
nullable host-code evidence with the actual joined gate denial.

## Exact changes and interfaces

- Add driver/sdk-gate-worker.mjs using proven native setup and shared journal.
- Extend driver/run.mjs only for direct-readonly/sdk dispatch and its evidence
  profile; preserve S1/S2A behavior and failure/cleanup handling.
- Add driver/event-journal.d.mts, narrowly declaring the existing JS writer/reader
  API for strict NodeNext companion imports; no config/skip rules/dependencies.
- Extend driver/event-journal.mjs reader with an explicit profile argument:
  default generic-readonly permits only existing producers; direct-readonly adds
  companion=>source:companion. Do not globally relax S2A provenance.
- Companion index.ts: import that existing shared writer; initialize producer
  companion from explicit launcher-owned shared journal at factory load. Emit
  actual gate_installed immediately after synchronous pi.on("tool_call") returns,
  BEFORE any start/registration. Route all observations through the protected
  single-append writer while the shared channel is active; no posthoc log merge.
  Preserve legacy separate trace behavior when no shared channel is supplied.
- In the companion's non-TUI registration only, emit registration_declared for
  the successful API return with pending connection state. The worker confirms
  public registration:readonly only after actual native discovery/startup.
- Pass trusted --t02-event-journal from the readonly registration to its one
  fixture. No sidecar/binding flags to the receiver; binding remains private
  companion data, never model arguments/results/session entries. Gate/schema/
  canonicalization/approval/sidecar/counter logic and diagnostics stay unchanged.
- metadata.json: relative new worker path and candidate subset; reconcile stale
  S1-only status to accepted/launchable S1/S2A, without claiming S2B acceptance
  before independent verification or listing nonexistent files as launchable.

The original design expected no fixture-server change. QA exposed an existing
§8 contract defect; the following narrowly bounded repair replaces that assumption.
No sdk-s1/sdk-readonly rewrite, scenario/registry/tool-schema/config/manifest/lock
changes or production/personal-state access.

### R1 acceptance repair: final zero ledger

This is a repair of R1's already-required final-ledger evidence, not a new scenario,
functional subsystem, dependency or execution slice. The fixed total remains
13 slices, with R1 still unaccepted and R2-R11 paused.

- Developer may additionally edit only the `finalize` zero-ledger serialization in
  `experiments/t02/fixture-server/server.mjs`: when operations is empty, emit
  explicit top-level `operationId:null` and `digest:null` in both public shared
  effect_ledger and the independent owned-file final record. Keep operations:[],
  total/counter0 and exactly-once finalization. Do not stamp the attempted seed as
  an admitted operation; a gate-blocked call was never admitted by the receiver.
- Preserve nonempty-operation serialization/counter behavior for future unverified
  profiles. No creation handler, sidecar, validation, registration or gate changes.
- Narrow `driver/run.mjs` connected-final validation for R1/S2A must reject missing
  or non-null no-admission fields rather than declaring such evidence ready.
- Run the same four permitted checks and only public R1/S1/S2A diagnostics, then
  STOP source/build changes and report new fixture/driver artifact hashes.
- QA retains its strict explicit-null assertion and all tests/controls; no target
  execution until the coordinator reviews the repair and sends a fresh exact relay.

Pinned public execution-start events expose args, toolCallId, toolName and optional
parentToolCallId. Extract only the safe operationId from the actual creation
`event.args`, never a registry constant or raw body. Execution-end events supply
actual result/isError. Use native IDs and null direct parents; a safe gate-denial
category requires the joined genuine gate, not a text-only guess. Close owned
shared-journal descriptors after each producer's last genuine observation and
await AgentSessionRuntime.dispose for native shutdown.

## Worker profile and lifecycle

Explicitly import the original experiments/t02/dist/index.js (not a staged copy)
inside the sanitized worker. Use named inline companion first, then installed
codemode/search/MCP/observer. Inspect actual loader names/surfaces/errors before
bind. Companion registers t02_orchestrate in inventory; exclude it from model
tools using public createAgentSessionFromServices excludeTools. Require seven
actual MCP tools in the first native provider request and no unrelated tools.
Native MCP loadConfig is empty: the actual companion registerMcpServer call owns
the only fixture; no manual pre-spawn or generic configuration substitute.

Before startup, create the strict private synthetic tuple using the approved
origin/account/session/profile fields. Use the existing fixed synthetic tuple,
not user data, annotations or model labels. All directories/files are private,
complete worker environment closed. print/no UI; no injected approvals/listener.

Actual callback journal ordering: gate installation; loader inventory; actual
context; companion readonly declaration; fixture startup/protocol/list; observed
first-request tool inventory/connected readonly confirmation; native read call/
result; native creation call; companion deny; native error result; genuine
shutdown/receiver final; last parent cleanup after owned-group/stdio/root closure.
Do not synthesize chronology, desired verdicts or counters. Shared producer
sequences/global append order stay validated; all budgets/failure rules apply.

## Required evidence and commands

Exactly one source:companion gate_installed precedes registration. Exact creation
call ID joins native gate_invocation deny mode print/noUI with public seed digest
and a native isError:true tool_result. code:null is correct for the actual host
result; safe category gate-denial must be corroborated by that real gate event,
not inferred solely from arbitrary text. Unavailable/unknown-tool is not a pass
for this connected case. The read genuinely succeeds; seven tools are discovered.
No approval prompt, write-capable registration, sidecar/listener, receiver create
check or dispatch. Exactly one independent fixture final ledger total0/ops[].
Keep gate observation distinct from generic S2A receiver refusal. Observe actual
protocol, native shutdown, owned process/listener/root closure. Unknown fails.

Run selected toolchain typecheck/t02:build/lint:t02/format:check:t02, then only
public direct-readonly/sdk and no-companion/sdk + generic-readonly/sdk regression
commands. No QA suite/fixtures/source/evidence/diagnostics/diffs; no other matrix.
Send sanitized commands/layers/IDs/gate/refusal/ledger/cleanup, then STOP. Report
precise API/budget/ownership blockers, never grow the assignment independently.
Coordinator reviews and reruns before authorizing one-case QA execution.
