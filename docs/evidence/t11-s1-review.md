# T11-S1 acceptance — explicit active-journal recovery

**Accepted/closed:** 2026-10-15, primary Codex agent. User authorized first-slice
implementation after [planning](../decisions/t11-plan-and-slices.md).
[Work order](../tasks/t11-s1-work-order.md),
[inventory](t11-s1-artifact-inventory.json), [handoff](../handoffs/t11-s1.md).
S2/S3 remain unassigned; parent T11 is incomplete and product creation unavailable.

## Delivered behavior and review

CreationExecutor now offers executeRecovery(binding,handle,signal), using the
same per-step body and module-wide handle exclusion as executeFresh/executeNextStep.
Fresh eligibility remains pristine-only; recovery accepts active pristine/pending/
confirmed-prefix journals within an awaited real withOperation callback. Filter
confirmed steps once, advance sequentially using durable replies, and stop at the
first terminal/stopped result. Existing terminal journals/receipts reject invalid_state
without mutation or stored-result delivery; S2 owns that delivery policy.

Pending work uses original stored identity without advisory GET. Unsent dependent
steps reuse T10's current baseline comparison. T05/T06 bounded retries/deadlines/
refresh remain unchanged; no outer retry, allocation, startup IO, rollback, delete,
sync fallback or compaction. Cancellation/fences retain latest acknowledged history
and stop later sends. Existing types/errors/formats/config guard boundaries remain.

Source/spec/test review checked shared creation/tools state/error rules against
the complete workflow, exclusion cleanup, pending-prefix selection, confirmation
ordering, cancellation and historical-result rejection. This is primary-agent
review, not independent release/security certification. Comparing prior T10
inventory hashes finds exactly three changed prior source/test/config inputs:
src/creation/executor.ts, types.ts and index.ts; prior tests/manifests/configs match.
Two new T11 test files contain independent specification-derived expectations.

## Checks and artifact identity

| Check | Result |
| --- | --- |
| Node/npm | 24.21.0 / 11.19.0 |
| npm run typecheck | PASS |
| npm run lint:production | PASS |
| npm run format:check:production | PASS |
| npm run build | PASS |
| Scoped creation/T11 ESLint, Prettier, new-test node --check | PASS |
| Focused recovery + unchanged fresh suite | 21/21 PASS |
| Focused actual provider/ext4/HTTPS recovery | 1/1 PASS |
| Final complete active S1 + selected unchanged regressions | 94/94 PASS in 11 files |
| Stable selected source/emitted/test/config hashes | 494/494 unchanged through final run |
| Bounded silent import/construction smoke | PASS, exit0, 5-second bound |
| Private provider qualification and owned cleanup | PASS |

S1 owning:13 decision+1 real integration=14; unchanged regressions80; total94.
Zero failed, pending, skipped or todo assertions. No build/install raced tests.
No clean install/reproduction was run in S1; integrated parent S3 owns that gate.
Smoke/source review does not claim comprehensive runtime interception or OS sandboxing.
Inventory contains relative paths/hashes and exact selection, no private bodies,
tokens, runtime locations or credentials.

The environment initially lacked T01_NODE_HOME: a version-only probe exposed
system Node26/npm12. The existing provisioned locator was resolved immediately;
all build/static/test commands used Node24.21.0/npm11.19.0, with no system changes.
No product/test assertion failed during this slice. A read-only comparison attempt
found the prior disposable clean snapshot removed; comparison instead used the
accepted T10 relative hash inventory. This is not a clean-reproduction claim.

## Exact safe execution

After resolving the existing disposable toolchain locator and verifying versions:

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
node node_modules/eslint/bin/eslint.js src/creation test/unit/t11 test/fault/t11
node node_modules/prettier/bin/prettier.cjs --check src/creation test/unit/t11 test/fault/t11
node --check test/unit/t11/s1-recovery.test.mjs
node --check test/fault/t11/s1-recovery.test.mjs
```

The final command below ran inside the reused private T10 isolation runner through
a small selection/hash/smoke wrapper. Private output/runner locations are replaced
with role placeholders; their SHA256 identities are in the inventory. Do not run
provider suites against a personal bus or without the qualified fixture environment.

```sh
node node_modules/vitest/vitest.mjs run --no-file-parallelism \
  test/unit/t11/s1-recovery.test.mjs \
  test/fault/t11/s1-recovery.test.mjs \
  test/unit/t10/s2-executor.test.mjs \
  test/unit/t10/s3-fresh.test.mjs \
  test/fault/t10/s2-execution.test.mjs \
  test/fault/t10/s3-workflow.test.mjs \
  test/unit/t09/s3-transitions.test.mjs \
  test/fault/t09/s3-persistence.test.mjs \
  test/unit/t05/10-replay-identity.test.mjs \
  test/fault/t06/s4-refresh-retry.test.mjs \
  test/fault/t06/s4-concurrency-fences.test.mjs \
  --reporter=json --outputFile=<private-result-file>
```

Reused runner creates fresh mode0700 disposable HOME/XDG/temp roots, private
D-Bus and foreground Secret Service, supplies explicit bus/ext4 fixture inputs,
qualifies libsecret store/read/clear, then terminates/reaps owned processes and
removes owned scopes. The actual provider fixture verifies ext4 via mountinfo.
No personal services or credentials were used. The stable runner also launches
a bounded child import/constructor with throwing synthetic capabilities, verifies
all three executor methods and silent completion, and compares hashes before/after.

## Specification-derived evidence and limits

Decision checks cover pristine execution, pending populate replay followed by save,
confirmed populate skipping, exact request bytes/keys, no outer retry on malformed
confirmation, detected edit/deletion, durable permanent rejection, cross-facade
recovery/fresh/single-step exclusion, cancellation/session-generation fences after
confirmation, cancellation during initial pending-history read, and terminal/
receipt rejection. Existing regressions retain T09 persistence/transition failures,
T10 single-step/fresh behavior, T05 replay identity and T06 refresh/fence guarantees.

Real composition uses production Secret Service/ext4/T04/T09/T06/T05 loopback HTTPS.
An independent literal request oracle verifies one draft root, complete populate
body and original three resource keys. The scripted first populate updates fixture
state but returns malformed `{}`. The call stops with draft confirmed, populate
pending and save unsent. Actual close/reopen sends nothing and retains identical
evidence. Another identical explicit call begins with PUT replay, then advisory GET
and save; no draft resend or GET settlement. Both PUT bodies/keys match exactly.
Revision9007199254740993 remains lossless, and save is observed only after durable
populate confirmation; terminal saved result is persisted before return.

This proves the local encrypted-store/HTTPS recovery boundary, not real backend
commits/idempotency, DB/Android interaction, phone sync, process crash or physical
power loss. S3 owns the required full per-step crash/response-loss matrix. S2 owns
live-authorized terminal replay and minimization/failure ordering. T12/T15/T16 and
external/independent release gates remain; T06 omissions and T04 whole-state restore
limits are unchanged. No staging/commits, shared-contract or dependency changes.
