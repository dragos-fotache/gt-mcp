# T10-S2 — Durable single-step execution

**Assigned:** explicit user request on 2026-10-15. **Owner:** primary Codex agent.
**Status:** accepted/closed; [review](../evidence/t10-s2-review.md) and
[handoff](../handoffs/t10-s2.md).27/27 new S2+56/56 S1+88/88 regressions,
171/171 total; four production/scoped checks and stable target hashes PASS.
Accepted S1 remains closed; parent T10 incomplete, S3 ready/unassigned.
No automatic successor.

## Outcome and authority

Implement S2 of the [plan](../decisions/t10-plan-and-slices.md) using the
[S1 interface](../handoffs/t10-s1.md), accepted T09 handle/repository, T06 session,
T05 fixed transport and T03 canonical validation. Authority remains shared MCP
draft0.2 creation/tools/authentication and backend v1 OpenAPI/service/domain rules,
then accepted foundation and local decisions. Follow the standing
[proportional testing policy](../decisions/proportional-testing-policy.md).

Deliver exactly one requested next step, not a fresh three-step loop or recovery
campaign. No new retry budget, startup continuation, terminal replay delivery,
compaction, profile lifecycle, MCP/config-file wiring or production enablement.
No dependency, journal/receipt format or shared-contract changes.

## Settled additive API and execution rules

Add `createCreationExecutor({session, checkpoints?})` to the existing internal
creation entry. Capture T06 binding/getRoutine/createDraft/populateDraft/saveRoutine
and original method receivers; construction performs no IO. Checkpoints are a
trusted optional awaited callback receiving only frozen `{step,phase}`; phases:
after-dispatch-mark, before-mutation, before-confirmation, after-confirmation.
No arbitrary URL/header/sender/token/config flag or domain/body/key in events.

Return an executor with
`executeNextStep(binding, handle, signal): Promise<CreationStepResult>`.
Results are confirmed/marker, terminal/result or stopped/error, with shared typed
errors and mandatory authorized operation history. Only newly acknowledged
terminal results may return here; existing terminal/receipt/retired evidence is
rejected before dispatch and is not replayed to the caller. Invalid construction/
arguments use safe existing OperationError types. A failed initial authorized
handle read propagates safe dependency errors without inventing IDs/history.

The caller must await this method inside the actual repository.withOperation
callback and share its binding and cancellation signal. The factory is trusted
composition, not an admission authority. T09 remains the only admission/ownership/
policy boundary; T15 must close it and abort execution on effective disablement.
Current handle reads plus signal/session-binding checks fence each unsent action.
Concurrent calls on the same handle reject invalid_state, including across
executor instances, rather than launching duplicate mutation methods.

Ordering and decisions:

1. Capture/validate binding/signal and a detached active entry snapshot; select
   only the first unconfirmed step. Match all durable binding fields with current
   session and captured generation. Validate exact stored method/route/body/key
   before any domain send. Preserve entry history before this attempt's mark for
   S1 failure classification.
2. For an unsent populate/save only, read T09 confirmationBaseline and perform
   authorized T06 getRoutine. Validate canonical projected shape, expected root,
   draft state, exact revision and admitted domain. A received authorized 404 or
   changed baseline settles terminal concurrent_modification before mutation.
   Other failures stop active. This check is advisory, not CAS. A pending step
   skips GET and replays original identity; GET never settles uncertainty.
3. Await recordDispatchPossible, checkpoint, current owner/handle and signal/
   binding checks, then the before-mutation checkpoint and final guards. Call
   exactly the selected fixed T06 mutation method with detached original bytes
   and key. T05/T06 accepted retries remain unchanged; S2 adds no loop.
4. Evaluate S1 raw confirmation. Uncertain replies stop active. Await
   recordConfirmation(marker,terminal?) for confirmed results; save result and
   confirmed-save conflict commit atomically. Permanent mutation rejection uses
   S1 classification and awaited settleTerminal; never replace identities.
5. Return only after acknowledgement and final current-owner/signal/binding
   checks. Failed/ambiguous commits stop, do not acknowledge progress and do not
   allow dependent mutation. T09's ambiguity fence remains authoritative.

Cancellation/checkpoint/close failures stop unsent work and retain evidence.
After an acknowledged confirmation/terminal, later interruption may suppress
delivery but cannot replace the durable result. Its stopped error reports the
newly acknowledged history and known outcome; do not pass settled evidence back
through S1's active-journal classifier. Begun commits always settle before release.
No background work escapes the awaited method. Late/out-of-callback handles fail.

## Edit and execution scope

Scope: additive executor/types/entry and small internal comparator reuse in
src/creation; new test/unit/t10 and test/fault/t10 tests/helpers; S2/T10 docs,
evidence/handoff/index/roadmap/verification. Preserve S1 behavior and evidence.
The S1 exact export-catalogue assertion is explicitly expanded by the one new
factory export; no other S1 expectation is weakened. Dependency sources/tests/
helpers, manifests/lock/compiler/shared docs and .pi remain unchanged.

Use provisioned Node24.21.0/npm11.19.0 via T01_NODE_HOME, resolving the existing
disposable locator if needed. Scoped reads/edits, syntax/type/lint/format/build
and exact Vitest selections permitted. No rebuild/install during tests. No install
needed; clean locked reproduction remains S3/parent work. No staging/commits.

Only synthetic isolated fixtures: accepted T04 diagnostic facility/commit faults
and real encrypted files/holder processes; existing test-only loopback cert/key,
literal-loopback HTTPS with testCaPem and actual T06/T05 sessions. Reuse T05
server/TLS helpers, T06 teardown, T09 decision fixture/candidate helpers. Diagnostic
key facilities are not production Secret Service; scripted HTTPS is not a real
backend. No personal/live provider, backend, DB, Google, Android or real secrets.
Close/reap/remove all owned facilities/server/child processes, failing on cleanup
errors. Full production-provider/ext4 composition remains S3.

## Proportional checks and milestones

Small public decision/capability checks cover binding/method-receiver capture,
one-step result/ordering, baseline divergence/deletion, pending replay/no GET,
concurrent same-handle rejection, retained handle and close/abort checkpoints.
Reuse the real repository decision fixture; do not mock every private function.

Real T04/T06/T05 integration checks cover exact bytes/key (alternate JSON spelling),
persist-before-send and confirmation-before-return, definite dispatch-mark failure
(zero send), definite confirmation failure (no advancement), one ambiguous commit
(owner fenced, durable reopen evidence), actual reopen/no startup sends, a permanent
populate/save rejection, an uncertain successful reply and atomic saved conflict.
Use checkpoints for deterministic timing and existing fault controls for commit
failure; no new generalized harness or full per-step cross-product. T11 retains
the mandatory comprehensive per-step recovery matrix.

Run early types/scoped lint/format/import/syntax before behavioral acceptance.
Focused repair checks during development. Final complete active S1+S2 owning
selection and these relevant unchanged regressions, exact files recorded before run:

- test/unit/t09/s1-format.test.mjs
- test/unit/t09/s2-admission.test.mjs
- test/unit/t09/s3-transitions.test.mjs
- test/fault/t09/s3-persistence.test.mjs
- test/unit/t05/10-replay-identity.test.mjs
- test/fault/t06/s4-refresh-retry.test.mjs
- test/fault/t06/s4-concurrency-fences.test.mjs

Four production checks, scoped new-test checks, stable selected/source/emitted
hashes, bounded silent entry import and primary spec/source/test review complete
S2. No full-repository or independent release claim. Milestones: work order ->
executor/early statics -> focused real boundary checks -> final stable owning/
regression run -> review/inventory/handoff/status. Target60–90 minutes; checkpoint
at90, stop at120 with honest partial disposition if unfinished.

Stop/escalate contract conflicts, required dependency API changes, missing isolated
facilities or inability to preserve truthful history. Do not weaken tests/contracts
or mask failures. Close S2 grants on completion; S3 needs separate assignment.
