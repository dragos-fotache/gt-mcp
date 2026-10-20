# T15-S1 — Guarded creation runtime

**Status:** accepted/closed · **Owner:** primary Codex agent · **Authorized:** user
requested “start work at T15-s1” on 2026-10-15. S2/S3 remain unassigned.

[Acceptance](../evidence/t15-s1-review.md):122/122 (11 owning +111 regressions),
zero failed/skipped/pending/todo, four production checks and543 stable hashes.
Actual isolated provider/ext4/HTTPS and owned cleanup passed.
[Handoff](../handoffs/t15-s1.md). All S1 grants are closed; parent T15 incomplete.

## Contract

Implement S1 of the [settled T15 plan](../decisions/t15-plan-and-slices.md), whose
normative references, prerequisites, safety and proportional-testing policy apply.
Deliver `ToolRuntime extends ReadRuntime` with `createRoutine(args,signal)` and
`openToolRuntime(ReadRuntimeOptions)`. Existing read factories retain their exact
read-only capability; the executable/SDK creation handler stays unavailable.
One protected config snapshot, owner, session, repository and service; strict
file-only writesEnabled/default false, current binding and owned cancellation.
Disabled/unconfigured valid calls return safe configuration_required before any
admission/traffic; enabled missing auth returns authentication_required. Validate
arguments first. Startup performs no resource requests or operation continuation.
Close synchronously fences repository/admission, aborts work, awaits settlement,
invalidates session and releases owner. Preserve authorized recovery fields through
late interruption, and suppress private history on binding invalidation.

Repair acknowledged-admission cancellation before service snapshot: private
repository-to-service context carries only binding and confirmed operation/root/
step/uncertainty metadata, attached to trusted errors through an internal WeakMap.
Capture after acknowledged commits and successful intent comparison; never invent
context for unacknowledged admission, failed auth or mismatched intent. Check
current binding before disclosure. No public permission/context callback or wire
schema change. Existing codes/error sanitization remain intact.

## Scope and environment

Edit `src/runtime/`, minimal `src/operations/` and `src/creation/service.ts` for
the context handoff, focused `test/unit/t15/` and `test/fault/t15/` plus necessary
small fixture additions, and task/evidence/handoff/status docs. No protocol/CLI,
shared contracts, dependencies/manifests/lockfiles/compiler/.pi, staging or commits.
Preserve all pre-existing working-tree changes. No successor or real writes.

Use the existing disposable T01 toolchain (verified Node24.21.0/npm11.19.0).
Permitted scoped static/build commands: npm run typecheck, lint:production,
format:check:production, build; scoped ESLint/Prettier/node --check. Tests run on
a stable build, sequentially, in the existing inspected private-bus/provider/ext4/
HTTPS runner with fresh synthetic scopes; never use ambient services. Runner and
qualified provider are local disposable artifacts. No reinstall is needed for
this slice; clean locked parent reproduction belongs to S3. Do not change HOME
in the agent shell; the existing isolated child runner supplies its private HOME.

## Verification and deliverables

Small unit checks: missing/disabled/invalid configuration and strict factory/
argument/signal behavior; real T09/T11 memory fixture cancellation immediately
after acknowledged admission, current binding privacy and confirmed-history
preservation. Actual isolated provider/ext4/T06/T05 HTTPS runtime checks: enabled
saved receipt/identical repeat, changed intent, disabled zero traffic/no admission,
missing auth, invalid input/invisible reference, uncertain stopped attempt and
explicit replay, close at held mutation/no dependent send/owner reacquisition,
startup no replay and retained six-read behavior. Reuse accepted engine fixtures;
do not recreate the crash matrix or introduce generalized interception.

Early static/import checks, focused repair runs, then complete active S1 owning
files plus relevant unchanged runtime/service/admission/execution regressions.
Record exact selection in review before final execution; no silent exclusions or
skips as passes. Inspect stable input/output hashes. Deliver source/types/tests,
primary-agent spec/source/test review, artifact inventory, safe exact commands/
results/versions, limitations and handoff; update task/index/verification.

Target60–90 minutes; checkpoint at90 and stop by120 with honest partial state.
Stop/escalate contract conflict, missing public decision, unsafe ownership/
durability, unavailable isolated fixture or scope expansion. Safe settlement
precedes teardown; time limits never weaken verification. S1 does not close T15
or certify MCP/backend/host/Google/Android/security/release behavior.
