# T11-S2 accepted — authorized terminal replay and minimization

**Accepted/closed:** 2026-10-15, primary Codex agent.
[Work order](../tasks/t11-s2-work-order.md), [inventory](t11-s2-artifact-inventory.json),
[handoff](../handoffs/t11-s2.md). User authorized S2 then S3; S3 may now start.
Parent T11 remains incomplete and product creation unavailable.

## Delivered behavior and review

Inert createCreationService({repository,session}).create(binding,args,signal)
awaits actual T09 withOperation and S1 active recovery. Definitive terminals compact
before delivery; historical terminals require a fresh bounded T06 listRoutines
authorization probe, live binding/signal and actual owner checks. Deletion does not
rewrite history or cause GET/PUT restoration. Same normalized intent returns the
original result; changed intent still rejects. Uncertain terminal evidence cannot
compact/dispatch. No outer retry, startup IO, new format/identity or MCP enablement.

Service errors retain acknowledged history without returning the terminal result;
profile/account/generation changes suppress captured private history. Storage failure
does not replace a terminal outcome. Receipt ambiguity fences T09/owner; explicit
reopen/retry performs only remaining local compaction/auth checks, never mutations.
The service retains terminal acknowledgement before further owner reads and does
not copy stale backend metadata into unrelated final storage/read errors.

Shared capability capture/fences moved unchanged from executor into internal
boundary.ts, with generic receiver capture and a type reflecting validated nonnull
account binding. Existing fresh/recovery/single-step behavior is preserved. T10's
synthetic fixture gained one narrow optional resource/auth-reply hook for T11;
default behavior is unchanged. Source/spec/test review checked identity, ordering,
live authorization, cancellation, error sanitization and format/minimization rules.
Review is by the primary agent, not independent release/security certification.

## Verification

Node24.21.0/npm11.19.0, TypeScript5.9.3, Vitest4.1.11. Four production checks
(typecheck, lint:production, format:check:production, build) PASS. Scoped creation/
T11/reused-fixture ESLint/Prettier and new-test node --check PASS. Focused decisions
29/29 and real S2 integration5/5 PASS. Final complete active S1/S2 owning27/27+
unchanged selected regressions80/80=107/107 in13 files, zero failed/skipped/pending/
todo.502 source/emitted/test/config hashes stable through final run. Bounded silent
executor/service import/construction PASS, exit0 within5 seconds. No build/install
raced tests. No clean S2 install/replay; S3 owns integrated clean reproduction.

Early typecheck caught nullable account binding in the T09 validation call. Fixed
the validated type and projected only the three durable binding fields, preserving
session-generation fencing separately. No test assertion failed during S2.

New8 decision checks cover inert captured capabilities, compaction before return,
uncertain-terminal retention, final auth/network stops, account/session changes,
late cancellation and permanent retired-ID rejection. New5 actual boundary checks
cover production-provider/ext4/HTTPS saved/rejection receipts across reopen, explicit
default equivalence/changed intent, deleted-resource history, live401 refresh,
invalidation/auth denial and real diagnostic T04 definite/ambiguous compaction
faults. They verify no settled domain request is resent. libsecret store/read/clear,
explicit private bus/ext4 qualification and owned provider/process/data cleanup PASS.
No personal services/credentials were used.

## Exact safe selection and commands

Use provisioned T01_NODE_HOME, export PATH="$T01_NODE_HOME/bin:$PATH", and verify
versions. Run npm run typecheck, npm run lint:production,
npm run format:check:production and npm run build. Scoped checks use local
node_modules ESLint/Prettier on src/creation, test/unit/t11, test/fault/t11 and
test/fault/t10/s2-fixture.mjs, plus node --check on the two new S2 test files.

Final command ran inside the reused qualified private T10 isolation runner and
small stable-hash/smoke wrapper. Their SHA256 identities are in the inventory;
private output/runner locations are replaced by role placeholders. Never run
provider suites against a personal bus or without the qualified fixture environment.

```sh
node node_modules/vitest/vitest.mjs run --no-file-parallelism \
  test/unit/t11/s2-service.test.mjs \
  test/fault/t11/s2-service.test.mjs \
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

Smoke is source/bounded black-box evidence, not comprehensive interception or an
OS sandbox. Scripted HTTPS and diagnostic faults prove local composition, not
backend DB commits/idempotency, Android/sync, physical power loss or real auth.
S3 crash/parent clean acceptance, T12/T15/T16 and independent/external release
gates remain open. T06 omissions/T04 whole-state restore limits remain unchanged.
No contract/dependency/manifest/compiler/.pi changes, staging or commits.
