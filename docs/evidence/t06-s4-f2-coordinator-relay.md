# T06-S4 frozen relay t06-s4-f2 — fixture-corrected QA execution

**Status: EXECUTION CLOSED after owning30PASS/3FAIL of33, zero skip.**
[Original f2 result](t06-s4-qa-f2-execution.md) preserved; regressions202UNRUN per
stop rule.284row/checksum checkpoints stable, cleanup reported green. One observed
failure is the config-capture query oracle; TWO failures await complete original-run
observations. QA/Developer HOLD runtime/source; no rerun/diagnostic or acceptance.
The sequence below is historical, NOT a renewed grant.
Production c4 remains unchanged/frozen; independent QA saved-list fixture repair
[source gate](t06-s4-f2-coordinator-qa-source-gate.md) APPROVED/HELD. ALL source/
helper/build/install/static windows CLOSED. Source gate/freeze is NOT acceptance.
Parent T06 incomplete; S5 unassigned/T07/T08 blocked; no automatic successor.

**Preserved prior failure:** [f1 execution](t06-s4-qa-f1-execution.md) owning28PASS/
5FAIL, regressions202UNRUN, relay CLOSED. [Adjudication](t06-s4-f1-adjudication.md)
identifies draft items in saved-list fixtures and retains the Coordinator source
review miss. Four explicit fixture isDraft:false overrides repair only two NEW S4
fault files; no assertion/case/count/route/helper/production/contract change.

[NEW inventory](t06-s4-f2-artifact-inventory.json): **284files**, SHA256
`6c3aacf6609bf10fa493b707c4033ff69e85f9e050c78fa99d4cf581ea0565b6`.
Coordinator checksum/verifier PASS284rows.100compiled files and184explicit source/
metadata/spec/test/evidence inputs.279prior f1rows unchanged, two authorized QA
fixture rows rehashed, three adjudication/repair/gate evidence inputs added. ALL
production and compiled bytes unchanged from c4/f1. No production rebuild required.

QA may read this relay, its own fixture/source gates, common normative specs,
hash-only inventory and public frozen declarations; NOT production review/ADR/source/
emitted JS/maps. Imported public compiled entries may be EXECUTED by the tests,
not inspected as implementation. The following is a NEW bounded execution grant,
not permission to rerun f1 or silently replace its failed result.

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

1. Verify checksum and ALL284rows BEFORE any compiled target import:

   ```sh
   printf '%s  %s\n' \
     6c3aacf6609bf10fa493b707c4033ff69e85f9e050c78fa99d4cf581ea0565b6 \
     docs/evidence/t06-s4-f2-artifact-inventory.json | sha256sum --check
   python3 docs/evidence/t06-s1-verify-artifact.py docs/evidence/t06-s4-f2-artifact-inventory.json
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

3. ONLY if ALL owning assertions/cleanup PASS and checksum/284rows remain stable,
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

4. Repeat checksum/ALL284row verification AFTER EACH run, including on failure.
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
