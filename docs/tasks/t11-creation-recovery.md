# T11 — Complete crash recovery, conflicts and terminal minimization

**Status:** done; S1/S2/S3 and parent accepted, 2026-10-15 · **Owner:** primary Codex agent (T11 closed) · **Requires:** T10 (accepted)
**Size:** 3 bounded outcome slices

## Plan and current grant

[Decision-ready plan](../decisions/t11-plan-and-slices.md): S1 explicit active-journal
recovery -> S2 authorized terminal replay/minimization -> S3 required crash matrix
and integrated parent acceptance. The user authorized starting the first slice
after planning; [S1 is accepted/closed](../evidence/t11-s1-review.md):14/14 owning+
80/80 unchanged regressions=94/94, production/scoped checks and494 stable hashes
PASS. [Handoff](../handoffs/t11-s1.md). The user subsequently authorized S2 then
S3; [S2 accepted](../evidence/t11-s2-review.md):107/107 selected checks PASS.
[S3 and parent T11 accepted](../evidence/t11-s3-review.md):261/261 in20 files in
workspace and clean locked replay; four production/scoped checks,355 copied inputs,
182 identical emitted files and506 identical stable hashes PASS.
[Current handoff](../handoffs/t11-s3.md). All T11 grants closed; no T12/T15
assignment or product creation enablement.

## Outcome

Make every interrupted step safe to resume explicitly and every terminal receipt truthful.

## Read first

- [routine-creation.md](../../shared-docs/docs/mcp-contract/routine-creation.md)
- [tools.md](../../shared-docs/docs/mcp-contract/tools.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Resume only on identical explicit calls; replay first already-dispatched unconfirmed step exactly, skip confirmed steps, and never resume automatically on process start.
- Before a previously unsent remaining populate/save step, compare authorized fresh GET with last confirmed revision/domain state. Stop on edit/deletion; do not misrepresent this advisory check as CAS.
- Classify timeout/500/503/malformed mutation replies as uncertain; implement bounded identical retries and truthful operationId/routineId/lastConfirmedStep/outcomeUnknown errors.
- Cancellation stops unsent steps, preserves possible commits and reports operation_interrupted when deliverable. Permanent backend rejection and saved-content conflicts become durable terminal outcomes.
- Persist terminal result before reply; erase settled domain bodies and keep compact keyed intent receipt/profile binding. Check live backend authorization before replaying private terminal results; later routine deletion does not erase history or resurrect it.
- Inject crash/response-loss at each boundary of all three steps and exercise receipt-write failures, concurrency and session fences.

## Acceptance criteria

- Fault matrix proves one root and unchanged method/route/body/key across restarts; GET never settles uncertainty.
- Later Android edits are not overwritten on detected divergence; race after advisory GET remains explicit last-write-wins with correct saved-content conflict.
- Terminal repeats match original result under live authorization; profile/session changes block stale results and no automatic TTL deletes unresolved evidence.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

C05/C07; R01-R10/R12 engine recovery and minimization, with storage R11 from T04/T09.

## Handoff

Provide fault-matrix commands, state/error examples using synthetic IDs, compaction ordering and unresolved limits.

On completion append: changed paths; exact safe commands and pass/fail results; versions;
remaining blockers/limits; next-agent integration notes. Update the task index. Do not
record credentials, identifying production data or raw private request/response bodies.

## Completion

Delivered explicit recovery, service-level live-authorized terminal delivery and
definitive minimization on unchanged T09 v1 identity/persistence. Required per-step
process boundaries and representative storage/auth/concurrency/advisory-race risks
are recorded in the [fault matrix](../evidence/t11-s3-fault-matrix.md). Node24.21.0/
npm11.19.0;55/55 T11 owning+206/206 regressions=261/261 in both stable runs, zero
fail/skip/pending/todo. One T10 exact export list adapted for the additive service;
all domain assertions preserved. Review/inventory/clean evidence and handoff carry
changed paths, exact safe commands/results, versions, ordering, failures and limits.
T06 one-attempt resource cap and recorded omissions, T04 whole-state restore limits,
T12/T15/T16 and independent/external release gates remain. Product creation unavailable.
