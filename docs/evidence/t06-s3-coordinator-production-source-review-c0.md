# T06-S3 production source review — c0

**Disposition: NOT source-approved.** One scoped cancellation repair required;
no frozen relay/QA target execution/acceptance. Developer may repair only the
finding below under the original bounded S3 window, then report and HOLD.
QA receives common specification semantics, not this private production review.

## Reviewed scope and checks

Read full src/auth/recover.ts (1380lines), additive auth index, ADR section9,
bounded compatibility notes and settled S3 work order. No shared contracts,
provider/transport/vault/errors or S1/S2 implementation changes required.

Coordinator pinned Node24.21.0/npm11.19.0: typecheck, lint:production,
format:check:production and build ALLexit0. Comparison with accepted S2 inventory:
252/257prior frozen rows unchanged; exactly five allowed entry/compiled-entry/
ADR/compat rows differ. All inventoried S1/S2 implementations, vault/errors,
storage/transport/domain/metadata and prior QA sources unchanged. New recover
source/emitted files additive. Static success is not behavioral acceptance.

Source audit confirms read-only capture/open; unchanged v2 decoder; exact persisted
body/key replay without predecessor expiry inference/new prepare; same-account
strict grant validation; atomic recovered installation before at-most-one distinct
prepare/dispatch; no operation-store calls; original safe error/evidence retention;
same-kind cycle sharing and non-destructive mixed-kind rejection; awaited commits
and post-clock prepare/install fences. Imports top-level inert by source audit only.

## C0-1 — terminal recovery clock abort can resolve shared outcome successfully

src/auth/recover.ts runFreshRotation terminal evaluation (last doneNow clock read)
checks signal/fence BEFORE nowMs, but performs no signal/fence recheck AFTER that
trusted callback before returning successful shared-cycle execution. A clock that
synchronously aborts the leader while returning live expiry time causes execution
to resolve the shared outcome. The leader's attachment rejects interruption, but
an unaborted follower can receive success because it checks its own signal/local
fence, not the leader's abort. This violates the work-order requirement that leader
abort gives nonaborted followers the shared failed outcome, and inherited post-clock
cancellation safeguards. It is a cancellation boundary, not a same-process malicious
callback/sandbox guarantee.

Required observable repair: terminal fresh recovery success must be guarded AFTER
the trusted clock callback; leader cancellation or local invalidation must fail
the entire shared cycle as operation_interrupted, not just the leader waiter.
Keep already-begun/completed commits installed; no rollback, extra dispatch/key,
new API or evidence deletion. Audit the other recovery terminal clock paths for
same ordering. Developer chooses implementation internals.

## Readiness clarification

Developer readiness says seven runtime exports confirmed but no custom runtime
executed; request exact confirmation command/method to distinguish source/declaration
inspection from an out-of-grant built-entry import diagnostic. This is not an
assertion that such a diagnostic happened. Preserve any disclosed deviation and
never count it as independent behavior evidence.

## Next gate

Scoped repair + permitted production/source checks, then HOLD for re-review.
No tests, custom runtime diagnostics, source expansion, install or successor.
Independent QA source review proceeds separately. No S3/parent/release acceptance.
