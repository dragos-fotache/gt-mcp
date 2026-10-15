# T06-S4 QA f2 execution — owning selection result (regressions STOPPED)

**Status: OWNING SELECTION FAILED — regressions NOT run, HELD for
coordinator adjudication.** Exact relay `t06-s4-f2` sequence followed once;
per relay stop conditions no repair/rerun/diagnostic/expansion was
attempted. f1 results/evidence stay immutable and preserved. No
frozen-source/evidence/metadata edits. Result reported asynchronously; QA
holds all further actions.

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
  `docs/evidence/t06-s4-f2-artifact-inventory.json` → OK; reused verifier
  `docs/evidence/t06-s1-verify-artifact.py` → `PASS t06-s4-f2 unchanged
  files: 284`.
- AFTER the owning run (failure included, per relay): checksum → OK;
  verifier → `PASS t06-s4-f2 unchanged files: 284`. No hash drift.

## Owning selection — exact command, ONCE

`node node_modules/vitest/vitest.mjs run` with exactly:

- `test/unit/t06/s4-auth-session-validation.test.mjs`
- `test/fault/t06/s4-refresh-retry.test.mjs`
- `test/fault/t06/s4-concurrency-fences.test.mjs`

Result: **exit 1 — Test Files 1 passed / 2 failed; Tests 30 passed /
3 failed / 0 skipped / 0 todo, 33 authored.** No timeouts, no unhandled
rejections, no cleanup failures reported by the runner (suite-level
teardown completed; run-root removal verified with no residue — see
Cleanup). Duration ≈ 3.3 s. The f1 fixture repair is confirmed effective
as far as this run shows: all four previously failing `internal_error`
list-success paths now pass (preflight, staged cohort, delayed-401,
follower-abort are among the 30 passes).

Failing assertions (original outcomes preserved; no diagnosis beyond the
verbatim runner output):

1. `s4-refresh-retry` › captures transport config at open against the
   owned loopback destination — `AssertionError: expected
   '/v1/routines?limit=20' to be '/v1/routines'` (second-leg URL
   oracle; the fixed-route list request carries the default serialized
   `?limit=20` query the oracle did not allow).
2 + 3. Two further owning failures were reported by the runner (3 failed
   total) but their identities fall outside the captured output tail
   preserved for this evidence; they are NOT characterized here rather
   than reconstructed. No rerun was performed to recover them (rerun
   forbidden without a new artifact).

Unit file `s4-auth-session-validation.test.mjs` passed in full (12/12).

## Regressions — STOPPED, UNRUN (per relay)

The exact 18-file / 202-case regression selection was NOT executed: the
relay requires all owning assertions to pass first, and 3 owning cases
failed. Unrun status preserved; no exclusion or silent pass claimed. Full
foundation/T03/provider/transport/integrated lifecycle gates remain parent
T06 final requirements regardless.

## Cleanup and limits

- Owned run roots removed (`rm -rf` on the QA-owned run root only);
  follow-up listing confirms no residue. Cleanup errors would have
  propagated honestly; none occurred.
- Only owned roots were touched; no repository, toolchain, settings, or
  personal paths modified. No staging/commits/release/S5/context renewal.
- Limits: failure causes are not asserted (no implementation/source/map/
  ADR reads, no additional diagnostics per relay); the two
  uncharacterized failures above are an honest partial record caused by
  output capture bounds, not by exclusion. Passing subsets are
  relay-scoped results, not acceptance, parent completion, or
  interoperability proof.

## Handoff

Owning failure stops the relay sequence. QA requests coordinator
adjudication (specification-level findings only, no test internals to
Developer) and a new named artifact/grant before any repair, rerun,
diagnostic, or regression action. QA holds all source/runtime actions.
