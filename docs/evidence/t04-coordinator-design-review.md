# T04 initial coordinator design review — revisions required

**Result:** Developer proposal and independent QA planning received; NOT approved
for implementation/test-source execution. T04 remains in progress, design window
only. No cross-role implementation/test-source exchange. Coordinator reviewed both
planning deliverables and issues public specification-level decisions below.

## Readiness and baseline

Developer: only `docs/decisions/t04-storage-proposal.md` written, no production/
metadata edits or runtime/keyring/QA reads reported. QA: only
`docs/evidence/t04-qa-plan.md` written, no production/generated implementation/
Developer proposal reads or execution reported. Both confirmed selected model
`meta/muse-spark-1.3-contributor` via nonsecret environment metadata and are holding.
These are role reports, not final independent storage acceptance.

Coordinator restored a disposable runtime from the official
`https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-x64.tar.xz`, verified the
archive against its matching official `SHASUMS256.txt` entry, then selected its
bin directory via `T01_NODE_HOME`/PATH. Observed Node24.21.0/npm11.19.0. No system
Node replacement, global install, Pi settings change or unrelated-runtime adoption.
This clears the initial missing-toolchain blocker for coordinated future windows.

Coordinator ran, sequentially while both agents were planning/holding and no QA
artifact window existed:

- `node --version`, `npm --version`: expected pins observed.
- `npm ci --ignore-scripts`: PASS; locked install, 332 packages added, audit
  reported 0 vulnerabilities; upstream node-domexception deprecation warning.
- `npm run typecheck`: PASS.
- `npm run lint:production`: PASS.
- `npm run format:check:production`: PASS.
- `npm run build`: PASS, root/companion rebuild only; no domain execution.
- `npm run smoke`: PASS, foundation100/100 (7 files), no skips.
- `npm run test -- test/unit/t03`: PASS, T03221/221 (7 files), no skips.

This is a current-working-tree baseline, NOT a clean source-snapshot acceptance,
whole-suite pass or T04 test/artifact relay. Production checks include preserved
historical T02 sources as configured; no parked T02 scenarios ran. No production
source/manifests/dependencies/config were changed by these checks.

## Public decisions and required design repairs

### D1 — No approval by planning readiness

Exact signatures/layout/dependencies are still candidates. Developer may revise
only its proposal; QA may refine only its plan. No implementation/tests/manifest
changes or target execution until a separate coordinator-approved specification
and grant. Root/server/CLI/companion remain inert. No type-barrel/interface edits
are needed at this stage.

### D2 — Genuine stale-state detection is a commit property

An immutable master key and a generation marker do not detect replay of older,
authentic vault/journal bytes under an unchanged origin/account/session. Every
acknowledged protected-state update must participate in a current external
commit anchor that commits to the state being acknowledged (e.g. versioned
sequence + authenticated manifest/digests for all required stores). A restored
old file, pair, missing operation file or index must fail validation against the
retained current anchor. Define the anchor outside the supported restore unit,
its protection, independent persistence ordering, and its update/crash semantics.

Generation-only checks are insufficient. Missing journal entries cannot appear
as fresh operations; define a provisioned encrypted store/manifest, not merely an
empty directory without durable required-store identity. Consider a whole-store
opaque-byte boundary rather than unindexed independent operation-file CRUD.
T09 owns operation identity and permanent reservations; T04 must not silently
undermine them through untracked disappearance/deletion.

Whole-machine rollback of stores AND anchor cannot generally be inferred from
identical local state. Do not promise automatic detection of that case. Clearly
exclude it from supported recovery and define trusted operator reconciliation
before use after any known unsupported restore/reinstall/transfer. QA must not
require an impossible automatic observable; it can test current-anchor stale
store detection and explicit known-unsupported restore handling separately.

### D3 — Partial provisioning and acknowledgment are fail-closed

Writing the fence before the required vault/operation state is complete must
never imply a usable empty profile. Publish the complete durable initialization
sequence, existence check/ownership ordering, unique attempt marker and explicit
partial-state disposition. Best-effort deletion is not permission to reuse a
profile generation after failed/uncertain provisioning.

After rename, a subsequent fsync/anchor error cannot truthfully promise the old
file is untouched. Specify an ambiguous commit/fenced-handle error and no further
usable reads/writes until defined reopen/reconciliation. Crash and returned-error
cases must distinguish old/new/ambiguous state; success only after all required
file/directory/anchor persistence steps acknowledge. Keep uncertain evidence, no
repair choosing newly generated identities.

Secret Service write/read-back proves observability, not independently a power-
loss durable acknowledgment. Verify provider persistence semantics or explicitly
limit the supported crash/recovery guarantee and retain the unresolved gate.

### D4 — Ownership must be a realizable pinned-runtime design

Name the actual kernel-lock mechanism. Do not assume Node core exposes flock(2)
or that pure JavaScript can issue arbitrary syscalls without a concrete supported
binding. A new dependency, addon, native helper/build or external utility requires
coordinator review first; no lifecycle-hook requirement or global install.

A helper-death notification alone is not exclusion: a parent already executing
file IO could race the newly admitted owner. If a helper/supervisor is selected,
all protected reads/writes/keys must be confined to the process retaining the
kernel lease, with explicit IPC-close/parent-death/release/crash behavior. An
unlocked surviving parent cannot keep performing protected IO. Also define
ownership before provision/open/key/decryption, not only before later reads.

Post-open inode checks alone cannot prevent subsequent lock-path replacement
from producing two kernel lock inodes. Define a stable external lock anchor,
restore rules and lifecycle; explicitly describe threat assumptions (including
same-UID malicious filesystem mutation) and test the promised supported races.
O_NOFOLLOW+lstat alone likewise does not establish race-free ancestor traversal;
name supported path assumptions or a realizable fd-relative safe implementation.

### D5 — Crypto, capacity and binding semantics need correction

Random96-bit GCM nonces provide probabilistic collision resistance, NOT impossible
reuse. State a valid safety argument/usage policy or a deterministic non-reuse
construction with crash-safe allocation; never claim randomness makes collision
impossible. Authenticate version/store/profile identity and required commit state.
No plaintext sensitive binding metadata in ordinary files/diagnostics.

No arbitrary1MiB journal limit is approved: shared tool input has no domain count/
name caps. Separate format/parser/resource overflow safety from a new domain
limit. Any storage capacity failure must be explicit before admission/mutation;
exact budgets and contract effects require review, not a silent cap disguised as
storage sanity. T04 does not alter T03's accepted domains.

Specify generation advances and retained same-account operation evidence together:
sign-out/replacement fences credentials/in-flight callers but does not erase or
brick exact immutable operation bytes. Frozen old invocation bindings must remain
invalid after advance; state how a new handle/capture is obtained, and atomically
coordinate vault changes and external generation/commit state. Storage accepts
trusted identity; it performs no network auth. Initial account-bound provisioning
is a candidate, not approved until the later login/exchange protected-state needs
have been considered (no premature backend send without protected recovery).

### D6 — Secret Service dependencies and isolated facilities remain open

No specific D-Bus dependency is approved yet. Developer supplies exact version,
registry integrity/license, current maintenance/security limitations, transitive
native/optional/lifecycle behavior, strict-TS compatibility and encrypted-session
interoperability. Do not implement a custom D-Bus/crypto protocol merely as an
unreviewed no-dependency fallback. Locked/duplicate/missing providers fail closed,
no prompt/unlock/plain-session fallback.

An isolated actual Secret Service daemon/private bus with disposable HOME/XDG
roots is still unprovisioned. Inventory and mocks are not real-provider evidence.
No personal bus/keyring access; no system/global package installation. Report
specific portable fixture/dependency provisioning needs as placeholders; defer
platform acceptance if unavailable.

## Next bounded action

Developer revises its proposal only against D2-D6 and reports concrete mechanism/
dependency/facility options and remaining conflicts. QA reads this public decision
record (not Developer proposal) and revises impossible/overstrong observables,
keeping questions pending until the approved API. Both hold after reporting.
Coordinator then settles a self-contained approved specification and execution
windows. There is no T04 production artifact and no QA execution relay yet.

QA subsequently reported planning rev2 addressing D2-D6 in its plan only, with
no target execution or Developer/production reads. This is planning readiness,
not approved test-source/execution scope; Q1-Q9 still await the public spec.
Developer proposal revision and actual isolated Secret Service remain open.

Coordinator-document local Markdown link checks passed for the ten touched
coordination/design/status documents. Shared checkout still reports baseline
9a96dcb and the six pre-existing policy-revision modified files; coordinator made
no shared-contract edits. No staging/commits or real writes.
