# T06-S4 QA repaired-source review r2 — remaining focused repairs

**Disposition: NOT SOURCE-APPROVED; no relay/execution grant.**
Repaired33 authored cases remain unexecuted. Review r1/initial readiness and first
repair report preserved. Same bounded four-NEW-s4-source/static-only repair window;
no accepted-helper changes, new harness or broader test matrix.

## Verified improvements and static results

Reviewed revised unit12/fault01 12/fault02 9 and helper against Q1–Q7/common
adjudication, independently of production. Correct route fixtures, Buffer entry
snapshots/resource keys/original auth UUID, public namespace/facade keys, empty-vault
comparison, safe error classes, local validation/size checks, live read/preflight/
replay/401/error cases and a genuinely delayed old401 past installed successor are
substantially improved. Body/binding mutation and expiry suppression now exercise
the public facade rather than compare fixture builders to themselves.

Pinned Node24.21.0/npm11.19.0: node --check4/4, scoped ESLint and Prettier --check
(four sources + QA repair report) ALL PASS exit0.63 accepted S3-inventoried test/
rows unchanged. No runtime/target/provider/fixture/suite execution.

Reviewed SHA256:

- test/unit/t06/s4-helpers.mjs:
  3a25f17bf73af191958c7a9d02849c6b905fd4852c6088bac7f0e0ee0dac7051
- test/unit/t06/s4-auth-session-validation.test.mjs:
  531bee365efc3426eebbfedf69eae12b085defb9525c275cf09ef9f510fc62de
- test/fault/t06/s4-refresh-retry.test.mjs:
  cb61a450dc5c05d84e912478af48c55f45585c7984a9df0148369c62e6cf7ce0
- test/fault/t06/s4-concurrency-fences.test.mjs:
  5235b4f6327db6046e8ecc9e955f33893c1ae49c18016e8ad6879a52e6c3904f

## Remaining blockers (repair existing cases/helpers, no expansion)

### R2-Q1 — Track facade calls, not just responders; cancel owned waits/gates

Both fault harnesses track async RESPONDERS only. Public facade promises launched
in delayed/cancellation/capture/held-commit tests are not registered immediately with
rejection handling/owned teardown. An assertion or wait failure before a later await
can leave an unhandled rejection or a running storage/network call while profile/
facility/server is closed. Promise.allSettled(inFlight) covers only responder work,
not those public calls. Staged res objects whose handlers already returned are not
released by gates.releaseAll; their matching calls likewise remain unowned.

Register every launched facade/storage promise immediately and settle owned work
on all paths before profile/facility close; expected error assertions must still
observe original outcomes. Teardown must invalidate/cancel owned networking, release
ALL response AND commit gates, then await actual owned commit/call/responders safely.
Do not strand held acknowledgement work or force-kill a durability-critical action.
Unexpected responder errors must remain visible alongside an existing body failure,
not be dropped by `if (bodyError === null && handlerError !== null)`.

`Promise.race([waitForDeadline(predicate), gatesReleased...])` does NOT cancel its
losing polling wait. With a false predicate, timer/polling work persists up to5s
after teardown release. Use a small cancellable owned wait or equivalent registered
settlement/cleared timers; do not claim all waits stop merely because the race settles.
Keep this local and simple; no generalized framework or accepted helper modification.

### R2-Q2 — Held commit is currently pre-invocation, not held acknowledgement

makeCommitGateOwner.commit120–125 returns
`released.then(() => owner.commit(...args))`. The REAL commit has NOT begun while
hasEntered=true. The test never reads installed durable successor before release.
This is exactly the invocation-only gate rejected in r1, despite the new report's
claim of real unacknowledged durability.

Start/delegate the real owner commit immediately, track its settlement independently,
and hold ONLY its returned acknowledgement to the facade. Read the real owner's
vault while acknowledgement is held to prove the successor/pending-null already
installed, then prove no resource retry/leader settlement until release. Cancel at
that boundary, release, and prove leader/live-follower interruption with installed
state retained. Register the acknowledgement release in failure-path cleanup too.
Accepted S3 QA commit-ack patterns are authorized reused references; no private
production seam or invocation-count proxy for durability.

### R2-Q3 — Cohort and leader/join sequencing still race

The three-concurrent401 case emits responses immediately but demands exactly3old
bearer401s/6resource sends. Under specified active-cycle admission, later arrivals
may legitimately join preflight and first-send only the successor. Stage the intended
three old-bearer legs before releasing401s, or assert an oracle valid for unstaged
arrivals. Do not reject conforming scheduling merely to preserve a request count.

The leader-cancel case launches controlled/uncontrolled calls together, associates
the first-arriving response with leaderCtl without proving that identity, releases
the follower401 and immediately aborts without ensuring it encountered active auth.
Receiving a server response is not proof its client joined a shared cycle. Sequence
the intended leader's first resource arrival BEFORE launching/staging the other, or
reuse a follower invoked while auth is already held (as in the local-abort case),
with an observed safe boundary before cancellation. Keep the specified shared
interruption/no-new-leader oracle; do not loosen it into permitting a second recovery.

The delayed-old401 case now stages calls sequentially and releases the older response
after durable installation/leader retry: retain that repaired oracle.

### R2-Q4 — Safe mutation input and honest evidence

Loopback config-capture now uses owned success traffic, but mutates origin to an
external .invalid value. Use a syntactically invalid non-network sentinel instead,
or another owned loopback destination; a broken recapture must fail locally or stay
inside the explicitly owned fixture, not try external DNS. No new second-server
framework is needed.

Keep initial and first-repair evidence historical. New repair evidence must describe
actual acknowledgement/durable-state observations and owned call/wait cleanup, not
repeat claims made false by current source. Counts are authored, not executed/passed;
no quota or new permutation matrix. A bounded negative wait is not proof of exact
internal joining; tie leadership and shared outcomes to public staged boundaries.

## Grant and next gate

QA may read this OWN QA-source review/common specs/owned QA helpers and repair the
same four NEW s4 files, creating NEW QA repair/readiness evidence. Static-only pinned
node --check/scoped ESLint/Prettier/source-import-resolution checks. NO target/import/
suite/provider/fixture/loopback/build/install execution or accepted-source edits.
If the current context reaches90min checkpoint or120min stop, report partial/honest
handoff rather than silently renew context. Source-ready then HOLD for next review.
Production c1 readiness will be reviewed separately; neither gate grants execution.
