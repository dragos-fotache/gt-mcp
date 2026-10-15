# T06-S1 QA f1 calibration rerun report (relay t06-s1-f1, same artifact)

- Adjudication: `docs/decisions/t06-s1-f1-calibration-adjudication.md` —
  no waiver, no source/oracle change, no failing-test exclusion. Same
  frozen artifact t06-s1-f1 (249 files, SHA256
  `5e31b0f0cf970d6db63d0ab5f2c88f9e59d6e728fbaa0b6f812ae57e263fa11b`).
  First failed evidence (`t06-qa-f1-execution.md`) preserved unchanged.
- Toolchain: provisioned `T01_NODE_HOME`, Node v24.21.0 / npm v11.19.0,
  Vitest 4.1.11. Inherited `NODE_OPTIONS`/`NODE_EXTRA_CA_CERTS`/
  `SSL_CERT_*`/`NODE_TLS_REJECT_UNAUTHORIZED` cleared. No builds,
  installs, source edits, or broad runs.
- Environment layout (the corrected variable): ONE newly issued
  disposable scope with DISJOINT siblings — `<scope>/home` (HOME, XDG
  roots underneath), `<scope>/tmp` (TMPDIR/TMP/TEMP, not inside HOME),
  `<scope>/cache` (npm cache); neutral component names only. Initial
  failed-run relation (structural, no paths recorded): TMPDIR was a
  descendant of HOME (`HOME/tmp`), so the harness classified the neutral
  temp probe as a parent-HOME-descendant `private` path instead of
  `other`. Disjointness verified before runs (`test ! -e $HOME/tmp`).
- No provider/backend/browser/Android invocation; no secrets, private
  paths, or bodies recorded here.

## 1. Pre-execution verification (mandatory)

- Inventory file checksum: OK, exit 0.
- Row verifier: `PASS t06-s1-f1 unchanged files: 249`, exit 0.

## 2. Focused failure suite — ALL PASS, exit 0

```sh
node node_modules/vitest/vitest.mjs run test/foundation/intercept-calibration.test.mjs
```

Result: `Test Files 1 passed (1)`; `Tests 16 passed (16)`; exit 0;
zero skips. The previously failing sync-write probe now classifies the
neutral temp scope as `other` with assertions unchanged, confirming the
environment-layout diagnosis with no oracle change.

## 3. Full original regression selection — ALL PASS, exit 0

Run only because the focused suite fully passed, in the SAME
sibling-root environment (scope identity re-confirmed by its issued
home/tmp/cache layout before reuse):

```sh
node node_modules/vitest/vitest.mjs run \
  test/foundation test/unit/t03 test/unit/t04 \
  test/unit/t05/04-hooks-fences-dispatch.test.mjs
```

Result: `Test Files 23 passed (23)`; `Tests 399 passed (399)`;
exit 0; zero skips. Combined with the independently green frozen S1
owning 51/51 (not rerun per grant; identity preserved, no product
repair), the relayed selections are fully green on the unchanged
artifact.

## 4. Post-execution verification and cleanup (mandatory)

- Inventory file checksum after suites: OK, exit 0.
- Row verifier after suites: `PASS t06-s1-f1 unchanged files: 249`,
  exit 0. Hash stable across execution.
- Owned work settled by test teardowns; the single issued disposable
  scope was removed (`rm -rf` of exactly that scope) with absence
  confirmed via `test ! -e` (no `|| true` masking anywhere).
- Limits: full relevant T04/T05 integration and complete active T06
  remain mandatory at parent final acceptance (not waived). Parked T02
  and deferred T05 interception/proxy campaigns remain preserved,
  unexecuted, NOT passed. No whole `npm test/check` claim.

## 5. Handoff

Calibration rerun evidence is green with zero oracle changes; initial
FAILED 398/399 report stands as the historical record of the
layout-induced failure. Milestone sent asynchronously to
coordinator/w4:p2K; all QA actions HOLD.
