# T09-S2 — Guarded durable admission and exclusive access

**Assigned:** user request on 2026-10-15. **Owner:** primary Codex agent.
**Status:** accepted/closed; [review](../evidence/t09-s2-review.md),
[handoff](../handoffs/t09-s2.md). S1 accepted/closed; S3 unassigned/held for
separate authorization. No automatic successor.

## Contract and scope

Implement S2 of the [approved plan](../decisions/t09-plan-and-slices.md), using
the [S1 format](../decisions/t09-journal-format.md). Authority is the shared
draft0.2 creation/tools/authentication contract, backend v1 request identity,
accepted T03/T04 specifications and config-only policy, in that order.
Keep the [proportional testing policy](../decisions/proportional-testing-policy.md).
No mutation transport, transitions, compaction/retirement actions, MCP/CLI wiring,
contract changes, dependencies, manifest/config changes or production enablement.

Concrete additive public API in `src/operations/index.ts`:

- `openOperationRepository(options): OperationRepository`, a synchronous inert
  constructor (no storage reads). Options: caller-owned `owner: ProfileSession`,
  trusted `config: unknown` containing the existing T08 version-1 operator config
  record, `reads: OperationAdmissionReads`, optional `generateUuid: () => string`.
  Reuse T08's validator directly; this is an internal composition input, never a
  second config schema or model argument. Missing/false writesEnabled denies
  calls; invalid config fails closed at construction. Retain detached policy and
  T05 default/explicit request and response budgets. Config origin must match owner.
- `OperationAdmissionReads` is the `binding`, `listRoutines`, `getExercise`
  subset of accepted `AuthenticatedSessionState`. Mandatory, no default guards.
  Production callers pass the T06 facade; simple test fakes prove local decisions
  only. Capture methods with their receivers. Check both owner and read binding.
- `repository.withOperation<T>(capturedBinding: StorageBinding, createArgs: unknown,
  signal: AbortSignal, work: (handle: AdmittedOperation) => Promise<T>): Promise<T>`.
  Capture/validate complete args synchronously before awaiting; check policy/auth
  before private lookup. Hold same-ID exclusion across admission and the callback.
  Read store under a whole-store lock, check retired first, compare the real T04
  versioned keyed intent digest for existing IDs. Existing equivalent evidence
  skips visibility/allocation and is never rewritten. New IDs check each distinct
  exercise with authenticated getExercise, recheck fences/cancellation, allocate
  and commit all bytes under the store lock before exposing any handle. Independent
  IDs may precheck concurrently, but read/modify/commit is serialized with fresh
  store reads and full reserved-capacity checks. No stale whole-store cache.
- `handle.snapshot(): Promise<OperationRecord>`,
  `handle.readStep(step): Promise<StoredOperationRequest>`,
  `handle.confirmationBaseline(): Promise<ConfirmationBaseline | null>`: detached
  reads fenced by callback lifetime, cancellation, repository invalidation and
  a real T04 owner read under the store lock. T04 binding is a captured snapshot;
  its async method checks lease/generation/integrity even after generation advance.
  Compact evidence has no request/baseline.
  These reads alone do not authorize replaying terminal results to clients.
- `repository.close(): void` synchronously and permanently fences this facade;
  never closes the owner. One facade per owner object; a second fails rather than
  keeping competing caches. Close releases that claim only after outstanding calls
  settle. Reentrant callbacks on this repository reject rather than deadlock.
  Same-account reauthentication reopens evidence with a fresh facade/current binding;
  sessionGeneration never changes durable intent identity.

Repository errors add configuration_required, operation_id_reused and
operation_interrupted and invalid_reference to fixed sanitized OperationError codes.
Authenticated exercise404 maps to invalid_reference. Preserve branded
safe T04/T06/T05 boundary errors; unknown capability failures are sanitized.
Commit ambiguity (including unknown commit errors) returns StorageError
commit_ambiguous and permanently fences the repository/owner-object claim until
the caller closes/reopens the actual T04 owner. Definite precommit failures never
acknowledge admission and preserve their safe StorageError distinction.
Cancellation/invalidation during commit awaits settlement then suppresses callback
and success, without rollback or another allocation. Queued cancellation is local.

## Paths, execution and milestones

Edits: additive `src/operations/` repository and exports/error codes;
`test/unit/t09/`, `test/fault/t09/` focused checks/helpers; this work order,
T09 format/plan/task/index, verification summary, evidence and S2 handoff.
Preserve existing uncommitted work and all S1 assertions/evidence.

Use provisioned Node24.21.0/npm11.19.0 via T01_NODE_HOME (the provisioned
temporary toolchain locator is available). Permitted commands: source reads,
patches, scoped prettier/eslint/syntax, production type/lint/format/build and exact
Vitest selections. No rebuild/install during tests. No install needed for S2.
This assignment authorizes isolated synthetic fixture writes only: disposable
private DBus/Secret Service with temporary HOME/XDG, verified ext4 fixture roots,
private-CA literal-loopback HTTPS, T04 diagnostic faults, and child ownership
probes. Reuse existing private fixture runner/provider tools; qualify isolation
and fully reap/remove owned processes/data. No personal bus, credentials/backend,
Google/browser/Android sessions, .pi changes, staging or commits.

Milestones: (1) contract and facility feasibility; (2) repository plus early static
checks; (3) focused decision/concurrency and real boundary checks; (4) review,
final selected acceptance, hashes and handoff. Target 60–90 minutes; checkpoint
at90 and stop at120 with honest partial handoff if needed.

## Proportional acceptance

- Unit decisions: config/auth/visibility/local-input denial with no allocation or
  commit; equivalent/conflicting/retired lookup order; same-ID exclusion and
  different-ID lost-update prevention; callback-copy/lifetime/cancellation and
  generation fences; full-store reservation boundary. Reuse S1/T03 oracles.
- Real isolated production storage/provider admission and reopen with exact bytes,
  T06 HTTPS auth probe and exercise precheck; second child process denied ownership,
  then explicit reopen retaining identity. Use existing T04 diagnostic faults for
  definite/ambiguous admission commit distinction; no general fault framework.
- Early and final production typecheck/lint/format/build; scoped new-test
  syntax/lint/format. Final all active T09 tests plus unchanged relevant T03
  identity/write, T04 bytes/binding/lease/commit/digest, T06 authenticated validation
  and operation-byte preservation regressions. Record exact selections/results.
- Clean locked reproduction and full parent integrated acceptance remain S3;
  actual mutation/replay/backend/Android and release gates stay with later tasks.

Escalate shared-contract conflicts, cross-task API changes, unbounded capacity or
unavailable isolated facilities. Do not weaken tests or contracts. Deliver code,
focused tests, API/error/locking notes, exact safe commands/results, artifact
hash inventory and accepted/partial S2 handoff; stop without starting S3.
