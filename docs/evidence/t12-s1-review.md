# T12-S1 — Trusted sign-out and operation retirement review

**Disposition:** accepted/closed, 2026-10-15. Final21/21 owning+121/121 relevant
regressions=142/142 in14 exact files, zero failures/skips/pending/todo. Four
production checks, scoped test checks, bounded silent import/signal smoke and
owned fixture cleanup PASS. All512 source/test/build hashes stable, including184
emitted files. [Inventory](t12-s1-artifact-inventory.json),
[handoff](../handoffs/t12-s1.md). S1 only; parent T12 remains incomplete.
User assigned “go ahead and start s1”; [work order](../tasks/t12-s1-work-order.md)
and [parent plan](../decisions/t12-plan-and-slices.md) govern. Primary-agent
specification/source/test review; no independent security or release certification.

## Delivered integration

`dist/lifecycle/index.js/.d.ts` adds `signOutProfile({configPath},signal)` and
`retireProfileOperation({configPath},operationId,signal)`. Both capture/validate
inputs before IO, use protected T07 metadata, refuse pending transitions, acquire
the actual T04 owner and recheck current descriptor/receipt. Safe typed failures
remain sanitized; unknown failures and failed owner cleanup require recovery.

Sign-out composes T06's fence-first credential clearing/generation advancement
with T07's protected metadata publication. The additive strict LoginReceipt v1
`sign-out` kind binds the same nonnull account/origin/profile to exactly the next
session generation. Receipt preparation precedes clearing; descriptor publication
and receipt removal follow the acknowledged transition. After prepared intent,
signals await owned settlement. Failed logout cannot undo durable local sign-out.
Operation bytes and keyed identity remain unchanged. No automatic creation follows
same-account explicit login; another account cannot inherit evidence.

Explicit recover recognizes a committed credential-empty lifecycle-v3 target,
requiring null grant/pending and no superseded credentials. A prepared but uncommitted
transition instead recovers the validated source without claiming sign-out succeeded.
An inconsistent target remains fenced with its receipt. Recovery sends no network
request and does not reconstruct corrupt/missing storage.

Retirement composes the actual owner, T06 session and accepted T09 retireOperation;
it does not perform creation admission or replace journal transitions. It works
with writesEnabled:false, but still requires live auth. Only unresolved evidence
can retire, atomically erasing bodies while permanently reserving IDs. Repeats are
idempotent; creation repeats of retired IDs reject even with changed intent.
Definitive receipts and missing IDs cannot be replaced. No backend DELETE/rollback.

The compiled trusted CLI adds sign-out and confirmed retire-operation. It warns
about possible remote draft/saved data before retirement; failed warning output
prevents action. Fixed stderr-only diagnostics exclude selectors, private paths,
credentials and raw errors. Signals settle work and release ownership before exit.
A separate running profile owner causes refusal, never takeover. Existing seven
MCP tools, startup configuration and legacy package bins remain unchanged.

Changed source: new src/lifecycle/index.ts; src/cli/main.ts; strict sign-out kind
in src/login/metadata.ts and target recognition in src/login/configured.ts.
New focused tests: test/unit/t12/s1-boundaries.test.mjs,
test/fault/t12/s1-lifecycle.test.mjs and its small s1-helpers.mjs. The existing
test/login/configured-helpers.mjs adds only narrow logout/routine-read responder
hooks; default behavior and all existing test assertions are preserved. Operator
commands/recovery guidance are in docs/login.md. No shared-contract, manifest,
lockfile, compiler, dependency, .pi or T04/T05/T06/T09/T11 production changes.

## Verification and original development observations

Provisioned Node24.21.0/npm11.19.0 were resolved from the existing trusted locator
before Node/npm execution. No system substitution or installation. Production
typecheck, lint, format check and build PASS; focused syntax/lint/format PASS.
The bounded two-export import/signal/silent-child smoke PASS; this is not an
exhaustive runtime-interception or sandbox proof.

Initial scoped ESLint rejected throwing from a finally block in owner cleanup
(`no-unsafe-finally`). The implementation now captures the action outcome, awaits
owner close outside finally and prioritizes recovery failure if release fails.
Scoped checks then passed. A config projection typo was corrected during source
review before behavioral execution. No compiler/lint relaxation or test weakening.

Initial focused behavior:20/20 in two files PASS with fresh real isolated provider/
ext4/private-CA HTTPS. Primary review then added pre-auth lifecycle refusal coverage
and clarified the source-recovery test title: recovering an uncommitted source can
preserve usable source credentials; it is not completed sign-out. No behavioral
failure was hidden. Final selection includes that added check and all owning tests.

The reused isolated runner creates private HOME/XDG/temp/ext4 scopes, an explicit
private D-Bus and foreground Secret Service, qualifies libsecret store/read/clear,
generates a private-CA loopback HTTPS fixture and awaits provider/bus cleanup. No
personal bus, live backend/Google/browser/Android/DB or real credentials were used.
New tests use synthetic grants/accounts/operation records and actual persistence/
transport. Seeded recovery journals are valid fixture evidence, not a claim of
backend mutation admission; expected retained bytes/tombstones are independently
asserted. Same-account explicit read admission and retired-repeat rejection use
the actual T09/T06/T05 boundary.

Final selection:14/14 files and142/142 assertions PASS (21 new owning,121 unchanged
regression assertions), zero failed/skipped/pending/todo. The runner returned0 and
reported provider/bus termination/reaping and owned fixture removal. Before/after
SHA256 checks matched all512 inputs/outputs:328 source/test/config inputs plus184
emitted files. The inventory records exact relative hashes and runner/runtime
identities without private facility locations. This is a workspace-stability
claim, not a byte-identical clean reproduction claim. TypeScript5.9.3/Vitest4.1.11.

Final documentation audit resolved297 local links/anchors in ten documents and
found no trailing whitespace; git diff whitespace checks PASS. Its first baseline
audit attempted a companion-config key absent from the original root-only baseline
and raised KeyError. The corrected audit distinguishes preimplementation root
manifest/compiler hashes from the complete final freeze and separately checks the
unchanged companion config against Git. No source/test change or behavioral rerun
was needed; no failed audit was counted as passed.

## Exact final commands and scope

All Node/npm commands pin the provisioned T01_NODE_HOME/PATH. Run production
checks sequentially or independently before behavioral acceptance; never build/
install while tests use the target:

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
node_modules/.bin/eslint test/unit/t12 test/fault/t12 test/login/configured-helpers.mjs
node_modules/.bin/prettier --check test/unit/t12 test/fault/t12 test/login/configured-helpers.mjs
node --check test/unit/t12/s1-boundaries.test.mjs
node --check test/fault/t12/s1-lifecycle.test.mjs
node --check test/fault/t12/s1-helpers.mjs
```

The existing qualified private-provider runner executes this exact nonempty14-file
selection. Private runner/result locations are placeholders, never deployment
inputs or permission to use a personal bus:

```sh
node node_modules/vitest/vitest.mjs run --maxWorkers=1 \
  test/unit/t12/s1-boundaries.test.mjs \
  test/fault/t12/s1-lifecycle.test.mjs \
  test/unit/t06/s5-lifecycle-validation.test.mjs \
  test/fault/t06/s5-lifecycle-races.test.mjs \
  test/login/metadata.test.mjs \
  test/login/transaction.test.mjs \
  test/login/configured-integration.test.mjs \
  test/login/cli-boundaries.test.mjs \
  test/login/cli-integration.test.mjs \
  test/unit/t09/s3-transitions.test.mjs \
  test/fault/t09/s3-persistence.test.mjs \
  test/fault/t11/s2-service.test.mjs \
  test/read-protocol/catalogue-dispatch.test.mjs \
  test/stdio-server/configured-integration.test.mjs \
  --reporter=default --reporter=json --outputFile=<private-result-file>
```

## Limits and remaining work

This is bounded S1 workspace acceptance, not clean locked reproduction or parent
T12 completion; clean full T12 integrated acceptance remains S4. New tests establish
real provider/storage/HTTPS/CLI behavior with synthetic responders, not independent
backend Google verification, DB/sync/Android, physical power-loss or live desktop
interoperability. Existing T06 verification omissions and T04 whole-protected-state
restore limits persist. T06 in-flight lifecycle fences are retained regressions;
running MCP/config-disabling composition remains T15. Product create_routine stays
unavailable. S2 profile removal, S3 account-status cleanup and S4 parent acceptance
require separate assignment. No staging/commits or automatic successor.
