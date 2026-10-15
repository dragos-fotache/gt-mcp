# T06-S3 frozen relay t06-s3-f1 — bounded QA execution

**Status: QA EXECUTION CLOSED after owning33/33 +regressions169/169 PASS.**
All source/helper/build/install/runtime grants CLOSED; Developer and QA HOLD ALL.
[QA f1 execution](t06-s3-qa-f1-execution.md) records three269row checkpoints,
zero failures/skips/todos/unhandled errors and cleaned roots. Coordinator clean
locked reproduction/final disposition PASS: [S3 accepted c1/f1](t06-s3-coordinator-review.md).
[Accepted handoff](../handoffs/t06-s3.md). ALL grants CLOSED, no further named rerun.
The sequence below is historical, not a renewed execution grant. No automatic
context renewal, successor or actual writes.

[Inventory](t06-s3-f1-artifact-inventory.json): **269files**, SHA256
`92e4dbaafbee306425d7e719023d6c7ce5b3d4f4675ec6d6a39b4de3794d88b3`.
Coordinator checksum/verifier PASS269rows. Production c1 and independent QA r1
repairs approved: [production](t06-s3-coordinator-production-source-review-c1.md),
[QA gate](t06-s3-coordinator-qa-source-gate.md). QA may read QA gate/common specs,
NOT production review/ADR/source. Hash-only inventory reading is allowed; no
emitted JS/maps inspection. Public frozen declarations allowed.

252of257prior S2rows unchanged; five authorized auth entry/compiled-entry/ADR/compat
changes rehashed. Twelve additive S3 source/compiled/spec/QA evidence/gate inputs.
Includes98compiled files and171source/metadata/spec/test inputs. Broader old tests
inventoried are NOT execution grants; .git/.pi/node_modules/private state excluded.

## Environment and permitted runtime

Every command uses supplied disposable T01_NODE_HOME,
PATH="$T01_NODE_HOME/bin:$PATH", Node24.21.0/npm11.19.0. Stop if absent/mismatched;
NO ambient fallback, install/build/runtime changes. Clear inherited Node/TLS/DBus
trust/address overrides. Create a fresh QA-owned neutral run root containing
sibling HOME and TMPDIR, fresh XDG/cache roots. Example setup (do not persist
absolute private run/toolchain locations in repo evidence):

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
unset NODE_OPTIONS NODE_TLS_REJECT_UNAUTHORIZED NODE_EXTRA_CA_CERTS
unset SSL_CERT_FILE SSL_CERT_DIR DBUS_SESSION_BUS_ADDRESS DBUS_SYSTEM_BUS_ADDRESS
node --version
npm --version
QA_SCOPE="$(mktemp -d -t gt-t06-s3-qa-XXXXXX)"
mkdir "$QA_SCOPE/home" "$QA_SCOPE/tmp" "$QA_SCOPE/cache"
export HOME="$QA_SCOPE/home" TMPDIR="$QA_SCOPE/tmp" TMP="$QA_SCOPE/tmp" TEMP="$QA_SCOPE/tmp"
export XDG_CONFIG_HOME="$HOME/config" XDG_DATA_HOME="$HOME/data"
export XDG_STATE_HOME="$HOME/state" XDG_CACHE_HOME="$HOME/cache"
export NPM_CONFIG_CACHE="$QA_SCOPE/cache" TZ=UTC NO_COLOR=1
```

Allowed observable runtime: public compiled auth/storage/transport entries through
these tests, issued T04 DIAGNOSTIC facility/owned filesystem/lease and actual owned
literal-loopback HTTPS with existing test-only CA. No ordinary Secret Service
requalification, live backend/database/Google/browser/Android/Pi/stdio-server.
No new custom diagnostics, trust installation, credentials/private state or raw
private bodies/paths in evidence. Synthetic tests are not release interoperability.

## Exact execution sequence — QA only

1. Verify checksum and ALL269rows BEFORE any target import:

   ```sh
   printf '%s  %s\n' \
     92e4dbaafbee306425d7e719023d6c7ce5b3d4f4675ec6d6a39b4de3794d88b3 \
     docs/evidence/t06-s3-f1-artifact-inventory.json | sha256sum --check
   python3 docs/evidence/t06-s1-verify-artifact.py docs/evidence/t06-s3-f1-artifact-inventory.json
   ```

   Existing verifier reused unchanged (historical S1 filename); hash-only
   production reads do not grant implementation inspection.

2. Run COMPLETE S3 owning selection ONCE, no skips/todos:

   ```sh
   node node_modules/vitest/vitest.mjs run \
     test/unit/t06/s3-recover-validation.test.mjs \
     test/fault/t06/s3-replay-recovery.test.mjs \
     test/fault/t06/s3-concurrency-fences.test.mjs
   ```

   Authored33cases/3files (16unit+10replay+7concurrency), NOT preclaimed passes.

3. ONLY if all owning assertions PASS, fixture cleanup succeeds and hashes stable,
   run explicit unchanged regressions ONCE:

   ```sh
   node node_modules/vitest/vitest.mjs run \
     test/unit/t06/01-expiry-grant-oracles.test.mjs \
     test/unit/t06/02-session-fence-matrix.test.mjs \
     test/fault/t06/commit-fence.test.mjs \
     test/unit/t06/s2-version-expiry-validation.test.mjs \
     test/fault/t06/s2-durable-dispatch.test.mjs \
     test/fault/t06/s2-concurrency-retention.test.mjs \
     test/unit/t04 \
     test/unit/t05/04-hooks-fences-dispatch.test.mjs
   ```

   Exact15files/169previously accepted cases: S151+S240+T04unit54+T05hooks24.
   ALL accepted S1/S2 owning sources selected; no silent skipped/failing exclusion.
   Foundation/T03/full provider/transport and integrated S4/S5 remain parent T06
   final gates, not claimed passed here. Parked T02/deferred T05 work retained,
   unexecuted/unpassed. No npm test/check or whole-repository claim.

4. Repeat checksum/ALL269row verification after EACH run and even after failure.
   Settle owned commits/requests/gates/listeners, close owner/facility/server and
   clean only QA-owned run roots. Do not force-kill durability actions. Propagate
   cleanup failures; record residue/blocked cleanup honestly rather than green.
   Write new docs/evidence/t06-s3-qa-f1-execution.md with exact safe commands,
   versions/exits/files/tests/pass/fail/skips, hash integrity and cleanup/limitations.
   No edits to frozen sources/readiness/evidence. Send asynchronous concise result
   to coordinator/w4:p2K, then HOLD ALL source/runtime actions.

## Stop/failure/acceptance gates

Any owning failure/timeout/unhandled error/hash drift/unsafe fixture/cleanup failure
STOPS regressions. Retain original result and unrun status; NO source/assertion
repair, rerun, extra diagnostics or suite expansion without coordinator adjudication
and a new named artifact. No passWithNoTests/skipped pass/hidden exclusion. If time
insufficient, report partial and safely settle owned work; no automatic continuation.

Relay/source approval accepts nothing. Final Coordinator clean allowlisted locked
reproduction requires npm ci --ignore-scripts, four production checks/build, exact
owning/regression selection, scoped QA quality, unchanged sources and98identical
compiled bytes. Separate small isolated seven-export import smoke/source audit,
not comprehensive interception or OS-sandbox proof. No S3/parent/release completion,
actual product writes, .pi/settings changes, staging/commits/publication/deployment
or S4/context succession follows from this execution grant.
