# T04 QA test-source readiness rev2 — review repairs applied, no execution

**Status:** test sources repaired per coordinator source review; SOURCE
PREPARATION ONLY — no test, lint, format, provider, target, build, install,
or package operation executed. Only authorized parse-only `node --check`
(20/20 `.mjs` PASS plus hook PASS) with the pinned disposable Node24.21.0.
**Owner:** QA (`w4:p2H`). **Review:** `docs/evidence/t04-coordinator-qa-source-review.md`
(Coordinator+QA only; initial readiness NOT accepted; relay still closed).
**Interface:** `docs/decisions/t04-approved-storage-spec.md` with settled
FQ1–FQ6 + error/key-access/attach/input clarifications.
**Model:** `meta/muse-spark-1.3-contributor` (env-confirmed, no credential reads).

## Independence boundary (unchanged)

- Written only: `test/unit/t04/`, `test/fault/t04/` (helpers + fixtures inside
  those paths), this file. No foundation/T03 edits, no production/generated
  reads, no Developer proposal reads, no config/manifest/lock changes, no
  coordinator private probe code.
- No personal keyring/backend/Google/Android, no `.pi` edits, no staging/
  commits. Synthetic placeholders only. Provider tests gate on relay env
  (`T04_PROVIDER_BUS`, verified ext4 `T04_PROVIDER_PARENT`) with explicit
  blocked-throw, never skips.

## Inventory (21 QA source files + evidence)

`test/unit/t04/` (10): `helpers.mjs`, `contract.test.mjs`,
`arguments.test.mjs`, `binding.test.mjs`, `bytes.test.mjs`,
`crypto-format.test.mjs`, `crypto-oracle.test.mjs` (new),
`errors.test.mjs`, `imports.test.mjs`, `import-hook.cjs` (new).
`test/fault/t04/` (11): `helpers.mjs`, `provider-helpers.mjs` (new),
`provision-crash.test.mjs`, `commit-crash.test.mjs`,
`stale-anchor.test.mjs`, `lease.test.mjs`, `key-facility.test.mjs`,
`provider.test.mjs`, `diagnostic-separation.test.mjs`,
`filesystem.test.mjs`, `privacy.test.mjs`.
Evidence: `docs/evidence/t04-qa-plan.md` (unchanged alignment),
`docs/evidence/t04-qa-sources.md` (this file, rev2).

## Repair log (review items 1–12)

1. **Frozen binding/lease lifecycle:** every bind/advance test now closes the
   stale capture (asserting its getter still shows the ORIGINAL binding —
   skeleton stays null/0 — and its methods reject `generation_mismatch`)
   BEFORE opening the returned new binding. All reads/commits/digests/
   rebind-negatives run on fresh handles; every acquired handle sits in a
   finally-close path. Fixed in binding, bytes-budget, errors, privacy,
   key-facility, lease, stale-anchor, commit-crash helper, provider suites.
2. **Anchor rollback oracle:** supported stale tests restore ONLY
   vault/operations files and assert anchor bytes identical before/after;
   crypto-format tamper tests never move the anchor (anchor-AEAD damage is its
   own specified `store_corrupt` case). Whole-state restore stays a separate
   explicitly-unsupported case with no detection claim.
3. **Phase-differentiated provision outcomes:** `lock.acquired` failure ⇒
   trusted retry SUCCEEDS (same generation, no consumption) for both provision
   and open acquisition; reserved/incomplete stages deny retry
   (`already_provisioned`/`incomplete_provision` pair) and open; after
   `provision.marker.removed` a lost reply admits EXACT current open (empty
   reads, null/0 binding, marker absent) and denies reprovisioning with
   `already_provisioned`. Empty-0600 INCOMPLETE asserted only where reached.
4. **Hooks that fire:** `lock.acquired` removed from commit tests (commits
   never reacquire the lease; acquisition coverage lives in provision-crash);
   every ambiguous test commits BOTH stores so vault+operations rename/sync
   hooks fire; rearm test uses the reply boundary with REQUIRED reopen +
   second deterministic commit (no conditional escape).
5. **Precise reopens:** PREPARED/uncertain reopens assert `commit_ambiguous`
   EXACTLY; `anchor.committed/synced/reply` reopens assert the NEW target
   bytes exactly (never old-or-new, never prior manifest); fenced-handle
   checks retained. First data-temp write/file-fsync/parent-fsync ⇒
   `io_failure` old-usable; first anchor rename (within the PREPARED attempt)
   ⇒ `commit_ambiguous`; diagnostic control IO excluded from occurrences.
6. **Real inode replacement:** lock replacement via rename with asserted
   changed bigint `ino`; conflicting-identity calls assert the documented
   fence/lock set; second-open on the replaced file also fails (never a
   second concurrent owner). Same-inode truncation asserted HARMLESS (reads
   keep working). Deletion ⇒ fail-closed.
7. **Provider environment:** all production-adapter tests resolve relay
   `T04_PROVIDER_PARENT`, assert ext4 via mountinfo prerequisite, and create
   explicit-0700 roots. Open/key negatives run on VALID provisioned state
   (fresh-unknown generation ⇒ `key_not_found`; dead socket ⇒
   `key_unavailable`; silent socket + 1 s deadline ⇒ `provider_failure`
   bounded < 15 s). Both-roots-absent keeps its own `not_provisioned` test.
   Generation close-before-reopen discipline throughout.
8. **Import isolation:** probes run in sanitized subprocess env (disposable
   HOME/XDG/TMPDIR as cwd, minimal PATH, no bus/credential inheritance) with
   a fail-fast CJS interception hook (child_process/net/dns/fs-reads+fs-writes/
   fetch/process.on patch-verified, summary to file). Calibration over
   bare `node:fs` must itself be clean; storage runs must match its handles/
   listeners, show zero forbidden effects, leave the sandbox empty, and keep
   loader reads within calibration ∪ hook/target files (personal HOME,
   /run/dbus, /run/user explicitly denied). Holder-artifact import awaits the
   relayed public inventory name (recorded gap, not asserted).
9. **Copy boundary + budget:** immediate mutation between call and await added;
   output-copy tests retained; bind/advance budget refusals run on fresh valid
   bindings with state-preservation asserts. Runner memory budget: two
   256 MiB + 1 allocations in `bytes.test.mjs` (sequential, freed between) —
   peak ≈ 260 MB per worker heap.
10. **Real locked/duplicate gates:** QA-owned `provider-helpers.mjs`
    (direct-argv `busctl Lock/Unlock` on the private login collection;
    `secret-tool` duplicate store with fixture-only extra attribute +
    targeted clear; 15 s bounds; blocked-throw when helpers unavailable).
    Tests prove per-call recheck on one valid handle (locked ⇒ `key_locked`,
    duplicate ⇒ `key_ambiguous`, recovery after unlock/clear) and close-while-
    unavailable. Synthetic secrets only; cleanup in finally blocks.
11. **Strong assertions:** unsafe link/owner/mode/type/nlink/traversal cases
    assert `io_failure` exactly; kill-holder commit calls assert
    `commit_ambiguous`; stale-generation open asserts `generation_mismatch`;
    rebind asserts `binding_mismatch`; attach wrong/absent tickets, bad fault
    points, bad key-states, bad diagnostic shapes assert `invalid_argument`
    (new exact mappings); cleanup idempotent + replacement-root protection
    asserted. Constructor acceptance loops all 22 catalogue codes. Added
    cycle/throwing-accessor (rejected, accessor never invoked), frozen-input
    purity, subprocess/child guards with timeouts + exited-flags (no hangs,
    no swallowed assertion escapes). Tmpfs-deny and ext4-gate are separate
    explicit prerequisite tests (no vanishing branches).
12. **Independent crypto oracle** (`crypto-oracle.test.mjs`, node:crypto only):
    reference HKDF-SHA256 record keys (header salt, family info) decrypt both
    envelopes to EXACT committed bytes under the specified JSON-array AAD;
    cross-family key and tampered binding AAD both fail authentication;
    reference HKDF(empty salt, digest info)+HMAC(`DIGEST_KEY_VERSION\0`+input)
    equals the holder digest and differs from unkeyed SHA256; operation
    ciphertext stays byte-identical across generation advance.

## Relay execution plan (NOT RUN)

1. `npx vitest run test/unit/t04` — deterministic suites (diagnostic facility only).
2. `npx vitest run test/fault/t04` — crash/lease/stale/key/diagnostic/FS/privacy
   + `provider.test.mjs` against relay env (blocked-throw when absent).
3. `npm run smoke` + `npx vitest run test/unit/t03` — frozen-artifact regressions.
4. No whole-suite, no parked-T02, no moving build, no personal-secret facility.
   Blocked/partial stays blocked/partial; mock-only OS results never count.

## Remaining public questions / honest gaps

- Ciphertext-tag damage ⇒ `fence_mismatch` (digest compare precedes tag check)
  follows the specified gate order; relay failures adjudicate any ordering gap.
- Changed-key `provider_failure` is proven on the diagnostic seam; the
  production rotated-key path is source-review (no rotation API exists by design).
- Generation-counter overflow, foreign-UID mutation: source-review gaps as
  recorded (no synthetic-format control exists for the counter; no root actions).
- Fixed label/attributes/collection exactness on the wire and fdinfo
  exact-one-lease parsing: coordinator source-review items; QA asserts the
  observable consequences (namespace isolation, uniqueness, ambiguity,
  fail-fast contention, no PID/time admission).
- `secret-tool` noninteractive store shape: implemented with piped stdin +
  15 s bound and blocked-throw; relay confirms or supplies the duplicate
  affordance explicitly.
- Holder-artifact public inventory name for the direct-without-lease import
  probe: awaited at relay.

## Follow-up clarification round (spec wording settled, no new files)

- Invalid/missing/multiple inherited-lease proof ⇒ `commit_ambiguous`
  (lease replacement + deletion tests tightened from sets to exact code);
  only actual kernel conflict exit 73 ⇒ `locked_by_other_owner`
  (second-open contention, unchanged).
- Present INCOMPLETE blocks open even when COMMITTED-valid; reprovision with
  a present marker reports `incomplete_provision` (stale-anchor test
  extended); the completed lost-reply exception applies ONLY after durable
  marker removal (provision-crash `marker.removed` case, unchanged).
- Replacement-root cleanup refusal ⇒ `io_failure` exact (was survival-only);
  idempotent cleanup on the absent root still succeeds.
- Reserved internal-artifact cases added to `imports.test.mjs` using public
  inventory names only (`dist/storage/holder.js`,
  `dist/storage/diag-worker.js`): calibrated inert import probes plus
  direct-without-lease runs asserting sanitized failure (never exit 0,
  empty sandbox, deterministic repeat). No generated content read.
- Real-provider harness notes accepted as specified: qualified ext4 parent +
  isolated bus + portable paths at relay; private-only busctl lock/unlock
  (no production unlock/prompt); secret-tool duplicate via stdin with the
  fixture-only extra attribute on a verified unlocked/unique fixture.

## Rev2 harness repairs + artifact-free control results (no suite execution)

Static re-review found a concrete hook bug: dotted report labels were used
as property keys, so interceptions never installed. Repaired
(`test/unit/t04/import-hook.cjs`): real property keys with separate labels,
verified installs (`true`/`missing`/`frozen`/`rejected` recorded per patch),
in-band ESM-view sync check (`globalThis.__t04hookEsync`), async/promise FS
coverage, timer/listener/dlopen recording, and BLOCK-after-record for
child/network/dns/fetch/filesystem-write actions (originals never called).
`imports.test.mjs` now requires installed patches + ESM sync, adds a
positive blocked-effect control, and tightens direct runs (artifact-exists
precondition, successful start, numeric nonzero exit with null signal inside
the bound, < 4 KB sanitized output, hook effect records, empty sandbox).
Provider helpers verify the collection `Locked` property after Lock/Unlock
(polling briefly; pending GUI prompts fail blocked, never pass on status 0),
run only under relayed disposable HOME/XDG + private bus (never absent-HOME
real-passwd fallback), and never dump key/response/native errors.
`synthetic.key` stability from issuance is asserted in diagnostics.

Authorized artifact-free controls executed (own preload + builtins +
synthetic sandbox, minimal env; no dist/provider imports, no network or
private state) on pinned Node24.21.0, all passing:

- Calibration (`--require` hook + `import 'node:fs'`): all 46 patches
  installed `true`; ESM sync `{fsRead, cpSpawn, netConnect}` all true;
  zero forbidden effects; clean exit 0; sandbox empty.
- Positive control (spawnSync/writeFileSync/net.connect/dns.lookup/
  fsp.writeFile/fetch attempts): 6/6 threw `T04_HOOK_BLOCKED`, nothing
  executed or written, all six recorded with details, exit 0.
- Timer/listener control: `setTimeout`/`setImmediate` calls and an
  `uncaughtException` registration recorded and allowed, exit 0.
- Incidental finding fixed during controls: `fs.appendFileSync` routes
  internally through `writeFileSync`, so the hook summary now uses a
  pre-opened fd + saved `writeSync` instead of append.
- Calibrated limit (documented, not hidden): the ESM loader bypasses the
  CJS read wrappers, so loader-read allowlisting is informational; write/
  spawn/net/fetch exclusion rests on blocking + sandbox-empty + calibrated
  handle/listener equality. Calibration is harness validation only, never
  production acceptance.

## Provider fixture qualification alignment (lock/reset controls)

Per public preflight qualification: private collection Lock + `Locked=true`
passes via direct-argv busctl; busctl Unlock is explicitly UNQUALIFIED
(status 0 with a pending prompt while Locked stays true) and is never used
by helpers or tests; the foreground `--unlock` path hung (exit 124). The
only qualified recovery is fixture-owned daemon SIGKILL/restart on the same
private bus/keyring with the synthetic stdin password.

Concrete helper-contract need for the execution relay:

- `T04_PROVIDER_RESET_COMMAND`: absolute path to the private fixture reset
  control, run with zero arguments and an env of only PATH/LANG (no bus
  address, password, or key material crosses this boundary). Helpers fail
  blocked when it is absent or non-absolute, or when the reset reports
  failure — never a silent pass.
- State-check protocol after reset: collection `Locked` property reads false
  (polled briefly; a pending prompt fails blocked) AND a known-good profile
  reopens with retained bytes (sentinel retention) before the bus is
  trusted again.
- Fallback when no reset affordance is supplied: the locked negative stays
  the isolated LAST case in `provider.test.mjs` (no later test in that file
  needs the bus; unit/fault suites use synthetic keys only) followed by
  fixture teardown of temp roots. The disposable bus may remain locked.
- Production adapter code must never unlock/prompt; tests assert `key_locked`
  (same-handle recheck + fresh open) and close-while-locked success.

## Readiness and blockers

- Sources repaired; parse-only `node --check` 20/20 PASS (+ hook PASS) on the
  pinned toolchain. Target/provider execution HELD for the frozen relay.
- Blockers: (a) frozen T04 artifact relay + provider env/commands +
  duplicate/locked affordance confirmation; (b) relay answers to the gaps above
  if the coordinator wants them closed first.
- Next: coordinator static re-review + frozen relay; QA then executes and
  reports pass/fail/blocked per case with sanitized evidence.
