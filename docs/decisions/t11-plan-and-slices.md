# T11 — Recovery, terminal replay and minimization: bounded slices

**Disposition (2026-10-15):** planning complete. The user requested “plan and
split the T11 task”, then “after planning start work at the first slice”.
S1 is [accepted/closed](../evidence/t11-s1-review.md). The user subsequently
authorized “go ahead and do s2 and then s3”: [S2 accepted](../evidence/t11-s2-review.md),
then [S3 and parent T11 accepted](../evidence/t11-s3-review.md).
All T11 grants are closed; no later task is assigned. Product creation is unavailable.

## Task contract

Deliver explicit same-operation recovery using accepted T09 identity/persistence
and T10 dispatch/confirmation, then live-authorized historical terminal delivery
and definitive body minimization. Preserve one root, original requests/keys and
truthful confirmed history across interruption. No startup continuation.

Normative authority: shared MCP draft0.2
[creation](../../shared-docs/docs/mcp-contract/routine-creation.md),
[tools and errors](../../shared-docs/docs/mcp-contract/tools.md),
[authentication](../../shared-docs/docs/mcp-contract/authentication.md); backend v1
[direct request identity](../../shared-docs/docs/backend-contract/service-protocol.md),
[routine rules](../../shared-docs/docs/backend-contract/domain-rules.md) and
[OpenAPI](../../shared-docs/docs/backend-contract/openapi.yaml); accepted foundation
spec/ADR, then local architecture/verification/task files. Reuse
[T10 acceptance/handoff](../handoffs/t10-s3.md),
[T09 transitions](t09-journal-format.md#delivered-s3-transitions-and-trusted-retirement),
[planning policy](../agent-coordination.md#default-primary-agent-decision-ready-task-planning)
and [proportional testing](proportional-testing-policy.md).

Non-goals: new admission/storage formats, UUIDs/keys for admitted work, backend CAS,
rollback/delete, sync fallback, routine editing tools, dependencies, permission
extensions, hot reload, trusted retirement/profile cleanup (T12), MCP/config-file
composition/enablement (T15), real backend/DB/Android interoperability (T16),
host/Google/release certification. Preserve parked T02, retired T13/T14, T06
verification omissions, T04 whole-protected-state restore limits and prior evidence.

## Settled interfaces and behavior

- Add `CreationExecutor.executeRecovery(binding, handle, signal)` in the existing
  inert `src/creation` entry, returning the existing `CreationFreshResult` union
  (new durable terminal outcome or stopped attempt). It requires an active,
  nonterminal journal within an awaited `repository.withOperation` callback.
  It accepts pristine or partially executed journals. Existing executeFresh stays
  pristine-only; executeNextStep stays single-step. Hold the same module-wide
  handle exclusion across the entire recovery invocation and across all facades.
- Select the first unconfirmed step from durable evidence. Pending dispatch is
  replayed using its exact method/route/body/key, without GET settlement; confirmed
  steps are skipped. Before each previously unsent populate/save, reuse T10's live
  GET/revision/domain baseline check. A detected edit/deletion settles conflict
  before mutation; the remaining race is backend last-write-wins, not CAS.
- Reuse T05 deadlines/whole Retry-After within T06's accepted policy: each resource
  leg is capped to one wire attempt, with at most one eligible 401 refresh/retry
  ([T06-S4 work order](../tasks/t06-s4-work-order.md), implementation ADR).
  Add no outer retry loop or reset budget after a stopped step. Transient 500/503,
  network and malformed-reply recovery uses another identical explicit invocation.
  Malformed/mismatched replies stop uncertain and await another identical explicit
  invocation. Timeout/500/503 uncertainty remains sticky until valid exact replay.
  The shared contract sets no minimum retry count; preserve the accepted bound
  rather than multiply per-leg deadlines. The initial plan's reference to T05
  retries did not spell out T06's one-attempt cap; S3 verifies this composition.
- Return only acknowledged durable history. On stop, include authorized operationId,
  routineId, lastConfirmedStep and outcomeUnknown. Cancellation stops unsent steps;
  begun commits settle safely, and committed results are never overwritten by an
  interruption. Handle/session/owner/policy invalidation never authorizes a send.
- S2 adds `createCreationService({repository, session})` with
  `create(binding, args, signal): Promise<CreationFreshResult>`. The factory is
  inert, captures accepted capability receivers and owns neither profile nor
  session/repository lifecycle. It awaits the real `withOperation` boundary;
  validation, digest comparison, live admission auth and exclusion stay T09-owned.
  It drives active journals through executeRecovery and handles stored terminals.
  Exact readonly TS types/private modules may be chosen within these semantics.
- Before delivering any stored terminal result, perform a fresh bounded authenticated
  `session.listRoutines(binding, {limit:1}, signal)` probe, discard returned data,
  and recheck binding/signal/current owner evidence. It must use the actual T06
  session, not a snapshot or diagnostic auth fake. This also authorizes historical
  receipts when the routine has disappeared; no current-routine GET is needed for
  historical delivery. 401 follows T06 auth recovery; failure reveals no receipt.
- Terminal result is immutable and persisted before reply. Definitive terminal
  journals compact through T09 before service delivery, retaining profile binding,
  operation/root IDs, stable keyed intent/version, last-confirmed history and
  original result; erase bodies and resource keys. On a definite compaction failure,
  stop safely and retry compaction on an identical explicit call. Ambiguity fences
  the owner until actual reopen. Never resend mutations to repair receipt storage.
- Uncertain terminal rejections retain their full immutable evidence and original
  error; they cannot compact or dispatch. No TTL/automatic retirement frees an ID.
  Tombstones remain recovery_unavailable; changed admitted intent remains
  operation_id_reused, including after definitive rejection/receipt. T12 owns
  explicit local retirement/removal and warning UX.

T15 must close/abort trusted composition when effective config/auth changes and
prove the server config guard. No caller boolean replaces that guard. This plan
does not reopen accepted dependencies or enable create_routine.

## Sequential slices

Each slice targets 60–90 minutes, checkpoints at 90 and stops by 120 with a
partial/blocked handoff if needed. One slice per context; no automatic successor.

### S1 — Explicit active-journal recovery

**Prerequisite:** accepted T10. **Disposition:** accepted/closed, primary agent.

Implement executeRecovery on the existing per-step execution body and shared
exclusion. Resume pending/confirmed prefixes, stop on first uncertain/permanent/
cancelled outcome, preserve original identity, and leave terminal replay to S2.
Reject terminal journals/receipts before dispatch or private-result delivery.

Checks: focused public recovery tests for pending replay, confirmed-prefix skipping,
uncertainty/no dependent send, advisory conflict, durable rejection and cancellation;
shared-handle exclusion across recovery/fresh/single-step; one real encrypted-store/
T06/T05 HTTPS reopen-and-explicit-replay check with independent exact-byte oracle.
Use existing T10 fixtures/checkpoints. Malformed response must remain pending after
the first call and settle only by identical explicit replay. No automatic restart IO.

Deliver source/types/exports, scoped tests, review and handoff with exact commands,
versions/artifact identity and unavailable S2/S3 behavior. Accept only with complete
active S1 owning suite and relevant unchanged T10 execution/fresh/retry regressions.
Parent T11 remains incomplete; no historical-result delivery or compaction yet.

### S2 — Authorized terminal delivery and definitive minimization

**Prerequisite:** accepted S1. **Disposition:** accepted/closed, primary agent.

Implement the service boundary above over real T09 admission/exclusion and S1
recovery. New or historical definitive results compact before delivery. Historical
success/rejection stays byte-equivalent in structured fields under fresh live auth,
even after routine deletion. Uncertain terminals retain evidence. Existing digest,
profile/session/ownership fences and stable journal versions remain unchanged.

Checks: actual isolated provider/ext4/HTTPS saved and rejection receipts across
reopen, omitted-vs-explicit defaults equivalent/changed intent rejected, live auth
denial/refresh and session invalidation suppress private replay, deletion preserves
history, bodies/keys removed only after durable settlement; definite compaction
failure and ambiguous fence retain safe recoverability without resends. Use T04
faults, not a new storage simulator. Deliver service API, scoped tests and sanitized
ordering/failure evidence. Run complete active S1/S2 owning and relevant regressions.

### S3 — Per-step crash evidence and integrated parent acceptance

**Prerequisite:** accepted S2. **Disposition:** accepted/closed with parent T11.

Complete the small required boundary matrix for each of draft/populate/save:
admitted-unsent restart, dispatch-persisted-before-wire interruption,
commit/response-loss or malformed response before confirmation, and
confirmation-persisted-before-next-send/result-loss. Parameterize these required
boundaries without cross-multiplying all failure/auth/provider cases. Reuse S1/S2
coverage where it already proves a cell. Include actual separate-process reopen
and no startup sends; process exit/reopen does not prove physical power-loss durability.

Also verify representative confirmation/terminal/compaction write failures, concurrent
identical/changed calls and second-process owner rejection, live session fences,
detected edit/delete and advisory-GET race with confirmed saved-content conflict.
At least one path composes actual production Secret Service/ext4/T04/T09/T06/T05
private-CA loopback HTTPS with synthetic data; scripted responses do not prove real
backend idempotency, DB commits, Android edits or sync. Those remain T16 gates.

Deliver compact requirement-to-evidence matrix, full T11 owning acceptance plus
relevant unchanged regressions, production checks, clean locked reproduction,
stable source/emitted/test identities, primary-agent spec/source/test review and
parent handoff/status updates. Independent security/release review remains open.
Only this integrated acceptance may close parent T11; T12/T15 stay unassigned.

## Scope, commands and verification cadence

All T11 grants are now closed. Authorized S1 edits were `src/creation/`, focused
`test/unit/t11/` and `test/fault/t11/`, minimal T11-specific fixture extensions if
necessary, and T11 planning/work/evidence/handoff/current status documents.
S2/S3 scopes were authorized sequentially by the user above; no shared-contract,
manifest/lockfile/compiler, .pi, staging/commit or dependency changes.

Use provisioned disposable T01_NODE_HOME Node24.21.0/npm11.19.0 for every command;
resolve the existing workflow locator if the environment variable is unset, then
verify versions before Node/npm execution. No global/system changes. Early scoped
syntax/import resolution, typecheck/lint/format; focused repair runs; one stable
final selection, no build/install racing tests. Build only when sources changed.

S1 permitted: existing production checks/build, scoped ESLint/Prettier/node --check
and explicit Vitest selections; read-only import/construction smoke; synthetic
private-CA loopback HTTPS and existing diagnostic encrypted storage. Fresh private
D-Bus/Secret Service with disposable HOME/XDG on verified ext4 is permitted for
the real-provider check, using existing runner/fixtures and owned cleanup only.
No personal/live bus/backend/database/Google/Android/credentials. Qualify facilities,
await cleanup, reap owned processes and remove owned data; stop if isolation fails.

Final S1 selection: all new T11 S1 tests plus T10 s2-executor, s3-fresh,
s2-execution, s3-workflow, T09 s3-transitions/s3-persistence, T05
10-replay-identity and T06 s4-refresh-retry/s4-concurrency-fences. Exact filenames
and commands belong in the S1 work order/evidence. Final parent acceptance adds
complete active T11/T10 owning suites and T09 s1-format/s2-admission plus the
relevant selection above; broaden only for a changed boundary/observed regression.
S3 includes a clean source snapshot, locked `npm ci --ignore-scripts`, four
production checks/build and identical selected replay; not a per-edit ritual.

Mandatory C05/C07 and R01–R10/R12 engine requirements remain covered by this split;
storage R11 remains T04/T09 with integration regression. The S3 evidence matrix
must distinguish local proof from unrun T15 MCP and T16 backend/Android checks.
No skips/waivers counted as passes, exhaustive campaign, generalized harness,
weakening of contracts or hidden exclusions. Each new test needs a named risk and
specification-derived oracle; reuse accepted dependency evidence.

## Milestones and stops

Contract/claim -> S1 implementation/early statics -> focused real recovery checks
-> stable acceptance/review/handoff -> separately assigned S2 -> separately
assigned S3/parent acceptance. Record partial state if the time window ends.
Escalate a specific public-contract conflict, missing isolated facility, unsupported
format need or dependency/interface expansion; hold affected work while continuing
unrelated authorized work. Never invent external inputs or hide a failing check.
No public-contract conflict blocked S1; live receipt/minimization acceptance is S2.

## S1 disposition

[Accepted](../evidence/t11-s1-review.md): executeRecovery shares the existing
workflow body/exclusion and retains fresh-only eligibility.14/14 new owning+
80/80 unchanged regressions=94/94 in11 files, four production/scoped checks,
494 stable hashes, inert smoke and real provider/ext4/HTTPS reopen-and-explicit
exact replay PASS. [Handoff](../handoffs/t11-s1.md). At S1 closure S2 was ready/
unassigned and parent T11 incomplete; subsequent authorized S2/S3 dispositions follow.

## S2/S3 and parent disposition

[S2 accepted](../evidence/t11-s2-review.md): service API, live-authorized original
terminal delivery, definitive compaction and failure recovery;107/107 selected
checks, four production/scoped checks and502 stable hashes PASS.
[S3/parent accepted](../evidence/t11-s3-review.md): complete T11 owning55/55+
regressions206/206=261/261 in20 exact files in workspace and clean locked replay.
Four production/scoped checks,355 stable copied inputs,182 byte-identical emitted
outputs,506 identical stable selected hashes and bounded silent smoke PASS.
[Matrix](../evidence/t11-s3-fault-matrix.md), [current handoff](../handoffs/t11-s3.md).
No T12/T15 assignment, product creation enablement or independent/external release
claim. T06 one-attempt resource cap/omissions and T04 restore limits persist.
