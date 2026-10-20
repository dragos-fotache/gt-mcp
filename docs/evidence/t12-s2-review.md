# T12-S2 — Durable removal/reconciliation acceptance

**Disposition:** accepted/closed, 2026-10-15. Primary-agent specification/source/test
review under the [S2 work order](../tasks/t12-s2-work-order.md) and
[proportional testing policy](../decisions/proportional-testing-policy.md).
37/37 new S2 +21/21 unchanged S1 +244/244 relevant unchanged regressions =
**302/302 in35 exact files**, zero failed/skipped/pending/todo. Four production
checks, scoped syntax/lint/format, bounded silent import/signal smoke and owned
actual isolated provider/ext4/HTTPS/CLI cleanup PASS. All525 source/test/build
hashes identical before/after all three final batches, including188 emitted files.
[Inventory](t12-s2-artifact-inventory.json), [handoff](../handoffs/t12-s2.md),
[format/API/crash order](../decisions/t12-removal-format.md).

## Delivered behavior and specification review

- Actual lease-holder removal persists an external restricted removal fence before
  unlinking credentials/operation bodies/receipts/anchor or deleting the matching
  key. Normal old-generation open/read/commit/provision fails before key access,
  including when ciphertext/key is absent. No forced takeover or recursive cleanup.
- Pending private progress captures binding/root/lock/euid, original random-key
  fingerprint and exact owned encrypted-file identity/digest/ctime manifest.
  Resume needs no decryptable old store/key. Substituted root/symlink/hardlink/file,
  stale binding, corrupt state and replaced/ambiguous/locked/unavailable provider
  items fail closed. Provider deletion uses fresh DH connection, whole reserved
  namespace plus exact matching, no prompts and post-delete absence verification.
- Complete external fence minimizes all account-bound progress. Configured removal
  publishes an unbound credential-free descriptor, removes matching abandoned
  descriptor temporaries and clears the metadata receipt. No account, domain body,
  operation receipt or deleted-key fingerprint remains in the completed fence.
  Separate profile/key and retained old fences survive. No HTTP/backend deletion.
- Trusted CLI adds profile-remove --confirm and setup --reconcile --confirm, strict
  grammar, required warnings, safe stderr-only output and cancellation settlement.
  Local removal works pre-auth/signed-out without backend authorization. Output
  failure/preparation cancellation prevents effects. Once preparation begins,
  signals await durable work/publication/release; no rollback claim.
- Reconciliation requires completed removal under actual ownership, empty storage,
  distinct new generation/key, retained fences and protected recorded transition.
  Recovery verifies completed empty target and old-source fence under its owner,
  or unchanged clean removed source. Ordinary setup/login/MCP cannot reopen old
  generations. No adoption of old IDs, routine-name matching or general reset.

The review traced these properties against shared MCP journal lifecycle and
accepted parent semantics, then checked production engine/holder/IPC/provider,
strict metadata/CLI and independent observable test expectations. Old T04 formats,
six runtime exports and existing provision/install/sign-out receipt behavior stay
readable. No shared contract, manifests, lockfile, compiler/dependency, parked T02,
.pi, staging or commits changed. Pre-assignment hashes preserve unrelated prior
uncommitted work; the inventory identifies the exact changed/new source/test files.

## Execution, original observations and repairs

Initial T01_NODE_HOME was unset: read-only version inspection reported system
Node26.11.1/npm12.2.0. The existing trusted locator was resolved immediately;
implementation/static/build/tests used provisioned Node24.21.0/npm11.19.0 only.
No system replacement, package installation or lifecycle hook execution.

Initial lint found unused destructured cleanup values; replaced by explicit minimal
record construction. An early build found widened root-selector string typing in
the manifest parser. The first diagnostic run started after that unsuccessful build
against partial TypeScript emissions:4/8 passed,4 failed; it is NOT acceptance of
that target. It exposed a test fixture confusing D-Bus address with socket path and
two stale-handle expectations using the wrong fixed error. No build/install raced
that run. Corrected typing, fixture socket parsing and generation_mismatch oracle;
subsequent build completed before further execution.

The next focused run passed20/23. Two stale-handle assertions had not yet been
updated; the third failure exposed real ext4 inode reuse after byte-identical file
replacement. Added ctimeNs alongside device/inode/digest and retained that regression;
no assertion was weakened to accept substituted files. Review additionally required
mandatory fixed manifest entries, original-key replacement refusal, completed old
fence provenance during new-target recovery, scoped descriptor-temp minimization
and completion of known removal before reconciled provisioning.

Then35/35 focused checks passed. The added actual signal/locked-provider check run
passed10/10; final acceptance covers the final candidate and all active owning tests.
The five real holder-death checkpoints are before external intent, after durable
intent, after file erasure, after key erasure and after complete-fence durability.
After-intent recovery never reopens the old generation and needs no new auth/proof.
Provider unavailability/ambiguity is repaired only by restoring the same isolated
facility; locked-provider scope is terminal until teardown, never production unlock.

Final main batch292/292 in33 files, fresh locked-removal batch1/1 and fresh unchanged
T04-provider batch9/9, total302/302 in35 files. The last two use separate private
bus/keyring scopes because collection locking is terminal for that scope. Each
runner qualified libsecret store/read/clear, actual ext4 and private-CA HTTPS;
provider/bus termination/reaping and owned fixture removal PASS for every batch.
All525 selected input/output hashes were identical throughout. No personal bus,
live backend/Google/browser/Android/DB, real credentials or raw private bodies in
repo/evidence. Seeded journals and synthetic HTTPS are local integration proof.

## Commands and exact final scope

Every Node/npm command resolves/pins the provisioned disposable toolchain. Run
production build/static checks before behavior, never during a selected test run:

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
node_modules/.bin/eslint test/unit/t12 test/fault/t12
node_modules/.bin/prettier --check test/unit/t12 test/fault/t12
node --check test/unit/t12/s2-boundaries.test.mjs
node --check test/fault/t12/s2-removal.test.mjs
node --check test/fault/t12/s2-crash.test.mjs
node --check test/fault/t12/s2-locked.test.mjs
node --check test/fault/t12/s2-helpers.mjs
node --check test/fault/t12/s2-holder.mjs
```

Each fresh qualified isolated runner executes `node node_modules/vitest/vitest.mjs
run --no-file-parallelism <exact selected files> --reporter=json --outputFile=<private
result>`. Exact nonempty batch selections, per-file counts and stable relative
hashes are in the inventory. Main includes all T12-S1 owning, S2 boundaries/removal/
crash, the twelve S1 affected regressions and every T04 unit/fault file except its
provider file. Remaining active S2 locked-provider and T04 provider files each run
whole in their own fresh scope; neither is skipped/excluded from acceptance.
The bounded5000ms silent-child smoke checks both inert lifecycle entries/exports,
pre-IO aborted calls and signal-listener stability; old T04 import checks also pass.
This is not comprehensive runtime interception or an OS sandbox.

Final documentation audit resolved339 local file targets and13 referenced anchors
in12 changed documentation files; no trailing whitespace. Git diff whitespace
check PASS. Final525 source/test/emitted hashes still match acceptance, and all
pre-assignment paths outside the explicitly changed source/docs remain unchanged.

## Limits and disposition

Workspace acceptance only; clean locked integrated parent replay remains S4.
Interrupted reconciliation provisioning with existing T04 INCOMPLETE/ambiguous
state stays fail-closed and needs bounded review, not an automatic reset. Preserve
T04 whole-protected-state restore, physical media/power-loss/runtime/backups/same-UID
trust limits and T06 recorded omissions. Primary review is not independent security
or release certification. Real backend admission/idempotency/DB/sync/Google/Android/
named-host interoperability and external release gates remain open. No account-status
proof, product MCP creation integration or permission-policy change is delivered.
S2 work is closed; parent T12 incomplete, S3 ready/unassigned, S4 held, T15 unassigned.
No automatic successor, live action, release, staging or commit follows.
