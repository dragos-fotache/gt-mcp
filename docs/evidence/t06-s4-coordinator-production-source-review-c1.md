# T06-S4 production repaired-source review c1 — focused repairs remain

**Disposition: NOT SOURCE-APPROVED; c1 HELD, no frozen relay/runtime grant.**
Same bounded Developer source/four-production-check repair window; QA source repairs
remain separate. Initial c0 readiness/rejection and ADR§10/§10.6 retained honestly.
No behavioral test executed or acceptance claimed.

Reviewed c1 controller/hooks/commit/admission/revision/delivery changes, unchanged
entry/factory contracts and appended ADR against P1–P4/common adjudication. Private
implementation details below are Developer/Coordinator only, NOT QA input.

## Static/integrity observations

Coordinator pinned Node24.21.0/npm11.19.0: npm run typecheck and scoped auth
ESLint/Prettier --check ALL PASS exit0. Developer reports four production checks/build
exit0; full root lint/format/build not independently repeated for this rejected-source
iteration. No runtime/import/fixture/provider/suite execution. Same five existing
S3 inventory rows changed as c0; accepted session/refresh/recovery/validation/vault/
HTTP/storage/domain/root/config/dependency/QA rows unchanged. Auth index and
compatibility hashes exactly c0; new public declaration hash exactly c0.

Reviewed hashes:

- src/auth/authenticated.ts:
  a8c124b9bff0303a7506585ab240fb7ea8a45dd2f6a1fb45d212c3a1368dd36b
- docs/decisions/t06-implementation-adr.md:
  d1f3df853adaa6d5077ba942d19252f303811cbea6cbfa1e45bb2ed1d37ab128
- dist/auth/authenticated.js:
  ecf177019f2fb5dcc0d5b9682f823c05bc454a5bbe75938ec651caad104a5ebf
- dist/auth/authenticated.d.ts (same c0):
  b03ee1581ade04726807b5fa0c94794e87ecbc058085ee989ccab892f459f45f

## Improvements retained

Preflight now joins an already active cycle at entry, private per-leg selection
records actual bearer revision/grant via Node builtin AsyncLocalStorage, fresh-only
rotation now checks installed access/refresh after its terminal clock, and final
suppression constructs safe final-leg TransportError with conservative mutation
uncertainty. No public API/seam/dependency/schema expansion. Entry-class/head-budget
questions correctly settled; no class-only rewrite needed.

## Remaining source blockers

### C1-P1a — Prior-vault acceptance cannot be permanent rollback tolerance

checkOwnerMatches655–671 unconditionally accepts refs.vaultPrevious, and
endOwnedCommitSuccess681–685 retains it indefinitely. A NEW owner read begun after
an acknowledged successor install can therefore accept an EXTERNAL rollback to the
previous prepared record as if an owned transition were still in progress. Accepting
an old snapshot parameter across arbitrary later reads has the same provenance
problem. This is not permanent external-drift detection.

Bound tolerance to the actual owned transition/read overlap. A fresh read after
acknowledgement must require current durable bytes absent another in-flight owned
transition; an earlier read completing across a real owned transition must not be
falsely fenced. Do not accept any historical known bytes forever or weaken exact
external-drift fences. Private synchronization/version/read-provenance mechanism is
Developer choice; no public seam, T04 edit or generalized runtime framework.

### C1-P1b — Resource hooks can still hand off during unresolved auth

selectCredential still ignores refs.active when pending is not yet acknowledged.
Resource beforeDispatch and final synchronous isCurrent likewise do not admit only
resolved auth state. A leg that passed preflight before another caller started auth
can pass awaited hooks and hand off during its prepare/commit interval. Returning
null for pending in selection is also NOT a rejoin strategy: orchestrateResource
rejoins only delivered401; undispatched authentication_required is thrown unchanged,
despite the comment that orchestration rejoins auth.

Close admission at the ACTUAL resource selection/handoff boundary, not only initial
preflight. Coordinate late-started auth needs without sending a pending predecessor,
spurious missing-auth failure or deadlocking control hooks on their own cycle.
Preserve overlapping resource IO, per-leg revision, at-most-two resource handoffs
and one auth cycle per preflight/reactive stage. Implementation details remain private.

### C1-P3 — Final shared settlement and one-cycle stage bound

runLeaderAuth1213–1229 awaits the executor then resolves shared success without a
terminal leader/fence check AFTER that await. A cancellation arriving in that gap
can be caught only by leader attachment while live followers receive success. Check
shared terminal outcome at its actual settlement boundary, not solely inside an
async nested executor before its return.

ensurePreflightAuth joins an active cycle and then continues deadline/pending checks
that can start another fresh cycle if the just-installed grant expires. The work
order permits at most ONE shared cycle per stage. Recheck usability after join, but
fail reauthentication rather than silently start a second cycle in that stage.
Exact replay/optional follow-on inside ONE S3 cycle stays allowed.

### C1-P4 — Guard belongs at actual return; current session versus historical leg

orchestrateResource awaits deliverReceivedSuccess, which calls the synchronous
final guard internally and then resolves. The caller therefore yields AGAIN after
that guard before returning the resource outcome. ADR§10.6's claim of "no further
await before delivery" is not true at the public resource settlement boundary.
Perform the last synchronous signal/fence/clock/identity checks AFTER every final
await, immediately before actual resource outcome settlement. Preserve safe
TransportError suppression metadata and original safe storage/T05 errors.

checkFinalDelivery also treats dispatched legGrant expiry as an independent fence,
ignoring a usable CURRENT durably installed successor. That suppresses an accepted
same-binding response merely because an older bearer aged during unrelated rotation.
The common adjudication now explicitly states current-session deadlines govern this
final usability decision; rotation alone is not sign-out/replacement. No account/
generation change, rollback, extra refresh or result leakage is authorized.

## Repair grant and next gate

Read this OWN production review plus common updated adjudication/work order; NEVER
QA tests/helpers/reviews/private evidence. Same src/auth/ADR/bounded compatibility
paths only, no API/dependency/seam/accepted-module change. Preserve histories and
append concise honest repair notes. Typecheck/lint:production/format:check:production/
build and scoped owned ESLint/Prettier only; NO suite/import/custom-runtime/install/
fixture/provider/loopback execution. Source readiness then HOLD for c2 review.
Current-context checkpoint90/stop120 remains: report partial rather than silently
renew context. No broad proposal, S5/product writes/release or automatic successor.
