# T06-S4 QA f1 fixture repair — saved-list isDraft correction + readiness

**Status: REPAIRED, HOLD.** The adjudicated fixture defect is repaired
source-only; no execution performed; awaiting coordinator review, a NEW f2
frozen inventory, and a NEW named relay. Prior inventory, results, reviews,
and evidence are immutable and preserved. No frozen relay or execution
grant; readiness is not acceptance.

## Authority and boundaries

- Repair grant: `docs/evidence/t06-s4-f1-adjudication.md` (narrow QA
  source/static repair; fixture to the contract, never contract or
  production to the test).
- Public contract references (read, unchanged): shared MCP draft0.2 tools
  table (`list_routines` returns a page of SAVED, NON-DRAFT records),
  backend v1 ordinary browsing (drafts excluded from routine lists),
  accepted T03 codec spec §5 (list_routines items must be non-draft; T05
  rejects invalid canonical success data as safe `internal_error`).
- Write scope: list-routine success fixture builders in exactly the two
  NEW S4 fault files + this NEW evidence file. Case names/counts,
  assertions, methods/routes/keys/bodies, concurrency/cancellation/
  durability oracles, ALL `createDraft` 201 `isDraft:true` fixtures,
  accepted helpers/defaults, and everything else untouched.

## Minimal changes (4 lines, 2 files)

- `test/fault/t06/s4-refresh-retry.test.mjs` — 3 lines: every
  `routineListWire([routineWire({ id: S4_ROUTINE })])` success responder
  (preflight, pre-auth validation, config-capture) now passes
  `isDraft: false` explicitly.
- `test/fault/t06/s4-concurrency-fences.test.mjs` — 1 line: the shared
  `routineSuccess` builder now passes `isDraft: false` explicitly
  (covers the staged cohort, delayed-401, follower-abort, leader,
  held-commit, invalidate, and foreign-caller success paths).
- Preserved: the three `createDraft` 201 responders keep `isDraft: true`
  (draft/mutation shape, correct per adjudication); `searchExercises`
  catalogue pages and `listWorkouts` workout pages unchanged (already
  route-correct, not implicated).

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

Expected authorized hash drift is limited to these TWO source files; the
original f1 inventory/result is not rehashed into a claimed pass. NO
compiled-target/import/fixture/provider/loopback/suite/rerun/diagnostic/
build/install execution was performed. Source HELD for f2 freeze + named
relay.
