# Implementation roadmap

**Standing workflow (2026-10-15):** one primary Codex agent, with optional
bounded subagents at its discretion. See the [working policy](agent-coordination.md); historical team/role
instructions below do not govern future work.

## Current policy and delivery scope

User-approved [configuration-only routine creation](decisions/routine-creation-config-policy.md)
is retained in shared MCP draft0.3 (working-tree revision based on9a96dcb).
T21-S1 removes durable creation recovery from the target contract. The delivered R1
package retains the prior behavior; S1–S4 source implements fresh creation and
config2/single-record credentials. T21-S5/S6 delivered/integrated acceptance remains open.
Backend OpenAPI1.0.0 and the seven-tool portable local stdio scope are unchanged:

1. search_exercises
2. get_exercise
3. list_workouts
4. get_workout
5. list_routines
6. get_routine
7. create_routine

Only operator config-file writesEnabled:true permits valid authenticated routine
creation, without per-routine confirmation. Missing/false policy defaults to
unavailable creation (configuration_required before admission/mutation); invalid
config fails closed. No custom/external permission extension, consent argument,
host mode/UI check or sidecar permission channel is required. Authentication,
strict validation, encrypted credentials, pending-refresh recovery and current
account/session fences remain. Creation has no operationId, journal/receipt or
cross-call recovery; new calls may duplicate work.
Any client connected to an enabled local process can request creation; disclose
that operator-trust boundary. Config/process/private-state access stays restricted.

Login/logout and profile lifecycle are trusted local actions, never
model-facing tools. No remote transport, direct DB access, arbitrary HTTP/command,
existing-routine mutation, workout/custom-exercise mutation, account-management
tools, sync cache, bulk import or autonomous recovery worker. No new backend API.

## Current change — T21-S4 accepted; parent incomplete

The user-assigned [S4](tasks/t21-s4-work-order.md) is
[accepted/closed](evidence/t21-s4-review.md): runtime/setup/login/auth/lifecycle
and CLI use config2 and the single encrypted credential record. Atomic binding/vault
changes retain auth recovery and session/proof fences; detached journals, anchors,
descriptors and obsolete commands are removed. No filesystem type gate.
808/808 checks across81 files pass with569 stable hashes and176 compiled outputs;
production/static/build and owned cleanup pass. Retired requirements and original
bytes are recorded explicitly. [Handoff](handoffs/t21-s4.md).
S1–S4 closed; S5 ready/unassigned, S6 held. Btrfs testing stays user-owned.
R1/laptop retain old installed behavior; no package/parent/release claim.

## Prior change — T21-S3 accepted; parent incomplete

The user-assigned [S3](tasks/t21-s3-work-order.md) is
[accepted/closed](evidence/t21-s3-review.md): the successor credential entry stores
binding/vault together with real key custody, ownership, atomic replacement and
safe uncertainty/cleanup behavior. It has no filesystem type gate. 33/33 owning
plus 223/223 storage/foundation regressions pass, with 644 stable hashes and 208
compiled outputs; production checks and owned cleanup pass. Btrfs testing belongs
to the user by explicit direction and was not executed. [Handoff](handoffs/t21-s3.md).
Runtime/config/auth/login/lifecycle integration remains S4, ready/unassigned;
S5/S6 held. R1/laptop behavior is unchanged. No parent/installation/release claim.

## Prior change — T21-S2 accepted; parent incomplete

[S2](tasks/t21-s2-work-order.md) is [accepted/closed](evidence/t21-s2-review.md):
creation is invocation-local, operationId is rejected, repeated calls are fresh,
errors/fallbacks retryable:false and idempotentHint:false.821/821 in66 owning/
regression files,617 stable hashes,192 compiled outputs and owned cleanup PASS.
[Handoff](handoffs/t21-s2.md). Auth/storage/HTTP/backend/package inputs are unchanged;
source still uses temporary config1/ext4/anchor credential storage. R1/laptop retain
old application behavior; no installation/parent/release claim. S3 ready/unassigned,
S4–S6 held; no automatic successor.

## Prior change — T21-S1 contract/interface revision

The user assigned [S1](tasks/t21-s1-work-order.md): shared MCP draft0.3,
[single-record storage/interfaces](decisions/t21-single-record-storage-spec.md)
and [exact future path dispositions](decisions/t21-s1-path-dispositions.md).
[S1 accepted/closed](evidence/t21-s1-review.md), with [handoff](handoffs/t21-s1.md).
Documentation only; no source/test/package or backend v1 changes, no new runtime
acceptance claim. [T21](tasks/t21-remove-durable-creation-recovery.md) remains
incomplete; S2 ready/unassigned and S3–S6 held. Historical T04/T09/T12/T16/T17/T18 evidence keeps its
original scope. T17 exact creation restart recovery is superseded, while remaining
host requirements, T19 and independent T20 retain their applicable gates.

## Prior checkpoint — T18-R1 package refresh accepted/closed

[R1 review](evidence/t18-r1-review.md):40/40 in12 files on workspace and clean,
zero failures/skips;430 copied source inputs,194 emitted files and exact archive
bytes/content/modes/lock match. Current decoder fix and standalone server guide
are included; exact delivered installation/recovery/refusal and cleanup PASS.
[Handoff](handoffs/t18-r1.md). T17-S2–S5, T19 and independent T20 remain separate;
no successor, release or real enablement.

## Prior checkpoint — T17-S1 accepted; parent incomplete

[S1 review](evidence/t17-s1-review.md):25/25 in five files (8 actual Pi SDK print
checks +17 unchanged regressions), zero failures/skips;623 stable hashes,194
identical emitted files and owned cleanup PASS. Direct/deferred/codemode paths
negotiate MCP2025-11-25 and preserve config-only creation.
[Handoff](handoffs/t17-s1.md). Later lifecycle/recovery/mode/output and clean
integrated acceptance require separate assignment. T16/T18 stay closed; T19 and
independent T20 remain separate. No release or real enablement.

The [remaining T17 plan](decisions/t17-remaining-slices.md) splits CLI/modes (S2),
lifecycle/concurrency/cancellation (S3), exact recovery/restart/fork (S4), and
output/privacy plus clean integrated acceptance (S5). S2 ready/unassigned; later
slices held. This planning update starts no implementation or test execution.

## Parked and retired scope

T01 foundation, bounded T03 schemas/codecs, T04 storage and T05 transport are accepted.
T02 companion feasibility is parked/incomplete; preserve
experimental sources/harness/fixture/metadata and QA evidence/tests. S1/S2A/R1/R2
accepted four slices/six SDK profiles under the OLD draft0.1 experiment; R3 is
candidate artifact-ready only, not independently accepted. No R3 QA artifact
relay or further R3–R11 execution/succession. Old controls are not current-policy
acceptance or product interoperability. No cleanup/removal/test exclusion here.

T13 companion registration and T14 companion approval are retired from current
product delivery; historical task IDs/descriptions remain. They are not dependencies
of creation integration. T17 retains named Pi interoperability, not approval/UI/
extension certification. T18 packages server/CLI/config, not a required companion.

## Standing verification scope for every future task

Apply the user-approved [proportional testing policy](decisions/proportional-testing-policy.md),
not the former exhaustive-harness default. Each work order carries a short core
risk/requirement matrix, simple fixtures, early static checks, focused repair
commands and relevant final regressions. No automatic generalized framework or
full fault cross-product. Mandatory contract/safety/integration gates remain;
active scope and deferrals must be explicit. T05's reduction is one application,
not a one-task exception or a fixed test count for later work.

## Current pickup — T16 complete; S7 accepted/closed

[S7/parent acceptance](evidence/t16-s7-review.md): **46/46 full active T16 checks** and
**181/181 relevant unchanged regressions**, zero failures/skips. Actual owned
Android ordinary HTTP/Room/engine sync observes exact saved IDs/graph/order/values
and stable repeated delivery. Clean locked reconstruction matches424 source inputs
and194 emitted files; executed source/APK stability, original-input preservation
and owned cleanup pass. [Handoff](handoffs/t16-s7.md). S1–S7 and parent T16 are closed.
T17 named Pi, T19 live Google/browser and independent T20 remain separate gates.
No automatic successor, real enablement, staging/commit or release.

## Prior pickup — T16-S6 complete; S7 subsequently assigned

[S6 review](evidence/t16-s6-review.md): **45/45 full active T16 checks**, **35/35
unchanged local regressions** and **27/27 backend checks** pass, with zero failures
or skips. The authorized backend fix persists new deletion times in milliseconds;
raw-time proof freshness, exact replay and the 24-hour purge deadline remain intact.
Actual signed-proof deletion status clears only A while B stays unchanged.
615 owning hashes remain stable; owned backend/signer/container/provider/bus/private
resources are cleaned. MCP production and the shared contracts remain unchanged.
[Handoff](handoffs/t16-s6.md). S1–S6 are closed; S7 Android/integrated acceptance
remains planned/unassigned and parent T16 incomplete. No successor or release grant.


## Prior pickup — T16-S5 complete; S6/S7 unassigned

[S5 review](evidence/t16-s5-review.md): **54/54 in eight files**, all 36 active
T16 checks (33 service compositions, three codec) plus 18 unchanged T11/T15
regressions; zero failed/skipped/pending/todo and 611 stable hashes. Per-step durable
process interruption, committed-response cancellation, lost final MCP receipt,
bounded injected429 recovery, actual save rejection/key reuse and corrupted-success
replay pass. Scoped syntax/AST/lint/format/import checks and owned cleanup PASS;
312 product/config inputs/outputs match S4 and 116 original backend inputs stay
stable. Existing production checks/build from S4 apply to the same compiled
candidate; no S5 rebuild/clean-install or independent certification claim. Process
exits occur between acknowledged commits after owner drain; 429/corruption are
explicit relay faults. [Handoff](handoffs/t16-s5.md).
[Remaining plan](decisions/t16-remaining-slices.md): S1–S5 closed; S6 races/lifecycle
and S7 Android/integrated parent acceptance planned/unassigned. Parent T16 incomplete.
Historical T18 archive still needs S3 codec repair in a verified candidate;
compatibility/release gates and T17/T19/independent T20 remain open.

## Prior pickup — T16-S4 complete; S5 authorized

[S4 review](evidence/t16-s4-review.md): **42/42 in eight files**, all 21 active
T16 checks (18 actual-service, three codec) plus 21 unchanged T06/T11/T15
regressions; zero failed/skipped/pending/todo and 608 stable hashes. Authentic A05
expired-access replay/install-before-rotation, reference rejection, terminal repeat,
concurrent normalized identity/distinct creation and real root collision pass.
Production/scoped checks and owned cleanup PASS; 312 checked product/config
inputs/outputs and 116 original backend inputs unchanged. A05 uses the existing
trusted-clock production auth facade with real storage/backend, followed by MCP
reopen; no elapsed-wall-clock stdio claim. [Handoff](handoffs/t16-s4.md).
[Remaining plan](decisions/t16-remaining-slices.md): S1–S4 closed; S5 separately
authorized while S4 finished, S6/S7 planned/unassigned. Parent T16 incomplete.
Crash/cancellation/uncertainty, remaining save rejection/key-reuse/malformed success,
other-client races/lifecycle, Android and integrated acceptance remain. Historical
T18 archive still needs S3 codec repair. T17/T19/T20 and release gates unchanged.

## Prior pickup — T16-S3 complete; parent T16 incomplete

[S3 review](evidence/t16-s3-review.md): 147/147 in 11 exact files, all 16 active T16
checks (13 actual-backend + three codec) and 131 unchanged selected regressions;
zero failed/skipped/pending/todo, 607 hashes stable. Actual boolean filters,
normalized/context-bound paging, visibility/saved-only lists, workout status/order,
literal Int64 get/list projection, live membership and fixed authentic expiry pass.
A narrow decoder repair permits valid bundled cross-role muscle membership while
retaining custom restrictions; only its source/emitted module changed. Production/
scoped checks PASS. Test-only backend Clock overlay, five Java restarts, unchanged
116 original backend inputs and owned cleanup recorded. No contract/dependency or
live-environment changes. [Handoff](handoffs/t16-s3.md). S1–S3 closed; parent T16
incomplete and later slices unassigned. A05, remaining creation/domain/race/crash/
lifecycle/Android and integrated acceptance stay open; historical T18 archive needs
the repair in a later verified candidate. T17/T19/T20 and release gates unchanged.

## Prior pickup — T16-S2 complete; parent T16 incomplete

User authorized S2, now [complete](evidence/t16-s2-review.md): 90/90 in eight files,
all nine active T16  + 81 unchanged auth/lifecycle regressions, zero failed/skipped/
pending/todo. Actual refresh serialization/lost-response replay, MCP/backend restart
and logout/account-disable write fences pass with independent DB evidence.
Two Java restarts, 604 stable hashes and owned cleanup verified; 298 product inputs/
194 rebuilt outputs and 116 original backend inputs unchanged. No product/contract
changes. [Handoff](handoffs/t16-s2.md). S1/S2 closed; later outcomes unassigned.
Remaining timing/cursor/ownership/domain/race/crash/lifecycle/Android evidence and
parent acceptance remain open; no automatic successor, live enablement or release.

## Prior pickup — T16-S1 complete; parent T16 incomplete

The user assigned T16 on 2026-10-16. [S1 review](evidence/t16-s1-review.md) records
450/450 in 49 files (4 actual-backend owning  + 446 unchanged regressions), zero
failed/skipped/pending/todo; production/scoped checks and owned cleanup PASS.
Representative reads, creation, exact response-loss replay at draft/populate/save,
independent DB children/revisions/batches and ordinary sync now have actual isolated
backend/PostgreSQL evidence. Original 116 public backend inputs remained unchanged;
current shared contracts are preserved. [Handoff](handoffs/t16-s1.md).
S1 closed; later bounded outcomes remain unassigned. Full real auth/race/recovery,
backend restart, Android observation and parent acceptance stay open. No successor,
live enablement or release; T17/T19/T20 and existing limits remain unchanged.

## Prior pickup — T18-S3 and parent T18 complete

[S3 acceptance](evidence/t18-s3-review.md) completes installed same-format recovery/
replacement, incompatible-state fencing and user-approved local startup journal
validation. Full runtime/initial-document261/261 in31 files in workspace and clean;
final document-only closure14/14 in5 files in both.404 source inputs/194 emitted
outputs match clean reconstruction; final archive is byte-identical across targets,
96 files/86 JS/111 runtime dependencies. Failures and report-order repair retained.
[Handoff](handoffs/t18-s3.md). All T18 grants closed; no successor or release.
T16/T17 remain ready/unassigned; T19/T20 retain their external/independent gates.

## Prior pickup — T18-S1 accepted; S2 unassigned

[S1 acceptance](evidence/t18-s1-review.md) delivers the private runtime package and
trusted CLI bin.152/152 in13 exact files (6 owning +146 relevant regressions),
94 archive files/86 JS/111 locked runtime dependencies,817 stable hashes and194
byte-identical prior outputs; four production/scoped checks and actual isolated
install/CLI/SDK/provider/cleanup PASS. [Handoff](handoffs/t18-s1.md).
Extract-and-npm-ci is the sole user-selected installation route; original consumer
drift/failures remain recorded. All S1 grants closed. S2 standalone guides
ready/unassigned, S3 recovery/clean parent acceptance held; parent incomplete.
All external/independent gates and prior limits persist. No successor or release.

## Prior next-task choice — T18 planning complete; S1 unassigned

The user requested T18 design/planning/splitting on 2026-10-16. The
[settled plan](decisions/t18-plan-and-slices.md) defines three sequential slices:
S1 locked runtime artifact/delivered bins, S2 standalone operator guides/safe
templates, S3 installed recovery and clean locked parent acceptance. Preserve
repository history/workspaces while excluding parked/Pi/private material from
distribution; introduce no storage-format migration or dependency upgrade.
Planning is complete and documentation-only. S1 requires separate assignment
and restored pinned toolchain/qualified isolated fixtures; S2/S3 remain held.
No implementation/test-source, install/build/runtime, publication or release
grant. T15 stays closed; T16/T17/T19/T20 and all external/independent gates persist.

## Prior next-task checkpoint — T15 accepted

[T15-S3/parent acceptance](evidence/t15-s3-review.md) completes portable config-controlled creation:
446/446 PASS in 48 exact files (30 T15 owning + 416 relevant regressions), zero failed/skipped/pending/todo; four production/scoped checks, 584 stable hashes, clean locked replay, 388 identical source inputs and 194 byte-identical emitted outputs.
Actual isolated provider/ext4/HTTPS/SDK process recovery, lost reply, policy,
cancellation/stop and trusted lifecycle fences PASS. [Handoff](handoffs/t15-s3.md).
All S1–S3 grants are closed. T16 actual backend/DB/Android, T17 named Pi and T18
packaging are dependency-ready/unassigned; T19/T20 retain their later prerequisites.
No automatic successor, real enablement or release. Parked/retired work, T06
omissions, T04 limits and all external/independent gates persist.

## Prior next-task checkpoint — T15-S2 accepted

[T15-S2](tasks/t15-s2-work-order.md) is [accepted/closed](evidence/t15-s2-review.md):
official SDK creation factories and compiled entry wired to strict config-only
runtime authority; recovery-preserving result/error/budget/cancellation delivery.
68/68 selected checks in15 files, four production/scoped checks,545 stable hashes
and isolated provider/ext4/HTTPS/SDK stdio/cleanup PASS. [Handoff](handoffs/t15-s2.md).
S1/S2 closed; S3 ready/unassigned. Parent T15 incomplete; process recovery/lifecycle,
clean locked parent acceptance and external/independent gates remain. No successor.

## Prior next-task checkpoint — T15-S1 accepted

The user assigned [T15-S1](tasks/t15-s1-work-order.md), now
[accepted/closed](evidence/t15-s1-review.md): guarded creation-capable runtime and
private admission-history repair;122/122 in18 files (11 owning +111 unchanged
regressions), four production/scoped checks,543 stable hashes and actual isolated
provider/ext4/HTTPS/cleanup PASS. [Handoff](handoffs/t15-s1.md). All S1 grants
closed; S2 ready/unassigned and S3 held. Parent T15 incomplete; executable creation
unavailable, clean locked parent acceptance and external/independent gates remain.

## Prior next-task checkpoint — T15 planning complete

The user requested T15 design and planning, now complete in the
[three-slice development contract](decisions/t15-plan-and-slices.md): S1 guarded
runtime, S2 MCP dispatch/recovery-field delivery, S3 compiled-process integration
and clean locked parent acceptance. S1 is ready for separate assignment; S2/S3
are sequentially held. No implementation/test execution, product creation or
successor task starts from this planning request. T08/T11 and supporting T12
lifecycle are accepted; real interoperability/independent release gates remain.

## Prior next-task checkpoint — T12 complete

The user assigned [T12-S4](tasks/t12-s4-work-order.md), now
[accepted with parent T12](evidence/t12-s4-review.md): 96/96 T12 owning +
229/229 relevant regressions = **325/325 in 31 exact files** on both workspace and clean locked snapshot, zero failed/skipped/pending/todo.
Complete privacy/config disclosures and integrated trusted lifecycle are delivered.
Four production checks, locked install, 192 byte-identical emitted files and
537 stable hashes PASS. [Current handoff](handoffs/t12-s4.md),
[operator flow](login.md). All T12 grants closed; T15 remains separate/unassigned,
create_routine unavailable, external/independent release gates unchanged. No successor.


[T11 planning complete](decisions/t11-plan-and-slices.md): S1 explicit active
recovery -> S2 authorized terminal replay/minimization -> S3 crash matrix and
integrated acceptance. User authorized [S1](tasks/t11-s1-work-order.md) after
planning; [S1 is accepted/closed](evidence/t11-s1-review.md):94/94 selected tests,
four production/scoped checks and494 stable hashes PASS.
[Historical S1 handoff](handoffs/t11-s1.md). The user subsequently authorized S2
then S3, now [accepted with parent T11](evidence/t11-s3-review.md):261/261 in20
files in workspace and clean locked replay, four production/scoped checks,
355 stable copied inputs,182 identical emitted files and506 identical stable
hashes PASS. [Current handoff](handoffs/t11-s3.md). All T11 grants closed;
T12/T15 dependency-ready/unassigned, product creation unavailable. No successor started.

[S3 and parent T10 accepted](evidence/t10-s3-review.md): fresh-only three-step
workflow,94/94 owning+88/88 selected regressions=182/182 in workspace and clean
locked replay. Four production/scoped checks,345 stable copied inputs,178 identical
outputs and492 identical stable hashes PASS; actual isolated production Secret
Service/ext4/T06/T05 HTTPS with synthetic fixtures.
[Dependency handoff](handoffs/t10-s3.md). All T10 work closed; T11-S1 is also
accepted and closed. Product creation remains unavailable. No automatic successor.

## Prior T10 bounded acceptance

The user assigned [T10-S2](tasks/t10-s2-work-order.md), now
[accepted/closed](evidence/t10-s2-review.md): durable single-step execution,
27/27 new S2+56/56 S1+88/88 regressions,171/171 total; four production/scoped
checks,37 stable hashes and real encrypted diagnostic engine/T06/T05 HTTPS PASS.
[Handoff](handoffs/t10-s2.md). S1/S2 closed, parent T10 incomplete. S3 fresh
workflow/production-provider composition/clean reproduction/integrated acceptance
is ready/unassigned; no automatic successor or product creation enablement.

At the prior checkpoint, the user assigned [T10-S1](tasks/t10-s1-work-order.md)
after the [bounded design](decisions/t10-plan-and-slices.md). S1 was
[accepted/closed](evidence/t10-s1-review.md): pure confirmation/error decisions,
56/56 owning+183/183 unchanged regressions,239/239 total; four production checks,
scoped checks and29 stable selected hashes PASS. [Handoff](handoffs/t10-s1.md).
Parent T10 remained incomplete; S2 was ready/unassigned before the subsequent
assignment and acceptance above. S3 still requires separate assignment.
T09 is complete as recorded below; older ready/unassigned references are historical.
Product creation remains unavailable; T11 recovery and T15 integration stay separate.

T08-S1/S2/S3 and parent T08 are complete. [S3 acceptance](evidence/t08-s3-review.md)
records actual stdio delivery, final active941/941 and clean full T08 owning82/82
passes, locked clean install/production checks and128 identical compiled outputs.
[Current handoff](handoffs/t08-s3.md) records boundaries and retained failures.

The user subsequently assigned T07-S1. [S1 is complete](evidence/t07-s1-review.md):
protected exchange, atomic installation, setup and descriptor recovery;47/47
owning checks and clean locked reproduction, with relevant regressions and
focused documentation repair. [Current handoff](handoffs/t07-s1.md).
The user subsequently assigned [S2](evidence/t07-s2-review.md), now complete:
secured dual-loopback GIS helper/page,20/20 owning,67/67 clean T07 replay and
213 selected checks across two passing batches. [Current handoff](handoffs/t07-s2.md).
The user subsequently assigned [S3 and parent integration](evidence/t07-s3-review.md),
now complete: compiled trusted CLI, fixed launcher/signals, operator guide;32/32 S3,
99/99 clean T07 replay and245 selected checks across two passing batches.
[Current handoff](handoffs/t07-s3.md). T09 is dependency-ready/unassigned; no automatic
successor. Real desktop/Google/backend/named-host/Android/release gates remain separate.
T06 is complete by user direction with explicit historical verification omissions;
those omissions and external release gates are not waived by T08 acceptance.

## T09 update — parent complete

[S3 and parent acceptance](evidence/t09-s3-review.md) delivers durable transitions,
atomic confirmation+terminal settlement, definitive compaction and trusted
unresolved retirement. All64 owning+132 selected regressions,196/196 total, pass
in workspace and clean locked replay;329 stable copied inputs,166 byte-identical
compiled outputs and62 stable selected hashes. [Current handoff](handoffs/t09-s3.md).
All T09 work closed. Product creation and automatic T10 succession remain unavailable.

## Prior T09 update — S2 complete

[S2 acceptance](evidence/t09-s2-review.md) delivers guarded durable admission and
exclusive operation access:22/22 new owning+27/27 unchanged S1+118/118 selected
regressions,167/167 total, production/scoped checks and54 stable hashes PASS.
Real isolated provider/ext4/HTTPS, ownership/reopen and admission fault checks
passed. [Current handoff](handoffs/t09-s2.md). S1/S2 closed; parent T09 incomplete;
S3 remains separately unassigned/held. Creation remains unavailable.

## Prior T09 update — S1 complete

The user assigned S1 after the [bounded plan](decisions/t09-plan-and-slices.md).
[S1 is accepted](evidence/t09-s1-review.md): versioned format/immutable identities
and capacity contract,27/27 owning+47/47 unchanged T03 regressions, production
checks and scoped stable hashes PASS. [Current handoff](handoffs/t09-s1.md).
Parent T09 remains incomplete; S1 closed, S2 guarded durable admission is ready/
unassigned, and S3 state transitions/restart proof/parent acceptance remains held.
No product routine creation or automatic successor is enabled.

## Task sizing and milestones

Tasks are parent implementation/review packages, not promises to finish within
one context. Apply the user-approved
[bounded-work and context-safe slicing policy](agent-coordination.md#standing-bounded-work-and-context-safe-slicing-policy)
before every assignment: keep small work whole; split larger/riskier tasks into
independently reviewable outcomes. Target 60–90-minute windows, checkpoint at
90 minutes and stop at two hours with an honest handoff, not rushed acceptance.
Final integrated checks still govern parent-task completion. Existing approximate
session counts are planning hints, not execution-window grants or guaranteed
durations; external integration may take longer.

[T06 has five proposed slices](tasks/t06-sessions-refresh.md#proposed-bounded-slices),
with a rough 6–12-hour overall allowance including QA/repairs across contexts.
T06-S1 and [T06-S2](evidence/t06-s2-coordinator-review.md) are accepted/closed.
S2 owning40+regressions129 pass with clean locked byte-identical reproduction;
all S1/S2 windows CLOSED. T06-S3 now [accepted c1/f1](evidence/t06-s3-coordinator-review.md):
33owning+169regressions,zero skips; clean171source/98identical compiled files,
269stable hashes. T06-S4 is now [accepted c4/f3](evidence/t06-s4-coordinator-review.md):
33owning+202regressions,zero fail/skip; clean189source/100identical compiled files/
289stable hashes,small8export smoke/source audit. [S4 handoff](handoffs/t06-s4.md).
ALL S1–S4 grants CLOSED, agents HELD. Prior f1/f2 failures/TWO irretrievable f2
observations/review misses/clean npmrc failure retained, not passed. That S4 checkpoint
was partial; S5/T06 now complete by user direction with omissions recorded above.
Internal auth completion is not a delivered browser/stdio server or release proof.
No whole-task-matrix delegation or automatic successor. Dependencies must have passing evidence,
not stubs. A policy revision does not count old tests passed.

| Milestone                                     | Active tasks | Exit condition                                                                                                                    |
| --------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| A: foundation, schemas, storage and transport | T01,T03–T05  | Pinned foundation; strict codecs, encrypted/restricted storage and fixed-origin transport verified. T02 is not a prerequisite.    |
| B: authentication and browsing                | T06–T08      | Dedicated session handling, browser login and six reads/seven-tool stdio surface; creation still unavailable pending integration. |
| C: recoverable creation engine/lifecycle      | T09–T12      | Server-side config guard, immutable journal identity/exact-byte steps, recovery and trusted cleanup under isolated tests.         |
| D: portable config-controlled integration     | T15          | Valid enabled calls create; disabled/missing/invalid config never mutates. No permission extension.                               |
| E: interoperability and release               | T16–T20      | Real isolated backend, named Pi, Google/browser and packaging gates pass with exact artifacts/versions.                           |

## Dependency graph

| Task | Requires               | Disposition                                                  |
| ---- | ---------------------- | ------------------------------------------------------------ |
| T01  | None                   | Accepted foundation                                          |
| T02  | T01                    | Parked historical companion experiment; no active dependency |
| T03  | T01                    | Accepted bounded schemas/codecs; independent evidence        |
| T04  | T01                    | Accepted bounded protected storage; independent evidence       |
| T05  | T01,T03                | Accepted bounded transport; independent/clean evidence       |
| T06  | T04,T05                | Complete by user; verification omissions recorded             |
| T07  | T04,T05,T06            | Done; S1/S2/S3 and parent accepted                              |
| T08  | T03,T05,T06            | Done; S1/S2/S3 accepted              |
| T09  | T03,T04                | Done; S1/S2/S3 and integrated parent accepted                      |
| T10  | T05,T06,T09            | Done; S1/S2/S3 and integrated parent accepted               |
| T11  | T10                    | Done; S1/S2/S3 and integrated parent accepted                 |
| T12  | T06,T07,T11            | Complete; S1–S4 and clean locked parent acceptance passed                 |
| T13  | Historical T02,T04,T08 | Retired companion registration                               |
| T14  | Historical T03,T09,T13 | Retired companion approval                                   |
| T15  | T08,T11                | S1–S3 and parent accepted/closed                 |
| T16  | T07,T12,T15            | Complete: S1–S7 and integrated parent accepted/closed                       |
| T17  | T12,T15                | Incomplete; S1 accepted, later outcomes held                  |
| T18  | T12,T15                | S1/S2/S3 and parent accepted/closed |
| T19  | T07,T16,T18            | Planned real Google/browser smoke                            |
| T20  | T16,T17,T18,T19        | Planned independent final review                             |
| T21  | Revised MCP contract; accepted prior implementation | S1–S4 accepted; S5 ready/unassigned, S6 held |

## Historical parallel-work checkpoints

The current T08 closure and next-task disposition above supersede older
assignment descriptions in this section.

After T01, T03 schemas/codecs and T04 storage are independent of parked T02.
The subsequent user-authorized T03 work is accepted with
[independent evidence](evidence/t03-coordinator-review.md). User subsequently
assigned T04 storage for Linux Secret Service with fresh Developer/QA. It is
accepted with [independent/clean-install evidence](evidence/t04-coordinator-review.md);
owning123/123, foundation100/100 and T03221/221, byte-identical clean build.
T05 transport is subsequently accepted with [independent/clean evidence](evidence/t05-coordinator-review.md):
228active owning +444regressions,0skips; locked install/production checks and identical
rebuilt bytes. All T05 windows closed; [prior daily handoff](handoffs/t05-end-of-day.md).
T06-S1 is accepted c2/f1 (51owning+399regressions,zero skips,clean locked identical
build); all S1 windows CLOSED. T06-S2 is now accepted c2/f1 with owning40 +regressions129,
zero skips, clean161-source locked reproduction/96identical compiled files and257stable
hashes. All S2 windows CLOSED. T06-S3 is now accepted c1/f1:
33owning+169regressions,clean171source/98identical compiled files/269stable hashes;
[S3 handoff](handoffs/t06-s3.md). T06-S4 is now accepted c4/f3 with owning33+
regressions202,clean189source/100identical compiled files/289stable hashes;
[S4 handoff](handoffs/t06-s4.md). ALL S1–S4 grants CLOSED, agents HELD.
S5/T06 is now COMPLETE by user direction; exact independent parent859PASS,
clean install/static/build identical, remaining verification explicitly omitted.
[Current pickup](handoffs/t06-complete-coordinator-pickup.md). ALL source/runtime
windows CLOSED at T06 closure. User subsequently selected/designed T08 and now
authorized/accepted S1 c3/f2 with independent owning/regression evidence; all windows
now closed. S2 dependency-ready/unassigned; S3 held. T07/T09
ready/unassigned; no automatic slice successor.
Initial failed designs/targets and bounded deferrals remain recorded.
T03 was not started by the earlier docs-only policy revision. T05 follows schemas; T09 follows schemas/storage. Authentication, reads
and journal work proceed against settled public interfaces and exclusive
concurrent edit ownership. T07/T08 can overlap after T06; T15 follows T08/T11.
External access for T16/T19/Android is an additional prerequisite, never fabricated.

One primary Codex agent owns production/config/build metadata, tests, review,
evidence and task/status updates. It may spin up bounded subagents at its
discretion. Each task follows the
[decision-ready planning default](agent-coordination.md#default-primary-agent-decision-ready-task-planning):
record a concise settled public contract and scoped permissions, then choose
implementation internals and specification-derived checks. Escalate unresolved
public/contract decisions to the user. Broad proposals/design rounds require an
explicit bounded request, not an automatic task stage.

The standing team, Herdr layout, role-private source rules and artifact-ready
relays are retired. Stable targets and required review/reproduction/release
evidence remain: no build/install overlaps test execution against its target.
Parked T02 checks/old dependency pins may need future explicit build/package/suite
reconciliation, not silent exclusions.

## Remaining implementation decisions

Record reviewed ADRs/evidence for schema/lossless codec boundaries,
OS secret store, encryption/durability/ownership/generation fences, HTTP budgets,
config file location/load/reload semantics and package/upgrade compatibility.
The sole write-enable field is writesEnabled (strict boolean, default false).
No external permission-extension selection is needed. Preserve existing T01
inert companion artifacts until an explicit cleanup assignment, not scope creep.

Do not invent service origin, Google client ID/registered loopback port, isolated
backend provisioning or secret facility. Coordinate external placeholders and keep
release gates blocked when missing. Shared contract changes must be explicit;
this approved write-policy revision does not authorize unrelated backend changes.

## Completion boundary

The deliverable is a portable stdio server, trusted local CLI/auth/lifecycle,
config-only routine creation, protected recoverable operation storage, pinned
artifacts, setup/privacy/recovery guides and genuine integration evidence.
No required permission companion. Tests against doubles are not backend/browser/
Android evidence. No actual product writes, release acceptance, commits,
publication, deployment or personal-account actions follow from this docs update.
