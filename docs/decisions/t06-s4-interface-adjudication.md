# T06-S4 common interface adjudication — entry and delivery boundaries

**Authority:** Coordinator clarification of the user-authorized S4 work order
against unchanged shared MCP draft0.2/backend v1 and accepted T04/T05/S1–S3.
This is a COMMON public specification for Developer and independent QA, not
production/test internals or acceptance evidence. No new API, vault version,
dependency, fixture seam, lifecycle authority or execution grant.

## 1. Entry error classes (settled)

No universal single-class mapping is required. Invalid S4 options, captured binding,
native signal, epoch clock and session-state gates retain safe SessionError
semantics from S1–S3. Missing grant is authentication_required; valid foreign or
invalidated binding is operation_interrupted. Invalid trusted T05 configuration
propagates the original safe TransportError. Canonical config-origin mismatch with
the owner is SessionError(invalid_arguments).

Malformed local route IDs/keys/query/body/byte views may use safe
TransportError(invalid_arguments); body-byte budget overflow MUST retain
TransportError(request_too_large). Both originate before resource dispatch/auth
preparation. Abort/fence observed by resource T05 may be TransportError
(operation_interrupted); Session-boundary observation may be SessionError of that
code. Recognition must use actual module-created safe errors, not arbitrary objects.
No raw/native exception, stack, cause or secret may be attached.

This settles the reported entry-class question without requiring a rewrite merely
to make all local invalid_arguments share a class.

## 2. Preflight validation versus operational head budgets (settled)

Capture/validate ordinary request data before first await and BEFORE auth changes:
query schema, UUIDs, byte-view validity, complete duplicate-free body shape and
maxRequestBytes. Retain entry snapshots unchanged for both resource legs.

T05's operational request target/head accounting includes the selected bearer and
other constructed headers. Full head-budget enforcement for otherwise valid request
data remains T05 pre-dispatch and may occur AFTER S4 preflight auth installation.
It returns its original safe request_too_large without resource dispatch. This does
not waive early malformed-request/body-size validation, weaken head budgets, permit
resource retries on size errors or authorize cleanup of newly installed credentials.
No aggregate S4 wall-clock SLA is added; T05 deadlines remain per invocation.

## 3. Shared auth and exact dispatch revision (existing requirements clarified)

A valid resource invocation encountering an active shared auth cycle joins it even
when the predecessor still appears live or its pending prepare commit is not yet
acknowledged. It receives that cycle's outcome, with follower-local cancellation;
it does not bypass preparation, silently elect a replacement leader after failure,
or use a pending predecessor as bearer. An auth cycle does not successfully settle
until its installed access AND refresh are usable and post-clock leader/fence checks
pass. Expired access returned by a fresh rotation is installed, then the cycle
requires reauthentication without looping.

The revision used for a401 decision is the revision of the bearer actually selected
for that resource dispatch, not merely a revision observed before asynchronous
selection. Delayed401 for an older bearer may reuse a newer usable installed grant;
a401 for the current bearer still permits the specified one forced rotation.
Resource networking can overlap, but no new resource handoff occurs using unresolved
shared auth state. Owned vault commits/acknowledgements must not be misclassified as
external drift or fence unrelated valid same-binding resource responses. External
drift remains fail-closed. No private lock/state-machine implementation is mandated;
auth transport hooks must never wait on their own active cycle. Each invocation's
preflight and reactive stage still has at most ONE shared auth cycle. If credentials
expire after joining its terminal outcome, fail closed rather than silently start
another cycle in that same stage. Shared terminal success must recheck leader abort/
fence after all asynchronous cycle work and immediately before outcome settlement.

## 4. Final S4 delivery and conservative mutation suppression

After ALL final asynchronous owner checks, immediately recheck captured identity,
caller abort/local fence and the CURRENT durably installed session's exact access/
refresh deadlines, with abort/fence checks AFTER any epoch-clock callback. An older
dispatch bearer's historical expiry alone does not fence an otherwise accepted
same-binding response when the installed successor is usable: rotation is not
sign-out/replacement. No further await/caller callback may intervene between the
final guard and resource outcome settlement, including an awaited helper's return.
A callback-triggered abort cannot become late success. Read/write result delivery
remains subject to same-binding fences even if T05 previously validated an
intermediate success.

If S4 suppresses a received T05 resource success for final abort/fence, expired usable
credentials or invalid clock, report a safe TransportError with respectively
operation_interrupted, reauthentication_required or invalid_arguments. Preserve
that final leg's dispatched=true, attempts, elapsedMs and correlationId; status may
retain its safe received status, backendErrorCode/retryAfterSeconds null. Set
outcomeUnknown=true for a mutation and false for a read. Never attach canonical/raw
result data, causes or bodies, fabricate cycle-wide metadata or downgrade a
suppressed mutation to a pre-dispatch SessionError. This applies the accepted T05
conservative uncertainty rule at the added S4 delivery boundary; it does not infer
backend settlement or authorize another retry. Original non401 T05 failures remain
unchanged; safe storage failures retain their specified storage/fencing semantics.

The repeated-valid401 SessionError(reauthentication_required) exception stays:
both single-attempt resource legs were definite rejections. Auth-stage error mapping
and exact retained pending evidence remain as in the S4 work order. S1–S3 standalone
APIs and T05 transport behavior remain unchanged.

## Grants and verification

Read with the S4 work order. Applicable work remains bounded source/static checks
only; source approval and named frozen relay are separate gates. QA chooses minimal
independent public checks for these same core risks, not a broad new race matrix or
implementation-derived tests. S5/parent/release/product-write boundaries unchanged.
