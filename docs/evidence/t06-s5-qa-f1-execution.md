# T06-S5 QA f1 execution — owning green, parent 857/859 (2 T04-environmental failures)

**Relay:** `docs/evidence/t06-s5-f1-coordinator-relay.md` (named t06-s5-f1).
**Inventory:** `docs/evidence/t06-s5-f1-artifact-inventory.json`, SHA256
`25840875…99bac5`, 339 rows verified PASS before ANY target import, after
owning, and after parent. Launcher/inner private SHAs verified before AND
after parent: both OK. No source/helper/static/build/install changes;
no production/private reads. Full stdout+stderr captured to owned files
BEFORE viewing; actual exits recorded separately. No tail-only reading.

## Environment (placeholders; no private absolute paths persisted)

Disposable `$T01_NODE_HOME` first on PATH, Node v24.21.0 / npm v11.19.0
verified (STOP conditions not triggered, no ambient fallback). Fresh
ext4 `/var/tmp` QA scope with disjoint sibling home/tmp/run/cache;
fresh HOME/XDG/cache, UTC, cleared Node/TLS/proxy/DBus overrides.
Owning: T04 diagnostic persistence/leases + test-owned literal-loopback
HTTPS only. Parent: same scope, invoked under the qualified private
provider launcher (portable provider 51.1, fresh private bus/unlocked
persistent-login store; launcher owns/reaps its daemon and roots).
Synthetic traffic only; no personal facility, live backend, or product
writes.

## Selection 1 (owning, ONCE): ALL PASS

Command (exact): `node node_modules/vitest/vitest.mjs run
test/unit/t06/s5-lifecycle-validation.test.mjs
test/fault/t06/s5-lifecycle-races.test.mjs`

Result: exit 0. Test Files 2 passed (2). Tests **30 passed (30)**,
zero failed/skipped/todo/unhandled/cleanup errors.

Count note (honest correction of the relay expectation): the relay
expected 29 authored cases (11 unit + 18 fault) from the r5 report,
which miscounted the fault file. Authored and executed S5 total is
**30 = 11 unit + 19 fault** (the fault file holds 19 `it` blocks:
live read, delayed ordering, multi-token cleanup, dedup, failed
cleanup, offline, replacement, foreign, retained exclusion, install
hold, concurrency, begun commit, sign-out invalidate, stale mutation,
stale read, refresh race, entry abort, definite, ambiguous). All 30
pass; nothing added, dropped, or preclaimed.

## Selection 2 (parent 60, ONCE): 857/859, TWO failures, both T04 suites

Command (exact): `bash "$T04_PRIVATE_LAUNCHER" node
node_modules/vitest/vitest.mjs run <all 60 inventory parentSuites
filenames, built from hash-verified inventory JSON, no discovery>`.
All 60 files executed (suite summary counts 60 files).

Result: exit 1. Test Files 2 failed | 58 passed (60).
Tests 2 failed | 857 passed (859), zero skipped/todo/unhandled.
(859 = relay-expected 858 − miscounted S5-29 + actual S5-30; S5
contributes 11/11 unit + 19/19 fault passes inside parent, matching
owning. No rerun/repair/drop performed, per relay.)

Failure 1 — `test/fault/t04/filesystem.test.mjs` >
"requires a tmpfs fixture parent and denies tmpfs-backed production
roots": `Error: blocked: tmpfs-deny test needs a tmpfs fixture parent
(found ext4)` at the test's own guard. Environmental conflict: the
relay-mandated ext4 QA scope cannot satisfy this case's tmpfs-parent
prerequisite; the test holds itself blocked rather than passing. No
S5/QA-source involvement; no product code exercised by this QA role.

Failure 2 — `test/fault/t04/provider.test.mjs` > "rejects a relocated
profile root against its anchor commitments (fence_mismatch)":
`expected code fence_mismatch, got io_failure` via the accepted T04
`assertStorageError` helper. Observed under the launcher fixture
layout; consistent with unsafe-relocation precedence toward
`io_failure`. T04-suite observation only; no S5/QA-source involvement;
no product code exercised by this QA role.

Both failures are OUTSIDE the S5 owning scope and outside every file
this QA role owns or touched (S5 sources + S4 namespace assertions,
the latter passing 12/12 inside parent). Parent acceptance is NOT
claimed. Original failure identities preserved above; nothing
reconstructed by rerun.

## Cleanup and hold

Owned calls/commits/gates/responders/listeners settled by test
teardown (no force-kill of begun durability). Launcher reaped its
daemon/bus and removed its issued roots (no owned residue reported).
QA-owned run roots removed after this evidence was written; full
original logs were captured first and identities retained above.
Frozen sources/specs/readiness unchanged; this execution file is the
only new artifact. HOLD ALL runtime/source actions; no successor.
