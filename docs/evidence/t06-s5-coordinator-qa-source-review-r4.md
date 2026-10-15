# T06-S5 QA source review r4 — two oracle fixes and gate cleanup

**Disposition:** NOT SOURCE-APPROVED; no execution/relay. Most r3 findings now
resolved: current-facade tracking, live second replacement, deferred-sequential
older openers, local held-advance teardown reuse and latest-owned-install case
are materially improved. All accepted sources/helpers remain held unchanged except
the already-approved exact S4 namespace addition. No production-derived oracle.

## Remaining narrow source fixes

1. **Renewal oracle still accepts the bug.** First server response is delayed
   1500ms, but T05/client deadline is200ms: the CLIENT can cancel and settle the
   first attempt around200ms, not wait1500ms. A broken renewed200ms second token
   attempt can therefore arrive around200ms after the first, well INSIDE the
   allowed1000ms tolerance. Current <=2 token/body assertions plus arrival bound
   cannot reject renewal. When first held request consumes the original shared
   window, assert NO second token dispatch (zero/one request if honest admission/
   scheduling prevented the first). Keep acknowledgment/cleared target checks.
   No precise stopwatch assertion/global clock patch/framework is necessary.
   Correct report/comment's incorrect1500ms-client-consumption explanation.
2. **Clearing-before-wire ordering needs actual event observation, not timestamp
   equality.** The new REAL delegated advance observer is appropriate, but
   Date.now ack<=receipt permits a reversed order in the SAME millisecond.
   At FIRST logout receipt, directly observe that delegated advance acknowledgment
   already occurred; assert that captured event-state, not a later value/time
   comparison. Preserve public capability delegation and final explicit-reopen
   vault/operation proof. No new private timing seam or clock patch.
3. **Register owned-install gate release on EVERY failure path.** New latest-
   install case creates its gate, arms/awaits/starts dependent work and only then
   releases it on the success path. Register its release in existing owned teardown
   immediately after creation (or equivalent try/finally); a body failure must
   never leave a begun commit unresolved while withS5 waits/cleans holders.
   Keep no-early-advance/latest-grant/pending-null/stale-result assertions; no
   new case or generalized lifetime framework needed.

## Grant and stopping point

Only test/fault/t06/s5-lifecycle-races.test.mjs, optional tiny S5 helper observer
adjustment and QA-owned S5 report/evidence SOURCE/static repair OPEN. Unit sources
and S4 namespace now HELD; other accepted sources/helpers CLOSED. Do not add a
new campaign/case/harness or read production sources/private review/ADR/emitted JS.
No runtime/provider/TLS/fixture/suite/build/install/config/dependency execution.
Report exact three small repairs/static results and HOLD for final source gate.
Existing checkpoint90/STOP120, no automatic renewal; at limit partial handoff.
No product/live writes/keyring/.pi/settings/trust/staging/commits/release/successor.
