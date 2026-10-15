# T06-S5 production source review c1 — final logout admission repair

**Disposition:** c0 findings C0-1/C0-2 repaired at source level; one remaining
logout wire-admission boundary prevents source approval. NO freeze/QA execution/
behavioral acceptance. Developer remains bounded source/static/build only.

## Reviewed and independently checked

Reviewed monotonic whole-window timer/cleanup, both replacement clock calls/helper,
entry-vs-admitted cancellation, optional vault comment relocation, ADR11.6 and
bounded compatibility note. Coordinator repeated pinned disposable Node24.21.0/
npm11.19.0 four production commands sequentially: typecheck/lint:production/
format:check:production/build ALL exit0/PASS. Accepted inventoried src outside
additive entry/vault matches frozen S4-f3 hashes; removing new S5 codec block
reconstructs exact original vault SHA256 (old functions/comment bytes restored).
No QA reads cross to Developer; no target/runtime/import probe/fixture/suite ran.

C0-1 now uses performance.now origin plus single shared window timer with owned
current-attempt cancellation/settlement and per-token elapsed recheck. C0-2 uses
post-callback interruption priority for expired/invalid/throw at BOTH lifecycle
clock boundaries. Pre-aborted/admission callback-aborted caller introduces no new
lifecycle fence; explicit invalidate remains permanent; admitted cancellation
leaves fence and prevents advance; begun transition safely settles unchanged.
Those source repairs are accepted, not independent behavioral passes.

## Remaining C1-1 — shared budget at actual logout handoff

The per-token shared elapsed check currently occurs BEFORE serializing the token
body and BEFORE T05's asynchronous hook work. Cleanup hooks check signal/route but
isCurrent always returns true and never consults the original shared monotonic
deadline. The one timer cannot run during synchronous body preparation; its event
may be delayed. T05 begins its own invocation budget AFTER supplied body preparation,
so that fresh per-call budget cannot substitute for the original S5 shared window.

Consequently a request can still pass cleanup authorization after the original
shared window has elapsed but before its timer event is delivered. Existing common
contract says no NEW dispatch after original window expiry. Recheck shared cleanup
admission at T05 pre-dispatch and final synchronous wire handoff (with owned
sign-out authorization/interruption) after preparation/awaits. Expired/revoked
cleanup is rejected without wire attempt and without failing acknowledged local
clearing. Retain one timer/deadline, private fixed-route-only hooks, no public
clock/sender seam, new dependency or per-token budget reset. Developer chooses
private factoring. Common lifecycle clarification now states this final boundary
explicitly for BOTH roles; no unrelated API/cancellation/state change.

## Bounded repair grant

OPEN src/auth/lifecycle.ts and owned S5 ADR/compatibility notes ONLY for C1-1 plus
four production checks/scoped owned lint/format. All other sources/config/manifest/
lock/dependencies/QA reads/target execution CLOSED. Report c2 static/build readiness
then HOLD for review/freeze. Existing checkpoint90/STOP120, no automatic renewal;
if limit reached hand off partial rather than extending. No live/product writes,
private state/keyring, .pi/settings/trust edits, staging/commits/release/successor.
