# T04 implementation ADR — protected profile storage, repair c1

> **T21-S1 successor authority (2026-10-17):** T21 replaces the ext4 gate, mutable anchor, operation-store format and their recovery/removal API requirements. This ADR records the prior accepted implementation.
> See the [successor storage/interface spec](t21-single-record-storage-spec.md). Documentation only;
> current runtime/package behavior is unchanged until T21 implementation acceptance.

**Authority:** implements `docs/decisions/t04-approved-storage-spec.md` under
the coordinator repair grant
(`docs/evidence/t04-coordinator-production-source-review.md`, P1–P11).
Supersedes the c0 ADR revision where they differ; retains the two reported
process deviations and the initial baseline failures below. The approved spec
governs; this ADR records what was built, pinned inputs, deliberate choices,
and limits. No shared-contract, foundation, script, compiler, or config
changes. No storage acceptance, provider interop, power-loss, or release
claim. c0 is invalidated for future execution and is not relay-ready.

## 1. Decision summary

`src/storage/` (16 modules) implements the exact approved production API
(`dist/storage/index.js`: `StorageError`, `isStorageError`,
`provisionProfile`, `openProfile`, `MAX_STORE_BYTES`, `DIGEST_KEY_VERSION`
— 22-code catalogue, no `key_exhausted`), the inert internal holder, the
isolated diagnostic entry (exactly the two approved factories) with its
separate diagnostic worker, and a shared engine (envelope crypto, anchor
protocol, lease validation, Secret Service subset, IPC framing). Single
approved runtime dependency `@homebridge/dbus-native@0.7.8` added exact
with its locked closure; the pre-existing lock baseline is otherwise
byte-identical (ip-address restored to 10.7.3). No other manifest, lock,
script, config, or compiler change.

## 2. Exact pins and registry evidence

Toolchain for restoration and for every repair command: provisioned
disposable `T01_NODE_HOME` (`node-v24.21.0-linux-x64`), observed Node
v24.21.0 / npm v11.19.0. No system runtime for repair work, no global
install, no Pi settings change. (The initial c0 install deviation under
system npm 12.2.0 is retained in §8; all repair commands used the pinned
toolchain.)

| Component                   | Exact version                                                              | Placement                                | Evidence                                                                                                                                                           |
| --------------------------- | -------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| @homebridge/dbus-native     | 0.7.8                                                                      | root dependency, `--save-exact`          | integrity `sha512-ZXcJzhA2Z3pYsSdQKcDZqELaJHzb5CXALlVHQRg+PHcXqx5xvL83ZPq8HdHCeavxS3pph6d85+zamCb1UFQa5A==` (matches approved spec; verified in package-lock.json) |
| Pre-existing lock nodes     | baseline, incl. ip-address 10.7.3                                          | restored from coordinator baseline copy  | lock diff vs baseline: 14 added nodes (new closure only), 0 removed, 0 modified                                                                                    |
| util-linux flock            | 2.42.4 (inventoried; exact provisioning version is coordinator record)     | OS helper, direct argv only              | `--no-fork --exclusive --nonblock --conflict-exit-code 73`, no shell/command/close/addons/hooks                                                                    |
| GNOME Keyring / gcr fixture | 51.1 / 3.41.2                                                              | coordinator-provisioned isolated fixture | preflight evidence; production-adapter interop NOT claimed here                                                                                                    |
| Linux filesystem gate       | ext4 via mountinfo (+statfs corroboration); tmpfs only through diagnostics | implementation check                     | §5                                                                                                                                                                 |

Lock restoration procedure (c1): copied the coordinator baseline
`package-lock.json` over the drifted file, removed `node_modules`, and ran
only the approved `npm install --ignore-scripts --save-exact
@homebridge/dbus-native@0.7.8`. Post-install diff against baseline shows
only the 14 added closure nodes. `npm audit` at install reported 0
vulnerabilities (point-in-time, not certification). The dependency's
prepublish script never runs on install (all installs `--ignore-scripts`).

## 3. Module map (source → artifact)

| Source                       | Emitted                       | Role                                                                    |
| ---------------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| src/storage/index.ts         | dist/storage/index.js         | public entry; validation, lock bootstrap, factories                     |
| src/storage/client.ts        | dist/storage/client.js        | shared parent proxy, entry deadlines, transition checks, lock bootstrap |
| src/storage/holder.ts        | dist/storage/holder.js        | production worker; Secret Service + noop faults + ext4 policy           |
| src/storage/diag-worker.ts   | dist/storage/diag-worker.js   | diagnostic worker; synthetic key + file faults + tmpfs policy           |
| src/storage/test-facility.ts | dist/storage/test-facility.js | diagnostic entry; facility lifecycle, guarded cleanup                   |
| src/storage/diag-support.ts  | dist/storage/diag-support.js  | synthetic backend, file fault probe, controls IO (diagnostic only)      |
| src/storage/engine.ts        | dist/storage/engine.js        | provision/open/commit/bind/advance/digest, anchor protocol              |
| src/storage/dbus.ts          | dist/storage/dbus.js          | structural D-Bus adapter + Secret Service subset                        |
| src/storage/keyring.ts       | dist/storage/keyring.js       | immutable master-key flows, exact error mapping                         |
| src/storage/ipc.ts           | dist/storage/ipc.js           | spawn, deadlines, quarantine, worker serve loop                         |
| src/storage/format.ts        | dist/storage/format.js        | GTMS2 envelopes, header gates, anchor records, digests                  |
| src/storage/fsutil.ts        | dist/storage/fsutil.js        | durable writes, validation, mountinfo, fdinfo lease scan                |
| src/storage/errors.ts        | dist/storage/errors.js        | StorageError, fixed messages/stacks, runtime-immutable code             |
| src/storage/validate.ts      | dist/storage/validate.js      | descriptor-safe exact-shape validation, canonical origin                |
| src/storage/faults.ts        | dist/storage/faults.js        | FaultProbe interface, noop, FaultArmed                                  |
| src/storage/types.ts         | dist/storage/types.js         | erased public types only                                                |

Production holder never imports test-facility/diag-support/diag-worker;
the diagnostic worker never touches the Secret Service (diagnostic IPC
carries no bus field and rejects one); the parent never decrypts payloads
or holds keys.

## 4. Crypto justification (CSPRNG/HKDF/AEAD)

- **CSPRNG:** `crypto.randomBytes` (master keys, salts, nonces, IVs,
  synthetic keys, cookies, temp suffixes). Temp-name uniqueness additionally
  rests on same-directory O_EXCL creation with pid/counter components, which
  is the actual safety property against pre-created collisions.
- **Envelopes:** AES-256-GCM, fresh 256-bit salt + 96-bit nonce per record,
  HKDF-SHA256 record keys (`gymtracka-storage-v1:<family>`), AAD binding
  header + identity (`[origin, accountUuid, profileGenerationId]` for data;
  profileGenerationId for the anchor). Per-store keys make cross-store swaps
  fail authentication structurally. Claim is probabilistic collision
  resistance only; no counter reuse construction and no acknowledged-sequence
  bound on unacknowledged attempts, per the approved spec.
- **Secret Service session:** exact `dh-ietf1024-sha256-aes128-cbc-pkcs7`
  (NOT `"dh"`): IETF Second Oakley Group via `getDiffieHellman("modp2")`
  with 128-byte prime assertion, server key range/nonzero validation,
  left-padded 128-byte shared secret, HKDF-SHA256 NULL (32-zero) salt with
  empty info to a 128-bit key, AES-128-CBC with PKCS#7 padding and fresh
  16-byte IVs. Legacy-transport disclaimer from the spec applies: security
  rests on the same-user Unix bus boundary, not modern DH strength.
- **Digest facility:** HKDF-SHA256 (empty salt, zero-separated info incl.
  origin/account/generation, never session generation) + HMAC-SHA256 over
  version + 0x00 + identity bytes; async through the holder; keys never
  rotate for retained receipts.
- **Scrubbing:** owned key buffers (held masters, per-call read-backs,
  record keys, DH intermediates, digest keys, secret params/values) are
  zero-filled after use and on close. No complete V8 memory-erasure
  guarantee is claimed: GC copies, JIT temporaries, and IPC clone buffers
  are outside the wipe boundary; mitigation is process/lifetime confinement
  (keys live only in the short-lived lease holder), not memory forensics
  resistance.

## 5. Mechanism choices and limits

- **Lease:** `flock(2)` exclusive/nonblocking via `flock(1) --no-fork`;
  parent passes the validated lock fd as child fd3 and closes its copy;
  the holder discovers the lease by scanning `/proc/self/fdinfo` for
  exactly one `1: FLOCK ADVISORY WRITE` lease on the expected bigint
  (dev, ino) — no fd-number guess, no PID/time reasoning, never rounded
  inode/device comparisons. Only actual flock conflict exit 73 maps to
  `locked_by_other_owner`; invalid/ambiguous inherited lease proof maps to
  `commit_ambiguous`, never alleged contention. Node core exposes no flock
  API (verified absent from the pinned `node:fs` docs).
- **Filesystem gate:** `/proc/self/mountinfo` with octal-escape decoding
  and longest component-boundary match must report `ext4` (production) or
  `ext4`/`tmpfs` (diagnostics); `fs.statfsSync` corroborates ext-family
  magic only and inconsistency fails closed. Ancestors must be
  symlink-free directories that are root-owned or euid-owned, or carry the
  sticky bit (sticky system-temp exception); non-sticky other-writable
  ancestors fail. Magic alone is not a durability proof; fsync-conditional
  durability is a documented limit. Read paths open O_NONBLOCK and verify
  the descriptor, so FIFOs fail instead of hanging.
- **Anchor:** disjoint encrypted filesystem anchor (file+directory flushed
  PREPARED/COMMITTED with old+target commitments); COMMITTED-current-only
  acceptance; a present INCOMPLETE marker always blocks opening even with
  COMMITTED-valid bytes (the lost-reply exception applies only after the
  marker is durably removed); reprovision with marker reports
  `incomplete_provision`, with existing protected state
  `already_provisioned`; no previous-manifest fallback; whole-machine
  rollback excluded with operator reconciliation. Data-file validation
  order is structural header/length/version gates, then whole-file digest
  comparison, then expected-family/AAD/tag decryption; unknown families
  and recognized-unknown versions fail before any digest comparison.
  Provision order is INCOMPLETE marker → immutable key → PROVISIONING
  anchor → stores → COMMITTED → marker removal (marker precedes the key so
  a durable marker or an existing key survives every first side effect).
  Lock-only failure before protected reservation (flock conflict) consumes
  nothing and permits trusted retry.
- **Key discipline:** fresh Secret Service connection per protected call;
  availability/uniqueness rechecked and read-back compared with
  `timingSafeEqual` against the held key (changed key → provider_failure);
  close never needs the key. Namespace reservation covers any prior item
  carrying the profile-generation id (broad pre-create search), creation
  revalidates uniqueness plus exact read-back afterward, and creation
  races resolve to `already_provisioned`, never silent replacement. No key
  recreation on open. Reserved attributes
  `{x-gymtracka-profile, x-gymtracka-key-v: "1", x-gymtracka-role:
"master"}`, label `GymTracka MCP profile key`, persistent login
  collection only, `replace=false`. Diagnostic generations use the stable
  issued `synthetic.key` bytes from facility creation through
  provision/bind/advance/reopen: the diagnostic engine mints from that
  file and the backend reserves the same key (first initialization only);
  no second-key generation, replacement, or lost-key reconstruction.
- **Validation contracts:** exact own-data shapes captured via
  getOwnPropertyDescriptor/Reflect.ownKeys without invoking user
  getters/setters/symbols/iterators; native exceptions from hostile inputs
  map to `invalid_argument`. Origins are parsed and canonical-compared via
  the URL parser (lowercase host, no userinfo/path/query/fragment/default
  port; bracketed IPv6 accepted). Root overlap uses path-relative
  containment (filesystem-root safe). Bus guids must be 32 lowercase hex.
  Byte material is budget-checked before copy/IPC/persistence
  (`resource_exhausted`). Transition replies must equal the exact requested
  next binding, not any shape-valid binding.
- **Deadlines and quarantine:** one deadline starts at call/factory entry
  and is carried through validation/queue/IO/provider subcalls; expiry
  SIGKILLs the lease-owning worker and awaits observed process close
  before reporting (release is never claimed by elapsed time). Unknown or
  malformed worker records terminate the worker and permanently fence the
  channel; idle exit/disconnect is tracked so no further call is admitted.
  Commit/close results must be null; holder calls serialize fully, and a
  disconnected worker never starts queued protected work. Connected
  provider timeouts surface as `provider_failure` from the holder path;
  a parent-timeout kill of an uncertain commit reports `commit_ambiguous`
  per the deadline-fences rule.
- **Diagnostics:** issued roots only (marker/cookie/children/ancestry
  verified; absent or non-issued roots map `invalid_argument` on attach).
  Cleanup revalidates issuance, holds a flock guard for the entire
  deletion (contention → `locked_by_other_owner`), succeeds idempotently
  once removed, and refuses replacement roots (`io_failure`); only the
  spawned guard child is ever signaled. Fault-epoch sequencing resets
  occurrence counting for newly armed rules while consumed rules stay
  consumed across kill/restart. Control-file IO never fires `fs.*` points.
- **Secret content exposure:** child stderr is drained and discarded; IPC
  error records carry codes only; diagnostics never see production keys.

## 6. Strictness and review notes

Strict flags unchanged (no new relaxation, no `skipLibCheck`, no `any` in
own sources). The `dbus-native` structural adapter loads the runtime export
as unknown, validates `createClient`, and wraps `invoke`/connection events
behind precise structural types with runtime checks; SASL is pinned to
EXTERNAL (no HOME cookie reads), the socket is locally created from the
validated path (no ambient discovery/TCP/unixexec), and Hello is manual and
wrapped. If strict compilation had resisted this boundary, work would have
stopped for review per the spec — it did not.

## 7. Verification performed (Developer permitted checks only)

Provisioned Node v24.21.0 / npm v11.19.0 for every repair command. Results
on the repaired tree: approved dependency install (0 vulnerabilities);
`npm run typecheck` exit 0; `npm run lint:production` exit 0;
`npm run format:check:production` exit 0 (plus installed-Prettier
formatting of `src/storage/*.ts` and direct checks of this ADR and the
compatibility rows); `npm run build` exit 0 with all storage modules plus
declarations emitted. Built declaration surface checked statically:
production entry exposes exactly the six approved runtime exports;
diagnostic entry exposes exactly the two approved factories. No QA suite,
whole-suite, provider, fixture, entry-point, or target execution was run by
the Developer in the repair window; foundation/T03 regressions and
independent T04 tests belong to the coordinator relay and QA windows.

## 8. Retained deviations, failures, and open limits

1. c0 install deviation retained: the first dependency install ran under
   system npm 12.2.0 (shell export-ordering mistake) and was immediately
   redone cleanly under pinned npm 11.19.0; the c1 lock was additionally
   restored from the coordinator baseline so only the approved closure
   differs (ip-address back at 10.7.3). Not retrospectively permitted.
2. c0 import-probe deviation retained: one `node -e` import of the two
   built entries to confirm the exact runtime export surface (effect-free
   imports; no bus/filesystem/key writes, no suite). Not retrospectively
   permitted; the surface is otherwise verified statically from sources
   and declarations.
3. Initial failures retained: coordinator's c0 probe (mutable `code`
   descriptor, unapproved 23rd code, diagnostic provision
   `invalid_argument`) drove the c1 repairs above; the c0 audit trail in
   the production review stands.
4. The following are explicitly NOT established by this implementation and
   remain for the QA relay / coordinator review: production-adapter
   encrypted-session interop against the isolated GNOME fixture (incl.
   content-type acceptance and prompt-free CreateItem), locked/duplicate/
   timeout provider behaviors, daemon power-loss durability, real
   two-process lease contention, PREPARED-kill fencing on kill, and
   ext4-vs-tmpfs gate behavior. No mock-only OS certification is claimed.
5. Known residual risks: `flock(1)` fd-number independence relies on the
   fdinfo scan (kernel format drift fails closed, not open);
   `/proc/self/mountinfo` parsing assumes stable kernel ABI; `dbus-native`
   0.7.8 is a 0.x single-maintainer line (audit-clean at install, not
   certification); V8 memory erasure is partial (§4); cleanup guard
   readiness uses a bounded observed-lease wait (failure, never
   success-by-time, on timeout).

## 9. c2 repairs (f1 adjudication F1/F2/F7; f1 closed, NOT accepted)

1. F1: omitted optional `timeoutMs` no longer rejects. Both request
   validators read the field as optional (absent => default 5000) instead
   of required; origin/bus/spec validation is unchanged. A prior c1 probe
   failure with omitted timeouts is attributed to this defect.
2. F2: first-reply startup classification is deterministic. When the
   worker process is dead without ever delivering a first reply, the exit
   code decides: actual kernel conflict exit 73 reports
   `locked_by_other_owner` regardless of exit/IPC event timing (the lease
   was never acquired, so no uncertain lease is claimed); any other
   nonzero exit reports `io_failure`. Live or parent-killed workers keep
   the original error, including deadline fencing.
3. F7: INCOMPLETE-marker presence takes priority over ordinary
   existing-state refusal on reprovision (`incomplete_provision`); open
   was already correctly blocked. Without a marker, existing protected
   state still reports `already_provisioned`; nothing is reinitialized.
4. F3/F4/F6 required no production change: replaced-lock identity stays
   `fence_mismatch`, missing lock pathname stays `anchor_missing`, and
   pre-publication rename faults legitimately reopen exact old COMMITTED
   bytes after close (no previous-manifest fallback). F5 required no
   speculative import fix. These oracle corrections are acknowledged here
   so the candidate is not misread against them.

## 10. c3 timeout repair (f2 timeout adjudication; f2 closed, NOT accepted)

Root cause: parent and holder timers shared one absolute deadline, so on
ties the earlier-scheduled parent timer won — SIGKILLing the holder while
its own provider-timeout diagnosis was due, after which the first-reply
versus early-exit race reported `io_failure` and stole both the primary
`provider_failure` diagnostic and the deadline-fence semantics. Repairs:
worker-side timers and checks run against the whole-call deadline minus a
100 ms internal margin (`WORKER_TIMER_MARGIN_MS`), so holder diagnoses
are always delivered strictly before the parent deadline can fire; the
external single budget is unchanged and the parent backstop still fences
safely under extreme load. The first-reply/exit-mapping race is removed:
startup outcomes flow through the reply channel plus deterministic
catch-side exit-code classification (73 contention, other nonzero definite
failure), with only a dedicated spawn-failure watcher racing the reply.
Connected-but-silent providers therefore surface `provider_failure`
(holder timer, inside budget); genuinely uncertain commits still fence
`commit_ambiguous`; actual flock conflicts still report
`locked_by_other_owner`. No budget renewal, no worker-death blanket
remapping, no unknown-commit relabeling.

## 11. c4 closure repairs (final source review; f3 closed, NOT accepted)

Source inspection showed three specified behaviors missing despite prior
repair reports (an earlier formatting-divergent batch edit applied
silently to only part of its targets; all other reported repairs were
re-verified present by inspection). Corrected without redesign:
keyring creation now checks the broad reserved-generation namespace
before first write, revalidates exact post-create uniqueness plus
read-back/session equality, and wipes owned plaintext copies (including
secret params/values) on success and failure paths; ancestor traversal
now denies non-sticky group-writable (020) as well as other-writable
ancestors, retaining the sticky system-temp exception. No dependency,
config, foundation, or QA changes.
