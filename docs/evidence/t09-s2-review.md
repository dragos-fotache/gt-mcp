# T09-S2 acceptance — guarded durable admission

**Disposition:** accepted on 2026-10-15; S2 source/test/build/execution work closed.
Parent T09 incomplete. S3 remains unassigned/held for separate authorization.
The user explicitly assigned S2 from the [S1 handoff](../handoffs/t09-s1.md).
The primary Codex agent planned, implemented, tested and reviewed this slice;
no independent external/security/release review is claimed. Required parent and
release gates remain open.

## Delivered boundary

`src/operations/repository.ts`, emitted at `dist/operations/repository.js/.d.ts`,
is exported through the existing operations barrel. The
[work order](../tasks/t09-s2-work-order.md) and
[API/locking note](../decisions/t09-journal-format.md#delivered-s2-admission-api)
settle factory/handle types and error semantics. A repository uses the caller-owned
T04 session, existing T08 config validator and mandatory T06 read capabilities;
it never provisions/closes the owner or receives mutation transport.

Complete input capture precedes asynchronous work. Startup policy/current live
authenticated listRoutines(limit=1) precede private lookup; retired/existing lookup
precedes new visibility/allocation. Actual T04 versioned keyed digest comparison
retains equivalent intent and rejects conflicts. New operations check distinct
references, then atomically commit all three exact request identities under the
whole-store lock with full retained reservations before exposing a handle.
Per-operation exclusion lasts through callback/final owner validation. Async
handle reads check T04 lease/generation/integrity, retain detached exact bytes and
expire at callback completion/cancellation/close. Commit uncertainty permanently
fences the repository/owner object until the actual T04 owner is closed/reopened.

Only S1 `errors.ts` and `index.ts` were extended; its five other source modules,
owning test and selected old regressions match the S1 artifact inventory. No
existing tests, shared contracts, dependencies, manifests, compiler settings,
auth/storage/config implementation or parked experiments changed in S2.
Other workflow/doc modifications already present at pickup remain uncommitted.

## Final verification

All production/static/build/test commands used the provisioned disposable
Node24.21.0/npm11.19.0, TypeScript5.9.3 and Vitest4.1.11.

| Check | Result |
| --- | --- |
| npm run typecheck | PASS |
| npm run lint:production | PASS |
| npm run format:check:production | PASS |
| npm run build | PASS |
| node --check on the three new test/helper files | PASS |
| Scoped ESLint/Prettier on those files | PASS |
| New S2 owning tests | 22/22 PASS |
| Unchanged S1 owning tests | 27/27 PASS |
| Unchanged selected T03/T04/T06/T08 regressions | 118/118 PASS |
| Final exact selection | 13 files,167/167 PASS; zero failed/pending/skipped/todo |
| Source/test/compiled/config artifact identity | 54 hashes stable before/after |
| Emitted operations import smoke | Exit0, empty stdout/stderr |
| Private provider/ext4/HTTPS/child ownership/cleanup | PASS |

Exact final Vitest selection (under the qualified isolated fixture environment):

```sh
node node_modules/vitest/vitest.mjs run --no-file-parallelism \
  test/unit/t09/s1-format.test.mjs \
  test/unit/t09/s2-admission.test.mjs \
  test/fault/t09/s2-storage.test.mjs \
  test/unit/t03/parse-normalize-identity.test.mjs \
  test/unit/t03/write-projection-result.test.mjs \
  test/unit/t04/bytes.test.mjs \
  test/unit/t04/binding.test.mjs \
  test/fault/t04/lease.test.mjs \
  test/fault/t04/commit-crash.test.mjs \
  test/unit/t06/s4-auth-session-validation.test.mjs \
  test/fault/t06/s4-refresh-retry.test.mjs \
  test/read-runtime/startup-config.test.mjs \
  test/read-protocol/configured-policy.test.mjs \
  --reporter=json --outputFile=<private-result-file>
```

Owning files contribute27+19+3 checks; regressions contribute28+19+7+8+5+17+
12+12+8+2. The private result runner inspected the JSON report and hashed the
selected target before/after. [Artifact inventory](t09-s2-artifact-inventory.json)
contains only relative paths and SHA256. No rebuild/install raced execution.
No npm install/ci was run or claimed; clean locked reproduction remains S3.

The reused disposable fixture runner created separate HOME/XDG and a private
DBus/gnome-keyring Secret Service, verified unlocked collection plus synthetic
libsecret store/read/clear, generated a temporary literal-loopback HTTPS CA and
qualified ext4 roots. Only that bus was supplied to production T04. The actual
T06 facade performed authenticated list/exercise reads over that HTTPS fixture;
the service returned valid empty routine pages and a synthetic visible exercise.
An authorized equivalent repeat survived exercise invisibility; a new reference404
and an access403 reserved no operation. A child process failed ownership while
the owner held the profile, then acquired it after release. Reopened evidence
retained the same journal, digest, keys and exact bytes, with vault bytes unchanged.

Actual T04 generation advance left its captured binding unchanged but fenced
async handle reads and callback result delivery. New-generation storage identity
reopening used explicit local auth/visibility fakes, not stale vault credentials;
it proves retained identity, not a real reauthentication flow (T07/T12 remain owners).
Diagnostic T04 faults at commit.before.prepare and commit.reply proved definite
io_failure/no admission and ambiguous/no callback/no replacement followed by
explicit durable reopening. Owned provider/bus processes were terminated/reaped,
and all disposable provider/TLS/profile roots were removed.

## Development findings retained

- The shell initially selected system Node26.11.1/npm12.2.0 because T01_NODE_HOME
  was unset. Only version diagnostics ran before resolving the existing provisioned
  toolchain. No system changes or global installations occurred.
- Source review found T04's captured binding cannot alone prove current generation.
  Before tests were authored, the new handle interface was changed from synchronous
  reads to async owner-checked reads; callback result delivery is checked too.
- First focused local run passed13/18. Fixture mistakes passed a session binding
  (extra sessionGeneration) to the strict durable codec, used incorrect T03 defaults/
  fields in the equivalent input, and compared Buffer with Uint8Array directly.
  Corrected the fixtures against T03/S1 specifications; unchanged expectations for
  equivalence, bytes and capacity remain. The repaired18/18 run passed.
- First integration run passed2/3. Its negative HTTPS fixture used an invalid
  nested error envelope, producing transport internal_error rather than not_found.
  Replaced it with backend-v1 errorCode/message fields and valid404/403 machine
  codes; repaired3/3 passed. Scoped lint also rejected a redundant process-global
  declaration, which was removed. No production contract was weakened.
- Final source review added a held-commit close/drain case and sanitized unknown
  callback exceptions, while preserving known safe error types. Final acceptance
  is19 local+3 real S2 checks and the full unchanged selection above.

## Limits and stop

This slice proves guarded admission, identity reuse, locking, capacity and the
delivered storage/auth-read composition. It does not send mutations, implement
state transitions/terminal settlement/compaction/retirement, authorize terminal
result replay, perform a live Google/backend/Android/named-host test, prove power
loss behavior, or constitute an independent security/release review. Product
create_routine remains unavailable even with writesEnabled:true.

Changed paths: new repository, operations exports/error extensions; two S2 owning
test files and one local helper; S2 work order/evidence/inventory/handoff; additive
format note and current T09 plan/task/index/roadmap/verification status. S1 evidence
and all prior dispositions are preserved. No .pi edits, staging or commits.
Next permitted implementation requires a separate S3 assignment.
