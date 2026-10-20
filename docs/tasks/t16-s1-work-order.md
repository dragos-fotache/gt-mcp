# T16-S1 — Isolated backend qualification and MCP creation/replay

**Disposition:** complete 2026-10-16; [review](../evidence/t16-s1-review.md),
[handoff](../handoffs/t16-s1.md).450/450 final checks; owned cleanup complete.
S1 window closed; parent T16 incomplete and later outcomes unassigned.

**Authorization:** user: “ok let's start work at t16”, 2026-10-16; backend and
Android source locations subsequently supplied by the user. Primary Codex agent
owns this bounded window. Parent T16 remains incomplete until integrated acceptance.
Checkpoint by 15:55 UTC; stop by 16:25 UTC on 2026-10-16 (including initial pickup).

## Outcome and boundary

Qualify a disposable actual GymTracka backend/PostgreSQL environment, then exercise
the delivered MCP against it: account-isolated reads, explicit configured routine
creation, exact resource replay after response loss, and independent database/sync
observations. Backend HTTP/DB claims require actual components, not the existing
scripted HTTPS fixtures. Android observation, broader auth/race/recovery checks
and parent integrated acceptance remain separately authorized follow-up outcomes.
No automatic successor, T17/T19/T20 work, live enablement or release.

## Authority and settled behavior

- Shared MCP draft0.2 acceptance scenarios/tools/authentication/routine-creation;
  backend v1/OpenAPI1.0.0 service-protocol, authentication, domain and sync rules.
  Shared baseline 9a96dcb plus the approved working policy revision; do not edit.
- [T16 requirements](t16-backend-interoperability.md),
  [verification matrix](../verification.md), accepted T07/T12/T15 and T18 handoffs,
  [config policy](../decisions/routine-creation-config-policy.md) and
  [proportional testing](../decisions/proportional-testing-policy.md).
- Exactly seven MCP tools; writesEnabled is a strict config-file boolean defaulting
  false. Only explicit calls with true plus valid auth/intent may create. No new
  permissions, model-facing authentication/SQL/sync tools or API/schema changes.
- POST draft → PUT populate → POST save; preserve original operation/resource/child
  IDs, exact request bytes and three resource keys on replay. Restart sends nothing.
  Live authorization remains required; DB revision/batch counts independently prove
  no duplicated effects. Sync pull/snapshot includes drafts; routine lists exclude
  drafts. Observe complete saved IDs/order without an instant/offline-delivery claim.

## Scope and execution

Edit only new bounded T16 tests/helpers under test/backend-interoperability/,
T16 task/evidence/handoff files and concise current-status entries. Production
repairs, if a concrete MCP defect is found, must be recorded with a focused
regression and revised scope before editing. No dependencies/compiler relaxation.
Backend/Android originals are read-only; any test launch overlay belongs in a
disposable copy. No backend/Android product repairs or shared-contract edits.

Use the retained disposable T01_NODE_HOME explicitly, require Node24.21.0 and
npm11.19.0 before any Node-dependent command, and leave system tooling/.pi intact.
Java27/Maven-wrapper builds use the backend build lock. Allow scoped source/input
hash checks, compile/static checks, and isolated Docker/Testcontainers PostgreSQL16
plus loopback backend/private-CA TLS and private Secret Service/ext4 fixtures.
Never source private env files, inspect personal databases or access the paused
live Android journey. Fixture credentials must be generated in isolated private
memory/files, never argv/repo/logs/evidence. Clean only resources created here.
Do not rebuild/install while tests use that target; no staging/commits/deployment.

Qualification found six newer prose files disagree with the backend's historical
checksum manifest. Reconstruct only those exact pinned Git blobs in the disposable
build copy, preserving the original manifest/gate and recording old/current hashes.
Runtime catalogue, OpenAPI, migrations and product code are not replaced. Current
shared MCP/backend contracts remain the test oracle; historical build prose is
provenance, not a substitute normative contract. Originals remain untouched.

## Proportional checks and deliverables

1. Record source/shared-input versions, dirty-state boundaries and tool/provider
   availability; qualify a fresh real DB/backend with synthetic account A/B and
   visible catalogue/custom fixtures. Preserve build failures safely.
2. Reuse SDK framing and isolated provider/TLS setup. Add a narrow fixture bridge,
   only if needed, using backend-owned test provider/clock seams. First syntax,
   import, lint and format checks; no generalized harness or fault cross-product.
3. Contract-derived core journey: representative visibility/saved-list/default
   paging, two-exercise ordered routine with null/zero/default/repeated references,
   same-operation receipt and independent root/child/revision/replay/batch counts.
   Inject committed-response loss independently at draft/populate/save and explicitly
   retry the original operation; do not infer settlement from GET alone.
4. Run the full active S1 owning checks and relevant unchanged T15/T11/T08 regressions
   on a stable final candidate. Record exact selection/results/cleanup and remaining
   scenario IDs; no skipped/missing checks counted as passes. Final parent T16
   acceptance still requires all mandatory shared/backend/Android gates.

Deliver runnable narrow checks where qualification permits, a sanitized evidence
report with versions/provenance/results/limits, and task/index status updates.
Milestones: environment qualified; core real boundary observed; reviewed evidence
and owned cleanup. Stop affected execution for missing safe external inputs,
contract drift, unowned resources, unresolved public semantics, unsafe logging or
time limit; record specific blockers with placeholders while continuing unrelated
authorized preparation. No guessed OAuth client IDs/origins/ports or personal inputs.
