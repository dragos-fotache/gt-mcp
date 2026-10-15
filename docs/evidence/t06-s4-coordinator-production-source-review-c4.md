# T06-S4 production source gate — c4 approved, HELD

**Disposition: production c4 SOURCE-APPROVED/HELD.** All Developer source/build/
install/runtime windows CLOSED. Independent QA source gate approved33authored,
ZERO executed. No S4 acceptance/parent completion or blanket execution permission;
only a separate named frozen relay may open the exact QA selection.

## Review and repair closure

Reviewed final mapping-priority delta, synchronous invalidate bookkeeping and ADR
§10.9 against the [common adjudication](../decisions/t06-s4-interface-adjudication.md)
and S4 work order. Caller abort/explicit invalidate now preserve observing-boundary
interruption BEFORE restoring an earlier non-cancellation joined cause. The private
invalidated flag distinguishes local invalidate from storage-failure fencing, so
original safe storage error provenance is still restored. No new error/API/leak
surface; c0–c3 readiness/reviews/ADR history preserved.

Prior source findings are closed by reviewed repairs: read-provenance-bounded owner
matching instead of permanent prior-vault tolerance; active preflight/hook joins,
private stage consumption and synchronous per-leg auth-epoch handoff admission;
actual selected-bearer revision; shared terminal abort/fence guard after executor
await; exact S3 durable recovery/prepare/install/account/expiry invariants; current
installed-session final usability guard inline after final owner await; conservative
safe mutation suppression and joined-error mapping outside unchanged T05 hooks.

Source audit confirms eight-export internal facade, no public credential/control/
sender capability, opening read-only and import inert apart from accepted transitive
T03 in-memory registry initialization. Node builtin AsyncLocalStorage construction
supplies private context, not network/IO/timer/global-handler startup. Root/CLI/
server/companion inert; no lifecycle/config/write guard/product delivery claim.

These are source-review conclusions, not executed race/durability/HTTP evidence.
Stale handoff admission fails closed without a wire attempt or consuming the401
retry; no automatic in-call re-admission worker. Ordinary explicit later invocation
may retry with current preflight. No OS-sandbox/power-loss/provider/backend claim.

## Independently checked static/build integrity

Coordinator checked disposable Node24.21.0/npm11.19.0 and repeated:

- npm run typecheck: PASS exit0.
- npm run lint:production: PASS exit0.
- npm run format:check:production: PASS exit0.
- npm run build: PASS exit0.

157production/source/compiled/config/document rows unchanged before/after; rebuilt
candidate bytes identical to Developer c4 output. Four approved QA source hashes
unchanged. S3 inventory has only five authorized changed existing rows: additive
index source+compiled JS/declarations and ADR/compatibility. Existing auth/session/
refresh/recovery/validate/vault/errors, T04/T05/domain/root/manifests/config/dependency/
QA inventoried inputs unchanged; new S4 source/compiled/test/spec inputs additive.
No QA suite/fixture/provider/HTTP/custom-runtime/import execution in this gate.

Final candidate hashes:

| Path | SHA256 |
| ---- | ------ |
| src/auth/authenticated.ts |7c109c178b8d68755e17ae98adc2838c215194ee4bc2acec64ecebf1fd8dcca6|
| src/auth/index.ts |c9f764d34189ce838c6c84fada47dcdfa584cb4b8d40642dedade07cfa3d94b9|
| docs/decisions/t06-implementation-adr.md |62d423fefcc69a1e19fa83bf7ed2e2935c7b9acfecad88ec306fcdcb266c6aee|
| docs/compatibility.md |600ae3609c64203a0395fda9e81bb639c831294b4bb4523adecdf7dd0f6a5d11|
| dist/auth/authenticated.js |3d292d24b5d94bbf71e235924b00b3af00357bfa2994bae681321d092f3512eb|
| dist/auth/authenticated.d.ts |b03ee1581ade04726807b5fa0c94794e87ecbc058085ee989ccab892f459f45f|

## Hold and next gate

Developer HOLD ALL edits/checks/build/install/runtime; only asynchronous
acknowledgement/concrete blocker reporting absent new scoped grant. QA reads common
specs and its own gate, NOT this private production review/ADR/source/emitted JS.
Coordinator freezes exact jointly approved source/compiled/test/spec inputs, verifies
inventory/checksum and issues named QA owning33 then unchanged regressions202 grant.
Final clean locked source reproduction and small isolated eight-export smoke/source
audit still required. No source approval implies behavioral/whole-suite/release
acceptance; S5/parent/product-write/staging/commit/context-renewal limits unchanged.
