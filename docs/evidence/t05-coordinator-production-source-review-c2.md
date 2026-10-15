# T05 coordinator production re-review — c2 NOT accepted

**Disposition: FAIL on remaining boundary cases; no QA relay.** This is
Developer/coordinator-private production review, NOT QA input. Findings derive
from approved public spec and production sources/public-entry probes only.
No shared-contract change or cross-role test/source disclosure.

## Verified progress

Captured18source/emitted-file c2 inventory SHA256
`bd642420d9253d6ec170be072011130af69039a2c3e54c7235bf6c543afee058`.
Only transport.ts/validate.ts/wire.ts changed among production files since c1;
errors/index/query source hashes unchanged. Developer again held all edits/build/
install. Coordinator reran BOTH retained probe sets against c2:
original c0observables11/11PASS; c1boundary observations11/11PASS, including real
owned loopback HTTP/HTTPS positives and corrected absent-trailer header budget.
Their scripts retain historical c0/c1 printed labels; the executable target was
this c2 inventory. No failed historical result is overwritten.

Coordinator repeated on provisioned Node24.21.0/npm11.19.0:
`npm run typecheck`, `npm run lint:production`,
`npm run format:check:production`, `npm run smoke`100/100,
`npm run test -- test/unit/t03`221/221: ALL PASS, chain exit0.
No install/rebuild during review; independent clean build remains later.
No parkedT02/full-suite execution, no T04 provider rerun claimed.

Changed sleep/bearer/message/descriptor/trailer paths reviewed. Further coordinator
NO-NETWORK synthetic public-entry boundary probe: **0/4PASS,4/4FAIL**, exit1,
covering the three defects below. These are not QA tests and their source is not
Developer input. No raw data/secrets/PEMs output, personal service or product write.

## C2-F1 — Calling a sender that throws synchronously IS handoff

transport.ts moved attempts++/everDispatched=true AFTER invokeHook(sendRaw)
returns. Its comment says a synchronous throw means sender was never invoked;
that is false. A sender can perform its side effect, then throw before returning
a promise. An independent probe incremented a synthetic entry counter then threw:
entered1 but result network_error/dispatched:false/outcomeUnknown:false/attempts0.
Required network_error/dispatched:true/outcomeUnknown:true/attempts1 (maxAttempts1).

Mark conservative handoff immediately BEFORE calling the valid captured sender,
not after it returns. Both synchronous throw and rejected promise follow the
same counted-attempt, potentially-committed network failure/retry rule. Local
validation/fence/deadline failures BEFORE invocation still have attempts0.
No first-byte/connection/native-exception inference or lost uncertainty allowed.
Retain caller-abort precedence and bounded identical replay for eligible routes.

## C2-F2 — Post-guard rechecks apply to ERROR delivery as well as success

buildSuccess now rechecks abort/deadline after its final synchronous guard, but
preDeliveryGate ends by returning pass from isCurrent without those rechecks.
For a received definitive404error, a guard that synchronously aborts (then returns
true) still delivers not_found/outcomeUnknown:false. A guard that advances clock
past the deadline likewise delivers not_found/false.

Two probes require operation_interrupted/true and network_error/true respectively,
with dispatched:true/attempts1 in both. ALL received outcomes, success/error/retry,
must pass the same fresh post-synchronous guard. Do not restrict the corrected
rule to buildSuccess; no authorized result can be delivered after caller abort
or expired deadline. Broken/receding clocks remain internal_error with conservative
post-dispatch uncertainty. Keep current success behavior and avoid redundant
callback sequences that conceal an unchecked terminal error path.

## C2-F3 — Backing-buffer inherited getters still execute

checkByteView rejects own buffer/resizable/detached shadows but reads
backing.resizable/backing.detached through the backing object's prototype chain.
A genuine ArrayBuffer SUBCLASS can define a prototype getter; an ordinary exact-
prototype Uint8Array over that backing buffer passes the current checks and
invokes it. Probe observed getter1; required0. Use native internal-slot accessors
(or reject unsupported backing prototypes BEFORE lookup) so neither own nor
inherited user getters execute. Apply the same descriptor discipline to every
validated native view/backing field. Preserve valid Uint8Array/Buffer byte offset/
length, no shared/resizable/detached input, and preallocation size guard.

## Next window

c2 CLOSED/not accepted. Reopen ONLY existing Developer production/ADR/bounded-notes
scope for C2-F1..F3; no QA/coordinator probe reads or runtime execution by Developer.
Four permitted production checks then new held artifact. Coordinator repeats all
failed sets independently; QA source/calibration review remains separate and
production targets remain closed. No dependencies/manifest/config/compiler changes,
real writes/services/.pi/staging/commits, successor work or release.
