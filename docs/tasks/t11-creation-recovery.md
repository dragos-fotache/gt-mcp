# T11 — Complete crash recovery, conflicts and terminal minimization

**Status:** planned · **Owner:** unassigned · **Requires:** T10
**Size:** 2-3 sessions

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
