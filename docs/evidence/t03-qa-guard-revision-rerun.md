# T03 QA guard revision: reader-aware open + fd-write denies (controls re-run)

**Role:** independent QA (Muse Spark 1.3 Contributor, pane `w4:p2H`).
**Authorization:** coordinator-authorized re-run of
`npm run test -- test/unit/t03/import-probe-controls.test.mjs` ONLY
(artifact-free). Domain/foundation hold continues. Prior 11/11 evidence
(`t03-qa-controls-execution.md`) stands unchanged for its exact prior guard
revision; this file covers the new revision only.
**Date (UTC):** 2026-10-11. Toolchain: Node v24.21.0, npm 11.19.0.

## Guard change (explicit readonly-loader handling, not relaxed mutation rules)

- `open`/`openSync` (fs) and `open` (fs/promises) use a narrow reader-aware
  wrapper: absent or exactly `"r"` flags delegate with original receiver and
  async semantics preserved; write/create/truncate/append/RDWR, numerics, and
  unknown flag forms deny and record. (`import-deny-setup.mjs`)
- Denied fd methods added: `write`, `writeSync`, `writev`, `writevSync`
  (fs). All other write-family denies retained. Remainder audit-covered; no
  exotic/general sandbox expansion.

## New deny controls (synthetic, zero real I/O by construction)

- `import-control-deny-writeopen.mjs`: `openSync(path, "w")` → wrapper
  throws before touching the filesystem. Expected `["fs:openSync"]`.
- `import-control-deny-fdwrite.mjs`: `writeSync(1, ...)` → wrapper throws
  before any descriptor write (stdout stays clean). Expected
  `["fs:writeSync"]`.

## Exact results

`npm run test -- test/unit/t03/import-probe-controls.test.mjs`
→ **1 file passed, 13/13 tests passed** (vitest 4.1.11; 11 prior + 2 new):

- Clean control: zero delta as before.
- All twelve deny controls: each recorded exactly its kind, failed its
  import with a forbidden error, exited 0 with empty stderr, sandbox empty.
- Drained before/after resources identical; no noise observed.

## What this proves (and does not)

Proved: the revised guard loads standard modules (readonly delegation
works) while all twelve deny paths remain live tripwires. NOT proved:
domain behavior. Readiness is not acceptance; domain/foundation runs await
the hash/freeze relay. No auto-relaxation going forward: any future
interference will be reported first.
