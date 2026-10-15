# T06-S2 coordinator opening — source work only

**Current disposition: S2 accepted c2/f1; ALL windows CLOSED, agents HELD.**
[Acceptance](t06-s2-coordinator-review.md) supersedes opening/repair/relay language
below, preserved as history. Parent T06 incomplete; S3–S5 unassigned, no successor.

**Disposition:** user-assigned T06-S2 IN PROGRESS, not implemented/accepted.
Developer implementation and independent QA source preparation OPEN under the
[decision-ready work order](../tasks/t06-s2-work-order.md). Compiled-target/provider/
HTTP/test execution CLOSED pending a named reviewed frozen artifact relay.
S1 stays accepted/closed; S3–S5 unassigned; parent T06 incomplete.

**Subsequent source-review gate:** initial production c0 and QA r1 readiness are
not source-approved. Scoped repairs are assigned independently under original
checkpoint/stop limits; no frozen artifact/QA execution grant. Reviews:
[production c0](t06-s2-coordinator-production-source-review-c0.md) and
[QA r1](t06-s2-coordinator-qa-source-review-r1.md). Those role-private findings are
not cross-role input; only common public work-order clarifications are shared.
Latest re-reviews: [production c1](t06-s2-coordinator-production-source-review-c1.md)
verifies the c0 repairs but requires one post-clock cancellation ordering repair;
[QA r2](t06-s2-coordinator-qa-source-review-r2.md) verifies most r1 repairs/static
checks but requires safely released/discriminating gates and config-copy assertions.
Subsequently [production c2](t06-s2-coordinator-production-source-review-c2.md)
is source-approved/HELD, coordinator four production checks and122scoped unchanged
hashes PASS. [QA r3](t06-s2-coordinator-qa-source-review-r3.md) verifies r2 cleanup/
capture repairs but needs one pre-release actual durable-state observation and
honest clock-case scope label. Subsequently final QA r3 source gate approved/HELD; [t06-s2-f1 relay](t06-s2-f1-coordinator-relay.md)
now grants QA exact owning40 then unchanged regression129 execution against257frozen
hashes (checksum verified). All source/build work CLOSED; no result/acceptance yet.
The original opening/baseline record below remains historical evidence.

## Prerequisites and baseline

Reviewed shared MCP draft0.2 access/refresh, backend v1 authentication and OpenAPI
RefreshCredential/ServiceSession, wire-type/expiry precision limitation; accepted
T04 public ownership/commit API, T05 control/hook contract, S1 API/vault/handoff.
Shared checkout remains 9a96dcb with the six existing MCP-policy working-tree
changes; backend contract unchanged. No shared edits in this opening.

Inherited T01_NODE_HOME was absent. Located an existing disposable provisioned
T06 toolchain outside the repository, set T01_NODE_HOME explicitly and prepended
its bin to PATH; version checks returned Node24.21.0/npm11.19.0. No ambient Node/
npm execution, replacement, package upgrade, install or personal keyring access.
Location supplied privately in role prompts, not persisted in evidence.

Coordinator safe baseline commands (with that pinned PATH):

- python3 docs/evidence/t06-s1-verify-artifact.py: PASS t06-s1-f1,249 unchanged files.
- npm run typecheck: PASS,exit0.
- npm run lint:production: PASS,exit0.
- npm run format:check:production: PASS,exit0.
- npm run build: PASS,exit0.
- Repeat artifact verification after build: PASS,249 unchanged files.

These are prior-state integrity/production checks, NOT S2 tests or acceptance.
No QA target/suite/fixture/provider/HTTP runtime execution occurred in this opening.
Earlier S1 independent450-test acceptance is reused as prerequisite evidence, not
reported as a new run. Existing upstream limitations/parked/deferred suites stay.

Initial CLI help discovery returned syntax exit2 for a no-subcommand help group,
so the chained discovery stopped; separate explicit topology discovery succeeded.
A broad /tmp path discovery reported inaccessible unrelated system temp directories;
no fallback/permission change was attempted. Neither is a project acceptance result.

## Settled common decisions

- Additive openRefreshSessionState/REFRESH_VAULT_VERSION=2; no grant getter or
  public hooks/resource orchestration. Preserve S1 behavior/version1 and inert
  root/server/CLI/companion entries. This bounds S2 without changing T04/T05.
- Opening is read-only; explicit version1-to2 upgrade only when atomically
  preparing exact predecessor/token/body/key. Strict version2 private format and
  binding/expiry/body identity settled in the common public work order.
- Concurrent valid calls share one rotation. Follower abort does not cancel the
  leader; leader abort/invalidation fences delivery and settles owned work.
- Atomic returned same-account grant plus pending-null; all unsuccessful prepared
  outcomes retain exact pending evidence. Existing pending blocks new dispatch/key
  until S3; S2 is deliberately not production-ready refresh/restart recovery.

## Role relay and current grants

Used standing user-approved Herdr project-coordination authority. Initial inspection
found coordinator/w4:p2K, idle Developer/w4:p2H and QA/w4:p2M in the existing current
tab/cwd. Submitted /new in the two existing subordinate panes; one startup inspection
confirmed "New session started", empty conversations and unchanged selected
meta/muse-spark-1.3-contributor/high model. No process restart, additional topology,
focus move or .pi/settings change. Startup/footer is not OS isolation proof.

Asynchronous role-specific S2 assignments were successfully submitted to Developer
and QA via herdr agent prompt. Submission is not readiness/completion evidence;
no polling/wait loop. Each prompt supplies checked toolchain, common public contract,
read/edit boundaries, early source checks, proportional verification, milestone
reporting and hold-for-review/freeze requirements. No cross-role private sources
or test oracles relayed.

Developer may edit auth/ADR/bounded compatibility and run four production checks;
QA may prepare s2-prefixed independent test sources/QA evidence and run only scoped
source-quality/import-resolution checks. QA target execution remains closed.
Report asynchronous readiness/ambiguities to coordinator; target60–90min,
checkpoint90,stop120 with safe owned-work settlement and honest partial handoff.
Specific ambiguities hold affected work, not a broad automatic design round.

## Coordinator deliverables and next gate

New S2 work order plus this evidence; current status updated in task/index, docs
pickup, roadmap, coordination and config-only handoff. Historical S1 frozen order,
handoff/acceptance/relay bytes remain unchanged. Source preparation is not a pass.

Next coordinator gate: independently review production and QA sources when agents
report readiness, resolve specification-level findings without private cross-role
leaks, freeze a named inventory, then grant exact isolated QA execution. No build/
install overlap frozen targets. Full S2 independent owning/relevant regression and
clean locked-source reproduction remain required before S2 acceptance. Parent
integrated recovery/lifecycle/provider gates remain for later explicit assignments.
No actual product writes/live credentials/backend/browser/Android, .pi edits,
staging/commits/publication/release or automatic S3/context succession.
