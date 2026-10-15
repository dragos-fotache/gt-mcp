# T08-S1 QA source review — r3 focused corrections

## Disposition

Source readiness remains REJECTED; no runtime relay. Reviewed changed fixture,
startup and cancellation/query sources against shared OpenAPI and accepted T04–T06
public specifications, not production code. R2 bootstrap capture, nullable skeleton,
explicit private-root setup, authored six-route/preparation contract and stronger
oracles are substantive improvements. Syntax/lint/format results remain QA-reported
source-only checks; no behavior run or complete import-resolution pass.

## Remaining concrete corrections, not a new testing campaign

- **Routine fixture still violates OpenAPI.** RoutineExercise requires the derived
  exerciseName. Add the independently chosen synthetic label to the nonempty
  expected aggregate and numeric-wire response. This field was missed in the prior
  Coordinator completeness review; retain that review miss, not a production fix.
- **Wire query oracle conflicts with T05.** Search uses non-locale toLowerCase:
  q=Synthetic must be q=synthetic. Observe unchanged effective search/filter/limit
  on the continuation too, not only token and limit. Use the existing case; no new
  test permutations.
- **Metadata fixture precision.** mode passed to writeFileSync is filtered by
  umask; the unsafe0644 case must explicitly establish/assert0644 in its isolated
  file. Negative cases should share the positive control's otherwise-valid bus
  metadata so an invalid common field cannot explain all failures. The positive
  unprovisioned-profile control must require recovery_unavailable; accepting factory
  success would conceal the forbidden blocked-but-running startup fallback.
- **Cleanup failures still hidden.** buildIsolatedRuntime.releasePartial silently
  catches fixture-close errors and then deletes scratch; the two special close
  tests still bypass failure-preserving cleanup and can stop at the first failure.
  Surface cleanup failure, attempt all remaining safe teardown and do not remove
  owned durable state while release is uncertain. Unreleased held gates need a
  guaranteed teardown path. Reuse the small existing cleanup helper rather than
  another harness.
- **Begun-refresh case needs an actual refresh oracle.** One observed request could
  be a resource GET: require POST /v1/auth/refresh for the controlled expired-access/
  live-refresh grant. The current {} success response is invalid ServiceSession;
  do not label it a grant settlement fixture. Establish close waits for the begun
  owned work and owner is releasable, with preserved pending/recovered evidence as
  applicable to the chosen accepted T06 cancellation scenario. Prefer one focused
  synchronized case using public APIs, not a full rotation/fault matrix.

Same nine source files/evidence, existing source-only static argv and original
window only. No new dependency/filename/generalized framework, install/build/target/
fixture/provider/HTTPS/suite execution. Report corrected focused source results and
hold. Developer gets no QA-private findings or implementation-derived oracle.
