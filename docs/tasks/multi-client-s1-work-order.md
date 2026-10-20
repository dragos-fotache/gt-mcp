# Multiple clients S1 — bounded, cancellable profile acquisition

**Implementation complete, 2026-10-18.** Final50/50 checks in seven files pass,
zero failures/skips/pending/todo;583 stable execution hashes, private provider/bus
and temporary-root cleanup confirmed. Production types/lint/format/build and
scoped test checks pass. [Evidence](../evidence/multi-client-s1-checks.json),
[handoff/review](../handoffs/multi-client-s1.md). Primary review performed;
independent parent review remains a later acceptance gate.

User authorized slice 1 only after the
[investigation/plan](multi-client-credential-ownership-plan.md). Slice 2 (runtime
ownership and protocol delivery) and slice 3 (integrated acceptance) remain held.

Outcome: provide an internal acquisition helper that waits for an exclusive
profile owner with a 60-second default bound, supports prompt cancellation and
returns only a fully authenticated owned session. Keep public `openProfile`
fail-fast and retain all encryption, key custody, filesystem and ownership checks.
This slice does not fix simultaneous connected MCP servers yet.

Authority: user slice-1 assignment; shared MCP draft0.3 authentication/storage and
C07; unchanged backend v1 refresh rules; T21 storage specification and the additive
S1 amendment below; standing primary-agent and proportional testing policies.

Settled internal interface: `acquireProfile(location, {signal, waitMs?})` returns
`Promise<ProfileSession>`. It is imported directly from a private storage module,
not exported by the production storage entry. `waitMs` is an internal positive
integer up to600000, default60000; it is not new operator/model configuration.
Capture/validate location before waiting. Retry only `locked_by_other_owner`,
using short bounded backoff and the existing fail-fast kernel flock primitive.
No retained blocking flock child waits independently of its parent. Worker open
uses its existing operation timeout, while the overall acquisition deadline can
terminate a read-only open sooner. Cancellation/timeout rejects with a fixed,
sanitized internal `ProfileAcquisitionError` code `interrupted`/`timed_out`, after
all attempted workers have exited and any acquired-but-undelivered session has
closed. Other storage errors propagate unchanged without retry. Once returned,
the session belongs to its caller; later abort of the acquisition signal must
not cancel commits or close that delivered session. Invalid options/location
report `StorageError(invalid_argument)` without protected IO. No caller abort
reason/native error is exposed. Runtime envelope mapping is deferred to slice2.

Edit scope: new private acquisition module; minimal optional cancellation seam for
read-only `launch(...,"open",...)`; targeted storage tests;
this work order, additive project-owned spec, task index, evidence and handoff.
No runtime/auth/protocol behavior, public exports/config/record formats, dependency,
manifest/lock/compiler changes, packaging, shared contract changes or deployment.
Acceptance prerequisite repair: normalize only existing Markdown table padding in
`docs/compatibility.md` after the production formatter identified it; verify all
cell text/status claims remain identical. Preserve the initial failed check.

Verification: early typecheck and scoped lint/format/import resolution; real
isolated Secret Service/filesystem acquisition after release, fresh committed
state, cancellation/timeout without a later owner, non-contention error refusal,
and prompt cancellation during a read-only open against the paused owned provider. Reuse
the existing credential-store fixture and private-provider runner. Final complete
credential-store owning file, selective internal argument tests and unchanged
credential entry/format/path-safety/lease regressions, plus production checks/build.
No exhaustive campaign/general harness; preserve fail-fast low-level tests.
Independent parent review and all runtime/process/end-to-end release claims remain
for later slices. No clean delivery/install proof is claimed by S1.

Environment: provisioned Node24.21.0/npm11.19.0, synthetic credentials only, private
isolated bus/provider and ext4 fixtures; existing ignored lifecycle scripts policy.
Use existing locked dependencies. Preserve dist/delivery byte-for-byte around a
clean build. No build/install concurrent with execution against that target. Runner
may require sandbox escalation for its existing disposable ext4 fixture parent.
No SSH/live backend/provider, real secrets, Btrfs, Android, .pi/settings, staging,
commits, external messaging or successor work.

Milestones: contract; helper/cancellation seam and early static checks; focused
checks/repairs; frozen final owning/regression verification, review and handoff.
Window starts10:04 UTC; checkpoint11:34, hard stop12:04 with honest handoff.
Stop affected work for a contract conflict, unsafe worker/commit cancellation,
unprovable lock release, missing safe fixtures or required public API/dependency
expansion. Do not weaken checks or change old contracts to obtain a pass.
