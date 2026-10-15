# T08-S3 focused stdio development checks

Development verification on 2026-10-15 uses the provisioned disposable Node
24.21.0 / npm 11.19.0 toolchain and the primary agent's first compiled S3 candidate.
This is a focused repair-loop record, not final frozen integration acceptance.

Source syntax checks, explicit-file ESLint and Prettier checks passed for the
stdio helpers/two suites and the two narrowly changed foundation files.

The first runtime command was:

```sh
source /tmp/gt-t08-s3-toolchain.sh
./node_modules/.bin/vitest run test/stdio-server/sdk-startup.test.mjs test/stdio-server/framing-lifecycle.test.mjs test/foundation/server-inert.test.mjs test/foundation/symlink-argv-regression.test.mjs
```

Original outcome: 4 files, 26 tests; 24 passed, 2 failed in the unconfigured SDK
cases. Both failures were the new unknown-tool exception text assertion expecting
one SDK `MCP error -32602:` prefix; the SDK client receives a second prefix around
the already formatted server error. Accepted S2 verification already allows this
exact SDK wrapping behavior. The new assertion was aligned with that existing
adaptation, still requiring the exact safe `Unknown tool.` text, code -32602 and
absent error data. No production change resulted from these failures.

Focused repair replay:

```sh
./node_modules/.bin/vitest run test/stdio-server/sdk-startup.test.mjs
```

Outcome: 1 file, 4 tests passed. The other three unchanged files passed in the
original run (22 tests). No hidden exclusions, skipped tests or whole-repository
pass are claimed.

Observed boundaries: official SDK actual subprocess initialization/catalogue and
unconfigured calls, safely absent selected config, fixed launch/config failures,
invalid ingress/UTF-8/10 MiB accumulated-buffer rejection, partial versus complete
EOF, initialization gate, pinned protocol negotiation, split valid UTF-8, graceful
SIGINT/SIGTERM, broken output pipe, delivered main/direct/symlink entry behavior.
The exact narrow foundation supersession is recorded separately. Existing import
interception remains bounded observation, not OS isolation.

These checks use fresh temporary synthetic HOME/XDG directories and no configured
profile, provider or backend. Temporary scopes are removed. Configured integration,
durable-operation shutdown, healthy output backpressure, final owning regressions
and clean locked reproduction remain primary-agent integration work.

## Second candidate regression findings

After the primary agent rebuilt the candidate, this explicit 9-file command ran:

```sh
./node_modules/.bin/vitest run test/stdio-server/sdk-startup.test.mjs test/stdio-server/framing-lifecycle.test.mjs test/foundation/server-inert.test.mjs test/foundation/symlink-argv-regression.test.mjs test/read-protocol/config-import.test.mjs test/read-protocol/validation-errors.test.mjs test/read-protocol/catalogue-dispatch.test.mjs test/read-protocol/lifecycle.test.mjs test/read-protocol/result-budget.test.mjs
```

Outcome: 7 files passed, 2 failed; 44 tests passed, 2 failed (46 total). Exact failures:

- Existing S2 `fences close synchronously, validates before interruption, awaits
  persistence then closes once`: `lifecycle.test.mjs:93` observed transport closure
  before owned persistence settled. The specification preserves explicit close's
  runtime-before-transport order; unexpected SDK faults need a separate immediate
  fencing path.
- New S3 `EOF releases pending blocked output without waiting for the client to
  read`: the process did not exit while the parent receiver was paused, reaching
  Vitest's 10-second timeout. Healthy pause/resume and all 32 complete replies
  passed in the adjacent case. Releasing send promises alone cannot prove process
  termination if queued stdout handles remain active.

Both findings were sent to the primary agent for production repair; neither test
was excluded or relaxed. The EOF fixture observation now races a 1-second test bound
and resumes the reader in `finally` so subsequent failures clean up deterministically
without forced termination. This is a test bound, not a delivered shutdown timeout.
No server child from the failed run remained alive when checked afterward.

## Focused production repair replay

After rebuilding the explicit-close ordering and owned stdout lifecycle repairs:

```sh
./node_modules/.bin/vitest run test/stdio-server/framing-lifecycle.test.mjs test/read-protocol/lifecycle.test.mjs
```

Outcome: S3 framing/lifecycle 10/10 passed, including healthy backpressure and EOF
process exit before receiver resume. S2 lifecycle 3/4 passed. The same pending-close
case now passes its transport-order assertion but receives protocol -32600 from a
tool call during close. For an already initialized connection S2 requires argument
validation before interruption: malformed arguments return `invalid_arguments`,
valid read/create calls return `operation_interrupted`. This remaining regression
was returned to the primary agent; the existing S2 test remains unchanged.

After the primary agent corrected initialization/closing-state conflation and
closed the owned output pipe on transport teardown, the same exact two-file
command passed: 2 files, 14 tests. The final integration gates must verify the
complete frozen owning selection against this repaired candidate; these targeted
repair replays are not a substitute for that final selection.
