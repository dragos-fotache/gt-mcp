# T04 coordinator production review — c0 revisions required

**Audience:** Coordinator + Developer. No QA test/fixture/plan/source details in
this record. Requirements derive from the approved public specification and
production source inspection. **Result: NOT relay-ready.** Reported production
checks PASS are not storage acceptance. Current c0 is retained for review;
subsequent repair/build invalidates it. No QA execution window opened.

Coordinator read all16 storage modules (5407 production lines) plus ADR,
compatibility and public manifest/lock metadata. Source/build SHA256 inventory is
retained outside repo for c0, before repairs. Root/foundation/server/CLI/companion
and tsconfig hashes exactly match the pre-grant baseline. Compatibility changed
only its two approved rows, retained17-row structure/unverified product status.

## Scope, process and metadata findings

- Manifest semantic delta is exactly the authorized @homebridge/dbus-native0.7.8.
  Direct integrity matches spec. Lock adds14 nodes, removes none, but **also
  changes existing ip-address10.7.3 ->10.7.4** (version/resolved/integrity), outside
  the new dependency closure and not approved. Restore the existing baseline
  entry/closure; do not regenerate/upgrade the whole pre-existing lock. Baseline
  nonsecret manifest/lock copies remain available to Developer for correction.
- Developer self-reported initial system npm12.2.0 install and one direct compiled
  entry import outside its granted commands, then pinned reinstall/checks. Both
  remain process deviations, not retrospectively permitted. No QA/provider runs
  or personal keyring/backend contact reported. Independent review/clean pinned
  reproduction still required; self-report does not prove effects absent.
- ADR contains contradictory absolutes (every command pinned/no system runtime;
  no target execution; no other lock changes) alongside the exceptions. Qualify
  those statements accurately. Its claim all temp names use crypto.randomBytes is
  also false: fsutil/engine use Math.random for temp suffixes. O_EXCL is the relevant
  safety property; do not misrepresent the entropy implementation.

## Required production repairs

### P1 — Diagnostic factory must be usable with one consistent master

The diagnostic launch omits busAddress while diag-worker requires/validates it,
so the nominal synthetic provision rejects invalid_argument before persistence.
Separately, facility issuance writes random key A, engine provision generates
random key B, and SyntheticMasterKey.createMaster compares them for equality.
They are independent random keys: after the first issue is fixed, normal provision
still fails. The generated/stored/held master for a new diagnostic generation must
be ONE consistent key, first initialization only; no lost-key reconstruction,
production provider injection, arbitrary real roots or rotation bypass.

Coordinator ran a small isolated public-entry probe on c0, sanitized env with
fresh HOME/XDG and no personal bus, no QA tests. Observed:

- StorageError('io_failure').code descriptor writable:true (FAIL).
- StorageError('key_exhausted') accepts unapproved code (FAIL).
- createStorageTestFacility then legitimate provision: FAIL invalid_argument.
- Probe exited1; created fixture/environment cleaned and unreturned holder reaped.

This is an actual failed candidate probe, not a passing smoke/QA gate.

### P2 — Exact errors and argument contracts

Remove the unapproved23rd key_exhausted code; counter/resource failures use the
specified22-code catalogue. code must be immutable at runtime, not readonly only
in TS. Binding captures/returned bindings must remain the original frozen capture;
parent transitions validate the exact requested account/origin/profile/generation,
not just any shape-valid binding from the worker.

Own-data validation currently scans Object.keys and then reads fields. Hidden
(non-enumerable) required accessors are invoked; hidden/symbol unknown fields are
missed. Validate all own descriptors/keys without invoking getters/setters;
reject foreign shapes/cycles/coercion before any IO. Byte-view metadata access
must not execute user-provided accessors/iterators or return native exceptions.

Origin regex is not a canonical URL validator: invalid hosts/whitespace/ports and
noncanonical hostname spelling can pass; valid bracketed IPv6 cannot. Enforce
canonical HTTPS origin with an actual parser and exact canonical representation.
Root overlap checking must handle '/', not construct '//'. Bus GUID validity and
standard single filesystem-address decoding need exact validation, no alternative
transport/fallback. No input/private values in errors.

### P3 — Budgets and whole-call deadlines before effects

Parent copies/serializes over-budget byte arrays before engine checks MAX_STORE_BYTES;
reject resource_exhausted before large copy/IPC/persistence. Cover update/bind/advance
and any bounded message material; no domain schema caps or eviction.

Factories start deadlines after bootstrap and launch renews first-reply deadline;
public calls start after copying. Start one deadline at call entry and carry it
through validation/queue/IO/SS subcalls. Connected-provider timeout must map to
provider_failure when appropriate, not race an indiscriminate parent timeout into
a different code. Do not leak uncancelled connection timers/sockets/cookies; clear
and close every resource on success/failure.

### P4 — Kernel lease and exact identities

Despite ADR/spec bigints, fdinfo lease scanning uses bigint:false stat and String
rounded numbers; root/lock commitments also use numeric Stats in several paths.
Use exact bigint identities throughout, validate fd3 identity against expected
and actual stable lock, then exactly one matching WRITE FLOCK. No guessed fixed
lock-sequence/fd/PID/time admission. Kernel conflict exit73 alone maps
locked_by_other_owner; an invalid/ambiguous inherited lease proof maps
commit_ambiguous, not alleged contention.

### P5 — IPC quarantine and release proof

Unknown worker codes currently become commit_ambiguous but do not terminate/fence
the channel. Idle worker exit/disconnect is not permanently tracked; malformed
unknown records can be ignored, and success result shapes for commit/close/factory/
transition are too permissive. Strict envelope/op-specific reply validation;
malformed/unknown/lost worker permanently fences all outstanding/future calls,
including stale captures (close can release). No implicit continued IO.

terminate() resolves after a5s timer without observing exit, falsely claiming
release. Require observed exit/verified no-process spawn failure or an explicit
unreleased/quarantined failure, never success by elapsed time. No exit-event race
hang. Once parent disconnects, do not execute queued not-yet-started protected
work: stop admission, conservatively settle/fence the active transition, release
only on holder exit. Worker errors never carry raw native data/paths.

### P6 — Filesystem safety before blocking reads

readWholeFile opens before checking type, without nonblocking guard: FIFO can hang
instead of returning the specified io_failure. Validate safely and prevent
blocking nonregular opens, then verify the opened descriptor. No unsupported
platform/arch private IO; Linux x64/ext4 scope is explicit.

Ancestors are checked only for symlinks, not the specified trusted ownership/write
posture; nonsticky other-user-writable parents undermine the external anchor.
Implement trusted traversal assumptions and sticky system-temp exception, exact
root0700/file0600 modes and ownership/link checks, no silent chmod repair.
Flush ancestor/root creation and lock metadata needed for acknowledged durable
provisioning, not merely the interior files. Every protected call must notice
INCOMPLETE as well as anchor phases; missing/reset/corrupt state never becomes new.

### P7 — Full current-file validation and authoritative generation

Candidate hashes data before structural/version gates and open/commit can skip
required envelope validation. Implement published order: structural header/length/
recognized-version -> current digest -> expected-family/AAD/tag. Unknown version
fails before writes; no invalid authenticated state silently rewritten. Validate
both required files/binding before usable open or new update.

Revalidate must compare authoritative anchor session generation on EVERY protected
method (digest/bind included), not rely on only cached epoch checks or some callers.
Never rewind a fence or return private results under an obsolete invocation capture.

### P8 — Late commit/provision phases and fault observables

commit.reply probe is OUTSIDE the uncertainty/fencing catch. A throw after the
COMMITTED transition can report clean io_failure while leaving a usable stale
engine; this violates permanent ambiguity fencing (especially binding transitions).
All failures after PREPARED attempt, including durable/reply faults, fence the
handle. A fresh explicit open may admit only valid COMMITTED current state.

Directory-flush hooks are missing at actual storage-engine flushes (staging,
pre-rename and final paths); occurrence1 therefore does not mean first matching
syscall. Instrument all promised matching operations, exclude only diagnostic
control IO. Distinguish semantic committed-publication vs final directory sync
points as specified; current writeAnchorRecord already syncs before both points.
Preserve file/parent durability ordering and short-write handling, genuine atomic
vault+generation, unchanged operation ciphertext on same-account advance.

Clarification to Developer's completed-with-marker question: **a present INCOMPLETE
marker still blocks opening even with valid COMMITTED bytes**. Complete lost-reply
exception requires marker durably REMOVED. No open-path change to admit marker
residue is authorized. Reprovision with marker => incomplete_provision; without
marker but existing key/anchor/stores => already_provisioned. Clean lock-only
failure before protected reservation permits trusted retry, not reset of existing
state. Replacement-root cleanup refusal => io_failure.

### P9 — Immutable OS key provisioning/namespace

Check all relevant prior reserved generation state before first key creation;
unknown-version/corrupt/foreign reserved items must not be treated as a fresh
namespace. Revalidate uniqueness and exact session/read-back after creation,
not only a pre-create search. No key recreation on open or ambiguous provisioning.
Every per-call key availability/identity check must hold; no cached fallback.

Connected D-Bus/provider exceptions currently can escape as generic io_failure;
map the published specific provider codes consistently. Validate session paths/
variant signatures/replies and correct secret structure; reject prompts/plain
sessions. The pinned GNOME51.1 egg-dh.c source independently confirms padded
prime-length unsigned DH secret; candidate's padding is not a finding. Wipe owned
success-path plaintext master copies too; keep V8/native erasure limits honest.

### P10 — Issued-root diagnostics/cleanup cannot race or target replacement

Current cleanup probes a lock then releases it before deletion, permitting a
new holder to start before the tree is removed. Hold exclusion throughout deletion.
Revalidate original issued cookie/marker/root exact identity and safe ancestry;
never remove a same-path replacement root. Idempotent success only after confirmed
removal of its originally issued root. Contention => locked_by_other_owner;
replacement/unsafe root => io_failure. No PID/time killing or arbitrary roots.

Ticket attachment must enforce runtime-issued root restrictions, root ownership/
mode/links/canonical children, exact own-data arguments and specified absent/wrong-
cookie mappings. Do not follow symlink root/ancestors or accept a self-described
arbitrary production path as an issued facility. Diagnostic controls/key reads
need safe validated fixture identity. Fault occurrence consumption must reset for
a newly armed rule in the same holder and remain consumed across kill/restart.

### P11 — Genuine-new provisioning never overwrites competing state

No initial store overwrite after a stale emptiness check: a concurrent creator
using conflicting locations/generation must fail closed, not replace another
profile's newly installed state. Preserve trusted root/namespace identity and
exclusive initial creation/marker semantics, reservations and explicit partial
failure. Do not silently recover by generating a replacement key/root/generation.

## Final source closure after f3 green reproduction

Independent QA and coordinator clean136-file source snapshot pass T0454+69,
foundation100, T03221 (444 total), locked install/production/scoped QA checks;
clean build bytes match f3 and source/lock unchanged. Runtime green does not waive
manual source obligations.

Final inspection still finds P9/ancestor items not closed in the current source:
createMaster checks only exact-v1 pre-search then read-back, without broad prior
reserved-generation discovery or post-create uniqueness recheck; successful
loadMaster returns a copied key while leaving its owned decrypted plain Buffer
unwiped; trusted-ancestor gate rejects nonsticky other-write002 but misses
nonsticky group-write020. These are existing approved safety requirements, not
new product design or weakened tests. Bounded source-only correction requested;
no dependencies/config/foundation/QA changes. New build requires new relay/repro;
retain f3 green evidence and clean snapshot, not final acceptance until closed.

## Repair/verification boundary

Developer may repair only its already authorized production/ADR/compatibility and
single dependency-lock scope under the coordinator repair grant. Use pinned runtime
for EVERY command; restore ip-address10.7.3 baseline (available nonsecret saved
lock entry) and keep all other existing package nodes stable. Four permitted
production checks + ADR formatting only; no self-run entry/provider/QA diagnostics.
Report new artifact-ready and hold all source/build/install/config actions.
Coordinator repeats scope/source/locked checks before any new named artifact relay.
Current c0 is invalidated for future execution; no runtime storage acceptance.
