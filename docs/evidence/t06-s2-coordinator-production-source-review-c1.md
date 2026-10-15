# T06-S2 coordinator production re-review — c1

**Disposition: c0 repairs verified in source; one narrow C1 repair still required.**
No frozen inventory, target execution or acceptance. Reviewed revised refresh.ts
and ADR8.6 against the common public contract. No QA source/oracle is Developer
input. Prior c0 findings and diagnostic deviation remain recorded.

## Reviewed candidate

refresh.ts SHA25603be0222d3eeb333d0c129970c30e7f6d49aedbe791c0988bd0d76174cb09bf7;
ADR SHA2562bff84112cb682da2bf3b59ddf1c5144d35f7849af2a9b28a34211d5d7ee3eb7.
Vault/index/compatibility hashes match c0 exactly. Developer reports four green
production checks, no install/runtime diagnostics/tests in this repair; this review
uses source inspection, not a new independent runtime claim.

- C0-1: unchanged T05 factory now captures/validates original config synchronously
  before first await. No lossy detached assignment; special keys stay visible;
  nested budgets/CA copy is delegated to accepted public T05 behavior.
- C0-2: both actual commit boundaries now check exact expiry after awaited owner
  validation AND serialization. Earlier checks are only fast paths; no rollback.
- C0-3: leader uses shared outcome without follower early-abort listener, so owned
  storage commits are awaited before its public promise can settle. Follower-local
  cancellation remains separate; no new public wait/shutdown seam.

## C1-1 — Final cancellation/fence check must follow the clock callback

At both prepare and final commit, abort/fence checks now occur BEFORE nowMs(refs).
The trusted SessionClock method is a synchronous caller capability. If it aborts
that leader signal or calls invalidate while returning a valid live instant, the
code proceeds directly to commitVaultBytes without another abort/fence check.
Cancellation before commit must prevent it; a callback does not make cancellation
later than the storage invocation.

Add final signal/local-fence checks after the clock/expiry validation and directly
before invoking each commit, with no further caller callback/await in between.
Retain exact expiry checks, original storage failure handling, leader completion
and installed/pending preservation. This is a small ordering repair, not a callback
sandbox guarantee, generalized fault campaign or S1 behavior change.
Common S2 work order now explicitly states the post-clock cancellation check.

## Current grants

Developer may make ONLY C1-1 ordering repair in owned auth/ADR scope, then permitted
production checks and readiness/HOLD. No diagnostics/tests/install/config/dependency
changes, QA reads, time-window renewal or successor. If original window exhausted,
report partial/blocked and stop safely pending explicit continuation.
QA r2 source repairs are independently pending, no private details relayed.
Both gates must pass before reviewed frozen relay. S2/T06 remain incomplete,
S3–S5 unassigned; no actual writes/live state/.pi/staging/commits/release.
