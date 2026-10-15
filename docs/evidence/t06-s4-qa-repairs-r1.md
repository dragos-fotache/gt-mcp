# T06-S4 QA repairs r1 — bounded source repair + readiness (second review)

**Status: REPAIRED, HOLD.** R1 defects repaired source-only in the same four
NEW s4 files; no execution performed; awaiting second source review. The
initial `docs/evidence/t06-s4-qa-source-ready.md` and the coordinator r1
review are preserved historical; this NEW report corrects the claims the
review rejected. No frozen relay or execution grant; readiness is not
acceptance.

## Authority and boundaries

- Repair grant: `docs/evidence/t06-s4-coordinator-qa-source-review-r1.md`
  (Q1–Q7) plus common `docs/decisions/t06-s4-interface-adjudication.md`
  and updated `docs/tasks/t06-s4-work-order.md` (entry classes, head-budget
  timing, shared-auth revision, final-delivery suppression).
- Read: the r1 review, the adjudication, the updated work order, own four S4
  sources, accepted QA helper contracts (T05 unit/fault helpers, T06 unit
  helpers incl. the public-owner adapter pattern). NEVER read: production
  source/diffs, emitted JS/maps, private ADR, Developer reports/messages,
  production reviews.
- Write scope: the same four NEW s4 files (edited) + this NEW evidence file.
  Zero accepted helpers/tests and zero other files touched — the only paths
  this QA role created or modified in this context are the four s4 sources
  and the two `t06-s4-qa-*.md` evidence files. (The working tree is fully
  untracked, so raw git status cannot independently prove this; the bound
  stated here is the exact set of write/edit tool calls issued.)

## Repairs by review item

| # | R1 defect | Repair (paths) |
|---|-----------|----------------|
| Q1 | Swallowed close/invalidate failures; secondary teardown lost behind body error; acquisition-before-try leaks; untracked responders; failure-path waits outliving tests; handlerError inspected before settle | Both fault harnesses (`s4-refresh-retry`, `s4-concurrency-fences`) and both unit helpers (`withBoundOwner`, new `withFreshOwner`) rebuilt: resources protected from first acquisition with conditional teardown steps; no `.catch(()=>{})`/empty-catch suppression; body + teardown failures combined via `combineS4Failures`; every responder execution tracked from submission with immediate rejection handling; `gates.waitFor` races teardown release (`GATE_RELEASED` swallowed only as expected teardown, never as error); teardown releases ALL gates, awaits `Promise.allSettled` of owned responders, then closes; `handlerError` also re-checked after settle |
| Q2 | Wrong list-route success bodies; `Uint8Array.toString("utf8")` byte oracle; legs compared only to each other; pending replay missing original auth-key check | Success responders now reuse accepted exact-schema builders: `routineListWire([routineWire])` for listRoutines, `workoutListWire([workoutSummaryWire])` for listWorkouts (new `S4_WORKOUT` id); search/get/mutation routes keep their matching builders. Mutation oracle compares each leg to an independent entry `Buffer.from` snapshot (method + path + body + key equal to the originally captured request, both legs). Pending replay asserts the ORIGINAL stored auth UUID (`S4_PENDING_KEY`) as well as exact body bytes — a fresh key with unchanged body fails |
| Q3 | Self-deadlocking delayed-401 gate; both-401s-before-install proves nothing; follower forced to dispatch; leadership inferred from order/counts; Session-only interruption brand | Delayed-401 rewritten: both old-bearer legs STAGED held before any 401; explicit leader = first arrival released first (cycle observed via refresh request while the other leg is still held); leader retry completes and durable installation is read back; THEN the delayed older-401 is released and must reuse the successor with still exactly one rotation (both retries asserted on the rotated bearer). Follower-abort rewritten: follower starts during HELD auth and must join with ZERO second dispatch (bounded 250 ms negative check), then aborts locally while the leader succeeds. Leader/follower rewritten with staged legs and explicit release order (leader first, join second, abort, release) plus a no-new-leader still-one-rotation check. All cancellation oracles accept module-created SessionError OR TransportError `operation_interrupted`, asserting safe transport metadata where the TransportError brand surfaces |
| Q4 | No real held commit acknowledgement | New combined case in `s4-concurrency-fences` reusing the accepted public-owner adapter pattern (`makeCommitGateOwner`: delegating capability, gated acknowledgement): refresh response held until the commit gate is armed AFTER the refresh request is observed (so the held commit is provably the joint success installation, not prepare); leader + joined follower provably unsettled with zero retry dispatched during the hold (bounded checks); leader abort at the boundary, gate released, both interrupted, vault read back as rotated-grant + pending-null (installed, no rollback), retry never dispatched |
| Q5 | Config-capture unit could reach external DNS; malformed-route test not pre-auth, no vault/count observation | Behavioral capture oracle moved to owned literal-loopback (`buildTransportConfig` passthrough in fault 01): success against the loopback destination asserted, caller config mutated, second call still succeeds against the ORIGINAL origin (loopback host asserted on both legs). New pre-auth validation case under expired-access seed: invalid ID + invalid body + oversized `saveRoutine` body assert `invalid_arguments`/`request_too_large` (TransportError brand for the budget case per adjudication), zero auth/resource dispatch, byte-identical vault before/after. `S4_ORIGIN` helper comment corrected: open-time validation only, never a behavioral destination |
| Q6 | Tautological body-capture unit; named-import surface checks; binding-only empty open; brand-only maxAttempts | Tautology REMOVED from unit; replaced by a held-auth integration case in fault 01 (caller mutates body bytes AND binding object during held refresh; both legs equal the entry snapshot, call succeeds). Eight-export assertion now checks EXACT sorted module-namespace keys. Facade assertion checks all 11 documented members present, exact own-enumerable key equality, and absence of an expanded 14-name forbidden list. Empty open compares byte-identical vault bytes. maxAttempts asserts TransportError + `invalid_arguments` code. Adjudication-driven extras in fault 01: `request_too_large` size case and a deterministic final-delivery suppression case (mutable clock advanced past refresh expiry during a held mutation leg → TransportError `reauthentication_required`, `dispatched=true`, `outcomeUnknown=true`, no result data, zero refresh) |
| Q7 | Overclaimed ordering/held-commit/key/capture/surface/cleanup coverage | This NEW report supersedes those claims; initial report kept historical. Counts reported honestly below; no quota claimed |

## Revised short checklist and honest counts (33 cases + helper)

- `test/unit/t06/s4-helpers.mjs` — pure builders only (corrected origin
  comment, added `S4_WORKOUT`); 0 imports, unchanged patterns.
- `test/unit/t06/s4-auth-session-validation.test.mjs` — 12 cases (was 14:
  tautology removed, behavioral capture moved to loopback; exact namespace
  keys, exact facade keys, byte-identical empty open, coded maxAttempts).
- `test/fault/t06/s4-refresh-retry.test.mjs` — 12 cases (was 8: +held-auth
  caller-mutation identity, +final-delivery suppression, +pre-auth
  local/size validation, +loopback config capture; route-correct fixtures,
  snapshot byte oracles, original auth-key check).
- `test/fault/t06/s4-concurrency-fences.test.mjs` — 9 cases (was 8:
  +held-commit interruption case; staged delayed-401, join-without-dispatch
  follower abort, sequenced leader/follower, either-brand interruption).
- Reused, unmodified: `test/unit/t06/helpers.mjs` (clocks, signals,
  `captureRejection`, `teardownAll`, adapter pattern), T05 unit wire
  builders, T05 fault loopback helpers + test-only cert fixtures.

Deliberately out of scope (unchanged): sign-out/replacement/logout,
browser/login, CLI/MCP wiring, config loader guard, journals/creation,
caching/cleanup, new seams/routes, account adoption, contract changes,
product writes, crash-kill, cross-products, general harness, interception
proof, sandbox/power claims. Import smoke stays coordinator-owned.

## Exact static commands and results (pinned toolchain)

Every command with explicitly exported disposable `T01_NODE_HOME` and
`PATH="$T01_NODE_HOME/bin:$PATH"` → Node v24.21.0, npm 11.19.0; no
ambient/system fallback.

1. `node --check` on all four repaired files → CHECK-OK × 4.
2. `./node_modules/.bin/eslint` (scoped, four files) → ESLINT-OK clean
   (three findings fixed: two useless `= null` initializers, one missing
   `gates` destructure; final re-run clean).
3. `./node_modules/.bin/prettier --write` then `--check` (scoped, four
   files + this report) → all use Prettier code style.
4. Source-only import-resolution probe (parses `from` specifiers, stats
   relative paths, zero module loads) → IMPORT-RESOLUTION-OK (23
   specifiers; all QA-relative paths exist; `vitest` external; `dist/*`
   stat-only relay targets, never imported/executed).

No suite, fixture, loopback, provider, build, or install execution was
performed. Sources HELD for second review.

## Notes for the second review (not defects)

- The held-commit case relies on the specified prepare-before-dispatch
  order (refresh observed ⇒ prepare committed, so the armed gate catches
  the success commit). If that order ever does not hold, the case fails
  honestly via its `counts.resource` and vault oracles rather than passing
  vacuously.
- The exact-own-keys facade assertion is intentionally strict per Q6; an
  unexpected implementation-owned enumerable would surface here as review
  input, not as a QA-side relaxation.
- Staged response holds keep one server socket unanswered for bounded
  sub-second windows only; teardown release + `closeServer` settle every
  path, and no hold exceeds the 10 s suite timeout.
