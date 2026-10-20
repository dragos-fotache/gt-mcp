# T21-S2 — Invocation-local creation

**Assignment:** user requested “start work at s2”, 2026-10-17.
**Disposition:** [accepted/closed](../evidence/t21-s2-review.md). S1 closed;
S3 ready/unassigned and S4–S6 held. [Handoff](../handoffs/t21-s2.md).

Outcome: implement shared MCP draft0.3 creation and the S1
[creation/runtime interface](../decisions/t21-single-record-storage-spec.md#creationruntime-interface-for-s2).
Each valid call starts fresh; remove operationId/journal admission, recovery executor
and saved-result replay. Preserve validation, visible references, exact bounded
within-call HTTP retry identity, response/domain confirmation, auth/session fences
and truthful partial outcomes. Every creation error/fallback retryable:false.

Non-goals: replacing storage/config/login/lifecycle, deleting old profile evidence,
backend/Pi certification, package refresh, live/laptop writes, new dependencies,
staging/commits or S3 succession. Existing ext4/anchor credential storage is temporary;
this candidate is not ready for installation. Existing R1 archive/inventory were
copied outside dist before any clean build.

Edit scope: S1's S2 domain/creation/runtime/protocol paths and their owning tests;
also src/domain/projected.ts (saved-result/error validation), and minimal internal
src/operations/{candidate,repository,format}.ts compatibility boundaries needed to
compile the still-present trusted lifecycle implementation. Those old modules stay
disconnected from create_routine and preserve old on-disk records until S4 removal;
do not relax the public new schema or introduce a production recovery option.
Shared contracts/storage/auth/backend/dependencies/compiler/.pi remain unchanged.
The successor spec may clarify the optional internal maxRequestBytes carry-through
of the existing validated transport budget; no new public policy/config field.
Record explicit obsolete-test retirements and adapt mixed suites case by case.

Commands: provisioned Node24.21.0/npm11.19.0 only; early type/lint/format/syntax,
explicit stable build then focused Vitest; final full active S2-owning suites plus
relevant unchanged regressions. Reuse real private-CA HTTPS and isolated
Secret Service/ext4 fixtures. No ambient keyring, real credentials or live backend.
No install/build racing tests. Preserve existing failures honestly and archive
original bytes of retired uncommitted tests before removal. No broad excludes/skips.

Acceptance: strict new input/result schemas, non-idempotent hint; three-step saved
graph and identical calls allocate distinct roots; disabled/malformed/precheck
failure sends no mutations; representative permanent/uncertain failure and cancel
stop remaining steps; malformed/wrong-target response never confirms success;
within-call retry retains bytes/key; authorized current-call context only; no
creation-store reads/writes in runtime/creation. Existing credential protection and
read/HTTP numeric/privacy behavior remain. Document deferred S3–S6 suites rather
than claiming parent acceptance. Deliver scoped evidence/review/handoff/status.

Milestones: production + early static checks; proportional owning/regression repair;
final stable acceptance and handoff. Target60–90 minutes; checkpoint at90 and stop
by two hours with honest partial state if needed. Stop affected work for unsettled
public behavior, backend changes, additional dependencies or required auth weakening.

## Scoped integration/verification additions

- Shared read-protocol fixture, catalogue/lifecycle expectations and stdio startup
  description/hint expectations require the changed creation schema/annotation;
  six read semantics and fixtures remain unchanged.
- One unchanged T05 calibration case expected a retired CJS-require tag although
  its guarded namespace intentionally permits harmless lookup and denies the
  attempted write. Adjust only its expected effect tag to fs-write; retain nonzero
  exit, no output and unchanged canary assertions. The standalone control reproduced
  without importing any production artifact. No harness/production relaxation.
- The actual auth facade keeps resource legs single-attempt except one eligible
  401 refresh/retry. Preserve it: rate limits stop with retryable:false at the tool;
  exercise unchanged body/key through the existing auth retry, not a new 429 loop.

## Closure

Final acceptance:821/821 in66 exact owning/regression files, zero failures/skips;
617 stable execution hashes,192 compiled outputs, scoped production/test checks
and owned cleanup PASS. [Evidence](../evidence/t21-s2-review.md) records original
failures, explicit retirements, retained protections and verification limitations.
S2 closed; no S3 assignment, parent/package/release or laptop installation claim.
