# T06 session implementation ADR — S1 session state and fences; S2 durable refresh rotation

**Status:** bounded S1 (§§1–7) plus S2 (§8) implementation record, written
against the decision-ready S1 work order
(`docs/tasks/t06-s1-work-order.md`) and S2 work order
(`docs/tasks/t06-s2-work-order.md`) and only role-permitted normative
references: shared MCP draft 0.2 authentication, backend v1
authentication / client-compatibility wire rules / OpenAPI `ServiceSession`
/ legacy precision note, accepted T04 storage spec + handoff, accepted T05
transport spec + handoff, accepted S1 work order + handoff. This ADR is
Developer-owned implementation history, not cross-role evidence and not a
conformance, interoperability, or release claim. No QA sources were read.
No recovery, retry, lifecycle, browser, MCP/CLI, write, or successor-slice
behavior beyond the S2 refresh-only rotation is implemented or claimed
here.

## 1. Scope and authority

Only `src/auth/` was created, plus this ADR and bounded prose notes in
`docs/compatibility.md`. No accepted module, config, manifest, lockfile,
dependency, or compiler change was made; no new dependency was added.
Runtime imports are Node builtins (`node:url`, globals `TextEncoder` /
`TextDecoder`) plus **type-only** reuse of the T04 (`ProfileSession`,
`StorageBinding`) and T05 (`CallBinding`, `SessionHooks`,
`DispatchSummary`, `BearerRouteName`, `CredentialMaterial`) public
entries, which erase at compile time. The public entry performs no IO,
network, logging, timers, processes, or global-handler installation.

## 2. Module layout (`src/auth/` -> `dist/auth/`)

| Source        | Responsibility                                                                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`    | Sole public entry. Exact runtime exports (`openSessionState`, `SessionError`, `isSessionError`, `SESSION_VAULT_VERSION`) and the work-order public types.        |
| `errors.ts`   | `SessionErrorCode` (7 codes), `SessionError` with fixed generic message, fixed stack, runtime-immutable code, brand-based `isSessionError`.                      |
| `validate.ts` | Own-data shape capture, UUID/origin/generation/binding checks, signal/clock gates, byte-view copies, header-safe/opaque token rules, strict duplicate-free JSON. |
| `vault.ts`    | Version-1 private record decode/encode and service-grant response parsing with exact-string expiry preservation.                                                 |
| `session.ts`  | Facade: serialized async operations, pre-auth capture, vault snapshot, exact-expiry decisions, single `bindAccount` install, fences, and T05-compatible hooks.   |

Internal modules are not public API; only `dist/auth/index.js` (+ `.d.ts`)
is the supported import surface.

## 3. Decisions and rationale

- **Inert entry:** `src/auth/index.ts` only defines and re-exports. All
  validation/copying happens inside method bodies. No top-level IO, timers,
  listeners, or environment reads exist in any auth module.
- **Trusted capabilities:** the T04 owner binding is read through its
  documented shape, including when it is an own getter on the trusted
  profile (invoked once at entry with the owner as receiver). SessionClock
  `nowMs` may be an own function property or a prototype method with its
  receiver preserved. Ordinary data arguments and bindings still reject
  accessor invocation; these capability paths are the only exception, as
  settled in the work order.
- **Type-only T04/T05 reuse:** `import type` references to the accepted
  public entries are erased at emit, so no runtime coupling to storage or
  transport behavior is introduced. All owner interaction goes through the
  caller-supplied profile capability captured at `openSessionState` entry
  (bound `readVaultBytes` / `bindAccount` receivers plus a frozen binding
  snapshot). Later external replacement of those properties cannot change
  facade behavior. The facade never closes, reopens, or reacquires the
  caller-owned profile.
- **Capture before yielding:** every async method validates its arguments,
  copies byte inputs, and snapshots bindings synchronously at entry. Hook
  binding and dispatch-summary decisions after queuing use only those
  detached entry snapshots, never reread mutable caller objects. The
  per-facade promise queue then serializes the remaining work; prior
  rejections never break the chain. Returned bindings, credential material,
  and byte snapshots are frozen detached copies. Caller-owned objects are
  never mutated or frozen. No auth-specific byte/depth caps are imposed;
  T04/T05 retain their documented storage/transport size budgets.
- **Vault shape:** inside the T04-encrypted vault, S1 plaintext is UTF-8
  `{version: 1, binding, grant}` with fixed key order on encode and
  exactly the four binding fields plus the five grant fields on decode.
  Zero-length vault bytes are the accepted uninitialized/cleared state and
  decode to a null grant with no persistence side effect. Any other
  malformed, extra/missing-field, binding-mismatched, or
  grant-account-mismatched content fails `state_corrupt`. The version is
  decided before any version1-specific shape check: a syntactically valid
  object carrying an unsupported integer version (future versions may add
  fields) fails `state_version_unsupported` without rewrite or migration.
  Stored-grant
  validation (tokens, expiries, opaque-refresh rule) matches install-time
  validation so a persisted record can never be more permissive than the
  response it came from.
- **Service response:** additive top-level/account fields are tolerated but
  dropped; `displayName`, when present, must be string/null. Duplicate keys
  anywhere, invalid UTF-8/BOM, bad account/tokens/expiries fail
  `invalid_grant`. Bearer tokens follow the accepted T05 header-safe rule;
  refresh tokens are opaque nonempty strings treated as data: no
  decoding, no JWT-spelling rejection, no identity derivation (see §4).
- **Exact expiries:** accepted T03 calendar semantics are re-implemented
  locally (T/t, Z/z or `+00:00`; no `-00:00`, nonzero offsets, or leap
  seconds; fractional digits beyond the third accepted only when all zero;
  backend epoch range `-62167219200000..253402300799999`). Original strings
  are preserved verbatim; exact epoch milliseconds are derived without
  rounding for `now >= expiry` comparisons. No issuance inference and no
  local 15-minute/30-day substitution occur. Expired access may be stored
  but is never selected; an initial grant with expired refresh fails
  `reauthentication_required` with no vault/binding mutation.
- **Install discipline:** installation is allowed only for a null-account,
  null-grant facade whose `captured` argument equals the invocation's
  pre-auth binding. Already-bound profiles (even signed out or the same
  UUID) fail `operation_interrupted` with no persistence. After validation
  the facade fences synchronously with no intervening await, then calls
  T04 `bindAccount` exactly once with a generation-1 record; operation
  bytes are never read, parsed, or rewritten. Success returns the new
  binding only and leaves the old facade permanently fenced. Storage
  failures propagate the original safe T04 error with the facade fenced
  and no deletion or reinitialization. Refresh expiry is rechecked with a
  fresh clock read immediately before the transition, after the
  owner-validation awaits. Abort before commit prevents the
  commit; abort during commit is awaited to completion and then reported
  as `operation_interrupted` with success suppressed and durable state
  left for explicit trusted reopen. An explicit `invalidate()` during an
  unresolved commit suppresses the handoff identically (fence epoch
  distinguishes it from the internal transition fence, which alone
  permits ordinary success).
- **Fences:** `invalidate()` is a synchronous idempotent permanent local
  fence with no IO. `isCurrent` is a synchronous literal boolean with no
  accessor invocation (false on any malformed/foreign input). The async
  hooks re-establish owner validity and unchanged captured vault bytes on
  every call, recheck fence and abort after awaits, fail closed with a
  permanent fence on drift or owner errors (original owner errors
  propagate), and never refresh in-memory state from an unexpected
  external write. `selectCredential` returns a detached frozen bearer only
  for the six read routes with live expiries; mutations return null.
  `beforeDispatch` admits only the six reads plus `auth_challenge` /
  `auth_exchange` and rejects mutations, `auth_refresh`, `auth_logout`,
  and `account_status` with `operation_interrupted`. Dispatch-summary
  shape and route/method/keyKind consistency are validated without copying
  target or identity material into diagnostics (fixed generic messages).
- **Errors:** `SessionError` carries code plus the fixed message `Session
failure: <code>.`, name `SessionError`, a fixed stack with no paths, and
  a runtime-immutable code (unknown constructor codes become
  `invalid_arguments`). `isSessionError` uses a private brand so forged
  descriptors cannot spoof it.

## 4. Adjudicated interpretations (coordinator c0 review; settled against the updated work order)

1. **Opaque refresh rule:** the refresh token is an opaque nonempty string
   treated as data. The c0 spelling restrictions (dot/NUL/equality bans)
   were removed as unsupported: dots, JSON-represented NUL,
   account-shaped strings, and equality with another field are all
   accepted. Only the access token carries the T05 header-safety
   constraint. Nothing is decoded and no identity is derived from token
   spelling.
2. **Hook binding-shape mapping:** malformed hook bindings fence and fail
   `operation_interrupted`, matching the T05 hook-failure mapping;
   accepted in c0 review subject to entry captures. `isCurrent` never
   throws (false on anything unexpected). Direct option shapes
   (`SessionStateOptions`, clocks, byte views, summaries, routes) keep
   `invalid_arguments` for malformed input.
3. **Summary validation:** malformed or route/method/keyKind-inconsistent
   summaries fail `invalid_arguments`; consistent disallowed labels fail
   `operation_interrupted`; accepted in c0 review. Attempt requires a
   positive safe integer with no auth-derived upper cap (T05 supplies
   1..5; larger values gain no new meaning).
4. **No auth-specific caps:** the c0 1 MiB byte cap and depth-64 limit
   were removed as unapproved. Size/depth robustness stays an
   implementation responsibility (iterative explicit-stack JSON
   validation, no recursion): T04/T05 documented budgets are unchanged
   and no service token/additive-field constraint was invented.
5. **No fence on failed install validation:** captured-mismatch,
   already-bound, `invalid_grant`, expired-refresh, and pre-commit abort
   leave the facade unfenced with no persistence; accepted in c0 review.
   Fencing happens exactly once validation passes, synchronously before
   `bindAccount`. Existing invalidation, owner drift, and owner failure
   remain permanent.
6. **c0 main-path defect (repaired):** the duplicate-key validator kept
   value-expectation state across an object-open boundary, rejecting every
   nonempty object. Ordinary and nested object/array paths now route keys
   through the object-key check; strict duplicate/UTF-8 enforcement is
   unchanged.
7. **c1 pre-commit expiry recheck (repaired):** refresh expiry is checked
   again with a fresh clock read immediately before the storage
   transition, after the owner-validation awaits. A deadline that expires
   while queued fails `reauthentication_required` with no persistence and
   no fence. This does not retract a commit whose credential naturally
   expires after the transition began.
8. **c1 mid-commit invalidate suppression (repaired):** an explicit
   `invalidate()` during an unresolved initial commit suppresses the
   binding handoff with `operation_interrupted`, preserving durable state
   and the permanent fence, without rollback or deletion — the same
   semantics as mid-commit signal cancellation. A monotonic fence epoch
   distinguishes external invalidation from the internal transition
   fence, which alone still permits ordinary success.
9. **c1 route-label hygiene (repaired):** recognized `routeLabel` values
   are exactly the fixed T05 table's own keys via `hasOwnProperty`;
   inherited Object property names are unknown summaries failing
   `invalid_arguments`.

## 5. Known limits (not acceptance)

- No target execution, loopback, provider, or suite run was performed by
  Developer; hook order against real T05 dispatch, real T04 persistence
  identity, and expiry-boundary behavior must be established at the frozen
  relay by independent QA, not by this document.
- A privileged same-process callback or global patch (profile, clock,
  signal) is outside an OS-sandbox guarantee; seams are trusted
  constructor inputs, never model-reachable.
- Returned `Uint8Array` snapshots are independent mutable copies:
  JavaScript cannot freeze typed-array elements, so byte-element
  immutability is not claimed; owning wrappers and JSON trees are frozen.
  No V8 memory-erasure guarantee is made for transient credential bytes.
- S1 stores at most one initial grant and performs no refresh, retry,
  sign-out, replacement, or recovery-evidence behavior; those belong to
  later slices under their own bounded orders.

## 6. Verification performed (Developer-owned production checks only)

Pinned toolchain Node 24.21.0 / npm 11.19.0 via `T01_NODE_HOME`. Exact
results are reported in the artifact-ready handoff; no install, QA suite,
or custom runtime diagnostic was executed.

## 7. Changed paths (S1)

- `src/auth/errors.ts`, `src/auth/index.ts`, `src/auth/session.ts`,
  `src/auth/validate.ts`, `src/auth/vault.ts` (new; sole production
  window).
- `docs/decisions/t06-implementation-adr.md` (this file).
- Bounded prose notes in `docs/compatibility.md` (unverified; approved
  rows/statuses unchanged).

---

## 8. T06-S2 durable refresh rotation (bounded S2 record)

**Authority:** decision-ready S2 work order
(`docs/tasks/t06-s2-work-order.md`); normative references are the S1
section header plus shared MCP draft 0.2 access-and-refresh, backend v1
authentication/wire-types/OpenAPI RefreshCredential-ServiceSession/legacy
precision note, accepted T04/T05 specs, and the S1 work order + handoff.
S1 files (`session.ts`, `validate.ts`, `errors.ts`, S1 vault codec) are
behaviorally unchanged: `SESSION_VAULT_VERSION` stays literal 1 and the
S1 opener still refuses version2 without erasure. Only additive S2
behavior is supplied; this is an internal refresh-only capability, not
production-ready refresh until S3 recovery passes.

### 8.1 Module delta (`src/auth/` -> `dist/auth/`)

| Source                | Responsibility                                                                                                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `refresh.ts` (new)    | `openRefreshSessionState` facade: option/config capture, internal T05 transport construction, version2 open, serialized single-attempt rotation, lock-free internal hooks, permanent invalidate fence.                  |
| `vault.ts` (additive) | Version-2 record codec: `decodeRefreshVaultBytes`, `encodeRefreshVaultBytes`, pending validation (`assertPendingRefresh`), exact request-byte builder, canonical padded-RFC4648 base64 helpers. S1 functions untouched. |
| `index.ts` (additive) | Two new runtime exports only: `openRefreshSessionState`, `REFRESH_VAULT_VERSION` (literal 2), plus the `RefreshSessionStateOptions` / `RefreshSessionState` public types.                                               |

New runtime imports are `node:crypto` (`randomUUID`, one auth UUID per
newly prepared attempt) plus the unchanged T05 **runtime** public entry
(`createBackendTransport`; the single new runtime coupling, constructed
once per facade with private hooks) and continued type-only T04/T05
reuse. `node:url` backs the config-origin normalization mirror. No new
dependency, manifest/lockfile/config/compiler change was made.

### 8.2 Decisions and rationale

- **Read-only open:** `decodeRefreshVaultBytes` accepts zero-length
  cleared state, validated S1 version1 (delegated to the unchanged S1
  decoder, pending null), or strict version2. Unknown integer versions
  report `state_version_unsupported` before version-specific checks;
  malformed state/binding/fields report `state_corrupt`. Opening never
  writes, migrates, generates keys, dispatches, or settles pending:
  pending opens as blocked recovery state and every `rotateRefresh` on
  it fails `reauthentication_required` with no key allocation, commit,
  or dispatch.
- **Version1 upgrade only on prepare:** validated version1 (or cleared)
  state is upgraded to version2 inside the same atomic `commit`
  that installs pending evidence. Null-grant version1 stays untouched
  until authorized work; rotation with no grant fails
  `authentication_required`.
- **Exact pending evidence:** request bytes are built once as UTF-8
  `JSON.stringify({refreshToken})`, persisted as canonical padded
  base64, and re-validated on open by canonical round-trip, strict
  UTF-8 single-field JSON parse, and byte equality against the settled
  serialization for the stored token. Predecessor equals the installed
  grant field-for-field including original expiry spellings; the pending
  token is identical to the predecessor token; the auth key is a
  canonical UUID. Stored expiries keep original strings with derived
  lossless epoch milliseconds; equality `now >= expiry` is expired and
  nothing is rounded.
- **Serialized shared attempt:** the synchronous `rotateRefresh` entry
  prefix (signal/binding capture, abort, fence, identity) decides
  atomically: foreign callers fail `operation_interrupted` alone, while
  overlapping valid callers attach to the single active rotation
  (one key, one prepared commit, one network call, one success commit).
  Followers abort only their own wait; the leader's abort (or
  `invalidate()`) aborts the shared T05 dispatch via a per-rotation
  `AbortController`, and nonaborted followers receive the shared failed
  outcome. Every waiter rechecks captured identity, fence, and its own
  signal before success, so no cancelled follower gets late success;
  listeners settle and detach on every outcome. Post-success later
  calls start a distinct rotation; post-failure calls see retained
  pending and refuse without new keys or dispatches.
- **Durable transitions:** pre-prepare rechecks (abort, fence,
  unchanged owner, live predecessor refresh) precede one `commit`
  carrying full version2 predecessor/token/body/key, awaited before
  any handoff; a cancelled preparation retains durable pending without
  dispatching. Dispatch passes detached copies of the durable stored
  body/key with the captured binding to exactly one internal
  `authRefresh` call (no sleeps, retries, or route changes; controls
  need no bearer). The response is validated with S1 exact rules
  (lossless expiries, duplicate-key rejection, additive stripping);
  account mismatch is `invalid_grant`, expired returned refresh is
  `reauthentication_required`, legacy nonzero submillisecond expiries
  are `invalid_grant` — all retaining pending. One atomic `commit`
  then installs the successor grant with `pendingRefresh: null`, so
  clearing never precedes installation. Any transport error,
  cancellation, or invalidation after prepare retains exact evidence
  and propagates the safe typed error; `idempotency_key_reused` never
  settles. T04 failures fence permanently and propagate the original
  safe `StorageError` with no cleanup or reinitialization.
- **Lock-free hooks:** internal `checkBinding` / `beforeDispatch` /
  `isCurrent` hold no queue lock (T05 invokes them while the rotation
  awaits dispatch on this facade). They check four-field identity,
  exclusive owner with expected vault bytes, and the fence directly.
  `beforeDispatch` admits only `auth_refresh` / POST
  `/v1/auth/refresh` / auth key / attempt 1 / exact persisted body
  length while a prepared rotation is active. `selectCredential`
  always fails `operation_interrupted`: S2 selects no bearer.
- **Config origin gate:** the T05 factory runs first so bad configs
  propagate their safe `TransportError`; then the raw origin is
  normalized with a line-for-line mirror of the accepted T05 raw gates
  plus `URL.origin` and compared to the owner's captured canonical
  origin, mismatching as `invalid_arguments` before any mutation or
  network. Error-precedence note: vault-state errors are decided
  before the config gate during open (both precede all side effects).
- **Fences:** `invalidate()` is synchronous, idempotent, permanent
  local cancellation with dispatch abort and no IO. Commits already
  begun are awaited to completion; late success after mid-commit abort
  or invalidation is suppressed while durable state stays installed
  (success) or pending (prepare). Binding fields, generation, and
  operation bytes are never changed here.

### 8.3 Known limits (not acceptance)

- No QA suite, loopback, provider, or suite execution was performed by
  Developer; durable predecessor/body/key-before-dispatch identity,
  shared-attempt behavior, hook order against real T05 dispatch, and
  commit-failure/cancellation boundaries must be established at the
  frozen relay by independent QA, not by this document.
- Same-process callback/global-patch, OS-sandbox, V8 memory-erasure,
  and power-loss guarantees are not made; seams are trusted
  constructor inputs, never model-reachable.
- `AbortSignal` listener attachment is the only interaction with
  caller-owned signal objects (no data mutation); T05 attaches
  likewise during dispatch.
- S2 alone settles no restart replay, second-key retry, recovered-grant
  follow-on rotation, resource 401 orchestration, or lifecycle races;
  those belong to S3–S5 under their own bounded orders.

### 8.4 Verification performed (Developer-owned production checks only)

Pinned toolchain Node 24.21.0 / npm 11.19.0 via `T01_NODE_HOME`.
Early and final `npm run typecheck`, `npm run lint:production`,
`npm run format:check:production`, `npm run build` (plus scoped
ESLint/Prettier fixes on owned `src/auth/` paths). No install, QA
suite, or custom runtime diagnostic was executed, except one
import-surface listing of the built entry during the build check, which
is not claimed as behavioral evidence. Exact results are reported in
the handoff; readiness is not acceptance.

### 8.5 Changed paths (S2)

- `src/auth/refresh.ts` (new), `src/auth/vault.ts` (additive v2 codec),
  `src/auth/index.ts` (additive exports) — sole production window;
  S1 files behaviorally unchanged.
- `docs/decisions/t06-implementation-adr.md` (this file, §8).
- Bounded prose notes in `docs/compatibility.md` (unverified; approved
  rows/statuses unchanged).

### 8.6 Coordinator c0 repair (C0-1–C0-3; S1 behavior still fixed)

- **C0-1 complete entry config capture:** `openRefreshSessionState`
  no longer builds a lossy top-level copy before the owner read. The
  unchanged T05 factory now runs synchronously on the caller's
  original config object before the first await, so its authoritative
  shape validation, nested budget/CA-byte copying, and safe
  `TransportError` contract apply with no gap for later caller
  mutation. Unknown keys (including special property names) stay
  visible to T05, which rejects them; the facade drops nothing and
  invokes no prototype setter. Post-factory `origin` /
  `allowInsecureLoopback` reads are safe because the accepted config is
  a proven plain record of data values. Invalid config with valid
  vault propagates the safe T05 error; both-invalid has no prescribed
  total precedence.
- **C0-2 commit-boundary rechecks:** the predecessor expiry/abort/
  fence check now also runs after awaited owner validation and
  synchronous record serialization, directly before the prepare-commit
  invocation; the returned-refresh expiry/abort/fence check likewise
  runs after the success-path owner validation and serialization,
  directly before the final commit invocation. Earlier pre-validation
  checks are retained as fast paths only. Completed commits are never
  rolled back or deleted.
- **C0-3 leader-owned completion:** the leader no longer shares the
  follower early-abort waiter. Its public promise awaits the shared
  outcome (owned prepare/final commits are always awaited to
  completion inside the leader flow) and then reports interruption,
  keeping installed/pending state. Followers keep immediate local
  abort settlement without owning or cancelling storage work. No new
  public shutdown/wait seam; one-attempt and sharing behavior are
  unchanged.
- **C1-1 post-clock cancellation order:** at both commit boundaries
  the clock/expiry validation now runs first and the final
  abort/local-fence checks run last, with no further caller callback
  or await before the commit invocation — a clock callback that
  aborts or invalidates while returning a live instant can no longer
  slip a commit through. Small ordering fix only; expiry checks,
  failure handling, leader completion, and retention are unchanged.

---

## 9. T06-S3 exact refresh recovery (bounded S3 record)

**Authority:** decision-ready S3 work order
(`docs/tasks/t06-s3-work-order.md`); normative references are the S1/S2
sections above plus shared MCP draft 0.2 access-and-refresh, backend v1
authentication/wire-types/OpenAPI RefreshCredential-ServiceSession/legacy
precision note, accepted T04/T05 specs, the S1/S2 work orders, and the S2
handoff. S1/S2 files (`session.ts`, `refresh.ts`, `validate.ts`,
`errors.ts`, S1/S2 vault codec) are behaviorally unchanged:
`SESSION_VAULT_VERSION` stays literal 1, `REFRESH_VAULT_VERSION` stays
literal 2, the S1 opener still refuses version2, and the S2 facade keeps
its fresh-only rotation with blocked pending refusal. Only additive S3
recovery behavior is supplied; this is an internal recovery capability,
not a completed authenticated server.

### 9.1 Module delta (`src/auth/` -> `dist/auth/`)

| Source                | Responsibility                                                                                                                                                                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `recover.ts` (new)    | `openRecoverableRefreshSessionState` facade: option/config capture, internal T05 transport construction, version2 open, one-active-cycle sharing with rotate/recover kind tags, S2-identical fresh rotation plus bounded replay/follow-on recovery, lock-free internal hooks. |
| `index.ts` (additive) | One new runtime export only: `openRecoverableRefreshSessionState`, plus the `RecoverableRefreshSessionState` public type. Seven runtime exports total.                                                                                                                        |

New imports mirror the S2 set (`node:crypto` `randomUUID`, one auth UUID
per newly prepared distinct attempt; `node:url` config-origin mirror;
unchanged T05 runtime `createBackendTransport` constructed once per
facade; type-only T04/T05 reuse). No new dependency,
manifest/lockfile/config/compiler change was made. No new vault version
and no new `SessionError` codes: the strict S2 v2 record, predecessor
equality, and both version constants are unchanged.

### 9.2 Decisions and rationale

- **Shared facade, two kinds:** `rotateRefresh` keeps exact S2
  fresh-only semantics on the same refs (pending refusal, live-refresh
  gate, durable prepare, one dispatch, atomic install, expired access
  persisted without follow-on). `recoverRefresh` is the explicit
  bounded recovery/ensure-current-access call, never a
  grant/token/key getter. One `active` slot carries a `rotate` /
  `recover` kind tag: concurrent valid same-kind callers share the one
  cycle (recover shares the entire cycle including its optional fresh
  rotation), while a different-kind call overlapping it fails
  `operation_interrupted` without joining, queuing, cancelling, or
  fencing the leader. Malformed callers fail `invalid_arguments`;
  foreign valid bindings and invalidated facades fail
  `operation_interrupted` with no shared result, persistence, or fence.
- **Replay first:** with pending present, the original durable body
  bytes and original auth UUID dispatch through exactly one internal
  `authRefresh` attempt, even if the predecessor access or refresh
  deadline expired locally (no successor deadline is inferred; the
  backend looks up accepted identical attempts before rejecting
  consumed input). No prepare commit, no new key, no pending rewrite,
  and no fresh prepare runs before replay settlement. The stored
  predecessor is structurally valid/lossless from open and is never
  selected as bearer authority (`selectCredential` still always fails).
- **Install before distinct rotation:** the validated same-account
  successor (S1 exact rules, lossless expiries, additive stripping;
  account mismatch or legacy nonzero submillisecond precision fails
  `invalid_grant`; returned refresh must be live at the pre-commit
  boundary or `reauthentication_required`) commits atomically with
  pending cleared, durability awaited before any distinct rotation is
  considered. Only then, if the recovered access is expired, at most
  one fresh rotation runs with the recovered refresh token and a
  distinct new auth UUID, preparing its own predecessor/body/key after
  installation and before dispatch. The cycle holds at most two
  control requests, each T05 attempt 1. A fresh result with expired
  access but live refresh installs atomically and then reports
  `reauthentication_required` instead of looping; clock-advanced final
  expiry likewise reports without rollback, invented expiry, or
  another key.
- **No-pending branch:** live access plus live refresh is a read-only
  successful no-op after owner/fence/expiry validation (never
  migrates empty/v1 state); expired refresh fails
  `reauthentication_required` with no commit/key/dispatch; expired
  access with live refresh runs the single fresh rotation above. No
  grant fails `authentication_required`. Recovery depends on durable
  state only, covering the restart/cancellation gap between recovered
  installation and the next prepare with no volatile memory.
- **C0-1 terminal post-clock safeguard (repair):** the fresh-rotation
  terminal evaluation previously checked abort/fence only before its
  final `nowMs` read, so a clock callback aborting the leader while
  returning live time could resolve the shared outcome successfully for
  unaborted followers. The leader/fence/identity rechecks now run after
  that clock callback returns and before the expiry decision, so leader
  cancellation or local invalidation fails the entire shared cycle as
  `operation_interrupted`. Installed commits stay installed; no
  rollback, extra dispatch, new key, or API change. Audit confirmed the
  post-replay and no-pending terminal clock paths already recheck
  abort/fence (/identity) after their clock callbacks (plus a symmetry
  identity recheck on the no-op path); S2 commit boundaries were
  already C1-1 ordered and are untouched.
- **Retention and fences:** every failed replay retains the original
  full pending evidence (definite rejections, loss, malformed
  response, account/precision rejection, cancellation) unless the
  joint success commit began/completed; safe T05/Storage errors
  propagate unchanged and `idempotency_key_reused` never settles. An
  unsuccessful fresh attempt retains its newly durable evidence with
  the installed grant as predecessor. Cancellation/fence before a
  commit prevents it; begun commits are awaited to completion with
  late success suppressed and no rollback. The leader never settles
  while an owned commit is unresolved; followers abort only their own
  wait. Hooks stay lock-free (no queue held across T05 awaits) and
  gate each dispatch against the currently persisted evidence with
  exact body length. Post-clock abort/fence ordering from S2 C1-1 is
  preserved at every commit boundary, including final
  identity/signal/fence checks on the recovered live path.
- **Factory parity:** complete entry/config/binding/signal capture
  before the first await, T05 factory first (bad config propagates
  its safe `TransportError`), origin-must-match-owner gate, nested
  budget/CA bytes immune to later caller mutation, unknown keys kept
  for T05, read-only open accepting cleared/empty/v1/v2 and rejecting
  corrupt/foreign/unsupported unchanged. Exclusive T04 owner only; no
  close/reopen/reacquire, account adoption, binding/generation
  change, or operation-store access. Operation-only commits stay
  compatible (vault-byte comparison only).

### 9.3 Known limits (not acceptance)

- No QA suite, loopback, provider, or suite execution was performed by
  Developer; exact replay identity after lost response/close/reopen,
  install-before-prepare ordering, at-most-one follow-on behavior,
  shared-cycle/follower-cancellation boundaries, and hook order
  against real T05 dispatch must be established at the frozen relay by
  independent QA, not by this document.
- Same-process callback/global-patch, OS-sandbox, V8 memory-erasure,
  and power-loss guarantees are not made; seams are trusted
  constructor inputs, never model-reachable.
- `AbortSignal` listener attachment is the only interaction with
  caller-owned signal objects (no data mutation); T05 attaches
  likewise during dispatch.
- S3 settles no resource 401 orchestration, sign-out/replacement,
  lifecycle races, or successor-slice behavior; those belong to
  S4/S5 under their own bounded orders.

### 9.4 Verification performed (Developer-owned production checks only)

Pinned toolchain Node 24.21.0 / npm 11.19.0 via `T01_NODE_HOME`.
Early and final `npm run typecheck`, `npm run lint:production`,
`npm run format:check:production`, `npm run build` (plus scoped
ESLint/Prettier checks on owned `src/auth/` paths). No install or QA
suite was executed. Disclosure: the seven-export confirmation was an
executed built-entry import (`node -e` dynamic `import()` of
`dist/auth/index.js` listing export keys; exit 0, seven keys, empty
stderr), not source/declaration inspection alone — an out-of-grant
import diagnostic, retained here honestly and never counted as
behavioral evidence. Exact results are reported in the handoff;
readiness is not acceptance.

### 9.5 Changed paths (S3)

- `src/auth/recover.ts` (new), `src/auth/index.ts` (additive seventh
  export) — sole production window; S1/S2 files behaviorally
  unchanged.
- `docs/decisions/t06-implementation-adr.md` (this file, §9).
- Bounded prose notes in `docs/compatibility.md` (unverified; approved
  rows/statuses unchanged).

---

## 10. T06-S4 authenticated requests (bounded S4 record)

**Authority:** decision-ready S4 work order
(`docs/tasks/t06-s4-work-order.md`); normative references are the S1–S3
sections above plus shared MCP draft 0.2 authentication, backend v1
authentication/wire-types/OpenAPI ServiceSession-RefreshCredential/legacy
precision note, accepted T04/T05 specs, frozen S1/S2/S3 work orders, and
the S3 handoff. S1/S2/S3 files (`session.ts`, `refresh.ts`,
`recover.ts`, `validate.ts`, `errors.ts`, vault codec) are behaviorally
unchanged: `SESSION_VAULT_VERSION` stays literal 1,
`REFRESH_VAULT_VERSION` stays literal 2, strict v1/v2 formats untouched,
no new `SessionError` code or vault version. Only additive S4 behavior is
supplied; this is an internal composition capability (later guarded
T09/T10/T15), not a delivered write tool, lifecycle, browser, MCP/CLI,
or successor-slice behavior.

### 10.1 Module delta (`src/auth/` -> `dist/auth/`)

| Source                   | Responsibility                                                                                                                                                                                                                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authenticated.ts` (new) | `openAuthenticatedSessionState` facade: read-only v1/v2 open, one serialized shared auth controller (exact S3 recovery + durable fresh rotation, private volatile grant-revision bookkeeping), nine fixed resource methods with single-attempt legs and one 401 refresh-and-retry, lock-free internal hooks, permanent invalidate fence. |
| `index.ts` (additive)    | One new runtime export only: `openAuthenticatedSessionState`, plus `AuthenticatedResourceTransport` / `AuthenticatedSessionState` public types. Eight runtime exports total.                                                                                                                                                             |

New runtime imports mirror the S2/S3 set (`node:crypto` `randomUUID`
for distinct fresh keys, `node:url` config-origin mirror, unchanged T05
runtime `createBackendTransport` constructed once per facade with
private hooks for the capped config) plus the public T03 query parser
(`parseArguments` from `../domain/index.js`) used ONLY for exact
pre-refresh local validation of the three list/search inputs. No new
npm dependency, manifest/lockfile/config/compiler change was made.

### 10.2 Decisions and rationale

- **Read-only open, preserved formats:** `decodeRefreshVaultBytes`
  accepts cleared/empty/v1/v2 and rejects corrupt/foreign/unsupported
  unchanged; no migration, key allocation, network, refresh, or
  operation reads. Exclusive T04 owner only; no close/reopen/reacquire,
  binding/generation change, or initial installation.
- **Config validation then private cap:** the T05 factory runs first on
  the caller's original config (unknown keys and invalid `maxAttempts`
  propagate their safe `TransportError` untouched); only then a capped
  copy (`maxAttempts: 1`, all other fields preserved) constructs the
  dispatch transport. Each S4 resource leg is therefore a single T05
  attempt; controls were already attempt 1. T05 itself is unchanged for
  direct callers, and `totalDeadlineMs` still bounds each transport
  invocation (no aggregate S4 SLA, no new clock/sleeper/wire/event seam).
- **Entry capture before any await:** binding (own-data, getter-free),
  genuine `AbortSignal`, per-method IDs/keys (canonical UUID),
  list/search inputs (exact T03 `parseArguments`, detached result
  retained), and mutation bodies (T05-exact byte-view gate, size gate
  with `request_too_large` preserved, strict duplicate-free object
  parse, exact draft/populate/save shapes) are validated/copied before
  the first await. Caller objects are never mutated/frozen and no
  mutable alias is retained; exact body bytes, effective route/query,
  path IDs, and resource keys are reused unchanged across the one
  retry (fresh per-leg copies from the retained bytes). Local invalid
  route/body/query rejects before any refresh preparation or dispatch.
- **Shared auth controller, overlapping resources:** one serialized
  `active` cycle replaces S3 mixed-kind refusal; concurrent valid
  resource needs coordinate recovery/forced refresh here while resource
  networking overlaps. Hooks hold no controller lock (deadlock-free)
  and verify identity, exclusive owner with expected vault bytes, and
  fence directly; owned rotation updates expected vault atomically, so
  exact-byte comparison still passes for unrelated in-flight resources
  (current and expected advance together) and only external drift
  fences. `selectCredential` returns the current live bearer only
  (pending predecessor never selected); `beforeDispatch` admits only
  `auth_refresh` (POST `/v1/auth/refresh`, auth key, attempt 1, exact
  persisted body length while pending is held) plus the nine fixed
  resource routes (method/keyKind/attempt 1); all other routes fail
  `operation_interrupted`.
- **Preflight then at most one reactive retry:** preflight (pending →
  exact S3 recovery with at-most-two controls; live grant → read-only;
  expired access/live refresh → one durable fresh rotation; expired
  refresh → refuse; missing grant → `authentication_required`) runs
  before the first bearer selection. Each resource invocation has at
  most two single-attempt legs. Only a validated, delivered T05
  `status: 401` with `authentication_required`/`reauthentication_required`
  (`dispatched: true`, `outcomeUnknown: false`) permits reactive auth:
  pending → exact S3 recovery wins (live successor satisfies; expired
  recovered access permits its one distinct rotation; consumed
  predecessors never rotate under another key); newer usable installed
  revision → reuse without redundant rotation (delayed older 401s share
  the successor via the private volatile `grantRevision`); active cycle
  → join; otherwise same revision/no pending → one forced fresh rotation
  even when access looks live. Retry reuses unchanged captured identity
  (only bearer changes). Repeated definite 401 becomes safe
  `SessionError(reauthentication_required)` with no further auth or
  replay. All other resource failures (including uncertain mutation
  loss, fencing, overflow) preserve the original safe T05
  `TransportError` with `dispatched`/`outcomeUnknown`.
- **Cancellation-owned settlement:** the first valid caller starting an
  auth cycle is its leader (owns storage/network); followers abort only
  their own wait. Leader abort cancels owned auth network and propagates
  the interrupted outcome without electing a replacement; begun commits
  are awaited to completion with late success suppressed and no
  rollback. `invalidate()` is synchronous, idempotent, permanent, with
  no IO: it fences and aborts the active auth dispatch plus all tracked
  resource legs. Foreign/foreign-valid callers fail
  `operation_interrupted` alone without disturbing a valid leader.
- **Safe error mapping:** unresolved auth at the S4 boundary
  (`invalid_grant`/`reauthentication_required`, safe auth
  `TransportError`s including network/rate-limit/409/legacy-precision)
  becomes safe `SessionError(reauthentication_required)` with pending
  retained and no cause/body/token; abort/fence preserves
  `operation_interrupted`; safe `StorageError`s propagate unchanged
  with permanent fence; local invalid/clock/state distinctions
  preserved; missing grant stays `authentication_required`. S1–S3
  standalone APIs propagate their accepted errors unchanged. Returned
  success is the final leg's exact T05 result (leg-scoped
  attempts/elapsed/correlationId, detached raw mutation bytes; no
  fabricated cycle metadata). A valid refresh returning expired access
  installs, then fails closed within that auth cycle.

### 10.3 Known limits (not acceptance)

- No QA suite, loopback, provider, or suite execution was performed by
  Developer; live-grant reads, preflight/replay/rotation ordering,
  revision reuse for concurrent/delayed 401s, follower/leader/
  invalidate cancellation with held-commit settlement, unresolved-auth
  mapping with evidence retention, mutation-uncertainty preservation,
  and hook order against real T05 dispatch must be established at the
  frozen relay by independent QA, not by this document.
- Same-process callback/global-patch, OS-sandbox, V8 memory-erasure,
  and power-loss guarantees are not made; seams are trusted
  constructor inputs, never model-reachable. Head-budget overflow for
  otherwise valid args is enforced by T05 after preflight (safe code
  preserved); shape/size validation before preflight covers the settled
  malformed-caller cases.
- Session-level entry failures (binding/signal/fence/foreign/grant)
  use `SessionError`; route-argument failures use `TransportError` to
  preserve T05 safe codes (`invalid_arguments` vs `request_too_large`).
  If the Coordinator settles a single-class mapping instead, the
  affected throw sites are isolated to §10.2 entry/error-mapping paths.
- S4 settles no sign-out/replacement/lifecycle races (S5), journals,
  creation workflow, caching/cleanup, browser/CLI/MCP guard, or
  successor behavior; those belong to later bounded orders.

### 10.4 Verification performed (Developer-owned production checks only)

Pinned toolchain Node 24.21.0 / npm 11.19.0 via `T01_NODE_HOME`.
Early and final `npm run typecheck`, `npm run lint:production`,
`npm run format:check:production`, `npm run build` (plus scoped
ESLint/Prettier on owned `src/auth/` paths). No install, QA suite,
custom runtime/import diagnostic, or fixture execution. Readiness is
not acceptance.

### 10.5 Changed paths (S4)

- `src/auth/authenticated.ts` (new), `src/auth/index.ts` (additive
  eighth export) — sole production window; S1/S2/S3 files
  behaviorally unchanged.
- `docs/decisions/t06-implementation-adr.md` (this file, §10).
- Bounded prose notes in `docs/compatibility.md` (unverified; approved
  rows/statuses unchanged).

### 10.6 c1 repairs for production c0 review (P1–P4; history preserved)

§10 above is the c0 readiness record and is left intact. The c0 review
(`docs/evidence/t06-s4-coordinator-production-source-review-c0.md`) found
the candidate NOT SOURCE-APPROVED on four source points, with the common
adjudication (`docs/decisions/t06-s4-interface-adjudication.md`) settling
the §10.3 questions: Session entry/state vs Transport route/size classes
are both allowed (no universal rewrite); full operational head budget
stays T05 pre-dispatch and may follow preflight while malformed
args/body-byte limits reject before auth. Repairs below change only
`src/auth/authenticated.ts` (plus this ADR note); `index.ts` exports,
S1–S3 files, vault formats, and compatibility matrix rows are untouched.

- **P1 (join before pending ack; owned transitions vs drift):**
  preflight now joins an already active cycle before examining
  pending/expiries, so a resource arriving during prepare (predecessor
  still locally live, pending not yet acknowledged) receives that
  cycle's outcome instead of bypassing it. Owner matching tolerates
  owned single-commit intervals through a synchronously published
  transition/previous ring (`vaultTransition` set before the commit
  await, `vaultPrevious`/`vaultSnapshot` rotated after acknowledgement);
  any other vault content still fences as external drift. Hooks never
  await the shared cycle, so auth-owned dispatches cannot deadlock and
  whole resource networking is not serialized.
- **P2 (revision of the actually dispatched bearer):** bearer selection
  records the revision AND frozen grant synchronously together into a
  per-leg `AsyncLocalStorage` context (Node builtin, private, no API or
  transport seam change; no mutable caller aliases retained). The 401
  decision uses that leg's recorded revision, preserving older-401
  deduplication, one reactive cycle/one retry, and pending-replay
  priority. Fallback to current revision (forcing, never wrongly
  reusing) applies only if the context were unavailable.
- **P3 (terminal usability on every cycle):** the standalone fresh
  rotation now ends with the same terminal block as recovery rotations:
  installed grant required live for BOTH access and refresh with
  post-clock leader/fence/identity rechecks; an installed expired-access
  grant fails the shared cycle as `reauthentication_required` (state
  kept, no rollback/loop/extra key) and followers share that outcome.
  Exact replay/account/precision/pre-commit invariants unchanged.
- **P4 (final delivery without late success or downgrade):** received
  successes deliver through `deliverReceivedSuccess`/`checkFinalDelivery`:
  owner await first, then identity/clock/abort/fence (after the clock
  callback)/leg-grant-expiry with no further await before delivery.
  Suppression for abort/fence/expiry/clock reports a safe final-leg
  `TransportError` (`dispatched: true`, leg attempts/elapsed/
  correlationId/status, null backend fields; `outcomeUnknown: true` for
  mutations, `false` for reads) instead of a bare pre-dispatch
  `SessionError`. Original non-401 failures, repeated-401
  `reauthentication_required`, and storage semantics unchanged.

### 10.7 c2 repairs for production c1 review (C1-P1a/P1b/P3/P4; history preserved)

§10–§10.6 are the c0/c1 readiness records and are left intact. The c1
review found the c1 candidate NOT SOURCE-APPROVED on four focused points,
with the updated common adjudication clarifying current-session
deadlines, one-cycle stage bounds, and guard-at-settlement. Repairs
change only `src/auth/authenticated.ts` (plus this note); exports,
S1–S3 files, vault formats, and compatibility matrix rows are untouched.

- **C1-P1a (bounded read provenance):** the permanent `vaultPrevious`
  record is removed. Owner matching now allows the call-time expected
  bytes, the read-start snapshot, the synchronously published in-flight
  owned target, or the live snapshot at comparison time — covering reads
  that span a real owned acknowledgement without accepting any
  historical record forever. A fresh read after acknowledgement with no
  in-flight transition must observe current durable bytes; an external
  rollback to a prior record fences.
- **C1-P1b (selection/handoff admission):** resource `selectCredential`
  and resource `beforeDispatch` join an already active shared cycle
  (follower-local abort; shared failure propagates as hook
  `operation_interrupted`) instead of handing off the apparently-live
  predecessor or returning a null that the 401-only orchestration would
  throw unchanged. The `auth_refresh` control branch never waits, and
  lock-free `checkBinding`/`isCurrent` stay non-waiting (they cannot
  route-scope the sync `isCurrent` without breaking control self-guards;
  admission is enforced at selection/handoff which carry route context).
  A null selection now means terminally unusable with no active cycle.
- **C1-P3 (settlement recheck; one-cycle preflight):** the leader
  rechecks abort/fence/identity AFTER the executor await before
  resolving the shared outcome, so gap cancellations fail followers
  instead of resolving late success (installed state kept). Preflight
  records a consumed stage cycle when it joins entry-active work and
  fails `reauthentication_required` instead of starting a second fresh
  cycle if deadlines are still expired afterwards.
- **C1-P4 (guard at return; current deadlines):** final delivery is
  inline after the last owner await with no further await before the
  actual `return`; the synchronous guard checks identity, clock,
  abort/fence after the clock callback, and the CURRENT durably
  installed grant's access/refresh deadlines (a historical leg bearer's
  expiry alone never fences a same-binding success while the successor
  is usable). Suppression keeps the safe final-leg `TransportError`
  shape; original non-401/storage errors propagate.

### 10.8 c3 repairs for production c2 review (C2-P1/P2/P3; history preserved)

§10–§10.7 are the c0–c2 readiness records and are left intact. The c2
review kept the candidate HELD on three focused admission/provenance/
bounds points. Repairs change only `src/auth/authenticated.ts` (plus
this note); exports, S1–S3 files, vault formats, matrix rows untouched.

- **C2-P1 (race-safe handoff admission):** a monotonic `authSeq`
  increments synchronously on every auth-leader publish. Resource
  `beforeDispatch` publishes a synchronous admission token (current
  epoch, only when no active cycle/pending) at the end of its handoff
  gate with no await before return. The synchronous route-less
  `isCurrent` — the only check T05 runs with no await before wire —
  enforces it for resource legs via the per-leg async context (first
  call per attempt consumes the token; the second, pre-delivery call
  tolerates owned flight so unrelated received successes still deliver
  under the owner ring plus the current-deadline final guard). Control
  dispatches run outside any leg context and keep binding/fence-only
  semantics, so auth never blocks its own cycle and whole-network
  serialization is avoided. Stale-token handoffs fail closed as
  undispatched `operation_interrupted` without consuming the 401 retry;
  the caller retries with a fresh preflight that joins.
- **C2-P2 (join provenance outside T05):** hook-internal joins record
  the original shared outcome privately per leg before throwing the
  generic hook interruption. Outside T05, undispatched hook-mapped
  interruptions with recorded provenance apply the specified S4 mapping
  (unresolved auth → safe `reauthentication_required`; abort/fence/
  storage preserved; no cause/body leak). Null selections and admission
  blocks with retained pending evidence likewise map to
  `reauthentication_required` (not missing login); genuine missing
  material stays `authentication_required`.
- **C2-P3 (one cycle per stage, all joins):** a `StageUse` flag is
  shared by each stage's orchestration joins and its legs' hook joins
  (preflight+first leg share one; reactive+retry share another). Any
  second distinct cycle need in the same stage fails closed
  (`reauthentication_required` at orchestration, hook interruption with
  caller retry at hooks) instead of silently joining/starting another.
  One S3 recovery cycle may still contain replay plus its single
  distinct rotation.

### 10.9 c4 repair for production c3 review (priority only; history preserved)

§10–§10.8 are the c0–c3 readiness records and are left intact. The c3
review verified the C2 admission/provenance/stage fixes with all checks
green, holding the gate on one localized mapping-priority point. The fix
changes only `src/auth/authenticated.ts` (plus this note).

- **Priority:** `mapHookJoinProvenance` now returns early on genuine
  observing-boundary interruption — caller abort or explicit local
  `invalidate()` (tracked separately from storage-failure fencing via a
  synchronously set `invalidated` flag) — before restoring any earlier
  recorded join cause, so a later cancellation can no longer be
  overwritten by reauth from an earlier 429/network/invalid-grant join
  rejection. Storage-error provenance still propagates through the same
  path when storage itself fenced the facade. No API, error-type,
  transport, or leak-surface change.

---

## 11. T06-S5 trusted lifecycle and race closure (bounded S5 record)

**Authority:** decision-ready S5 work order
(`docs/tasks/t06-s5-work-order.md`); normative references are the S1–S4
sections above plus shared MCP draft 0.2 authentication
(bootstrap/sign-out, fences, storage/lifecycle), backend v1
authentication (logout/revocation, foreground supersession), wire
compatibility and auth-expiry precision, accepted T04/T05 specs, frozen
S1–S4 work orders, S4 adjudication, and the S4 handoff. S1–S4 files
(`session.ts`, `refresh.ts`, `recover.ts`, `authenticated.ts`,
`validate.ts`, `errors.ts`, S1/S2 vault codec) are behaviorally unchanged:
`SESSION_VAULT_VERSION` stays literal 1, `REFRESH_VAULT_VERSION` stays
literal 2, strict v1/v2 decoding untouched, no new `SessionError` codes.
Older openers still refuse v3 with `state_version_unsupported`. Only
additive S5 behavior is supplied.

### 11.1 Module delta (`src/auth/` -> `dist/auth/`)

| Source                | Responsibility                                                                                                                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lifecycle.ts` (new)  | `openLifecycleSessionState` facade: v3-aware read-only open, full S4 resource/auth controller, fence-first `signOut`/`replaceGrant` via one T04 `advanceSessionGeneration`, best-effort logout cleanup, permanent invalidate fence. |
| `vault.ts` (additive) | Version-3 codec: `decodeLifecycleVaultBytes`, `encodeLifecycleVaultBytes`, superseded-entry validation, `VaultSupersededEntry`/`DecodedLifecycleVault` types. S1/S2 functions untouched.                                            |
| `index.ts` (additive) | Two new runtime exports only: `LIFECYCLE_VAULT_VERSION` (literal 3), `openLifecycleSessionState`, plus `LifecycleSessionState` type. Ten runtime exports total.                                                                     |

New runtime imports mirror S4 (`node:crypto` `randomUUID` for fresh
rotation keys, `node:url` origin mirror, unchanged T05 runtime
`createBackendTransport` for the resource transport plus a neutral-hook
cleanup transport, public T03 `parseArguments` for resource validation).
No new npm dependency, manifest/lockfile/config/compiler change was made.

### 11.2 Decisions and rationale

- **Read-only v3 open:** `decodeLifecycleVaultBytes` accepts
  zero-length cleared state, validated v1 (pending null), validated v2,
  or strict v3; unknown integer versions report
  `state_version_unsupported` before shape checks, malformed
  fields/bindings/UTF-8/duplicates report `state_corrupt`. Factory
  requires a bound nonnull account (`null` => `authentication_required`)
  with no opening mutation, migration, keys, network, or operation reads.
  Exclusive T04 owner only; `advanceSessionGeneration` captured alongside
  `readVaultBytes`/`commit`; owner never closed/reopened/reacquired.
- **Strict retained evidence:** v3 plaintext is duplicate-key-free UTF-8
  JSON `{version: 3, binding, grant, pendingRefresh, superseded}` with
  fixed key order on encode. Current grant/pending obey S1/S2 rules.
  Each superseded entry carries its predecessor binding (same
  origin/account/profile as current, strictly older generation),
  a nonnull stored grant, and null/exact pending validated against THAT
  entry's binding with original strings retained losslessly. Entries are
  strictly increasing by generation with no duplicates; no nested
  snapshots, TTL/eviction/cleanup, or token-spelling deduplication.
  Retained expired material stays evidence, never current authority.
- **Preserved S4 resources:** all nine resource methods, preflight with
  pending-recovery priority, at-most-one 401 retry with actual-bearer
  revision reuse, safe error mapping with pending retention and
  mutation-uncertainty preservation, shared auth controller with
  follower-local cancellation, and lock-free hooks are reused unchanged.
  Every refresh prepare/install writes v3 retaining the superseded list;
  replay preserves exact body/key identity; superseded never supplies
  bearer/replay/selection/authority, never blocks rotation, and never
  promotes/rebinds/erases on ordinary failures.
- **Fence-first lifecycle:** actionable arguments validated locally first
  (malformed/foreign reject with no fence or IO; other-account grant =>
  `operation_interrupted`; expired refresh => `reauthentication_required`;
  invalid grant => `invalid_grant`), then exactly one lifecycle action
  admits with synchronous resource/auth fencing before the first await.
  Owned network is cancelled; already-begun owned commits settle safely
  via the shared outcome; the current owner/vault is reread against the
  last acknowledged bytes with no optimistic repair. One T04
  `advanceSessionGeneration` (old generation+1, same
  origin/account/profile) commits the v3 transition atomically without
  reading operation bytes; overflow keeps T04 `resource_exhausted`.
  Old capture stays permanently stale; only the new `StorageBinding`
  returns for explicit trusted reopen.
- **`signOut`:** trusted local action with no caller signal. Always
  advances once (even from null-grant state) with
  grant/pending/superseded cleared, then best-effort `POST
/v1/auth/logout` (no bearer/key, one attempt per distinct refresh
  token, same origin/limits/TLS) bounded by ONE shared
  `totalDeadlineMs` window through a neutral-hook cleanup transport.
  All logout outcomes are swallowed; explicit `invalidate` during cleanup
  only stops network, never the acknowledged binding.
- **`replaceGrant`:** trusted foreground same-origin/same-account
  composition only. Deadline/clock checked before admission and again
  after owner awaits immediately before advance; caller abort/invalidate
  wins. Null current grant adds no entry; otherwise the settled current
  grant plus exact pending is appended under the OLD binding, then the
  fresh grant installs with pending null. No logout/replay on
  replacement; uncertain predecessors stay preserved, not revoked.
  Cancellation before advance prevents it (stays fenced); once advance
  begins it settles safely with post-advance abort/invalidate suppressing
  the handoff as `operation_interrupted` while retaining the commit.
- **Fences:** `invalidate()` stays synchronous permanent local
  cancellation (now also aborting cleanup network), not durable sign-out.
  Resource late successes keep S4 safe dispatched/outcomeUnknown mapping;
  refresh/read success cannot leak after the lifecycle fence.

### 11.3 Known limits (not acceptance)

- No QA suite, loopback, provider, or suite execution was performed by
  Developer; v3 retention/old-version refusal, replacement evidence and
  restart/rotation isolation, offline sign-out clearing before delayed
  logout, and representative read/mutation/refresh races with
  begun-commit settlement must be established at the frozen relay by
  independent QA, not by this document.
- Same-process callback/global-patch, OS-sandbox, V8 memory-erasure, and
  power-loss guarantees are not made; seams are trusted constructor
  inputs, never model-reachable. Head-budget overflow stays T05
  pre-dispatch; no aggregate S4/S5 SLA or new clock/sleeper/wire seam.
- S5 settles no browser/login, journals/creation, caching/cleanup,
  deletion/profile cleanup (T12), or successor behavior; parent
  integrated acceptance and external gates remain open.

### 11.4 Verification performed (Developer-owned production checks only)

Pinned toolchain Node 24.21.0 / npm 11.19.0 via `T01_NODE_HOME`. Early
and final `npm run typecheck`, `npm run lint:production`,
`npm run format:check:production`, `npm run build` (plus scoped
ESLint/Prettier on owned `src/auth/` paths). No install, QA suite,
custom runtime/import diagnostic, or fixture execution. Readiness is not
acceptance.

### 11.5 Changed paths (S5)

- `src/auth/lifecycle.ts` (new), `src/auth/vault.ts` (additive v3 codec),
  `src/auth/index.ts` (additive two exports) — sole production window;
  S1–S4 files behaviorally unchanged.
- `docs/decisions/t06-implementation-adr.md` (this file, §11).
- Bounded prose notes in `docs/compatibility.md` (unverified; approved
  rows/statuses unchanged).

### 11.6 c0 repairs for production c0 review (C0-1/C0-2; history preserved)

§11–§11.5 are the c0 readiness record and are left intact. The c0 review
(`docs/evidence/t06-s5-coordinator-production-source-review-c0.md`) kept
four production checks green but held source approval on two
specification-level points, clarified by the common adjudication
(`docs/decisions/t06-s5-lifecycle-adjudication.md`). Repairs change only
`src/auth/lifecycle.ts` (plus this note and a misplaced vault comment);
S1–S4 files, public APIs, v3 evidence contract, and matrix rows are
untouched.

- **C0-1 (nonrenewable monotonic logout window):** best-effort logout no
  longer measures elapsed time with `Date.now` differences or starts a
  fresh remaining timer per token. The window origin uses the monotonic
  `performance.now` clock with a single whole-window timer that aborts the
  owned current attempt; every token attempt rechecks monotonic elapsed
  against the same origin and refuses new dispatch after expiry. Owned
  cleanup is always awaited (never detached); acknowledged clearing never
  depends on cleanup outcomes. No public timing seam or dependency.
- **C0-2 (replacement clock-callback interruption priority):** both
  `replaceGrant` deadline boundaries now read the epoch clock through a
  helper that rechecks actual caller abort/explicit invalidate AFTER the
  callback even when it also returns expired/invalid/throws, before any
  deadline/error decision or advance admission. Such interruption reports
  `operation_interrupted` with no advance; without interruption,
  expiry/invalid-clock keep `reauthentication_required`/`invalid_arguments`.
  The admitted transition's own fence is not invalidate; begun advances
  still settle safely with late success suppressed.
- **Vault comment:** the `parseServiceGrant` doc block that preceded the
  new superseded-entry types was relocated to its function; v3 codec
  behavior unchanged.

### 11.7 c1 repair for production c1 review (C1-1; history preserved)

§11–§11.6 are the c0/c1 readiness records and are left intact. The c1
review accepted the C0-1/C0-2 and entry-vs-admitted cancellation fixes
with all checks green, holding source approval on one final logout
wire-admission point, clarified by the updated common adjudication
(`docs/decisions/t06-s5-lifecycle-adjudication.md`). The repair changes
only `src/auth/lifecycle.ts` (plus this note and the compatibility note
below); S1–S4 files, public APIs, v3 evidence contract, and matrix rows
are untouched.

- **C1-1 (shared budget at actual logout handoff):** the admitted cleanup
  phase now publishes one monotonic shared deadline
  (`refs.cleanupDeadline`, origin `performance.now` plus the single
  `totalDeadlineMs` window) synchronously before the first logout attempt
  and clears it after. The private fixed-route cleanup hooks recheck that
  same original deadline — with owned invalidation/abort — at T05
  pre-dispatch (`checkBinding`/`beforeDispatch`, failing closed as
  undispatched interruption) and at the final synchronous wire handoff
  (`isCurrent`, returning false once expired), in addition to the existing
  per-token loop fast path. A late timer event or a T05 per-invocation
  budget starting after body preparation can therefore never admit a NEW
  wire attempt after original expiry; expired cleanup is rejected without
  a wire attempt and without failing the acknowledged local clearing. One
  window timer, no per-token reset, no public seam or dependency.
