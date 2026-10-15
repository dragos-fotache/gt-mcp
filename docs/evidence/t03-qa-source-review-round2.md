# T03 QA source review round 2 (no execution; hold unchanged)

**Role:** independent QA (Muse Spark 1.3 Contributor, pane `w4:p2H`).
**Window:** source preparation only — baseline-f0 closed, implementation
released, NO compiled execution (no smoke/domain/target runs).
**Date (UTC):** 2026-10-11.

## Fixes applied (public spec only; nothing derived from target behavior)

1. Equipment ordering moved to a BUNDLED record (custom max is one row);
   expected order corrected to lexical ascending (`bbbb...` before `cccc...`).
   Custom multi-equipment rejection and instruction-order preservation kept as
   separate scenarios. (`backend-response.test.mjs`)
2. New `T03 exact-source Int32 traps` suite through `decodeBackendResponse`
   with ORIGINAL token text interpolated verbatim (no parse/stringify
   round-trip): rest `30.<400 zeros>1` and `2147483647.0000000001`, position
   `0.<400 zeros>1`, repetitions `8.<400 zeros>1`, rest `1e-20`, numItems
   `1.<400 zeros>1` — each fractional yet rounding-adjacent to a valid integer,
   all must reject before rounded conversion; plain-integer controls decode
   exactly. The ordinary parsed-number Int32 test is relabeled as API-level
   validation with its boundary stated. (`backend-response.test.mjs`,
   `parse-normalize-identity.test.mjs`)
3. `public-surface.test.mjs` rewritten: ten exports named correctly (was
   "nine"), arity/`length` constraints removed, cache re-import removed.
   Added `dist/domain/index.d.ts` existence check (metadata only, contents
   never read) and an isolated subprocess import probe with own delta-based
   instrumentation (stdout/stderr text, exit code/signal, globalThis keys,
   process listener counts, active resource types, argv passthrough with
   synthetic args, cwd file-write check in a temp dir). Documented limits: a
   clean delta evidences no import-observable effects; it cannot prove absence
   of transient/kernel-level effects.
4. Lowercase UUID with non-RFC version (`0`) / variant (`c`) nibbles accepted
   via `normalizeIntent` and `parseArguments`, proving no narrower
   version check beyond the documented regex. (`parse-normalize-identity.test.mjs`)

## Scoped review commands and results (no execution)

- `npx prettier --check` over `test/unit/t03/` +
  `test/foundation/package-contract.test.mjs`: clean (one syntax slip from an
  edit overlap — a stray `});` — caught by prettier, removed, re-verified).
- `npx eslint` over the same paths: exit 0, no findings.
- 8 source files, 86 `it`/`it.each` cases. Nothing executed; nothing accepted.

## Questions (async; holding executions regardless)

- If the subprocess resource full-equality check proves noisy under a future
  Node (transient handles), should QA relax it to a concerning-type denylist,
  or hold full equality as the acceptance bar? Current sources keep full
  equality with a two-turn `setImmediate` drain.
- Otherwise none blocking; awaiting the final frozen relay.
