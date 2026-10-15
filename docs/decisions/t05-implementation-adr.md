# T05 implementation ADR — fixed-origin backend transport

**Status:** bounded T05 implementation record, written against the
coordinator-approved public specification
(`docs/decisions/t05-approved-transport-spec.md`, rev 1) and the round-2
contract correction (backend `ServiceError.message` accepts string OR null;
null is ignored, never malformed), the c0 production source review
(`docs/evidence/t05-coordinator-production-source-review.md`, disposition
FAIL, Developer/coordinator-only), and the c1 production re-review
(`docs/evidence/t05-coordinator-production-source-review-c1.md`,
disposition FAIL, Developer/coordinator-only). This ADR is Developer-owned
implementation history, not cross-role evidence and not a conformance
claim. Initial c0/c1 failures are retained below honestly; no acceptance,
interoperability, or release statement is made here.

## 1. Scope and authority

Normative: shared MCP 0.2-draft working-tree revision over `9a96dcb`,
unchanged backend OpenAPI 1.0.0, approved T01/T03/T04 specs. T02 parked,
T13/T14 retired, T09 unassigned. Only `src/http/` was created; no other
production source, manifest, lockfile, compiler, or config change was made.
No new dependency was added: runtime imports are Node builtins
(`node:crypto`, `node:perf_hooks`, `node:http`, `node:https`) plus the
PUBLIC `src/domain/index.ts` entry (`parseArguments`,
`decodeBackendResponse`, projected/record types). No private domain
internals are imported.

## 2. Module layout (`src/http/` -> `dist/http/`)

| Source         | Responsibility                                                                                                                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`     | Sole public entry. Exact five runtime exports (`createBackendTransport`, `TransportError`, `isTransportError`, `DEFAULT_TRANSPORT_BUDGETS`, `TRANSPORT_IDENTITY_VERSION`) and all readonly public types. |
| `errors.ts`    | `TransportErrorCode` (20 codes), `TransportError` with derived `retryable`, getter-safe `isTransportError` via private `WeakSet`, frozen instances, deleted stack, no cause/payload.                     |
| `validate.ts`  | Origin gate + canonicalization, binding/budget validation, byte capture, strict JSON scanner, frozen request-shape checks, error-code grammar.                                                           |
| `query.ts`     | T03 `parseArguments` validation/defaults plus ordered `URLSearchParams` serialization (`+` -> `%20`).                                                                                                    |
| `wire.ts`      | Production `node:http/https` adapter implementing the typed `HttpWire` union, plus injected-double response-shape checking.                                                                              |
| `transport.ts` | Factory capture, 14 typed methods, hook order, bounded retries, sticky uncertainty, response/error mapping, sanitized events.                                                                            |

Internal modules are not public API; only `dist/http/index.js` (+ `.d.ts`)
is the supported import surface.

## 3. Decisions and rationale

- **Adapter choice:** `http(s).request` with a dedicated `keepAlive: false`
  agent per attempt. Rationale: no redirect following by construction, no
  global dispatcher/fetch surface, no proxy environment handling, explicit
  per-request TLS options. Environment-proxy immunity is structural (no
  proxy lookup exists on this path); behavioral proof belongs to loopback
  wire tests at the QA relay, not to this document.
- **Origin gate:** raw lexical checks (scheme, `@`, backslash, whitespace/
  controls, `?`/`#`, empty port, extra path) run BEFORE `new URL()`, because
  normalization alone can erase traversal/userinfo/dot-segment evidence.
  `URL.origin` is the frozen canonical value. Loopback plaintext is limited
  to literal `127.0.0.1`/`[::1]` authority text; `localhost` and DNS names
  are rejected. No DNS or IO occurs at factory or import.
- **TLS:** explicit `rejectUnauthorized: true`, `minVersion: "TLSv1.2"`,
  default hostname verification. `NODE_TLS_REJECT_UNAUTHORIZED=0` fails the
  factory and the per-attempt pre-send gate; the environment is never
  modified. `testCaPem` is copied at factory time and only honored for
  literal-loopback `https` origins, adding fixture trust without disabling
  verification.
- **Request validation:** own-data, exact-field, accessor-rejecting checks
  throughout; reflective failures map to `invalid_arguments`. The strict
  JSON scanner (complete object JSON, per-level duplicate-key rejection on
  decoded key strings, depth cap 64) inspects scratch copies only; accepted
  bytes are sent verbatim and never reserialized. Resource responses bypass
  the scanner entirely and go straight to the T03 lossless decoder.
- **Control boundary:** envelope-shape checks only (exact key sets, UUID
  shapes, nonempty strings, purpose allowlist, draft-expected-ID and
  populate/save root checks). Grant/deadline/nonce/account semantics belong
  to T06/T07/T12. Raw control bytes are private caller data.
- **Error mapping:** three-tier envelope-code classification (directly
  mapped pairs, other documented-or-safe codes with sensitive scrub on
  unknown ones only, mismatch/unsafe as malformed). `idempotency_key_reused`
  never clears sticky uncertainty. `retryable` is recovery classification;
  in-call automatic retry applies only to reads/resource mutations for
  network failures, valid 429/503, and 500/502/504 with empty-or-valid
  bodies — never for auth/control routes, redirects, malformed envelopes,
  or permanent responses.
- **Uncertainty:** dispatch is marked at wire handoff; any handed-off
  attempt ending network/timeout/5xx/redirect/malformed/oversize/fenced,
  plus projected-result overflow, sets sticky `outcomeUnknown` for
  non-GET routes. Only a full validated within-budget unfenced success for
  the same request settles it. Reads always report `false`.
- **Errors/events:** runtime-frozen, fixed generic message, no
  `backendErrorCode`/message/body/credential/ID content in diagnostics.
  Exactly one terminal event per called known route when a listener is set;
  none on factory rejection. Listener faults are swallowed without effect.
- **`ServiceError.message` correction:** per the coordinator round-2
  correction and unchanged OpenAPI 1.0.0, `message` accepts string or null;
  null is ignored. Only a present non-string non-null `message` is
  malformed. Implemented in `readErrorCode` (`src/http/validate.ts`).

## 4. Known limits (not acceptance)

- No loopback/live execution was performed by Developer; wire behavior
  (proxy immunity, redirect refusal, TLS negatives, exact bytes/headers,
  abort/stream limits, slow reads) is specified and must be established by
  isolated fixture tests at the QA relay.
- `maxHeadersCount: 0` is passed to the Node request options with explicit
  raw-pair counting in both layers; if a future Node changes option
  semantics, the explicit count remains the enforcement point.
- The JSON scanner depth cap (64) is a parser-robustness bound far above
  legitimate envelope nesting; deeper inputs reject as invalid.
- Returned `Uint8Array` views are independent mutable copies: JavaScript
  cannot freeze nonempty typed-array elements, so byte-element immutability
  is not claimed; owning result objects and decoded JSON trees are frozen.
  No V8 memory-erasure guarantee is made for credential material, which is
  held only transiently per attempt.
- A privileged same-process callback or global patch (hooks, wire doubles,
  clock/sleeper) is outside an OS-sandbox guarantee; seams are trusted
  constructor inputs, never model-reachable.
- Supported-aggregate fit against deployment budgets (service-protocol T8)
  is explicitly not demonstrated here.

## 5. Verification performed (Developer-owned production checks only)

Pinned toolchain Node 24.21.0 / npm 11.19.0 via `T01_NODE_HOME`; `npm ci`
was NOT run (existing locked `node_modules` reused, no install window
needed). Exact results are reported in the artifact-ready message; no QA,
domain, diagnostic, or self-authored runtime checks were executed.

## 6. c0 production review outcome (FAIL, retained honestly)

The c0 candidate failed coordinator production source review with 13
repair items (P1-P13) plus a compatibility-matrix structure regression
caused by this role adding a T05 table row (foundation smoke 99/100 on
that structural drift; T03 221/221 still PASS; coordinator
typecheck/lint/format PASS). Eleven independent no-network public-entry
observables failed. No QA relay occurred; c0 is closed and invalidated by
repair. The repairs below supersede the c0 implementation text.

## 7. P1-P13 repair mapping (c1 candidate)

- **P1 optional/required fields:** `checkOwnFields(value, required,
optional)` replaces the all-mandatory check; explicit `undefined`
  rejects; unknown/symbol/accessor/non-plain-prototype rejection kept.
  Factory accepts minimal `{origin}` + `{session}`; partial budgets merge
  over defaults.
- **P2 local errors/capture/entry:** body/head overflow throws
  `SizeFailure` -> `request_too_large` (predispatch, attempts 0,
  dispatched false); capture checks byte length BEFORE allocation;
  entry clock sampled FIRST with `ClockFault` -> `internal_error`;
  one correlation ID per invocation (passed into entry capture).
- **P3 route-correct decoding:** reads decode with their own route tool
  (`get_exercise`/`get_workout` use their decoders with expectedId); only
  the three mutations decode via `get_routine`.
- **P4 upper-layer budgets:** `enforceWireBudgets` rechecks body/head/
  count/critical-duplicate/encoding/length for EVERY received response
  (production adapter and injected doubles alike) before mapping; no
  partial data ever returned.
- **P5 scheduler/Retry-After:** network retries use the same bounded
  exponential backoff (no `-1` sentinel); 16-digit values at or below
  `MAX_SAFE_INTEGER` expose exactly; truly huge values prohibit retry
  with `retryAfterSeconds: null` and never fall back to backoff; controls
  and malformed responses never auto-retry.
- **P6 callback capture:** all session/clock/sleeper/wire callbacks are
  snapshot-bound at factory (function reference + receiver); later
  property replacement cannot change behavior. Owned header arrays AND
  pair tuples are frozen; caller containers/byte views are never
  mutated or frozen.
- **P7 deadlines:** selectBearer races remaining (not total) time; wire
  and sleep backstops carry zero padding; handoff preparation (clock
  read, timeout math, request build) precedes the attempts/dispatch mark
  with no await before invocation; post-decode delivery gate (abort,
  deadline, sync isCurrent) precedes every success; remaining-budget
  gates sit between hooks; pre-delivery hook deadline maps to
  `network_error`.
- **P8 uncertainty:** validated within-budget unfenced success clears
  sticky uncertainty BEFORE the success event; abort during retry sleep
  after dispatch sets it; pre-delivery deadline/clock failures on a
  received response set it; unexpected loop failures centralize through
  retained dispatch history (predispatch vs post-handoff codes). 503,
  projected overflow, and `idempotency_key_reused` semantics unchanged
  (uncertain preserved, never cleared by errors).
- **P9 mapping:** `CODE_STATUS` gains `source_shape_changed`,
  `history_shape_changed`, `exercise_in_use` (409) and `request_too_large`
  (413) for mismatch detection; unknown-503 is `internal_error`
  (retryable, no auto-retry) with safe-code retention; 500/502/504
  auto-retry only on empty or valid safe status-consistent envelopes;
  413 retains only the matching code; 429 excludes unknown-safe codes
  (malformed); message content never affects code safety; sensitive
  screen includes profileGenerationId; double responses validated via
  descriptor checks, never getter dereference.
- **P10 adapter:** `maxHeadersCount` set as a live `ClientRequest`
  property (0 = no silent truncation) with explicit cumulative counting
  as the enforcement point; head budgets enforced at head receipt;
  informational heads accumulate into the same budget; trailers count
  but never supply classification fields (rawHeaders carry head pairs
  only); upgraded sockets explicitly destroyed with handled errors;
  native error codes (not messages) separate parser/truncation
  (malformed) from network/timeout (network); hook/wire abort listeners
  disposed on all paths with late rejections handled.
- **P11 parser/bounds:** the depth-64 cap is removed; the scanner is an
  iterative explicit-stack design over byte-budgeted input. Byte views
  require exact `Uint8Array`/`Buffer` prototypes (subclass getter shadows
  rejected) with guarded reflective reads. The enumerability requirement
  on metadata fields was dropped as uninvented.
- **P12 fixture trust:** `testCaPem` requires the RAW authority host text
  to be a literal loopback address (`rawHost` preserved through
  canonicalization), so numeric/abbreviated IPv4 normalizations cannot
  inherit fixture trust.
- **P13 compatibility:** the added matrix row was reverted; T05 notes live
  in a labelled prose subsection. The 17 approved rows and statuses are
  unchanged apart from that subsection.

## 8. c1 production re-review outcome (FAIL, retained honestly)

The c1 candidate passed the 11 retained c0 observables plus repeated
typecheck/lint/format, foundation 100/100, and T03 221/221, but failed
9/11 further independent boundary probes (both ordinary HTTP and
fixture-trusted HTTPS positive reads passed). c1 is closed and
invalidated by repair; c0 remains failed, not retroactively accepted.
Coordinator notes that earlier ADR text below describes the c1 candidate
state: where this section 9 states a different behavior, section 9 (c2)
governs and the earlier passage is history, including the removed
depth-64 scanner cap and the request-option form of header-count
control (now a live-request property plus explicit counting).

## 9. C1-F1..F9 repair mapping (c2 candidate)

- **F1 self-cancelling sleep:** the retry sleep now races the REMAINING
  total deadline (plus caller abort), never its own duration; a sleeper
  that cannot complete preserves the ORIGINAL mapped error when the
  retry cannot fit (caller abort still reports `operation_interrupted`).
- **F2 bearer screening:** the selected bearer joins the unknown-code
  sensitive screen before envelope classification; a safe-looking code
  containing the exact bearer is unsafe and omitted, never retained or
  logged.
- **F3 message type:** `readErrorCode` accepts absent/string/null and
  rejects other message types as malformed; message content is still
  never interpreted or emitted.
- **F4 view/getter shadows:** `checkByteView` requires exact
  `Uint8Array`/`Buffer` prototypes with no own shadow properties before
  any length/buffer read (shared by body capture and double-response
  validation); injected response tuples are read via descriptor checks
  with indexed (never iterated) access.
- **F5 fenced errors:** suppression after receipt sets conservative
  uncertainty for ANY received non-GET result, success or error.
- **F6 final guard:** post-`isCurrent` abort/deadline recheck precedes
  every sender handoff; a synchronous sender throw settles terminally
  with attempts/dispatch/uncertainty unchanged; the delivery gate
  rechecks after its own `isCurrent` and reports via throwing clock
  reads, never swallowed elapsed values, for decisions.
- **F7 pre-delivery budget:** the gate uses remaining (not total) time
  with a pre-hook expiry check; hook deadline with a live caller is
  `network_error` (uncertain post-handoff); invalid/receding clocks are
  a distinct `internal_error` outcome; remaining-budget gates also sit
  before `beforeDispatch`.
- **F8 hook settlement:** `awaitHook` attaches settlement handlers
  synchronously before any abort check (abort still wins the race), so
  abort-then-reject hooks cannot leak unhandled rejections; the wire
  abort race disposes its listener on both paths.
- **F9 trailer bytes:** trailers contribute actual bytes (fields plus
  terminator; absent trailers add zero) via `measureTrailerBytes` — no
  phantom status line. Head pairs alone feed classification; cumulative
  informational/head/trailer budgets still enforced.

## 10. c2 production re-review outcome (FAIL, retained honestly)

The c2 candidate passed both retained probe sets (22/22) plus repeated
typecheck/lint/format, foundation 100/100, and T03 221/221, but failed
4/4 further no-network boundary probes across three defects. c2 is
closed and invalidated by repair; c0/c1 remain failed, not retroactively
accepted. Sections 7 and 9 above describe the c1 candidate state: where
sections 11 (c2) states a different behavior, section 11 governs.

## 11. C2-F1..F3 repair mapping (c3 candidate)

- **F1 entered-sender accounting:** the conservative handoff mark
  (attempts/dispatch) again sits immediately BEFORE invoking the valid
  captured sender. A synchronously throwing sender was still entered:
  it follows the same counted-attempt, potentially-committed network
  failure/retry rule as a rejection (caller-abort precedence kept,
  controls terminal, reads/mutations bounded identical replay). Local
  validation/fence/deadline failures before invocation keep attempts 0.
- **F2 gate rechecks for errors:** `preDeliveryGate` rechecks abort and
  deadline AFTER its final synchronous `isCurrent` before returning
  pass, so every received outcome (success, error, or retry) passes the
  same fresh post-guard edge; aborted/expiry gates suppress delivery
  with conservative post-dispatch uncertainty, broken clocks stay
  `internal_error`.
- **F3 backing prototype gate:** `checkByteView` rejects any backing
  store whose prototype is not exactly `ArrayBuffer.prototype` BEFORE
  reading `resizable`/`detached`, so subclass prototype getters never
  execute; own-shadow rejection on view and backing fields is retained.

## 12. F2 truncation repair (c4 candidate)

Focused QA (65/66) and the independent clean snapshot (227/228) isolated
one remaining production mapping defect with the oracle unchanged: a
validly-started response (headers plus short body under a larger declared
`Content-Length`) was classified `network_error` with automatic retry
instead of observed-truncation `internal_error` with no in-call retry.
Native Node 24 ordering shows response `aborted` before request `close`,
which precedes the response `error`/`close` callbacks — so the generic
request-close handler won the race and misclassified truncation as
no-response failure.

Repair (`src/http/wire.ts` only): the adapter records response receipt
(`responseSeen` plus the observed status) once headers pass validation
and head budgets. Later generic request `close`/`error` events then
report observed-truncation `malformed` with that status instead of
`network`. Owned-timer timeout and caller-abort paths still finish first
(unchanged precedence); pre-response refusal/no-response, parser
faults, and all cleanup/uncertainty behavior are unchanged. c3 remains
failed and held; no API, dependency, or contract change.

## 13. Changed paths

- `src/http/errors.ts`, `src/http/index.ts`, `src/http/query.ts`,
  `src/http/transport.ts`, `src/http/validate.ts`, `src/http/wire.ts`
  (new; sole production window).
- `docs/decisions/t05-implementation-adr.md` (this file).
- T05 prose notes in `docs/compatibility.md` (unverified; 17 approved
  rows/statuses unchanged).
- `docs/decisions/t05-transport-proposal.md` received only a superseded-by
  link to the approved spec.
