# T10-S2 acceptance — durable single-step execution

**Disposition:** accepted/closed on 2026-10-15 under the explicit user assignment.
Primary-agent implementation, verification and spec/source/test review; no
independent security/release certification. S1/S2 closed; parent T10 incomplete.
S3 is ready for separate assignment, with no automatic successor.

## Delivered behavior and review

The [work order](../tasks/t10-s2-work-order.md),
[plan](../decisions/t10-plan-and-slices.md) and
[S1 handoff](../handoffs/t10-s1.md) govern. The internal creation entry adds
createCreationExecutor({session,checkpoints?}) and exported executor/result/
checkpoint/session types. Imports/construction perform no IO or enablement.
executeNextStep(binding,handle,signal) must be awaited in the live, guarded
T09 repository.withOperation callback. No fresh workflow or retry loop is added.

The factory captures fixed T06 methods and original receivers. Invocation
captures binding before yielding, checks cancellation/current session binding,
validates current T09 evidence and exact stored request, and selects only the
first unconfirmed step. Module-level handle exclusion rejects simultaneous calls
even through different executors. Retained handles and existing terminal/receipt
evidence cannot dispatch or deliver historical private results.

An unsent populate/save checks an authorized canonical getRoutine against the
T09 confirmed baseline, including exact revision, draft state and domain fields.
Changed/deleted state settles concurrent_modification before mutation; unrelated/
malformed reads stop active. Derived labels are excluded from identity. A pending
step skips this GET and replays its original identity. The check remains advisory,
not CAS; no account-wide backend lock is claimed.

The engine awaits dispatch marking, rechecks current handle/owner/signal/binding,
then calls only the corresponding T06 mutation method with detached original
bytes/key. S1 raw confirmation facts must persist before return. Save success or
saved-content conflict uses T09's atomic recordConfirmation(marker,terminal).
Permanent mutation rejection uses awaited settleTerminal; uncertain replies stay
active. T05 bounded retries/T06 reactive auth behavior are unchanged; no extra
attempt budget, sleep or automatic continuation.

Failure classification retains entry history before this attempt's dispatch
mark. Confirmation failures never acknowledge advancement. Ambiguous commits
retain T09's owner fence until actual close/reopen. A late checkpoint/abort/fence
after acknowledgement suppresses delivery with truthful newly confirmed history
and does not replace a durable terminal result. Awaited checkpoints expose only
frozen step/phase, never bodies/keys/credentials. Trusted effective policy/auth
invalidation still requires repository close plus execution abort in T15.

Primary review checked these ordering/lifetime rules against shared creation/
error/direct-identity contracts and actual T09/T06/T05 APIs. Accepted storage,
auth, transport, domain, config and protocol sources remained unchanged. S1's
internal comparator is reused without changing its decisions; its exact export
catalogue test explicitly adds the new factory as authorized by the S2 work order.
All other S1 assertions and historical evidence remain unchanged.

## Verification

Provisioned Node24.21.0/npm11.19.0; TypeScript5.9.3, Vitest4.1.11. No install,
global packages, system settings or trust-store changes. No build/install raced
tests. [Inventory](t10-s2-artifact-inventory.json) records relative selected hashes,
tree digests, exact commands/versions/results and smoke limitations.

| Check                                                                    | Result                                       |
| ------------------------------------------------------------------------ | -------------------------------------------- |
| npm run typecheck                                                        | PASS                                         |
| npm run lint:production                                                  | PASS                                         |
| npm run format:check:production                                          | PASS                                         |
| npm run build                                                            | PASS                                         |
| Scoped source/test ESLint and Prettier; four new .mjs syntax checks      | PASS                                         |
| New S2 decision/capability checks                                        | 15/15 PASS                                   |
| New S2 real encrypted engine/T06/T05 HTTPS checks                        | 12/12 PASS                                   |
| Complete unchanged S1 behavior selection, with additive export assertion | 56/56 PASS                                   |
| Complete active T10 S1/S2 owning selection                               | 83/83 PASS                                   |
| Selected unchanged T09/T05/T06 regressions                               | 88/88 PASS                                   |
| Final exact eleven-file selection                                        | 171/171 PASS, zero failure/skip/pending/todo |
| 37 selected source/test/emitted/config hashes                            | Stable before/after                          |
| Root/companion source, 178 compiled files and selected test-tree digests | Stable before/after                          |
| Fresh child import and inert construction smoke                          | PASS: exit0, empty stdout/stderr             |
| Owned diagnostic facility/holder/server cleanup                          | PASS                                         |

Final exact selection:

```sh
node node_modules/vitest/vitest.mjs run --no-file-parallelism \
  test/unit/t10/s1-confirmation.test.mjs \
  test/unit/t10/s1-failure.test.mjs \
  test/unit/t10/s2-executor.test.mjs \
  test/fault/t10/s2-execution.test.mjs \
  test/unit/t09/s1-format.test.mjs \
  test/unit/t09/s2-admission.test.mjs \
  test/unit/t09/s3-transitions.test.mjs \
  test/fault/t09/s3-persistence.test.mjs \
  test/unit/t05/10-replay-identity.test.mjs \
  test/fault/t06/s4-refresh-retry.test.mjs \
  test/fault/t06/s4-concurrency-fences.test.mjs \
  --reporter=json --outputFile=<private-result-file>
```

Owning28+28+15+12=83; unchanged regressions27+19+9+6+6+12+9=88; total171.
This deliberately selects S2-relevant unchanged regressions, rather than inheriting
all183 regressions from S1. No prior evidence is removed and no whole-repository,
whole T09 or parked/deferred-suite pass is claimed.

Scoped validation used local ESLint/Prettier on src/creation, test/unit/t10 and
test/fault/t10, plus node --check on s2-executor.test.mjs, s2-helpers.mjs,
s2-execution.test.mjs and s2-fixture.mjs. A five-second child imports the entry and
constructs a factory with synthetic capabilities that throw if invoked; it exits
silently. This is bounded smoke/source evidence, not comprehensive interception
or an OS sandbox. No clean locked install/reproduction ran in S2.

## Real boundary evidence

Tests compose the actual encrypted T04 diagnostic facility/holder, T06 session
installation/reopen/authenticated facade, T09 repository and production T05 HTTPS
transport. Public disposable test-only loopback cert/key and explicit testCaPem
provide local TLS; no global trust/environment changes or personal facilities.
Expected response IDs/domain values are independently authored synthetic records.
The HTTPS responder is a fixture, not a real GymTracka backend/DB.

All three fixed mutation endpoints persist dispatch possibility before the server
receives a request and confirmed state/result before return. Captured requests
match original method, concrete route, exact body bytes and resource key; only
one mutation method/step is called. A reopened pending populate preserves alternate
whitespace JSON bytes/key and sends no startup traffic, then replays without GET
or save. Root/child identities are never regenerated.

Real commit.before.prepare failure during marking leaves unsent state and zero
domain sends. The same definite failure during confirmation leaves pending state
with no acknowledged marker/dependent send. commit.reply holder death commits
confirmation but yields no acknowledgement; the repository fences, suppresses the
callback result and permits only actual owner close/reopen. Durable confirmation
is then visible without startup sends. Original bytes/history remain intact.

Actual populate/save permanent errors persist terminal rejection and prevent
further sends, including a repeat through this executor. A valid shape with
mismatched populated content stays pending/uncertain and does not send save.
A valid same-root changed-content save atomically stores exact revision above
2^53, confirmed save and concurrent_modification/outcomeUnknown=false. Actual owner
generation change after marking fences before any domain send. Local boundary
checks additionally cover baseline revision/content/deletion, late interruption,
method capture, concurrent handles and callback lifetime. Existing T06 regressions
retain real TLS refresh/401 retry and cancellation/generation-fence coverage.

Every new real case closes the owned server, awaits responder work, closes the
owner and cleans the diagnostic facility; cleanup errors fail. Existing T04
facility close/cleanup reaps its holder/guard processes. No production Secret
Service or ext4 qualification is claimed by diagnostic fixtures; that composition
remains S3. Full per-step crash/recovery permutations remain mandatory T11 work.

## Development record, changes and limits

- Early typecheck caught OperationRecord passed without narrowing to ActiveJournal;
  the initial snapshot now checks kind before active validation. No behavior was
  weakened and final typecheck/build pass.
- Early scoped lint caught one unused test import; it was removed. Final scoped
  and production lint/format/syntax pass.
- First focused S2 run passed27/27. The final full owning/regression run passed
  171/171 without behavioral failures, exclusions or skipped checks.

Production edits are new src/creation/executor.ts plus additive types/index and
internal comparator reuse. Tests add two S2 unit/helper files and two real fixture/
test files; S1's export assertion expands exactly as scoped. Remaining edits are
S2 work order/evidence/inventory/handoff and T10 plan/task/index/roadmap/verification.
Preexisting uncommitted work, all past evidence, parked T02/retired T13/T14,
T06 omissions and T04 whole-state restore limits are preserved.

There is no executeFresh, MCP creation wiring, new config permission, terminal
replay/compaction policy, automatic recovery/startup queue, real backend/Android/
Google/named-host or independent release claim. Product create_routine remains
unavailable. Clean locked reproduction, full isolated production-provider/ext4
composition and integrated parent T10 acceptance remain S3, UNRUN here.
S2 grants closed; no staging/commits or automatic S3. [Handoff](../handoffs/t10-s2.md).
