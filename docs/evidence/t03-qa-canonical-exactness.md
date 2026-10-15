# T03 QA canonical-exactness boundaries (no execution; hold unchanged)

**Role:** independent QA (Muse Spark 1.3 Contributor, pane `w4:p2H`).
**Window:** source preparation only — NO compiled execution (no smoke/domain/
target/control runs). Static review (prettier/eslint) only.
**Date (UTC):** 2026-10-11.

## Additions (canonical exactness, not new policy)

Entire values, never prefix matches; valid whitespace preserved without
blanket trimming or caps:

- `lossless-revision.test.mjs`: token text rejects trailing/leading
  LF/CR/TAB/U+2028/U+2029 (built via code points, reviewable without
  invisible glyphs), including on the Int64-max token.
- `parse-normalize-identity.test.mjs`: UUIDs exactly 36 chars — truncated,
  extended, and boundary-suffixed (`x`, space, LF/CR/TAB/U+2028/U+2029)
  values reject via `parseArguments` and `normalizeIntent`. Preservation
  positives: multiline/tabbed names, spaced search, and line-bearing opaque
  page tokens round-trip byte-exact.
- `backend-response.test.mjs`: timestamps and UUID fields reject trailing
  LF/CR/U+2028/U+2029 at decode.
- `tool-schemas.test.mjs`: compiled input UUID schemas reject suffixed and
  truncated values; compiled output revision schemas reject suffixed
  strings plus an embedded-break case; compiled output timestamp schemas
  reject suffixed values.

## Standing authorizations (unchanged, unexercised)

- Artifact-free controls remain authorized only after the pre-import
  patch-failure/ESM-sync preflight gate; that gate is implemented in the
  runner. No control re-run performed in this window.
- Domain/foundation execution hold remains until the frozen relay. No
  production or moving-artifact inspection performed.

## Scoped review commands and results (no execution)

- `npx prettier --check` over `test/unit/t03/` +
  `test/foundation/package-contract.test.mjs`: clean (2 files reformatted
  once with `--write`, then clean).
- `npx eslint` over the same paths: exit 0, no findings.
- Nothing executed, nothing accepted. No package/config/parked edits; no
  foundation reads beyond the authorized single assertion.
