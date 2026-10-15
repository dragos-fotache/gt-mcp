# T05 approved transport specification

**Status:** coordinator-approved public API/observable contract, revision1;
verification methodology narrowed by explicit user approval in the
[bounded verification plan](t05-bounded-verification-plan.md).
Sections1–9 remain unchanged by that scope decision. This supersedes incompatible
design-brief/proposal/review text. Implementation
and independent test-source work are authorized by the updated
[work order](../tasks/t05-work-order.md), not acceptance or target execution.

## 1. Authority, scope and imports

Normative: shared MCP0.2-draft user-approved config-only working-tree revision
over9a96dcb, unchanged backend OpenAPI1.0.0, backend service-protocol/authentication/
account-lifecycle, MCP tools/authentication/routine-creation/acceptance-scenarios.
T01/T03/T04 accepted; T02 parked, T13/T14 retired, T09 unassigned. Never alter shared
contracts to fit implementation. No product writes, live service/credentials,
MCP registration, CLI wiring, config loader/write guard, session/refresh/login,
journal/creation orchestration or cleanup is supplied by T05.

Only `src/http/` -> `dist/http/index.js` + declarations is the public transport
entry. Root/CLI/server/companion and accepted domain/storage/contracts remain
unchanged. No new dependencies, manifest/lock/config/compiler changes. Imports
may use Node builtins and the PUBLIC `src/domain/index.ts` entry's functions/types.
No new imports of private domain internals. Import is inert: no IO/output/timers/
network/processes/listeners/global handlers. The public T03 pinned-Zod in-memory
registry calibration exception applies transitively, and ONLY that exception.

Runtime exports are exactly:
`createBackendTransport`, `TransportError`, `isTransportError`,
`DEFAULT_TRANSPORT_BUDGETS`, `TRANSPORT_IDENTITY_VERSION`.
Last value is `"gymtracka-transport-v1"`, a local mechanism marker, not wire data
or journal migration identity. Defaults are a frozen object defined in section7.
All public interfaces are readonly; no any/wholesale unknown result seams.

## 2. Exact public types and methods

Types may be factored internally; the following exported declarations/behavior
are normative. T03 public types are exactly SearchExercisesPage, ExerciseRecord,
WorkoutListPage, WorkoutRecord, RoutineListPage, RoutineRecord.

```ts
export type ReadRouteName = "search_exercises" | "get_exercise" |
  "list_workouts" | "get_workout" | "list_routines" | "get_routine";
export type MutationRouteName = "create_draft" | "populate_draft" | "save_routine";
export type ControlRouteName = "auth_challenge" | "auth_exchange" |
  "auth_refresh" | "auth_logout" | "account_status";
export type BearerRouteName = ReadRouteName | MutationRouteName;
export type RouteName = BearerRouteName | ControlRouteName;
export interface CallBinding {
  readonly origin: string;
  readonly accountUuid: string | null;
  readonly sessionGeneration: number;
  readonly profileGenerationId: string;
}
export interface TransportBudgets {
  readonly maxRequestBytes: number;
  readonly maxRequestTargetBytes: number;
  readonly maxResponseBytes: number;
  readonly maxProjectedResultBytes: number;
  readonly maxHeadBytes: number;
  readonly maxHeaderCount: number;
  readonly perAttemptTimeoutMs: number;
  readonly totalDeadlineMs: number;
  readonly maxAttempts: number;
  readonly baseRetryDelayMs: number;
  readonly maxRetryDelayMs: number;
}
export interface TrustedTransportConfig {
  readonly origin: string;
  readonly budgets?: Partial<TransportBudgets>;
  readonly allowInsecureLoopback?: boolean;
  readonly testCaPem?: Uint8Array;
}
export interface DispatchSummary {
  readonly routeLabel: RouteName;
  readonly method: "GET" | "POST" | "PUT";
  readonly target: string;
  readonly bodyByteLength: number;
  readonly keyKind: "resource" | "auth" | null;
  readonly attempt: number;
}
export interface CredentialMaterial {
  readonly bearerToken: string;
  readonly forBinding: CallBinding;
}
export interface SessionHooks {
  checkBinding(point: "pre-send" | "pre-delivery", binding: CallBinding,
    signal: AbortSignal): Promise<void>;
  selectCredential(binding: CallBinding, route: BearerRouteName,
    signal: AbortSignal): Promise<CredentialMaterial | null>;
  beforeDispatch(binding: CallBinding, summary: DispatchSummary,
    signal: AbortSignal): Promise<void>;
  isCurrent(binding: CallBinding): boolean;
}
export interface Clock { nowMs(): number; }
export interface Sleeper { sleep(ms: number, signal: AbortSignal): Promise<void>; }
export interface CapturedWireRequest {
  readonly origin: string;
  readonly method: "GET" | "POST" | "PUT";
  readonly target: string;
  readonly headers: ReadonlyArray<readonly [string, string]>;
  readonly body: Uint8Array;
}
export interface AttemptBudget {
  readonly timeoutMs: number;
  readonly maxResponseBytes: number;
  readonly maxHeadBytes: number;
  readonly maxHeaderCount: number;
}
export type RawWireResponse =
  | { readonly ok: true; readonly status: number;
      readonly rawHeaders: ReadonlyArray<readonly [string, string]>;
      readonly body: Uint8Array }
  | { readonly ok: false; readonly kind: "network" | "malformed" | "response_too_large";
      readonly status: number | null };
export interface HttpWire {
  sendRaw(request: CapturedWireRequest, budget: AttemptBudget,
    signal: AbortSignal): Promise<RawWireResponse>;
}
export interface TransportDeps {
  readonly session: SessionHooks;
  readonly clock?: Clock;
  readonly sleeper?: Sleeper;
  readonly wire?: HttpWire;
  readonly onEvent?: (event: TransportEvent) => void;
}
export interface ResultMeta {
  readonly attempts: number;
  readonly elapsedMs: number;
  readonly correlationId: string;
  readonly dispatched: true;
}
export interface SearchExercisesResult extends ResultMeta {
  readonly status: 200; readonly data: SearchExercisesPage;
}
export interface ExerciseResult extends ResultMeta {
  readonly status: 200; readonly data: ExerciseRecord;
}
export interface WorkoutListResult extends ResultMeta {
  readonly status: 200; readonly data: WorkoutListPage;
}
export interface WorkoutResult extends ResultMeta {
  readonly status: 200; readonly data: WorkoutRecord;
}
export interface RoutineListResult extends ResultMeta {
  readonly status: 200; readonly data: RoutineListPage;
}
export interface RoutineResult extends ResultMeta {
  readonly status: 200; readonly data: RoutineRecord;
}
export interface MutationResult extends ResultMeta {
  readonly status: 200 | 201;
  readonly routeLabel: MutationRouteName;
  readonly resourceKey: string;
  readonly rawBodyBytes: Uint8Array;
  readonly data: RoutineRecord;
}
export interface ControlResult extends ResultMeta {
  readonly status: 200;
  readonly rawBodyBytes: Uint8Array;
}
export interface LogoutResult extends ResultMeta { readonly status: 204; }
export interface BackendTransport {
  searchExercises(b: CallBinding, queryInput: unknown, signal: AbortSignal): Promise<SearchExercisesResult>;
  getExercise(b: CallBinding, exerciseId: string, signal: AbortSignal): Promise<ExerciseResult>;
  listWorkouts(b: CallBinding, queryInput: unknown, signal: AbortSignal): Promise<WorkoutListResult>;
  getWorkout(b: CallBinding, workoutId: string, signal: AbortSignal): Promise<WorkoutResult>;
  listRoutines(b: CallBinding, queryInput: unknown, signal: AbortSignal): Promise<RoutineListResult>;
  getRoutine(b: CallBinding, routineId: string, signal: AbortSignal): Promise<RoutineResult>;
  createDraft(b: CallBinding, expectedRoutineId: string, body: Uint8Array,
    resourceKey: string, signal: AbortSignal): Promise<MutationResult>;
  populateDraft(b: CallBinding, routineId: string, body: Uint8Array,
    resourceKey: string, signal: AbortSignal): Promise<MutationResult>;
  saveRoutine(b: CallBinding, routineId: string, body: Uint8Array,
    resourceKey: string, signal: AbortSignal): Promise<MutationResult>;
  authChallenge(b: CallBinding, body: Uint8Array, signal: AbortSignal): Promise<ControlResult>;
  authExchange(b: CallBinding, body: Uint8Array, authKey: string, signal: AbortSignal): Promise<ControlResult>;
  authRefresh(b: CallBinding, body: Uint8Array, authKey: string, signal: AbortSignal): Promise<ControlResult>;
  authLogout(b: CallBinding, body: Uint8Array, signal: AbortSignal): Promise<LogoutResult>;
  accountStatus(b: CallBinding, body: Uint8Array, signal: AbortSignal): Promise<ControlResult>;
}
export function createBackendTransport(config: TrustedTransportConfig,
  deps: TransportDeps): BackendTransport;
```

Factory is synchronous and throws safe TransportError on bad configuration.
Methods always return promises, including local rejection; capture/validation
occurs synchronously within entry BEFORE yielding. Handle exposes exactly these
14 methods, no generic send/URL/header/proxy method or hidden network startup.
No close method: attempts own and release sockets/agents, no reusable pools.
Call configuration/session functions are captured at factory time; external
property replacement cannot change transport behavior. Never freeze or mutate
caller-owned objects. Preserve callback receiver binding where needed.

## 3. Destination, TLS and allowlist

Origin raw syntax: exact lowercase `https://` (or explicitly enabled test
`http://`), followed by nonempty authority and optional SINGLE `/` only. Reject
any @, backslash, ASCII whitespace/control/DEL, query/fragment marker, empty
port, nondecimal/zero/out-of-range port, or extra slash/path BEFORE URL parsing.
Thus `/a/..`, `/%2e`, empty userinfo and `?`/`#` cannot normalize into an origin.
No arbitrary253-character cap on the whole URL. Hostname via WHATWG URL:
nonempty, lowercased/IDNA, no trailing dot; default port removed, other port
canonical decimal. Use URL.origin as the frozen canonical origin. No DNS/IO at
factory/import. CallBinding.origin must already equal that canonical string.

HTTP requires allowInsecureLoopback===true AND raw host text exactly127.0.0.1 or
[::1]; no localhost, abbreviated/numeric/hex IPv4, expanded IPv6 or DNS name.
For the same literal HTTPS hosts only, optional nonempty copied testCaPem supplies
fixture CA trust. URL.hostname for IPv6 is `[::1]` in pinned Node; strip brackets
only for socket hostname. Flag default false, strict boolean, no coercion.
Production config/CLI must never expose fixture trust/plaintext as model inputs.

Use node:http/https with dedicated agent per attempt, keepAlive:false, no proxyEnv,
no global agent/fetch/dispatcher/cookie jar. Explicit request agent defeats
NODE_USE_ENV_PROXY/--use-env-proxy/global proxy replacement; test that with actual
wire traffic. No redirects followed or retried, even same-origin. No Basic auth,
proxy auth, arbitrary DNS lookup/dispatcher options or response-selected destination.
HTTPS enforces rejectUnauthorized:true, minVersion TLSv1.2 and default hostname
verification against the configured host/IP. NODE_TLS_REJECT_UNAUTHORIZED=0
fails factory and immediate pre-send gate with invalid_arguments, never alters
env or permits a downgrade. Ambient same-process malicious monkey-patching or
an operator-modified trust store is outside an OS sandbox guarantee.

| Route label / handle method | Method + path | Success | Auth/key |
| --- | --- | --- | --- |
| search_exercises / searchExercises | GET /v1/catalogue/exercises | 200 page | bearer/no key |
| get_exercise / getExercise | GET /v1/exercises/{exerciseId} | 200 record | bearer/no key |
| list_workouts / listWorkouts | GET /v1/workouts | 200 page | bearer/no key |
| get_workout / getWorkout | GET /v1/workouts/{workoutId} | 200 record | bearer/no key |
| list_routines / listRoutines | GET /v1/routines | 200 page | bearer/no key |
| get_routine / getRoutine | GET /v1/routines/{routineId} | 200 record | bearer/no key |
| create_draft / createDraft | POST /v1/routines | 201 routine | bearer/resource key |
| populate_draft / populateDraft | PUT /v1/routines/{routineId} | 200 routine | bearer/resource key |
| save_routine / saveRoutine | POST /v1/routines/{routineId}/save | 200 routine | bearer/resource key |
| auth_challenge / authChallenge | POST /v1/auth/google/challenge | 200 JSON object | no bearer/no key |
| auth_exchange / authExchange | POST /v1/auth/google | 200 JSON object | no bearer/auth key |
| auth_refresh / authRefresh | POST /v1/auth/refresh | 200 JSON object | no bearer/auth key |
| auth_logout / authLogout | POST /v1/auth/logout | 204 empty | no bearer/no key |
| account_status / accountStatus | POST /v1/account/status | 200 JSON object | no bearer/no key |

No other routes/purposes or mutations, no sync, export/delete, arbitrary method,
query on single-resource GET or mutations, override fields, URL or headers from
model data. Canonical UUID syntax is exactly tools.md lowercase hyphenated regex,
not a stricter version/variant rule. Keys are ordinary canonical UUID strings,
namespace determined by route; same UUID across auth/resource is not forbidden.
Internal creation methods are primitive capabilities for future guarded T09/T10,
not permission to edit existing routines or make product writes.

## 4. Validation, identity and query serialization

Data config/budgets/binding/query/material wrappers: own data properties only,
strict allowed fields; reject accessor descriptors without invoking getters,
symbol keys, invalid required types, nonplain custom prototypes and cycles.
Plain Object.prototype/null prototypes accepted; inherited required fields never
satisfy validation. Callback containers allow only documented function-valued
own fields (clock/sleeper/wire/session included), copied once. Legitimate native
AbortSignal is required; non-JSON live objects permitted ONLY for these named
seams/signals/byte views. JS proxies/privileged callbacks are not a sandbox;
reflective failures are caught generically, no arbitrary accessor/toJSON execution.
T03 query cloning/validation supplies the existing strict JSON semantics.

CallBinding exactly four fields: canonical origin equal to factory, accountUuid
canonical UUID or null, nonnegative safe-integer sessionGeneration, canonical UUID
profileGenerationId. Null account only on controls, never bearer routes. Capture
and freeze detached binding at entry; all hooks receive that SAME object.

Capture actual Uint8Array/Buffer views, exact byteOffset/length; reject shared,
resizable, detached backing buffers and other kinds. Check size then copy before
awaits; use private captured bytes for all retries. Each sender receives a fresh
copy so even a trusted test seam mutating its argument cannot alter replay.
Returned raw byte views are independent mutable copies: JS cannot freeze nonempty
typed-array elements. Freeze owning result objects and JSON trees, NOT typed
arrays; do not claim immutable byte elements or complete V8 memory erasure.

UTF-8 must decode fatally with BOM preserved; leading BOM is not JSON whitespace
and rejects. All body-bearing requests require complete duplicate-key-free JSON
object. Validation may inspect retained bytes, NEVER reserialize/repair/reorder
or send a scratch object. A scanner/strict parser under src/http may reject
syntax/duplicates, including escaped-key duplicates; no use of ordinary parse
BEFORE lossless validation of any resource response. Exact requests:

- challenge: {} or {purpose:"signIn"|"accountStatus"}, no other fields;
- exchange: exactly {challengeId:UUID,idToken:nonempty string};
- refresh/logout: exactly {refreshToken:nonempty string};
- accountStatus: exactly {accountId:UUID,challengeId:UUID,idToken:nonempty string};
  if binding.accountUuid is nonnull it must equal accountId;
- draft: exactly {id:expectedRoutineId};
- save: exactly {name:nonempty string}; full Unicode save eligibility is upstream;
- populate: exact root keys {id,name,isDraft,exercises}, id equals path,
  name string, isDraft===true, exercises array. No transport rewrite of entries
  or numeric tokens. Complete nested mutation validation/admission belongs to
  T03/T09, not an ordinary-number parser here. T05 never claims this minimal
  transport shape check replaces T09 validation/config/auth/visibility guards.

GET sends zero body bytes, explicit Content-Length:0, no Content-Type; {} is not
substituted. POST/PUT Content-Length equals exact captured body byteLength.
Headers in lower-case order: host, connection:close, accept:application/json,
accept-encoding:identity, content-length, content-type (body routes only),
idempotency-key (where fixed), authorization (bearer routes only). Host is URL.host
(including nondefault port). Authorization is `Bearer ` + opaque token; nonempty
visible ASCII0x21..0x7e only, no whitespace/control/DEL/non-ASCII. Invalid token
material yields authentication_required, never a leaking Node header exception.
No Cookie, Expect, Transfer-Encoding, Proxy-Authorization or duplicate headers.
Node-generated equivalent Host/Connection allowed only once; no extra app header.

List/search input parsed with corresponding T03 parseArguments; defaults retained.
Search text toLowerCase (not locale), no trim/Unicode normalization; UUID filters
sorted/deduplicated. Ordered URLSearchParams with literal + replaced by %20:
q if nonempty; repeated muscleGroupId; repeated equipmentId; limit always;
pageToken if supplied. Workouts: status if supplied, limit, pageToken; routines:
limit,pageToken. Empty filter arrays omitted. Strings encoded as data, standard
USVString UTF-8 replacement for lone surrogates, no new T03 validity restriction.
Preserve opaque tokens otherwise; never decode/rebind/drop. No stored page context:
caller repeats effective filters/limit, backend validates token context/expiry;
T05 does not silently restart, fetch later pages or aggregate partial results.

## 5. Hook order, fences and dispatch

Every attempt, including retries, executes in this order:

1. Check caller abort and monotonic total deadline; local captured data already
   validated. Await session.checkBinding("pre-send",captured,internalSignal).
2. Bearer routes await selectCredential(captured,route,internalSignal). Validate
   detached material exactly {bearerToken,forBinding}; forBinding must equal ALL
   four captured fields, not just generation. Null/mismatch/invalid token yields
   authentication_required. Control routes NEVER call selectCredential.
3. Construct immutable headers/check request-head budget. Await
   beforeDispatch(captured,frozenSummary,internalSignal); summary.attempt is the
   next1-based wire attempt. Owner can durably mark dispatch-possible here;
   callback failure means no send for this attempt. T05 supplies no persistence.
4. After all awaits, recheck abort/deadline/TLS env, then synchronously call
   isCurrent(captured). Only literal true permits sending; false/throw/thenable
   means operation_interrupted. No further await between this final guard and
   wire invocation. Recheck caller abort/deadline AFTER the synchronous guard
   and handoff preparation too (the guard itself can consume time or abort);
   mark attempts++, dispatched=true immediately before actual handoff.
5. Receive, bound/decode/classify result. Before delivering ANY received success
   or mapped backend error (or retrying it), await checkBinding("pre-delivery")
   then check abort/deadline and synchronous isCurrent again; recheck abort/
   deadline after that synchronous guard before delivery. A fenced response
   is suppressed, operation_interrupted with conservative uncertainty.
   No private canonical/raw response goes to a fenced caller.

All async hooks race remaining total deadline/caller abort and get an internal
abort signal. Abort/timeout suppress late resolutions/rejections (handled, no
unhandled-rejection leaks), no delayed dispatch/application. Owner hooks must
cooperatively abort their own work; T05 cannot retract their external side effects.
Hook rejection => operation_interrupted. Hook deadline => network_error, no
in-call retry of hook failures. Credential callback throw => operation_interrupted;
returned absent/invalid material => authentication_required.

isCurrent is a trusted synchronous local snapshot fence, not a backend check or
cross-process lock. T06/T09 implement live identity/config checks and atomic
storage ownership. No synchronous callback can be forcibly preempted in JS;
deadline is rechecked after synchronous validation/decode/serialization work.
No guarantee against a privileged same-process malicious callback/global patch.

Wire handoff is conservative dispatch, even DNS/refusal/TLS errors thereafter
may be uncertain. No first-body-byte/flush heuristic proves noncommit. Exact
resource identity is retained across retries, credentials may be reselected
only under the same live captured binding. 401 never refreshes/retries here.
All FIVE controls have exactly one attempt, including exchange/refresh; durable
identical auth recovery/nonce/deadline authorization belongs to T06/T07/T12.

## 6. Response boundaries and returned data

Production adapter returns complete bytes or typed failure, never partial success.
Wire-success shape validated even for injected doubles; arbitrary rejected sender
exceptions become network_error without inspecting/copying message/cause/body.
Malformed wire union/status/header shape => internal_error, no automatic retry.
Status integer100..599; final informational/upgrade/unlisted status not success.
Production handles/limits informational heads and rejects protocol upgrades safely.

Case-insensitive header names; accept JSON media type application/json only,
optional parameters (including charset=utf-8 case-insensitive, quoted allowed).
Explicit non-UTF-8 charset or repeated charset => malformed. Missing/wrong
Content-Type for JSON success/error => malformed; logout204 is exempt. Duplicate
Content-Type, Content-Length, Content-Encoding or Retry-After => malformed.
Content-Encoding absent/identity only (case-insensitive); no decompression.
Reject invalid Content-Length and observable length mismatch/truncation; do not
accept early close as success. Node rawHeaders is flattened in the adapter into
pairs; duplicates/count evaluated before lossy header joining. Trailers cannot
supply/override classification metadata and count towards header limits.

All JSON bodies must be valid UTF-8, complete duplicate-key-free object JSON.
Resource successes go directly to T03 decodeBackendResponse(readTool,text,id?)
BEFORE any ordinary parse. Mutation successes use get_routine+explicit expected
routineId, irrespective of creation step. Preserve original response bytes and
full decoded routine; T10 alone checks admitted domain equality/step/draft/save
confirmation. Matching HTTP status or root ID alone is not a canonical success.
T05 route table does NOT impose extra draft/save state assertions on T03 record
reading. No ordinary parse of Int64 data before lossless validation.

Read success exactly {status,data,attempts,elapsedMs,correlationId,dispatched}.
No duplicated top-level catalogueVersion; it is inside search data. Mutation
success exactly fields in MutationResult. Control JSON success exactly ControlResult:
valid generic object/envelope ONLY, no grant/account/deadline authorization claim.
Byte-opaque private control bodies go only to trusted owners; T06/T07/T12 MUST
validate required fields, exact deadlines, nonce/account/proof binding before use.
No raw control response exposure through MCP/logs. Logout only204 and zero exposed
body; reject nonzero Content-Length/transfer framing that purports a logout body.

After T03 decode, measure UTF-8 JSON.stringify(data) against projected budget,
not the raw bytes and not metadata. No silent truncation. If too large or fenced/
deadline-exceeded, no decoded record/partial aggregate/raw body is returned.
For control object bytes, wire-response limit applies; projected-result budget
is only for returned T03 data. Return frozen detached JSON trees/object wrappers;
raw byte views detached as section4. No body/message/error text in diagnostics.

## 7. Budgets, retry/deadline mechanism

Trusted integer budgets; omitted individual fields get defaults, explicit
undefined/null/coercion/unknown fields reject. Operational limits, not domain
name/array caps. Deployment still must demonstrate all supported aggregates fit.

| Field | Default | Inclusive legal range |
| --- | ---: | ---: |
| maxRequestBytes | 262144 | 64..16777216 |
| maxRequestTargetBytes | 4096 | 64..65536 |
| maxResponseBytes | 1048576 | 64..16777216 |
| maxProjectedResultBytes | 1048576 | 64..16777216 |
| maxHeadBytes | 32768 | 4096..131072 |
| maxHeaderCount | 100 | 10..1000 |
| perAttemptTimeoutMs | 10000 | 50..120000 |
| totalDeadlineMs | 60000 | 100..600000 |
| maxAttempts | 3 | 1..5 |
| baseRetryDelayMs | 500 | 0..10000 |
| maxRetryDelayMs | 5000 | 0..60000 |

baseRetryDelayMs<=maxRetryDelayMs; perAttemptTimeoutMs may exceed total, effective
attempt budget=min(perAttemptTimeoutMs,remaining). maxRequestBytes is body bytes.
maxRequestTargetBytes measures ASCII byteLength of `METHOD SP target SP HTTP/1.1\r\n`
plus all sent `name: value\r\n` lines + terminatingCRLF, including bearer/Host,
using the lowercase list in section4. Reject >limit before beforeDispatch/send;
exact equality passes. No token/query bypass or diagnostic echo.

Response maxHeadBytes is enforced via Node maxHeaderSize AND normalized head
accounting: byteLength of `HTTP/1.1 SP status SP\r\n` + raw `name: value\r\n` pairs
+ terminatingCRLF. Node parser additionally bounds actual status-reason/header
wire overhead; tests must not assume arbitrary raw whitespace costs zero. Header
count is raw field count; enforce without silent discard (request.maxHeadersCount=0
and explicit count is allowed under bounded maxHeaderSize). Trailer accounting
adds actual trailer field lines and their terminator only when trailers exist;
there is NO trailer HTTP status line and absent trailers add ZERO bytes.
Bound informational
heads/trailers too; they never reset deadline or increase allowed total head data.
Body streaming rejects before accumulating beyond maxResponseBytes, destroys
socket/agent and returns response_too_large. Test double returned full bodies are
rechecked by the upper layer; real streaming checks belong to production adapter.

Total clock defaults performance.now, not Date.now. Injected clock finite and
monotonic; bad/receding clock => internal_error, no dispatch/retry afterwards.
Start at method entry, include validation/hooks/connect/TLS/head/body/sleep/decode/
serialization. Check after synchronous work; cannot preempt synchronous JS CPU.
At elapsed>=deadline do not dispatch or deliver success. Active wire timeout =>
network_error; pending caller abort => operation_interrupted with priority.
A terminal backend error whose retry cannot fit returns that original error,
not fabricated timeout. Otherwise deadline expiry => network_error.

Production and upper-layer race wire/hook/sleep work against abort and applicable
real timer/deadline; abort signal passed to sender for destruction. Recheck clock
before/after awaits and immediately before handoff; fake sleeper cannot advance
a call beyond deadline. Cleanup owned timers/listeners/sockets/agents on EVERY
path; handle late native events without unhandled exceptions. Response-size/head/
parser errors => typed sender failures, no native exception leakage. No pool,
background worker, retry timer surviving a call or autonomous restart behavior.

Automatic retries only on reads/resource mutations: network failures of a wire
attempt, valid429/503, HTTP500/502/504 subject to section8. No retry of hook errors,
401, abort, redirect, malformed JSON success/error, overflow or other permanent
response. Controls1attempt regardless of maxAttempts. Backoff after failed attempt n
is min(maxRetryDelayMs,baseRetryDelayMs*2^(n-1)).

For retryable429/503/500, one positive Retry-After matching ^[1-9][0-9]*$ replaces
backoff EXACTLY; never cap/shorten. Header syntax evaluated after ordinary HTTP OWS
trim. If delay>=remaining, no attempts remain, or value magnitude cannot fit, return
original mapped error without sleep/early retry. Unrepresentably huge positive
values prohibit retry and expose retryAfterSeconds:null, never overflow to fallback.
Safe positive integer values may be exposed even when too large to honor. Invalid/
absent value uses backoff; success ignores Retry-After. All sleeps abortable.

## 8. Error mapping and sticky uncertainty

Transport is not a model-facing envelope; T08/T10/T11 map/add authorized operation
history. No operationId/routineId/lastConfirmedStep invented here. HTTP status and
safe backend code are separate; NEVER infer account deletion.

Exported TransportErrorCode is exactly:
invalid_arguments, authentication_required, reauthentication_required,
validation_error, invalid_page_token, page_expired, read_only, not_found,
idempotency_key_reused, id_collision, invalid_state, invalid_reference,
request_too_large, result_too_large, rate_limited, temporarily_unavailable,
internal_error, network_error, operation_interrupted, backend_error.

Known permanent code/status mapping:
400 invalid_request -> validation_error;400 invalid_page_token -> invalid_page_token;
401 authentication_required/reauthentication_required -> same;
401 invalid_google_credential -> authentication_required;
403 read_only;404 not_found;409 idempotency_key_reused/id_collision/invalid_state;
410 page_expired;422 validation_error/invalid_reference -> same.
Other safe nonempty machine codes on400..499 (excluding429) map backend_error,
retryable:false, original safe code retained. This includes backend codes for
out-of-scope sync/copy capabilities; never return sync fields/fullResyncRequired.
A recognized code with a DIFFERENT documented status is malformed, not unknown.
Complete documented backend status/code pairs in service-protocol/authentication
remain the reference for this mismatch check, including out-of-scope codes.

Priority/automatic retry table (after wire/size/fence checks):

| Condition | code / retryable | Automatic retry |
| --- | --- | --- |
| Invalid local args/config/body/origin | invalid_arguments / false | no |
| Missing/invalid credential material | authentication_required / false | no |
| Abort or hook rejection/current-fence failure | operation_interrupted / true | no |
| Hook/total timeout without terminal mapped error | network_error / true | no |
| Wire rejection/network/attempt timeout | network_error / true | bounded resource/read only |
| Body or projected result overflow | result_too_large / false | no |
| Local request body/head overflow | request_too_large / false | no |
| HTTP413 | request_too_large / false | no |
| Any3xx | internal_error / true | no follow/retry |
| Expected status + valid complete response | success (after delivery fences) | no |
| Known permanent pair or unknown safe4xx | mapped as above / false | no |
| Valid429 rate_limited | rate_limited / true | bounded resource/read only |
| Valid503 temporarily_unavailable | temporarily_unavailable / true | bounded resource/read only |
| HTTP500 | internal_error / true | bounded ONLY empty body or valid error object |
| HTTP502/504 | internal_error / true | bounded ONLY empty body or valid error object |
| Malformed/unsafe/mismatched/unrecognized response, other5xx | internal_error / true | no |

HTTP413 is an explicit transport-size rejection even with empty/non-JSON body;
return safe matching request_too_large code if valid, else backendErrorCode:null.
HTTP500 always internal_error even malformed, but malformed nonempty body disables
automatic retry; safe supplied error code retained if valid.502/504 follow same
rule.3xx never exposes Location or backend body fields. Remaining error statuses
require application/json, strict valid object with own nonempty errorCode; optional
message, if present, must be a string OR null (backend OpenAPI ServiceError) and
is NEVER copied/interpreted. Null is valid presentation-field absence, not a
malformed error. This corrects the initial local spec's narrower string-only
wording; the shared contract is unchanged. Additive
error fields tolerated but omitted; no leakage. Unknown unsafe codes => malformed
internal_error, NEVER fabricate backendErrorCode:"unknown"/definite rejection.

Safe code: ^[a-z][a-z0-9_]*$, bounded by response bytes not arbitrary64-char cap.
Documented backend machine codes are a fixed known-code whitelist and remain
safe even if a synthetic credential/token happens to spell part of one; this
prevents short opaque tokens from disabling ordinary error mapping. For UNKNOWN
codes additionally reject strings containing a contiguous32-or-more hex-digit run
(UUID-without-separators/hash-like), and any code containing an exact nonempty
captured sensitive value (selected bearer, resource/auth key, account/profile/
routine IDs, supplied nonempty pageToken, control proof/token/challenge/account
string fields). Sensitive-value matching is literal case-sensitive substring,
not a general secret detector. Only a safe known or unknown code gets retained;
backend message poisoning alone never drops a safe code. This cannot prove a
malicious server cannot encode data into a new code; diagnostics NEVER emit
backendErrorCode (even known codes). Model/error readers treat code as data.

Uncertainty is conservative over the ENTIRE call, all NON-GET routes included:
- dispatched=false/attempts0 until actual sender handoff, not beforeDispatch;
- any handed-off attempt ending network/timeout,500/502/503/504/other5xx,
  redirect, malformed/oversized response or suppressed/fenced result sets sticky
  outcomeUnknown=true. Projected-result overflow also sets it: caller received
  no canonical confirmation; do NOT clear because decoder temporarily succeeded;
- a first well-formed permanent4xx/413/429 error does not set uncertainty, but
  NEVER clears prior uncertainty. All later local credential/hook/size/abort
  errors preserve sticky state. An abort after an active handoff conservatively
  sets it, including abort while waiting for retry;
- **idempotency_key_reused does NOT settle an uncertain request**: it proves a
  key identity conflict, not the outcome of these exact bytes. Preserve prior
  uncertainty; stop as integrity failure. In T05 NO error clears sticky state.
  Higher-layer journal reasoning may distinguish durable rejection under a
  separately verified invariant; T05 cannot infer that from status alone;
- only full validated, within-budget, unfenced SUCCESS delivered for that same
  request settles transport uncertainty. T10 still owns step/content confirmation;
- reads always outcomeUnknown=false (no mutation), with dispatched/attempt count
  still reported. Controls failing after dispatch are conservative stateful
  uncertainty, not a new model-facing creation-history envelope.

## 9. Safe error/event interface

```ts
export interface TransportErrorFields {
  readonly backendErrorCode: string | null;
  readonly retryAfterSeconds: number | null;
  readonly status: number | null;
  readonly dispatched: boolean;
  readonly outcomeUnknown: boolean;
  readonly attempts: number;
  readonly elapsedMs: number;
  readonly correlationId: string;
}
export class TransportError extends Error implements TransportErrorFields {
  constructor(code: TransportErrorCode, details?: Partial<TransportErrorFields>);
  readonly code: TransportErrorCode;
  readonly retryable: boolean;
  // all TransportErrorFields above, plus fixed message/name
}
export function isTransportError(value: unknown): value is TransportError;
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

Error defaults: nullable fields null, dispatched/outcomeUnknown false, attempts0,
elapsedMs0, correlationId empty string. retryable derived from code table, never
caller-supplied. Unknown constructor code/invalid details fail to a default safe
invalid_arguments error (no raw throw/echo). Constructor validates own data fields,
no getter calls; backendErrorCode same safe lexical rule, status100..599 or null,
positive safe integer RetryAfter or null, attempts0..5, finite elapsed>=0,
correlationId empty or canonical UUID. Internal errors additionally remove captured
sensitive values per section8. Each call correlation is unrelated crypto.randomUUID;
factory/default constructor errors do not allocate it. Diagnostics disabled by default.

Own error fields exactly name="TransportError", message="Transport failure: <code>.",
code,retryable and TransportErrorFields. Delete generated stack; no stack/cause/
request/native exception/property payload. Freeze instance. isTransportError
recognizes only actual module-created errors via private WeakSet, no getters,
instanceof traps or externally forgeable descriptor brand required.

Exactly one detached frozen terminal event per called known route if onEvent set,
none on factory rejection. Allowed fields exactly TransportEvent, with fixed route
labels not concrete target/origin, no backendErrorCode/body/message/credentials/IDs.
Callback is trusted synchronous, not awaited; ignore catchable throws, and suppress
unhandled rejection if it accidentally returns a Promise, without changing outcome
or logging it. No console/stdout/stderr writes from transport, no event history
stored after return. Callback latency cannot imply an OS preemption guarantee.

## 10. Independent acceptance and ownership

Developer owns src/http/, T05 implementation ADR and bounded compatibility notes;
no production tests or QA reads. Permitted production checks only per work order.
QA owns test/unit/t05/, test/fault/t05/, synthetic fixture/helpers there and
T05 QA evidence. QA may read public declaration files, NOT emitted implementation,
maps/private source/proposal/ADR. Derive tests solely from this common specification.
Coordinator reviews both and relays only specification-level defects.

**User-approved verification scope reduction:** follow the
[bounded verification plan](t05-bounded-verification-plan.md) for the explicit
15-file active selection, core contract matrix, small replacement import/proxy
checks and preserved deferred infrastructure. This replaces the earlier demand
for exhaustive fault cross-products and a general Node API interception harness;
it does not relax any behavior in sections1–9 or the shared contracts.

Import inertness is verified by a small isolated black-box smoke PLUS coordinator
production source audit, not by claiming comprehensive builtin interception or an
OS sandbox. Actual owned HTTP/HTTPS fixtures still establish destination/redirect/
TLS/proxy boundaries, exact replay, budgets, errors/uncertainty and cancellation.
Representative meaningful cases suffice; do not duplicate every T03 schema case
or repeat every fault across every route. Sound core assertions remain active;
failures against real product requirements cannot be hidden as deferred work.

c3 production is HELD. QA prepares core sources and runs scoped source-quality
checks under the current work order; compiled-target/suite/loopback execution
requires a named frozen-artifact relay. Any production repair closes relay and
requires a new reviewed inventory. Full active T05 and unchanged foundation/T03/
T04 regressions (including actual isolated private provider) run on the final
candidate, then independently in a clean allowlisted locked source snapshot with
byte-identical build. Focused checks during repairs; no skipped required gates.

Existing general interception/forwarding-proxy/calibration sources and failures
are preserved and explicitly DEFERRED, not passed. Test discovery/scripts remain
unchanged; explicit scoped results are never whole-suite or release claims. No
parkedT02 execution or silent exclusion. Fixture results are not real backend/DB/
Google/browser/Android/Pi interoperability. Product writes remain disabled; no
staging/commits, publication, deployment, .pi edits or successor grants.

## Technical reference checked by coordinator

[Node24 HTTP docs](https://nodejs.org/docs/latest-v24.x/api/http.html), fetched as
v24.21.0: custom Agent.proxyEnv defaults undefined; environment-proxy opt-in affects
global agents; explicit agent construction is required. maxHeaderSize bounds
parser bytes, maxHeadersCount can suppress excess fields, and timeout options
emit events rather than abort automatically. Real fixture tests must establish
these properties for the pinned adapter. A local Node24 URL-only probe confirmed
IPv6 hostname retains brackets, and @/dot-path/numeric IPv4 may normalize away;
strict raw origin checks prevent relying on the normalized result alone.
