# T06-S4 — Authenticated requests: decision-ready work order

**Status:** production c4 and independent QA r3-repaired sources APPROVED/HELD.
ALL source/helper/build/install/static windows CLOSED.33QA cases authored, ZERO
executed; source approval is NOT behavioral acceptance. Only the separate exact
[t06-s4-f1 frozen relay](../evidence/t06-s4-f1-coordinator-relay.md) may authorize
compiled-target/fixture/suite execution; no blanket run or production rebuild.
Compiled-target/fixture/suite execution CLOSED until separately reviewed named frozen
relay. Readiness/static/build green is not acceptance.
**Current gates:** [production c0 review](../evidence/t06-s4-coordinator-production-source-review-c0.md)
and [production c1 review](../evidence/t06-s4-coordinator-production-source-review-c1.md)
open production repairs/four permitted checks; [QA r1 review](../evidence/t06-s4-coordinator-qa-source-review-r1.md)
and [QA r2 review](../evidence/t06-s4-coordinator-qa-source-review-r2.md) are
historical repair gates. [QA r3 review](../evidence/t06-s4-coordinator-qa-source-review-r3.md)
is now closed by the final QA source gate; all four S4 QA sources HELD. Production
c0–c3 repair grants are historical and CLOSED by c4 source approval.
QA source approval opens no execution. All earlier repair language below is
superseded by these holds and the separate named relay, not a renewed grant. Neither role reads the
other's private review/source/evidence. NO target/fixture/suite execution.
**Authority:** user instructed the new Coordinator to start T06-S4 only.
**Owners:** Coordinator / w4:p2K; fresh Developer / w4:p2H; fresh QA / w4:p2M.
S1–S3 accepted/closed; parent T06 incomplete; S5 unassigned; T07/T08 blocked.

## Outcome, authority and non-goals

Compose accepted private session recovery with fixed-route bearer requests. Preserve
request identity across one 401 refresh-and-retry, serialize refresh for concurrent
requests, fence dispatch/delivery and retain exact uncertain refresh evidence.

Normative: shared MCP draft0.2 [authentication](../../shared-docs/docs/mcp-contract/authentication.md),
backend v1 [authentication](../../shared-docs/docs/backend-contract/authentication.md),
[wire types](../../shared-docs/docs/backend-contract/client-compatibility.md#wire-types-and-validation),
OpenAPI ServiceSession/RefreshCredential and [legacy precision limitation](../../shared-docs/docs/backend-contract/issues/auth-expiry-precision.md).
Reuse accepted [T04 storage API](../decisions/t04-approved-storage-spec.md),
[T05 transport API](../decisions/t05-approved-transport-spec.md), frozen
[S1](t06-s1-work-order.md)/[S2](t06-s2-work-order.md)/[S3](t06-s3-work-order.md)
contracts and [S3 accepted handoff](../handoffs/t06-s3.md).
[Common interface adjudication](../decisions/t06-s4-interface-adjudication.md)
settles entry error classes/head-budget timing and clarifies shared-auth/actual-bearer
revision/final-delivery uncertainty requirements for BOTH roles.
[Proportional verification](../decisions/proportional-testing-policy.md) and
[bounded independent coordination](../agent-coordination.md) apply.

No trusted sign-out/replacement/logout/supersession, browser/login, CLI/MCP wiring,
config loader/writesEnabled guard, journals/creation workflow, caching or cleanup.
No new provider, transport seam, arbitrary route/header/sender, account adoption,
external dependency or shared-contract change. Product writes remain disabled.
Mutation primitives below are INTERNAL composition capabilities for later guarded
T09/T10/T15, not a delivered write tool or permission to use a real service.
S4 is partial internal acceptance; S5 lifecycle/race and parent integrated gates
remain mandatory. T02 parked, T13/T14 retired; no automatic successor.

## Settled additive public API

Preserve ALL accepted exports, S1/S2/S3 behavior and strict v1/v2 vault formats.
Add ONE runtime export at dist/auth/index.js (eight total), plus these types:

```ts
export type AuthenticatedResourceTransport = Pick<BackendTransport,
  | "searchExercises" | "getExercise" | "listWorkouts" | "getWorkout"
  | "listRoutines" | "getRoutine"
  | "createDraft" | "populateDraft" | "saveRoutine">;
export interface AuthenticatedSessionState extends AuthenticatedResourceTransport {
  readonly binding: StorageBinding;
  invalidate(): void;
}
export function openAuthenticatedSessionState(
  options: RefreshSessionStateOptions,
): Promise<AuthenticatedSessionState>;
```

The nine method signatures and result types are EXACTLY the corresponding T05
BackendTransport signatures. Each takes captured CallBinding and native AbortSignal.
Expose binding, these nine methods, invalidate ONLY: no hooks/credentials, controls,
explicit rotate/recover methods, public sender or generic request escape hatch.
No new SessionError code or vault version. Root/server/CLI/companion unchanged/inert.

Options remain exactly profile, transportConfig, optional epoch clock. Capture all
own-data arguments/config/budgets/CA byte views, method receivers and nested values
before first await. Validate original config without discarding unknown keys or
invalid maxAttempts before applying the S4 retry policy below. Keep T04 binding
getter and class/prototype SessionClock receiver support. Do not invoke ordinary
argument getters, mutate/freeze caller objects or retain mutable request aliases.
Copy body byteOffset/length and detach query/binding at method entry, including
while waiting for a refresh. Local invalid route arguments/bodies/queries reject
before preparing refresh or dispatching any request. Use accepted T03/T05 validation
semantics, not weaker JSON parsing/number conversion or new domain restrictions.
Session entry/state failures and Transport route/size failures may retain their
safe classes per common adjudication. Full operational head-budget enforcement for
otherwise valid data remains T05 pre-dispatch and may follow preflight; malformed
args/body-byte size still reject before auth preparation.

Factory reads/validates existing empty/v1/v2 vault and configuration ONLY. No opening
migration, key allocation, network, credential refresh or operation reads. Invalid,
foreign, corrupt and unsupported state fails closed unchanged. Import is inert.
Already-held exclusive T04 owner only; no hidden close/reopen/reacquire. Invalidate
previous facade before handing owner over; invalidate S4 before external vault/
generation changes or close. One facade owns auth mutations; operation-only commits
remain compatible. No initial installation or change of binding/generation here.

## Resource and refresh transitions

1. Entry captures/validates all request identity and signal. Missing grant =>
   authentication_required. Invalid caller => invalid_arguments (T05 size errors
   retain their safe codes). Valid foreign binding or invalidated facade =>
   operation_interrupted without cancelling another valid caller. Actual owner/
   vault drift permanently fences. Preserve opaque operation bytes without reading.
2. Before bearer selection, await any active shared auth cycle and ensure usable
   credentials. Pending ALWAYS takes exact S3 recovery priority; never select its
   predecessor as bearer. No pending and live access+refresh is read-only. Expired
   access/live refresh permits one durable fresh rotation; expired refresh refuses.
   Preflight recovery retains S3's at-most-two controls: original replay then, only
   for expired recovered access, one distinct rotation AFTER durable installation.
   Factory itself never performs this preflight; explicit resource invocation does.
3. Dispatch one resource leg through actual T05 fixed-origin transport. Hooks verify
   owner/expected vault and captured origin/account/generations before send/delivery;
   select current live bearer only. Refresh updates expected vault atomically but
   does NOT change captured account/generations or invalidate unrelated resource
   responses merely because bearer rotated. No bearer while shared auth state is
   unresolved. A dispatch must remember its internal installed-grant revision;
   this is private volatile concurrency bookkeeping, not a new vault field.
4. ONLY a validated, delivered T05 status401 with authentication_required or
   reauthentication_required permits one reactive refresh-and-retry. A malformed
   401, wrong status/code, 403/404, network error or other error never starts auth
   refresh. T05 has already applied its pre-delivery fences to the rejection.
5. Compare the revision used at first dispatch with current installed revision.
   If another caller has already durably installed a newer usable grant, use it
   for the one retry WITHOUT a redundant rotation. If a shared cycle is active,
   join it. Otherwise same revision/no pending => force ONE durable fresh rotation,
   even when access's local deadline is live (backend authorization is authoritative).
   If pending exists, exact S3 recovery wins instead; a live recovered successor
   satisfies this step, expired recovered access permits its one distinct rotation.
   Never rotate a consumed uncertain predecessor under another key.
6. Retry the resource at most ONCE, using unchanged captured binding, method,
   effective route/query, path IDs, exact body bytes and resource key. Only bearer
   selection changes. Concurrent delayed 401s from the older revision reuse the
   installed successor, rather than each issuing another refresh. Repeated401 =>
   reauthentication_required, no further auth request/resource replay in this call.
   No interactive login, implicit new account, evidence deletion or retry loop.
7. Before success recheck caller signal, local fence, owner identity/expected vault
   and exact expiries AFTER final owner-validation awaits; recheck AFTER any clock
   callback immediately before dispatch/commit/delivery. No late success after abort
   during a final owner read. Await begun owned commits and suppress late success
   without rollback. EVERY auth cycle requires terminal live access+refresh and
   post-clock leader/fence checks. Valid refresh returning expired access is installed
   under S2/S3, then shared cycle requires reauthentication, not another rotation.

### Bounded policy and observable errors

For this internal S4 facade each RESOURCE LEG uses T05 maxAttempts=1; controls
already use attempt1. Validate the caller's complete T05 config first, then cap
resource attempts privately. No automatic transient resource retry/sleep in S4.
This deliberately avoids multiplying T05 retries around 401 and losing sticky
mutation uncertainty between transport calls. T05 itself is UNCHANGED and retains
its accepted configurable transient retry behavior for direct callers. A later
broader orchestration policy requires a separate decision, not silent expansion.

A resource invocation has at most two resource dispatches. Preflight and reactive
stages each have at most one shared auth cycle (each cycle at most two controls
under S3); no autonomous worker/hidden retry. Existing T05 totalDeadlineMs bounds
EACH transport invocation, including its hooks, not an invented aggregate S4
wall-clock SLA. Session clock remains epoch-based; T05 budget clock stays monotonic.
No new public clock/sleeper/wire/event seams. Caller abort and invalidate bound
waiting as described below; no detached refresh or durability-critical termination.

Resource success returns the final leg's exact T05 result; attempts/elapsedMs/
correlationId describe THAT leg, not total orchestration/control traffic. Returned
raw mutation bytes remain detached. Do not fabricate whole-cycle metadata.
A resource failure other than the eligible first401 preserves its original safe
T05 TransportError, especially dispatched/outcomeUnknown on mutation loss, fencing
or overflow. Never retry such uncertainty through this 401 path. If a received T05
success is suppressed at added S4 delivery for abort/fence/expiry/clock, return safe
final-leg TransportError per common adjudication: dispatched=true and
outcomeUnknown=true for mutation (false for read), no body/cause/result leakage. A repeated valid
401 becomes safe SessionError(reauthentication_required): both received401 legs
were definite rejection under the one-attempt policy, not mutation settlement.

If auth recovery/rotation cannot produce usable credentials, suppress resource
retry. At the S4 boundary, SessionError invalid_grant/reauthentication_required and
safe auth TransportErrors except operation_interrupted become safe
SessionError(reauthentication_required), retaining private pending evidence with
no cause/body/token in the error. This includes network/rate-limit/409/legacy
precision failure: unresolved auth is NOT silently settled. Abort/fence preserves
operation_interrupted at the observing Session/T05 boundary; safe StorageError
propagates unchanged and permanently fences; local invalid arguments/clock and
state errors preserve their accepted safe distinctions. S1–S3 standalone APIs
continue to propagate their accepted errors unchanged. No error is deletion proof.

## Concurrency, cancellation and durability

All S4 preflight/401 needs share ONE serialized auth controller inside the exclusive
owner. Unlike standalone S3 mixed-kind refusal, S4 requests coordinate recovery and
forced refresh internally; no competing facades/hooks with stale vault snapshots.
Never await an auth lock from a hook belonging to that controller's own auth send.
Resource networking may overlap; do not serialize whole resource calls unnecessarily.
A caller arriving during active auth joins even before pending prepare acknowledgement;
owned vault transition intervals are not external drift. Revision bookkeeping must
identify the bearer actually selected for each leg, not merely pre-hook state. See
common adjudication. After auth, each waiter rechecks its own binding/signal/owner/
fence before sending.

First valid caller starting an auth cycle is its cancellation leader. Follower abort
rejects that follower's wait only, not leader/network/commit. Leader abort cancels
owned auth network and propagates interrupted cycle outcome to live followers;
those invocations do not silently elect a replacement/retry. A later explicit
invocation can recover durable evidence. Leader promise must not settle while its
owned commit remains unresolved; after begun commit, safely await settlement and
suppress success for leader/live followers even if installation completed. Followers
may stop waiting immediately, as in S3. No foreign/malformed/aborted caller joins
successful work or fences a valid leader. Clean up listeners/promises on all outcomes.

invalidate is synchronous, idempotent, permanent, cancels owned resource/auth network
and fences waiters; NO IO/credential deletion. Before commit invocation cancellation
prevents commit; once begun, await it safely without rollback. Sign-out/replacement
and durable lifecycle transitions belong to S5, not this invalidate. Preserve S2/S3
exact prepare-before-send and joint grant/pending-null commit, strict account/expiry
checks, original bytes/key on failure and post-clock safeguards. Private factoring
within src/auth is Developer discretion; accepted public behaviors remain frozen.

## Roles, commands and current windows

Developer edits src/auth/, docs/decisions/t06-implementation-adr.md and bounded auth
rows in docs/compatibility.md ONLY. May read specs/production/nonsecret metadata;
NEVER QA tests/helpers/fixtures/private plans/evidence or test-source diffs. No
src/http/storage/domain/root, manifest/lock/config/dependency changes without review.
Permitted early/final checks: npm run typecheck, lint:production,
format:check:production, build; scoped ESLint/Prettier on owned paths. No QA suite,
custom runtime/import diagnostic or install; request concrete additional need.

QA edits NEW s4-prefixed files in test/unit/t06/, test/fault/t06/ and NEW
docs/evidence/t06-s4-qa-*.md ONLY. Reuse accepted QA helpers; no accepted S1–S3 test/
helper changes without repair approval. Read common public specs/nonsecret metadata
and public declarations after relay; NEVER production sources/diffs/emitted JS/maps,
private ADR/Developer reports/production review. No config/dependency/build/install.
Early static-only scoped node --check, ESLint/Prettier and source-only import-resolution
checks allowed. No compiled-target/fixture/loopback/provider/suite execution until
explicit named reviewed frozen relay. Readiness then HOLD source/build for review.

ALL commands use privately supplied, checked disposable T01_NODE_HOME with
PATH="$T01_NODE_HOME/bin:$PATH", Node24.21.0/npm11.19.0. No ambient/system/global
fallback or lifecycle-hook dependency. Fixtures AFTER relay need fresh sibling/
disjoint HOME/TMPDIR/run roots, fresh XDG/cache and cleared Node/TLS/DBus overrides.
Only isolated T04 diagnostic persistence and test-owned literal-loopback HTTPS.
Synthetic mutation fixture traffic expressly allowed; no product/live writes,
personal keyring/backend/database/browser/Android session, .pi/settings/trust changes,
staging/commits/deploy/release or successor/context renewal. Cleanup errors propagate.

## Proportional acceptance and milestones

QA supplies a SHORT risk/file checklist, not another broad design plan. Choose
minimal independent public checks and simple reused T06/T04/T05 fixtures:

- Ordinary live-grant read; expired-access preflight; pending restart exact replay
  before bearer dispatch. Real isolated persistence/HTTPS, no duplicate codec matrix.
- Valid401 -> durable same-account refresh -> one successful retry, exact request
  identity (one representative mutation covers bytes/resource key); repeated401 and
  malformed/noneligible401 prove no loop or unauthorized auth expansion.
- Concurrent401s (including delayed older401) share one rotation; follower abort
  local, leader cancellation/held real commit/invalidate suppress late delivery and
  retain durable evidence. A few meaningful boundary cases, not a race cross-product.
- Representative unresolved auth/legacy failure retains original evidence and
  returns reauthentication_required; resource loss preserves mutation uncertainty
  without auth replay; malformed caller rejected before auth changes. Reuse existing
  fixture/oracles and immutable request-mutation case rather than test every route.
- Small isolated eight-export import smoke plus Coordinator source audit; NOT OS
  sandbox, power-loss/crash-kill or comprehensive interception proof.

Final named relay selects ALL new active S4 owning suites, ALL accepted S1–S3 owning
suites, directly relevant unchanged T04 unit suites and T05 hooks suite
04-hooks-fences-dispatch.test.mjs. Freeze exact paths/counts/hashes after separate
production/QA source review; no rebuild/install races execution. Final clean
allowlisted locked-source reproduction: npm ci --ignore-scripts, four production
checks/build, SAME selected tests, scoped QA quality, unchanged source hashes and
identical compiled bytes. Full foundation/T03/provider/transport/integrated lifecycle
regressions remain final parent T06 gates, not silently passed/deleted here. Real
backend/Google/browser/host/release verification remains out of scope.

Milestones: early static checks; exact ambiguity/blocker; source readiness with
changed paths and commands/results, then HOLD. Coordinator separately reviews,
relays only specification-level defects, freezes and grants exact independent QA
execution; readiness/source approval is not acceptance. Developer delivers auth
implementation/concise ADR/compatibility notes; QA independent tests/checklist and
sanitized evidence; Coordinator work order/start/reviews/relay/clean proof/disposition.
Report asynchronously to coordinator / w4:p2K. Target60–90min, checkpoint90,stop120
with honest partial/blocked handoff and safely settled owned work. Specific ambiguity,
accepted-module defect, dependency/fixture need or scope growth => hold affected work
and escalate. No general harness or contract weakening. S4 acceptance closes S4 only;
S5/parent completion/T07/T08 require later explicit authorization and acceptance.
