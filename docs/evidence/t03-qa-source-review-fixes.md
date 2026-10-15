# T03 QA source-review fixes (coordinator review round, no execution)

**Role:** independent QA (Muse Spark 1.3 Contributor, pane `w4:p2H`).
**Window:** source preparation only — baseline-f0 closed, implementation
released, NO compiled execution (no smoke/domain/target runs).
**Date (UTC):** 2026-10-11.

## Fixes applied (all from public spec text, no target-derived expectations)

1. `4.5e1` (= 45, exact integral) moved to valid revision tokens with expected
   `"45"`; rejection uses genuinely fractional `4.05e1` (= 40.5).
   (`fixtures.mjs`, `lossless-revision.test.mjs`)
2. Bare `2024-05-01T12:00:00.0000` (no UTC suffix) now invalid;
   `2024-05-01T12:00:00.0000Z` valid. Added both distinction cases plus
   `0000`/`9999` boundaries, `10000`/Feb-30/date-only invalids, `.0001Z`
   sub-ms invalid, and finished-before-start clock-correction validity.
   (`backend-response.test.mjs`)
3. Key-order equivalence compares identical arrays/counts/values (two-set base
   vs two-set reordered spelling); order sensitivity uses same-length swapped
   exercise arrays and same-length swapped set arrays plus a differing-count
   case. (`parse-normalize-identity.test.mjs`)
4. Self-containment constrains local `$ref` targets and the `$schema` dialect
   URI only; the standard draft2020-12 `https` URI is allowed, blanket
   http-text rejection removed. (`tool-schemas.test.mjs`, `helpers.mjs`)
5. Keyword traversal is schema-aware (`visitSchemaNodes`): only schema nodes
   are checked, descending through properties/`$defs`/combinators; property
   and definition names plus literal annotation/default/example objects are
   data, never keywords. (`helpers.mjs`)
6. Revision boundedness asserted via compiled actual per-tool success
   envelopes with targeted revision-field variants (valid `1`/2^53+1/Int64max;
   invalid max+1/`0`/`01`/empty/numeric-7); regex-layout inference removed.
   (`tool-schemas.test.mjs`)
7. `Object.isFrozen(TOOL_NAMES)` and output-root `type` literal requirements
   removed; contract is frozen order/content plus valid exact envelope
   behavior. Ajv2020 keeps dialect/schema validation, formats and no-coercion
   with `strict: false` so standards-valid schemas are never rejected for
   style. (`tool-schemas.test.mjs`, `helpers.mjs`)

## Coverage added (owning QA paths only)

- Compiled schema-valid success envelopes for all seven tools (incl.
  nonterminal page) — independent of `makeToolResult` behavior tests.
- Compiled strict input matrices: valid inputs plus root/nested unknown-field,
  type, range, enum and pattern rejections at schema level.
- Exact-source Int32 traps (`8.5`, `0.1`, `1e2`→100 valid, max/max+1) and
  weight double semantics.
- Null/zero/absent preservation; custom relationship canonical order,
  instruction order, and primary/secondary/duplicate/tertiary/equipment
  invariants (bundled tertiary allowed).
- No-new-domain-cap positives: 501-char name, 50 entries, 100 sets.
- New `public-surface.test.mjs`: exactly the nine runtime exports, kinds,
  arities, and module re-import identity (observable only).

## Scoped review commands and results (no execution)

- `npx prettier --check` over `test/unit/t03/`,
  `test/foundation/package-contract.test.mjs`, `docs/evidence/t03-qa-*.md`:
  all clean (3 files reformatted once with `--write`, then clean).
- `npx eslint test/unit/t03/ test/foundation/package-contract.test.mjs`:
  exit 0, no findings.
- 8 source files, 80 `it`/`it.each` cases; execution held for the final relay.

## Remaining questions

None blocking. Awaiting the final frozen relay authorizing the owning domain
suite (`npm run test -- test/unit/t03`) and foundation regression.
