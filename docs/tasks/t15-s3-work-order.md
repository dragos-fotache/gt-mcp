# T15-S3 — Process recovery, lifecycle fences and parent acceptance

**Status:** accepted/closed with parent T15 · **Owner:** primary Codex agent · **Authorized:**
user requested “go ahead and do T15-S3” on 2026-10-16. Started 06:39 UTC;
90-minute checkpoint 08:09 UTC, hard stop 08:39 UTC. S1/S2 remain closed.

## Contract

Complete S3 of the [settled plan](../decisions/t15-plan-and-slices.md#s3--process-recovery-lifecycle-fences-and-parent-acceptance).
Normative authority remains shared MCP draft0.2 tools/creation/auth/scenarios,
backend v1 service protocol/domain/OpenAPI, accepted foundation spec/ADR, then
local design and [proportional testing](../decisions/proportional-testing-policy.md).
No public behavior/interface changes are planned. Only strict startup config
writesEnabled:true allows authenticated explicit creation. Startup sends no
unfinished work; identical explicit repeat preserves method/route/body/key,
confirmed steps and terminal receipts. Disabled/auth-invalid/stale callers cannot
receive private recovery history. Stop fences unsent work and settles durability
before releasing the profile. Trusted lifecycle retains/removes evidence as specified.

## Scope and execution

Edit test/create-stdio/, narrow shared fixture extensions, necessary demonstrated
integration repairs (record scope/contract impact before dependent production edits),
and task/status/verification/launch/evidence/handoff docs. Preserve pre-existing
working-tree changes, historical evidence, contracts, manifests/lockfiles/compiler
settings, parked T02/retired T13/T14, T06 omissions and T04 limits. No .pi/system
settings changes, staging/commits, real backend/account/Google/Android, release or successor.

Use only disposable Node24.21.0/npm11.19.0 via T01_NODE_HOME for all Node/npm commands.
Previous disposable toolchain and runners are absent; restore pinned toolchain and
fresh private provider/TLS/ext4 runner if feasible without system installation or
ambient services. Initial version discovery alone found system26.11.1/npm12.2.0;
no build/install/test used them. Qualified fixtures require actual isolated Secret
Service with libsecret store/read/clear, private bus, verified ext4 roots, synthetic
grants, private-CA loopback HTTPS, owned teardown. Synthetic write enablement only.
Never change shell HOME or discover/use ambient credential stores.

Permit production typecheck/lint/format/build; scoped test syntax/lint/format/import
checks; exact selected Vitest runs in qualified isolated fixtures; final clean
source snapshot npm ci --ignore-scripts, four production checks and same acceptance
replay. No install/build races tests. Node download/extraction and disposable
provider restoration are environment preparation only, never global installation.

## Verification, milestones and deliverables

Reuse T15-S1, T08 SDK/stdio, T11 exact recovery/crash and T12 lifecycle helpers;
small process-level tests for strict policy/precedence, original receipt/intent
identity/distinct operation, uncertain populate reopen/exact replay, persisted save
with lost MCP reply, pre/post-admission cancellation, EOF/SIGTERM and effective
disable, exclusive ownership/sign-out/reauthentication/retirement/removal/privacy.
Observe synthetic backend requests and decrypted fixture records independently
of MCP text; no production fault switches or generalized harness.

Final exact selection will be recorded before execution: all active T15 owning,
full T08 runtime/protocol/stdio and T11 owning; relevant T09/T10 admission/execution,
T12 lifecycle and schema/catalogue/foundation regressions affected by exports/docs.
Reuse dependency evidence for engine-internal permutations. No hidden exclusions,
skipped checks or waived safety gates. External T16–T20 remain separate/unrun.

Milestones: recorded contract/provenance; process tests and early static checks;
focused runs/repairs; final selected replay and stable hashes; clean locked
reproduction/emitted identity; requirement-to-evidence review and parent disposition.
Deliver test changes, review/map, exact commands/results/versions and retained
failures, artifact/clean replay inventory, launch-guide review and current handoff.
Parent T15 closes only after integrated acceptance. Review is primary-agent review,
not independent T20 certification.

Stop/escalate a normative conflict/missing public decision, unsafe privacy/ownership/
durability, unavailable isolated environment, scope expansion/generalized framework
need, or hard time limit. Preserve honest partial state and remaining checks.

## Execution checkpoint — 2026-10-16

Restored disposable pinned Node/npm after verifying the official Node archive
SHA256; actual extracted provider plus private bus qualified by unlocked collection
and libsecret store/read/clear. No global/system installation. Four production
checks passed before process execution. First isolated lifecycle run passed1/1
with583 stable hashes and owned cleanup. First complete new S3 run passed6/10;
failures retained for repair: fixture invented an unsupported backend conflict
code, replay oracle omitted required delivery authorization read, initial journal
confirmation is null (no acknowledged step), rather than a none marker. Independent
review also required explicit child exit disposition and cancellation socket closure
before shutdown, to prevent SDK fallback/shutdown from masking broken behavior.
No demonstrated production defect or public contract change at this checkpoint.

Final selection is fixed in [48 exact paths](../evidence/t15-s3-selection.json):
all7 T15 files including the3 S3 process files; full T08 runtime/protocol/stdio
and T11 owning; T09 admission/transition/storage persistence, T10 executor/fresh
workflow, T12 sign-out/retirement/removal/disclosure journey, T03 tool schemas/
intent/results and foundation entry/import/package/docs. Each group protects the
integration boundary; unchanged engine permutations and external T16–T20 evidence
are reused/deferred as settled, never counted as fresh passes.

All10 new S3 process checks pass on r3 with584 stable input/output hashes and
owned provider/bus/root cleanup. Initial scoped lint also caught missing explicit
node:timers imports after the owned-child refinement; repaired. r2 passed8/10,
with only the two authorization-read oracle replacements still outstanding; r3
passed10/10. The long lifecycle journey measured28.3s, so its final timeout is
60s (test execution bound only; no production budget changed), leaving headroom
for the same assertions during clean reproduction. Final48-file replay follows
final static/production checks; no source/build mutation may race execution.

## Final disposition

446/446 PASS in 48 exact files (30 T15 owning + 416 relevant regressions), zero failed/skipped/pending/todo; four production/scoped checks, 584 stable hashes, clean locked replay, 388 identical source inputs and 194 byte-identical emitted outputs.
Actual isolated provider/ext4/HTTPS/SDK and all owned cleanup PASS.
[Review](../evidence/t15-s3-review.md), [handoff](../handoffs/t15-s3.md).
All T15 grants closed; no successor, actual enablement or release.
