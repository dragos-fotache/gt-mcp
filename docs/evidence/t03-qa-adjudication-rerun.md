# T03 QA adjudication re-run (t03-f1 unchanged; green)

**Role:** independent QA (Muse Spark 1.3 Contributor, pane `w4:p2H`).
**Authority:** adjudication `docs/decisions/t03-zod-import-adjudication.md`
(test overconstraint, not target defect); frozen t03-f1 production/build
bytes unchanged (domain index.js `6488fbf2…`, index.d.ts `aaab42eb…`
re-verified before the runs). Prior 219/220 evidence preserved unmodified.
**Date (UTC):** 2026-10-11. Toolchain: Node v24.21.0, npm 11.19.0.

## QA-only correction (own probe/tests/evidence; no other changes)

- Probe reports per-name global descriptors (name, has-value, value type,
  null flag, accessor flag) — descriptor categories only, registry/config
  contents never recorded.
- New `import-control-zod.mjs`: isolated pinned public zod package import
  (never project production contents).
- Inert control keeps exact-zero global delta. Zod-only control and the
  domain run require exactly `__zod_globalConfig` + `__zod_globalRegistry`
  as own data descriptors with nonnull object values and no accessors — no
  wildcard/prefix ignores; any other addition/removal fails.
- Denies, guards, preflight, restore, resource/listener equality, and the
  synthetic env are untouched.

## Authorized runs on unchanged t03-f1

- `npm run test -- test/unit/t03`: **7 files passed, 221/221 tests passed**
  (219 prior + zod control + corrected domain import; the adjudicated
  failure now passes under the corrected expectation).
- `npm run smoke`: **7 files passed, 100/100 tests passed**.
- Own `prettier --check` + `eslint` over `test/unit/t03/` and the single
  foundation assertion file: clean, exit 0.

## Revised QA-source inventory (recomputed, not reused)

25 files under `test/unit/t03/`; 116 `it`/`it.each` declarations (rows
expand at run time to the executed totals above):

- backend-response.test.mjs `abde2acb…`
- fixtures.mjs `aeeb37b8…`
- helpers.mjs `ec0e502b…`
- import-control-deny-dgram.mjs `83eb4d52…`
- import-control-deny-dns.mjs `4069dfdc…`
- import-control-deny-exit.mjs `ec65f680…`
- import-control-deny-fetch.mjs `f955e7e5…`
- import-control-deny-fdwrite.mjs `90cc9c8a…`
- import-control-deny-http2.mjs `1031d346…`
- import-control-deny-spawn.mjs `99437a96…`
- import-control-deny-timer.mjs `3f900cf7…`
- import-control-deny-timers.mjs `b1d0c802…`
- import-control-deny-tls.mjs `eba876b9…`
- import-control-deny-write.mjs `46f2bbce…`
- import-control-deny-writeopen.mjs `f4cefa95…`
- import-control-target.mjs `5e0a845e…`
- import-control-zod.mjs `f893dda1…`
- import-deny-setup.mjs `ad82957d…`
- import-probe-controls.test.mjs `cc8ccea0…`
- import-probe-runner.mjs `71b85625…`
- lossless-revision.test.mjs `094d06c7…`
- parse-normalize-identity.test.mjs `67bdff0c…`
- public-surface.test.mjs `09d12d43…`
- tool-schemas.test.mjs `26cfe7cb…`
- write-projection-result.test.mjs `3308b494…`

(Full 64-hex digests recorded in the run transcript; prefixes above.)

## Limits and provenance

Synthetic fixtures only; no credentials, tokens, account/resource IDs,
private paths, or raw request/response bodies. No whole-suite/parked runs,
installs, builds, or manifest/config/spec/ADR edits. No guard/resource
relaxation. Green results are independent QA evidence, not acceptance —
final acceptance needs coordinator reproduction/clean locked-install
evidence.
