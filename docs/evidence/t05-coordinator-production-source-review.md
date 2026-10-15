# T05 coordinator production source review — c0 NOT accepted

**Disposition: FAIL; no QA artifact relay.** This is Developer/coordinator-only
production review. QA must NOT read it or its diagnostic implementation. It contains
no QA-source/fixture/internal-plan detail. Failures below derive from approved
public spec and production source, with independent coordinator public-entry probes.
No shared contract change, source acceptance or release claim.

## Candidate and permitted checks

Developer reported six src/http modules, ADR/proposal-link/compatibility notes;
four production checks PASS on Node24.21.0/npm11.19.0, no tests/diagnostics/runtime
execution. Developer held all edits/build/install before this review.

Coordinator read ALL six production files (4081lines) and ADR. Captured c0 inventory
18source/emitted files; SHA256
`8721131cf899e37bc6a6d0bec21dadf572d8812d6341610b8afdfbc3fd0c3037`.
All57preexisting production/experiment source hashes match preimplementation
inventory. Root manifest/lock/compiler/lint/Vitest hashes unchanged. This is a
candidate snapshot, NOT an accepted/frozen QA relay.

Coordinator repeated typecheck, lint:production, format:check:production: PASS.
No rebuild during review; build PASS remains Developer report, generated files
present. Foundation regression99/100 FAIL: bounded compatibility documentation
changed the approved matrix structure. T03 command chained after smoke did NOT
run because smoke failed; coordinator subsequently ran
`npm run test -- test/unit/t03` separately:221/221 PASS. This failure is not
masked as a whole-chain pass;
a later inventory-only command exited0 but does not change smoke's exit1.
Inventory remained byte-identical after checks/probes. No whole-suite/parkedT02.

Independent coordinator no-network injected-sender public-entry probe:11/11
required observables FAIL, exit1. No QA test code used, no sockets/backend opened,
no raw bodies/credentials logged. Only labelled synthetic input and public test CA.
To reach downstream behavior despite the optional-field bug, those probes supplied
ALL documented optional fields with valid values; this is not approval to require
such configuration. Probe source stays coordinator-private; supply ONLY public
spec failure descriptions to Developer. No QA artifact execution has occurred.

## P1 — Optional versus required own fields (blocking factory usability)

Public spec sections2/4/7: config requires origin; deps requires session; budget
fields are partial. exactOwnFields currently requires keys.length==allowed.length;
factory therefore rejects normal `{origin}` + `{session}`, and resolveBudgets
rejects partial overrides. Full sets containing undefined are instead silently
treated as omitted, conflicting with explicit-undefined budget rejection.
Separate required/allowed-own field validation; retain unknown/symbol/accessor/
prototype rejection without making optional members mandatory or invoking getters.
Observed minimal factory and single-field budget override => invalid_arguments
instead of valid frozen transport. Do not weaken spec/tests to require all fields.

## P2 — Correct local errors, bounded capture and entry state

Request body/head size overflow currently calls generic fail and becomes
invalid_arguments, not request_too_large. Body copied before limit check (allocation
already happened). BeginEntry nonfinite/throwing initial clock likewise becomes
invalid_arguments instead of internal_error. Source checks must distinguish
invalid input, size, abort, clock and hook failures while keeping safe own fields.
Start monotonic timing at actual method entry, including capture/validation, not
after binding validation. Avoid multiple unrelated correlation allocations for
one invocation. Preserve exact predispatch attempt/dispatched=false semantics.

Observed valid whitespace-padded oversized request => invalid_arguments;
initial NaN clock => invalid_arguments. Both fail approved observable mappings.

## P3 — Route-correct resource decoding

buildSuccess uses get_routine for EVERY expectedId, including getExercise and
getWorkout. Use the matching route decoder for all six reads with expectedId;
only three mutation routes use get_routine. Individual exercise public-entry
probe with valid synthetic record => internal_error instead of success.
Never perform ordinary JSON parse before the T03 raw decoder.

## P4 — Upper-layer response and header budgets

Approved sections6/7 explicitly recheck injected responses: maxResponseBytes,
maxHeadBytes and maxHeaderCount BEFORE classification/decode/reply. Those guards
are absent outside production adapter. Oversized injected routine response under
64-byte cap returned success200. Add uniform body/head/critical-duplicate/encoding/
length checks for every status, not only select success/error branches. Preserve
413/500 special body rules without allowing malformed headers or oversized data
to evade the common gate. Return no partial bytes/data on any failure.

## P5 — Retry scheduler and exact Retry-After

Network failures return retry delay=-1 and executeCall passes it to sleeper;
expected default500ms, observed-1. Compute the same bounded exponential backoff
for eligible network/HTTP paths. Never use sentinels as actual delays. Honor
remaining total budget, attempt limit, cancellation and original error when retry
cannot fit. parseRetryAfter length>15 misclassifies safe16-digit positive integer
values as unrepresentable: expose all values<=MAX_SAFE_INTEGER, while refusing
an unfittable retry; truly larger values null/no retry. Huge positive lexical
values must never become default backoff. No new retries for controls/malformed.

## P6 — Callback capture and receiver binding

Factory stores callbacks but invocation calls receiver.checkBinding/selectCredential/
beforeDispatch/isCurrent and receiver.sendRaw again, so later property replacement
changes dispatch behavior. Invoke captured function references using the captured
receiver; do not re-read mutable properties. Clock/sleeper functions also lose their
receiver binding. Public spec preserves callback receiver where needed while
preventing property replacement from changing transport behavior. Probe replaced
session.checkBinding after factory: call failed operation_interrupted instead of
using captured original hook. Freeze owned header arrays AND pair tuples; avoid
mutating/freezing caller-owned containers/byte views.

## P7 — Deadline placement, classification and no late success

Multiple independent violations:
- selectBearer races against total(original deadline-start), not remaining time;
- wire outer timer adds1000ms to the allowed attempt timeout;
- sleep timer uses delay+50 instead of remaining call deadline;
- state marked dispatched/attempts incremented BEFORE a later clock read and wire
  argument preparation which may fail or pass deadline without any sender call;
- pre-delivery hook happens BEFORE canonical decode/projected measurement; no final
  deadline check after decode/JSON serialization/freeze/synchronous isCurrent;
- elapsed helpers swallow ClockFault; preDelivery timeout can become internal_error
  or operation_interrupted instead of network_error;
- after an awaited hook expires in injected time, another hook can begin without
  an immediate remaining-budget gate.

Use one consistent monotonic remaining-budget mechanism with real abort timers,
no grace padding/renewed total lifetime; check after bounded synchronous work.
Differentiate caller abort, deadline expiry and invalid clock. Wire handoff is the
exact conservative dispatch mark; final guard and deadline recheck immediately
before actual invocation. Probe advancing clock beyond deadline in final delivery
guard returned success200, where network_error/no data is required. No late
promise settlement may send/apply data. Current live hooks are integration seams,
not arbitrary privileged code sandboxing; do not overclaim preemption.

## P8 — Sticky uncertainty and safe post-handoff failures

Valid same-request success must clear accumulated uncertainty BEFORE success event:
network-then-success probe emitted ok with outcomeUnknown:true. Conversely abort
during retry sleep after a dispatched429 currently preserves false although spec
requires conservative active-abort uncertainty. Pre-delivery deadline/clock errors
may exit without setting uncertain after a successful potentially committed response.
Generic errors thrown out of the loop reach entryFailure and can fabricate fresh
predispatch invalid_arguments with attempts0 after actual handoff. Centralize safe
failure construction using retained state; never reset post-dispatch history.
Keep503/projected overflow/409-key-reused rules intact. No error clears earlier
uncertainty; success settles only when validated/within budget/unfenced and delivered.

## P9 — Error mapping matches complete documented pairs

CODE_STATUS omits documented409 source_shape_changed/history_shape_changed/
exercise_in_use and413 request_too_large, weakening wrong-status classification.
Unknown503currently maps permanent backend_error, but approved unknown5xx is
internal_error/retryable classification with NO auto-retry.500/502/504 currently
auto-retry any syntactically valid envelope even status-mismatched/unsafe code;
probe500/not_found produced2attempts, expected1. Only EMPTY or valid SAFE status-
consistent envelope qualifies for bounded automatic retry.413may retain only
safe MATCHING request_too_large when valid, not arbitrary other-safe code. General
critical duplicate/encoding/header checks precede special-status body exceptions.

Backend message:string|null correction is implemented and retained. Message text
must never affect safety of an otherwise-safe code. Unknown-code scrub must include
all captured sensitive values, including profileGenerationId (currently omitted).
Keep response shape/accessor failures generic and do not dereference arbitrary
injected response getters as an accidental validation path.

## P10 — Production adapter protocol/head/cleanup behavior

- request.maxHeadersCount is a ClientRequest property, not a supported request
  option that disables truncation; set/enforce correctly, do not invent a type
  intersection and claim the option has effect. Count/enforce initial heads
  immediately, before body accumulation, with cumulative information/trailer data.
- No information handler accounts for repeated1xx heads, so cumulative budget
  can be reset/evaded. Bound count/bytes across all observable heads.
- Raw trailers are concatenated into classification headers: trailers can supply
  Content-Type/retry metadata missing from the head, forbidden by spec. Count
  them without letting them supply/override classification fields.
- Upgrade handler ignores the detached upgraded socket; explicitly destroy owned
  upgraded sockets and handle errors, not only request/agent handles.
- All client parser errors currently become network errors, enabling automatic
  retries for malformed response/head overflow. Truncated body paths can race
  error/close classification. Classify known parser/truncation faults safely as
  malformed, separate genuine network/no-response and timeout, never copy native
  error message/rawPacket into public errors/evidence.
- awaitHook abort listener remains until promise settles; aborted helper has no
  success-path disposer. Clean owned listeners on abort/timeout/success even when
  an uncooperative trusted promise never settles; handle all late rejections.

Real production wire/TLS tests remain required after static repair and fresh relay.
No opaque native exception or optimistic close event proves an uncertain write
uncommitted. Cleanup must be bounded and ownership-specific.

## P11 — No undocumented parser/domain restriction

MAX_JSON_DEPTH64 is not in approved public spec/budgets and rejects otherwise valid
additive control/error JSON and generic nested request evidence. ADR cannot approve
it. Remove arbitrary hidden depth restriction; use explicit bounded byte/deadline
parsing with safe stack strategy. Do not alter T03/shared contracts or add a new
field/budget silently. Complete JSON/duplicate rejection remains mandatory.

Validate byte views safely without executing user-defined buffer/byteLength getters;
read native slots/guard descriptors rather than assuming instanceof forbids shadows.
Similarly exact-own metadata need not invent enumerability requirements not in spec.
Error constructor preserves safe own-field discipline and private WeakSet branding;
no test-driven demand to make Error.message enumerable is imposed here.

## P12 — Fixture trust raw-origin restriction

HTTPS testCa permission currently checks normalized socketHost only; abbreviated/
numeric loopback origins normalize into trusted fixture hosts despite raw literal
restriction. Preserve/check raw host provenance for fixture trust as for insecure
HTTP. URL.hostname brackets and strict origin pre-normalization rules remain.
No TLS verification relaxation, local trust installation or dependency change.

## P13 — Compatibility notes without matrix schema drift

T05 grant permits bounded unverified notes, not changing the already-approved
compatibility matrix schema. Preserve its17component rows and statuses; put T05
implementation/verification limitations in a clearly labelled prose section.
No existing test edits or relaxed metadata assertions are authorized. Foundation
regression currently99/100 fails on this public-document structure change; no
T05 compatibility pass is inferred from a new unverified row.

## Repair disposition and next actions

c0 CLOSED/not accepted; no artifact relay. Reopen ONLY existing Developer-owned
src/http/ + ADR + bounded compatibility/proposal-link scope for P1-P13. Preserve
initial failures in ADR/review; four production checks then new artifact-ready
and complete source/build/install hold. Developer runs NO QA/domain/coordinator
probe/diagnostic/public-entry tests; coordinator retests observables independently.
No test internals relayed across roles. QA independently repairs its source review,
with execution still closed. No dependencies/lock/compiler/config changes, actual
writes/live services/.pi/staging/commits/successor work. A repair invalidates c0;
new independent production/QA review and hash inventory required before relay.
