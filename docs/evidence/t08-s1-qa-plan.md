# T08-S1 QA source-preparation plan (sources authored, NOT executed)

Original observation (preserved): initial 9-file source set and this plan were
written with no execution; the exact NEW `.mjs` list was relayed to the
Coordinator via herdr before any checks. Coordinator source gate r1 REJECTED
source readiness (no execution granted) with QA-private findings; the same nine
files were repaired in place (fail-closed prepared inputs, exact oracles,
complete OpenAPI-shaped fixtures, real metadata/file-safety and
held-response coordination sources, finally cleanup). No new filenames,
dependencies, or harness were added.

Authority: `docs/tasks/t08-s1-work-order.md`, `docs/decisions/t08-s1-runtime-spec.md`,
`docs/decisions/t08-s1-user-decisions.md`, standing `proportional-testing-policy.md`.
Shared MCP draft0.2 tools/authentication + backend v1 protocol; accepted T03–T06
public behavior as reference. S1 original config shape only (no S2 protocol field,
no SDK/stdio/login/create/journal).

## Status (current)

Source gate r1: READINESS REJECTED; repairs applied in the same nine files,
re-checked under the existing source-only static grant (no new names). No
runtime/fixture/provider/suite execution granted or performed. Static argv
approval was granted after the initial relay (see
`t08-s1-coordinator-qa-static-grant.md`); the "approval still pending" line
below is the preserved original observation, superseded by the results section.

Filenames (9 NEW, all under `test/read-runtime/`):

- `test/read-runtime/startup-config.test.mjs` — selection/schema/bounds, unconfigured behavior.
- `test/read-runtime/startup-ownership.test.mjs` — null-account/conflict/stale binding.
- `test/read-runtime/reads-success.test.mjs` — one meaningful success per six reads + no-mutation surface.
- `test/read-runtime/reads-pages-filters.test.mjs` — paging/filter/saved-list/own-draft/foreign-not-found.
- `test/read-runtime/canonical-errors.test.mjs` — exact revision, complete records, conservative errors.
- `test/read-runtime/validate-before-auth.test.mjs` — validation precedence, signal rules, writesEnabled safety.
- `test/read-runtime/cancel-close.test.mjs` — cancellation/fence/close/release.
- `test/read-runtime/fixtures.mjs` — visibly synthetic UUIDs/origin; complete
  OpenAPI-shaped expected records (incl. literal Int64-max revision, WorkoutSummary
  startedAt/revision, one nonempty ordered Routine aggregate with nullable set
  fields); raw-numeric wire builders for all six routes; deterministic
  `s1RelayResponder` (six routes + continuation + expired-token 410 +
  foreign 404 + refresh path); smallest isolated preparation
  (`prepareIsolatedProfile` via exact pre-auth capture, 0700 roots independent
  of umask, 0600 startup-pair writer, `prepareS1RelayFixtures` manifest
  builder, held-response HTTPS fixture).
- `test/read-runtime/helpers.mjs` — exact envelope assertions + requiredEnv
  BLOCKED-input guard, no generalized harness.

This file: `docs/evidence/t08-s1-qa-plan.md` (NEW).

## Risk matrix mapping (small, per work order)

| Requirement / risk | Covering source |
| --- | --- |
| Trusted selection/schema/access | startup-config |
| Existing owner/auth boundary | startup-ownership |
| Correct six reads | reads-success |
| Paging/filter/saved-list/own-draft/foreign-not-found | reads-pages-filters |
| Exact revision, metadata/file safety | canonical-errors (+ startup-config) |
| Validation-before-auth, signed-out/unconfigured guidance | validate-before-auth (+ startup-config/ownership) |
| Important errors (conservative mapping) | canonical-errors |
| Cancellation/durable close, fences/release | cancel-close |
| True writesEnabled exposes no mutation | reads-success + validate-before-auth |
| Inert imports/unchanged entries | reads-success surface assertion; Coordinator source audit owns remainder |

Deliberately out of scope: exhaustive cross-product, generalized harness,
dependency-suite duplication (T03/T05 matrices reused by reference), S2/S3
protocol/stdio, login/logout UX, creation/journal, cache/pagination workers,
real-backend ownership certification.

## Fixture/environment needs (concrete, unconfirmed — blockers, not assumptions)

- Isolated supported Linux/ext4 private profile + anchor roots with safe cleanup.
- Isolated real Secret Service bus (private dbus-run-session); no ambient/personal bus.
- Private fixture CA/HTTPS origin via trusted Node CA facility; accepted T04
  provision + T06 install APIs only for synthetic fixture preparation.
- Deterministic relay preparation: `prepareS1RelayFixtures({base, busAddress,
  origin, liveGrantBytes, expiredGrantBytes})` provisions+installs each case and
  returns the exact manifest below. Conflict = descriptor with a different valid
  profileGenerationId than the durable binding. Stale = internally valid
  same-origin descriptor snapshotted before grant installation (durable binding
  since advanced). Both are T04 storage-opening failures, hence
  recovery_unavailable per the clarified S1 section3 (schema/origin/config
  incompatibility before storage stays configuration_required).
- Isolated env entries (explicit, no defaults; missing BLOCKS):
  `GT_S1_CONFIGURED_CONFIG`, `GT_S1_SIGNED_OUT_CONFIG`, `GT_S1_CONFLICT_CONFIG`,
  `GT_S1_STALE_CONFIG`, `GT_S1_WRITES_CONFIG`, `GT_S1_EXPIRED_GRANT_CONFIG`,
  `GT_S1_ISOLATED_BASE`, `GT_S1_TEST_BUS`, `GT_S1_GRANT_BYTES_FILE`,
  `GT_S1_EXPIRED_GRANT_BYTES_FILE`, `GT_S1_FIXTURE_KEY_FILE`,
  `GT_S1_FIXTURE_CERT_FILE`.
- Relay HTTPS trust via `NODE_EXTRA_CA_CERTS` set for the test child process
  (never via production config); canned responses MUST match the literal
  `EXPECTED_*` values served through `s1RelayResponder` (raw numeric wire
  revisions, null catalogue revisions, terminal/nonterminal tokens).

## Source-only static results (r2 repair re-checks; every command exported the
privately supplied `T01_NODE_HOME` plus PATH prefix explicitly, Node 24.21.0 /
npm 11.19.0)

- Scope assert: exact 9/9 approved `.mjs` paths exist; no discovery/empty fallback.
- `node --check` per file: 9/9 pass (before and after formatting).
- ESLint (installed, exact nine argv): exit 0. Repairs: established
  `/* global ... */` convention, unused-var removal, exact-oracle rewrites.
  No rule relaxation.
- Prettier: scoped `--write` on the same exact nine, then `--check` passes.
- Static import resolution (source reads + file-existence + nonsecret
  package metadata only; no target import/require/execution): local
  helpers/fixtures, node: builtins, and accepted `dist/storage` + `dist/auth`
  entries resolve; `vitest` declared; `dist/runtime/index.js` honestly
  MISSING (Developer build pending) — blocked until build, no fake pass.
- R2 repairs re-checked: pre-auth capture install (no guessed account /
  generation), nullable-account skeleton support, 0700 roots, setup-error
  teardown + failure-preserving cleanup, begun-refresh/close + expired
  zero-request + wire-context tests, stale recovery_unavailable, positive
  metadata control, private-subtree absent path, nonempty aggregate wires.
- R4 safety correction re-checked: setup-failure teardown ALWAYS retains the
  scratch holding durable roots (owner release unestablishable on that path;
  listener closure is not release proof); failure summaries fixed/safe with no
  interpolated native detail; original failure observations preserved.
- R3 corrections re-checked: RoutineExercise exerciseName in expected + wire
  aggregates; lowercase q=synthetic with repeated effective search/filter/limit
  on continuation; explicit chmod + stat assert for unsafe 0644; shared
  relay-bus metadata across negative cases; positive unprovisioned control
  REQUIRES recovery_unavailable (no success branch); setup-teardown surfaces
  failures and keeps uncertain durable roots; special close tests reuse
  failure-preserving cleanup with guaranteed gate release; begun-refresh
  requires observed POST /v1/auth/refresh with reopen proof (refresh
  placeholder is not a grant-validity claim).
- Evidence hygiene: no private paths/credentials/IDs/bodies in repo evidence
  (verified by grep; `$T01_NODE_HOME` placeholder only).
- Narrow abort-reason regression (reopened source-only window, common S1
  section 4 requirement only): two cases added SOLELY to
  `validate-before-auth.test.mjs` — arbitrary `abort(reason)` values
  (string/number/null/boolean/object) each yield exactly
  `operation_interrupted` with retryable true, and a throwing-getter reason
  object proves reason properties are never inspected. Existing assertions
  and the other eight files unchanged. One-file static argv (explicit
  `T01_NODE_HOME` export, Node 24.21.0): node --check, eslint, and prettier
  --check all pass with no --write needed. No execution; source hashes await
  separate superseding review.

## Toolchain deviation (preserved; KNOWN vs UNKNOWN)

- KNOWN: the first static invocation used the grant loop with only
  `export PATH="$T01_NODE_HOME/bin:$PATH"` while `T01_NODE_HOME` was UNSET
  in that shell (verified afterward); observed `node --version` v26.11.1 and
  `npm --version` 12.2.0. Under that toolchain the scope assert passed and
  `node --check` passed 9/9. Those phases are read-only; no file was modified
  by them and their output was not claimed as pinned-toolchain evidence.
- KNOWN: every later phase (scope/syntax/lint/format/resolution, both rounds)
  ran with `T01_NODE_HOME` explicitly exported plus PATH prefix, verified as
  Node v24.21.0 / npm 11.19.0 each round.
- UNKNOWN: any behavioral difference the system toolchain would have made to
  the read-only check outputs beyond the recorded versions; no retrospective
  reconstruction is attempted. The pinned reruns do not erase this deviation.
- Procedure: every future Node/npm command explicitly exports the privately
  supplied `T01_NODE_HOME` value plus PATH prefix; inheritance is never
  assumed. The actual private location stays out of repo evidence.

No Vitest/suite/smoke/install/build/compiled-import/fixture/provider/HTTPS
 runs. HOLD at source/static readiness pending frozen-relay + isolated env.

## Limits

- No executed evidence claimed. R1-requested static scope only; the
  Coordinator-approved exact source-only argv stands (no new names).
- No production source/diff/map reads; only specs, nonsecret package metadata,
  and permitted compiled public `.d.ts` listing performed.
- No private paths/IDs/tokens/bodies in repo evidence; placeholders only.
- Window: first bounded 60–90 min; checkpoint 90; stop 120 with honest partial
  handoff; HOLD at source/static readiness; no S2/context renewal/real writes.
