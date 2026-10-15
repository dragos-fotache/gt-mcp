# T06-S4 production c3 review — one error-priority repair remains

**Disposition: main C2 repairs verified in source; NOT SOURCE-APPROVED pending ONE
focused error-priority fix. No frozen relay/runtime grant.** QA source-approved/HELD
33authored, zero executed. This production review is private to Developer/Coordinator.
No broader redesign/test matrix or new API/fixture/dependency is requested.

## Verified improvements

Per-leg synchronous admission token/auth epoch closes the handoff race; consumed
admission preserves same-binding in-flight delivery and controls retain non-waiting
self-guards. StageUse now covers orchestration and hook joins without another cycle.
Private joined-auth provenance crosses the generic T05 hook interruption boundary
and restores unresolved-auth/storage distinctions. Previous read-provenance, exact
pending/body/key/account/expiry invariants, terminal shared abort checks and inline
current-session final guard remain. Public API/schema/index/declarations unchanged.

Coordinator pinned Node24.21.0/npm11.19.0 repeated typecheck, lint:production,
format:check:production, build: ALL PASS exit0,157production/source/build/config/
document hash rows unchanged before/after. No target/import/fixture/provider/suite
execution. Earlier source failures/readiness/ADR history retained.

Reviewed hashes:

- src/auth/authenticated.ts:
  e2cadf74c3b55f36aade026114d227317e49a77877441c26eb6bf8da4bcfd5bb
- docs/decisions/t06-implementation-adr.md:
  0bc712947825605215405624e55c2e4a8f6bf0baff59d87c5102963e8ac023d8
- dist/auth/authenticated.js:
  21125754b0423b9a1bfcf15ab050ab4ba4c3c80476a8e4b29188c529b009ad1b
- dist/auth/authenticated.d.ts (same c0–c2):
  b03ee1581ade04726807b5fa0c94794e87ecbc058085ee989ccab892f459f45f

## Sole remaining source blocker: cancellation priority over joined rejection

mapHookJoinProvenance2099–2114 restores ctx.joinError via mapAuthFailure BEFORE
checking caller.aborted or a genuine local invalidate/identity interruption. If an
original joined429/network/invalid-grant failure is recorded, then the caller aborts
(or facade is explicitly invalidated) before T05's final observing interruption,
the outer error is correctly operation_interrupted but the wrapper overwrites it
with reauthentication_required from the EARLIER non-cancellation join cause.

This violates the settled requirement that actual abort/fence interruption preserve
the observing-boundary operation_interrupted result. No unauthorized success occurs,
but the public cancellation/error classification is wrong. Resolve actual caller/
local invalidation interruption priority before restoring an earlier non-cancellation
joined rejection. Preserve original safe storage-error propagation when storage
failure itself permanently fenced the facade; do not confuse that storage fence
with an explicit local invalidate. No raw cause/body/token or new public error type.

Keep all admission/provenance/stage bounds, original non401 T05 metadata, private
storage distinctions and existing standalone S1–S3 behavior. Private bookkeeping is
Developer choice; this is ONE localized mapping/priority repair, not another broad
architecture pass. No QA internals or new tests supplied to Developer.

## Narrow current-context repair grant

New S4 production file and a concise appended ADR repair note ONLY; no index,
compatibility/API/dependency/accepted-module change needed. Permitted scoped early
ESLint/Prettier/typecheck and final four production checks/build; NO runtime/import/
custom diagnostic, QA reads/suite/install/fixture/provider/loopback execution.
Preserve c0–c3 evidence/history. Report c4 readiness/exact checks then HOLD for final
source gate. Current-context checkpoint90/stop120 applies; report partial if reached,
no automatic renewal. QA remains HELD and only a later named frozen relay grants
independent execution. Parent T06/S5/product-write/release boundaries unchanged.
