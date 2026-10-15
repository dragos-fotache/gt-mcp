# T04-f2 QA execution report — frozen relay t04-f2, repaired build

**Relay:** `docs/evidence/t04-f2-coordinator-relay.md` (tag t04-f2, aggregate
`dd0029b0…a6a87f69`; hashes/metadata inspected only). **Verdict: 1 failure —
acceptance pending coordinator adjudication; no release claim.** f1 remains
NOT accepted with its retained adjudication. T04 in progress; writes disabled.
**Owner:** QA (`w4:p2H`). **Model:** `meta/muse-spark-1.3-contributor`.
**Toolchain:** Node v24.21.0, npm v11.19.0 (provisioned disposable),
Vitest 4.1.11 local (no npx/network fallback).

## Exact commands executed (in order)

1. `./node_modules/.bin/vitest run test/unit/t04` → **54/54 PASS**
   (8 files). Includes the retained F6 symlink `io_failure` oracle, now
   passing after the F1 omitted-timeout repair unmasked the path gate —
   exactly as adjudicated.
2. `T04_PROVIDER_PREFIX=/tmp/gt-mcp-t04-provider.W0aled/runtime bash /tmp/gt-mcp-t04-qa-private-run.sh test/fault/t04`
   (private dbus-run-session fixture; no reset command supplied — lock-last +
   teardown path; no Unlock/prompt attempted) → **68/69** (first run 68/70
   with one stale-duplicate entry, see repairs).
3. `npm run smoke` → **100/100 PASS**. `./node_modules/.bin/vitest run
   test/unit/t03` → **221/221 PASS**.
4. `./node_modules/.bin/eslint test/unit/t04 test/fault/t04` → **clean**.
   `./node_modules/.bin/prettier --check/--write` → **clean** (one
   formatting-only `--write` on `commit-crash.test.mjs`, reported below).
   `node --check` on all 21 QA sources → **PASS**.
5. No install/build/source/config changes to the target; no whole-suite,
   parked-T02, skips, or personal-bus helpers.

## QA-source changes since f1 (R2 + relay items, reported)

- Removed a stale duplicate `fs.rename` entry from the durable-PREPARED loop
  (the corrected pre-publication case stands alone and PASSES: fenced
  `commit_ambiguous` call, clean close, reopen exposes the exact OLD
  COMMITTED image for both stores).
- Leak-safe `expectCode`/`expectFailClosed` (close unexpectedly fulfilled
  sessions) proved its worth: the stale entry's unexpected success closed
  cleanly instead of cascading contention.
- Formatting-only `prettier --write` on `commit-crash.test.mjs`; zero
  semantic edits. F3/F4 oracles per adjudication; F6 retained; no broader
  oracle changes.

## Sole failure: blackhole factory-timeout mapping (adjudication requested)

- Test: `provider.test.mjs` "bounds a connected-but-silent provider as
  `provider_failure` on valid roots" — listening Unix socket that accepts
  and never replies, `timeoutMs: 1000` (valid range), valid provisioned
  roots, fresh generation. Elapsed bound (< 15 s) satisfied.
- Observed: `io_failure`. Oracle: `provider_failure` ("connected-provider
  timeout" sentence, spec §3 precedence).
- Honest framing: the explicit timeout sentence supports the oracle, but the
  deadline-fencing language is commit-scoped ("deadline failure fences an
  uncertain commit"), leaving factory-timeout mapping arguable — reported as
  an oracle question, not a certain implementation defect. No other
  anomaly: blackhole connection itself established (not `key_unavailable`).

## Everything else passing (f2 repairs confirmed)

- Omitted-timeout default (F1): all 9 provider + 2 filesystem prerequisite
  tests now reach their specified gates (round trip, `key_not_found`,
  `not_provisioned`, `key_unavailable`, `already_provisioned`,
  `fence_mismatch` relocation, `key_ambiguous` duplicate + clear recovery,
  terminal lock-last `key_locked` + close-while-locked, `unsupported_platform`
  tmpfs-deny, ext4 `key_unavailable` reach-through).
- Repeated ownership conflicts → `locked_by_other_owner` (F2), including
  cross-process child/parent and cleanup contention.
- INCOMPLETE-marker precedence (F7): present marker blocks open AND
  reprovision with `incomplete_provision`; lost-reply exact open works.
- All PREPARED/commit-crash/stale-anchor/key-facility/diagnostic/
  filesystem/privacy/crypto-oracle/import suites green on the frozen target.

## Cleanup and limits

- Launcher tore down the private daemon/keyring; temp roots removed via
  finally-blocks. Disposable bus left locked by design (last case, no reset
  command supplied, no Unlock attempted). Synthetic values only in evidence.
- Blocked/partial stays blocked/partial; no mock-only OS passes; calibration
  remains harness validation only.
- Limits as previously recorded (overflow, foreign-UID, wire label/collection
  exactness, fdinfo parsing = source-review items).

## Request

Adjudicate the single blackhole mapping question (or direct a mapping
change); on any production repair this relay is invalidated. Otherwise QA
awaits coordinator reproduction/clean-snapshot steps toward acceptance. QA
holds all target execution and further source changes.
