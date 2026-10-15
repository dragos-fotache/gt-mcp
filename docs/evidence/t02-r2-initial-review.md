# T02 R2 initial artifact review — NOT READY

**Audience:** coordinator/Developer only; not QA input.
**Disposition:** first Developer artifact-ready is withdrawn by coordinator
source/observable review. No independent QA target window was opened. R2 remains
unaccepted; no successor or R3 execution is authorized yet.

## Artifact reviewed

- driver/run.mjs SHA256 b4f983c7a72b22c44c0702cc7e0f81a4759e387592816b3c5bdf8d85b6201954
- driver/sdk-gate-worker.mjs SHA256 1694e27aa514967eb40ef578357a629e47c5e664aabee7082f6282a3cc2fdb56
- dist/index.js SHA256 ea3c9a351e7177f249117bd4d2544154da0b2c359f44b008f9b6a296e738fe55
- Fixture unchanged SHA256 80ca89b1307f91ad7bad22c2fca5d855999a29fe6031389bff7cff7d4d79caab

Developer reported the four permitted checks and all six serial SDK diagnostics
passing. These reports are not independent acceptance.

## Observed contract defect and bounded repair

Coordinator ran only public deferred-readonly/sdk with disposable report output.
Driver exited0/completed:true, 1129ms/32 records, real read/gate/final0/cleanup,
but BOTH tool_surface snapshots had nonempty hiddenTools: inactive builtins and
model-only codemode/tool_search. Public §13 requires hiddenTools:[] for this
profile. The worker incorrectly derived hidden from registered-minus-callable,
conflating hidden exposure with inactive/model-only tools. Native getAllTools
entries provide actual exposure; no inferred blanket hidden status is justified.

The parent R2 surface validator accepted that nonconformant report. Its endpoint
loop also lacked every-result parent/unique-end validation. Source review found
missing exact connected active/callable/hidden sets and some public causal bounds;
passing self-declared completion cannot substitute for these checks.

Coordinator authorizes repair ONLY driver/sdk-gate-worker.mjs and driver/run.mjs:
observe actual hidden exposure via public getAllTools, validate exact §13 sets,
first-request fixture-only callable subset with explicit fixtureTools, duplicate
rejection, every native ID/name/parent/source result join, discovery before
connected surface/registration and creation, read completion before creation and
search_loaded bounds. Preserve R1/S1/S2A paths and all other artifact identities.
No QA assertion/spec weakening, scenarios, dependencies, scope or slices added.

Then repeat the same permitted checks and six public serial diagnostics, send
fresh artifact-ready and STOP. Coordinator re-review precedes any QA relay.
The first defect remains a failed review; it will not be recast as acceptance.
Owned child/stdin/listeners/roots closed on the healthy faulty-report observation;
no product writes, receiver creation check, private paths or raw inputs retained.
