# T21-S2 — Invocation-local creation acceptance

**Disposition: accepted/closed (2026-10-17).** User-assigned S2 under the
[work order](../tasks/t21-s2-work-order.md), shared MCP draft0.3 and
[successor interfaces](../decisions/t21-single-record-storage-spec.md).
Primary-agent implementation/review; not independent T20 review, parent T21
acceptance, a refreshed delivery package or a laptop/live deployment.

## Result

create_routine accepts name/exercises only; operationId is rejected. Every call
allocates a fresh routine family and step keys. Creation keeps requests, confirmed
steps and outcome context only in invocation memory; no admission repository,
restart executor, stored terminal result, receipt reauthorization or journal read
at tool-runtime startup. Success is `{routineId,status:"saved"}`. All creation
errors and adapter cancellation/size/unknown-result fallbacks have retryable:false;
its idempotentHint is false. Six read hints/behavior remain unchanged.

Validation/defaults/whitelist, visible-reference precheck, fixed-origin authenticated
HTTP, response/target/content confirmation, lossless revisions, current binding
fences and stop-before-unsent-step behavior remain. All request bodies are prepared
and checked against the existing transport request budget before first mutation.
The optional internal maxRequestBytes composition field carries that existing
validated budget; no new public config/tool field or changed default is introduced.

The existing auth facade intentionally uses single-attempt resource legs with one
eligible 401 refresh/retry. Preserve it: exact route/body/key remain across that
supported retry; a rate limit stops the tool with safe metadata and retryable:false.
No new 429 retry loop, generic retry campaign or persistent recovery option.

Current-call routineId/lastConfirmedStep/outcomeUnknown are correlated in runtime
and output schema. Malformed/wrong-target responses do not advance; confirmed saved
content mismatch is concurrent_modification. Replacement of the captured binding
withholds context. Host cancellation may suppress the response entirely.

## Verification

Final [exact selection](t21-s2-selection.json): **821/821 PASS in66 files**, zero
failed/skipped/pending/todo. Of these,267 checks are in full active T03/T10/T11/T15/
creation protocol/process owning suites, and554 are relevant read/stdio/auth/HTTP/
legacy-journal/foundation regressions. No root whole-repository-suite pass is claimed.

The [inventory](t21-s2-inventory.json) records617 stable source/test/config/emitted/
delivery hashes throughout execution. All66 selected files passed on the stable
candidate; no install/build/edit raced execution. [Cleanup](t21-s2-cleanup.json)
confirms the owned provider/bus exited and private fixture roots were removed.

Actual production Secret Service/ext4, trusted synthetic HTTPS, official SDK and
compiled stdio processes verify repeated fresh creation, complete domain body/order,
one-refresh byte/key identity, rate-limit/permanent/uncertain stops, cancellation,
response loss/restart/EOF/SIGTERM and sign-out/login. No operation records are written.
A representative test seeds opaque old operation evidence and verifies that startup
does not decode it and new creation leaves its bytes intact. The scripted HTTPS
service is not real backend/DB/Android or Pi interoperability evidence.

[Static checks](t21-s2-static-checks.json): typecheck, production lint and formatting
PASS. Explicit build PASS;192 emitted JS/declaration files. Scoped changed-test
ESLint/Prettier PASS. No install/dependency/compiler change; no new clean locked
reproduction claimed in this slice. Final integrated/package reproduction belongs
to S6. Pinned environment/provenance is in [environment](t21-s2-environment.json).

## Scope and retired expectations

[Scope comparison](t21-s2-scope-comparison.json) records the exact changes and seven
removed paths. Original source/test bytes were copied to the bounded task's owned
temporary archive before replacement/removal; historical evidence is preserved.

- Remove `src/creation/history.ts` and `test/unit/t10/s2-helpers.mjs`: journal-only
  history/handle fixtures have no successor role.
- Remove `test/unit/t11/s1-recovery.test.mjs`, `test/fault/t11/s1-recovery.test.mjs`,
  `test/fault/t11/s3-crash-matrix.test.mjs`, `test/fault/t11/s3-child-helper.mjs`,
  `test/fault/t11/s3-recovery-child.mjs`: exact restart journal continuation and its
  exhaustive crash campaign are explicitly retired requirements.
- Adapt mixed T10/T11/T15/protocol/process tests to fresh-call semantics. Keep
  response/identity/numeric/default/guard/HTTP/auth/privacy oracles. T03's pure
  normalization/identity helper remains temporarily for legacy lifecycle modules;
  the creation service does not use it or persist a digest.
- Minimal legacy `src/operations/{candidate,repository,format}.ts` detachment is
  necessary while old trusted lifecycle commands remain until S4. Parse/validate
  legacy IDs internally and project legacy records only at the new codec boundary;
  never accept operationId in the tool or rewrite existing evidence. Full55-check
  legacy unit suite passes. The storage/auth/login/lifecycle/HTTP implementations
  are unchanged.
- Shared fixture/hint/description and cancellation expectations change only where
  they expose the new creation contract. One unchanged CJS calibration expected a
  retired require-time tag; independent reproduction imported no production code
  and correctly blocked the attempted fs write. Correct its effect tag only;
  nonzero exit, empty output, canary protection and every other guard remain.

All670 protected baseline inputs remain unchanged, including storage/auth/login/
lifecycle/HTTP, shared docs/backend/catalogue, dependencies/compiler/package inputs,
parked experiments and existing evidence/handoffs. The original delivered R1 archive
was preserved outside clean-build output and restored at its documented location;
SHA256 remains `ed5877dd16fc79043bc8773d3d15bb6fed2887dc891100ccebf8ddf2b3b22563`.
It remains the old package; it does not contain S2 behavior.

## Development findings and remaining work

[Execution history](t21-s2-execution-history.json) retains initial red runs: strict
schema/fixture mismatches, old API test expectations, a fixture Uint8Array-to-JSON
decode error, an accidental read-hint edit, stale stdio description and the CJS
tag mismatch were corrected. Early compiler/lint findings were repaired before
acceptance. An initial429 retry assertion incorrectly requested behavior absent
from the accepted auth facade; replace it with an explicit rate-limit stop oracle
and the existing eligible401 retry oracle. No auth/HTTP retry behavior was changed
to fit that test. Final exact821-check run passes; no failure exclusion or skips.

S3–S4 still own single-record credential storage, config2, ext4 restriction removal,
new profile lifecycle and old CLI/operation-module deletion. The current compiled
candidate still requires ext4/anchors/config1 for credentials and is transitional,
not an installation candidate. Later storage/lifecycle/backend/Pi/packaging suites
must be reconciled and qualified under their owning slices; their old expectations
are not silently counted as passed. T17/T19/T20 release gates remain applicable.
No clean-install/package-refresh, new real backend/host/browser/power-loss proof or
live enablement claim. No laptop changes, .pi edits, staging or commits.

S2 is closed; S3 ready/unassigned. No successor started.
