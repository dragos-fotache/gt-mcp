# T08-S1 QA F2 — fixture-only repair evidence (source/static, no execution)

## Authority and scope

Named bounded F2 fixture-only window per `docs/tasks/t08-s1-f2-work-order.md`;
F1 adjudication per `docs/evidence/t08-s1-f1-coordinator-adjudication.md`.
Exclusive edit: ONLY `test/read-runtime/fixtures.mjs` Workout aggregate blocks
plus this new evidence file. No assertion, production, contract, manifest,
config, or dependency change. No runtime/install/import/compiled/suite
execution under this window. F1 (100/101, original envelope code UNKNOWN)
remains failed; any new observation must be labeled F2.

## Defect (independently established, unchanged from adjudication)

The F1 synthetic `getWorkout` fixture emitted `status: "finished"` with
`exercises: []`, violating normative finished-workout invariants: approved T03
canonical record spec §5 (at least one completed set; no incomplete sets or
empty exercise entries; completed sets require nonnull repetitions/weight),
shared backend `domain-rules.md` finish semantics (finish fails without a
completed set; unfinished sets and newly empty exercises are removed), and
OpenAPI `Workout`/`WorkoutExercise`/`WorkoutSet` required fields/labels/IDs/
positions. `listWorkouts` summary shape is untouched: `WorkoutSummary` carries
only observable summary invariants.

## Changed data (one file, two blocks, visibly synthetic values only)

File: `test/read-runtime/fixtures.mjs`. All identifiers reference the existing
synthetic UUID constants (`SYNTHETIC_UUIDS.workout/entryOne/setOne/exerciseA`);
no new constants, no real IDs, no raw bodies recorded here.

- `EXPECTED_WORKOUT`: `exercises` changed from `[]` to one minimal ordered
  entry — `exerciseId` = synthetic Press ref, derived `exerciseName` label
  "Synthetic Press", `position` 0 (= array index), `notes` "", 
  `restDurationSeconds` 30 — containing one completed set: `position` 0,
  `repetitions` 8, `weightKg` 40, `isCompleted` true, `restSeconds` null.
  Root `finishedAt`, name, timestamps, and projected revision string `"40"`
  preserved. Entry/set/root IDs are family-distinct within the aggregate.
  Shape mirrors the independently verified T03 finished-workout oracle field
  set (own QA source `test/unit/t03/backend-response.test.mjs`), applied to
  S1's own synthetic names/timestamps/revision.
- `wireWorkoutGet()`: matching raw-numeric wire body — `"revision":40`
  (numeric token; projected string only at the runtime boundary),
  `"status":"finished"`, same one-entry/one-completed-set aggregate.
- Preserved: success assertions (`reads-success.test.mjs` still compares
  `getWorkout` data with `toEqual(EXPECTED_WORKOUT)`), `EXPECTED_WORKOUT_SUMMARY`,
  `EXPECTED_WORKOUT_PAGE`, all other fixtures and all other files.

## Static verification (exact approved source-only argv, pinned toolchain)

Toolchain: disposable `T01_NODE_HOME` Node v24.21.0 (verified `node --version`
prints `v24.21.0`); `PATH="$T01_NODE_HOME/bin:$PATH"` exported per command.

1. `node --check test/read-runtime/fixtures.mjs` → PASS (syntax).
2. `./node_modules/.bin/eslint test/read-runtime/fixtures.mjs` → PASS
   (no findings; no `--write` used).
3. `./node_modules/.bin/prettier --check test/read-runtime/fixtures.mjs` →
   PASS ("All matched files use Prettier code style!"; no `--write` needed).

No install/build/import/fixture/provider/TLS/compiled/suite execution performed;
no test was run, so no pass/fail claim beyond source/static readiness.

## Limits and handoff

- F2 source readiness is not S1 acceptance. A separate named frozen relay is
  required before any execution (focused repaired case, then full owning plus
  relevant unchanged regression selection, per work order).
- Coordinator owns source review, new-identity freeze, and relay control.
  QA holds after reporting; Developer stays HOLD; no staging/commits/release.
- No private locations, real IDs, credentials, or raw request/response bodies
  appear in this evidence; all fixture values are visibly synthetic.
