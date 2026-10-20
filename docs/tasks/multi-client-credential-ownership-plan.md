# Multiple MCP clients sharing one credential profile

**2026-10-18 — investigation complete; S1/S2 implemented, S3 held.**
User request: investigate simultaneous Hermes backends failing to open this MCP
and prepare an implementation plan. This document authorizes no implementation,
deployment, process termination, login, credential changes or live API requests.

Subsequent user decision: implement in three separately authorized slices:
S1 bounded/cancellable acquisition; S2 per-call runtime ownership and protocol
delivery; S3 integrated acceptance. Delivery/deployment follow separately. The
user then authorized S1 only; its [work order](multi-client-s1-work-order.md) and
[handoff](../handoffs/multi-client-s1.md) record the completed implementation.
The original investigation and proposed behavior below remain the parent context.
The user subsequently authorized S2 as well; its [work order](multi-client-s2-work-order.md)
and [handoff](../handoffs/multi-client-s2.md) record the implementation and167/167
scoped checks. S3, independent parent acceptance and deployment remain unassigned.
The user separately authorized the [S2 install package](multi-client-package-work-order.md);
that grant does not complete S3 or authorize deployment.

## Findings

- `src/runtime/read.ts` opens a profile at runtime startup and retains its
  `ProfileSession` until runtime close. `src/storage/credential/client.ts` retains
  the worker/channel for that session. `src/storage/ipc.ts` launches that worker
  under exclusive, nonblocking kernel `flock`; a competing owner fails immediately.
- This is intended existing behavior, specified by T21 and asserted by storage
  and runtime tests. It prevents concurrent refresh/credential mutation but also
  prevents otherwise independent stdio servers from sharing an idle profile.
- Read-only SSH inspection found two Hermes processes. One was reparented to
  PID 1 and still held the write end of its MCP server's stdin pipe. That MCP's
  live credential worker held a WRITE FLOCK on `owner.lock`. This proves a live
  process chain retained ownership at inspection time; it does not reconstruct
  which UI action originally launched either Hermes process.
- The four inspected installed files (`dist/storage/ipc.js`,
  `dist/storage/credential/client.js`, `dist/protocol/server.js`,
  `dist/runtime/read.js`) were byte-identical by SHA-256 to the workspace build.
  The installed worker uses the current single-record implementation. Historical
  statements that the laptop retains an older installation do not describe this
  observed installation; historical evidence has not been rewritten.
- A remaining `owner.lock` file is not itself a stale kernel lock. Deleting it
  while held could allow two owners on different inodes and is unsafe. Existing
  worker IPC-disconnect and server EOF/signal cleanup already exist. The observed
  Hermes parent was alive and keeping the pipe open, so EOF was not available.

## Recommended behavior

Use **one exclusive owner per tool invocation**, rather than per connected MCP
server. Multiple servers may remain connected; idle servers hold no ownership.
Calls sharing a profile serialize, including reads. This is a deliberate initial
throughput tradeoff that avoids adding a shared daemon, socket protocol or second
credential authority. True parallel resource calls across processes are outside
this proposed change.

1. Preserve the protected startup config snapshot, strict `writesEnabled`, public
   tool schemas and runtime method signatures. Startup authenticates/validates the
   selected profile and session, then releases its temporary owner. It performs no
   refresh or backend request. Pin authenticated profile ID, origin and account to
   this runtime; replacing the root/profile or changing account requires restart.
2. Validate arguments and write policy before acquiring ownership. Each admitted
   call waits cancellably for an exclusive owner, then opens fresh auth state from
   the authenticated record. Capture its session generation after acquisition.
   Same-profile/same-account generation changes between completed calls are read
   afresh; no cached bearer, pending-refresh or auth facade survives release.
3. Keep ownership across the **whole call**: pending-refresh preparation, HTTP,
   exact replay/recovery, grant commit, creation steps, final identity checks and
   result handoff. Never shorten it to individual file reads/writes. Preserve
   truthful creation context and `retryable:false`; never restart a creation just
   because ownership changed or a response was interrupted.
4. Proposed contention bound: a documented internal 60-second acquisition limit,
   with earlier caller cancellation/shutdown. Keep existing `storage.timeoutMs`
   as the worker operation timeout; do not silently turn its default five seconds
   into the entire contention allowance. No new config field is needed. A wait
   timeout reports existing `recovery_unavailable` without resetting credentials
   or permanently poisoning the otherwise healthy runtime. Cancellation reports
   `operation_interrupted`, with the existing creation retry policy.
5. Invalidate call-local auth and release/prove worker exit in every completion
   path. `close()` cancels queued work and waits for active cleanup. A cancelled
   waiter cannot later acquire and execute. Do not interrupt a begun durable commit
   merely to release ownership early. A genuinely unsafe/ambiguous state keeps its
   existing fencing semantics.
6. Preserve low-level `openProfile` single-owner/fail-fast behavior and trusted
   lifecycle safety. Add only an internal cancellable acquisition path for runtime
   composition. Trusted login/sign-out/removal remain exclusive: idle connected
   servers no longer block them, active calls still do. No model-facing login or
   lifecycle tools. New calls observe a completed sign-out before backend dispatch.

Runtime completion and actual SDK/stdio result handoff must be reviewed together:
do not release the lease and then perform asynchronous unfenced result validation
or delivery. A minimal private completion hook may be needed in protocol composition;
it must clean up on output failure/backpressure cancellation as well as success.
Direct trusted runtime consumers treat method completion as their delivery boundary.

## Authority and edit scope

References: shared MCP draft0.3 authentication/account-session fences and C07;
backend v1 refresh identity/reuse rules; T21 single-record storage spec; standing
proportional testing and primary-agent planning policy.

The proposal changes runtime ownership lifetime, generation snapshot lifetime and
contention behavior. Before implementation, record these as an explicit successor
amendment to the project-owned T21/runtime specification. Shared-contract exclusive
ownership and serialized exact-refresh requirements remain intact: simultaneous
connections do not mean simultaneous credential owners. If review identifies a
shared-contract conflict, stop affected work for user resolution instead of editing
that contract to accommodate code.

Expected edits: runtime composition; minimal internal storage acquisition/IPC seam;
protocol adapter/stdio completion integration where required; focused existing/new
runtime and process integration tests; relevant operator guides and task evidence.
Auth state machines, encryption/record/config formats, Secret Service custody,
backend protocol, dependencies and compiler settings should remain unchanged.
Preserve all existing uncommitted work and historical deliveries. No lock-file
unlink workaround, idle lease stealing, Hermes source changes or automatic restart.

## Milestones and acceptance

Authorize implementation slices separately; each targets a 60–90-minute window,
with a 90-minute checkpoint and a two-hour stop/handoff if unfinished.

1. **Bounded, cancellable acquisition:** private waiting/cancellation primitive,
   with unchanged public fail-fast storage and focused storage checks. S1 is
   implemented; see its work order and handoff above.
2. **Per-call runtime ownership:** record the successor contract; integrate fresh
   per-call session composition, ownership through result delivery and reliable cleanup; preserve
   startup validation and existing public envelopes. Run early scoped types/lint/
   formatting and focused runtime checks. No claim of integrated completion yet.
3. **Integrated acceptance:** verify result delivery/shutdown wiring and run real
   isolated multi-process stdio/Secret Service/HTTPS checks using
   existing fixtures. Required representative risks:
   - Two servers initialize against one profile; either can call while the other
     stays connected and idle. Overlapping calls both complete in serialization.
   - Expired credentials cause one fresh rotation; the next process uses the
     committed successor. Kill the owner after an uncertain refresh and prove
     exact persisted token/body/key recovery by the next process.
   - Cancellation and acquisition expiry cause no later dispatch or leaked worker;
     normal EOF/SIGTERM and abrupt MCP death release kernel ownership. A Hermes
     parent retaining an idle MCP pipe cannot indefinitely monopolize the profile.
   - Sign-out between calls prevents another old server from sending stale bearer
     credentials. Same-account generation changes reload safely; profile/account
     replacement, corrupt/missing credentials and provider failure fail closed.
   - Disabled creation stays disabled across clients; enabled isolated creation
     keeps independent invocation identities, cancellation context and no replay
     after an uncertain mutation. Delayed/failed result output cannot bypass fences.
   Final acceptance runs the full active affected runtime/stdio/creation owning
   suites plus relevant unchanged storage, refresh and lifecycle regressions and
   production checks. Reuse isolated runners; no exhaustive campaign or new general
   harness. Required independent review remains a separately identified gate.
4. **Delivery, separately authorized:** package a new identifiable private archive
   and clean locked reproduction/installed isolated proof. Preserve prior archives.
   Laptop replacement and a two-Hermes smoke test need a later explicit deployment
   grant; this investigation grants only read-only access. No live creation test.

Development commands use provisioned Node24.21.0/npm11.19.0, ignored lifecycle
scripts and stable build targets. `T01_NODE_HOME` was unset in this shell; the
initial version lookup therefore reported system Node26/npm12. No tests were run
with it. The disposable Node24.21.0/npm11.19.0 toolchain was located and verified
for future commands. This is not newer-Node compatibility evidence.

Stop/escalate for a public-contract conflict, inability to preserve delivery or
refresh fencing, unsafe profile rebinding, required dependency/service expansion,
missing isolated execution inputs or the bounded-work deadline. Do not weaken
existing tests merely because lifetime ownership is changing; document the exact
successor expectation and retain the low-level exclusive-owner assertions.

## Investigation disposition

Only read-only source/installed-process inspection, hashes and version lookups
were executed. No application tests, build/install, credential reads, live HTTP,
process signals or remote configuration changes occurred. Deliverable: this plan
and its task-index entry. Implementation and release gates remain unverified.
