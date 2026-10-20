# T16-S2 — Actual refresh recovery, restart and authorization fences

**Disposition:** S2 complete, 2026-10-16. Parent T16 remains incomplete; later
outcomes unassigned, no automatic successor/release. Primary-agent implementation,
specification-derived oracle review and acceptance, not independent T20 review.
[Work order](../tasks/t16-s2-work-order.md), [handoff](../handoffs/t16-s2.md).

## Result and scope

**90/90 PASS in eight exact files:** all nine active T16 checks (four S1 + five S2)
and 81 unchanged T06/T12/T15 regressions. Zero failed/skipped/pending/todo. Runtime
175.39 seconds. [Selection](t16-s2-selection.json),
[inventory](t16-s2-artifact-inventory.json): 604 selected hashes stable during execution.
The owning suite is complete for these two slices; the full T16 contract is not.

Production typecheck, lint, format and build PASS. New Node/Python syntax, scoped
ESLint/Prettier and helper import resolution PASS. [Product identity](t16-s2-product-identity.json)
confirms all 298 checked product source/config/output inputs match S1, including all
194 emitted outputs after rebuilding. No product source/dependency/schema/contract
change, fresh MCP npm-ci/clean-reconstruction or independent release claim.

Actual isolated backend/PostgreSQL, compiled MCP/SDK and private provider/ext4/TLS
are reused. The narrowly overlaid launcher supervises only its Java child via a
mode600 Unix socket in the private mode700 runner root, preserving JAR/database/
keys/origin. No HTTP control endpoint, auth bypass or product configuration change.
[Provenance](t16-s2-backend-provenance.json) records original/overlaid launcher and
control hashes, exact JAR/image identities and **two actual restarts with changed
Java process identities**. Original 116 backend inputs remained unchanged.

## Specification-derived observations

| Requirement/risk | Actual observation | Limit |
| --- | --- | --- |
| A03 / A06 concurrent401 recovery | Three delivered reads share one successful real refresh; DB auth replay count increases once, one refresh remains current and the session is not revoked; original returned grant/deadlines installed exactly | Server credential was deliberately expired in isolated setup; no wall-clock expiry-boundary claim |
| A04 durable original refresh | Successful response lost after real commit; private predecessor/body/key retained; MCP and backend restarted; no startup refresh; explicit read replays identical bytes/key and receives identical original response; DB records/current token unchanged | A05 expired-access replay and further timing/legacy/deletion cases remain open |
| R02 representative service restart | Lost populated-draft response leaves revision2/two batches; actual backend restart preserves DB history; explicit exact replay finishes the original root at revision3/three batches/three replay rows | Other service-restart/crash cross-products remain open; S1 covers response loss at all three steps |
| Dedicated logout versus in-flight write | Real row lock queues actual logout first, then actual workflow mutation; pg_stat_activity independently proves both reached the backend lock; logout commits first, mutation/refresh reject; zero domain/replay/batch effects; separate same-account session stays live | No complete local generation/lifecycle gate claim from this case |
| Account disable versus in-flight write | Workflow waits at real authorization lock; fixture account is disabled in owning transaction; released write/refresh reject, no domain/replay/batch effects; separate account stays live | Fixture disable state, not account-deletion proof/acceptance/purge coverage |
| Generic auth failure privacy | Rejected workflows retain the original bound private grant and nonempty operation evidence; no dependent mutation | Does not close A10 authoritative deletion cleanup |

Assertions use fixed public outcomes and independent DB counts/lock observations,
not adapter messages alone. Exact request/grant material remains private in memory
or encrypted profile storage; errors do not dump actual/expected bodies. Existing
scripted T06/T12/T15 checks are regressions, not new real-service coverage.

## Qualification and retained failures

Pinned Node24.21.0/npm11.19.0, Java27, SDK1.32.1, TypeScript5.9.3 and Vitest4.1.11.
S1's current 24 contract/catalogue input hashes still match both consuming checkouts.
The original historical checksum gate remains intact: the same six exact declared
prose blobs are recovered only in the disposable build copy, with current contracts
as oracle. No source/schema/API/catalogue replacement or personal inputs.

Early scoped lint rejected a ternary used only for promise resolution; it was
rewritten as an explicit branch. First restart qualification refused an ambiguous
replacement anchor matching normal wait and teardown wait, before Maven/container/
service startup. [Initial qualification](t16-s2-initial-qualification.json) retained;
anchor narrowed to the main wait plus following handler, retaining the exact source
hash guard. No gate was bypassed. The repaired focused run passed all five S2 cases
and owned cleanup: [focused results](t16-s2-focused-results.json).

No build/install overlapped tests. Final eight-file selection was fixed before
execution and includes the whole active T16 suite; unrelated suites were not claimed
or silently excluded. Final status/compatibility prose passed the full foundation
package-contract file 43/43, scoped formatting and git diff --check after runtime.
This is a separate document check, not another 90-check runtime replay.

## Reproduction and cleanup

Use supplied source/tool/provider locations through placeholders. Maven package in
the disposable copy acquires the backend lock and explicitly excludes Maven tests;
it is build evidence, not a backend Maven-suite pass.

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
node --version
npm --version
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
python3 test/backend-interoperability/run-isolated.py --restartable \
  --backend-root "$T16_BACKEND_ROOT" --android-root "$T16_ANDROID_ROOT" \
  --node "$T01_NODE_HOME/bin/node" --provider "$T16_PROVIDER" \
  --libraries "$T16_LIBRARIES" --selection docs/evidence/t16-s2-selection.json \
  --output /tmp/gt-t16-s2-final
```

Provenance confirms restarted Java/backend launcher exited, container/control/
config/build snapshot removed and original backend inputs stable.
[Provider cleanup](t16-s2-cleanup.json) confirms private provider/bus exited and
private profile roots removed. No personal/live phone/service/database/config,
paused Android journey, .pi or unrelated process was touched. Nothing staged,
committed, deployed or enabled for production.

A05 timing, full filter/cursor/numeric/ownership, other creation/domain/race/crash/
lifecycle cases, isolated Android sync observation and final parent acceptance stay
open. No complete T16 matrix row/release gate closes. Later outcomes require separate
assignment; T17/T19/T20, T06 omissions and T04 limits remain unchanged.
