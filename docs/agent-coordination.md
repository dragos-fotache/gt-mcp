# Project working policy

## Current workflow — one primary Codex agent

**Authority:** on 2026-10-15 the user replaced the standing team-of-agents
workflow for all future project work. One primary agent in Codex owns planning,
implementation, tests, review, evidence and task/status updates. It may read and
edit both production and test sources within the authorized task scope and run
the relevant production and test checks.

The primary agent may spin up bounded subagents when it sees fit. Delegation is
optional; there are no required Coordinator/Developer/QA roles, separate Pi
sessions, Herdr panes, role-private source restrictions or frozen-artifact relays.
The primary agent remains responsible for integration and acceptance. This
supersedes historical team instructions throughout project docs, work orders and
handoffs, including old role-specific command/read/edit restrictions.

All other planning, proportional testing, escalation, bounded-work, safety,
review and release recommendations remain in force. Test expectations must still
derive from specifications rather than simply mirror implementation. Stable
artifacts and honest evidence remain required when relevant to the claim; no
build/install may race execution against its target. Required independent review
or real interoperability evidence must be identified accurately and is not waived
by this staffing change.

Historical records are preserved in [the archived team workflow](agent-coordination-history.md)
and existing task/evidence files. Historical grants, pane/model choices and
closed/parked task instructions do not govern new assignments or reopen them.
This documentation change starts no implementation task, test execution window,
successor task or release.

<a id="default-coordinator-led-decision-ready-assignments"></a>

## Default: primary-agent decision-ready task planning

Before implementation/test-source work, the primary agent records a concise,
decision-ready task contract. Reuse accepted specifications and handoffs by
reference; a short work order is sufficient when it settles the necessary
decisions. A reading list plus "design the feature" is not a settled contract.

The contract includes:

1. Outcome, prerequisites, exact scope and non-goals; never infer readiness from
   stubs.
2. Normative references, settled public API/observable behavior, cross-component
   boundaries and applicable safety/error/recovery semantics.
3. Edit scope, permitted commands, provisioned environment and execution grants.
   If delegating, specify exclusive write ownership and integration order.
4. A short proportional verification scope: core risks, representative checks,
   simple reused fixtures, early static checks, complete active owning suite,
   relevant final regressions and explicit deferrals.
5. Deliverables, milestones, acceptance criteria, escalation and stopping
   conditions.

Choose implementation internals within that contract and tests with
specification-derived expectations. Do not prescribe tests from private
implementation details or require a test for every function.

Resolve routine internal choices autonomously. For a genuinely missing or
contradictory public decision, identify the exact ambiguity, affected requirement
and, where useful, a recommendation or small set of alternatives. Escalate it to
the user and hold the affected work while continuing unrelated authorized work.
Do not guess public behavior, silently expand scope or invent external inputs.
Update the common contract before dependent work proceeds. Shared-contract
changes still require explicit user authorization.

Broad public-API proposals, architecture exploration, extensive test planning and
multi-round approval phases are exceptions, not routine prerequisites. They need
an explicit bounded request with a named uncertainty, expected output and stopping
point. Prefer a short feasibility answer or focused spike when sufficient.
Research readiness is not implementation or acceptance evidence. Generalized
testing frameworks/campaigns still require explicit user approval.

Historical T04/T05 proposal workflows remain records, not future templates.
Mandatory safety/release gates and no automatic successor remain unchanged.

## Standing bounded-work and context-safe slicing policy

Assess complexity, risk and likely context/time cost before work. Keep small
tasks whole; split larger or riskier tasks into independently reviewable outcomes
with clear prerequisites and integration boundaries.

- Settle shared public interfaces/state transitions in a short task contract
  first. Reuse accepted dependencies; slicing is not a broad planning project.
- Target 60–90-minute working windows, checkpoint at 90 minutes and stop the
  working session at two hours with an honest handoff. These are work-window
  targets/limits, not completion promises. Never rush acceptance or weaken
  verification to meet the clock. Arrange safe cancellation/teardown; do not
  abandon uncertain operations or forcibly terminate durability-critical work.
- Default to one slice per implementation context. If unfinished at the stop,
  record the partial state, exact blocker and remaining acceptance work. Resume
  from the handoff in a fresh context when explicitly authorized.
- Each slice has scoped permissions, specification-derived checks, a stable
  execution target and an accepted/partial/blocked disposition. Record behavior
  that remains unavailable until later slices pass. Slice acceptance is not
  parent-task completion or release readiness.
- Use focused checks during slices under the
  [proportional testing policy](decisions/proportional-testing-policy.md).
  Require the complete active owning suite and relevant regressions at final
  integrated acceptance before marking the parent task done. Do not repeat all
  dependency checks at every checkpoint or defer mandatory safety checks.
- Keep handoffs concise: task/slice, accepted behavior/interfaces, changed paths,
  artifact identity, exact safe commands/results, unresolved issues, current
  grants and next permitted action. Include versions and evidence limitations.
  No secrets, personal content or raw private bodies.
- Authorize slices sequentially; no automatic successor, context renewal or
  whole-task-matrix grant. Optional subagents work within the current grant.
  Exclusive concurrent edit ownership, safety/release gates and stopped/parked
  work remain unchanged.

## Standing proportional testing instruction

Follow [the standing policy](decisions/proportional-testing-policy.md) in every
task and handoff. Use the smallest meaningful contract/risk-based matrix,
representative important failures, simple reused fixtures and early
syntax/type/lint/format/import checks. Use focused repair runs and complete active
owning/relevant regression checks at final acceptance.

Keep selective high-value unit tests; prefer actual isolated integration checks
for HTTP/TLS, storage/providers and delivered MCP/backend boundaries. Every test
needs a meaningful bug/risk rationale and specification-derived expectations.
No unit-test quota, coverage-percentage or line-ratio target. Avoid
private-function assertions, implementation-mirroring mocks and redundant cases.

No default exhaustive combinations, generalized runtime interception, simulator,
proxy or stress/mutation framework. If test infrastructure dominates the feature,
simplify before expanding. New generalized frameworks or exhaustive campaigns
need specific justification and explicit user approval.

Preserve mandatory contract/security/recovery/release gates and honest
active/deferred evidence. Do not change expectations to fit broken code, count
skips as passes or silently exclude failing suites.

## Optional subagents and communication

The primary agent decides whether a bounded subtask benefits from delegation;
no standing team or external agent-session layout is required. Give each
subagent the relevant public contract, scope, permissions, expected output and
stopping point. Agree interfaces before parallel dependent work and assign one
editor at a time to shared manifests, lockfiles and configuration.

Subagents escalate unresolved common decisions to the primary agent. The primary
agent resolves internal choices and escalates user-level decisions as above.
Extra dependencies and relaxed compiler settings need the primary agent's review
before a subagent introduces them; safety and contract requirements cannot be
relaxed as an implementation shortcut.

Use asynchronous milestone, interface, blocker and completion messages. Avoid
status/output polling loops. Messages identify the task, scope, changed paths,
safe commands/results, blockers and next decision. Keep secrets and private data
out of messages. The primary agent reviews delegated work and integrates it
against the task contract.

## Review and completion

Claim a ready task in both the task index and its task file before task edits.
Check prerequisites against accepted evidence. Review production and tests
against normative specifications; test agreement with implementation alone is
not correctness evidence. Resolve contract ambiguity before changing behavior or
assertions. Never rewrite shared contracts to hide implementation failures.

Run relevant checks against stable targets, with no build/install racing test
execution. Preserve clean locked reproduction and artifact identity evidence when
required by the task/release boundary. Keep tasks in progress/partial/blocked
until their acceptance criteria are met; record failures, waived/unrun checks,
external blockers and evidence limitations honestly.

Update task/index status and verification evidence with the sanitized handoff.
Mocks, skips and installs are not interoperability/release passes. Existing
independent review, backend/browser/Android/named-host and security release gates
remain required; describe the actual reviewer and evidence rather than claiming
independence solely from optional delegation.

Keep actual writes disabled except in explicitly isolated fixtures. No
personal/live services, credentials/private bodies in repository/logs/evidence,
local .pi/settings changes, staging/commits, deployment or release without the
required separate authorization.

<a id="standing-herdr-authorization"></a>

## Historical workflow references

Old links to the coordinator-led default resolve to the current primary-agent
planning policy. Old links to standing Herdr authorization resolve here: the
mandatory Herdr/team workflow has been retired, and its historical directions are
preserved only in [the archive](agent-coordination-history.md). This is distinct
from T17's product interoperability gate for the named Pi host, which remains
required.
