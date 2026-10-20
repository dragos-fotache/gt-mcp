# T16-S3 — Actual read boundaries and catalogue repair

**Disposition:** S3 complete, 2026-10-16. S1–S3 windows closed; parent T16
incomplete and later slices unassigned. Primary-agent implementation, oracle review
and acceptance; no independent T20 review or release claim.
[Work order](../tasks/t16-s3-work-order.md), [handoff](../handoffs/t16-s3.md).

## Acceptance

**147/147 PASS in 11 exact files**, zero failed/skipped/pending/todo, 170.49 seconds.
All 16 active T16 checks pass: 13 actual-backend cases (four S1, five S2, four S3)
and three selective catalogue-codec regressions. The other 131 unchanged checks
cover T03 backend decoding/lossless revisions/write projection, delivered read
paging/filter/error behavior and T15 guarded runtime. The fixed
[selection](t16-s3-selection.json) and [inventory](t16-s3-artifact-inventory.json)
record 607 hashes stable throughout execution. No tests were weakened or excluded
to obtain this result; this is the full active owning suite, not full parent T16.

Production typecheck, lint, formatting and clean output build PASS. Scoped new
Node/Python syntax, ESLint/Prettier and import resolution PASS. No build or install
overlapped execution. Final documentation closure passed 43/43 foundation package-contract checks, recorded
separately in [document results](t16-s3-doc-closure.json); it is not a runtime replay or a fresh
clean locked MCP installation. No dependency, compiler, schema or contract change.

## Specification-derived observations

| Requirement/risk            | Actual isolated observation                                                                                                                                                                      | Boundary                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| M04–M09 filtering/context   | OR within muscle/equipment filters, AND between them, mixed-case search and reordered/deduplicated continuation; explicit limits 1/200; continuation survives real reactive same-account refresh | Changed search/limit/endpoint and foreign account reject; representative combinations, not exhaustive permutations |
| Ownership/list semantics    | Own/foreign/missing exercise, routine and workout reads; own draft directly readable, saved lists exclude draft/foreign; workout active/finished status, order and continuation                  | Small actual semantic-HTTP fixtures; no Android observation                                                        |
| Lossless numeric projection | Raw HTTP numeric tokens above 2^53 and at signed Int64 maximum become exact literal decimal strings in all three get/list classes; bundled absence stays absent                                  | Guarded SQL provisions isolated revision boundaries; not a domain-write/revision-generation proof                  |
| Live paging                 | Real insertion, edit and deletion after first page affect subsequent keyset membership                                                                                                           | No frozen-list/bootstrap guarantee                                                                                 |
| Fixed authentic expiry      | Original signed token continues at +10 minutes, rejects at +16 despite continuation/refresh, then an explicitly new traversal succeeds                                                           | Backend-owned fixed Clock in disposable test artifact only; no sliding lifetime or silent restart                  |
| Catalogue roles             | Actual 200-item page and selective codec fixture preserve a bundled muscle in distinct roles; duplicate same-role membership and custom primary/secondary overlap still reject                   | Custom tertiary/count restrictions unchanged; no schema relaxation                                                 |

Expected outcomes come from current shared MCP draft0.2/backend v1 and literal
fixture identities, independent raw numeric tokens and DB observations. No rounded
JSON number is an oracle. Scripted regressions are not counted as new real-backend
coverage. Bodies, credentials, account/resource IDs and raw private errors remain
private; evidence records only safe counts, public paths and hashes.

## Defect and retained failures

The initial actual read run passed three cases and failed the 200-item catalogue
page. Two bounded diagnostic runs reproduced it: backend HTTP200 with 200 records
and 251529 bytes, but MCP decoding rejected the response. The canonical catalogue
contains nine records referencing the same muscle in distinct roles and no
same-role duplicates. The normative
[catalogue mapping](../../shared-docs/catalogue/README.md) keys relationships by
(exercise_id, muscle_group_id, type) and exempts bundled data from custom rules.
The implementation incorrectly keyed every muscle relationship only by UUID.

The work order recorded narrow repair scope before production edits. A synthetic
three-case reproduction failed the valid bundled case while both rejection cases
passed. src/domain/projected.ts now keys muscle identity by UUID and role, retaining
the existing custom restrictions. The focused codec regression then passed 97/97.
[Repair history](t16-s3-repair-history.json) and
[initial results](t16-s3-initial-results.json) preserve failures honestly.
[Product comparison](t16-s3-product-repair.json) records 296/298 unchanged checked
product inputs; only this module and its emitted JavaScript changed. Of 194 emitted
outputs, 193 remain identical. Existing tests and normative contracts are unchanged.

## Artifact provenance and cleanup

Pinned Node24.21.0/npm11.19.0, Java27, PostgreSQL16, SDK1.32.1, TypeScript5.9.3 and
Vitest4.1.11. Current 24 backend contract/catalogue hashes match both consumers and
the S1 baseline. Original 116 backend inputs stayed unchanged. S1's six exact
historically pinned prose blobs are reconstructed only in the disposable copy;
the original checksum gate and current normative oracle remain intact.

[Backend provenance](t16-s3-backend-provenance.json) records the 117-input test
build, original launcher and overlaid control/JAR/image hashes. Its one extra class
is the existing backend-owned TestChildAuthClockConfiguration.java, SHA256
2eb49af6055493e7079e00db3606d47e0f101854d1a2b463613a65ca3e7cce1c. This opt-in clock
is copied only into the disposable test artifact, never a production deliverable.
The private mode600 Unix socket under a mode700 root controls only the owned Java
child. Five actual Java restarts changed process identities, two selecting the
fixed clock; system-clock mode was restored. No new HTTP control or auth bypass.

Backend launcher/Java exited; owned container/socket/config/build snapshot removed.
[Provider cleanup](t16-s3-cleanup.json) confirms provider/bus exit and private profile
root removal. Original backend/Android, personal/live resources, paused Android
journey and .pi were untouched. Nothing staged, committed, deployed or enabled.

## Reproduction and remaining work

Use supplied disposable source/provider/tool locations through placeholders:

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
python3 test/backend-interoperability/run-isolated.py --slice T16-S3 \
  --restartable --clock-seam \
  --backend-root "$T16_BACKEND_ROOT" --android-root "$T16_ANDROID_ROOT" \
  --node "$T01_NODE_HOME/bin/node" --provider "$T16_PROVIDER" \
  --libraries "$T16_LIBRARIES" --selection docs/evidence/t16-s3-selection.json \
  --output /tmp/gt-t16-s3-final
```

Maven uses the backend lock and excludes Maven tests; it is build evidence only.
A05 expired-access replay, remaining creation/domain/race/crash/lifecycle cases,
isolated Android ordinary sync and final integrated parent acceptance stay open.
Historical T18 package archives were not refreshed with this codec repair; later
packaging/parent candidates must include and verify it. Compatibility rows and
T16 release checklist remain unverified/unchecked. T17/T19/T20 and prior limits
are unchanged. No automatic successor or generalized campaign is authorized.
