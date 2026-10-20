# T16-S3 — Actual read, paging, visibility and numeric boundaries

**Authorization:** user: “go ahead with the next slice”, 2026-10-16. Primary
Codex agent owns this window. Start16:02 UTC; checkpoint17:32 UTC; stop18:02 UTC
with safe owned teardown. S1/S2 stay closed; parent T16 remains incomplete.

**Disposition:** complete on 2026-10-16; S1–S3 windows closed. Final 147/147 runtime
checks, 43/43 document checks, production/scoped checks and owned cleanup PASS. [Review](../evidence/t16-s3-review.md)
and [handoff](../handoffs/t16-s3.md) record the narrow catalogue decoder repair,
retained failures and remaining gates. Parent T16 incomplete; later slices unassigned.

## Outcome and settled contract

Extend actual isolated backend/MCP read evidence for M04–M09: boolean exercise
filters, account visibility, explicit1/200 paging and token context, same-account
refresh continuity, live membership changes, authentic fixed-expiry rejection and
lossless Int64 projections. Current shared MCP draft0.2 tools/authentication/
acceptance scenarios and backend v1/OpenAPI1.0.0 service-protocol/domain/schema/
authentication are normative. [T16](t16-backend-interoperability.md), accepted
[S2 handoff](../handoffs/t16-s2.md) and
[proportional testing](../decisions/proportional-testing-policy.md) also apply.

OR within muscle/equipment categories, AND between them; same-account custom and
bundled records visible, foreign/missing private IDs return not_found. Own drafts
are directly readable but absent from saved routine lists; workout status is only
active/finished. MCP default20; explicit limits1/200; complete pages, opaque token
forwarding, no exhaustive automatic traversal. Context binds account/endpoint/
normalized filters/limit and fixed15-minute first-page expiry, surviving same-account
refresh but never silently restarting on invalid/expired context. Live lists may
change; no frozen-list/bootstrap promise. Revisions project as exact decimal strings
through signed Int64 maximum; catalogue null/absent remains null/absent.

## Scope, environment and safety

Edit test/backend-interoperability/ helpers, one bounded owning read test file,
runner/restart control and T16 task/evidence/handoff/current-status entries. If a
concrete MCP defect needs repair, record narrowed production scope and focused
regression before editing. No dependencies/compiler relaxation/shared-contract edits.
Original backend/Android checkouts, .pi and personal/live resources remain untouched.
No staging/commits, deployment, Google/browser, Android/phone access, successor/release.

Use pinned disposable T01_NODE_HOME/PATH (Node24.21.0/npm11.19.0), Java27 and the
backend Maven lock. Reuse isolated Docker/PostgreSQL16/private provider/ext4/TLS/SDK
and S1's exact historical prose-only pinned build reconstruction. Current contracts
remain oracle; original checksum gate and runtime catalogue/schema/API unchanged.
No build/install overlaps tests; scoped static/import checks precede execution.

For token expiry, copy only the backend-owned test-classpath
auth/TestChildAuthClockConfiguration.java into the disposable test artifact. Record
its source/hash and overlaid artifact identity explicitly. It supplies an opt-in
fixed Clock through the existing auth.qa.child-clock property, covering the shared
service clock; it is never included in a deliverable production artifact. Extend
the existing private Unix restart control to select a validated ISO instant for
this owned Java child, then restore system-clock mode. No product endpoint, lifetime
change, signature forgery, credential rewrite or fabricated backend outcome.

Domain fixture creation/edits/deletion use actual semantic HTTP. Numeric setup may
raise only isolated fixture root revisions through guarded SQL before reads; that
is explicit boundary provisioning, not domain-write/revision/sync correctness proof.
Credentials/bodies/IDs stay private, never argv/logs/repo/evidence. Clean only owned
children/container/socket/config/private roots; preserve all failures honestly.

## Proportional checks and deliverables

### Concrete repair scope found during qualification

Actual limit200 HTTP succeeds with200 records (~252KB), but the MCP codec rejects
the page. Current canonical catalogue contains nine exercises with the same muscle
UUID in distinct roles. Normative shared catalogue mapping keys relationships by
(exercise_id,muscle_group_id,type) and explicitly exempts bundled data from custom
restrictions. src/domain/projected.ts instead rejects repeated muscle IDs regardless
of role. This is an implementation defect, not a contract change.

Permit a narrow production repair in src/domain/projected.ts: duplicate muscle
relationship identity includes role; exact same-role duplicates still reject and
existing custom primary/secondary overlap/tertiary/primary-count safeguards stay.
Add minimal specification-derived bundled-positive/same-role-negative/custom-
overlap regression checks under the T16 owning directory; reproduce before repair,
then rebuild and run full active T16 plus relevant T03 codec/read regressions.
No output-schema, shared contract, backend source/data or compiler/dependency change.

1. Small owned custom fixtures with known catalogue muscle/equipment references:
   mixed-case search, OR/AND semantics and normalized reordered/deduplicated context;
   explicit1/200 results, same-account refresh with original continuation, and
   representative changed filter/limit/endpoint/foreign-account failures.
2. Own/foreign/missing exercise/routine/workout reads, saved-only routine list and
   workout status/order/page envelopes using small actual-HTTP fixtures.
3. Actual HTTP numeric fixtures above2^53 and signed Int64 max; literal raw numeric
   wire verification and exact delivered MCP get/list strings, preserving catalogue
   absence. No already-rounded JSON number used as the expected value.
4. Real live insert/update/delete after a page. Separately issue/continue authentic
   tokens, restart with the existing fixed Clock at+10 then+16 minutes to prove
   expiry is not sliding; real refresh may occur, page_expired must remain explicit,
   followed only by an explicit new traversal. Restore system-clock mode afterward.

Use literal public expected outcomes and simple independent fixture identities;
reuse S1/S2 fixtures, no generalized campaign. First syntax/Python compile/import/
ESLint/format checks; focused repair runs; final complete active T16 owning suite
plus a fixed small relevant T03/T08 read/codec/paging regression selection. Do not
automatically repeat prior full regression campaigns. No skipped/missing cases as passes.

Deliver runnable narrow checks, sanitized provenance/stable-target/results/cleanup,
reviewed scenario limits and task/status/handoff updates. Milestones: controlled
clock qualified; core actual read checks; final owning/regression acceptance and
cleanup. Final parent integrated acceptance is still required. A05 expired-access
replay, remaining creation/domain/race/crash/lifecycle, Android and release gates
remain open. Stop affected work for unsafe/unowned inputs, contract drift, missing
public decisions, unsafe logging or time limit; continue unrelated authorized work
and report precise blockers with placeholders. No automatic successor.
