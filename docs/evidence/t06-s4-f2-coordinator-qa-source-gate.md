# T06-S4 f2 QA fixture source gate — approved, HELD

**Disposition: narrow f1 saved-list fixture repair SOURCE-APPROVED/HELD.**
ALL source/helper/static/build/install windows CLOSED.33authored cases, no post-repair
execution yet. f1 FAILED28PASS/5FAIL remains historical;202regressions UNRUN there.
Only a NEW named f2 relay may grant the exact independent runtime selections.

## Specification-derived repair and exact minimality

[Adjudication](t06-s4-f1-adjudication.md) requires list_routines success items to be
saved/non-draft under unchanged shared MCP/backend/T03. [QA repair](t06-s4-qa-f1-fixture-repair.md)
adds isDraft:false to FOUR list fixture builder calls: fault01 three and fault02
shared routineSuccess one. All THREE createDraft201 response fixtures remain
isDraft:true. No case/name/count/argument/route/key/body/assertion/oracle/helper/
production/dependency/config change; no contract weakening or deleted failed case.

Coordinator independently removed ONLY those four explicit overrides IN MEMORY
and recovered each file's EXACT f1 SHA256. This establishes the repair's minimality,
not just a self-reported diff. Both original f1 fault-file hashes remain in immutable
f1 inventory; original failed evidence not rewritten into a pass.

## Static and integrity observations

Pinned Node24.21.0/npm11.19.0: node --check2/2, scoped ESLint and Prettier --check
(both repaired sources + new evidence) ALL PASS exit0. Coordinator independently
verified original f1 inventory checksum unchanged and that its ONLY changed rows
are the TWO authorized fault sources.279remaining rows unchanged, including ALL100
compiled outputs, production c4, other2S4 QA source/helper and accepted QA/dependency/
config inputs. No target/import/fixture/provider/HTTP/suite/build/install execution.

Final fixture-repaired source hashes:

- test/fault/t06/s4-refresh-retry.test.mjs:
  215309d43ab42ebe100431a76e37a38b9590e0c2319d0c9b72d8b13089841be2
- test/fault/t06/s4-concurrency-fences.test.mjs:
  b15924a3ec13429e552cef3fdf97b4dd38c8e1666a34548f2f1952d8ad3ad7d1

The prior source review miss of non-draft list membership is retained honestly in
adjudication. This repair aligns stimulus with the contract; runtime assertions
still need a green NEW artifact run. Source gate/freeze is not S4 acceptance.

## Hold and next gate

QA/Developer HOLD ALL source/check/build/install/runtime absent NEW NAMED relay.
Coordinator rehashes the two authorized repaired inputs and adds adjudication/
repair/gate evidence to a NEW f2 inventory; production remains byte-identical c4.
Only after checksum/full-row verification may QA run complete33owning once, then
exact202unchanged regressions only if owning/cleanup/integrity passes. Final clean
locked-source reproduction/100identical compiled bytes and eight-export smoke/
source audit remain required. No parent/S5/product-write/context-renewal/staging/
commit/release authority. Prior f1 remains failed, not silently replaced.
