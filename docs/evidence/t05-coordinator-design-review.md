# T05 coordinator design review — first planning round

**Current disposition: round2 reviewed; bounded public specification approved.**
The [approved transport spec](../decisions/t05-approved-transport-spec.md) is the
common authority for exact implementation/test-source windows in the updated
[work order](../tasks/t05-work-order.md). No target execution or acceptance yet.
The initial round1 NOT-ready disposition and corrections below are retained;
this does not retroactively accept the initial proposal or claim test passes.
[Startup baseline](t05-coordinator-start.md) passed locked install/four production
checks and321 scoped prerequisite tests. No T05 transport execution or acceptance.

This is a common public specification-level decision record. It contains no
production/test implementation, private QA plan excerpts or cross-role source
relay. Normative shared MCP0.2/backend v1 are unchanged. Neither role may read the
other role's private proposal/plan; both may read this coordinator decision.

## Settled selections

- Direct Node24 builtins http/https adapter with dedicated non-pooled owned agents,
  no global fetch/dispatcher/cookie jar/redirect following. Explicitly protect
  against Node24 environment-proxy opt-in as well as ordinary proxy variables;
  verify real adapter behavior later, not a documentation-only assertion.
- No new dependencies, manifest/lock/compiler changes or root/foundation/domain/
  storage/CLI/server/companion edits. Pure imports of the public T03 entry for
  read argument validation and raw lossless decode are allowed.
- Canonical HTTPS origin, optional root slash/default-port normalization and
  lowercase/IDNA host via WHATWG URL. Strictly reject non-origin input before URL
  normalization can erase path traversal, embedded whitespace/backslashes,
  empty userinfo/query/fragment markers or an invalid port. Reject trailing-dot
  hosts. Explicit isolated HTTP test mode permits only literal127.0.0.1/[::1],
  never localhost/DNS-selected destinations. No DNS/network at factory/import.
- Query encoding: ordered URLSearchParams, with spaces normalized from + to %20
  after serialization. This accepts the existing ordinary JS string domain
  without encodeURIComponent URIError on lone surrogates. Document standard
  UTF-8 replacement semantics where a wire string cannot represent an unpaired
  surrogate; do not silently invent a new T03 character-validity restriction.
  Omit empty q and empty filters; repeated muscleGroupId/equipmentId per OpenAPI;
  fixed q/filter/limit/pageToken order. toLowerCase (not locale lowercasing),
  sorted/deduplicated canonical UUID sets. Callers retain page context; no
  automatic traversal/restart or local claim to authenticate opaque tokens.
- Prefer explicit rejectUnauthorized:true plus certificate/hostname checking,
  minVersion TLSv1.2, no downgrade. Factory and dispatch fail closed under
  NODE_TLS_REJECT_UNAUTHORIZED=0 rather than edit the environment. A copied
  testCaPem is approved only for literal loopback HTTPS fixture origins; it adds
  explicit fixture trust, never disables certificate/expiry/host verification.
- Positive whole-second Retry-After must be honored on429/503/500 when retrying.
  Never shorten a positive value to the backoff cap or retry early; if it cannot
  fit remaining budget/attempts, return the original mapped error. Enormous
  positive lexical values mean no in-budget retry, not a parse-overflow fallback.
  Invalid/absent values use bounded default backoff. Success carries no retry
  action. T05 does no401 refresh; later T06 owns one refresh-and-retry.
- Six read methods return concrete T03-projected data plus independent status/
  metadata. Use T03 raw decoder FIRST. Routine mutation success likewise uses
  raw get_routine decoding with explicit expected ID, returning original response
  bytes and decoded record; T10 owns admitted-content/step confirmation. Never
  ordinary parse resource data merely to inspect id or reserialize it later.
- auth_challenge/auth_logout/account_status get one attempt. auth_exchange and
  auth_refresh also get one transport attempt initially: T06/T07 explicitly
  own durable foreground/exact-key recovery and auth deadlines. A returned
  retryable classification does NOT start an automatic auth retry or mint key.
  Resource/read retries alone are transport-bounded. No autonomous continuation.

## Required interface/observable corrections before approval

1. **Concrete self-contained API:** publish exact runtime export inventory,
   TrustedTransportConfig/TransportDeps/Clock/Sleeper/Wire request+response shapes,
   methods and per-route result types. No illustrative signatures or undefined
   unions. Read results are typed per method, not a wholesale resource union.
   Key namespaces are fixed by route; TS branded strings alone cannot detect
   runtime namespace provenance. Use ordinary canonical UUID values with explicit
   route-fixed namespaces, or a specified tagged object. No invented global rule
   forbids the same UUID in the disjoint auth/resource namespaces.
2. **Captured binding:** every invocation explicitly captures immutable origin,
   accountUuid (nullable only for pre-auth controls), sessionGeneration and
   profileGenerationId BEFORE awaits. Include it in every method or call context;
   validate/copy/deep-freeze synchronously. Hooks receive the same capture at
   every attempt/pre-delivery, never a mutable current global binding. Missing
   bearer is authentication_required, not invalid_arguments. Account identity
   originates in later service verification, not in arbitrary tool inputs.
3. **Owner boundaries:** define trusted live-binding/credential selection hook
   order so a generation change during an awaited hook cannot send a newly
   selected credential under an old invocation. Hooks are bounded by call
   deadline/abort; a timed-out callback cannot later dispatch/apply a response.
   Expose an awaited beforeDispatch callback for owners to durably mark
   dispatch-possible before network handoff; failure prevents sending. No
   callback is proof of session/storage implementation or write permission.
4. **Dispatch certainty:** mark conservative dispatched at handoff to the
   low-level sender, BEFORE HTTP header/body bytes may be queued. Header-only
   commands can commit too; first body-byte flush is not a reliable gate.
   No native exception proves pre-commit after handoff. Prefer conservative
   uncertainty to claiming a TLS/reset error means a dispatched write did not
   happen. Define deterministic adapter/fault evidence and all result fields.
5. **Sticky uncertainty:** if ANY earlier attempt may have committed, a later
  401/413/429/malformed error cannot erase that uncertainty. Maintain accumulated
   state across attempts. Valid canonical success or recognized durable
   identical-key outcome can settle the original request; current auth,
   structural/throttling/transient failure alone cannot. Include this explicitly
   in the error/retry table, not only last-attempt booleans.
6. **Runtime allowlist:** typed signatures do not stop JS extra fields or
   malicious frozen auth bodies. Validate exact request wrapper/query/context
   shapes and canonical key/UUID/header-safe token data at runtime. Validate
   frozen control-request JSON shape/purpose so export/deleteAccount or extra
   fields cannot be sent through authChallenge. Validation may inspect bytes,
   but never reconstruct/reserialize or modify accepted bytes. Define how JSON
   duplicate keys/accessors/prototypes/non-JSON values fail without execution.
   Specify createDraft's expected routine UUID rather than infer it unsafely.
7. **Body/response semantics:** GET sends no body (zero identity bytes), never
   an injected {}. POST/PUT send exact supplied bytes with correct Content-Length;
   logout is the sole permitted204 success. Validate complete canonical resource
   bodies through T03; define duplicate-key/UTF-8/JSON content-type handling for
   all error/control responses as well. No shape-presence-only ordinary parse
   becomes canonical mutation success. Raw grant/control bytes stay trusted
   private caller data, never logs/MCP. T06/T07/T12 own exact grant/deadline/
   nonce/account/deletion authorization validation, explicitly not T05 evidence.
8. **Budgets/result accounting:** add a separate published projected-result
   UTF-8 JSON byte budget in addition to request/wire response/header budgets;
   Int64-string projection can expand bytes. Give exact defaults/legal integer
   ranges that permit small isolated boundary fixtures, not a permanent tiny
   content cap. Proposed256KiB..1MiB request range lacks future deployment
   flexibility. Operational ceilings do not certify supported data; the real
   service/deployment gate stays open. Count encoded request target/header data
   as well as bodies; large q/pageToken cannot bypass request budgeting.
9. **Deadline semantics:** use monotonic performance.now by default (not wall
   Date.now). Budget includes hooks, connect/TLS/write/head/body, sleeps, decode
   and result serialization checks. Specify max elapsed/attempt relationship,
   async sender timeout/abort cleanup, late callbacks/response suppression and
   listener/timer cleanup. Injected sleeper and clock are trusted, but cannot
   let the upper layer dispatch after the deadline or return partial data.
10. **Header/stream safety:** explicit maxHeaderSize and response header-count
    enforcement (maxHeadersCount alone can silently discard extras); Host and
    Connection generated by Node are expected, not a false exact-five-header
    assertion. Header casing is case-insensitive. No cookies/proxy auth; honor
    response byte caps during streaming, reject non-identity encoding without
    decompression. Header/parser failures are generic; no raw exception capture
    in public errors or logs. Body head timeout includes slow partial reads.
11. **Status/error decision table:** known code/status pairs map per the MCP
    tools contract, unknown safe permanent codes use backend_error (including
    unknown400, not an invented validation_error). Do not pass fullResyncRequired
    or other sync-only fields through a model-facing strict error. Any malformed,
    unsafe or status-mismatched/unrecognized response remains internal_error
    with conservative write uncertainty, not an invented definite rejection.
    HTTP500 stays internal_error/retryable; malformed-success classification is
    retryable for explicit recovery but has NO automatic retry within that call.
    Redirect similarly internal_error/retryable for explicit recovery and NO
    automatic retry/follow. retryable is a public recovery classification, not
    permission to retry every mapped failure automatically.
12. **Unknown code privacy:** do not fabricate backendErrorCode:"unknown" or
    drop a valid safe code just because unrelated backend message is poisoned.
    Safe unknown machine tokens may use nonempty ASCII[a-z][a-z0-9_]* with no
    arbitrary64-char domain maximum, bounded by response bytes. Exclude lexical
    identifiers/token-looking sequences as explicitly documented; omit unsafe
    original fields and use generic classification. Diagnostics never contain
    backendErrorCode at all. Message text is NEVER returned/logged/interpreted.
13. **Immutable errors and hooks:** safe public errors contain only specified
    readonly immutable own fields/fixed message, no cause/native stack payload/
    request/binding/body/token references; enforce runtime immutability rather
    than TypeScript readonly alone. isTransportError must not execute hostile
    getters. onEvent receives a detached frozen allowlisted summary; throwing
    listener cannot change outcome or leak its exception. No event for bad
    factory input with no safe route label.
14. **Inert import calibration:** T03 public entry has the approved pinned-Zod
    in-memory registry exception. Reuse that PUBLIC exception for a transitive
    T03 import, while network/IO/output/timers/listeners/global handlers remain
    forbidden. No reading historical private QA harness to derive an oracle.
15. **Fixture/read boundaries:** production adapter TLS/wire checks require
    isolated literal loopback fixtures and synthetic certificate/key material
    visibly labelled test-only, no external/live TLS endpoint. QA cannot inspect
    implementation source even for static rows; inspect declarations/export
    names and intercept black-box imports. Existing tests are not edited; T04
    private provider regressions are provisioned explicitly at later relay.

## Round2 adjudication and remaining proposal defects

Developer rev2 and independent QA rev2 planning were reviewed separately. The
coordinator-approved spec, not either private planning artifact, governs next work.
Q1: approve published operational defaults/ranges, with exact accounting/deadline
rules in the approved spec; no supported-aggregate claim. Q2: public T03 type/
function names confirmed. Q3: control results byte-opaque after strict generic
JSON/envelope gates; T06/T07/T12 own full grant/proof/account/deadline validation.

Important corrections retained (rev2 is NOT adopted wholesale):

- idempotency_key_reused proves identity conflict, not the original exact request's
  outcome. It NEVER clears prior uncertainty. No transport error clears sticky
  state;503 and projected-result overflow are uncertain after dispatch too.
- Final synchronous isCurrent guard after all awaited hooks prevents the remaining
  pre-send race. Credential material matches all four binding fields, not merely
  session generation. beforeDispatch is per attempt after validation/credential
  selection and before actual handoff; hooks receive abort signals.
- Raw URL authority/path checks precede normalization. No253-character whole-origin
  cap; IPv6 hostname includes brackets; numeric/abbreviated loopback forms reject.
  Pinned Node URL-only probe confirmed normalization behavior without network.
- Resource results are concrete per method, no duplicated catalogueVersion;
  error constructor/wire failure/attempt budget APIs are completely specified.
  Byte views are detached copies, NOT falsely claimed runtime-frozen typed arrays.
- Error precedence, malformed/unsafe codes, message omission, known-status mismatch,
  HTTP413/500/502/504 behavior, original safe backendErrorCode and diagnostic
  exclusion are explicit. Error stack/cause deleted; WeakSet guard avoids getters.
  Safe backendErrorCode is permitted in errors, NEVER ordinary logs/events.
- Exact request-head/projected-data accounting, complete headers/body checks,
  loopback TLS/proxy fixture scope, real timer vs monotonic deadline behavior and
  single-attempt control recovery boundaries are now explicit.

Node HTTP docs fetched as v24.21.0 confirm custom-agent proxyEnv defaults undefined,
global env-proxy opt-in, maxHeaderSize/maxHeadersCount distinctions, and timeout
not auto-aborting. Public links in the spec; these are design facts to verify with
actual production adapter fixtures, not implementation or integration acceptance.

The earlier broad statement that a recognized durable identical-key outcome could
settle uncertainty required stronger upstream evidence than T05 possesses; the
approved spec narrows T05 to conservative errors without weakening backend replay.
No shared-contract changes were made. Initial proposal/review mistakes stay here.

## Post-approval contract correction (before target execution)

Coordinator rechecked backend OpenAPI ServiceError: optional message is string OR
null, not string-only. Approved spec section8 corrected to accept/ignore null;
no shared contract changed. Both roles notified as a public specification-level
correction while source windows are open. Earlier wording was a coordinator
spec defect, not evidence of a production or QA execution failure.

## Public boundary clarifications before artifact relay

The approved spec explicitly restates two existing observable requirements:
check abort/deadline after synchronous final guards/handoff preparation as well
as before them; count actual trailer fields/terminator only, no invented trailer
status line and zero bytes for absent trailers. These clarify bounded timing/
actual byte accounting, not new domain limits, API signatures or backend behavior.
Both roles notified; implementation and QA remain independently owned.

## User-approved verification reduction

User explicitly approved reducing testing scope after coordinator acknowledged
that late static checks and an overgrown general interception harness caused
avoidable cycles. [Bounded verification plan](../decisions/t05-bounded-verification-plan.md)
now replaces exhaustive instrumentation/cross-products with a core transport
matrix, simple local fixtures and small import smoke plus coordinator source audit.
Sections1–9 production API/behavior and shared contracts are unchanged. c3 remains
held; no production edits or acceptance granted. Old tests/harness/evidence remain
preserved/deferred, not passed; explicit active file selection and final full scoped
regressions/clean locked reproduction prevent a false whole-suite claim.

## Historical round1 next actions (fulfilled by document revisions)

Developer revises ONLY its proposal, integrating these decisions into a complete
exact API and tables. This record supersedes incompatible proposal text; no
production/metadata/dependency edits or execution yet. QA revises ONLY its plan
against public decisions, explicitly correcting consumed-proof vs identical-key
auth recovery, black-box/static role boundaries, sticky uncertainty, request
head/projected-result budgets and monotonic deadline cases; no guessed API or
test sources/target execution yet. Send asynchronous readiness/questions and hold.
Coordinator will review revisions then publish the approved spec and open exact
source-only windows. Original planning failures/limits remain visible here;
no shared-contract changes or permission expansion hides them.
