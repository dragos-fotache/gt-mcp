# Agent task queue

## Complete — installer update in place

The user authorized [compatible application updates](installer-update-work-order.md).
Explicit --update stages locked installation, preserves external configuration/
credentials and retains the previous executable at a sibling backup. The original
application path and Hermes registration remain usable. Focused8/8 and final61/61
exact-archive checks pass, with owned cleanup and unchanged S2 runtime bytes.
[New archive/checksum/review](../handoffs/installer-update.md). Ten historical
delivery files stay unchanged. No laptop deployment or S3 acceptance.

## Complete — multiple clients S2 install package

The user authorized a [new private install package](multi-client-package-work-order.md)
and inspection of the installer's update behavior. The separately identified
90-file archive passes57/57 exact-archive installed checks in five files,593 stable
hashes and owned cleanup; all79 runtime JS files match S2. Prior deliveries are
unchanged. The installer remains fresh-only; compatible executable replacement is
documented. [Package/checksum/handoff](../handoffs/multi-client-package.md).
S3 parent acceptance and independent review remain held; no laptop deployment.

## Completed implementation — multiple clients S2

The user authorized [S2 runtime ownership and result delivery](multi-client-s2-work-order.md)
after completed S1. Implementation and primary review are complete: configured
servers hold no idle owner, calls compose fresh auth under exclusive ownership
through SDK response handoff, and cancellation/close/unsafe-state fences release
safely. Final167/167 checks across28 files,591 stable hashes, production checks/build
and owned-provider cleanup pass. [Handoff/review](../handoffs/multi-client-s2.md).
S3 parent acceptance, independent review and deployment remain held. The later
separate packaging grant is recorded above.
No successor started; no laptop installation changed.

## Completed implementation — multiple clients S1

The user authorized [slice1: bounded, cancellable profile acquisition](multi-client-s1-work-order.md)
on2026-10-18. Implementation and primary review are complete:50/50 checks across
seven files pass, zero failures/skips,583 stable execution hashes; production
checks/build and isolated cleanup pass. [Handoff/review](../handoffs/multi-client-s1.md).
Runtime/protocol integration, independent parent review/acceptance and delivery
were held at S1 close; the subsequently authorized S2 implementation is recorded
above. Historical S1 evidence is unchanged.

## Investigation — multiple clients sharing credentials

The user-requested [investigation and implementation plan](multi-client-credential-ownership-plan.md)
is complete (2026-10-18). Source and read-only laptop inspection confirm lifetime
exclusive ownership and a surviving Hermes/MCP/worker process chain. Recommended:
cancellable ownership per complete tool invocation, fresh auth on acquisition and
no idle lock, with serialized calls sharing a profile. Implementation, tests,
packaging and laptop deployment were not authorized by that plan; the subsequent
S1-only implementation grant is recorded above.

**Standing workflow (2026-10-15):** one primary Codex agent, with optional
bounded subagents at its discretion. See the [working policy](../agent-coordination.md); historical team/role
instructions below do not govern future work.

**T01 foundation, bounded T03 schemas/codecs, T04 storage and T05 transport are accepted.
T02 is parked/incomplete by user decision;
T13/T14 companion tasks are retired from current delivery.** The current product
policy is [config-file writesEnabled only](../decisions/routine-creation-config-policy.md):
no custom/external permission extension or per-routine prompt. Shared MCP draft0.3
is now the T21 target in the uncommitted working tree; backend v1 is unchanged.
R1 still implements the prior recovery behavior. Current source implements fresh
creation; S4 now integrates config2/single-record credentials. The T21 successor
spec supersedes only named requirements, not historical acceptance.

T03 schemas/codecs is done with [independent acceptance](../evidence/t03-coordinator-review.md):
221/221 owning tests,100/100 foundation, clean locked source-snapshot install and
production checks; no protocol/guard/backend/host/release claim.
T04 is done with [independent acceptance](../evidence/t04-coordinator-review.md):
123/123 owning tests (real isolated Secret Service included),100/100 foundation,
221/221 T03, clean136-file locked source snapshot and byte-identical frozen build.
T05 is done with [independent acceptance](../evidence/t05-coordinator-review.md):
228/228active owning +444/444regressions,0skips, clean174-file locked reproduction
and byte-identical frozen build. All T04/T05windows CLOSED; the
[prior wrap](../handoffs/t05-end-of-day.md) is historical.
T06-S1 session state/fences is now [accepted c2/f1](../evidence/t06-s1-coordinator-review.md):
51owning+399regressions,zero skips; clean155-source locked reproduction,94identical
compiled files,249stable hashes. Initial QA calibration failure retained; unchanged
focused/fullrerun green after fixture-layout correction. All S1 windows CLOSED.
T06-S2 durable refresh rotation is now [accepted c2/f1](../evidence/t06-s2-coordinator-review.md):
40owning+129unchanged regressions,zero failures/skips; clean161-source locked
reproduction,96identical compiled files and257stable hashes. Source rejections and
Developer diagnostic deviation retained; small import smoke/source audit green,
not comprehensive sandbox proof. [S2 handoff](../handoffs/t06-s2.md).
T06-S3 exact restart/uncertain-refresh recovery is now [accepted c1/f1](../evidence/t06-s3-coordinator-review.md):
33owning+169unchanged regressions,zero fail/skip; clean171source locked reproduction,
98identical compiled files and269stable hashes. Initial source findings and process
deviations retained; small seven-export import smoke/source audit green, not sandbox
or power-loss proof. [S3 handoff](../handoffs/t06-s3.md).
T06-S4 authenticated requests is now [accepted c4/f3](../evidence/t06-s4-coordinator-review.md):
33owning+202unchanged regressions,zero fail/skip; clean189-source locked reproduction,
100identical compiled files,289stable hashes,small8export smoke/source audit.
[S4 handoff](../handoffs/t06-s4.md). ALL S1–S4 windows CLOSED, Developer/QA HELD.
Historical S4 checkpoint left parent T06 incomplete; S5/T06 are now closed by user direction below. f1/f2 owning failures retained,
TWO original f2 observations irretrievable/UNKNOWN; full NEW f3 same33case proof green.
Coordinator review misses/initial clean npmrc failure retained; no whole-suite/
parent/release claim. Internal S4 is not trusted lifecycle closure.
T09 journals remains dependency-ready and unassigned; no automatic successor. T02 remains parked, old
work preserved, actual writes disabled; no staging/commits/release permission.

## Prior disposition — T07 complete

User activated T08-S3 with direct primary-agent implementation and optional
bounded subagents, explicitly superseding historical Herdr/two-role relays.
[S3 acceptance](../evidence/t08-s3-review.md): final exact 76-file active selection
941/941 PASS, clean locked install/four production checks, 128 identical compiled
files, clean full T08 owning replay 82/82 PASS, 280 stable input hashes. Actual
SDK stdio, isolated real Secret Service/ext4/HTTPS reads and lifecycle release
verified; original development failures and repairs retained. T08-S1/S2/S3 and
parent T08 are complete. [Current handoff](../handoffs/t08-s3.md).

All T08 work is closed. The user subsequently assigned T07-S1 on 2026-10-15,
superseding historical QA/Developer/Herdr relays for this assignment. Its
[work order](t07-s1-work-order.md) is now [complete](../evidence/t07-s1-review.md):
47/47 owning checks and clean locked reproduction, real isolated storage/HTTPS
and T08 reads. The selected regression run passed523/524; a compatibility-doc
table issue was repaired and its complete43-check foundation file then passed.
Production/test source hashes remained stable. [Current handoff](../handoffs/t07-s1.md).
The user then assigned S2. [S2 is complete](../evidence/t07-s2-review.md): secured
dual-loopback GIS helper/page,20/20 owning and67/67 clean T07 replay,204/204
selected checks plus9/9 unchanged provider checks,144 identical compiled outputs
and327 stable input hashes. [Current handoff](../handoffs/t07-s2.md).
The user then assigned S3. [S3 and parent T07 are complete](../evidence/t07-s3-review.md):
compiled trusted CLI, fixed launcher/signal handling and operator guide;32/32 S3,
99/99 clean complete T07 replay,236/236 selected plus9/9 provider checks,148
identical compiled outputs and334 stable input hashes. [Current handoff](../handoffs/t07-s3.md).
All T07 work is closed; T09 remains ready/unassigned. No successor started.
Browser login, routine creation, named-host/backend/Google/Android/release gates
remain separate. T06 historical omissions, parked T02 and retired T13/T14 persist.

## Latest completed change — interactive local installer

The user-requested [installer](interactive-installer-work-order.md) is complete:
bundled install.mjs prompts for new private destinations and backend/Google/port/
keyring/write settings, uses existing Node/npm and locked install, then offers
trusted setup/login and backed-up Hermes registration. Final55/55 selected checks
in four files pass, with static/build/archive identity checks and historical
delivery preservation. [Handoff/checksum](../handoffs/interactive-installer.md).
No real user install/login/Hermes changes, newer-Node compatibility tests,
publication or successor window occurred.

## Prior completed change — minimum-only Node runtime policy

The user requested Node24-or-later with no upper-version guard and explicitly
excluded compatibility testing. The [bounded change](node-minimum-runtime-work-order.md)
is complete: storage/packer guards, manifests/lock metadata and current guides
updated; pinned static/build and43/43 package metadata checks pass. A separate
private [archive/handoff](../handoffs/node-minimum-runtime.md) is available under
dist/delivery/node-minimum/. No newer-Node compatibility or installed-runtime
replay was performed; original S6/R1 archives are unchanged. No deployment,
publication or successor grant follows.

## Current assignment — T19 awaiting external setup

The user assigned [T19](t19-live-google-smoke.md) on2026-10-18, then confirmed
that the isolated deployment/Google inputs are not ready and requested a
[local setup checklist](../handoffs/t19-local-setup.md).
[Bounded work order](t19-work-order.md) and preparation are complete; execution
is blocked on external setup. Pinned runtime and retained S6 archive identity
were checked; no real Google/browser/backend session or runtime suite ran.
T19 remains unpassed, T21 remains accepted/closed, and T17/current Android and
independent T20 remain separate gates. No successor or release action is opened.

## Current change — T21-S6 and parent accepted

The user-assigned [S6](t21-s6-work-order.md) and parent T21 are [accepted/closed](../evidence/t21-s6-review.md).
Workspace and clean locked replay each pass1,076/1,076 checks across105 files,
zero failures/skips/pending/todo. Exact private archive installation, config2/
single-record ownership/auth/lifecycle, fresh creation and old-format refusal pass.
Clean reconstruction matches source,176 emitted outputs and exact archive bytes/
content/modes/lock. [Package inventory](../evidence/t21-s6-package-inventory.json), [handoff](../handoffs/t21-s6.md),
[bounded laptop handoff](../handoffs/t21-s6-laptop.md). S1–S6 closed; historical R1/laptop unchanged.
Actual Pi CLI/modes/lifecycle/output, current Android delivery, T19 and independent
T20 remain unverified release gates. Btrfs testing is user-owned. No publication,
laptop/live deployment, real write enablement or automatic successor grant.

## Prior change — T21-S5 accepted; parent incomplete

The user-assigned [S5](t21-s5-work-order.md) is [accepted/closed](../evidence/t21-s5-review.md):545/545 checks in58
files,569 stable hashes and176 unchanged compiled outputs. Actual isolated backend/
SDK/Pi print boundaries verify fresh independent creation, truthful interruption,
no startup work, config2/single-record persistence and retained auth/session fences.
Original retired requirements/sources and failures are mapped explicitly; the
remaining T17 plan is refreshed. Production/scoped checks and owned cleanup pass.
[Handoff](../handoffs/t21-s5.md). S1–S5 closed; S6 ready/unassigned, parent T21 incomplete.
R1/laptop retain old installed behavior. Actual Pi CLI/modes/lifecycle/output,
current Android delivery, T19 and independent T20 remain unverified. Btrfs testing
stays user-owned. No new package/install/parent/release claim.

## Prior change — T21-S4 accepted; parent incomplete

The user-assigned [S4](t21-s4-work-order.md) is
[accepted/closed](../evidence/t21-s4-review.md): runtime/setup/login/auth/lifecycle
and CLI use config2 and the single encrypted credential record. Atomic binding/vault
changes retain auth recovery and session/proof fences; detached journals, anchors,
descriptors and obsolete commands are removed. No filesystem type gate.
808/808 checks across81 files pass with569 stable hashes and176 compiled outputs;
production/static/build and owned cleanup pass. Retired requirements and original
bytes are recorded explicitly. [Handoff](../handoffs/t21-s4.md).
S1–S4 closed; S5 ready/unassigned, S6 held. Btrfs testing stays user-owned.
R1/laptop retain old installed behavior; no package/parent/release claim.

## Prior change — T21-S3 accepted; parent incomplete

The user-assigned [S3](t21-s3-work-order.md) is
[accepted/closed](../evidence/t21-s3-review.md): the successor credential entry stores
binding/vault together with real key custody, ownership, atomic replacement and
safe uncertainty/cleanup behavior. It has no filesystem type gate. 33/33 owning
plus 223/223 storage/foundation regressions pass, with 644 stable hashes and 208
compiled outputs; production checks and owned cleanup pass. Btrfs testing belongs
to the user by explicit direction and was not executed. [Handoff](../handoffs/t21-s3.md).
Runtime/config/auth/login/lifecycle integration remains S4, ready/unassigned;
S5/S6 held. R1/laptop behavior is unchanged. No parent/installation/release claim.

## Prior change — T21-S2 accepted; parent incomplete

The user-assigned [S2](t21-s2-work-order.md) is
[accepted/closed](../evidence/t21-s2-review.md): invocation-local creation, strict
new schemas and non-retryable errors;821/821 in66 files,617 stable hashes and owned
cleanup PASS. [Handoff](../handoffs/t21-s2.md). S1/S2 closed; S3 ready/unassigned,
S4–S6 held. Credential storage/laptop/R1 package remain unchanged; no successor,
parent-task or installation/release acceptance.

## Prior change — T21-S1 accepted; parent incomplete

The user requested removal of duplicate-creation protection and a plan/report.
[T21's six-slice plan](t21-remove-durable-creation-recovery.md) proposes invocation-local
creation and a single encrypted credential store, removing persistent operation
identity/journals/receipts, separate anchors and the ext4-only requirement.
The user assigned [S1](t21-s1-work-order.md), now
[accepted/closed](../evidence/t21-s1-review.md): shared draft0.3 and replacement
interfaces, with documentation/schema checks and413-path inventory. Source/test/
backend/package bytes unchanged. [Handoff](../handoffs/t21-s1.md). S2 ready/unassigned,
S3–S6 held. Runtime and prior artifact dispositions remain unchanged; no laptop/live
access or automatic successor window.

## Prior disposition — T18-R1 package refresh accepted/closed

The user-assigned [T18-R1](t18-r1-work-order.md) is
[accepted/closed](../evidence/t18-r1-review.md):40/40 in12 files on workspace and
clean, zero failures/skips;430 source inputs,194 emitted files and archive bytes/
content/modes/runtime lock match.96 files/86 JS/111 dependencies; exact delivered
installation/recovery/refusal and owned cleanup PASS. [Handoff](../handoffs/t18-r1.md).
Historical T18 stays accepted; T17-S1 closed, S2–S5 planned/unassigned. T19 and
independent T20 remain separate. No release, real enablement, staging/commit or
local `.pi` changes.

## Prior disposition — T17-S1 accepted; parent incomplete

The user assigned T17 on 2026-10-17. [S1](t17-s1-work-order.md) is
[accepted/closed](../evidence/t17-s1-review.md):25/25 in five files (8 actual Pi SDK
print checks +17 unchanged regressions), zero failures/skips;623 stable hashes,
194 identical emitted files and owned cleanup PASS. Direct/deferred/codemode
paths negotiate MCP2025-11-25 and preserve config-only creation.
[Handoff](../handoffs/t17-s1.md). Later lifecycle/recovery/mode/output and integrated
acceptance work held pending separate assignment; parent T17 incomplete. T16/T18
stay closed; T19 and independent T20 remain separate. No release, real enablement,
staging/commit or local `.pi` changes.

Remaining T17 work is [planned in four sequential slices](../decisions/t17-remaining-slices.md):
S2 actual CLI/modes; S3 lifecycle/concurrency/cancellation; S4 exact recovery/
restart/fork; S5 output/privacy and clean parent acceptance. The T21-S1 notice supersedes old exact creation-recovery clauses;
T21-S5 will refresh the remaining host plan. No T17 execution window is open.

## Prior disposition — T16 complete; S7 accepted/closed

[S7/parent acceptance](../evidence/t16-s7-review.md): **46/46 full active T16 checks** and
**181/181 relevant unchanged regressions**, zero failures/skips. Actual owned
Android ordinary HTTP/Room/engine sync observes exact saved IDs/graph/order/values
and stable repeated delivery. Clean locked reconstruction matches424 source inputs
and194 emitted files; executed source/APK stability, original-input preservation
and owned cleanup pass. [Handoff](../handoffs/t16-s7.md). S1–S7 and parent T16 are closed.
T17 named Pi, T19 live Google/browser and independent T20 remain separate gates.
No automatic successor, real enablement, staging/commit or release.

## Prior disposition — T16-S6 complete; S7 subsequently assigned

[S6 review](../evidence/t16-s6-review.md): **45/45 full active T16 checks**, **35/35
unchanged local regressions**, **27/27 backend checks**; zero failures/skips and
615 stable owning hashes. The authorized backend timestamp repair retains raw-time
proof freshness, exact replay and the 24-hour deadline. Real signed-proof status
clears only A while B remains exact. Owned cleanup passes; original failures and
fixture correction remain in evidence. [Handoff](../handoffs/t16-s6.md).
S1–S6 closed; S7 Android/integrated acceptance unassigned, parent T16 incomplete.
No automatic successor, enablement, staging/commit or release.


## Prior disposition — T16-S5 complete; S6/S7 unassigned

[S5 review](../evidence/t16-s5-review.md):54/54 in eight files, all36 active T16
checks plus18 unchanged T11/T15 regressions;611 stable hashes and owned cleanup PASS.
Fifteen new actual-service compositions prove per-step durable interruption/cancel,
lost saved MCP result, bounded injected429, real save rejection/key reuse and
malformed/unrelated-target success recovery. Product/config inputs/outputs unchanged
from S4; no production repair. [Handoff](../handoffs/t16-s5.md).
[Plan](../decisions/t16-remaining-slices.md): S1–S5 closed. S6 races/lifecycle and
S7 Android/integrated acceptance remain planned/unassigned. Parent T16 incomplete;
compatibility/release gates and T17/T19/independent T20 remain open. No successor grant.

## Prior disposition — T16-S4 complete; S5 active

[S5](t16-s5-work-order.md) now owns the separately authorized crash/cancellation/
uncertainty window. S1–S4 stay closed; S6/S7 unassigned and parent T16 incomplete.

[S4 review](../evidence/t16-s4-review.md):42/42 in eight files, all21 active T16
checks plus21 unchanged regressions;608 stable hashes and owned cleanup PASS.
A05 authentic expired-access recovery and real reference/rejection/identity/collision
boundaries verified;312 product/config inputs/outputs unchanged. [Handoff](../handoffs/t16-s4.md).
[Plan](../decisions/t16-remaining-slices.md): S1–S4 closed; user separately authorized
S5 while S4 finished. S6 races/lifecycle and S7 Android/integrated acceptance remain
planned/unassigned. Parent T16 incomplete; no live enablement or release.

## Prior disposition — T16-S3 complete; parent incomplete

User-authorized [S3](t16-s3-work-order.md) is [complete](../evidence/t16-s3-review.md):
147/147 in 11 files, all 16 active T16 checks (13 actual-backend, three codec) plus
131 unchanged regressions; 607 hashes stable. Actual filters/paging/visibility/
numeric/live-membership/authentic-expiry checks pass; bundled cross-role catalogue
codec repaired with custom restrictions retained. Production/scoped checks and
owned cleanup PASS; original backend unchanged, fixed Clock test-artifact-only.
[Handoff](../handoffs/t16-s3.md). S1–S3 closed; later slices unassigned. A05, remaining
creation/domain/race/crash/lifecycle/Android and parent acceptance remain open.
Historical T18 archive needs the repair in a later verified candidate. No successor,
live enablement or release; T17/T19/T20 unchanged.

## Prior disposition — T16-S2 complete; parent incomplete

User authorized the next slice on 2026-10-16, now [complete](../evidence/t16-s2-review.md):
90/90 in eight files (all nine active T16  + 81 unchanged auth/lifecycle regressions),
zero failed/skipped/pending/todo; production/scoped checks and owned cleanup PASS.
Actual refresh serialization/lost-response recovery, two service restarts and
logout/account-disable write fences verified with independent DB observations.
Product/original backend inputs unchanged. [Handoff](../handoffs/t16-s2.md).
S1/S2 closed; parent T16 incomplete and later outcomes unassigned. Remaining timing/
cursor/ownership/domain/race/recovery/Android gates stay open; no automatic successor,
personal/live access or release.

## Prior disposition — T16-S1 complete; parent incomplete

The user assigned T16 on 2026-10-16. [S1 review](../evidence/t16-s1-review.md)
records 450/450 in 49 files (4 actual-backend owning  + 446 unchanged regressions), zero
failed/skipped/pending/todo; production/scoped checks, original-input stability and
owned cleanup PASS. Representative reads/creation/exact response-loss replay/DB/sync
are verified. No product/contract changes or live Android access.
[Handoff](../handoffs/t16-s1.md). S1 closed; full auth/race/recovery/backend-restart/
Android and parent T16 acceptance remain open. Later outcomes need separate
assignment; T17/T19/T20 unchanged. Personal/live resources remain excluded.

## Prior disposition — T18-S3 and parent T18 accepted/closed

[S3/parent acceptance](../evidence/t18-s3-review.md) completes installed same-format
replacement/exact recovery, retained receipts, incompatible-state refusal and
user-approved local startup journal validation. Full runtime/initial-document
selection261/261 in31 files on workspace and clean (12 owning+249 regressions);
final document-only package closure14/14 in5 files in both targets. All counts
have zero failed/skipped/pending/todo; no claim of another full replay after prose
closure.404 source inputs/194 emitted outputs and final archive bytes/content/
modes/dependencies match clean reconstruction.96 files/86 JS/111 dependencies.
Initial failures, missing snapshot oracle and report-order correction retained.
[Handoff](../handoffs/t18-s3.md). All T18 grants closed; parent complete.
T16/T17 remain ready/unassigned, T19/T20 retain external/independent prerequisites.
No successor, publication/release or real enablement.

## Prior disposition — T18-S1 accepted; S2 subsequently assigned

[S1 acceptance](../evidence/t18-s1-review.md) delivers the private locked runtime
artifact and trusted CLI bin:152/152 in13 exact files (6 owning +146 regressions),
94 archive files/86 JS/111 locked runtime dependencies,817 stable hashes,
four production/scoped checks and194 byte-identical prior emitted files.
Actual extract-and-ci/installed CLI/SDK/private provider/cleanup PASS.
[Handoff](../handoffs/t18-s1.md). User selected extract-and-npm-ci only after actual
consumer drift; original failures retained. All S1 grants closed.
The user assigned [S2](t18-s2-work-order.md), covering standalone guides and
focused repack/document checks; S3 installed recovery/clean parent acceptance
held; parent T18 incomplete. T16/T17/T19/T20 and all previous limits persist.
No automatic successor, publication/release or real enablement.

## Prior disposition — T15 complete

[T15-S3/parent acceptance](../evidence/t15-s3-review.md) completes portable config-controlled creation:
446/446 PASS in 48 exact files (30 T15 owning + 416 relevant regressions), zero failed/skipped/pending/todo; four production/scoped checks, 584 stable hashes, clean locked replay, 388 identical source inputs and 194 byte-identical emitted outputs.
Actual isolated provider/ext4/HTTPS/SDK process recovery, lost reply, policy,
cancellation/stop and trusted lifecycle fences PASS. [Handoff](../handoffs/t15-s3.md).
All S1–S3 grants are closed. T16 actual backend/DB/Android, T17 named Pi and T18
packaging are dependency-ready/unassigned; T19/T20 retain their later prerequisites.
No automatic successor, real enablement or release. Parked/retired work, T06
omissions, T04 limits and all external/independent gates persist.

## Prior next-work checkpoint — T15-S2 accepted; S3 unassigned

The user assigned [T15-S2](t15-s2-work-order.md), now
[accepted/closed](../evidence/t15-s2-review.md): official MCP creation factories,
compiled entry wiring, validated recovery-preserving errors/budgets/cancellation,
operator launch notes and disclosure update.68/68 in15 files (20 S1/S2 owning +48
regressions), zero failed/skipped/pending/todo; four production/scoped checks,
545 stable hashes and isolated provider/ext4/HTTPS/SDK stdio/cleanup PASS.
[Current handoff](../handoffs/t15-s2.md). All S1/S2 grants closed; S3 ready/unassigned.
Parent T15 incomplete; clean parent/process recovery/lifecycle and external/
independent release gates remain. No automatic successor.

## Prior next-work checkpoint — T15-S1 accepted; S2 assigned

The user assigned [T15-S1](t15-s1-work-order.md), now
[accepted/closed](../evidence/t15-s1-review.md): guarded runtime and private
admission-context repair;122/122 (11 owning +111 unchanged regressions) in18 files,
zero failed/skipped/pending/todo. Four production/scoped checks,543 stable hashes
and actual isolated provider/ext4/HTTPS/cleanup PASS.
[Current handoff](../handoffs/t15-s1.md), [settled plan](../decisions/t15-plan-and-slices.md).
The user assigned [T15-S2](t15-s2-work-order.md) on 2026-10-15; primary Codex
agent owns implementation and verification. S1 stays closed; S3 held. Parent T15
remains incomplete and external/independent release gates unchanged.

## Prior next-work checkpoint — T15 planning complete

The user requested T15 design and development planning, including manageable
slices where warranted. The primary Codex agent completed this documentation-only
assignment in the [T15 design](../decisions/t15-plan-and-slices.md): S1 guarded
runtime, S2 official MCP dispatch/safe recovery-field delivery, S3 compiled-process
integration and clean locked parent acceptance. T08/T11 and trusted lifecycle T12
are accepted. S1 is ready for separate assignment; S2/S3 are sequentially held.
Implementation/test sources, runtime execution and successor slices remain
unassigned. Creation remains unavailable; external/independent gates unchanged.

## Prior next-work checkpoint — T12 complete; T15 unassigned

The user assigned [T12-S4](t12-s4-work-order.md), now
[accepted with parent T12](../evidence/t12-s4-review.md): 96/96 T12 owning +
229/229 relevant regressions = **325/325 in 31 exact files** on both workspace and clean locked snapshot, zero failed/skipped/pending/todo.
Complete privacy/config disclosures and integrated trusted lifecycle are delivered.
Four production checks, locked install, 192 byte-identical emitted files and
537 stable hashes PASS. [Current handoff](../handoffs/t12-s4.md),
[operator flow](../login.md). All T12 grants closed; T15 remains separate/unassigned,
create_routine unavailable, external/independent release gates unchanged. No successor.

## Prior next-work checkpoint — T12-S3 accepted

The user assigned [S3](t12-s3-work-order.md), now
[accepted/closed](../evidence/t12-s3-review.md): foreground cached-account status
proof, private matching deletion authority and actual S2 cleanup; active/invalid/
stale proofs preserve private material.33/33 new S3+58/58 unchanged S1/S2+206/206
regressions=297/297 in24 files. Four production/scoped checks,535 stable hashes and
actual isolated provider/ext4/HTTPS/dual-loopback/CLI/owned cleanup PASS.
[Current handoff](../handoffs/t12-s3.md),
[API/provenance notes](../decisions/t12-account-status-boundary.md). Parent T12
incomplete; S1–S3 closed. The user assigned [S4](t12-s4-work-order.md); operator
flow and clean locked parent acceptance are in progress. T15 is unassigned. No successor, product creation or external/independent
release gate enabled/waived. Earlier readiness statements below are historical.

## Prior next-work checkpoint — T12-S2 accepted

The user assigned [S2](t12-s2-work-order.md) after accepted S1.
[S2 is accepted/closed](../evidence/t12-s2-review.md): durable removal/key cleanup,
external removed-generation fencing, interrupted cleanup/publication recovery and
explicit reconciled setup.37/37 new S2+21/21 unchanged S1+244/244 regressions=
302/302 in35 exact files; four production/scoped checks,525 stable hashes and
actual isolated provider/ext4/HTTPS/compiled CLI/owned cleanup PASS.
[Current handoff](../handoffs/t12-s2.md),
[four-slice plan](../decisions/t12-plan-and-slices.md). Parent T12 incomplete;
S1/S2 closed, S3 account-status verification ready/unassigned, S4 held, T15 unassigned.
Clean locked parent replay/release gates remain; no successor or creation enabled.
[S1 historical acceptance](../evidence/t12-s1-review.md) remains recorded.

[T11 plan](../decisions/t11-plan-and-slices.md) records three sequential slices:
active recovery, authorized terminal replay/minimization, then crash matrix/parent
acceptance. The user authorized [S1](t11-s1-work-order.md) after planning;
[S1 is accepted/closed](../evidence/t11-s1-review.md):14/14 owning+80/80 unchanged
regressions=94/94, four production/scoped checks,494 stable hashes and real
provider/ext4/HTTPS explicit recovery PASS. [Current handoff](../handoffs/t11-s1.md).
The user authorized S2 then S3; [S2 accepted](../evidence/t11-s2-review.md), then
[S3 and parent T11 accepted](../evidence/t11-s3-review.md):55/55 owning+206/206
regressions=261/261 in20 files in workspace and clean locked replay. Four production/
scoped checks,355 stable copied inputs,182 identical emitted files and506 identical
stable hashes PASS. [Current handoff](../handoffs/t11-s3.md). All T11 grants closed;
T12/T15 dependency-ready/unassigned, product creation unavailable. No successor started.

[S3 and parent T10 accepted](../evidence/t10-s3-review.md): fresh three-step
workflow,11/11 new S3+83/83 preserved S1/S2+88/88 unchanged regressions=182/182
in workspace and clean locked replay. Four production/scoped checks,345 stable
copied inputs,178 identical emitted outputs,492 identical stable selected hashes
and actual isolated production Secret Service/ext4/T06/T05 HTTPS PASS.
[Dependency handoff](../handoffs/t10-s3.md). All T10 work closed; T11-S1 is also
accepted and closed. No automatic successor or product enablement.

## Prior bounded disposition — T10-S2 complete

[S2 accepted](../evidence/t10-s2-review.md):27/27 new S2+56/56 S1+88/88
unchanged regressions,171/171 in11 files, production/scoped checks and37 stable
hashes PASS. [Historical handoff](../handoffs/t10-s2.md). S2 grants closed;
S3/parent subsequently accepted above.

## Prior bounded disposition — T10-S1 complete

The user assigned [T10-S1](t10-s1-work-order.md) after the
[three-slice design](../decisions/t10-plan-and-slices.md). S1 is now
[accepted/closed](../evidence/t10-s1-review.md):56/56 owning+183/183 unchanged
regressions,239/239 in eight exact files, zero failure/skip/pending/todo. Four production
checks, scoped checks and29 stable selected hashes PASS. Pure confirmation/error
decisions only; no executor, mutation, persistence or product enablement.
[Current handoff](../handoffs/t10-s1.md). Parent T10 remains incomplete. S2 durable
single-step execution is ready/unassigned; S3 fresh workflow/integrated acceptance
remains held. All S1 grants closed; no automatic successor. T09 stays closed.

## Current disposition — T09 complete

[S3 and integrated parent accepted](../evidence/t09-s3-review.md): all64/64
active T09 checks and132/132 selected regressions,196/196 total in17 files.
Workspace and clean locked replay pass; clean npm ci --ignore-scripts/four
production checks,329 stable copied inputs,166 identical compiled outputs and
62 stable selected hashes in both runs. Actual isolated provider/ext4/HTTPS,
restart/commit/retention fences and cleanup PASS. Repository transitions,
terminal compaction and trusted unresolved retirement are delivered; product
creation remains unavailable. [Current handoff](../handoffs/t09-s3.md).
S1/S2/S3 and parent T09 CLOSED. No automatic T10 assignment or release claim.

## Prior disposition — T09-S2 complete

[S2 accepted](../evidence/t09-s2-review.md): guarded durable admission, keyed
repeat identity, exclusive callbacks, whole-store serialization and async owner
fences.22/22 new owning+27/27 unchanged S1+118/118 regressions,167/167 total;
production/scoped checks and54 stable hashes PASS. Real isolated provider/ext4/
HTTPS, child ownership/reopen and admission commit faults passed; cleanup PASS.
[Current handoff](../handoffs/t09-s2.md). S1/S2 closed; parent T09 incomplete;
S3 unassigned/held for separate authorization. Product creation stays unavailable.

## Prior disposition — T09-S1 complete

The user assigned S1 after the three-slice T09 plan. S1 is
[accepted](../evidence/t09-s1-review.md):27/27 owning+47/47 unchanged T03
regressions,74/74 total, production checks and stable target hashes PASS.
[Format/interface note](../decisions/t09-journal-format.md);
[current handoff](../handoffs/t09-s1.md). Parent T09 remains incomplete.
S1 work is CLOSED; S2 ready/unassigned, S3 held. No admission/dispatch/product
creation is delivered, and no automatic successor starts.

## Prior disposition — T06 complete; T08-S1/S2 accepted, S3 held

User directed finishing T06 and dropping remaining verification. S5 owning30/30,
focused15/15 and exact parent60files/859tests PASS;341stable hashes,77source-quality
checks, clean locked install/four production checks and102identical outputs PASS.
Clean-snapshot behavioral replay/new import smoke/additional QA reconfirmation
WAIVED/UNRUN by user, never passed. Count mistakes/old failures/QA unauthorized
whole-repo run and unknown original observations remain in
[closure evidence](../evidence/t06-s5-coordinator-closure.md).
ALL source/static/build/install/runtime grants CLOSED; Developer/QA HELD.
[next-Coordinator pickup](../handoffs/t06-complete-coordinator-pickup.md): user
subsequently selected T08 and requested a general design and slices. Coordinator
[proposal](../decisions/t08-general-design-and-slices.md) records three outcomes;
User subsequently assigned T08-S1; it is now
[ACCEPTED c3/f2](../evidence/t08-s1-coordinator-review.md): owning39/39 +regressions62/62,
101/101 total,0failed/pending/todo, stable137-input freeze, four pinned production
checks and isolated real provider/ext4/CA/HTTPS/cleanup PASS. F1 failed100/101 and
unknown original error code/source-review deviations retained; only invalid fixture
corrected, no contract/test weakening. [S1 handoff](../handoffs/t08-s1.md).
S2 is now [ACCEPTED c2/SDKf2+configuredf3](../evidence/t08-s2-coordinator-review.md):
SDK99/99+configured13/13 =112/112 (20full active owning+92relevant regressions),
217stable inputs/154QA hashes, final four pinned Coordinator checks and126identical
compiled files, actual isolated provider/ext4/CA/HTTPS/release/cleanup. Separate
same-candidate runs, not full parent/whole repo. Original c1/f1 stays95/99/4failed;
[adjudication](../decisions/t08-s2-f1-sdk-adjudication.md) and unknown fourth fields
remain preserved. [Current handoff](../handoffs/t08-s2.md).
User-selected independent agents: openai-codex/gpt-6.1-sol/medium in existing panes.
User waived90-minute checkpoint for this run and explicitly resumed closure; fresh
Developer DOC-ONLY context updated bounded compatibility/ADR notes, no source/runtime
successor grant. ALL S1/S2/source/static/build/install/target/fixture/provider/cleanup
windows CLOSED, Developer/QA HOLD. Parent T08 IN PROGRESS; S3 dependency-ready but
UNASSIGNED/HELD. T07/T09 remain ready/unassigned. No automatic successor.
No actual writes, staging/commits/release or general verification-policy change.

## Preserved T02 checkpoint

Four historical slices/six SDK profiles accepted through R2 under the old approval
experiment. R3 Developer reported candidate artifact-ready, four permitted checks
and16 serial diagnostics, then reported all source/build/diagnostic/metadata actions
stopped. That is self-reported implementation readiness, NOT independent R3 acceptance.
QA prepared sources/56 artifact-free controls; coordinator repeated56 controls only.
No R3 frozen artifact relay occurred. Preserve initial failed reviews, independent
accepted records and candidate code/tests. No R3–R11 continuation or automatic
coordinator/subordinate renewal is scheduled. T02 was parked, not completed.
The [coordinator pickup](../handoffs/t02-coordinator-pickup.md) is coordinator-only;
its former subordinate access rule is historical under the single-agent policy.

## Active and historical task IDs

Read [pickup rules](../README.md), [roadmap](../implementation-plan.md) and
[verification](../verification.md). Claim an active ready task here and in its task
file before edits. Approximate sizes are not evidence or promised durations.

| Task                                                                            | Requires               | Approximate size               | Status            | Owner                                    |
| ------------------------------------------------------------------------------- | ---------------------- | ------------------------------ | ----------------- | ---------------------------------------- |
| [T01: Pinned TypeScript foundation/interfaces](t01-foundation.md)               | None                   | 1–2 sessions                   | done              | Coordinator; Developer + QA              |
| [T02: Pi companion feasibility](t02-pi-feasibility.md)                          | T01                    | Historical                     | parked/incomplete | Coordinator; preserved Developer/QA work |
| [T03: Strict schemas/normalization/lossless codecs](t03-schemas-codecs.md)      | T01                    | 2–3 sessions                   | done              | Coordinator; fresh Developer + QA         |
| [T04: Protected storage/exclusive ownership](t04-private-storage.md)            | T01                    | 2–3 sessions                   | done              | Coordinator; fresh Developer + QA         |
| [T05: Fixed-origin HTTP transport/errors](t05-backend-transport.md)             | T01,T03                | 1–2 sessions                   | done              | Coordinator; fresh Developer + QA       |
| [T06: Dedicated sessions/refresh/fences](t06-sessions-refresh.md)               | T04,T05                | 5 bounded slices               | done; user-directed verification omissions recorded | Coordinator; independent Developer + QA       |
| [T07: Foreground Google browser login](t07-browser-login.md)                    | T04,T05,T06            | 3 outcome slices               | done; S1/S2/S3 accepted | Primary agent; T07 closed     |
| [T08: Authenticated reads/stdio surface](t08-browsing-stdio.md)                 | T03,T05,T06            | 3 proposed outcomes            | done; S1/S2/S3 accepted | Primary agent; bounded subagents |
| [T09: Operation admission/immutable journals](t09-operation-journal.md)         | T03,T04                | 3 bounded outcomes             | done; S1/S2/S3 and parent accepted | Primary Codex agent (T09 closed) |
| [T10: Draft/populate/save confirmations](t10-creation-steps.md)                 | T05,T06,T09            | 3 bounded outcome slices       | done; S1/S2/S3 and parent accepted | Primary Codex agent (all T10 work closed) |
| [T11: Recovery/conflicts/minimization](t11-creation-recovery.md)                | T10                    | 3 bounded outcome slices       | done; S1/S2/S3 and parent accepted | Primary Codex agent (T11 closed)          |
| [T12: Trusted lifecycle/privacy cleanup](t12-trusted-lifecycle.md)              | T06,T07,T11            | 4 bounded outcome slices       | complete; S1–S4 accepted | Primary Codex agent (closed) |
| [T13: Companion registration](t13-companion-registration.md)                    | Historical T02,T04,T08 | Historical                     | retired           | —                                        |
| [T14: Companion approval](t14-companion-approval.md)                            | Historical T03,T09,T13 | Historical                     | retired           | —                                        |
| [T15: Config-controlled creation integration](t15-create-tool-integration.md)   | T08,T11                | 3 bounded outcome slices       | S1–S3 and parent accepted/closed | Primary Codex agent |
| [T16: Real isolated backend/sync verification](t16-backend-interoperability.md) | T07,T12,T15            | bounded slices + external access | incomplete; S1–S6 complete, S7 planned/unassigned | Primary Codex agent |
| [T17: Named Pi interoperability/config guard](t17-pi-certification.md)          | T12,T15                | S1–S5 outcome slices            | incomplete; prior S1 accepted; T21 supersedes recovery plan | Primary Codex agent |
| [T18: Server/CLI/config packaging/guides](t18-packaging-operations.md)          | T12,T15                | 3 sequential outcome slices    | S1/S2/S3 and parent accepted/closed | Primary Codex agent |
| [T19: Real Google/browser/HTTPS smoke](t19-live-google-smoke.md)                | T07,T16,T18            | 1 session + provisioning       | blocked: setup    | Primary Codex agent                      |
| [T20: Independent security/release review](t20-release-review.md)               | T16,T17,T18,T19        | 1–2 sessions                   | planned           | —                                        |
| [T21: Remove durable creation recovery](t21-remove-durable-creation-recovery.md) | Accepted implementation; revised MCP contract in S1 | 6 sequential outcome slices | complete; S1–S6 and parent accepted/closed | Primary Codex agent |

## Standing testing scope

All future task assignments/handoffs must apply the user-approved
[proportional testing policy](../decisions/proportional-testing-policy.md): small
core contract/risk-based checks and fixtures, early static checks, focused repairs,
full relevant final regressions; no exhaustive/general harness by default.
Mandatory safety/contract gates stay; deferred work is visible and never passed.

## Standing task-planning default

All future work uses one primary Codex agent, with optional bounded subagents
at its discretion. The primary agent owns implementation, tests, review and
task/evidence updates; no standing team, Herdr layout, separate Developer/QA
roles or role-private source restrictions are required. Historical owner labels,
relay requirements and closed grants above remain records, not current staffing
rules.

Follow the [decision-ready task-planning default](../agent-coordination.md#default-primary-agent-decision-ready-task-planning):
the primary agent records settled public behavior/interfaces, scope/non-goals,
edit ownership, permitted commands/execution grants, proportional acceptance
checks, deliverables and stopping conditions. Choose implementation internals
and specification-derived tests within that scope. Escalate specific unresolved
public decisions to the user; broad proposals or test-design rounds need an
explicit bounded request. Historical T04/T05 work orders remain records, not
future templates. Stable execution targets, mandatory review/safety/release gates
and no automatic successor remain. This update assigns no task and opens no
implementation/test window.

## Standing bounded-work default

Assess every task under the
[user-approved context-safe slicing policy](../agent-coordination.md#standing-bounded-work-and-context-safe-slicing-policy):
keep small work whole; split larger/riskier work into reviewable outcomes, not a
fixed slice count. Target 60–90-minute windows, checkpoint at 90 minutes and stop
at two hours with an honest handoff. Use focused slice checks and final parent-task
integrated acceptance; never weaken safety or declare unfinished work complete.
[T06's five slices](t06-sessions-refresh.md#proposed-bounded-slices) are bounded
planning outcomes; S1–S4 are accepted and all windows closed;
S5/T06 is now closed by user direction with omissions recorded above. No next-task grant or
automatic succession.

## Handoff checklist

- Read current shared draft0.2, backend v1 and the approved local policy decision.
- Confirm prerequisite evidence; parked/retired tasks are not passes or dependencies.
- Bounded task contract settled before implementation/tests; exclusive edit
  ownership agreed before optional parallel work.
- Include relevant tests and independently verified observables; no skipped gate
  counted passed, mocked integration claim or silent parked-suite exclusion.
- No secrets, personal configuration/content or out-of-scope source edits.
- Record exact safe commands, versions, artifacts, failures, results and limitations.
- Update task/index/status with accepted, blocked or user-parked disposition.

T01 acceptance remains [historical foundation evidence](../evidence/t01-coordinator-review.md).
It does not supply a working config guard, MCP tool implementation or release claim.
