# T04 Developer storage proposal — feasibility review against the approved spec (rev. 3)

**State:** API/implementation-feasibility review ONLY, per the updated work
order. The coordinator-approved public storage specification
(`docs/decisions/t04-approved-storage-spec.md`, with preflight
`docs/evidence/t04-coordinator-preflight.md`) is the sole governing design;
this proposal's rev. 1/rev. 2 candidates stand superseded wherever they
conflict with it. NOT approved for implementation, dependency/manifest edits,
or target execution — no production/manifest/dependency/check/test
writes or runs in this window.
**Owner:** Developer. **Write scope:** `docs/decisions/t04-storage-proposal.md`
(this file) only. No QA tests/fixtures/plans/evidence/diffs read. No personal
bus/keyring, credentials, staging, or commits. No repository commands run.

## 1. Feasibility confirmation

The exact approved production + diagnostic surface is implementable as
specified on pinned Node 24.21.0 with `node:crypto`/`node:fs`/`node:child_process`
only, plus the single approved candidate `@homebridge/dbus-native@0.7.8`
(installed only under the later grant, `--ignore-scripts`, locked closure).
Confirmed point by point:

- **API shape (§3):** `StorageBinding` (nullable pre-auth account),
  `StorageLocation` (disjoint `profileRoot`/`anchorRoot`),
  `StorageAccess` (single Unix socket address + whole-call deadline),
  caller-supplied fresh `profileGenerationId`, atomic `commit(update)`,
  one-way `bindAccount`, atomic `advanceSessionGeneration`, async holder
  digest, `MAX_STORE_BYTES`/`DIGEST_KEY_VERSION` constants, fixed
  `StorageError` (message and stack exactly `Storage failure: <code>.`, no
  cause/paths/IDs), `isStorageError`. Factories acquire fail-fast ownership
  before returning; `close()` ends it; stop/close-then-open coordination.
  Argument validation (exact own-data shapes, real `Uint8Array`/`Buffer`
  only, SharedArrayBuffer/detached/array rejection via buffer-kind checks +
  copy-in-try/catch, canonical lowercase UUIDs, safe-integer generations,
  credential-free HTTPS origins, absolute symlink-free disjoint roots,
  socket-address allowlist) is all implementable dependency-free. No extra
  runtime exports proposed.
- **Envelope/crypto (§5):** GTMS2 / v1 / family / 256-bit salt / 96-bit nonce /
  u64BE length / ciphertext / 128-bit tag (60-byte header, total
  76+plaintext) via `createCipheriv("aes-256-gcm")`, HKDF-SHA256 record keys
  (`hkdfSync`, info `gymtracka-storage-v1:<family>`), header+JSON AAD for
  data stores and header+profileGenerationId AAD for the anchor, SHA-256 file
  digests. Length/overflow/version/family gates before allocation. No new
  crypto dependency needed.
- **Anchor protocol (§§5–6):** disjoint encrypted `anchorRoot/anchor.bin`
  with PROVISIONING/PREPARED/COMMITTED phases, seq decimal string, full-file
  digests, binding + root commitments + lock dev/ino; COMMITTED-current-only
  acceptance; PREPARED always fences (`commit_ambiguous`, handle permanently
  fenced, explicit reopen only); O_EXCL temps, short-write handling, file +
  parent-dir fsync discipline, same-directory renames. Crash matrix is
  implementable exactly as written (pre-PREPARED failure → old state +
  `io_failure`; at/after possible anchor write or any rename →
  `commit_ambiguous` + fenced handle).
- **Lease/holder/IPC (§7):** parent opens/validates the nonsecret lock file,
  passes the descriptor as child fd3, closes its copy, spawns
  `flock --no-fork --exclusive --nonblock --conflict-exit-code 73
  /proc/self/fd/3 <node> <holder>` with direct argv (no shell), IPC-isolated
  stdio; holder verifies the inherited lease via fdinfo before any protected
  IO and fails closed on direct invocation; all decryption/store/key work
  confined to the holder; parent marshals copies only; holder-exit/IPC-loss
  permanently fences the parent handle; parent death closes IPC and the
  holder settles-or-fences then exits; deadline failure kills the worker
  before reporting. No Node flock API assumed. Sanitized IPC error records
  with parent-side code-allowlist reconstruction.
- **Secret Service subset (§8):** single validated Unix socket, manual
  bounded Hello, `dh-ietf1024-sha256-aes128-cbc-pkcs7` with published
  parameters (implementable: `getDiffieHellman("modp2")`-class DH +
  HKDF-SHA256 + AES-128-CBC with default PKCS#7 padding — all `node:crypto`;
  legacy-transport disclaimer acknowledged), persistent-collection use only,
  no CreateCollection/Unlock/Prompt, reserved-attribute search with
  0/1/>1/locked mapping, immutable 32-byte provision with encrypted-session
  read-back + uniqueness check, never recreate-on-open. The `dbus-native`
  structural adapter (unknown at the boundary, runtime-checked, no `any`,
  no declaration suppression, no new `@types`) is accepted with the
  stop-for-review rule if strict compilation resists it.
- **Digest (§8):** HKDF (empty salt, zero-byte-separated info incl. origin/
  account/generation-id, never session generation) + HMAC over version +
  0x00 + identity bytes, async through the holder, skeleton rejects. T03
  bytes stay opaque (no normalization here).
- **Diagnostics (§9):** issued-root facility (`facility.json`,
  `synthetic.key`, `controls.json`, fixed `profile/`+`anchor/` children),
  ticket attach, semantic + `fs.*` fault points with before/after semantics
  as specified, key-state control, `cleanup`/`holderPid` scoping, consumed
  faults not re-arming after kill, production/test separation (production
  factories reject test/provider fields). Implementable against the same
  persistence/lease logic behind a diagnostic key-backend seam wired only in
  the diagnostic worker.
- **No foundation-interface edits:** root/foundation barrels and provisional
  `ProfileStore` stay untouched (rev. 2 Q8 resolved — no replacement).

## 2. Rev. 2 positions withdrawn (superseded by the spec)

Previous-manifest fallback (accepted previous ACKNOWLEDGED snapshots —
correctly rejected); mutable Secret Service anchor (no established dir-fsync
— correctly rejected); lazy `acquire/releaseOwnership` APIs (factories own
the lease now); per-store commit methods (single atomic `commit(update)`);
internally minted generation ids (caller-supplied, storage never
regenerates); `flock --command` supervisor topology (`--no-fork` fd3
topology instead); sync digest + instance `digestKeyVersion` (async holder
call + `DIGEST_KEY_VERSION` const); bespoke test-facility shapes (exact
ticket/fault/session surface adopted); any domain-adjacent size cap (only
the operational 256 MiB budget, §9 headroom owned by T09).

## 3. Concrete feasibility questions (no implementation until answered)

- **FQ1 — holder lease-fd discovery rule.** After `--no-fork` exec the holder
  inherits both the passed-through (unlocked) fd3 description and flock's own
  locked description (opened via `/proc/self/fd/3`, normally a different fd
  number). Proposed rule: holder scans `/proc/self/fdinfo` for the `flock`
  lock held on the expected lock inode and treats exactly one match as the
  lease (zero/multiple → fail closed), closing or ignoring the unlocked
  duplicate. Confirm, or pin an alternative discovery rule.
- **FQ2 — filesystem-type detection mechanism.** `node:fs` exposes no
  `statfs`-class binding for the ext4 allowlist. Proposed dependency-free
  mechanism: canonicalize roots, walk `/proc/self/mountinfo` (stable kernel
  ABI, Linux-only task) to the containing mount, and accept only `ext4`
  (rejecting NFS/overlay/FAT/tmpfs-as-production), recording the
  magic≠durability-proof caution as a documented limit. Confirm acceptable,
  or name the approved binding.
- **FQ3 — unknown worker IPC error codes.** Parent reconstructs only
  allowlisted `StorageErrorCode` values. Proposed: unparseable/unknown codes
  map to `io_failure` (fail closed, sanitized). Confirm.
- **FQ4 — post-holder-death parent-handle code.** Holder exit/IPC loss
  permanently fences the handle; the in-flight call's outcome is uncertain.
  Proposed: the in-flight call reports `commit_ambiguous`; subsequent calls
  on that handle report `commit_ambiguous` (not `not_owner`, since the lease
  loss is a fencing event, not a never-owned handle). Confirm.
- **FQ5 — INCOMPLETE marker content.** Layout fixes `anchorRoot/INCOMPLETE`.
  Proposed: empty regular file, existence-only semantics, created/removed
  under the durable marker discipline. Confirm no content required.
- **FQ6 — anchor root-identity commitments.** Proposed: canonical absolute
  `profileRoot` + `anchorRoot` strings inside the encrypted anchor payload
  (never in logs/diagnostics; encrypted-at-rest). Confirm no privacy concern
  and sufficient content.
- **FQ7 — structural adapter review surface.** At implementation, the
  `dbus-native` adapter module will be presented for review as part of the
  normal source review; if strict compilation resists the unknown-boundary
  approach, work stops per the spec rather than casting. Acknowledged — no
  question unless the coordinator wants the adapter interface pre-approved.

## 4. Blockers and next decision

No feasibility blocker found: every normative mechanism above has a concrete
dependency-free (or single-approved-dependency) implementation path. Remaining
non-blocking items: FQ1–FQ6 answers; the separately granted implementation
window (`src/storage/` + internal holder + T04 ADR + exact approved
dependency/lock closure + compatibility entries); provider-fixture
availability acknowledged from preflight (production-adapter acceptance still
pending by design). Next requested decision: answer FQ1–FQ6 (FQ7 is
procedural) and issue the bounded implementation grant. Holding with no
source/build/install/config work until then.

## 5. Traceability

Work order interface-review window → this rev. 3 (proposal file only).
Approved spec §§1–10 → §1 confirmations above. Preflight adjudications
(previous-manifest rejection, immutable-key-only keyring, atomic
vault+generation, async digest, no foundation edits, per-record salt/HKDF,
fixed stack, exact diagnostics, dbus-native selection, GNOME 51.1/gcr
3.41.2 fixture, `--no-fork` fd3 lease) → §1 + §2 withdrawals. Open design
points carried strictly as FQ1–FQ6; nothing here reopens settled decisions.
