# T04-f4 QA execution report — final source-closure relay t04-f4

**Relay:** `docs/evidence/t04-f4-coordinator-relay.md` (tag t04-f4, aggregate
`4d8d28bd…59b51`; hashes/metadata inspected only). Scope delta vs f3 is
source closure only (keyring/fsutil + ADR); API/oracles/scope/deps unchanged.
**Verdict: all owning gates PASS — acceptance pending coordinator's separate
clean-snapshot reproduction (not claimed here).** T04 in progress; writes
disabled. Prior f1/f2 failures and adjudications retained in history.
**Owner:** QA (`w4:p2H`). **Model:** `meta/muse-spark-1.3-contributor`.
**Toolchain:** Node v24.21.0, npm v11.19.0 (provisioned disposable),
Vitest 4.1.11 local (no npx/network fallback).

## Exact commands executed (in order), all exit 0

1. `./node_modules/.bin/vitest run test/unit/t04` → **54/54 PASS** (8 files).
2. `T04_PROVIDER_PREFIX=/tmp/gt-mcp-t04-provider.W0aled/runtime bash /tmp/gt-mcp-t04-qa-private-run.sh test/fault/t04`
   (private dbus-run-session fixture; no reset command — lock-last case then
   owned daemon/keyring teardown; no Unlock/prompt attempted) →
   **69/69 PASS** (9 files).
3. `npm run smoke` → **100/100 PASS**. `./node_modules/.bin/vitest run
   test/unit/t03` → **221/221 PASS**.
4. `./node_modules/.bin/eslint test/unit/t04 test/fault/t04` → **clean**.
   `./node_modules/.bin/prettier --check test/unit/t04 test/fault/t04` →
   **clean**. `node --check` on all 21 QA sources → **PASS**.

No install/build/source/config changes to the target; no QA source/oracle
changes in this window; no whole-suite, parked-T02, skips, personal-bus
helpers, or private probe-code reads.

## Coverage confirmed (unchanged gates, final closure build)

Same full matrix as f3 and green throughout: contract/codes, validation,
lifecycle, opaque bytes, envelope math, HKDF/GCM/HMAC oracles, version/
corrupt/swap/missing/INCOMPLETE mappings, previous-ACK rejection, provision
phases, PREPARED fencing, pre-publication OLD-image reopen, COMMITTED/new
reopens, lease exclusion with no unlocked IO, lock-conflict mappings,
key-state matrix + recheck + changed-key detection, diagnostic separation,
modes/privacy, calibrated import inertness, direct no-lease failures, and
the real-provider suite (round trip, key_not_found, not_provisioned,
key_unavailable, bounded provider_failure, already_provisioned,
fence_mismatch relocation, duplicate ambiguity + clear, terminal lock-last
key_locked + close-while-locked).

## Cleanup and limits

- Launcher tore down the private daemon/keyring; temp roots removed via
  finally-blocks. Disposable bus left locked by design (last case, no reset
  command supplied, no Unlock attempted). Synthetic values only in evidence.
- Blocked/partial stays blocked/partial; no mock-only OS passes; calibration
  remains harness validation only. Standing source-review limits unchanged.

## Request

QA gates pass on t04-f4. Awaiting coordinator's separate clean-snapshot
reproduction and the acceptance decision. QA holds all target execution and
further source changes.
