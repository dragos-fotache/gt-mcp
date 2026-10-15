# T06-S3 QA source-ready — bounded independent test-source preparation

**Status: SOURCE-READY, HOLD.** New S3 test sources authored from the settled
S3 work order and its PUBLIC references only. No compiled-target, provider,
HTTP, or suite execution performed; no build/install. Awaiting coordinator
review and a named frozen relay before any execution. S1/S2 assertions and
all other suites preserved (additions only, no edits outside the S3 grant).

## Authority and boundaries

- Work order: `docs/tasks/t06-s3-work-order.md` (S3 ONLY; S1/S2
  accepted/closed, S4/S5 unassigned, parent T06 incomplete). Role: QA.
- Read: AGENTS.md QA rules, the S3 work order, S1/S2 work orders and S1/S2
  handoffs, T04/T05 approved PUBLIC specs, shared MCP/backend
  auth/precision/client-compat, proportional-testing policy,
  agent-coordination, nonsecret `package.json`, own existing QA
  sources/helpers/fixtures, S3 coordinator start evidence.
- NEVER read: production source/diffs, emitted JS/maps, private ADR,
  Developer reports, production reviews.
- Write scope respected: only `s3-`-prefixed files under `test/unit/t06/`,
  `test/fault/t06/`, and this `docs/evidence/t06-s3-qa-*.md` file. No
  dependency/script/config changes, no accepted-helper edits.

## Short risk/file checklist (smallest meaningful set)

| # | Core risk (work-order requirement) | File | Layer |
|---|------------------------------------|------|-------|
| 1 | Seven-export surface (new `openRecoverableRefreshSessionState` + six preserved; version constants 1/2); read-only open of cleared empty/v1/v2 without migration | `test/unit/t06/s3-recover-validation.test.mjs` (16 cases) + `test/unit/t06/s3-helpers.mjs` | unit, no network |
| 2 | Recover entry gates: no-grant `authentication_required`; aborted/foreign/invalidated `operation_interrupted`; malformed `invalid_arguments`; live-grant read-only no-op; expired-refresh `reauthentication_required` with no commit; pending blocks fresh `rotateRefresh`; config origin/capture/bad-budget guards | same unit file | unit, no network |
| 3 | Exact replay after lost response + close/reopen: original durable body/key reused even with locally expired predecessor deadline; live recovered grant installs with pending-null; operation bytes preserved | `test/fault/t06/s3-replay-recovery.test.mjs` (8 cases) | fault, T04 diagnostic + loopback HTTPS |
| 4 | Recovered install BEFORE one distinct rotation (commit-order spy: install → prepare → success); new request uses recovered token + distinct canonical key; at most two control attempts; no-pending restart gap rotates once after reopen; expired-access fresh result installs then reports `reauthentication_required` without looping | same fault file | fault, real persistence + HTTPS |
| 5 | Failed replay retains ORIGINAL evidence, never rekeys: lost-response repeats share identical body/key; different-account and legacy-precision pin `invalid_grant`; invalid-JSON pins TransportError `internal_error`; predecessor spellings preserved | same fault file | fault, loopback HTTPS |
| 6 | Shared entire cycle (replay + optional rotation) across concurrent valid callers; follower abort stays local; leader abort observed by live follower with evidence retained; mixed-kind overlap rejects `operation_interrupted` without joining/queuing/fencing; foreign/malformed never join or damage valid callers; invalidation-during-flight suppresses late success with no rollback | `test/fault/t06/s3-concurrency-fences.test.mjs` (6 cases) | fault, loopback HTTPS |

Deliberately out of scope (per work order): resource 401/read/write
orchestration, sign-out/replacement/logout/supersession, login/browser,
CLI/MCP/config wiring, journal parsing/cleanup, autonomous recovery worker,
new provider/transport seam, real backend/host/release claim, crash-kill
campaign, exhaustive fault cross-products, generalized harness,
comprehensive import-interception, power-loss proof, OS sandbox claim.
CORRECTION (r1): the r0 sources contained no clock/abort case despite this
paragraph's wording — no post-clock fence placement was covered. R1 repairs
add ONE post-clock leader-abort/shared-follower regression on the public
durable fresh-result boundary (see `docs/evidence/t06-s3-qa-repairs-r1.md`);
remaining fence/privacy depth stays with coordinator source audit, not an
exhaustive timing matrix. The seven-export inert-import smoke runs at relay
(coordinator-owned, S2-pattern) alongside source audit.

## Reused fixtures (no new production seams)

- `test/unit/t06/helpers.mjs` (synthetic clocks, signals,
  `captureRejection`, `teardownAll`) — read only, unmodified. S3 seeds use
  the disjoint synthetic origin `https://t06-s3-qa.example.invalid` and
  S3-specific synthetic accounts/tokens/expiries from the new
  `test/unit/t06/s3-helpers.mjs` (pending/body/key builders, version2
  record serializer, service-body factory — small new helper, no accepted
  file changed).
- Accepted T04 diagnostic facility (`createStorageTestFacility`) for the
  persistence boundary; accepted T05 loopback TLS helpers
  (`startLoopbackHttps`, `closeServer`, `waitForDeadline`,
  `readFixtureBytes`) and test-only cert/key fixtures for the HTTPS
  boundary. Bound owners established through the accepted S1 entry
  (install/close/reopen); vault seeds serialized by the tests, never by
  production. Fixture roots owned by the diagnostic facility; no
  HOME/TMPDIR overrides; teardown propagates the first failure via
  `teardownAll` without masking body errors.

## Exact commands and results (checked toolchain)

Toolchain: provided disposable `T01_NODE_HOME` with
`PATH="$T01_NODE_HOME/bin:$PATH"` → Node v24.21.0, npm 11.19.0 (confirmed;
no ambient/system fallback used).

1. `node --check` on all four new files → CHECK-OK × 4.
2. `./node_modules/.bin/eslint` (scoped, four new files) → ESLINT-OK, clean
   (no findings; final re-run after format).
3. `./node_modules/.bin/prettier --write` then `--check` (scoped, four new
   files) → all files use Prettier code style (three test files reformatted
   once; post-format ESLint + `node --check` re-verified green).
4. Source-only import-resolution probe (parses specifiers, stats relative
   paths, never imports compiled target JS): all relative imports resolve
   (`./helpers.mjs`, `./s3-helpers.mjs`, `../t05/helpers.mjs`,
   `../../unit/t06/helpers.mjs`, `../../unit/t06/s3-helpers.mjs`); all
   `dist/` specifiers use the accepted pattern (`dist/auth`,
   `dist/storage`, `dist/storage/test-facility`, `dist/http`); `vitest`
   only otherwise → IMPORT-RESOLUTION-OK.

NOT run (CLOSED until named frozen relay): `vitest`, `npm run test/smoke/
typecheck/lint/build`, any target/provider/loopback execution, install.

## Changed paths

- ADD `test/unit/t06/s3-helpers.mjs`
- ADD `test/unit/t06/s3-recover-validation.test.mjs`
- ADD `test/fault/t06/s3-replay-recovery.test.mjs`
- ADD `test/fault/t06/s3-concurrency-fences.test.mjs`
- ADD `docs/evidence/t06-s3-qa-source-ready.md` (this file)

S1/S2 files (`01-expiry-grant-oracles`, `02-session-fence-matrix`,
`s2-version-expiry-validation`, `commit-fence`,
`s2-durable-dispatch`, `s2-concurrency-retention`, `helpers.mjs`)
untouched; no other suite touched.

## Concrete ambiguity / questions for coordinator

1. The no-pending restart-gap case seeds the durable gap grant directly
   (recovered-equivalent expired-access/live-refresh, pending-null) then
   closes/reopens before recovery, rather than killing a cycle mid-flight
   (no crash-kill campaign per work order). Confirm this is the intended
   volatility-independence proof.
2. The single commit/fence boundary exercised is invalidation-during-flight
   (suppresses late success, retains pending, no rollback, no extra
   dispatch). Leader-abort-during-owned-commit and storage-failure fencing
   are deferred to relay-directed selection if the coordinator wants a
   second boundary. Confirm one boundary suffices for source approval.
3. Mixed-kind overlap expects `rotateRefresh` → `operation_interrupted`
   while the active `recoverRefresh` leader still succeeds (live-access
   clock, exactly one request). Confirm this matches the intended
   S4-deferred bound (reject without joining, queuing, cancelling, or
   fencing the leader).

## Readiness and HOLD

QA source work is complete and role-scoped static checks are green. No
blockers except the three review questions above (non-blocking; affected
cases are explicitly marked by rationale). **HOLD all owned source/build
actions and all execution pending coordinator source review and a named
frozen relay.** No S4/S5, actual writes, live services, `.pi`/settings
changes, staging, or commits. Target-window status: on track at source
milestone (no checkpoint/stop pressure asserted here).
