# T06-S4 frozen relay t06-s4-f3 — default-query-corrected complete QA capture

**Status: QA EXECUTION CLOSED after owning33/33 +regressions202/202 PASS.**
[Complete f3 evidence](t06-s4-qa-f3-execution.md) records full-log capture, zero fail/
skip/todo/timeout/unhandled and stable289rows before/after both runs, cleanup green.
QA/Developer HOLD ALL. Coordinator clean189-source locked reproduction/SAME235tests/
100identical compiled files and import smoke/source audit PASS; [S4 accepted c4/f3](t06-s4-coordinator-review.md).
[Handoff](../handoffs/t06-s4.md). ALL grants CLOSED. The sequence below is historical,
NOT a renewed run; no S5/parent/release or automatic context succession.
Production c4 remains unchanged/frozen; [QA oracle source gate](t06-s4-f3-coordinator-qa-source-gate.md)
APPROVED/HELD. ALL source/helper/build/install/static windows CLOSED. No acceptance.
Parent T06 incomplete/S5 unassigned/T07/T08 blocked; no automatic successor.

**Prior failures preserved:** f1 owning28PASS/5FAIL, f2 owning30PASS/3FAIL; BOTH
regression202 selections UNRUN and relays CLOSED. f1 saved-list fixture repair
and [f2 query adjudication](t06-s4-f2-adjudication.md) align stimulus/oracles to
unchanged specifications, not broken production/contract weakening. TWO original
f2 failed-case identities remain UNKNOWN/irretrievable; unverified pass labels
withdrawn in [supplement](t06-s4-qa-f2-observation-completion.md). Do NOT reconstruct
those outcomes or claim them fixed. This NEW full owning run covers all same33cases.

[NEW inventory](t06-s4-f3-artifact-inventory.json): **289files**, SHA256
`3321b8e343a5fd548b54272c88b7b7d4672e066975010fc7f9614a12a63216e2`.
Coordinator checksum/verifier PASS289rows.100compiled files and189explicit source/
metadata/spec/test/evidence inputs.282prior f2rows unchanged, two authorized query
oracle rows rehashed, five observation/adjudication/repair/gate inputs added.
ALL production/compiled bytes unchanged c4/f1/f2. No production rebuild needed.

QA authorized reads: this relay, own source/fixture/oracle gates and common public
specifications, hash-only inventory and public frozen declarations. NOT production
review/ADR/source/emitted JS/maps. Public compiled entries may be executed by the
listed tests, not inspected as implementation. Source gate/relay is not acceptance.

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

## Complete original output — mandatory

For EACH selection, retain FULL stdout+stderr in a fresh QA-owned log BEFORE viewing
or summarizing it. No tail-only/truncating pipeline. Capture the ACTUAL Vitest exit
code independently, read ALL output (paged if needed), and record ALL failed titles/
oracles/safe exception metadata/expected-actual observations and summary counts.
Create sanitized evidence BEFORE deleting logs/roots. Do not copy tokens/IDs/bodies/
private absolute paths. No generalized reporter/harness is needed.

If any failure occurs, full observations must be retained/sanitized; no pass-label
guesses from aggregate counts or incomplete tails. Preserve the true exit and stop
regressions. Missing original output is a BLOCKER, not a permission to rerun.

## Exact QA execution — ONCE per selection

1. Verify checksum and ALL289rows BEFORE any compiled target import:

   ```sh
   printf '%s  %s\n' \
     3321b8e343a5fd548b54272c88b7b7d4672e066975010fc7f9614a12a63216e2 \
     docs/evidence/t06-s4-f3-artifact-inventory.json | sha256sum --check
   python3 docs/evidence/t06-s1-verify-artifact.py docs/evidence/t06-s4-f3-artifact-inventory.json
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

3. ONLY if ALL owning assertions/cleanup PASS and checksum/289rows remain stable,
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

4. Repeat checksum/ALL289row verification AFTER EACH run, including on failure.
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
