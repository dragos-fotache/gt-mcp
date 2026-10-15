# T06-S4 f2 available-record adjudication — default-query oracles

**Disposition: f2 FAILED/PARTIAL; execution CLOSED.**30PASS/3FAIL of33 reported,
regressions202UNRUN,284checksum/hash rows stable, cleanup reported green. Original
[f2 result](t06-s4-qa-f2-execution.md) and [observation-loss supplement](t06-s4-qa-f2-observation-completion.md)
preserved. TWO original failed-case identities remain irretrievable; NOT reconstructed
or relabeled. Production c4 unchanged/HELD; no production repair requested.

## Known failure and independent source-level defects

Accepted [T05§4](../decisions/t05-approved-transport-spec.md#4-validation-identity-and-query-serialization)
retains T03 defaults and ALWAYS serializes list-routine limit. Shared MCP page
default20 is unchanged. For listRoutines(captured,{},signal), the effective request
target is EXACTLY /v1/routines?limit=20 (no optional pageToken).

Fully observed original f2 failure: config-capture expected /v1/routines but received
/v1/routines?limit=20. The oracle violates the public serialization contract; changing
production to remove the query would break accepted behavior.

Independent inspection of QA source identifies TWO additional wrong queryless
filters: staged cohort and delayed401 count retries only when record.url equals
/v1/routines. They invoke the same {} routine-list method and must recognize the
EXACT specified effective target with limit20. These source defects exist regardless
of which assertion surfaced in the incomplete original f2 log. They are NOT assigned
as the TWO missing runtime failures; those observations remain unknown forever.

All other33case/oracle/count/route/bearer/key/body/cancellation/durability requirements
remain. Exact target equality is preserved, not replaced by permissive prefix/path
matching or dropping query validation. Mutation POST /v1/routines has NO query and
its correct queryless identity assertions MUST remain unchanged.

Coordinator source review missed these query expectations; f1's earlier malformed
list stimulus could mask later assertions. This second review miss and both red runs
remain historical. Neither source approval nor partial passing counts imply slice
acceptance. No shared contract/T03/T05/production adjustment, skip/exclusion or deletion.

## Original-output loss and future capture requirement

QA's f2 command piped stdout through in-shell tail -n25. Complete output was never
captured; no saved log/tool full-output attachment or surviving original run root
can recover the TWO missing observations. The supplement honestly withdraws earlier
unverified per-case pass labels. We do not reconstruct them from code.

A NEW named artifact/run is required to verify the COMPLETE owning selection and
capture ALL outcomes. Future runner stdout+stderr must first be retained IN FULL
in a fresh QA-owned file; no tail-only/truncating pipeline. Capture the actual Vitest
exit independently, inspect/read complete original output (paged reads if needed),
and create a sanitized complete result before removing owned logs/roots. Full-output
capture is a small command/logging correction, NOT a new framework. Keep counts,
ALL failed titles/oracles/safe codes/expected-actual observations and cleanup/integrity;
never write tokens/IDs/bodies/private absolute paths into repo evidence.

## Narrow QA source/static repair grant

QA may edit ONLY these THREE existing query-oracle locations:

- test/fault/t06/s4-concurrency-fences.test.mjs: staged-cohort and delayed401 retry
  filters compare record.url with /v1/routines?limit=20 (two comparisons).
- test/fault/t06/s4-refresh-retry.test.mjs: config-capture second request URL
  expectation is /v1/routines?limit=20 (one assertion value).

No other case/count/assertion/method/route/key/body/fixture/helper/default/production/
manifest/config/dependency change. Preserve saved-list isDraft:false fix and ALL
createDraft201 isDraft:true fixtures/queryless mutation assertions. No new test
matrix/harness, deletion, skip, permissive URL parsing or altered error oracle.

Create NEW docs/evidence/t06-s4-qa-f2-oracle-repair.md with public references/minimal
edits/exact static results and complete-output plan. Pinned node --check BOTH files,
scoped ESLint/Prettier/source-only import-resolution permitted. NO target/import/
suite/provider/fixture/loopback/runtime diagnostic/rerun/build/install until
Coordinator reviews, freezes NEW f3 inventory and issues NEW NAMED relay. Original
f1/f2 inventories/results/supplement immutable; authorized drift limited TWO sources.
Source readiness then HOLD. Developer remains HOLD ALL, no QA-private reads.

## Acceptance and stopping point

Missing original f2 observations cannot be recovered and remain an honest historical
limit. They are not declared passed/fixed. Current acceptance instead requires NEW
complete33owning +exact202unchanged regression evidence on the reviewed f3 artifact,
zero skip/unhandled/cleanup failure and final locked clean proof/100identical builds/
eight-export smoke. No silent exclusion: all same owning cases remain selected.
Current-context checkpoint90/stop120 applies; honest partial if reached, no renewal.
S5/parent/product-write/staging/commit/release boundaries remain unchanged.
