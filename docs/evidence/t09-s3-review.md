# T09-S3 and integrated parent T09 acceptance

**Disposition:** accepted on 2026-10-15. S1/S2/S3 and all parent T09 work closed.
The user separately assigned S3 after accepted S2. No automatic T10 assignment.
The primary Codex agent planned, implemented, tested and reviewed this work;
independent external/security/release review is not claimed and remains separate.

## Delivered outcome

The [S3 work order](../tasks/t09-s3-work-order.md) and
[API note](../decisions/t09-journal-format.md#delivered-s3-transitions-and-trusted-retirement)
settle additive methods on the existing operations entry:
recordDispatchPossible, recordConfirmation (optional atomic terminal result),
settleTerminal, compactTerminal and trusted repository retireOperation.
All are private persistence primitives, with no mutation transport or model tool.

The repository preserves admitted UUIDs/resource keys/exact bodies/digest versions/
budgets/reservations, enforces ordered progress and terminal immutability, retains
exact positive Int64 revision text, and commits confirmation+terminal facts together.
Definitive compaction removes bodies/keys while retaining keyed repeat identity and
the original result. Uncertain evidence remains full until trusted retirement;
retirement writes a permanent body-free tombstone and never frees the operation ID.
Settled definitive receipts cannot be retired by this primitive, preserving their
profile-lifetime result guarantee. T12 still owns warning and explicit authorization.

Every change captures inputs before awaiting, probes current auth with the accepted
bounded listRoutines read, checks owner/binding/cancellation and serializes the full
store commit. A handle updates its acknowledged state only after persistence.
Callback end also fences unsent work and drains in-flight handle commits before
releasing exclusion/owner claims. Definite failure acknowledges nothing; ambiguity
fences the repository/owner until actual T04 reopening. No startup sends/repair.

S3 changed only src/operations/repository.ts, errors.ts and internal schema exports,
and added transitions.ts. No format/schema versions or accepted shape changed;
the schema export change merely reuses the existing strict confirmation/terminal
validators. S1 format/candidate/json/types and all existing tests/fixtures remain
unchanged. No dependencies, manifests, lockfiles, compiler settings, shared contract,
auth/storage/config implementation, parked experiments or .pi changed.

## Final verification

Provisioned Node24.21.0/npm11.19.0; TypeScript5.9.3, Vitest4.1.11.
No system toolchain/global package/settings changes. Commands ran only against
stable outputs; build/install never overlapped tests on their execution target.

| Check | Result |
| --- | --- |
| Workspace npm run typecheck | PASS |
| Workspace npm run lint:production | PASS |
| Workspace npm run format:check:production | PASS |
| Workspace npm run build | PASS |
| New S3 test/helper node --check, scoped ESLint/Prettier | PASS |
| New S3 local decision/concurrency checks | 9/9 PASS |
| New S3 real engine/restart/fault checks | 6/6 PASS |
| Unchanged S1/S2 owning selection | 49/49 PASS |
| Complete active T09 owning suite | 64/64 PASS |
| Relevant unchanged T03/T04/T06/T08 regressions | 132/132 PASS |
| Workspace final exact selection | 17 files,196/196 PASS |
| Clean npm ci --ignore-scripts and four production checks | PASS |
| Clean same17-file full selected replay | 196/196 PASS |
| Copied clean source inputs | 329 match workspace; stable through replay |
| Clean root/companion emitted files | 166 byte-identical; stable through replay |
| Selected artifact/input identity | 62 identical stable hashes in both runs |
| Silent emitted operations import smoke/source review | PASS; limited evidence |
| Real isolated provider/ext4/HTTPS and fixture cleanup | PASS in both selected runs |

Both final runs have zero failed, pending, skipped or todo tests and exit0.
Exact selection, under the qualified isolated fixture environment:

```sh
node node_modules/vitest/vitest.mjs run --no-file-parallelism \
  test/unit/t09/s1-format.test.mjs \
  test/unit/t09/s2-admission.test.mjs \
  test/fault/t09/s2-storage.test.mjs \
  test/unit/t09/s3-transitions.test.mjs \
  test/fault/t09/s3-persistence.test.mjs \
  test/unit/t03/parse-normalize-identity.test.mjs \
  test/unit/t03/write-projection-result.test.mjs \
  test/unit/t04/bytes.test.mjs \
  test/unit/t04/binding.test.mjs \
  test/fault/t04/lease.test.mjs \
  test/fault/t04/commit-crash.test.mjs \
  test/fault/t04/key-facility.test.mjs \
  test/fault/t04/stale-anchor.test.mjs \
  test/unit/t06/s4-auth-session-validation.test.mjs \
  test/fault/t06/s4-refresh-retry.test.mjs \
  test/read-runtime/startup-config.test.mjs \
  test/read-protocol/configured-policy.test.mjs \
  --reporter=json --outputFile=<private-result-file>
```

Owning count27+19+3+9+6=64. Regression count28+19+7+8+5+17+9+5+12+12+8+2=132.
No whole-repository or parked/deferred-suite pass is implied by these selections.
[Selected inventory](t09-s3-artifact-inventory.json) and
[clean reproduction](t09-s3-clean-reproduction.json) contain only relative paths,
SHA256, commands/results and counts. The clean snapshot copied329 source/config/
test inputs (including explicitly synthetic ignored TLS fixtures), with no
node_modules/emitted/.git/.pi copy; it installed from the unchanged lockfile using
a disposable npm cache and empty private user-config selector. Neither prior S2
evidence nor historical source hashes were rewritten.

## Boundary evidence and review

Simple local tests derive expected prefix/lifecycle behavior from shared creation
and S1 v1 rules: no out-of-order dispatch/confirmation, exact latest-marker repeats,
no terminal replacement, invalid atomic settlement leaves confirmation pending,
save conflict confirmation+terminal is one commit, uncertain compaction denial,
body-free permanent retirement, fresh auth on updates, late cancellation and
unawaited begun-commit draining, and different-ID admission/update serialization.

Real isolated diagnostic T04 sessions persist alternate-whitespace admitted bytes
through pending/confirmed/terminal/receipt states without reserialization or key
replacement. A separate Node process reopens pending and compact receipt evidence
and returns only a synthetic fingerprint. Actual revisions above2^53 and Int64-max
remain exact. Compaction preserves the original receipt/digest/history and removes
body/key/domain fields. Vault bytes remain unchanged; synthetic ciphertext contains
no plaintext routine-name sentinel (not a comprehensive forensic-erasure claim).

Real engine faults at commit.before.prepare and commit.reply during confirmation
prove no acknowledgement on definite or ambiguous failure. The definite failure
retains pending bytes; ambiguous durable confirmation is visible only after actual
owner reopening, with no continued handle use. Missing key/corrupt payload deny
confirmation/admission without reset. Restoring older encrypted operation bytes
under the current untouched anchor fails fence_mismatch. Unchanged T04 key/anchor/
lease regressions preserve the supported fencing boundary; restoring the entire
protected state including its anchor remains T04's documented unsupported case.

The unchanged S2 real production adapter check supplies the actual private Secret
Service/ext4/T06-HTTPS admission/reopen/auth/visibility/child ownership composition
in both final runs. The reused fixture runner creates fresh private HOME/XDG,
DBus/keyring/TLS/profile scopes, qualifies synthetic store/read/clear and ext4, then
terminates/reaps provider/bus processes and removes owned fixture data. New S3
decision tests and diagnostic state tests use explicit local auth fakes; those are
not evidence of live backend authentication. No personal bus/service/account used.

Primary source/spec review checked immutable transformations, latest-record
comparison, whole-store serialization, reservations, state ordering, terminal
minimization and callback lifetime. A five-second bounded child import smoke
returned exit0/empty stdout/stderr; source imports define code/types only.
This is neither comprehensive interception nor an OS sandbox/security audit.

## Development findings retained

- Early typecheck and production-source lint passed. Focused transition+unchanged
  S2 replay passed28/28; focused S3 local+persistence replay passed15/15 twice.
- Initial scoped lint rejected unused state destructuring in the identity assertion
  and an undeclared structuredClone test global. The assertion now compares the
  whole original step with only the expected state reset; the fixture uses a JSON
  clone of its known JSON shape. No assertions/contracts were weakened and no
  behavioral test failure was excluded or removed.
- Review identified that a callback could start a handle commit and return without
  awaiting it. S3 tracks/drains in-flight work and tests that same-ID exclusion
  survives until settlement, preserving durable bytes while suppressing late success.
  This is a source finding, not a claimed prior observed red test.
- No install/build/test acceptance failure remains. Initial lint failures above
  are retained; final static and behavioral checks pass without skips or masking.

## Parent disposition and limits

T09 now supplies the complete private durable operation repository required by
T10/T11/T12. Creation remains unavailable even with writesEnabled:true: no mutation
dispatch, backend confirmation predicate, actual replay/orchestration, trusted
lifecycle command or MCP creation/config-file composition was added. Those stay
with T10/T11/T12/T15 and real interoperability/release tasks. Terminal snapshots
do not authorize private client replay. Actual Google/backend/Android/named-host,
power-loss and independent security/release gates are unrun; T06 omissions remain.

Changes additionally include three new S3 test/helper files, S3 work order/API note,
evidence/inventories/handoff and current plan/task/index/roadmap/verification status.
Preexisting uncommitted workflow changes and all S1/S2 history are preserved.
No staging/commits, deployment, product enablement or automatic successor.
