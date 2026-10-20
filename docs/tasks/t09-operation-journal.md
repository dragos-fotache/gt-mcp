# T09 — Implement operation admission and immutable creation journals

> **T21-S1 successor authority (2026-10-17):** T21 removes this creation journal/receipt feature; historical acceptance stays closed.
> See the [successor storage/interface spec](../decisions/t21-single-record-storage-spec.md). Documentation only;
> current runtime/package behavior is unchanged until T21 implementation acceptance.

**Status:** done; S1/S2/S3 and integrated parent accepted · **Owner:** primary Codex agent (all T09 work closed) · **Requires:** T03, T04
**Size:** three bounded outcomes; time windows are not completion promises

## Current disposition — S3 and parent T09 complete

The user separately assigned S3 on 2026-10-15. Its
[work order](t09-s3-work-order.md) and integrated parent T09 are
[accepted](../evidence/t09-s3-review.md):15/15 new S3 checks,49/49 unchanged
S1/S2 and132/132 relevant regressions,196/196 total in17 exact files. Clean
locked source-snapshot install/four production checks and the same196/196 replay
passed;329 copied inputs remained stable and166 compiled outputs matched the
workspace byte-for-byte. Both selected runs retained62 identical stable hashes.
Real isolated provider/ext4/HTTPS, separate-process restart, state/commit faults
and complete cleanup passed. [Current handoff](../handoffs/t09-s3.md).

The repository now persists guarded admission, ordered dispatch-possible and
confirmation markers, atomic confirmation+terminal results, definitive compact
receipts and trusted unresolved-operation retirement. Creation remains unavailable;
T10/T11/T12/T15 retain execution/recovery/lifecycle/MCP wiring. No automatic
successor or external security/interoperability/release acceptance is claimed.

## Prior disposition — S2 complete

The user assigned S2 on 2026-10-15 after reading the S1 handoff.
The [S2 work order](t09-s2-work-order.md) is
[accepted](../evidence/t09-s2-review.md):22/22 new owning checks,27/27 unchanged
S1 and118/118 relevant regressions,167/167 total in13 exact files. Production
type/lint/format/build and scoped test checks passed;54 selected hashes stayed
stable. Real isolated provider/ext4/HTTPS, second-process ownership/reopen and
definite/ambiguous T04 admission faults passed with complete fixture cleanup.
[Current handoff](../handoffs/t09-s2.md). S3 needs a separate assignment.

## Prior disposition — S1 complete

The user requested planning/slicing on 2026-10-15 under the single-agent Codex
workflow. The [T09 plan and common contract](../decisions/t09-plan-and-slices.md)
records three sequential outcomes:

| Slice | Outcome                                                              | Disposition          |
| ----- | -------------------------------------------------------------------- | -------------------- |
| S1    | Versioned format, immutable request identities and capacity contract | Accepted/closed      |
| S2    | Guarded durable admission and exclusive operation access             | Accepted/closed      |
| S3    | Persisted state transitions, restart proof and parent acceptance     | Accepted/closed      |

The user assigned S1 on 2026-10-15; its [work order](t09-s1-work-order.md) is
[accepted](../evidence/t09-s1-review.md):27/27 owning plus47/47 unchanged T03
regressions,74/74 total, four production checks, stable hashes and bounded import
smoke. [Handoff](../handoffs/t09-s1.md). S1 windows are closed; S2 is ready but
unassigned. T10/T11/T12/T15 retain dispatch, orchestration, trusted lifecycle and
MCP integration ownership. Creation stays unavailable.
Apply proportional tests and the standing bounded-work/stopping policy.

## Outcome

Reserve one durable server operation identity before any mutation and support
exact recovery under current config/auth fences. Read [the config-only policy](../decisions/routine-creation-config-policy.md).
No host approval store/sidecar/external permission extension is required.

## Read first

- [routine-creation.md](../../shared-docs/docs/mcp-contract/routine-creation.md)
- [tools.md](../../shared-docs/docs/mcp-contract/tools.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Implement complete pre-admission local validation/auth/config-file writesEnabled:true checks (false/missing configuration_required, invalid config fail-closed; no host approval) and injectable visible-exercise prechecks; failed prechecks reserve neither operation nor root.
- Normalize intent with T03; lock operation admission and compare versioned keyed identity under origin/account/profile binding.
- Allocate one routine UUID, distinct entry/set UUIDs, consecutive positions and three distinct resource keys once; persist all exact step method/route/body bytes atomically before first send.
- Represent dispatch-possible, confirmed canonical state, pending uncertainty, terminal result and permanent retirement with explicit journal versions.
- Same ID/equivalent normalized intent opens original evidence; changed content rejects operation_id_reused. Incompatible/missing evidence fails recovery_unavailable, never repairs IDs/keys.
- Keep credentials out of operation records; define compact terminal receipt format and API for T11 minimization.

## Acceptance criteria

- Simultaneous identical admission allocates only one root/stream; conflicting intent cannot overwrite evidence.
- Defaults/property-order/numeric spelling equivalence and name/array/value differences are tested.
- Restart/version/corruption tests retain immutable bytes/keys; UUID family collisions and all generated positions validate.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

C02/C06-C08, R01/R11 admission aspects.

## Handoff

Document journal/intent versions, byte format, admission boundary and locking/minimization APIs.

On completion append: changed paths; exact safe commands and pass/fail results; versions;
remaining blockers/limits; next-agent integration notes. Update the task index. Do not
record credentials, identifying production data or raw private request/response bodies.
