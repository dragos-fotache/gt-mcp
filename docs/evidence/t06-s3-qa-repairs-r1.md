# T06-S3 QA repairs r1 — scoped response to coordinator source review

**Status: REPAIRED, HOLD.** Targeted repairs to the four new S3 files only,
answering `docs/evidence/t06-s3-coordinator-qa-source-review-r1.md` (NOT
source-approved). No accepted-test/helper/config edits, no execution. Initial
source-ready findings/counts are retained as history; this file reports actual
revision, limits, and corrected prose — no retrospective executed pass.

## Authority and boundaries

- Repair grant: four NEW S3 files (`test/unit/t06/s3-helpers.mjs`,
  `test/unit/t06/s3-recover-validation.test.mjs`,
  `test/fault/t06/s3-replay-recovery.test.mjs`,
  `test/fault/t06/s3-concurrency-fences.test.mjs`) plus QA evidence. Role: QA.
- Read for adjudication: the r1 review, the clarified common S3 work order
  (step 8 terminal shared-outcome post-clock semantics), existing QA T06/T05
  helpers, own new S3 sources. NEVER read: production review/ADR/source,
  production diffs, emitted JS/maps, Developer reports.
- `test/unit/t06/s3-recover-validation.test.mjs` is byte-identical to the r0
  source-ready revision (no unit finding in r1).

## R1-1 — TLS capture-record misuse (FIXED)

Accepted `test/fault/t05/helpers.mjs` `startLoopbackHttps` invokes
`handler(rawReq, rawRes, captureRecord)` with request bytes on
`captureRecord.body`. The r0 S3 wrappers discarded the third argument and
responders parsed `req.body` (undefined → orphan throw, not a product
assertion). Both fault files now use `(req, res, record)` with
`record.body`, route responder exceptions into a per-case
`handlerFailures` list that the owning test rethrows as its body failure,
and destroy the socket safely on handler failure so no event-callback
throw escapes. All in-responder `expect` calls moved into test bodies over
the captured `requests` bytes. Accepted helper untouched.

## R1-2 — gates/settlement/teardown on all paths (FIXED)

Both fault files now share the hardened postlude pattern (local per-file
case rigs, not a general framework): every response/commit gate registers
in `gateReleases` and releases on ALL paths BEFORE owned-work settlement;
tracked facade/storage promises settle (observed, never force-killed)
before teardown steps (invalidate → close → cleanup → closeServer); a
secondary teardown failure is reported alongside the primary body failure
via the new `combineFailures` helper (`AggregateError` when both exist),
instead of the r0 body-first throw that hid teardown errors. Gated tests
register their response releases explicitly, so an assertion/wait failure
can never leave a held gate hanging teardown.

## R1-3 — durable ordering + owned-commit cancellation (ONE combined case)

The r0 commit-argument spy is retained but relabeled honestly as
invocation-order evidence only. Added ONE combined public-capability gate
case (`s3-replay-recovery`: "held install acknowledgement blocks
prepare/dispatch/settlement; abort during hold retains install"): the real
isolated recovered-install commit runs immediately while its
acknowledgement to the facade is held; the test observes the ACTUAL
durable recovered grant/pending-null through the real owner
(`waitForVaultRecord`, new small helper — public storage bytes, no private
sync points, no clock quotas), establishes no distinct prepare/dispatch
(one replay request, pending null) and no leader settlement while held,
aborts the leader mid-hold (still unsettled: cancellation waits safely
for the owned acknowledgement), then releases and asserts interruption
with the installed grant retained, binding unchanged, and no rollback.
Gates release on every path; the begun durability action is never
abandoned or force-killed.

## R1-4 — post-clock regression + 409 retention (TWO cases, work-order step 8)

Common work order step 8 now clarifies: terminal shared-cycle success
rechecks cancellation/fence AFTER any trusted epoch-clock callback, so a
leader abort during that callback yields the shared
`operation_interrupted` outcome for nonaborted followers too, with
already-installed grants retained. Added ONE regression
(`s3-concurrency-fences`: "post-clock leader abort shares interruption
with a live follower after durable install"): the rotation success commit
runs really while its acknowledgement is held; durability (rotated grant +
pending-null) is observed first; only then is the clock armed (aborts the
leader while returning live time — arming while suspended makes landing
deterministic without call quotas); on release both leader and nonaborted
follower report `operation_interrupted`, with no third dispatch and no
rollback. Added ONE definite-conflict case (`s3-replay-recovery`: 409
`idempotency_key_reused`): safe T05 TransportError (dispatched, one
attempt), original durable token/body/key unchanged, explicit repeat keeps
original identity with the same key, never settlement or rekey. No
exhaustive status campaign; lost-response cases alone did not cover this
definite-error decision.

## Honest correction to r0 prose

The r0 source-ready evidence claimed post-clock coverage by "one
representative clock/abort case" — no such case existed in the r0 sources.
That claim is struck in place (marked CORRECTION) and superseded by the
real regression above. Nothing was executed or passed at any point; all
counts below are authored-case inventory, not results.

## Evidence hygiene

The r0 evidence embedded the prompt-only provisional absolute toolchain
path. Redacted in place to the provided `T01_NODE_HOME` variable form
with `PATH` and pinned versions; provisional filesystem locations are not
deliverable evidence.

## Revised checklist and counts

| File | Cases | Delta vs r0 |
|---|---|---|
| `test/unit/t06/s3-helpers.mjs` | helper (`combineFailures`, `waitForVaultRecord` added) | +2 helpers |
| `test/unit/t06/s3-recover-validation.test.mjs` | 16 | unchanged |
| `test/fault/t06/s3-replay-recovery.test.mjs` | 10 (spy-order, install-ack gate, gap, no-loop, loss×2, 409, account, precision, JSON) | +2 (gate, 409) |
| `test/fault/t06/s3-concurrency-fences.test.mjs` | 7 (share, follower-abort, leader-abort, post-clock, mixed-kind, foreign/malformed, flight-fence) | +1 (post-clock) |

Total authored: 33 cases (r0: 30) + shared S3 helper. Accepted S1/S2 files
remain byte-identical (no accepted-helper edits).

## Exact commands and results (checked toolchain)

Provided disposable `T01_NODE_HOME` with `PATH="$T01_NODE_HOME/bin:$PATH"`
→ Node v24.21.0, npm 11.19.0 (confirmed; no ambient/system fallback).

1. `node --check` on all four new files → CHECK-OK × 4.
2. Scoped ESLint on all four new files → clean (one `no-redeclare`
   finding on an over-declared builtin global fixed by removing it from
   the globals comment; final ESLINT-OK).
3. Scoped Prettier `--write` then `--check` (four new files) → all use
   Prettier code style; ESLint + `node --check` re-verified after.
4. Source-only import-resolution probe (parses specifiers, stats relative
   paths, never imports compiled target JS) → IMPORT-RESOLUTION-OK.

NOT run (CLOSED until named frozen relay): `vitest`, `npm run test/smoke/
typecheck/lint/build`, any target/provider/loopback execution, install.

## Changed paths (this repair)

- EDIT `test/unit/t06/s3-helpers.mjs` (add `combineFailures`,
  `waitForVaultRecord`)
- EDIT `test/fault/t06/s3-replay-recovery.test.mjs` (R1-1/R1-2 rework, R1-3
  gate case, 409 case)
- EDIT `test/fault/t06/s3-concurrency-fences.test.mjs` (R1-1/R1-2 rework,
  R1-4 post-clock case)
- EDIT `docs/evidence/t06-s3-qa-source-ready.md` (toolchain redaction,
  clock-prose correction only)
- ADD `docs/evidence/t06-s3-qa-repairs-r1.md` (this file)

Unit validation file untouched. No other suite touched.

## Readiness and HOLD

Repairs are complete and role-scoped static checks are green. No open
blockers. **HOLD all owned source/build actions and all execution pending
coordinator source re-review and a named frozen relay.** No S4/S5, actual
writes, live services, `.pi`/settings changes, staging, or commits.
