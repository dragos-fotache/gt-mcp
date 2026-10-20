# Implementation documentation

**Standing workflow (2026-10-15):** one primary Codex agent, with optional
bounded subagents at its discretion. See the [working policy](agent-coordination.md); historical team/role
instructions below do not govern future work.

## Current change — T21-S6 and parent accepted

The user-assigned [S6](tasks/t21-s6-work-order.md) and parent T21 are [accepted/closed](evidence/t21-s6-review.md).
Workspace and clean locked replay each pass1,076/1,076 checks across105 files,
zero failures/skips/pending/todo. Exact private archive installation, config2/
single-record ownership/auth/lifecycle, fresh creation and old-format refusal pass.
Clean reconstruction matches source,176 emitted outputs and exact archive bytes/
content/modes/lock. [Package inventory](evidence/t21-s6-package-inventory.json), [handoff](handoffs/t21-s6.md),
[bounded laptop handoff](handoffs/t21-s6-laptop.md). S1–S6 closed; historical R1/laptop unchanged.
Actual Pi CLI/modes/lifecycle/output, current Android delivery, T19 and independent
T20 remain unverified release gates. Btrfs testing is user-owned. No publication,
laptop/live deployment, real write enablement or automatic successor grant.

## Prior change — T21-S5 accepted; parent incomplete

The user-assigned [S5](tasks/t21-s5-work-order.md) is [accepted/closed](evidence/t21-s5-review.md):545/545 checks in58
files,569 stable hashes and176 unchanged compiled outputs. Actual isolated backend/
SDK/Pi print boundaries verify fresh independent creation, truthful interruption,
no startup work, config2/single-record persistence and retained auth/session fences.
Original retired requirements/sources and failures are mapped explicitly; the
remaining T17 plan is refreshed. Production/scoped checks and owned cleanup pass.
[Handoff](handoffs/t21-s5.md). S1–S5 closed; S6 ready/unassigned, parent T21 incomplete.
R1/laptop retain old installed behavior. Actual Pi CLI/modes/lifecycle/output,
current Android delivery, T19 and independent T20 remain unverified. Btrfs testing
stays user-owned. No new package/install/parent/release claim.

## Prior change — T21-S4 accepted; parent incomplete

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

## Historical baseline and authority

The following section records pre-T21 planning. Current shared MCP draft0.3 and
the [successor spec](decisions/t21-single-record-storage-spec.md) govern changed
behavior; historical acceptance keeps its original artifact scope.

This plan is grounded in shared-docs commit **9a96dcb**, with a user-approved
uncommitted MCP **0.2-draft** policy revision, and unchanged backend OpenAPI **1.0.0**.
The revision replaces mandatory host approval/companion with config-only creation.
Record working-tree shared changes and review them before implementation; neither
baseline identity nor documentation selection implies tested implementation.

The MCP contract is a draft, not an implemented-server claim. The current user
choice is local-browser Google login, unresolved evidence retention until settlement/
retirement, and **configuration-only routine creation**: a trusted config-file
`writesEnabled` flag, false by default, with no custom/external permission extension
or per-routine approval. See [the approved policy revision](decisions/routine-creation-config-policy.md).
Local stdio/seven-tool scope and backend v1 rules remain unchanged. Shared MCP
draft0.2 now documents this approved policy. Draft0.1 approval clauses are historical;
parked old evidence is not current-policy acceptance. Release verification remains open.

## Standing testing preference

The user requires **proportional, reduced testing scope for ALL future work**,
not only T05. Read the [standing policy](decisions/proportional-testing-policy.md)
before every task: core contract/risk-based checks, small reusable fixtures, early
static checks, focused repair runs and final relevant regressions. Keep selective
high-value unit tests; prefer real isolated integration checks for system boundaries.
No unit-test quota, coverage-percentage or line-ratio target. Avoid private-function
assertions, implementation-mirroring mocks and redundant cases; each test needs a
meaningful bug/risk rationale and an independent specification-derived oracle.
No default exhaustive permutations or generalized harness project; no weakening
safety, blanket deletion of existing tests or counting deferred work as passed.
Carry this instruction into all handoffs.

## Historical pickup — T18-R1 package refresh accepted/closed

[R1 review](evidence/t18-r1-review.md):40/40 in12 files on workspace and clean,
zero failures/skips;430 source inputs,194 emitted files and exact archive bytes/
content/modes/lock match.96 files/86 JS/111 dependencies; installed recovery/
refusal and owned cleanup PASS. [Handoff](handoffs/t18-r1.md). R1 closed;
T17-S2–S5, T19 and independent T20 remain separate. No successor or release.

## Prior pickup — T17-S1 accepted; parent incomplete

[S1 review](evidence/t17-s1-review.md):25/25 in five files (8 actual Pi SDK print
checks +17 unchanged regressions), zero failures/skips;623 stable hashes,194
identical emitted files and owned cleanup PASS. Direct/deferred/codemode paths
negotiate MCP2025-11-25 and preserve config-only creation.
[Handoff](handoffs/t17-s1.md), [Pi notes](pi.md). Later lifecycle/recovery/mode/output
and integrated acceptance work held; parent T17 incomplete. T16/T18 stay closed;
T19 and independent T20 remain separate. No automatic successor.

## Prior pickup — T16 complete; S7 accepted/closed

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

[S2 review](evidence/t16-s2-review.md): 90/90 in eight files (all nine active T16
checks  + 81 unchanged auth/lifecycle regressions), zero failed/skipped/pending/todo;
604 hashes stable. Actual concurrent refresh, exact lost-rotation recovery across
MCP/backend restart, representative resource replay after restart and real-lock
logout/account-disable write fences pass. Two Java restarts and owned cleanup
verified; 298 product inputs/194 rebuilt outputs and 116 backend inputs unchanged.
No product/contract/live-environment changes. [Handoff](handoffs/t16-s2.md).
S1/S2 closed; later outcomes unassigned. Remaining timing/cursor/ownership/domain/
race/recovery/Android and parent acceptance stay open; T17/T19/T20 unchanged.

## Prior pickup — T16-S1 complete; parent T16 incomplete

[S1 review](evidence/t16-s1-review.md) records 450/450 in 49 exact files: 4 real-backend
owning checks  + 446 unchanged regressions, zero failed/skipped/pending/todo.
Actual isolated backend/PostgreSQL, compiled MCP/SDK and private provider/ext4/TLS
verify representative reads, creation, exact committed-response-loss replay at all
three steps, independent DB effects and ordinary draft/saved sync. Original 116
backend inputs and 603 selected hashes stable; all owned private resources cleaned.
No product code/dependency/contract changes or live Android access.
[Handoff](handoffs/t16-s1.md). S1 closed; later bounded outcomes unassigned. Full
T16 auth/race/recovery/Android and integrated gates remain; T17/T19/T20 unchanged.

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

## Prior pickup — T18 planned; S1 unassigned

The [T18 development plan](decisions/t18-plan-and-slices.md) settles a private local
runtime tarball and standalone runtime lock, corrected trusted CLI bin, explicit
production/worker contents, false templates and same-format replacement/recovery.
Three sequential slices cover artifact/bins, standalone operator guides, then
installed recovery and clean parent acceptance. S1 is ready for separate
assignment after restoring the pinned toolchain/isolated prerequisites; S2/S3
remain held. The 2026-10-16 planning assignment edited documentation only, with
no install/build/behavioral execution or implementation grant. T15 remains closed;
T16/T17/T19/T20 external/independent gates and all prior limits remain unchanged.

## Prior pickup — T15 accepted; external gates unassigned

[T15-S3/parent acceptance](evidence/t15-s3-review.md) completes portable config-controlled creation:
446/446 PASS in 48 exact files (30 T15 owning + 416 relevant regressions), zero failed/skipped/pending/todo; four production/scoped checks, 584 stable hashes, clean locked replay, 388 identical source inputs and 194 byte-identical emitted outputs.
Actual isolated provider/ext4/HTTPS/SDK process recovery, lost reply, policy,
cancellation/stop and trusted lifecycle fences PASS. [Handoff](handoffs/t15-s3.md).
All S1–S3 grants are closed. T16 actual backend/DB/Android, T17 named Pi and T18
packaging are dependency-ready/unassigned; T19/T20 retain their later prerequisites.
No automatic successor, real enablement or release. Parked/retired work, T06
omissions, T04 limits and all external/independent gates persist.

## Prior pickup — T15-S2 accepted; S3 unassigned

[T15-S2](tasks/t15-s2-work-order.md) is [accepted/closed](evidence/t15-s2-review.md):
guarded creation now reaches the official SDK and compiled stdio entry, with
recovery-preserving errors/budgets/cancellation and operator launch/disclosure notes.
68/68 in15 files (20 owning +48 regressions), four production/scoped checks,
545 stable hashes and actual isolated provider/ext4/HTTPS/SDK stdio/cleanup PASS.
[Handoff](handoffs/t15-s2.md). S1/S2 closed; S3 ready/unassigned, parent T15 incomplete.
Clean parent/process recovery/lifecycle and external/independent release gates
remain. No successor started.

## Prior pickup — T15-S1 accepted; S2 unassigned

The user assigned [T15-S1](tasks/t15-s1-work-order.md), now
[accepted/closed](evidence/t15-s1-review.md): guarded runtime/private admission
history repair;122/122 in18 files (11 owning +111 unchanged regressions), four
production/scoped checks,543 stable hashes and actual isolated provider/ext4/HTTPS/
cleanup PASS. [Handoff](handoffs/t15-s1.md), [plan](decisions/t15-plan-and-slices.md).
All S1 grants closed; S2 ready/unassigned, S3 held, parent T15 incomplete. The
executable still advertises unavailable creation. Clean locked parent replay and
all external/independent release gates remain; no automatic successor.

## Prior pickup — T15 planning complete

The user's T15 design/planning request is complete in the
[development contract](decisions/t15-plan-and-slices.md). Three sequential slices:
S1 guarded runtime, S2 MCP dispatch with safe recovery-field delivery, S3 actual
compiled-process integration and clean locked parent acceptance. Dependencies
T08/T11 and supporting T12 lifecycle are accepted. S1 is ready for separate
assignment; S2/S3 are held. No implementation/test window or successor is opened;
creation remains unavailable and external/independent release gates unchanged.

## Prior pickup — T12 complete; T15 unassigned

The user assigned [T12-S4](tasks/t12-s4-work-order.md), now
[accepted with parent T12](evidence/t12-s4-review.md): 96/96 T12 owning +
229/229 relevant regressions = **325/325 in 31 exact files** on both workspace and clean locked snapshot, zero failed/skipped/pending/todo.
Complete privacy/config disclosures and integrated trusted lifecycle are delivered.
Four production checks, locked install, 192 byte-identical emitted files and
537 stable hashes PASS. [Current handoff](handoffs/t12-s4.md),
[operator flow](login.md). All T12 grants closed; T15 remains separate/unassigned,
create_routine unavailable, external/independent release gates unchanged. No successor.

## Prior pickup — T12-S3 accepted

The user assigned [S3](tasks/t12-s3-work-order.md), now
[accepted/closed](evidence/t12-s3-review.md): foreground accountStatus proof,
private verified-receipt provenance and matching S2 cleanup, with safe active/
failed-proof preservation and stale-generation rejection.33/33 new S3+58/58
unchanged S1/S2+206/206 regressions=297/297 in24 exact files. Four production/scoped
checks,535 stable hashes and actual isolated provider/ext4/HTTPS/dual-loopback/
compiled CLI/owned cleanup PASS. [Current handoff](handoffs/t12-s3.md),
[API/provenance notes](decisions/t12-account-status-boundary.md). Parent T12 remains
incomplete; S1–S3 closed, S4 operator flow/clean locked integrated acceptance ready/
unassigned, T15 unassigned and creation unavailable. No successor or independent/
external release gate is enabled/waived. Earlier pickup statuses below are historical.

## Prior pickup — T12-S2 accepted

The user assigned [S2](tasks/t12-s2-work-order.md) after accepted S1.
[S2 acceptance](evidence/t12-s2-review.md) delivers durable profile/key removal,
external generation fences, interrupted cleanup/metadata recovery and explicit
reconciled setup with a distinct empty generation.37/37 new S2+21/21 unchanged
S1+244/244 relevant regressions=302/302 in35 exact files; four production/scoped
checks,525 stable hashes and actual isolated provider/ext4/HTTPS/compiled CLI with
owned cleanup PASS. [Current handoff](handoffs/t12-s2.md),
[format/API notes](decisions/t12-removal-format.md). Parent T12 remains incomplete;
S1/S2 closed, S3 verified account-status cleanup ready/unassigned, S4 held, T15
unassigned. Clean locked parent replay and all independent/external release gates
remain. No successor or product creation is enabled. The
[four-slice plan](decisions/t12-plan-and-slices.md) and
[S1 historical acceptance](evidence/t12-s1-review.md) remain recorded.

[T11 plan](decisions/t11-plan-and-slices.md) splits active recovery, authorized
terminal replay/minimization and crash-matrix/integrated acceptance. The user
authorized [S1](tasks/t11-s1-work-order.md) after planning;
[S1 is accepted/closed](evidence/t11-s1-review.md):14/14 owning+80/80 regressions=
94/94, four production/scoped checks,494 stable hashes and actual isolated
provider/ext4/HTTPS explicit recovery PASS. [Current handoff](handoffs/t11-s1.md).
The user then authorized S2 and S3, now
[accepted with parent T11](evidence/t11-s3-review.md):55/55 owning+206/206
regressions=261/261 in20 files in workspace and clean locked replay. Four production/
scoped checks,355 stable copied inputs,182 byte-identical emitted outputs and506
identical stable selected hashes PASS. [Current handoff](handoffs/t11-s3.md).
All T11 grants closed; T12/T15 dependency-ready/unassigned. Product creation
unavailable; real backend/DB/Android and independent/external release gates remain.

[S3 and parent T10 acceptance](evidence/t10-s3-review.md) records94/94 active
owning+88/88 selected regressions=182/182 in workspace and clean locked replay.
Four production/scoped checks,345 stable copied inputs,178 identical emitted
outputs and492 identical stable selected hashes PASS. Fresh workflow composes
actual isolated production Secret Service/ext4/T04/T09/T06/T05 private-CA HTTPS
with synthetic data; no real backend/DB/Android claim.
[Dependency handoff](handoffs/t10-s3.md). All T10 work closed; T11-S1 is also
accepted and closed. Product creation stays unavailable; no automatic successor.

## Prior pickup — T07 complete

Read [T08-S3 handoff](handoffs/t08-s3.md) and [acceptance](evidence/t08-s3-review.md).
The real stdio entry now serves the accepted runtime/SDK surface. Final 76-file
active selection941/941 and clean full T08 owning82/82 PASS; locked install/four
production checks and128 identical compiled files PASS;280 input hashes stable.
The user replaced the historical Herdr/two-role workflow for this task with direct
primary-agent work and optional bounded subagents. All S3 work is closed.
The user subsequently assigned T07-S1 with direct primary-agent work and optional
helpers, superseding historical QA/Developer/Herdr relays for this assignment.
[S1 is complete](evidence/t07-s1-review.md): protected exchange, atomic initial/
same-account installation, setup and explicit descriptor recovery;47/47 owning
checks, clean locked reproduction and relevant regressions with a focused
documentation repair. [Current handoff](handoffs/t07-s1.md).
The subsequent user-assigned [S2 is complete](evidence/t07-s2-review.md): secured
dual-loopback GIS helper/page,20/20 owning,67/67 clean T07 replay,204/204 selected
checks plus9/9 unchanged provider checks,144 identical compiled files and327
stable inputs. [Current handoff](handoffs/t07-s2.md).
The subsequent user-assigned [S3 and parent T07 are complete](evidence/t07-s3-review.md):
compiled trusted CLI, single-capture browser composition, fixed launcher/signals
and [operator guide](login.md);32/32 S3,99/99 clean T07,236/236 selected plus9/9
provider checks,148 identical compiled files and334 stable inputs.
[Current handoff](handoffs/t07-s3.md). All T07 work is closed; T09 remains ready/
unassigned and no successor started. Real desktop/Google/browser remains unverified.
No routine creation, live/backend/Google/Android/named-host or release acceptance.
Historical T06 omissions and parked/retired work remain recorded.

## Prior T09 pickup — parent complete

[S3 and parent accepted](evidence/t09-s3-review.md):64/64 active owning+132/132
selected regressions,196/196 total in workspace and clean locked replay. Four
production checks/clean install,329 stable copied inputs,166 byte-identical
outputs and62 stable selected hashes PASS. [Current handoff](handoffs/t09-s3.md).
All T09 work closed; T10 is unassigned, and product creation remains unavailable.
Actual execution/recovery/lifecycle/MCP wiring and external release gates remain.

## Prior T09 pickup — S2 complete

[S2 accepted](evidence/t09-s2-review.md): guarded durable admission, exclusive
callbacks and async owner fences;167/167 exact selected tests, production/scoped
checks,54 stable hashes and isolated provider/ext4/HTTPS/ownership/fault checks
PASS. [Current handoff](handoffs/t09-s2.md). S1/S2 closed; parent T09 incomplete;
S3 unassigned/held for separate authorization. Product creation stays unavailable.

## Prior T09 pickup — S1 complete

The user assigned S1 after planning. [S1 acceptance](evidence/t09-s1-review.md)
records27/27 owning+47/47 unchanged T03 regressions,74/74 total, production checks,
stable scoped hashes and a small import smoke. The
[format/interface note](decisions/t09-journal-format.md) describes immutable
records and capacity accounting. [Current handoff](handoffs/t09-s1.md).
Parent T09 is incomplete; S1 closed, S2 ready/unassigned, S3 held.
No durable admission, mutation dispatch or creation enablement is delivered.

## Prior pickup — T06 complete by user direction

Read [next-Coordinator pickup](handoffs/t06-complete-coordinator-pickup.md) and
[closure evidence](evidence/t06-s5-coordinator-closure.md). S5 owning30/30 and
exact parent859/859PASS; locked clean install/production checks/102identical outputs
PASS. User omitted remaining clean behavioral replay/import smoke/additional QA
reconfirmation: WAIVED/UNRUN, not passed. Historical failures/count mistakes and
QA ungranted whole-repository execution/unknown observations remain disclosed.
ALL source/static/build/install/runtime grants CLOSED, Developer/QA HELD. User
subsequently selected T08 for Coordinator general design/slicing; see the
[design sequence](decisions/t08-general-design-and-slices.md). S1/S2/S3 now have
settled specifications. User subsequently authorized S1, now
[ACCEPTED c3/f2](evidence/t08-s1-coordinator-review.md):101/101 owning/relevant regressions,
stable137-input freeze, pinned production checks and real isolated provider/HTTPS/
cleanup. [S1 handoff](handoffs/t08-s1.md); failures/limits preserved, all role windows
CLOSED. Parent T08 incomplete; S2 dependency-ready/unassigned, S3 held, T07/T09 ready/
unassigned. No automatic slice succession or release acceptance follows.
No actual product writes, .pi/settings/trust edits, staging/commits/release or
standing-policy change. Older incomplete/blocked/current-assignment descriptions
below are historical and do not renew grants.

## Accepted S4 checkpoint — historical closure

User-authorized **T06-S4 only** is now [accepted c4/f3](evidence/t06-s4-coordinator-review.md):
33owning+202unchanged regressions,zero fail/skip; clean189-source locked reproduction,
100identical compiled files,289stable hashes,small8export smoke/source audit.
Read [S4 handoff](handoffs/t06-s4.md) and frozen [public contract](tasks/t06-s4-work-order.md)/
[common adjudication](decisions/t06-s4-interface-adjudication.md).
ALL S1–S4 source/build/static/target/fixture/rerun windows CLOSED, Developer/QA HELD.
S5 unassigned; parent T06 incomplete/T07/T08 blocked. No automatic successor/context
renewal, product writes, staging/commits or release.
Prior f1/f2 red results/TWO irretrievable f2 observations/review misses/Coordinator
clean npmrc failure retained honestly; NEW complete f3 proof accepts current artifact,
not old failures or whole-suite/parent/release gates. Earlier pickup statuses below
are historical wherever they describe S4 as unassigned/open; frozen bytes unchanged.

## Reading order

1. [Shared MCP contract](../shared-docs/docs/mcp-contract/README.md), including its four linked documents.
2. [Architecture](architecture.md).
3. [Implementation roadmap](implementation-plan.md).
4. [Task index](tasks/README.md) and the chosen task's handoff.
5. [Verification](verification.md) and the task's normative shared references.

T01 foundation and bounded T03 schema/codec primitives are implemented and
accepted with [foundation evidence](evidence/t01-coordinator-review.md) and
[T03 evidence](evidence/t03-coordinator-review.md). T04 protected storage is now accepted with independent/clean-snapshot evidence.
Internal authentication/session lifecycle is complete with recorded user omissions.
Browser login, trusted CLI commands, creation admission/journals and real
backend/host interoperability remain unimplemented/unverified. The read-stdio
server is delivered by the latest T08 closure above. Task states in this documentation are
independent of an individual agent's temporary todo list.

## Working policy

The user-approved standing workflow is one primary Codex agent responsible for
planning, implementation, tests, review and task/evidence updates, with optional
bounded subagents at its discretion. The former standing team, Herdr layout,
separate Developer/QA sessions and role-private source restrictions are retired.
See the [current working policy](agent-coordination.md); historical staffing and
task grants remain records rather than future instructions.

Before coding, use the
[decision-ready task-planning default](agent-coordination.md#default-primary-agent-decision-ready-task-planning):
settle public behavior/interfaces, scope, permissions, verification and stopping
conditions in a concise work order. Choose implementation internals and
specification-derived tests within it. Escalate specific unresolved public
decisions to the user; broad proposals need an explicit bounded request.

Apply the
[bounded-work and context-safe slicing policy](agent-coordination.md#standing-bounded-work-and-context-safe-slicing-policy):
keep small tasks whole, split larger/riskier work by reviewable outcome, target
60–90-minute windows, checkpoint at 90 minutes and stop at two hours with an
honest handoff. Preserve stable test targets, proportional verification, final
parent-task integrated acceptance, mandatory safety/release gates and no automatic
successor. No new implementation task is opened by this workflow revision.

The prior pickup records below retain historical task status and permissions;
the latest T07-complete pickup above and task index govern current readiness.

**Current pickup:** T02 is **parked, incomplete** by user decision. Preserve its
experimental companion/harness/fixture and independent evidence; four historical
slices/six SDK profiles accepted, R3 candidate artifact-ready but NOT independently
accepted. No R3 QA artifact relay, R4–R11 continuation or automatic succession.
T13/T14 companion tasks are retired from current delivery; T15/T17/T18 now target
the portable config-controlled server. No external permission extension is planned.
T03 schemas/codecs is accepted after fresh Developer/QA work and independent
clean-install reproduction; read its [handoff](tasks/t03-schemas-codecs.md),
[public specification](decisions/t03-approved-schema-codec-spec.md) and
[pinned-Zod adjudication](decisions/t03-zod-import-adjudication.md).
T04 protected storage is accepted with independent QA and clean locked source-
snapshot reproduction; read its [handoff](tasks/t04-private-storage.md) and
[acceptance](evidence/t04-coordinator-review.md). All T04 windows closed.
T05 transport is accepted on c4/f3:228owning +444relevant regressions, independent
clean locked reproduction and identical rebuilt bytes; read [acceptance](evidence/t05-coordinator-review.md)
and [daily handoff](handoffs/t05-end-of-day.md). All windows closed, agents held.
T06-S1 state/install/read fences is [accepted c2/f1](evidence/t06-s1-coordinator-review.md):
51owning+399regressions,zero skips; clean locked reproduction and identical build.
All S1 windows closed; read [S1 handoff](handoffs/t06-s1.md).
T06-S2 durable refresh is [accepted c2/f1](evidence/t06-s2-coordinator-review.md):
40owning+129regressions,zero skips, clean161-source locked reproduction,96identical
compiled files and257stable hashes. [S2 handoff](handoffs/t06-s2.md); all grants
CLOSED for S1/S2. T06-S3 exact recovery now [accepted c1/f1](evidence/t06-s3-coordinator-review.md):
33owning+169unchanged regressions,zero skips; clean171source locked reproduction,
98identical compiled files and269stable hashes. [S3 handoff](handoffs/t06-s3.md).
ALL S1–S3 windows CLOSED, Developer/QA HELD. S4/S5 unassigned, parent T06 incomplete
and T07/T08 not unlocked. Internal recovery is not safely delivered server/lifecycle
or release acceptance.
T09 remains ready/unassigned; no actual writes or automatic successor.
Use the [single-agent working policy](agent-coordination.md) for future work. Read the
[policy revision](decisions/routine-creation-config-policy.md) before task handoffs.
[Current config-only pickup](handoffs/mcp-config-only-pickup.md) records the next
bounded MCP work. [Parked coordinator pickup](handoffs/t02-coordinator-pickup.md)
retains its historical access label; the primary agent may read it under the
current workflow. [Docs review](evidence/config-only-policy-doc-review.md)
records this policy revision's checks, not implementation acceptance.

## How the primary agent picks up work

- Claim one ready task in [the index](tasks/README.md); record owner and status before editing.
- Read dependency handoffs and existing code, then repeat their relevant checks.
- Do not assume a prerequisite is implemented merely because a directory or stub exists.
- Keep one task bounded; coordinate shared interface changes before parallel work.
- Keep actual writes disabled during development except in expressly isolated tests.
  Planned production creation requires only explicit config-file writesEnabled:true
  plus normal auth/validation/recovery safeguards; no permission extension.
- Apply the [standing proportional-testing policy](decisions/proportional-testing-policy.md):
  add core requirement/risk-based tests with the implementation, check sources early,
  keep fixtures small and choose relevant final regressions. Reconcile oversized old
  local plans explicitly; mandatory failure paths/safety requirements remain.
- Record commands, results, versions, changed paths, limitations and next steps in that
  task file's Handoff section. Sanitized summaries only; no private paths, account IDs,
  tokens, HTTP bodies, or personal data in execution evidence.
- Mark done only when its acceptance criteria pass. If external configuration or a real
  service is missing, mark blocked/partial and identify the blocker; do not count a skip
  or a simulator as release evidence.
- Update the index and verification evidence in the same handoff. Never rewrite the
  shared contract to make a failing implementation appear conformant.

Task states: planned -> in progress -> done, or blocked with a retained progress summary.
A user-parked task retains unfinished evidence without being counted done; a retired
scope remains historical and is removed from active dependencies.
Documentation changes alone do not complete an implementation task.

## Planning artifacts

| Document                                         | Purpose                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| [implementation-plan.md](implementation-plan.md) | Sequencing, milestones, dependency graph, delivery scope.                  |
| [architecture.md](architecture.md)               | Proposed modules, interfaces, durable state, security decisions and risks. |
| [tasks/README.md](tasks/README.md)               | Claimable task queue with individual agent handoffs.                       |
| [verification.md](verification.md)               | Scenario coverage, test layers, external inputs and certification gates.   |

Recommended future local documents: versioned ADRs under docs/decisions/, setup and
operations guides, and sanitized evidence under docs/evidence/. Create these as part
of their owning tasks rather than adding empty placeholders now.
