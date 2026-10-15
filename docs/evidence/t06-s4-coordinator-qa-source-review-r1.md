# T06-S4 independent QA source review r1 — repairs required

**Disposition: NOT SOURCE-APPROVED. No frozen relay or execution grant.**
30 authored cases are unexecuted; no behavioral failure/pass claimed. QA has a
bounded source-only repair grant on the same four NEW s4 files and new S4 QA evidence.
Accepted helpers/tests stay unchanged. Developer production grant continues
independently; no QA-private findings/test internals are Developer input.

Reviewed work order, QA readiness/checklist, all four new S4 sources and reused QA
helper contracts. Oracles are evaluated against the common public specification,
not production behavior. No production inspection or target execution for this gate.

## Independently repeated static checks

Checked disposable pin Node24.21.0/npm11.19.0. `node --check` on four new files,
scoped ESLint and scoped Prettier --check: ALL PASS exit0. Static checks do not
establish fixture correctness, deterministic concurrency or contract coverage.
S3 inventory comparison limited to test/ rows:63 unchanged accepted QA files PASS.
No assertion that all production bytes are frozen during ongoing implementation.

Reviewed new-source SHA256:

- test/unit/t06/s4-helpers.mjs:
  e36c05d97bafcf082bc86c92b763f279cf4ee2c2d2b9c4ca69d62c9a24f43e78
- test/unit/t06/s4-auth-session-validation.test.mjs:
  ceaf96b2413ab20af1c26c300ee7a9105ed6cb8bd4f2ecd453892308ccd4a017
- test/fault/t06/s4-refresh-retry.test.mjs:
  d40e959e67b6ecc84b82ff16059dc656e3d314a197f7d3ecab9204a343eb7bf6
- test/fault/t06/s4-concurrency-fences.test.mjs:
  a09f1a3ab01ae15a83297fde80f02a8564010e63d690fc2897c440db233914cd

## Required source repairs

### Q1 — Owned cleanup and asynchronous settlement (safety gate)

Unit withBoundOwner and other unit postludes suppress profile.close failures;
fault withS4/withS4Concurrent suppress close AND invalidate exceptions. Their
comments say failures propagate, but empty catches prevent teardownAll observing
them. Unit withBoundOwner also loses secondary teardown failure behind body error,
despite the existing NEW S4 combiner. Acquisition before protected try blocks can
leak an already-started server/facility when provisioning/setup fails.

Protect acquired resources from their first successful acquisition, attempt all
owned cleanup, and propagate cleanup/secondary body failures honestly. Do not
silently catch unexpected close/invalidate errors. Track resource/auth promises and
async responders immediately, attach rejection handling immediately, release ALL
response/commit gates on ALL success/failure paths, and await owned settlement before
closing profile/facility/server. Failure-path response waits currently can outlive
the test and handlerError is inspected before all responders necessarily settle.
Use small existing patterns, not a generalized new harness. No swallowed owned
settlement failures/unhandled rejections or forced durability-critical termination.

### Q2 — Fixed-route success fixtures and exact byte oracle

Refresh-retry preflight calls listRoutines and pending-replay calls listWorkouts,
but their success responders return searchPageWire with exercise items. Concurrency
calls listRoutines while returning the same catalogue/exercise page. These are not
the response schemas of those fixed routes. Reuse appropriate accepted routine/
workout list wire fixtures, or choose a matching read route; no relaxed decoder.

Mutation oracle compares Buffer UTF-8 text to Uint8Array.toString("utf8"):
Uint8Array.toString is numeric comma-separated data, not UTF-8. Compare actual bytes
to an independent entry snapshot via Buffer conversion or equivalent byte equality.
Assert BOTH resource legs' method/path/body/key match the originally captured
request, not just each other. Pending replay must assert ORIGINAL auth UUID as well
as original body/token; a fresh key with unchanged body must fail that oracle.

### Q3 — Deterministic concurrent/delayed401 ordering

The purported delayed-older401 case starts its second resource call AFTER observing
the first401, while its refresh responder waits for two resource401s. A conforming
S4 caller arriving during auth waits before bearer dispatch, so that gate can
self-deadlock. Moreover, returning both401s before refresh installation does not
prove a delayed older401 after a NEW durable revision.

Stage both old-bearer resource legs before releasing the first401; force the chosen
leader's401 first, observe its auth cycle, then release the other old response.
For the delayed case hold the older401 until the first call has installed its
successor and completed its retry, then release it and prove no second rotation.
For local follower cancellation, a new caller during held auth can join preflight;
it must not be required to dispatch a second old-bearer request. For leader/follower
propagation, do not infer leadership from invocation order or infer joined followers
from server request counts alone. Use explicit response/owner boundary sequencing,
small bounded waits and observed effects. Preserve the specified no-new-leader
interruption outcome, not an implementation-dependent alternative.

Cancellation work order explicitly permits Session/T05 operation_interrupted at
the observing boundary. Existing cases require ONLY isSessionError, overconstraining
that allowed brand. Accept actual module-created SessionError OR TransportError
with operation_interrupted; preserve the original safe transport metadata where
applicable. This is common-spec compliance, not changing an oracle to fit code.

### Q4 — Missing real owned-commit acknowledgement boundary

Readiness claims held real commit coverage, but no new S4 source holds an actual
public commit acknowledgement. Final post-call vault reads alone do not prove a
resource retry waited for durable installation or a leader stayed unresolved while
its owned commit was held. A network-response hold is a different boundary.

Reuse the accepted QA public-owner adapter pattern to run a real isolated commit
while holding its acknowledgement. Observe installed durable state, prove no
resource retry/leader settlement before release, cancel/invalidate at that boundary
and prove safe settlement/no late leader/live-follower success/no rollback. A small
combined representative case suffices; do not duplicate the full S3 race matrix.

### Q5 — Unsafe config-capture unit and local-validation evidence

The config-capture unit invokes a valid live-grant listWorkouts against
https://t06-s4-qa.example.invalid, thereby allowing actual non-loopback DNS/network
when later executed. The helper comment that this origin never reaches the wire is
false. Move that behavioral capture oracle to an owned literal-loopback fixture,
assert the configured original destination/result, and mutate caller config only
while retaining a safe owned destination. No external/artificial DNS dependency.

The malformed-route test currently uses live access and never observes vault/counts;
it does not prove validation BEFORE expired-access/pending auth changes. Combine a
representative invalid local request with expired-access or pending state under the
safe fixture, asserting unchanged durable state and zero auth/resource dispatch.

### Q6 — Tautological capture test and incomplete surface/read-only assertions

Unit case "keeps the representative mutation body byte-identical through local
capture" never invokes a mutation and compares a pure fixture builder to itself.
It is not a production oracle. Replace/consolidate it with the representative
integration identity case: mutate caller-owned body view/query/binding during a
held auth wait and prove the sent request retains its entry snapshot. Prefer one
high-value small case, not a new validation permutation matrix.

The "exactly eight runtime exports" test checks named imports, not exact namespace
keys. The "...ONLY" facade test checks a handful of forbidden fields, not exact
keys. Tighten those existing surface assertions using public module/facade keys.
Empty opening should compare unchanged empty vault bytes, not binding alone.
Invalid-maxAttempts should assert safe invalid_arguments code, not brand alone.
Small inert-import proof remains Coordinator-owned after freeze, not permission
for a QA runtime diagnostic now.

### Q7 — Evidence accuracy

Keep the initial source-ready report and this rejection historical; use a NEW
repair/readiness report rather than overwrite the initial evidence. Correct claims
about deterministic ordering, held commits, exact key/capture/surface coverage and
cleanup propagation. Report authored counts honestly without a quota; consolidation
or changed counts is allowed when meaningful coverage is retained. The listed
63 unchanged QA inventory paths are independently checked; raw untracked git status
alone cannot prove no preexisting file changed.

## Current grants and stopping point

QA may read this QA-source review plus common public specs and owned QA paths;
repair ONLY the four new s4 sources and create new S4 QA repair/readiness evidence.
Same pinned/static-only commands: node --check, scoped ESLint/Prettier, source-only
import-resolution checks. NO compiled-target/import/suite/fixture/provider/loopback
execution, build/install or accepted-helper edits. Escalate a concrete accepted
fixture/API defect rather than edit it. Proportional scope; no general harness.

Report revised paths/counts/checklist and exact static commands/results, then HOLD
for second source review. Target60–90min/checkpoint90/stop120 with honest partial
handoff; no automatic context renewal. Developer source work continues separately.
No frozen relay or S4 acceptance; parent/S5/product-write/release boundaries unchanged.
