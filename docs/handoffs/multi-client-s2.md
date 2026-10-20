# Multiple clients S2 handoff and primary review

**Implementation and scoped verification complete, 2026-10-18.** User authorized
S2 only after S1. S3, independent parent review/acceptance and delivery/deployment
remain held. [Work order](../tasks/multi-client-s2-work-order.md),
[checks/history](../evidence/multi-client-s2-checks.json),
[exact final selection](../evidence/multi-client-s2-selection.json),
[final inventory](../evidence/multi-client-s2-final-inventory.json),
[final cleanup](../evidence/multi-client-s2-final-cleanup.json).

## Implemented behavior

Configured runtime startup authenticates/validates the credential and session,
pins profile ID/origin/account, then releases its temporary owner. Idle connected
servers retain no lock. Each valid enabled call uses S1 acquisition, reloads auth,
captures the current generation and owns the profile through the complete call.
Reads and creation serialize across processes and within one runtime. Same-account
sign-out/reauthentication is observed between calls; a recreated profile or different
account fails closed instead of being adopted. Config/write policy stays fixed at
startup. Invalid arguments/signals and disabled creation acquire no owner.

`src/runtime/read.ts` reuses the existing owned auth/creation implementation for
each invocation. Auth/session state is invalidated and discarded at release. Private
`runtime/delivery.ts` associates runtime objects with invocation leases using a
WeakMap; no method/property is added to public capabilities. Trusted direct runtime
methods complete release at their return boundary. The protocol adapter retains
leases through SDK transport send settlement using `protocol/delivery.ts`.

Cancellation before send releases/suppresses that result. Cancellation or close
during a pending write closes transport, settles/discards output, then releases
ownership. Queued unsafe-state failures also fence pending data/context-bearing
responses; generic recovery errors remain deliverable. Cleanup failures fence work
and remain visible to close. Close fences new work, cancels waits/resource work and
settles begun auth persistence. Private process startup cancellation makes a
specifically interrupted acquisition exit quietly with its EOF/signal status.

Default acquisition wait is60 seconds independently of storage.timeoutMs; timeout
is recovery_unavailable without permanently poisoning a healthy runtime. Calls
holding ownership, including a blocked response write, retain it until safe completion,
cancellation or close. No idle lock stealing, unlocked credential operations,
shared daemon, creation replay, config/record format, public error or auth algorithm
change was introduced.

## Verification and findings

Final167/167 checks across28 files pass, zero failures/skips/pending/todo;591
execution hashes stayed unchanged. The complete active read runtime/protocol/stdio
and creation-composition suites ran with named lifecycle/S1/foundation regressions.
This includes actual compiled two-server stdio coexistence; fresh generation and
sign-out handling; active-call exclusion; cancellation/EOF/signals; write policy and
creation context; SDK response-write retention/cancellation/failure. Real isolated
Secret Service, encrypted storage, ext4 IO and synthetic private-CA HTTPS were used.
Scripted HTTPS is not actual backend/Google qualification.

The initial full selection passed166/166. Primary review then identified a queued
call discovering unsafe profile permissions while an earlier success waited for
output. A new regression failed with an actual late success, then passed after the
delivery fence repair. The regression file bytes are identical before/after repair
and in final acceptance. [Before](../evidence/multi-client-s2-regression-before-fix-inventory.json),
[after](../evidence/multi-client-s2-regression-after-fix-inventory.json).
The failed run is preserved and not counted as passing evidence.

Private provider qualification initially failed before application execution.
Diagnostics found another service on the private bus and an absent expected login
collection. Merely setting the property query's auto-start flag did not fix this.
The reused runner now polls D-Bus owner identity first, requires its intended daemon,
then checks collection state and real secret store/read/clear. Startup bounds and
qualification/cleanup requirements remain intact. The owner-first focus and both
full runs qualified the intended private provider. A bounded inspection found no
orphaned providers from failed S2 fixture roots. Failed-run actor identities were
not reconstructed; no ambient provider/keyring was used as a fallback.

Two historical expectations were explicitly updated under the S2 successor:
idle runtime ownership no longer blocks lifecycle (an explicit active owner still
does, with original account/generation/grant checks retained); signal cancellation
of read-only startup acquisition now exits143 quietly. Other unsafe-state/config
and genuine-failure assertions remain. No tests were deleted/skipped or hidden.

Pinned Node24.21.0/npm11.19.0 production typecheck/lint/format/build and changed-test
lint/format pass. [Static closure](../evidence/multi-client-s2-closure.json) verifies
79 allowlisted runtime files and236 relative imports, including the two new private
delivery modules and S1 acquire helper/fixed worker. All eight historical delivery
files match S1 hashes; no build/install raced tests. The69 auth/storage/creation/
HTTP/login/lifecycle/domain source files are unchanged from S1. No dependencies,
compiler settings or shared contracts changed.

## Review, limits and next scope

Primary review covered public capability/error preservation, per-call identity
capture, state disposal, queued/active cancellation, reentrant close ownership,
result-write settlement and permanent unsafe-state fencing. The review-driven bug
was reproduced and fixed before final replay. This is primary review, **not an
independent review** or parent-task acceptance.

S3 needs a separate user grant for integrated multi-process crash/uncertain-refresh
recovery, lifecycle/output boundaries and final independent parent acceptance.
S2 proves delayed SDK send ownership with narrow in-memory send gates and actual
provider/kernel locks, plus compiled-pipe/coexistence regressions. Credential-bearing
real-pipe crash/backpressure and actual backend qualification remain S3/later work.
Clean locked installed reproduction and a new identifiable private archive are
separate delivery work; runtime file membership is ready but no archive was created.
No laptop/Hermes backend was deployed or changed, and no SSH/live backend/provider,
Google/Android/Btrfs/newer-Node run, .pi change, staging or commit occurred.
