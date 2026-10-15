# T06-S2 frozen relay t06-s2-f1 — bounded QA execution

**Status: QA EXECUTION CLOSED after owning40/40 +regressions129/129 PASS.**
All QA source/fixture/target/rerun grants CLOSED, all roles HELD. The sequence below
is historical, not a renewed grant. Coordinator clean reproduction/acceptance
now PASS: [S2 accepted c2/f1](t06-s2-coordinator-review.md). All S2 windows CLOSED;
no further named execution or rerun. [QA evidence](t06-s2-qa-f1-execution.md).
Developer and QA HOLD ALL source/build/install/runtime/fixture actions. Original
source gates/sequence below remain historical evidence, not fresh permissions.
Parent T06 incomplete; S3–S5 unassigned. No automatic continuation/release.

[Inventory](t06-s2-f1-artifact-inventory.json): **257files**, SHA256
`e7b415d54004550faec96791efef56252e27aa02073b0d0db39cbcabab173725`.
Coordinator verifier PASS257rows.241old frozen rows unchanged;8approved S2 source/
compiled/ADR/compat changes rehashed,8new inputs added. Includes production and
compiled metadata, common contracts, QA owning/regression sources and reused
synthetic TLS/helpers; broader inventoried old tests are NOT execution grants.
No node_modules/.git/.pi/private fixture state or real secrets included.

Source gates: [production c2](t06-s2-coordinator-production-source-review-c2.md)
and [QA gate](t06-s2-coordinator-qa-source-gate.md). QA may read the QA gate, NOT
production review/ADR/source. Inventory verifier reads bytes solely for hashes;
no source/emitted JS/maps content inspection. Frozen public declarations allowed.

## Environment and allowed observables

Every command uses provided disposable T01_NODE_HOME and
PATH="$T01_NODE_HOME/bin:$PATH", Node24.21.0/npm11.19.0. No ambient fallback,
install/build/package/config changes or expanded discovery. Fresh QA-owned neutral
run root contains sibling HOME and TMPDIR (not TMPDIR under HOME), fresh XDG/cache
roots. Clear inherited NODE_OPTIONS, NODE_TLS_REJECT_UNAUTHORIZED, NODE_EXTRA_CA_CERTS,
SSL_CERT_FILE/SSL_CERT_DIR and DBUS_SESSION_BUS_ADDRESS/DBUS_SYSTEM_BUS_ADDRESS.
Never use a personal provider/bus/keyring or install trust in ambient settings.

Allowed runtime: compiled auth/storage/transport public entries, issued T04
DIAGNOSTIC facility, its synthetic filesystem/lease/fault holders and actual owned
literal-loopback HTTPS with existing test-only CA. No ordinary Secret Service
qualification, backend/database/Google/browser/Android/Pi/stdio-server session.
No actual product writes, raw credential/domain responses or private paths in
logs/evidence. Visibly synthetic fixtures do not supply release interoperability.

## Exact sequence — QA only

1. Verify checksum and all257rows BEFORE target import:

   ```sh
   printf '%s  %s\n' \
     e7b415d54004550faec96791efef56252e27aa02073b0d0db39cbcabab173725 \
     docs/evidence/t06-s2-f1-artifact-inventory.json | sha256sum --check
   python3 docs/evidence/t06-s1-verify-artifact.py docs/evidence/t06-s2-f1-artifact-inventory.json
   ```

   Reuse the unchanged accepted verifier; its S1 filename is historical, its
   manifest argument validates this explicitly named S2 inventory. Version check
   and isolated environment setup are permitted, no custom runtime diagnostics.

2. Run complete **S2 owning selection**, once, no skips/todos:

   ```sh
   node node_modules/vitest/vitest.mjs run \
     test/unit/t06/s2-version-expiry-validation.test.mjs \
     test/fault/t06/s2-durable-dispatch.test.mjs \
     test/fault/t06/s2-concurrency-retention.test.mjs
   ```

   Expected source declaration40cases/3files, NOT preclaimed passes.

3. ONLY if owning assertions ALLPASS and cleanup/hash integrity intact, run
   explicit unchanged regressions, once:

   ```sh
   node node_modules/vitest/vitest.mjs run \
     test/unit/t06/01-expiry-grant-oracles.test.mjs \
     test/unit/t06/02-session-fence-matrix.test.mjs \
     test/fault/t06/commit-fence.test.mjs \
     test/unit/t04 \
     test/unit/t05/04-hooks-fences-dispatch.test.mjs
   ```

   S1 owning51 +T04unit54 +T05hooks24 =129previously accepted cases,12files.
   This proves relevant preservation, not full foundation/T03/provider/transport
   qualification. Those sources/compiled bytes remain unchanged; focused selection
   follows S2 work order, not hidden failing-test exclusion. Parent final T06 still
   requires full active owning/relevant integrated provider/transport/recovery/
   lifecycle regressions and clean proof. Parked T02/deferred T05 campaigns stay
   preserved, unexecuted and NOT passed. No npm test/check or whole-repo claim.

4. Repeat checksum +257row verification even after failure. Settle owned commits/
   requests/listeners/holders and close issued facilities/servers before deleting
   ONLY QA-owned disposable roots. Propagate/report cleanup failure, never kill a
   durability action or mask an error. Record exact commands, exits/files/tests/
   pass/fail/skips, runtime versions, fixture cleanup and hash stability in new
   docs/evidence/t06-s2-qa-f1-execution.md. No source-ready evidence rewrite.
   Send concise asynchronous result to coordinator/w4:p2K, then HOLD ALL actions.

## Failure and stop gate

Any owning failure/timeout/hash drift/unsafe fixture/cleanup failure stops further
regression execution. Retain original failure and unrun/blocked status; no assertion
repair, rerun, extra diagnostics, suite expansion or source edits without separate
coordinator adjudication/new artifact. A failed artifact remains history, not a
newly relabelled pass. No passWithNoTests/skipped pass/hidden exclusion.

Original60–90min preference/90checkpoint/120stop applies to S2; this relay opens
one bounded execution phase, not context/window renewal. If insufficient time,
report partial/blocked and safely settle owned work; no automatic continuation.

Coordinator acceptance still requires independent clean allowlisted locked-source
reproduction (npm ci --ignore-scripts, production checks/build, exact owning and
these regressions), source/hash stability and identical compiled bytes. Small
isolated import smoke plus source audit remains separate; no exhaustive interceptor
or OS sandbox claim. This relay accepts nothing and opens no S3 or actual writes,
.pi/settings changes, staging/commits/publication/deployment/release.
