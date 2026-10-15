# T04 coordinator QA source review — initial readiness NOT accepted

**Audience:** Coordinator + QA only; NOT Developer input. Developer receives only
approved public specification clarifications, never this test-source review.
**Result:** revisions required before a frozen execution relay. No T04 tests,
imports, providers or assertions executed. Production implementation readiness
has not been reported; no build/install work or artifact freeze performed here.

Coordinator reviewed all18 QA mjs files and QA source-readiness evidence. Reported
18 total files is inaccurate:18 mjs files plus readiness evidence =19 files.
Using pinned Node24.21.0, coordinator ran `node --check` on owning mjs sources only:
17 parse PASS,1 parse FAIL in test/unit/t04/bytes.test.mjs (extra parenthesis in the
large byte-vector definition). Parse-only reads do not execute module imports or
tests. A separate Node builtin metadata query reports node:fs.mkfifoSync undefined;
filesystem.test.mjs's named import would fail collection after parse repair.
Preinstalled /usr/bin/mkfifo is available for a direct-argv isolated fixture helper.
No new dependencies, manifest/config changes or actual provider/target execution.

## Required source repairs (approved-spec obligations, not implementation-derived)

1. **Frozen binding/lease lifecycle:** many binding/bytes/errors/privacy/key/
   provider/crash tests use the old handle after bindAccount or advance. Every
   transition invalidates that capture immediately; all methods except close
   reject generation_mismatch. Close old handle BEFORE opening the returned new
   binding (otherwise ownership contention). Read/commit/digest and one-way-rebind
   cases run on the fresh bound handle. Original getter remains null/0 on the
   original skeleton handle, never changes to1. Keep explicit stale-handle negative
   tests and put all acquired handles in finally-close cleanup paths.
2. **Current anchor rollback oracle:** snapshot helpers include anchor.bin.
   Supported stale-store tests in stale-anchor and crypto-format restore ALL
   three files, accidentally rolling back the supposedly retained current anchor.
   Restore only vault/operations for supported tests; assert current anchor bytes
   remain unchanged. Keep explicit whole-state restore separate, unsupported,
   with no automatic detection claim. Do not let a whole-state copy become a
   counterfeit supported stale-state test.
3. **Provision crash outcomes differ by phase:** lock.acquired precedes first
   protected reservation, so clean retry may succeed; it is not proof of lost
   journal state. Interrupted reserved/incomplete stages deny retry/open. After
   provision.marker.removed, all initialization is durably complete: a lost reply
   permits exact current reopen, never reprovisioning. Current all-six-phases-must-
   deny-open oracle conflicts with the approved spec's explicit completed-provision
   exception. Never weaken implementation to satisfy that oracle.
4. **Fault points must actually occur:** commit does not reacquire its lifetime
   lease, so arming lock.acquired on an existing handle cannot test a commit error.
   operations rename/sync hooks fire only for changed operations; vault-only updates
   cannot hit them. Each test must arrange its named event. Non-rearm tests using
   PREPARED then conditionally doing nothing on failed open are vacuous; use a late
   durable/reply kill boundary where reopen is required, then prove a second action
   is not killed. No conditional successful escape from a required assertion.
5. **Precise reopen/crash assertions:** PREPARED stages require typed
   commit_ambiguous on reopen, not catch-all null accepting an arbitrary exception.
   After complete COMMITTED target publication/sync/reply, a reopened current image
   must be the new target, not an old-or-new permissive set. Preserve explicit
   uncertain-return/fenced-handle checks, accepted current manifests only. First
   data-temp write/file-fsync/parent-fsync faults precede anchor attempt; first anchor
   rename occurs within that attempt. Diagnostic control-file IO is not counted.
6. **Lock inode mutation:** writeFileSync truncates an existing lock file; it does
   not replace its inode. Empty lock contents are not ownership evidence. Replace
   by rename/unlink+create with asserted changed bigint inode for replacement
   negatives; a same-inode harmless contents change must not falsely imply theft.
7. **Real-provider fixture environment:** default os.tmpdir() here is tmpfs, so
   production tests cannot reach a key facility there; precreated child directories
   without explicit700 also depend on umask. Use relay-supplied verified ext4
   fixture parent, explicit700 roots/600 files, and valid issued/provisioned state
   for open/key negatives (an empty anchor root without owner.lock/anchor is
   anchor_missing, not a legitimate key lookup fixture). Both-roots-absent remains
   its own not_provisioned test. Blackhole/unreachable tests must first pass all
   preceding filesystem/state guards. Closing before generation reopen is required.
8. **Import isolation/proofs:** output marker + clean exit alone does not prove
   absence of transient FS/network/child/timer/handler effects. Run imports in
   sanitized subprocess env with disposable HOME/XDG and no personal bus/credential
   inheritance, interception/calibration of specified forbidden effects, ordinary
   loader-read allowlist and explicit gaps. Include later-relayed inert holder
   artifact import/direct-without-lease when its public inventory name is supplied.
   Never invoke a candidate import against real HOME/bus to see whether it is inert.
9. **Copy boundary:** current input mutation occurs only after commit resolves.
   Add immediate mutation after calling but before awaiting/queuing completion,
   asserting original bytes; otherwise late-copy violations can pass. Retain output
   copy tests. Budget checks must reach a fresh valid binding; cover both bind and
   advance refusal/no eviction. Readiness claims one huge allocation, sources
   currently contain two separate tests; record actual runner memory budget.
10. **Real provider negative gates:** locked and duplicate keys are required through
    the actual production adapter, not only synthetic setKeyState. QA owns private
    bus helpers/tests; coordinator supplies verified portable daemon/library and
    isolated setup boundary. Lock only private login collection; synthetic duplicate
    item can carry an additional fixture-only attribute so libsecret store does not
    replace the existing item. Test per-call recheck on the same valid handle and
    close while unavailable. No personal bus or plaintext secret in argv/environment.
11. **Strong assertions/isolation:** known exact unsafe-path/key/error mappings
    should not use any-code expectFailClosed. Helper must validate all22 catalogue
    codes even when a mapping is intentionally unspecified; exercise constructor
    acceptance for every code, not only key_not_found. Add own-data accessor/cycle/
    prototype and no-input-mutation checks from the exact API constraints.
    Guard subprocess cleanup/
    listeners with timeouts, owned-resource tracking and finally-close; do not
    swallow arbitrary exceptions or hang on a child that exits before listeners.
    No disappearing assertions hidden in platform branches: required tmpfs-deny
    and ext4-provider gates are separate explicit fixture prerequisites.

12. **Independent cryptographic oracle:** output length/stability/sensitivity and
    absence of plaintext alone do not prove the specified keyed/encrypted algorithm.
    Issued synthetic.key and public GTMS2/HKDF/AAD/HMAC rules permit independent
    reference decryption and expected keyed digest computation. Verify both data
    families/exact raw payloads; wrong AAD/family-key rejects. Unkeyed SHA256 could
    pass current digest assertions. No production reads/raw key output/new dependency
    needed. Keep unchanged operation ciphertext across generation advances.

## Source-review versus black-box coverage

Exact lease parser implementation/bigint operations and unsupported whole-state
inference limits include coordinator source review. Foreign-UID mutations need a
separately authorized facility, not root/global actions. Generation-counter overflow
is impractical through ordinary repeated calls; use approved observable synthetic
format controls if possible or state source-review gap honestly. Fixed master-key
label/attributes/collection ARE inspectable via private provider public metadata;
internal holder import/no-lease behavior IS observable with a coordinator-relayed
artifact path. Do not classify those as intrinsically untestable or counted passed.

## Rev2 static re-review — core repairs received, harness repairs still required

QA reports21 source parse PASS and repaired lifecycle/current-anchor/fault oracles;
coordinator has not opened execution or counted tests passed. Crypto reference
oracle uses the public format and issued key correctly; issued synthetic.key is
explicitly stable from facility creation (common spec clarification).

Initial re-review finds import-hook patch lookup uses labels such as
`child_process.spawn` as actual object property names instead of `spawn`; all those
functions become marked missing and are not intercepted. Separate diagnostic label
from real property key, require successful patch installation and synchronize
builtin ESM views. Required effects must be blocked, not merely recorded then
executed; async/promise FS, timer/listener and networking gaps need coverage or
explicit calibrated limits. Include positive synthetic forbidden-effect controls,
not just a benign module baseline. No real network/personal private-state probes.

Direct-worker tests currently permit a spawn error/missing file or timeout to count
as fail-closed without checking result.error/stdout/stderr. Require the declared
artifact to exist by public inventory, successful process start, bounded clean
nonzero exit (not timeout) and sanitized output; keep calibrated no-IO probes.

Provider helper Lock/Unlock returns status0 without checking the collection's
Locked property or prompt result. A status0 response may require an unhandled GUI
prompt and leave it locked. Coordinator must qualify the private fixture controls;
verify state and deny any fallback/prompt/person-session action. Helper commands
must inherit only explicitly relayed disposable HOME/XDG/private bus, not leave
HOME absent and fall back to the real passwd home. Key/response/native errors must
not be dumped. Exact provider parent/helper environment remains a relay prerequisite.

## Current authorization and next gate

QA may repair only its existing owning source/evidence paths and run **parse-only
node --check on those mjs files** with the provisioned runtime. No test/target/provider/
package/lint/format execution yet; node_modules/build remain Developer-owned.
QA reports revised source readiness and remaining public questions, then holds.
Coordinator repeats static source review/parse and later resolves provider execution
commands before freezing artifacts. Initial failures remain in this record; no
runtime pass, skipped gate or clean-install/whole-suite claim is supplied here.
