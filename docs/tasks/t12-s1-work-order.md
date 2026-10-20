# T12-S1 — Trusted sign-out and operation retirement

**Status:** accepted/closed, 2026-10-15 · **Owner:** primary Codex agent
**Authorization:** user: “go ahead and start s1”. Start14:02UTC; checkpoint15:32,
stop16:02 with an honest partial handoff if acceptance is unfinished.

Deliver S1 of the [parent contract](../decisions/t12-plan-and-slices.md): configured
trusted sign-out and explicit unresolved-operation retirement through the existing
compiled CLI. Accepted T06/T07/T09/T11 are prerequisites; preserve their evidence
and limitations. S2–S4/T15, profile removal, account-status verification, shared
contract changes, package/bin/dependency/config-schema changes and live services
are out of scope. No staging/commits or automatic successor.

## Settled integration contract

- Add `src/lifecycle/index.ts` with `signOutProfile({configPath},signal)` returning
  the acknowledged next StorageBinding, and
  `retireProfileOperation({configPath},operationId,signal)` returning void. Calls
  validate/capture options/UUID/signal before IO, load protected T07 metadata,
  refuse pending publication transitions, acquire the actual T04 owner and
  recheck descriptor/receipt before action. No ambient config or credential input.
- Sign-out reuses `openLifecycleSessionState`/`signOut`. It requires an account-bound
  profile (pre-auth setup remains untouched), prepares a credential-free metadata
  receipt before durable generation advancement, then publishes the acknowledged
  binding and removes the receipt. Cancellation before intent prevents action;
  once intent is prepared, await sign-out and publication/owner settlement even
  after signals. Best-effort logout cannot undo local clearing. Operations/digest
  keys remain unchanged. Repeated explicit signed-out sign-out is safe.
- Extend strict T07 LoginReceipt version1 kind with `sign-out`: nonnull same-account
  source/target, same origin/profile generation and exactly one session-generation
  increment. Unknown fields/kinds remain rejected. Recover validates a completed
  target as lifecycle vault v3 with null grant/pending and empty superseded entries;
  it requires no usable credential. If the durable transition never happened,
  recover validates/publishes the source instead, never executes sign-out or
  network traffic automatically. This is not an acknowledged sign-out. Ambiguous
  storage cannot be converted into either assumed source or target.
- Retirement shares the actual owner with T06 session and T09 repository and calls
  only `retireOperation`. The repository receives the captured validated operator
  config; false creation permission never blocks erasure. No writesEnabled override,
  private store reimplementation or creation admission. Preserve T09 live-auth,
  permanent-tombstone, missing-ID and definitive-receipt semantics. Await the call,
  close repository, invalidate session and release the actual owner on every path.
- CLI adds `sign-out --config <absolute path>` and `retire-operation --config
  <absolute path> --operation-id <canonical operation UUID> --confirm`. The latter
  prints the remote-draft/saved-data/no-rollback warning before side effects and
  fails closed on warning-output failure. No echo of selectors/paths/credentials,
  new model-facing tools or launcher use. Existing help/grammar/exit meanings and
  signals remain; map safe auth/state/storage failures to fixed relevant guidance.
  A running MCP owner blocks the separate CLI; live in-process MCP config races
  remain T15, with accepted T06 fencing regressions retained here.

## Scope, checks and delivery

Edit new src/lifecycle, src/cli/main.ts, necessary T07 metadata/configured recovery,
focused test/unit/t12 and test/fault/t12, minimal reused fixture extensions, S1
docs/evidence/handoff/status and current operator commands in docs/login.md.
Preserve prior uncommitted work; snapshot its relative file hashes before edits.
Choose internals within the above contract. Escalate actual public-contract
conflict, missing isolated facility or required scope expansion; do not guess.

Use resolved provisioned T01_NODE_HOME; observed Node24.21.0/npm11.19.0. All Node/npm
commands pin it. Existing isolated runner supplies fresh private D-Bus/Secret
Service, ext4 roots, private-CA loopback HTTPS and disposable HOME/XDG. Qualify it
before behavioral checks, await owned teardown; no personal backend/bus/browser/
Google/DB/Android. Permitted production/scoped checks/build, explicit nonempty
Vitest selections and bounded inert imports. No install/build races with tests.

Verification is proportional: early type/import/lint/format; strict CLI/metadata
validation; actual provider/HTTPS sign-out and retirement/reopen; interrupted
publication at prepared-source and committed-target boundaries; unchanged operation
bytes/keys, stale-owner rejection, failed logout, same-account explicit login/recovery,
body erasure/permanent IDs, representative missing/definitive/auth refusals,
ownership exclusion and cancellation/output safety. Reuse T07/T09/T10 fixtures;
no generalized harness or fault cross-product.

Final active selection: every new T12-S1 test plus
test/unit/t06/s5-lifecycle-validation.test.mjs,
test/fault/t06/s5-lifecycle-races.test.mjs,
test/login/metadata.test.mjs, test/login/transaction.test.mjs,
test/login/configured-integration.test.mjs,
test/login/cli-boundaries.test.mjs, test/login/cli-integration.test.mjs,
test/unit/t09/s3-transitions.test.mjs,
test/fault/t09/s3-persistence.test.mjs,
test/fault/t11/s2-service.test.mjs,
test/read-protocol/catalogue-dispatch.test.mjs and
test/stdio-server/configured-integration.test.mjs.
Four production checks plus scoped test syntax/lint/format; record exact new
filenames before the final run. Stable source/test/emitted hashes, primary-agent
spec/source/test review and safe commands/results/versions belong in evidence.
Clean locked parent replay remains S4; no independence, real backend/Google or
release claim. Any failing/unrun check stays visible, never excluded as passed.

Milestones: contract/claim -> implementation/early statics -> focused integration
and repairs -> stable final selection/review -> evidence/status/handoff. Only S1
may close; parent remains incomplete and S2 requires separate assignment.

## Disposition

[Accepted](../evidence/t12-s1-review.md):21/21 new owning+121/121 relevant
regressions=142/142 in14 exact files, zero failed/skipped/pending/todo. The final
selection includes test/unit/t12/s1-boundaries.test.mjs and
test/fault/t12/s1-lifecycle.test.mjs plus the twelve regressions listed above.
Four production/scoped checks, bounded silent import/signal smoke,512 stable
source/test/build hashes and owned actual provider/ext4/HTTPS/CLI cleanup PASS.
[Inventory](../evidence/t12-s1-artifact-inventory.json),
[handoff](../handoffs/t12-s1.md). S1 grants closed; S2–S4 remain unassigned.
Workspace acceptance only; clean locked parent reproduction remains S4.
