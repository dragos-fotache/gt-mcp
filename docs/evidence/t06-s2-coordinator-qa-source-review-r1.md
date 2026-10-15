# T06-S2 coordinator QA source review r1

**Disposition: NOT SOURCE-APPROVED; bounded QA source repair required.**
Initial [QA readiness report](t06-s2-qa-source-ready.md) retained. No compiled-target,
suite, provider or HTTP execution; no frozen relay. Static readiness is not runtime
acceptance. Current S2 production source was not read for this QA adjudication.

Reviewed the three s2 test files completely, reused QA T06/T05 helpers, the common
[S2 work order](../tasks/t06-s2-work-order.md), and accepted public T04 diagnostic/
commit and T05 response/error contracts. All findings derive from specifications
and QA source, not implementation. QA retains test/fixture ownership; Coordinator
has not edited those sources or QA evidence.

## Questions adjudicated

1. **occurrence2 is a valid second-commit target** when armed after fixture setup:
   S2 prepare is the first matching semantic event; success is the second. But
   commit.anchor.prepared fires AFTER PREPARED and faults with commit_ambiguous,
   permanently fencing the T04 owner. Public readVaultBytes cannot then inspect
   retained plaintext, and reopening PREPARED must also fail closed. The existing
   readable-pending assertions contradict T04. Minimal repair: use
   commit.before.prepare/throw/occurrence2, expect io_failure, and inspect the still-
   usable T04 owner while asserting the AUTH facade stays fenced. This targets
   failed success installation without weakening retention. If retaining the
   ambiguous-phase case instead, use proper unreadable/fenced-owner assertions
   and allowed synthetic disk observations, not decryption/recovery bypass or
   readable-state claims. No extra fault campaign is requested.
2. **Loose error-family-only assertions are not accepted for lost/invalid JSON.**
   In a valid unaborted attempt T05 defines lost connection as TransportError
   network_error, invalid-JSON HTTP200 as TransportError internal_error; dispatched
   true, attempts1, outcomeUnknown true. S2 propagates these safe failures. Valid
   JSON with invalid grant fields is instead SessionError invalid_grant. Cancellation
   may be observed by SessionError or TransportError but MUST have code
   operation_interrupted. The common work order now states this explicitly; both
   roles receive only that public clarification.

## Required scoped source repairs

### R1 — Establish the actual bound owner before grant-state tests

The unit helper provisions a pre-auth T04 owner (account null/generation0), then
writes plaintext claiming ACCOUNT_A/generation1 using commit. A vault write does
not change T04's binding. Valid-open/pending/expiry tests will reject mismatched
state; state_corrupt negatives can pass for the wrong reason. Establish an actual
isolated account binding through T04 bindAccount or accepted synthetic S1 install,
close/reopen the returned binding, then seed the intended state. Keep genuinely
pre-auth/no-grant cases separate. Ensure the helper's cleanup owns the current
reopened handle. Unknown-version-before-fields should use a deliberately unsupported
version with incompatible/missing version-specific fields, not an accidental
binding mismatch. No weaker binding assertions.

### R2 — Make the malformed-key fixture actually malformed

PENDING_KEY contains only numeric hex digits, so toUpperCase changes NOTHING.
Use a visibly synthetic alphabetic-hex uppercase UUID or another deliberate
noncanonical value and assert fixture inequality. The valid control must otherwise
satisfy record/binding requirements; isolate this risk from R1.

### R3 — Honor the selected T04 fault's postconditions

Repair the success-commit case as adjudicated above. Do not read/reopen a
commit_ambiguous owner as if it were a healthy pending record. Preserve the
no-more-dispatch/permanent-auth-fence assertions. No T04 code changes.

### R4 — Own the reopened profile in teardown

withRotationHarness captures an outer profile for teardown but passes h.profile
by value. The lost-response case assigns h.profile to a reopened owner; teardown
still closes the already-closed original, so facility.cleanup encounters a live
holder. Track/update the current owner explicitly and close it before cleanup on
ALL paths. Likewise track the reopened auth facade. No cleanup-error masking.

### R5 — Distinguish durability-before-dispatch from durability-after-dispatch

Reading pending AFTER the request arrives and holding only the response does not
prove preparation completed BEFORE sending: an incorrect dispatch-then-commit
sequence can pass. Add a small deterministic public-boundary ordering observation,
for example a pass-through real T04 commit capability whose returned completion
is held, with bounded server no-dispatch observation before release. Capture
settled pending before allowing dispatch, then compare received bytes/key to that
snapshot. QA chooses the minimal fixture; no production-private synchronization,
new production test seam or generalized interception framework.

### R6 — Pin meaningful failure/cancellation oracles

Apply Q2 to lost/malformed responses and cancellation. The in-flight invalidate
case must not require SessionError exclusively when T05 can legitimately observe
operation_interrupted; neither path may pass on unrelated codes. Keep exact
pending/predecessor/repeat-block assertions. This is stronger independent mapping,
not an implementation-based oracle.

### R7 — Separate follower-local abort from leader-shared failure

Current case aborts its sole follower, then aborts the leader; no nonaborted
follower observes leader failure and no leader success demonstrates follower
isolation. Reuse the existing gated-success/concurrency cases to show follower
abort while leader/another valid follower succeed with one request, and leader
abort observed by a still-live follower with operation_interrupted. Do not count
an already-aborted follower as proof of shared failure. No stress permutations.

### R8 — Cover irreversible final-commit completion and returned refresh expiry

Current invalidation occurs during network flight, not an owned final storage
commit. Add one targeted public-boundary gate where real success commit has begun/
completed but its result is unresolved: cancellation/invalidation must settle
owned work, suppress success and preserve the installed grant rather than roll
back. Also require a valid returned grant with refresh deadline expired/equal at
commit to retain predecessor/pending without installation. The S1 initial-install
checks do not establish these new S2 rotation boundaries. Reuse simple capability/
clock gates, no crash-kill or exhaustive campaign. A redundant expired-predecessor
case need not be duplicated to prove the new returned-grant risk.

## Evidence and proportionality corrections

Declared cases currently total19unit +3durability +8concurrency =30, not16unit.
Correct the report/count without inventing results. A read after dispatch does not
yet establish dispatch ordering; corrected helper claims must match actual owner
cleanup. Replace the persisted disposable toolchain location with T01_NODE_HOME
and checked versions; role prompts supply that location privately. Retain initial
readiness/failures in a follow-up evidence file rather than rewriting history into
a pass. Existing S1/tests/helpers remain unchanged.

## Current gate

QA may repair ONLY the three new s2 files, small s2-prefixed helper additions if
needed, and QA follow-up evidence. Run EARLY scoped syntax/lint/format/source-only
import resolution; then report revised readiness and HOLD. Target/provider/HTTP/
Vitest/build/install remain CLOSED until named reviewed frozen relay. Both roles
retain original90min checkpoint/120min safe stop; no automatic window renewal.
If insufficient time remains, report partial/blocked and stop, not hurried approval.
Coordinator production readiness/review and independent QA re-review remain
prerequisites to freeze. S2/T06 remain incomplete; S3–S5 closed/unassigned.
No actual writes/live services/.pi/settings edits/staging/commits/release.
