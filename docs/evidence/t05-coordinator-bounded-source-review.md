# T05 bounded-source review

User-approved proportional plan applied: only the explicit15core suites plus
4active mjs helpers/children and synthetic TLS fixtures are reviewed. General
interception/proxy/cleanup-calibration sources remain preserved/deferred, not
passed. No demand to repair those frameworks or expand the case matrix.
QA/coordinator-only source review, not Developer input.

## Verified source gate

Coordinator independently ran provisioned Node24.21.0 on the exact active list
from the bounded plan plus the four helpers in QA's bounded matrix:
- node --check:19/19PASS;
- installed ESLint over the explicit19files:exit0,0errors;
- installed Prettier --check over the same19files:exit0;
- c3production18-file source/emitted inventory unchanged:PASS.

Read small replacement suites/children, active dependency mapping and corrected
core error/budget boundaries. No active dependency on deferred interceptor/proxy
infrastructure. Existing synthetic TLS pairs reused; no new trust generation.
No T05 target/suite/provider execution in this review.

## Pre-relay correction — CLOSED

QA replaced both manual collectors with promisified standard execFile, explicit
environments,8second timeout,65536maxBuffer and SIGKILL. Rejections fail tests;
existing smoke and trap/direct-target assertions retained. Coordinator read both
changes and independently repeated the full explicit19-file parse/lint/format
source gate: ALL PASS. c3source/emitted hashes unchanged.

**Bounded source readiness: PASS for execution relay only.** The independent
owning suites have not run; this is not T05 acceptance. A named frozen inventory
and exact15-suite grant follow. General deferred infrastructure is neither run
nor counted passed. No further pre-relay source repair currently assigned.

### Historical correction request (fulfilled)

Both new replacement suites copied a manual child collector: stdout is bounded
by JS string length rather than UTF8bytes, and stderr is unbounded. This contradicts
the SMALL runner's stated bounded contract and repeats an already identified
helper defect; it is not a request for generalized interception/calibration.

Replace those collectors with the standard asynchronous Node execFile facility
(e.g. promisified execFile) using the pinned process.execPath, explicit env,
timeout, maxBuffer and termination policy. Parent fixture event loop must stay
responsive. A rejected/nonzero/timed-out child fails the test; do not turn it into
a passing report. Use the builtin bounded stdout/stderr result instead of maintaining
custom timers/reap/encoding infrastructure. Keep the existing behavioral assertions
(clean smoke, exact report lines, non-forwarding trap hit vs direct target), adapting
only collector-result plumbing. No new helper framework or control family needed.

QA may change only these two suites and its bounded-source evidence; repeat focused
parse/lint/format then hold. Coordinator checks the small diff and active inventory,
then issues the named frozen c3execution relay. Do not rerun full project regressions
for this test-helper-only edit. Production remains held. T04 private-provider
regression is reserved for final acceptance with an explicit isolated fixture.
