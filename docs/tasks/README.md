# Agent task queue

**T01 foundation, bounded T03 schemas/codecs, T04 storage and T05 transport are accepted.
T02 is parked/incomplete by user decision;
T13/T14 companion tasks are retired from current delivery.** The current product
policy is [config-file writesEnabled only](../decisions/routine-creation-config-policy.md):
no custom/external permission extension or per-routine prompt. Shared MCP draft0.2
is aligned in the uncommitted working tree; backend v1 is unchanged.

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

## Current disposition — T07 complete

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
subordinates receive public policy/current bounded task scope, not private evidence.

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
| [T09: Operation admission/immutable journals](t09-operation-journal.md)         | T03,T04                | 1–2 sessions                   | planned; ready    | —                                        |
| [T10: Draft/populate/save confirmations](t10-creation-steps.md)                 | T05,T06,T09            | 1–2 sessions                   | planned           | —                                        |
| [T11: Recovery/conflicts/minimization](t11-creation-recovery.md)                | T10                    | 2–3 sessions                   | planned           | —                                        |
| [T12: Trusted lifecycle/privacy cleanup](t12-trusted-lifecycle.md)              | T06,T07,T11            | 2–3 sessions                   | planned           | —                                        |
| [T13: Companion registration](t13-companion-registration.md)                    | Historical T02,T04,T08 | Historical                     | retired           | —                                        |
| [T14: Companion approval](t14-companion-approval.md)                            | Historical T03,T09,T13 | Historical                     | retired           | —                                        |
| [T15: Config-controlled creation integration](t15-create-tool-integration.md)   | T08,T11                | 1–2 sessions                   | planned           | —                                        |
| [T16: Real isolated backend/sync verification](t16-backend-interoperability.md) | T07,T12,T15            | 2–3 sessions + external access | planned           | —                                        |
| [T17: Named Pi interoperability/config guard](t17-pi-certification.md)          | T12,T15                | 2–3 sessions                   | planned           | —                                        |
| [T18: Server/CLI/config packaging/guides](t18-packaging-operations.md)          | T12,T15                | 1–2 sessions                   | planned           | —                                        |
| [T19: Real Google/browser/HTTPS smoke](t19-live-google-smoke.md)                | T07,T16,T18            | 1 session + provisioning       | planned           | —                                        |
| [T20: Independent security/release review](t20-release-review.md)               | T16,T17,T18,T19        | 1–2 sessions                   | planned           | —                                        |

## Standing testing scope

All future task assignments/handoffs must apply the user-approved
[proportional testing policy](../decisions/proportional-testing-policy.md): small
core contract/risk-based checks and fixtures, early static checks, focused repairs,
full relevant final regressions; no exhaustive/general harness by default.
Mandatory safety/contract gates stay; deferred work is visible and never passed.

## Standing assignment default

All future work orders follow the
[coordinator-led, decision-ready default](../agent-coordination.md#default-coordinator-led-decision-ready-assignments):
Coordinator supplies settled public behavior/interfaces, scope/non-goals,
ownership, permitted commands/execution grants, proportional acceptance checks,
deliverables and stop/escalation conditions. Developer chooses implementation
internals; QA chooses minimal independent specification-derived checks. Escalate
specific ambiguities; broad proposals or QA design rounds require an explicit
bounded request, not an automatic pre-implementation stage. Historical T04/T05
work orders remain records, not mandatory future templates. No task assignment
or new implementation/test window follows from this policy update.

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
- Bounded specification and exclusive ownership agreed before implementation/QA.
- Include relevant tests and independently verified observables; no skipped gate
  counted passed, mocked integration claim or silent parked-suite exclusion.
- No secrets, personal configuration/content or out-of-scope source edits.
- Record exact safe commands, versions, artifacts, failures, results and limitations.
- Update task/index/status with accepted, blocked or user-parked disposition.

T01 acceptance remains [historical foundation evidence](../evidence/t01-coordinator-review.md).
It does not supply a working config guard, MCP tool implementation or release claim.
