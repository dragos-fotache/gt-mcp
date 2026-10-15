# T09 — Implement operation admission and immutable creation journals

**Status:** planned; ready (T03/T04 accepted; no assignment granted) · **Owner:** unassigned · **Requires:** T03, T04
**Size:** 1-2 sessions

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
