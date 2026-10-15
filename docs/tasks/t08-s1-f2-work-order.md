# T08-S1 F2 — bounded fixture-only repair and verification

**Authority:** user instructed continuing assigned S1; Coordinator explicitly
assigns this narrow next window after the exhausted initial window/checkpoint.
Fresh QA context in the existing pane; Developer stays HOLD. No automatic context
extension/slice successor. Target30min, checkpoint20, stop30 with honest handoff;
no forced termination of begun persistence. Source/target grants remain separate.

## Outcome and normative finding

F1 is100/101PASS with one getWorkout failure, exact envelope code UNKNOWN in the
original reporter. [Adjudication](../evidence/t08-s1-f1-coordinator-adjudication.md)
identifies invalid synthetic finished+empty Workout, independently against approved
T03 canonical record spec §5, shared backend domain-rules finish semantics and
OpenAPI Workout/WorkoutExercise/WorkoutSet. Finished requires at least one completed
set, no incomplete sets/empty exercise entries, nonnull repetitions/weight, required
notes/rest/derived labels/IDs/positions. Do not weaken those invariants to fit data.

QA chooses a minimal valid finished synthetic aggregate and matching raw-numeric
wire body. Preserve source assertions, expected labels/types/revision rules and
other fixture scenarios. No production/helper/API/contract/dependency change or
implementation-derived oracle. F1 remains failed; successful new observation must
be labeled F2, never original-code reconstruction or retroactive acceptance.

## Exclusive scope and source commands

OPEN for QA: ONLY test/read-runtime/fixtures.mjs expected and wire Workout fixture,
plus new docs/evidence/t08-s1-qa-f2-* sanitized evidence. Read public specs and own
QA sources only; no production/generated implementation/maps/private Developer
reviews. Other eight approved sources, tests/assertions/manifests/configs unchanged.
Coordinator owns source review/status/inventory/private relay control.

Each command explicitly exports privately supplied T01_NODE_HOME and PATH; pinned
Node24.21.0/npm11.19.0. Exact nonempty SOURCE-only argv:

```sh
node --check test/read-runtime/fixtures.mjs
./node_modules/.bin/eslint test/read-runtime/fixtures.mjs
./node_modules/.bin/prettier --check test/read-runtime/fixtures.mjs
```

Scoped prettier --write on that one file permitted if needed, then recheck. No
install/build/import/fixture/provider/TLS/compiled/suite execution yet. Report actual
source/static result and HOLD; Coordinator separately reviews/freezes new identity.

## Separate runtime gate and acceptance

A later explicit ONE-RUN frozen F2 grant may reuse byte-identical approved c3
compiled files and qualified launcher under a NEW isolated provider/CA/profile scope.
Same seven full owning + three relevant unchanged regression files, serial execution,
nonempty explicit argv and input hashes, complete safe output/failure identities.
One final full101-case selection includes the focused repaired case; no unnecessary
separate campaign or dependency rebuild/clean install for a fixture-only edit.

No hidden exclusions/skipped pass. On any failure/scope/hash/output/cleanup fault,
STOP before rerun/repair; preserve unknowns. Retained F1 scopes get named private
cleanup only after confirmed child/provider/owner release and preserved evidence.
No personal/live backend/Google/Android, actual writes, .pi/trust/staging/commits,
S2/S3 continuation or release. F2 source readiness is not S1 acceptance.
