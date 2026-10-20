# T10 — Creation steps: design and bounded slices

**Disposition (2026-10-15):** user-requested design/planning complete. The user
subsequently assigned [S1](../tasks/t10-s1-work-order.md), now
[accepted/closed](../evidence/t10-s1-review.md). The user subsequently assigned
[S2](../tasks/t10-s2-work-order.md), now
[accepted/closed](../evidence/t10-s2-review.md). The user assigned [S3](../tasks/t10-s3-work-order.md), now
[accepted with integrated parent T10](../evidence/t10-s3-review.md).
All T10 work is closed; T11 remains unassigned, with no automatic successor.
Original proposed sequence:
S1 confirmation decisions -> S2 durable single-step execution -> S3 fresh workflow
and integrated parent acceptance. Assign slices separately; no automatic successor.

## Task contract and authority

Deliver the internal draft/populate/save engine on the accepted T05 transport,
T06 authenticated session and T09 operation repository. Send only the original
journal requests and persist truthful confirmed history and terminal outcomes.
T05, T06 and T09 are closed prerequisites; preserve T06's recorded verification
omissions and T04's unsupported whole-protected-state restore limitation.

Authority, in order: shared MCP draft0.2
[creation](../../shared-docs/docs/mcp-contract/routine-creation.md),
[tools/errors](../../shared-docs/docs/mcp-contract/tools.md) and authentication;
backend v1 [OpenAPI](../../shared-docs/docs/backend-contract/openapi.yaml),
[direct identity/errors](../../shared-docs/docs/backend-contract/service-protocol.md)
and [routine rules](../../shared-docs/docs/backend-contract/domain-rules.md);
accepted foundation/implementation decisions; local architecture and verification.
Reuse the [T09 handoff](../handoffs/t09-s3.md),
[delivered API](t09-journal-format.md#delivered-s3-transitions-and-trusted-retirement)
and [proportional testing policy](proportional-testing-policy.md).

Non-goals: T11's resumed multi-step orchestration, extra retry policy, terminal
replay authorization/delivery and compaction policy; T12's trusted lifecycle;
T15's MCP/config-file wiring; T16's real backend/DB/Android interoperability.
No automatic startup continuation, rollback/delete, sync/push fallback, new roots
on failure, custom exercises, workout mutations, permission extension, dependency
or persisted format change. Product create_routine remains unavailable.

## Composition and internal interface

Add `src/creation/index.ts` as an inert internal library entry. Keep T09 persistence
in `src/operations/`, accepted auth in `src/auth/`, transport in `src/http/` and
lossless validation in `src/domain/`. No credentials or response bodies enter new
errors, logs, journal fields or checkpoint events.

Settle these observable capabilities before dependent implementation:

- A pure confirmation evaluator takes an active journal, selected stored request
  and T05 `MutationResult`. It returns confirmed revision, confirmed-save conflict,
  or uncertain response. Reuse T03 lossless decoding of `rawBodyBytes`; do not
  parse a revision through JavaScript Number or serialize projected revision
  strings back into a pretend wire response. Compare the result's status,
  routeLabel and resourceKey with the selected fixed step. Expected domain state
  comes from the validated stored populate body, never current invocation args.
- `createCreationExecutor({session, checkpoints?})` captures the accepted T06
  binding/getRoutine/createDraft/populateDraft/saveRoutine capability subset with
  original receivers. Construction/import performs no IO. No arbitrary sender,
  URL/header/token provider, config override or second permission system.
- `executeNextStep(binding, handle, signal)` operates only inside the caller's
  awaited `repository.withOperation` callback. It selects the first unconfirmed
  step and performs at most one T06 mutation-method call. A pending step uses the
  original request without an advisory GET; an unsent dependent step first checks
  its confirmed baseline. Confirmed steps are never resent. Terminal/receipt/
  retired records do not dispatch or deliver their stored private result.
- `executeFresh(binding, handle, signal)` requires an active, nonterminal journal
  with all three steps unsent and no confirmation at entry. It calls the same
  single-step executor sequentially, stopping on any failure. Existing progress
  is rejected with internal invalid_state before mutation; T11 will select and
  drive explicit recovery using executeNextStep. Fresh means pristine journal,
  not permission to allocate a replacement operation.

Single-step results discriminate confirmed progress (draft/populate), a durably
settled terminal result, and a stopped attempt with a sanitized typed error.
Fresh execution returns the newly persisted saved result or the stopped/terminal
failure. Every post-admission error carries operationId, routineId,
lastConfirmedStep and outcomeUnknown from authorized captured history. Preserve
the shared retryable/code/backendErrorCode/Retry-After semantics; no new MCP code.
Known storage/auth/operation failures keep their safe classification. Unknown
exceptions become fixed internal_error, with conservative uncertainty after a
possible dispatch. Never substitute an acknowledgement for a failed commit.

Exact TypeScript representation/private helpers may be chosen in S1/S2 within
these semantics. No further architecture proposal is a prerequisite. An interface
change that alters these behaviors must update this contract before dependent work.

The repository already guards admission, live access, ownership and operation
exclusion. T10 never admits outside that boundary or reacquires/closes a profile.
Trusted composition must share the actual T04 owner/T06 session, close the T09
repository on effective policy/auth invalidation, and abort active execution.
Recheck signal/binding and a current handle read before dispatch; callbacks await
all persistence calls. No caller-supplied boolean can authorize a mutation.
T15 must prove effective config-disablement through this composition; no hot reload
is implied and an already dispatched request cannot be retracted.

## Confirmation decisions

| Step                      | Required confirmation                                                                                        | Otherwise                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| draft                     | 201, complete valid same-root Routine, name empty, isDraft=true, no exercises, valid positive Int64 revision | Uncertain; no confirmation or populate                       |
| populate                  | 200, complete valid same-root draft, exact admitted name/entries/sets/domain values and identities           | Uncertain; no confirmation or save                           |
| save                      | 200, complete valid same-root non-draft, exact admitted domain content                                       | Confirm save and saved result atomically                     |
| save with changed content | 200, complete valid same-root non-draft, differing admitted domain content                                   | Confirm save and terminal concurrent_modification atomically |

Malformed/incomplete records, wrong root, wrong status/route/key or invalid draft
state cannot confirm any step. A structurally valid saved record with changed
child IDs/order/values is a saved-content conflict; it is distinct from a malformed
or unrelated-root reply. Domain comparison includes root/entry/set IDs, exercise
references, positions, name, rest, repetitions and weight. Preserve array order,
repeated references, nulls, zeros and defaults. Use declared Int32/finite-double
semantics and T03 canonical ordering; ignore derived exerciseName/convenience
fields for identity while still requiring a valid canonical Routine shape.
Revision is exact valid positive Int64 text; do not invent consecutive-revision
or compare-and-swap requirements. Retain only T09's marker/baseline, not raw replies.

An authorized fresh GET before each unsent populate/save compares root, revision,
draft state and domain values with `handle.confirmationBaseline()`. Deleted or
changed state settles concurrent_modification without sending that mutation.
Other GET failures stop without a new mutation or fabricated confirmation.
This deliberately covers the fresh path too; T11 reuses it for unsent continuation.
GET never settles an already-dispatched uncertain step. The check is advisory:
another client may edit afterward; no backend CAS or account-wide lock is claimed.

## Single-step ordering and failure rules

1. Validate current active snapshot/prefix, binding and cancellation; read the
   selected method/route/body/key through the handle. Verify the concrete route
   is exactly the corresponding fixed T06 method target; never dispatch an
   arbitrary persisted URL. For unsent populate/save, perform the baseline check.
2. Await `recordDispatchPossible(step)` before invoking T06. Recheck the signal
   and current handle before the send. Pass detached original bytes and original
   key to createDraft/populateDraft/saveRoutine with the captured binding.
3. Evaluate the delivered reply. Await confirmation before allowing the next
   step. Save success or saved-content conflict uses
   `recordConfirmation(marker, terminal)` to avoid a confirmed-save/result gap.
4. Return only acknowledged history. A failed/ambiguous confirmation commit stops
   all later dispatch; T09's owner fence remains authoritative. Never continue
   through the same ambiguous owner or rebuild evidence from a GET.

T05 already has bounded wire retries and T06 owns its one 401 refresh/retry.
T10 adds no outer retry loop, sleep or new attempt budget. Exact bytes/keys must
remain stable through those accepted attempts. Content mismatch discovered above
T05 stops with retryable internal_error and outcomeUnknown=true, leaving the
active journal available for T11's explicit exact replay. It is not settled as a
permanent malformed-response outcome.

Permanent backend domain/identity rejection stops and persists the sanitized
terminal result before return; no remaining step is sent. Preserve backend codes,
including safe unknown permanent codes as backend_error. An idempotency mismatch
is an integrity stop, never permission to replace a key or root. Never clear
T05's sticky uncertainty merely because a later reply is 4xx: uncertain terminal
failures retain full evidence and cannot compact. Entry into a previously pending
step also preserves prior possible-dispatch uncertainty unless a valid exact
success confirms it. Definitive domain rejection and transient/auth/throttle/
local-preflight failures are different; the latter do not become durable backend
domain rejections or free the operation ID. Auth/transient/cancellation stops leave
active evidence for T11; request/result size limits remain explicit failures.

Cancellation/fencing stops unsent work. Begun commits must settle under T09's
existing discipline; late cancellation cannot roll them back or justify success
delivery. If a terminal result was already committed, do not overwrite it with an
interruption. A transport-local definite predispatch failure need not claim an
actual backend commit, but dispatch-possible evidence must remain intact.

Optional trusted checkpoints contain only step and phase: after dispatch marking,
before the T06 call, after response receipt/before confirmation, and after durable
confirmation. They are awaited and default absent; no body/key/credential payload.
Checkpoint failure stops execution and retains the last acknowledged evidence.
Reuse T04's existing fault facility for commit failures. T11 can use these narrow
boundaries for its required per-step crash matrix without a new general harness.

## Bounded slices and acceptance

Each slice targets a 60–90-minute window, checkpoints at 90 minutes and stops by
120 minutes with an honest handoff. These are work limits, not completion promises.
Default to one slice per context and assign the next slice separately.

### S1 — Confirmation and error decisions

Deliver inert creation entry/types and the pure evaluator/classification rules.
No execution facade, mutation, persistence changes or workflow yet. Settle the
terminal-versus-active error table against accepted T05/T06 metadata and T09
terminal types, without broadening their contracts.

Small specification-derived unit tables cover each valid step; representative
status/root/state/content mismatches; saved-content conflict; exact revisions
above 2^53/Int64 max and invalid precision; labels excluded from identity;
null/zero/default/repeated-reference/order behavior; permanent rejection versus
sticky uncertainty. Use T03/T05 synthetic fixtures and independently authored
expected fields, not a copy of the production comparator. Do not retest all T03
decoder permutations. Run early types/lint/format/import resolution and the full
active S1 suite before handoff. Stop with no dispatch capability claim.

### S2 — Durable single-step execution

Requires accepted S1. Deliver executeNextStep with fixed T06 calls, original-byte
identity, unsent baseline guard, ordered persistence, terminal settlement, error
context, fences and narrow checkpoints. It may replay one pending step only when
explicitly invoked by trusted orchestration; it never loops through recovered work.

Verify actual T09 persistence plus the T06/T05 boundary using small isolated
fixtures. Cover dispatch mark failure -> zero mutation; confirmation failure ->
zero dependent mutation; one ambiguous commit -> owner fenced; exact bytes/key
including alternate JSON spelling; representative permanent populate/save failure;
uncertain reply; valid changed-content save with atomic terminal state; advisory
change/deletion; cancellation and binding fence. Combine related assertions in
meaningful scenarios. A close/reopen check preserves pending original identity;
opening alone sends nothing. Full per-step crash/recovery permutations remain T11.

Use diagnostic storage for targeted fault control and real private-CA loopback
HTTPS for wire claims. Complete active S1/S2 checks and relevant unchanged T09/
auth/transport regressions. Do not call a scripted HTTPS responder the real backend
or claim production creation, terminal replay delivery or whole recovery acceptance.

### S3 — Fresh three-step workflow and integrated T10 acceptance

Requires accepted S2. Deliver executeFresh and finish integrated parent evidence.
Compose through actual guarded T09 admission and the same owner/session. Verify
exact POST draft -> PUT full draft -> POST save bodies/keys, one root/child family,
confirmed-before-next-send, and one persisted saved result. Reject existing
pending/confirmed/terminal progress before dispatch through this fresh-only path.

Use one real isolated production Secret Service/ext4/T06/private-CA HTTPS
composition with synthetic credentials/data, reusing T09/provider/T05 helpers.
Include a visibility race (precheck passes, authoritative populate rejects), a
saved-content race, and durable-result-before-return/reopen evidence. The responder
asserts independently expected requests and responses; no live backend/DB/phone
claim. Reuse S2 faults rather than creating a new integration framework.

Parent acceptance requires all active T10 tests, selected relevant unchanged
regressions, production checks, clean locked source-snapshot install/build and
the same complete owning/selected integration replay against stable artifacts.
Compare emitted artifacts and record exact selections/results/input identities.
No skipped or waived case is a pass. State outstanding T11/T12/T15/T16 gates.

## Verification scope, commands and deliverables

Planned source scope: new `src/creation/`; focused tests under `test/unit/t10/`
and `test/fault/t10/`; small T10-only fixture additions; T10 task/work orders,
decision/evidence/handoffs and current index/roadmap/verification summaries.
Reuse dependency helpers unchanged. Any necessary T09/auth/http/domain API change
must be reviewed and added explicitly to the affected slice contract first.
No shared-doc, manifest, lockfile, compiler, dependency, .pi or parked-source edits.

On assignment use provisioned Node24.21.0/npm11.19.0 via T01_NODE_HOME, resolving
the existing disposable locator if unset and checking both versions before runtime
commands. Never substitute system Node or install globally. Permitted future scoped
commands: node --check, local ESLint/Prettier, npm run typecheck/lint:production/
format:check:production/build, explicit local Vitest file selections. A clean
disposable snapshot may run npm ci --ignore-scripts for parent reproduction.
No build/install while tests use that target; no lifecycle hooks or masked failures.

Final regression candidates (select exact relevant files at slice pickup): T03
backend-response/lossless-revision/write-projection; T05 results-decode/errors-
uncertainty/replay-identity; T06 S4 refresh-retry/session-fence; the full active T09
owning suite. Add an unchanged provider/commit/anchor regression only for a distinct
integration risk. Do not inherit every old T09 selected regression or rerun the
whole repository by default. Record exact final paths before execution; preserve
all existing tests and mandatory safety requirements.

Fresh isolated fixture scopes are required: private HOME/XDG, DBus/Secret Service,
qualified ext4 root, private-CA loopback HTTPS, synthetic bindings and owned child
processes only. Qualify and tear down/reap owned resources. Missing runtime/provider/
filesystem facilities block affected execution; personal/live substitutes are
forbidden. No real credentials/accounts, staging, commits or product enablement.

Milestones per slice: record assigned work order -> implementation and early
static checks -> focused meaningful checks -> final stable owning/regression run
-> primary specification/source/test review -> sanitized evidence and handoff.
S3 additionally closes clean reproduction and integrated parent acceptance.
Deliver exact commands/versions/paths/results and limitations, accepted interfaces,
remaining work and closed grants. Required independent security/release gates stay
separate; the primary agent's review is not independent certification.

Stop/escalate a shared-contract conflict, a required cross-task change, an error
that cannot retain truthful history within accepted types, missing isolated inputs,
or fixture/harness expansion beyond this bounded scope. Do not weaken contracts,
tests or evidence to meet the window. Report partial/blocked work honestly.

## Planning verification and next action

Planning reviewed the shared creation/tools/backend contracts and actual T03/T05/
T06/T09 interfaces, including raw mutation replies, sticky uncertainty and atomic
confirmation+terminal support. Documentation checks passed: provisioned
Node24.21.0/npm11.19.0 version checks, Prettier on this new plan, all 15 local
link targets in this plan/task, and git diff --check. No production build or
behavioral suite ran; no implementation or parent acceptance is claimed.
The user subsequently assigned S1; its delivered pure interface and evidence are
recorded in the [work order](../tasks/t10-s1-work-order.md),
[review](../evidence/t10-s1-review.md) and [handoff](../handoffs/t10-s1.md).
S2 subsequently delivered the execution factory/executeNextStep and its types;
its [work order](../tasks/t10-s2-work-order.md), [review](../evidence/t10-s2-review.md)
and [handoff](../handoffs/t10-s2.md) record exact semantics and evidence.
executeFresh, full production-provider composition, clean reproduction and parent
acceptance remain S3 designs. Next assign S3 separately. T11/T12/T15 and all
external/release gates remain unassigned.

## Delivered S3 and integrated parent acceptance

[Acceptance](../evidence/t10-s3-review.md) and
[handoff](../handoffs/t10-s3.md): executeFresh implements the settled pristine-only
workflow using the same internal per-step body as executeNextStep. A module-level
handle guard covers the entire fresh invocation. CreationFreshResult exposes only
new terminal results or stopped errors; cancellation during initial eligibility
read retains captured operation history. No public/persisted contract changes.

Complete active T10 owning94/94 plus selected unchanged regressions88/88 passed
in workspace and clean locked replay; production/scoped checks,345 stable copied
inputs,178 identical emitted outputs and492 identical stable selected hashes PASS.
Actual isolated production Secret Service/ext4/T06/T05 HTTPS covers happy path,
visibility/populate rejection, saved-content race and durable reopen/no startup
sends. Scripted HTTPS is not real backend interoperability. T11/T12/T15/T16 and
external/independent release gates remain separate; product creation unavailable.
