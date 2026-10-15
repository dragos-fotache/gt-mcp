# T05 QA F1 execution report — first owning run (failures under adjudication)

**Status:** executed once per relay; 220/226 pass; 6 failures recorded
verbatim below; NO fixes, NO reruns; HOLD ALL target/source actions for
coordinator adjudication and a new focused window.
**Owner:** QA. **Coordinator:** coordinator/w4:p2K.
**Revision:** t05-f1 (c3 production + 15 active suites/4 helpers/8 TLS files;
191 frozen files; inventory
`04eb806a86a47dfab9c763e4c49be1e48a1abf32df8039146681c2c947bb8bf0`).

## Preflight (before execution)

- `node --version` → v24.21.0; `npm --version` → 11.19.0 (provisioned
  `T01_NODE_HOME`, no system runtime, no global installs, no Pi changes).
- Inventory manifest SHA256 matched; all 191 listed files present with
  matching hashes (`t05-f1 inventory unchanged: 191 files`).

## Exact command (single complete run, exit retained, no masking)

```sh
node ./node_modules/vitest/vitest.mjs run \
  test/unit/t05/01-exports-factory.test.mjs \
  test/unit/t05/02-validation-identity.test.mjs \
  test/unit/t05/03-query-serialization.test.mjs \
  test/unit/t05/04-hooks-fences-dispatch.test.mjs \
  test/unit/t05/05-budgets-deadlines-retry.test.mjs \
  test/unit/t05/06-errors-uncertainty.test.mjs \
  test/unit/t05/07-results-decode.test.mjs \
  test/unit/t05/08-error-event-interface.test.mjs \
  test/unit/t05/10-replay-identity.test.mjs \
  test/unit/t05/11-import-smoke.test.mjs \
  test/fault/t05/abort-timing.test.mjs \
  test/fault/t05/loopback-wire.test.mjs \
  test/fault/t05/loopback-tls.test.mjs \
  test/fault/t05/production-limits.test.mjs \
  test/fault/t05/proxy-boundary.test.mjs
```

## Result: exit 1 — Test Files 4 failed | 11 passed (15); Tests 6 failed | 220 passed (226)

- Duration 9.21 s (transform 2.38 s, setup 0 ms, import 5.15 s, tests
  18.12 s). No skips: all 226 tests in the 15 files ran (0 skipped, 0
  todo); no name filtering, no passWithNoTests.
- Failing files: `test/fault/t05/production-limits.test.mjs` (3),
  `test/unit/t05/02-validation-identity.test.mjs` (1),
  `test/unit/t05/04-hooks-fences-dispatch.test.mjs` (1),
  `test/unit/t05/11-import-smoke.test.mjs` (1).

## Fully observed failures (verbatim observables, sanitized)

1. `04-hooks-fences-dispatch > shared ordered trace across two attempts >
   records the full cross-hook order with frozen summaries and attempt
   numbers` — trace mismatch: implementation produced one EXTRA trailing
   `"current"` after `check:pre-delivery` + `current` (13 entries vs 12
   expected). All hook order/attempt numbers otherwise exact. QA analysis:
   an additional synchronous fence check is plausible conservative behavior;
   the exact-trace oracle is likely over-rigid. Adjudication requested; no
   oracle changed.
2. `11-import-smoke > imports the public entry with a prompt clean exit and
   no residue` — resource delta `{ PipeWrap: 1 }` vs expected `{}` after
   importing the public entry (listeners unchanged, exit 0, stderr empty,
   single report line). QA analysis: cannot determine black-box whether one
   PipeWrap is benign runtime behavior or an import-time handle leak;
   needs coordinator source-audit adjudication. No oracle changed.
3. `02-validation-identity > preserves allowed own __proto__ convenience
   data without pollution` — `TransportError: Transport failure:
   invalid_arguments.` QA analysis: strict query wrappers reject unknown
   fields, so rejecting an own `__proto__` member is plausibly spec-correct
   (the T03 additive-name rule forbids dropping/mutating such data, not
   accepting unknown strict fields); the oracle's "allowed" premise is
   likely wrong. Adjudication requested; no oracle changed.
4. `production-limits` upgrade case
   (`rejects protocol upgrades safely and the client socket closes`,
   failure location line 442) — FAILED; the retained tail preserved the
   location but not this case's assertion detail (see observation gap
   below). No oracle changed.

## Observation gap (honest limitation, focused window requested)

Failures [1/6] and [2/6] (both in `production-limits.test.mjs` by count:
3 file failures minus the upgrade case above) scrolled out of the retained
output tail, so their test names and assertion details are NOT recorded
here. Per the relay's one-run/no-rerun rule QA did not re-execute to
recover them. Request: a focused re-observation window (or coordinator
direction) to capture the two missing failure details before any repair.

## Postflight (after execution, including on failure)

- Inventory re-verified: manifest SHA256 matched;
  `t05-f1 inventory unchanged after execution: 191 files`. Production held
  throughout; no source/helper/fixture edits, no build/install/config.
- Fixture directory intact (8 files present); no trust installed; no
  personal/live backend, credentials, or actual product writes touched.
- Cleanup: all fault servers close in test `finally` blocks via bounded
  `closeServer`; child processes reaped by test harnesses; run completed in
  one process invocation with no hangs.

## Limits

- Synthetic injected doubles + owned literal-loopback HTTP/HTTPS fixtures
  only. No backend/DB/Google/browser/Android/Pi/host interop evidence.
- Explicit 15-file selection only: deferred 09/proxy-isolation/cleanup,
  parked T02, foundation/T03/T04 regressions and clean-snapshot
  reproduction are NOT covered by this run.
- This report is NOT acceptance. Final relevant regressions and clean
  locked reproduction follow the owning disposition.

---

## Focused re-observation: production-limits only (separately labelled)

Window: `docs/evidence/t05-f1-focused-observation.md` (no-edit,
production-limits only, same t05-f1 inventory/c3). Pins re-verified
(v24.21.0/11.19.0); inventory verified unchanged before AND after
(191 files). Structured JSON output to owned umask-077 temp path
(`/tmp/gt-mcp-t05-f1-limits.j5eJ4h.json`, mode 0600); full result path
shared with the coordinator out of band. No source/helper/fixture edits,
no other suites, no repairs.

- Limits-only result: exit 1 — 20 tests, 17 passed, 3 failed, 0 skipped.
- Failure 1 — `truncated bodies never become success and never
  auto-retry`: `TypeError: ROUTINE_JSON.subarray is not a function`
  (test line 217). Genuine QA harness defect: the constant is a string,
  the Buffer method call never built the stimulus, so no truncation was
  ever sent. Recorded as a QA-source defect for the repair grant; no
  oracle changed here.
- Failure 2 — `trailers cannot supply or override classification
  metadata`: expected 200 with the trailer `content-length: 9999` ignored;
  observed `Transport failure: internal_error.` The valid chunked body was
  served with a declared `Trailer: content-length` and a conflicting
  trailer value; whether the implementation rejects chunked framing, honors
  the trailer override, or fails on another head rule cannot be separated
  black-box from this oracle. Adjudication requested; no oracle changed.
- Failure 3 — `rejects protocol upgrades safely and the client socket
  closes` (line 442): rejection itself occurred per the error path, but
  the server-side socket showed no client close within the 5 s
  `waitForDeadline` bound (`synthetic-qa: fault condition not met within
  deadline`). Observed: no client-side cleanup in bound; whether cleanup
  is merely slower than the bound or genuinely leaked is undecided.
  Adjudication requested; no oracle changed.
- Passing in this file (17): streaming cap, header count/size, duplicate
  Content-Length/Content-Type, invalid UTF-8, gzip, malformed error body,
  103 skip + 103 exhaustion, benign trailers, 204 framing, wire/projected
  equality, and both padded trailer-accounting boundaries. These confirm
  the R3 head-code corrections and trailer formula on the wire.
- The earlier hook/query/smoke cases remain exactly as adjudicated above;
  this window adds no new claim about them.
