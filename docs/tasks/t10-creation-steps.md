# T10 — Implement draft, populate and save with strict confirmations

**Status:** done; S1/S2/S3 and parent accepted/closed · **Owner:** primary Codex agent (all T10 work closed) · **Requires:** T05, T06, T09
**Size:** 3 bounded outcome slices; separate assignments, not time promises

## Design and pickup

The user requested design/planning on 2026-10-15. The
[T10 design and slice plan](../decisions/t10-plan-and-slices.md) records the task
contract, internal interfaces, confirmation/error decisions and proportional
verification. Planning is complete. The user subsequently assigned S1;
the [S1 work order](t10-s1-work-order.md) bounds its implementation and checks.
S1 is now [accepted](../evidence/t10-s1-review.md):56/56 owning+183/183 unchanged
regressions,239/239 total; four production/scoped checks and stable hashes PASS.
[S1 handoff](../handoffs/t10-s1.md). All S1 work closed; no automatic S2.

The user then assigned [S2](t10-s2-work-order.md), now
[accepted/closed](../evidence/t10-s2-review.md):27/27 new S2+56/56 S1+88/88
unchanged regressions,171/171 total. Four production/scoped checks,37 stable
selected hashes and real encrypted diagnostic engine/authenticated HTTPS PASS.
[S2 handoff](../handoffs/t10-s2.md). The user assigned [S3](t10-s3-work-order.md), now
[accepted with integrated parent T10](../evidence/t10-s3-review.md):11/11 new S3+
83/83 preserved S1/S2+88/88 regressions=182/182 in both workspace and clean locked
replay. Four production/scoped checks,345 stable copied inputs,178 byte-identical
outputs and492 identical stable selected hashes PASS.
[Current handoff](../handoffs/t10-s3.md). All T10 work closed; no automatic T11.

| Slice | Reviewable outcome | Disposition |
| ----- | ------------------ | ----------- |
| S1 | Pure confirmation and error decisions | Accepted/closed |
| S2 | Durable single-step dispatch/confirmation with baseline guard | Accepted/closed |
| S3 | Fresh three-step workflow and integrated parent acceptance | Accepted/closed |

T11 retains explicit multi-step recovery/retry/terminal replay/minimization;
T15 retains MCP/config composition. Product creation remains unavailable.

## Outcome

Implement the three-step creation engine with no misleading atomicity or rollback claims.

## Read first

- [routine-creation.md](../../shared-docs/docs/mcp-contract/routine-creation.md)
- [openapi.yaml](../../shared-docs/docs/backend-contract/openapi.yaml)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)
- [T09 completion and delivered interfaces](../handoffs/t09-s3.md)
- [Proportional testing policy](../decisions/proportional-testing-policy.md)

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
