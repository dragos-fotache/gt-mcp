# T16-S2 — Real refresh recovery, restart and authorization fences

**Disposition:** complete 2026-10-16; [review](../evidence/t16-s2-review.md),
[handoff](../handoffs/t16-s2.md). Final 90/90; owned cleanup complete. S2 window
closed; parent T16 incomplete and later outcomes unassigned.

**Authorization:** user: “right, go ahead with the next slice”, 2026-10-16.
Primary Codex agent owns this window. Start 15:15 UTC; checkpoint 16:45 UTC;
stop 17:15 UTC with safe owned teardown. S1 remains closed; parent T16 incomplete.

## Outcome, authority and behavior

Verify the actual backend/MCP authentication and durable replay boundary using S1's
isolated PostgreSQL/backend, private provider/ext4/TLS and SDK/compiled process.
Normative: current shared MCP draft0.2 authentication/acceptance A03/A04/A06 and
cross-project logout/account-disable write fences; backend v1 authentication,
service-protocol, account-lifecycle and transaction rules; existing T06/T12/T15
contracts. [T16](t16-backend-interoperability.md), [S1 handoff](../handoffs/t16-s1.md)
and [proportional testing](../decisions/proportional-testing-policy.md) also apply.
No shared changes, new permission mechanism, endpoint, token or compiler relaxation.

Settled behavior: refresh serializes per profile owner; authoritative401 permits
one refresh/retry per resource leg. Lost rotation response preserves exact original
token/body/auth key and private evidence; explicit retry after MCP/backend restart
recovers the original grant without another rotation. Backend account/session
liveness must be rechecked at serialized mutation authorization, including writes
waiting behind logout/disable. Generic401 is not authoritative account-deletion
knowledge and cannot trigger local deletion or replacement work. Already committed
effects remain possible; no rollback or optimistic-concurrency claim.

## Edit/execution scope and safety

Edit test/backend-interoperability/ helpers, narrow owning tests, runner and a
test-only restart-control overlay; T16 task/evidence/handoff and concise status
entries. Record any concrete MCP repair and focused regression before expanding
production edit scope. Original backend/Android checkouts, manifests, .pi and
personal/live setup remain read-only/untouched. No dependencies, staging/commits,
deployment, Google/browser work, phone access, successor or release.

Use pinned disposable T01_NODE_HOME/PATH (Node24.21.0/npm11.19.0), Java27 and the
backend Maven lock. Reproduce S1's exact historical prose-only pinned build inputs
in a disposable copy; retain current shared contracts as oracle. No rewriting the
checksum gate, source/schema/API or canonical catalogue. Scoped syntax/import/
lint/format/type/build checks and isolated Docker/PostgreSQL/provider/TLS execution
are permitted. Never rebuild/install while tests use the target.

The restart overlay may only supervise the Java child created by this run, keeping
its owned PostgreSQL alive and using identical JAR/config/keys/origin. A mode600
Unix socket inside the fresh mode700 private runner root supplies the test-only
restart command; no HTTP/product control endpoint or new authentication bypass.
Record original/overlaid launcher hashes and observed restart counts. All raw
credentials/bodies/IDs stay in private memory/files, never argv/logs/repo/evidence.
Clean only owned children/container/socket/config/private roots.

## Small contract-derived check set

1. Expire only the isolated server access credential to provoke real401 while the
   stored original grant remains unchanged. Concurrent delivered MCP reads must
   cause one real rotation, then use the grant successfully. Independently count
   auth replay/current credentials; retain process ownership regressions.
2. Lose one actual successful refresh response, retain pending evidence, stop MCP,
   restart the real backend with the same database/keys, reopen MCP inertly and
   explicitly retry. Compare exact request/key/body and installed original grant;
   independent DB evidence must show no duplicate rotation or revoked family.
3. Supplement S1 resource replay with a real service restart during one representative
   uncertain populated-draft operation, preserving IDs/bytes/keys and three final
   revisions/batches. This does not claim every crash/restart cross-product.
4. Hold a real isolated account row lock, queue actual dedicated-session logout,
   then a workflow write. Observe blocked backend authorization in pg_stat_activity;
   release so logout commits first. No domain/replay/batch effects may follow under
   that revoked session; another session of the same account remains usable.
5. With a write blocked at the same real authorization point, disable only its
   fixture account in the owning transaction and release. No domain/replay/batch
   effects; a separate account remains live and local recovery material is retained.
   This is fixture account-disable state, not account-deletion proof/purge coverage.

Use fixed public assertions and independent DB observations, not adapter messages
alone. Reuse S1 fixtures rather than a generalized proxy/fault framework. First
scoped syntax/import/lint/format checks; focused repair runs; final complete active
T16 owning suite plus a fixed small relevant T06/T12/T15 regression selection.
Do not automatically repeat S1's entire446-regression campaign. Retain all failures;
missing/skipped/unknown evidence is not a pass.

## Deliverables, limits and stop conditions

Deliver runnable checks/control overlay, sanitized provenance/results/stable-input/
cleanup evidence, reviewed scenario limits and task/status/handoff updates. Milestones:
restart control qualified; focused real-boundary checks; final owning/regression
acceptance and owned cleanup. Final parent T16 acceptance remains required.

A05 expired-access replay timing, full cursor/filter/numeric/ownership, other
creation/domain/race/crash/lifecycle cases and Android remain open. No complete
T16 matrix row or release gate closes here. Stop affected work for contract drift,
missing safe inputs, unsafe logging, unowned resources, unresolved public behavior
or time limit; continue unrelated authorized work and report precise placeholders.
