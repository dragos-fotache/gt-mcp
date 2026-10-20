# T16-S1 — Real backend creation/replay review

**Disposition:** first bounded T16 window complete, 2026-10-16. Parent T16 remains
incomplete; no successor or release. Primary-agent implementation, specification-
derived oracle review and acceptance, not independent T20 review.
[Work order](../tasks/t16-s1-work-order.md), [handoff](../handoffs/t16-s1.md).

## Result and boundary

**450/450 PASS in 49 exact files:** four new real-backend owning checks and 446
unchanged regressions; zero failures/skipped/pending/todo. Full active T15/T11/T08
files plus the prior T15 relevant T03/T09/T10/T12/foundation selection were included.
Runtime 457.74 seconds. [Selection](t16-s1-selection.json),
[inventory](t16-s1-artifact-inventory.json): 603 selected hashes unchanged during
execution. Generated Python bytecode was removed afterward. No product source,
dependency, schema or shared-contract edit; no unchanged regression was excluded.

Actual backend Java27 HTTP/domain/auth/replay and disposable PostgreSQL16 ran behind
a private-CA loopback TLS forwarder. Delivered compiled stdio and official SDK used
a fresh private Secret Service/ext4 profile. Two synthetic accounts received actual
service grants via refresh from isolated fixture credentials. The relay forwarded
actual bytes/results; its fault discarded a successful response after receiving it.
No external Google, deployed TLS or personal/live environment was exercised.

| Boundary | Actual observation | Limit |
| --- | --- | --- |
| M04–M06 representative reads | Mixed-case own-custom search, real catalogue version/IDs, foreign custom not_found, default20 plus continuation; own draft read and saved-only list | Full filters, foreign routine/workout,1/200 limits and cursor boundaries remain open |
| C01/C02 core mapping | POST draft → PUT populate → POST save, three keys, one root, ordered/distinct child IDs, preserved name/null/zero/default/empty/repeated-reference values | Broader creation/rejection/race scenarios remain open |
| C05 saved repeat | Same receipt and unchanged independent DB effects without another mutation | Terminal rejection and broader auth/lifecycle gates remain open |
| R02 response loss | Independently at draft/populate/save: uncertain result, committed DB prefix, no dependent step; MCP restart sends nothing; explicit repeat preserves method/route/key/body | Backend restart and other crash/persistence/error boundaries remain open |
| DB oracle | One root, persisted child values/relationships/order, final revision3, three replay records and three distinct sync batches; no replay duplicates | Other concurrency/domain/recovery gates remain open |
| Ordinary sync | Pull publishes draft1/2 and saved3; snapshot observes intermediate draft and final saved IDs/order | Android unrun; no instant/offline-delivery claim |

Literal contract values are checked before comparing generated identities with
independently queried persistence/sync. Auth fingerprint derivation only provisions
fixtures. Scripted regressions are not new real-backend coverage. No complete T16
matrix row/release gate closes from these representative checks.

## Qualification and retained failures

An initial version-only probe reached ambient Node26.11.1/npm12.2.0 because
T01_NODE_HOME was unset. All source checks/builds/tests used retained disposable
Node24.21.0/npm11.19.0. SDK1.32.1, TypeScript5.9.3, Vitest4.1.11 remain locked;
Java27 and Docker29.9.0 were qualified. Private provider binary SHA256:
29cb44793218cbda04694fc11d6cdd8bac6cc69f2347be03e5c356c5455f9c00.

First service qualification failed before Maven/service/container startup because
six current prose files disagree with the backend's historical checksum manifest.
[Initial failure](t16-s1-initial-qualification.json) is retained. Exact declared blobs
were recovered from Git 0bd414b6c1b819a26e2d5fca0bed6b6b5acf2cea only in the
disposable build copy. Original manifest/gate/current checkouts stayed unchanged.
Differences concern Android personal scope/import/recovery and docs/status/links;
runtime catalogue/OpenAPI/migrations/backend code were not replaced. Historical
build prose is provenance, not the normative oracle. Current 24 backend-contract/
catalogue files match across checkouts: [comparison](t16-s1-contract-comparison.json).

First focused run passed 4/4. Review then added independent persisted-child and
distinct-batch assertions and original-input stability checks before final 450/450.
Early scoped lint found an unused destructured field; formatting also failed.
Both were fixed before behavioral execution, without weakening assertions.

[Provenance](t16-s1-backend-provenance.json) records old/current hashes,116 build
inputs, backend HEAD 1d20cec9cf5c5465d52a2ca90a472f83dbf527f1 with existing dirty
state preserved, and exact tested JAR/image identities. Original public backend
inputs remained byte-identical. The private raw child log was hashed then erased.

## Checks and reproduction

Production typecheck/lint/format/build PASS. New Node syntax, Python compilation,
scoped ESLint/Prettier and helper import resolution PASS. No build/install overlapped
the stable test target. No fresh MCP npm-ci/clean-reconstruction claim for this slice;
parent integrated acceptance remains open. Maven package explicitly excluded Maven
tests and is build evidence, not a backend-suite pass.

Use supplied source/tool/provider locations through placeholders. The runner copies
public inputs, acquires the backend Maven lock and reuses the reviewed guarded
Android backend launcher and T15 private-provider runner. Missing inputs fail,
never skip. Exact command shape used for final execution:

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
node --version
npm --version
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
python3 test/backend-interoperability/run-isolated.py \
  --backend-root "$T16_BACKEND_ROOT" --android-root "$T16_ANDROID_ROOT" \
  --node "$T01_NODE_HOME/bin/node" --provider "$T16_PROVIDER" \
  --libraries "$T16_LIBRARIES" --selection docs/evidence/t16-s1-selection.json \
  --output /tmp/gt-t16-s1-final
```

Final status/compatibility prose passed the complete foundation package-contract
file43/43, scoped formatting and git diff --check after runtime execution.
This is a separate document check, not a second450-check replay.

## Cleanup and remaining work

Provenance confirms owned backend/container exited/removed and private config/build
snapshot removed. [Provider cleanup](t16-s1-cleanup.json) confirms private provider/
bus exited and private profile roots removed. Personal/live resources, paused
Android R17a journey, .pi and unrelated services were untouched. No staging/commit,
deployment, system-tooling change or production enablement occurred.

Full real auth/fence/cursor/ownership/creation/domain/race/recovery coverage, backend
restarts, isolated Android sync observation and parent integrated acceptance remain.
Later bounded assignments must name their scenarios/prerequisites; no automatic
succession. T17/T19/T20 and existing T06 omissions/T04 limits remain unchanged.
