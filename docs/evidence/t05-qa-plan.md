# T05 QA plan — fixed-origin HTTP transport / safe error mapping (plan only, rev 2)

**Status:** plan only, aligned to coordinator design review round 1 — NOT approved for implementation; no test sources written, no target/build/install executed, no API guessed.
**Owner:** QA. **Coordinator:** coordinator/w4:p2K.
**Authority:** user-authorized T05 bounded design/planning with fresh Developer/QA; standing Herdr coordination permission recorded (do not ask again).
**Normative basis:** shared MCP 0.2-draft working-tree config-only revision over 9a96dcb; backend OpenAPI 1.0.0; backend service-protocol.md, authentication.md, account-lifecycle.md; MCP tools.md, routine-creation.md, authentication.md, acceptance-scenarios.md (M10/A09/R02/R06/R08 transport slices); local architecture.md, verification.md, routine-creation-config-policy.md; T01 approved foundation spec; T03 approved schema-codec spec; T04 approved storage spec (binding/fence vocabulary only).
**Window:** `docs/tasks/t05-work-order.md` (proposal/independent QA planning OPEN only) + `docs/decisions/t05-transport-design-brief.md` (requirements, NOT approved API) + `docs/evidence/t05-coordinator-design-review.md` (common PUBLIC specification-level decisions, round 1 — NOT ready for implementation; this supersedes incompatible planning text). Baseline context: `docs/evidence/t05-coordinator-start.md` (coordinator-owned locked install / four production checks / foundation 100 + T03 221 PASS; current-tree baseline only, not T05 acceptance).
**Prerequisites accepted, not re-proven:** T01 foundation, T03 schemas/codecs, T04 storage (all windows closed). T02 parked/incomplete; T13/T14 retired; T09 ready but unassigned. No successor work, no write enablement, no live services.
**Model:** `meta/muse-spark-1.3-contributor` via nonsecret env.

## Sources read / not read

- Read: AGENTS.md; `docs/tasks/t05-work-order.md`; `docs/tasks/t05-backend-transport.md`; design brief (full); coordinator design review round 1 (full — settled selections + required corrections + role-specific QA actions); coordinator start (baseline table only); verification.md; architecture.md; T01 foundation spec; T03 approved spec; T04 approved spec (binding/fence vocabulary only); MCP tools.md, routine-creation.md, authentication.md, acceptance-scenarios.md; backend service-protocol.md, authentication.md, acceptance-scenarios.md; `docs/handoffs/mcp-config-only-pickup.md`; `docs/tasks/README.md`; `docs/compatibility.md` (rows only, all unverified); nonsecret `package.json` pins/scripts, `vitest.config.ts`, `tsconfig.json`.
- Never read: the other role's document — Developer proposal (`docs/decisions/t05-transport-proposal.md`) and any Developer ADR/private review; any production/generated implementation sources/maps/diffs (`src/`, `companion/src/`, `experiments/`, `dist/`, source maps, build diffs); historical private QA harnesses as oracles; coordinator private probe code; any test-source bodies beyond plan-level path names; personal keyring/session bus; backend/private state; raw request/response bodies; `.pi`.
- No execution: QA ran no install/build/typecheck/lint/format/test/diagnostic/target/probe, touched no live service, performed no actual writes, edited no `.pi`, staged/committed nothing. Baseline install/checks remain coordinator-owned and coordinator-executed per start evidence.

## Interface under discussion (NOT approved — no guessing)

The brief targets a side-effect-free public `src/http/index.ts` → `dist/http/index.js` + declarations as the only backend network boundary. Round 1 settles adapter/origin/query/TLS/budget/deadline/error directions (summarized below as observable constraints) but the **concrete self-contained API is still pending** (exact runtime export inventory, TrustedTransportConfig/TransportDeps/Clock/Sleeper/wire request+response shapes, per-route result types, key-namespace representation, result/error/hook field lists). QA derives coverage from observable behavior and records narrowed questions below instead of inventing an API.

Settled observable constraints QA now aligns to (pending exact API):

- Direct Node24 builtins http/https adapter with dedicated non-pooled owned agents; no global fetch/dispatcher/cookie jar/redirect following. Protection covers Node24 environment-proxy opt-in as well as ordinary proxy variables; real-adapter behavior verified later, never documentation-only.
- No new dependencies, manifest/lock/compiler changes, or root/foundation/domain/storage/CLI/server/companion edits. Pure imports of the public T03 entry for read-argument validation and raw lossless decode are allowed, reusing the PUBLIC pinned-Zod in-memory registry exception transitively; network/IO/output/timers/listeners/global handlers remain forbidden.
- Canonical HTTPS origin; optional root-slash/default-port normalization; lowercase/IDNA host via WHATWG URL. Strict rejection of non-origin input BEFORE URL normalization can erase path traversal, embedded whitespace/backslashes, empty userinfo/query/fragment markers, or invalid ports. Trailing-dot hosts rejected. Explicit isolated HTTP test mode permits only literal `127.0.0.1`/`[::1]`, never `localhost`/DNS-selected destinations. No DNS/network at factory/import.
- Query encoding: ordered URLSearchParams with spaces normalized from `+` to `%20` after serialization; accepts ordinary JS string domain without encodeURIComponent URIError on lone surrogates (standard UTF-8 replacement semantics on the wire; no new T03 character-validity restriction invented). Omit empty `q` and empty filters; repeated muscleGroupId/equipmentId per OpenAPI; fixed `q`/filter/limit/pageToken order. `toLowerCase` (not locale lowercasing); sorted/deduplicated canonical UUID sets. Callers retain page context; no automatic traversal/restart or local claim to authenticate opaque tokens.
- TLS: explicit `rejectUnauthorized:true` plus certificate/hostname checking, min TLSv1.2, no downgrade. Factory and dispatch fail closed under `NODE_TLS_REJECT_UNAUTHORIZED=0` rather than editing the environment. A copied `testCaPem` is approved ONLY for literal loopback HTTPS fixture origins: it adds explicit fixture trust and NEVER disables certificate/expiry/host verification.
- Positive whole-second Retry-After honored on 429/503/500 when retrying; never shortened to a backoff cap or retried early; if it cannot fit remaining budget/attempts, return the original mapped error. Enormous positive lexical values mean no in-budget retry, never a parse-overflow fallback. Invalid/absent values use bounded default backoff. Success carries no retry action. T05 does no 401 refresh; T06 owns one refresh-and-retry.
- Six reads return concrete T03-projected data plus independent status/metadata, T03 raw decoder FIRST. Routine-mutation success likewise uses raw get_routine decoding with explicit expected ID, returning original response bytes + decoded record; T10 owns admitted-content/step confirmation. Never ordinary-parse resource data merely to inspect `id` or reserialize later.
- Controls: auth_challenge/auth_logout/account_status get one attempt; auth_exchange and auth_refresh ALSO get one transport attempt initially. Exchange/refresh identical-key durable recovery is explicitly T06/T07-owned (foreground/exact-key recovery + auth deadlines) — NOT intrinsically unsafe, just not T05's retry. A returned retryable classification does NOT start an automatic auth retry or mint a key. Resource/read retries alone are transport-bounded. No autonomous continuation.

## Narrowed public-interface questions (exact API still pending)

1. Exact runtime export inventory + per-method typed results (not a wholesale resource union), wire request/response shapes, TrustedTransportConfig/TransportDeps/Clock/Sleeper shapes; key-namespace representation (ordinary canonical UUID values with explicit route-fixed namespaces, or a specified tagged object — TS branded strings alone insufficient; no invented global rule against the same UUID across disjoint auth/resource namespaces).
2. Captured-binding representation: every invocation captures immutable origin, accountUuid (nullable ONLY for pre-auth controls), sessionGeneration, profileGenerationId BEFORE awaits — in every method or call context; validate/copy/deep-freeze synchronously; hooks receive the same capture at every attempt/pre-delivery, never a mutable global.
3. Owner hook order + beforeDispatch: trusted live-binding/credential-selection hook order; awaited beforeDispatch for durable dispatch-possible marking (failure prevents sending); hook bounding by call deadline/abort; timed-out-callback suppression rules; confirmation that no callback proves session/storage implementation or write permission.
4. Dispatch-certainty + result fields: conservative `dispatched` marked at handoff to the low-level sender (before header/body bytes may queue); deterministic adapter/fault evidence vocabulary; all result-field names including uncertainty accumulation.
5. Sticky-uncertainty table placement: accumulated-state field(s) + settle rules (valid canonical success or recognized durable identical-key outcome settles; auth/structural/throttling/transient alone never clears).
6. Runtime allowlist shapes: exact request wrapper/query/context validation rules; canonical key/UUID/header-safe-token checks; frozen control-request JSON shape/purpose validation (challenge purposes signIn + accountStatus only); createDraft expected-routine-UUID specification; duplicate-key/accessor/prototype/non-JSON failure modes — all without reconstructing/reserializing accepted bytes.
7. Body/response semantics: GET zero-identity-bytes rule; POST/PUT Content-Length rule; permitted-204 list; duplicate-key/UTF-8/JSON content-type handling for error/control responses; raw grant/control-bytes privacy handling.
8. Budget table: separate request / wire-response / header / projected-result UTF-8 JSON budgets; exact defaults + legal integer ranges permitting small isolated fixtures with future deployment flexibility; encoded-target/header accounting; maxHeaderSize + header-count values; body-head-timeout value.
9. Deadline table: monotonic-clock selection, max-elapsed/attempt relationship, hook/connect/TLS/write/head/body/sleep/decode/serialization inclusions, async-sender timeout/abort cleanup, late-callback/response suppression, listener/timer cleanup rules.
10. Error table: known code/status pairs; unknown-safe → backend_error (incl. unknown 400, never invented validation_error); sync-only-field exclusion (no fullResyncRequired passthrough); malformed/unsafe/mismatched/unrecognized → internal_error + conservative write uncertainty; 500 → internal_error/retryable; malformed-success → retryable-for-explicit-recovery with NO auto retry; redirect → internal_error/retryable with NO auto retry/follow; retryable defined as recovery classification, not auto-retry permission.
11. Unknown-code privacy bounds: safe-token grammar confirmation (nonempty ASCII `[a-z][a-z0-9_]*`, no 64-char domain max, bounded by response bytes); lexical-identifier/token-sequence exclusions; poisoned-message omission rules; diagnostics never containing backendErrorCode; message never returned/logged/interpreted.
12. Immutable-error/hook mechanics: specified readonly own-fields/fixed-message; runtime immutability enforcement; isTransportError hostile-getter safety; onEvent frozen-summary shape; no-event-for-bad-factory-input rule.
13. Test seam shapes: loopback-test flag + `testCaPem` field shapes (literal-loopback-only enforcement); injected clock/sleeper/transport factory shapes; proof that seams cannot dispatch past deadline or return partial data.
14. Future ownership windows: confirm intended QA paths (`test/unit/t05/`, `test/fault/t05/`, `docs/evidence/t05-qa-*`) remain CLOSED; frozen-relay execution/regression terms + explicit T04-provider-regression provisioning at later relay.

## Acceptance-scenario slice ownership (transport portion only — unchanged scope, tightened semantics)

- **M10 (T05 slice):** complete data or explicit `result_too_large` (now including projected-result budget); no truncation/partial-success; hostile content stays data; destination/permission immutability. Full tool/MCP/host/catalogue proof belongs to T08/T15/T16/T17.
- **A09 (T05 slice):** no credentials/bodies/queries/IDs/paths/payloads/Location/native details/backend messages or backendErrorCode in any ordinary log/diagnostic/event/error; bearer never exfiltrated via redirect/proxy/header; raw grant/control bytes stay private caller data. Wider config/process/transcript/proxy proof spans T04–T08/T09–T12/T15/T18/T20.
- **R02 (T05 slice):** exact replay identity + sticky uncertainty at the transport boundary; no sync-route switching; GET never settles; DB settlement belongs to T11/T16.
- **R06 (T05 slice):** bounded retries with original identity; Retry-After honored whole (never shortened); truthful fields; no worker/autonomous replay. Refresh serialization belongs to T06; orchestration policy to T11/T15–T16.
- **R08 (T05 slice):** no regenerated UUIDs, no fabricated confirmations, no invented IDs/history; mismatch/malformed stays uncertain. Admission semantics belong to T09–T11/T16.

## Coverage matrix (plan only — no test sources yet)

All fixtures synthetic and visibly so (placeholder origin `https://transport-qa.example.invalid`; loopback literals only; synthetic canonical UUIDs; frozen UTF-8 canaries; Int64-max fixtures; synthetic cert/key material visibly labelled test-only; no real credentials/tokens/IDs/paths/bodies). Layer key: **P** = actual production adapter over isolated literal-loopback wire; **D** = deterministic doubles (injected transport/clock/sleeper); **S** = static black-box rows = declaration/export inventory + intercepted black-box import behavior ONLY (QA never reads implementation source, even for static rows).

### A. Production-adapter vs doubles split

- A1. **P-required:** redirect matrix (301/302/303/307/308; same-origin AND cross-origin; HTTP→HTTPS and downgrade attempts; Location with userinfo/credentials), exact-byte wire preservation, abort/stream/header limits, proxy/header safety, TLS handshake behaviors, response-failure classification. Only the real Node24 http/https adapter + owned non-pooled agents + real sockets prove no-follow/no-forward/no-override.
- A2. **D-required:** timeout/sleep/Retry-After scheduling, transient sequences (429/503/500/timeout), malformed-body injection, dispatch-then-loss matrices, monotonic-clock deadline advancement. Wall-clock sleeps are not acceptance.
- A3. **D+P pairing:** every D classification gets a P spot-check for the same wire bytes; every P wire property gets a D fast regression. Neither layer claims the other.
- A4. **Guards-still-applied:** with doubles injected, route/destination/TLS/proxy/allowlist guards still reject (seams are not bypasses).
- A5. **No mocked-integration claims:** doubles never cited as backend/DB/browser/host interop (T16/T17/T19 remain separate gates).

### B. Route / destination / header / proxy / redirect attacks (M10/A09)

- B1. **P:** cross-origin redirect with bearer never forwards credentials/body/key (capture on both loopback origins; assert second-origin absence).
- B2. **P+D:** same-origin redirect also not followed; 3xx → internal_error/retryable for EXPLICIT recovery with NO automatic retry/follow (round-1 correction: retryable ≠ auto-retry).
- B3. **P+D:** Location with userinfo/query/fragment credentials or `//evil` scheme-relative forms → rejected, never connected, never logged/emitted.
- B4. **P+D:** non-allowlisted route/sync/export/delete/arbitrary-path attempts rejected before dispatch (no egress on P).
- B5. **P+D:** uppercase/non-canonical UUID paths, traversal (`..`, encoded slashes), query on concrete UUID routes → rejected before dispatch.
- B6. **P:** ordinary proxy variables AND Node24 environment-proxy opt-in paths, global-dispatcher override attempts, ambient cookie jar (Set-Cookie → replay), credential-forwarding fallback → no effect; assert direct loopback connection + absence of Proxy-*/Cookie headers.
- B7. **P+D:** caller/transport inputs and backend-selected endpoints (e.g. Location-suggested host) never select destination/headers/proxy.
- B8. **P+D:** non-origin inputs rejected BEFORE URL normalization can erase them: path/query/fragment present, userinfo (including empty `@`/`?`/`#` markers), embedded whitespace/backslashes, invalid ports, trailing-dot hosts, non-HTTPS production origins, `localhost`/DNS names in test mode. HTTP only under explicit isolated-test flag AND literal `127.0.0.1`/`[::1]`. No DNS/network at factory/import (assert import/factory performs none).

### C. TLS strictness (A09)

- C1. **P:** expired/self-signed/wrong-host/untrusted-chain loopback TLS → rejected with safe generic error; no HTTP fallback, no downgrading retry.
- C2. **P:** success path negotiates the configured origin; SNI/host verification per production adapter (record adapter + Node version).
- C3. `NODE_TLS_REJECT_UNAUTHORIZED=0` in the environment does NOT weaken validation: factory and dispatch fail closed rather than editing the environment (assert closed behavior, never mutate env in tests beyond spawning an isolated child env).
- C4. **S+D:** `testCaPem`, if approved, is explicit trusted-config-only for literal loopback HTTPS fixtures: adds fixture trust, NEVER disables certificate/expiry/host verification; caller/body/query/header/token inputs cannot enable it. Synthetic fixture keys/certs visibly labelled test-only; no external/live TLS endpoint anywhere.
- C5. TLS trust never disables validation: negative tests attempt every disablement path (flag, env, seam, caller input) and assert continued rejection of bad chains.

### D. Frozen byte / key replay + runtime control-purpose safety (R02/R08)

- D1. **D:** retries preserve exact method + concrete route + exact UTF-8 body + key + route-fixed namespace across transient paths, including empty-vs-absent distinction; byte-equality vs pre-dispatch snapshot (number-spelling/key-order/whitespace canaries `40` vs `40.0`).
- D2. **D:** synchronous capture semantics: caller-buffer mutation after call cannot alter dispatched bytes; returned/read buffers share no mutable aliases.
- D3. **D:** validation may INSPECT frozen bytes but never reconstructs/reserializes/modifies accepted bytes.
- D4. **D:** never allocates keys, never switches to sync routes, never replays under a different namespace.
- D5. **D:** UTF-8/lone-surrogate rule: ordinary JS strings accepted without URIError; wire uses standard UTF-8 replacement semantics where unpaired surrogates cannot be represented; no new T03 character-validity restriction invented or asserted.
- D6. **Runtime frozen-control-purpose safety (new per round 1):** frozen challenge bodies validated for exact JSON shape + purpose (`signIn`/`accountStatus` only): `export`/`deleteAccount` purposes, extra fields, or malformed control JSON are rejected BEFORE dispatch; duplicate keys/accessors/prototypes/non-JSON values fail without execution; createDraft specifies (per approved API) its expected routine UUID rather than inferring unsafely.
- D7. **D:** no shape-presence-only ordinary parse becomes canonical mutation success; resource data never ordinary-parsed merely to inspect `id` or reserialize later.

### E. Int64 raw decode (M09 transport slice)

- E1. **D+P:** revisions at 2^53−1/2^53/2^53+1/Int64-max/Int64-max+1/zero/negative/fractional/exponent spellings → exact decimal strings ONLY via T03 raw entry first; rounded-number→string never accepted.
- E2. Wire-string revisions, duplicate keys, malformed/trailing-garbage/truncated JSON → rejected, never partially projected.
- E3. Six reads decode whole records; routine-write success uses raw get_routine decoding with explicit expected ID and returns original response bytes + decoded record (T10 owns admitted-content/step confirmation).
- E4. Negative test: above-2^53-distinguishing revision must not survive a naive-parse path.

### F. Query / token context (M06–M08 transport slice)

- F1. Deterministic serialization asserted on **P** wire: ordered URLSearchParams, `+`→`%20`, omitted empty `q`/filters, repeated filter params per OpenAPI, fixed `q`/filter/limit/pageToken order, `toLowerCase` (not locale), sorted/deduped canonical UUID sets.
- F2. Hostile search/token strings (CRLF, `&?#%00`, bidi/overlong, 10 KB noise, lone surrogates) escaped without route/header injection or token corruption; large `q`/pageToken counted inside request budgeting (no bypass).
- F3. Opaque page-token bytes verbatim; caller-retained effective filters/limit; continuations repeat original context; changed-context/foreign-token → invalid-token errors, never silent drop/restart/traversal/partial aggregation.
- F4. 15-minute list-token expiry surfaces page_expired at the observable level; no frozen-list/bootstrap guarantee claimed; no local claim to authenticate opaque tokens.

### G. Budgets incl. request-target + projected-result expansion (M10/R06)

- G1. **Separate published budgets (round-1 expansion):** request bytes, encoded request-target/header bytes, wire-response bytes, response-header bytes (maxHeaderSize + header-count), AND projected-result UTF-8 JSON bytes (Int64-string projection can expand beyond wire size). Each enforced without partial success: oversize input → request_too_large without endless retry; oversize wire output → result_too_large; oversize projected result → result_too_large even when wire bytes fit.
- G2. Exact defaults/legal integer ranges must permit small isolated boundary fixtures while allowing future deployment flexibility (the 256 KiB..1 MiB request-range shape is explicitly insufficient — plan asserts the approved table literally once published; operational ceilings never certify supported data and the real service/deployment gate stays open).
- G3. **D:** streams/headers/body/encoding accounted during streaming (caps honored mid-stream, not only at completion); non-identity content-encoding rejected without decompression; no truncation-as-success; smaller page may help a list but never an oversized single aggregate.
- G4. Header specifics: explicit maxHeaderSize + header-count enforcement (maxHeadersCount-alone silent-discard is a failure mode under test); Node-generated Host/Connection expected (no false exact-five-header assertion); casing case-insensitive; no cookies/proxy-auth emitted or accepted.

### H. Monotonic deadlines + Retry-After + late-hook cleanup (R05–R06 slice)

- H1. **Monotonic clock:** default `performance.now`, not wall `Date.now`; injected clock trusted for determinism. Budget INCLUDES hooks, connect/TLS/write/head/body, retry sleeps, decode, and result-serialization checks.
- H2. **D:** per-attempt + total-elapsed (max-elapsed/attempt relationship per approved table) enforced; positive whole-second Retry-After on 429/503/500 honored whole — never shortened to a backoff cap, never retried early; unfittable Retry-After (remaining budget/attempts) → return original mapped error; enormous lexical values → no in-budget retry (not parse-overflow fallback); invalid/absent → bounded default backoff; success → no retry action.
- H3. **D:** transient retries bounded; permanent/malformed-success/oversize-unchanged inputs never retried indefinitely.
- H4. **Late-hook/async-cleanup cases (new per round 1):** hooks bounded by call deadline/abort; timed-out hook callback can never later dispatch/apply a response; late low-level responses after deadline/abort are suppressed (never delivered as confirmations); async sender timeout performs abort cleanup (sockets/timers/listeners released); injected sleeper/clock can never let the upper layer dispatch past the deadline or return partial data; handle/fd/listener counts stable across abort/sleep storms.
- H5. **D+P:** pre-dispatch abort (before dispatch-possible) stays a local non-uncertain abort; post-dispatch abort stays uncertain; body-head timeout covers slow partial reads (slow-drip body triggers timeout, not indefinite hang).
- H6. Budgets/deadlines are operational limits only; no permanent domain/name/array caps asserted; supported-aggregate acceptance without later real evidence explicitly not claimed.

### I. Async capture / fence / credential races — every case (A07-transport slice; round-1 correction)

- I1. **D:** every invocation captures immutable binding (origin, accountUuid, sessionGeneration, profileGenerationId) BEFORE awaits — synchronously validated/copied/deep-frozen; hooks receive the SAME capture at every attempt/pre-delivery, never a mutable current global.
- I2. **D:** generation change during an awaited hook cannot send a newly selected credential under the old invocation (hook-order race); credential selection + live-binding check order per approved API asserted literally.
- I3. **D:** awaited beforeDispatch durably marks dispatch-possible before network handoff; beforeDispatch failure prevents sending (no egress on P; typed local failure on D).
- I4. **Dispatch certainty (conservative):** `dispatched` marked at handoff to the low-level sender, BEFORE header/body bytes may queue; header-only commands can commit — first-body-byte flush is NOT a commit gate; no native exception after handoff proves pre-commit; TLS/reset errors after handoff stay uncertain (prefer conservative uncertainty to claiming non-commit).
- I5. **D+P:** fenced pre-send AND fenced pre-delivery both suppress use of the response as confirmation; missing bearer → authentication_required (never invalid_arguments); no cross-account installation; no callback proves session/storage implementation or write permission.
- I6. Cancellation races: cancel-before-dispatch-possible vs cancel-after (uncertain) vs cancel-during-hook/sleep — each asserted with fence/uncertainty/cleanup observables; no rollback/delete claim.

### J. Sticky-uncertainty regressions (explicit per round 1; R02/R06/R08)

- J1. **Accumulated uncertainty:** once ANY earlier attempt may have committed (dispatched write + lost/malformed/unrecognized response, 500, timeout, abort-after-dispatch), the invocation carries sticky uncertainty to completion. A later 401/413/429/malformed/structural/throttling/transient failure CANNOT erase it — the final result stays uncertain (approved uncertain encoding), never a definite rejection/success derived from the last attempt alone.
- J2. **Only these settle:** valid canonical success for the original request, or a recognized durable identical-key outcome replay. Current-auth, structural, throttling, or transient failures alone never settle.
- J3. **Regression matrix (D, with P spot-checks):** for every ordered pair (first-attempt uncertainty cause × later-attempt terminal failure: 401 / 413 / 429-with-Retry-After / malformed-success / unknown-permanent / timeout), assert sticky-uncertain outcome + accumulated state observable. Include header-only-write uncertainty (no-body POST) and empty-vs-absent-body variants.
- J4. Result_too_large after a possibly-committed dispatch stays possibly-committed; local pre-dispatch size/validation/abort stays non-uncertain — assert both sides, never conflate.
- J5. Sticky state appears explicitly in the approved error/retry table (not only last-attempt booleans) — plan asserts the table literally once published.

### K. Safe error mapping + no-auto-retry rules (R02/R06/R08)

- K1. Known code/status pairs per MCP tools contract; unknown safe permanent (INCLUDING unknown 400) → backend_error with safe backendErrorCode retained — never an invented validation_error.
- K2. Sync-only fields (e.g. fullResyncRequired) never passed through a model-facing strict error.
- K3. Malformed/unsafe/status-mismatched/unrecognized responses → internal_error + conservative write uncertainty (never an invented definite rejection).
- K4. HTTP 500 → internal_error/retryable. Malformed-success → retryable classification for EXPLICIT recovery but NO automatic retry within the call. Redirect → internal_error/retryable for EXPLICIT recovery with NO automatic retry/follow. `retryable` is a public recovery classification, never permission to auto-retry every mapped failure.
- K5. **Controls one-attempt rule (round-1 clarification):** challenge, exchange, refresh, logout, account-status each get ONE transport attempt initially. Exchange/refresh identical-key durable recovery belongs to T06/T07 foreground flows — a retryable classification on their single attempt does NOT start an automatic auth retry or mint a key. Resource/read retries alone are transport-bounded. No autonomous continuation anywhere.
- K6. 204 success ONLY where the route allows it (logout); bodyless resource success, unexpected status, malformed/truncated/duplicate-key/oversized data never become successful records or write confirmations.
- K7. No invented operation IDs/routine IDs/lastConfirmedStep at this layer (assert absence; T09–T11 supply admitted history).

### L. Unknown-code privacy + immutable errors/hooks + diagnostics (A09)

- L1. Never fabricate `backendErrorCode:"unknown"`; never drop a valid safe code because its backend message is poisoned. Safe unknown machine tokens: nonempty ASCII `[a-z][a-z0-9_]*`, no arbitrary 64-char domain maximum, bounded by response bytes. Lexical identifiers/token-looking sequences excluded as documented. Unsafe originals omitted with generic classification.
- L2. Backend message text NEVER returned/logged/interpreted; diagnostics NEVER contain backendErrorCode at all. Poisoned-message fixtures (credential/ID/script-shaped strings) asserted absent from errors/logs/metrics/events.
- L3. Safe public errors: only specified readonly immutable OWN fields + fixed message; no cause/native stack/binding/body/token references; runtime immutability enforced (not TS-readonly alone); `isTransportError` never executes hostile getters.
- L4. `onEvent` (if approved): detached frozen allowlisted summary with route labels (never concrete URLs), safe classification/status/attempt/timing, unrelated correlation identity; throwing listener changes nothing and leaks nothing (no exception capture); no event for bad factory input with no safe route label.
- L5. Import IO discipline: no stdout/implicit diagnostic writes on any path; T03 transitive import reuses the PUBLIC pinned-Zod in-memory registry exception only — all other network/IO/output/timer/listener/global-handler behavior forbidden. No historical private harness used as an oracle.
- L6. Log-capture inspection across ALL matrices greps absent for canaries (keys, tokens, UUIDs, search text, bodies, Location values, native messages, backendErrorCode, backend messages).

### M. Static rows = black-box only (role-boundary correction)

- M1. **S** rows assert declarations/export inventory + intercepted black-box import behavior (subprocess import with IO/network/timer/listener/global-handler/output interception, arbitrary argv) — NEVER by reading implementation source, maps, or diffs, even for "static" questions.
- M2. Existing tests never edited; T04 private-provider regressions are explicitly provisioned only at a later relay (never personal bus/keyring); no parked-T02 execution/exclusion; no whole-suite pass from scoped runs; no skips/`passWithNoTests`/`|| true`; skips stay failures.

### N. Retained regression suites (no edits)

- N1. Foundation 100/100 (T01 inert bytes/exits) unchanged.
- N2. T03 221/221 schema/codec boundaries unchanged (raw Int64 entry + envelope validation the transport relies on).
- N3. T04 storage suites unchanged (transport tests neither disturb nor reinterpret storage fences).
- N4. Coordinator start baseline (locked install + four production checks) acknowledged as coordinator evidence, not QA execution.

## Planned test layout (paths NOT open — awaiting grant)

- Intended (still CLOSED): `test/unit/t05/` (deterministic doubles: identity/purpose/query/decode/errors/budgets/deadlines/sticky-uncertainty/diagnostics), `test/fault/t05/` (loopback production-adapter wire: redirects/TLS/proxy/abort/stream/header/response-failures + dispatch-loss), synthetic helpers/fixtures within those paths only, `docs/evidence/t05-qa-*` reports.
- Untouched: existing `src/domain|storage|contracts`, root, server/CLI/companion, experiments, old tests, shared manifests/lockfile/config (coordinator approval + single owner; no new dependency or compiler relaxation preapproved).

## Traceability (design review → matrix)

- Builtins adapter/no-dispatcher/no-jar/no-follow + proxy opt-in → A1/A4, B6.
- T03 pure import + Zod registry exception → E-series, L5.
- Origin strictness/trailing-dot/literal-IP/no-DNS → B8.
- Query URLSearchParams/%20/lone-surrogate/fixed-order/toLowerCase → F1–F2.
- TLS rejectUnauthorized/min1.2/NODE_TLS_REJECT_UNAUTHORIZED-fail-closed/testCaPem-loopback-only → C1–C5.
- Retry-After whole-seconds/enormous-lexical/default-backoff → H2.
- Raw-decoder-first/expected-ID/original-bytes → E1–E4, D7.
- One-attempt controls + T06/T07 identical-key recovery → K5, D-series intro.
- Captured binding/hook order/beforeDispatch → I1–I3, I5–I6.
- Dispatched-at-handoff conservatism → I4, J1–J5.
- Sticky uncertainty → J1–J5.
- Runtime allowlist/control-purpose → D6, I-series.
- Body semantics/GET-zero/Content-Length/204/error-control content handling → K6–K7, D7.
- Request-target/projected-result budgets → G1–G4.
- Monotonic deadlines/late-hook cleanup → H1–H6.
- Header/stream safety → G4, B-series.
- Error table/no-auto-retry → K1–K5.
- Unknown-code privacy/diagnostics-silence → L1–L2.
- Immutable errors/hooks → L3–L4.
- Inert-import calibration → L5, M1.
- Fixture/read boundaries → C4, M1–M2.
- Scenarios: M10 → B/F/G/K/L; A09 → B/C/L/M; R02 → D/I/J/K; R06 → G/H/J; R08 → D/E/J/K.

## Blockers / requests / hold

- Blockers: (a) exact approved public API still pending — nothing to write or execute against; (b) no implementation artifact / frozen relay — nothing to run; (c) T04-provider-regression provisioning deferred to later relay by design review.
- Requests: coordinator publishes the approved spec resolving questions 1–14, then explicitly opens exact QA source paths + frozen-relay execution/regression terms. QA then writes owning test sources from that spec alone (never Developer sources) and runs only relay-authorized commands.
- Round-1 corrections applied in this rev: consumed-proof vs identical-key recovery clarified (exchange/refresh one transport attempt here; durable identical-key recovery is T06/T07, not intrinsically unsafe); sticky-uncertainty regressions explicit; request-target + projected-result budgets expanded; monotonic/late-hook deadline/cleanup cases added; runtime frozen-control-purpose safety added; every async capture/fence/credential race enumerated; no-auto-retry on malformed/redirect/control stated; static rows defined as black-box declarations/interception only; TLS-trust-never-disables-validation with test-only labelled loopback fixtures; transitive T03 pinned-Zod exception honored.
- Commands NOT RUN (document-only window; source/metadata/target/diagnostic/check execution CLOSED): `npm ci --ignore-scripts`, `npm run typecheck`, `npm run lint:production`, `npm run format:check:production`, `npm run build`, `npm run smoke`, `npm run test` (all), any diagnostic/target/probe/loopback execution, any live-service contact. QA ran none of these.
- Changed path in this window: `docs/evidence/t05-qa-plan.md` (this file, rev 2) — the ONLY writable path.
- QA HOLDS after async report: no polling, no Developer exchange, no production reads, no successor work.

## Evidence format commitment

Each future `docs/evidence/t05-qa-*` report will state task, scenario IDs (M10/A09/R02/R06/R08 slices), layer (P vs D vs S as defined above), tested artifact/version + frozen-relay hash, exact safe reproduction commands, expected vs observed, pass/fail/blocked, cleanup, and limits (loopback-vs-real-backend distinction, TLS/fixture scope with test-only labelling, no host/backend/Google certification). Synthetic fixtures live in `test/` with visibly synthetic provenance. No secrets, tokens, account/resource IDs, private paths, or raw request/response bodies in repo, logs, or evidence.

## Approved-spec alignment addendum (rev 3 note, round 2)

The coordinator-approved `t05-approved-transport-spec.md` rev 1 supersedes
incompatible rev-2 planning text. Independent test sources are prepared under
`test/unit/t05/`, `test/fault/t05/` and reported in
`docs/evidence/t05-qa-test-sources.md`; no target/suite/loopback/provider/tool
execution has occurred. Key approved deltas now encoded in sources:
409-key-reused NEVER settles uncertainty (no T05 error clears sticky state);
valid 503 and projected-result overflow are uncertain on writes;
synchronous final `isCurrent`, full four-field `forBinding`, per-attempt
internal signals, exact wire/budget/error-constructor shapes; typed-array
results are independent MUTABLE copies (objects/JSON frozen, never byte
arrays). Corrected privacy rule: safe `backendErrorCode` IS allowed in the
returned error but NEVER in logs/events/diagnostics (this corrects the broader
rev-2 exclusion). All five controls get exactly one attempt; durable
identical-key auth recovery is T06/T07-owned. Test-only TLS fixture generation
is requested through the coordinator; missing fixtures fail loudly, never skip.
