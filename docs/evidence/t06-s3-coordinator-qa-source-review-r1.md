# T06-S3 independent QA source review — r1

**Disposition: NOT source-approved.** Scoped new-S3-source repairs required.
No target/fixture/suite execution, frozen relay or acceptance. Existing accepted
S1/S2 helpers/assertions untouched. Original source-ready findings/counts retained;
new repair evidence reports actual revision/limits, no retrospective pass.

## Scope and static checks

Reviewed all four new S3 source files, source-ready evidence, existing QA T06/T05
helpers and common S3 public contract only for test adjudication. Coordinator also
reviewed production separately; no production private sources/findings are QA input.

Pinned Node24.21.0/npm11.19.0 coordinator node --check x4, scoped ESLint and Prettier
ALLexit0. Syntax/format do not prove helper callback shape or meaningful ordering
oracles. Initial30declared cases (16unit+8replay+6concurrency), NOT executed/passed.
Tests are additions only; accepted QA files remain byte-identical to S2 inventory.

## R1-1 — accepted TLS callback shape is misused

Existing test/fault/t05/helpers.mjs startLoopbackHttps calls handler(raw req,res,
captureRecord). The body bytes are in captureRecord.body, NOT raw req.body.
The new mutable/shared wrappers discard the third argument and replay/follow-on
responders parse req.body. This will throw before the intended response and can
create unhandled server-event errors, not a discriminating product assertion.

Repair new S3 wrappers/responders to use the existing helper's documented captured
request bytes. Do not modify accepted helper. Route responder assertions/async
errors back to the owning test and settle response/socket work safely rather than
throwing orphan exceptions from event callbacks. Keep this small and local, no new
general HTTP framework.

## R1-2 — gates/owned promises must settle on assertion failure too

In shared-cycle cases release is called only after body assertions/wait succeeds.
If a wait/assertion fails first, harness awaits tracked work before invalidating or
releasing gates. Resolve owned response/commit gates on ALL paths before awaiting
owned settlement; invalidate/abort network work as appropriate on failure, then
close owner/facility/server. Never abandon or force-kill a begun durability action.
Retain/report a secondary cleanup failure as well as the primary body failure;
current bodyError-first throw silently hides teardownError when both exist. Fix only
new S3 teardown code/evidence, no accepted-helper edits.

## R1-3 — durable ordering and owned-commit cancellation need observable proof

The commit spy records arguments BEFORE delegating to real storage. Its invocation
list does not establish that recovered installation completed durably before the
next prepare/dispatch. The existing invalidation case is network-flight cancellation,
not owned-commit settlement, so it cannot prove the leader does not settle early
while a storage promise is unresolved.

Use a minimal public-capability gate on the real isolated recovered-install commit:
observe actual durable recovered grant/pending-null after its real completion,
hold its acknowledgement, and establish no distinct prepare/dispatch/public leader
settlement while unresolved. Cancellation during the owned acknowledgement must
wait safely, then report interruption with the installed recovered grant retained
(no rollback) and no distinct dispatch. Release safely on every path. This can be
ONE combined ordering/commit-cancellation case, not a fault matrix. Do not assert
private function names/clock-call quotas; independent oracle is public storage and
network/promise behavior.

## R1-4 — short high-value failure regression additions

Common S3 work order now explicitly clarifies inherited terminal post-clock
semantics: a trusted clock callback aborting the leader while returning live time
must make nonaborted followers receive the shared operation_interrupted outcome.
Add ONE meaningful public-boundary regression after a durable fresh-result commit,
without implementation-derived private sync points or clock call-count assertions.
Assert no rollback/third dispatch. An entry-aborted signal is not post-clock evidence;
source-ready prose's claimed representative clock/abort case was not present.

Also add ONE definite backend conflict/rejection replay retention check (409
idempotency_key_reused is useful): safe T05 error, original durable token/body/key
unchanged, explicit repeat still original identity; never infer settlement/rekey.
No exhaustive status/permutation campaign. Lost-response cases alone do not cover
this explicitly important definite-error decision.

## Questions resolved

1. Directly seeded durable recovered-equivalent gap grant plus close/reopen is a
   valid bounded no-volatile-marker oracle. It is not crash/power-loss proof. Keep it.
2. One network-flight fence is useful but NOT sufficient for owned-commit promise
   settlement/order risk; add the single combined gate case above, no broad matrix.
3. Mixed-kind rotate overlapping active recover expects operation_interrupted while
   the valid recover succeeds. This is the settled non-destructive S4-deferred bound.

## Evidence hygiene and next gate

Replace private temporary toolchain location in QA repo evidence with provided
T01_NODE_HOME/pinned versions; exact PATH command can use the variable. Prompt-only
provisioning locations are not deliverable evidence. Retain initial readiness/failure
history and state the correction, not an invented executed pass.

Scoped QA repair grant: four new S3 files and new QA repair/readiness evidence only;
accepted tests/helpers/config untouched. Re-run only role-permitted source static
checks, then report revised checklist/counts and HOLD. No compiled target/fixture/
HTTP/suite/build/install/runtime diagnostic. Source quality is not acceptance.
Coordinator will review repaired independent sources and separately approved
production before issuing any named frozen relay. Parent T06 incomplete.
