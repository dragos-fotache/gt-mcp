# Implementation documentation

## Baseline and authority

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

## Current pickup — T07 complete

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

## Team workflow

The selected coordinator/Developer/QA team, Herdr layout, model and independent
specification-only implementation/testing rules are in
[Agent coordination workflow](agent-coordination.md).

Future assignments use the user-approved
[coordinator-led, decision-ready default](agent-coordination.md#default-coordinator-led-decision-ready-assignments):
the Coordinator settles public behavior/interfaces and supplies a concise scoped
work order; Developer chooses implementation internals and QA chooses minimal
independent checks. Escalate specific unresolved questions rather than producing
broad design documents unless explicitly requested with a bounded question,
expected output and stopping point. Historical proposal workflows are not default
templates; role independence, frozen relays and mandatory gates stay unchanged.

Apply the user-approved
[bounded-work and context-safe slicing policy](agent-coordination.md#standing-bounded-work-and-context-safe-slicing-policy)
to every task: keep small tasks whole, split larger/riskier work by reviewable
outcome, target 60–90-minute windows, checkpoint at 90 minutes and stop at two
hours with a concise honest handoff. Settle interfaces first; preserve independent
QA/frozen relays and final parent-task integrated acceptance. Limits trigger
checkpoints, not weaker verification or automatic continuation. T06 now has
[five proposed slices](tasks/t06-sessions-refresh.md#proposed-bounded-slices);
recording them alone does not open execution windows. T06-S1 and
[T06-S2](evidence/t06-s2-coordinator-review.md) are accepted/closed; all grants
CLOSED for S1/S2. [T06-S3](evidence/t06-s3-coordinator-review.md) now accepted/closed
as well. ALL S1–S3 grants CLOSED, agents HELD. S4/S5 unassigned; parent T06 incomplete.

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
[Standing Herdr authorization](agent-coordination.md#standing-herdr-authorization)
means coordinators must not ask permission again for project Herdr operations. Read the
[policy revision](decisions/routine-creation-config-policy.md) before task handoffs.
[Current config-only pickup](handoffs/mcp-config-only-pickup.md) records the next
bounded MCP work. [Parked coordinator pickup](handoffs/t02-coordinator-pickup.md)
is coordinator-only; [docs review](evidence/config-only-policy-doc-review.md)
records this policy revision's checks, not implementation acceptance.

## How agents pick up work

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
