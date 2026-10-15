# T05 QA source/calibration re-review — R3 NOT ready

**Disposition: FAIL; no production target execution.** QA reported R2 repairs,
43parse checks and native calibration. Coordinator reviewed the committed runner/
shims, child/proxy lifecycle, helpers and changed size/error oracles. This is
QA/coordinator-private, never Developer input. No production source used here.

## Confirmed progress

Coordinator repeated the committed10artifact-free import controls on provisioned
Node24.21.0: clean exit0/one report;9violators exit nonzero with their expected
filesystem/network/timer/listener/spawn/output/exit tags. No production imports
or private/live data. Those PARTICULAR controls behave as reported, not proof of
all intercepted surfaces. TLS copied fixture inventory was already independently
verified8/8. Earlier parse passes and helper improvements remain credited.

## R3.1 — Head-limit oracle remains contrary to public spec

production-limits now asserts result_too_large for head count/size, informational
head exhaustion and trailer head-count exhaustion. Approved spec/R2review explicitly
require malformed/internal_error for HEAD/parser limits; result_too_large is BODY/
projected-data overflow. Fix exact code/uncertainty/retry assertions; do not reinterpret
head failures as body-size failures. This is NOT a production behavior accommodation.

The latest trailer exact-boundary additions set maxHeadBytes around100bytes, BELOW
legal minimum4096; they fail at factory before any stimulus. Use otherwise-valid
padded heads/trailers >=4096 with independent actual+normalized accounting; equality
and one-over must both use legal configurations. Preserve actual Node parser head
limits and reason-phrase overhead so a parser failure does not mask trailer logic.
Require a wire-request precondition and successful equality control.

## R3.2 — Child result shape makes every successful assertion fail

Both async child runners resolve `{timedOut:false,code,signal}` on normal close,
but callers repeatedly assert timedOut===undefined. Assert the actual intended
contract exactly (false for normal, true for timeout), code0, signalnull, no error,
exact bounded JSON line count and stderr. Do not drop timeout assertions.

Timeout path currently kills then resolves immediately BEFORE close/reap. Await
owned child's actual close after kill; use an explicit bounded escalation/cleanup
path and fail if it cannot be reaped. Bound stdout/stderr COLLECTION bytes, not
only elapsed time; no unbounded string accumulation or raw native exception echo.
Use finally cleanup even on assertion/parse/listen failure. Calibration must run
these COMMITTED runner functions, not similar one-off /tmp logic alone.

## R3.3 — Six independently reproduced interception bypasses

Coordinator used ONLY synthetic files in an owned disposable directory, removed
afterwards; NO production/node_modules or personal files. All six forbidden controls
exited0, no violation tag, reported clean:true:

1. named node:fs readFileSync of an arbitrary synthetic `.js` file;
2. named node:fs openSync of a synthetic `.js` file with mode`w` (file truncated);
3. default node:fs export appendFileSync (file changed);
4. unprefixed `fs` writeFileSync (file changed);
5. default node:fs export promises.writeFile (file changed);
6. node:timers named setTimeout followed by clearTimeout (no active-resource delta).

The extension-wide loaderAllowed exemption is a broad public runtime filesystem
bypass, not an identified module-loader operation. It also lets open/openSync WRITE
because those are wrapped as reads without checking flags. Remove the filename-
suffix exemption; if a true loader action requires allowance, identify the precise
loader-only mechanism, not any caller path ending.js/package.json. Legitimate
synthetic multi-module import should still pass with all PUBLIC runtime IO denied.

Default fs proxy only wraps readFileSync/writeFileSync, export-star leaks other
methods, default promises surface and bare builtin aliases bypass ESM-only node:
resolution. Guard documented named/default/CJS(createRequire) forms or explicitly
calibrate and close them; file descriptor IO/open flags must not escape. Timers
must cover node:timers/promises and cleared/unref forms, not globals alone. Listener
prototype/register-then-remove and net.Socket/server/HTTP2/TLS entry forms need
appropriate control coverage before a blanket IO/network/process claim.

Keep ONLY public pinned-Zod in-memory exception; do not broaden to allow IO in
order to make a target import pass. Avoid printing attempted private path/data in
violation tags: report a fixed class/API label, not firstPath(args). Controls must
prove no file mutation escaped, not just that a tag happened later. Existing nine
positive detections do not compensate for these six silent bypasses.

## R3.4 — Claimed cookie repair is not in committed helper

helpers.mjs jsonResponse STILL calls writeHead(status,headers) then getHeaders,
without the reported setHeader change. Native /tmp calibration of a DIFFERENT
setHeader implementation does not validate this committed helper. Repair and
calibrate the actual shared helper (all callers), preserve Set-Cookie precondition,
then test no returned cookie. Evidence must distinguish hypothetical/native API
calibration from the committed source bytes.

cleanup-calibration.test.mjs still lacks robust try/finally on resource ownership,
contains a no-op waitForDeadline(()=>true), and permits one new Timeout while claiming
no timer leak. Use genuinely controlled fixture baselines, exact owned cleanup,
error listeners and always-reap paths; no vacuous timing/control claims. A timeout
must remain failure, not cleaned-up-and-reported-pass.

## R3.5 — Proxy trap ownership and calibration limits

Async spawning addresses the earlier event-loop deadlock, but traps still need
bounded full lifecycle. Forward trap close has no deadline/tracked connections;
CONNECT tracks client sockets but not outbound server sockets, accepts arbitrary
host/port from a request and accumulates an unbounded head. Restrict routing to
ONLY the known owned literal-loopback target/port, cap request head, track/destroy
both sides with close/error handling and bounded shutdown. Tests/calibration must
not become a generic local forwarder to unexpected destinations.

Assert native positive-control AND target child terminal status/output conditions,
actual owned target requests and no extra proxy contacts. Reintroduce genuine
runtime global-proxy replacement control if claimed (startup flag alone is not
runtime replacement); keep no-proxy bypass distinct. Native dependency behavior
observations remain scoped, not a broad claim all proxyEnv shapes behave identically.

## R3.6 — Evidence/toolchain corrections

Readiness text says all runs used pinned runtime but separately reports a
v26system-node trial. Record its exact safe command/version/context as a process
deviation (or clarify if that statement was inaccurate); no system Node fallback
was authorized. Do not hide it or count that run as conformance. All further commands
MUST use provisioned T01_NODE_HOME; standing Herdr permission is unrelated.

Current NOT RUN paragraph says no import/loopback execution at all, although native
artifact-free imports/fixtures WERE authorized and run. Correct to no PRODUCTION
imports/loopback/suites. Label prior all17addressed/definite-prehandoff/broad-oracle
claims explicitly historical/rejected rather than leaving contradictory current
statements. Record reproducible exact safe native commands, source/inventory hashes,
expected/observed results and limitations for COMMITTED calibration helpers; bare
/tmp script names and success prose are insufficient reproduction evidence.

## Current repair window

Continue owning source/evidence repairs plus parse/import checks and strictly
artifact-free Node-builtin/synthetic owned-fixture calibration under the already
published grant. No src/dist/domain/production/node_modules imports, target suites,
installed tools, provider/build/install or OpenSSL generation. Add negative controls
for the six observed bypasses, calibrate committed child runners/cleanup, correct
head-limit/method-boundary oracles, then report and HOLD. No cross-role source relay.

This review records incomplete repairs, not a request to relax tests or change
production/shared contracts. No readiness/acceptance grant follows parse or selected
control passes; no real services/credentials/writes/.pi/staging/commits/successor.
