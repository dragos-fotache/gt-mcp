# T06-S3 QA f1 execution — t06-s3-f1 frozen relay results

**Status: EXECUTED, HOLD.** Exact relay sequence run once against the named
frozen artifact; no repairs, reruns, or expansion. Source gate/relay is not
acceptance. All source/helper/build/install grants remain CLOSED; QA HOLDS
all further actions.

## Artifact integrity (hash-only, no implementation inspection)

- Inventory: `docs/evidence/t06-s3-f1-artifact-inventory.json`, 269 files,
  SHA256 `92e4dbaa…9d88b3` — `sha256sum --check`: OK (pre-run, post-owning,
  post-regression).
- Row verifier (`docs/evidence/t06-s1-verify-artifact.py`, reused
  unchanged): PASS 269 unchanged files at all three checkpoints (before any
  target import, after owning, after regressions — including the
  post-failure-checkpoint rule, with no failure occurring).
- No production source/emitted JS/maps/ADR/review reads; public frozen
  declarations only through test imports.

## Environment (isolated, pinned, no fallback)

- Provided disposable `T01_NODE_HOME`, `PATH="$T01_NODE_HOME/bin:$PATH"` →
  Node v24.21.0, npm 11.19.0 (verified before each run; no ambient fallback,
  no install/build).
- Cleared inherited overrides per relay (`NODE_OPTIONS`,
  `NODE_TLS_REJECT_UNAUTHORIZED`, `NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE`,
  `SSL_CERT_DIR`, `DBUS_SESSION_BUS_ADDRESS`, `DBUS_SYSTEM_BUS_ADDRESS`).
- Fresh QA-owned neutral run root (sibling home/tmp, fresh XDG config/data/
  state/cache, `NPM_CONFIG_CACHE`, `TZ=UTC`, `NO_COLOR=1`); home/tmp
  observed empty after owning run; entire run root removed after the final
  checkpoint with no residue. Only QA-owned run roots touched.
- Runtime boundary as relayed: public compiled entries via tests, T04
  diagnostic facility, owned literal-loopback HTTPS with existing test-only
  CA. No Secret Service requalification, live services, or real writes.

## Run 1 — S3 owning selection (ONCE, exact relay command)

`node node_modules/vitest/vitest.mjs run`
`test/unit/t06/s3-recover-validation.test.mjs`
`test/fault/t06/s3-replay-recovery.test.mjs`
`test/fault/t06/s3-concurrency-fences.test.mjs`

- Exit: 0. Test Files: 3 passed / 3. Tests: 33 passed / 33 (16 unit + 10
  replay + 7 concurrency as authored). Failures: 0. Skipped/todo: 0.
- No timeouts, unhandled errors, or fixture/cleanup failures observed;
  suite exited naturally.

## Run 2 — unchanged regressions (ONCE, only after owning PASS + stable hashes)

`node node_modules/vitest/vitest.mjs run`
`test/unit/t06/01-expiry-grant-oracles.test.mjs`
`test/unit/t06/02-session-fence-matrix.test.mjs`
`test/fault/t06/commit-fence.test.mjs`
`test/unit/t06/s2-version-expiry-validation.test.mjs`
`test/fault/t06/s2-durable-dispatch.test.mjs`
`test/fault/t06/s2-concurrency-retention.test.mjs`
`test/unit/t04` `test/unit/t05/04-hooks-fences-dispatch.test.mjs`

- Exit: 0. Test Files: 15 passed / 15. Tests: 169 passed / 169
  (S1 51 + S2 40 + T04 unit 54 + T05 hooks 24, as relayed). Failures: 0.
  Skipped/todo: 0. No silent exclusions; parked/deferred work unexecuted.

## Cleanup, settlement, limitations

- Owned commits/requests/gates/listeners settled by test teardowns;
  owner/facility/server closed per case; suite processes exited cleanly
  with no force-kill of durability actions and no hangs.
- QA-owned run roots cleaned (above); no repo files modified by execution
  (hash checkpoints confirm); no evidence beyond this file added.
- Limits (unchanged from gate): risk-based selection with isolated
  diagnostic storage/TLS only — not backend, Secret Service
  requalification, Google/browser/Android/host/stdio/release proof; no
  exhaustive fault cross-product, power-loss, or OS-sandbox claim. Direct
  gap seeding is durable-state/no-volatile-marker evidence, not crash
  proof. Foundation/T03/full provider/transport and integrated S4/S5
  remain parent-T06 final gates, unclaimed here.

## Changed paths (this execution)

- ADD `docs/evidence/t06-s3-qa-f1-execution.md` (this file). No other writes;
  frozen sources/readiness/evidence untouched.
