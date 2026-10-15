# T06-S5 common lifecycle boundary clarification

**Authority:** Coordinator resolves two existing S5/T05 requirements for BOTH roles.
No new public API/error/vault/dependency/seam or shared-contract change. Source-only
work remains bounded; no compiled execution grant follows from this clarification.

## One best-effort logout network window

S5 signOut's ONE shared totalDeadlineMs window is an operational elapsed-time
budget, as in accepted T05 monotonic transport budgets. It is not SessionClock/
Date.now credential time. Wall-clock adjustments must not extend/replenish that
window between distinct token attempts. Once the original window expires, no new
logout dispatch admits; cancel/settle the owned current network attempt safely.
No per-token reset, detached cleanup or offline queue. Deadline admission must
also hold at the final wire handoff after body preparation/async hook work, not
only at the start of a token iteration. An owned timer may be delivered late;
its callback alone is not proof that an elapsed window is still live. Reuse T05
pre-dispatch/synchronous admission hooks privately; no new public seam.
Local clearing still
precedes network and acknowledged sign-out remains successful irrespective of
cleanup failure. Private timing implementation is Developer discretion; no public
clock/test seam or comprehensive OS-scheduling guarantee is added.

## Replacement clock callback interruption priority

At EACH replaceGrant deadline/clock boundary (before admission and after owner
settlement/read before advance), a clock callback may synchronously abort the
caller or explicitly invalidate the facade. Recheck these interruption conditions
AFTER that callback before acting on the returned deadline/invalid-clock result.
Such interruption => operation_interrupted, no subsequent advance admission.
This includes a callback that also returns an expired instant, invalid value or
throws. Do not report reauthentication_required/invalid_arguments in place of
that actual cancellation. Without actual interruption, expiry/invalid-clock keep
the existing safe errors. Transition's own admitted fence is not invalidate.

This clarifies the existing work-order statement that caller abort/explicit
invalidate wins after clock callback. It does not define arbitrary precedence
among unrelated simultaneous malformed arguments; valid foreign/malformed input
still cannot fence another caller. Begun advances remain safely awaited and late
success suppressed without rollback. Standalone S1–S4 contracts stay unchanged.

## Entry cancellation versus admitted cancellation

An already-aborted signal rejects replaceGrant BEFORE lifecycle admission, with
no IO/new fence against an otherwise valid facade. It is not a begun transition.
Cancellation AFTER a valid action has synchronously admitted and fenced, but
before advance invocation, prevents the advance and leaves that facade fenced.
Do not conflate those boundaries. This follows existing actionable-argument
validation-before-admission; no new cancellation capability or error is added.

## Verification proportion

A targeted public-call callback-cancellation assertion is valuable; no new global
clock interception or timing campaign is required. Bounded multi-token delayed
logout behavior and source audit can support the elapsed-window claim without a
new public timing seam/framework. Neither static checks nor fixture timing alone
constitute real backend revocation, power-loss or release evidence.
