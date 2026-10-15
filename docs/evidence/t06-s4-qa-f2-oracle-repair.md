# T06-S4 QA f2 oracle repair — default-query target correction + readiness

**Status: REPAIRED, HOLD.** The three adjudicated query-oracle locations
are repaired source-only; no execution performed; awaiting coordinator
review, a NEW f3 frozen inventory, and a NEW named relay. All prior
inventories, results, reviews, and evidence are immutable and preserved.
No frozen relay or execution grant; readiness is not acceptance.

## Authority and boundaries

- Repair grant: `docs/evidence/t06-s4-f2-adjudication.md` (THREE
  query-oracle locations only; exact target equality preserved, no
  prefix matching, no weakening).
- Public contract references (read, unchanged): accepted T05 §4 query
  serialization (retains T03 defaults; list-routine limit ALWAYS
  serialized) with unchanged shared page default 20 — so
  `listRoutines(captured, {}, signal)` has effective target EXACTLY
  `/v1/routines?limit=20` (no pageToken). Mutation POST `/v1/routines`
  carries NO query and stays queryless.
- Write scope: the three listed oracle values in the two NEW S4 fault
  files + this NEW evidence file. Case names/counts, all other
  assertions, methods/routes/keys/bodies, saved-list `isDraft:false`,
  `createDraft` 201 `isDraft:true`, helpers, and everything else
  untouched. The two missing original f2 observations remain unknown and
  are NOT assigned to these source defects.

## Minimal changes (3 values, 2 files)

- `test/fault/t06/s4-concurrency-fences.test.mjs` — staged-cohort and
  delayed-401 retry filters now compare `record.url` with
  `/v1/routines?limit=20` (2 comparisons; retry counts 3 and 2
  unchanged).
- `test/fault/t06/s4-refresh-retry.test.mjs` — config-capture second
  request URL expectation is now `/v1/routines?limit=20` (1 assertion).
- Preserved queryless: mutation-leg identity assertions
  (`leg.url === "/v1/routines"` for POST createDraft) unchanged, as
  required.

## Exact static checks (pinned toolchain)

Every command with explicitly exported disposable `T01_NODE_HOME` and
`PATH="$T01_NODE_HOME/bin:$PATH"` → Node v24.21.0, npm 11.19.0; no
ambient/system fallback.

1. `node --check` on BOTH repaired files → CHECK-OK × 2.
2. `./node_modules/.bin/eslint` (scoped, both files) → ESLINT-OK clean.
3. `./node_modules/.bin/prettier --check` (scoped, both files + this
   report) → clean.
4. Source-only import-resolution probe for both files (parses `from`
   specifiers, stats relative paths, zero module loads) → OK (16
   specifiers; all QA-relative paths exist; `vitest` external; `dist/*`
   stat-only relay targets, never imported/executed).

Expected authorized hash drift is limited to these TWO source files. NO
compiled-target/import/fixture/provider/loopback/runtime
diagnostic/rerun/build/install execution was performed.

## Complete-output plan for the next named run (per adjudication)

Retain runner stdout+stderr IN FULL to a fresh QA-owned log file FIRST
(no tail-only/truncating pipeline); capture the actual Vitest exit code
independently; read the complete output (paged if needed) and create the
sanitized result (counts, ALL failed titles/oracles/safe codes,
expected/actual observations, integrity checkpoints, cleanup) BEFORE
removing owned logs/roots. No new framework; no tokens/IDs/bodies/private
absolute paths in repo evidence. All same 33 owning cases retained with
no missing-outcome pass claim.

Source HELD for f3 freeze + named relay.
