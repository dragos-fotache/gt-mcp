# T11-S1 — Explicit active-journal recovery

**Status:** accepted/closed, 2026-10-15 · **Owner:** primary Codex agent
**Authorization:** user: “after planning start work at the first slice”.

Implement the [settled S1 contract](../decisions/t11-plan-and-slices.md) after
accepted T10. Add executeRecovery(binding,handle,signal) to CreationExecutor,
returning existing CreationFreshResult. In an awaited real withOperation callback,
resume only active journals, skip confirmed steps, replay the first pending step
exactly, reuse T10 advisory checks for unsent dependent steps and stop at the first
stopped/terminal result. Hold the existing module-wide handle exclusion throughout.
No outer retries: T05/T06 retain their accepted bounded retries/deadlines/refresh;
malformed confirmation requires another identical explicit invocation. No startup
IO, terminal historical replay, compaction, new identity/schema or MCP enablement.

Authority, non-goals, safety, interfaces and stops are in the linked parent plan;
apply [proportional testing](../decisions/proportional-testing-policy.md).
Scope: src/creation, new focused test/unit/t11 and test/fault/t11, minimal reused
fixture extensions only if needed, T11 work/evidence/handoff/current status docs.
Preserve prior uncommitted work. No dependencies/config/lockfiles/shared-contract/
.pi changes, staging or commits. Use disposable Node24.21.0/npm11.19.0; resolve the
existing workflow locator and verify versions. Production/scoped static checks,
build and exact selected tests permitted. Only fresh synthetic isolated storage/
private-CA HTTPS/provider fixtures; qualify isolation and await owned cleanup.
Never build/install while tests execute against that target.

Verification: public decision tests for active-prefix recovery, exact pending
replay, uncertain stop, advisory conflict, permanent rejection/cancellation and
cross-facade exclusion; real production provider/ext4/T06/T05 HTTPS explicit
recovery after reopen, no startup sends and independent exact request identity.
Use existing T10 checkpoints/T04 faults; full per-step matrix remains S3.

Final active selection: new S1 suites plus
test/unit/t10/s2-executor.test.mjs, test/unit/t10/s3-fresh.test.mjs,
test/fault/t10/s2-execution.test.mjs, test/fault/t10/s3-workflow.test.mjs,
test/unit/t09/s3-transitions.test.mjs, test/fault/t09/s3-persistence.test.mjs,
test/unit/t05/10-replay-identity.test.mjs,
test/fault/t06/s4-refresh-retry.test.mjs and
test/fault/t06/s4-concurrency-fences.test.mjs. Run four production checks plus
scoped test syntax/lint/format and bounded inert import/construction smoke. Record
exact commands, versions, artifact identities, failures and limits in review and
handoff. No claim of real backend/DB/Android or independent release certification.

Milestones: contract/claim -> implementation/early statics -> scoped tests -> stable
selection -> review/status/handoff. Target60–90 minutes; checkpoint90, stop120 with
honest partial handoff. Stop affected work for contract conflict/isolation failure/
new dependency need. S2/S3 require separate assignment; parent T11 stays incomplete.

## Disposition

[Accepted](../evidence/t11-s1-review.md):14/14 new owning+80/80 unchanged
regressions=94/94 in11 exact files, four production/scoped checks,494 stable
hashes and bounded silent import/construction PASS. Actual isolated production
provider/ext4/T06/T05 HTTPS proves explicit exact replay after reopen/no startup
sends; scripted responder is not backend/DB/Android proof. [Handoff](../handoffs/t11-s1.md).
S1 grants closed; S2/S3 unassigned, parent T11 incomplete and product unavailable.
