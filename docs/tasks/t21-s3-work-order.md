# T21-S3 — Single-record credential storage

Assignment: user requested “start work at t21-s3”, 2026-10-17. S1/S2
accepted. S3 now [accepted/closed](../evidence/t21-s3-review.md);
S4 ready/unassigned, S5/S6 held, no automatic succession.

Outcome: implement the settled [successor storage API and format](../decisions/t21-single-record-storage-spec.md)
with authenticated binding/vault replacement, OS key custody, exclusive ownership,
safe paths, bounded decoding, truthful failure fencing and trusted cleanup.
Shared draft0.3/backend v1, retained foundation safeguards and the
[proportional testing policy](../decisions/proportional-testing-policy.md) govern.

Internal integration boundary: implement an inert successor entry under
`src/storage/credential/` with its own types/format/engine/client/worker and a
separately imported diagnostic worker for representative interruption probes.
Reuse existing lossless integer-token evaluation and storage validation, filesystem security, Secret Service and flock/IPC
primitives. Keep the existing storage entry/callers unchanged until S4 switches
runtime/login/lifecycle and removes legacy modules. This is sequential source
staging, not a runtime legacy-mode option. No creation API in the successor entry.
The final storage/index export switch and retired-test reconciliation belong to S4.

Edit scope: new successor storage modules, narrowly necessary reused primitives,
`test/unit/t21/`, `test/fault/t21/`, the narrowly repaired `test/fault/t04/provider.test.mjs` relocation fixture, and S3 work/evidence/handoff/status documents. Preserve all existing
uncommitted changes, historical evidence, old stores/tests, R1 archive and .pi.
No contract/backend/dependency/compiler changes, config/auth integration, package
refresh, live backend, actual credentials, laptop actions, staging or commits.

Commands/environment: explicitly use the existing disposable Node24.21.0 /
npm11.19.0 toolchain; no system/global installation. Early production type/lint/
format and scoped test syntax/import checks; explicit build before execution,
no build/install racing tests. Preserve R1 outside dist before clean build.
Reuse private bus/unlocked GNOME Keyring, disposable restricted ext4 roots and
existing test runner; only synthetic credentials. No disk formatting/mount setup.

Verification: independent format crypto oracle (HKDF/AES-GCM, strict shape/UTF8/
duplicate/base64/version/binding/bounds), real provider/filesystem setup/open/
commit/bind/advance/reopen and second-owner refusal; representative pre-rename
failure versus post-rename uncertainty/process interruption; corrupt/foreign/
unsafe/missing state never releases credentials or provisions implicitly; provider
lock/missing and explicit cleanup retry. Tests exercise observable requirements,
not private-function coverage. Final full new S3 owning suite and relevant unchanged
storage crypto/argument/ownership/provider regressions; existing old API suites stay
active until S4. Integrated login/refresh/lifecycle/config and backend/host/package
checks deferred to S4–S6. User-directed verification override during S3: “do not test on btrfs, I will
test myself. The solution should be independent of the underlying file system”.
The user owns Btrfs qualification; do not run Btrfs tests or hold S3 acceptance for
that test. Verify no filesystem-name/magic allowlist in the successor path and
actual isolated ext4 IO. This changes verification ownership, not file safety,
durability primitives or error guarantees. No Btrfs/laptop/power-loss claim.

Milestones: implementation + early static checks; focused boundary verification;
final stable checks/source review and evidence/handoff. Target60–90 minutes,
checkpoint90, stop120 with honest partial handoff. Escalate unsettled public
behavior, retained-auth weakening, new dependencies, unsafe fixture needs or
contract changes. Deliver exact changed-path/input identities, commands/results,
limitations and cleanup records. Parent/release/independent-review gates remain.

Source review found the shared UUID regex accepted a final newline via JavaScript `$`.
S3 tightens assertUuid to exactly36 characters, preserving canonical IDs and
rejecting malformed header/binding IDs before key lookup; relevant old storage
argument/binding suites are regression gates for this narrowly reused primitive.

Observed regression fixture repair: on Node24 with umask022, fs.cpSync creates a
0755 destination directory from a0700 source. The old relocation test therefore
received io_failure at the permission gate before reaching its expected anchor
fence. A standalone synthetic copy reproduced it without production imports.
Explicitly chmod only that copied fixture to0700 and assert it; retain the
fence_mismatch assertion and all path/provider checks. Original bytes archived.

## Closure

Final acceptance:33/33 owning +223/223 full storage/foundation regressions,256/256
in 27 files, zero failures/skips/pending/todo.644 stable execution hashes,208
compiled outputs, production/scoped test checks and explicit build PASS. Private
provider/bus/root cleanup PASS; R1 restored unchanged. Btrfs testing is user-owned.
[Review](../evidence/t21-s3-review.md), [handoff](../handoffs/t21-s3.md). No S4 grant
or parent/installation/release acceptance.
