# T21-S1 — Production, test and packaging dispositions

**Scope:** future S2–S6 changes against the 2026-10-17 workspace, not edits or
verification passes performed in S1. The [exact map](t21-s1-path-dispositions.json)
enumerates413 existing paths with one disposition each, including helpers/fixtures,
production sources, parked experiments, scripts, packaging and root manifests.
It is a review inventory, not a generated test harness or execution selector.

The [shared scenarios](../../shared-docs/docs/mcp-contract/acceptance-scenarios.md)
and [successor interfaces](t21-single-record-storage-spec.md) supply expectations.
Existing tests deliberately still describe the old runtime. Adapt only what the
changed boundary requires; an “adapt” entry is not a requirement to rewrite every
case or permission to weaken retained auth/domain oracles.

## Production outcomes

| Slice  | Paths                                                                                                                                                    | Disposition                                                                                                                                                                                                           |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S2     | `src/domain/{inputs,result,schemas,index,routineInput}.ts`; `src/protocol/{adapter,catalogue,results}.ts`; `src/runtime/{read,index}.ts`                 | Remove operationId/receipt shapes and dependencies; fresh-call behavior, non-idempotent annotation, retryable:false on every creation error/fallback, retain strict projection/binding/privacy/output checks.         |
| S2     | `src/creation/{boundary,confirmation,executor,failure,index,service,types}.ts`                                                                           | Replace journal-handle workflow with invocation-local workflow; retain response/domain/identity/failure facts.                                                                                                        |
| S2     | `src/creation/history.ts`                                                                                                                                | Remove journal-history helper. No replacement persistent history.                                                                                                                                                     |
| S3     | `src/storage/{client,dbus,diag-support,diag-worker,engine,errors,faults,format,fsutil,holder,index,ipc,keyring,removal,test-facility,types,validate}.ts` | Single-record API/format, same key custody/ownership/security primitives; remove multi-store manifests and filesystem-name gate. Keep diagnostic seam isolated.                                                       |
| S4     | `src/operations/{candidate,context,errors,format,index,json,repository,schema,transitions,types}.ts`; `src/storage/lifecycle.ts`                         | Remove after callers detach. Old external removal/resume/reconciled factories have no successor role.                                                                                                                 |
| S4     | `src/auth/*`, `src/login/*`, `src/lifecycle/*`, `src/cli/main.ts`, `src/runtime/config.ts`                                                               | Adapt profile/config/lifecycle integration. Preserve auth semantic oracles, especially exact pending refresh. Remove creation retirement/reconciliation; mutable descriptor receipts disappear.                       |
| Retain | Other domain/HTTP/stdout/entry/scaffold files, compiler/manifest/lock pins                                                                               | No planned behavior/dependency/compiler change. Exact within-call backend replay and lossless Int64 remain. If integration needs a small additional import/type edit, record it in the assigned slice before editing. |

## Owning test changes

| Paths                                                                                                                                                   | Disposition and independent oracle                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `test/unit/t03/{parse-normalize-identity,tool-schemas,write-projection-result,public-surface}.test.mjs` and fixtures                                    | Adapt creation schemas/results/normalization; remove keyed cross-call intent identity cases only. Keep numeric/default/order/whitelist oracles.                                                                                                                                 |
| `test/unit/t04/*`, `test/fault/t04/*` except stale-anchor                                                                                               | Adapt new record/exports/provider fixtures. Keep independent crypto vectors/tamper, permissions, key availability, locking and representative atomic replacement/provisioning interruption checks. Filesystem test must qualify Btrfs/ext4 instead of requiring ext4 rejection. |
| `test/fault/t04/stale-anchor.test.mjs`                                                                                                                  | Remove: only verifies the explicitly retired external rollback anchor. No replacement rollback-detection claim.                                                                                                                                                                 |
| `test/unit/t09/*`, `test/fault/t09/*` including reopen child                                                                                            | Remove seven exact mapped files with the retired journal/admission/transition/persistence behavior. No quota or replacement campaign.                                                                                                                                           |
| `test/unit/t10/*`, `test/fault/t10/*`                                                                                                                   | Adapt executor/body/confirmation/failure checks and isolated fixtures; keep successful graph and safe failures, stop durable checkpoint matrix requirements.                                                                                                                    |
| `test/unit/t11/s1-recovery.test.mjs`, `test/fault/t11/{s1-recovery,s3-crash-matrix}.test.mjs`, `test/fault/t11/{s3-child-helper,s3-recovery-child}.mjs` | Remove five exact mapped files: cross-call resume/exhaustive journal crash campaign is retired.                                                                                                                                                                                 |
| Remaining `test/unit/t11/*`, `test/fault/t11/*`                                                                                                         | Replace saved-outcome replay assertions with fresh-call/uncertain-result behavior. Reuse representative error/security fixtures rather than recreate a journal harness.                                                                                                         |
| `test/unit/t06/*`, `test/fault/t06/*`, `test/login/*`                                                                                                   | Adapt storage/metadata fixtures and old export assumptions. Keep token expiry, exact pending-refresh body/key across restart, serialization, CSRF/origin/nonce, foreground exchange, no-secret output and account fences.                                                       |
| `test/unit/t12/*`, `test/fault/t12/*`                                                                                                                   | Remove obsolete retirement/reconciliation cases within mixed suites; adapt encrypted-record cleanup/interruption cases. Keep explicit sign-out/removal, authoritative proof, generic-error non-deletion and privacy oracles.                                                    |
| `test/unit/t15/*`, `test/fault/t15/*`, `test/create-protocol/*`, `test/create-stdio/*`                                                                  | Adapt runtime/config/result schemas and old journal inspection. Retain guard-before-mutation, cancellation/result delivery, true/false config and strict stdio. Repeated calls must be independent; no skip/exclusion to suppress old failures.                                 |
| `test/backend-interoperability/*`, `test/pi-integration/*`                                                                                              | Adapt affected integration cases/helpers, retain actual backend graph/sync/access and Pi path/privacy/mode boundaries. Replace old receipt/restart assertions. Historical source-repair/provenance scripts with no changed boundary stay unchanged.                             |
| Nine mapped foundation/read/stdio/helper paths                                                                                                          | Adapt old config/fixture/schema references only; retained read/stdio/inert/toolchain behavior remains a regression requirement.                                                                                                                                                 |
| Other unit/HTTP/read fixtures/suites                                                                                                                    | Retain. A helper change may require rerunning unchanged callers without changing their oracles.                                                                                                                                                                                 |
| `experiments/t02/*`, `test/pi-feasibility/*`, `test/fixtures/t02/*`, inert companion source                                                             | Preserve historical work; no deletion or certification of parked behavior.                                                                                                                                                                                                      |

“Remove” is explicit scope for the named successor slice, not a change made now.
No vitest.config exclusion or broad suite filter is proposed. Record case-level
retirements in each mixed-suite review. Preserve old evidence/counts as historical;
future runs must enumerate the full active owning selection and relevant regressions
without counting skips as passes. S5 can adapt old test filenames where their names
are historical; rename only when it improves clarity and update every helper import.

## Packaging and guides

S6 adapts `scripts/package-artifact.mjs`, `packaging/{runtime-files,document-files}.json`,
`packaging/{README.md,examples/config.template.json}` and `test/packaging/*`.
The login template schema stays unchanged; review rather than unnecessarily edit it.
No dependency/lock upgrade or install lifecycle hook is planned.

Remove emitted `dist/operations/*`, `dist/creation/history.js` and
`dist/storage/lifecycle.js` from the delivery closure once source removals land.
Retain the actual worker chain `dist/storage/holder.js`, its client/IPC/provider/
crypto/filesystem dependencies and trusted CLI launcher; they are not creation
journal artifacts. Keep diagnostic workers/test facilities outside the shipped
closure. Verify actual closure/imports and executable modes, not just this list.

S4/S6 update `docs/{installation,login,recovery,stdio-server,packaging,pi,compatibility}.md`,
README/docs index, current implementation/verification/task status and remaining T17
plan. Remove shipped ext4/anchor/operationId/retirement instructions and indefinite
creation-retention disclosure. Retain AI-host transcript, auth/privacy and explicit
fresh-profile/refusal guidance. Preserve original R1 archive/inventory before any
clean build; a new archive gets its own checksum/identity and installed checks.

## Acceptance boundary

S1 verifies inventory uniqueness/existing paths/completeness and source/test/lock/
backend stability only. This map is not proof that any future slice passes. Changes
outside this map or to settled public behavior must be recorded/resolved before
dependent edits. T19 browser/Google and T20 independent review remain separate;
the retired T17 exact creation-recovery gate cannot be counted as passed.
