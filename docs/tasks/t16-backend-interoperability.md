# T16 — Verify against an isolated real backend and sync consumers

**Status:** planned · **Owner:** unassigned · **Requires:** T07, T12, T15
**Size:** 2-3 sessions plus external access

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
