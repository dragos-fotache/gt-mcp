# T06-S5 QA source review r3 — focused repairs still required

**Disposition:** NOT SOURCE-APPROVED; execution/freeze/relay CLOSED. Initial r1/r2
failures preserved. r3 fixes most stale-owner/read/entry-cancellation issues and
adds offline/read/refresh checks, but definite fixture/oracle defects remain.
No production-derived oracle or cross-role source input.

Coordinator repeated pinned Node24.21.0/npm11.19.0 node --check x4, scoped ESLint
and Prettier --check on three S5 sources + narrow S4 namespace repair: ALL exit0.
All inventoried accepted tests match S4-f3 hashes except the granted namespace
file; reversing ONLY its exact additive names/description/assertions reconstructs
the exact frozen original SHA256. No extra accepted edits. ZERO compiled target,
loopback/provider/fixture/suite execution. Static green is not behavior acceptance.

## Required smallest source repairs

1. **Premature permanent invalidate.** The double-replacement case invalidates
   reopened.state in its first inspection finally, then calls replaceGrant on
   that SAME permanently invalidated facade. It must reject, not successfully
   advance. Keep a live correctly-owned facade for the second explicit action
   (or deliberately reopen a new one); track the actual current facade in
   reopenOnBinding before later handoff. It currently updates ctx.profile/binding
   but leaves ctx.state pointing to the original stale facade.
2. **Budget oracle permits renewal.** With TWO known tokens, totalDeadline200ms
   and first response delayed1500ms, bodies.length<=2 and per-token<=1 also pass
   the broken per-token-renewal behavior (two separate200ms attempts). Assert no
   SECOND token dispatch after the first attempt consumes the original window;
   allow honest scheduling tolerance/no unbounded timing claim. No global clock
   patch/seam/campaign; tighten this EXISTING public-loopback oracle rather than
   claiming exact elapsed proof from at-most-once identity.
3. **Clearing-before-logout oracle assumes the property it must prove.** Observing
   a logout request while signOut stays pending plus a final cleared read would
   ALSO pass an implementation dispatching logout BEFORE local advance. The
   comment assumes dispatch is downstream of acknowledgment. Observe a REAL
   delegated public advanceSessionGeneration acknowledgment while call/response
   are held and assert it precedes logout receipt; verify durable contents after
   explicit reopen. Do not infer order from the intended contract/code comment.
   A tiny trusted test-only capability observer is permitted, no private seam.
4. **Begun-advance failure handling still unsafe.** pendingOp is not immediately
   observed before waiting for advance entry. Teardown throws its rejection
   BEFORE server/profile/facility cleanup, potentially leaking owned resources.
   Attach observation immediately; release and await begun work, accumulate
   outcome failures, THEN attempt every cleanup and fold errors. Prefer reusing
   the already-local withS5 ownership helper over another standalone cleanup
   structure if that simplifies it; no generalized framework.
5. **Four concurrently launched rejecting old openers.** Unit code starts all
   four promises then sequentially attaches captureRejection; an assertion failure
   leaves later attempts unobserved. Use sequential deferred invocations or attach
   rejection observation to every started promise immediately. Exact safe code
   and no erasure assertions remain required; don't hide them.
6. **Owned-refresh COMMIT settlement integration remains unverified.** New
   refresh case holds NETWORK then signOut aborts it; it does not prove lifecycle
   waits for an already-begun auth install commit and preserves LATEST acknowledged
   grant/pending evidence before replacement. Add ONE representative real-delegated
   ProfileSession.commit-boundary hold plus replacement: no advance before owned
   install settles; retained entry matches latest acknowledged state; stale caller
   success suppressed; target survives explicit reopen. This is a distinct core
   S5 risk, not a race cross-product. No duplication of accepted codec suites or
   exhaustive campaigns; independent public boundary/provenance only.

withS5 teardown still only records strays outstanding at the final allSettled;
ensure unexpectedly rejected launched work cannot silently vanish from outcome
accounting. Expected errors are explicitly observed/asserted. Scope repairs to
these concrete lifetime bugs; avoid adding a generalized harness or broad meta-tests.

## Grant and stop

OPEN SOURCE/static repairs ONLY three S5 paths and QA S5 evidence/report. Accepted
S4 namespace repair now reviewed correct and HELD; all other accepted sources/
helpers remain CLOSED. No build/install/compiled-target/provider/loopback/fixture/
suite execution or production/private ADR/source/review/emitted reads. Reread
common lifecycle adjudication and exact T04/T05 public boundaries as necessary.
Report r4 readiness/scoped results and HOLD. Original checkpoint90/STOP120 applies,
no automatic renewal. At limit send honest partial handoff instead of continuing.
No product/live writes/private state/keyring, .pi/settings/trust edits,
staging/commits/release/successor or polling.
