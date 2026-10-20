# T04 approved public storage specification — Linux Secret Service

> **T21-S1 successor authority (2026-10-17):** T21 replaces the ext4-only two-store/anchor/rollback-detection and storage API requirements. Retained encryption, key custody, path safety and ownership still apply.
> See the [successor storage/interface spec](t21-single-record-storage-spec.md). Documentation only;
> current runtime/package behavior is unchanged until T21 implementation acceptance.

**Authority:** user-authorized T04, Linux x64 Secret Service, fresh Developer/QA.
Coordinator settles the public design below. This supersedes conflicting T04
proposal/brief candidates, not the shared contracts. **Bounded T04 is accepted
on t04-f4; all execution windows closed.** [Acceptance evidence](../evidence/t04-coordinator-review.md)
records123/123 owning tests plus foundation/T03 and clean locked reproduction.
No real writes, T05/T09 succession, staging/commits or release claim.

Normative references: shared MCP draft0.2 authentication/recoverable-creation,
backend v1 retention, approved T01 foundation, architecture, verification and T04
task. T01/T03 accepted; T02 parked, T13/T14 retired. No shared-contract changes.

## 1. Decisions and scope

- Linux x64, pinned Node24.21.0/npm11.19.0. Primary production filesystem: Linux
  ext4 on explicitly supported local durable storage; observed ext-family magic
  alone is not proof of filesystem/hardware durability. No NFS/overlay/FAT or
  transfers/restores that replace the external anchor. Declare unsupported
  configurations and fail closed. Use the current Linux /proc/self/mountinfo
  table with correctly decoded mountpoint escapes and longest component-boundary
  mount match to identify ext4; verify each actual root. Node24 DOES expose
  fs.statfs/fs.promises.statfs: it may corroborate ext-family magic, but cannot
  by itself distinguish ext4 from ext2/3 or prove durability. Isolated tests may use tmpfs through the
  diagnostic facility, never as a production config/environment bypass.
- Secret Service supplies an immutable random256-bit master key per local
  profile-generation. It does NOT supply the mutable commit anchor. Coordinator
  inspected GNOME Keyring51.1 file-fsync/rename source without identifying a
  parent-directory flush in that path; do not assume method/read-back proves a
  durable external mutable anchor. Missing/lost/locked/duplicate keys fail closed.
- A **separate, encrypted and restricted filesystem anchor root**, outside and
  disjoint from the profile data root, supplies our own file+directory-flushed
  current commit manifest and generation fence. Each root is single-profile.
  Neither may contain the other; aliases/symlinks or the same root are rejected.
  Supported restores copy data-root store files only while the current external
  anchor root and Secret Service key remain intact. The lock is in anchorRoot.
- No fallback to an older manifest: a COMMITTED anchor admits exactly its current
  store digests. PREPARED/PROVISIONING state, stale/missing files or ambiguous
  state fails closed. Whole-machine/whole-state rollback cannot be automatically
  inferred; known unsupported restore/reinstall/transfer requires trusted operator
  reconciliation. No automatic reconciliation/roll-forward/discard in T04.
- Opaque whole-store bytes, separate vault and operations store. T09 owns journal
  structure/permanent reservations/minimization; T06/T07/T12 own credentials,
  exchange/session/lifecycle semantics. No per-operation file CRUD, domain JSON
  serialization, automatic TTL, read cache or backend continuation in storage.
- All protected IO/key custody occurs in one kernel-lease-holding child process.
  Parent-side handles are asynchronous IPC clients; they do not decrypt/read/
  write profile payloads or possess master/subkeys. Nonsecret lock bootstrap and
  descriptor passing are the only permitted parent filesystem operations.

## 2. Dependency/helper approval boundary

`dbus-next@0.10.2` is **not approved**: isolated runtime-only audit reported two
moderate entries (xml2js prototype pollution, GHSA-776f-qx25-q3cc); optional native
surface also requires unnecessary review. No silent overrides/vendor/custom
framing fallback.

Coordinator selects **@homebridge/dbus-native@0.7.8**, MIT, exact integrity:
`sha512-ZXcJzhA2Z3pYsSdQKcDZqELaJHzb5CXALlVHQRg+PHcXqx5xvL83ZPq8HdHCeavxS3pph6d85+zamCb1UFQa5A==`.
Registry: https://registry.npmjs.org/@homebridge%2fdbus-native/0.7.8 .
Disposable install with --ignore-scripts and full audit:16 packages, no optional
native dependencies, zero advisory entries at review time. Audit is not security
certification. Package has a prepublish script; install lifecycle execution is
neither enabled nor required. Production uses only reviewed raw message framing,
not dynamic introspection/exports/service discovery/proxy generation.

Its declarations omit the actual createClient factory and use broad types.
A narrow reviewed **local structural adapter** against the verified runtime
export is permitted, with unknown at the external boundary and runtime checks;
no own-source any, ambient declaration suppression, patched dependency, added
@types package, compiler relaxation or skipLibCheck. If strict compilation cannot
meet this, stop for coordinator review, not a silent cast bypass.

Native kernel helper: installed util-linux flock2.42.4 (flock(2), not --fcntl).
Use direct argv, **--no-fork**, exclusive/nonblocking, conflict exit73. No shell,
--command, --close, addons or install hooks. Node itself has no flock API.
Real provider fixture: portable GNOME Keyring51.1 with gcr3.41.2 library extraction,
private dbus-run-session, disposable HOME/XDG roots and no inherited personal bus.
The version/source/license/archive hashes and initial failure/repaired probe are
recorded in coordinator preflight evidence. This is fixture availability, not
production adapter acceptance or power-loss simulation.

No root manifest/lock edit is allowed until the implementation grant; then only
this exact direct runtime dependency and its locked closure are authorized.
No script/compiler/config edits unless separately approved. No global/system
packages or Pi settings changes.

## 3. Exact public production API

Public entry: src/storage/index.ts -> dist/storage/index.js and readonly .d.ts.
Exact runtime exports: StorageError, isStorageError, provisionProfile, openProfile,
MAX_STORE_BYTES, DIGEST_KEY_VERSION. Root/foundation barrels and their provisional
ProfileStore signatures are unchanged. Server/CLI/companion remain inert.

```ts
export interface StorageBinding {
  readonly origin: string;
  readonly accountUuid: string | null; // null = trusted pre-auth skeleton
  readonly sessionGeneration: number;
  readonly profileGenerationId: string;
}
export interface StorageLocation {
  readonly profileRoot: string;
  readonly anchorRoot: string;
}
export interface StorageAccess {
  readonly secretServiceBusAddress: string;
  readonly timeoutMs?: number; // default5000; safe integer1..15000
}
export interface ProvisionRequest extends StorageLocation, StorageAccess {
  readonly origin: string;
  readonly profileGenerationId: string; // trusted fresh local UUID, never reused
}
export interface OpenRequest extends StorageLocation, StorageAccess {
  readonly expectedBinding: StorageBinding;
}
export interface StoreUpdate {
  readonly vaultBytes?: Uint8Array;
  readonly operationBytes?: Uint8Array;
}
export interface ProfileSession {
  readonly binding: StorageBinding; // deeply frozen capture, not mutable epoch
  readVaultBytes(): Promise<Uint8Array>;
  readOperationStoreBytes(): Promise<Uint8Array>;
  commit(update: StoreUpdate): Promise<void>;
  bindAccount(accountUuid: string, replacementVaultBytes: Uint8Array): Promise<StorageBinding>;
  advanceSessionGeneration(replacementVaultBytes: Uint8Array): Promise<StorageBinding>;
  keyedIntentDigest(identityMaterialUtf8: Uint8Array): Promise<Uint8Array>;
  close(): Promise<void>;
}
export const MAX_STORE_BYTES: 268435456;
export const DIGEST_KEY_VERSION: "gymtracka-digest-v1";
export function provisionProfile(request: ProvisionRequest): Promise<ProfileSession>;
export function openProfile(request: OpenRequest): Promise<ProfileSession>;
export function isStorageError(value: unknown): value is StorageError;
export type StorageErrorCode =
  | "invalid_argument" | "unsupported_platform" | "key_not_found"
  | "key_locked" | "key_ambiguous" | "key_unavailable" | "provider_failure"
  | "store_missing" | "store_corrupt" | "store_version_unsupported"
  | "resource_exhausted" | "binding_mismatch" | "generation_mismatch"
  | "fence_mismatch" | "anchor_missing" | "already_provisioned"
  | "incomplete_provision" | "not_provisioned" | "locked_by_other_owner"
  | "not_owner" | "commit_ambiguous" | "io_failure";
export class StorageError extends Error {
  readonly code: StorageErrorCode;
  constructor(code: StorageErrorCode);
}
```

No extra runtime exports, optional key/provider/test flags or wait/release/
reacquire APIs. Factories acquire fail-fast ownership before returning; close
ends it. CLI/server coordination is stop/close owner then open, not live IPC
handoff. Returned binding is private trusted-process context, never tool output.

Arguments are exact own-data shapes, no unknown fields/coercion/accessor invocation
or cycles. Only actual Uint8Array/Buffer byte views are accepted; reject SharedArrayBuffer
backing (no cross-thread snapshot guarantee), detached/invalid views and array coercion. UUIDs canonical lowercase; generations nonnegative safe integers;
canonical configured HTTPS origin (no credentials/path/query/fragment). Storage
performs no network authentication. Roots absolute without symlink components;
reject unsafe/overlapping locations. Bus address is one Unix filesystem address
(optional valid guid), never tcp/abstract/unixexec/multiple fallbacks. No ambient
bus discovery. Deadline covers each whole factory/call, not a renewed timer for
every D-Bus subcall; deadline failure fences an uncertain commit.

Each explicit call validates/copies its byte arguments **before queuing/awaiting**;
reads/digests return independent copies. Calls serialize reads as well as writes,
close and generation changes; no overlap between two handles/processes. Empty
updates reject; zero-length store payloads are valid. Binding getter remains the
original frozen capture after a transition. All old-capture methods except close
then fail generation_mismatch; caller closes and opens with returned new binding.
Double close succeeds; methods after close fail not_owner. Close also releases
stale/fenced/key-unavailable handles; it does not require renewed key access or
silently finalize an uncertain transaction. No implicit startup IO.

Error precedence for single-fault cases (tests must not infer it from implementation):
malformed/overlapping/relative locations or bus syntax => invalid_argument;
unsafe link/owner/mode/type/nlink/traversal => io_failure; unsupported OS/filesystem
=> unsupported_platform. Both roots absent on open => not_provisioned; missing
external root/lock/anchor with surviving profile => anchor_missing; missing required
data file against an otherwise valid anchor => store_missing. Failed Unix connect/
absent org.freedesktop.secrets/missing default collection => key_unavailable;
connected-provider timeout, malformed reply/key, unsupported encrypted algorithm
=> provider_failure. Sole missing master => key_not_found; locked => key_locked;
duplicates => key_ambiguous. Wrong canonical supplied profile-generation may first
hit key_not_found (lookup cannot recover another generation's key). After successful
key lookup, origin/account mismatch => binding_mismatch; session epoch mismatch
=> generation_mismatch; root/lock/current digest mismatch => fence_mismatch.
Recognized unknown envelope version precedes digest mismatch and fails
store_version_unsupported; malformed magic/family/length or anchor AEAD failure
=> store_corrupt. Capacity/counter overflow => resource_exhausted. PREPARED/uncertain
anchor-attempt or post-rename failures => commit_ambiguous; definite pre-prepare
filesystem persistence failure => io_failure. Multiple simultaneous faults need
only fail closed without side effects, not reveal a diagnostic oracle.

## 4. Pre-auth/account/session binding

Trusted provisioning creates origin-bound pre-auth state with accountUuid=null,
sessionGeneration=0 and the supplied unused profileGenerationId. Vault and
operations initial payloads are empty byte arrays, not invented T09 JSON. This
allows T07 foreground exchange evidence to be protected before backend dispatch.
No browser/login or auth requests exist here; T07 clears Google credential-bearing
evidence on settlement/expiry as specified in the shared contract.

bindAccount is one-way, only from null to a trusted service-confirmed UUID; it
atomically installs replacementVaultBytes, rebinds/re-encrypts store metadata and
sets sessionGeneration=1. Rebinding an already-bound profile rejects
binding_mismatch even to the same account. No account switching/migration.

advanceSessionGeneration requires a bound profile, increments exactly1 (overflow
rejects resource_exhausted) and atomically commits replacementVaultBytes with the
new generation/fence. Caller supplies cleared vault on sign-out or confirmed
replacement grant on trusted same-account replacement. Operations remain exactly
the same bytes. Return new frozen binding; invalidate old capture. No separate
vault-then-generation acknowledgments that leave old credentials usable after a
reported generation fence. Session generation is authenticated in external anchor,
not a reason to regenerate existing immutable operation bytes.

## 5. Durable storage format and external anchor

Layout (all child paths fixed, never from operation IDs):

```
profileRoot/vault.bin
profileRoot/operations.bin
anchorRoot/owner.lock
anchorRoot/anchor.bin
anchorRoot/INCOMPLETE
```

Roots0700, files0600, euid-owned; no group/other access, links, nonregular store/
anchor/lock files or nlink>1. Existing unsafe roots/files reject, no chmod repair.
Ancestor path assumptions: trusted root-owned or euid-owned traversal, sticky
system temp parent allowed for isolated fixtures. Active same-UID adversaries,
ptrace and concurrent ancestor swaps inside one syscall window are excluded;
O_NOFOLLOW+lstat is not claimed as race-free openat traversal. State and stable
lock descriptor identity are revalidated before each call/commit; use bigint stat
identities, never rounded inode/dev comparisons. Holder scans its own fdinfo and
fstats candidates: exactly one WRITE FLOCK lease description for fd3's expected
inode/device is required; zero/multiple matches deny before key/data IO. The
unlocked passed fd3 is not itself proof of lease ownership. Invalid/missing/
multiple inherited lease proof => commit_ambiguous; only actual kernel conflict
exit73 => locked_by_other_owner. No fixed guess for
flock's extra descriptor number, no PID/time stale-owner admission. No lock path
unlink/replacement by this implementation or supported restore procedures.

Every envelope uses magic GTMS2 (5 bytes), version u16BE=1, family u8
(vault1, operations2, anchor3), random256-bit salt, random96-bit nonce,
plaintextLength u64BE, ciphertext of that length, GCM tag128 bits. Header length
60 bytes, exact total=76+plaintextLength. Length/overflow/version/family gates
precede allocation; magic/shape/authentication fail store_corrupt; recognized
unknown version fails store_version_unsupported. Sensitive metadata is encrypted
inside the payload or supplied as AAD, not stored as identifying cleartext header.

HKDF-SHA25632-byte record key from immutable master and the header's random salt;
info is UTF8 `gymtracka-storage-v1:<family>` with family vault/operations/anchor.
AES-256-GCM data-store AAD is complete header bytes followed by UTF8 JSON of
`[origin, accountUuid, profileGenerationId]` (exact array order, no whitespace). Anchor key context must be recoverable with the
supplied profileGenerationId before comparing its decrypted binding; therefore
its AAD is complete header bytes followed by UTF8 profileGenerationId (not caller's
mutable account/session generation). Validate full decrypted binding before exposing data.
Per-envelope salts plus nonces give probabilistic key/nonce collision resistance,
not impossible reuse. No claim that acknowledged sequence bounds unacknowledged
encryption attempts. The ADR must justify CSPRNG/HKDF/AEAD usage and scrub owned
key buffers on close; no complete V8 memory-erasure guarantee.

Encrypted anchor payload: exact versioned own-data record with phase
PROVISIONING/PREPARED/COMMITTED, seq canonical UInt64 decimal string, current
binding, current SHA256 digests of the **entire encrypted** vault/operation files,
canonical root identity commitments (both absolute canonical paths, directory
st_dev/st_ino and euid; exact integer values encoded as canonical decimal strings)
and stable lock dev/ino. These are inside ciphertext only; no identifying cleartext
paths in headers or ordinary diagnostics. PREPARED additionally
retains target binding/digests and target seq for diagnosis, NOT for automatic
fallback/roll-forward. Anchor is authenticated encrypted state, not an OS key file.
Unknown/malformed anchor state fails closed. Duplicate/version/counter issues
cannot be repaired by choosing a new generation.

COMMITTED requires both required files to match current digests and binding.
Data-file order is structural header/length/recognized-version gates, then whole-
file digest comparison, then expected-family/AAD/tag decryption. Unknown family is
store_corrupt; a well-formed recognized sibling-family blob normally hits the
current digest mismatch first (fence_mismatch); a matching digest with wrong
expected family still rejects store_corrupt. Data ciphertext/tag damage with an
otherwise well-formed header fails fence_mismatch; anchor AEAD damage fails
store_corrupt. Missing=store_missing, unsupported recognized version precedes
digest comparison as specified.
Missing external anchor=anchor_missing; PROVISIONING/INCOMPLETE=incomplete_provision;
PREPARED=commit_ambiguous regardless of matching old/new files. No previous-manifest
acceptance after success; restoring the immediately previous acknowledged state
is an explicit required negative test, not a crash-recovery exception.

## 6. Provision and commit protocol

Provision/bootstrap: create only new restrictive anchor root/lock if needed,
acquire lease, validate uniqueness of Secret Service namespace and empty/new data
root. INCOMPLETE is an empty regular0600 file, existence-only; never returned or
interpreted as user content. Any existing key, anchor, state or incomplete marker denies reprovisioning
(already_provisioned/incomplete_provision); missing state is never initialization.
Trusted supplied profile-generation IDs are reserved by the external key/fence;
never regenerate them during open/error recovery. New roots require genuine trusted
reconciliation of old uncertain work; no routine-name deduplication.

Persist INCOMPLETE marker and PROVISIONING anchor with restrictive durable writes;
create the immutable OS-backed key (encrypted-session write/read-back), initial
encrypted stores, complete COMMITTED anchor, then durable marker removal before
return. Exact key-vs-anchor ordering must ensure either durable incomplete marker
or existing key remains after every first side effect; fail closed on any residual
partial state. Generations reserved by a durable provisioning marker/key are not reused or
silently cleaned into an apparently fresh existing profile. A failure at
lock.acquired before the first protected reservation has only nonsecret bootstrap
effects and does not consume a fresh generation; trusted retry is allowed. Only
AFTER INCOMPLETE is durably removed AND initialization is complete does a lost
factory reply permit exact current open while denying reprovisioning. A still-
present INCOMPLETE marker blocks open even if COMMITTED bytes/stores are valid;
open and reprovision report incomplete_provision. No marker plus existing key/
anchor/stores => already_provisioned on reprovision. Keep durable failure marker/reservation; no
best-effort destruction of all evidence. Master-key disappearance denies opening.
Opening never creates roots/stores/key/fence, nor treats residue as valid emptiness.

Failed factory calls terminate/reap their lease holder before rejecting (no
unreturned live handle/secret-owning worker left behind). No state is silently
reset as part of that cleanup.

A state transition (including vault+operations update or binding advance):

1. Validate complete update/resource headroom/binding/lease/current anchor.
2. Prepare new envelopes in same-directory unique temps; full writes, fsync files
   and required temp-parent metadata before declaring them ready.
3. Durably replace external anchor with PREPARED(old and target commitments).
4. Install changed store files by rename, fsync every affected parent directory;
   unchanged stores keep exact old encrypted bytes/digest.
5. Durably replace external anchor with COMMITTED target manifest and binding;
   file fsync + anchor-directory fsync. Resolve success only afterward.

Every atomic replacement uses O_EXCL temp0600, complete short-write handling,
file fsync, rename, parent fsync; flush root creation/marker/unlink as required.
No cross-filesystem rename assumptions. A filesystem persistence failure before any attempted PREPARED write leaves old
committed state usable with io_failure (argument/binding/key guards retain their
specific codes); once an external anchor write may have occurred, or after any
store rename, return commit_ambiguous and permanently fence the handle. A later explicit open admits only an authenticated
COMMITTED current manifest, otherwise fails closed. Never promise old files are
untouched after a post-rename failure. Preserve uncertain evidence; T04 supplies
no reset/reconciliation method or automatic startup continuation.

Unused temps are never read as state, do not count as empty stores, and are
removed only under lease when safe without erasing a PREPARED/incomplete record.
Corruption/unknown versions/missing keys have no repair side effects.

Durability guarantee is conditional on local filesystem/storage honoring fsync;
process-kill tests are evidence for process-kill behavior, not actual power loss.
Record exact filesystems/helper/provider versions and syscall/source-review limits.
OS keyring stores only immutable key: losing it yields key_not_found before any
new write; its missing directory-fsync evidence cannot roll a mutable commit anchor
back because the mutable anchor is our separately flushed filesystem record.

## 7. Kernel lease/holder and IPC

Parent safely opens/creates the nonsecret stable lock file for provision (open
existing for open); validates its inode/type/ownership/mode; passes its descriptor
as child fd3 and closes the parent's copy immediately. Spawn flock with direct
argv `--no-fork --exclusive --nonblock --conflict-exit-code 73 /proc/self/fd/3`
followed by the exact current Node executable and internal holder artifact.
stdin/stdout/stderr/IPC explicitly configured; no shell or private credentials/
identities in argv/environment. IPC can be fd4 via Node spawn IPC; never leak it
or the lease descriptor to descendants. The holder starts only with the private
IPC channel AND a verified inherited matching flock lease (fdinfo inspection on
Linux); direct invocation without a lease fails closed before protected IO.

Flock no-fork exec preserves the kernel lease into the holder; do not use the
default forked supervisor then assume its death releases the IO worker's lease.
Holder alone validates/decrypts stores, contacts private key facility, writes and
holds keys. Parent may marshal copied bytes only. Reject conflicting inode/root
identity even if a newly-created lock file was acquired; it is not the old lease.

Holder exit/IPC loss permanently fences its parent handle and outstanding replies:
in-flight and subsequent calls fail commit_ambiguous (close still succeeds). Unknown,
malformed or unparseable worker error/reply records likewise fence with
commit_ambiguous; terminate/wait the lease holder before any release report, never
map a possibly completed mutation to a clean io_failure.
Parent death closes IPC; holder stops admitting work and exits after conservatively
settling or fencing an in-progress local commit. Kernel ownership persists until
that holder exits, so a competing owner never races a surviving unlocked IO worker.
No heartbeat/time/PID stale-owner guessing. Deadline failure must terminate/close
the lease-owning worker before reporting release; cannot merely abandon an alive
worker and grant another. Child stderr/native errors are drained but NOT echoed,
retained or included in parent errors; IPC error records contain sanitized codes
only. Explicit helper execution may register cleanup handlers, imports may not.

## 8. Secret Service subset and digest

Use raw reviewed D-Bus framing over a strictly validated Unix socket; no package
ambient-address fallback, TCP/unixexec, dynamic introspection or autostart helpers.
Use direct/manual Hello to avoid dependency's raw thrown Hello failure; wrap and
bound all calls, close socket/session on timeout/close. No plaintext secret session:
algorithm is exactly dh-ietf1024-sha256-aes128-cbc-pkcs7 (NOT the string dh).
Follow the published standard DH parameters/HKDF/AES-CBC-PKCS7 byte encoding;
validate server public key and reply shapes; no invented crypto/framing fallback.
This legacy local Secret Service transport is not Internet TLS or modern DH
strength certification; relies on the protected same-user Unix bus trust boundary.

Supported provider fixture is GNOME Keyring51.1 persistent unlocked login/default
collection; ephemeral session collections are not production key facilities.
ReadAlias("default") and locked-property/owner availability checks first; supported
persistent collection object is /org/freedesktop/secrets/collection/login;
ephemeral or other unqualified provider collections deny key_unavailable.
Unavailable/missing/locked collections deny. No CreateCollection, Unlock or Prompt invocation
in production. Exact reserved item attributes are
`{"x-gymtracka-profile": profileGenerationId, "x-gymtracka-key-v": "1", "x-gymtracka-role": "master"}`;
fixed label `GymTracka MCP profile key`. Search these across locked+unlocked
matches; total0 => key_not_found, >1 => key_ambiguous,
locked sole item => key_locked. Fixed non-identifying label; no account/origin/
resource/body attributes. Provision requires zero prior reserved items, creates
one immutable32-byte raw secret with replace=false, validates exact encrypted-session
read-back and
uniqueness. Never replace/create a lost key on open. Before each protected read,
commit, binding transition or digest, recheck facility availability/uniqueness and
the same immutable key; missing/locked/unavailable state is not bypassed with a
cached key. A changed key within an open holder is provider_failure, no rotation.
Closing remains possible without the key. No background watchers required.

Digest derivation is stable across same-account session generations: HKDF-SHA256
32 bytes with empty salt and info UTF8 `gymtracka-digest-v1` + zero byte + origin +
zero byte + accountUuid + zero byte + profileGenerationId (not session generation). HMAC-SHA256 over DIGEST_KEY_VERSION UTF8 + zero byte + exact input
identity-material bytes. Async through holder; no key returned. Null-account
skeleton digest call rejects binding_mismatch. T03's identity version/material
is retained by T09 separately; T04 does not normalize input or allocate resource
IDs. Keys never rotate/rebind for retained bound-account receipts.

## 9. Capacity, errors, import and diagnostics

MAX_STORE_BYTES256MiB per plaintext store is an explicit operational memory/IPC/
persistence budget, NOT a new tool/domain validation cap. Over-budget calls fail
resource_exhausted before commit; no truncation/eviction/TTL/automatic retirement.
T09 must reserve all required journal/confirmation metadata headroom before
admission and keep interrupted operations durably recoverable if a later actual
IO failure occurs. API caller can check the public constant; capacity failure
must never be represented as invalid input or a successful backend no-op.
No approval to cap T03 input schemas/names/exercise counts.

StorageError has code and message exactly `Storage failure: <code>.`, name
StorageError, stack exactly `StorageError: Storage failure: <code>.` (no native
stack paths), no cause/native/path/payload/ID fields. Runtime invalid constructor
codes become invalid_argument without echoing them; no caller-supplied message.
Error-code fields are immutable at runtime; parent reconstructs sanitized errors
from validated worker codes, never raw serialized Error objects. No stdio on imports/calls except
internal worker IPC. Imports of production/holder/diagnostic artifacts are inert,
including arbitrary argv; direct internal-holder-without-lease behavior is a
sanitized failure, no protocol/login/private-state discovery.

Separate diagnostic entry dist/storage/test-facility.js, never imported by the
production barrel/holder. Exact runtime exports: createStorageTestFacility,
attachStorageTestFacility. Public diagnostic types:

```ts
export interface TestFacilityTicket {
  readonly root: string;
  readonly capability: string; // runtime-issued synthetic fixture cookie, not an OS key
}
export type StorageFaultPoint =
  | "lock.acquired" | "provision.marker.durable" | "provision.key.stored"
  | "provision.stores.durable" | "provision.anchor.committed"
  | "provision.marker.removed" | "commit.before.prepare"
  | "commit.anchor.prepared" | "commit.vault.renamed" | "commit.vault.synced"
  | "commit.operations.renamed" | "commit.operations.synced"
  | "commit.anchor.committed" | "commit.anchor.synced" | "commit.reply"
  | "fs.write" | "fs.fsync.file" | "fs.rename" | "fs.fsync.directory";
export interface StorageFault {
  readonly point: StorageFaultPoint;
  readonly action: "throw" | "kill-holder";
  readonly occurrence?: number; // positive safe integer, default1
}
export interface DiagnosticSession extends ProfileSession {
  readonly holderPid: number; // only this issued diagnostic worker, never a guessed owner
}
export interface StorageTestFacility {
  readonly ticket: TestFacilityTicket;
  readonly locations: StorageLocation;
  readonly profileGenerationId: string;
  provision(origin: string): Promise<DiagnosticSession>;
  open(expectedBinding: StorageBinding): Promise<DiagnosticSession>;
  armFault(fault: StorageFault): Promise<void>;
  clearFault(): Promise<void>;
  setKeyState(state: "available" | "missing" | "locked" | "ambiguous" | "unavailable"): Promise<void>;
  cleanup(): Promise<void>;
}
export function createStorageTestFacility(): Promise<StorageTestFacility>;
export function attachStorageTestFacility(ticket: TestFacilityTicket): Promise<StorageTestFacility>;
```

Creation mints one new restrictive OS-temp synthetic facility root/cookie/key and
fixed profile/anchor children; no arbitrary root/key/provider arguments. Root
contains `facility.json` with issued ticket/UUID metadata, `synthetic.key` (32 bytes,
fixture-only plaintext,600), `controls.json` for consumed fault/key-state controls,
and the two fixed child roots `profile/` and `anchor/`. No production key is written
there or exposed; disk inspection of these synthetic runtime files is permitted.
The issued synthetic.key bytes are stable for that issued profile-generation from
facility creation through provision/bind/advance/close/reopen; the diagnostic
backend initializes/reserves that same key, not a second unrelated random master.
No lost/changed key recreation. Production still mints its new immutable key only
inside the lease-owning trusted production provisioning path. Attach
requires its issued marker, matching cookie, canonical fixed child paths and
ownership/link/mode validation; no arbitrary production roots. Tickets permit QA
subprocess/restart tests, not production config switching. Synthetic key state
and armed faults are diagnostic-only durable controls under the issued root;
consumed fault rules do not re-arm after a killed worker. armFault resolves before
subsequent calls observe it. Named semantic points fire after the named event; lock.acquired applies only to
provision/open acquisition, not commits on an already-held lease or diagnostic
cleanup. Changed-store rename/sync points fire only when that store changes.
fs.* points fire immediately before storage-engine syscalls (occurrence counts
only matching operations, excludes diagnostic-control IO). Prepared-anchor atomic
write attempt begins before its temp write; failures from that attempt fence even
if the final rename has not happened. Exceptions before any PREPARED attempt produce safe
old-state io_failure; uncertain anchor/rename phases fence with commit_ambiguous.
Killing after complete durable commit/reply boundary permits a fresh explicit open
of exact current state, never the prior manifest. A full completed provision whose
reply is lost is not an incomplete profile; its generation remains reserved.

Diagnostic malformed arguments/unknown fields/invalid fault/key-state values and
invalid/nonissued/absent/wrong-cookie tickets reject invalid_argument; unsafe link/
owner/mode/type paths reject io_failure. Cleanup is idempotent for the originally
issued facility object once its root has been removed; it never attaches an absent
root or removes a different replacement root (refusal io_failure).

cleanup only removes that issued root after all holders are closed; contention
fails locked_by_other_owner, never PID/time-based killing or private path deletion.
holderPid supports explicit killing of the fixture's own worker in QA fault tests,
not production ownership guessing. Runtime issuance/link checks, not TS branding
alone, restrict facilities. No production master key access or test activation via
production env/CLI/config; production factories reject unknown test/provider fields.
Use the same compiled persistence/lease logic under a separate diagnostic worker.
Independent QA owns tests and actual provider wrappers; no reverse-engineering.

## 10. Acceptance and ownership

Developer intended scope: src/storage/ (including inert internal holder),
docs/decisions/t04-implementation-adr.md, the exact approved dependency/lock closure
and docs/compatibility.md for precise unverified/observed boundaries. No foundation
source/barrel changes or other config/script/dependency edits. QA intended scope:
test/unit/t04/, test/fault/t04/, docs/evidence/t04-qa-* and synthetic owning fixtures.
Coordinator owns this spec, status/work order and integration evidence. Test-source
and implementation windows are separate grants; QA execution follows frozen relay.

Required cases include: immediate-previous acknowledged snapshot rejected against
current anchor; all partial/PREPARED crash points fail closed; acknowledged current
bytes survive reopen; cross-account/generation, tamper/swap/missing/unsafe paths/
key/version reject; no phantom operation store; exact/copy byte behavior; two
processes/holder or parent death/kernel lease/inode replacement/no unlocked IO;
atomic vault+generation fence while retaining operations; pre-auth one-way bind;
no nonce/counter false claim; over-budget refusal without eviction; isolated real
provider production-adapter encrypted-session transfer, locked/missing/duplicate/
timeout errors and cleanup; diagnostic separation, sanitized errors/imports;
foundation100/T03221 regressions on a frozen artifact. No skips or mock-only OS pass.

Commands after grant: Developer permitted install/typecheck/lint:production/
format:check:production/build only; QA/coordinator owning T04, foundation smoke and
T03 regressions after relay. No parked scenarios/whole-suite claim. Final coordinator
source review and clean allowlisted locked source-snapshot reproduction required.
Storage portions of A03-A04/A07-A09/C07/R01/R11-R12 only; no refresh, backend replay,
config guard, host interoperability, actual writes or release certification.
