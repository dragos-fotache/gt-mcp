# T06-S4 QA f1 execution — owning selection result (regressions STOPPED)

**Status: OWNING SELECTION FAILED — regressions NOT run, HELD for
coordinator adjudication.** Exact relay `t06-s4-f1` sequence followed once;
per relay stop conditions no repair/rerun/diagnostic/expansion was
attempted. No frozen-source/evidence/metadata edits. Result reported
asynchronously; QA holds all further actions.

## Environment (sanitized; no private absolute paths persisted)

- Toolchain: privately supplied disposable `T01_NODE_HOME` with
  `PATH="$T01_NODE_HOME/bin:$PATH"` on every command → Node v24.21.0, npm
  11.19.0 (both `node --version` and `npm --version` confirmed per command;
  no ambient/system fallback, no install/build/dependency/settings change).
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
  `docs/evidence/t06-s4-f1-artifact-inventory.json` → OK; reused verifier
  `docs/evidence/t06-s1-verify-artifact.py` → `PASS t06-s4-f1 unchanged
  files: 281`.
- AFTER the owning run (failure included, per relay): checksum → OK;
  verifier → `PASS t06-s4-f1 unchanged files: 281`. No hash drift.
- No compiled-output comparison was required at this gate (owned by the
  final clean reproduction, not this relay).

## Owning selection — exact command, ONCE

`node node_modules/vitest/vitest.mjs run` with exactly:

- `test/unit/t06/s4-auth-session-validation.test.mjs`
- `test/fault/t06/s4-refresh-retry.test.mjs`
- `test/fault/t06/s4-concurrency-fences.test.mjs`

Result: **exit 1 — Test Files 1 passed / 2 failed; Tests 28 passed /
5 failed / 0 skipped / 0 todo, 33 authored.** No timeouts, no unhandled
rejections, no cleanup failures reported by the runner (suite-level
teardown completed; run-root removal verified with no residue — see
Cleanup). Duration ≈ 3.2 s.

Passing file: `s4-auth-session-validation.test.mjs` (12/12, incl. all
surface/open/entry-gate oracles).

Failing assertions (original outcomes preserved verbatim; no diagnosis):

| File | Case | Observed rejection |
| ---- | ---- | ------------------ |
| `s4-refresh-retry` | preflights expired access with one durable fresh rotation before dispatch | `TransportError: Transport failure: internal_error.` |
| `s4-refresh-retry` | captures transport config at open against the owned loopback destination | `TransportError: Transport failure: internal_error.` |
| `s4-concurrency-fences` | shares one rotation across a staged three-leg cohort | `TransportError: Transport failure: internal_error.` |
| `s4-concurrency-fences` | reuses the installed successor for a delayed older-401 with no second rotation | `TransportError: Transport failure: internal_error.` |
| `s4-concurrency-fences` | joins a follower during held auth without a second dispatch and keeps abort local | `TransportError: Transport failure: internal_error.` |

All 28 remaining owning cases passed, including live-grant read, pending
exact replay, valid-401 single retry with byte-identical mutation identity,
held-auth caller-mutation retention, repeated/malformed/noneligible-401
mapping, resource-loss uncertainty, final-delivery suppression,
pre-auth local/size validation, leader/follower interruption, held-commit
interruption with retained evidence, invalidate suppression, 429 and
legacy-precision mapping, and foreign-caller rejection.

## Regressions — STOPPED, UNRUN (per relay)

The exact 18-file / 202-case regression selection was NOT executed: the
relay requires all owning assertions to pass first, and 5 owning cases
failed. Unrun status preserved; no exclusion or silent pass claimed. Full
foundation/T03/provider/transport/integrated lifecycle gates remain parent
T06 final requirements regardless.

## Cleanup and limits

- Owned run roots removed (`rm -rf` on the QA-owned run root only);
  follow-up listing confirms no residue. Cleanup errors would have
  propagated honestly; none occurred.
- Only owned roots were touched; no repository, toolchain, settings, or
  personal paths modified. No staging/commits/release/S5/context renewal.
- Limits of this evidence: unexecuted-source conclusions from prior gates
  are superseded for the 5 failed cases by the above observed outcomes;
  no failure cause is asserted here (no implementation/source/map/ADR
  reads, no additional diagnostics per relay). Passing subsets are
  relay-scoped results, not acceptance, parent completion, or
  interoperability proof.

## Handoff

Owning failure stops the relay sequence. QA requests coordinator
adjudication (specification-level findings only, no test internals to
Developer) and a new named artifact/grant before any repair, rerun,
diagnostic, or regression action. QA holds all source/runtime actions.
