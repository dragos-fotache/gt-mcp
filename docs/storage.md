# Credential storage

This is the current local persistence contract. The
[shared authentication contract](../shared-docs/docs/mcp-contract/authentication.md) remains higher
authority. Binding and authentication state share one encrypted record; routine creation state
remains invocation-local.

## Multiple-client ownership

Low-level `openProfile` is fail-fast and permits exactly one kernel owner. Runtime composition waits
cancellably, retrying only ownership conflict, with a 60-second acquisition limit separate from
worker IO timeout. It authenticates the profile on each attempt. Cancellation proves worker exit and
closes an undelivered session before rejection; it cannot interrupt a returned session or begun
mutation. Startup releases ownership after validation. Each admitted call owns fresh auth state
through result delivery, then closes it. Idle servers retain no owner or auth facade. See
[architecture](architecture.md) for generation and delivery fences.

## Configuration and profile selection

The strict server config requires `version: 2`, `serviceOrigin` and `storage`. Storage requires
`profileRoot` and `secretServiceBusAddress`, with optional `timeoutMs`. Optional `transportBudgets`
and `protocol` follow the validated [operator budgets](stdio-server.md#operator-budgets).
`writesEnabled` is a strict boolean defaulting to false, captured in the startup snapshot. Version
1, `bindingDescriptorPath`, `anchorRoot` and unknown fields are rejected. Only explicit true enables
creation. No watcher/env/CLI write override. Login settings version 1 and their Google client/origin
schema remain unchanged. Config/login files stay restricted, separate from each other and outside
profileRoot.

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

These are placeholders, never discovered deployment inputs. One profileRoot holds `credentials.enc`
and `owner.lock`, plus same-directory temporary replacements. No `operations` file, anchor root,
binding descriptor or descriptor.pending receipt. Temporary files never become startup recovery
candidates. Unknown preexisting root contents/old-format profiles cannot be treated as fresh setup.

## Storage API

Factories are inert; worker processes isolate key custody. Production exports are StorageError,
isStorageError, provisionProfile, openProfile, removeProfile and MAX_STORE_BYTES. Diagnostic
facilities stay separately importable and cannot supply production provider/filesystem bypasses.

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

No expectedBinding input from an external descriptor. Open authenticates the record and compares its
origin with trusted config before returning binding/vault. Missing config can still provide the
existing safe unconfigured runtime; selected invalid config is configuration_required; failure to
open selected credentials is recovery_unavailable. A null-account profile returns
authentication_required.

Provision creates a new root exclusively; an existing root, even empty or containing only
owner.lock, is not silently reused. It generates a random profileGenerationId, origin/null
account/generation 0 binding and empty vault. It is explicit trusted setup, never an open fallback.
Account binding can move null → backend-confirmed account or remain that account, never switch
accounts. Existing generation validation/overflow limits apply. Generation advance and replacement
vault commit atomically; successful methods publish the new binding only after durable replacement.
Commit does not change binding. All methods serialize under the same owner and defensively capture
bytes. Untrusted callers cannot inject account authority through these trusted local APIs.

## Single authenticated record

Use the existing AES-256-GCM/HKDF-SHA256 primitives and immutable 256-bit Secret Service master key.
Keep fresh 32-byte salt, fresh 12-byte nonce and 16-byte tag per replacement. Use distinct HKDF info
`gymtracka-credential-record-v1`; do not reuse the old vault/operations/anchor family derivations as
a compatible record.

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
`["gymtracka-credentials",1,profileGenerationId,saltBase64,nonceBase64]`. The encrypted plaintext is
strict JSON `{version:1,binding:StorageBinding,vaultBase64:string}`; vaultBase64 is canonical base64
of the existing opaque auth/login vault bytes. Inside binding the profile ID must equal the
authenticated envelope ID; origin must equal trusted config. Validate all binding types/limits.
Account IDs and token material are never plaintext header fields. Unknown integer format versions
are store_version_unsupported; malformed shape/base64/authentication/binding content is
store_corrupt or binding_mismatch.

Header profileGenerationId is only a bounded untrusted Secret Service lookup hint. It grants no
account access and is not returned as verified state until tag and payload validation succeed.
Retain existing immutable-key attributes/provider checks; zero/locked/multiple/missing results do
not create replacement keys. A valid foreign-origin record fails without dispatching backend/auth
requests.

Keep MAX_STORE_BYTES=268435456 as the maximum opaque vault byte length, not a new domain limit.
Before allocation/read/decode, bound the outer file by `4 * MAX_STORE_BYTES + 65536`, accounting for
nested base64 and fixed metadata. Bound plaintext/decoded fields and reject length amplification
before expensive processing; vault overflow is resource_exhausted. Do not reduce existing allowed
auth request budgets as an implementation shortcut.

## Ownership, replacement and failure

Use Linux x64/Node.js 24 or later and OS Secret Service. Use existing local kernel flock ownership
and holder process; owner.lock moves into profileRoot. Retain restrictive ownership/permissions
(directories 0700/files 0600), symlink-free path traversal, regular-file/link checks and safe
creation/revalidation. Unsafe paths never get a best-effort plaintext fallback. No
filesystem-name/magic allowlist: qualify actual ext4/Btrfs local IO; unexpected missing
primitives/errors fail safely. This is no network/overlay/other-platform support certification.

To replace credentials, write a same-directory O_EXCL private temp fully, handle short writes, fsync
file, rename over credentials.enc, fsync parent, then acknowledge. Creation/setup flushes newly
created directories as needed. There is no multi-file PREPARED/COMMITTED anchor or mutable external
manifest. No commit-sequence/rollback comparison against an independently stored marker. Reuse
proven write primitives.

Before rename is attempted, IO failure leaves the previous record authoritative and reports
io_failure. Once replacement may have occurred, uncertainty/failure reports commit_ambiguous and
fences the handle; only close is allowed. Do not claim unchanged files after possible rename. IPC
loss during a mutation also fences. Reopen authenticates the sole credentials.enc; missing/corrupt
state fails and temporary files are never promoted. An authenticated old or new record can open
after process interruption. Hardware/fsync compliance remains conditional; these checks are not
actual power-loss proof.

Retain sanitized StorageError codes for arguments/platform, provider/key states, store
missing/corrupt/version, capacity, binding/generation mismatch, provisioning, ownership, ambiguous
commit and IO. Retire fence_mismatch and anchor_missing. There is no unsupported-filesystem error
merely because a mount is Btrfs. Runtime maps unsafe credentials/key/format/ownership failures to
recovery_unavailable; trusted CLI distinguishes configuration/fresh-setup/auth-recovery guidance
without exposing native paths/messages, tokens or IDs in diagnostics.

## Auth and lifecycle integration

Keep exact pending-refresh token/body/key persistence before send and returned grant persistence
before evidence removal, using one credential-record replacement. Keep vault versions 1–3 and
foreground login version 4 semantics as currently specified; opaque nested vault bytes retain
existing binding validation. No auth-material format migration is needed for fresh profiles. No new
key for uncertain refresh.

Login success atomically changes verified account/session binding with vault state; remove the
separate metadata publication transaction. Incomplete foreground exchange state remains in the
encrypted vault and is handled by explicit login resume/cancel within its deadline. Trusted
`recover` validates current storage/auth state without repairing ambiguous old metadata or resuming
creation. It can report ready when no foreground auth action is pending, otherwise directs the
existing auth action.

Sign-out fences calls and advances generation while removing usable grants as currently required;
best-effort dedicated-session logout and retained fenced auth cleanup evidence remain.
Account-status proof requirements stay unchanged. Current in-memory origin/account/generation fences
protect sends and result delivery. Restoring an older valid encrypted snapshot is not independently
detected; it may require fresh login and can expose backend refresh-reuse consequences. Do not
describe authenticated encryption as rollback detection.

Explicit profile removal requires stopped/fenced domain/auth work under ownership: delete the exact
verified Secret Service key first, then unlink credentials.enc and known private temps and flush the
directory. Keep owner.lock/root until the owner closes; do not unlink a held lock and permit a
second inode owner. No external removal tombstone. If interrupted after key deletion, retry removal
can finish only through this explicit trusted path after validating the restricted root/header and
confirming that exact key is absent; normal open still fails. Partial provider/IO failure reports
cleanup incomplete, never success. Never recursively delete unknown contents or another profile's
key. Full erasure from backups/hardware is not promised.

The top-level removeProfile factory is a trusted local cleanup entry, never a tool: it
acquires/revalidates ownership and releases it before returning. It does not require a successful
normal open when retrying cleanup after key deletion. With a present key it must authenticate the
full record/origin before deleting that key; with an absent key it can remove only this explicitly
selected restricted record and known temps, never a different key. Missing credentials plus no
unknown content can finish an already-removed root without provisioning anything. Account-status
automatic cleanup still requires its existing authenticated account/proof binding; it cannot use
unauthenticated header hints as deletion authority. The owned-session method performs the same
cleanup without reacquiring a second lock. This avoids an unreachable “retry removal” path after
normal open reports key_not_found.
