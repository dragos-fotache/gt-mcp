# T04-f1 QA execution report — frozen relay t04-f1, c2 candidate

> **Tally correction (preserved, not rewritten):** the initial report below
> states F1 as 8 provider + 2 filesystem failures; the log actually contains
> **9 provider + 2 filesystem = 11** (`provider.test.mjs` holds 9 tests, all
> failing on the omitted-timeout defect). All other counts stand as logged.
> A second correction round (adjudication F3/F4 + leak-safe helpers) follows
> in the appendix; no suite re-execution has occurred since the logged runs.

**Relay:** `docs/evidence/t04-f1-coordinator-relay.md` (tag t04-f1, aggregate
`6545da66…850a6ba8`; inventory hash/metadata inspected only, never
production/generated contents). **Verdict: NOT accepted** — 17 fault + 1 unit
failures require coordinator adjudication/repair; no whole-suite or release
claim. T04 remains in progress; product writes disabled.
**Owner:** QA (`w4:p2H`). **Model:** `meta/muse-spark-1.3-contributor`.
**Toolchain (provisioned):** Node v24.21.0, npm v11.19.0
(`T01_NODE_HOME=/tmp/gt-mcp-t04-toolchain.TqUXLa/node-v24.21.0-linux-x64`),
Vitest 4.1.11 via `./node_modules/.bin/vitest` (no npx/network fallback).

## Exact commands executed (in order)

1. `./node_modules/.bin/vitest run test/unit/t04` (plus reruns after QA-source
   repairs below; final run `/tmp/t04-qa-unit5.log`).
2. `T04_PROVIDER_PREFIX=/tmp/gt-mcp-t04-provider.W0aled/runtime bash /tmp/gt-mcp-t04-qa-private-run.sh test/fault/t04`
   (private dbus-run-session fixture; two runs: `/tmp/t04-qa-fault.log`,
   final `/tmp/t04-qa-fault2.log`). No `T04_PROVIDER_RESET_COMMAND` supplied —
   lock-last + teardown path taken as designed. No personal bus, no busctl
   Unlock/prompt fallback attempted.
3. `npm run smoke`, `./node_modules/.bin/vitest run test/unit/t03`.
4. `./node_modules/.bin/eslint test/unit/t04 test/fault/t04`,
   `./node_modules/.bin/prettier --check/--write test/unit/t04 test/fault/t04`.
5. Authorized artifact-free hook controls (own preload + builtins + synthetic
   sandbox only) and parse-only `node --check` (21/21 PASS).

No install/build/source/config changes to the target; Developer/coordinator
held those paths throughout. No whole-suite, parked-T02, or skipped gates.

## Results

| Scope | Result |
|---|---|
| `test/unit/t04` (8 files, 54 tests) | **53 pass, 1 fail** (symlink mapping, held for adjudication) |
| `test/fault/t04` (9 files, 69 tests) | **52 pass, 17 fail** (all adjudication items below) |
| `npm run smoke` (foundation) | **100/100 PASS** |
| `test/unit/t03` (regression) | **221/221 PASS** |
| eslint on QA paths | **clean** (39 own findings fixed; see repairs) |
| prettier on QA paths | **clean** (`--write` applied, formatting-only, reported below) |
| `node --check` (20 mjs + hook) | **21/21 PASS** |

Passing coverage includes: exact contract/22 codes, argument shapes, bind/
advance lifecycle with old-capture fencing, opaque bytes + copy semantics +
envelope math, version/corrupt/swap/missing mappings, PREPARED fencing with
exact `commit_ambiguous` reopens, COMMITTED/reply reopens with exact new
targets, provision-phase outcomes (retry-allowed bootstrap, reserved stages,
lost-reply exact open), stale-stores-vs-current-anchor rejection,
INCOMPLETE-present open block, key-state matrix + per-call recheck +
changed-key detection, diagnostic separation + idempotent cleanup +
replacement-root refusal, tmpfs/ext4 prerequisite structure, at-rest privacy,
import inertness with calibrated interception, direct no-lease sanitized
failures, reference HKDF/GCM/HMAC oracles, and the full positive provider
round trip EXCEPT where the systematic item below blocks.

## QA-source repairs made during execution (reported, no oracle weakening)

- `crypto-format`: removed a self-contradictory duplicate previous-ACK test
  that restored the anchor file too (whole-state, unsupported); the correct
  stores-only version in `stale-anchor.test.mjs` stands and PASSES.
- `stale-anchor`: `anchorBefore` snapshot moved after the advancing commit
  (was read before it, guaranteeing mismatch); now PASSES.
- `imports.test`/`import-hook`: harness bugs fixed — CJS→ESM
  (`process.getBuiltinModule`, `--import`), forbidden vs observation channels
  split (eval self-use of `setImmediate` no longer trips the gate),
  property-based no-IO probe (unconnected/zero-byte/non-listening sockets;
  see finding F5), positive blocked-effect control fixed (CJS eval has no
  top-level await), direct-run strictness (exists precondition, real start,
  numeric nonzero exit, null signal, bound, sanitized output, effect records).
- Lint/format-only: 39 eslint findings fixed (unused imports, explicit
  `node:timers`/`ArrayBuffer.transfer()`/JSON-clone, `expectFailClosed`
  restructure without try/catch, ESM hook conversion); `prettier --write`
  applied to all 21 QA files (double quotes, 100-col reflows; zero semantic
  edits verified by identical post-format results).
- Import-hook summary writer fixed (appendFileSync routes through patched
  writeFileSync; uses pre-opened fd + saved writeSync). Found via authorized
  artifact-free controls, which all pass (calibration clean + ESM synced;
  6/6 forbidden blocked + recorded; timer/listener recording verified).

## Failures held for coordinator adjudication (no unilateral oracle changes)

- **F1 — systematic production `invalid_argument` (10 tests: all 8 provider
  + 2 filesystem prerequisites).** Every production `provisionProfile`/
  `openProfile` call rejects `invalid_argument`, including minimal shapes
  (absent-roots open ⇒ expected `not_provisioned`; empty-roots open ⇒
  expected `anchor_missing`; dead-socket bus ⇒ expected `key_unavailable`;
  tmpfs roots ⇒ expected `unsupported_platform`; ext4+dead bus ⇒ expected
  `key_unavailable`). Common fields across all rejections: origin
  `https://storage-qa.example.invalid` and the bus string (real
  `T04_PROVIDER_BUS` or valid-syntax dead socket); roots/PGID vary without
  effect. Ranked hypotheses: (1) bus-address form rejected (e.g. guid suffix
  or multi-address handling) despite "optional valid guid"; (2) origin
  canonicalization rejecting the synthetic `.invalid` host. Coordinator can
  identify the field from implementation in one glance.
- **F2 — open contention mapping (2 tests: same-process + cross-process
  second open).** Got `commit_ambiguous`, oracle says `locked_by_other_owner`
  ("only actual kernel conflict exit73"). Cleanup-contention in the same
  build DOES return `locked_by_other_owner`, so contention is reported on one
  path but not the other.
- **F3 — lock-path conflict mappings (2 tests).** Replacement ⇒
  `fence_mismatch` (oracle `commit_ambiguous`); deletion ⇒ `anchor_missing`
  (oracle `commit_ambiguous`). Honest note: the implementation follows the
  MORE SPECIFIC precedence sentences ("root/lock/current digest mismatch";
  "missing external root/lock/anchor"), and my oracle may have picked the
  wrong (general lease-proof) sentence. Recommend adopting the specific
  sentences (tests updated to `fence_mismatch`/`anchor_missing`) pending
  coordinator confirmation. Truncation-positive half of the same test PASSES.
- **F4 — fs.rename aftermath unreleasable (1 test).** Commit ⇒
  `commit_ambiguous` as specified, but the fenced `close()` (or following
  cleanup) throws bare `locked_by_other_owner`: the holder is not reaped,
  contradicting "close releases fenced handles" + "failed factory calls
  terminate/reap their lease holder".
- **F5 — import-time socket objects (property probe consequence).** All dist
  entries leave 2 (once 3) unconnected, unbound, zero-byte, non-listening
  sockets at import (1 attributable to the dbus-native closure). No traffic,
  listeners, or addresses observed. Oracle refined from exact-count to
  per-handle no-IO properties (reported here, not hidden); coordinator decides
  whether lazy allocation repair is required.
- **F6 — symlink-in-supplied-root mapping (1 unit test).** Got
  `invalid_argument`, oracle `io_failure` ("unsafe link"). The precedence
  list also offers "malformed ... locations" ⇒ `invalid_argument`; genuinely
  ambiguous — coordinator picks.
- **F7 — INCOMPLETE-present reprovision (1 test).** Open part PASSES
  (`incomplete_provision`); reprovision reports `already_provisioned` where
  the clarified spec sentence says "open and reprovision report
  `incomplete_provision`".

## Cleanup and limits

- Fixture launcher tore down the private daemon/keyring; temp roots removed
  (`removeRoot` finally-blocks; launcher `trap rm -rf`). No personal bus,
  credentials, or private paths touched; evidence contains synthetic values
  only. The disposable bus may remain locked (by design, no reset command
  supplied, no Unlock attempted).
- Runner memory budget observed fine (two sequential 256 MiB + 1 allocations).
- Limits: timeouts bounded per test (30–60 s provider cases); whole-state
  restore asserts non-rewrite only (no auto-detection claim); generation
  overflow, foreign-UID, wire label/collection exactness, and fdinfo parsing
  remain coordinator source-review items as previously recorded.
- Blocked/partial stays blocked/partial; mock-only OS results never counted;
  calibration remains harness validation, never acceptance.

## Appendix R2 — adjudication-directed source corrections (no re-execution yet)

Per `docs/decisions/t04-f1-adjudication.md` (F1 production defect confirmed
as omitted-optional-timeout, not origin/bus; F2 production repair; F7
production repair; F5 observation maintained; F6 oracle retained):

- **F3:** `lease.test.mjs` now expects `fence_mismatch` (replaced lock
  identity, valid inherited lease retained) and `anchor_missing` (deleted
  lock pathname, surviving profile) — the specific live-path sentences.
  `commit_ambiguous` is kept only for genuinely invalid inherited proof
  (holder-death/IPC-loss fencing, PREPARED reopens). Exclusion, fence and
  cleanup assertions unchanged.
- **F4:** `commit-crash.test.mjs` `fs.rename` occurrence 1 split out of the
  durable-PREPARED loop: fenced `commit_ambiguous` call, then close, then
  reopen exposes the exact OLD COMMITTED image (both stores). No
  unconditional PREPARED state is inferred from the unexecuted rename; the
  durable-PREPARED oracle (exact `commit_ambiguous` reopen) is retained
  separately.
- **Leak-safe expectations:** `expectCode`/`expectFailClosed` in
  `test/unit/t04/helpers.mjs` now close any unexpectedly fulfilled session
  before failing, so an assertion failure can never masquerade as a leaked
  holder (the exact F4 masking mechanism: the discarded successful reopen
  held the lease and `cleanup` threw `locked_by_other_owner`). The lease
  contender check closes an unexpectedly acquired handle explicitly.
- F1/F2/F5/F6/F7 oracles unchanged (production repairs pending; F5
  property probe maintained with explicit attribution and gaps).
- Full owning suites rerun only after the new frozen artifact; no skips or
  narrow-only acceptance will be claimed.

## Request

Adjudicate F1–F7 (spec-level mappings and any production repair, which
invalidates this relay), then advise: revised relay after repair, or
directed QA-source updates under a clarified spec sentence. QA holds all
target execution and further source changes pending that decision.
