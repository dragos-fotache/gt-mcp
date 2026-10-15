# T06-S4 independent QA source gate — r3 repair approved, HELD

**Disposition: QA SOURCE-APPROVED/HELD,33 authored cases, ZERO executed.**
All QA source/helper/static-check windows CLOSED. NO compiled-target/import/fixture/
provider/loopback/suite grant or frozen relay. Production c2 review remains separate;
source approval is NOT S4 behavioral acceptance or parent T06 completion.

## Source review and repair closure

Initial source30cases rejected in [r1](t06-s4-coordinator-qa-source-review-r1.md);
first repaired33cases required [r2](t06-s4-coordinator-qa-source-review-r2.md) focused
owned-call/durability/order fixes; second repair required only [r3](t06-s4-coordinator-qa-source-review-r3.md)
losing deadline-timer cleanup. Initial readiness/reports/failures remain historical.
New [r3 repair](t06-s4-qa-repairs-r3.md) replaces only the held-ack commit deadline
race with the existing cancellable local wait on real-commit settlement. No owned
commit termination, new case/framework, weakened oracle or accepted-helper edit.

The source now supports the approved bounded public-risk selection: fixed-route
success data, exact original resource/body/auth-key identity, preflight/recovery,
valid/repeated/noneligible401, shared staged cohort/delayed401, local follower and
shared leader cancellation, real installed-vault observation while commit ack is
held, retained evidence, local validation/config capture and conservative received
mutation suppression. Public API/safe errors specified in common work order and
adjudication, not derived from production internals.

Owned responders/public calls have immediate rejection handling and pending
settlement tracking; protected acquisition/registered staged responses/deferred ack
release/cancellable waits and error-folding support failure-path cleanup. Negative
bounded waits are not proof of exact internal joining or OS scheduling. These are
source conclusions; actual cleanup, assertions and unhandled-rejection outcomes still
must pass under a later isolated frozen relay. No sandbox/power-loss/runtime proof.

## Independently checked source quality/integrity

Pinned Node24.21.0/npm11.19.0 via checked disposable T01_NODE_HOME/PATH.
Previous r3 review repeated full four-file syntax/ESLint/Prettier; final tiny repair
repeated ONLY node --check, scoped ESLint and Prettier --check on repaired fault02
plus new QA repair evidence: ALL PASS exit0. The other3 S4 source hashes unchanged;
63 accepted S3-inventoried QA file hashes unchanged. No suite/fixture/target/import
execution, build/install or production review content supplied to QA.

Final QA source hashes:

| Path | Authored cases | SHA256 |
| ---- | -------------- | ------ |
| test/unit/t06/s4-helpers.mjs | helper | 3a25f17bf73af191958c7a9d02849c6b905fd4852c6088bac7f0e0ee0dac7051 |
| test/unit/t06/s4-auth-session-validation.test.mjs |12|531bee365efc3426eebbfedf69eae12b085defb9525c275cf09ef9f510fc62de|
| test/fault/t06/s4-refresh-retry.test.mjs |12|7fbb9404d00a38c5636c4296a7e06f494b33e0014b12b69479f487bea394f900|
| test/fault/t06/s4-concurrency-fences.test.mjs |9|c64bf8e74cb030a6637a7a6d1ed395803f61a9965fccedbdaad80fad500cfacf|

## Hold and next gate

QA HOLD ALL source/helper/static/target/fixture/suite actions. Only asynchronous
acknowledgement or concrete blocker reporting is permitted absent new scoped grant.
Coordinator will review production independently, freeze the exact jointly approved
source/compiled/test inventory, verify hashes and issue a NAMED relay before any QA
execution. No build/install races frozen artifacts. Source approval does not authorize
runtime checks, actual product writes, S5/context renewal, staging/commits or release.
