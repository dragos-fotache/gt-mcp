# T03 QA final strengthening re-run (t03-f1 unchanged; green)

**Role:** independent QA (Muse Spark 1.3 Contributor, pane `w4:p2H`).
**Authority:** coordinator final assertion gap (no target defect, no new
relay). Production/build bytes frozen t03-f1, re-verified unchanged
(`dist/domain/index.js` `6488fbf2…`, `index.d.ts` `aaab42eb…`).
All prior reports preserved unmodified.
**Date (UTC):** 2026-10-11. Toolchain: Node v24.21.0, npm 11.19.0.

## QA-only change (one assertion, nothing else)

`expectZodVendorGlobals` in `test/unit/t03/import-probe-runner.mjs` now
compares FULL sorted `after.globals` to `before.globals` plus exactly
`EXPECTED_VENDOR_GLOBALS` — closing the removal gap the `newGlobals`-only
check could not see (a deleted preexisting name previously passed). No
guard/expectation/production/spec change; no wildcard or blanket logic.

Final QA-source hash for the changed file:
`import-probe-runner.mjs`
`113a944fc4e21e52e5f2ea6b8b6f2339188cc722293f85d2f16ba9414d8928b9`.
All other `test/unit/t03/` hashes identical to the adjudication re-run
record. Inventory unchanged: 25 files, 116 declarations.

## Authorized runs on unchanged t03-f1

- `npm run test -- test/unit/t03`: **7 files passed, 221/221 tests passed**
  (zod control and domain import both satisfy exact-union equality).
- `npm run smoke`: **7 files passed, 100/100 tests passed**.
- Own `prettier --check` + `eslint` over `test/unit/t03/` and the single
  foundation assertion file: clean, exit 0.

## Limits and provenance

Synthetic fixtures only; no credentials, tokens, account/resource IDs,
private paths, or raw bodies. No whole-suite/parked runs, installs, builds,
or manifest/config/spec/ADR edits. Independent green results, not
acceptance — coordinator clean-snapshot reproduction pending.
