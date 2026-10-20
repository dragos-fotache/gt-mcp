# Multiple clients S2 — runtime ownership and result delivery

**Implementation and scoped verification complete, 2026-10-18.** Final167/167
checks in28 files pass, zero failures/skips/pending/todo;591 stable execution
hashes, qualified owned provider/bus and temporary-root cleanup confirmed. Production
types/lint/format/build and scoped test checks pass. [Checks/history](../evidence/multi-client-s2-checks.json),
[handoff/primary review](../handoffs/multi-client-s2.md). No independent review claim.

User authorized S2 after completed S1. S3 integrated
acceptance, independent parent review, packaging/delivery and deployment remain
separate. Window starts10:15 UTC; checkpoint11:45, hard stop12:15 with handoff.

Outcome: connected configured runtimes hold no idle lock. Startup authenticates
and validates the selected profile/session without network or mutation, pins
origin/account/profile identity and releases ownership. A valid enabled call waits
cancellably using S1, authenticates fresh state, captures current generation, runs
under exclusive ownership and releases after result handoff. Calls on the same
profile serialize, including within one process. No shared daemon or live reload.

Authority: user S2 grant; shared MCP draft0.3 auth/session fences, C07 and existing
creation/error contracts; backend v1 exact refresh rules; T21 with this additive
successor; standing primary-agent/proportional testing policies. Existing low-level
single-owner storage API and auth/crypto state machines remain unchanged.

Settled behavior:
- Preserve public runtime/protocol signatures, tool schemas, config2 snapshot and
  strict writesEnabled guard. Validate args/signals/policy before acquisition.
- Pin startup profile ID, canonical origin and account. Different/replaced profile
  or account fails closed and requires restart. Same-account session-generation
  changes between calls load afresh. A startup null-account runtime does not silently
  adopt a newly bound account. Completed sign-out is visible to subsequent calls.
- Capture per-call generation after ownership acquisition. Keep ownership through
  refresh, durable evidence/grant writes, resource/create steps and final validation.
  No stale auth facade survives release; no tool-level creation replay is introduced.
- Default acquisition bound60 seconds; per-worker IO budget remains separate.
  Timeout maps to recovery_unavailable without permanent runtime poisoning; caller
  cancellation/close maps to operation_interrupted. Unsafe storage/auth state keeps
  permanent fencing. Every creation failure remains retryable:false with authorized
  truthful context. No new public error/config field.
- Direct trusted runtime methods validate the final result under ownership and
  release during method completion. SDK composition uses a private invocation lease
  retained through the transport send promise. No public capability property or
  provider hook is added. Invalid/disabled calls acquire nothing.
- SDK cancellation before send releases the lease and suppresses that response.
  Cancellation/close during a pending response write closes the transport, settles
  that write, then releases. Never release a lock while successful bytes remain
  queued for later delivery. Cleanup failure fences work and is retained by close.
- close fences admission, aborts acquisition/active resource work and awaits begun
  durable auth commits and lease cleanup. Process EOF/signals can cancel startup
  acquisition through a private signal; expected cancelled startup exits quietly
  with EOF/signal status after cleanup. Real configuration/storage failures retain
  their diagnostics; earlier historical startup-cancellation expectations are
  explicitly superseded only for the interrupted acquisition path.

Unsafe state discovered by a queued call also fences pending data/context-bearing
responses. Preserve delivery of a generic recovery_unavailable error. Primary
review found this additional race; an isolated regression reproduced the late
success before repair and passed after repair, without changing its oracle.

Edit scope: runtime composition/private delivery capability; protocol adapter/private
transport completion helper and process startup cancellation; focused real runtime/
stdio/delivery tests and affected old lifetime-owner expectations; minimal runtime
file allowlist closure additions (no archive creation); task/spec/evidence/handoff
and a clearly identified development-successor guide note. No dependencies,
compiler/lock/config/record/shared-contract changes. Preserve historical evidence,
archives, unrelated uncommitted work and old assertions for still-required behavior.
Fixture qualification repair after startup-only failures: poll the bus's owner PID
first and require the intended daemon before querying Secret Service properties;
also disable auto-activation on the property query. Diagnostics established a
competing private service (expected collection absent; intended daemon reported
another Secret Service). Merely setting auto-start=no on the property query did
not fix it. An owner-first probe qualified the intended daemon in0.11s; the focused
test run then passed. Keep readiness/key IO/cleanup requirements and startup bound
unchanged; record failures, diagnostic limits and this narrow ownership guard.

Verification: early types/lint/format/import checks. Reuse existing synthetic
profile/private-provider/TLS fixtures and SDK transports. Focus on idle coexistence,
two calls serializing, current generation/sign-out, queued cancellation and close,
unchanged disabled-write policy, and a held/failed response write retaining/releasing
the actual kernel lock. Final full active affected runtime, protocol and stdio suites
plus creation composition/lifecycle and S1 argument regressions. No exhaustive
campaign or new general testing framework. Parent crash/refresh-recovery matrix,
actual backend qualification, independent review and clean installed delivery are
S3/later gates, not S2 passes.

Use provisioned Node24.21.0/npm11.19.0, existing locked dependencies and isolated
ext4/provider/HTTPS only. Preserve all historical delivery hashes around a clean
build; never build/install while tests use that target. Existing runner may require
sandbox escalation for its disposable ext4 parent. No SSH/live provider/backend,
real credentials, Btrfs/Android/.pi/settings, staging/commits or automatic S3.
Stop affected work for a shared-contract conflict, inability to preserve send/refresh
fencing or prove release, unsafe profile adoption, new service/dependency needs,
missing isolated fixture or the time limit. Record failures honestly.
