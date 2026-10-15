# T06-S1 QA f1 execution report (relay t06-s1-f1)

- Relay: `docs/evidence/t06-s1-f1-coordinator-relay.md` against artifact
  t06-s1-f1 (Developer c2), inventory 249 files, SHA256
  `5e31b0f0cf970d6db63d0ab5f2c88f9e59d6e728fbaa0b6f812ae57e263fa11b`.
- Toolchain: provisioned `T01_NODE_HOME`, Node v24.21.0 / npm v11.19.0.
  Isolated run env: fresh disposable HOME/XDG/temp/cache roots per phase,
  inherited `NODE_OPTIONS`/`NODE_EXTRA_CA_CERTS`/`SSL_CERT_*`/
  `NODE_TLS_REJECT_UNAUTHORIZED` cleared. Vitest 4.1.11 via
  `node node_modules/vitest/vitest.mjs run`.
- No source/build/install/config edits; frozen `t06-qa-source-ready.md`
  untouched. Real issued diagnostic facilities and synthetic loopback
  HTTPS only; no provider/backend/browser/Android invocation. No
  secrets, private paths, or bodies recorded here.

## 1. Pre-execution verification (mandatory)

- Inventory file checksum (`sha256sum --check`): OK, exit 0.
- Row verifier (`t06-s1-verify-artifact.py`): `PASS t06-s1-f1 unchanged
  files: 249`, exit 0.

## 2. Owning S1 selection — ALL PASS, exit 0

Command (exact relay sequence, once, no skips):

```sh
node node_modules/vitest/vitest.mjs run \
  test/unit/t06/01-expiry-grant-oracles.test.mjs \
  test/unit/t06/02-session-fence-matrix.test.mjs \
  test/fault/t06/commit-fence.test.mjs
```

Result: `Test Files 3 passed (3)`; `Tests 51 passed (51)`; duration
~3.34s; exit 0; zero skips, zero failures. All 51 S1 owning assertions
(vault/install validation, hook/fence matrix, durable persistence,
commit fence, loopback read/fence integration) pass against the frozen
Developer c2 target.

## 3. Explicit unchanged regressions — 398/399, ONE failure preserved

Command (exact relay sequence, run only because owning all passed):

```sh
node node_modules/vitest/vitest.mjs run \
  test/foundation test/unit/t03 test/unit/t04 \
  test/unit/t05/04-hooks-fences-dispatch.test.mjs
```

Result: `Test Files 1 failed | 22 passed (23)`;
`Tests 1 failed | 398 passed (399)`; exit 1; zero skips. All T03, T04
unit, T05 hook/fence, and remaining foundation suites pass. The single
failure:

- `test/foundation/intercept-calibration.test.mjs` >
  `sync write outside the report path is detected and fails the child`:
  expected a violation containing `"writeFileSync:write:other:"`;
  observed classification `"write:private:<disposable-tmp>/note.txt"`.
  The probe wrote under the relay-mandated disposable `TMPDIR`, which
  the calibration classifier labels `private` rather than `other`. This
  is an environment interaction with the mandated fresh disposable
  temp root — not an S1 product assertion, and no S1 owning file is
  implicated. Preserved exactly as observed; no rerun, no
  reclassification, no source/assertion change undertaken (per relay
  failure boundary; adjudication requested).

## 4. Post-execution verification and cleanup (mandatory)

- Inventory file checksum after suites: OK, exit 0.
- Row verifier after suites: `PASS t06-s1-f1 unchanged files: 249`,
  exit 0. Hash stable across execution.
- Owned work settled by test teardowns (facilities cleaned, holders
  closed, loopback listeners shut, gates released); the three issued
  disposable QA roots were verified present then deleted
  (`rm -rf` of exactly those roots; post-delete absence confirmed).
- Unrun/blocked: full relevant T04/T05 integration and complete active
  T06 remain mandatory at parent final acceptance (relay explicitly not
  waiving). Parked T02 and deferred T05 interception/proxy campaigns
  remain preserved, unexecuted, NOT passed. No whole `npm test/check`
  claim is made.

## 5. Handoff

Owning S1 evidence is green on the frozen artifact; one unrelated
foundation-calibration regression fails on mandated-disposable-TMPDIR
classification and awaits coordinator adjudication (no further runs
without a new grant). Milestone sent asynchronously to
coordinator/w4:p2K; all QA actions HOLD.
