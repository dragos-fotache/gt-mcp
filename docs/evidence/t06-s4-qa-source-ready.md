# T06-S4 QA source-ready — bounded independent test-source preparation

**Status: SOURCE-READY, HOLD.** New S4 test sources authored from the settled
S4 work order and its PUBLIC references only. No compiled-target, provider,
HTTP, or suite execution performed; no build/install. Awaiting coordinator
review and a named frozen relay before any execution. S1/S2/S3 assertions and
all other suites preserved (additions only, no edits to any existing file).

## Authority and boundaries

- Work order: `docs/tasks/t06-s4-work-order.md` (S4 ONLY; S1–S3
  accepted/closed, S5 unassigned, parent T06 incomplete). Role: QA.
- Read: AGENTS.md QA rules, the S4 work order, S1/S2/S3 work orders and the
  S3 handoff, T04/T05 approved PUBLIC specs, shared MCP/backend
  auth/precision/client-compat docs, proportional-testing policy,
  agent-coordination, nonsecret `package.json`, own existing QA
  sources/helpers/fixtures.
- NEVER read: production source/diffs, emitted JS/maps, private ADR,
  Developer reports, production reviews.
- Write scope respected: only `s4-`-prefixed files under `test/unit/t06/`,
  `test/fault/t06/`, and this `docs/evidence/t06-s4-qa-*.md` file. No
  dependency/script/config changes, no accepted-helper edits. Only four new
  files were created; zero existing files modified.

## Short risk/file checklist (smallest meaningful set)

| # | Core risk (work-order requirement) | File | Layer |
|---|------------------------------------|------|-------|
| 1 | Eight-export surface (new `openAuthenticatedSessionState` + seven preserved; version constants 1/2; no new SessionError code); read-only open of empty/v2 without migration; entry gates (`authentication_required` / `invalid_arguments` / `operation_interrupted`); nine-methods-plus-binding-plus-invalidate ONLY; local route-arg rejection before dispatch; config origin/capture/invalid-maxAttempts guards; synchronous idempotent invalidate | `test/unit/t06/s4-auth-session-validation.test.mjs` (14 cases) + `test/unit/t06/s4-helpers.mjs` | unit, no network |
| 2 | Ordinary live-grant read with current bearer and zero refresh; expired-access preflight with exactly one durable fresh rotation before dispatch; pending restart exact replay (original body/key) before bearer dispatch with no fresh rotation; valid 401 → durable same-account refresh → ONE retry with byte-identical mutation body, same resource key, changed bearer only; repeated 401 → `reauthentication_required` with no further replay; malformed 401 (mismatched code) and noneligible 403 preserved with zero auth dispatch; resource loss preserves `network_error` dispatched/outcomeUnknown uncertainty with zero auth replay | `test/fault/t06/s4-refresh-retry.test.mjs` (8 cases) | fault, T04 diagnostic + loopback HTTPS |
| 3 | Three concurrent 401s share exactly one rotation; delayed older-401 reuses the installed successor (gated refresh proves no second rotation); follower abort stays local while leader succeeds; leader abort propagates interruption to live followers with pending evidence retained; invalidate-in-flight suppresses late success with no rollback; representative unresolved auth (429 rate-limit, legacy nonzero sub-ms precision) → `reauthentication_required` with evidence retained and no resource retry; foreign caller rejected with zero requests observed | `test/fault/t06/s4-concurrency-fences.test.mjs` (8 cases) | fault, loopback HTTPS |

Total: 30 new cases across 3 suite files + 1 helper. One representative
mutation (`createDraft`) covers bytes/resource-key identity; routes are not
permuted. Concurrency order is forced through response gates and observed
request counts, never timing assumptions.

Deliberately out of scope (per work order): trusted sign-out/replacement/
logout/supersession, browser/login, CLI/MCP wiring, config loader/
writesEnabled guard, journals/creation workflow, caching, cleanup, new
provider/transport seam, arbitrary route/header/sender, account adoption,
shared-contract change, product writes, crash-kill campaign, exhaustive
fault cross-products, generalized harness, comprehensive interception
proof, OS sandbox claim, power-loss proof.

The eight-export inert-import smoke runs at relay (coordinator-owned,
S2/S3-pattern) alongside source audit. Final relay selection (per work
order): ALL new S4 owning suites, ALL accepted S1–S3 owning suites,
directly relevant unchanged T04 unit suites and T05 hooks suite
`04-hooks-fences-dispatch.test.mjs`.

## Reused fixtures (no new production seams)

- `test/unit/t06/helpers.mjs` (synthetic clocks, signals,
  `captureRejection`, `teardownAll`) — read only, unmodified. S1-entry
  bound-owner pattern reused verbatim (install/invalidate/close/reopen).
- New `test/unit/t06/s4-helpers.mjs` (disjoint synthetic origin
  `https://t06-s4-qa.example.invalid`, S4 accounts/tokens/expiries, v2
  record/pending builders, ServiceSession factory, canonical-UUID shape,
  minimal exact `createDraft` body, teardown failure combiner) — small new
  helper, no accepted file changed. Dist-free pure builders.
- Accepted T05 unit helpers (`bundledExerciseWire`, `searchPageWire`,
  `routineWire`) for valid loopback success bodies; accepted T05 fault
  helpers (`startLoopbackHttps`, `closeServer`, `readFixtureBytes`,
  `waitForDeadline`) and test-only cert/key fixtures for the HTTPS
  boundary. Vault seeds serialized by the tests and committed through the
  public diagnostic owner, never by production. Fixture roots owned by the
  diagnostic facility; no HOME/TMPDIR overrides; teardown propagates the
  first failure via `teardownAll`/`combineS4Failures` without masking body
  errors; loopback responder failures are captured into the owning test.

## Exact commands and results (checked toolchain)

Toolchain: explicitly exported disposable `T01_NODE_HOME` with
`PATH="$T01_NODE_HOME/bin:$PATH"` on EVERY command → Node v24.21.0, npm
11.19.0 (confirmed; no ambient/system fallback used).

1. `node --check` on all four new files → CHECK-OK × 4.
2. `./node_modules/.bin/eslint` (scoped, four new files) → ESLINT-OK, clean
   (two findings fixed: unused `/* global */` names removed, empty
   `catch {}` blocks documented; final re-run clean).
3. `./node_modules/.bin/prettier --write` then `--check` (scoped, four new
   files) → all files use Prettier code style (three test files reformatted
   once; post-format ESLint + `node --check` re-verified green).
4. Source-only import-resolution probe (parses `from` specifiers, stats
   relative paths, zero module loads) → IMPORT-RESOLUTION-OK: 21
   specifiers; all QA-relative paths exist; `vitest` external; `dist/*`
   paths resolve as relay targets (stat only, never imported/executed).
5. `git status --porcelain` → only the four new files (plus pre-existing
   untracked tree); zero modifications to accepted S1–S3 tests/helpers or
   any other file.

No suite, fixture, loopback, provider, build, or install execution was
performed. Sources HELD for coordinator review; readiness is not
acceptance.

## Ambiguities / fixture needs

None blocking source preparation. One observation for the relay (not a
defect): the leader-cancellation follower-interruption oracle and the
delayed-older-401 single-rotation oracle assert the work order's specified
serialized-controller behavior literally; if the reviewed implementation
settles these differently, that is a specification-level question for the
coordinator, not a QA-side weakening — affected cases will be held, not
edited to fit.
