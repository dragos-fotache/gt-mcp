# T06-S2 — Durable refresh rotation: decision-ready work order

**Status:** SOURCE WORK CLOSED / Developer and QA HELD after production c2 and
QA r3 source approval. Compiled-target/fixture/test execution requires the exact
named [t06-s2-f1 relay](../evidence/t06-s2-f1-coordinator-relay.md); no blanket run.
**Authority:** user instructed Coordinator to start T06-S2 only.
**Owners:** Coordinator; independent Developer and QA in the existing panes.
S1 remains accepted/closed; S3–S5 are unassigned. Parent T06 is incomplete.

## Outcome, authority and non-goals

Serialize a fresh dedicated-session rotation, persist its exact predecessor and
request identity before dispatch, then atomically install a validated same-account
grant together with clearing pending evidence. Preserve evidence on every other
outcome. This is an internal refresh-only capability, not production-ready refresh
until S3 recovery passes and not a completed authenticated server.

Normative, in order:

- Shared MCP draft0.2 [authentication](../../shared-docs/docs/mcp-contract/authentication.md#access-and-refresh).
- Backend v1 [authentication](../../shared-docs/docs/backend-contract/authentication.md),
  [wire types](../../shared-docs/docs/backend-contract/client-compatibility.md#wire-types-and-validation),
  OpenAPI RefreshCredential/ServiceSession and
  [legacy precision limitation](../../shared-docs/docs/backend-contract/issues/auth-expiry-precision.md).
- Accepted [T04 public API](../decisions/t04-approved-storage-spec.md#3-exact-public-production-api),
  [T05 public transport](../decisions/t05-approved-transport-spec.md),
  [S1 public contract](t06-s1-work-order.md) and [S1 handoff](../handoffs/t06-s1.md).
- Standing [proportional testing](../decisions/proportional-testing-policy.md) and
  [bounded independent coordination](../agent-coordination.md).

No restart replay, second-key uncertain retry, recovered-grant follow-on rotation,
resource 401 orchestration, sign-out/replacement/logout, initial login, browser,
CLI/MCP/config guard, operation-journal parsing, cleanup or real interoperability.
T02 stays parked; T13/T14 retired. Shared contracts/T04/T05 are unchanged.

## Settled additive public API

Keep all S1 exports/API/behavior, including SESSION_VAULT_VERSION=1 and its refusal
of version2, unchanged. Add only these runtime exports to dist/auth/index.js:
openRefreshSessionState and REFRESH_VAULT_VERSION=2. Imports remain inert.
No root/server/CLI/companion wiring. Reuse accepted public storage/HTTP types.

```ts
export interface RefreshSessionStateOptions {
  readonly profile: ProfileSession;
  readonly transportConfig: TrustedTransportConfig;
  readonly clock?: SessionClock;
}
export interface RefreshSessionState {
  readonly binding: StorageBinding;
  rotateRefresh(captured: CallBinding, signal: AbortSignal): Promise<void>;
  invalidate(): void;
}
export function openRefreshSessionState(
  options: RefreshSessionStateOptions,
): Promise<RefreshSessionState>;
export const REFRESH_VAULT_VERSION: 2;
```

No grant/token/key getter, caller-selected token/key/body, arbitrary sender, public
refresh hooks or auto-refresh on opening. S2 exposes no bearer selection/read
orchestration; S4 will settle its integration. The factory constructs an unchanged
T05 transport internally using its own private hooks. Config origin must normalize
to the owner's captured canonical origin; mismatch => SessionError invalid_arguments
before any mutation/network. Bad T05 config propagates its safe TransportError.
QA uses accepted literal-loopback fixture config/trust, not new production seams.
The complete config, including nested budgets and testCaPem byte contents, is
validated/captured before the first await; later caller mutation cannot alter
behavior. Unknown own keys must not disappear during capture (including special
property names). Invalid config with valid vault propagates safe T05 TransportError;
when both config and vault are invalid, no total cross-component error precedence
is prescribed. Unknown vault versions still precede version-specific validation.

Profile is already-acquired exclusive T04 ownership. Only one auth facade may use
its vault in an owner lifetime: invalidate any S1 facade before handing that owner
to S2; invalidate S2 before an external vault/generation change or close. Do not
close/reopen/reacquire inside S2. Operation-only T04 commits remain compatible;
S2 must not read, parse or modify operations. Rotation does not change any binding
field, advance generation, bind another account or revoke another session.

Apply S1 entry capture/own-data validation, capability receiver capture, byte-copy,
exact expiry/opaque-token/error privacy and permanent invalidation rules. Capture
options/config/binding/signal before yielding; no accessor/coercion or mutation of
caller objects. SessionClock is the same trusted epoch clock (Date.now default),
not T05's monotonic deadline clock. No dependencies or new auth byte/depth caps.
Invalid arguments => invalid_arguments; invalid current binding or an invalidated
facade => operation_interrupted. Reject malformed/foreign invocations without
cancelling or permanently fencing an otherwise valid shared attempt; actual owner/
vault drift still permanently fences the facade. Native AbortSignal required.
Errors use existing safe SessionError, StorageError or TransportError; no raw
exception/data leakage.

## Private version2 record and migration

T04 owns encryption/atomicity. Plaintext is strict UTF-8 duplicate-key-free JSON:

```text
{ version: 2, binding: <all four StorageBinding fields>,
  grant: null | <S1 stored grant>,
  pendingRefresh: null | {
    predecessor: <S1 stored grant>,
    refreshToken: <same opaque token as predecessor.refreshToken>,
    bodyBase64: <canonical padded RFC4648 base64 of exact request UTF-8 bytes>,
    authKey: <canonical lowercase UUID>
  }
}
```

S1 stored grant has exactly accountUuid, accessToken, accessExpiresAt, refreshToken,
refreshExpiresAt. Preserve original valid expiry strings exactly; no inferred
lifetimes or persisted rounded/recomputed expiry strings. All record objects have
exact fields. Binding equals the owner's four-field capture; nonnull grants match
the bound nonnull account. Pending is allowed only with a grant and its predecessor
must equal that grant field-for-field, including original expiry spellings.

Prepare request bytes ONCE as UTF-8 JSON.stringify({refreshToken: heldToken}), with
that single property, no whitespace/BOM. Persist these exact bytes as bodyBase64,
not a reconstructed object. Pending validation requires canonical base64, strict
UTF-8/single-field JSON and byte equality to this settled serialization for its
stored token. No lossy decoding or token normalization. Generate one auth UUID
with node:crypto randomUUID per newly prepared attempt. Resource/auth namespaces
remain separate by route, not by an invented UUID prefix.

Opening accepts zero-length cleared vault, validated S1 version1, or version2.
It NEVER writes/migrates on opening, generates a key, dispatches, or treats pending
as settled. Only fresh-rotation preparation explicitly upgrades version1 to version2
in the same atomic commit that installs pending evidence. Version1 null/zero-length
stays untouched until authorized work; no grant => authentication_required on
rotation. Unknown integer versions => state_version_unsupported before version-
specific validation; malformed state/binding/fields => state_corrupt. Preserve
all bytes on rejected open. S1 opener continues refusing version2 without erasure.

A valid existing pending record opens as blocked recovery state. Any rotateRefresh
call on it => reauthentication_required with NO key allocation, commit or dispatch.
Same-facade repeat after an unsuccessful prepared attempt has the same rule. S3
owns exact replay; S2 must never silently clear, rekey, supersede or replay pending.
This temporary refusal is an explicit partial-capability boundary, not recovery.

## Rotation, hooks and durable transitions

1. Validate/capture caller identity and abort at entry. Require current bound grant,
   no pending and live refresh expiry (equality now >= expiry is expired). Expired
   refresh => reauthentication_required, no write/dispatch. Expired access alone
   permits rotation. Revalidate owner and unchanged captured vault after awaits.
2. Serialize fresh rotations within this facade and exclusive T04 owner. Overlapping
   valid calls share ONE prepared attempt, key, network call and commit, not a
   queued second rotation using its successor. After settled success, a later
   explicit nonoverlapping call may start a distinct rotation. This is not an
   autonomous loop. Invalid/foreign calls must not join a successful shared result.
3. Immediately before prepare commit, recheck abort/local fence, unchanged owner
   and live predecessor refresh expiry. Persist full version2 predecessor/token/
   body/key through T04 commit({vaultBytes}) and await durability BEFORE T05 handoff.
   The immediate expiry/abort/fence check occurs after any awaited owner validation
   and synchronous record serialization, directly before the commit invocation.
   Recheck abort/local fence AFTER the trusted clock callback returns too; a
   callback that synchronously cancels/invalidates cannot permit the commit.
   Do not commit operationBytes. Recheck cancellation/fences after owned commit;
   a cancelled preparation retains any durable pending record but never dispatches.
4. Call internal T05 authRefresh with captured binding, detached copies of the
   DURABLE stored body and auth key. Exactly one T05 control attempt; no sleeps,
   auto retry, 401 retry or response-driven route/origin change. Controls need no
   access bearer. Pre-send/pre-delivery hooks validate current four-field identity,
   exclusive owner, expected vault bytes and local fence. beforeDispatch permits
   ONLY auth_refresh, POST /v1/auth/refresh, keyKind auth, attempt1 and exact persisted
   body length while this facade's prepared rotation is active. Reject every other
   route. Synchronous isCurrent supplies T05's final fence guard. Hooks must remain
   callable during the rotation: no holding a queue lock while awaiting T05 hooks
   on that same queue (Developer chooses private synchronization structure).
5. Validate the returned private ServiceSession using S1 exact validation, including
   lossless expiries, duplicate-key rejection and additive-field stripping. Require
   the SAME account UUID; mismatch => invalid_grant, never account adoption. Valid
   expired access may be persisted without follow-on rotation. Returned refresh
   must be live at immediate pre-commit recheck; expired => reauthentication_required,
   retaining pending unchanged. Invalid/legacy nonzero submillisecond expiry =>
   invalid_grant; never round or retry another key.
6. Recheck current owner/expected pending bytes, signal and invalidation before
   committing. One atomic T04 commit writes version2 with the returned grant and
   pendingRefresh:null. Clearing evidence MUST NOT precede durable grant installation;
   an atomic joint update satisfies this requirement. After successful commit,
   update expected in-memory vault snapshot and grant; binding remains unchanged.
   Recheck returned refresh expiry after owner-validation awaits and synchronous
   serialization directly before invoking this commit, not only before those steps.
   Final abort/local-fence checks follow the trusted clock callback, with no further
   caller callback or await before the storage invocation.
   Return void only after final caller/fence checks. No credentials in success.

Any transport error (including definite 401/409/429), bad response, cancellation or
invalidation after prepare leaves exact pending/predecessor evidence intact unless
the atomic success commit has already begun/completed. Propagate T05 failures as
their original safe TransportError, not an invented SessionError, deletion or
settlement result. In an otherwise valid, unaborted attempt, lost connection =>
TransportError network_error; HTTP200 with invalid JSON => TransportError
internal_error. Both are dispatched, attempts1, outcomeUnknown=true. A valid JSON
object whose ServiceSession fields are invalid instead reaches S2 grant validation
=> SessionError invalid_grant. Cancellation/invalidation => operation_interrupted
(SessionError or T05 TransportError according to the boundary that observes it);
no unrelated error code satisfies cancellation. In particular idempotency_key_reused
never proves settlement. No selection of a predecessor or further network dispatch
while pending remains. A T04 failure permanently fences this facade, propagates
its original safe StorageError and never cleans/reinitializes uncertain state.

The first valid rotation caller owns attempt cancellation. Concurrent followers
may abort their own waits (operation_interrupted) without cancelling/rekeying the
leader's shared attempt. A leader abort cancels T05; all nonaborted followers get
the shared failed outcome. Each follower rechecks its captured identity/fence and
own signal before success; a cancelled follower never gets late success. Settle all
owned promises and cleanup listeners on every outcome; no unhandled late work.

invalidate is synchronous/idempotent/permanent and cancels owned network work;
no sign-out, IO or local deletion. Cancellation/invalidation before final commit
prevents installation. Once any storage commit begins, await its owned completion
safely (cannot retract it); suppress late success if invalidated/aborted during it.
A completed success commit stays installed, a completed prepare stays pending;
no rollback. The leader's rotateRefresh promise must not settle on cancellation
while its owned storage commit remains unresolved: await owned completion and then
report interruption. Followers may still abort their own waits immediately without
owning/cancelling that storage work. Stop requires safe settlement, not force-killing
a durability action.

## Ownership, environment and execution grants

Developer edits src/auth/, docs/decisions/t06-implementation-adr.md and bounded
auth rows in docs/compatibility.md only. Accepted S1 observable behavior is preserved;
no storage/HTTP/domain/root edits, dependencies/config/manifests/lock/compiler
changes without Coordinator review. Read public specs, production and nonsecret
metadata only; NEVER QA sources/fixtures/private evidence/test diffs.

QA edits new S2 files under test/unit/t06/ and test/fault/t06/ (use s2-prefixed names)
and docs/evidence/t06-s2-qa-*.md only. Reuse existing QA helpers/fixtures by reading
them; do not edit accepted S1 assertions without a specific repair grant. Reads
common public specs, nonsecret package metadata and public declarations after
relay; NEVER production source/diffs/emitted JS/maps/private ADR/Developer reports.
No dependency/script/config changes. Small fixture additions stay in QA scope.

Use provisioned disposable T01_NODE_HOME, PATH="$T01_NODE_HOME/bin:$PATH";
Node24.21.0/npm11.19.0. Coordinator supplies the checked nonrepo toolchain location
in prompts. No system-runtime/personal-keyring fallback. Isolated fixtures use
fresh sibling/disjoint HOME and TMPDIR, fresh XDG roots; propagate cleanup errors.

Developer: EARLY/final npm run typecheck, lint:production, format:check:production,
build; direct scoped ESLint/Prettier checks/fixes on owned paths allowed. No QA
suite, custom runtime diagnostics or install needed after baseline; request any
install need. QA: EARLY scoped node --check, ESLint/Prettier checks/fixes and
source-only import-resolution checks that do not import compiled target JS. No
suite/target/provider/loopback execution until named relay; no build/install.
No .pi/settings edits, real credentials/live backend/browser/Android, actual
product writes, staging/commits/publication or automatic successor/context renewal.

## Proportional acceptance, deliverables and stop

QA chooses a SHORT risk/file checklist and minimal independent checks, not a broad
plan or generalized harness. Core risks/meaningful layers:

- Strict version2/predecessor/body/key validation; version1 read-only open and
  write-on-prepare migration; no rounding at expiry equality/legacy precision.
  Small public-state validation table, not a rerun of every S1/T03 validation case.
- Real isolated T04 diagnostic persistence + actual loopback HTTPS via T05:
  observe durable predecessor/body/key BEFORE server receives the single request;
  concurrent calls share identity; same-account success commits grant/pending-null
  and leaves operation bytes identical. Close/reopen checks stored state, NOT replay.
- Representative preparation failure => no dispatch; lost/malformed/mismatched
  response => exact pending retained; subsequent/reopened call makes no new key/
  dispatch. One targeted commit failure and cancellation/invalidation boundary
  catch irreversible-write/late-success risks. No crash-kill or exhaustive fault
  cross-product campaign in S2; exact restart recovery belongs to S3.
- Coordinator production privacy/source audit plus small isolated import smoke;
  not a comprehensive IO interceptor or OS sandbox claim.

Reuse QA T04 diagnostic and T06/T05 TLS helpers; no real provider implementation
change. Real T04 Secret Service qualification remains accepted prerequisite,
not new S2 evidence. At frozen relay record exact S2 files/commands plus existing
S1 owning tests and directly relevant unchanged T04 unit/T05 hook regressions.
Preserve all historical/deferred/parked suites; scoped passes are not whole-suite
passes. Final S2 clean allowlisted locked-source reproduction includes npm ci
--ignore-scripts, production checks/build, selected acceptance and emitted-byte
comparison. Parent T06 still needs full active owning/relevant unchanged integration
and provider regressions, integrated S3–S5 recovery/lifecycle races and clean proof.

Milestones: both agents run early role-scoped static checks; report readiness,
changed paths, exact safe commands/results and blockers, then HOLD owned source/
build actions. Coordinator separately reviews production and QA sources, settles
spec-level defects without cross-role leaks, freezes a named hash inventory and
opens exact QA execution. Readiness is NOT acceptance. No build races frozen QA.

Send asynchronous concise milestone/questions to coordinator / w4:p2K. Target
60–90min; checkpoint90, stop120 with honest partial/blocked handoff and settled
owned work. Escalate concrete contract ambiguity, dependency need, accepted-module
defect, fixture safety or scope growth; hold affected work rather than guessing.
Independent green frozen acceptance alone closes S2; no S3 grant or parent/release
completion follows. User authorization starts S2, not the remaining matrix.
