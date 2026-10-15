# T06-S4 QA repairs r2 — remaining blockers repaired + readiness (next review)

**Status: REPAIRED, HOLD.** R2 blockers repaired source-only in the same
four NEW s4 files; no execution performed; awaiting next source review. The
initial readiness report, the r1 review, and the r1 repair report are
preserved historical; this NEW report describes only the r2 delta and
corrects the claims r2 rejected. No frozen relay or execution grant;
readiness is not acceptance.

## Authority and boundaries

- Repair grant: `docs/evidence/t06-s4-coordinator-qa-source-review-r2.md`
  (R2-Q1–Q4) under the settled work order + common interface adjudication.
- Read: the r2 review, the adjudication, the updated work order, own four S4
  sources, accepted QA helper contracts (T05 unit/fault helpers, T06 unit
  helpers incl. the public-owner adapter pattern and S3 commit-ack usage).
  NEVER read: production source/diffs, emitted JS/maps, private ADR,
  Developer reports/messages, production reviews.
- Write scope: the same four NEW s4 files (two fault files edited; unit
  file and helper untouched — no finding required it) + this NEW evidence
  file. Zero accepted helpers/tests and zero other files touched.

## Repairs by r2 item

| # | R2 blocker | Repair (paths) |
|---|-----------|----------------|
| Q1a | Only responders tracked; facade promises unowned on failure paths | Both fault harnesses expose `ctx.launch(promise)`: registers every launched facade promise immediately with attached rejection handling, returns the ORIGINAL promise so `captureRejection`/await assertions observe unaltered outcomes, and awaits `Promise.allSettled([...inFlight, ...owned])` on teardown. All facade invocations in all fault bodies now go through `launch` |
| Q1b | Staged unanswered responses not released; matching calls unowned | fault02 stages via `gates.stage/unstage`; teardown destroys any still-staged response socket and the matching calls are `launch`-owned, so socket destruction settles them into the owned set instead of stranding them past owner close |
| Q1c | Losing `Promise.race` waits not cancelled; secondary handler errors dropped | `gates.waitFor` is now a locally-owned cancellable wait (single outstanding timer per wait, cleared on settle/cancel; release cancels every active wait; no lingering polling). All responder AND body waits use it. Teardown folds body + responder + deferred + server + teardown failures (single throw, else `AggregateError`) — a responder failure alongside a body failure stays visible |
| Q1d | Deferred/commit releases missing on failure paths | `gates.defer` runs every registered cleanup (e.g. commit-gate release) on ALL paths before settlement/close; teardown order is release gates → destroy staged → deferred → closeServer → await owned → invalidate/close/cleanup. No durability-critical action is force-killed: releases precede settlement awaits |
| Q2 | Commit gate held pre-invocation, not a real acknowledgement | `makeCommitGateOwner.commit` now STARTS and independently tracks the REAL `owner.commit` immediately and holds ONLY the facade-visible acknowledgement. The test arms the gate after the refresh request is observed (prepare provably complete), holds the refresh response until armed, then: awaits the real commit independently (bounded diagnostic), reads the REAL owner's vault WHILE the ack is held to prove the rotated successor + pending-null already installed, proves no retry and no leader/follower settlement during the hold (bounded), aborts the leader at the boundary, releases, and proves both interrupted with installed state retained and no retry ever dispatched. Release is `gates.defer`-registered so failure paths cannot strand the ack |
| Q3a | Triple-401 count assumed unstaged scheduling | Rewritten as a staged three-leg cohort: each call launched only after the previous leg staged, all three 401s released after the full cohort staged (no cycle exists before release, so each arrival legitimately dispatches). Oracles: 3 old 401s, exactly 1 refresh, 6 sends, all succeed, all 3 retries on the rotated bearer |
| Q3b | Leader identity inferred from order; join before abort unproven | Leader-cancel case now sequences the intended leader's arrival BEFORE any other call exists; its released 401 provably starts the cycle (refresh observed while no other leg exists); the follower is launched during held auth and must join with ZERO second dispatch (bounded check, reusing the local-abort pattern); abort, release, both interrupted, still exactly 1 refresh after a bounded no-new-leader wait, pending retained. Delayed-401 oracle retained as repaired (sequential staging, release past durable install + leader retry, no second rotation) |
| Q4 | External `.invalid` mutation destination | Config-capture sentinel is now the syntactically invalid non-network string `"not-an-origin-sentinel"`: any re-read of caller config fails locally without DNS, while the second call still succeeds against the captured owned loopback destination (loopback host + path asserted on both legs) |

## Revised checklist and honest counts (33 cases + helper, unchanged totals)

- `test/unit/t06/s4-helpers.mjs` — untouched (no r2 finding).
- `test/unit/t06/s4-auth-session-validation.test.mjs` — untouched, 12 cases
  (no r2 finding; still exact namespace/facade keys, byte-identical empty
  open, coded errors, either-brand gates).
- `test/fault/t06/s4-refresh-retry.test.mjs` — 12 cases, harness reworked
  (launch registry, cancellable waits, staged/commit-gate release, error
  folding, non-network sentinel); case oracles unchanged.
- `test/fault/t06/s4-concurrency-fences.test.mjs` — 9 cases: real held-ack
  commit case with durable-while-held read; staged triple cohort;
  sequenced leader/follower; retained delayed-401, local-abort,
  invalidate, 429, legacy-precision, foreign-caller oracles.
- Reused, unmodified: `test/unit/t06/helpers.mjs`, T05 unit wire builders,
  T05 fault loopback helpers + test-only cert fixtures.

Still out of scope: sign-out/replacement/logout, browser/login, CLI/MCP
wiring, config loader guard, journals/creation, caching/cleanup, new
seams/routes, account adoption, contract changes, product writes,
crash-kill, cross-products, general harness, interception proof,
sandbox/power claims. Import smoke stays coordinator-owned. No new
cases/matrix were added for r2 (one case reworked in place, one oracle
strengthened in place); counts are authored, not executed/passed.

## Exact static commands and results (pinned toolchain)

Every command with explicitly exported disposable `T01_NODE_HOME` and
`PATH="$T01_NODE_HOME/bin:$PATH"` → Node v24.21.0, npm 11.19.0; no
ambient/system fallback.

1. `node --check` on all four files → CHECK-OK × 4.
2. `./node_modules/.bin/eslint` (scoped, four files) → ESLINT-OK clean
   (six findings fixed: undeclared `clearTimeout`/`setTimeout` globals
   declared, useless initializers, one missing `gates` destructure, one
   uncommented empty catch; final re-run clean).
3. `./node_modules/.bin/prettier --write` then `--check` (scoped, four
   files + this report) → all use Prettier code style.
4. Source-only import-resolution probe (parses `from` specifiers, stats
   relative paths, zero module loads) → IMPORT-RESOLUTION-OK (23
   specifiers; all QA-relative paths exist; `vitest` external; `dist/*`
   stat-only relay targets, never imported/executed).

No suite, fixture, loopback, provider, build, or install execution was
performed. Sources HELD for next review.

## Adjudication delta review (no source change required)

A later common clarification restated, without new API or fixture
changes: at most ONE shared auth cycle per preflight/reactive stage
(expiry after a joined outcome fails closed, never another cycle in that
stage); shared leader/fence recheck after ALL cycle awaits at settlement;
final resource guard after ALL final awaits including helper returns,
using the CURRENT durably installed same-binding session (an older
bearer's historical expiry alone never fences an accepted response while
the installed successor is usable; rotation is not sign-out). Mapping to
the r2-repaired oracles: every scenario asserts exactly one refresh per
stage with fail-closed joined outcomes (interruption / reauthentication)
and explicit no-new-cycle waits — consistent with the one-cycle rule; the
held-commit and leader/invalidate cases assert settlement-guard
interruption despite successful installation — consistent with
post-await leader/fence rechecks; the final-delivery suppression case
advances the clock past the CURRENT installed session's refresh expiry
with no rotation in flight, so its `reauthentication_required` +
`dispatched=true` + mutation-`outcomeUnknown=true` oracle is retained
unchanged per the clarification; delayed-401 retries succeed on the
usable installed successor — consistent with rotation-not-sign-out. No
new case or matrix was added for this delta; no existing oracle
contradicts it.

## Notes for the next review (not defects)

- The held-ack case depends on the specified prepare-before-dispatch order
  (refresh observed ⇒ prepare committed, so the armed gate catches the
  success commit). Awaiting the real commit is bounded with a diagnostic;
  any order violation fails honestly via the vault/retry oracles.
- Staged holds keep server sockets unanswered for bounded sub-second
  windows; teardown destroys leftovers, cancels waits, releases deferred
  cleanups, and settles owned work before owner close. No hold exceeds the
  10 s suite timeout; `sleep(250)` negative checks are join/dispatch
  absence checks tied to staged public boundaries, not exact-timing proof.
