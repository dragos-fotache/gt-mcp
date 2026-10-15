# T05 transport design brief — proposal window

**Status:** coordinator design requirements, NOT an approved implementation API.
User authorized T05 and fresh Developer/QA; standing Herdr permission is recorded
in [coordination](../agent-coordination.md#standing-herdr-authorization).
T01/T03/T04 acceptance stands; T09 is ready but unassigned, T02 remains parked,
T13/T14 retired. Only the [work order](../tasks/t05-work-order.md) planning window
is open. No product writes, live services or release claim.

## Authority and intended boundary

Normative: shared MCP 0.2-draft working-tree config-only revision over 9a96dcb;
backend OpenAPI 1.0.0, service-protocol.md, authentication.md and account-lifecycle.md.
Read MCP tools/authentication/routine-creation/acceptance-scenarios, local
architecture/verification and accepted T03 public specification/handoff.
Never rewrite contracts to accommodate code or tests.

Target a side-effect-free public `src/http/index.ts` -> `dist/http/index.js` +
declarations. This is the only backend network boundary, not a generic URL/header
proxy. Existing server/CLI/root/companion entries remain inert. No session manager,
browser login, configuration file loader/write guard, journal admission, creation
orchestration, lifecycle cleanup or MCP tool registration is assigned.
T05 supplies trusted internal integration seams for later T06-T12, not proof of
those safeguards. A transport mutation method alone cannot authorize product writes.

## Developer proposal requirements

Propose a complete public API and observable error/result contract with readonly
concrete types, exact runtime exports and effects/ownership/lifetime rules. Submit
`docs/decisions/t05-transport-proposal.md`; coordinator reviews and publishes the
common approved spec before either role implements sources. Prefer Node builtins
and existing locked dependencies; dependencies/compiler/config changes require
coordinator review before installation or edits.

1. **Fixed destination:** one operator-selected canonical HTTPS origin. Reject
   userinfo, paths/query/fragment and malformed origins; define normalization and
   profile-binding semantics. HTTP only via explicit trusted isolated loopback-test
   configuration. No redirect following (same-origin as well as cross-origin),
   environment proxy/global dispatcher destination override, backend-selected
   endpoint, ambient cookie jar or credential-forwarding fallback. Identify actual
   Node24 behavior and the production adapter chosen; do not assume flags imply
   isolation. Keep certificate validation enabled; any test trust seam is explicit,
   local and inaccessible to model inputs.
2. **Allowlisted routes:** six resource reads: GET catalogue/exercises,
   exercises/{id}, workouts, workouts/{id}, routines, routines/{id}; internal
   creation requests: POST routines, PUT routines/{id}, POST routines/{id}/save.
   Separate trusted control routes: POST auth/google/challenge, auth/google,
   auth/refresh, auth/logout and account/status. No sync, account export/delete,
   arbitrary routine/workout/exercise mutations or generic method/path API.
   Concrete UUID paths canonical; mutation queries prohibited. Route selection
   fixes method, authentication mode, allowed parameters and expected success
   status/body. Auth challenge purposes needed here are signIn and accountStatus;
   do not expose export/deleteAccount capabilities accidentally.
3. **Query context:** T03 read argument validation/defaults; search uses backend
   locale-independent Unicode lowercase and sorted/deduplicated UUID filters.
   Propose exact OpenAPI query serialization, deterministic normalization and
   escaping of hostile search/token strings without route/header injection.
   Retain opaque page token bytes and effective filters/limit across requests;
   no silent token drop, page restart, traversal or partial aggregation.
4. **Immutable identity:** accept already-frozen UTF-8 body bytes and resource/auth
   keys, capture them without aliases to mutable caller buffers. Retries preserve
   exact method/concrete route/body/key/namespace, including empty vs absent-body
   semantics; never JSON parse/reserialize retained requests, allocate keys or
   switch to sync routes. Define UTF-8 and byte validity without inventing domain
   caps. Credentials are private session input, not caller-controlled headers.
5. **Session seams:** internal trusted credential injection and captured pre-send/
   pre-delivery fence hooks, cancellation and dispatch-possible reporting. T06
   owns grants, durable refresh and generation verification; T05 never invents
   account identity, refreshes automatically, launches login, or infers deletion
   from 401/404/network errors. A 401 refresh/retry belongs to T06 and retains the
   original resource identity. Auth/status routes without idempotent replay need
   explicit non-retry semantics for consumed proofs/lost success.
6. **Budgets:** propose exact defaults, legal ranges and public trusted config for
   request/response/result bytes, per-attempt and total elapsed deadlines, maximum
   attempts and delays; cover streams, headers/body, encoding/decompression and
   cancellation during retry sleep. Bound resource cleanup/socket lifetimes.
   Honor positive whole-second Retry-After within the total budget: if it cannot
   fit, return rather than retry early. Bound transient retries; no retry of
   permanent, malformed success or oversized unchanged input indefinitely.
   These are operational limits, not permanent domain/name/array caps. Do not
   claim supported-aggregate production acceptance without later real evidence.
7. **Truthful results:** expose status separately from body, expected response
   metadata and dispatch certainty. Use T03 raw lossless decode entry before any
   ordinary parsing of resource Int64 revisions. Six reads decode whole records;
   discuss routine-write raw response validation seam for T10 confirmations
   without modifying T03 or claiming shape/history confirmation here. Validate
   control response shapes/deadlines/account bindings or explicitly place that
   validation in the later owning task; no raw credential results to MCP/logs.
   204 is success only where the route allows it (logout); bodyless resource
   success, unexpected status, malformed/truncated/duplicate-key/oversized data
   never become apparently successful records or write confirmations.
8. **Error mapping:** full decision table, including known permanent codes,
   unknown safe permanent code -> backend_error with backendErrorCode, 401,
   413 request_too_large, 429 rate_limited, 503 temporarily_unavailable,
   500 internal_error, network/timeouts/cancellation and redirects. Preserve
   safe backend code, never backend presentation message/exception/body leakage.
   Explain unsafe code handling and logging without arbitrary silent contract
   narrowing. A dispatched write with lost/malformed/unrecognized response or
   500 may have committed; report outcomeUnknown rather than false rejection.
   Distinguish local pre-dispatch size/validation/abort from uncertain writes;
   a result_too_large response can follow a commit. Do not invent operation IDs,
   routine IDs or lastConfirmedStep (T09-T11 supply admitted history).
9. **Observability:** no import IO/global handlers/timers, stdout or implicit
   diagnostic writes. Sanitized opt-in metrics/events use route labels (not
   concrete URLs), safe classification/status/attempt/timing and unrelated
   correlation identity. Never credentials, IDs, raw queries/search, paths,
   payloads, Location headers, native exception details or backend messages.
   Listener failure must not leak sensitive data or change commit classification.
10. **Testability:** internal trusted injectable clock/sleeper/transport seams
    with production route/destination guards still applied. Define which tests
    require the actual production adapter versus deterministic doubles; require
    isolated loopback wire tests for redirects, exact bytes, abort/stream limits,
    proxy/header safety and response failures. No injectable seam can become a
    model-controlled auth/TLS/destination bypass.

## Independent QA planning requirements

QA writes `docs/evidence/t05-qa-plan.md` from this brief and normative specs only,
not Developer proposal/source/ADR. Map M10/A09 and transport portions of
R02/R06/R08 to positive/negative cases and an oracle matrix; distinguish transport
fixtures from real backend/DB/browser/host interoperability. Record API questions
instead of guessing tests against an unapproved interface.

Plan inert import/export/declaration checks; hostile route/query/header/origin/
redirect/proxy cases; exact byte/key replay under mutated input aliases; Int64-max
raw decoding; search/paging context; known/unknown/unsafe errors and poisoned
messages; 413/429/500/503; malformed/bodyless/truncated/oversized responses; strict
local TLS and production adapter wire coverage; bounded deadlines/Retry-After;
pre/post-dispatch abort and uncertainty; credential/fence integration hooks;
cleanup/resource leak checks and sanitized diagnostic inspection. No skipped gates
or mocked integration claims. Retain existing owning suites without edits.

## Decisions to close before implementation

Coordinator reviews proposal and QA coverage independently, resolves destination,
query, public API, budget/retry/error/dispatch and control-validation boundaries,
then publishes `t05-approved-transport-spec.md` and opens exact source windows.
No dependent task or dependency expansion follows from proposal approval alone.
