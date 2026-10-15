# T06-S4 f1 owning failures — saved-list fixture adjudication

**Disposition: f1 FAILED/PARTIAL; execution CLOSED.**28owning PASS/5FAIL of33,
zero skip/todo/unhandled/timeout reported; regressions202UNRUN as required. Original
[QA result](t06-s4-qa-f1-execution.md) retained. QA/Developer HOLD runtime; ONLY the
narrow QA source/static repair grant below opens. No production change or acceptance.

## Normative decision

Shared MCP draft0.2 [tools table](../../shared-docs/docs/mcp-contract/tools.md)
defines list_routines as a page of SAVED, NON-DRAFT routine records; get_routine may
address a draft explicitly. Backend v1 [ordinary browsing](../../shared-docs/docs/backend-contract/service-protocol.md)
also excludes drafts from routine lists. Accepted [T03 codec specification§5](../decisions/t03-approved-schema-codec-spec.md#5-lossless-parsing-and-tolerant-canonical-records)
explicitly requires list_routines items to be non-draft. T05 must reject invalid
canonical resource success data as safe internal_error, not silently repair/filter it.

Read routines may be blank/empty saved representations; save-eligibility is not an
extra read restriction. The required fixture correction is isDraft:false in LIST
responses, not a new name/exercise constraint or contract change. Actual createDraft
success fixtures correctly remain isDraft:true.

## Source finding and observed-failure reconciliation

The accepted reused QA helper routineWire defaults isDraft:true (appropriate for
draft/mutation fixtures). NEW S4 list-routine success responders in both fault files
invoke that builder without overriding the default. Their allegedly successful
GET /v1/routines pages therefore contain drafts, violating the normative list
contract. All FIVE failed cases rely on these success pages:

- Expired-access preflight and loopback config-capture in fault01.
- Staged three-caller cohort, delayed older401 and follower-local-abort success in
  fault02, through its shared routineSuccess responder.

This specification-level fixture defect explains the shared safe internal_error
rejections without requiring production behavior to accept invalid data. Coordinator
source inspection of fixture construction and the public contract establishes the
invalid stimulus; no additional runtime diagnostic/rerun was performed. No private
production implementation is supplied to QA or QA test internals to Developer.

Coordinator's earlier source review called these route-correct after fixing exercise
pages but MISSED the non-draft membership invariant. That review miss is retained
honestly alongside the failed f1 run; source approval/static green did not guarantee
runtime fixture validity. The independent owning gate caught it and correctly
stopped regression execution.28passing subsets are not slice acceptance.

## Integrity, cleanup and limits

Coordinator independently repeated original f1 checksum and ALL281file verification:
PASS/no drift after QA failure. QA reports zero cleanup/unhandled errors and removed
owned run roots. No failed case was deleted/skipped or converted into a pass.
Production c4/100compiled files remain unchanged/frozen; no production defect/fix
is asserted from these five cases. Final runtime acceptance still requires a new
named artifact, full33 owning, exact202regressions and clean locked reproduction/
100identical compiled outputs plus eight-export smoke/source audit.

## Narrow QA source-only repair grant

QA may read this OWN QA-fixture adjudication plus public normative references and
owned helpers. Edit ONLY:

- test/fault/t06/s4-refresh-retry.test.mjs: its list-routine success fixture builders.
- test/fault/t06/s4-concurrency-fences.test.mjs: its shared routineSuccess builder.

Set the synthetic LIST items' isDraft:false explicitly. Preserve case names/counts,
assertions, request methods/routes/keys/bodies, concurrency/cancellation/durability
oracles and ALL mutation draft response fixtures. No accepted helper/default change,
filtering away invalid items, changing tool routes to evade list behavior, assertions
weakened, new cases/matrix/harness, production/manifest/config/dependency/build edit.
The expected f1 hash drift is limited to these TWO source files after this issued
grant; original inventory/result stays immutable, not rehashed into a claimed pass.

Create NEW docs/evidence/t06-s4-qa-f1-fixture-repair.md recording the minimal changes,
public contract references and exact static results, preserving prior evidence.
Pinned node --check on BOTH repaired files, scoped ESLint/Prettier and source-only
import-resolution checks allowed. NO compiled-target/import/fixture/provider/loopback/
suite/rerun/diagnostic/build/install execution until Coordinator reviews the repair,
freezes a NEW f2 inventory and issues the NEW NAMED relay. Source readiness then HOLD.

Developer remains HOLD ALL; no QA-private source/evidence reads or production repair
requested. Current-context checkpoint90/stop120 applies; report partial if reached,
no automatic renewal. Parent T06/S5/product-write/staging/commit/release boundaries
unchanged. This adjudication repairs a fixture to the contract, never the contract
or production to fit a failing test.
