# T12-S2 — Durable profile removal and explicit reconciliation

**Status:** accepted/closed, 2026-10-15 · **Owner:** primary Codex agent.
**Authorization:** user: “go ahead and start work at T12-S2”. Start14:27UTC;
checkpoint15:57UTC, stop16:27UTC with an honest partial handoff if unfinished.

Deliver S2 of the [approved parent plan](../decisions/t12-plan-and-slices.md),
following accepted [S1](../handoffs/t12-s1.md). Normative authority: shared MCP
[authentication](../../shared-docs/docs/mcp-contract/authentication.md) and
[journal lifecycle](../../shared-docs/docs/mcp-contract/routine-creation.md#journal-lifecycle-selected),
unchanged backend v1, foundation spec/ADR, then parent/local storage contracts.
No shared-contract/dependency/compiler/package/bin changes, account-status proof,
MCP creation wiring, backend deletion, live accounts/services, .pi, staging/commits,
release or successor slice. Preserve prior uncommitted changes and evidence.

## Settled behavior and interfaces

- Extend the actual production storage lease holder, never a competing owner.
  Production sessions gain a trusted `removeProfile()` capability; a separate
  storage lifecycle entry exports `resumeProfileRemoval(OpenRequest)` and
  `provisionReconciledProfile(ProvisionRequest & {removedBinding: StorageBinding})`.
  Both validate/capture before IO and use the existing exclusive kernel lease.
  Sessions additionally expose `verifyRemovedProfile(removedBinding)` to validate
  the completed source fence under a newly provisioned owner during reconciliation
  publication recovery. Runtime exports of the existing storage entry remain unchanged.
- Removal validates the current binding/root/lock/stores/key before recording
  intent. Durably install restricted external `removed.<generation UUID>.json`
  before erasure. Pending record carries exact binding, root/lock/euid commitments
  and only private key-identification progress needed to reject replacement keys.
  Every normal open/read/commit/provision rejects a removed generation before
  attempting key access. Ordinary provision rejects retained removal fences.
- Under the same lease, erase only committed owned stores/anchor and their exact
  temporary-file families, then delete only the unique unlocked exact reserved
  key item. Missing key is acceptable only while finishing recorded removal;
  ambiguous/locked/foreign/replaced material fails closed. Validate file types,
  permissions, link count, root/lock identity and known ownership before unlink.
  Never recurse or delete the roots, external fence or lock. Sync directories.
- Recovery loads/validates the external pending intent without decrypting old
  stores. Repeated cleanup is idempotent; failure after intent leaves the generation
  fenced and reports recovery required. Complete fence retains only version/phase,
  generation/location/identity commitments, with no account, payload or receipt.
  Do not acknowledge erasure until all scoped cleanup and provider absence pass.
- Add `removeLoginProfile({configPath},signal)` and
  `reconcileLoginProfile({configPath},signal)` in trusted lifecycle composition.
  Removal needs no backend auth, works signed out/pre-auth and dispatches no HTTP.
  Strict additive metadata receipt kinds `remove` and `reconcile` recover descriptor
  publication. Completed removal publishes a credential-free unbound descriptor
  for the removed generation (null account, generation0), eliminating account data
  from descriptor/pending metadata while making ordinary setup refuse reuse.
- Explicit reconciled setup requires a verified completed removal fence and clean
  old storage under the actual holder; retain fences, mint a distinct generation/key
  and empty stores. Record the transition before provisioning and publish afterward.
  Recover can recognize completed new provisioning or an unchanged clean removed
  source; ambiguous/incomplete provisioning fails closed under existing T04 limits,
  never silently resets or adopts old IDs. Old/unknown metadata states still reject.
- CLI: `profile-remove --config <absolute path> --confirm` and
  `setup --config <absolute path> --reconcile --confirm`. Reject missing/extraneous/
  duplicate flags before IO. Warn that replay guarantees end and remote creations
  need reconciliation; output failure prevents action. No IDs/paths/raw exceptions
  in diagnostics. Cancellation before intent prevents effects; once prepared,
  settle durability/publication/owner release. Existing exit meanings remain.
  A separate stdio owner blocks these actions; no forced takeover.

## Scope, verification and delivery

Edit necessary src/storage holder/engine/client/keyring/dbus/types plus a narrow
removal-format helper, src/lifecycle, src/login metadata/configured recovery,
src/cli/main.ts; focused new test/unit/t12 and test/fault/t12 files and narrowly
reused fixtures; S2 work-order/format/evidence/handoff/status/operator docs. Record
pre-edit source/test/docs hashes privately. No unrelated cleanup.

Resolve the existing provisioned toolchain locator on every command; verify
Node24.21.0/npm11.19.0. The initial environment had T01_NODE_HOME unset and reported
system Node26/npm12 during read-only inspection; no implementation/install/build/
tests used it. Permitted scoped statics, four production checks/build, exact nonempty
Vitest selections, isolated actual provider/ext4/HTTPS/CLI and bounded imports.
Reuse the qualified private runner; no personal bus/backend/browser/DB/Android.
Never build/install while tests run against that target.

Apply [proportional testing](../decisions/proportional-testing-policy.md): strict
metadata/CLI validation; actual provider deletion and removed-generation rejection
without the key; existing owner exclusion; representative pre-intent, post-fence/
pre-key and pre-ack interruption recovery; provider refusal preserves fence;
separate profile/key survives; normal setup refuses; reconciled setup distinct
identity/empty evidence; representative corrupt/stale/link/path and key ambiguity
refusals; cancellation/output safety. Reuse small fixtures and targeted fault probes,
no generalized framework or cross-product. Early types/lint/format/import checks;
focused repairs, then all T12 S1/S2 owning and affected storage/provider,
metadata/setup/login/CLI regressions on a stable build. Record exact final selection
before execution. Clean locked parent replay remains S4; no release/independence claim.

Deliver format/API/crash-order notes, review/results/stable artifact hashes, current
status and handoff. Milestones: contract -> implementation/early checks -> focused
integration/repairs -> stable final acceptance/review -> evidence/status. Escalate
actual contract conflict, missing isolated facility or required scope expansion;
hold affected work. Only S2 may close; T12 remains incomplete and S3/S4 unassigned.

## Disposition

[Accepted](../evidence/t12-s2-review.md):37/37 new S2+21/21 unchanged S1+244/244
relevant regressions=302/302 in35 exact files. Four production/scoped checks,
bounded silent import/signal smoke,525 stable hashes and owned actual isolated
provider/ext4/HTTPS/CLI cleanup PASS. Exact final selections/results and relative
hashes: [inventory](../evidence/t12-s2-artifact-inventory.json). Main33 files292/292;
fresh locked-removal1/1 and fresh unchanged provider9/9 each in its own scope.
All active S1/S2 owning and T04 unit/fault suites are covered, plus the twelve
unchanged S1 affected regressions. No skipped/excluded checks counted as passed.
[Format/API/crash order](../decisions/t12-removal-format.md),
[handoff](../handoffs/t12-s2.md). Workspace acceptance only; clean locked integrated
parent replay remains S4. Parent T12 incomplete; S3 ready/unassigned, S4 held.
All S2 grants closed; no successor, live actions, creation enablement or release.
