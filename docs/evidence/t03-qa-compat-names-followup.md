# T03 QA follow-up: exact component-name presence (baseline-f0 closed)

**Role:** independent QA (Muse Spark 1.3 Contributor, pane `w4:p2H`).
**Window:** source review only — baseline-f0 closed, Developer implementation
released, NO compiled execution performed (no smoke/domain/target runs against
the moving build).
**Date (UTC):** 2026-10-11.

## Change (same authorized assertion, no other edits)

`test/foundation/package-contract.test.mjs`, compatibility-matrix `it` block
only: embedded the exact 17 public Component names from authoritative
`docs/compatibility.md` as `EXPECTED_COMPONENTS` and asserted sorted equality
against the table's Component column plus Set-size uniqueness (17). Combined
with the existing 17-row / 5-column / 16-unverified + 1-retired checks, missing
components, duplicates, substitutions and extra rows all fail; no false
compatibility claim can pass. `docs/compatibility.md`, production, configs and
all other tests untouched.

## Scoped source-review commands and results (no execution)

- `npx prettier --check --ignore-unknown test/foundation/package-contract.test.mjs test/unit/t03/`
  → "All matched files use Prettier code style!"
- `npx eslint test/foundation/package-contract.test.mjs test/unit/t03/`
  → exit 0, no findings.
- No `npm run smoke`, no `vitest`, no `node` target runs in this window.

## Source readiness and holds

- T03 sources ready for review: `test/unit/t03/` (fixtures, helpers with
  configured SDK-owned Ajv2020 + formats, 5 suites) + the strengthened
  regression assertion above.
- Holding ALL executions until the new relay authorizes the owning domain suite
  and foundation regression. Remaining question: none blocking; awaiting the
  domain artifact relay naming `dist/domain/index.js`.
