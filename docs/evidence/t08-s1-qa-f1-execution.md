# T08-S1 f1 runtime relay — QA execution record (sanitized)

Authority: `t08-s1-f1-coordinator-relay.md` + `t08-s1-f1-artifact-inventory.json`
(one-run grant, exact ten-file argv, frozen c3/f1 candidate). No source, build,
install, discovery, or second run. Source work remains CLOSED.

## Outcome

- Relay exit code: **1** (vitest failure), signal null. No rerun performed (STOP
  rule); no fixture changes made.
- Suites: 9 passed / 1 failed (10 files). Tests: **100 passed / 1 failed**
  (101 total), 0 pending, no runtime errors.
- Full owning S1 set (7 files): 6 files green, including cancel-close (10/10),
  startup-config (8/8), startup-ownership (3/3), reads-pages-filters (3/3),
  canonical-errors (3/3), validate-before-auth (6/6).
- Unchanged regressions green: T03 backend-response (39/39), T06-S5
  lifecycle-validation (11/11), foundation inert-imports (12/12).

## Single failure (structured identity, safe)

- Test: `S1 six canonical reads > getWorkout maps the complete canonical record`
  in `test/read-runtime/reads-success.test.mjs`.
- Observed: `getWorkout` returned `{ ok: false, error: {...} }` where
  `{ ok: true }` with the complete canonical record was expected
  (`expectOkEnvelope`, reads-success line 87).
- Envelope error code: **UNKNOWN** — the retained reporter diff truncates the
  error object (`…(2)`, properties omitted) and the safe result carries only
  the test name/status. No code is guessed; no raw body is recorded.
- All other five reads (search/getExercise/getRoutine/listWorkouts/listRoutines)
  mapped exactly in the same run, so this is isolated to the getWorkout path,
  not a general envelope/projection break.

## Cleanup and limits

- Fixture/provider scope: **RETAINED** for separately approved private cleanup
  (control reported BLOCKED retention on failure; pointer-verified present, no
  values recorded here). No ambient/personal services touched.
- This record claims no S1 acceptance, parent completion, or release readiness.
  Import resolution for the live tree remains as previously reported; this relay
  executed the frozen private candidate only.
- Original source-window stop 12:29 UTC applies; no begun persistence was forced.
  HOLD ALL pending Coordinator adjudication of the single failure.
