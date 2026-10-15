# T06-S2 QA source-ready — bounded independent test-source preparation

**Status: SOURCE-READY, HOLD.** New S2 test sources authored from the settled
S2 work order and its PUBLIC references only. No compiled-target, provider,
HTTP, or suite execution performed; no build/install. Awaiting coordinator
review and a named frozen relay before any execution. S1 assertions and all
other suites preserved (additions only, no edits outside the S2 grant).

## Authority and boundaries

- Work order: `docs/tasks/t06-s2-work-order.md` (S2 ONLY; S1 accepted/closed,
  S3–S5 unassigned). Role: QA.
- Read: AGENTS.md QA rules, the S2 work order, S1 work order/handoff, T04/T05
  approved PUBLIC specs, shared MCP/backend auth/precision/client-compat,
  proportional-testing policy, agent-coordination, nonsecret `package.json`,
  own existing QA sources/helpers/fixtures.
- NEVER read: production source/diffs, emitted JS/maps, private ADR, Developer
  reports, coordinator source/start evidence.
- Write scope respected: only `s2-`-prefixed files under `test/unit/t06/`,
  `test/fault/t06/`, and this `docs/evidence/t06-s2-qa-*.md` file. No
  dependency/script/config changes.

## Short risk/file checklist (smallest meaningful set)

| # | Core risk (work-order requirement) | File | Layer |
|---|------------------------------------|------|-------|
| 1 | Exact version2/predecessor/body/key validation; version1 read-only open; unknown-version-before-fields ordering; S1 refusal of v2 | `test/unit/t06/s2-version-expiry-validation.test.mjs` (16 cases) | unit, no network |
| 2 | Exact expiry equality (`now >= expiry` expired); expired refresh blocked; transport-origin mismatch; abort/foreign guards; spelling preservation | same unit file | unit, no network |
| 3 | Durable predecessor/body/key committed BEFORE dispatch; exactly one control attempt with exact path/body/key | `test/fault/t06/s2-durable-dispatch.test.mjs` (3 cases) | fault, T04 diagnostic + loopback HTTPS |
| 4 | Same-account atomic success (grant + pending-null joint commit); operation bytes unchanged; close/reopen state check (NOT replay) | same fault file | fault, real persistence + HTTPS |
| 5 | Representative prepare failure: no dispatch, facade fenced, vault untouched, fresh facade unblocked | same fault file | fault, one targeted T04 fault |
| 6 | Overlapping valid calls share ONE key/dispatch/commit; foreign calls never join; later call starts a distinct rotation | `test/fault/t06/s2-concurrency-retention.test.mjs` (8 cases) | fault, loopback HTTPS |
| 7 | Lost/malformed/mismatch/legacy-precision responses retain exact pending; repeat + reopened calls make no new key/dispatch (mismatch and legacy pin `invalid_grant` per work order; lost/malformed assert safe typed family only) | same fault file | fault, loopback HTTPS |
| 8 | Success-commit fault fences with pending retained and no further dispatch; leader/follower abort and in-flight invalidation suppress late success with pending retained | same fault file | fault, one commit fault + cancel fence |

Deliberately out of scope (per work order): restart replay, second-key retry,
recovered-grant follow-on rotation, resource 401 orchestration, sign-out/
replacement, crash-kill, exhaustive fault cross-products, generalized
harness, comprehensive import-interception or OS-sandbox claims.

## Reused fixtures (no new production seams)

- `test/unit/t06/helpers.mjs` (synthetic identities, clocks, gates) — read
  only, unmodified. S2 seeds use a disjoint synthetic origin
  `https://t06-s2-qa.example.invalid`.
- Accepted T04 diagnostic facility (`createStorageTestFacility`) for the
  persistence boundary; accepted T05 loopback TLS helpers
  (`startLoopbackHttps`, `closeServer`, `waitForDeadline`,
  `readFixtureBytes`) and test-only cert/key fixtures for the HTTPS
  boundary. Fixture roots owned by the diagnostic facility; no
  HOME/TMPDIR overrides; teardown propagates the first failure via
  `teardownAll` without masking body errors.

## Exact commands and results (checked toolchain)

Toolchain: `T01_NODE_HOME=/tmp/gt-t06-toolchain-NdlngZ/node-v24.21.0-linux-x64`,
`PATH="$T01_NODE_HOME/bin:$PATH"` → Node v24.21.0, npm 11.19.0 (confirmed).

1. `node --check` on all three new files → CHECK-OK × 3.
2. `./node_modules/.bin/eslint` (scoped, three new files) → clean
   (two unused-import findings fixed; final ESLINT-OK).
3. `./node_modules/.bin/prettier --write` then `--check` (scoped, three new
   files) → all files use Prettier code style.
4. Source-only import-resolution probe (parses specifiers, stats relative
   paths, never imports compiled target JS): all relative imports resolve
   (`./helpers.mjs`, `../t05/helpers.mjs`); all `dist/` specifiers match the
   S1-accepted pattern (`dist/auth`, `dist/storage`, `dist/storage/test-facility`,
   `dist/http`); `vitest` only otherwise → IMPORT-RESOLUTION-OK.

NOT run (CLOSED until named frozen relay): `vitest`, `npm run test/smoke/
build/typecheck`, any provider/HTTP execution, install.

## Changed paths

- ADD `test/unit/t06/s2-version-expiry-validation.test.mjs`
- ADD `test/fault/t06/s2-durable-dispatch.test.mjs`
- ADD `test/fault/t06/s2-concurrency-retention.test.mjs`
- ADD `docs/evidence/t06-s2-qa-source-ready.md` (this file)

S1 files (`01-expiry-grant-oracles`, `02-session-fence-matrix`,
`commit-fence`, `helpers.mjs`) untouched; no other suite touched.

## Questions for coordinator

1. Confirm the `occurrence: 2` targeting of the success-commit fault
   (`commit.anchor.prepared`) matches the intended irreversible-write
   boundary, or direct an alternative single fault point.
2. Confirm loose family-level (TransportError-or-SessionError) assertions
   for lost/malformed outcomes are acceptable, versus pinning codes the
   work order leaves transport-defined.

## Readiness and HOLD

QA source work is complete and role-scoped checks are green. No blockers
except the two review questions above (non-blocking; affected cases are
explicitly marked by rationale). **HOLD all owned source/build actions and
all execution pending coordinator source review and a named frozen relay.**
No S3–S5, actual writes, live services, `.pi`/settings changes, staging, or
commits. Target-window status: on track (no checkpoint/stop pressure asserted
at this milestone).
