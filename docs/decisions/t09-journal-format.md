# T09 journal format v1 and repository boundary

> **T21-S1 successor authority (2026-10-17):** T21 removes the operation journal, receipts, keyed intent digest and permanent operation reservations entirely. This format remains historical, not a successor implementation requirement.
> See the [successor storage/interface spec](t21-single-record-storage-spec.md). Documentation only;
> current runtime/package behavior is unchanged until T21 implementation acceptance.

**Scope:** T09-S1 format/identity substrate. See its
[work order](../tasks/t09-s1-work-order.md) for the exact public runtime/type API
and [parent plan](t09-plan-and-slices.md) for ownership/authority.
No repository/admission/transition implementation or product creation is delivered
by S1. A candidate is not an admitted or authenticated operation.

## Format and identity

Public entry: src/operations/index.ts -> dist/operations/index.js and declarations.
Seven source modules implement readonly record types, strict schemas, captured
JSON/byte validation, candidates, format/capacity and safe errors.
JOURNAL_VERSION and OPERATION_STORE_VERSION are both 1. Imports only define pure
functions/types/schemas; functions do not provision/open storage or send requests.

The exact envelope/record fields are in the work order. The discriminated kinds
are journal, receipt and retired. Unknown properties and unsupported versions
fail recovery_unavailable. Nonempty payloads require strict UTF-8 without BOM,
valid duplicate-key-free JSON and exact integer tokens for metadata/domain integer
fields. Object property order/outer whitespace are not identity. Base64 is
canonical; decoding accepts no alternate padding or ignored characters.

Persisted binding is origin/accountUuid/profileGenerationId; sessionGeneration
is deliberately absent. T04 derives a stable profile/account key across trusted
same-account session-generation changes. S2/S3 must separately fence current
handles on generation changes, never replace retained identity.

operationIntentMaterial returns UTF-8 of
gymtracka-create-intent-v1 + one zero byte + T03 canonicalJson. S2 must feed these
exact bytes to ProfileSession.keyedIntentDigest, then store the resulting 32-byte
digest with both intent and gymtracka-digest-v1 versions. S1 receives a supplied
digest to build a candidate; it cannot verify keyed equality without the holder.
Do not interpret a shape-valid digest as proof of authentication or admission.

Candidate allocation order is root, then each entry and its sets in input order,
then draft/populate/save resource keys. UUIDs use absolute string-end validation,
not JavaScript dollar anchoring that admits a final newline. Root/entry/set IDs
are family-distinct. The three resource keys are mutually distinct; their
resource-idempotency namespace is separate from the family namespace.
Generator failure/invalid output/collision is internal_error with no candidate.
No repairing or allocating replacement identities after admission.

Use T03 buildRoutineInput for complete write projection. Draft/populate/save
methods/routes and body field whitelists match the shared creation contract.
Each body is serialized once on candidate creation and retained as base64 of
exact UTF-8 bytes. Validation compares parsed semantic fields with the T03
projection but never replaces stored bytes. readOperationStep returns a fresh
byte copy. Valid alternate property order, whitespace and numeric spellings in
retained bodies remain byte-for-byte unchanged.

## State and confirmation data

A journal has a confirmed prefix, optionally one dispatch-possible step, then
unsent steps. The confirmation marker matches the final confirmed prefix member
and has a positive canonical decimal Int64 revision. No gap/second pending step,
later-step confirmation or marker mismatch is accepted.

The domain baseline is compactly represented by immutable admitted bodies plus
the step/revision marker. Draft baseline is {id,name:"",isDraft:true,exercises:[]};
populate baseline is the admitted writable projection; save baseline has
isDraft:false. This is an expected confirmed comparison state, not a fresh backend
record. T10 must validate actual complete canonical responses before writing a
marker. The baseline API returns null for terminal journals; a changed-content
save is a terminal conflict and cannot become an invented active baseline.

Terminal results preserve the original creation IDs and confirmed history.
Saved success requires all three steps confirmed. Failure results are permanent
and nonretryable, with matching creation fields; uncertain terminal failures
retain full journal evidence. Compact receipts require definitive results and
erase bodies/keys. Tombstones retain only version/kind, binding and operation/root
IDs; retirement never frees the operation ID. T09-S3 supplies durable transitions;
T11/T12 own the relevant orchestration and trusted user controls.

Only fixed generic error presentation text is permitted. backendErrorCode uses
the accepted T05 safe machine-code syntax, with no 32-or-more hex-digit runs.
Credential-dependent screening remains the authenticated transport's responsibility;
a serialized code alone cannot prove absence of a secret. Repository/library
errors have fixed messages/stacks without input, IDs, paths, native causes or
backend presentation text. Capacity errors are internal resource_exhausted,
mapped by future tool integration without inventing a model-facing domain code.

## Finite capacity reservation

Let R be the retained maxResponseBytes, and B the UTF-8 JSON length of the
original journal with reservationBytes=0, all steps unsent and null confirmation/
terminal. The fixed reservation is:

    reservationBytes = B + R + 2048

The shape validates every terminal envelope to at most R+1024 encoded bytes.
No arbitrary response records, additive labels, growing history or copied
confirmed domain body are appended. Retained response/request budgets use the
accepted T05 range 64..16777216; later configuration changes cannot silently grow
an existing operation's storage allowance.

For all accepted later journal states, encoded growth over B is bounded by:

- Terminal replacement of null: at most R+1020 bytes.
- Confirmation replacement of null: less than 64 bytes.
- Three state-string changes: at most 33 bytes.
- reservationBytes changing from 0 to at most 268435456: at most 8 bytes.

Thus growth is less than R+1125, strictly below the reserved R+2048.
Body/base64 lengths, IDs, bindings and budgets remain immutable after admission.
The pure validator checks a journal's reservation against its original shape and
rejects a record exceeding it. S2/S3 must enforce immutability between revisions;
a standalone codec cannot establish past state or authenticity.

For a store, reservedBytes is the exact serialized empty-envelope length plus
each active reservation, each compact receipt/tombstone's actual serialized length,
and one comma between records. remainingBytes is MAX_STORE_BYTES minus that sum.
The 256 MiB bound is an operational store budget, not a name/count/domain cap.
No padding allocation, eviction, TTL or automatic retirement is used. S2 checks
the total under the whole-store commit lock before admission; later admissions
cannot consume existing reservations. S3 transitions must honor retained bounds
and commit failures must never acknowledge a completed change.

## Minimal future repository boundary

This is the behavioral interface for S2/S3, not a runtime export available in S1:

- Open once over an already-owned account-bound ProfileSession, trusted validated
  policy/limits and accepted authenticated read capabilities. Do not provision,
  close/reopen the owner or expose credentials. One coordinator per owner prevents
  stale whole-store caches; per-operation exclusion alone is insufficient.
- withOperation(capturedBinding, createArgs, signal, work) holds exclusive access
  for the whole admission/execution callback. Check current policy/auth before
  private lookup; resolve existing/retired IDs before new visibility/allocation.
  Existing equivalent intent returns its original record; changed intent rejects.
  New operations commit all identities before work receives an admitted handle.
- A handle offers detached snapshot/exact-request reads, recordDispatchPossible,
  recordConfirmation, settleTerminal and compactTerminal. Confirmation plus a
  same-call terminal conflict must be commit-capable atomically; no advancement
  is acknowledged before persistence. T10 supplies validated confirmation facts.
- Repeated dispatch changes no identity; confirmed progress cannot regress.
  Terminal/retired records cannot dispatch again. Compaction is permitted only
  after definitive settlement and preserves stable keyed identity/history/result.
- Trusted retirement atomically replaces evidence with a permanent tombstone.
  T12 supplies warning/authorization; no MCP retirement tool or backend DELETE.
- Callback end, close/invalidation or a stale generation fences handles.
  Cancellation releases exclusion after safe persistence settlement. An ambiguous
  commit fences the repository; it cannot be handled as an absent operation.
  Close never closes the caller-owned profile and no startup action resumes work.

Concrete factory/handle TypeScript signatures and adapters are settled in the
bounded S2 work order when assigned, using these fixed observable requirements.
No additional design campaign or automatic successor follows S1 acceptance.

## Delivered S2 admission API

The [S2 work order](../tasks/t09-s2-work-order.md) settles the additive
`openOperationRepository` factory and the `OperationRepository`,
`OperationRepositoryOptions`, `OperationAdmissionReads`, `AdmittedOperation` types.
The factory is synchronous and performs no storage reads or network calls. It
captures the existing T08 operator config record using that validator and keeps
detached enablement/transport budgets; production config-file composition remains T15.
It requires an already-owned account-bound T04 owner and the binding/listRoutines/
getExercise subset of the accepted T06 facade, with original method receivers.

`withOperation(binding,args,signal,work)` captures complete arguments before
awaiting, checks startup policy and current binding, then holds the operation's
FIFO exclusion until the entire callback and final owner check settle. A bounded
authenticated listRoutines({limit:1}) probes live access before private lookup;
its data/continuation are discarded. Retired IDs reject before digest comparison.
Existing IDs compare the actual T04 keyed digest and skip visibility/allocation.
New IDs check each distinct exercise, then acquire the whole-store lock, reread
the current store, allocate once, enforce all retained reservations and commit
only operationBytes before exposing the handle. Authentication refresh remains
T06-owned and cannot overwrite operation bytes. Exercise404 maps to invalid_reference.

Handle snapshot(), readStep(step), confirmationBaseline() return Promises and
detached values. Each reads through T04 under the store lock to prove current
lease/generation/integrity; checking T04's captured binding alone is insufficient.
The callback result also waits for this owner check. Callback completion,
cancellation or close fences further handle reads. Known safe operation/storage/
session/transport errors retain their types; unknown capability/callback failures
become fixed internal_error. The callback is trusted integration code; reading a
terminal record is not permission to deliver its private result (T11 still owns that).

No whole-store cache is kept. Per-operation exclusion protects callback execution;
the shared store lock protects every read/modify/commit and handle read across
different IDs. Only one facade may claim the same owner object. Nested calls from
its callback reject invalid_arguments to avoid lock cycles. Trusted composition
must share the actual owner object and close this repository when effective policy
or auth is invalidated; it must not manufacture competing owner wrappers.
close() is synchronous/idempotent, aborts queued waits and never closes the owner;
its owner claim is released only after outstanding calls settle. Fresh same-account
generations reopen original durable identity under a fresh owner/facade/current auth.

A begun commit always settles before cancellation/invalidation releases exclusion.
Late cancellation suppresses work/success but does not erase committed admission.
Definite T04 precommit failures preserve their safe StorageError and no handle is
acknowledged. commit_ambiguous or an unknown commit failure permanently fences
the repository and that owner object; constructing another facade cannot treat
uncertainty as absence. The caller must close/reopen the actual T04 owner and use
only T04-authorized current evidence. No startup action continues an operation.

S2 delivered no state-transition, settlement, compaction or retirement methods.
Exact commands/artifact identity and verification limits remain in its historical
evidence/handoff. S3 extends the API below under the same locks/fences.

## Delivered S3 transitions and trusted retirement

The [S3 work order](../tasks/t09-s3-work-order.md) defines the additive persistence
methods; the store/journal/receipt/tombstone versions and immutable identity format
remain v1. `AdmittedOperation` additionally offers:

- `recordDispatchPossible(step): Promise<void>` marks only the first unconfirmed
  step. Repeating the current pending mark is a no-op; confirmed or terminal work
  cannot dispatch. No network mutation is sent by this method.
- `recordConfirmation(marker,terminal?): Promise<void>` confirms the pending next
  step with exact positive decimal Int64 revision. Repeating the current marker
  with identical revision is a no-op. Optional terminal facts validate against the
  new prefix and commit in the same atomic store update. Repeating that exact
  combined update is also a no-op; earlier/conflicting history cannot replace it.
- `settleTerminal(result): Promise<void>` stores the original sanitized S1 result
  with matching IDs/history and retained budget. Repeated identical settlement is
  a no-op, including after compaction; conflicting replacement is denied.
- `compactTerminal(): Promise<void>` converts a definitive terminal journal to
  its v1 compact receipt. Preserve binding, operation/root IDs, both intent versions,
  keyed digest, retained response budget, last confirmed step and exact result;
  erase request bodies/resource keys. Existing receipts are no-ops. Uncertain
  terminal evidence remains a full journal and cannot compact or dispatch again.

T10 supplies validated confirmation facts, including actual canonical domain
comparison; the journal derives its bounded baseline from admitted bytes plus the
marker. A save whose actual content conflicts can therefore persist confirmed
save history and terminal concurrent_modification atomically. No arbitrary backend
response fields, credentials, body reserialization or revision rounding occurs.

`repository.retireOperation(binding,operationId,signal): Promise<void>` is a
trusted local persistence capability, separate from creation. It authenticates,
locks the operation and replaces only unresolved journals (active or uncertain
terminal) with a permanent tombstone. Repeated tombstone retirement is a no-op;
missing IDs reject recovery_unavailable. Definitive settled outcomes/receipts
remain for profile lifetime and cannot be retired by this primitive. Creation's
writesEnabled flag does not block local erasure; there is no backend DELETE or
exposed MCP/CLI retirement. T12 must supply the warning and explicit trusted action.

Each state-changing call captures inputs before awaiting and performs a fresh
bounded T06 listRoutines auth probe. Under the store lock it rereads/validates
current evidence, verifies the handle's last acknowledged record, computes only
the permitted transition, enforces full-store reservations and commits operation
bytes. The handle advances only after commit acknowledgement. A definite failure
leaves its acknowledged state unchanged; ambiguity fences the repository/owner.
Invalid arguments/state use fixed invalid_arguments/invalid_state; corrupt
persisted evidence remains recovery_unavailable. No new domain limits or eviction.

Callbacks must await handle methods. For safety, the repository also tracks
in-flight handle work: callback end fences queued/unsent changes, waits for begun
commits to settle, then releases operation exclusion/owner claims. Late results
are suppressed without rollback. The final owner read still proves current T04
lease/generation/integrity; there is no cached binding/auth fallback, startup
continuation or automatic mutation. Terminal record access alone does not grant
live-authorized client replay; that policy remains T11.

## Evidence limits

S1 proves deterministic identities, strict representation/state invariants,
copy isolation and finite byte accounting with focused pure tests. It does not
prove cross-process admission, filesystem durability, encrypted persistence,
current authorization/config guards, crash recovery, backend transactions,
real receipt replay or interoperability. These remain S2/S3 and later task gates.
