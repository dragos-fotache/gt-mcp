# T09-S3 — Durable transitions and parent acceptance

**Assigned:** explicit user request on 2026-10-15. **Owner:** primary Codex agent.
**Status:** accepted/closed; parent T09 accepted. See
[review](../evidence/t09-s3-review.md) and [handoff](../handoffs/t09-s3.md).
Accepted S1/S2 remain closed; no automatic T10 successor.

## Outcome and authority

Complete S3 and integrated parent T09 under the
[approved plan](../decisions/t09-plan-and-slices.md),
[S2 handoff](../handoffs/t09-s2.md), [v1 format](../decisions/t09-journal-format.md)
and [proportional testing policy](../decisions/proportional-testing-policy.md).
Authority remains shared draft0.2 creation/tools/authentication and backend v1,
then accepted T03/T04 and local decisions. No contract/schema-version change,
mutation transport, automatic retry/resume, backend-confirmation predicates,
MCP/CLI creation/lifecycle wiring, dependencies or production enablement.

## Settled additive API and behavior

Existing factory/admission/snapshot/request/baseline behavior stays compatible.
Extend `AdmittedOperation` with async persistence primitives:

- `recordDispatchPossible(step): Promise<void>`: only the first unconfirmed step
  may change from unsent to dispatch-possible. Repeating that pending mark is an
  identity-preserving no-op. Confirmed steps cannot dispatch again; terminal,
  compact or retired evidence cannot dispatch.
- `recordConfirmation(marker: ConfirmationMarker, terminal?: TerminalOperationResult)`:
  confirm the pending next step, preserving exact positive Int64 revision text.
  T10 supplies validated facts; no arbitrary backend domain record is stored.
  Exact repeated confirmation is a no-op; conflicting revision/history is denied.
  Optional same-call terminal result validates against the resulting confirmation
  and commits atomically, including confirmed-save/concurrent_modification.
- `settleTerminal(result: TerminalOperationResult): Promise<void>`: validate the
  exact S1 envelope/IDs/history/budget; commit once. Exact repeated settlement is
  a no-op; replacing a terminal result is denied. No further dispatch/confirmation.
- `compactTerminal(): Promise<void>`: replace only a definitive settled journal
  with its v1 receipt, retaining binding/IDs/versioned keyed identity/history/
  original result and retained response budget, erasing bodies/resource keys.
  An existing receipt is a no-op. Uncertain evidence cannot compact.

Extend `OperationRepository` with the trusted local-only primitive
`retireOperation(binding: StorageBinding, operationId: string, signal: AbortSignal): Promise<void>`.
It authenticates and locks the ID without requiring domain arguments or allocating
anything. Only unresolved journals (active or uncertain terminal) may become
permanent v1 tombstones; settled definitive outcomes/receipts remain for profile
lifetime. Existing tombstones are idempotent; missing IDs fail recovery_unavailable.
This local erasure primitive does not require creation writesEnabled:true and
never changes backend data. T12 must provide warning and explicit user action;
no exposed command/tool or per-routine permission scheme is added here.

All state changes validate/capture inputs before awaiting; use current auth via
the accepted bounded listRoutines probe, captured binding, cancellation and actual
T04 owner checks. Reuse operation exclusion and whole-store read/modify/commit
serialization. Validate latest retained evidence and preserve every immutable
field/reservation; update handle state only after durable acknowledgement. Step
progress never regresses. Invalid transition/input is fixed invalid_state or
invalid_arguments; corrupt evidence remains recovery_unavailable. Preserve known
safe boundary errors and sanitized unknown failures.

Begun commits settle even if cancellation/close/callback end arrives. Queued or
unsent changes are fenced after callback end; exclusion/owner claims cannot release
while a handle commit remains unsettled. Late success is suppressed, committed
evidence retained. Definite failures acknowledge nothing; ambiguity permanently
fences the facade/owner object, requiring actual T04 close/reopen. No startup sends.
Terminal snapshot access alone still does not authorize client replay (T11).

## Edit/execution grant and milestones

Scope: `src/operations/`, new focused tests/helpers under `test/unit/t09/` and
`test/fault/t09/`, S3 work order/API note/plan/task/index/verification/evidence/
handoff and current roadmap summaries. Preserve existing sources/tests/evidence,
parked T02, retired T13/T14 and T06 omissions. No manifests/lock/compiler changes,
staging/commits or .pi edits.

Use provisioned Node24.21.0/npm11.19.0 via T01_NODE_HOME. Permitted: scoped reads/
edits, syntax/types/lint/format/build, exact Vitest selections; npm ci --ignore-scripts
only in a clean disposable source snapshot for final reproduction. No target
rebuild/install during tests. Isolated synthetic fixtures only: existing diagnostic
T04 facilities/faults, fresh private DBus/Secret Service with temporary HOME/XDG,
verified ext4 roots, private-CA loopback HTTPS and child-process restart checks.
Qualify/reap/remove owned fixtures; never use personal/live facilities or credentials.

Milestones: contract; transitions/early static checks; focused persistence/restart/
fence/minimization checks; review and complete active T09/relevant regressions;
clean locked source snapshot install/four production checks/identical build and
complete selected replay; exact evidence/handoff. Target60–90 minutes, checkpoint
at90 and stop at120 with honest partial disposition if acceptance remains.

## Proportional verification and stopping

- A small local table covers step ordering/idempotence, terminal immutability,
  atomic confirmation+terminal, exact Int64, no compaction of uncertainty and
  callback/commit cancellation or closure. Reuse S2 fixtures and S1 format oracles.
- Real diagnostic persistence/reopen checks retain exact alternate body bytes/keys
  through pending/confirmed/terminal/receipt/tombstone states; one definite and one
  ambiguous transition fault; actual generation/corruption/missing-key/stale-restore
  denial with existing T04 regressions. Real production provider/HTTPS composition
  remains the unchanged S2 integration gate; add only necessary S3 boundary checks.
- Parent final: all active T09 files, unchanged S2 final T03/T04/T06/T08 regressions
  plus relevant T04 stale-anchor/key-facility checks. Four production checks and
  scoped new-test lint/format/syntax. Stable source/artifact hashes, clean locked
  snapshot full selected replay and emitted artifact comparison. No whole-repo,
  live backend/Google/Android/named-host/power-loss or release claims.

Stop/escalate contract conflicts, required cross-task API changes, unbounded
capacity or missing isolated facilities. Do not weaken old tests/contracts or
mask failures. Deliver accepted or honest partial T09 with exact paths/commands/
results/versions/limits; no automatic T10 assignment or external release approval.
