# T05 Developer transport proposal — fixed-origin backend transport (rev 2)

> **Superseded:** the coordinator-approved public specification
> `docs/decisions/t05-approved-transport-spec.md` (rev 1) is the sole
> implementation/test authority; this proposal is retained history only.

**State:** DESIGN/PLANNING ONLY per `docs/tasks/t05-work-order.md` and
`docs/decisions/t05-transport-design-brief.md`, revised against the common
public decisions in `docs/evidence/t05-coordinator-design-review.md`
(first planning round, disposition NOT ready for implementation). NOT approved
for implementation, dependency/manifest/config edits, installs, builds,
checks, target execution, live services, actual writes, `.pi` edits,
staging/commits or successor work.
**Owner:** Developer. **Write scope:** this file only
(`docs/decisions/t05-transport-proposal.md`). No QA sources, fixtures,
internal plans, evidence or diffs read (including any `t05-qa-plan`); the
other role's private document was never opened. No repository commands run.
Normative: shared MCP 0.2-draft working-tree revision over `9a96dcb`, backend
OpenAPI 1.0.0, `service-protocol.md`, `authentication.md`,
`account-lifecycle.md`, `tools.md`, `routine-creation.md`, approved T01
foundation / T03 schema-codec / T04 storage specs, `architecture.md`,
`verification.md`. T02 parked, T13/T14 retired, T09 unassigned. No
shared-contract rewrite. No new dependency, manifest, lockfile, compiler or
config change proposed — any such change requires coordinator adjudication.

## Revision history (retained per coordinator instruction)

- **Rev 1 (initial proposal):** node:http(s) adapter choice, 14-route
  allowlist, frozen-byte identity, session/fence seams, budget/error tables,
  FQ1–FQ8 open. Superseded where incompatible with the coordinator design
  review; preserved here as history, not as authority.
- **Rev 2 (this revision):** integrates every settled selection and all 15
  required corrections from `docs/evidence/t05-coordinator-design-review.md`,
  which supersedes incompatible rev-1 text. Principal differences:
  1. Strict pre-URL lexical origin gate + trailing-dot rejection; loopback
     narrowed to literal `127.0.0.1`/`[::1]` (never `localhost`); no DNS at
     factory/import (settles FQ1; corrections §1).
  2. Query encoder pinned to ordered `URLSearchParams` with `+`→`%20`
     normalization; lone-surrogate UTF-8 replacement semantics documented, no
     new character restriction (settles FQ2).
  3. Retry-After honored exactly on 429/503/500 when retrying; never
     shortened to the backoff cap; unfit/enormous values return the original
     error; invalid/absent values use bounded default backoff; success
     carries no retry action (settles FQ4/FQ8).
  4. Reads return concrete per-method T03-projected types; routine-mutation
     success uses full raw `get_routine` T03 decode with explicit expected ID
     and returns original bytes + decoded record (settles FQ5).
  5. `auth_exchange`/`auth_refresh` reduced to one transport attempt like the
     other controls; only resource/read retries are transport-bounded; no
     autonomous continuation.
  6. Per-call immutable `CallBinding` captured synchronously in every
     signature; hook order with generation check; awaited `beforeDispatch`;
     hooks bounded by deadline/abort with late-callback suppression; missing
     bearer is `authentication_required` (corrections 2–3).
  7. Conservative dispatch at wire handoff + sticky cross-attempt uncertainty
     (corrections 4–5).
  8. Runtime request/control-body validation incl. duplicate-key/accessor/
     prototype handling and `createDraft` expected-UUID parameter; GET zero
     body; logout sole 204; envelope rules for error/control responses
     (corrections 6–7).
  9. Added projected-result budget; widened legal ranges for fixture-scale
     boundaries; request target+header byte accounting (correction 8).
  10. Monotonic `performance.now` deadlines covering hooks/IO/sleeps/decode/
      serialization; attempt/deadline relationship; cleanup and late-response
      suppression rules (correction 9).
  11. Explicit `maxHeaderSize` + raw header-count enforcement; Node-generated
      Host/Connection expected; case-insensitive headers; no cookies/proxy
      auth; streaming caps; non-identity encoding rejected; generic
      header/parser failures (correction 10).
  12. Reworked decision table: unknown-400 → `backend_error`; no
      `fullResyncRequired`/sync-field passthrough; malformed/unsafe/mismatched
      → `internal_error` with write uncertainty; `retryable` is recovery
      classification with an explicit auto-retry column (no auto-retry for
      malformed/redirect/auth within a call) (correction 11).
  13. Unknown-code privacy: no fabricated codes; safe grammar without
      arbitrary length cap; diagnostics never carry `backendErrorCode`;
      message text never returned/logged (correction 12).
  14. Runtime-frozen errors; getter-safe `isTransportError`; frozen detached
      events; no factory-input events (correction 13).
  15. T03 import calibration via the public pinned-Zod exception; literal
      loopback + labelled synthetic fixtures; black-box QA boundaries; no
      existing-test edits (corrections 14–15).

## 0. Summary of choices (rev 2)

- Production entry `src/http/index.ts` -> `dist/http/index.js` + readonly
  `.d.ts`. Side-effect-free import subject to the T03 public
  pinned-Zod in-memory-registry exception (transitive, calibration §12);
  otherwise no IO, output, timers, processes, network, listeners, or global
  handlers at import.
- One factory `createBackendTransport(trustedConfig, trustedDeps)` bound to a
  single canonical origin. Typed allowlisted-route methods only; no generic
  URL/method/header/proxy API. Complete exact types in §13.
- Production wire adapter built **only on Node builtins `node:https` /
  `node:http`** via `https.request` / `http.request` with dedicated
  non-pooled owned agents. NOT global `fetch`/undici. Explicit protection
  against both ordinary proxy variables and Node 24 environment-proxy opt-in
  (§1.4); real-adapter behavior is verified later by loopback wire tests, not
  asserted by documentation alone.
- No new runtime dependency. `src/http` imports Node builtins plus pure
  imports of the public T03 entry (`parseArguments` for read-query
  validation, `decodeBackendResponse` for raw lossless decode, and T03
  projected/record types). No Zod/SDK/dbus surface of its own.
- Frozen-byte identity with runtime validation that inspects but never
  reserializes accepted bytes (§4).
- Trusted seams: per-call frozen `CallBinding`, T06-owned `SessionHooks`
  (`beforeDispatch`, `checkBinding`, `selectCredential`), injectable
  monotonic clock/sleeper/low-level wire. Seams are factory-trusted, never
  per-request model input; production guards stay above every seam.

## 1. Fixed destination (brief §1)

### 1.1 Strict pre-normalization lexical gate

Applied to the raw `origin` string BEFORE `new URL()` runs, so normalization
cannot silently erase attacks. Reject with `invalid_arguments` when the raw
string:

- is empty or longer than 253 ASCII characters;
- contains any ASCII whitespace/control byte or a backslash `\` (blocks
  `path traversal`, `..`, backslash-host confusion, embedded `CR/LF`);
- contains `@` anywhere before the first `/`, `?`, or `#` (blocks userinfo,
  including empty-user `https://@host`);
- ends with an empty query/fragment marker (`?` or `#` with nothing after,
  or contains `?`/`#` at all — origins carry no query/fragment);
- has a scheme prefix other than exactly `https://`, except the §1.2
  literal-loopback `http://` carve-out.

### 1.2 Canonicalization

1. `new URL(gated)`; failure -> `invalid_arguments`.
2. Scheme must be `https:` (or §1.2 `http:`). `username`/`password` must be
   empty; `pathname` must be empty or `/`; `search`/`hash` must be empty
   (double-checked post-parse — belt and braces, never normalization-only).
3. Hostname: lowercased/IDNA-processed by WHATWG `URL`; additionally reject
   empty hosts and trailing-dot hosts (`example.com.` rejects — no silent
   dot-stripping equivalence games). IPv6 stays in canonical bracketed form.
4. Port: absent (default 443 normalized away) or explicit decimal `1..65535`
   preserved verbatim. Invalid port text rejects.
5. The canonical string (e.g. `https://api.example.com`) is frozen in the
   instance. No DNS resolution, no network access, at factory or import.

### 1.3 HTTP carve-out (isolated literal-loopback tests only)

`http:` is accepted **only** when ALL hold:

- `trustedConfig.allowInsecureLoopback === true` (explicit trusted boolean,
  default `false`; never model input, never per-request);
- post-parse hostname is exactly `127.0.0.1` or `::1` (IPv6 in brackets in
  the URL string; hostname value `::1`). `localhost` and any DNS-selected
  name are NEVER accepted — settled coordinator selection;
- production configuration review must reject `allowInsecureLoopback: true`.

### 1.4 Proxy / dispatcher / endpoint-selection boundaries

- The implementation never reads `HTTP_PROXY`, `HTTPS_PROXY`, `http_proxy`,
  `https_proxy`, `NO_PROXY`, `no_proxy`, or Node 24's environment-proxy
  opt-in surface; never constructs a proxy agent; never consults or mutates
  any global dispatcher/agent; the public API has no proxy option.
- Node 24 exposes opt-in environment-proxy handling on some clients; the
  chosen `http(s).request` path does not enable it, and the implementation
  pins this by construction (explicit per-call agents, no global lookup).
  Loopback wire tests later verify real-adapter immunity with proxy
  variables pointed at a black hole (behavioral evidence, not a docs claim).
- Request targets are built only from the §2 route templates; response
  bodies/headers can never change any current/future destination.
- No cookie jar: `Set-Cookie` is drained within the header cap and dropped;
  no `Cookie`/`Proxy-Authorization` header is ever sent; caller-controlled
  headers do not exist.

### 1.5 Redirect boundary

No redirect following of any kind (`3xx`, same-origin or cross-origin).
`http(s).request` follows nothing by itself; zero follow logic is added; the
socket is closed after bounded drain; nothing is resent. Every `3xx` maps to
`internal_error`, `retryable: true` (explicit-recovery classification), with
NO automatic retry or follow inside the call. The `Location` value is never
logged, returned, or emitted.

### 1.6 TLS boundary

- Production adapter: `https.request` with explicit
  `rejectUnauthorized: true`, default hostname verification
  (`checkServerIdentity`), and explicit `minVersion: "TLSv1.2"`. No
  downgrade; no per-request TLS parameters exist.
- `NODE_TLS_REJECT_UNAUTHORIZED`: the factory checks at creation AND every
  dispatch checks before handoff; a value of exactly `"0"` fails closed
  (`invalid_arguments` at factory, `network_error`-family abort at
  dispatch — specified as a dispatch-time `invalid_arguments`-class abort
  that never sends). The environment is never modified by this module.
- Test trust seam: trusted-only `testCaPem?: Uint8Array` (defensively
  copied), honored ONLY for literal-loopback `https://127.0.0.1[:port]` /
  `https://[::1][:port]` fixture origins. It ADDS fixture trust via the `ca`
  option; certificate/expiry/hostname verification stays fully enabled.
  Production config forbids `testCaPem`. No model-reachable TLS bypass.
- Certificate/hostname failures are generic `network_error` transport
  failures; native TLS details never enter errors, events, or logs.

## 2. Allowlisted routes (brief §2)

Fourteen concrete route names only. Route selection fixes method, path
template, auth mode, allowed parameters, key namespace, and expected success.
Mutation query strings are prohibited; only the three GET list/search routes
carry a query string built by §3.

| # | RouteName | Method | Path template | Auth | Key namespace | Expected success |
|---|-----------|--------|---------------|------|---------------|------------------|
| 1 | `search_exercises` | GET | `/v1/catalogue/exercises` | bearer | none | 200 JSON search page + `catalogueVersion` |
| 2 | `get_exercise` | GET | `/v1/exercises/{exerciseId}` | bearer | none | 200 JSON Exercise |
| 3 | `list_workouts` | GET | `/v1/workouts` | bearer | none | 200 JSON WorkoutSummary page |
| 4 | `get_workout` | GET | `/v1/workouts/{workoutId}` | bearer | none | 200 JSON Workout |
| 5 | `list_routines` | GET | `/v1/routines` | bearer | none | 200 JSON saved-routine page |
| 6 | `get_routine` | GET | `/v1/routines/{routineId}` | bearer | none | 200 JSON Routine (draft allowed iff explicitly addressed) |
| 7 | `create_draft` | POST | `/v1/routines` | bearer | `resource` | 201 JSON empty draft, same-ID as `expectedRoutineId` |
| 8 | `populate_draft` | PUT | `/v1/routines/{routineId}` | bearer | `resource` | 200 JSON draft, same-ID, full T03 decode |
| 9 | `save_routine` | POST | `/v1/routines/{routineId}/save` | bearer | `resource` | 200 JSON saved routine, same-ID, full T03 decode |
| 10 | `auth_challenge` | POST | `/v1/auth/google/challenge` | none | none | 200 JSON challenge (envelope only) |
| 11 | `auth_exchange` | POST | `/v1/auth/google` | none (proof in body) | `auth` | 200 JSON session (envelope only) |
| 12 | `auth_refresh` | POST | `/v1/auth/refresh` | none (credential in body) | `auth` | 200 JSON session (envelope only) |
| 13 | `auth_logout` | POST | `/v1/auth/logout` | none (credential in body) | none | 204 empty (sole permitted 204) |
| 14 | `account_status` | POST | `/v1/account/status` | none (proof in body) | none | 200 JSON status (envelope only) |

Normative notes:

- UUID path segments must match exactly
  `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`;
  uppercase/non-canonical rejects `invalid_arguments` pre-dispatch.
- Challenge purposes exposed: `signIn` and `accountStatus` ONLY.
  `export`/`deleteAccount` cannot be expressed or sent (§4.3).
- Key namespaces are fixed BY ROUTE. Keys are ordinary canonical UUID
  strings (rev-1 branded types withdrawn — TS branding cannot prove runtime
  namespace provenance). The same UUID value MAY appear in both disjoint
  `auth` and `resource` namespaces; no invented global cross-namespace
  uniqueness rule exists. Within one namespace the caller (T09) owns retry
  identity; transport echoes the route's key verbatim as the
  `Idempotency-Key` header.
- Auth/status routes carry proofs in frozen body bytes, never in headers.
  Bearer routes carry the access token only via the §5 seam.
- No sync, export/delete, workout/exercise mutation, copy/finish/
  perform-again/start-workout, snapshot/pull/push, method override, or
  per-request base URL exists.

## 3. Query context (brief §3)

Read-query validation/defaults belong to T03: the three list/search methods
accept `queryInput: unknown` and validate it with
`parseArguments("search_exercises" | "list_workouts" | "list_routines",
queryInput)` from the public T03 entry, yielding effective values
(`limit` 1..200 default 20, `search` default `""`, filter arrays default
`[]`, `pageToken` omitted-or-nonempty, `status` omitted-or-enum). T05 then
applies backend normalization + deterministic serialization:

- Search: `toLowerCase()` (the locale-independent method; never
  `toLocaleLowerCase`). No trimming, NFC/NFKC, stemming, or other folding.
  Empty-after-lowercase ⇒ `q` omitted. Empty filter arrays ⇒ omitted.
- UUID filters: sorted ascending (code-unit order on canonical lowercase
  UUIDs), deduplicated exactly.
- Encoder (settled): ordered `URLSearchParams` over the fixed pair order,
  then normalize every `+` to `%20`. Fixed orders:
  search: `q`, `muscleGroupId…`, `equipmentId…`, `limit`, `pageToken`;
  workouts: `status`, `limit`, `pageToken`; routines: `limit`, `pageToken`.
  Repeated `muscleGroupId`/`equipmentId` per OpenAPI form/explode. Hostile
  values (`&`, `=`, `#`, `%`, controls, non-ASCII) are encoded data, never
  injection — no raw interpolation.
- Lone/unpaired surrogates in JS strings: `URLSearchParams` accepts the
  ordinary JS string domain (no `encodeURIComponent` URIError); non-UTF-8-
  encodable units follow standard UTF-8 replacement-character semantics on
  the wire. This is documented transport behavior, NOT a new T03
  character-validity restriction — T03 validation is unchanged.
- Page tokens are opaque: sent verbatim when present, never decoded,
  re-bound, dropped, or restarted. A call carrying `pageToken` must also
  carry explicit effective `limit`/filters (guaranteed by T03 defaults —
  transport asserts presence, never substitutes). No automatic traversal,
  aggregation, or restart; no local claim to authenticate tokens.
  `page_expired` (410) is surfaced truthfully; restart is the caller's
  explicit decision.

## 4. Immutable identity and runtime request validation (brief §4)

### 4.1 Capture rules

- Bodies are already-frozen UTF-8 JSON bytes owned by the caller (e.g. T09
  journal). Transport validates: real `Uint8Array`/`Buffer` view only
  (reject `SharedArrayBuffer`-backed, detached, or non-view inputs);
  byte length within `maxRequestBytes` AND target+header accounting within
  `maxRequestTargetBytes` (§6); UTF-8 well-formed
  (`TextDecoder("utf-8", {fatal:true})` probe, string discarded). Then it
  copies (`Buffer.from`) into a private capture BEFORE the first `await`.
  Caller buffers are never retained by reference or mutated.
- Keys are canonical UUID strings, copied as primitives. Header-safety is
  asserted pre-dispatch (canonical UUID charset is header-safe by
  construction; bearer tokens are rejected `invalid_arguments` if they
  contain `CR`/`LF`/non-ASCII — Node would throw otherwise).
- Retries reuse the captured copy: same method, concrete route, bytes, key,
  namespace. Transport never parses-then-reserializes retained requests,
  never allocates keys, never switches routes/namespaces.

### 4.2 Body-presence semantics

- GET routes send ZERO identity bytes: no body written, no `Content-Type`,
  explicit `Content-Length: 0`. An injected `{}` is never synthesized.
- POST/PUT routes send the exact captured bytes with
  `Content-Type: application/json; charset=utf-8` and exact
  `Content-Length`. Absent-vs-`{}` stays distinct per route definition.

### 4.3 Frozen control/mutation validation (inspect, never reserialize)

Validation parses a SCRATCH copy for shape checks only; the ORIGINAL captured
bytes are what the wire sends. Scratch parsing uses duplicate-key rejection
(lexical pre-scan equivalent to the T03 rule), `JSON.parse` into
freshly-created holders read only via `Object.hasOwn` (accessor/prototype
names are inert data — validation reads, never assigns into live objects),
and exact-key-set comparison. Failures are `invalid_arguments`, never sent:

- `auth_challenge`: scratch must be `{}` or exactly
  `{purpose: "signIn" | "accountStatus"}`. `export`/`deleteAccount`/extra
  fields/purposes reject — they cannot be transmitted.
- `auth_exchange`: exactly `{challengeId: UUID, idToken: nonempty string}`.
- `auth_refresh` / `auth_logout`: exactly `{refreshToken: nonempty string}`.
- `account_status`: exactly
  `{accountId: UUID, challengeId: UUID, idToken: nonempty string}`.
- `create_draft`: exactly `{id: UUID}` AND equal to the explicit
  `expectedRoutineId` method parameter (string comparison on scratch values;
  the routine UUID is a caller-supplied parameter, never inferred from bytes
  alone).
- `populate_draft` / `save_routine`: scratch root `id` (populate) must equal
  the path `routineId` parameter; save scratch must be exactly `{name:
  nonempty string}`. Full domain confirmation stays with T10 (§7.3).
- Non-JSON wrapper values (functions, `undefined`, `BigInt`, symbols,
  accessors on query/context objects, cyclic inputs) are `invalid_arguments`.
  Unknown own-enumerable fields on `CallBinding`/query wrappers reject;
  accepted bytes are never modified.

## 5. Session seams and owner boundaries (brief §5)

T06 owns grants, durable refresh, generation verification, and the single
401 refresh-and-retry. T05 never invents identity, refreshes, logs in, or
infers deletion from 401/404/network errors. Hooks are integration seams
for T06 — not proof of any session/storage implementation or write
permission.

### 5.1 Per-call immutable binding

Every method takes `binding: CallBinding` as its first parameter:

```ts
export interface CallBinding {
  readonly origin: string;
  readonly accountUuid: string | null; // null allowed ONLY on routes 10-14
  readonly sessionGeneration: number;  // non-negative safe integer
  readonly profileGenerationId: string; // canonical UUID
}
```

Validated/copied/deep-frozen synchronously at entry BEFORE the first
`await`: exact own-field set, canonical origin equal to the factory's bound
origin (else `invalid_arguments`... see 5.3 for the bearer-missing rule),
canonical UUID shapes, safe-integer generation. Bearer routes (1–9) require
non-null `accountUuid`; control routes (10–14) accept null (pre-auth). Hooks
receive this SAME frozen capture on every attempt and at pre-delivery —
never a mutable live-global binding. Account identity itself originates in
later service verification (T06/T12), never in these fields.

### 5.2 Hook order and generation safety

```ts
export interface DispatchSummary {
  readonly routeLabel: RouteName;
  readonly method: "GET" | "POST" | "PUT";
  readonly target: string;         // encoded path+query, ASCII
  readonly bodyByteLength: number;
  readonly keyKind: "resource" | "auth" | null;
}
export interface CredentialMaterial {
  readonly bearerToken: string;
  readonly forGeneration: number;  // session generation the token was selected for
}
export interface SessionHooks {
  beforeDispatch(ctx: CallBinding, summary: DispatchSummary): Promise<void>;
  checkBinding(point: "pre-send" | "pre-delivery", ctx: CallBinding): Promise<void>;
  selectCredential(ctx: CallBinding, route: BearerRouteName): Promise<CredentialMaterial | null>;
}
```

Per-call order:

1. Freeze `ctx`. Await `beforeDispatch(ctx, summary)` — the owner's
   durable dispatch-possible mark. Throw/rejection/timeout ⇒ nothing is
   sent (`operation_interrupted`, pre-dispatch).
2. Per attempt: await `checkBinding("pre-send", ctx)`; then (bearer routes)
   await `selectCredential(ctx, route)` and verify
   `material.forGeneration === ctx.sessionGeneration`, else abort — this
   closes the race where a generation change during an awaited hook would
   send a newly selected credential under an old invocation. `null` or a
   mismatch ⇒ `authentication_required` (missing bearer is
   `authentication_required`, never `invalid_arguments`).
3. Build headers from the frozen capture + selected credential only.
4. Mark dispatch (§6.1 of behavior: §8 here) at wire handoff, send, receive.
5. Await `checkBinding("pre-delivery", ctx, …)` on the same frozen capture
   before returning success. Failure ⇒ the response is discarded and the
   call fails (`operation_interrupted`; mutations: uncertainty per sticky
   state — a received-then-fenced response is uncertain).

Hook bounding: every hook promise races the call's remaining
`totalDeadlineMs` budget and the call `AbortSignal`. A hook that times out
or outlives abort fails the call; its LATE settlement is suppressed by a
generation counter and can never dispatch bytes or apply a response
afterwards. Hook timers/listeners are removed on all paths.

### 5.3 Cancellation and 401 discipline

- Every method takes an `AbortSignal`. Abort before handoff ⇒
  `operation_interrupted`, pre-dispatch. Abort after handoff or during
  retry sleep ⇒ sleep/attempt ends immediately; mutations keep sticky
  uncertainty (§8.2).
- T05 performs ZERO 401 refresh/retry. 401s map verbatim
  (`authentication_required` / `reauthentication_required`,
  `retryable: false`) with resource identity intact. The single
  refresh-and-retry belongs to T06 as a NEW call with the same frozen
  body/key/route. A `retryable` classification NEVER starts an automatic
  auth retry and never mints a key.

## 6. Budgets and deadlines (brief §6)

Operational transport budgets only — never domain/name/array caps. All live
in `TrustedTransportConfig` (operator deployment, never model input).
Non-integer/out-of-range values fail the factory with `invalid_arguments`.
Operational ceilings do not certify supported data; the real
service/deployment gate (service-protocol T8) stays open.

| Budget | Default | Legal trusted range (integers) | Applies to | Exceed behavior |
|--------|---------|-------------------------------|------------|-----------------|
| `maxRequestBytes` | 262144 (256 KiB) | 64..16777216 | captured body per attempt, pre-dispatch | `request_too_large`, pre-dispatch, never retried |
| `maxRequestTargetBytes` | 4096 | 64..65536 | encoded target + sent header name/value bytes (large `q`/`pageToken` cannot bypass request budgeting) | `request_too_large`, pre-dispatch |
| `maxResponseBytes` | 1048576 (1 MiB) | 64..16777216 | accumulated response body, enforced incrementally during streaming | `result_too_large` (mutations: sticky-uncertain unless valid success was established) |
| `maxProjectedResultBytes` | 1048576 (1 MiB) | 64..16777216 | UTF-8 bytes of the projected JSON result AFTER T03 Int64→string expansion | `result_too_large`; after a valid success the commit is known ⇒ `outcomeUnknown: false`; never truncated |
| `maxHeadBytes` | 32768 | 4096..131072 | response head (`maxHeaderSize`); enforced, not merely observed | oversize head ⇒ `internal_error` (malformed family) |
| `maxHeaderCount` | 100 | 10..1000 | response header fields counted from raw headers (a platform `maxHeadersCount`-style silent discard is NOT relied upon) | excess ⇒ `internal_error` |
| `perAttemptTimeoutMs` | 10000 | 50..120000 | one wire attempt: connect+TLS+write+head+body; also bounds slow partial reads (no separate head timer) | timeout ⇒ transport failure; mutations uncertain iff handoff reached (always, post-handoff, per §8.1) |
| `totalDeadlineMs` | 60000 | 100..600000 | whole call: hooks, attempts, sleeps, Retry-After waits, decode, projection/serialization checks, on monotonic clock | exceeded ⇒ return last error, no further attempt; upper layer never dispatches after it |
| `maxAttempts` (reads + resource mutations) | 3 | 1..5 | wire handoffs incl. malformed-ending ones | — |
| attempts (all five control routes) | 1 | fixed, not configurable | NO automatic retry: consumed proofs / lost success are T06/T07 explicit recovery | any received response is final |
| `baseRetryDelayMs` | 500 | 0..10000 | default backoff `base * 2^n` (deterministic, no jitter) for invalid/absent Retry-After | abortable; must fit remaining budget or return |
| `maxRetryDelayMs` | 5000 | 0..60000 | backoff cap (Retry-After values are NEVER capped — §6.1) | — |

### 6.1 Retry-After (settled: 429/503/500)

- Honored ONLY on 429/503/500 responses being retried, and only when the
  header value matches exactly `^[1-9][0-9]*$` (OpenAPI pattern, no
  whitespace). Success carries NO retry action.
- The positive value is used EXACTLY: never shortened to the backoff cap,
  never retried early. If `elapsed + delay > totalDeadlineMs`, or no
  attempts remain, the ORIGINAL mapped error is returned (no early retry,
  no partial sleep).
- Enormous lexical values (digit length or magnitude exceeding any
  remaining budget — parsed with a length guard, never a lossy `parseInt`
  overflow fallback) mean no in-budget retry: return the original error.
- Invalid/absent Retry-After uses the bounded default backoff above.
- Sleeps run on the injected abort-aware sleeper and count against the
  total deadline; abort ends them immediately.

### 6.2 Streams, encoding, cleanup

- Requests are captured in-memory bytes only (identity requirement — no
  caller streams). Responses stream incrementally with per-chunk cap
  checks; first exceed aborts/destroys the socket ⇒ `result_too_large`.
- Sent headers are exactly: method/target, Node-generated `Host` +
  `Connection: close` (expected — not a false exact-count assertion),
  `Accept: application/json`, `Accept-Encoding: identity`,
  `Content-Type: application/json; charset=utf-8` + exact `Content-Length`
  iff a body is sent, `Idempotency-Key` iff the route defines one,
  `Authorization: Bearer …` iff bearer route. Nothing else. Header names
  are matched case-insensitively on receipt.
- Response `Content-Encoding` other than absent/`identity` ⇒ malformed
  (`internal_error`); never decompressed (bomb bound). `Cache-Control:
  no-store` is observed, not enforced, by transport.
- `keepAlive: false`; per-call owned agents/sockets destroyed on
  success/failure/timeout/abort/oversize. Per-attempt timeout uses an
  explicit timer + `request.destroy()`; timers/listeners removed on all
  paths; late wire callbacks suppressed by attempt generation and can never
  deliver partial data or dispatch further bytes.

### 6.3 Monotonic deadline semantics (correction 9)

- Default clock is monotonic `performance.now()`; injected `Clock.nowMs()`
  must be monotonic (wall `Date.now` is NOT accepted as a deadline source).
- The budget spans hooks, connect/TLS/write/head/body, sleeps, T03 decode,
  and projection/serialization checks. `elapsedMs` is measured on this
  clock; `attempts` counts every wire handoff.
- The upper layer never dispatches after `totalDeadlineMs`, never returns
  partial data, and a trusted-but-slow injected sleeper/clock cannot cause
  either (deadline is recomputed from the monotonic clock at each gate,
  not from sleeper promises).

## 7. Truthful results (brief §7)

### 7.1 Read results — concrete per-method types via the T03 entry FIRST

Each read returns status + call metadata + the T03-projected record; types
are per method, never a wholesale union:

```ts
searchExercises → SearchExercisesResult { status: 200; catalogueVersion: string; data: SearchExercisesPage; … }
getExercise     → ExerciseResult       { status: 200; data: ExerciseRecord; … }
listWorkouts    → WorkoutListResult    { status: 200; data: WorkoutListPage; … }
getWorkout      → WorkoutResult        { status: 200; data: WorkoutRecord; … }
listRoutines    → RoutineListResult    { status: 200; data: RoutineListPage; … }
getRoutine      → RoutineResult        { status: 200; data: RoutineRecord; … }
// …each also carries attempts, elapsedMs, correlationId, dispatched: true
```

(T03 type names: `SearchExercisesPage`, `ExerciseRecord`, `WorkoutListPage`,
`WorkoutRecord`, `RoutineListPage`, `RoutineRecord` from the public
`dist/domain/index.js` entry.)

Decode path: exact received bytes → UTF-8 (fatal) → text handed to
`decodeBackendResponse(readToolName, text, expectedId?)` with `expectedId`
taken from the request path for `get_*`. Ordinary `JSON.parse` is NEVER
used on resource data merely to inspect `id` or to reserialize later. Codec
failures (malformed/truncated/duplicate-key/oversize) ⇒ `internal_error`,
never fabricated records. `204`/wrong-status/empty/non-JSON/wrong-
content-type on a read route is malformed ⇒ `internal_error`. After decode,
the projected JSON (`JSON.stringify` of `data`) is measured in UTF-8 bytes
against `maxProjectedResultBytes`.

### 7.2 Routine-mutation results — raw T03 full routine decode (no T03 change)

```ts
export interface MutationResult {
  readonly status: 201 | 200;
  readonly routeLabel: MutationRouteName;
  readonly resourceKey: string;      // echoed route key
  readonly rawBodyBytes: Uint8Array; // independent copy of the exact wire bytes (private caller data)
  readonly data: RoutineRecord;      // full decode via decodeBackendResponse("get_routine", text, expectedRoutineId)
  readonly attempts: number;
  readonly elapsedMs: number;
  readonly correlationId: string;
  readonly dispatched: true;
}
```

- Expected status per route (201 draft / 200 populate / 200 save), JSON
  content-type, size/UTF-8 gates, then FULL raw routine decode with the
  explicit expected routine ID. No shape-presence-only ordinary parse ever
  becomes canonical mutation success. Admitted-content/step confirmation
  (draft-vs-saved semantics, domain match) belongs to T10 using T03
  primitives — T05 claims none and modifies no T03 module.
- A valid-status response that fails envelope/decode/ID gates is uncertain
  (`internal_error`, `outcomeUnknown: true`); ONLY exact replay (same
  bytes/key), never GET-inspection, settles it.

### 7.3 Control results — envelope only, bytes stay private

```ts
export interface ControlResult {
  readonly status: 200;
  readonly rawBodyBytes: Uint8Array; // independent copy; trusted PRIVATE caller data (T06/T07/T12), never logs/MCP
  readonly retryAfterSeconds: number | null;
  readonly attempts: 1;
  readonly elapsedMs: number;
  readonly correlationId: string;
  readonly dispatched: true;
}
// authLogout success: { status: 204; attempts: 1; elapsedMs; correlationId; dispatched: true } — no body (any bytes ⇒ malformed).
```

T05 gates ONLY: allowed status, JSON content-type (except 204, which must
have zero body), size/UTF-8 gates, `Retry-After` extraction, and duplicate-
key rejection on any inspected envelope. Grant/deadline/nonce/account/
deletion authorization validation belongs explicitly to T06/T07/T12 — NOT
T05 evidence. Raw grant/control bytes never reach MCP results, logs, events,
or errors.

### 7.4 Error/control envelope handling (all responses)

- Error-status bodies require JSON content-type + well-formed UTF-8 +
  duplicate-key-free JSON to yield a specific mapped code; otherwise the
  status-default rule in §9 applies (`internal_error` — never an invented
  definite rejection).
- Backend `message` text is NEVER returned, logged, emitted, or interpreted
  — only the `errorCode` token is classified, and only under the §9.3
  privacy grammar.

## 8. Dispatch certainty and sticky uncertainty (brief §8 core)

### 8.1 Conservative dispatch mark

`dispatched` is set at HANDOFF to the low-level sender — synchronously after
`beforeDispatch` + pre-send checks pass, BEFORE header/body bytes may be
queued. Rationale (settled): header-only commands can commit too, and no
native exception after handoff proves pre-commit. Every result/error carries
the call's dispatch state; any received response implies `dispatched: true`.

### 8.2 Sticky uncertainty across attempts

Call state holds `{ everDispatched, uncertain }`:

- `uncertain` is SET when a dispatched attempt ends possibly-committed:
  no-response failure after handoff (reset/refused/TLS/socket error,
  timeout — phase unknowable, always conservative), 500/unknown-5xx,
  redirect-after-handoff, lost response, malformed/unrecognized envelope.
  Explicit well-formed error statuses (400/401/403/404/409/410/413/422/
  429/503) do NOT set it.
- Once set, `uncertain` is CLEARED only by a valid canonical success (§7)
  or a recognized durable identical-key outcome (`409
  idempotency_key_reused` on the same key — proof the server holds this
  exact request; the caller recovers the original outcome explicitly).
  A later 401/413/429/malformed error, current-auth failure, or structural/
  throttling/transient failure NEVER clears it.
- Final mutation errors report `outcomeUnknown: uncertain`. Reads always
  report `outcomeUnknown: false` (no commit semantics) while still carrying
  `dispatched`/attempt metadata.
- Deterministic adapter/fault evidence: `attempts` counts handoffs;
  `dispatched` = `everDispatched`; `outcomeUnknown` derives from the sticky
  flag — never from last-attempt booleans alone. The §9 table encodes this
  per row.

## 9. Status/error decision table (brief §8)

`TransportError` (runtime-frozen, §11.2) fields: `code`, `retryable`,
`backendErrorCode`, `retryAfterSeconds`, `status`, `dispatched`,
`outcomeUnknown`, `attempts`, `elapsedMs`, `correlationId`; message exactly
`Transport failure: <code>.`. `retryable` is a PUBLIC recovery
classification (safe for the owner to retry explicitly with identical
inputs) — NOT permission for T05 to retry automatically. The `auto-retry`
column governs in-call automatic retries (reads + resource mutations only;
controls never; §6).

| # | Condition | Code | retryable | auto-retry | backendErrorCode | Uncertainty (mutations) |
|---|-----------|------|-----------|------------|------------------|--------------------------|
| E1 | Local validation (origin/route/UUID/query/body/wrapper/namespace/config shape, fence-config) | `invalid_arguments` | false | no | null | pre-dispatch; `outcomeUnknown: false` |
| E2 | Missing bearer (`selectCredential` null/mismatched) | `authentication_required` | false | no | null | pre-dispatch; `false` |
| E3 | `beforeDispatch`/pre-send/pre-delivery fence throw, timeout, or abort before handoff | `operation_interrupted` | true | no | null | pre-dispatch; `false` |
| E4 | DNS/refused/reset/TLS-connect failure or timeout with NO response, handoff never reached | `network_error` | true | yes (bounded) | null | `false` |
| E5 | Same after handoff reached (incl. any timeout — phase unknowable) | `network_error` | true | yes (bounded) | null | SETS sticky; `true` |
| E6 | Owner abort after handoff or during retry sleep | `operation_interrupted` | true | no | null | sticky kept/SET; `true` if ever dispatched |
| E7 | Any `3xx` | `internal_error` | true (explicit recovery only) | NO auto-retry/follow | null (Location never kept) | SETS sticky; `true` |
| E8 | 400 with safe known code (`invalid_request`, `invalid_cursor`, `invalid_page_token`, `invalid_snapshot_token`, …) | verbatim code (`invalid_page_token` for list-token mismatch) | false | no | verbatim | definite; `false` |
| E9 | 400 with UNKNOWN code (safe or unsafe shape) | `backend_error` (§9.3) | false | no | safe verbatim else null | definite; `false` — never an invented `validation_error` |
| E10 | 401 (`authentication_required` / `reauthentication_required`) | verbatim | false | no (T06 explicit) | verbatim | definite alone; NEVER clears sticky `true` |
| E11 | 403 `read_only` | `read_only` | false | no | `read_only` | `false` / never clears sticky |
| E12 | 404 `not_found` | `not_found` | false | no | `not_found` | `false` / never clears; never deletion evidence |
| E13 | 409 family (`idempotency_key_reused`, `id_collision`, `invalid_state`, `source_shape_changed`, `history_shape_changed`, `exercise_in_use`) | verbatim | false | no | verbatim | `idempotency_key_reused` SETTLES (durable identical-key outcome ⇒ `false`); other 409s definite `false`, never clear sticky |
| E14 | 410 (`cursor_expired` / `snapshot_expired` / `page_expired`) | verbatim | false | no | verbatim; NO `fullResyncRequired`/sync-only field passthrough (dropped, never model-facing) | `false` / never clears sticky |
| E15 | 422 (`validation_error`, `duplicate_mutation_id`, `invalid_reference`) | verbatim | false | no | verbatim | durable rejection `false` / never clears sticky |
| E16 | 413, or pre-dispatch body/target over budget | `request_too_large` | false | no | safe backend code else null | local: `false`; server-413: definite `false` / never clears sticky; never retried unchanged |
| E17 | Response body over `maxResponseBytes` | `result_too_large` | false | no | null | mutations: `true` unless valid success established; never truncated/partial |
| E18 | Projected result over `maxProjectedResultBytes` | `result_too_large` | false | no | null | after valid success ⇒ commit known ⇒ `false` |
| E19 | 429 `rate_limited` (+ optional valid Retry-After) | `rate_limited` | true | yes, honoring exact Retry-After iff it fits (§6.1) | `rate_limited` | does not set; never clears sticky |
| E20 | 503 `temporarily_unavailable` | `temporarily_unavailable` | true | yes (bounded, §6.1) | verbatim | SETS sticky (server may have committed); retried with identical bytes |
| E21 | 500 `internal_error` | `internal_error` | true | yes (bounded, §6.1) | `internal_error` | SETS sticky; exact-bytes retry only |
| E22 | Unknown 5xx / unlisted status | `internal_error` | true | yes iff 5xx-class (bounded); non-5xx unlisted: NO auto-retry | null | 5xx SETS sticky; `true` |
| E23 | Unknown safe permanent 4xx code | `backend_error` | false | no | verbatim safe code | `false` / never clears sticky |
| E24 | Unknown UNSAFE 4xx code shape | `backend_error` | false | no | null (dropped, §9.3; nothing fabricated) | `false` / never clears sticky |
| E25 | Malformed/unsafe/status-mismatched/unrecognized response: wrong status for route, 204 where JSON required (non-logout), empty/non-JSON body, bad content-type, UTF-8 failure, T03 decode failure, duplicate keys, truncation, same-ID mismatch, malformed error envelope | `internal_error` | true (explicit recovery only) | NO auto-retry within the call | null | SETS sticky; `true` — never a definite rejection |

Catch-all: any unlisted status/code falls into E22–E25 — never success,
never a guessed permanent code (no silent contract narrowing).

### 9.1 Notes

- Safe backend codes preserved verbatim; NOTHING else from the backend
  (message, headers, bodies, status text) enters errors/events/logs.
- HTTP 500 stays `internal_error`/`retryable`; malformed-success and
  redirect are `retryable` for EXPLICIT owner recovery with NO in-call
  auto-retry — identical exact-bytes replay is the recovery path (T09/T11).
- No invented `operationId`, routine ID, or `lastConfirmedStep` — T09–T11
  journal context, not transport fields.

### 9.2 Unknown-code privacy (correction 12)

- Safe machine-token grammar: nonempty ASCII matching
  `^[a-z][a-z0-9_]*$` — NO arbitrary 64-character domain maximum; length is
  bounded by `maxResponseBytes` instead. Only the top-level `errorCode`
  field is ever classified; lexical identifier/token-looking sequences
  inside `message` or elsewhere are NEVER promoted to codes and `message`
  is never interpreted.
- Unsafe originals (empty, overlong-in-effect, non-matching, or accompanied
  by poisoned content): drop the code (`backendErrorCode: null`), keep the
  generic `backend_error` classification, count an internal `unsafe_code`
  class for the sanitized event's `code` ONLY when no safe code exists to
  report — diagnostics NEVER contain any `backendErrorCode` value at all.
- No fabricated `"unknown"` placeholder; a valid safe code is never dropped
  merely because an unrelated `message` is poisoned.

## 10. Observability (brief §9)

- Import performs no IO/handlers/timers/output (subject only to the §12
  calibration). No `console`/stdout/stderr writes on any path.
- Opt-in `onEvent?: (event: TransportEvent) => void` in factory-trusted
  deps. The event is a detached, runtime-frozen allowlist summary:
  `{ routeLabel, code ("ok" or TransportErrorCode), status, attempts,
  elapsedMs, dispatched, outcomeUnknown, correlationId }`. NEVER:
  credentials, account/resource IDs, raw queries/search, paths, payloads,
  tokens, `Location`, native exception details, backend messages/bodies,
  `backendErrorCode` (any value), private paths, e-mails, IPs.
- Correlation IDs are fresh unrelated random UUIDs per call (no join with
  account/operation identity).
- A throwing listener is caught and swallowed: it cannot change the outcome
  or leak its exception (the swallow path carries no payload).
- NO event is emitted for bad factory input (no safe route label exists
  there). Calls with a known route label emit exactly one terminal event.

## 11. Testability, import calibration, fixture boundaries (brief §10)

### 11.1 Trusted seams

Constructor-supplied only, never per-request; production guards (§§1–4 stay
above every seam, so a double cannot widen the allowlist, move the origin,
disable TLS, enable redirects/proxies/cookies, or inject headers):

```ts
export interface TransportDeps {
  readonly session: SessionHooks;   // T06-owned; fixture hook in tests
  readonly clock?: Clock;           // monotonic nowMs(); default performance.now
  readonly sleeper?: Sleeper;       // abort-aware sleep; default timer-based with cleanup
  readonly wire?: HttpWire;         // default: production node:http(s) adapter
  readonly onEvent?: (event: TransportEvent) => void;
}
export interface Clock { nowMs(): number; }
export interface Sleeper { sleep(ms: number, signal: AbortSignal): Promise<void>; }
export interface CapturedWireRequest {
  readonly origin: string;
  readonly method: "GET" | "POST" | "PUT";
  readonly target: string;                               // encoded ASCII path+query
  readonly headers: ReadonlyArray<readonly [string, string]>; // exact send list, lowercase names
  readonly body: Uint8Array;                             // captured copy; empty for GET
}
export interface RawWireResponse {
  readonly status: number;
  readonly rawHeaders: ReadonlyArray<readonly [string, string]>; // as received, flattened pairs
  readonly body: Uint8Array;                             // bounded accumulation
}
export interface AttemptBudget { readonly timeoutMs: number; }
export interface HttpWire {
  sendRaw(request: CapturedWireRequest, budget: AttemptBudget, signal: AbortSignal): Promise<RawWireResponse>;
}
```

### 11.2 Runtime immutability and safe guards (correction 13)

- Every public error/event/result object is `Object.freeze`d at runtime
  (deep for owned arrays/copies); TypeScript `readonly` alone is not relied
  upon. Errors expose ONLY the §9 own fields with the fixed message — no
  `cause`, no native stack payload, no request/binding/body/token
  references. (Captured stacks contain transport-internal frames over safe
  scalar fields only.)
- `isTransportError` never executes hostile getters: `instanceof` fast path
  plus a brand check via `Object.getOwnPropertyDescriptor` (data-descriptor
  `value` comparison — no getter invocation), wrapped in try/catch
  returning `false`.
- Factories reject unknown/extra config/dependency fields with
  `invalid_arguments`.

### 11.3 Required test layers

- ISOLATED LOOPBACK wire tests against the ACTUAL production adapter
  (literal `http://127.0.0.1:<ephemeral>` doubles; `https://127.0.0.1` /
  `https://[::1]` doubles with visibly-labelled synthetic test-only
  certificate/key material, e.g. `test-only-loopback-cert.pem` under the
  owning QA fixture path — never an external/live TLS endpoint):
  redirect refusal (same- and cross-origin), exact bytes under caller-buffer
  mutation, abort/stream-limit behavior, proxy-env immunity, header
  allowlist safety (allowlist + Node-generated Host/Connection only),
  TLS-failure closure, malformed/truncated/oversized/duplicate-key
  responses. Doubles are never substituted here.
- Deterministic doubles assert timeout/429/500/503 matrices, Retry-After
  fit/exceed/enormous/invalid, budget exhaustion incl. projected-result and
  target budgets, fence-hook throws/timeouts, 401-no-retry proof, sticky
  uncertainty sequences (uncertain-then-401/413/429/malformed stays
  `outcomeUnknown: true`), monotonic-deadline enforcement, and per-attempt
  method/route/bytes/key/namespace equality.
- No seam is reachable from tool arguments, request parameters, or response
  content — none can become a model-controlled auth/TLS/destination bypass.

### 11.4 Inert-import calibration (correction 14)

The approved T03 public entry carries the pinned-Zod in-memory-registry
exception; T05 reuses that PUBLIC exception transitively for its T03
imports. Network/IO/output/timers/listeners/global handlers remain
forbidden at import. No historical private QA harness is read to derive
any oracle.

### 11.5 Read boundaries (correction 15)

QA inspects declarations/export names and intercepts black-box imports
only — never implementation sources, even for static rows. Existing tests
are not edited. T04 private-provider regressions are provisioned explicitly
at the later relay, never via personal bus/keyring.

## 12. Complete public API (exact)

Entry `src/http/index.ts` -> `dist/http/index.js` + readonly `.d.ts`.
No other file is public. Import effects: none beyond the §11.4 calibration.

### 12.1 Exact runtime export inventory (closed)

Values: `createBackendTransport`, `TransportError`, `isTransportError`,
`DEFAULT_TRANSPORT_BUDGETS` (deeply frozen defaults of §6),
`TRANSPORT_IDENTITY_VERSION` (`"gymtracka-transport-v1"` — mechanism/
budget version marker for later ADR/evidence, never a wire value).
No other runtime export exists; additions need adjudication.

Types (all `readonly`, exact, `unknown`-rooted where undecided; compliant
with the strict T01 compiler set incl. `exactOptionalPropertyTypes`,
`noUncheckedIndexedAccess`):

`RouteName`, `ReadRouteName` (routes 1–6), `MutationRouteName` (7–9),
`ControlRouteName` (10–14), `BearerRouteName` (1–9),
`ChallengePurpose` (`"signIn" | "accountStatus"`),
`TransportErrorCode`, `TrustedTransportConfig`, `TransportBudgets`,
`TransportDeps`, `SessionHooks`, `CallBinding`, `DispatchSummary`,
`CredentialMaterial`, `Clock`, `Sleeper`, `HttpWire`,
`CapturedWireRequest`, `RawWireResponse`, `AttemptBudget`,
`SearchExercisesResult`, `ExerciseResult`, `WorkoutListResult`,
`WorkoutResult`, `RoutineListResult`, `RoutineResult`, `MutationResult`,
`ControlResult`, `LogoutResult`, `TransportErrorFields`, `TransportEvent`.

### 12.2 Config, factory, and methods (exact signatures)

```ts
export interface TransportBudgets {
  readonly maxRequestBytes: number;
  readonly maxRequestTargetBytes: number;
  readonly maxResponseBytes: number;
  readonly maxProjectedResultBytes: number;
  readonly maxHeadBytes: number;
  readonly maxHeaderCount: number;
  readonly perAttemptTimeoutMs: number;
  readonly totalDeadlineMs: number;
  readonly maxAttempts: number;       // reads + resource mutations only
  readonly baseRetryDelayMs: number;
  readonly maxRetryDelayMs: number;
}
export interface TrustedTransportConfig {
  readonly origin: string;                        // §§1.1–1.2 gate
  readonly budgets?: Partial<TransportBudgets>;   // defaults = DEFAULT_TRANSPORT_BUDGETS
  readonly allowInsecureLoopback?: boolean;       // default false; §1.3
  readonly testCaPem?: Uint8Array;                // loopback-https fixtures only; §1.6
}
export function createBackendTransport(
  trustedConfig: TrustedTransportConfig,
  trustedDeps: TransportDeps,
): BackendTransport;   // throws TransportError(invalid_arguments) on bad input; returns frozen handle

export interface BackendTransport {
  // reads: queryInput validated by T03 parseArguments; results per §7.1
  searchExercises(binding: CallBinding, queryInput: unknown, signal: AbortSignal): Promise<SearchExercisesResult>;
  getExercise(binding: CallBinding, exerciseId: string, signal: AbortSignal): Promise<ExerciseResult>;
  listWorkouts(binding: CallBinding, queryInput: unknown, signal: AbortSignal): Promise<WorkoutListResult>;
  getWorkout(binding: CallBinding, workoutId: string, signal: AbortSignal): Promise<WorkoutResult>;
  listRoutines(binding: CallBinding, queryInput: unknown, signal: AbortSignal): Promise<RoutineListResult>;
  getRoutine(binding: CallBinding, routineId: string, signal: AbortSignal): Promise<RoutineResult>;
  // mutations: frozen bytes + route key; results per §7.2
  createDraft(binding: CallBinding, expectedRoutineId: string, bodyBytes: Uint8Array, resourceKey: string, signal: AbortSignal): Promise<MutationResult>;
  populateDraft(binding: CallBinding, routineId: string, bodyBytes: Uint8Array, resourceKey: string, signal: AbortSignal): Promise<MutationResult>;
  saveRoutine(binding: CallBinding, routineId: string, bodyBytes: Uint8Array, resourceKey: string, signal: AbortSignal): Promise<MutationResult>;
  // controls: single attempt each; results per §7.3
  authChallenge(binding: CallBinding, bodyBytes: Uint8Array, signal: AbortSignal): Promise<ControlResult>;
  authExchange(binding: CallBinding, bodyBytes: Uint8Array, authKey: string, signal: AbortSignal): Promise<ControlResult>;
  authRefresh(binding: CallBinding, bodyBytes: Uint8Array, authKey: string, signal: AbortSignal): Promise<ControlResult>;
  authLogout(binding: CallBinding, bodyBytes: Uint8Array, signal: AbortSignal): Promise<LogoutResult>;
  accountStatus(binding: CallBinding, bodyBytes: Uint8Array, signal: AbortSignal): Promise<ControlResult>;
}
```

Effects/ownership/lifetime: import inert (§11.4); factory validates
synchronously and freezes config/deps copies (unknown fields reject);
each call freezes its binding capture, owns its sockets/timers, cleans up
on all paths, returns independent copies; the handle holds no per-call
credential state; no `close()` (nothing pooled/shared); no stdout, no
global state, no cross-call mutation.

### 12.3 Error and event shapes (exact own fields)

```ts
export type TransportErrorCode =
  | "invalid_arguments" | "authentication_required" | "reauthentication_required"
  | "validation_error" | "invalid_page_token" | "read_only" | "not_found"
  | "idempotency_key_reused" | "id_collision" | "invalid_state" | "source_shape_changed"
  | "history_shape_changed" | "exercise_in_use" | "cursor_expired" | "snapshot_expired"
  | "page_expired" | "duplicate_mutation_id" | "invalid_reference" | "invalid_request"
  | "invalid_cursor" | "invalid_snapshot_token" | "request_too_large" | "result_too_large"
  | "rate_limited" | "temporarily_unavailable" | "internal_error" | "network_error"
  | "operation_interrupted" | "backend_error";
export class TransportError extends Error {
  readonly code: TransportErrorCode;
  readonly retryable: boolean;
  readonly backendErrorCode: string | null;
  readonly retryAfterSeconds: number | null;
  readonly status: number | null;
  readonly dispatched: boolean;
  readonly outcomeUnknown: boolean;
  readonly attempts: number;
  readonly elapsedMs: number;
  readonly correlationId: string;
}
export interface TransportEvent {
  readonly routeLabel: RouteName;
  readonly code: TransportErrorCode | "ok";
  readonly status: number | null;
  readonly attempts: number;
  readonly elapsedMs: number;
  readonly dispatched: boolean;
  readonly outcomeUnknown: boolean;
  readonly correlationId: string;
}
```

Known wire codes map verbatim (E8/E10–E15); anything else follows §9/§9.2.

## 13. Specification-level questions (no implementation until answered)

- Q1 — Budget numbers in §6 (defaults + widened 64-byte-minimum legal
  ranges for fixture-scale boundaries): confirm, or substitute
  deployment-backed values. No supported-aggregate acceptance is claimed
  either way.
- Q2 — T03 type names assumed in §7.1/§12
  (`SearchExercisesPage`, `ExerciseRecord`, `WorkoutListPage`,
  `WorkoutRecord`, `RoutineListPage`, `RoutineRecord`,
  `decodeBackendResponse`, `parseArguments`): confirm these public-entry
  identities, or correct the spelling before implementation.
- Q3 — Control results stay byte-opaque in T05 (no decoded control types
  here; T06/T07/T12 own grant/deadline/nonce/account validation): confirm
  the byte-opaque boundary, or name any control field T05 must project.

## 14. Readiness, changed path, commands not run

Rev 2 is ready for coordinator review: all 15 interface corrections and
every settled FQ selection are integrated above into complete exact
readonly public types/signatures/results/wire interface/export inventory
with coherent error/retry/dispatch/budget tables; rev-1 history is retained
in the history section with explicit differences. Changed path:
`docs/decisions/t05-transport-proposal.md` (this file) only. No
production/test-source changes, installs, builds, checks,
target/diagnostic/test execution, live services, actual writes, `.pi`
edits, staging/commits, or successor work — none performed and none run in
this window. No metadata/dependency/compiler change requested (Node
builtins + existing public T03 imports suffice). Next requested decision:
review, publish `t05-approved-transport-spec.md`, and open exact source
windows. HOLDING for that grant; no implementation yet.
