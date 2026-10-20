# T21 — Successor credential storage and public interfaces

**Authority:** user-assigned T21-S1, 2026-10-17; normative for T21-S2–S6.
Documentation decision only: existing runtime/package still implements the prior
formats. Shared MCP draft0.3 and unchanged backend v1 remain higher authority.

This supersedes T04's ext4-only two-store/external-anchor protocol, T09's creation
journal API/format, T12's operation retirement/reconciliation/removal fences and
the related illustrative T01 operation/storage interfaces. Historical specs and
acceptance records remain intact. Retained auth, crypto, path/privacy, ownership
and transport guarantees continue unless explicitly changed below.

## Additive successor — multi-client acquisition S1 (2026-10-18)

The user authorized [multi-client slice1](../tasks/multi-client-s1-work-order.md).
It adds only a private bounded/cancellable acquisition helper, with unchanged
public fail-fast `openProfile` and exactly one exclusive kernel owner. Retry only
actual ownership conflict; cancellation/timeout must prove worker exit and close
an undelivered acquired session before rejecting. Cancellation is permitted only
while opening read-only state, never against a returned session or mutation.
Internal wait limit defaults to60 seconds independently of per-worker IO timeout;
internal `interrupted`/`timed_out` failures carry sanitized fixed diagnostics.
Capture location before waiting and authenticate ordinary storage/key state on
every attempt; never steal/unlink a lock or retry corrupt/provider/foreign state.
No new config/record format, public storage export or provider bypass is added.

Runtime ownership lifetime, binding capture and protocol delivery remain unchanged
in S1. Per-invocation runtime ownership requires separately authorized slice2 and
its explicit successor contract; S1 alone does not enable concurrent MCP clients.

## Successor runtime ownership — multi-client S2 (2026-10-18)

User-authorized [S2](../tasks/multi-client-s2-work-order.md) changes ownership
lifetime at runtime composition only. Startup validates/authenticates the profile
and session, pins profile/origin/account, then releases its owner. Each valid
enabled call acquires with S1, loads fresh auth state and captures the current
generation. Only the pinned profile/origin/account may be used; same-account
generation changes between calls are permitted, while replacement/account adoption
requires restart. No auth/creation state is retained between invocations.

Ownership spans the complete invocation and final result handoff, including exact
refresh evidence/replay, grant persistence and all creation steps. Direct trusted
methods complete cleanup at their delivery boundary. SDK responses retain a private
lease until transport send settles. Cancellation before send suppresses delivery;
cancellation/close during a pending write closes transport before release, so queued
success cannot outlive ownership. Close waits begun durable auth work and cleanup.
Idle connected runtimes hold no lock. Calls sharing a profile serialize. Public
factories/schema/strict startup write policy stay unchanged; no low-level concurrent
credential owners or new public capability/error/config field is introduced.

Acquisition timeout is recovery_unavailable without permanently fencing a healthy
runtime; genuine unsafe state retains existing fencing, including pending data
responses when a queued call discovers unsafe state. Generic recovery_unavailable
errors remain deliverable without sensitive context. Cancellation is
operation_interrupted, and creation remains retryable:false with truthful context.
Private process startup cancellation can interrupt read-only acquisition on EOF or
signal, release its worker and exit with ordinary EOF/signal status. This supersedes
the old private-state failure expectation for that specifically cancelled path.
S2 changes no shared contract, auth algorithm, record/key format or release gate.

## Configuration and profile selection

The strict server config root has exactly the existing keys except:

- `version` is required integer2; version1 is rejected as configuration_required.
- `bindingDescriptorPath` is removed and rejected as unknown.
- `storage` has required `profileRoot`, `secretServiceBusAddress` and optional
  `timeoutMs`. `anchorRoot` is removed and rejected as unknown.

Keep `serviceOrigin`, optional transportBudgets/protocol, existing validation and
budget values, strict `writesEnabled` default false and fixed startup snapshot
semantics. Only explicit true enables creation. No watcher/env/CLI write override.
Login settings version1 and their Google client/origin schema remain unchanged.
Config/login files stay restricted, separate from each other and outside profileRoot.

```json
{
  "version": 2,
  "serviceOrigin": "https://service.example.invalid",
  "storage": {
    "profileRoot": "/PRIVATE/PROFILE",
    "secretServiceBusAddress": "unix:path=/PRIVATE/SECRET-SERVICE-SOCKET"
  },
  "writesEnabled": false
}
```

These are placeholders, never discovered deployment inputs. One profileRoot holds
`credentials.enc` and `owner.lock`, plus same-directory temporary replacements.
No `operations` file, anchor root, binding descriptor or descriptor.pending receipt.
Temporary files never become startup recovery candidates. Unknown preexisting root
contents/old-format profiles cannot be treated as fresh setup.

## Storage API

Keep inert factories and the existing worker/key custody boundary. Production
exports are StorageError, isStorageError, provisionProfile, openProfile,
removeProfile and MAX_STORE_BYTES. Remove DIGEST_KEY_VERSION. Diagnostic facilities stay separately
importable and cannot supply production provider/filesystem bypasses.

```ts
interface StorageBinding {
  readonly origin: string;
  readonly accountUuid: string | null;
  readonly sessionGeneration: number;
  readonly profileGenerationId: string;
}
interface ProfileLocation {
  readonly profileRoot: string;
  readonly secretServiceBusAddress: string;
  readonly timeoutMs?: number;
  readonly origin: string;
}
interface StoreUpdate {
  readonly vaultBytes: Uint8Array;
}
interface ProfileSession {
  readonly binding: StorageBinding;
  readVaultBytes(): Promise<Uint8Array>;
  commit(update: StoreUpdate): Promise<void>;
  bindAccount(accountUuid: string, replacementVaultBytes: Uint8Array): Promise<StorageBinding>;
  advanceSessionGeneration(replacementVaultBytes: Uint8Array): Promise<StorageBinding>;
  removeProfile(): Promise<void>;
  close(): Promise<void>;
}
declare function provisionProfile(request: ProfileLocation): Promise<ProfileSession>;
declare function openProfile(request: ProfileLocation): Promise<ProfileSession>;
declare function removeProfile(request: ProfileLocation): Promise<void>;
```

No expectedBinding input from an external descriptor. Open authenticates the
record and compares its origin with trusted config before returning binding/vault.
Missing config can still provide the existing safe unconfigured runtime; selected
invalid config is configuration_required; failure to open selected credentials is
recovery_unavailable. A null-account profile returns authentication_required.

Provision creates a new root exclusively; an existing root, even empty or containing
only owner.lock, is not silently reused. It generates a random profileGenerationId, origin/null account/generation0
binding and empty vault. It is explicit trusted setup, never an open fallback.
Account binding can move null → backend-confirmed account or remain that account,
never switch accounts. Existing generation validation/overflow limits apply.
Generation advance and replacement vault commit atomically; successful methods
publish the new binding only after durable replacement. Commit does not change
binding. All methods serialize under the same owner and defensively capture bytes.
Untrusted callers cannot inject account authority through these trusted local APIs.

Remove readOperationStoreBytes, operationBytes, keyedIntentDigest,
verifyRemovedProfile, resumeProfileRemoval, provisionReconciledProfile and their
generation-fence/retirement interfaces. No old-mode adapter in production.

## Single authenticated record

Use the existing AES-256-GCM/HKDF-SHA256 primitives and immutable 256-bit Secret
Service master key. Keep fresh32-byte salt, fresh12-byte nonce and16-byte tag per
replacement. Use distinct HKDF info `gymtracka-credential-record-v1`; do not reuse
the old vault/operations/anchor family derivations as a compatible record.

The new envelope is strict UTF-8 JSON, no BOM/duplicate keys/extra properties:

```json
{
  "format": "gymtracka-credentials",
  "version": 1,
  "profileGenerationId": "00000000-0000-4000-8000-000000000001",
  "saltBase64": "<canonical base64 of 32 random bytes>",
  "nonceBase64": "<canonical base64 of 12 random bytes>",
  "ciphertextBase64": "<canonical base64 of encrypted payload>",
  "tagBase64": "<canonical base64 of 16-byte tag>"
}
```

AAD is UTF-8 JSON.stringify of the ordered array
`["gymtracka-credentials",1,profileGenerationId,saltBase64,nonceBase64]`.
The encrypted plaintext is strict JSON
`{version:1,binding:StorageBinding,vaultBase64:string}`; vaultBase64 is canonical
base64 of the existing opaque auth/login vault bytes. Inside binding the profile ID
must equal the authenticated envelope ID; origin must equal trusted config. Validate
all binding types/limits. Account IDs and token material are never plaintext header
fields. Unknown integer format versions are store_version_unsupported; malformed
shape/base64/authentication/binding content is store_corrupt or binding_mismatch.

Header profileGenerationId is only a bounded untrusted Secret Service lookup hint.
It grants no account access and is not returned as verified state until tag and
payload validation succeed. Retain existing immutable-key attributes/provider
checks; zero/locked/multiple/missing results do not create replacement keys. A
valid foreign-origin record fails without dispatching backend/auth requests.

Keep MAX_STORE_BYTES=268435456 as the maximum opaque vault byte length, not a new
domain limit. Before allocation/read/decode, bound the outer file by
`4 * MAX_STORE_BYTES + 65536`, accounting for nested base64 and fixed metadata.
Bound plaintext/decoded fields and reject length amplification before expensive
processing; vault overflow is resource_exhausted. Do not reduce existing allowed
auth request budgets as an implementation shortcut.

## Ownership, replacement and failure

Retain Linux x64/Node24 and OS Secret Service. Use existing local kernel flock
ownership and holder process; owner.lock moves into profileRoot. Retain restrictive
ownership/permissions (directories0700/files0600), symlink-free path traversal,
regular-file/link checks and safe creation/revalidation. Unsafe paths never get a
best-effort plaintext fallback. No filesystem-name/magic allowlist: qualify actual
ext4/Btrfs local IO; unexpected missing primitives/errors fail safely. This is no
network/overlay/other-platform support certification.

To replace credentials, write a same-directory O_EXCL private temp fully, handle
short writes, fsync file, rename over credentials.enc, fsync parent, then acknowledge.
Creation/setup flushes newly created directories as needed. There is no multi-file
PREPARED/COMMITTED anchor or mutable external manifest. No commit-sequence/rollback
comparison against an independently stored marker. Reuse proven write primitives.

Before rename is attempted, IO failure leaves the previous record authoritative
and reports io_failure. Once replacement may have occurred, uncertainty/failure
reports commit_ambiguous and fences the handle; only close is allowed. Do not
claim unchanged files after possible rename. IPC loss during a mutation also fences.
Reopen authenticates the sole credentials.enc; missing/corrupt state fails and
temporary files are never promoted. An authenticated old or new record can open
after process interruption. Hardware/fsync compliance remains conditional; these
checks are not actual power-loss proof.

Retain sanitized StorageError codes for arguments/platform, provider/key states,
store missing/corrupt/version, capacity, binding/generation mismatch, provisioning,
ownership, ambiguous commit and IO. Retire fence_mismatch and anchor_missing.
There is no unsupported-filesystem error merely because a mount is Btrfs. Runtime
maps unsafe credentials/key/format/ownership failures to recovery_unavailable;
trusted CLI distinguishes configuration/fresh-setup/auth-recovery guidance without
exposing native paths/messages, tokens or IDs in diagnostics.

## Auth and lifecycle integration

Keep exact pending-refresh token/body/key persistence before send and returned grant
persistence before evidence removal, using one credential-record replacement. Keep
vault versions1–3 and foreground login version4 semantics as currently specified;
opaque nested vault bytes retain existing binding validation. No auth-material
format migration is needed for fresh profiles. No new key for uncertain refresh.

Login success atomically changes verified account/session binding with vault state;
remove the separate metadata publication transaction. Incomplete foreground exchange
state remains in the encrypted vault and is handled by explicit login resume/cancel
within its deadline. Trusted `recover` validates current storage/auth state without
repairing ambiguous old metadata or resuming creation. It can report ready when no
foreground auth action is pending, otherwise directs the existing auth action.

Sign-out fences calls and advances generation while removing usable grants as
currently required; best-effort dedicated-session logout and retained fenced auth
cleanup evidence remain. Account-status proof requirements stay unchanged. Current
in-memory origin/account/generation fences protect sends and result delivery.
Restoring an older valid encrypted snapshot is not independently detected; it may
require fresh login and can expose backend refresh-reuse consequences. Do not
describe authenticated encryption as rollback detection.

Explicit profile removal requires stopped/fenced domain/auth work under ownership:
delete the exact verified Secret Service key first, then unlink credentials.enc
and known private temps and flush the directory. Keep owner.lock/root until the
owner closes; do not unlink a held lock and permit a second inode owner. No external
removal tombstone. If interrupted after key deletion, retry removal can finish only
through this explicit trusted path after validating the restricted root/header and
confirming that exact key is absent; normal open still fails. Partial provider/IO
failure reports cleanup incomplete, never success. Never recursively delete unknown
contents or another profile's key. Full erasure from backups/hardware is not promised.

The top-level removeProfile factory is a trusted local cleanup entry, never a tool:
it acquires/revalidates ownership and releases it before returning. It does not
require a successful normal open when retrying cleanup after key deletion. With a
present key it must authenticate the full record/origin before deleting that key;
with an absent key it can remove only this explicitly selected restricted record
and known temps, never a different key. Missing credentials plus no unknown content
can finish an already-removed root without provisioning anything. Account-status
automatic cleanup still requires its existing authenticated account/proof binding;
it cannot use unauthenticated header hints as deletion authority. The owned-session
method performs the same cleanup without reacquiring a second lock. This avoids an
unreachable “retry removal” path after normal open reports key_not_found.

## Creation/runtime interface for S2

Keep `openToolRuntime({configPath?})` and its seven tool methods/close. Read-runtime
API and six read envelopes are unchanged. Runtime constructs creation from the
trusted startup write policy and authenticated session, without a repository.

```ts
interface SavedRoutineResult {
  readonly routineId: string;
  readonly status: "saved";
}
interface CreationError {
  readonly code: string;
  readonly retryable: false;
  readonly message?: string;
  readonly backendErrorCode?: string;
  readonly retryAfterSeconds?: number;
  readonly routineId?: string;
  readonly lastConfirmedStep?: "none" | "draft" | "populate" | "save";
  readonly outcomeUnknown?: boolean;
}
type CreationOutcome =
  | { readonly ok: true; readonly data: SavedRoutineResult }
  | { readonly ok: false; readonly error: CreationError };
type CreationServiceSession = Pick<
  AuthenticatedSessionState,
  "binding" | "getExercise" | "createDraft" | "populateDraft" | "saveRoutine"
>;
interface CreationServiceOptions {
  readonly session: CreationServiceSession;
  readonly writesEnabled: boolean;
  readonly maxRequestBytes?: number;
}
interface CreationService {
  create(binding: StorageBinding, args: unknown, signal: AbortSignal): Promise<CreationOutcome>;
}
declare function createCreationService(options: CreationServiceOptions): CreationService;
```

These are internal trusted composition types; `AuthenticatedSessionState` is the
existing auth facade, not a model-supplied capability. writesEnabled comes only from
validated startup config. S2 carries the existing validated transport maxRequestBytes
through this optional internal composition field (default: existing transport default),
so all bodies can be checked before the first mutation; it is not a new tool/config
argument or a changed budget. Capture policy strictly and check before every step; false
returns configuration_required without mutation. No live reload is introduced;
closing/replacement aborts invocation work and captured binding must match current
session before sends/delivery. Inspect visible references through getExercise before
allocating the routine family. No listRoutines/getRoutine receipt-delivery read or
durable journal handle is required. Internal executor/confirmation helpers can be
chosen in S2; no executeRecovery/repository API remains.

Creation service returns a tool envelope, not a journal terminal/stopped wrapper.
Known local/backend failures map to safe code/metadata and retryable:false; unknown
faults map to internal_error with that same false flag. Protocol/runtime result-size,
validation, cancellation and shutdown fallbacks also preserve false for creation.
After possible dispatch include the three creation context fields together, unless
current binding forbids their disclosure. outcomeUnknown means a dispatch outcome
is unconfirmed; it does not mean a confirmed earlier draft was rolled back. A valid
same-ID saved response with different content reports concurrent_modification,
lastConfirmedStep:save and outcomeUnknown:false. No operationId in either envelope.

## Transition and proportional acceptance

New runtime rejects version1 config/old record formats with explicit new-config,
new-empty-root and trusted-login guidance. Never migrate/discard/replay old creation
state automatically, and never call an old install's removal API from new setup.
Before replacing an old install, stop it and inspect possible uncertain creations;
old-data cleanup is explicit using that installation's documented path. The current
laptop has no profile to migrate. Runtime/package behavior changes only in S2–S6.

S3 checks new format/real Secret Service/ownership and representative replacement
failure on disposable ext4/Btrfs; S4 checks setup/login/refresh restart/sign-out/
removal/config refusal; S5/S6 qualify integrated/installed behavior. Keep valuable
crypto, lossless numeric and retry-identity oracles. Replace retired anchor/journal
tests explicitly, never by a blanket suite exclusion. All release/security gates
applicable to retained behavior remain; implementation/test execution is outside S1.
