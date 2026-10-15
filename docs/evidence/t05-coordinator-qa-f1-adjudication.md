# T05 QA f1 repair relay — targeted verification fixes only

QA/coordinator-private edit instructions; NOT Developer input. Common authority:
[public f1adjudication](../decisions/t05-f1-verification-adjudication.md). It resolves
all6observed failures without changing production/shared behavior. Failed f1and
focused17/20observations remain retained. c3 production stays held; no tests yet
counted passed by this adjudication.

## Exact source repair scope

1. `test/unit/t05/04-hooks-fences-dispatch.test.mjs`: replace the over-rigid exact
   synchronous-current trace count with assertions of REQUIRED temporal ordering,
   unchanged2wire handoffs/attempt numbers, frozen summary/capture and pre-send/
   pre-delivery checks. Additional same-binding synchronous guard permitted, but
   never remove required guard/order or state-transition assertions.
2. `test/unit/t05/02-validation-identity.test.mjs`: own __proto__ on STRICT query
   input is unknown and must reject invalid_arguments/zero sends/no pollution.
   Preserve positive additive-name coverage using an otherwise-valid BACKEND
   response with an actual own JSON __proto__ convenience member; assert retention
   and no prototype pollution. Do not relax tool argument validation.
3. `test/unit/t05/import-smoke-child.mjs`: materialize harness-owned standard
   streams before listener/resource baseline. Coordinator native node:http control
   and warmed transport import both establish zero NEW resources/no unexpected
   output; keep exact zero delta and all parent11-import-smoke assertions. No
   generalized interception or broad PipeWrap exemption.
4. `test/fault/t05/production-limits.test.mjs`:
   - construct bytes before slicing for truncation; keep exact internal_error/
     no-auto-retry/one connection and no success. Use graceful partial response
     termination/request draining or another deterministic native stimulus; do
     not claim a local write callback proves remote application receipt;
   - forbidden Content-Length trailer correctly causes malformed internal_error;
     retain fail-closed/no retry. Preserve benign-trailer success; add only the
     small native-valid Retry-After trailer case needed to show metadata does not
     supply/override header classification (e.g. maxAttempts1 avoids a wait/retry
     framework). Native Node accepts that trailer, but transport must not use it;
   - drain request bytes in the upgrade fixture before observing client-caused
     close. Preserve internal_error/read uncertaintyfalse and bounded peer closure
     BEFORE teardown, no server-side forced close masquerading as client cleanup.
5. `test/fault/t05/helpers.mjs` may change ONLY if minimal shared raw-socket draining
   is preferable to case-local draining; no helper framework expansion. Preserve
   owned bounded teardown and request capture/no-secret-output behavior.
6. QA evidence `t05-qa-*` may record repair mapping and source checks. Do not change
   the frozen f1inventory/relay or production/package/config/public spec files.

## Allowed now / not yet

Close f1target windows before edits. Use pinned node --check and scoped ESLint/
Prettier on the affected files (and any changed helper), no rule/config relaxation.
No Vitest/target/provider/build/install execution during repair, no other core
suite expansion or deferred harness work. Existing19file source gate can be
repeated cheaply at readiness; full regressions are NOT requested for this edit.

Report changed paths, exact focused source checks and hold. Coordinator reviews
the small changes, creates f2inventory, and grants a FOUR-SUITE focused run:
02-validation-identity,04-hooks-fences-dispatch,11-import-smoke,production-limits.
No need to repeat all15immediately. If focused checks pass, final full bounded
owning + unchanged foundation/T03/T04 and clean locked snapshot still follow.

Developer remains held, no QA source/private evidence sent to it. No real/live
credentials/services/writes, .pi edits, staging/commits, successor or acceptance.
