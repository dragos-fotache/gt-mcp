# T16 — Verify against an isolated real backend and sync consumers

**Status:** complete; S1–S7 and integrated parent accepted/closed · **Owner:** Primary Codex agent · **Requires:** T07, T12, T15 (accepted)
**Size:** bounded slices plus isolated interoperability

User-assigned [S7](t16-s7-work-order.md) is [accepted with parent T16](../evidence/t16-s7-review.md):
46/46 full active owning and181/181 relevant unchanged regressions pass, zero
failures/skips. Actual API37 Android ordinary sync preserves the exact saved MCP
graph; repeated sync is stable. Clean locked reconstruction, executed source/APK
identity, original-input preservation and owned cleanup pass.
[Handoff](../handoffs/t16-s7.md), [scenario reconciliation](../evidence/t16-s7-scenario-reconciliation.md).
All T16 grants are closed; T17/T19/independent T20 and release remain separate.
No automatic successor, real enablement, staging or commits.

Current source qualification is recorded separately by
[T21-S5](../evidence/t21-s5-review.md):37 actual-backend checks for config2,
single-record credentials and invocation-local creation. Affected historical
requirements are [mapped explicitly](../evidence/t21-s5-scenario-reconciliation.md).
T16's original acceptance remains unchanged; current Android delivery is not
claimed by S5. No T16 window is reopened.

## Historical slice dispositions

Earlier outcomes below retain their original scope/limits; they do not reopen work.

[S6](t16-s6-work-order.md) is [complete](../evidence/t16-s6-review.md):45/45 full
active owning checks,35/35 unchanged local regressions and27/27 backend checks;
zero failures/skips,615 stable owning hashes and owned cleanup PASS. Real other-
client edit/delete/advisory races, generation fences, matching-binding recovery,
retirement and authoritative deletion cleanup now pass. The user authorized a
narrow backend timestamp repair; freshness, exact replay and the24-hour deadline
remain intact. [Handoff](../handoffs/t16-s6.md). S1–S6 closed; S7 unassigned;
parent T16 and independent/external release gates remain open.

Earlier slice dispositions below are historical; they do not reopen closed work.

[S5](t16-s5-work-order.md) is [complete](../evidence/t16-s5-review.md):54/54 in
eight files, all36 active owning checks plus18 unchanged regressions;611 stable
hashes,312 unchanged product/config inputs/outputs and owned cleanup PASS. Actual
per-step durable process interruption/cancellation, lost final MCP receipt,
bounded injected429, real save rejection/key reuse and malformed/unrelated-target
success recovery now have evidence. [Handoff](../handoffs/t16-s5.md).
S1–S5 closed; S6 races/lifecycle and S7 Android/integrated acceptance remain
planned/unassigned. Parent T16 and release gates remain open; no automatic successor.

[S4](t16-s4-work-order.md) is [complete](../evidence/t16-s4-review.md):42/42 in
eight files, all21 active T16 plus21 unchanged regressions;608 stable hashes,
312 unchanged product/config inputs/outputs and owned cleanup PASS. Five new cases
cover A05 authentic expired-access replay/install-before-rotation, reference
rejection/terminal repeat, concurrent normalized identity/distinct creation and real
root collision. [Handoff](../handoffs/t16-s4.md). User separately authorized S5 while
S4 finished; S6/S7 remain unassigned. Parent T16 and release gates stay open.

User authorized settling the remaining slices and starting the first on 2026-10-16.
[Remaining plan](../decisions/t16-remaining-slices.md) assigns auth/creation decisions
to [S4](t16-s4-work-order.md) (now complete), crash/cancellation/uncertainty to S5,
other-client races/lifecycle to S6, and Android/parent acceptance to S7. S5 and S6 have since received separate user authorization; S7 needs
separate execution authorization. Earlier “later slices unassigned” statements
below describe their historical dispositions; S1–S3 remain closed.

User assigned T16 on 2026-10-16. The initial bounded window is governed by
[T16-S1](t16-s1-work-order.md); later outcomes and parent acceptance remain open.
[S1 review](../evidence/t16-s1-review.md) records 450/450 checks (4 actual-backend
owning  + 446 unchanged regressions), original-input stability and owned cleanup.
Representative reads/creation/exact response-loss replay/DB/sync are verified;
full auth/race/recovery/backend-restart/Android and parent acceptance remain open.
Original backend/Android checkouts remain read-only; personal/live environments
are excluded. [Handoff](../handoffs/t16-s1.md). No automatic successor.

User authorized [S2](t16-s2-work-order.md): actual refresh recovery, backend restart
and logout/account-disable fences, now [complete](../evidence/t16-s2-review.md):
90/90 in eight files, all nine active T16  + 81 unchanged auth/lifecycle regressions;
original/product inputs unchanged and all owned cleanup verified.
[S2 handoff](../handoffs/t16-s2.md). Timing/cursor/filter/numeric/ownership and further
creation/domain/race/crash/lifecycle/Android evidence and parent acceptance remain
open. Later outcomes remain separately unassigned; no full T16 gate is closed.

User authorized [S3](t16-s3-work-order.md): actual read/filter/paging/visibility/
numeric boundaries and authentic page expiry using a disposable test-clock artifact.
Now [complete](../evidence/t16-s3-review.md): 147/147 in 11 files, all 16 active T16
checks plus 131 unchanged regressions; 607 hashes stable and owned cleanup verified.
A narrow catalogue decoder repair accepts valid bundled cross-role muscle membership
while retaining custom restrictions; no contract/dependency change. Five Java
restarts include two test-only clock selections; original 116 backend inputs stable.
[S3 handoff](../handoffs/t16-s3.md). S1–S3 closed, later slices unassigned. A05 and
remaining creation/domain/race/crash/lifecycle/Android and integrated acceptance
remain open; historical T18 archive needs the repair in a later verified candidate.


## Outcome

Establish real API/database/replay/auth/domain evidence; doubles alone are insufficient.

## Read first

- [acceptance-scenarios.md](../../shared-docs/docs/mcp-contract/acceptance-scenarios.md)
- [acceptance-scenarios.md](../../shared-docs/docs/backend-contract/acceptance-scenarios.md)
- [service-protocol.md](../../shared-docs/docs/backend-contract/service-protocol.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Provision/obtain a disposable actual GymTracka backend and real database with two isolated accounts and known visible catalogue/custom fixtures. Coordinate backend-owned test clock/provider seams; no production bypass or personal DB.
- Verify ownership/search/paging/schema/numeric boundaries via real HTTP; exercise dedicated-session refresh/logout/account-disable fences including in-flight requests.
- Fault each of draft/populate/save at commit/response/persistence boundaries; inspect actual roots/children/revisions/replay/batches after retries and service/adapter restarts.
- Run draft edit/delete and advisory-check race cases against real server last-write-wins; prove no unsupported optimistic concurrency claim.
- Observe intermediate draft and saved final state through ordinary sync pull/snapshot with exact IDs/order; coordinate an Android integration journey showing saved routine after successful normal sync.
- Record backend artifact/shared-contract versions and safe fixture/test provisioning instructions. Missing actual backend/Android evidence is blocked, not a mocked pass.

## Acceptance criteria

- Full shared scenario coverage at real backend layer passes with truthful no-duplicate/no-rollback/replay assertions independent of returned adapter messages.
- Sync publication and Android observation do not claim instantaneous delivery to offline phones.
- Disposable resources are cleaned and logs/evidence contain no tokens, personal bodies or production identifiers; failing contract drift is raised explicitly.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

Real-service M04-M09/A03-A10/C01-C08/R01-R12 plus cross-project sync evidence; Google/browser happy path separately T19.

## Handoff

Record exact sanitized commands, fixture provenance, artifact/version matrix, results, remaining externally blocked cases and cleanup evidence.

On completion append: changed paths; exact safe commands and pass/fail results; versions;
remaining blockers/limits; next-agent integration notes. Update the task index. Do not
record credentials, identifying production data or raw private request/response bodies.
