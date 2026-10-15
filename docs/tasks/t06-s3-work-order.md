# T06-S3 — Exact refresh recovery: decision-ready work order

**Status:** SOURCE WORK CLOSED; production c1 and independent QA r1 repairs
SOURCE-APPROVED/HELD. All source/build/install grants CLOSED. Compiled-target/
fixture/suite execution requires the exact named
[t06-s3-f1 relay](../evidence/t06-s3-f1-coordinator-relay.md); no blanket run.
Source approval/readiness/relay is not acceptance; parent T06 incomplete.
**Authority:** user instructed Coordinator to start T06-S3 only.
**Owners:** Coordinator; fresh independent Developer and QA in existing panes.
S1/S2 remain accepted/closed. S4/S5 unassigned; parent T06 incomplete.

## Outcome, references and non-goals

Recover an uncertain refresh using the durable original predecessor/token/body/key,
including after owner close/reopen. Install its original same-account grant before
any distinct rotation needed for expired access. Never rekey an unresolved attempt,
round incompatible legacy expiry, erase evidence or adopt another account.

Normative: shared MCP draft0.2 [access/refresh](../../shared-docs/docs/mcp-contract/authentication.md#access-and-refresh);
backend v1 [authentication](../../shared-docs/docs/backend-contract/authentication.md),
[wire types](../../shared-docs/docs/backend-contract/client-compatibility.md#wire-types-and-validation),
OpenAPI RefreshCredential/ServiceSession and [legacy precision limitation](../../shared-docs/docs/backend-contract/issues/auth-expiry-precision.md).
Reuse accepted [T04 API](../decisions/t04-approved-storage-spec.md#3-exact-public-production-api),
[T05 API](../decisions/t05-approved-transport-spec.md), frozen [S1](t06-s1-work-order.md)/
[S2](t06-s2-work-order.md) and [S2 handoff](../handoffs/t06-s2.md).
Standing [proportional testing](../decisions/proportional-testing-policy.md) and
[bounded independent coordination](../agent-coordination.md) apply.

No resource 401/read/write orchestration, sign-out/replacement/logout/supersession,
login/browser, CLI/MCP/config permission wiring, journal parsing/cleanup, autonomous
recovery worker, new provider/transport seam or real backend/host/release claim.
Shared contracts/T04/T05 remain unchanged; actual product writes disabled.

## Settled additive public API

Preserve existing S1/S2 factories, types, runtime exports and behavior. In particular,
openRefreshSessionState.rotateRefresh STILL refuses pending as
reauthentication_required without dispatch/key/commit. Add ONE runtime export at
dist/auth/index.js (seven total), no new vault version or SessionError codes:

```ts
export interface RecoverableRefreshSessionState extends RefreshSessionState {
  recoverRefresh(captured: CallBinding, signal: AbortSignal): Promise<void>;
}
export function openRecoverableRefreshSessionState(
  options: RefreshSessionStateOptions,
): Promise<RecoverableRefreshSessionState>;
```

The new facade has captured binding, rotateRefresh, recoverRefresh and synchronous
permanent invalidate. rotateRefresh retains S2 fresh-only semantics, including
pending refusal and permission to persist valid expired access without another
rotation. recoverRefresh is an explicit bounded recovery/ensure-current-access
call, never a grant/token/key getter. No caller-selected body/key/token/sender,
public hooks, key lookup, automatic IO on import/open or resource capability.

Reuse S2 complete own-data entry/config/binding/signal capture before first await,
trusted capability receiver capture, byte copies, safe errors and exact expiry
validation. Transport origin must match captured owner origin. Config and nested
budgets/CA bytes cannot change through later caller mutation; unknown keys cannot
be lost. T05 bad config propagates its safe TransportError. Factory is read-only:
accept cleared empty/v1/v2 and reject corrupt/foreign/unsupported state unchanged.
No migration/key allocation/dispatch/cleanup on opening. Both version constants
remain 1/2; the strict S2 v2 record and predecessor equality remain unchanged.

Already-acquired exclusive T04 owner only. Invalidate any prior auth facade before
handoff; invalidate this one before external vault/generation changes or close.
Never close/reopen/reacquire implicitly. No account adoption, binding/generation
change or operation-store access. Operation-only commits remain compatible.

## Recovery transitions and bounded dispatch

1. Capture/validate identity and native signal, reject abort/fence/drift. No grant
   => authentication_required. Malformed caller => invalid_arguments; foreign
   valid binding or invalidated facade => operation_interrupted, without cancelling
   an otherwise valid active call. Actual owner/vault drift permanently fences.
2. If pending EXISTS, replay it explicitly even if the predecessor access OR refresh
   deadline has expired locally. Do not infer the successor deadline from predecessor
   lifetime: backend looks up accepted identical attempts before rejecting consumed
   input. The stored predecessor must still be structurally valid/lossless. Never
   select it as bearer authority, allocate another key, rewrite pending, or run a
   fresh prepare before replay settlement.
3. After owner/expected-vault, signal and fence rechecks, hand unchanged durable
   decoded body bytes and original auth UUID to internal T05 authRefresh. ONE control
   attempt, POST /v1/auth/refresh, keyKind auth, attempt1, exact durable body length.
   Hooks gate only this active durable attempt; each dispatch receives detached
   copies. No bearer, route/origin changes, sleeps or hidden retries. Replay itself
   needs NO prepare commit because its evidence is already durable.
4. Validate returned ServiceSession using S1/S2 rules: strict UTF-8/duplicate-free
   JSON, required fields, same account, original lossless expiry spellings and
   additive-field stripping. Invalid/legacy nonzero submillisecond precision or
   different account => invalid_grant. Returned refresh must be live at the actual
   pre-commit boundary (now >= expiry is expired); otherwise
   reauthentication_required. Retain pending unchanged on rejection.
5. Atomically commit v2 returned grant WITH pendingRefresh:null, binding unchanged;
   await durability before updating expected state or considering any distinct
   rotation. No separate evidence clear. Recheck owner/expected bytes, then serialize,
   check expiry and final abort/local fence AFTER clock callback returns, immediately
   before storage invocation with no intervening await/caller callback.
6. If recovered access is still live, finish after final identity/signal/fence and
   live-access/live-refresh checks. If access is expired, perform AT MOST ONE fresh
   S2-style rotation, using the recovered refresh token and a distinct new auth UUID.
   Durably prepare its own predecessor/body/key AFTER recovered installation and
   BEFORE dispatch. The old pending is never superseded by new pending before
   settlement. This explicit cycle has at most two control requests: original replay
   plus one distinct rotation. Each has T05 attempt1.
7. If NO pending at entry, a live access+refresh grant is a read-only successful
   no-op after owner/fence/expiry validation. Expired refresh =>
   reauthentication_required with no commit/key/dispatch. Expired access/current
   refresh permits the one fresh rotation above. This also covers restart/cancellation
   after recovered installation but before next prepare; recovery cannot depend on
   volatile memory remembering that gap. Empty/v1 no-op never migrates.
8. A fresh result with expired access but live refresh is still installed atomically
   under S2 rules, then recoverRefresh returns reauthentication_required instead of
   looping. Final expiry checks can also require reauthentication if clock advances;
   do not roll back an installed grant, invent expiry or allocate another key in
   this cycle. A later explicit invocation is distinct, not an autonomous retry.
   Terminal shared-cycle success must recheck cancellation/fence AFTER any trusted
   epoch-clock callback: leader abort during that callback yields the shared
   operation_interrupted outcome for nonaborted followers too. Already-installed
   grants remain installed; this is not a malicious-callback sandbox guarantee.

Concurrent valid recoverRefresh callers share ONE entire cycle, including its
optional fresh rotation. First caller owns cancellation; followers may abort their
own wait immediately without cancelling leader/network/commit. Nonaborted followers
receive the shared outcome and recheck their own binding/signal/fence before success.
Concurrent valid rotateRefresh callers share one fresh S2 attempt. A different-kind
call overlapping an active cycle rejects operation_interrupted without joining,
queuing another cycle, cancelling or permanently fencing the leader. This bounds
mixed-mode behavior until S4 settles resource orchestration. Foreign/malformed calls
never join a successful result or damage valid callers.

Every failed replay retains the ORIGINAL full pending evidence, including definite
401/409, 429, lost response, malformed response, account/precision rejection or
cancellation, unless its joint success commit already began/completed. Propagate
original safe T05 TransportError/StorageError; no deletion/settlement result.
An unsuccessful optional fresh attempt retains ITS newly durable evidence, with the
recovered grant as predecessor, not the already-settled old attempt. Before new
prepare begins, failure/cancellation retains the installed recovered grant and
pending-null. Pending is encrypted credential material, never operation evidence.

Use unchanged S2 error distinctions: lost connection => T05 network_error;
HTTP200 invalid JSON => T05 internal_error; valid JSON with invalid grant fields =>
SessionError invalid_grant. Cancellation/fence => operation_interrupted at the
observing Session/T05 boundary. idempotency_key_reused never proves settlement.
No auto-login, legacy supersession, repair, inferred deletion or another-key retry.

invalidate is synchronous/idempotent/permanent and cancels owned network work.
No IO/deletion. Before a storage commit begins, cancellation/fence prevents it;
once begun, await owned completion safely and suppress late success, no rollback.
Leader promise must not settle while its owned commit is unresolved. Storage failure
permanently fences facade and propagates original safe error, no reinitialization.
Settle promises/network/abort listeners on all outcomes; avoid hooks waiting on their
own active-cycle lock. Preserve inherited S2 post-clock cancellation safeguards.

## Ownership, environment and current grants

Developer edits src/auth/, docs/decisions/t06-implementation-adr.md and bounded auth
rows in docs/compatibility.md only. Private factoring is Developer's choice; preserve
accepted public behavior. No storage/HTTP/domain/root/config/manifest/lock/dependency
changes without Coordinator review. Read specs/production/nonsecret metadata;
NEVER QA sources/fixtures/private evidence/test diffs.

QA edits NEW s3-prefixed files in test/unit/t06/, test/fault/t06/ and
new docs/evidence/t06-s3-qa-*.md only. Reuse accepted QA helpers by reading them;
small new s3 helper allowed, no changes to accepted S1/S2 assertions/helpers absent
specific repair grant. Read common public specs/nonsecret package metadata and
public declarations after relay; NEVER production source/diffs/emitted JS/maps,
private ADR/production review/Developer reports. No config/scripts/dependency edits.

All commands use checked disposable T01_NODE_HOME supplied privately, with
PATH="$T01_NODE_HOME/bin:$PATH", Node24.21.0/npm11.19.0. No ambient/system fallback,
global install or personal facility. Fixtures need fresh sibling/disjoint HOME and
TMPDIR, fresh XDG/cache and cleared inherited Node/TLS/DBus trust/address overrides;
propagate cleanup errors. Isolated diagnostic storage and owned literal-loopback
TLS only, AFTER relay. No private/live state, actual product writes, .pi/settings
changes, staging/commits/publication or automatic successor/context renewal.

Developer EARLY/final: npm run typecheck, lint:production,
format:check:production, build; direct scoped ESLint/Prettier checks/fixes on owned
paths allowed. No QA suite or custom runtime/import diagnostic; no install needed
after checked baseline, request any install need. QA EARLY: scoped node --check,
ESLint/Prettier checks/fixes, static source-only import-resolution checks without
executing compiled target. No suite/target/provider/loopback execution/build/install
until explicit frozen relay. Sources readiness then HOLD for review.

## Proportional verification, deliverables and stop

QA chooses a SHORT risk/file checklist and minimal independent checks, not a broad
plan or generalized harness. Reuse T06/T04 diagnostic persistence and T05 TLS helpers.
Core risks:

- Real isolated close/reopen plus owned HTTPS exact replay after lost response;
  compare original durable token/body/key and received bytes, including expired
  predecessor but current returned refresh. No crash-kill campaign by default.
- Expired-access replay is durably installed BEFORE new prepare/dispatch; new request
  uses recovered token/distinct key. No-pending restart gap and at-most-one follow-on
  show no volatile recovery dependency or infinite rotation.
- Representative transport rejection/loss and invalid account/legacy precision
  retain evidence; one pending validation boundary reused from S2, not a duplicate
  full schema matrix. Pending never rekeys on repeated explicit replay.
- Shared concurrent cycle/follower cancellation and one meaningful commit/fence
  boundary prove no duplicate rotation or early leader/late success. Preserve opaque
  operation bytes. Source audit checks post-clock fences and privacy.
- Small isolated seven-export inert-import smoke plus coordinator source audit;
  not comprehensive interception, power-loss proof or OS sandbox claim.

At relay list exact new S3 owning suites, ALL accepted S1/S2 owning suites under
unit/fault t06, directly relevant unchanged T04 unit suites and T05 hooks suite
04-hooks-fences-dispatch.test.mjs. Final clean allowlisted locked-source reproduction:
npm ci --ignore-scripts, four production checks/build, exact owning/regression
selection, scoped QA quality, stable source hashes and identical compiled bytes.
Real Secret Service qualification is accepted prerequisite, not new S3 evidence;
full provider/transport/foundation/T03/integrated S4/S5 gates remain final T06 work.
No whole-repository pass or silent parked/deferred test exclusion.

Milestones: early role static checks; report concrete ambiguity/blocker; readiness
with changed paths/exact safe commands/results, then HOLD source/build. Coordinator
separately reviews production/QA, relays only specification-level findings, freezes
named hashes and opens exact QA execution. Readiness/source review is not acceptance.
No build/install races frozen target. Deliver concise ADR/compat update (Developer),
new independent tests/checklist/readiness/execution evidence (QA), work order/review/
relay/clean proof/disposition/handoff (Coordinator).

Send asynchronous questions/readiness to coordinator / w4:p2K. Target60–90min,
checkpoint90,stop120 with honest partial/blocked handoff and safe owned settlement.
Escalate ambiguity/dependency/accepted-module defect/unsafe fixture/scope growth;
hold affected work. No contract weakening or successor. Independent green frozen
acceptance closes S3 only; parent T06 incomplete and T07/T08 still blocked.
