# T02 finite remaining execution plan

**PARKED / HISTORICAL ONLY:** the user parks T02 and selects
[configuration-only routine creation](routine-creation-config-policy.md):
no custom/external permission extension or per-routine approval. Shared MCP
draft0.2 supersedes the old product approval policy. Preserve this document as
the original experiment/design/succession record; do not rewrite old assertions
or failures as current-policy passes. No further R3–R11 execution, automatic
succession or artifact QA relay is authorized. R3 remains an unaccepted candidate.
All "latest", "OPEN", authorization and next-slice instructions below are
historical and overridden by this parking notice.

**Audience:** coordinator/Developer only. QA receives public specification-level
scope and exact artifact-ready relays, not this implementation plan or private
work orders. Authority remains the shared contracts and the
[approved experiment specification](t02-approved-experiment-spec.md).

**Latest authorization:** R2 is independently ACCEPTED after bounded repair;
all source/build/QA/metadata windows are CLOSED. User-authorized succession
continues for fixed R3-R11, one fresh coordinator per slice, through T02 only.
Latest user instruction also requires fresh Developer AND QA for every future
slice; R2 retained existing subordinates, R3 onward replaces their sessions safely
in the same panes after takeover.
Follow the coordinator-only succession policy; no execution before READY/TAKEOVER
and bounded work orders/QA relays. No extra user resume round per fixed slice;
blockers still stop progression. T02 as a whole is not complete.

## 1. Fixed count and baseline

There are **13 execution/acceptance slices total: 4 accepted + 9 remaining**.
Accepted: S1, S2A, R1/S2B and R2. Remaining: R3-R11. IDs/count are unchanged.
The historical four stages were broad groupings, not a fixed slice count. This
plan supersedes their incomplete execution breakdown, not the public acceptance
contract. Design checkpoints, reject-before-approve sequencing, controls, review,
QA relays and repairs are work inside the named slice, not extra slices.

| Initial accepted baseline | Public target | Evidence boundary |
| --- | --- | --- |
| S1 | `no-companion/sdk` | Actual unavailable creation call, no fixture spawn; not gate proof. |
| S2A | `generic-readonly/sdk` | Native seven-tool connection/read success, receiver creation refusal and independent final zero; no companion gate. |

R1/S2B is accepted in the continuation table below; the
[coordinator handoff](../handoffs/t02-coordinator-pickup.md) records all checkpoints.
The planning-only update itself ran no regression; subsequent R1 execution has
specific evidence and selected S1/S2A repeats. T01 production entries remain inert.
Registry: **41 scenarios: 20 SDK + 21 PTY**. Six accepted SDK scenarios leave
**35 first-time scenario acceptances (14 SDK + 21 PTY)**.

## 2. Fixed continuation slices and current registry coverage

R1 and R2 are accepted; R3-R11 remain pending. Under automatic succession
instruction, each incoming coordinator executes only its next fixed slice after
oriented takeover, serially. Each depends on the preceding accepted slice;
earlier baselines remain regression obligations. Grouped rows are bounded
assignments, not permission to delegate the matrix. Scenario coverage is listed
once in this continuation table. R10/R11 add no registry scenarios; controls/
repeats do not inflate scenario or slice counts.

| Slice | Scope and exact public targets | Coverage count | Exit gate |
| --- | --- | --- | --- |
| R1 / S2B — ACCEPTED | `direct-readonly/sdk` | 1 | Genuine companion denial/read/final-zero/cleanup accepted after explicit-null repair; S1/S2A regressions passed. Window closed. |
| R2 — ACCEPTED | `deferred-readonly/sdk`, `codemode-readonly/sdk`, `nested-readonly/sdk` | 3 | Actual read/search/nested routes, native IDs/parents, gate denial and explicit-null final zero accepted after surface repair; S1/S2A/R1 regressions pass. Windows closed. |
| R3 | `static-shadow/sdk`, `normalized-collision/sdk`, `normalized-collision-reversed/sdk`, `replacement-mcp/sdk`, `replacement-codemode/sdk`, `missing-mcp/sdk`, `unsupported-inventory/sdk`, `binding-missing/sdk`, `binding-ambiguous/sdk`, `hidden-tool/sdk` | 10 | Specific real conflict/resource/binding/hidden-tool refusal, no guarded enablement or effect; no mode-only shortcut masquerades as preflight coverage. |
| R4 | `mode-print/sdk`, `mode-json/sdk`, `mode-rpc-has-ui/sdk`, `no-ui/sdk` | 4 | Actual named context/adapter observed; RPC genuinely hasUI:true yet cannot enable writes; no-ui tui bind has no UI and is not TUI evidence. |
| R5 | `direct-reject/pty`, `direct-approve/pty`, `calibration-unguarded/pty`, `calibration-mutation/pty` | 4 | Genuine isolated interactive loop, complete inert sample preview and actual keystrokes; reject zero, approve exactly one matching effect; separately labeled unsafe controls prove effect/digest detection. |
| R6 | `deferred-reject/pty`, `deferred-approve/pty`, `codemode-reject/pty`, `codemode-approve/pty`, `nested-reject/pty`, `nested-approve/pty` | 6 | All three route pairs gate actual inner creation, not just outer tools; approvals precede one matching effect, denials final zero; native parent linkage. |
| R7 | `handler-failure/pty`, `approval-dismiss/pty`, `approval-cancel/pty`, `approval-timeout/pty` | 4 | Distinct genuine error/dismiss/cancel/deadline stimuli block dispatch; late approval cannot revive cancelled work. |
| R8 | `mutator-boundary/pty`, `sidecar-unavailable/pty`, `sidecar-malformed/pty`, `sidecar-stale/pty` | 4 | Actual post-approval mutation or channel fault refused at receiver before effect; independently received digest/tuple/generation evidence and final zero. |
| R9 | `binding-invalidate/pty`, `reload-invalidate/pty`, `shutdown-invalidate/pty` | 3 | Invalidation precedes pending verdict/effect, clears private intent/labels, closes listener and withdraws capability; no autonomous continuation. |
| R10 | Harness/budget/failure calibration; repeat accepted SDK and direct PTY targets under bounded faults | 0 | Faults cannot yield fabricated counters, pass-like truncated evidence or unknown cleanup labeled complete; all public budgets calibrated. |
| R11 | Final feasibility ADR, accurate metadata/compatibility, full scoped acceptance and clean T01 regression | 0 | All 41 required scenarios specifically accepted, controls healthy, supported configuration/limits documented, relevant checks green; otherwise T02 blocked. |

Fixed continuation coverage: SDK `1+3+10+4=18`, PTY `4+6+4+4+3=21`,
total39; with S1/S2A this exhausts all41 public scenarios. R1+R2 add four
accepted SDK cases, so pending coverage is SDK14 + PTY21 = **35**, across
**9 remaining slices** (R3-R11, including calibration/closure slices).

## 3. Coordinator design and ownership, fixed for every slice

The coordinator owns API/integration decisions. Before each future delegation,
record the exact role-specific work order: allowed paths, real runtime setup,
ordered actions, public observations, fault/stimulus synchronization, commands,
regression selection and stop conditions. Developer is not tasked to discover a
new architecture or fill the rest of the matrix independently.

This is a finite scope/dependency plan, not a claim that unresolved APIs already
work. Public API/type/source review and any authorized isolated wiring probe are
**checkpoints inside the relevant slice**. PTY/RPC/reload behavior remains unproven.
If a checkpoint fails, that slice blocks; do not silently switch layers, invent
new subdivisions or hand unresolved design to Developer.

Ownership throughout:

- Developer: bounded experimental source/config/metadata, final ADR and T02 notes
  in `docs/compatibility.md`. No QA tests, fixtures, plans, evidence or diagnostics.
- QA: independent specification-derived tests/fixtures and QA evidence. No
  project experimental/production source, generated contents/maps or diffs.
- Coordinator: design/work orders, public decisions, readiness/review evidence,
  task/index/handoff status and source/process review. No implementation edits
  without an announced exclusive integration window.
- Shared manifests/config have one Developer owner; no extra dependencies,
  compiler relaxations or lock changes without a separate coordinator decision.

Coordinator identity is restored at each READY/TAKEOVER; use the actual live
pane/name, not historical R1 IDs. Preserve Developer/QA pane layout, but use
fresh Developer AND QA sessions from R3 onward per latest user instruction.
Respect role boundaries and communicate asynchronously without polling; one
bounded slice assignment per coordinator, never a matrix-wide handoff.

## 4. Concrete implementation packages and design checkpoints

### R1 — companion-managed direct SDK refusal

R1 is ACCEPTED; retain the [S2B work order](../tasks/t02-s2b-work-order.md)
as its historical bounded design/repair record, not renewed authorization.
Initial package: new `driver/sdk-gate-worker.mjs` and `driver/event-journal.d.mts`;
narrow `driver/run.mjs`, `driver/event-journal.mjs`, `companion/index.ts` and
`metadata.json`, all under `experiments/t02/`. Independent QA exposed missing
explicit-null final fields; the same-slice repair additionally changed only the
fixture finalize serialization and connected-zero driver validation. No tool-schema/
scenario/config/manifest/lock changes. Metadata-only accepted status was reconciled
after closing QA's window.

Keep original compiled companion path, closed native provider/runtime and named
companion-first loader. Install/observe gate synchronously before registration.
Use shared physical append order, not merged actor logs. Native MCP connects the
companion's single readonly fixture. Confirm actual discovery before declaring
connected registration. Host code:null is valid only with joined genuine gate
and error-result evidence; do not fabricate a receiver check. No sidecar/UI/write
capability. Reconcile stale S1-only metadata with accepted S2A, without listing
missing files as launchable. Regression: S1 and S2A.

### R2 — ACCEPTED remaining SDK routes

R2 passed strict independent acceptance after a bounded two-file surface repair;
S1/S2A/R1 regressions and48/48 logic controls passed. First coordinator readiness
failure is preserved, not recast as a pass. Metadata now accepts exactly six SDK
profiles with no candidates. [R2 work order](../tasks/t02-r2-work-order.md) is
historical CLOSED design/repair authority. Readiness is coordinator/Developer-only;
QA acceptance is coordinator/QA-only. The original fixed package follows.

Reuse R1 worker/journal/lifecycle; changes confined to SDK route dispatch,
`driver/scenarios.mjs`, experimental companion's route setup/orchestrator and
metadata. No PTY, RPC or integrity work.

Coordinator fixes exact loadouts and scripted turns before handoff: genuine
`tool_search` discovery then native direct call for deferred; real codemode
calling fixture tools for codemode; `t02_orchestrate` using public
`ctx.executeTool` for nested. Each must perform an actual ungated read and actual
creation attempt. Existing scaffold turns are not authority if they omit reads.
Inspect active/callable/hidden surfaces; exclude unrelated tools. Actual nested
execution events, not transcript-only guesses, establish parents and gate calls.
Regression: S1, S2A and R1.

### R3 — preflight, binding and hidden reachability

Allowed package: SDK worker/preflight/dispatch/scenarios, known experimental
replacement/unknown-resource diagnostics, companion preflight and metadata.
Use only closed local fixtures/static settings, never arbitrary executable URLs
or ambient configuration. Existing placeholder static commands are not proof;
coordinator fixes safe launcher-owned entries and both normalized insertion orders.

Check actual loader inventory, errors/warnings, registered names and effective
static settings **before bind/connect**, independently of later mode refusal.
Observe the particular failing condition, not merely print-mode denial. Missing/
ambiguous trusted binding must not be inferred from labels. Hidden creation must
be demonstrably unreachable with an actual joined failed attempt, not merely
omitted from the first provider request. Where a readonly fallback connects,
require its own final zero; where refused before spawn, require observed absence
and no invented fixture ledger. No diagnostic replacement may enable guarded
registration. R5 corroborates the three static/normalized conflicts under the
actual controlled interactive launcher where feasible; unsupported corroboration
is explicitly recorded, not promoted to a pass. Regression: S1/S2A, R1 and R2.

### R4 — real modes and RPC UI semantics

Allowed package: SDK mode adapter/worker, a closed RPC subprocess adapter if
required, bootstrap/report/scenarios, companion mode checks and metadata.
Coordinator selects the pinned public `runRpcMode` or isolated stock RPC path
from complete docs/types and fixes framing/lifecycle before delegation. Public
harness remains `sdk`; RPC is not a third harness.

RPC needs genuine runtime mode:rpc/hasUI:true, observed through the selected
adapter; setting a flag in print is forbidden. No terminal approval or guarded
capability. Print/JSON bind actual named contexts without injected approval UI.
No-ui may bind tui without uiContext but remains sdk-pipeline. At least one read
must remain usable for connected readonly mode profiles. Keep context observation
separate from intended launcher flags. Regression: accepted SDK profiles.

### R5 — one genuine PTY route and separately labeled evidence controls

Allowed package: new `driver/pty-driver.py` (Python stdlib only) and
`driver/pty-worker.mjs`, CLI provider wrapper/observer, bootstrap/report/scenarios,
experimental companion approval/sidecar/fixture and explicitly isolated diagnostic
controls, plus metadata. No product sources or personal Pi settings.

Coordinator fixes stock pinned CLI argv, provider binding, complete explicit child
environment, no-discovery settings/resources, fixture resolution and observer
provenance before delegation. Use original compiled companion path or explicit
verified launcher-owned fixture entry; never assume relocation works. Inventory
provenance is controlled-cli-launch, not a different SDK loader scan. Preserve R1
(arbitrary ambient CLI support remains unresolved).

Python owns a real PTY; native interactive mode is demonstrated, not inferred
from isatty alone. Input/readiness/settlement/exit are event-driven with bounded
capture. First checkpoint direct-reject, then direct-approve. Native complete
sample preview must show IDs/name/ordered null/zero/default values and authorized
read labels, with C0/C1/CSI/OSC/hyperlinks inert. The coordinator fixes actual key
sequences from the native UI; no injected custom UI, timing sleeps or canned
approval events. Approval requires receiver rehash and strict sidecar verdict
before exactly one synthetic increment.

Run calibration-unguarded and calibration-mutation as **separate labeled
unsafe diagnostic controls within this slice**, not proof of guarded approval.
The first must expose a deliberate fixture-only effect to the independent ledger;
the second must expose unequal independently received/approved digests. No unsafe
control flag reaches guarded profiles. Retain actual layer provenance and label
control purpose; a logic-only substitute does not satisfy the registered PTY
combination. If controls fail, zero/integrity evidence is invalid and R5 blocks.
Corroborate R3's three static/collision cases with the controlled PTY launch where
feasible, documenting limits. Regression: accepted SDK cases.

### R6 — remaining genuine interactive route pairs

Reuse R5 PTY engine, change only route/loadout/turn orchestration, native observer
joins and narrowly necessary companion handling. No new harness or approval UX
subsystem. Order deferred reject/approve, codemode reject/approve, then nested
reject/approve. Each pair is a review checkpoint inside R6, not a new slice.

An inner creation native ID must join the real gate/prompt/result and receiver
observations; outer successful return cannot conceal inner denial. Read tools
remain ungated and labels authorized. Preserve R2 route identity and isolation.
Regression: four SDK refusal routes and R5 direct pair/controls.

### R7 — fail-closed approval completion

Allowed package: known throwing-gate diagnostic, PTY stimulus adapter/scenarios,
companion cancellation/deadline behavior and metadata. Distinguish native reject
from Escape dismissal, operation cancellation, no-input timeout and actual handler
exception. Fix genuine cancellation mechanism and late-keystroke ordering before
handoff; annotation of an expected reason is not a stimulus.

Require no dispatch, actual denied/error result when the runtime can deliver one,
connected final zero and bounded prompt completion (<=10s). Cancel/error cannot
leave a reusable approval or listener. Late approval after cancellation is tested
without starting a new call. Regression: direct pair, three route pairs, controls.

### R8 — final-input integrity and channel failure

Allowed package: known late-mutator diagnostic, trusted fixed sidecar-fault adapter,
companion retained intent/verdict path, fixture receiver boundary, PTY/scenarios
and metadata. No mutation authority through model arguments or public arbitrary
socket/script fields.

Coordinator fixes actual load order so the known handler changes valid input
**after genuine approval**, and synchronization between prompt completion, fault
activation and receiver check. Fixture revalidates and independently hashes actual
received arguments; stale tuple/generation/digest or unavailable/malformed channel
must deny before increment. Compare to public canonical seed independently, not
shared-helper self-equality. Controls cover strict types/unknown fields/extra
frames, wrong tuple/operation/digest, no cached per-call verdict and the 2s/64KiB
sidecar limits. Same operationId conflicting intent cannot overwrite approval;
new ID requires a new explicit approval. No production replay/durability claim.
Regression: guarded direct pair, mutation control and all route pairs.

### R9 — invalidation, reload and shutdown

Allowed package: trusted local lifecycle stimulus/PTY adapter, companion lifecycle/
label/intent cleanup, receiver generation recheck and report/scenarios/metadata.
Coordinator fixes exported command/runtime operations and an event-driven barrier
holding a pending verdict before effect. Reload must be genuine selected-runtime
reload, not only a fabricated session event or replacing a desired flag.

Binding/session-generation and profile-generation invalidation precede verdict/
effect; labels and approval state clear, listener invalidates before registration
withdrawal, MCP owns the sole child's termination. Try an explicit old-intent call
after invalidation where the runtime still exists: no autonomous resume or stale
approval. Shutdown may legitimately prevent delivery of a pending tool result;
record actual pending/cancelled lifecycle plus receiver final ledger, not a
fabricated error. Ordinary unavailable/preflight scenario attempts still require
real joined results. A fresh context cannot borrow subscriptions/intent from the
old runtime. A committed earlier counter cannot be rolled back; report residual
IPC race limits, not atomic sign-out or production A07 guarantees. Regression:
direct pair, R7 and R8, selected indirect route coverage.

### R10 — bounded harness and evidence failure calibration

Allowed package: bounded bootstrap/roots/report/journal and PTY/RPC cleanup fixes;
QA owns independent external failure probes, coordinator owns integration controls.
Coordinator fixes safe fault seams in a public observable relay before execution;
no arbitrary script/URL option, new registry name or production bypass is added.
All earlier slices already enforce budgets; this slice calibrates failure handling,
not a deferral of safety.

Fixed control set:

1. Scenario deadline <=60s, MCP deadline <=10s and blocked approval deadline <=10s;
   real hung/cancelled work cannot continue after parent cleanup.
2. Sidecar <=64KiB/frame and <=2s/verdict, strict malformed/extra frames fail closed.
3. Routine input <=1MiB, trace <=4MiB, PTY capture <=4MiB and <=100 synthetic
   effects: boundary/exceedance controls fail explicitly, never truncate a pass.
   Effect-limit stress uses isolated diagnostic counters, not 101 real approvals.
4. Partial/malformed journal, protected-field/provenance/sequence violations and
   concurrent aggregate overflow: parent hard-cap validation, no sorted/merged
   reconstruction or fake fixture final. Logic controls remain labeled as such.
5. Failed version probe, worker/fixture unexpected exit, malformed/missing final
   ledger, output-write failure and owned child/listener refusing shutdown:
   completed:false/exit1 with unknown effects distinguished from verified zero.
   Invalid driver arguments produce exit2; observed scenarios completing with
   denial still use exit0 and need independent assertions.
6. Success/failure/cancellation cleanup closes stdio, timers, native runtime, PTY/
   RPC handles and the owned process group before root removal; unknown cleanup
   cannot become childrenGone/listenersClosed/rootsRemoved:true.

Repeat healthy S1/S2A, SDK routes, direct PTY pair and both unsafe controls after
fault runs. Do not treat injected faults as new approval/host certification proof.

### R11 — final documentation and scoped acceptance

Developer writes `docs/decisions/t02-feasibility-adr.md`, accurate experimental
metadata/README and T02 compatibility notes only after verified findings exist.
Coordinator reviews full source/process closure and supported resource/load-order
profile; QA independently repeats every registered required scenario on the frozen
artifact plus its validator controls. No filtered skip counts as a pass.

Record immutable package/lock identities, actual negotiated protocol per connected
profile, inventory provenance, reproduction commands, receiver checks, cleanup and
R1/IPC/non-OS-sandbox limits. Metadata separates implemented/launchable/accepted
profiles and removes nonexistent entry claims; registry existence is not readiness.
T02 SDK/TUI evidence is bounded feasibility, not a verified product compatibility
row or T17 certificate. Durable/encrypted intent, full hostile/long/narrow production
preview, real auth/backend/storage/replay remain later owning tasks.

After all artifacts/ADR and cases exist, serialize the documented locked clean
install, typecheck/lint/format/build and full relevant independent suites, including
T01 foundation regression. Only then is combined `npm run check` appropriate.
Until then, missing ADR/future-target formatting or matrix failures are blockers,
not reasons to add dummy files or weaken checks. Any failure keeps R11/T02 open.
Coordinator updates task/index/evidence with accepted or blocked outcome and stops;
no T03+ automatic assignment, commit, publication or product write enablement.

## 5. Universal gates, relays and stop conditions

Each future slice follows one cycle: coordinator completes concrete design ->
Developer bounded implementation/permitted checks -> coordinator source and actual
public artifact review -> one exact readiness relay -> independent QA execution ->
coordinator evidence/status update. QA can derive tests from the public spec in
parallel, but cannot run unrelayed targets or receive private implementation plans.
Build/install operations never overlap the QA frozen-artifact window.

Absent profiles need actual attempted-call failure and verified no spawn; connected
profiles need exactly one fixture-origin final ledger. Event chronology is shared
physical append order with protected envelopes and native causal IDs. Refusals need
real observed reasons, not driver expectations. Native runtime disposal and parent
closure are observed, not inferred from ledger presence. Apply all public isolation,
permissions, offline provider/resource and budget requirements on every outcome.

Run only permitted production/experimental checks and the slice's named public
targets/regressions; coordinator/QA own independent tests. Every relay names exact
scenario/harness combinations and artifact identity. Keep bounded readiness versus
independent acceptance separate. A case repair/retest stays in its slice. After
takeover, internal design/review checkpoints do not require an unnecessary new user
pause. Standing user authorization covers the fixed T02 sequence only; each
coordinator executes its one slice, then performs the documented fresh handoff.

Stop the affected slice and report a blocker on API/design uncertainty, unsupported
genuine adapter/UI, failed check/assertion/control, unexpected resource/auth/network,
budget overrun, missing causal evidence or unknown owned-resource cleanup. Resolve
security failures against authority, never change shared contracts, fabricate a
layer/counter, suppress errors or treat skipped scenarios as implemented.

**Count-change rule:** any newly required scenario, extra execution slice, dependency
or scope expansion requires a written coordinator revision showing the changed total
and coverage plus user approval before delegation. No ad hoc R12 or hidden sub-slices.
If the pinned host cannot meet required feasibility, stop with a blocked T02 handoff
instead of spending indefinitely or claiming partial baselines complete the task.

## 6. Planning-only review record

Static comparison of the coverage table to public `metadata.json` found 11 remaining
rows, 39 first-time targets, no missing/unknown/duplicate scenarios and no harness
mismatches: 20 SDK + 21 PTY including the two accepted baselines. This is a document/
registry consistency check, not experiment execution or independent acceptance.
Task/index/work-order/pickup references now point to this fixed count and retain the
execution pause. No implementation/config/metadata/test files were changed, no agents
were prompted, and no runtime probes, build checks or suites were run for this update.

**Current stopping point:** R2 independently ACCEPTED after bounded surface
repair; initial coordinator-review failure is preserved. Coordinator/QA exact
three-route selections, S1/S2A/R1 regressions and48/48 logic controls passed.
Post-acceptance metadata-only maintenance is complete; all windows CLOSED.
**13 total slices: 4 accepted,9 remaining.** Fresh coordinator takes R3 after
READY/TAKEOVER and renews Developer AND QA in existing panes before R3 work.
Each accepted slice repeats succession through R11 only; blockers stop the chain.
Standing authorization comes from the user, not acceptance; no skipped gates,
extra slices/scenarios/dependencies, whole-matrix delegation or T03+ continuation.
