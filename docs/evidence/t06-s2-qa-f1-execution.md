# T06-S2 QA f1 execution evidence — frozen relay t06-s2-f1

**Status: EXECUTED PER RELAY, HOLD.** Bounded frozen execution only, exactly
per `docs/evidence/t06-s2-f1-coordinator-relay.md`. No source/helper/fixture
edits; no build/install; no further runs. This relay accepts nothing; parent
T06 incomplete, S3–S5 unassigned.

## Frozen artifact

- Inventory `docs/evidence/t06-s2-f1-artifact-inventory.json`: 257 files,
  SHA256 `e7b415d54004550faec96791efef56252e27aa02073b0d0db39cbcabab173725`.
- Pre-execution: `sha256sum --check` OK; unchanged accepted verifier
  (`t06-s1-verify-artifact.py` with the explicit S2 manifest) PASS 257 rows.
- Post-regression repeat: checksum OK, verifier PASS 257 rows. No hash drift.

## Isolation

Provisioned disposable `T01_NODE_HOME` with `PATH="$T01_NODE_HOME/bin:$PATH"`:
Node v24.21.0, npm v11.19.0 (confirmed; location supplied privately, not
persisted here). Fresh neutral run root with sibling `home` (HOME) and `tmp`
(TMPDIR, not under HOME), fresh XDG cache/config/data roots. Cleared
`NODE_OPTIONS`, `NODE_TLS_REJECT_UNAUTHORIZED`, `NODE_EXTRA_CA_CERTS`,
`SSL_CERT_FILE`, `SSL_CERT_DIR`, `DBUS_SESSION_BUS_ADDRESS`,
`DBUS_SYSTEM_BUS_ADDRESS`. Issued T04 diagnostic facilities and owned
literal-loopback HTTPS with existing test-only CA only; no personal
provider/bus/keyring, no ambient trust changes.

## Commands and results (each run ONCE, no skips/todos)

1. S2 owning selection (3 files), exit 0:
   `node node_modules/vitest/vitest.mjs run test/unit/t06/s2-version-expiry-validation.test.mjs test/fault/t06/s2-durable-dispatch.test.mjs test/fault/t06/s2-concurrency-retention.test.mjs`
   → Test Files 3 passed (3); Tests 40 passed (40); 0 failed, 0 skipped.
2. Unchanged regressions (12 files), exit 0 — run ONLY after owning
   ALLPASS with cleanup/hash intact:
   S1 `01-expiry-grant-oracles` + `02-session-fence-matrix` +
   `commit-fence` + `test/unit/t04` + T05 `04-hooks-fences-dispatch`
   → Test Files 12 passed (12); Tests 129 passed (129)
   (S1 owning 51 + T04 unit 54 + T05 hooks 24); 0 failed, 0 skipped.

No owning failure/timeout/hash drift/fixture/cleanup problem; no reruns,
repairs, diagnostics, or expansion. No `npm test/check` whole-repo claim;
parked/deferred suites unexecuted and NOT passed.

## Cleanup

Post-run HOME/TMPDIR verified empty; issued facilities/servers settled via
in-test teardown before run-root removal. Only the QA-owned disposable run
root was removed; cleanup propagated with no failure to report.

## Honest scope note

The durable-before-dispatch oracle asserts parsed durable RECORD equality
(version/binding/grant plus exact embedded pending body/key values) against
the pre-release snapshot and the dispatched request — not raw whole-vault
JSON-byte equality. Fixture results are isolated synthetic evidence, not
release interoperability. No raw private bodies/paths/credentials recorded.

## Readiness and HOLD

Execution phase complete per relay. **HOLD ALL actions pending coordinator
acceptance (independent clean reproduction, import smoke, source audit).**
No source/build/install, no S3–S5, no live state/writes, no `.pi`/settings
changes, staging, commits, or renewal.
