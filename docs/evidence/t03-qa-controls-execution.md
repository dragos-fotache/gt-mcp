# T03 QA controls execution (authorized artifact-free run)

**Role:** independent QA (Muse Spark 1.3 Contributor, pane `w4:p2H`).
**Authorization:** coordinator explicit relay for
`npm run test -- test/unit/t03/import-probe-controls.test.mjs` ONLY
(artifact-free: synthetic fixtures/runner, no dist/production imports).
Domain/foundation execution hold remains.
**Date (UTC):** 2026-10-11. Toolchain: Node v24.21.0, npm 11.19.0.

## Safety fix applied before the run

Probe inspects the deny summary immediately after arming and aborts BEFORE
importing the target on any patch failure or `esmSync false`; restoration and
reporting stay in `finally`. (`import-probe-runner.mjs`)

## Finding during the run (harness flaw, fail-closed, repaired)

First run: 11/11 failed with `violations: ["fs:openSync"]` on every case.
Mechanism: the ESM loader on pinned Node24.21.0 opens files through the
public `fs.openSync`, so denying `open`/`openSync` broke standard loading
itself. The fail-closed design caught it loudly (no silent pass). Repair:
`open`/`openSync` (fs + fs/promises) removed from deny lists with an honest
comment — open-family outcomes stay sandbox-observed (any created path fails
the tree check) and audit-covered. `write`/`writeSync` fd-level writes are
likewise observed, not blocked.

## Exact results (second run, same authorized command)

`npm run test -- test/unit/t03/import-probe-controls.test.mjs`
→ **1 file passed, 11/11 tests passed** (vitest 4.1.11, ~0.9 s):

- control (inert synthetic import): clean — exit 0, empty stderr, setup
  complete (all patches applied, ESM sync on, restore clean), import ok, zero
  violations, globals/listeners/handles/cwd deltas empty, argv passthrough
  observed, sandbox tree empty.
- deny fetch/timer-global/timer-module/process-exit/child-spawn/fs-write/
  http2-connect/tls-connect/dgram-socket/dns-lookup: each recorded exactly
  its kind (`network:fetch`, `timer:setTimeout`, `timers:setTimeout`,
  `process:exit`, `child:spawn`, `fs:writeFileSync`, `http2:connect`,
  `tls:connect`, `dgram:createSocket`, `dns-promises:lookup`), failed its
  import with a forbidden error, exited 0 with empty stderr, sandbox empty.

## Before/after resource categories (safe, generic)

Drained snapshots on pinned Node24.21.0 show an identical handle set before
and after import (empty active-resource list in a quiet child); globals,
listener counts (`uncaughtException`, `unhandledRejection`, `warning`,
`exit`), and cwd equal. No pinned-runtime noise observed. Per policy, any
future noisy delta is HOLD/report, never auto-relaxed.

## What this proves (and does not)

Proved: the harness contributes zero delta (clean control) and every
representative deny path is a live tripwire (ten deny controls) — with zero
real I/O (wrappers throw first). NOT proved: domain behavior. Readiness
reports are not acceptance; the domain/foundation runs await the final relay.
