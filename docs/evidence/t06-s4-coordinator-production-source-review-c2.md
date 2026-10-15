# T06-S4 production c2 review — resource admission repairs remain

**Disposition: NOT SOURCE-APPROVED; c2 HELD, no relay/runtime grant.**
QA source gate is independently approved/HELD33authored, zero executed. This private
production review is Developer/Coordinator input only. No new API/shared-contract/
fixture/dependency authority; same bounded production repair scope.

## Verified improvements and static checks

Permanent previous-vault tolerance removed; expected/read-start/in-flight/live
matching now bounds known-byte tolerance to owner-read overlap. Central shared
outcome checks leader/fence/identity after executor await. Final resource guard is
inline after last owner await and uses CURRENT installed session deadlines, preserving
safe suppression metadata. Per-leg actual revision, exact pending identity and
unchanged public API/schema remain. These improvements close corresponding earlier
source findings, but do not close resource admission below.

Coordinator checked disposable Node24.21.0/npm11.19.0: typecheck and scoped auth
ESLint/Prettier ALL PASS exit0. Four production/build checks reported green by
Developer; no redundant full build for this rejected-source iteration. No target/
import/suite/fixture/provider/HTTP execution. S3 existing changed rows remain ONLY
index source+compiled JS/declarations, ADR and compatibility; accepted auth modules/
HTTP/storage/domain/root/manifests/config/dependency/QA inventory rows unchanged.
Index/compatibility/public declaration hashes exactly c0/c1.

Reviewed hashes:

- src/auth/authenticated.ts:
  f26de7a301a36100d27c3f9c87d83f333e40dc43dfe8fbe23651909c0825ee90
- docs/decisions/t06-implementation-adr.md:
  3a1d1305a0041d941b364a15f688db4841172c3272e2c0c9ca5e8adf6e035619
- dist/auth/authenticated.js:
  bbc7c6194d64e59a6f520a71d072c6a677bbb57e60c47b73dd65622e226b46ee
- dist/auth/authenticated.d.ts (unchanged):
  b03ee1581ade04726807b5fa0c94794e87ecbc058085ee989ccab892f459f45f

## Focused remaining requirements

### C2-P1 — Actual handoff, not an earlier awaited hook, is the admission boundary

Resource selectCredential checks refs.active BEFORE an awaited owner read; auth may
start during that read and leave an apparently live predecessor while prepare is
unacknowledged. Resource beforeDispatch checks active and may await a cycle, but
T05 then awaits that hook's result before its final synchronous isCurrent/handoff.
Another resource401 may start auth in THAT gap. isCurrent979 checks only local fence/
binding, so the resource can still hand off while active/pending auth is unresolved.

ADR's route-less synchronous constraint is not a waiver of the common contract.
Controls must stay non-waiting, and unrelated same-binding delivery must remain
permitted, but ACTUAL resource handoff must have a synchronous race-safe admission
invariant. Private per-leg/phase bookkeeping or other bounded synchronization is
Developer discretion; no public hook/seam or T05 edit is required/authorized. Do not
wait inside the synchronous callback, deadlock auth on its own cycle, serialize
whole network calls or accept unresolved-state sending merely because an earlier
hook joined. If a local race prevents handoff, do not silently consume the sole401
retry or produce a spurious missing-auth result; coordinate/fail closed according
to the existing bounded cancellation/auth semantics.

### C2-P2 — Joined auth failure cannot become arbitrary hook interruption

Late resource joins now occur INSIDE T05 selectCredential/beforeDispatch.
attachToAuth propagates the shared original auth failure. Accepted T05 deliberately
maps any hook rejection to operation_interrupted; orchestrateResource preserves
noneligible resource errors unchanged. Thus a joined429/network/invalid-grant auth
failure can emerge as operation_interrupted instead of S4's required
reauthentication_required, even when no signal/fence interruption occurred.

Preserve the PRIVATE provenance of joined auth outcome across the generic transport
hook boundary, and apply specified S4 mapping outside it: unresolved auth => safe
reauthentication_required; actual abort/fence => original observing-boundary
operation_interrupted; safe storage/local clock/state distinctions preserved.
Do not change T05 mapping or expose the original private response/cause. A null
credential during newly active/pending work is likewise not proof of missing login;
close selection admission after its awaited owner read. Terminal genuine missing
material and failed auth remain distinct as specified.

### C2-P3 — One-cycle stage accounting must cover ALL joins

stagedCycleConsumed currently guards only the expired-access branch of
ensurePreflightAuth. Its pending branches1735/1749 can still join another cycle
after the entry-active one was consumed. Additional selection/handoff-hook joins
are outside this accounting entirely. A valid interleaving can therefore exceed
ONE shared auth cycle per invocation's preflight/reactive stage while the method
still claims bounded stage semantics.

Account for stage consumption across late admission/joins as well as initial
preflight. If a different cycle becomes necessary after this stage already consumed
its one cycle, fail closed rather than silently join/start another. ONE S3 recovery
cycle may still contain original replay plus its single distinct rotation. Do not
expand cycle/dispatch bounds, autonomously retry or add an aggregate deadline claim.

## Narrow repair grant and stopping point

Repair the new S4 production file plus concise appended ADR/bounded compatibility
notes ONLY; preserve prior readiness/review history and accepted interfaces/modules.
Focus on these admission/provenance/bounds requirements, not a broad redesign or
framework. Source typecheck/lint:production/format:check:production/build and scoped
owned ESLint/Prettier only. NO QA reads, runtime/import/custom diagnostic, suite,
install or fixture/provider/loopback execution. Report c3 readiness/exact checks
then HOLD for review. Current-context checkpoint90/stop120 remains; report partial
if reached, never silently renew. QA stays HELD; only later reviewed frozen relay
can authorize independent behavioral execution. S5/parent/product-write/release
boundaries unchanged.
