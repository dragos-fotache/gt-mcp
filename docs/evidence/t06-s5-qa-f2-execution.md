# T06-S5 QA f2 execution — focused 15/15 and parent 859/859 green

**Relay:** `docs/evidence/t06-s5-f2-coordinator-relay.md` (named t06-s5-f2,
fixture-only regression repair); f1 adjudication confirms launcher
prerequisite errors, no test/production repair. F1 bytes/grants historical.
**Inventory:** `docs/evidence/t06-s5-f2-artifact-inventory.json`, SHA256
`f7674925…07a6bd`, 341 rows verified PASS before ANY target import, after
focused, and after parent. Wrapper SHAs verified before AND after each
run: launcher `9098ff72…33ef7d222` OK, inner `87f0ff35…c30dbe65b360` OK.
No source/helper/static/build/install changes; no production/private
reads. Full stdout+stderr captured to owned files BEFORE viewing; actual
exits recorded separately. No tail-only reading.

## Environment (placeholders; no private absolute paths persisted)

Disposable `$T01_NODE_HOME` first on PATH, Node v24.21.0 / npm v11.19.0
verified (no ambient fallback). Fresh owned scopes per selection with
disjoint roots and cleared Node/TLS/proxy/DBus overrides; repaired
wrapper instances supply tmpfs owned temp (disjoint from ext4
HOME/XDG/run/provider roots), umask 0077, env-i private bus with
pinned provider 51.1, synthetic credentials, no personal facility.
Synthetic traffic only; no live backend or product writes.

## Selection 1 (focused, ONCE, new wrapper instance): ALL PASS

Command (exact): `bash "$T04_PRIVATE_LAUNCHER" node
node_modules/vitest/vitest.mjs run test/fault/t04/filesystem.test.mjs
test/fault/t04/provider.test.mjs` (FULL files, no filters).

Result: exit 0. Test Files 2 passed (2). Tests **15 passed (15)**
(6 filesystem + 9 provider), zero failed/skipped/todo/unhandled/
cleanup errors. Both f1 failures now green under the repaired
posture — relocated-root `fence_mismatch` observed; tmpfs-negative
prerequisite satisfied.

## Selection 2 (parent 60/859, ONCE, NEW wrapper instance): ALL PASS

Command (exact): same node/Vitest invocation plus ALL 60 concrete
`inventory.parentSuites` filenames built from hash-verified inventory
JSON (60 entries confirmed; no discovery).

Result: exit 0. Test Files **60 passed (60)**. Tests **859 passed
(859)** — foundation100 + T03-221 + T04-123 (incl. actual isolated
provider) + bounded-T05-228 + T06-S1–S4-157 + S5-30, zero
failed/skipped/todo/unhandled/cleanup errors. Focused 15 repeat
inside the complete parent (874 executions / 859 distinct cases).

## Honest incident: one invalid out-of-scope run, discarded

Before the valid parent run, a QA shell error (unexported scope
variable) produced an empty file list, so one vitest invocation ran
repository-wide discovery (72 files incl. parked/deferred suites,
42 failures in out-of-grant suites). That run is INVALID under this
relay, claims nothing, and contributed no observation to the results
above; the valid parent re-ran afterward with the exact verified
60-file list. Inventory 341 PASS re-verified immediately after the
incident (frozen inputs unchanged); no source/evidence file was
modified by any execution. Reported here instead of hidden.

## Cleanup and hold

Owned calls/commits/gates/responders/listeners settled by test
teardown (no force-kill of begun durability). Wrapper instances
reaped daemons/buses and removed issued roots; QA-owned run/log
scopes removed after this evidence was written; full original logs
were captured first. Frozen sources/specs/readiness/f1 evidence
unchanged; this execution file is the only new artifact. HOLD ALL
runtime/source actions; no successor. Remaining gates (final clean
locked reproduction, import smoke/source audit, backend/browser/
host/release) stay separate; no parent completion claimed by this
QA execution alone.
