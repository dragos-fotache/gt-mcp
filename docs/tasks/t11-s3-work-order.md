# T11-S3 — Required crash matrix and integrated parent acceptance

**Status:** accepted/closed with parent T11, 2026-10-15 · **Owner:** primary Codex agent
**Authorization:** user: “go ahead and do s2 and then s3”; S2 now accepted/closed.

Complete the [settled S3 contract](../decisions/t11-plan-and-slices.md) using
accepted S1 recovery/S2 service and T09/T10. For draft/populate/save independently,
verify admitted-unsent restart, persisted dispatch before wire, response received
before confirmation and confirmed step before next send/result delivery. Use real
separate-process restart/exit at awaited durable checkpoints, original requests/
keys and one root, no startup requests and no GET settlement of pending work.
Graceful reopen/process exit does not establish physical power-loss durability.

Add only missing high-value checks: actual response loss/transient retries and
Retry-After exhaustion, after-wire cancellation at each stage, confirmation/terminal
write failures, concurrent identical/changed calls, second-process ownership, and
post-advisory-GET saved-content race. Reuse accepted S1/S2/T10 evidence rather than
cross-multiplying failures with every stage/provider/auth case. R11 storage stays
T04/T09; R12 trusted retirement/deletion/sign-out UI stays T12. Real backend/DB/
Android effects and MCP/config/host/release acceptance stay T15/T16 and later gates.

Authority/safety/non-goals: parent plan, shared MCP draft0.2/backend v1, accepted
foundation/ADRs and [proportional testing](../decisions/proportional-testing-policy.md).
Scope: focused test/fault/t11 sources/helpers, necessary src/creation regression
repairs only, a narrow T10 export-list regression update for the settled additive
createCreationService API, minimal T10 fixture hooks for between-owner-reopen child work,
synthetic response dropping and fixture transport budgets, plus T11 evidence/
handoff/status docs. No generalized harness/dependency or relaxed checks. No
shared-contract/manifest/lockfile/compiler/.pi changes, staging or commits.

Use disposable Node24.21.0/npm11.19.0. Early scoped syntax/types/lint/format/import
checks, production checks/build, selected test execution, bounded smoke and private
snapshot with locked npm ci --ignore-scripts/four checks/build/identical selected
replay permitted. Only isolated synthetic diagnostic facilities or fresh qualified
private provider/ext4/private-CA HTTPS; no personal/live services. Track/reap owned
children, drain begun commits and clean owned scopes; no build/install racing tests.
Crash checkpoints are after acknowledged commits, never intentionally abandon a
durability-critical transition. Any failed facility qualification blocks that work.

Final suite: complete active T11 and T10 tests plus T09 s1-format/s2-admission/
s3-transitions/s3-persistence, T05 10-replay-identity and 05-budgets-deadlines-retry
(new retry composition risk), T06 s4-refresh-retry/s4-concurrency-fences. Exact
filenames/results and requirement-to-evidence mapping go in review/inventory.
Deliver stable workspace and clean snapshot source/emitted/test hashes, byte-identical
outputs, exact safe commands/versions/failures/limits, primary-agent spec/source/test
review, integrated parent disposition and handoff. Independent security/release
certification remains open. No skipped/waived check is a pass.

Milestones: S2 acceptance/claim -> scoped missing fault checks -> stable final suite
-> clean locked build/replay -> review/matrix/status/handoff. Target60–90 minutes,
checkpoint90 and stop120 with honest partial disposition. Hold affected work for
contract conflict, missing isolation, new dependency/format need or expanded harness.
No T12/T15 or other successor authorization.

## Disposition

[S3 and parent accepted](../evidence/t11-s3-review.md):55/55 T11 owning+206/206
regressions=261/261 in20 files in workspace and clean locked replay; zero skips/
failures/pending/todo. Four production/scoped checks,355 stable copied inputs,
182 byte-identical emitted files,506 identical stable selected hashes and silent
bounded smoke PASS. [Matrix](../evidence/t11-s3-fault-matrix.md),
[handoff](../handoffs/t11-s3.md). All T11 grants closed; product unavailable,
T12/T15 unassigned, external/independent release gates unchanged.
