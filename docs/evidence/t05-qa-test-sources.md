# T05 QA test-source readiness (R2 repair round; parse + calibration done)

**Status:** R2 repairs applied; `node --check` parse + artifact-free harness
calibration executed with exact results below. No suite/loopback-target/
provider execution. Source readiness is NOT claimed here — the coordinator
re-reviews. The earlier "all17addressed" claim was premature and is
corrected by the R2 delta in this file.
**Owner:** QA. **Coordinator:** coordinator/w4:p2K.
**Authority:** `docs/decisions/t05-approved-transport-spec.md` rev 1 (sole common
API/observable authority; supersedes brief/proposal/R1 text) + current grant in
`docs/tasks/t05-work-order.md` (QA TEST-SOURCE window: `test/unit/t05/`,
`test/fault/t05/`, synthetic helpers/fixtures there, `docs/evidence/t05-qa-*`).
Retained R1 failures/decisions in `docs/evidence/t05-coordinator-design-review.md`.
**Model:** `meta/muse-spark-1.3-contributor` via nonsecret env.

## Sources read / not read

- Read completely: approved spec §§1–10 + technical reference; work-order grant;
  design-review R1 (retained decisions/failures only); normative backend
  OpenAPI components (Exercise/WorkoutSummary/Workout/Routine schemas, list
  parameters `q`/`muscleGroupId`/`equipmentId`/`limit`/`pageToken`/`status`,
  route paths/statuses) and T03 spec for oracle boundaries; public
  `dist/domain/index.d.ts` + `dist/domain/projected.d.ts` DECLARATIONS ONLY
  (permitted by spec §10) for fixture type shapes.
- Never read: the other role's documents/code — no Developer proposal/ADR,
  no `src/`/`companion/src/`/`experiments/` production sources, no emitted
  `dist/http/*` implementation or maps/diffs, no existing test-source bodies,
  no private review, no personal bus/keyring, no live services, no `.pi`.

## Changed paths (ONLY granted paths)

- `test/unit/t05/helpers.mjs` — synthetic doubles/builders (bindings, session,
  clock/sleeper, scripted wire, wire fixtures, error catcher). No dist import.
- `test/unit/t05/01-exports-factory.test.mjs` — 5-export inventory, frozen
  defaults table, 14-method handle (no close/send), origin/budget/flag/env
  factory validation, black-box inert import/factory.
- `test/unit/t05/02-validation-identity.test.mjs` — binding capture/validation,
  AbortSignal/promise discipline, typed-array capture/copy/alias rules, exact
  frozen control/draft/save shapes, BOM/duplicate-key rejection, GET zero-body.
- `test/unit/t05/03-query-serialization.test.mjs` — fixed param order,
  `+`→`%20`, omit-empty/always-limit, toLowerCase + sorted/dedup UUIDs,
  hostile-text-as-data, opaque token verbatim, no query on single GET.
- `test/unit/t05/04-hooks-fences-dispatch.test.mjs` — per-attempt hook order,
  same-object captured binding, internal per-attempt signals, beforeDispatch
  veto, sync isCurrent false/throw/thenable, pre-delivery suppression with
  uncertainty, four-field forBinding match, control no-credential, 401-no-refresh,
  all-five-controls-one-attempt.
- `test/unit/t05/05-budgets-deadlines-retry.test.mjs` — body/target equality
  cases, wire vs projected budgets (Int64 expansion), Retry-After exact/unfit/
  huge/invalid/absent/success-ignored, NaN/receding clocks, deadline expiry,
  terminal-error-fit return.
- `test/unit/t05/06-errors-uncertainty.test.mjs` — known-pair table, unknown-safe
  4xx incl. unknown-400, wrong-status codes, sync-field exclusion, 413/3xx/500
  rules, malformed/unsafe/mismatch matrix, sender-throw privacy, poisoned-message
  retention, 32-hex/sensitive-substring unsafety, whitelist safety, no "unknown"
  fabrication, full sticky matrix incl. 409-key-reused NEVER settling.
- `test/unit/t05/07-results-decode.test.mjs` — Int64-max/exponent forms,
  max+1/zero/negative/string rejection, six-read whole decode with
  catalogueVersion inside data, ID-mismatch/truncation, mutation route label/
  key/raw-bytes/record, T10 boundary, control raw bytes, logout 204-only,
  content-type strictness both paths.
- `test/unit/t05/08-error-event-interface.test.mjs` — constructor
  derivation/defaults, invalid-details fallback, exact own fields frozen without
  stack/cause, per-call UUID correlation, WeakSet branding without getter
  execution, one frozen terminal event per call, error-event privacy
  (backendErrorCode in ERROR but never in EVENT), no factory events, throwing/
  async listener suppression, console silence.
- `test/fault/t05/helpers.mjs` — literal-loopback HTTP(S) servers, fixture
  loader (missing fails loudly, never skips), env scoping.
- `test/fault/t05/loopback-wire.test.mjs` — lowercase ordered headers + exact
  lengths/bearer on real sockets, GET zero-body, byte-exact frozen bodies,
  no-follow (second origin untouched), no-cookie across retries, proxy-env
  defeat with live traffic, hostile-input no-egress, hostile-q encoding.
- `test/fault/t05/loopback-tls.test.mjs` — fixture-trust success, untrusted/
  expired/wrong-host fail-closed as network_error, testCaPem non-bypass proof,
  TLS-env fail-closed, refused-connection mapping.
- `test/fault/t05/abort-timing.test.mjs` — head timeout, mid-flight abort with
  sticky uncertainty, slow-drip bound, post-abort handle reuse.
- `docs/evidence/t05-qa-test-sources.md` (this file).
- `docs/evidence/t05-qa-plan.md` — short approved-spec alignment addendum only.

Untouched: all existing tests, all production/config/manifest/lock/compiler
paths, shared contracts, `.pi`.

## Spec-change acknowledgments (approved deltas now encoded)

- 409 `idempotency_key_reused` NEVER clears uncertainty; T05 NO error clears
  sticky state; only full validated unfenced same-request success settles.
- 503 valid responses and projected-result overflow are UNCERTAIN on writes
  (decoder success does not clear); reads stay `outcomeUnknown: false`.
- Final synchronous `isCurrent`, full four-field `forBinding` match,
  per-attempt internal signals, exact wire union/budget shapes, exact error
  constructor/derivation/frozen fields — all asserted literally.
- Typed-array bytes are independent MUTABLE copies; result objects/JSON trees
  frozen, typed arrays never frozen; no memory-erasure claim asserted.
- Corrected privacy rule: safe `backendErrorCode` IS allowed in the returned
  error, but NEVER in logs/events/diagnostics (rev 2 overstated the exclusion;
  tests assert both the error retention and the event/log absence).
- All FIVE controls one attempt (exchange/refresh included); durable
  identical-key auth recovery is T06/T07-owned, not intrinsically unsafe.
- Max budgets/JSON/head/exception precedence explicit: size before
  classification, local-before-send, fence-before-delivery, sender-throw as
  network_error without message inspection.

## Feasibility / coverage notes (no blocking contradiction found)

- No specification contradiction blocks source preparation; nothing was guessed
  beyond the approved text. Wire fixtures use minimal OpenAPI/T03-valid shapes
  (bundled exercise without revision, blank draft routine, active workout with
  one incomplete set, control `{}` generic object); any fixture-shape defect
  found at relay will be reported as a QA-source fix, not a spec dispute.
- Static rows are black-box only (declarations/export inventory + intercepted
  import/factory behavior); implementation source never read.
- Transitive T03 pinned-Zod exception honored (pure T03 entry use assumed in
  production; no network/IO/output/timer/listener assertions weakened).
- Foundation100/T03-221/T04-owning regressions unchanged and unexecuted here;
  private Secret Service fixture expected at relay per work order.

## Request: test-only TLS fixture generation (RESOLVED by coordinator)

Coordinator provisioned three synthetic self-signed pairs; QA copied ONLY the
six named `test-only-*.pem` files plus `README.md`/`provenance.json` from the
disposable directory to `test/fault/t05/fixtures/` (0600 on PEMs) with no PEM
contents printed and no trust installed. Copied certificate SHA256 values
match the private review inventory exactly (valid `383b250a...737bb3`,
expired `62f3b966...597efd2a9f`, wrong-host `02aadc01...6eba9249651e`);
provenance records SANs, validity windows and key matches (2036 expiry is a
known fixture limitation). `loopback-tls.test.mjs` loads them via the
fixture helper (missing files still fail loudly, never skip). T04 private
provider remains relay work.

## Artifact-free calibration results (pinned Node v24.21.0, /tmp scripts)

All runs used only Node builtins + synthetic modules + owned ephemeral
literal-loopback fixtures (+copied TLS pairs where noted). No src/dist/
domain/production/node_modules import, no target invocation, no Vitest/lint/
format/build/install, no key generation or trust installation.

- Proxy API (`proxy-api.mjs`, `proxy-route2.mjs`): `Agent.proxyEnv` field
  exists; boolean/object forms construct. Under `--use-env-proxy` + proxy
  env: explicit `new Agent()` (any proxyEnv shape) goes DIRECT (0 trap
  hits); process global agent goes through the trap (1 hit); NO_PROXY bypass
  honored (0 hits). Without the flag everything goes direct. Therefore the
  committed tests use global-agent + flag for the REAL proxy-enabled native
  control path and explicit-agent transport for the direct path.
- CONNECT tunnel (`cal-tunnel*.mjs`, copied valid pair): direct fixture-trust
  HTTPS 200; native https through the owned CONNECT tunnel 200 with exactly
  `CONNECT 127.0.0.1:<port>` observed. Fixture chain + helper server proven.
- Cookie stimulus (`cal-cookie-cleanup.mjs`): setHeader + getHeaders reports
  `synthetic-qa-session=probe; Path=/` server-side and the native client
  receives the same Set-Cookie. Precondition mechanism proven.
- Owned cleanup (same script): held-open HTTP + raw servers close cleanly
  (`listening: false`), active resources stable (9 before/after). The
  calibration also exposed that `net.Server` lacks `closeAllConnections`
  (fixed by explicit tracked-socket destruction in the helper).
- Import interception (runner + 10 controls, `/tmp` driver): clean module
  exits 0 with one JSON report line and empty stderr; fs-write/fs-read/net/
  timer/timer-cleared/listener/spawn/stdout rejected with their exact tags
  and empty stdout; exit recorded (code 7) then honored; no disk leak
  (`/tmp/synthetic-qa-must-not-exist.txt` absent). Intercepted surface:
  fs/fs-promises reads (loader allowlist: *.js/*.mjs/*.cjs + package.json)
  and all fs writes, net/http/https/dns/dgram sends, child_process,
  workers, inspector, fetch/WebSocket, timers, process listeners/exit and
  stdout/stderr writes. A v26-system-node trial run emitted an unrelated
  runtime warning to stderr, confirming calibration must (and does) run on
  the provisioned v24.21.0 pins.

## Commands RUN (authorized) and NOT RUN

- RUN (parse): provisioned `node --check` (v24.21.0) on all 65 owning mjs
  files (unit suites/helpers/fixtures/shims/controls + fault suites/helpers/
  child fixtures): all parse OK. Read-only relative-import validation: 41
  relative specifiers resolve, 15 `dist/http` target references excluded per
  grant, 0 failures.
- RUN (artifact-free calibration, provisioned node, `/tmp` drivers +
  committed helpers only; never src/dist/domain/production/node_modules,
  never the moving target): proxy routing table; CONNECT tunnel (copied
  valid pair); cookie stimulus through the COMMITTED `jsonResponse` helper;
  owned cleanup incl. raw servers; all interception controls through the
  COMMITTED runner/harness (clean + multi-module pass; violators rejected
  with exact tags; exit recorded; hang killed + reaped; canary byte-identical
  afterwards); COMMITTED `collectChild` (fast/timeout-overflow paths);
  sabotage control (native sync-throw vs explicit-agent 200). Results with
  pins, expected/observed outcomes and the v26 deviation above.
- NOT RUN: no PRODUCTION imports, target suites, loopback-target/provider
  execution, builds, installs, lint/format binaries or OpenSSL generation.
  (Earlier wording claiming no import/loopback execution at all is corrected:
  native artifact-free calibration imports/fixtures were explicitly
  authorized and are the runs recorded here.)
- Inventory hashes for the committed sources are recorded in the R3 section.

## Process deviation record (system Node trial, NOT conformance)

During R2 interception calibration one command ran the wrong runtime: the
`env -i` in that shell line cleared PATH, so bare `node` resolved to the
system Node v26.11.1 instead of the provisioned v24.21.0. The exact command
was the `for c in clean fs-write ...` loop over `import-child-fixture.mjs`
with `env -i SYNTHETIC_QA_IMPORT_TARGET=... timeout 20 node --import ...`.
That v26 run emitted an unrelated runtime warning to stderr on the clean
control; it is recorded here as a process deviation, counted for nothing,
and never repeated. No system-Node fallback was or is authorized: every
calibration result cited in this file was reproduced on provisioned
`T01_NODE_HOME` Node v24.21.0. Standing Herdr permission covers coordination
messaging only, never toolchain substitution.

## Withdrawn historical claims (rejected, kept visible)

- "All 17 R1 items addressed" (R1 readiness report): premature; R2/R3 found
  material gaps, all reworked in the deltas below.
- Refused-TCP as definite pre-handoff (`dispatched: false`, uncertainty
  false): rejected; handoff is sender invocation, so refusal is uncertain.
- Head/parser oracles as `result_too_large` or broad code sets: rejected;
  head/parser failures are generic `internal_error`, body/projected only is
  `result_too_large`.
- Filename-suffix loader exemption and `proxyEnv: true` control path:
  rejected; replaced by no-exemption guards and calibrated real mechanisms.

## R2 repair delta (all R2.1-R2.8 points addressed, no target run)

- R2.1: proxy child uses async spawn (bounded collect/kill/reap, 8 s budget)
  with an allowlisted environment (only SYNTHETIC_QA_*/proxy/NO_PROXY keys);
  native positive controls (plain global-agent GET, CONNECT tunnel) must reach
  the owned trap while the transport stays direct; `proxyEnv: true` replaced
  by calibrated real mechanisms (below); duplicate in-process proxy test
  removed from loopback-wire with an explanatory pointer.
- R2.2: owned closed-port refusal now asserts dispatched/attempts-1/
  outcomeUnknown-true (handoff = sender invocation); pre-delivery-fenced 429
  asserts uncertain; titles/comments match the published definitions.
- R2.3: every late race now awaits an entered barrier before abort/deadline
  (hook, sender, select); generation-change-during-await plus final veto,
  late wire rejection, real-timer never-settling hook (`network_error`) and
  post-wire delivery-deadline suppression (`network_error`, no data) added.
- R2.4: lowercase grammar-clean token exactly equal to the selected bearer
  (unsafe) with an unrelated-bearer safe control; whitelist proven by bearer
  `not` inside known code `not_found`; control privacy uses a canonical UUID
  auth key with wire-invocation/status assertions first.
- R2.5: all req.close cleanup replaced by response/socket-close ownership;
  streaming observes emitted bytes/chunks; slow drip stays valid-incomplete
  with precise `network_error`; closeServer clears deadlines and destroys
  tracked raw sockets; cookie uses setHeader + getHeaders precondition (native
  calibrated); cleanup-calibration suite added (fixture-only, no target).
- R2.6: real builtin interception via `--import` resolve-hook shims (frozen
  namespaces) + mutable-global patches; 9 violator controls + clean control,
  all calibrated on the pinned runtime (below); controls never import any
  target; interception scope documented in 09 and here.
- R2.7: head count/size assert exact `result_too_large` with valid bodies;
  truncation uses flush-callback barriers + single-connection proof;
  upgrade asserts exact `internal_error` + observed client closure;
  103x3/exhaustion, trailer override/count budgets, duplicate Content-Type,
  malformed error-body cases added; no broad alternative oracles remain.
- R2.8: one shared UUID across namespaces; actual 40.0 + 4e1 canary;
  seam-side pre-mutation snapshot; no-op waits removed; same-handle reuse.

## Common-spec clarification bounds (sections 5/7 restated, oracles follow)

- Post-guard recheck: `04-hooks` gains two deterministic oracles where the
  synchronous fence itself consumes the budget (manual clock advance, still
  returns true) or races abort (aborts the caller signal, still returns
  true). Both must refuse dispatch (`network_error` / `operation_interrupted`,
  zero sends). Existing guard oracles are unaffected (no time/abort there).
- Trailer accounting: `production-limits` gains an exact present-trailer
  boundary (field lines + terminator, no status line; fit succeeds, minus
  one fails `result_too_large`) and an absent-trailer zero-cost boundary at
  the exact normalized head size. Chunk framing is treated as body framing
  per the same text; any relay deviation will be reported as a precise
  signal, not a silent pass.

## Repair delta vs R1 review (all 17 points addressed, no target run)

1. Fault imports corrected to `../../unit/t05/helpers.mjs` (3 files).
2. `ACCOUNT_B` imported in 02; unused bindings removed (04 ORIGIN/routineWire
   + dead keys block, 05 ORIGIN/BEARER, 07 ENTRY_E1, 08 RESOURCE_KEY/utf8,
   wire-file ACCOUNT_A/PROFILE_P voids, production-limits RESOURCE_KEY).
3. Request-size oracles rebuilt on whitespace-preserving populate bodies
   >= 64 bytes with runtime-measured equality/+1; `budgets: undefined` no
   longer passed explicitly; dead duplicate handle in the deadline test gone.
4. Error fixtures status-matched (422/409/401/413/429 rows); sync-field case
   uses 410 `cursor_expired`; sticky finals assert full tuples (code, status,
   attempts, uncertainty); wrong-pair cases expect `internal_error`.
5. Token-overlap whitelist probe uses a bearer spelling part of `not_found`;
   sensitive-substring branch tested with an alphanumeric opaque token plus a
   safe control; >64-char safe codes retained; `message: null` accepted and
   ignored for known and unknown codes (approved OpenAPI correction).
6. Own-field oracle uses `Reflect.ownKeys`/descriptors + frozen checks with
   no extra symbols/cause/stack and no enumerability imposition.
7. Malformed-body cases run at the expected status (reads at 200); wrong-
   status cases separated for both directions.
8. Cookie precondition fixed (pair headers) with server-observed Set-Cookie
   assertion plus per-attempt absence.
9. Timing harness uses owned response/socket close events, bounded deadline
   waits, immediate rejection handlers, robust `closeServer`, valid partial
   JSON drips with precise `network_error`, listen-error handling and no
   unhandled server/socket events.
10. Port-1 refused test replaced by an owned closed-port endpoint asserting
    definite pre-handoff `network_error`; TLS negatives assert zero HTTP
    handler invocations.
11. Child import-interception harness added (09 + fixture) with output/timer
    controls; declaration checks read only `.d.ts`; factory capture proven by
    a later actual call; result trees asserted frozen.
12. Shared two-attempt trace ordering, caller-mutation capture identity,
    frozen summaries, deferred generation/late-resolve/late-reject races,
    pre-delivery error suppression, late-sender suppression, hook-timeout
    (`network_error`) and sleep-abort coverage added.
13. Multi-attempt byte comparison for draft/populate/save with a 40.0/exponent
    canary, seam-copy and caller-buffer mutation, reselected-bearer isolation,
    shared-buffer alias retention and cross-namespace key permission.
14. Production header/stream/framing suite added (streaming cap, count/size,
    duplicate length, truncation, invalid UTF-8, gzip, 103, trailers, upgrade,
    204 framing, head accounting exact/+1, large-q budget, projected +2
    growth); ambiguous mappings assert documented sets, never silent success.
15. Backoff caps/exponentials, 503/500 Retry-After, OWS, equality-to-remaining,
    huge/invalid handling, 501/507 and malformed-500 no-retry, empty-500
    retry, abort-during-sleep/hook, 503 standalone uncertainty, hook/credential
    sticky variants, pre-delivery fence and 429-vs-503 tuples added.
16. Child-process proxy isolation (env-flag, NO_PROXY control, global-agent
    replacement, HTTPS path) with an owned trap asserting zero hits; 307/308
    POST redirect matrix added; fixed endpoints removed.
17. Getter/symbol/cycle/prototype/inheritance rejection without getter
    execution, own `__proto__` preservation, escaped duplicates, invalid UTF-8
    both directions, control one-attempt network/429/503 cases, control
    secret-absence assertions and exact result key sets added; no T06/T10 or
    grant-authorization claim anywhere.

## R3 repair delta (all R3.1-R3.6 points addressed, no target run)

- R3.1: head count/size, 103-exhaustion and trailer-count overflow assert
  exact `internal_error`; trailer boundaries rebuilt on padded LEGAL budgets
  (>= 4096, far below the parser ceiling) with single-server fit/tight
  pairs: fit performs the wire request (precondition: exactly one hit) and
  succeeds; one byte under performs no further egress and fails
  `internal_error`. Absent trailers prove zero cost at an exact 4096 fit.
- R3.2: child contracts assert `timedOut: false`, code 0, signal null and
  `truncated: false`; kill paths await observed close (reap proof, loud
  failure otherwise); collection is byte-bounded (65536); spawn failures are
  sanitized labels. Runners extracted to committed importable helpers
  (`spawn-collect.mjs`) and calibrated directly: fast child OK; wedged child
  killed + reaped at budget; chatty child truncated at the cap; hang control
  added to the suite (6 s budget inside the 10 s Vitest timeout).
- R3.3: suffix exemption removed (loader uses internal bindings, so every
  public fs read/write is a violation); open/openSync flag-aware; default
  surfaces fully proxied (fs, fs/promises, net, http, https, child_process,
  dns, dgram, inspector, http2, tls, events, timers, worker-threads);
  node:timers/promises, node:events, net.Socket/Server, http2, tls and
  createRequire-CJS forms guarded with 13 new violator controls; violation
  reports carry fixed class/API labels only (no paths); canary file
  `intercept-controls/mutation-target.txt` (`b6dd647c...ccf8c`) asserted
  byte-identical after the fs controls. All 24 controls + clean +
  multi-module chain calibrated green on v24.21.0 with zero disk leakage.
- R3.4: committed `jsonResponse` repaired (setHeader before writeHead with
  getHeaders capture) and calibrated through the committed helper with a
  native client (server-reported and client-observed Set-Cookie identical);
  cleanup suite uses try/finally everywhere, no no-op waits, exact
  no-growth timer accounting, and failure stays failure.
- R3.5: traps own their full lifecycle (owned-target restriction, head caps,
  tracked sockets both sides, bounded close); tests assert control + target
  terminal lines, exact trap/target hit counts; runtime global-sabotage
  control added (native path breaks, transport succeeds; mechanism
  calibrated: sync-throw vs explicit-agent 200); NO_PROXY bypass kept
  distinct.
- R3.6: this section. v26 deviation recorded above with its exact command;
  all cited results reproduced on provisioned pins; withdrawn claims labeled;
  inventory hashes below identify the exact committed sources reviewed.

## R3 calibration record (exact commands, provisioned pins)

Base: `export PATH="$T01_NODE_HOME/bin:$PATH"` with
`T01_NODE_HOME=/tmp/gt-mcp-t04-toolchain.TqUXLa/node-v24.21.0-linux-x64`
(`node --version` = v24.21.0). Drivers live in `/tmp/t05cal/` (not repo).

- `node /tmp/t05cal/proxy-api.mjs` → `Agent.proxyEnv` field exists; boolean
  and object forms construct (expected: shape accepted, behavior calibrated
  separately, not assumed).
- `node /tmp/t05cal/proxy-route2.mjs` variants (owned trap + target,
  `env -i PATH=... CAL_MODE=... CAL_TRAP=... CAL_TARGET=... HTTP_PROXY=...`
  with/without `node --use-env-proxy`, plus a NO_PROXY variant) → explicit
  agents direct in all shapes (0 trap hits); global agent + flag proxied
  (1 hit); NO_PROXY bypass direct. Observed, not assumed.
- `node /tmp/t05cal/cal-tunnel.mjs` → direct fixture-trust HTTPS 200.
- `CAL_TRAP_PORT=... node --use-env-proxy /tmp/t05cal/cal-tunnel-proxy.mjs`
  with HTTPS_PROXY set → 200 with exactly `CONNECT 127.0.0.1:<port>` at the
  owned tunnel trap.
- `node /tmp/t05cal/cal-cookie-cleanup.mjs` → server-reported and native
  Set-Cookie identical; held-open HTTP + raw servers close (`listening:
  false`); active resources stable (9 → 9). Also exposed the missing
  `net.Server.closeAllConnections` (fixed via tracked-socket destruction).
- Interception controls: `env -i PATH=... SYNTHETIC_QA_IMPORT_TARGET=<control>
  timeout 20 node --import ./import-intercept-register.mjs
  import-child-fixture.mjs` per control → clean + multi-module exit 0 with
  one report line; 20 violators exit nonzero with exact tags; exit control
  code 7 with tag; canary sha256 unchanged (`b6dd647c...ccf8c`); no
  `/tmp/synthetic-qa-must-not-exist.txt` created.
- `node /tmp/t05cal/cal-collect.mjs` (imports COMMITTED `spawn-collect.mjs`
  and fault `helpers.mjs`) → fast `{t:false,code:0}`; wedged killed +
  reaped at ~2 s budget; chatty truncated at 65536; committed-cookie
  precondition identical both sides.
- `node /tmp/t05cal/cal-sabotage.mjs` → native `sync-throw` vs explicit
  agent `status-200`.
- `node /tmp/t05cal/runner-hang-check.mjs` → wedged import-runner child
  SIGKILLed at ~3 s budget with observed close, 0 bytes out.
- Limitations: stdin-resume is the one handle outside interception scope
  (no read occurs without input; parents never send any); chunk framing is
  treated as body framing per the trailer text; a wedged child relies on
  SIGKILL reap; ambient suite timers are bounded by no-growth assertions,
  not absolute zero.

## Committed source inventory (sha256 at report time)

- Unit suites/helpers: `01` eec79f9c, `02` 13153151, `03` 9bf01b40,
  `04` e4ca91bf, `05` f50f0fa0, `06` 797141a3, `07` dcd0e7e3, `08` 8b08a598,
  `09` 1e9325bc, `10` d60fa7c0 (prefixes; full values recorded in session
  transcript), helpers ad253792, spawn-collect 76364cb2, runner
  efbc1c5b2, register 5012d841, setup 128e39ad, hooks cdee9ee9.
- Controls/shims/fixtures: shims `fs` 31e27934, `net` 4aee963d, `http`
  d5e8aa85, `module` f02d45ab, `events` 4ed5c36a, `timers` 17bd5231;
  canary txt b6dd647c; clean 3b790386; hang 3501d53c; cjs-require 752ef85c.
- Fault suites/helpers: wire 1a22c479, tls b8f7cf9d, limits aaaaf5f0,
  abort 4d9929f1, proxy-child acebc409, proxy-suite 85d5f748, cleanup
  de741372, helpers e8fc8345.
- TLS fixtures: valid cert 383b250a, expired 62f3b966, wrong-host 02aadc01
  (full values in the R2 section); README 6590cf35; provenance fc2df8f7.

## F1 adjudicated repairs (verification-only, no production change)

Per the common adjudication and QA-private repair relay (f1 + focused
observation CLOSED, records preserved):

- `04-hooks-fences-dispatch`: exact sync-guard trace count replaced by
  required-ordering assertions (non-guard sequence equality, >= 3 sync
  guards with at least one inside each handoff window and after
  pre-delivery, first/last positions) with unchanged handoff/attempt counts.
- `02-validation-identity`: own `__proto__` on strict query input asserts
  `invalid_arguments` + zero sends + no pollution; positive additive-name
  coverage moved to an otherwise-valid backend response asserting own-data
  retention without pollution.
- `import-smoke-child`: harness stdio materialized with zero-byte writes
  before the baseline snapshot (adjudicated cold-PipeWrap cause); parent
  assertions unchanged.
- `production-limits`: truncation builds real bytes then truncates with
  graceful FIN; Content-Length trailer asserts fail-closed
  `internal_error` + no retry; new native-valid Retry-After trailer case
  asserts no trailer-supplied retry metadata (maxAttempts 1); upgrade
  fixture drains request bytes before observing bounded peer close.
- Focused checks on the four files (provisioned pins): `node --check`
  pass, scoped ESLint 0 errors, Prettier clean after one formatting write.
  No Vitest/target/provider/build/install execution; no other files touched.

## Next

QA HOLDS all target execution for the coordinator-reviewed named
frozen-artifact relay with exact allowed commands. Repairs after relay will
invalidate the target and require a new freeze. No successor work.
