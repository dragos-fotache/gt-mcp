# T05 QA source re-review — R2 NOT ready

**Disposition: FAIL for source readiness; no target execution.** QA reported all17
R1items addressed. Coordinator independently re-reviewed added/changed harness,
race, budget/privacy/replay and production-wire cases. R1 fixes improve coverage
but material defects remain; parse success is NOT semantic test readiness.
QA/coordinator-only record; never Developer input. No production source or its
review used to derive these QA findings; approved public spec remains the oracle.

## Independently repeated non-target checks

Pinned Node24.21.0 parse-only `node --check`:19/19 PASS, no imports executed.
Read-only relative path validation:20nonartifact static relative imports,0missing
(the dist/http targets were excluded, not silently counted as validated).
All8copied fixture/provenance files match coordinator staging SHA256 byte-for-byte;
all6PEMs mode0600. No PEM contents printed. Valid/expired/wrong-host fixture request
is resolved. TLS behavior itself is still unexecuted. Production build remains
Developer-owned; no installed tools, moving target imports or T05 suites run.

## R2.1 — Proxy child blocks its own parent servers

proxy-isolation.test.mjs starts HTTP/TLS/trap servers in the test event loop, then
spawnSync blocks that SAME loop until the child exits. Child requests cannot be
served: a conformant transport will time out. Use asynchronous spawn with bounded
output/status collection and cancellation/reaping in finally; keep parent server
loop runnable. Do not increase timeouts as a substitute for removing the deadlock.
Per-child timeout must fit within enclosing Vitest timeout with cleanup headroom.

proxy-child-fixture uses Agent({proxyEnv:true}); Node24 expects a proxyEnv OBJECT,
not boolean. Use documented public Node behavior to create a REAL proxy-enabled
native control path. Explicitly clear both NO_PROXY/no_proxy for trap-required
cases, test bypass separately, and allowlist child env instead of inheriting
unrelated personal/process variables. Observe CONNECT/raw trap connections as
well as HTTP request handlers for HTTPS. Verify native positive control reaches
the trap; target success must reach the owned target and leave trap untouched.
A non-null parent globalAgent assertion does not demonstrate restore/isolation.

The older loopback-wire test STILL points proxy vars at fixed port1 and changes
startup-only env in-process. Remove/replace this duplicate unsafe/ineffective
case; claims that fixed endpoints were removed are currently inaccurate.

## R2.2 — Dispatch/uncertainty assertions contradict explicit spec

loopback-tls refuses an owned-then-closed port but asserts dispatched:false,
outcomeUnknown:false,attempts1 and calls it pre-handoff. Actual TCP connect refusal
is AFTER invocation of the low-level sender: spec sections5/8 require dispatched
true,attempts1 and outcomeUnknown true for a mutation. Handoff is not socket
connection/body flush. A genuinely predispatch veto has attempts0.

04-hooks pre-delivery fence of a received429 mutation expects outcomeUnknown:false;
section8 explicitly makes suppressed/fenced result conservatively uncertain.
Repair expectations/title/comments/evidence to match the published definition;
do not change production/spec to satisfy these oracles.

## R2.3 — Late-race tests do not reach their claimed boundary

Late sender test aborts immediately after invoking the method, before awaited
pre-send/select/beforeDispatch can reach wire. It then asserts wire call1 and
uncertaintytrue: a correct implementation has not dispatched. Late beforeDispatch
rejection can reject a deferred promise before any hook attaches, leaking an
unhandled rejection while testing the wrong phase. Use explicit entered barriers
inside EACH hook/sender under test; await entered before abort/deadline, observe
terminal result, THEN resolve/reject late work. Attach handlers immediately.
Assert the intended boundary was actually reached and never subsequently advances.

Add generation changes at awaited pre-send/select/beforeDispatch with final sync
veto, rather than calling a forBinding mismatch on a later attempt a complete
async-race proof. Include late wire rejection/success suppression and real timer
expiry of a never-settling hook/sender, not only advancing fake time in a resolved
hook. Validate post-decode/final-sync elapsed boundary using public hooks/clocks.

## R2.4 — Privacy probes still miss or contradict lexical rules

06-errors alphanumeric token code contains uppercase letters, so it fails safe
`^[a-z][a-z0-9_]*$` regardless of context. Its negative expects unsafe but its
positive expects safe using the SAME invalid code. Also bearer is decorated,
whereas code contains only the inner token, not the EXACT captured bearer value.
Use lowercase grammar-clean token exactly equal to selected bearer, and an
unknown code containing that complete token; with unrelated bearer the same
code must be retained. Keep a separate invalid-grammar case.

Whitelist overlap test uses a bearer CONTAINING not_found, instead of a code
containing the captured sensitive value. Use a short bearer that is actually a
substring of the known machine code to prove fixed-whitelist exemption.
Control privacy test uses a non-UUID authKey while expecting a backend401;
that fails locally before sending. Use canonical synthetic key and assert wire
invocation/status before privacy checks. Never let a precondition rejection
stand in for a downstream privacy scenario.

## R2.5 — Socket-close harness defects persist

abort-timing and production-limits STILL attach req.close to cancel body timers
or destroy responses. IncomingMessage request completion is not client response
socket closure. This was R1.9 and remains unfixed. Use actual response/socket close
for owned cleanup and explicit request barriers; keep intended response open
until timeout/abort. Streaming cap must observe bytes/chunks were emitted before
transport closes, not a cancelled interval/no-body timeout. Repeated `""` after
one name field is not indefinitely valid JSON; drip a valid incomplete string or
whitespace until timeout with no accidental malformed branch.

closeServer races an unref timeout but never clears it on success; raw net servers
have no closeAllConnections and no tracked socket destroy set. An upgraded socket
may remain open. Track owned sockets/timers and explicitly dispose/reap them;
cleanup deadlines must be cleared, not just unrefed. Listener/socket error paths
must be handled; assertions about no leaks must occur BEFORE cleanup forcibly
repairs a target leak. Add a fixture-only cleanup calibration to prove no leftover
owned resource/listener/timer on success/failure/timeout.

Cookie capture uses res.getHeaders AFTER writeHead(status, headers) without prior
setHeader. Node's direct writeHead headers need not populate its cached-header
map. Either set headers then capture, or record the actual sent head independently;
validate this fixture precondition with a native client. Do not weaken the cookie
assertion to accept a missing Set-Cookie stimulus.

## R2.6 — Import harness is snapshotting, not interception

The new child takes before/after resource/listener snapshots. It does NOT intercept
filesystem IO, network, process launch, timer registration+clear, transient handler
registration, process.exit or writes to private paths. Such effects can complete
before the post snapshot and remain invisible. Control-output/timer modes also
import the moving TARGET, so are not artifact-free calibration controls. The child
inherits process.env rather than the claimed clean environment; a20second sync
child also exceeds enclosing default10second test budget.

Build actual builtin interception at an appropriate pre-import boundary, with
an explicit allowed loader mechanism and ONLY the public pinned-Zod registry
exception. Positive/negative synthetic modules/control modes must NOT import
src/dist/production when calibrating. Include IO/network/process/timer/listener/
stdout/stderr violations that the harness MUST reject; cleared/unref timers and
register-then-remove handlers must not evade it. No broad fs/Node-loader/network
allowlist. Declaration reading alone is allowed, no JS/source/map reads by QA.
Document what is intercepted and prove controls detect it before target relay.

## R2.7 — Exact error oracles and valid fixtures, not broad alternatives

production-limits admits internal_error OR result_too_large for head overflow,
and network_error OR internal_error for upgrades/truncation. Approved spec maps
head/parser/upgrade to internal_error, body/projected overflow to result_too_large,
wire timeout/no-response to network_error. Build deterministic stimuli with exact
assertions; report genuinely ambiguous contract questions before broadening them.

Header overflow uses an invalid resource body `{id}`: even an implementation that
ignores the header cap will fail later decode with internal_error and PASS the test.
Use otherwise-valid resources and equality/overflow positive controls. Raw truncation
uses socket.write then immediate destroy; queued bytes may not reach the client.
Use end/flush/barrier so a known partial declared body was actually received, and
assert no auto-retry for malformed response. Upgrade test destroys its own socket
on a300ms timer, which can hide a leaked client socket; instead observe client
closure within a bound then clean leftovers in finally.

Informational/trailer success-only cases do not prove cumulative budgets or that
trailers CANNOT supply classification fields. Add bounded multiple103heads + final
head count/byte exhaustion, trailer field supply/override attempt and trailer count
budget; no second metadata channel. Duplicate critical fields beyond Content-Length
and malformed error bodies at their expected status still need negative cases.

## R2.8 — Remaining vacuous or misnamed cases

10-replay cross-namespace test uses AUTH_KEY for resource then RESOURCE_KEY for auth:
these are DIFFERENT UUIDs, so does not prove same UUID across namespaces. Use one
synthetic key value for both. Replay body canary includes4e1 but40.0 only inside a
name string; add actual fractional numeric spelling for the claimed preservation.
Capture first sender bytes BEFORE mutating its copy and compare both original
and subsequent request identities, not merely second-copy equality.

Remove `waitForDeadline(()=>true,10)` and similar no-op coverage. "Stays usable"
should reuse the SAME transport handle when within its fixed origin, not merely
construct another handle against another server. Document cases that exercise
factory isolation rather than mislabeling them as handle cleanup proof.

## Repair and calibrated-control grant

QA source/helper/evidence repair remains within owning paths. Pinned parse-only
node --check and read-only import checks continue. QA may additionally prepare and
run **artifact-free harness calibration** using ONLY Node builtins, synthetic
modules and explicitly owned ephemeral literal-loopback native fixtures. These
controls MUST NOT import src/,dist/,domain entry or installed node_modules,
production proposal/ADR/review. No Vitest/lint/format/build/install, no moving
production target invocation. Native synthetic fixture-only checks may use the
labelled TLS pairs already provisioned; no new key generation/trust installation.

Calibration should establish import interceptors, child/server nonblocking IO,
proxy-trap positive controls, cookie header fixture, and bounded owned cleanup.
Record exact safe commands/statuses and source hashes, no raw bodies/credentials/
PEMs or private paths in evidence. This is harness calibration, NOT T05 transport
acceptance. Once revised source/calibration ready, hold for coordinator re-review.
Developer repair window remains independent. No source detail is relayed to it.

R1 initial failures and R2 unresolved issues stay retained. "All17addressed" was
premature; update QA readiness evidence with this honest disposition. No silent
weakened assertions/skipped checks or release claim.
