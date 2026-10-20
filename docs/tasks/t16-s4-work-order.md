# T16-S4 — Expired grant recovery and real creation decisions

**Authorization:** user, 2026-10-16: “ok settle the remaining work slices and start
work at the first one”. Primary Codex agent owns S4 only. Start16:36 UTC;
checkpoint18:06 UTC; stop18:36 UTC with owned teardown. S1–S3 stay closed;
**Disposition:** complete; final42/42,608 stable hashes and owned cleanup PASS.
[Review](../evidence/t16-s4-review.md), [handoff](../handoffs/t16-s4.md).
The user separately authorized S5 during S4 closure; S6/S7 remain planned/unassigned.
Parent T16 incomplete.

## Outcome, authority and settled behavior

Close the bounded actual-service auth/creation gaps in
[remaining slices](../decisions/t16-remaining-slices.md). Current shared MCP
draft0.2 A05/C04–C08/R07/R08 and backend v1 authentication, resource replay,
domain and transaction contracts are normative, along with [T16](t16-backend-interoperability.md)
and [proportional testing](../decisions/proportional-testing-policy.md).

Expired access alone does not invalidate exact auth replay while the returned
refresh remains current. Persist the original grant/deadlines first; only then
prepare a distinct serialized rotation using that recovered refresh. Do not extend
original expiry or retry a consumed predecessor with a new key.

Invisible references stop before creation; deletion after precheck is adjudicated
by the real backend. A permanent populate rejection leaves at most its committed
draft, stops save and becomes the original durable terminal outcome under live
authorization. Same normalized operation shares one stream; changed intent returns
operation_id_reused; a new explicit operation creates a distinct root. An actual
root collision must fail closed without regenerated IDs. Config-file writesEnabled
is true only inside the explicitly isolated fixtures.

## Edit and execution grant

Edit test/backend-interoperability/ helpers, runner and one narrow S4 owning test
file; T16 plan/work-order/evidence/handoff/current-status documents. Reuse the
private Unix restart supervisor and existing backend-owned test Clock copied only
into the disposable artifact. For A05, use the existing production auth facade's
trusted clock option and real private profile, since the stdio wall clock must not
be changed. Mark this case as facade/real-service evidence, not delivered-stdio
elapsed-expiry evidence. No fabricated tokens, rewritten deadlines or server bypass.

Allow small per-request test gates in the existing loopback relay to perform actual
fixture semantic HTTP before forwarding unchanged MCP bytes; never synthesize a
successful backend outcome. Observe a recovered private profile through its public
storage capability before the second rotation. Credentials/bodies/IDs remain private
and are never printed, put in argv or copied into evidence.

Use discovered retained disposable T01_NODE_HOME (Node24.21.0/npm11.19.0), Java27,
backend Maven lock, guarded PostgreSQL16 and private Secret Service/ext4/TLS. Original
backend/Android inputs are read-only; preserve S1 historical prose-only build-pin
reconstruction separately from current normative contracts. Permitted commands:
scoped Node/Python syntax/import/lint/format, production typecheck/lint/format/build,
and guarded isolated runners. Never build/install during execution. No dependency,
manifest, compiler, shared-contract or .pi edits; no personal/live service, Android
journey, staging/commits, deployment or successor execution. A concrete MCP defect
requires recorded narrow repair scope and focused reproduction before product edits.

## Proportional verification and acceptance

1. Lose a genuine refresh result, close MCP, advance the disposable service Clock
   past its authentic access deadline while refresh is live. Public lifecycle/auth
   facade with the same trusted epoch must replay exact predecessor/key/body/result,
   install the recovered grant durably and then rotate once with its refresh/new key.
   Independently check two total rotations, no family revocation and unchanged
   original deadlines. Observe the real profile at the fresh dispatch boundary.
2. Foreign/invisible precheck rejects with zero mutations. Separately delete an owned
   exercise through actual HTTP between precheck/draft and populate; check actual
   invalid_reference, retained empty draft and no save. Repeat after MCP reopen with
   live auth and compare unchanged independent DB/replay/batch effects.
3. Concurrent same-intent delivered calls share one root/three steps and receipt;
   a conflicting intent cannot replace it. Omitted versus explicit defaults repeat
   identically; changed intent conflicts; distinct operationId creates another root.
4. Before forwarding the actual draft POST, independently create that exact root
   via semantic HTTP. The MCP POST must receive real id_collision and repeat its
   original terminal failure without allocating another root/key or dispatching save.

Each check catches a separate contract risk. Reuse S1–S3 simple fixtures and DB
oracles; accepted local validation/ownership permutations are not reimplemented.
Early static/import checks precede execution. Focused S4 qualification precedes
final full active T16 suite plus a fixed small relevant T06 recovery and T11/T15
identity/rejection selection. No hidden exclusions, skipped checks or mocked pass.

Deliver checked sources, sanitized provenance/results/stable inventory/cleanup,
review, handoff and status. Milestones: retained environment qualified; focused
S4 boundary checks; final owning/regression acceptance and cleanup. Actual save
rejection, crash/cancellation/retry permutations, other-client races, lifecycle,
Android and integrated parent acceptance are S5–S7. Stop affected work for contract
drift, unsafe inputs/logging, missing external facility or time limit; preserve
failures and report exact limits. No automatic successor or release.
