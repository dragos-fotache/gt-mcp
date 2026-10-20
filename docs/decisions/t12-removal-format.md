# T12-S2 — External removal fence and trusted reconciliation

> **T21-S1 successor authority (2026-10-17):** T21 replaces external removal/reconciliation fences with the successor single-record explicit cleanup protocol; operation retirement is removed. Account-proof/auth cleanup requirements remain.
> See the [successor storage/interface spec](t21-single-record-storage-spec.md). Documentation only;
> current runtime/package behavior is unchanged until T21 implementation acceptance.

Authority: [approved T12 plan](t12-plan-and-slices.md),
[S2 work order](../tasks/t12-s2-work-order.md), shared MCP draft0.2
[journal lifecycle](../../shared-docs/docs/mcp-contract/routine-creation.md#journal-lifecycle-selected).
This is an additive local persistence/API decision, not a shared-contract revision.

## Holder-owned interface

The existing production storage entry retains its six runtime exports. Its
provision/open factories now return `LifecycleProfileSession extends ProfileSession`,
adding `removeProfile(): Promise<void>` and
`verifyRemovedProfile(removedBinding): Promise<void>`. These are trusted local
capabilities, never tools or operation arguments. The latter checks a completed
old fence under the current actual owner for reconciliation publication recovery.
After removal, ordinary methods on that capture reject; close always releases.

The separate inert `storage/lifecycle` entry exports
`resumeProfileRemoval(OpenRequest): Promise<LifecycleProfileSession>` and
`provisionReconciledProfile(ProvisionRequest & {removedBinding: StorageBinding})`.
Both use the existing holder/IPC/lease path. Resume recognizes only a recorded
external fence; its returned removal handle can finish pending cleanup but cannot
read/commit old stores. Reconciled provision requires completed source/all retained
fences at the same committed location, a distinct target generation and empty
storage. No lock/root deletion or separate competing ownership implementation.

Trusted configured `removeLoginProfile({configPath},signal)` and
`reconcileLoginProfile({configPath},signal)` compose protected T07 metadata and
these capabilities. Reconciliation records its transition while holding the
removed owner, releases it, and reacquires the same persistent lock through the
new provision holder. The pending metadata blocks ordinary CLI/login during that
gap; the new holder revalidates all fences/roots and refuses existing material.
No destructive or provisioning operation runs without the actual exclusive lease.

## Version1 external record

File name: `removed.<canonical profile-generation UUID>.json` under anchorRoot.
Restricted0600 regular file, one link, current-euid ownership, strict JSON with
no duplicate/unknown fields; reads bounded to65536 bytes. Unknown versions/states
fail closed. No old key is needed to parse or validate location commitments.

Both phases contain exactly `version:1`, `phase`, `profileGenerationId`, `profile`,
`anchor`, `lock`, and `euid`. Profile/anchor commitments contain canonical path,
decimal bigint device/inode; lock contains device/inode. They must match current
safe restricted roots and the actual lease. Roots and lock remain after removal.

Pending phase additionally requires exact `binding`, `keyDigest` and `files`.
Binding captures origin/account/session/profile generation. KeyDigest is SHA256
of the random master key, used only privately to refuse a replacement key during
cleanup. Files capture the root selector, exact owned name, device/inode,
ctimeNs and whole encrypted-file SHA256. Required manifest entries are vault.bin,
operations.bin and anchor.bin, plus existing exact storage-temp families. No
arbitrary relative paths or recursive cleanup. A replaced/changed/linked file
fails closed even if its inode is reused. Already-unlinked entries are harmless.
Unknown profile-root files prevent intent or completion rather than being erased.

Complete phase forbids binding/keyDigest/files. It retains no account identifier,
operation body/result or deletion-receipt history. Retained generation/location
commitments alone permanently deny old-generation opens and normal provisioning.
The private operator config still names the location. The redacted unbound
binding descriptor retains origin/profile generation but no account identifier.
Whole external-state restore/removal, runtime/media/backups erasure and malicious
concurrent same-UID filesystem/provider mutation remain outside the T04 trust claim.

## Durable order and interrupted recovery

1. Acquire actual holder; verify binding, root/lock, committed encrypted stores and
   current unique usable provider key. Prepare protected removal metadata receipt.
2. Snapshot owned file identities and durably atomically install pending external
   fence. Fence the handle even on an ambiguous intent-write failure. No erasure
   precedes accepted durable external intent.
3. Recheck location and each surviving manifest identity/digest; unlink only those
   files and sync both directories. A missing old data file after intent is valid
   progress. Unexpected remaining profile material prevents completion.
4. Recheck location. Fresh production Secret Service connection searches the whole
   reserved generation namespace, then exact attributes. Refuse locked, ambiguous,
   foreign, unknown-version or changed-secret items. Read via DH, match keyDigest,
   delete only that unique item without prompting and verify namespace absence.
   Absence is allowed only while executing already-recorded removal, never normal
   storage admission. Provider uncertainty leaves the external fence effective.
5. Minimize the external record to complete and sync it. Publish a descriptor with
   null account/sessionGeneration0 for the same removed generation; clear matching
   abandoned descriptor temp files and the metadata receipt with directory sync.
   Never acknowledge completed removal before all scoped cleanup settles.

Explicit recover with a removal receipt finishes a recorded fence without login,
Google proof or old-key decryption. If no external fence exists, it must verify
an intact unchanged source and reconcile publication back to that source; it does
not create removal intent from missing/corrupt data. Source recovery is not removal.
A complete external fence can finish interrupted descriptor minimization. Repeated
trusted removal/completed cleanup is harmless while no new generation exists.

Strict additive LoginReceipt v1 kinds retain the existing five fields:
`remove` maps a nonnull source to the same generation/origin with null account and
sessionGeneration0. `reconcile` maps a removed unbound source to a distinct unbound
generation at the same origin. Existing provision/install/sign-out shapes persist.
Reconciled setup creates a fresh key and empty encrypted stores, preserves fences
and never imports old IDs or deduplicates remote routines. Recover recognizes a
completed empty target only after verifying the old completed fence under its
owner, or verifies an unchanged clean removed source. Interrupted T04 provisioning
with INCOMPLETE/ambiguous state remains fail-closed; it is not a generic reset path.

CLI confirmation expresses destructive local intent, not per-routine approval.
Warnings must reach stderr before work. Cancellation before preparation prevents
action; after preparation it marks interruption while durable work/publication/
owned release settle. No backend DELETE, logout, HTTP, status proof or MCP write
is dispatched by removal/reconciliation/recovery. S3 account-status and S4 parent
integration/clean replay remain separate assignments.
