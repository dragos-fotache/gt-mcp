# T09-S1 — Versioned journal format and immutable request identities

**Status:** accepted/closed on 2026-10-15 after the user-assigned S1 work.
**Owner:** primary Codex agent; optional bounded subagents. S1 only.
**Started:** 09:57 UTC; checkpoint at 11:27 UTC, stop at 11:57 UTC if unfinished.
T09 parent remains incomplete; S2/S3 are not assigned.
See [acceptance](../evidence/t09-s1-review.md) and [handoff](../handoffs/t09-s1.md).

## Scope and execution

Authority: [T09 common contract/plan](../decisions/t09-plan-and-slices.md), shared
draft0.2 creation/tools, backend v1, approved T03/T04 public specs and
[proportional testing](../decisions/proportional-testing-policy.md).

Own src/operations/, test/unit/t09/, this work order, T09 format/acceptance/handoff
docs and bounded task/index/roadmap/verification status updates. No changes to
existing production modules, tests, contracts, dependencies, manifests/lockfile,
compiler/build configuration or .pi. No admissions, storage/provider access,
network dispatch, repository state transitions or product wiring in S1.

Use the provisioned Node24.21.0/npm11.19.0 toolchain. Run production typecheck,
lint:production, format:check:production and build; scoped test lint/format;
exact nonempty S1 test selections and unchanged T03 intent/write-projection
regressions. A small emitted-module import smoke and source review establish
bounded import inertness, not sandbox proof. Clean locked reproduction remains
parent S3 acceptance work; S1 is pure and does not require provider/HTTPS fixtures.

## Settled public S1 surface

Add src/operations/index.ts -> dist/operations/index.js and declarations.
No root/CLI/protocol exports change. Runtime exports:

- JOURNAL_VERSION=1, OPERATION_STORE_VERSION=1.
- OperationError, isOperationError. Codes: invalid_arguments,
  recovery_unavailable, request_too_large, resource_exhausted, internal_error.
  Fixed data-free message/stack; no native cause, paths or payloads.
- operationIntentMaterial(createArgs): Uint8Array. UTF-8 of T03 intent version,
  one zero byte, canonicalJson. No digest/key creation.
- createOperationCandidate(createArgs, options): ActiveJournal.
  Options exactly {binding, limits, intentDigest, generateUuid?}; binding exactly
  {origin, accountUuid, profileGenerationId}, excluding sessionGeneration.
  limits exactly {maxRequestBytes,maxResponseBytes}, each an accepted T05 integer
  budget (64..16777216). intentDigest is a detached 32-byte Uint8Array.
  Optional trusted synchronous generateUuid defaults to crypto.randomUUID.
  Allocate root, then entry and its sets in input order, then three keys.
  Invalid/colliding generator output fails internal_error without a candidate.
  Caller must obtain the real keyed digest through T04 before S2 admission;
  a candidate is not proof of authentication, visibility, persistence or admission.
- validateOperationRecord(value, expectedBinding): detached OperationRecord.
- encodeOperationStore(value): Uint8Array.
- decodeOperationStore(bytes, expectedBinding): detached OperationStore.
  All invalid/corrupt/unsupported records fail recovery_unavailable; capacity
  exhaustion is resource_exhausted. Physical integrity/empty-file distinction
  remains T04 responsibility.
- readOperationStep(activeJournal, step): detached {method,route,resourceKey,body}.
  step is draft/populate/save, body is a fresh Uint8Array decoded from stored bytes.
- readConfirmationBaseline(activeJournal): null or detached
  {id,name,isDraft,exercises,revision}. Domain state derives from the immutable
  admitted body (draft is empty); revision remains exact decimal Int64 text.
  Return null without confirmation or for a terminal journal; do not fabricate
  a current backend record or include derived labels.
- measureOperationStore(value): {encodedBytes,reservedBytes,remainingBytes}.
  Fail resource_exhausted when encoded/reserved bytes exceed MAX_STORE_BYTES.

Objects/arrays are detached readonly TypeScript values. Mutable byte copies never
alias a journal. Ordinary input objects require exact own-data JSON shapes, no
getters/toJSON/symbols/cycles/nonfinite values. Byte APIs reject shared/detached
buffers. Importing the module does no IO/output/process/network/timer work.

## Version-1 format

Store: {version:1,binding,operations:[OperationRecord,...]}. IDs unique across
operations; retained root IDs unique as well. Initial authenticated zero bytes
decode to an empty logical store with expected binding. Nonempty bytes are strict
UTF-8 JSON, no BOM, duplicate keys, unsafe numeric integer rounding, unknown fields
or unsupported versions. Object key order/whitespace are not identity.

ActiveJournal:
{version:1,kind:"journal",binding,operationId,routineId,intent,limits,
reservationBytes,steps:[draft,populate,save],confirmed,terminal}.
intent is exactly {version:"gymtracka-create-intent-v1",
digestKeyVersion:"gymtracka-digest-v1",digestBase64}.
Each step is {step,method,route,resourceKey,bodyBase64,state}; states are unsent,
dispatch-possible or confirmed. Body encodings are canonical base64 of exact
UTF-8 JSON bytes. Different valid property order/number spelling/whitespace in
stored bodies are retained unchanged; semantic validation does not reserialize.

Validate three canonical fixed routes/methods, root/family IDs, key distinction,
complete T03 write whitelist, positions, normalized input and consistent save
name. A confirmed prefix may be followed by at most one dispatch-possible step,
then unsent steps; no gaps. confirmed is null or {step,revision}, matching the
last confirmed prefix member. revision is positive canonical Int64 decimal text.

terminal is null or an exact create_routine result envelope. Success requires
all steps confirmed and the stable saved receipt. Failure has retryable:false,
matching operation/root IDs and lastConfirmedStep, outcomeUnknown, optional safe
backendErrorCode/retryAfterSeconds, and no message or fixed generic
"Routine creation failed." message. Permanent codes:
not_found, invalid_reference, validation_error, invalid_state, id_collision,
read_only, idempotency_key_reused, concurrent_modification, backend_error,
request_too_large, result_too_large.
An uncertain terminal failure retains full evidence; compaction may not erase it.

Compact receipt:
{version:1,kind:"receipt",binding,operationId,routineId,intent,maxResponseBytes,
lastConfirmedStep,result}. No request/response/domain bodies or keys.
Only definitive outcomes (outcomeUnknown:false) can be compacted.
Retired tombstone:
{version:1,kind:"retired",binding,operationId,routineId}; no intent or content.
S1 validates these representations; S3 implements persistence/compaction/retirement.

## Capacity contract

For a new active candidate let B be its encoded JSON byte length with
reservationBytes=0. Its reservation is B + maxResponseBytes + 2048.
Terminal envelopes must encode within maxResponseBytes + 1024; the remaining
1024 covers replacing null confirmation with the bounded step/revision marker,
all step-state growth and the reservation's decimal digit growth. Confirmed
domain data is already represented by the immutable populate body; no append-only
history or arbitrary backend projections are retained. Existing active records
must retain the reservation derived from their original immutable identity.

Whole-store reservedBytes is the exact empty-envelope byte length plus record
reservations (actual encoded length for receipts/tombstones), plus array commas.
This reserves later transitions across all admitted operations without allocating
padding. Admission/updates must reject excess capacity; no domain caps/eviction/
TTL, and no changing retained operational bounds to evade the reservation.
S2 enforces under the commit lock. S1 proves arithmetic/encoding bounds only.

## Verification and stopping conditions

Use small synthetic inputs; test exact bytes/routes/IDs/positions; defaults/order/
numeric equivalence and significant changes; invalid generator collisions;
strict format/version/binding/state rejection; exact Int64; mutable-copy isolation;
compact receipt/tombstone content boundaries; and reservation exhaustion/bounds.
Owning test: test/unit/t09/s1-format.test.mjs (27 cases; no added helper/framework).
Relevant regressions: test/unit/t03/parse-normalize-identity.test.mjs and
test/unit/t03/write-projection-result.test.mjs.

Escalate any shared-contract conflict or inability to prove capacity arithmetic.
Stop at S1 acceptance/partial/blocked disposition with exact evidence and handoff.
No automatic S2, actual product writes, live facilities, staging or commits.

The [delivered format note](../decisions/t09-journal-format.md) records safe code
syntax and the capacity proof. Final acceptance is74/74 across three exact files;
all S1 windows are closed, with no S2 grant.
