# T21-S3 review — accepted/closed

2026-10-17. User assigned S3 only. Primary agent implemented, tested and reviewed
the [work order](../tasks/t21-s3-work-order.md) against the
[successor specification](../decisions/t21-single-record-storage-spec.md).
This is slice acceptance, not independent release review or parent acceptance.

The user explicitly changed verification ownership during execution: “do not test
on btrfs, I will test myself. The solution should be independent of the underlying
file system”. No Btrfs test was executed or counted as passed. Lack of an agent-run
Btrfs check does not block this assignment. The successor implementation contains
no filesystem-name/magic check: it validates ownership/paths and uses actual
required file operations, reporting their failures safely. Existing Linux x64,
Node24 and Secret Service requirements remain.

## Delivered implementation

`src/storage/credential/index.ts` exports the six settled production values and
the successor types. Its inert factories accept only ProfileLocation; no external
binding descriptor, anchor root, creation store, intent digest or diagnostic option.
The fixed holder uses real Secret Service and the existing kernel flock/IPC custody
boundary. A separate16-line test worker injects interruption points only; the
production entry never selects it or reads its control environment/file.

- One strict authenticated JSON envelope stores verified binding and opaque vault
  together. Independent HKDF/AES-GCM vectors verify the exact info/AAD/layout;
  salt32/nonce12/tag16 and new random salt/nonce per replacement. Header IDs only
  select a key; binding/vault release follows authentication and trusted-origin
  comparison. Strict UTF8, duplicate decoded keys, exact shapes, canonical base64,
  lossless safe integer validation and pre-read/decode limits are enforced.
- New roots are created exclusively. Restricted directories/files, symlink-free
  ancestors, regular-file/link checks and root/lock identities are revalidated.
  Each call rechecks provider availability and immutable key equality; missing,
  duplicate, locked or replaced keys never use a cached-key fallback.
- Captured updates serialize under ownership. Same-directory exclusive temporary
  write, short-write handling, file fsync, rename and directory fsync precede
  acknowledgement. Binding publication follows durable replacement. Pre-rename
  failure preserves the old record; possible replacement or mutation IPC loss
  fences the handle. Reopen authenticates only credentials.enc, never a temp.
- Explicit removal authenticates any present key/record/origin before key deletion,
  then removes only known credential files/temps and flushes. It retains the held
  owner.lock/root and refuses unknown contents. A trusted factory can finish after
  interrupted key-first removal; ordinary open still fails on the missing key.
  Account-status/auth work fencing remains the S4 caller's integration obligation.

The existing storage entry/runtime/login/auth/lifecycle callers remain unchanged
until S4. This staging adds no selectable legacy mode or new migration path. Shared
error/legacy interface retirement also remains with S4. All old storage tests remain
active; no test files/cases were deleted, skipped or excluded to obtain acceptance.

## Verification and observed repairs

Final stable target: **256/256 checks in 27 files**, zero failures/pending/todo:
33/33 S3 owning plus 223/223 regressions (123 legacy storage,100 foundation).
Both runs have the same 644 input/emitted/delivery hashes and 208 compiled outputs.
[Owning inventory](t21-s3-inventory.json), [regression inventory](t21-s3-regressions.json),
[exact selections](t21-s3-selection.json), [production/test static checks and build](t21-s3-static-checks.json).
Actual private GNOME Keyring/ext4 tests verify setup, update/bind/advance/reopen,
second-owner denial, provider missing/locked/duplicate/replaced states, corrupt/
foreign/missing/unsafe records, vault overflow, captured bytes, representative
pre/post-rename throw/process death and key-first cleanup retry.

Early type/lint/format checks preceded test expansion. Import smoke reuses the
existing calibrated interception hook and verifies silent direct-worker refusal;
it is not an OS sandbox proof. All final checks/builds/tests used provisioned
Node24.21.0/npm11.19.0. Initial unset-toolchain discovery ran --version only;
no project check/build/install used ambient Node. See [environment](t21-s3-environment.json).

Development history is retained in [execution history](t21-s3-execution-history.json):

- Initial format run:24/25 passed. Malformed header base64 was misclassified as
  resource_exhausted; production was corrected to store_corrupt. Vault overflow
  retains resource_exhausted. No oracle was relaxed.
- Source review tightened the reused UUID argument validator to36 characters:
  JavaScript `$` had permitted a trailing newline. New format tests exercise the
  malformed header and encrypted account ID; old argument/binding suites pass.
- Initial regression run:222/223 passed. A standalone no-production-import copy
  reproduced Node24 cpSync creating0755 from0700 under umask022. Only the relocated
  private test fixture is chmod0700/asserted; the original fence_mismatch and
  permission/provider assertions remain. [Diagnostic](t21-s3-fixture-diagnostic.json).
  Original fixture bytes are retained in the owned temporary task archive.
- Final review added the immutable-master check to owned cleanup, matching reads/
  updates; the real provider replacement regression passes on the final target.

## Scope, cleanup and remaining work

[Scope comparison](t21-s3-scope-comparison.json) distinguishes these edits from the
large preexisting working tree. Contracts/backend/package/lock/compiler inputs and
existing production callers are unchanged. No staging/commit, .pi modification,
system/global installation, live credentials/backend or laptop operation occurred.
Both private provider/bus instances exited and disposable roots were removed;
[cleanup](t21-s3-cleanup.json). R1 was copied outside dist before clean builds and
restored unchanged, SHA256
`ed5877dd16fc79043bc8773d3d15bb6fed2887dc891100ccebf8ddf2b3b22563`.

No arbitrary filesystem certification, real power-loss survival or independent
restored-snapshot rollback detection is claimed. Btrfs testing belongs to the user.
Runtime/config/auth/login/lifecycle integration is S4; backend/host and installed
clean reproduction remain S5/S6. T17/T19/independent T20 gates remain separate.
S4 is ready/unassigned; S5/S6 held. [Handoff](../handoffs/t21-s3.md).
