# T08-S1 QA F2 — one-run frozen c3/f2 execution evidence (sanitized)

## Authority and scope

ONE-RUN final isolated relay per `docs/evidence/t08-s1-f2-coordinator-relay.md`
against frozen identity `docs/evidence/t08-s1-f2-artifact-inventory.json`
(137 inputs; ONLY `test/read-runtime/fixtures.mjs` changed from F1; compiled
c3 bytes identical). Same 10-file control as F1: seven full owning S1 files
plus three relevant unchanged regressions. No source/edit/build/install/
second run; source windows CLOSED. F1 candidate/outputs/result/pointers remain
preserved separately; F1 stays failed with original code UNKNOWN (never
retroactively passed). Developer held; no S2/S3 grant.

## Invocation (private values withheld; placeholders only)

Single invocation of the Coordinator-supplied private launcher/control with the
NEW `candidate-f2` scope, under the pinned disposable Node toolchain with the
private real provider/CA/loopback setup. No preliminary run was needed: the one
full inexpensive active suite includes the repaired `getWorkout` case. Full
stdout/stderr and structured results are retained in the private control area
(`s1-safe-result.json`, `s1-vitest-result.json`, full logs); F1 prior copies
under the control `f1-observations` area were not overwritten. No private
paths, raw request/response bodies, credentials, or scope contents appear here.

## Result (counts from actual result JSON)

- Safe structured result: `code` 0, `signal` null — 10 files, **101 total /
  101 passed / 0 failed / 0 pending**, `runtimeErrors` null, `failures` [].
  Vitest JSON agrees: 101/101 passed, `success` true; stderr log empty (0 bytes).
- Per-file passed/failed from actual JSON (sums to 101/0):
  - `test/read-runtime/reads-success.test.mjs`: 6/0 — including the repaired
    "getWorkout maps the complete canonical record" against the NEW valid
    finished fixture (one entry, one completed set).
  - `test/read-runtime/cancel-close.test.mjs`: 10/0.
  - `test/read-runtime/reads-pages-filters.test.mjs`: 3/0.
  - `test/read-runtime/canonical-errors.test.mjs`: 3/0.
  - `test/read-runtime/validate-before-auth.test.mjs`: 6/0.
  - `test/read-runtime/startup-ownership.test.mjs`: 3/0.
  - `test/read-runtime/startup-config.test.mjs`: 8/0.
  - `test/unit/t03/backend-response.test.mjs`: 39/0.
  - `test/unit/t06/s5-lifecycle-validation.test.mjs`: 11/0.
  - `test/foundation/inert-imports.test.mjs`: 12/0.
- Owning seven: 39/39; unchanged regressions: 62/62 (39 + 11 + 12).
- Relay checks: "PASS frozen input identity and isolated fixture listener
  teardown" and "PASS isolated fixture teardown" both reported.
- No additional unhandled errors reported: the structured report carries no
  separate runtime-error counter (`runtimeErrors` null) and the full output
  shows no unhandled-error entries; nothing is invented beyond that.

## Scope hygiene (verified post-run, private details withheld)

- Both NEW F2 fixture scope targets (scope and temp scope) verified ABSENT
  after teardown; only small pointer records remain in the private control
  area (same pattern as retained F1 pointers).
- Old retained F1 scope NOT cleaned up by QA; its separate Coordinator safe
  cleanup awaits release/evidence confirmation. No forced termination was used.

## Limits and handoff

- This relay is execution evidence only, not S1 acceptance; independent review
  decides acceptance. No skipped case counted passed; no exclusion; no failure,
  hash, scope, output, or cleanup fault occurred, so no STOP condition fired.
- QA holds ALL after reporting; no private locations/IDs/credentials/bodies in
  this evidence; all fixture values remain visibly synthetic.
