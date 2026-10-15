# T08-S1 f1 failure adjudication and bounded checkpoint

## Observed result, not guessed error detail

Independent one-run c3/f1:100/101PASS, one getWorkout success assertion failed,
0pending. Seven owning files:38/39PASS; three unchanged regressions:62/62PASS
(T03 read-response39, T06-S5 lifecycle11, foundation imports12). The complete
retained structured failure message was examined; it omits actual error fields.
Original envelope code remains UNKNOWN, not inferred from source or recreated.
An initial attempt to parse a read-tool-truncated report was not a corrupt artifact;
full file extraction confirms the original reporter's property omission.

No S1 acceptance/whole-suite/release claim. All old source/runtime windows closed
at the original bounded checkpoint; no automatic rerun, source repair or successor.

## Specification-level fixture finding

Approved T03 spec §5 (canonical records) and shared backend domain-rules "finish"
require finished Workout to contain at least one completed set, all surviving sets
completed with nonnull repetitions/weight, and no empty exercise entries. The f1
QA fixture emits status finished with exercises=[] for getWorkout. Its expected
aggregate and raw wire therefore violate the normative canonical contract.
WorkoutSummary has only observable summary invariants, explaining why the same
summary shape can legitimately be used for listWorkouts.

This is an independently established QA fixture defect and a Coordinator fixture-
review miss. No production or shared-contract change is justified to accept invalid
finished data. The observed original code is still unknown; a NEW valid-fixture
run must establish the corrected path rather than retroactively passing f1.

## Explicit next bounded assignment

The user instructed continuing the assigned S1 without an unnecessary input pause.
Coordinator closes the exhausted source window and separately assigns a named
30-minute F2 fixture-repair/verification window, with a fresh QA conversation and
same current pane/model/cwd/focus. This is an explicit assignment inside S1, not
an automatic context clock extension, S2 grant or whole-matrix renewal.

QA source edit: ONLY test/read-runtime/fixtures.mjs expected/raw Workout aggregate
and its own sanitized F2 evidence. Preserve success assertions and all other eight
sources; derive the minimal valid finished record from public OpenAPI/domain/T03
specs. Exact pinned one-file syntax/lint/format checks, no target execution yet.
Developer remains HOLD/CLOSED; c3 production and f1 compiled bytes stay unchanged.
Coordinator reviews that fixture, freezes a NEW f2 source/candidate identity and
issues a separate one-run relay (focused defect then full active owning/relevant
selection as proportionate). No altered test oracle or failing-test exclusion.

Failure scopes remain retained; normal provider/bus/child teardown and frozen
identity must be confirmed before named private cleanup. Original full safe output,
structured identities, invalid fixture revision and hashes are preserved separately.
Missing release/output/identity facts remain blockers; no forced persistence kill.
