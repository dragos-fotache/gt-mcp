# T05 coordinator production re-review — c1 NOT accepted

**Disposition: FAIL; c1 is not a QA-relayed artifact.** Developer/coordinator-only
production review, never QA input. Derived from approved public spec, repaired
production sources and independent coordinator synthetic public-entry observations;
no QA test/source/plan detail appears here. No shared-contract changes.

## Progress and retained evidence

Developer reported P1-P13 repaired and four production checks PASS, then held all
source/build/install actions. Coordinator captured18source/emitted-file c1 inventory
SHA256 `e4f271b1dafe712fe4abb9796c05042704752365d1f0179585b0ca0f898f0559`.
Root manifest/lock/compiler/lint/Vitest hashes remain unchanged. c0 remains failed,
not retroactively accepted. ADR retains its repair history; top sections need
historical labelling to avoid contradictory current depth64/maxHeadersCount claims.

Coordinator reran the ORIGINAL11no-network c0observables on c1: **11/11PASS**.
The retained script's printed candidate label still says c0; this rerun explicitly
targeted the above c1 inventory, not c0bytes. No initial result was overwritten.

Coordinator independently repeated on provisioned Node24.21.0/npm11.19.0:
- npm run typecheck:PASS;
- npm run lint:production:PASS;
- npm run format:check:production:PASS;
- npm run smoke:100/100PASS (matrix regression repaired);
- npm run test -- test/unit/t03:221/221PASS.
No build/install during review. Developer's build pass and emitted output exist;
independent clean-source reproduction is still later. No whole-suite/parkedT02.

A second coordinator-only11case boundary probe used injected sender cases plus
three OWNED ephemeral literal-loopback HTTP/HTTPS/raw-head fixtures:
**2/11PASS,9/11FAIL**, exit1. Both ordinary production HTTP and fixture-trusted
HTTPS positive reads passed; failures below remain blockers. No external services,
actual product writes, raw body/token/PEM outputs or personal trust changes.
All owned probe sockets/server handles closed. Probe source is NOT Developer/QA
input or an independent QA suite. Concrete safe reproduction is coordinator-held;
Developer gets only public-spec observables and its own source locations.

## C1-F1 — Default sleeper cancels itself before retry (FAIL)

sleepBetweenAttempts arms linkSignal for exactly delayMs, then default sleeper
arms its completion timer for the SAME delay. Earlier abort timer fires first,
so ordinary positive backoff becomes a network_error after1attempt. Probe valid429
followed by201 with20ms configured backoff/1000ms total should succeed on attempt2;
observed network_error/uncertain/attempt1. Zero delay has the same ordering risk.
Race sleep against REMAINING TOTAL deadline/caller abort, not the duration being
slept; afterward enforce monotonic remaining budget. Preserve original mapped
error when retry cannot fit. Do not add arbitrary timing grace/padding.

## C1-F2 — Selected bearer omitted from sensitive code screen (FAIL)

runAttempt passes only call/profile-sensitive strings into mapResponse and never
adds its selected bearerToken. An otherwise grammar-safe unknown errorCode
containing the EXACT selected synthetic bearer was returned as backend_error with
backendErrorCode retained. Expected internal_error with unsafe original omitted.
Include selected credential(s) under the call's sensitive context before envelope
classification, without ever logging/copying it into an event or exception. Fixed
known-code whitelist exemption remains; unrelated backend message text never
changes safety. Current code screens raw control tokens but not bearer credential.

## C1-F3 — message field type validation removed (FAIL)

readErrorCode now ignores the message field's type altogether. Public spec (and
OpenAPI) allows absence/string/null, NOT number/object/boolean.404not_found with
message:7 incorrectly returned definite not_found; required malformed internal_error
and conservative mutation uncertainty. Validate TYPE ONLY, never interpret or emit
message content. Accept/ignore null, ignore hostile valid strings, reject other
types. Do not undo the coordinator's nullable-message contract correction.

## C1-F4 — Exact prototype still permits own byte-view getter shadows (FAIL)

captureBodyBytes checks prototype then directly reads value.buffer/byteLength/
byteOffset and buffer.resizable/detached. Ordinary Uint8Array with its normal
prototype may still define an OWN getter on these names. Probe accessor fired once;
required0. Use trusted native slot getters or explicitly reject shadows by own
descriptors BEFORE any read. Same backing-buffer descriptor safety and wire tuple
accessor protections matter; tuple array reads currently still invoke getters.
No arbitrary accessor/toJSON execution is permitted by validation. Do not treat
instanceof/exact prototype as proof that property access is inert.

## C1-F5 — Fenced received error loses conservative uncertainty (FAIL)

preDeliveryGate result fenced sets uncertain ONLY when mapped.kind===success.
Approved sections5/8 apply suppression uncertainty to ANY received non-GET result.
Probe dispatched429 then final fencefalse returned operation_interrupted with
outcomeUnknown:false; expected true. Preserve prior state and conservatively set
for suppressed/fenced error as well as success. This is not proof that429committed;
it reports inability to deliver an authorized complete outcome under the fence.

## C1-F6 — Final pre-send synchronous guard can expire/abort yet send (FAIL)

The clock/abort sample precedes isCurrent, remaining budget uses stale guardNow,
and there is no post-isCurrent abort/deadline gate before actual sender handoff.
Probe trusted final guard advancing injected monotonic clock past deadline while
returning true still invoked sender1time; expected0. A synchronous guard can
consume actual CPU time or synchronously abort the caller too. Recheck after all
synchronous hooks and handoff preparation. Do not increment attempt/dispatched
until actual sender invocation. The same final delivery gate checks BEFORE its
last isCurrent then uses reporting elapsed that swallows clock faults; close both
edges without repeated undocumented callbacks that obscure the intended ordering.

## C1-F7 — Pre-delivery deadline still renewed/misclassified (FAIL)

preDeliveryGate still uses deadlineMs-entry.start (entire original lifetime), not
remaining. Its timer expiry throws ClockFault; runAttempt turns it into
internal_error with unchanged uncertainty. Probe received201 then nonsettling
pre-delivery hook observed internal_error/outcomeUnknown:false/attempt1; expected
network_error/outcomeUnknown:true. Use remaining call time, distinguish valid-clock
deadline expiry from invalid/receding clock. Any post-handoff loss/suppression
retains/set uncertainty; a catch must not fabricate definite rejection. Recheck
remaining budget before entering each awaited hook and after sync decode/projection.

## C1-F8 — Aborted-at-entry awaitHook leaks rejected promise (FAIL)

Hooks are invoked BEFORE awaitHook checks internal.aborted. If a hook synchronously
aborts caller then returns a rejected promise, awaitHook throws without attaching
a handler to that promise. Independent probe observed one unhandledRejection;
required0. Always consume late promise rejection even when the abort already won.
This must also hold for select/beforeDispatch/pre-delivery, sender and async event
returns. Rejection payloads stay private; do not emit/inspect native messages.

## C1-F9 — Phantom trailer head breaks response-header equality (FAIL)

wire.ts on end calls accountHead(status,trailerPairs) even when no trailers exist;
accountHead always adds a COMPLETE HTTP status line + CRLF. Thus a second imaginary
head is charged for ordinary responses. Owned raw fixture normalized head4092bytes
(actual head4094bytes, configured limit4096) and otherwise-valid complete record
incorrectly returns internal_error. Expected success: no trailer bytes exist.
Count real informational heads with their status lines; real trailer fields count
only their fields/terminator, never another HTTP status line; absent trailers add0.
Keep cumulative limits/no-classification-trailer rule, do not relax size budgets.

## Remaining review notes

- Current c1checks fix the original11observables and baseline matrix. These are
  not sufficient for acceptance; broader independent QA remains mandatory.
- Byte/control scanner is now iterative, hidden depth64restriction removed. ADR
  still has unlabelled earlier present-tense descriptions; make history/current
  distinction clear, not erase retained failures.
- All returned failures must retain dispatch/uncertainty; unexpected catch paths
  must set conservative uncertainty as appropriate, not merely copy stale false.
- Public exact type/descriptor/readonly behavior must remain aligned while fixing;
  no new dependencies/manifest/config/compiler changes or production-root edits.

## Next repair window

c1 CLOSED/not accepted. Reopen ONLY existing Developer src/http/ADR/compatibility
scope for C1-F1..F9 and accurate historical notes. No QA/coordinator probe reads or
runtime execution by Developer; only four production checks then new artifact-ready
and full hold. Coordinator independently repeats failed observables/new boundaries
before considering a new freeze. QA repairs its own harness independently; no
cross-role code or tests are relayed. No current task completion, successor,
product writes, live credentials/backend, .pi edits, staging/commits or release.
