# T03 QA baseline-f0 regression repair + smoke evidence

**Role:** independent QA (Muse Spark 1.3 Contributor, pane `w4:p2H`).
**Window:** baseline-f0 (smoke-only). No domain target execution.
**Date (UTC):** 2026-10-11.

## Frozen relay verified (read-only hashes, no content reads)

Relay baseline-f0, Developer build `npm run build`, Node 24.21.0 / npm 11.19.0:

- `dist/index.js` SHA256 `8e609bb71c20b858c77f0e9f90bb1319db8477b13f9f965f1a1e18524bf50881` — match.
- `dist/contracts/index.js` SHA256 `e762a5c8a0b42f023f3dff047372723e9eb6b352a0521289ff871f53e21cc6e4` — match.
- `dist/protocol/server.js` SHA256 `f796dc48412b3068b7fb18c5511a2858b313e3ee862aa304c3e714cc5e0796ef` — match.
- `dist/cli/index.js` SHA256 `f4e36466b4e7a67933e70cb77b24fdbff4136a0ca41f402497fb1139d119b033` — match.
- `companion/dist/index.js` SHA256 `f5ade4881f4a7b3d08169489c249c445ef916d50b89ddf2a2bd5fe03b11b5395` — match.

`dist/domain/` absent (Developer implementation not yet relayed); T03 target
execution awaits the later domain artifact relay. Developer holds all
production/build/install actions.

## Regression repair (only authorized edit)

`test/foundation/package-contract.test.mjs`, single `it` block only: the old
assertion (16 rows, 6 columns, every Status unverified) replaced with the
current authoritative structure — 17 component rows, 5 columns, 16 product rows
`unverified` plus the single retired companion row `not in current delivery`
(must contain "companion" in Component). Any other Status value fails with "no
false compatibility claim allowed". Node pin `24.21.0` check retained. No other
foundation/T02 test touched; `docs/compatibility.md` untouched (authoritative).

## Exact commands and results

- `npx prettier --check` (8 files: 7× `test/unit/t03/`, 1× regression file):
  5 T03 sources reformatted with `--write`; re-check passes
  ("All matched files use Prettier code style!").
- `npx eslint` (same 8 files): exit 0, no findings.
- `npm run smoke` (`vitest run test/foundation`): **7 files, 100/100 passed**
  (baseline observed 99/100; the repaired metadata assertion is the +1).

Toolchain: `node v24.21.0`, `npm 11.19.0`,
`gymtracka-mcp@0.0.0`, `packageManager npm@11.19.0`.

## Limits and next steps

- No `test/unit/t03` execution (no domain relay yet); new sources are
  preparation only, validated by scoped lint/format so far.
- No package/config/lockfile/shared edits; no secrets/live service/writes.
- Request: coordinator closes the baseline frozen window and releases Developer
  implementation; QA continues T03 source preparation meanwhile.
