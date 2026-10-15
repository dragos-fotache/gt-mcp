# T06-S5 — Trusted lifecycle and race closure

**Authority:** user instructed Coordinator to start T06-S5 only.
**Status:** production c2 and QA r5 SOURCE-APPROVED/HELD; ALL production and QA
source/helper/static/build windows CLOSED.29authored QA cases, ZERO executed.
QA readiness EVIDENCE-only obsolete-paragraph correction allowed before inventory;
no source/runtime action. Target/fixture/suite execution CLOSED until a named
reviewed frozen-artifact relay. Readiness is not acceptance.
[Production c2 source gate](../evidence/t06-s5-coordinator-production-source-review-c2.md).
Historical role grants below are superseded by these holds; no automatic renewal.
**Owners:** Coordinator coordinator/w4:p2K; fresh Developer developer/w4:p2H;
fresh QA qa/w4:p2M. S1–S4 accepted/CLOSED; parent T06 incomplete/T07/T08 blocked.

## Outcome and authority

Deliver trusted fence-first sign-out and foreground same-origin/same-account
replacement, permanently isolated superseded auth evidence, and integrated stale
read/write/refresh suppression. Preserve opaque operation evidence unchanged.

Normative references: shared MCP draft0.2 [authentication](../../shared-docs/docs/mcp-contract/authentication.md)
(bootstrap/sign-out, account/session fences, storage/lifecycle); backend v1
[authentication](../../shared-docs/docs/backend-contract/authentication.md)
(logout/revocation and explicit foreground supersession); backend
[wire compatibility](../../shared-docs/docs/backend-contract/client-compatibility.md)
and [expiry precision](../../shared-docs/docs/backend-contract/issues/auth-expiry-precision.md).
Reuse accepted [T04 storage](../decisions/t04-approved-storage-spec.md),
[T05 transport](../decisions/t05-approved-transport-spec.md),
[S1](t06-s1-work-order.md), [S2](t06-s2-work-order.md), [S3](t06-s3-work-order.md),
[S4](t06-s4-work-order.md), its [common adjudication](../decisions/t06-s4-interface-adjudication.md)
and [accepted handoff](../handoffs/t06-s4.md).
[S5 common lifecycle clarification](../decisions/t06-s5-lifecycle-adjudication.md)
settles monotonic shared logout budgeting and post-clock cancellation priority for
BOTH roles without changing public interfaces or granting execution.
[Independent bounded coordination](../agent-coordination.md) and
[proportional testing](../decisions/proportional-testing-policy.md) apply.
Shared-docs baseline9a96dcb and six existing approved MCP policy edits unchanged.

No browser/Google flow, initial installation, CLI/MCP wiring, config guard,
operation format/admission/replay/retirement, account switching/deletion cleanup,
new storage/transport/provider seam or dependency. No Android Room reservation
implementation, adoption of foreign/older outer vault records, hidden reopen or
reprovision. T12 owns later trusted deletion/profile cleanup. Generic errors are
not deletion proof. Actual product writes remain disabled; isolated synthetic
mutation fixtures are permitted only after relay. T02 parked/T13–T14 retired.

## Settled additive public API

Preserve all eight accepted auth exports and standalone S1–S4 contracts, including
strict v1/v2 decoding. Add TWO runtime exports (ten total) at dist/auth/index.js
and corresponding declarations:

```ts
export const LIFECYCLE_VAULT_VERSION: 3;
export interface LifecycleSessionState extends AuthenticatedSessionState {
  signOut(captured: CallBinding): Promise<StorageBinding>;
  replaceGrant(
    captured: CallBinding,
    serviceGrantBytes: Uint8Array,
    signal: AbortSignal,
  ): Promise<StorageBinding>;
}
export function openLifecycleSessionState(
  options: RefreshSessionStateOptions,
): Promise<LifecycleSessionState>;
```

Flat facade: binding, nine exact S4/T05 resource methods, invalidate, signOut,
replaceGrant ONLY. No credentials/hooks/auth controls/explicit rotate/recover,
public sender or arbitrary request escape hatch. Options exactly S2/S4 options.
Factory requires a bound nonnull account (null => authentication_required); reads
empty/v1/v2/v3 existing vault and validates config only. No opening mutation,
migration, keys, network or operation reads. Imports remain inert. Already-held
exclusive T04 owner only. One facade owns auth mutation; prior facades must be
invalidated before handoff. Operation-only commits remain compatible.

Accepted own-data capture, trusted capability receivers/T04 binding getter,
SessionClock prototype receiver, detached bytes with byteOffset, argument/signal
validation and sanitized errors apply unchanged. No extra domain/expiry/token
rules, size caps, new SessionError codes or public timing/test seam. Runtime
exports/version constants are additive; older factories still refuse v3 safely.

## Private version3 evidence contract

T04 owns encryption/atomicity. Strict duplicate-key-free UTF-8 JSON inside the
vault, exact fields everywhere:

```text
{ version: 3, binding: <all four current StorageBinding fields>,
  grant: null | <S1 stored grant>,
  pendingRefresh: null | <exact S2 pending record>,
  superseded: [ {
    binding: <all four predecessor StorageBinding fields>,
    grant: <nonnull S1 stored grant>,
    pendingRefresh: null | <exact S2 pending record>
  }, ... ] }
```

Current grant/pending obey all accepted S1/S2 rules. Every retained entry has the
same origin/account/profileGenerationId as current binding and a strictly older
sessionGeneration. Entries are strictly increasing by generation, no duplicates;
validate each grant/pending against THAT entry's binding. Original token strings,
expiry spellings, predecessor/bodyBase64/authKey are retained losslessly. Retained
expired credentials remain evidence, not invalid current authorization. No nested
v3 snapshots, inferred TTL/eviction/cleanup or deduplication by token spelling.
Malformed fields/bindings/UTF-8/duplicates => state_corrupt; unsupported integer
version => state_version_unsupported before version-specific shape checks.

Opening never upgrades. A permitted S5 fresh refresh preparation may write v3;
existing current pending replay preserves exact identity and retains superseded
entries in every joint grant/pending transition. Resources have ALL S4 semantics,
including pending-current priority and at-most-one401 retry, independently of
retained evidence. Superseded entries NEVER supply bearer, refresh replay, pending
selection or authority, never block the distinct installed session's rotation,
and never get promoted/rebound or erased on ordinary resource/auth failures.
S5 may factor accepted internals privately; standalone public formats stay frozen.

## Lifecycle admission, durability and races

Both actions require the detached captured binding to equal this facade's capture.
Malformed/foreign arguments reject without fencing another valid caller or IO.
Only one lifecycle action admits; concurrent/repeated action on fenced facade =>
operation_interrupted. invalidate remains synchronous permanent local cancellation,
not durable sign-out. Validate actionable arguments locally FIRST, then fence
resource/auth admission synchronously BEFORE the first await. Cancel owned network
and wait for already-begun owned auth/storage commits to settle safely; never race
an old installation against generation advance or force-kill durability work.

After settling owned work, reread/validate actual current owner/vault against the
last acknowledged owned state. Owned commit changes are not foreign drift. Foreign,
corrupt, unreadable or ambiguous state propagates its safe error and stays private;
no optimistic transition, fallback, automatic repair, lost-evidence deletion or
rollback. Resource late results keep S4's safe dispatched/outcomeUnknown metadata;
refresh/read success cannot leak after the local lifecycle fence.

Successful lifecycle action calls T04 advanceSessionGeneration ONCE with v3 vault
bound to exactly old generation+1, same origin/account/profile UUID. Atomic T04
transition preserves operation plaintext bytes without reading/rewriting them.
Overflow retains T04 resource_exhausted. Bound account UUID remains an isolation
binding, NOT an active signed-in identity when grant is null. Old facade/owner
capture remain permanently stale; result is new StorageBinding ONLY, never grant
or evidence. Caller closes old owner and explicitly opens returned binding; no
hidden reacquire or automatic action. Original safe StorageError propagates on
storage failure; no success claim without acknowledged durable generation/vault.

### signOut

Trusted local action, not a model tool. Deliberately has NO caller AbortSignal:
accepted local clearing must settle independently of network cancellation. After
fence/owned-work settlement, advance with grant=null, pendingRefresh=null,
superseded=[]; this explicit lifecycle authority clears ALL usable and retained
auth credentials, not operation evidence. Signed-out empty/null-grant state also
advances exactly once. Generic401/offline failures never invoke this action.

Only AFTER durable local clearing, best-effort logout the distinct known refresh
credentials from the captured current and retained grants (exact token values;
deduplicate identical wire bodies only for this explicit cleanup). Use T05 fixed
POST /v1/auth/logout, no bearer or auth key, one attempt per token, configured
origin/limits/TLS, bounded by ONE shared transport totalDeadlineMs network window.
Private cleanup authorization belongs solely to this admitted sign-out, not an
old usable session hook or reopened owner. No other auth/resource route under it.
Network window expiry cancels further logout; await owned network cleanup, no
background task/offline queue. Network/204/malformed/error outcomes cannot undo
local clearing or turn acknowledged sign-out into failure. No token/material in
result/log/error. Server revocation is best effort, not a success/release claim.
Explicit invalidate during admitted signOut does not cancel durable clearing or
suppress its acknowledged binding; it may stop best-effort network only.

### replaceGrant

Trusted caller supplies detached COMPLETE service response bytes only after a
successful fresh FOREGROUND same-origin T05 auth exchange. As with S1 initial
install, this is a trusted composition provenance precondition, not verification
of Google identity by parsing. It cannot be triggered by replay/network failure,
model tokens, backend content or background refresh. Validate S1 ServiceSession
and exact expiry grammar; returned account MUST equal this bound UUID (valid
other account => operation_interrupted, no fence/IO). Expired refresh =>
reauthentication_required, no fence/IO. Expired access/live refresh may install,
then next explicit resource uses accepted preflight. Invalid grant => invalid_grant.

Validate deadline/clock before admission and again immediately before advance,
after owner awaits and clock callback; caller abort/explicit invalidate wins.
Retain existing superseded list unchanged; append the latest settled current
nonnull grant plus its EXACT pending record under OLD binding, then atomically
install fresh grant/pending=null and NEW binding in v3. Null current grant adds
no empty entry. Uncertain predecessor is preserved, NOT settled/revoked; no logout
or replay on replacement. Retained material is permanently fenced even on restart.
Ordinary new-session refresh must not touch it. Origin/account never adopted.

Cancellation before advance invocation prevents it, but local facade stays fenced.
Once advance begins, await safe settlement; caller abort/explicit invalidate then
suppresses success with operation_interrupted, retaining any committed target for
explicit trusted reopen. Transition's own fence is not cancellation. Failure after
an acknowledged advance never rolls back generation or reinstalls predecessor.
No late success/background install or operation identity/key/body rewrite.

## Roles, environment and grants

Developer edits src/auth/, docs/decisions/t06-implementation-adr.md and bounded auth
rows in docs/compatibility.md ONLY; reads public specs/production/nonsecret metadata,
NEVER QA tests/helpers/fixtures/private plans/evidence or test-source diffs. No
HTTP/storage/domain/root/config/manifest/lock/dependency edits without review.
Commands: npm run typecheck, lint:production, format:check:production, build;
scoped ESLint/Prettier on owned paths. No install, QA suite, ad hoc runtime/import
probe; escalate concrete need. Early static checks, final four commands, then HOLD.

QA owns NEW s5-prefixed sources/helpers under test/unit/t06/, test/fault/t06/ and
NEW docs/evidence/t06-s5-qa-*.md. Reuse simple accepted QA fixtures. Accepted tests/
helpers remain unchanged absent specific Coordinator approval (report needed
additive barrel/version expectation repairs; do not weaken existing assertions).
Read common public specifications/nonsecret metadata/declarations AFTER relay;
NEVER production sources/diffs/emitted JS/maps/private ADR/Developer reports.
No install/build/config/dependency changes. Scoped node --check, ESLint/Prettier,
source-only import-resolution/static checks allowed early. ZERO compiled-target,
provider/loopback/fixture/suite execution before named reviewed frozen relay.
Provide SHORT risk/file checklist and readiness, then HOLD for source review.

All project commands use verified disposable T01_NODE_HOME/PATH, Node24.21.0/
npm11.19.0 privately supplied by Coordinator; no ambient/system/global fallback
or install hooks. Fixture execution AFTER relay uses fresh sibling/disjoint HOME,
TMPDIR/run/XDG/cache, cleared Node/TLS/DBus overrides, isolated T04 diagnostic
persistence/test-owned literal-loopback HTTPS only. Isolated real provider regression
uses its existing owned GNOME Keyring fixture, never personal bus/keyring.
No real credentials/IDs/bodies/private paths in reports; visibly synthetic inputs
belong in QA fixtures. No live/backend/browser/Android, product writes, .pi/settings/
trust edits, staging/commits/release, new topology or automatic context/successor.

## Proportional verification and stop

Independent QA chooses minimal public-oracle checks by named risk:

- Validation/read-only opening/strict v3 retention and old-version refusal; main
  live-grant resource path. No repeated exhaustive codec/expiry matrix.
- Same-account fresh replacement of uncertain refresh: exact retained evidence,
  restart, normal new-session rotation, unchanged opaque operations. Foreign grant
  refuses without fencing; retained evidence never replays/selects.
- Offline sign-out: durable generation/credential clearing before delayed/failed
  logout, old capture refusal, operation retention; explicit cleanup of superseded
  credentials. No backend-wide revocation claim from fixture.
- Representative read/mutation/refresh races and begun-commit settlement around
  sign-out/replacement/cancellation; truthful stale mutation uncertainty. Use a
  few meaningful integration checks, not every race cross-product.
- Representative definite pre-prepare and ambiguous transition failure, unchanged
  safety errors/private evidence; no forced repair or automatic reopen.

Final parent selection: ALL active test/unit/t06 and test/fault/t06 suites (S1–S5),
ALL foundation/T03/T04 unit+fault suites INCLUDING isolated provider, plus EXACT
15 active T05 suites in [bounded T05 plan section2](../decisions/t05-bounded-verification-plan.md#2-explicit-active-t05-test-selection).
Historical T05 generalized/deferred harness and parked T02 remain UNRUN/not passed;
no npm test/check or whole-repository green claim. QA case/file list is reviewed
before relay. New owning focused check first; final complete selection only once
ready, targeted repair reruns as warranted. Full output persisted before cleanup;
no tail-only failure identity loss, hidden exclusions, skips counted passes or
unhandled rejections. Required cleanup failures propagate.

Coordinator reviews sources independently, freezes inventory/source/static gate,
relays exact artifact for QA, then requires locked allowlisted clean-source
npm ci --ignore-scripts, four production checks, same final selection, stable hashes
and byte-identical rebuilt outputs. Small inert ten-export import smoke plus source
review, NOT OS sandbox/power-loss/real backend/Google/host/release certification.
Parent T06 done/T07–T08 ready ONLY after integrated acceptance; T12/A10 deletion
cleanup and external T16/T19 gates remain open, not silently passed.

Target60–90min role window/checkpoint90/STOP120 with honest partial handoff. Report
source/static readiness, concrete interface/blocker questions and exact safe
results asynchronously to coordinator/w4:p2K via Herdr, no polling loops. Hold
specifically ambiguous work; no broad proposal or generalized harness. Safely
settle begun durability work before stopping. No automatic renewal or successor.
