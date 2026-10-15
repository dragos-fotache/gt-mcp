# T05-f2 truncation adjudication

**Disposition: one production mapping defect remains; oracle unchanged.**
QA focused phaseA65/66PASS,1FAIL,0skips; phaseB correctly NOT executed.
Independent coordinator clean173-file source snapshot: locked install/four
production checks PASS, bounded owning suite227/228PASS,1FAIL; stopped before
regressions. Failed snapshot result retained separately, not overwritten into pass.
All live192frozen hashes unchanged; c3was not edited during either execution.

The failing case now supplies an actual short body under a declared larger
Content-Length. The approved contract distinguishes network/no-response failure
(network_error, bounded automatic retry) from an OBSERVED incomplete/malformed
response (internal_error, no in-call retry). Both may be externally retryable,
but they are not interchangeable classifications. Do not broaden the oracle.

Coordinator native Node24.21.0 comparison on owned loopback fixtures observed:
response200 ->10body bytes (declared100) ->response-aborted ->request-close with
response already seen ->response-error ECONNRESET ->response-close. The ordering
is identical with request bytes paused or drained on the server. Thus this is not
the prior unread-upgrade fixture issue or a failure before any response.

Production must preserve knowledge that a response began across request/response
close/error callbacks; an earlier generic request-close event must not win and
misclassify observed truncation as no-response network failure. Keep timeouts and
caller abort precedence, no-response/refusal handling, safe diagnostics, and
conservative mutation uncertainty. No new API/shared-contract behavior is needed.

F2target windows are CLOSED. Developer gets a single targeted production repair;
QA sources/oracles remain HELD unchanged. New candidate/inventory precedes focused
limits execution; only if green will final full active owning/regression and clean
locked reproduction resume. User requested today's wrap: finish this bounded
work if verified, otherwise report the blocker honestly; no T06/T09 successor.
