# T04-f3 QA execution report — frozen relay t04-f3, timeout repair

**Relay:** `docs/evidence/t04-f3-coordinator-relay.md` (tag t04-f3, aggregate
`1ff80e13…389d4c7`; hashes/metadata inspected only). f2 remains CLOSED with
retained failure/adjudication; no oracle or shared-contract changes in f3.
**Verdict: all owning gates PASS — acceptance pending coordinator
reproduction/clean-snapshot steps (not claimed here).** T04 in progress;
writes disabled.
**Owner:** QA (`w4:p2H`). **Model:** `meta/muse-spark-1.3-contributor`.
**Toolchain:** Node v24.21.0, npm v11.19.0 (provisioned disposable),
Vitest 4.1.11 local (no npx/network fallback).

## Exact commands executed (in order), all exit 0

1. `./node_modules/.bin/vitest run test/unit/t04` → **54/54 PASS** (8 files).
2. `T04_PROVIDER_PREFIX=/tmp/gt-mcp-t04-provider.W0aled/runtime bash /tmp/gt-mcp-t04-qa-private-run.sh test/fault/t04`
   (private dbus-run-session fixture; no reset command — lock-last case then
   owned daemon/keyring teardown; no Unlock/prompt attempted) →
   **69/69 PASS** (9 files), including the previously failing blackhole case
   now returning `provider_failure` inside the 1000 ms budget.
3. `npm run smoke` → **100/100 PASS**. `./node_modules/.bin/vitest run
   test/unit/t03` → **221/221 PASS**.
4. `./node_modules/.bin/eslint test/unit/t04 test/fault/t04` → **clean**.
   `./node_modules/.bin/prettier --check test/unit/t04 test/fault/t04` →
   **clean**. `node --check` on all 21 QA sources → **PASS**.

No install/build/source/config changes to the target; no whole-suite,
parked-T02, skips, personal-bus helpers, or private probe-code reads.
No QA source semantic changes in this window (oracles unchanged from R2).

## Coverage confirmed on the frozen target

- Exact contract/22 codes; argument/own-data/copy/budget validation;
  pre-auth/bind/advance lifecycle with old-capture fencing; opaque bytes,
  envelope math, and reference HKDF/GCM/HMAC oracles; version/corrupt/swap/
  missing/INCOMPLETE mappings; previous-ACK rejection against the current
  anchor; provision-phase outcomes (bootstrap retry, reserved stages,
  lost-reply exact open); PREPARED fencing with exact `commit_ambiguous`
  reopens; pre-publication fs faults with OLD-image reopen; COMMITTED/reply
  reopens with exact new targets; single/cross-process lease exclusion with
  no unlocked IO; real inode replacement/deletion mappings; key-state matrix
  with per-call recheck and changed-key detection; diagnostic separation
  with idempotent/protected cleanup; restrictive modes and at-rest privacy;
  calibrated import inertness plus direct no-lease sanitized failures.
- Real isolated provider: provision/round-trip/generation/digest,
  `key_not_found`, `not_provisioned`, `key_unavailable`, blackhole
  `provider_failure` bounded, cross-root `already_provisioned`, relocated
  `fence_mismatch`, duplicate `key_ambiguous` + clear recovery, terminal
  lock-last `key_locked` + close-while-locked.

## Cleanup and limits

- Launcher tore down the private daemon/keyring; temp roots removed via
  finally-blocks. Disposable bus left locked by design (last case, no reset
  command supplied, no Unlock attempted). Synthetic values only in evidence.
- Blocked/partial stays blocked/partial; no mock-only OS passes; calibration
  remains harness validation only.
- Standing limits (overflow, foreign-UID, wire label/collection exactness,
  fdinfo parsing = source-review items) unchanged.

## Request

QA gates pass on t04-f3. Awaiting coordinator reproduction and clean
allowlisted locked source snapshot toward acceptance. QA holds all target
execution and further source changes.
