# T05 bounded verification plan — user-approved scope reduction

**Authority:** the user approved reducing testing scope after the coordinator
recommended retaining transport safety tests, simplifying the harness and using
focused checks during repair. This plan supersedes the earlier requirement to
build/calibrate a general Node API interception harness and exhaustively combine
all fault permutations. It does NOT change shared contracts or production behavior.

**Current state:** c3 production is held; coordinator production review,26targeted
observations and foundation100/T03221 regressions pass. Independent T05 acceptance
is still pending. QA may revise sources as below; production-target execution
requires a named frozen-artifact relay. No acceptance is granted by this document.

The user subsequently made this approach a
[standing policy for ALL future work](proportional-testing-policy.md).
This document remains T05's concrete active selection; later tasks choose their
own small relevant matrix rather than copying these15files or the old harness.

## 1. What remains mandatory

Sections1–9 of [the approved transport spec](t05-approved-transport-spec.md) remain
the public API/behavior contract. No weakening of fixed destination/auth separation,
strict input handling, exact bytes/keys, lossless decode, budgets, cancellation,
fences, error/uncertainty handling or privacy. No changes to shared-docs, production
sources, manifests, lockfile, compiler, lint/Vitest configuration or test discovery.
T02 remains parked; T09 unassigned; T13/T14 retired. Actual writes stay disabled
outside explicitly isolated synthetic fixtures. No release/interoperability claim.

Coverage is a SMALL contract-derived matrix, not a Cartesian product. One good
representative test may cover several requirements. Keep sound existing core tests;
repair genuine broken assertions/helpers. Do not delete a failing PRODUCT requirement
or label it deferred merely because implementation fails. A narrower methodology
is not permission to round numbers, leak credentials, skip validation or guess that
a dispatched write did not commit.

| Core group | Minimum meaningful evidence |
| --- | --- |
| Destination and route boundary | Default HTTPS origin validation; isolated literal-loopback opt-in; canonical path/query escaping; bearer vs control routes; forbidden purpose/fields before dispatch. Actual same-origin and cross-origin redirect refusal including a mutation; no cookie forwarding. |
| TLS and direct connection | Actual owned local HTTPS positive and untrusted/expired/wrong-host negatives. One representative startup proxy-environment check on HTTP and HTTPS, with an owned non-forwarding trap/control and a direct target; coordinator reviews explicit-agent/global-dispatcher isolation. No proxy forwarding/tunnel framework required. |
| Identity and replay | Exact method/concrete route/body/key unchanged for draft/populate/save; numeric spelling/whitespace canary; capture before awaits and representative caller/sender-copy alias mutation. No key regeneration or sync fallback. |
| Decode/results | Six read routes correctly mapped; expected-ID mutation response decoding; Int64 above2^53 and max/overflow via T03; malformed/duplicate/empty results; logout204 and private raw-control boundary; no partial success. Do not duplicate the entire accepted T03 schema suite inside T05. |
| Limits and timing | Local body/request-head caps, response streaming cap, projected expansion and one head/count/trailer boundary family with legal configurations and exact error mappings. Attempt/total deadline, pre/post-dispatch abort, delayed hook/sender suppression. No combinatorial socket-stress benchmark. |
| Errors/retries | Table-driven known/unknown/malformed errors,413/429/500/503, exact bounded Retry-After/backoff, attempt exhaustion, no auto401refresh and all controls1attempt. Representative poisoned message/sensitive-code tests, no raw diagnostics. |
| Uncertainty/fences | No false predispatch claim after sync throw or rejected sender. Loss then401/413/429/key-conflict and one later local failure retain uncertainty;503/projected overflow uncertain; only valid unfenced success settles. One representative race at pre-send and pre-delivery, including final synchronous abort/deadline edge. |
| Import/API discipline | Exact public exports/declarations, immutable error/result surfaces, small isolated import smoke (bounded exit, stdout/stderr, listener/resource deltas) PLUS coordinator production source audit for import-time IO/timers/network/process/global handlers. No general Node API interception/sandbox claim. |
| Regression/packaging | Existing foundation/T03/T04 suites unchanged, T04 real private-provider fixture, four production checks and final clean allowlisted locked source snapshot with byte-identical build. No skipped checks or mocked release integration passes. |

## 2. Explicit active T05 test selection

The following are the only owning T05 suites in the bounded acceptance selection.
All assertions inside them run; no skipped tests, name-pattern cherry-picking or
passWithNoTests. Two small replacements are QA-owned NEW files.

```text
test/unit/t05/01-exports-factory.test.mjs
test/unit/t05/02-validation-identity.test.mjs
test/unit/t05/03-query-serialization.test.mjs
test/unit/t05/04-hooks-fences-dispatch.test.mjs
test/unit/t05/05-budgets-deadlines-retry.test.mjs
test/unit/t05/06-errors-uncertainty.test.mjs
test/unit/t05/07-results-decode.test.mjs
test/unit/t05/08-error-event-interface.test.mjs
test/unit/t05/10-replay-identity.test.mjs
test/unit/t05/11-import-smoke.test.mjs             # new small replacement

test/fault/t05/abort-timing.test.mjs
test/fault/t05/loopback-wire.test.mjs
test/fault/t05/loopback-tls.test.mjs
test/fault/t05/production-limits.test.mjs
test/fault/t05/proxy-boundary.test.mjs              # new small replacement
```

QA publishes a dependency inventory of helpers/fixtures imported by these files.
Reuse simple existing synthetic fixtures/HTTP helpers; no production reads. Active
source lint/format/import checks cover those15suites AND every helper they use,
not just leaf tests. The coordinator verifies the active imports do not depend
on the deferred interception/proxy infrastructure. An active helper with a real
bug still must be fixed; source-quality gates remain mandatory.

Later relay supplies the exact command with this complete file list (or a
coordinator-owned transparent equivalent). No new npm scripts/config/manifest
edits needed. Results MUST say bounded T05 selection, not whole-suite PASS.
Do not run npm test/check or directory-wide T05 selection and silently discard
failures from preserved deferred files.

## 3. Explicitly deferred, preserved, NOT passed

These remain on disk unchanged by the coordinator; QA preserves the current work
and its historical failures rather than deleting/rewriting them into success:

- `test/unit/t05/09-inert-import.test.mjs`, its interception register/resolve hooks,
  shims, broad violator controls and related general child/harness calibration.
- `test/fault/t05/proxy-isolation.test.mjs` and `proxy-child-fixture.mjs`, the
  general forward/CONNECT proxy and broad global-sabotage calibration machinery.
- `test/fault/t05/cleanup-calibration.test.mjs`, insofar as it certifies the old
  harness itself. Bounded cleanup of fixtures actually used by core tests remains
  required, not deferred.
- Exhaustive alias/default/CJS interception coverage, every Node builtin/constructor,
  large fault cross-products, synthetic harness stress/mutation campaigns and
  duplicate tests of already accepted T03 domain behavior.

The shared `spawn-collect.mjs` may remain with the deferred work; core replacements
should prefer a small standard-library bounded asynchronous child invocation,
not repair a generic collector framework. A reused helper must be genuinely needed,
reviewed and included in the active source-quality gate. No need to finish unrelated
old lint/format/calibration work to unblock this bounded slice.

Deferred files remain discoverable by the UNCHANGED broad Vitest configuration.
This plan authorizes explicit scoped selection only, not a whole-suite green claim
or release reconciliation. A later whole-suite/package/release task must explicitly
resolve the retained deferred/parked material; it cannot cite T05 scoped acceptance
as proof that all repository tests pass.

No deferred case is an acceptance pass, mock backend certification, or statement
that its earlier failure disappeared. Record deferred status and replacement
coverage in final T05 evidence. If a deferred file contains a genuine core product
assertion not represented in the matrix/active files, QA must retain that assertion
in an active independent test and identify the move in evidence before relay.

## 4. Deliberately small replacements

### Import smoke

One small isolated child imports only the emitted public entry, exits within a
short bound, and emits an allowlisted summary through the test runner. Assert
unexpected stdout/stderr and persistent listener/resource changes are absent.
No shim loader, global builtin rewriting, filesystem suffix allowlist, standalone
violator family or general-purpose runtime sandbox. A smoke result is not proof
that every conceivable side effect is intercepted. Coordinator source audit closes
that evidence boundary (imports, top-level initialization and actual dependencies);
QA remains black-box and never reads implementation for this audit.

Keep child timeout, bounded output and cleanup using standard Node facilities
where practical. Native artifact-free sanity checks of this SMALL helper are
allowed, but do not rebuild the retired generalized calibration project around it.

### Proxy boundary

Use an owned local non-forwarding trap that records connection/CONNECT attempts
and fails native control traffic. It does NOT need to route arbitrary URLs, forward
requests or establish TLS tunnels. A native child under the chosen startup proxy
configuration proves the trap would be reached; the production transport must
instead reach its owned HTTP/HTTPS target. All listener addresses are explicit
loopback; child environment allowlisted, no inherited real proxy/credential config.
Use an asynchronous bounded child so parent fixture servers stay responsive.
Observe bounded shutdown of only owned children/sockets. Runtime global-agent
isolation additionally gets coordinator source review; exhaustive sabotage variants
are not required in this slice.

## 5. Check cadence and responsibility

- QA now: finish only active core source repairs, the two small replacements,
  active helper dependency inventory and scoped lint/format/parse checks. Capture
  deferred disposition honestly. No broad interception work; no target execution
  before explicit relay. Existing role read boundaries stay unchanged.
- Developer: c3 HOLD all source/build/install/config. This verification change
  requests NO production edit, API relaxation or extra dependency.
- Coordinator: check active source/fixture safety and methodology once, freeze
  source/build/lock plus active QA inventory, then grant exact execution commands.
  Review failures against public spec, routing product vs test/harness defects to
  their owners. No cross-role source details.
- During repairs: run the relevant focused check/test after a new reviewed freeze;
  do not rerun all existing suites for each tiny edit. Never patch a moving target
  under QA. Full active T05 suite and unchanged foundation/T03/T04 regressions run
  on the final candidate, followed by independent clean-source locked reproduction.
- Before acceptance: every core matrix row has exact passing command/evidence,
  source/production checks pass, no skipped required gate, no unresolved product
  failure. External backend/Google/Android/Pi interoperability remains later work.

This is the user's explicit scope decision, not a test waiver invented to conceal
failures. Coordinator acknowledges delayed static checks and overgrown harness
requirements caused avoidable work; the narrower plan corrects that workflow.
No real writes, credentials/live services, .pi changes, staging/commits or successor.
