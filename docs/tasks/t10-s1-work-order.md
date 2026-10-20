# T10-S1 — Confirmation and error decisions

**Assigned:** explicit user request on 2026-10-15. **Owner:** primary Codex agent.
**Status:** accepted/closed; [review](../evidence/t10-s1-review.md) and
[handoff](../handoffs/t10-s1.md).56/56 owning+183/183 unchanged regressions,
239/239 total; four production/scoped checks and stable target hashes PASS.
Parent T10 incomplete; S2/S3 remain unassigned/held. No automatic successor.

## Outcome, authority and scope

Implement S1 of the [T10 plan](../decisions/t10-plan-and-slices.md): inert internal
creation entry/types, pure response confirmation and sanitized failure decisions.
Authority is shared MCP draft0.2 creation/tools, backend v1 OpenAPI/service protocol/
domain rules, accepted foundation and T03/T05/T06/T09 boundaries, then local docs.
Follow the [proportional testing policy](../decisions/proportional-testing-policy.md).

No executor/factory, dispatch, persistence update, advisory GET, retries/recovery,
terminal replay/compaction, config/MCP/CLI wiring, dependency or format changes.
No claims about backend/DB/Android behavior, integrated T10 or release acceptance.

## Settled S1 interface and decisions

New `dist/creation/index.js/.d.ts` exports:

- `evaluateStepConfirmation(journal, request, result)` returns either
  `{kind:"confirmed", marker, terminal?}` or `{kind:"uncertain", error}`.
  Validate/detach the active T09 journal, require its first unconfirmed step to be
  dispatch-possible, and require the selected request's exact method/route/body/key
  to match that step. Invalid local selection uses existing OperationError
  invalid_arguments/invalid_state; damaged journal remains recovery_unavailable.
  Confirmation facts and terminal envelopes are new detached data, not commits.
- `classifyCreationFailure(journal, failure, phase)` returns stopped/error or
  terminal/result. The active journal captures acknowledged history at entry,
  before this attempt's dispatch mark (that mark alone is not a wire send);
  phase is before-dispatch, mutation or confirmation. It is trusted call context,
  never a wire/model argument. A pending entry already carries uncertainty.
  For a fresh entry, a branded TransportError supplies actual dispatch uncertainty;
  an unknown mutation/confirmation exception is conservative. Before-dispatch
  local errors cannot imply a new network send. Confirmation failures retain
  uncertainty until durable acknowledgement; no future step is invented.
- Export discriminated decision/error/phase types. Error objects have the shared
  code/retryable fields and mandatory authorized operationId/routineId/
  lastConfirmedStep/outcomeUnknown; copy no native message, stack, cause, body,
  credentials, path, correlation ID or dispatch/attempt metadata.

Use actual raw mutation bytes and T03 fatal/lossless decode with expected root.
Required metadata is 201/create_draft or 200/populate_draft/save_routine and the
original resourceKey. Ignore projected result.data as a confirmation oracle.
Expected domain values come solely from the validated stored populate request.
Compare names exactly, ordered identities/references/positions/rest/sets and
declared numeric values; absent nullable response set values equal null per T03.
Labels/additive convenience data do not participate in domain identity, but
canonical shape still must validate. No Number conversion of revisions.

Draft requires an empty unnamed draft. Populate requires a matching draft.
Save requires a same-root non-draft: matching content yields saved; differing
valid content yields concurrent_modification with confirmed save and
outcomeUnknown=false. Both return marker plus terminal result for S2's atomic
commit. Wrong root/state/status/key/route, malformed bytes/shape/revision or
populate mismatch returns retryable internal_error/outcomeUnknown=true without
a confirmation or terminal decision.

| Failure source                                                                                               | Decision                                                                                      |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Branded T05 mutation response, permanent domain/identity/backend code, dispatched=true, permanent 4xx status | Terminal rejection; retain sticky/pending uncertainty and original safe backend code          |
| T05 request/result size limit                                                                                | Explicit nonretryable stop; a received permanent 413 may be terminal; no truncation           |
| T05 transient/auth/throttle/interruption or predispatch failure                                              | Stopped, active evidence retained; preserve safe code/retryability/Retry-After                |
| T06 auth/interruption/invalid-argument failure                                                               | Stopped with its shared code; corrupt/unsupported/invalid-grant state -> recovery_unavailable |
| T09 failure                                                                                                  | Stopped with shared code; resource_exhausted -> recovery_unavailable                          |
| T04 failure                                                                                                  | Stopped/recovery_unavailable; never acknowledge or erase a commit                             |
| Unknown or spoofed failure                                                                                   | Stopped/internal_error; phase/pending history controls conservative uncertainty               |

Only a mutation-phase error may declare a backend terminal rejection. A read,
local validation or failed persistence call cannot. Permanent 4xx never clears
earlier possible dispatch; idempotency mismatch never generates replacement
identity. Terminal candidates must fit unchanged T09 validation/budgets; otherwise
stop internal_error with conservative history, not an incompatible settlement.
No raw failure object is attached to decisions. These helpers do not authorize
private-result delivery or execute a retry.

## Edit/execution grant and checks

Edit only new `src/creation/`, `test/unit/t10/` and S1/T10 docs, index, roadmap,
verification, evidence/handoff. Existing dependency sources/tests and fixtures
stay unchanged. Preserve all preexisting uncommitted work, parked T02, retired
T13/T14, T06 omissions and .pi. No manifest/lock/compiler/shared-contract edits,
staging, commits, live credentials/services or actual writes.

Use provisioned Node24.21.0/npm11.19.0 via T01_NODE_HOME; existing disposable
locator may resolve the unset variable. Scoped reads/edits, node --check, local
ESLint/Prettier, npm run typecheck/lint:production/format:check:production/build
and exact Vitest selections are authorized. No install is needed for this pure
slice; clean locked reproduction remains parent S3. No build while tests run.

Use one small T10 synthetic helper reusing T09 candidate construction and T05
failure types; author expected wire records independently from the stored body.
Focused public unit tables cover valid steps, mismatches and saved conflicts,
lossless Int64 boundaries, optional-null/zero/default/repeated/order behavior,
exact selection, uncertainty/error provenance and sanitized output. Avoid private
helper assertions and repeating the entire dependency validation matrices.

Early checks: types, scoped source lint/format, then build/import resolution and
new test syntax/lint/format before behavioral acceptance. Focused repair runs only.
Final complete active S1 suite plus these unchanged regressions:

- test/unit/t03/backend-response.test.mjs
- test/unit/t03/lossless-revision.test.mjs
- test/unit/t05/06-errors-uncertainty.test.mjs
- test/unit/t05/07-results-decode.test.mjs
- test/unit/t09/s1-format.test.mjs
- test/unit/t09/s3-transitions.test.mjs

Four production checks, scoped new-test checks, stable source/emitted hashes and
a bounded silent import smoke/source review complete S1 evidence. The smoke is
not general interception or an OS sandbox. No provider/TLS/backend integration
is claimed by this pure slice; those checks begin in S2/S3.

## Milestones, delivery and stop

Contract -> pure decisions/early static checks -> focused owning checks -> final
stable owning/selected regressions -> primary spec/source/test review -> sanitized
review/inventory/handoff and status updates. Target 60–90 minutes, checkpoint at90,
stop at120 with honest partial state if unfinished. Record exact paths, commands,
versions/results, failed attempts, limitations, accepted API and remaining work.

Stop/escalate shared-contract conflicts, required dependency API changes, unsafe
history mapping or fixture expansion. Do not weaken contracts/tests or mask a
failure. S1 completion closes its implementation/runtime grant; no automatic S2.
