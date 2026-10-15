# T10 — Implement draft, populate and save with strict confirmations

**Status:** planned · **Owner:** unassigned · **Requires:** T05, T06, T09
**Size:** 1-2 sessions

## Outcome

Implement the three-step creation engine with no misleading atomicity or rollback claims.

## Read first

- [routine-creation.md](../../shared-docs/docs/mcp-contract/routine-creation.md)
- [openapi.yaml](../../shared-docs/docs/backend-contract/openapi.yaml)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Execute stored POST draft -> PUT complete draft -> POST save requests with dedicated access token and each original resource key.
- Persist dispatch-possible before network I/O and confirmation before subsequent dispatch.
- Require correct status, complete same-ID canonical Routine, expected draft/saved state, domain inputs/child IDs/order and valid revision; derived labels are not writable identity.
- Malformed/unrelated successful replies remain uncertain until exact replay. Valid saved reply with changed domain shape confirms save but returns terminal concurrent_modification.
- Stop after permanent domain rejection; never issue remaining steps, auto-delete a draft, switch to sync/push or regenerate target IDs.
- Provide injected checkpoints/transport failures for the recovery task; happy path must still be restart-aware.

## Acceptance criteria

- Happy path emits exact expected bodies/keys and one saved receipt; it does not mutate workouts or unrelated routines.
- No advancement on HTTP status alone; wrong IDs/shape/state/precision and idempotency mismatch fail truthfully.
- Precheck visibility changes and populate/save rejection preserve prior draft history.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

C01-C04, C08; response/rejection aspects of R07-R08/R10.

## Handoff

State confirmation predicates and failure checkpoints; identify pending recovery/fault tests still owned by T11.

On completion append: changed paths; exact safe commands and pass/fail results; versions;
remaining blockers/limits; next-agent integration notes. Update the task index. Do not
record credentials, identifying production data or raw private request/response bodies.
