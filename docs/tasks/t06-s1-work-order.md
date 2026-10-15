# T06-S1 — Session state and fences: decision-ready work order

**Status:** OPEN for bounded production implementation and independent QA source
preparation. Compiled-target/test execution is CLOSED until a named frozen relay.
**Authority:** user instructed Coordinator to start T06-S1. No S2 successor grant.
**Owners:** Coordinator; fresh independent Developer and QA in the existing panes.

## Outcome and authority

Implement the private session-vault reader, initial service-grant installation,
exact expiry decisions and T05-compatible captured-identity hooks. This is an
internal partial capability, not safely completed T06 or an authenticated MCP server.

Normative references, in order:

- Shared MCP draft0.2 [authentication](../../shared-docs/docs/mcp-contract/authentication.md).
- Backend v1 [authentication](../../shared-docs/docs/backend-contract/authentication.md),
  [wire compatibility](../../shared-docs/docs/backend-contract/client-compatibility.md#wire-types-and-validation),
  OpenAPI `ServiceSession`, and [legacy precision limitation](../../shared-docs/docs/backend-contract/issues/auth-expiry-precision.md).
- Accepted [T04 API and binding rules](../decisions/t04-approved-storage-spec.md#3-exact-public-production-api),
  [T04 handoff](t04-private-storage.md#accepted-handoff),
  [T05 API/hook rules](../decisions/t05-approved-transport-spec.md),
  [T05 handoff](t05-backend-transport.md#handoff).
- [Proportional testing](../decisions/proportional-testing-policy.md) and
  [bounded independent coordination](../agent-coordination.md).

Shared contracts and accepted T04/T05 implementations are unchanged. T02 stays
parked, T13/T14 retired; actual product writes stay disabled.

## Public entry and API

New entry `src/auth/index.ts` -> `dist/auth/index.js` and declarations. Imports
perform no IO, network, logging, timers, processes or global-handler installation.
Exact runtime exports: `openSessionState`, `SessionError`, `isSessionError`,
`SESSION_VAULT_VERSION` (literal `1`). Existing root/foundation exports and inert
CLI/server/companion entries remain unchanged. Reuse T04/T05 exported types:

```ts
export interface SessionClock { nowMs(): number; }
export interface SessionStateOptions {
  readonly profile: ProfileSession;
  readonly clock?: SessionClock;
}
export interface SessionState {
  readonly binding: StorageBinding;
  readonly hooks: SessionHooks;
  installInitialGrant(
    captured: CallBinding,
    serviceGrantBytes: Uint8Array,
    signal: AbortSignal,
  ): Promise<StorageBinding>;
  invalidate(): void;
}
export type SessionErrorCode =
  | "invalid_arguments" | "invalid_grant" | "state_corrupt"
  | "state_version_unsupported" | "authentication_required"
  | "reauthentication_required" | "operation_interrupted";
export class SessionError extends Error {
  constructor(code: SessionErrorCode);
  readonly code: SessionErrorCode;
}
export function isSessionError(value: unknown): value is SessionError;
export function openSessionState(options: SessionStateOptions): Promise<SessionState>;
export const SESSION_VAULT_VERSION: 1;
```

`profile` is an already-acquired exclusive T04 owner, never profile provisioning,
ambient key discovery or an alternative credential source. Trusted composition
passes the actual T04 owner (or its isolated diagnostic counterpart for QA).
No model-facing factory/options or provider/key bypass. The facade does not close,
reopen or reacquire its caller-owned profile. Capture method receivers and option
values at entry; do not mutate/freeze caller-owned objects. Serialize facade async
operations; copy byte arguments and capture bindings before yielding. Hook
binding and summary checks must use their detached entry captures after queuing,
not reread mutable caller objects. No new auth-specific byte/depth caps are
approved: T04/T05 retain their documented storage/transport size budgets.

Clock defaults to `Date.now()` (epoch milliseconds, unlike T05's monotonic budget
clock). Require a finite safe integer in the backend supported epoch range on
use; invalid clock fails safely with invalid_arguments, no credential selection
or mutation. Clock changes do not extend stored deadlines. AbortSignal is required
on public async methods/hooks; abort means operation_interrupted.

Arguments/bindings are own-data shapes with no coercion, unknown option fields or
accessor invocation. UUID/origin/generation validation follows accepted T04 rules.
Private capabilities/functions use their documented methods/getters; the T04
binding getter is supported, including when it is an own getter. SessionClock may
use an own or prototype nowMs method with its receiver preserved; it is a trusted
capability, not restricted to object-literal prototypes. Reject shared/detached byte backing. Caller-owned
bytes returned to trusted transport are detached copies where applicable.

## Vault version and grant validation

T04 remains the encryption/atomicity owner. The S1 plaintext *inside* the encrypted
vault is UTF-8 duplicate-key-free JSON with exactly:

```text
{ version: 1, binding: <all four StorageBinding fields>, grant: null | {
    accountUuid: <canonical lowercase UUID>,
    accessToken: <opaque nonempty bearer-compatible string>,
    accessExpiresAt: <original valid UTC timestamp string>,
    refreshToken: <opaque nonempty string>,
    refreshExpiresAt: <original valid UTC timestamp string>
} }
```

This is private storage, never wire JSON/model output. Extra/missing fields,
malformed UTF-8/JSON, duplicate keys or malformed nested state => state_corrupt.
A syntactically valid object with an unsupported integer version =>
state_version_unsupported before enforcing version1-specific fields; future
versions may have additional fields. Do not rewrite or migrate it in S1. Binding must match
ALL four T04 fields; grant account must match a nonnull bound account. An unbound
profile cannot contain a grant. No startup mutation or repair.

Zero-length T04 vault is the accepted uninitialized/cleared state: no credentials,
for either a pre-auth profile or a bound signed-out profile. Opening does not
persist an invented record. A valid version1 null-grant record also has no usable
credentials. Nonempty unknown state is never interpreted as signed out/empty.

`installInitialGrant` consumes the complete private UTF-8 service response body,
only supplied by a trusted caller after successful T05 same-origin auth exchange.
`captured` must equal the invocation's pre-auth binding. This capability does not
prove Google identity itself; HTTP status/object shape alone are not authority.
No synthetic grant minting, token CLI arguments, token decoding or email identity.
The future T07 trusted foreground helper owns exchange provenance. S1 QA uses
visibly synthetic isolated grants only.

Validate backend `ServiceSession`: required `account.id`, accessToken,
accessExpiresAt, refreshToken, refreshExpiresAt. Nullable/optional displayName must
be a string/null when present; additive response fields are tolerated but dropped.
Reject duplicate keys anywhere and invalid UTF-8, tokens or account/expiries as
invalid_grant. Bearer token must meet T05 header-safe token requirements; refresh
token is an opaque nonempty string. Treat it as data: do not decode/interpret a
JWT-like representation or derive identity from its spelling. Opaque does NOT
mean rejecting dots, NUL represented inside valid JSON, account-shaped strings,
or equality with another field; the backend does not specify that token grammar.
Only the access token has T05's header-safety constraint.

Expiries must be real RFC3339 UTC calendar instants losslessly representable within
-62167219200000..253402300799999 epoch milliseconds. Accepted T03 timestamp
semantics apply (T/t, Z/z or +00:00; no -00:00, nonzero offset or leap second).
Extra fractional digits are accepted ONLY when all digits after the third are
zero. Preserve the exact original valid strings; derive exact epoch milliseconds
for comparisons without rounding. Do not infer issuance or replace service values
with local 15-minute/30-day deadlines. No extra expiry-order/lifetime restrictions
beyond the shared contract. Expired access can be stored; never select it. An
initial grant with expired refresh is rejected reauthentication_required, with
no vault/binding mutation. Recheck this at the immediate pre-commit boundary after
owner-validation awaits; a formerly-live deadline must not bypass rejection by
expiring while queued. Equality `now >= expiry` is expired.

Initial installation is allowed ONLY for accountUuid=null with no existing grant.
An already-bound profile (even signed out or the same UUID) is not replaceable in
S1: operation_interrupted, no persistence. Same-account replacement belongs to S5.
After validation, fence this facade synchronously before the storage transition;
call T04 `bindAccount(accountUuid, replacementVaultBytes)` once with version1
state bound to returned account, sessionGeneration1 and unchanged origin/profile
UUID. T04 atomically installs vault and generation. Preserve operation store
bytes exactly; never read/parse/rewrite operations to install credentials.

Success returns the new binding ONLY. Old facade stays permanently fenced, as
required by T04 stale-handle semantics. Trusted caller closes the old profile and
explicitly opens its returned binding before `openSessionState` again. No hidden
close/open or auto retry. A storage failure propagates the original safe T04
StorageError, leaves facade fenced and never deletes/reinitializes private state.
Cancellation before commit prevents it; once storage commit begins it cannot be
retracted. If cancellation arrives during commit, finish handling the owned
storage operation safely but suppress success (operation_interrupted), keeping
facade fenced and durable state for explicit trusted reopen. Explicit
`invalidate()` during an unresolved initial commit has the same success-suppression
semantics as signal cancellation, without rollback or deletion. Transition fencing
itself is not explicit cancellation. No late background installation or success
delivery.

## Hooks and fences

Facade binding is a frozen detached capture. `invalidate()` is synchronous,
idempotent and permanent for that facade, and performs NO IO or credential
clearing. It is the S1 local cancellation fence, not implemented sign-out/logout.
Trusted composition must invalidate BEFORE any external vault/generation change
or owner close; only this facade may install credentials in its owner lifetime.
Do not share its raw owner for concurrent credential mutation. T09 may later
commit operation-only bytes without changing the vault.

- `isCurrent(binding)` returns a synchronous literal boolean, no IO/Promise.
  True only while not invalidated and ALL four binding fields equal the capture.
  Malformed/foreign binding returns false without invoking accessors.
- `checkBinding(point,binding,signal)` rejects aborted/stale/foreign captures with
  operation_interrupted. Read the owner's vault to establish owner validity and
  unchanged captured vault; recheck local fence and signal after awaits. Changed
  bytes/owner errors fail closed and permanently fence, never update the in-memory
  grant from an unexpected external write. Valid points are pre-send/pre-delivery.
  Preserve safe T04 errors when called directly; T05 maps hook failures according
  to its accepted contract. No response delivery after invalidation.
- `selectCredential(binding,route,signal)` validates the current capture/owner
  and then checks current exact expiries. No grant => null. Expired refresh =>
  null; expired access => null (S1 has NO refresh). Valid grant => detached frozen
  `{bearerToken,forBinding}` with the same four fields. No refreshed/new-account
  material, no interactive action. All six read routes may select a valid bearer;
  mutation routes return null in S1 (writes remain unavailable).
- `beforeDispatch(binding,summary,signal)` checks the fence/owner again. S1 admits
  only the six read labels and auth_challenge/auth_exchange. Reject mutation,
  auth_refresh, auth_logout and account_status labels operation_interrupted:
  those require later durable admission/refresh/lifecycle owners. It writes no
  dispatch evidence. Validate the T05 DispatchSummary shape and route/method/
  keyKind consistency, without copying target or identity into diagnostics.

T05 already supplies per-attempt pre-send, post-await synchronous guard and
pre-delivery fences. Reuse it unchanged. No automatic HTTP is started by S1;
explicit isolated integration uses real T05 routes/hooks and response suppression.

## Parent T06 transition agreement / deferred functionality

Version1 is S1 settled grant/no-grant storage ONLY. S2 must publish a new reviewed
vault version before adding durable refresh evidence; it may explicitly migrate
validated version1 state, never silently reinterpret unknown records. S1 refuses
future versions without erasing bytes. S2/S3 must jointly implement:

```text
current grant -> durable exact predecessor grant/token/body/auth key
             -> one dispatch under exclusive owner
             -> atomic same-account returned grant, then cleared pending evidence
uncertain -> same predecessor/body/key replay, never another-key rotation
recovered expired access/current refresh -> persist original recovered grant
                                        -> distinct serialized new rotation
invalid legacy replay -> retain exact evidence, fail closed, no rounding/rekey
```

S4 owns one refresh-and-retry per resource invocation with unchanged request
identity. S5 owns fence-first sign-out, same-origin/account replacement and
permanently fenced retained predecessor evidence. No cleanup of uncertain evidence,
account switching or lifecycle deletion in S1. Before those later slices start,
Coordinator settles their exact additional API/record format in their own bounded
orders. No S1 acceptance implies refresh, lifecycle or race closure of all T06.

## Ownership and permitted commands

Developer edits only new `src/auth/`, `docs/decisions/t06-implementation-adr.md`
and bounded auth rows in `docs/compatibility.md`. Read production, public
specs/handoffs and nonsecret metadata only; no QA sources/fixtures/evidence/diffs.
No accepted module/config/manifest/lockfile/dependency/compiler changes without
Coordinator review. Private implementation structure is Developer's choice.

Developer checks: pinned `npm run typecheck`, `npm run lint:production`,
`npm run format:check:production`, `npm run build`; direct scoped ESLint/Prettier
checks/fixes on owned paths allowed. No QA suites or custom runtime diagnostics.
No install needed after Coordinator baseline; request install changes if needed.

QA edits only new `test/unit/t06/`, `test/fault/t06/` and `docs/evidence/t06-qa-*.md`.
Reads common public specification plus accepted public specs/types and package/
build metadata; no production source/diff/emitted JS/maps/private ADR or Developer
messages. Public `.d.ts` allowed after relay. QA may read/reuse its own established
helpers and synthetic fixtures. Early scoped `node --check`, ESLint and Prettier
checks/fixes on those QA-owned paths allowed, plus source-only import resolution
without importing target JS. No target/test/provider/HTTP execution until relay;
no config/manifest edits, builds/installs or broad test campaign.

Every command uses supplied `T01_NODE_HOME` and
`PATH="$T01_NODE_HOME/bin:$PATH"`, Node24.21.0/npm11.19.0. Never system runtime,
real/personal keyring, live backend/browser/Android, real secrets or .pi edits.
No staging/commits, release, package publishing or actual product writes.

## Proportional acceptance and milestones

1. Small spec-derived validation table: required account/grant fields, exact
   accepted expiry vs nonzero submillisecond rejection, expiry equality, unknown/
   corrupt/binding-mismatched vault and immutable capture. Name each distinct risk.
2. Real isolated T04 diagnostic storage facility: initial install/close/reopen,
   exact expiry strings, account/generation binding and operation bytes unchanged;
   one representative commit-failure fence. This proves auth/persistence integration,
   NOT new production Secret Service qualification. T04 real-provider acceptance
   remains a prerequisite; no provider implementation changes in S1.
3. Real isolated local HTTP through unchanged T05: valid bearer read; invalidate
   after dispatch before response, suppress delivery; invalid/expired binding
   prevents dispatch. Synthetic data only; no creation. Reuse small accepted QA
   fixtures, no general interceptor/proxy/fault cross-product framework.
4. Coordinator source audit plus small black-box import smoke for privacy/inertness,
   no claim of exhaustive runtime interception or OS isolation.

QA prepares a concise risk checklist/test-file inventory, not an elaborate plan.
Both agents run role-scoped static checks EARLY. Report readiness then HOLD all
owned source/build actions. Coordinator separately reviews production and QA
sources and freezes a named hash inventory before a QA execution relay. Exact
active S1 commands/file list are recorded at relay, no `npm test/check` broad run.
Final S1 candidate: all S1 owning tests plus unchanged foundation/T03/T04 unit
regressions and only directly relevant T05 hook/fence regressions selected at relay.
Final parent T06 still requires all active T06 and relevant full T04/T05 integration
regressions and clean locked reproduction; not repeated at every S1 edit.

Coordinator performs a clean allowlisted locked S1 source reproduction with
`npm ci --ignore-scripts`, production checks/build and S1 owning acceptance; compare
emitted bytes to the frozen candidate. No omitted failing/required check, skip as
pass or whole-repository green claim. If isolated provisioning is unavailable,
hold affected execution; never substitute live/personal state.

Send asynchronous milestones/questions/readiness to `coordinator` / `w4:p2K`.
Target 60–90 minutes; checkpoint at90, stop by120 with an honest partial/blocked
handoff and safe owned-work cleanup. No automatic S2 or agent/context renewal.
Escalate specific contract/API ambiguity, dependency need, accepted-module defect,
unsafe fixture or scope growth; hold affected work. Slice is done only after
independent frozen acceptance; T06 remains in progress until integrated acceptance.
