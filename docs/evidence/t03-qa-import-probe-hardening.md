# T03 QA import-probe hardening (round 3; no execution; hold unchanged)

**Role:** independent QA (Muse Spark 1.3 Contributor, pane `w4:p2H`).
**Window:** source preparation only — NO compiled execution (no smoke/domain/
target/control runs). Static review (prettier/eslint) only.
**Date (UTC):** 2026-10-11.

## Fixes applied (public-surface.test.mjs + new control fixture)

1. Explicit `--` separator before `--qa-synthetic-arg` in the `node -e`
   argv (harness setup; otherwise Node consumes the dash-prefixed probe arg
   as a Node option and never imports).
2. Minimal child env allowlist (`PATH`, synthetic `HOME`/`TMPDIR`/`TMP`/
   `TEMP`/`XDG_*` all rooted in the temp scope, `NO_COLOR`, target href):
   no `process.env` spread, no credential/provider inheritance. Scope starts
   empty and is asserted recursively empty afterwards.
3. Pre-import deny/record wrappers (runtime builtins only, restored after
   import): `fetch`, `WebSocket`, macro timers, `process.exit`. Attempts
   throw (failing the import), are recorded in the report, and asserted
   absent. Ordinary module loading permitted; `queueMicrotask` untouched
   (not a timer/state effect).
4. Residual documented in-test (not claimed): ESM/CJS loading of
   child/worker/network modules cannot be blocked from inside the importing
   compartment with plain runtime builtins; those vectors are observed via
   the handle/resource delta, contained by the credential-free sandbox env,
   and covered by coordinator source audit. This instrumentation is NOT an
   OS sandbox.
5. Parent temp roots explicit (`mkdtempSync` scope, `try/finally` `rmSync`);
   pre-existing globals/listeners/resources/cwd/argv counters kept as
   supplementary full-equality deltas, not substitutes for the deny paths.
6. New synthetic control fixture `test/unit/t03/import-control-target.mjs`
   (no imports, no effects; never the dist artifact) with a control test
   running the identical probe against it.

## What the controls prove (precisely)

- Control passing proves the harness (spawn args incl. `--`, allowlisted
  env, snapshots, drains) contributes zero observable delta.
- Therefore at relay: control-pass + domain-fail attributes the delta to the
  target; domain-pass is meaningful rather than harness-masked; control-fail
  indicts the harness, not the target.

## Resource-noise answer (per coordinator)

- KEEP full-equality delta for pinned Node24.21.0 (implemented).
- If a noisy delta is actually observed: HOLD, report the exact safe
  category delta and baseline, no auto-denylist/relaxation. Future Node is
  unsupported until a separately reviewed upgrade; loader-only handling only
  if narrowly evidenced and coordinator-approved — never ignoring
  sockets/timers/children/writes.

## Scoped review commands and results (no execution)

- `npx prettier --check` over `test/unit/t03/`: clean.
- `npx eslint test/unit/t03/`: exit 0, no findings.
- No `node`, `vitest`, smoke, or target/control runs performed.

## Remaining questions

None blocking beyond the standing resource-noise policy above. Awaiting the
final frozen relay for real domain/foundation runs.
