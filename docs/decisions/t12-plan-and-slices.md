# T12 — Trusted lifecycle and privacy cleanup: bounded development plan

**Disposition (2026-10-15):** planning complete. User request: “go ahead and plan
the development of T12 and split it”. This is a documentation-only assignment;
The user subsequently assigned [S1](../tasks/t12-s1-work-order.md), now
[accepted/closed](../evidence/t12-s1-review.md). The user subsequently assigned
[S2](../tasks/t12-s2-work-order.md), now [accepted/closed](../evidence/t12-s2-review.md);
The user assigned [S3](../tasks/t12-s3-work-order.md), now
[accepted/closed](../evidence/t12-s3-review.md). The user assigned
[S4](../tasks/t12-s4-work-order.md), now [accepted with parent T12](../evidence/t12-s4-review.md). No successor, product writes,
live-account action or release is authorized by this plan.

## Task contract

Deliver trusted local sign-out, unresolved-operation retirement, fenced profile
removal/reconciliation and verified account-deletion cleanup. Complete setup/privacy
disclosures and CLI recovery guidance. Keep these actions outside the seven MCP
tools and preserve accepted creation identity, auth and ownership semantics.

Authority, in order: shared MCP draft0.2
[authentication](../../shared-docs/docs/mcp-contract/authentication.md),
[journal lifecycle](../../shared-docs/docs/mcp-contract/routine-creation.md#journal-lifecycle-selected)
and [tools](../../shared-docs/docs/mcp-contract/tools.md); backend v1
[account lifecycle](../../shared-docs/docs/backend-contract/account-lifecycle.md),
[authentication](../../shared-docs/docs/backend-contract/authentication.md),
[retention](../../shared-docs/docs/backend-contract/retention.md) and
[OpenAPI](../../shared-docs/docs/backend-contract/openapi.yaml); accepted foundation
spec/ADR, then local architecture/verification/task files. Shared baseline9a96dcb
and the approved working-tree config-only revision remain unchanged.

Prerequisites are accepted T06/T07/T11, including their T04/T05/T09 dependencies.
Read [T07 handoff](../handoffs/t07-s3.md),
[T11 handoff](../handoffs/t11-s3.md),
[T09 retirement API](t09-journal-format.md#delivered-s3-transitions-and-trusted-retirement),
[planning policy](../agent-coordination.md#default-primary-agent-decision-ready-task-planning)
and [proportional testing](proportional-testing-policy.md). T06's historical
verification omissions and T04's whole-protected-state restore limits persist.

Non-goals: MCP creation/config-guard composition (T15), backend account export or
deletion commands, account switching, automatic recovery/retirement/TTL, backend
DELETE/rollback, new endpoints/dependencies, host transcript erasure, remote wipe,
live Google/backend/Android/host certification, package/bin changes (T18), security
or release acceptance. Preserve parked T02, retired T13/T14 and all prior evidence.

## Readiness findings and shared boundaries

- T06 `openLifecycleSessionState` supplies fence-first `signOut`, local generation
  advancement and best-effort dedicated-session logout. T07 supplies protected
  descriptor publication/recovery, same-account login and secure foreground GIS.
  T12 must coordinate these on the same actual T04 owner. T07 metadata currently
  recognizes only provision/install transitions: sign-out publication needs an
  additive strict transition, including a credential-empty target.
- T09 `retireOperation(binding,operationId,signal)` already durably tombstones
  unresolved journals, authenticates the action and works with creation disabled.
  Definitive receipts cannot be retired by that primitive. T12 adds trusted warning,
  invocation and ownership composition, not a second retirement implementation.
- T04 has no removal/reconciliation or master-key deletion API. Its external anchor
  depends on the profile master key. Removal therefore requires a durable fence
  readable after that key is erased, plus holder/provider support and interrupted
  cleanup recovery. Unlinking profile files from the CLI is insufficient.
- T05 already supports challenge purpose `accountStatus` and `/v1/account/status`,
  without a bearer prerequisite. Its control result is strict JSON **bytes**, not
  an account-bound verified receipt. T12 owns semantic validation and proof provenance.
  T07's browser helper currently expects a sign-in transaction/result; reuse its
  security machinery through a narrow additive purpose-specific composition.

Planned commands use the existing `node dist/cli/main.js` entry and explicit
protected `--config` file. Keep setup/login/resume/cancel/recover behavior and
legacy package bins unchanged. Add:

```text
sign-out --config <absolute config path>
retire-operation --config <absolute config path> --operation-id <operation UUID> --confirm
profile-remove --config <absolute config path> --confirm
account-status --config <absolute config path> --login-config <absolute login settings path>
setup --config <absolute config path> --reconcile --confirm
```

These are trusted local controls, never tool arguments. Operation IDs are local
selectors, never authorization or diagnostics; do not echo them. No credential,
account-ID, receipt-JSON, arbitrary executable or write-enable flags. Lifecycle
confirmation flags express destructive local intent; they do not add per-routine
creation approval. Missing confirmation fails before side effects. Emit warnings
before destructive work; warning-output failure prevents the action. Preserve
fixed sanitized stderr-only guidance and existing exit meanings (0,2,3,4,130),
strict grammar and safe signal settlement. New literal help/messages are internal
choices within these semantics.

One actual profile owner is shared by lifecycle/session/repository capabilities.
A running stdio owner makes the CLI fail ownership acquisition; no cross-process
force-close, competing owner wrapper or takeover. Close/abort dependent facades,
drain begun commits and await owned release. Never claim cancellation retracted a
backend write. T15 must later use these same fences in its running composition.

### Sign-out and retirement

Sign-out first fences current calls, advances the durable generation and clears
usable credentials, then attempts bounded best-effort logout. Preserve operation
bytes, IDs and digest keys. Publish the new descriptor with recoverable metadata;
an interrupted publication must not leave a usable old generation or require a
grant to recognize completed sign-out. Explicit same-origin/account login may
reopen original evidence, but startup/login itself sends no creation steps.

Retirement warns that a remote draft/saved routine may exist, erases unresolved
bodies atomically with permanently reserving the ID, and never calls backend
DELETE. Repeated retirement of a tombstone is harmless. All creation repeats of a
retired ID fail `recovery_unavailable`, even for changed intent. Definitive
receipts remain until profile removal/verified deletion; missing IDs do not create
tombstones. Retirement retains T09's live-auth prerequisite; signed-out/offline
failure preserves evidence. Local profile removal does not require backend auth.

### Removal and reconciliation

The destructive storage primitive operates only under the actual exclusive
holder lease and captured origin/account/profile-generation binding. Persist a
restricted external removal intent/fence **before** erasing credentials, operation
payloads/receipts or the matching Secret Service key. Once durable removal intent
is accepted, all normal opens/reads/commits/reprovision attempts reject that
generation, including after restart and when the key or data files are absent.
Never delete the external fence/lock to make setup pass.

Cleanup is resumable and idempotent under ownership. Remove only known owned files,
temporary credential material and the uniquely matching key item; never recursively
delete arbitrary configured roots or another profile's material. Locked/ambiguous
provider items, ambiguous filesystem completion or changed binding fail closed and
report recovery required, not completed erasure. A committed fence remains effective
even if later cleanup fails. Acknowledged completion requires all scoped cleanup.
Recover may finish an already-authorized removal without acquiring another Google
proof or attempting sign-in, but it must not invent intent from generic corruption.

Persist only the minimal credential-free generation/location fence after completion;
do not retain domain bodies, operation receipts or a deletion-receipt history.
Any additional account-bound progress metadata needed during cleanup is private and
minimized when complete. Safe recovery must not depend on the deleted master key.
Physical media/backups/runtime erasure and restoration of the whole external fence
are not proved by local deletion; preserve the existing trust/restore limits.

Ordinary setup cannot reuse a removed generation. Explicit `setup --reconcile
--confirm` warns that replay guarantees ended and requires the operator to have
reconciled possible remote creations. Only after completed removal may it provision
a distinct new profile-generation/key with empty evidence, retaining old removal
fences. Reconciliation never adopts old operation IDs or deduplicates by routine
name. Missing/corrupt unfenced evidence still fails closed; this command is not a
general reset bypass. On interruption, neither old-generation access nor silent
fresh setup is allowed; explicit recorded-transition recovery is required.

Exact additive storage/metadata record encoding and TypeScript signatures are
implementation choices to record in the S2 work order before source edits. Keep
existing valid formats readable and old/unknown lifecycle states fail closed;
do not weaken T04 root/lease/permission checks or T07 metadata parsing.

### Verified account-status cleanup

Capture the cached account from the protected descriptor, including while signed
out; never accept an arbitrary caller account UUID. A foreground helper requests
a fresh `accountStatus` challenge, obtains the nonce-bound Google credential and
posts `{accountId,challengeId,idToken}` to the same configured backend origin.
It never calls signIn/exchange/export/delete or creates/rebinds an account.
Retain T07 dual-loopback, exact Host/Origin/CSRF, one active callback, expiry,
bounded request, launcher, cancellation and no-token-paste guarantees.

Treat the backend as the Google-proof verifier; do not infer ownership from a
decoded token. Strictly validate successful response bytes against the shared
active/deleted shapes, canonical matching account UUID and required valid receipt
timestamps. A module-private, non-forgeable receipt capability ties provenance to
this completed request and its captured origin/account/profile generation. The
cleanup entry accepts only that capability and rechecks current owned evidence;
a typed-looking object, supplied boolean or raw receipt JSON is insufficient.

Active status leaves private material intact. A verified matching deleted receipt
fences access and invokes S2 removal, clearing only that account/profile's
credentials, payloads and receipts. A delayed A receipt never clears B or a new
generation, even for the same Google subject. Lost status response requires a new
fresh challenge; use a purpose-specific transport budget with maxAttempts:1 for
status submission so T05 cannot automatically replay a consumed proof. Do not
change the accepted retry policy for other routes. No durable Google-token journal,
startup replay or background status polling. Once verified removal intent is
durable, S2 recovery
finishes that cleanup without replaying the consumed proof. Generic401/404,
malformed/wrong-account replies, timeout/offline and cancellation never authorize
erasure. Do not retry a consumed status proof as if it were sign-in recovery.

No public-contract conflict was found in this bounded read-only pass. The command
choices implement already-required trusted controls. If implementation finds a
contract conflict or needs a broader reset/account-switch policy, hold that work
and ask for the specific decision rather than expanding these semantics.

## Sequential slices

Each slice includes source, minimal specification-derived checks, review/evidence,
status and handoff. Target60–90-minute windows, checkpoint90 and stop by120 with
an honest partial handoff; estimates are not completion promises. One slice per
implementation context, separately assigned; no automatic succession.

### S1 — Trusted sign-out and unresolved-operation retirement

**Prerequisite:** accepted T06/T07/T09/T11. **Status:** accepted/closed.

Deliver configured lifecycle ownership composition, sign-out descriptor transition/
recovery and the two CLI commands with warnings/confirmation. Reuse T06 signOut
and T09 retireOperation. Keep same-account login and durable operation identity
unchanged; no profile removal or account-status helper yet.

Checks: real isolated owner/vault/repository sign-out preserves exact operation
bytes, rejects stale bindings and suppresses remaining sends/results; logout
failure still leaves a durable signed-out generation. Interrupt descriptor
publication and explicitly recover credential-empty sign-out. Explicit same-account
login/reopen can recover original identity, but never dispatches creation alone.
Retire unresolved work with writesEnabled:false, reopen and prove body erasure,
permanent ID reservation and changed-intent rejection. Representative missing/
definitive receipt/auth failure and ownership contention leave evidence intact.
Exercise CLI confirmation/invalid grammar, signal settlement and sanitized output.

Acceptance: complete S1 owning plus relevant T06 lifecycle, T07 metadata/CLI and
T09 transition/persistence regressions. Actual Secret Service/ext4/private-CA HTTPS
for a core lifecycle path using existing fixtures. Deliver work order, exact commands/
results and interface/metadata notes. Parent T12 remains incomplete; S2 unassigned.

### S2 — Durable profile removal and explicit reconciliation

**Prerequisite:** accepted S1. **Status:** accepted/closed;
[work order](../tasks/t12-s2-work-order.md), [review](../evidence/t12-s2-review.md),
[handoff](../handoffs/t12-s2.md), [format/API notes](t12-removal-format.md).

Deliver holder-owned removal, external removed-generation fence, exact key-item
cleanup, metadata recovery, profile-remove and explicit reconciled setup. Retain
old fences while provisioning a distinct generation; finish known interrupted
removal without requiring decryptable old stores. No account-status proof yet.

Checks: actual isolated production provider/ext4 removal and reopen rejection;
second-process exclusion; one interruption before durable removal intent and
representative interruptions after fence/before key deletion and before final
acknowledgement. No unsafe cleanup before durable intent; once intent is durable,
old handles/open/provision fail and explicit recovery finishes. Provider deletion
failure leaves a fence and reports partial cleanup. Separate profile/key survives.
Ordinary setup rejects removal; explicit reconciled setup gets a distinct binding
without reviving old IDs. Missing/corrupt/stale data, link/path substitution and
ambiguous key identity must retain existing fail-closed behavior. Reuse T04 faults;
add only narrowly required removal checkpoints/provider calls.

Acceptance: complete S1/S2 owning plus affected storage/metadata/setup regressions,
including actual provider deletion and removed-fence survival without its key.
Deliver strict format/API notes and crash-order evidence. Parent incomplete;
S3 account-bound cleanup remains unavailable/unassigned.

### S3 — Foreground account-status proof and account-bound cleanup

**Prerequisite:** accepted S2. **Status:** accepted/closed;
[work order](../tasks/t12-s3-work-order.md), [review](../evidence/t12-s3-review.md),
[handoff](../handoffs/t12-s3.md), [API/provenance notes](t12-account-status-boundary.md).

Deliver purpose-specific status transaction/helper, strict semantic response
verification, private verified-receipt capability and account-status CLI. Connect
only verified matching deletion to S2 cleanup; active/failed proof preserves data.
Share the existing browser security implementation without a general auth framework
or weakening the sign-in API. Do not introduce status resume/login semantics.

Checks: synthetic Google proof through the real isolated callback/private-CA HTTPS
transport, accountStatus purpose/nonce/body and no sign-in/account creation routes;
active vs deleted response; raw forged receipt rejection; wrong account/purpose/
expired callback and generic401/404/offline/malformed response preserve stores.
Lost response requires fresh proof. Signed-out A can verify status; A cleanup
leaves separate B intact, and a late stale-generation result cannot erase new data.
Interrupt after verified durable removal intent and finish via S2 recovery without
Google credential retention. Retain representative Host/Origin/CSRF/duplicate
callback/cancel/port-ownership checks and unchanged T07 browser/login regressions.

Acceptance: complete S1–S3 owning, affected T05 control and T07 helper/CLI
regressions and real isolated verified-cleanup integration. Report synthetic backend
proof as local integration only; real backend/Google semantics remain T16/T19.
S4/parent acceptance remains unassigned; no release or MCP creation claim.

### S4 — Complete operator flow and integrated parent acceptance

**Prerequisite:** accepted S3. **Status:** accepted/closed;
[work order](../tasks/t12-s4-work-order.md), [parent acceptance](../evidence/t12-s4-review.md),
[handoff](../handoffs/t12-s4.md).

Finish setup/login disclosures and operator guide: fitness-data exposure to AI
host/transcripts, indefinite encrypted unresolved content, identifying compact
receipts, non-atomic creation/draft leftovers, local-erasure/replay limits and
config-file writesEnabled defaultfalse. Explicit true permits any connected local
client's valid authenticated creation without a per-routine prompt. Document exact
commands, exclusive-owner sequencing, warnings, recovery and external inputs.
S1–S3 already deliver usable command paths; this slice integrates their interaction.

Run a small end-to-end lifecycle selection with actual encrypted storage/provider,
auth/session/repository/creation boundaries and representative compiled CLI/SDK
launches. Cover retained same-account recovery vs permanent retirement, completed
removal/reconciliation, and verified A-deletion cleanup without B leakage. Reuse
earlier evidence rather than repeat every fault at each layer. Startup never sends
unfinished writes; writesEnabled:false remains unchanged and create_routine remains
unavailable until T15. Inspect output/permissions and owned process/data cleanup.

Acceptance requires complete active T12 S1–S4 owning suite, relevant unchanged
regressions, production/scoped checks and one clean locked source-snapshot replay
of the same exact selection. Record stable input/test and emitted artifact identity,
versions, original failures/repairs and evidence limits. Primary-agent review
checks spec/source/tests; it does not replace independent security/release review.
Only this integrated acceptance closes parent T12. T15 and later gates remain
unassigned, with no automatic successor.

## Scope and verification contract for future assignments

The original planning scope was documentation only. The subsequent S1 work order
authorized its production/test edits and isolated verification; S1 is now closed
and S2–S4 stay held for separate assignment.

Prospective S1 scope: `src/lifecycle/` (new trusted composition), `src/cli/main.ts`,
T07 login metadata/configured recovery and narrow additive auth/operations changes
only if required for their documented integration. S2 additionally owns the
necessary T04 holder/IPC/client/engine/format/validation/keyring/D-Bus/diagnostic
support and removal checks in open/provision. S3 additionally owns purpose-specific
login/browser/page composition. S4 owns necessary integration repairs, disclosures
and `docs/login.md`. Shared manifests/lockfile/compiler/config schemas/dependencies,
shared-docs/.pi and package bins are out of scope. Expand only a demonstrated
integration boundary, never reopen accepted dependencies broadly.

New focused T12 tests/helpers belong under `test/unit/t12/` and `test/fault/t12/`;
minimal existing login/T04/T09/T10/T11 fixture extensions are allowed on assignment.
Preserve all existing tests/evidence; adjust exact additive export/metadata grammar
expectations only for intended new behavior, never hide a failure.

Use provisioned disposable Node24.21.0/npm11.19.0 for every command. The environment's
T01_NODE_HOME was unset during planning; no Node/npm was run. Before implementation,
resolve the existing trusted toolchain locator and verify versions privately; never
substitute system Node or publish private facility paths. Missing isolated inputs
block their affected execution. No system/global/Pi setting changes.

On slice assignment, permitted check families are early scoped syntax/import/type/
lint/format; `npm run typecheck`, `npm run lint:production`,
`npm run format:check:production`, `npm run build`; explicit nonempty Vitest file
selections; bounded inert import/construction smoke. Run focused repairs, then the
stable final owning/regression selection. Build/install never races tests. Parent
S4 adds clean `npm ci --ignore-scripts`, four production checks and identical replay.
These are prospective checks, not execution granted by this planning request.

Reuse T04 provider/fault runners, T07 login/browser/CLI helpers, T09 repository and
T10/T11 encrypted-store/private-CA HTTPS fixtures. Only fresh synthetic isolated
D-Bus/Secret Service, verified ext4/private roots, loopback helper/HTTPS, controlled
launcher and owned child processes. No personal bus, live backend/DB/Google/browser/
Android credentials. Qualify isolation, await teardown and remove only owned fixtures.

Relevant existing regression candidates, narrowed to changed boundaries per slice:

- T06 `test/unit/t06/s5-lifecycle-validation.test.mjs` and
  `test/fault/t06/s5-lifecycle-races.test.mjs`.
- T07 `test/login/metadata.test.mjs`, `transaction.test.mjs`,
  `configured-integration.test.mjs`, `validation.test.mjs`, `browser-page.test.mjs`,
  `browser-http.test.mjs`, `browser-integration.test.mjs`, `cli-boundaries.test.mjs`
  and `cli-integration.test.mjs` in that directory.
- T04 `test/fault/t04/lease.test.mjs`, `key-facility.test.mjs`, `provider.test.mjs`,
  `filesystem.test.mjs`, `stale-anchor.test.mjs`, `commit-crash.test.mjs` and
  `provision-crash.test.mjs`; unit binding/format/contracts if their APIs change.
- T09 `test/unit/t09/s3-transitions.test.mjs` and
  `test/fault/t09/s3-persistence.test.mjs`; T11
  `test/fault/t11/s2-service.test.mjs` for retained identity/authorized recovery.
- T05 validation/control decode tests when touching status composition; T08
  `test/read-protocol/catalogue-dispatch.test.mjs`,
  `test/stdio-server/configured-integration.test.mjs` and foundation CLI/import
  checks for the unchanged model-facing surface and startup/output behavior.

Record the exact nonempty filenames/commands in each work order before execution;
the final parent selection combines full T12 owning with the justified affected
regressions above. No blind whole-repo discovery, per-private-function tests,
cross-product fault campaign or generalized harness. Each new case needs a named
contract/risk and independent oracle. Scenario mapping: A07 sign-out/current-owner
fences; A08 same-account retained recovery/distinct generation; A09 private local
controls/output; A10 verified account-only cleanup; R11/R12 durable retention,
retirement and removed-generation fences. T15/T16/T17 own their remaining integrated
config/real backend/host legs; T18 owns final packaging/disclosure distribution.

## Milestones, stops and deliverables

Planning contract -> separately assigned S1 -> S1 acceptance/handoff -> separately
assigned S2 -> S2 acceptance/handoff -> separately assigned S3 -> S3 acceptance/
handoff -> separately assigned S4 and integrated parent acceptance. Four slices
are reviewable outcomes, not a four-window completion guarantee. The old2–3-session
estimate is replaced because storage removal/provider deletion is new safety work.

Each assignment records exact edit scope, minimal shared API additions, environment
qualification, active checks and unavailable later behavior before source changes.
Escalate specific normative conflicts, missing trusted inputs, unsupported durability/
provider behavior or required dependency/policy expansion. Stop affected work for
unsafe isolation, ambiguous binding/commit/cleanup or time limit; preserve fences
and record remaining acceptance. Continue unrelated authorized work when possible.
No skips/unknown observations count as passes and no waived T06 checks become passes.

Deliver per-slice work order, source/tests, spec/source/test review, safe exact
commands/results, versions/stable artifact identity, handoff and updated task status.
S2 also delivers removal/reconciliation format/API notes; S4 delivers parent evidence,
operator guide and T15/T16/T18 integration notes. Real origin/client ID/ports/secret
facility/backend availability are external inputs, recorded as placeholders only.
No staging/commits, publication/deployment or automatic next-slice authorization.

Planning validation: a read-only Python check of this plan and the four updated
task/pickup/roadmap documents resolved all219 local links/anchors and found no
trailing whitespace. `git diff --check` on the four tracked documents passed.
No production/test source changes, Node/npm execution, install/build, behavioral
tests or fixture/live-account actions were performed. These documentation checks
are not T12 implementation or acceptance evidence.

## S1 disposition

[Accepted](../evidence/t12-s1-review.md):21/21 new owning+121/121 relevant
regressions=142/142 in14 exact files, zero failures/skips/pending/todo. Four
production/scoped checks, bounded silent import/signal smoke,512 stable hashes
including184 emitted files and actual isolated provider/ext4/HTTPS/CLI cleanup
PASS. [Current handoff](../handoffs/t12-s1.md). Workspace acceptance only; clean
locked parent replay remains S4. All S1 grants closed; S2 ready/unassigned, S3/S4
held and parent T12 incomplete. No product creation or automatic successor.
