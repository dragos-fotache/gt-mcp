# T06-S5 production source review c0 — NOT approved

**Disposition:** c0 production readiness/static/build passes, but two bounded
repairs remain. NO behavioral acceptance/source freeze/QA target relay. Parent
T06 incomplete. Developer source/static/build repair grant below only.

## Reviewed scope and retained evidence

Reviewed new lifecycle source delta against accepted S4, additive v3 codec/entry,
owned ADR section11 and compatibility notes against S5 common contract. Coordinator
repeated npm run typecheck/lint:production/format:check:production/build sequentially
on verified disposable Node24.21.0/npm11.19.0: ALL exit0/PASS. ZERO behavioral
runtime/import probes, fixture/provider/loopback/QA suite execution.

Compared all inventoried accepted src files to frozen S4-f3 SHA256: unchanged,
except the two approved additive index/vault files. Removing ONLY the new v3 codec
block from current vault reconstructs the exact frozen S4 vault SHA256, confirming
old v1/v2/parsing functions unchanged. Production-only S4-vs-lifecycle diff shows
S4 resource/auth algorithms preserved with additive lifecycle state/codec routing.
Diff exit1 means files differ, not a test failure/pass. Initial rg named nonexistent
src/http/config.ts, reported missing-file diagnostic while other matching paths
were inspected; not counted as a verification pass. Static checks remain static.

## Findings requiring repair

1. Shared logout operational window currently uses Date.now elapsed differences
   between tokens and starts a new remaining timer for each attempt. Wall-clock
   rollback can replenish/extend the ONE totalDeadlineMs window. T05 budgets are
   monotonic; preserve one nonrenewable operational window independent of epoch
   adjustments, refuse subsequent dispatch after expiry, safely settle owned
   cleanup. No new public timing seam or dependency. Local clearing/acknowledged
   binding remains successful regardless of cleanup failure.
2. replaceGrant checks returned expiry BEFORE checking callback-triggered caller
   abort/explicit invalidate at its admission and final pre-advance clock calls.
   A clock that interrupts and returns expired time reports reauthentication_required
   instead of required operation_interrupted. A callback interrupting while returning
   invalid data/throwing similarly leaks invalid_arguments priority. Recheck actual
   interruption after the callback even on its error path, before deadline/error
   decisions; no new advance after cancellation. Transition's own fence is not
   invalidate. Preserve no-IO admission refusal and begun-advance settlement.

[BOTH-role common clarification](../decisions/t06-s5-lifecycle-adjudication.md)
resolves those EXISTING boundary requirements. These are specification-level
findings, not QA-source input. No need to redesign the public API or accepted
S1–S4 internals. A misplaced parseServiceGrant doc comment immediately precedes
new VaultSupersededEntry; optional scoped comment relocation is harmless but
not an additional behavioral gate.

## Bounded repair grant and stop

Developer may repair src/auth/lifecycle.ts, owned S5 ADR/compatibility notes, and
optional vault comment placement ONLY. No HTTP/storage/domain/root/config/manifest/
lock/dependency/QA edits or reads. Permitted four production checks and scoped
owned-path ESLint/Prettier only; no install, ad hoc runtime/import diagnostic or QA
suite. Preserve old S1–S4 formats/behavior and new v3 evidence contract. Report
source/static readiness and HOLD all source/build for c1 review/freeze.
Existing target60–90min/checkpoint90/STOP120 remains; no automatic renewal. If at
limit, deliver partial handoff instead of extending. No product/live writes,
private state/keyring, .pi/settings/trust edits, staging/commits/release/successor.
