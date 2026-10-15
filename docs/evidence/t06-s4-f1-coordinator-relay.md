# T06-S4 frozen relay t06-s4-f1 — bounded independent QA execution

**Status: EXECUTION CLOSED after OWNING FAILURE.** QA f1 owning:28PASS/5FAIL,
33cases,zero skip; regressions202UNRUN per stop rule. [Original execution](t06-s4-qa-f1-execution.md)
retained; checksum/ALL281rows stable before/after, cleanup reported green. Developer/
QA HELD, no rerun/diagnostic or successor. The sequence below is historical, not a
renewed grant; only separate adjudication/new named artifact can authorize repair/
execution. No acceptance.
Production c4 and independent QA r3-repaired sources APPROVED/HELD. All source/
helper/build/install/static windows CLOSED. Source approval/freeze is NOT acceptance.
Parent T06 incomplete; S5 unassigned/T07/T08 blocked; no automatic successor.

[Inventory](t06-s4-f1-artifact-inventory.json): **281files**, SHA256
`10b1b948af245fb245bc0d391caa0b8a236f8c8227c01d848eaffd4d82a66f3a`.
Coordinator checksum/verifier PASS281rows.100compiled files and181explicit source/
metadata/spec/test/evidence inputs.264prior S3rows unchanged, five authorized index/
ADR/compatibility rows rehashed;12additive S4 production/compiled/QA/spec/gate inputs.
[QA source gate](t06-s4-coordinator-qa-source-gate.md) is an authorized QA reference;
production c4 review/ADR/source/emitted JS/maps remain PRIVATE, not QA inspection.
Public frozen declarations/hash-only inventory reading permitted. Imported public
compiled entries may be EXECUTED by these tests, not read as implementation.

## Environment and permitted runtime

Every command uses privately supplied verified disposable T01_NODE_HOME,
PATH="$T01_NODE_HOME/bin:$PATH", Node24.21.0/npm11.19.0. Stop if absent/mismatched;
no ambient fallback/install/build/dependency/runtime/settings changes. Clear inherited
Node/TLS/DBus trust/address/cache overrides. Create fresh QA-owned neutral run root
with disjoint sibling HOME/TMPDIR and fresh XDG/cache roots; absolute private run/
toolchain locations MUST NOT be persisted in repository evidence.

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
unset NODE_OPTIONS NODE_COMPILE_CACHE NODE_TLS_REJECT_UNAUTHORIZED NODE_EXTRA_CA_CERTS
unset SSL_CERT_FILE SSL_CERT_DIR DBUS_SESSION_BUS_ADDRESS DBUS_SYSTEM_BUS_ADDRESS
node --version
npm --version
QA_SCOPE="$(mktemp -d -t gt-t06-s4-qa-XXXXXX)"
mkdir "$QA_SCOPE/home" "$QA_SCOPE/tmp" "$QA_SCOPE/cache"
export HOME="$QA_SCOPE/home" TMPDIR="$QA_SCOPE/tmp" TMP="$QA_SCOPE/tmp" TEMP="$QA_SCOPE/tmp"
export XDG_CONFIG_HOME="$HOME/config" XDG_DATA_HOME="$HOME/data"
export XDG_STATE_HOME="$HOME/state" XDG_CACHE_HOME="$HOME/cache"
export NPM_CONFIG_CACHE="$QA_SCOPE/cache" TZ=UTC NO_COLOR=1
```

Allowed observable runtime: public compiled auth/storage/transport/domain entries
through the listed tests, issued T04 DIAGNOSTIC persistence/lease/filesystem and
actual test-owned literal-loopback HTTPS with existing test-only CA. Synthetic
mutation fixture traffic expressly allowed. NO ordinary personal Secret Service,
live backend/database/Google/browser/Android/Pi/stdio-server or product writes.
No new custom diagnostics/proxy/interception framework, credentials/trust installation,
private state or raw private bodies/paths in logs/evidence. Fixtures are not release
interoperability or OS sandbox/power-loss proof.

## Exact QA execution — ONCE per selection

1. Verify checksum and ALL281rows BEFORE any compiled target import:

   ```sh
   printf '%s  %s\n' \
     10b1b948af245fb245bc0d391caa0b8a236f8c8227c01d848eaffd4d82a66f3a \
     docs/evidence/t06-s4-f1-artifact-inventory.json | sha256sum --check
   python3 docs/evidence/t06-s1-verify-artifact.py docs/evidence/t06-s4-f1-artifact-inventory.json
   ```

   Reused unchanged verifier has historical S1 filename. Hash-only production reads
   are allowed; implementation/emitted JS/maps inspection remains forbidden.

2. Run COMPLETE S4 active owning selection ONCE:

   ```sh
   node node_modules/vitest/vitest.mjs run \
     test/unit/t06/s4-auth-session-validation.test.mjs \
     test/fault/t06/s4-refresh-retry.test.mjs \
     test/fault/t06/s4-concurrency-fences.test.mjs
   ```

   Authored33cases/3files:12unit+12retry+9concurrency. Counts are NOT preclaimed
   passes. Zero skips/todos/timeouts/unhandled/cleanup failures required.

3. ONLY if ALL owning assertions/cleanup PASS and checksum/281rows remain stable,
   run the explicit unchanged regression selection ONCE:

   ```sh
   node node_modules/vitest/vitest.mjs run \
     test/unit/t06/s3-recover-validation.test.mjs \
     test/fault/t06/s3-replay-recovery.test.mjs \
     test/fault/t06/s3-concurrency-fences.test.mjs \
     test/unit/t06/01-expiry-grant-oracles.test.mjs \
     test/unit/t06/02-session-fence-matrix.test.mjs \
     test/fault/t06/commit-fence.test.mjs \
     test/unit/t06/s2-version-expiry-validation.test.mjs \
     test/fault/t06/s2-durable-dispatch.test.mjs \
     test/fault/t06/s2-concurrency-retention.test.mjs \
     test/unit/t04/arguments.test.mjs \
     test/unit/t04/binding.test.mjs \
     test/unit/t04/bytes.test.mjs \
     test/unit/t04/contract.test.mjs \
     test/unit/t04/crypto-format.test.mjs \
     test/unit/t04/crypto-oracle.test.mjs \
     test/unit/t04/errors.test.mjs \
     test/unit/t04/imports.test.mjs \
     test/unit/t05/04-hooks-fences-dispatch.test.mjs
   ```

   Exact18files/202previously accepted cases: ALL accepted S151+S240+S333,
   T04unit54+T05hooks24. No failing/skipped exclusion. Full foundation/T03/provider/
   transport/integrated lifecycle gates remain parent T06 final requirements, not
   passed here. Parked T02/deferred T05 work preserved/unexecuted/unpassed. NO npm
   test/check, whole-repository pass, parent/release or live interoperability claim.

4. Repeat checksum/ALL281row verification AFTER EACH run, including on failure.
   Safely settle owned requests/commits/response/ack gates/listeners, close diagnostic
   owners/facilities/servers and remove ONLY QA-owned run roots. Do not force-kill
   durability-critical actions. Cleanup/residue failures propagate honestly.
   Create NEW docs/evidence/t06-s4-qa-f1-execution.md with sanitized exact commands,
   versions/exits/files/tests/pass/fail/skips, integrity checkpoints, cleanup/limits.
   No edits to frozen sources/readiness/evidence/metadata. Send asynchronous result
   to coordinator/w4:p2K, then HOLD ALL source/runtime actions.

## Stop and acceptance conditions

ANY owning failure/timeout/unhandled/hash drift/unsafe fixture/cleanup failure STOPS
regressions. Preserve original result/unrun status; no repair/assertion change/rerun/
extra diagnostic/suite expansion without coordinator adjudication/new named artifact.
No skipped pass/passWithNoTests/hidden exclusion or contract weakening.

Current-context checkpoint90/stop120 applies; if time insufficient report partial
with safely settled work, not automatic continuation/context renewal. Developer stays
HELD; no build/install racing target. This relay grants ONLY these two independent
selections; source approval/relay accepts nothing.

Final Coordinator clean allowlisted locked reproduction requires npm ci --ignore-scripts,
four production checks/build, SAME owning/regression selection, scoped QA quality,
unchanged sources and100byte-identical compiled files. Separate small isolated
eight-export import smoke/source audit, not comprehensive interception/sandbox proof.
No actual product writes, .pi/settings/trust edits, staging/commits/deploy/release,
S5 or automatic successor/context renewal follows from this relay.
