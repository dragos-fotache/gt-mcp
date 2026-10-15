# T06-S5 QA source review r2 plus clarification delta — NOT approved

**Disposition:** real public-call tests replace r1 placeholders, but significant
specification/fixture/lifetime errors remain. NO execution/source freeze/relay.
Parent T06 incomplete. This review is QA-private; no implementation-derived oracle.
Read the common S5 work order/adjudication and accepted T04 API.

## Improvements preserved

Real lifecycle/resource/storage/TLS checks, builders-only helper, exact ten-export
oracle, private runtime-location removal and narrow additive S4 namespace repair
are appropriate. This is still authored-source evidence, not behavioral acceptance.
Coordinator review is SOURCE ONLY; no target/provider/fixture/suite run here.
Adjudication-delta unit additions were reviewed after QA readiness notification.

## Required source repairs — contract and fixture bugs

1. **Stale T04 owner reads after generation transition.** T04 binding getter is
   frozen at acquisition; ALL old-capture methods except close reject
   generation_mismatch after a successful advance. Fault tests poll/read the old
   ctx.profile after signOut/replaceGrant and read operations before explicit
   close/open(newBinding). These cannot observe committed target records and will
   fail for a conforming T04 implementation. Use exact returned/acknowledged binding,
   invalidate as required, explicitly close/open under test ownership before reads.
   Delayed-logout ordering may observe the real delegated advance acknowledgement
   at the public ProfileSession capability boundary, then verify durable target
   contents after explicit reopen. No private sync point or production-derived seam.
   Do not weaken T04 stale-owner behavior to fit fixtures. Keep operations compared
   under the reopened owner, not the stale capture.
2. **Live holder contention before ambiguous reopen.** Ambiguous case calls
   facility.open while the old holder still owns the lease. Close the old owner
   before testing persistent commit_ambiguous on explicit reopen; otherwise
   locked_by_other_owner is the correct immediate failure. No competing owner/PID
   guessing/hidden release.
3. **Cancellation boundary conflation.** Already-aborted input rejects BEFORE
   admission without IO/new fence; r2 expects the valid repeat to be interrupted.
   The added clock-abort test aborts during the FIRST/pre-admission check and also
   incorrectly expects an independently signaled repeat to remain fenced; its
   callback keeps aborting the ORIGINAL controller while returning expired time.
   Common adjudication now explicitly distinguishes entry vs admitted cancellation.
   Test post-admission cancellation during owner wait/final clock if claiming the
   admitted facade stays fenced. Pre-admission refusal must not be relabeled as
   durable/synchronous admission. Include meaningful final-clock priority evidence,
   not only the first check. Explicit invalidate itself IS a permanent local fence.
4. **Begun-advance promise/teardown ownership.** The standalone held-advance test
   keeps state/pending only inside try, does not immediately observe the derived
   rejecting promise, and does not await it on failure after releasing the gate.
   It can leak unhandled rejection/race close against the real delayed transition.
   Retain state/promise in teardown scope, observe immediately, release/settle begun
   durability BEFORE closing or cleanup on every failure path; propagate failures.
   Likewise delayed signOut creates an extra untracked .then promise; observe and
   settle every derived promise, not just its original registered by ctx.launch.
5. **Swallowed owned failures.** Handler catch-all converts ANY gate timeout/error
   into a successful204 or generic response, defeating tracked handler failure
   reporting. Suppress only explicit owned teardown cancellation; preserve actual
   timeout/assertion failures. withS5's final allSettled results are discarded and
   settled calls are removed from owned tracking; account honestly for unexpected
   outcomes on failure paths. Expected public rejections are asserted, not leaked;
   no catch-all hiding fixture failures. Keep this local/simple, no new framework.

## Required meaningful coverage/oracle corrections

- Delayed successful logout is NOT offline failure/window-expiry evidence. One
  small isolated delayed/failed cleanup case with short configured budget and
  multiple tokens can prove acknowledged clearing remains successful, no renewed
  per-token budget/new dispatch after window expiry. No global clock patch, new
  public timing seam or generalized timing campaign. Source audit complements
  elapsed-window proof; don't claim current delayed-success case establishes expiry.
- R2 lacks actual in-flight READ and in-flight REFRESH/owned-refresh-commit races
  against trusted lifecycle. Existing standalone S4 invalidate tests do not prove
  S5 owned-auth settlement/latest grant retention before generation advance. Add
  representative public checks for those distinct mandatory integration risks;
  one latest-owned-refresh-commit/replacement check can cover several related
  requirements. No race cross-product or arbitrary case quota.
- Strict duplicate-generation seed currently uses entries equal to CURRENT
  generation, so it never isolates duplicate OLDER entry rejection. Repair the
  existing seed cheaply; retain representative foreign binding case.
- Older S3/S4 refusal must assert state_version_unsupported, not merely any branded
  SessionError. Exact flat facade contract should assert exact own keys, not only
  known presence/selected forbidden strings. These are small existing-oracle fixes.

## Narrow scope and stop

QA SOURCE/static repair OPEN ONLY three new S5 paths and QA S5 report/evidence;
S4 accepted namespace repair already submitted stays HELD/no further change unless
needed within its original narrow grant. Other accepted sources/helpers CLOSED.
Allowed reuse of accepted independent QA fixtures/public T04 diagnostic capability
continues; NEVER production/private ADR/source/review/emitted reads. No target,
fixture/provider/loopback/suite/build/install/config/dependency change or execution.

Report exact spec-derived risks, changed paths and scoped node --check/ESLint/
Prettier results; then HOLD for r3 review. Window checkpoint90/STOP120 remains,
no automatic renewal; if at limit deliver honest partial handoff. Correct coverage
claims in readiness report instead of describing absent tests as implemented.
No live/product writes, personal keyring/state, .pi/settings/trust edits,
staging/commits/release/successor or polling. Failed source gates remain evidence.
