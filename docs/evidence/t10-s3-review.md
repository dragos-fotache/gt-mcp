# T10-S3 and parent T10 acceptance — fresh workflow

**Disposition:** accepted/closed on 2026-10-15 under the explicit S3 assignment.
S1/S2/S3 and integrated parent T10 are complete. Primary-agent implementation,
verification and specification/source/test review; no independent security/release
certification. No automatic T11 assignment or product creation enablement.

## Delivered behavior and review

The [S3 work order](../tasks/t10-s3-work-order.md),
[T10 plan](../decisions/t10-plan-and-slices.md) and
[S2 evidence](t10-s2-review.md) govern. The internal factory adds
`executeFresh(binding, handle, signal): Promise<CreationFreshResult>`.
CreationFreshResult is terminal/newly persisted result or stopped/sanitized error;
it never returns an intermediate confirmation. Invoke and await it inside the
actual guarded T09 repository.withOperation callback using the shared owner,
T06 session, captured binding and cancellation signal.

Fresh entry requires an active pristine journal: all steps unsent, no confirmed
marker and no terminal outcome. Pending/confirmed/terminal/receipt history rejects
with internal invalid_state before mutation or historical result delivery.
Module-level same-handle exclusion now surrounds either the single-step invocation
or the complete fresh workflow, including across distinct executor facades.
The private per-step execution body retains S2's original fixed capabilities,
exact stored request validation, unsent baseline guard, dispatch mark before wire,
confirmation before next step and atomic save/result persistence.

The fresh path executes draft -> populate -> save sequentially and returns on the
first stopped/terminal result. There is no outer retry, recovery loop, replacement
root/key, rollback/delete, sync/push fallback or startup work. Every new step
rechecks live owner/handle/session/binding/signal through the accepted executor.
Errors between steps retain acknowledged history; cancellation during the fresh
eligibility snapshot now returns admitted IDs, lastConfirmedStep=none and truthful
outcomeUnknown=false. Snapshot errors without authorized captured history retain
safe typed classification; native diagnostics cannot escape through that path.

Review compared ordering and fresh eligibility with the shared MCP draft0.2
creation/error rules, backend direct exact-byte identity and routine schemas,
and accepted T09/T06/T05 interfaces. S1 response predicates, T09 persisted format,
T06 authentication/refresh, T05 wire retry behavior, domain/config/protocol sources,
manifests/lockfile/compiler settings and shared contracts remain unchanged.
T15 still owns effective config/auth invalidation composition and model-facing
creation enablement. The internal library does not grant creation permission.

## Verification and artifact identity

Provisioned Node24.21.0/npm11.19.0; TypeScript5.9.3 and Vitest4.1.11.
All implementation/build/test commands used the disposable toolchain after
resolving its existing locator; initial ambient version probing did not run
implementation or tests. No global install, system/Pi/trust settings changes,
staging or commits. No build/install raced tests against its target.

| Check | Result |
| --- | --- |
| Workspace npm run typecheck, lint:production, format:check:production, build | PASS |
| Scoped creation/T10 ESLint/Prettier; three new .mjs syntax checks | PASS |
| New S3 fresh-only/exclusion/cancellation decisions | 8/8 PASS |
| New S3 real production-provider/ext4/T06/T05 HTTPS workflows | 3/3 PASS |
| Preserved S1/S2 owning suites | 83/83 PASS |
| Complete active parent T10 owning suite | 94/94 PASS |
| Relevant unchanged T09/T05/T06 regressions | 88/88 PASS |
| Final workspace exact selection | 13 files,182/182 PASS |
| Clean npm ci --ignore-scripts and four production checks | PASS |
| Clean identical complete selection | 13 files,182/182 PASS |
| Clean source/config/test inputs | 345 match workspace and remain stable |
| Root/companion emitted outputs | 178 byte-identical and stable |
| Source/emitted/test/config selected hashes | 492 stable, identical between runs |
| Bounded silent import/construction smoke | PASS in both final runs |
| Isolated provider qualification, fixture/server/owner/process teardown | PASS in both final runs |

Both final runs exit0 with zero failed, skipped, pending or todo cases.
[Artifact inventory](t10-s3-artifact-inventory.json) records exact selections,
per-file counts, relative hashes, versions, runner identities and smoke limits.
[Clean reproduction](t10-s3-clean-reproduction.json) records locked commands,
345 copied input hashes,178 emitted hashes and stability/comparison results.

Final exact selection in both workspace and clean source snapshot:

```sh
node node_modules/vitest/vitest.mjs run --no-file-parallelism \
  test/unit/t10/s1-confirmation.test.mjs \
  test/unit/t10/s1-failure.test.mjs \
  test/unit/t10/s2-executor.test.mjs \
  test/fault/t10/s2-execution.test.mjs \
  test/unit/t10/s3-fresh.test.mjs \
  test/fault/t10/s3-workflow.test.mjs \
  test/unit/t09/s1-format.test.mjs \
  test/unit/t09/s2-admission.test.mjs \
  test/unit/t09/s3-transitions.test.mjs \
  test/fault/t09/s3-persistence.test.mjs \
  test/unit/t05/10-replay-identity.test.mjs \
  test/fault/t06/s4-refresh-retry.test.mjs \
  test/fault/t06/s4-concurrency-fences.test.mjs \
  --reporter=json --outputFile=<private-result-file>
```

Owning28+28+15+12+8+3=94; regressions27+19+9+6+6+12+9=88; total182.
Selected runs use fresh qualified disposable provider scopes; the new S3 test
fails if isolation/provider/ext4 prerequisites are absent, never skips.
The private runner creates mode0700 HOME/XDG and temp roots, a private D-Bus and
foreground Secret Service with synthetic stdin password, then qualifies libsecret
store/read/clear and passes explicit bus/parent/isolation inputs. Parent filesystem
is checked from mountinfo by the reused T04 helper. The runner terminates/reaps
owned provider/bus processes and removes their scopes after tests. No personal
bus/provider fallback is used. Runner SHA256 identities are in the inventory;
private runtime locations and secrets are omitted from evidence.

The clean source snapshot copies only named production/test/config inputs,
including explicitly synthetic ignored TLS fixtures; no .git/.pi/node_modules/
emitted copy. It installs from the unchanged lockfile with a disposable npm cache
and empty private user-config selector, runs production checks/build, compares
both emitted file sets/bytes, and replays the same full selection on stable inputs.
No installation lifecycle hooks were run. Scoped checks use local ESLint/Prettier
on src/creation, test/unit/t10 and test/fault/t10 and node --check on the three new
.mjs files. Five-second child smoke imports the emitted creation entry and
constructs an executor whose synthetic capabilities throw if invoked; exit0 and
empty stdout/stderr are limited smoke/source evidence, not runtime interception.

## Real composition and specification-derived oracles

Three fresh workflows use public production provisionProfile/openProfile against
an isolated actual Secret Service on verified ext4, actual encrypted T04 holder,
T06 synthetic grant install/reopen/authenticated session, guarded T09 repository
and T05 private-CA loopback HTTPS. The same owner/session is shared throughout.
The small provider adapter reuses S2's server/auth/storage teardown fixture; S2
helpers gain only facility injection/read-state advancement for fresh workflows.

The scripted responder asserts independently authored exact method/route/body/key
for POST draft, PUT complete draft and POST save, one expected root/child family,
repeated exercise references, explicit nullable sets and default rest. It never
uses production request construction or comparison helpers as its oracle.
At each received mutation, current encrypted journal evidence has the selected
step dispatch-possible and every prior step confirmed with exact Int64 revision.
Save confirmation uses Int64 maximum. No workout or unrelated mutation route is
accepted. T09's additional live-authorized reads around commits remain intact.

Successful creation persists exactly one saved result before returning. Visibility
precheck succeeds, then an authoritative scripted422 invalid_reference at populate
persists rejection with backendErrorCode, preserves confirmed draft history and
never sends save. A race at save changes domain content in a structurally valid
same-root saved reply: save and terminal concurrent_modification persist together,
lastConfirmedStep=save and outcomeUnknown=false. All scenarios close/reopen the
actual owner and observe identical retained terminal evidence with no startup
traffic; executeFresh rejects that evidence without another mutation/result replay.

Local decisions cover existing pending/confirmed/terminal/receipt rejection,
whole-workflow same-handle exclusion against another executor's fresh/single-step
calls, uncertain populate stopping before save, and cancellation at initial read
and after confirmed draft. The preserved S2 real faults cover definite dispatch/
confirmation failures, ambiguous commit fencing, exact pending replay and actual
generation change. Full per-step crash/recovery permutations remain T11.
The scripted HTTPS responder is not a GymTracka backend/DB or Android session.

## Development record, changed paths and remaining limits

- First fresh decision run passed7/7. Review added the initial-snapshot cancellation
  regression and moved its post-read cancellation check inside captured-history
  classification; final8/8 passes. Fresh snapshot exceptions are sanitized.
- First provider run failed3 assertions: the new oracle omitted required T09
  live-access reads and the contract-preserved backendErrorCode. Read ordering was
  corrected to assert domain traffic while preserving the live-access guards;
  rejection expectation now includes the backend code. No production contract,
  guard or behavioral assertion was weakened to hide a failure.
- One provider setup attempt did not reach unlocked readiness in the inherited
  five-second deadline; no tests ran, and owned scope was cleaned. The disposable
  runner now waits up to20s while retaining the same unlocked/store/read/clear
  qualification. Subsequent focused3/3 and both full final runs passed.
- An earlier complete181/181 run preceded the cancellation repair. It is
  superseded by final182/182 workspace and clean evidence, not counted twice.

Production changes: src/creation/executor.ts, types.ts and index.ts. Tests:
new test/unit/t10/s3-fresh.test.mjs, test/fault/t10/s3-provider-fixture.mjs and
s3-workflow.test.mjs; additive s2-helpers.mjs/s2-fixture.mjs support. Remaining
changes are S3 work/evidence/inventory/clean evidence/handoff and current
T10 task/plan/index/roadmap/verification/pickup updates. Prior evidence and all
preexisting uncommitted work remain preserved.

T11 explicit recovery, terminal live-authorized replay and minimization remain
unimplemented; T12 trusted lifecycle, T15 effective config/MCP integration,
T16 real backend/DB/Android, named-host/desktop/Google and independent release gates
remain open. Preserve T06's accepted omissions, T04 whole-protected-state restore
limitation, parked T02 and retired T13/T14. Product create_routine remains
unavailable. S3 and parent T10 grants are closed; no automatic T11.
[Handoff](../handoffs/t10-s3.md).
