# Implementation roadmap

## Current policy and delivery scope

User-approved [configuration-only routine creation](decisions/routine-creation-config-policy.md)
is aligned in shared MCP draft0.2 (working-tree revision based on9a96dcb).
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
strict validation, private storage, stable operation identity and recovery remain.
Any client connected to an enabled local process can request creation; disclose
that operator-trust boundary. Config/process/private-state access stays restricted.

Login/logout, retirement and profile lifecycle are trusted local actions, never
model-facing tools. No remote transport, direct DB access, arbitrary HTTP/command,
existing-routine mutation, workout/custom-exercise mutation, account-management
tools, sync cache, bulk import or autonomous recovery worker. No new backend API.

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

## Current next-task choice

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
| T09  | T03,T04                | Ready, unassigned after T03/T04 acceptance                     |
| T10  | T05,T06,T09            | Planned                                                      |
| T11  | T10                    | Planned                                                      |
| T12  | T06,T07,T11            | Planned                                                      |
| T13  | Historical T02,T04,T08 | Retired companion registration                               |
| T14  | Historical T03,T09,T13 | Retired companion approval                                   |
| T15  | T08,T11                | Planned config-controlled creation integration               |
| T16  | T07,T12,T15            | Planned real backend/sync verification                       |
| T17  | T12,T15                | Planned named Pi interoperability/config guard               |
| T18  | T12,T15                | Planned server/CLI/config packaging                          |
| T19  | T07,T16,T18            | Planned real Google/browser smoke                            |
| T20  | T16,T17,T18,T19        | Planned independent final review                             |

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
and journal work proceed against explicit coordinator-reviewed interfaces and
exclusive edit ownership. T07/T08 can overlap after T06; T15 follows T08/T11.
External access for T16/T19/Android is an additional prerequisite, never fabricated.

Developer owns production/config/build metadata; QA owns independent tests/evidence
and never reverse-engineers implementation. Each new task follows the
[coordinator-led, decision-ready default](agent-coordination.md#default-coordinator-led-decision-ready-assignments):
Coordinator supplies a concise settled public contract and scoped permissions;
Developer chooses implementation internals and QA chooses minimal independent
checks. Specific unresolved decisions go to Coordinator; broad proposals/design
rounds require an explicit bounded request, not an automatic task stage.
Artifact-ready relay and independent acceptance remain mandatory. No
build/install overlaps frozen QA targets. Parked T02 checks/old dependency pins may
need future explicit build/package/suite reconciliation, not silent exclusions.

## Remaining implementation decisions

Record coordinator-reviewed ADRs/evidence for schema/lossless codec boundaries,
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
