# T06-S5 QA source readiness r5 — repaired, HELD (no execution)

**Role/window:** independent QA qa/w4:p2M, T06-S5 only. R4 review returned NOT
SOURCE-APPROVED (renewal-permitting oracle, timestamp-equality ordering,
install-gate teardown registration). This r5 submission makes exactly those
three small corrections under the unchanged production-c2 HOLD (QA grant
stays SOURCE/static ONLY: fault S5 file + QA evidence; unit/S4 held). **Zero
compiled-target/fixture/loopback/provider/suite execution.** HOLD all QA
sources pending final source gate + named frozen relay. Readiness is not acceptance.
No accepted test/helper modified except the already-HELD narrow S4 barrel
block (r1 grant; verified, unchanged since).

## Changed paths (three S5 sources + QA evidence only)

```text
test/unit/t06/s5-helpers.mjs (HELD since r4; builders + install gate +
  advance-ack observer)
test/unit/t06/s5-lifecycle-validation.test.mjs (HELD since r4)
test/fault/t06/s5-lifecycle-races.test.mjs (r5: three small corrections)
docs/evidence/t06-s5-qa-source-ready.md (this file, rewritten honestly)
docs/evidence/t06-s5-draft-final-selection.json (draft filename list ONLY)
```

Toolchain: verified disposable `T01_NODE_HOME` (Node v24.21.0 / npm v11.19.0,
privately supplied; no literal private path persisted in this evidence).

## R4 findings → r5 repairs (three small corrections, no new tests)

- Renewal oracle CORRECTED. The client cancels the held first attempt
  around the 200ms deadline instead of waiting out the delayed server, so
  a renewed second attempt could land inside the old 1000ms tolerance.
  The case now asserts NO second token dispatch (at most one logout
  request total) when the first held attempt consumes the original
  window, keeping acknowledged-success and reopened-cleared checks. The
  incorrect 1500ms-consumption comment/report explanation is removed;
  exact elapsed proof stays with source audit.
- Ordering via captured EVENT-STATE, not timestamps. The first logout
  handler receipt captures whether the delegated advance acknowledgment
  already occurred (same-millisecond reversal no longer possible); the
  test asserts that captured boolean. Public delegation and post-reopen
  proof preserved.
- Install-gate release REGISTERED in owned teardown immediately after
  creation, so every failure path releases begun durability work before
  withS5 waits/cleans holders (success path already released
  explicitly; release is idempotent).

- Premature invalidate REMOVED. `reopenOnBinding` now tracks the fresh
  facade as `ctx.state`; the second replacement runs on a live
  correctly-owned facade (the old double-replacement inspection no longer
  invalidates before acting).
- HISTORICAL r4 oracle, REJECTED and superseded: a short-budget
  failed-cleanup bound on second-dispatch arrival time (1000ms tolerance
  over a 1500ms consumed window) could still pass a renewed per-token
  window. The current r5 oracle instead asserts NO second token dispatch
  (at most one logout request total) when the held first attempt consumes
  the original window. Exact elapsed-window proof stays with source
  audit, not claimed here.
- Ordering no longer assumed. A tiny trusted capability observer records
  the REAL delegated `advanceSessionGeneration` acknowledgment at the
  public boundary; the test asserts it precedes the logout wire receipt,
  then verifies durable contents after explicit reopen. No stale-owner
  poll, no private seam.
- Begun-advance lifecycle rebuilt on the local `withS5` helper: the
  pending promise is launched (registered) plus immediately harmlessly
  observed; entry-wait sits in try/finally that always releases the gate;
  teardown settles/folds before server/profile/facility cleanup, reusing
  the same ownership structure instead of a standalone ladder.
- Four older openers now use deferred sequential invocations — every
  started rejecting promise is observed immediately.
- NEW install-hold integration: a real-delegated commit-boundary hold
  keeps the reactive rotation's owned install unresolved while replacement
  is admitted. Final vault proves no advance before settlement (racing
  ahead would retain stale evidence or be clobbered); the retained entry
  matches the latest acknowledged rotated grant with post-install null
  pending; the stale reader is suppressed with no late retry dispatch;
  the target survives explicit reopen.

## Risk → oracle checklist (11 unit + 18 fault cases)

Unit (no network): ten-export surface + no new code; null-account open;
read-only empty/v1/v2/v3; duplicate-OLDER-generation and foreign-account
v3 `state_corrupt`; ALL FOUR older openers sequentially
`state_version_unsupported` with no erasure; malformed-bytes
`invalid_grant` without fence; expired-refresh
`reauthentication_required` without fence; post-admission clock-abort
priority with admitted fence; callback-invalidate priority with permanent
fence; EXACT 13 flat facade keys.

Fault (owned loopback + diagnostic facility): live-grant read; REAL-ack
(event-state) delayed ordering; distinct-token cleanup + dedup;
SHORT-budget failed cleanup (acknowledged success, NO second dispatch
when the held first attempt consumes the window — timing proof itself
left to source audit); OFFLINE
zero-request clearing; restart replacement with exact retention + list
growth; foreign refusal without fence/IO; retained-predecessor exclusion
during reactive rotation; install-hold replacement integration (latest
evidence, no early advance, suppressed stale reader, reopened target);
single-admission races; begun-commit suppression without rollback;
sign-out invalidate keeps acknowledged clearing; stale MUTATION
uncertainty (`dispatched=true/outcomeUnknown=true`); stale READ certainty
(`outcomeUnknown=false`); in-flight REFRESH fenced without late success;
entry-abort without fence (repeat succeeds with reopened install);
definite `io_failure` with reopenable old state; ambiguous
`commit_ambiguous` with closed-first reopen failing closed.

## Reuse (approved; no shared-helper edits, no production reads)

`test/unit/t06/helpers.mjs`, `s3-helpers.mjs`, `s4-helpers.mjs`;
`test/fault/t05/helpers.mjs` + synthetic TLS fixtures;
`test/unit/t05/helpers.mjs` wire builders (same usage as accepted S4
fault cases); T04 public diagnostic API.

## Static readiness (scoped, source-only)

- `node --check` on all three new S5 sources + HELD S4 block: PASS.
- Scoped ESLint on the same paths: PASS.
- Scoped Prettier check on the same paths + both evidence files: PASS.
- No compiled-target import, provider/loopback/fixture/suite execution,
  build/install/config/manifest/dependency change.

## Draft final selection (answers the selection question; NOT a run)

`docs/evidence/t06-s5-draft-final-selection.json` lists the exact 60
filenames: all active `test/unit/t06` + `test/fault/t06` (S1–S5), all
foundation/T03/T04 unit+fault incl. isolated provider, plus the exact 15
bounded T05 suites. Nothing runs until the relay verifies the updated
exact list/hashes/commands.

## Stop / handoff

Checkpoint90/STOP120 observed; no begun durability work outstanding
(nothing executed). State if at limit: repaired sources above,
static-green, HELD for final source gate. No staging/commits/release/successor/topology.
No personal keyring/live/backend/browser/Android/product writes, no `.pi`
edits. Awaiting final source gate + named frozen relay; no polling.
