# T01 QA results — independent suite on rev3 (NOT a T01 pass)

**Role:** QA · **Task:** T01 foundation · **Stage:** 2 — execution on revised artifacts
**State:** final QA suite executed on fresh (entry-point-corrected) artifacts:
all green. This file records QA results only — T01 acceptance (clean-snapshot
combined checks, final package inventory) is coordinator-owned and pending.
No further production/config changes are authorized.
**Toolchain:** Node v24.21.0, npm 11.19.0, vitest 4.1.11 via `$T01_NODE_HOME/bin`
(coordinator-provisioned disposable toolchain, exported per shell invocation).
**Artifact:** Developer rev3 build (preliminary dist was rev1; revised artifacts
relayed as stable; no rebuild/install performed by QA).
**Normative ref:** `docs/decisions/t01-approved-foundation-spec.md`.
**Independence:** no production sources, diffs, or generated implementation
contents read. No installs, rebuilds, staging, commits, live services, or writes.

## Exact commands and observed results

| Command | Exit | Observed |
|---|---|---|
| `npm test` (`vitest run`, discovery per `vitest.config.ts`) | 0 | **100/100 PASS**, 7 files — includes 9 symlink/argv-match regression tests against the clarified §3 contract (npm-style symlink exact behavior for server/CLI; argv[1]-match import inertness) |
| `npm run smoke` (`vitest run test/foundation`) | 0 | **100/100 PASS**, 7 files |
| `npm run format:check` | 0 | **PASS** (includes QA-owned `test/`) |
| `node test/foundation/run-calibration.mjs` (QA probes only) | 0 | **16/16 PASS** (see `t01-qa-calibration.md`) |
| `npm run lint` (`eslint .`) | 0 (after config-ready relay) | **PASS** — scoped readonly Node globals for test `.mjs` added by Developer (no-undef retained, no deps); one residual `no-useless-assignment` in the QA harness refactor fixed by QA without touching assertions. |

Per-attempt detail: an earlier `npm test` run showed 91 pass / 1 fail on a real
`git check-ignore` probe (`shared-docs` bare path vs directory-only
`/shared-docs/` pattern on a nonexistent path); the probe was corrected to
materialize the directory shape (faithful git semantics) and the suite is
91/91 since. No production behavior was involved.

## Explicitly not claimed

- No T01 acceptance: full lint is red, clean-snapshot install evidence and
  companion package-inventory acceptance are coordinator-owned and pending.
- Placeholder commands, skipped checks, and metadata-only bundle checks were
  never counted as passes (see `t01-qa-calibration.md` §2 for the bundle-proof
  boundary: QA asserts manifest metadata only; emitted-JS audit is
  coordinator-owned).
- Compatibility rows: suite asserts all 16 matrix data-row Status cells read
  `unverified` (parsed per row, not counted); installing dependencies was never
  recorded as a compatibility pass.
- Detection limits per `t01-qa-calibration.md` §§3–4 (fd/native bypasses,
  loader-allowance precedence, no sandbox claim); coordinator source review
  supplies the remaining assurance.

## Changed QA paths (this stage)

`test/foundation/preload-intercept.mjs`, `test/foundation/harness.mjs`,
`test/foundation/inert-imports.test.mjs`,
`test/foundation/server-inert.test.mjs`,
`test/foundation/cli-inert.test.mjs`,
`test/foundation/companion-inert.test.mjs`,
`test/foundation/package-contract.test.mjs`,
`test/foundation/calibration-cases.mjs`,
`test/foundation/run-calibration.mjs`,
`test/foundation/intercept-calibration.test.mjs`,
`test/fixtures/synthetic-vectors.mjs`,
`docs/evidence/t01-qa-calibration.md`,
`docs/evidence/t01-qa-results.md` (this file),
plus Stage 1 `docs/evidence/t01-qa-plan.md`.

## Blockers / next

1. **Clean-snapshot combined checks** (coordinator-owned; runs after this
   QA readiness report).
2. **Final package inventory in acceptance evidence** (coordinator-owned;
   companion `files`-inclusion correction relayed as fixed with
dist/index.js + .d.ts + manifest in dry-run, no bundles — QA manifest-
metadata assertions already cover the peer/external half).
3. No assertion weakening or production reads by QA; no production/config
   changes authorized.
4. No assertion weakening or production reads by QA; further shared-metadata /
   full-lint reruns paused — awaiting relays, no polling.
