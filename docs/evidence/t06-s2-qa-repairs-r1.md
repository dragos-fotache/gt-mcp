# T06-S2 QA r1 repair follow-up — revised source-ready

**Status: REVISED SOURCE-READY, HOLD.** This file follows the retained
initial readiness report (`t06-s2-qa-source-ready.md`, history preserved and
not rewritten) and answers the coordinator r1 review
(`t06-s2-coordinator-qa-source-review-r1.md`) plus the PUBLIC clarification
follow-up to the S2 work order. Only the three original `s2-` sources were
repaired; no new helper files, no S1/test/helper edits, no
dependency/script/config changes. No compiled-target, provider, HTTP, suite,
build, or install execution; no frozen relay. Readiness is not acceptance.

## Repair mapping (review R1–R8 + clarification obligations)

- R1 (real bound owner): the unit helper now establishes isolated bindings
  through the accepted S1 entry (install, invalidate, close, reopen on the
  returned binding) before any grant-state seed; genuinely pre-auth cases use
  a separate fresh-owner helper. Added zero-length-open coverage. The unknown
  integer version uses a matching binding with missing version-specific
  fields, so only the version gate can reject it.
- R2 (actually-malformed key): `PENDING_KEY` now contains alphabetic hex and
  the test asserts the uppercase variant differs before seeding.
- R3 (fault postconditions): the success-installation fault is now
  `commit.before.prepare` / `throw` / `occurrence: 2` (prepare is the first
  matching commit, success installation the second), expecting the original
  safe `StorageError io_failure` on a still-usable T04 owner with the AUTH
  facade permanently fenced and no further dispatch.
- R4 (reopened-owner cleanup): the fault harness now owns the CURRENT profile
  and facade through a teardown box (`h.profile`/`h.state` accessors), so
  close/reopen paths close the live holder before facility cleanup on every
  path; reopened facades are invalidated in-test.
- R5 (durability-before-dispatch): new commit-gate case holds the real prepare
  completion while asserting bounded no-dispatch, then compares the settled
  pending snapshot to the dispatched bytes/key; the older read-after-arrival
  case is kept as content proof only, with ordering claims removed.
- R6 (precise oracles): lost connection pins original `TransportError`
  `network_error`; invalid-JSON HTTP200 pins original `TransportError`
  `internal_error` (both with dispatched/attempts1/outcomeUnknown); valid-JSON
  invalid grant pins `SessionError invalid_grant`; every cancellation/
  invalidation path pins code `operation_interrupted` in either family via a
  shared assertion (in-flight invalidate no longer SessionError-exclusive).
- R7 (abort separation): one case shows a follower-local abort resolving
  promptly while leader and a live follower share one successful dispatch;
  another shows a leader abort observed by a still-live follower with
  `operation_interrupted`, pending retained, no late success.
- R8 (final-commit + returned-expiry boundaries): new case cancels during the
  held owned final commit (unresolved), asserting safe settlement, suppressed
  success, and the installed grant with no rollback; new
  expired-returned-refresh case pins `reauthentication_required` with pending
  retained and no installation.
- Clarification obligations: unit cases for transport-config capture before
  first await (synchronous caller mutation ignored; caller objects unmutated),
  unknown option-field rejection (`invalid_arguments`), valid-vault/bad-budgets
  safe `TransportError`, and expiry reached during awaited owner validation
  (mutable-clock + read-hold gate, no write/dispatch); fault success case
  mutates caller config post-open to prove captured copies; leader-abort
  non-settlement during the unresolved owned commit is asserted with a bounded
  unsettled observation. The both-invalid config/vault combination is
  deliberately untested (no specified total precedence).

## Corrected counts (no results invented)

- Initial report said 16 unit cases; the file actually held 19 `it`s at that
  revision (counting error now corrected, history retained).
- Revised totals: 23 unit + 4 durability + 12 concurrency/retention = 39 `it`s.
- Out of scope kept out: restart replay, second-key retry, follow-on
  rotation, 401 orchestration, lifecycle, crash-kill, cross-product or
  generalized-harness expansion.

## Reused fixtures

Accepted T04 diagnostic facility, T05 loopback TLS helpers/fixtures, S1 entry
for bound-owner setup, S1-style validation-gate adapter shape (local to the
unit file), and T05 `waitForDeadline` for deterministic observations. No new
production seams; no personal provider; teardown propagates first failures.

## Exact commands and results (checked toolchain)

Provisioned disposable `T01_NODE_HOME` with `PATH="$T01_NODE_HOME/bin:$PATH"`:
Node v24.21.0, npm v11.19.0 (confirmed; coordinator supplies the location
privately, not persisted here).

1. `node --check` on all three repaired files → CHECK-OK × 3.
2. Scoped ESLint on all three repaired files → clean.
3. Scoped Prettier `--write` then `--check` on all three repaired files →
   all use Prettier code style.
4. Source-only import-resolution probe (parses specifiers, stats relative
   paths, never imports compiled target JS): all relative imports resolve;
   all `dist/` specifiers match the S1-accepted pattern; `vitest` only
   otherwise → IMPORT-RESOLUTION-OK.

NOT run (CLOSED until named reviewed frozen relay): Vitest, builds,
typecheck-as-acceptance, any target/provider/HTTP execution, install.

## Changed paths (repair window only)

- EDIT `test/unit/t06/s2-version-expiry-validation.test.mjs` (19 → 23 cases)
- EDIT `test/fault/t06/s2-durable-dispatch.test.mjs` (3 → 4 cases + capture proof)
- EDIT `test/fault/t06/s2-concurrency-retention.test.mjs` (8 → 12 cases + box harness)
- ADD `docs/evidence/t06-s2-qa-repairs-r1.md` (this file)

Original `docs/evidence/t06-s2-qa-source-ready.md` preserved unmodified.

## Readiness and HOLD

Revised QA sources complete; role-scoped checks green. **HOLD all owned
source/build actions and all execution pending coordinator re-review and a
named frozen relay.** Open questions from the initial report are superseded by
the repairs above; no new blockers. No S3–S5, actual writes, live services,
`.pi`/settings changes, staging, commits, or automatic renewal. Checkpoint/
stop limits observed; no time pressure asserted at this milestone.
