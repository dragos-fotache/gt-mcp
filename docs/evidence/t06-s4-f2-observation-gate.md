# T06-S4 f2 failure observation gate — original-output retrieval only

**Disposition: f2 FAILED/PARTIAL; execution CLOSED.**30PASS/3FAIL of33 reported,
regressions202UNRUN,284hash rows/checksum stable, cleanup reported green. Original
[QA f2 evidence](t06-s4-qa-f2-execution.md) preserved. TWO failed-case identities/
observations are missing; no repair, rerun or diagnostic permission yet.

## Known contract/oracle mismatch

Accepted [T05§4 serialization](../decisions/t05-approved-transport-spec.md#4-validation-identity-and-query-serialization)
retains T03 default limit20 and ALWAYS serializes list-routine limit. A request with
{} therefore has effective target /v1/routines?limit=20, not a queryless target.
The observed config-capture assertion expecting /v1/routines conflicts with that
public contract; no production change to remove the default is permitted.

Coordinator source inspection also identifies TWO queryless retry filters in staged
cohort and delayed401 cases. They compare record.url to /v1/routines while those
methods also use {} and thus the specified default query. These are independent
source-level oracle defects, but NOT a reconstruction of the TWO missing original
runtime observations. Complete original failure sections are still requested.

The report's assertion that cohort/delayed cases were among passes is not established
by its incomplete tail-only failure record. Preserve the report historically and
qualify/correct unverified pass labels in NEW supplemental evidence; never invent
missing failure identities or causes. All30passing counts are partial, not acceptance.

## Narrow evidence-only grant to QA

Read/retrieve ONLY EXISTING output from the already-completed f2 run: original saved
runner log, tool full-output attachment/path or retained completed tool result, if
available. No target import/test/provider/fixture/runtime diagnostic/rerun, source/
assertion/metadata/build/install edits or production implementation read. This is
observation completion, not permission to execute the target again or create a new
failure by experiment. Own prior output/history reading is permitted.

Create NEW docs/evidence/t06-s4-qa-f2-observation-completion.md identifying all original
failed-case titles, failing oracle, safe exception code/metadata and sanitized
expected/actual values if retained. Do not copy tokens/IDs/bodies/private absolute
paths. If original complete output was discarded or never captured, report that
specific blocker honestly; do NOT reconstruct missing outcomes from source or rerun.
Keep original f2 inventory/result immutable. No production repair is requested.

Coordinator will adjudicate complete available observations, settle narrow
specification-derived oracle repairs, freeze a NEW artifact and authorize a NEW
named owning sequence with complete safe output capture. No hidden exclusions,
counts-as-passes, broad harness or weakened contract. QA/Developer otherwise HOLD
ALL; parent T06/S5/product-write/context-renewal/staging/commit/release limits remain.
