# T12-S3 — Foreground account-status proof and account-bound cleanup

**Status:** accepted/closed, 2026-10-15 · **Owner:** primary Codex agent.
**Authorization:** user: “do S3 now”. Start15:10UTC; checkpoint16:40UTC,
stop17:10UTC with an honest partial handoff if acceptance is unfinished.

Deliver S3 of the [approved parent plan](../decisions/t12-plan-and-slices.md),
following accepted [S2](../handoffs/t12-s2.md). Authority: shared MCP draft0.2
[authentication](../../shared-docs/docs/mcp-contract/authentication.md),
[journal lifecycle](../../shared-docs/docs/mcp-contract/routine-creation.md#journal-lifecycle-selected),
backend v1 [account lifecycle](../../shared-docs/docs/backend-contract/account-lifecycle.md),
[OpenAPI](../../shared-docs/docs/backend-contract/openapi.yaml),
[client timestamp rules](../../shared-docs/docs/backend-contract/client-compatibility.md),
foundation spec/ADR, then local task/format/verification documents.
No account export/deletion/signup/switching commands, backend changes, status
resume/retry journal, token paste, polling/background recovery, MCP tools/creation
wiring, dependencies/compiler/package/bin/.pi changes, staging/commits/live actions,
S4 parent closure, release or automatic successor. Preserve prior work/evidence.

## Settled interfaces and behavior

- New inert lifecycle/account-status module exports trusted low-level
  `openAccountStatusTransaction({profile,metadata,transportConfig,settings})` over
  one caller-owned production LifecycleProfileSession, and configured
  `openConfiguredAccountStatusBrowserHelper({configPath,loginConfigPath},signal)`.
  Transaction exposes captured binding plus start/submit/cancel/close only; no
  resume. Public outcome is only `{state:"active"|"deleted"}`, with no account ID,
  raw receipt or credentials. Configured factory captures protected settings,
  acquires actual owner, verifies metadata/binding and owns release on every path.
- Capture cached account from protected descriptor/actual profile binding, including
  signed-out state. Reject pre-auth/no cached account or pending publication.
  Never accept account UUID/receipt/token/purpose/origin flags from a caller.
  Reuse the existing protected config/login-settings validation through small
  shared internal helpers, preserving sign-in behavior and root exports.
- Foreground start sends `{purpose:"accountStatus"}` through actual T05 challenge
  route. Strictly require challengeId/nonce/expiresAt, fresh valid UTC expiry and
  local one-use attempt identity. The page feeds this nonce and captured Google
  web client to the existing GIS popup. Submit consumes local admission once and
  posts `{accountId,challengeId,idToken}` to same-origin /v1/account/status, without
  bearer or idempotency key. The backend verifies Google claims; never decode them
  locally. Explicit purpose-specific transport budgets set maxAttempts:1 (T05
  control routes already cap sends); no retry/resume after lost/failed response.
- Strict duplicate-free successful response: active shape exactly accountId/state;
  deleted shape exactly accountId/state/deletedAt/purgeBy. Require canonical exact
  cached account, valid shared UTC millisecond timestamps and purgeBy=deletedAt+24h.
  Wrong shape/account, generic401/404, malformed/timeout/offline, expired challenge
  or cancellation do not authorize erasure. Active preserves all bytes/evidence.
- Only this completed verified request can mint a module-private one-use deletion
  capability carrying captured origin/account/session/profile generation and actual
  owner/metadata. Exported internal `applyVerifiedAccountDeletion(capability,signal)`
  rejects all raw JSON/booleans/typed-looking objects before IO. It rechecks owned
  binding/storage/descriptor before intent; stale/delayed A cannot clear B or a new
  generation, even for the same Google subject. No public mint/raw-receipt reader.
- Extract the accepted owned S2 removal/publication composition into a narrow shared
  helper used by both confirmed local removal and verified deletion. Preserve
  durable external-fence/key cleanup ordering and metadata recovery, with no new
  permission guard or per-routine prompt. Once removal preparation begins, await
  durability/publication/owner release despite cancellation; S2 recovery finishes
  recorded cleanup without acquiring another Google proof or retaining its token.
- Reuse the existing secured dual-loopback HTTP callback implementation through a
  private shared helper and two typed purpose-specific entry points. Keep original
  login API/validation/page behavior intact. Add account-status-specific fixed page
  copy explaining that verified deletion clears matching local material, without
  account IDs or implementation details. Retain exact Host/Origin/CSRF, bounded
  requests/expiry, single callback, reservation-before-challenge, launcher/signals
  and no token paste. This is narrow reuse, not a generalized auth framework.
- CLI: `account-status --config <absolute path> --login-config <absolute path>`.
  No --resume/--cancel/--confirm/account/receipt/token/purpose flags. Show disclosure
  before work, launch only the captured temporary URL via existing fixed launcher,
  report fixed active/preserved vs deleted/local-cleaned messages to stderr only.
  Existing 0/2/3/4/130 exit meanings, sanitized failures and settlement remain.

## Scope, commands, checks and acceptance

Edit new src/lifecycle status/owned-removal modules, src/lifecycle/index.ts,
minimal src/login/browser/page/configured internal reuse, the additive sanitized
account_status_failed login error code and src/cli/main.ts;
focused new test/unit/t12 and test/fault/t12, narrowly extended existing synthetic
HTTPS/status responder and S2 checkpoint helpers; S3 work-order/API notes/evidence/
handoff/status and operator docs. Shared HTTP/storage contracts and implementation
remain unchanged unless a concrete defect requires review within this scope.

Resolve/pin existing provisioned T01_NODE_HOME on every command; observed
Node24.21.0/npm11.19.0. Permitted early syntax/types/lint/format/import checks,
four production checks/build, exact nonempty Vitest selections and bounded inert
smoke. Reuse fresh qualified actual private Secret Service/ext4/private-CA HTTPS/
dual-loopback/CLI runner with synthetic data, disposable HOME/XDG and owned teardown.
No personal bus/Google/backend/DB/Android/desktop. No install/build racing tests.
Capture baseline hashes before edits; preserve manifests/lockfile/configs/.pi.

Apply [proportional testing](../decisions/proportional-testing-policy.md): main
active/deleted proof via actual loopback/HTTPS/provider and independent shared-shape
oracles; signed-out cached account; separate profile preservation; forged receipt,
wrong account/purpose, invalid receipt/calendar, generic401/404/offline/timeout/lost
response preserving data with a fresh challenge required; stale generation during
response; explicit recovery after verified durable removal without Google-token
persistence. Representative Host/Origin/CSRF/duplicate callback/expiry/cancel/port
ownership and strict CLI/output/launcher/signal cases. Reuse existing fixtures with
only narrow responder/checkpoint additions; no harness framework/cross-product.

Final acceptance includes all active T12 S1–S3 owning (locked-provider S2 file in
its own fresh terminal scope), affected T05 validation/hook/retry controls, all
T07 login/browser/metadata/CLI owning and relevant T06 lifecycle/configured-stdio
regressions. Record exact filenames before final execution; no hidden omissions
or skipped checks counted as passes. Stable source/test/emitted hashes, primary
spec/source/test review and actual private cleanup required. Clean locked parent
replay remains S4; synthetic Google/backend proof is local integration only, not
T16/T19 interoperability or independent security/release certification.

Milestones: contract -> implementation/early statics -> focused integration/repairs
-> stable full owning/relevant acceptance/review -> evidence/status/handoff. Hold
specific contract conflicts or unavailable isolated facility; do not guess public
policy or broaden scope. Only S3 may close. Parent incomplete, S4 separate/unassigned;
T15 creation and all independent/external release gates remain unchanged.

## Final active execution selection

Main23 files: all T12 S1/S2/S3 owning except the terminal locked-provider file,
all 9 test/login owning files and these six unchanged regressions:
T05 02-validation-identity,04-hooks-fences-dispatch,05-budgets-deadlines-retry;
T06 s5-lifecycle-validation/s5-lifecycle-races; configured-stdio integration.
The complete test/fault/t12/s2-locked.test.mjs runs separately in a fresh private
bus/keyring scope. Exact filenames/per-file results/hashes will be recorded in
S3 acceptance inventory; no active owning file is excluded from total acceptance.
New owning files: test/unit/t12/s3-boundaries.test.mjs,
test/fault/t12/s3-status.test.mjs and test/fault/t12/s3-cli.test.mjs; small shared
s3-helpers.mjs reuses the actual T07/S1 facility. Only status/challenge responder
hooks and S2 holder read/owner-export seams extend existing fixtures; no prior
assertion is changed. No HTTP/storage production implementation changes required.

## Disposition

[Accepted](../evidence/t12-s3-review.md):33/33 new S3+58/58 unchanged S1/S2+206/206
regressions=297/297 in24 exact files, zero failed/skipped/pending/todo. Main23 files
296/296 plus fresh terminal locked-provider1/1. Four production/scoped checks,
bounded silent import/signal/forgery smoke,535 stable source/test/build hashes and
actual isolated provider/ext4/HTTPS/dual-loopback/CLI/owned cleanup PASS.
[Inventory](../evidence/t12-s3-artifact-inventory.json),
[API/provenance notes](../decisions/t12-account-status-boundary.md),
[handoff](../handoffs/t12-s3.md). Workspace acceptance only; S4 clean locked parent
replay remains. S3 closed, parent incomplete, S4 ready/unassigned, T15 unassigned.
No successor, product writes, live action or independent/external release grant.
