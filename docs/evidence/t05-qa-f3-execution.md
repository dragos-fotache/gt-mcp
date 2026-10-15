# T05 QA F3 execution report — Phase A + conditional Phase B all green

**Status:** all granted gates pass; NO edits, NO reruns beyond the relayed
commands; HOLD for coordinator clean reproduction and final disposition. No
acceptance claimed by this report.
**Owner:** QA. **Coordinator:** coordinator/w4:p2K.
**Revision:** t05-f3 (c4 production; 193 frozen files; inventory
`4d92f6d7e7c86bb8578d256e0a5f48ec1f9bd603799d0b9ffaa317ed7009d3f2`).

## Preflight / postflight

- Pins throughout: Node v24.21.0, npm v11.19.0 (provisioned `T01_NODE_HOME`;
  `T04_PROVIDER_PREFIX` exported for the provider gate only).
- Inventory manifest SHA256 matched before Phase A, after Phase A, and after
  Phase B: `t05-f3 unchanged: 193 files` all three times. No source/helper/
  fixture edits, builds, installs or config at any point.

## Phase A — production-limits only, once: exit 0, 21/21, 0 skipped

Structured result: `/tmp/gt-mcp-t05-f3-limits.3uL97O.json` (umask 077).
The repaired truncation oracle (byte-built stimulus, graceful FIN →
`internal_error`, single connection, no retry) passes against the repaired
c4 target, confirming the f2 adjudication end to end.

## Phase B1 — full active 15 owning suites, once: exit 0, 228/228, 0 skipped

Structured result: `/tmp/gt-mcp-t05-f3-full.mpZPTx.json` (umask 077).
15/15 files passed via the frozen-manifest selection (revision t05-f3,
15 suites asserted in the runner).

## Phase B2 — sequential regressions, each exit 0, stop-on-failure order

- `npm run smoke`: 7 files, 100/100 foundation tests.
- `node ./node_modules/vitest/vitest.mjs run test/unit/t03`: 7 files,
  221/221 owning tests.
- `node ./node_modules/vitest/vitest.mjs run test/unit/t04`: 8 files,
  54/54 owning unit tests.
- `T04_PROVIDER_PREFIX=... /usr/bin/bash /tmp/gt-mcp-t04-qa-private-run.sh
  test/fault/t04`: 9 files, 69/69 fault tests against the qualified
  disposable private provider (isolated bus/keyring/HOME, owned teardown).
  No provisioning failure, no skipped provider case.

## Cleanup / limits

- Owned loopback/raw servers closed in test `finally` blocks; child
  processes reaped; provider daemon/keyring torn down by the qualified
  launcher; sequential invocations, no hangs.
- Synthetic doubles + owned literal-loopback fixtures + isolated disposable
  provider only; no live backend/credentials/writes; TLS fixtures intact;
  no deferred, parked, whole-suite or harness execution.
- F1/F2 failure records remain retained historical evidence; this green
  final gate does not rewrite them.
