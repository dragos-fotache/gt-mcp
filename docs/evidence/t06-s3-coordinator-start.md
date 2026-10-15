# T06-S3 coordinator opening — source work only

**Current disposition: S3 accepted c1/f1; ALL windows CLOSED, agents HELD.**
[Acceptance](t06-s3-coordinator-review.md) and [handoff](../handoffs/t06-s3.md)
supersede historical opening/source/repair/relay grants below without frozen byte
changes. Parent T06 incomplete; S4/S5 unassigned, no successor.

**Historical opening disposition:** user-assigned T06-S3 IN PROGRESS, not implemented/accepted.
[Decision-ready work order](../tasks/t06-s3-work-order.md) opens Developer production
and independent QA source preparation only. Compiled-target/fixture/suite execution
CLOSED pending reviewed frozen relay. S1/S2 accepted/closed; S4/S5 unassigned,
parent T06 incomplete. No actual writes, release or automatic successor.

## Subsequent source-review gate

Production [c0](t06-s3-coordinator-production-source-review-c0.md) required terminal
post-clock shared cancellation repair. [c1](t06-s3-coordinator-production-source-review-c1.md)
source-approved after repair and independent four production checks; Developer
HELD, no further source/build/runtime. Disclosed out-of-grant Developer import
diagnostic retained, never acceptance. QA [r1](t06-s3-coordinator-qa-source-review-r1.md)
requires scoped new-S3-source/helper-shape/cleanup/durable-boundary/oracle repairs;
QA source repair OPEN, compiled-target/fixture/suite execution CLOSED. No named
frozen relay or S3 acceptance. Original opening grants below are historical for
Developer, limited by this source hold; QA repair grant is bounded, not renewal.

Subsequently [QA repaired source gate](t06-s3-coordinator-qa-source-gate.md)
APPROVED33authored cases/static checks, production c1 hashes stable. ALL source/
build/install grants now CLOSED. [t06-s3-f1 relay](t06-s3-f1-coordinator-relay.md)
opens exact QA owning33then unchanged169execution against269frozen hashes only;
checksum/verifier PASS. No results/acceptance yet; source opening/repair language
above is historical, superseded by this freeze and named execution grant.

## Prerequisites, environment and baseline

Reviewed shared MCP draft0.2 access/refresh, backend v1 auth/RefreshCredential/
ServiceSession/wire precision and legacy replay limitation; accepted T04 ownership/
atomic commit, T05 control/hook API and S1/S2 frozen public contracts/handoff/evidence.
Shared base remains9a96dcb; the same six preexisting MCP-policy modifications remain,
backend v1 unchanged. No shared-contract edits or new dependencies.

Inherited T01_NODE_HOME was absent. Initial environment discovery inadvertently
executed ONLY ambient node --version/npm --version, reporting26.11.1/12.2.0.
This violates the provisioned-toolchain-only instruction and is retained as an
opening diagnostic deviation, not a supported-runtime check or acceptance evidence.
No ambient install/build/test/project-code execution occurred. Located the existing
disposable provisioned T06 toolchain outside the repo; explicitly set T01_NODE_HOME
and PATH, verified Node24.21.0/npm11.19.0 before ALL subsequent project commands.
Location supplied privately in role prompts, not persisted in evidence. No global/
system changes, package upgrade or personal-keyring fallback.

Coordinator checked baseline with pinned PATH:

- node --version/npm --version exact assertions: PASS24.21.0/11.19.0.
- python3 docs/evidence/t06-s1-verify-artifact.py docs/evidence/t06-s2-f1-artifact-inventory.json:
  PASS257unchanged frozen files.
- npm run typecheck: PASSexit0.
- npm run lint:production: PASSexit0.
- npm run format:check:production: PASSexit0.
- npm run build: PASSexit0.
- Repeat same S2 inventory verifier: PASS257unchanged files, including compiled bytes.

This establishes prior artifact integrity/production baseline, NOT S3 behavioral
acceptance. No QA suite/target/provider/HTTP execution in this opening. Prior
S2 independent40owning+129regression acceptance is reused, not claimed rerun.

## Settled common decisions

- Preserve existing six S1/S2 runtime exports and behavior; add only
  openRecoverableRefreshSessionState (seven total). New facade extends the public
  RefreshSessionState with recoverRefresh(captured,signal):Promise<void>.
  Existing S2 pending refusal and fresh-only rotate behavior unchanged.
- Read-only factory; strict S2 v2 state/expiry/body/key format unchanged, no migration
  or new version. Pending replay uses original durable bytes/token/key even when
  the predecessor's local refresh deadline has passed; accepted replay authority
  depends on backend current returned credential, not invented predecessor lifetime.
- Atomically persist recovered original grant/pending-null BEFORE at most one
  distinct fresh rotation for expired access. No-pending expired-access recovery
  covers restart between those durable stages; no volatile marker or loop.
- Same-kind concurrency shares entire cycle, leader owns cancellation; follower
  abort local. Different-kind overlap rejects operation_interrupted without damaging
  leader; S4 will own resource orchestration. Owned commits settle before leader
  promise, no rollback/late success. Original safe errors/evidence preservation.
- Invalid account/legacy precision fails closed retaining evidence. No rounding,
  rekeying uncertain attempt, account adoption, deletion or foreground supersession.

## Staffing and grants

Standing user-authorized Herdr coordination applies. Initial single discovery found
coordinator/w4:p2K and idle developer/w4:p2H, qa/w4:p2M in the existing current
tab/cwd/stack. Submitted /new to both idle subordinate agents. One startup read
confirmed New session started, empty conversations, selected
meta/muse-spark-1.3-contributor/high unchanged. No process restart, extra topology,
focus move or .pi/settings change. Startup is not an OS sandbox claim; blocked
project MCP trust was NOT approved/reconfigured.

Role-specific asynchronous assignments were successfully submitted to Developer
and QA (both Herdr agent_prompted, exit0). Each received common work order, checked
toolchain, boundaries/static checks, proportional risk scope, milestones and
HOLD-for-review/freeze gate. No cross-role private source/oracle/evidence relay.
Submission is not readiness/completion; no polling/wait loop.

Developer owns auth/ADR/bounded compatibility, four permitted production checks;
QA owns new s3-prefixed test/helper sources and S3 QA evidence, static-only checks.
No install needed; dependency/config or accepted-helper repair needs explicit
Coordinator review. QA compiled/fixture/suite execution remains CLOSED. Target
60–90min/checkpoint90/stop120, safe owned settlement and partial handoff if needed.

## Coordinator next gates

Review production and independent QA sources separately when readiness arrives;
resolve common public ambiguities without exposing private implementation/tests.
Freeze named inventory only after source approval, then authorize exact isolated
QA owning and unchanged regressions. Final clean allowlisted locked reproduction,
identical compiled bytes and small isolated seven-export import smoke/source audit
required. No broad generalized harness/power-loss/OS-sandbox claim.

Task/index, docs pickup/roadmap/coordination and config-only handoff now identify
S3 source work only. Frozen S1/S2 orders/relays/evidence bytes remain unchanged.
All historical failures and parked/deferred work retained; no whole-suite pass.
No product writes/private/live backend/browser/Android/Pi session, staging/commits,
publication or automatic S4/context succession. T07/T08 remain blocked.
