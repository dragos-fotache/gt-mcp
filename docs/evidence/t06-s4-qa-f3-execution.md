# T06-S4 QA f3 execution — COMPLETE PASS (owning 33/33 + regressions 202/202)

**Status: OWNING + REGRESSION SELECTIONS ALL PASS on the f3 artifact.**
Exact relay `t06-s4-f3` sequence followed once with mandatory full-output
capture; no repair/rerun/diagnostic/expansion. f1/f2 red results and the
two irretrievable f2 observations stay historical (not reconstructed, not
claimed fixed by this run — this is a NEW artifact run over the same 33
cases). No frozen-source/evidence/metadata edits. Result reported
asynchronously; QA holds all further actions. Relay acceptance is the
Coordinator's; this evidence is not acceptance, parent completion, or
interoperability proof.

## Environment (sanitized; no private absolute paths persisted)

- Toolchain: privately supplied disposable `T01_NODE_HOME` with
  `PATH="$T01_NODE_HOME/bin:$PATH"` on every command → Node v24.21.0, npm
  11.19.0 (both confirmed per command; no ambient/system fallback, no
  install/build/dependency/settings change).
- Overrides cleared per command: `NODE_OPTIONS`, `NODE_COMPILE_CACHE`,
  `NODE_TLS_REJECT_UNAUTHORIZED`, `NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE`,
  `SSL_CERT_DIR`, `DBUS_SESSION_BUS_ADDRESS`, `DBUS_SYSTEM_BUS_ADDRESS`.
- Fresh QA-owned neutral run root (disjoint sibling `HOME`/`TMPDIR`, fresh
  `XDG_*`/cache, `NPM_CONFIG_CACHE`, `TZ=UTC`, `NO_COLOR=1`); diagnostic
  storage + test-owned literal-loopback HTTPS with existing test-only CA
  only. Synthetic mutation fixture traffic only; no live/private/personal
  service, no product writes, no new seam/framework.

## Integrity checkpoints (frozen inventory, hash only)

- BEFORE any compiled-target import: `sha256sum --check` on
  `docs/evidence/t06-s4-f3-artifact-inventory.json` → OK; reused verifier
  `docs/evidence/t06-s1-verify-artifact.py` → `PASS t06-s4-f3 unchanged
  files: 289`.
- AFTER owning (pass): checksum → OK; verifier → `PASS … 289`.
- AFTER regressions (pass): checksum → OK; verifier → `PASS … 289`. No
  hash drift at any checkpoint.

## Owning selection — exact command, ONCE, full log retained

`node node_modules/vitest/vitest.mjs run` with exactly:

- `test/unit/t06/s4-auth-session-validation.test.mjs`
- `test/fault/t06/s4-refresh-retry.test.mjs`
- `test/fault/t06/s4-concurrency-fences.test.mjs`

Full stdout+stderr retained to an owned log BEFORE viewing (no
truncating pipeline); actual exit captured independently: **exit 0 —
Test Files 3 passed (3); Tests 33 passed (33); 0 failed / 0 skipped /
0 todo.** No timeouts, no unhandled rejections, no cleanup failures. The
complete log is 9 lines (runner banner + summary; zero failure sections
exist to transcribe). Duration ≈ 3.3 s.

## Regression selection — exact command, ONCE, full log retained

Exact 18 files (S3 recover/replay/concurrency, S1 oracles/fences,
commit-fence, S2 validation/dispatch/retention, 8 T04 unit files, T05
hooks dispatch) with full stdout+stderr to an owned log and independent
exit capture: **exit 0 — Test Files 18 passed (18); Tests 202 passed
(202); 0 failed / 0 skipped / 0 todo.** No timeouts, no unhandled
rejections, no cleanup failures. The complete log is 9 lines (banner +
summary only). Duration ≈ 6.8 s. Full foundation/T03/provider/transport/
integrated lifecycle gates remain parent T06 final requirements, not
passed here; parked T02/deferred T05 work preserved unexecuted/unpassed.

## Cleanup and limits

- Sanitized evidence (this file) created BEFORE removing owned logs and
  roots. Owned run roots removed (`rm -rf` on the QA-owned run root
  only); follow-up listing confirms no residue. Cleanup errors would have
  propagated honestly; none occurred.
- Only owned roots were touched; no repository, toolchain, settings, or
  personal paths modified. No staging/commits/release/S5/context renewal.
- Limits: green selections on the frozen artifact are relay-scoped
  results (no skipped pass, no hidden exclusion, no contract weakening);
  they do not constitute slice acceptance, release certification, live
  interoperability, sandbox/power-loss proof, or coverage of unselected
  suites. Final clean locked reproduction, identical compiled bytes, and
  import smoke/source audit remain Coordinator-owned gates.

## Handoff

Complete owning + regression evidence delivered. QA requests coordinator
disposition under the relay's final-reproduction gates. QA holds all
source/runtime actions.
