# T06-S1 QA source-repair report R3 (independent, specification-derived)

- Role: independent QA for T06-S1 only. Coordinator: coordinator / w4:p2K
  (async Herdr milestone; no polling, no `--wait`).
- Normative basis: `docs/tasks/t06-s1-work-order.md` as the common
  decision-ready public contract (including all three clarification
  rounds: opaque refresh DATA with bearer-only header rule; prototype
  clock and binding getter support; detached entry snapshots;
  future-version-first ordering with no auth byte/depth caps;
  expired-refresh recheck at the immediate pre-commit boundary after
  owner-validation awaits; explicit `invalidate()` during an unresolved
  initial commit suppresses handoff exactly like signal cancellation
  while plain transition fencing still allows normal success), the R2
  and R3 source reviews
  (`docs/evidence/t06-s1-coordinator-qa-source-review-r2.md`,
  `docs/evidence/t06-s1-coordinator-qa-source-review-r3.md`), plus only
  the role-permitted references the order links. No production source,
  diffs, emitted JS contents, maps, private ADR, or Developer evidence
  touched.
- Toolchain (every command): `export T01_NODE_HOME=<provisioned dir>`;
  `export PATH="$T01_NODE_HOME/bin:$PATH"` — verified Node v24.21.0 /
  npm v11.19.0. No disposable-toolchain private path is recorded in this
  repo evidence.
- Status: PARTIAL (third revision plus the final pending-settlement
  safety patch below) executable specification-derived sources, static
  checks only. Not completed acceptance-source
  preparation and not execution evidence. Original 90-minute checkpoint
  / 120-minute stop still apply; the clock was not restarted. The named
  relay additionally waits for the repaired Developer candidate review
  (production C2 source gate passes and remains HELD separately; no
  implementation details were supplied to QA).

## 1. R3 repair disposition (three focused fixes, matrix unchanged)

1. Cancellation timing with bind-entry proof: the same-task abort case
   is now honestly described and asserted as prevention-before-commit
   only (`operation_interrupted`, no mutation, no permanent-fence
   claim). Mid-bind cancellation is proven by a small trusted
   profile-capability adapter (`makeBindGateOwner`) delegating every
   call to the actual isolated T04 owner: it observes the public
   `bindAccount` entry, holds the returned promise behind `release()`,
   and the test aborts/invalidates only after the declared storage
   entry is observed via the bounded wait helper. The owned commit is
   then released to finish safely; the test asserts suppressed success
   (`operation_interrupted`), permanent facade fence, and the
   *committed* same-account grant retained on explicit same-account
   reopen (bearer selectable) — never an empty-preauth rollback. An
   unresolved outer promise is never used as entry evidence. Two
   variants: abort-signal and explicit-invalidate, both through the
   gate.
2. Expiry synchronization without clock-call quota: the counting-clock
   case is removed. A mutable fixed clock plus a delegated
   `readVaultBytes` gate (`makeValidationGateOwner`, armed only after
   the initial open) observes owner-validation start, advances to the
   exact refresh boundary while that validation is unresolved, releases
   it, and asserts `reauthentication_required` without mutation. No
   clock-call count oracle anywhere.
3. Cleanup and request handling: `closeQuietly` (which swallowed all
   close failures) is deleted. `teardownAll` attempts every step and
   propagates the first failure; body-error precedence is preserved in
   the shared `withOwner`/`withLiveFacade` compositions and the gated
   install helper. The loopback composition tracks owned in-flight
   transport calls and, in finally, invalidates, releases the gate,
   settles tracked work via `Promise.allSettled`, then runs profile /
   facility / listener teardown — so a wait/assertion failure leaves no
   live work or unhandled rejection. Small local compositions only; no
   general cleanup/clock/interception framework.

## 1A. Final pending-settlement safety patch (no oracle changes)

Both gated 01 sites (validation-gate expiry recheck and
`gatedBindOutcome`) created their owned pending install before the entry
wait without immediate rejection handling: a `waitForDeadline`/assertion
failure could leave the install rejecting unobserved while
`gate.release()` let it race owner close/facility cleanup. Both sites now
attach an immediate rejection handler at creation and their failure-path
`finally` always releases the gate and settles that owned pending install
(`Promise.allSettled`) before closing its owner — the same tracked-work
principle already used in the loopback composition. No test, oracle, or
framework changes; oracles are byte-identical.

## 2. Source paths (QA-owned only, 4 JS sources)

- `test/unit/t06/helpers.mjs` — visibly synthetic fixtures, live clock,
  version-1/service-body builders, abort helpers, `captureRejection`,
  shared/detached byte fixtures, `teardownAll`, `makeBindGateOwner`,
  `makeValidationGateOwner`.
- `test/unit/t06/01-expiry-grant-oracles.test.mjs` — surface/version/
  identity, prototype clock, zero-length/null-grant vaults, 8-case
  `state_corrupt` table (issued identity), bound-owner grant-mismatch,
  future-version-first ordering, `invalid_grant` table, opaque-refresh
  DATA, zero-tail roundtrip, expired-refresh incl. equality and gated
  post-validation recheck, expired-access install-but-null, clock-on-use
  via install, prevented-before-commit abort, gated mid-bind
  abort/invalidate suppression with committed retention, full success
  path, replacement refusal.
- `test/unit/t06/02-session-fence-matrix.test.mjs` — `isCurrent`/
  idempotent `invalidate`, foreign/malformed bindings, pre-send/
  pre-delivery admit and abort/stale/foreign refusal, external-change
  fail-closed, detached snapshots, frozen bearer on six reads,
  mutation-route null, stale/foreign `operation_interrupted`,
  read/challenge/exchange admission, documented disallowed summaries,
  malformed/inconsistent `invalid_arguments`, no caller mutation.
- `test/fault/t06/commit-fence.test.mjs` — real diagnostic
  install/close/reopen with exact strings/binding/operations;
  pre-prepare fence case; real loopback-HTTPS bearer read, post-dispatch
  invalidation suppression, foreign-binding and mutation-route
  prevention with zero dispatch; tracked-request settling teardown.
- `docs/evidence/t06-qa-source-ready.md` — this file (evidence, not a
  JS source).

Target import path from `test/unit/t06` is
`../../../dist/auth/index.js`, authored against the settled public API
text. Facility use follows accepted T04 §9 (per-test
`createStorageTestFacility`, holders closed before `cleanup()`, no
pre-issued ticket). T05 composition uses accepted
`createBackendTransport` with S1 hooks and trusted `testCaPem`.

## 3. Scoped static results (explicit statuses, no masking)

- `node --check` on all 4 owned JS sources: PASS, exit 0 (4/4).
- Prettier `--check` on owned JS + this evidence doc: PASS, exit 0.
- ESLint on owned JS sources: PASS, exit 0.
- Text-only import/export resolver (reads specifier strings and
  QA-owned helper export lists; never imports target JS, never reads
  emitted-JS contents): exit 0. `vitest` resolves to declared
  devDependency 4.1.11; `./helpers.mjs` 25/11 names, fault helper
  references (1 + 4 + 10 names) resolve with zero missing; `dist/auth`,
  `dist/storage`, `dist/storage/test-facility`, `dist/http` paths
  verified present-by-path only, contents unread, execution deferred to
  the frozen relay.
- NOT run (CLOSED until the named frozen relay): `vitest`, any
  target/test/suite/provider/HTTP execution, `npm test/check`,
  installs, builds. No skipped gate is claimed as pass.

## 4. Concise risk checklist (owning assertion per risk)

1. Wrong-identity seeds/expectations — issued-identity derivation
   throughout; hardcoded profile UUID absent from test assertions.
2. Corrupt/future vault misread or migrated — corrupt table,
   version-first ordering, byte-preservation assertions.
3. Invalid service material admitted — `invalid_grant` table incl.
   sub-ms, duplication, coercion, backing.
4. Refresh spelling policed as authority — opaque-DATA acceptance.
5. Stale/expired credential selected — equality, gated post-validation
   recheck, expired-access null, no-grant null.
6. Expired refresh persisted — `reauthentication_required` no-mutation.
7. Bound-profile reinstall — same/other-account refusal, grant kept.
8. Commit-failure reuse or wipe — pre-prepare fence, safe error
   propagation, durable reopen.
9. In-flight cancellation/invalidate delivered — bind-gated
   suppression with fence and committed retention; prevention case
   claims prevention only; normal success unaffected.
10. Stale/foreign delivery or mutation credential — hook matrix plus
    T05 suppression/prevention with zero dispatch.
11. Caller-object reread or mutation — snapshot and no-mutation cases.
12. Mock-only boundary claimed as integration — real diagnostic
    facility and loopback-HTTPS composition, execution HELD; no
    personal provider; keyring absence uses the accepted diagnostic
    facility, not new qualification.
13. Teardown masking or leaked work — propagating `teardownAll` with
    body precedence; tracked-request settling; bounded waits only.

Out of scope in S1 (no S2 grant): refresh rotation/recovery/retry,
sign-out/replacement, account switching, lifecycle deletion,
uncertain-evidence cleanup, exhaustive permutations, any general
interception/harness framework. Recorded ambiguity (held, not guessed):
`SessionError` invalid-constructor-code behavior beyond the specified
`code` contract.

## 5. Active file inventory

- Owned: the 4 JS sources + this evidence doc in §2.
- Read (permitted): `AGENTS.md`; `docs/tasks/t06-s1-work-order.md`
  (incl. all clarification clauses); both coordinator QA source
  reviews (R2, R3); `docs/tasks/t06-sessions-refresh.md`; shared
  authentication (MCP + backend), `client-compatibility.md` wire types,
  OpenAPI `ServiceSession` excerpt, `auth-expiry-precision.md`;
  `t04-approved-storage-spec.md` §§3–4/§9 + `t04-private-storage.md`
  handoff; `t05-approved-transport-spec.md` §§2–5 +
  `t05-backend-transport.md` handoff; `proportional-testing-policy.md`;
  `package.json` engines/scripts; `vitest.config.ts` include line;
  `test/` listings; own QA helpers (`test/unit/t05/helpers.mjs`,
  `test/fault/t05/helpers.mjs` loopback/TLS/wait section,
  `test/fault/t05/loopback-tls.test.mjs` trust pattern,
  `test/fixtures/synthetic-vectors.mjs` provenance pattern).
- Not read/touched: `src/**`, `dist/**` contents, `*.map`,
  `*-implementation-adr.md`, Developer messages/evidence, coordinator
  task/status files, `.pi`, lockfiles, configs (no edits).

## 6. Questions for coordinator (async; affected work HELD)

- Q1 (relay): request source review of the 4 owned JS sources plus
  this evidence, then the named frozen hash inventory with exact active
  S1 command/file list before any execution. Public `.d.ts` use
  likewise after relay only; relay also awaits the repaired Developer
  candidate review.
- Q2 (selection): T05 regression selection and final S1 candidate scope
  remain relay work — no source blocker; ready to execute the relayed
  set.
- No live credentials, personal provider/backend, product writes, `.pi`
  edits, staging, commits, or S2 work undertaken.

## 7. Handoff statement

QA S1 R3 repair is COMPLETE to the permitted boundary: bind-entry and
validation-gate synchronization replace timing assumptions; cleanup
propagates while attempting all teardown and settling owned work;
role-scoped static checks and text-only import/export resolution PASS
with explicit statuses; no execution performed. All owned source
actions now HOLD pending the coordinator's frozen-relay review. No
required gate is skipped or counted as pass.
