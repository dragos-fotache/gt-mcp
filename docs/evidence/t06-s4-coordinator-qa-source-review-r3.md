# T06-S4 QA second-repair source review r3 — one timer fix remains

**Disposition: source gate HELD for ONE focused timer repair; no execution grant.**
33 authored cases remain unexecuted. No new test matrix/harness or broad rewrite.
Initial/r1/r2 evidence and reviews preserved. Production review remains independent.

## Reviewed improvements

R2's principal blockers are repaired in source: public calls register immediate
rejection handling and remain owned while pending; staged responses are registered;
local predicate waits cancel/clear their timer on teardown; deferred acknowledgement
release prevents stranded commit gates; responder/body/server/teardown failure
categories are folded; expected negative-call assertions still await original
outcomes. Cohort staging and leader-first/follower-during-held-auth remove the prior
ordering assumptions. Exact route/body/key/surface/config-sentinel oracles remain.

Held-ack adapter NOW starts the real owner.commit immediately, holds only returned
acknowledgement and independently tracks real settlement. Its test reads the real
vault while acknowledgement remains held to establish installed successor plus
pending-null, asserts no leader/follower settlement or resource retry, then aborts/
releases and checks interruption with installed state retained. This repairs the
prior invocation-only durability oracle; it is still unexecuted source evidence.

Bounded negative waits support these public scenarios, not proof of internal join
points or OS scheduling guarantees. No comprehensive sandbox/power-loss claim.
Final selected runtime evidence still must pass on the reviewed frozen target.

## Static and integrity checks

Pinned Node24.21.0/npm11.19.0. Coordinator repeated node --check4/4, scoped ESLint,
Prettier --check (four sources + r2 evidence): ALL PASS exit0.63 S3-inventoried
accepted QA files unchanged. Helper/unit unchanged since r1 repair. No target/import/
suite/fixture/provider/HTTP execution.

Reviewed hashes:

- test/unit/t06/s4-helpers.mjs:
  3a25f17bf73af191958c7a9d02849c6b905fd4852c6088bac7f0e0ee0dac7051
- test/unit/t06/s4-auth-session-validation.test.mjs:
  531bee365efc3426eebbfedf69eae12b085defb9525c275cf09ef9f510fc62de
- test/fault/t06/s4-refresh-retry.test.mjs:
  7fbb9404d00a38c5636c4296a7e06f494b33e0014b12b69479f487bea394f900
- test/fault/t06/s4-concurrency-fences.test.mjs:
  fb613997590238a71803ed5138afce7fd547b8522997c7cc2fed436c3c946093

## Sole remaining repair: unowned losing commit-deadline timer

In the held-ack case, the bounded commit check at lines623–628 races
commitGate.awaitedCommits() against sleep(5000).then(throw). If the real commit
settles promptly, Promise.race does NOT cancel the losing five-second timer. It
survives successful test/teardown, contrary to the revised cleared-waits claim.

Replace ONLY this deadline race with an owned timer that is cleared in finally
on BOTH outcomes (and on body/teardown failure), or reuse the now-cancellable local
wait without leaving a losing task. Keep the real commit, durable-while-held read,
non-settlement/cancellation/no-rollback oracles unchanged. No new case/helper
framework and no changes to other three S4 sources are needed. Do not forcibly
terminate an owned commit when a diagnostic deadline fires.

## Narrow grant and next step

QA may repair test/fault/t06/s4-concurrency-fences.test.mjs ONLY and create NEW
S4 QA repair evidence, preserving prior reports. Permitted pinned source-only
node --check/scoped ESLint/Prettier/import-resolution checks; focused one-file
checks suffice for this tiny repair. NO target/import/suite/fixture/provider/loopback/
build/install execution, accepted-helper edit or automatic context renewal.
Current-context checkpoint90/stop120 applies; honest partial handoff if reached.
Report focused change/exact checks then HOLD for final source gate. Source review
is not acceptance; production approval and named frozen relay remain required.
