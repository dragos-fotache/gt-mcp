# T09 — Operation journals: plan and bounded slices

**Status:** S1 [accepted](../evidence/t09-s1-review.md), S2
[accepted](../evidence/t09-s2-review.md), S3 and integrated parent T09
[accepted](../evidence/t09-s3-review.md) on 2026-10-15. All T09 work is closed.
No automatic T10 successor or product creation enablement.
**Owner:** primary Codex agent; optional bounded subagents at its discretion
under the [working policy](../agent-coordination.md).
**Sequence:** S1 -> S2 -> S3 -> parent T09 acceptance. No automatic successor.

## Outcome and limits

T09 supplies the private, durable operation repository used by later routine
creation. Before a mutation can become eligible for dispatch, one admitted
operation has fixed routine/child IDs, three resource keys and all exact request
bytes. Explicit repeats resolve that original evidence rather than reconstructing
or replacing it.

T09 does not send mutations, implement backend response-confirmation predicates,
perform automatic retries/resume, expose MCP creation, or add trusted lifecycle
commands. T10 owns dispatch/confirmation decisions; T11 owns recovery orchestration,
live-authorized terminal replay and settlement/minimization policy; T12 owns
operator retirement/profile cleanup; T15 owns production MCP/config wiring.
T09 provides their persistence primitives and contracts. Existing create_routine
remains unavailable even with writesEnabled:true throughout T09.

## Authority and accepted dependencies

Normative authority remains in the order in AGENTS.md:

- Shared MCP draft0.2 [routine creation](../../shared-docs/docs/mcp-contract/routine-creation.md),
  [tools](../../shared-docs/docs/mcp-contract/tools.md),
  [authentication](../../shared-docs/docs/mcp-contract/authentication.md) and
  [acceptance scenarios](../../shared-docs/docs/mcp-contract/acceptance-scenarios.md).
- Backend v1 [request identity](../../shared-docs/docs/backend-contract/service-protocol.md#direct-resourcecommand-requests),
  [domain rules](../../shared-docs/docs/backend-contract/domain-rules.md) and
  [OpenAPI](../../shared-docs/docs/backend-contract/openapi.yaml).
- Approved local [config-only policy](routine-creation-config-policy.md),
  [T03 schema/codec specification](t03-approved-schema-codec-spec.md),
  [T04 storage specification](t04-approved-storage-spec.md),
  [verification matrix](../verification.md) and
  [proportional testing policy](proportional-testing-policy.md).

T03 and T04 are accepted prerequisites, not stubs. Reuse normalizeIntent,
intentIdentityMaterial and buildRoutineInput from the T03 public entry. Reuse
T04's ProfileSession, operation-store bytes, keyedIntentDigest, atomic commit,
exclusive profile ownership and external generation fence. Do not introduce
another key store, lock daemon, per-operation file layout or persistence engine.
T06/T07/T08 are accepted integration context: use current auth/session fences and
trusted configuration semantics; preserve their behavior and historical omissions.

The proposed OperationRepository in src/contracts/index.ts is a T01 placeholder,
not the settled concrete implementation API. Add the concrete module separately;
do not widen or rewrite historical foundation types to make it fit.

## Common behavior and integration contract

These observable boundaries apply to all slices; private functions and concrete
TypeScript structure remain implementation choices.

**Module and ownership.** Use an additive src/operations/ public entry, emitted
as dist/operations/index.js plus declarations. Imports are inert. A repository
uses one already-owned, account-bound T04 ProfileSession and does not provision,
close, reopen or reacquire that owner. One repository coordinates operation-store
updates for that owner; duplicate facades cannot maintain competing stale caches.
The binding and all input/returned bytes are detached snapshots.

**Two bindings.** Durable evidence belongs to origin/account/profileGenerationId.
sessionGeneration fences each invocation/handle, not the retained intent or key.
Same-account trusted reauthentication can later reopen original evidence under
the new current generation. Foreign bindings cannot inspect/adopt it; old handles
cannot continue after a generation change.

**Trusted guards.** The repository receives a trusted detached configuration
snapshot plus a mandatory current-auth/binding check capability and authenticated
exercise-visibility precheck capability. These are local composition inputs,
never MCP arguments, client metadata, environment enablement or credential
records. Reuse the accepted strict config semantics: writesEnabled omitted/false
denies with configuration_required; nonboolean/invalid config fails closed.
No permissive fallback guard or second permission source is allowed.
Production file loading/composition remains T15 work; do not invent a second
config schema or expose an enablement flag.

For the real S2 composition, establish current authentication with one bounded
authenticated listRoutines call at limit=1 through the accepted T06 facade.
Discard its domain data; an empty page is valid, and never follow its continuation.
This uses an existing authenticated read without depending on exercise visibility
or an existing routine. Recheck the captured owner/binding before committing.
New-operation visibility uses authenticated getExercise for each distinct
reference. Reuse T06's bounded refresh behavior rather than exporting credentials
or inventing a cached authentication boolean. No new auth API is assumed.

Config is a startup snapshot, matching accepted T08 semantics; no watcher/reload.
Close/invalidate fences the repository when effective policy or ownership changes.
Check auth/current binding and cancellation again after awaited prechecks and
before an admission commit or state mutation. T10/T15 must also enforce current
effective policy/auth immediately before any remaining unsent network mutation.

**Admission order.** Validate/capture the complete create arguments before any
asynchronous work; check current policy/auth before private lookup or admission.
Under exclusive operation access, resolve retired/existing evidence before new
exercise checks/allocation. Retired IDs always fail recovery_unavailable, including
changed otherwise-valid intent. Existing equivalent intent opens original
evidence; changed normalized intent fails operation_id_reused, including after
terminal rejection. Existing repeats do not fail merely because an exercise is
no longer visible; recovery/terminal authorization belongs to T11.
Only new IDs run visibility prechecks, then allocate/freeze/commit. Failed local
validation/auth/config/visibility checks reserve no operation or root. Define no
extra error precedence for simultaneous unrelated faults.

**Identity and bytes.** Use T03 intent version gymtracka-create-intent-v1 and
T04 DIGEST_KEY_VERSION gymtracka-digest-v1. Keyed-digest input is UTF-8 of the
intent version, one zero byte, then T03 canonicalJson. Persist both versions and
the digest; no unkeyed content hash or credentials. Freeze new bodies once:
draft POST /v1/routines with {id}; populate PUT /v1/routines/{id} with T03's
complete RoutineInput; save POST /v1/routines/{id}/save with {name}.
Retained reads/replay use stored bytes, never current argument serialization.

Allocate canonical UUIDs once: root/entry/set family all distinct, consecutive
zero-based positions, repeated references still distinct children, and three
distinct resource keys. Validate generated values/collisions before commit;
bad allocation fails without reservation rather than repairing an admitted
identity. A backend id_collision later never regenerates the root.
Different operationIds intentionally create different journal identities even
for identical normalized content; no fuzzy/content deduplication.

**Store and format.** Select and document explicit operation-store/journal version
1, with separately versioned intent/digest identities. Represent exact body bytes
losslessly (for example canonical base64 inside strict UTF-8 JSON); validate
versions, duplicate keys, bindings, IDs, routes, body consistency, step order and
state consistency on open. Persist through T04 commit({operationBytes}) only;
never replace vault bytes during journal work or dump operation data to logs.
T04's authenticated initial zero-length operation payload is an empty logical
store, not a missing filesystem store. Physical loss/reset/stale restore must
fail T04 fencing; incompatible or damaged nonempty T09 payloads fail closed,
never reset to empty or allocate replacements.

**Concurrency.** Hold exclusive per-operation access across the future caller's
whole admission/execution callback, released in finally after durable settlement.
Serialize whole-store read/modify/commit across different operations as well:
per-operation locks alone cannot protect T04's opaque whole-store payload.
T04 profile ownership excludes competing processes; a second process fails
ownership acquisition, then can explicitly reopen the original journal after
release. Do not build a multiprocess request broker to make both owners succeed.

**Capacity and persistence failures.** Account for MAX_STORE_BYTES (256 MiB)
across the full store and reserve required future journal/confirmation/terminal
metadata headroom for every admitted operation. S1 must document a finite
encoding-aware bound using the selected record shape and accepted transport
budgets; S2 enforces the sum under the store commit lock. Later admissions may
not consume earlier reservations. No new domain count/name caps, eviction, TTL,
automatic retirement or pretending capacity failure is invalid input.
Use request_too_large for a request exceeding the published operational request
budget; local store exhaustion is a safe internal/storage failure, never success.
If a finite reservation cannot be established, hold admission work and escalate
that specific design issue before implementing it.

Commit failure never acknowledges admission or a state transition. Definite
precommit failure and ambiguous commit must remain distinguishable internally;
uncertainty fences the repository until supported explicit recovery. An ambiguous
attempt must not be treated as an absent ID permitting fresh allocation.
Reopening uses only T04-authorized current evidence. Keep diagnostics sanitized.

## S1 — Versioned journal format and immutable request identities

**Prerequisite:** accepted T03/T04. **Outcome:** deterministic, validated operation
records and lossless round trips, with no admission, storage effects or dispatch.

- Define the active journal, ordered step identities/state, compact terminal
  receipt and permanent retired tombstone shapes, plus strict version handling.
- Reuse T03 normalization/builders; allocate and freeze identities/bodies for a
  new candidate only. Define detached ownership/copy behavior.
- Specify the minimal future repository boundary: guarded admission under an
  exclusive operation callback; snapshot/exact-step reads; durable dispatch and
  confirmation records; terminal settlement/compaction; trusted retirement.
- Define allowed transitions: unsent -> dispatch-possible -> confirmed in order.
  Dispatch-possible is conservative unresolved uncertainty; exact re-dispatch
  leaves identity unchanged. Pending work survives restart, with no startup sends.
  Keep lastConfirmedStep monotonic. No later dispatch after terminal/retired.
- Specify a confirmation baseline containing exact revision and domain state
  needed by T11 advisory comparison, without credentials or unrelated labels.
  T10 supplies semantically confirmed data; T09 validates storage invariants.
  Bound this baseline by the admitted writable domain/IDs plus draft state and
  an exact positive Int64 revision; do not retain arbitrary additive response
  fields or growing response history. A changed-content save is terminal in T10,
  not a reason to store an unbounded new active baseline. Size sanitized terminal
  fields against the accepted response budget, with retained operational bounds
  documented for repeats so later config changes cannot defeat the reservation.
- Settle encoded capacity/headroom accounting and safe error mapping in the
  journal-format note before S2 begins.

**Small verification:** focused specification-derived unit tables for normalized
equivalence/difference, null/zero/empty/repeated references, generated family
collision/positions, three fixed body shapes, byte round trips and unsupported/
invalid format. Reuse T03 regressions rather than duplicating its whole validator
matrix. Early type/lint/format/build checks.

**Deliverable/stop:** journal-format/interface note, additive pure code and focused
tests; an exact S1 acceptance/handoff. No usable admission or creation claim.

## S2 — Guarded durable admission and exclusive operation access

**Prerequisite:** accepted S1. **Outcome:** one committed journal per admitted ID,
safe equivalent/conflicting repeats and serialized updates across operations.

- Compose the existing T04 owner, trusted policy/auth guards and injectable
  authenticated visibility prechecks; no mutation transport capability.
- Implement new/existing/retired admission semantics and versioned keyed-intent
  comparison. Allocate only after successful new-operation prechecks.
- Commit all three identities/bytes atomically before returning an admitted
  handle. Enforce reserved capacity and distinguish failed/ambiguous persistence.
- Implement same-operation callback exclusion, whole-store commit serialization,
  owner/binding invalidation, cancellation and safe handle release.
- Reopen/validate existing evidence without rewriting bodies or key versions.

**Small verification:** one real isolated storage/provider admission and reopen;
same-ID simultaneous equivalent/conflicting calls; different-ID concurrent
admissions proving no lost update; representative config/auth/visibility failure
with zero reservation; a capacity boundary; stale-generation denial; a second
process denied ownership and later reopening the same committed identity.
Use a simple auth/visibility fake for local decision tables, and an existing
isolated authenticated HTTPS read fixture for the guard/precheck composition.
Do not claim live backend authentication from a fake.

**Deliverable/stop:** guarded repository, integration tests and exact admission/
locking/capacity/error documentation. T10 execution is still unavailable.

## S3 — Durable state transitions, restart proof and parent acceptance

**Prerequisite:** accepted S2. **Outcome:** repository persistence primitives are
ready for T10/T11/T12, with final integrated T09 acceptance.

- Implement durable dispatch-possible/confirmation transitions and current
  handle/binding fences. Store confirmed comparison baseline losslessly.
- Implement terminal-result persistence and an atomic compaction primitive:
  retain binding, operation/root IDs, intent/digest versions and keyed digest,
  confirmed history and sanitized original terminal result; erase settled bodies.
  T11 decides settlement and live-authorized delivery; repository reads alone do
  not authorize replaying a private result to a client.
- Implement the trusted retirement persistence primitive/tombstone: permanent
  ID reservation, body erasure, subsequent recovery_unavailable. T12 owns the
  warning/command/authentication flow; no model-facing retirement or DELETE.
- Reject malformed/missing/incompatible state and stale handles; preserve T04
  missing-key/anchor/stale-restore fences. No automatic repair or resume.
- Run complete active T09 owning checks and relevant unchanged regressions,
  clean locked reproduction and record the exact accepted artifact/limits.

**Small verification:** persist/reopen representative active, uncertain, confirmed,
terminal and retired states; confirm exact bytes/keys across close/restart and
mutation of returned byte copies; reject out-of-order transitions. Inject one
definite precommit failure and one ambiguous commit at the repository boundary
using existing T04 facilities. Check no acknowledgement/continuation, stale/
corrupt evidence denial, receipt repeat identity and changed-intent rejection.
A focused body-minimization check verifies no domain body/credential fields in
compact receipts or tombstones. Storage ciphertext inspection stays synthetic.

R01 at each of the three mutation steps, response-loss/retry semantics, actual
saved receipts and real backend/Android effects remain T10/T11/T16 gates.
T09 proves their durable state substrate, not that those later workflows passed.

**Deliverable/stop:** T09 accepted or honestly partial/blocked, with module/API,
format versions, reservation arithmetic, commands/results, changed paths and
remaining integration requirements. No automatic T10 assignment.

## Requirement traceability

| Slice | T09 proof                                                                                  | Later proof remains separate                                                          |
| ----- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| S1    | C02/C06/C12 intent, generated identities and immutable bytes                               | T10 confirmations; T15 actual tool mapping                                            |
| S2    | C03/C04 pre-admission guards, C06/C07/C08 admission/concurrency                            | T15 config entry paths; T16 backend reference races                                   |
| S3    | R01 stored-before-send substrate, R11 journal integrity, R12 receipt/retirement primitives | T11 per-step crash/replay/minimization orchestration; T12 lifecycle; T16 real effects |

These are partial scenario contributions, not whole-scenario acceptance claims.
C09/C12 integration and all real interoperability/release gates remain with their
existing owners in the verification matrix.

## Scope, commands and acceptance cadence

The original request authorized planning only; the user subsequently assigned
S1, S2 and S3 separately, now accepted/closed under their
[S1 work order](../tasks/t09-s1-work-order.md) and
[S2 work order](../tasks/t09-s2-work-order.md) and
[S3 work order](../tasks/t09-s3-work-order.md). Parent T09 acceptance is recorded;
no T10 implementation grant follows.
When a later slice is explicitly assigned,
record its actual edit paths and isolated execution grant before work.
Expected implementation paths are src/operations/, test/unit/t09/,
test/fault/t09/, a focused T09 fixture/helper under test/, and T09 docs/evidence.
Reuse existing fixture capabilities without a generalized framework.
Changes outside those paths require a named integration need and bounded scope;
no dependencies, manifest/lock/compiler changes or old experiment cleanup are
planned. Never alter shared contracts, historical evidence or accepted assertions
to make new code pass.

Use provisioned Node24.21.0/npm11.19.0 via T01_NODE_HOME, never system Node.
Early checks are npm run typecheck, npm run lint:production,
npm run format:check:production and npm run build, plus scoped test-source
lint/format checks. Use npm exec --no -- vitest run with exact nonempty owning/
regression file selections; no empty argv whole-suite accident. Use focused runs
during repair, complete active slice checks at slice acceptance, then the full
active T09 suite at parent acceptance. Record exact filenames when they exist.

Final relevant regressions include unchanged T03 intent/write projection, T04
operation persistence/ownership/digest/generation, T06 auth/refresh/generation
operation-byte preservation, and T08/T07 unavailable-creation/read/login
boundaries where touched. Choose exact files by these risks, not a whole-repo
matrix. Finish with npm ci --ignore-scripts and four production checks in a clean
locked source snapshot, then the complete T09 owning replay plus selected
regressions on stable outputs; compare source/artifact identities.
No rebuild/install races tests. Missing required fixtures are blockers, not skips.

Each slice targets a 60–90-minute window, checkpoints at 90 minutes and stops at
two hours with a safe handoff if unfinished. These are planning windows, not
completion promises; focused continuations need separate authorization.
Escalate contract conflicts, inability to bound reserved capacity, missing
isolated provider/ext4/HTTPS facilities, or a required cross-task API change.
Continue unrelated authorized work while affected work is held.

No personal/live service, Google/browser/Android session, real credentials,
actual product write, .pi/settings edit, staging/commit or release is authorized.
Only explicitly isolated synthetic fixture writes may be granted for a slice.
T02 remains parked; T13/T14 remain retired; T06 omissions and all real external
review/interoperability/release gates remain recorded and required.
