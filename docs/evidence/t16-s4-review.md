# T16-S4 — Real auth recovery and creation-decision review

**Disposition:** complete 2026-10-16. S1–S4 closed; parent T16 incomplete.
Primary-agent implementation, specification-derived oracle review and acceptance;
not independent T20 certification. [Work order](../tasks/t16-s4-work-order.md),
[remaining slices](../decisions/t16-remaining-slices.md), [handoff](../handoffs/t16-s4.md).
The user separately authorized S5 while S4 acceptance was finishing; S6/S7 remain
unassigned. No automatic successor or release.

## Acceptance and observed behavior

**42/42 PASS in eight files**, zero failed/skipped/pending/todo; runtime272.24s.
All 21 active T16 checks pass (18 actual-service cases and three codec regressions),
plus 21 unchanged relevant T06 refresh-recovery/T11 terminal-history/T15 guarded
runtime regressions. [Selection](t16-s4-selection.json) and
[inventory](t16-s4-artifact-inventory.json) record 608 hashes stable throughout
execution. This is the full active owning suite, not full parent T16 acceptance.

| Contract risk                                | Actual isolated observation                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Evidence limit                                                                                                                                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A05 expired-access replay                    | A genuine lost rotation response is replayed after the test-only backend Clock passes its original access deadline. The real acknowledged private vault contains the original unchanged grant and pending-null before a distinct fresh rotation is prepared. Two concurrent reads share recovery; exact predecessor/body/key/result survive, new rotation uses recovered refresh/new key. DB sees exactly two new rotations overall, one current refresh and no revoked family. | Production lifecycle/auth facade uses its existing trusted clock option with real provider/storage/HTTP/backend. This is not elapsed-wall-clock stdio evidence; settled state subsequently reopens through compiled MCP successfully. |
| C04 invisible precheck                       | Foreign exercise becomes invalid_reference with zero domain mutations. Correcting the reference under the same operationId then succeeds with exactly one root, proving no pre-admission reservation.                                                                                                                                                                                                                                                                           | Accepted T09 admission contract maps authenticated exercise404 to invalid_reference; no ownership disclosure.                                                                                                                         |
| C04/C05/R07 authoritative populate rejection | Real DELETE removes the reference after successful precheck, before unchanged populate bytes are forwarded. Actual422 invalid_reference leaves one empty draft at revision1, one sync batch and two replay records (draft plus rejected populate); no save. Reopen plus actual401/refresh returns the original terminal outcome without mutation/history changes. Changed intent conflicts.                                                                                     | Actual populate rejection only; save rejection remains S5. No rollback or automatic draft deletion.                                                                                                                                   |
| C06/C07/C08 operation identity               | Concurrent identical delivered calls share one receipt/root/three-step stream; concurrent changed name conflicts. Reordered object keys and explicit defaults return the original result without writes. A distinct explicit operation creates a second root, each revision3/three batches, six distinct step keys overall.                                                                                                                                                     | Representative normalized identity; accepted local process-ownership/validation checks remain reusable evidence, not new actual-backend permutations.                                                                                 |
| R08 root collision                           | An independent semantic POST reserves the exact proposed root before MCP's unchanged draft POST. Real409 id_collision leaves that one empty peer draft unchanged, with one batch/revision and two replay records. Reopen returns original failure without replacing UUIDs/keys or dispatching dependent work.                                                                                                                                                                   | Actual root collision; other key-reuse/malformed-success cases remain S5.                                                                                                                                                             |

Oracles use current shared MCP draft0.2/backend v1, the accepted T09 admission
mapping, literal expected domain values, exact in-memory wire bytes and independent
DB counts/history. No raw bodies, credentials, account/resource IDs or private
locations are copied into evidence. Relay gates perform real semantic fixture HTTP
and forward original MCP bytes; they never manufacture successful backend outcomes.

## Checks, provenance and retained history

Production typecheck/lint/format and clean output build PASS before execution.
Scoped Node syntax, Python AST, ESLint/Prettier and helper/auth import resolution
PASS. No install/build raced either runtime candidate. No fresh clean locked MCP
installation claim. [Product identity](t16-s4-product-identity.json) records312/312
checked product/config inputs and emitted outputs unchanged from S3. No product,
dependency, compiler, schema or shared-contract changes.

[Initial qualification](t16-s4-initial-qualification.json) preserves3/5 with two
test-authoring mistakes: precheck expected not_found instead of the accepted
invalid_reference, and collision provisioning supplied an unsupported draft name.
Both were corrected from documented contracts, not by changing product behavior.
[Focused qualification](t16-s4-focused-results.json) then passed5/5. The first full
run passed42/42; [pre-review results](t16-s4-pre-review-results.json) retain it.
Review tightened only the new concurrency gate's bounded wait and early-failure
cleanup; the final full candidate above passed42/42 again. No existing assertions
or tests were weakened, deleted or excluded.

The initial version-only probe found T01_NODE_HOME unset. The retained disposable
Node24.21.0/npm11.19.0 was selected before source checks/build/test execution; system
Node and Pi settings were not changed. Other pins: Java27, PostgreSQL16, SDK1.32.1,
TypeScript5.9.3 and Vitest4.1.11. [Contract comparison](t16-s4-contract-comparison.json)
confirms24 backend/catalogue inputs still match both consumers and S1 baseline,
and records the current normative MCP draft hashes.

[Backend provenance](t16-s4-backend-provenance.json) records116 unchanged original
backend inputs, original/overlaid launcher,117-input disposable test build and JAR/
image hashes. S1's six exact historical prose-only build pins remain separate from
current normative contracts. The existing backend-owned test Clock is included only
in that disposable artifact. Seven actual Java restarts include three fixed-clock
selections; process identities changed, and system-clock mode was restored.
Owned Java/launcher/container/socket/config/snapshot cleanup passed.
[Provider cleanup](t16-s4-cleanup.json) confirms private bus/provider exit and root
removal. Original backend/Android, personal/live resources and .pi were untouched.
Nothing staged, committed, deployed or enabled outside the isolated fixtures.

## Safe commands and remaining work

Provide the existing disposable tool/source/provider locations through placeholders:

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
node --version
npm --version
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
node --check test/backend-interoperability/helpers.mjs
node --check test/backend-interoperability/creation-decisions.test.mjs
node_modules/.bin/eslint test/backend-interoperability/helpers.mjs test/backend-interoperability/creation-decisions.test.mjs
node_modules/.bin/prettier --check test/backend-interoperability/helpers.mjs test/backend-interoperability/creation-decisions.test.mjs
node --input-type=module -e 'await import("./test/backend-interoperability/helpers.mjs"); await import("./dist/auth/index.js")'
python3 test/backend-interoperability/run-isolated.py --slice T16-S4 \
  --restartable --clock-seam \
  --backend-root "$T16_BACKEND_ROOT" --android-root "$T16_ANDROID_ROOT" \
  --node "$T01_NODE_HOME/bin/node" --provider "$T16_PROVIDER" \
  --libraries "$T16_LIBRARIES" --selection docs/evidence/t16-s4-selection.json \
  --output /tmp/gt-t16-s4-accepted
```

Maven uses the backend lock and excludes Maven tests: build evidence only. Final
document-only formatting/link/status/whitespace checks are recorded separately in
[document closure](t16-s4-doc-closure.json), not as another runtime replay.

Changed executable paths: test/backend-interoperability/creation-decisions.test.mjs,
helpers.mjs and run-isolated.py only. Planning/status/evidence/handoff documents also
changed. S5 crash/cancellation/uncertainty, S6 other-client races/lifecycle, S7 isolated
Android sync and parent integrated acceptance remain. The historical T18 archive
still needs S3's codec repair in a later verified candidate. Compatibility rows,
T16 release checklist, T17/T19 and independent T20 remain open.
