# T05 bounded core matrix → test mapping (QA-owned, relay-time execution)

**Status:** source mapping for the user-approved 15-suite bounded selection;
no suite/target execution; HOLD for the coordinator frozen-artifact relay.
**Owner:** QA. **Coordinator:** coordinator/w4:p2K.
**Authority:** `docs/decisions/t05-bounded-verification-plan.md` (§1 core
groups, §2 active selection), `docs/decisions/t05-approved-transport-spec.md`
§§1–9 (unchanged behavior), current grant in `docs/tasks/t05-work-order.md`,
and the standing `docs/decisions/proportional-testing-policy.md` (small
meaningful verification; early static checks; no harness creep).
Deferred items below are preserved failures/gaps, never passes.

## Core matrix → active suites

| Core group (plan §1) | Active suites covering it |
| --- | --- |
| Destination and route boundary | `03-query-serialization` (canonical escaping/order), `02-validation-identity` (origin/binding/UUID/purpose allowlist, GET zero-body), `01-exports-factory` (origin grammar, handle inventory), `loopback-wire` (exact headers/bytes, hostile inputs, same-origin + cross-origin + 307/308 redirect refusal incl. mutation, no-cookie) |
| TLS and direct connection | `loopback-tls` (fixture-trust positive; untrusted/expired/wrong-host negatives; env fail-closed; owned closed-port mapping), `proxy-boundary` (native control reaches non-forwarding trap and fails; transport reaches owned HTTP/HTTPS targets directly), `01-exports-factory` (TLS env gate) |
| Identity and replay | `10-replay-identity` (method/route/body/key across attempts for all three mutations, 40.0/4e1 canary, seam/caller alias, shared cross-namespace key), `02-validation-identity` (capture/copy semantics), `loopback-wire` (wire byte-freeze) |
| Decode/results | `07-results-decode` (six reads, expected-ID mutation decoding, Int64 max/overflow/exponent forms, malformed/duplicate/truncated, 204-only logout, private control bytes, exact result key sets) |
| Limits and timing | `05-budgets-deadlines-retry` (body/target equality/+1, wire vs projected expansion, Retry-After exact/unfit/huge/invalid, backoff caps, monotonic clocks, hook/sleep deadline, delivery suppression), `production-limits` (streaming cap, header count/size, duplicates, truncation, UTF-8, encoding, 103/trailer/upgrade/204-framing, head/projected equality incl. trailer accounting bounds), `abort-timing` (head timeout, mid-flight abort uncertainty, slow drip, post-abort reuse) |
| Errors/retries | `06-errors-uncertainty` (known/unknown/malformed table, 413/429/500/503, backoff, no auto-401-refresh, all-controls-1-attempt, poisoned-message/lexical privacy, no backendErrorCode in diagnostics), `04-hooks-fences-dispatch` (401/controls discipline, control secret privacy) |
| Uncertainty/fences | `06-errors-uncertainty` (sticky matrix: loss then 401/413/429/key-conflict, hook/credential failures, 503/projected standalone, success-only settlement), `04-hooks-fences-dispatch` (hook order/capture/final veto, pre/post-delivery fences, deferred/late races, post-guard rechecks) |
| Import/API discipline | `01-exports-factory` (exact 5 exports, frozen defaults, 14-method handle, factory capture, frozen trees, `.d.ts` surface), `08-error-event-interface` (constructor/derivation/immutability, WeakSet branding, event privacy/discipline, console silence), `11-import-smoke` (bounded isolated import: prompt exit, empty stderr, one report line, no listener/resource residue) + coordinator source audit |
| Regression/packaging | Unchanged foundation/T03/T04 suites at relay, T04 real private-provider fixture, four production checks, clean allowlisted locked snapshot with byte-identical build (coordinator-owned steps, not this file) |

## Exact active transitive helper inventory

Helpers imported (directly) by the 15 active suites — verified by
read-only import resolution (41 relative specifiers resolve, 15 `dist/http`
target references excluded, 0 missing):

- `test/unit/t05/helpers.mjs` — synthetic bindings/keys/doubles (session,
  clock/sleeper, scripted wire), wire fixtures (bundled exercise, pages,
  routine/workout records, raw Int64 texts), error catcher. Used by all ten
  unit suites and all five fault suites. No imports of its own.
- `test/fault/t05/helpers.mjs` — literal-loopback HTTP/HTTPS/raw servers,
  bounded close/deadline utilities, pair-header JSON responder, fixture
  loader, env scoping. Used by all five fault suites. No production imports.
- `test/unit/t05/import-smoke-child.mjs` — smoke child (listener/resource
  snapshots around one target import). Used only by `11-import-smoke`.
- `test/fault/t05/proxy-boundary-child.mjs` — boundary child (native
  control + transport target, two JSON lines). Used only by `proxy-boundary`.
- `test/fault/t05/fixtures/` — six coordinator-provisioned test-only PEMs
  (0600) + README/provenance. Used only by `loopback-tls` (and the HTTPS leg
  of `proxy-boundary` via cert path). Never printed, never trusted.
- Node builtins used directly: `node:http`, `node:https`, `node:net`,
  `node:child_process`, `node:fs` (fixture/declaration reads),
  `node:string_decoder` (unit helper), `node:zlib` (production-limits gzip
  stimulus), `vitest` (suite DSL only).

No active file imports deferred infrastructure (`spawn-collect.mjs`,
`intercept-*`, `proxy-child-fixture.mjs`, `proxy-isolation`,
`cleanup-calibration`, `09-inert-import`, `mutation-target.txt`).

## Pre-relay collector correction (bounded review)

Both replacement suites now invoke children through the standard
promisified `execFile` facility (`process.execPath`, explicit env, 8 s
timeout, 65536 maxBuffer, SIGKILL): the parent loop stays responsive, and
any rejection (nonzero exit, timeout, overflow) fails the calling test.
Manual timer/reap/character-counting collectors are gone from the active
set; report-line and trap-vs-direct assertions are unchanged apart from
result plumbing.

## Explicitly deferred, preserved, NOT passed

- `test/unit/t05/09-inert-import.test.mjs` + `import-child-fixture.mjs`,
  `import-intercept-register.mjs`, `import-intercept-setup.mjs`,
  `intercept-hooks.mjs`, `intercept-shims/*`, `intercept-controls/*`
  (general interception harness; known R4 failures retained, e.g. unresolved
  suite helpers). Replaced for acceptance by `11-import-smoke` + coordinator
  source audit.
- `test/fault/t05/proxy-isolation.test.mjs` +
  `test/fault/t05/proxy-child-fixture.mjs` (forwarding/tunnel/sabotage
  framework). Replaced for acceptance by `proxy-boundary` (non-forwarding
  trap + direct targets).
- `test/fault/t05/cleanup-calibration.test.mjs` (harness self-certification).
  Fixture cleanup actually used by core suites remains active (owned
  `closeServer`/deadline paths in fault helpers).
- `test/unit/t05/spawn-collect.mjs` (generic collector; superseded by the
  small inline bounded invocations in the two replacement suites).
- Exhaustive alias/default/CJS coverage, builtin cross-products, harness
  stress campaigns and T03-duplicate schema assertions: out of scope by the
  user-approved plan, not by implementation failure.

Deferred files stay on disk and discoverable; a later whole-suite task must
resolve them explicitly and cannot cite bounded T05 acceptance as proof they
pass. If a deferred file holds a genuine core product assertion missing above,
QA will move it into an active suite and record the move here before relay —
no such gap is currently known.

## Active source-quality gate (this report; no target run)

- `node --check` (provisioned Node v24.21.0) on all 19 active mjs files: pass.
- Read-only import validation on the active set: 41 resolve, 15 dist targets
  excluded (still-moving, coordinator-owned), 0 missing; no deferred imports.
- Installed ESLint on the explicit active file list: 0 errors (Node globals
  via narrow file annotations; fixture errors via sanitized causes; empty
  teardown catches carry intent comments; no config/rule changes).
- Installed Prettier `--write` + `--check` on the same active list: clean.
- Small native artifact-free sanity only (owned loopback servers, byte-exact
  fixtures); no Vitest/target/provider/build/install execution.
- Standing proportional-testing policy read and applied: smallest meaningful
  verification retained, harness creep stopped, deferrals explicit.
