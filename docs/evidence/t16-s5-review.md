# T16-S5 — Actual durable interruption and cancellation review

**Disposition:** complete 2026-10-16. S1–S5 closed; parent T16 incomplete.
[Work order](../tasks/t16-s5-work-order.md), [remaining plan](../decisions/t16-remaining-slices.md),
[handoff](../handoffs/t16-s5.md). Primary-agent specification review/acceptance,
not independent T20 certification. S6/S7 remain unassigned; no successor/release.

## Acceptance

**54/54 PASS in eight files**, zero failed/skipped/pending/todo; runtime457.36s.
All36 active T16 checks pass (33 actual-service compositions and three codec
regressions), plus18 unchanged T11 durable-checkpoint/T15 delivered-recovery
regressions. [Selection](t16-s5-selection.json) and
[inventory](t16-s5-artifact-inventory.json) record611 hashes stable throughout
execution. No exclusions or weakened assertions. Full active owning acceptance
does not close the parent T16 scenario matrix.

| Requirement/risk                        | Actual isolated observation                                                                                                                                                                                                                                                                                                                                                                                                                 | Limit                                                                                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R01/R03, all three stages               | Six fixed-child cases stop after acknowledged dispatch mark before send, or after acknowledged confirmation, at draft/populate/save. The actual encrypted profile retains original method/route/key/body bytes and UUIDs. Independent DB prefix matches the boundary. Opening child/MCP sends no HTTP; explicit repeat skips confirmed steps and finishes at one root, revision3, three replay records/batches and original children/order. | Existing public executor checkpoints; actual storage owner is drained before process exit73. This is interruption between acknowledged commits, not physical power loss or killing inside a storage commit. |
| R04 saved receipt/result loss           | Actual save commits and compact local receipt persist before the final framed MCP result is discarded. Reopen returns that exact receipt with unchanged independent DB history and no mutation.                                                                                                                                                                                                                                             | Ordinary compiled stdio/official SDK path; no Android edit/delete history claim.                                                                                                                            |
| R05 pre-admission/each dispatched stage | Already-aborted SDK call sends no HTTP/admission. Separately each actual stage commits while its response is held; SDK cancellation closes the downstream request before attempt timeout, prevents dependent work/late confirmation and retains the committed prefix plus dispatch-possible evidence. Explicit same-operation replay reaches exactly three revisions/batches/replay records.                                                | Cancellation cannot retract a real commit; no rollback or automatic cleanup assertion. Held responses are discarded when their socket is already canceled.                                                  |
| R06 bounded rate-limit recovery         | A labeled relay429 with Retry-After60 exceeds the configured six-second budget: one attempt, truthful rate_limited/retryable/delay fields and no server effect. Opening remains inert; explicit repeat forwards the original draft bytes/key and completes through the real backend once.                                                                                                                                                   | Injected transport fault, not backend-generated throttling evidence. Other retry/error-decision permutations reuse accepted T05/T11 checks.                                                                 |
| R07 actual save rejection               | A real fixture PUT clears draft exercises after advisory checks; actual save returns422 validation_error. One draft remains at revision3 with zero children, three committed batches and four replay records including the rejected save. Reopen repeats original terminal history without restoring the other client's committed state.                                                                                                    | Domain rejection only; valid edit/delete/last-write-wins race outcomes remain S6.                                                                                                                           |
| R08 actual key reuse                    | An independent semantic POST claims the proposed resource key for another root first. MCP receives real409 idempotency_key_reused; its root is absent, peer root unchanged at revision1/one batch/one replay record. Repeat allocates no replacement key/root or dependent step.                                                                                                                                                            | S4 already proves actual root collision; no identity regeneration is permitted.                                                                                                                             |
| R02/R08 corrupted successful replies    | Two distinct relay faults corrupt a genuine committed draft201: malformed JSON, or valid-shaped JSON with an unrelated target UUID. Both remain uncertain with no confirmation/dependent mutation. Original exact replay receives authentic backend history and completes with one root/three revisions/batches/replay records.                                                                                                             | These are explicit wire corruptions after a genuine backend commit, not claims that the backend generated malformed results. S1 already covers committed-response loss independently at all three stages.   |

Oracles come from current shared MCP draft0.2/backend v1, public stored-operation
validation, literal fixture values, exact private wire bytes and independent DB
roots/children/revisions/replay/sync observations. Branded error codes and returned
messages alone are not the effects oracle. Bodies, tokens, account/resource IDs,
private locations and raw child diagnostics are never copied into evidence.

## Qualification, candidate and cleanup

[Initial qualification](t16-s5-initial-qualification.json) passed14/14. Review
added the separately named semantic-target case and a canceled-socket delivery
guard; [focused final qualification](t16-s5-focused-results.json) passed15/15,
then the full final candidate above passed54/54. No observed product defect or
failing test was hidden. Existing production sources and regression tests unchanged.

Early scoped Node syntax, Python AST, ESLint/Prettier and public helper/auth/storage/
operation/creation import resolution PASS. [Product identity](t16-s5-product-identity.json)
records312/312 product/config inputs and emitted outputs identical to S4. Production
type/lint/format/clean-build checks passed on that same candidate in S4; S5 did not
repeat a build or clean install for test-only changes. No install/build overlapped
execution; no fresh locked MCP installation claim. No dependencies, compiler,
schema or shared contracts changed.

Pins: Node24.21.0/npm11.19.0, Java27, PostgreSQL16, SDK1.32.1, TypeScript5.9.3,
Vitest4.1.11 and backend Maven lock. [Contract comparison](t16-s5-contract-comparison.json)
confirms24 backend/catalogue inputs still match both consumers/S4 baseline and
current MCP draft hashes remained unchanged through final execution.
[Backend provenance](t16-s5-backend-provenance.json) records116 original inputs
unchanged,117-input disposable test artifact, launcher/control/JAR/image hashes and
S1's six historical prose-only build-pin reconstructions separately from current
contracts. The existing backend-owned Clock is test-artifact-only; seven Java
restarts/three fixed selections come from unchanged owning S2–S4 cases. S5 adds no
clock seam or production bypass.

All owned backend/Java/container/control/config/snapshot resources were removed.
[Provider cleanup](t16-s5-cleanup.json) verifies bus/provider exit and private root
removal; checkpoint children each asserted their fixed exit marker/code with no
diagnostics after owner drain. Original backend/Android, personal/live resources and
.pi untouched; no staging/commits, deployment or production write enablement.

## Changed paths, commands and remaining work

Executable changes stay in test/backend-interoperability/: new
crash-cancellation.test.mjs, checkpoint-child.mjs and checkpoint-helper.mjs; small
request/response/cancellation/fault/profile helpers in helpers.mjs; runner accepts
--slice T16-S5. T16 plan/task/status/evidence/handoff documents also updated.

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
node --check test/backend-interoperability/helpers.mjs
node --check test/backend-interoperability/checkpoint-child.mjs
node --check test/backend-interoperability/checkpoint-helper.mjs
node --check test/backend-interoperability/crash-cancellation.test.mjs
node_modules/.bin/eslint test/backend-interoperability/helpers.mjs test/backend-interoperability/checkpoint-child.mjs test/backend-interoperability/checkpoint-helper.mjs test/backend-interoperability/crash-cancellation.test.mjs
node_modules/.bin/prettier --check test/backend-interoperability/helpers.mjs test/backend-interoperability/checkpoint-child.mjs test/backend-interoperability/checkpoint-helper.mjs test/backend-interoperability/crash-cancellation.test.mjs
node --input-type=module -e 'await import("./test/backend-interoperability/checkpoint-helper.mjs"); await import("./dist/auth/index.js"); await import("./dist/storage/index.js"); await import("./dist/operations/index.js"); await import("./dist/creation/index.js")'
python3 test/backend-interoperability/run-isolated.py --slice T16-S5 \
  --restartable --clock-seam \
  --backend-root "$T16_BACKEND_ROOT" --android-root "$T16_ANDROID_ROOT" \
  --node "$T01_NODE_HOME/bin/node" --provider "$T16_PROVIDER" \
  --libraries "$T16_LIBRARIES" --selection docs/evidence/t16-s5-selection.json \
  --output /tmp/gt-t16-s5-final
```

Use supplied disposable tool/source/provider locations through placeholders. Maven
uses the backend lock and excludes Maven tests: build evidence only. Final
[document closure](t16-s5-doc-closure.json) is scoped formatting/link/status/whitespace
verification, not another runtime replay.

S6 owns remaining actual edit/delete/advisory races, account/profile lifecycle,
deletion/retention/recovery compositions. S7 owns isolated Android ordinary sync
and full parent integrated acceptance, including a verified candidate carrying
S3's codec fix absent from the historical T18 archive. Both need separate user
authorization. Compatibility rows, T16 release checklist and T17/T19/independent
T20 remain open. No automatic successor or generalized campaign.
