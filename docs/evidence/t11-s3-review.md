# T11-S3 and integrated parent T11 accepted

**Accepted/closed:** 2026-10-15, primary Codex agent. The user authorized S2 then
S3; S2 was accepted before S3 implementation. [S3 work order](../tasks/t11-s3-work-order.md),
[plan](../decisions/t11-plan-and-slices.md), [fault matrix](t11-s3-fault-matrix.md),
[inventory](t11-s3-artifact-inventory.json), [clean reproduction](t11-s3-clean-reproduction.json),
[handoff](../handoffs/t11-s3.md). All T11 grants are closed. No successor assignment
or product creation enablement; independent/external release gates remain open.

## Result and review

S1 supplies explicit active-journal recovery; S2 supplies live-authorized terminal
delivery/definitive minimization; S3 proves the required per-step process boundaries
and completes integrated acceptance. No production change was needed in S3. The
delivered internal service awaits real T09 admission/exclusion and S1 execution,
retains exact request identity, skips confirmed work, uses advisory GET only before
unsent dependent steps, and returns only durable terminal results under live auth.
Saved-content conflicts retain confirmed save history. Uncertain errors preserve
evidence. Terminal settlement precedes compaction, fresh authorization and final
owner/binding/signal checks; failures never justify new mutations or identities.

Source/spec/test review checked shared MCP draft0.2 creation/tools and backend v1
identity rules against T09/T10/S1/S2 ordering, fixed routes/bytes/keys, lossless
revision handling, live replay, cancellation/fences, minimization and no startup/
TTL behavior. New tests use specification-derived request/state/result oracles
and real component boundaries, not private-function assertions or a generalized
harness. The primary agent performed this review; it is not independent security
or release certification. No shared contract, manifest/lockfile/compiler/dependency,
.pi, staging or commit changes occurred. Preexisting work/evidence was preserved.

S3 added narrowly scoped child/helper/matrix/failure files and optional T10 fixture
hooks for synthetic response dropping, fixture budgets and work between owner close/
reopen. One T10 exact export-list assertion now includes the already-settled
createCreationService API; all domain assertions remain. Against accepted S1,
prior source/test/config changes are only src/creation/executor.ts, index.ts,
types.ts, test/fault/t10/s2-fixture.mjs and that T10 export test. New production
boundary.ts/service.ts belong to S2; all unrelated inputs match their prior hashes.

## Acceptance and stable artifacts

| Check | Result |
| --- | --- |
| Runtime/tooling | Node24.21.0, npm11.19.0, TypeScript5.9.3, Vitest4.1.11 |
| Workspace typecheck / lint:production / format:check:production / build | PASS |
| Scoped creation/T11/changed-T10 lint, formatting, new helper/test syntax | PASS |
| Focused complete new S3 suites | 28/28 PASS |
| Complete active T11 owning | 55/55 PASS in workspace and clean replay |
| T10/relevant dependency regressions | 206/206 PASS in both runs:205 unchanged,1 additive export adaptation |
| Final integrated selection | 261/261 PASS in20 files in each run; zero fail/skip/pending/todo |
| Clean npm ci --ignore-scripts and four production checks | PASS |
| Copied clean source/config/test inputs | 355, matching workspace and stable through replay |
| Clean/workspace emitted outputs | 182 files, identical sets and byte-identical content |
| Stable selected source/emitted/test/config hashes | 506 in each run; identical across runs |
| Bounded silent service/executor import/construction | PASS in both runs, exit0,5-second bound |
| Qualified private provider/ext4/HTTPS and owned cleanup | PASS in both runs |

No build/install raced tests against its target. The clean source snapshot copied
only named production/test/config files and explicitly synthetic TLS fixtures, with
no .git/.pi/node_modules/emitted copy. It installed from the unchanged lockfile using
a disposable npm cache/empty private user-config selector, built both outputs,
compared emitted sets/bytes and replayed the identical selection. Hashes remained
stable. Inventory/reproduction use relative paths; private fixture/runtime locations,
credentials and bodies are omitted. Smoke/source review is not exhaustive runtime
interception or an OS sandbox. The owned clean source/cache snapshot was removed
after recording its relative artifact evidence.

## Required boundaries and targeted risks

The [matrix](t11-s3-fault-matrix.md) maps C05/C07 and R01–R10/R12 to local proof and
remaining T12/T15/T16 gates. Each of draft/populate/save has admitted-unsent reopen,
durable-dispatch-before-wire exit, reply-before-confirmation exit, and
confirmation-before-next-send/result exit. Separate child construction sends no
HTTP before explicit parent instruction. Nine abrupt client exits happen only after
awaited durable checkpoints; the observed owned T04 holder drains/exits before
reopen. A separate process is rejected by actual ownership exclusion. Every
observed mutation retains original method/route/body/key and root identity.

Representative actual HTTP cases include500,429/503 Retry-After beyond budget,
socket response loss and timeout, plus wire-dispatched cancellation at each step.
Other checks cover definite/ambiguous confirmation commits, failed terminal receipt
storage, concurrent identical/changed calls, detected resumed edit/delete and the
advisory-GET race producing a compact confirmed-save conflict. S1/S2 retained tests
cover malformed response recovery, private auth refresh/denial/invalidation,
definitive/uncertain terminal minimization and compaction failures across reopen.
Unchanged dependency checks retain collision, exact alternate bytes, Int64,
capacity/integrity/retirement, pre-admission cancellation and auth fences.

T06's accepted S4 work order deliberately caps each resource leg to one wire attempt,
with one eligible401 refresh/retry. T11 adds no outer retry or aggregate workflow
deadline. Transient network/500/503/malformed stops require another identical
explicit call. The shared contract sets no minimum automatic attempt count. The
plan now states this accepted cap explicitly; T05 direct-call retry/deadline24
regressions remain active without changing T06 policy.

## Development failures and corrections

- Early ESLint caught unused destructured state variables in the new identity
  projection; corrected the projection without disabling rules.
- First process matrix:5 passed/8 failed because client exit preceded holder lease
  release. The storage lock correctly refused reopen. The helper now waits for
  the observed owned holder's exit after IPC drain; no production lock relaxation.
  One retained issued diagnostic scope from that run was validated and cleaned
  through T04's facility API. Repaired matrix13/13 PASS.
- One new retry oracle initially expected maxAttempts=2 to survive T06 composition.
  The accepted [S4 work order](../tasks/t06-s4-work-order.md) and
  [ADR](../decisions/t06-implementation-adr.md) independently require a one-attempt
  cap. The oracle now asserts that cap and exact explicit retry, preserving the
  planned no-outer-retry policy. A focused1-case repair selected10 other cases out;
  they were not counted as passes. Subsequent complete selections have zero skips.
- First full integrated run:260 pass/1 failure at T10's obsolete exact export list.
  Added only the settled createCreationService export and updated its title;
  retained exact-list protection and all domain assertions. Focused28/28 and both
  final complete261/261 runs PASS. No failing test was excluded or weakened.

## Exact safe selection

Use provisioned T01_NODE_HOME and verify Node/npm versions. Run npm run typecheck,
npm run lint:production, npm run format:check:production and npm run build; scoped
node_modules ESLint/Prettier on src/creation, test/unit/t11, test/fault/t11,
test/fault/t10/s2-fixture.mjs and test/unit/t10/s1-confirmation.test.mjs; node --check
on new/changed .mjs files. Clean reproduction ran npm ci --ignore-scripts then
the same four production checks/build in the private source snapshot.

The exact command below ran in each fresh qualified private provider environment
through the small stable-selection/hash/smoke wrapper. Runner SHA256 identities
are in the inventory; private output/runner paths are replaced by role placeholders.
Never run provider suites against a personal bus or without fixture qualification.

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
node node_modules/vitest/vitest.mjs run --no-file-parallelism \
  test/fault/t10/s2-execution.test.mjs \
  test/fault/t10/s3-workflow.test.mjs \
  test/fault/t11/s1-recovery.test.mjs \
  test/fault/t11/s2-service.test.mjs \
  test/fault/t11/s3-crash-matrix.test.mjs \
  test/fault/t11/s3-failures.test.mjs \
  test/unit/t10/s1-confirmation.test.mjs \
  test/unit/t10/s1-failure.test.mjs \
  test/unit/t10/s2-executor.test.mjs \
  test/unit/t10/s3-fresh.test.mjs \
  test/unit/t11/s1-recovery.test.mjs \
  test/unit/t11/s2-service.test.mjs \
  test/unit/t09/s1-format.test.mjs \
  test/unit/t09/s2-admission.test.mjs \
  test/unit/t09/s3-transitions.test.mjs \
  test/fault/t09/s3-persistence.test.mjs \
  test/unit/t05/10-replay-identity.test.mjs \
  test/unit/t05/05-budgets-deadlines-retry.test.mjs \
  test/fault/t06/s4-refresh-retry.test.mjs \
  test/fault/t06/s4-concurrency-fences.test.mjs \
  --reporter=json --outputFile=<private-result-file>
```

The reused runner creates private mode0700 HOME/XDG/temp scopes, an explicit private
D-Bus and foreground Secret Service, qualifies libsecret store/read/clear and passes
explicit bus/ext4 fixture inputs. Tests verify ext4 via mountinfo. Owned provider/
server/child/holder cleanup and data removal passed in workspace and clean replay.

## Limits and next work

Local scripted HTTPS and process/store checks do not prove real backend DB roots/
children/revisions/idempotency/sync batches, Android edits/deletion, Google auth,
MCP response-loss delivery, named-host or physical power-loss behavior. T16 and
other owning release gates retain those requirements. No exactly-once guarantee
after recovery-evidence loss, CAS, rollback/delete, automatic startup continuation
or TTL is claimed. T04 whole-protected-state restore limits and T06 recorded
verification omissions remain unchanged. T12 trusted lifecycle and T15 config/MCP
composition remain unassigned; product create_routine is still unavailable.
