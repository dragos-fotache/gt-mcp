# T05 QA F2 execution report — Phase A STOP, Phase B not authorized

**Status:** Phase A executed once: exit 1 — 65/66 pass, 1 failure, 0 skips.
Per the relay, Phase B is NOT authorized: STOP, report, HOLD. No fixes, no
reruns, no source/helper/fixture edits, no other suites.
**Owner:** QA. **Coordinator:** coordinator/w4:p2K.
**Revision:** t05-f2 (c3 unchanged; 192 frozen files; inventory
`bc8016cd207d5c2d81c5c2a0de54e95bbc7e82ea2d9afb43013a80ef54a5f112`).

## Preflight / postflight

- Pins (before and after): Node v24.21.0, npm v11.19.0 (provisioned
  `T01_NODE_HOME`; additionally `T04_PROVIDER_PREFIX` exported unused, as
  Phase B never opened).
- Inventory manifest SHA256 matched before AND after Phase A (including on
  failure): `t05-f2 inventory unchanged: 192 files` both times. Production
  held throughout.

## Phase A command (once, exit retained, structured output)

```sh
umask 077
AOUT=$(mktemp /tmp/gt-mcp-t05-f2-focused.XXXXXX.json)
node ./node_modules/vitest/vitest.mjs run \
  test/unit/t05/02-validation-identity.test.mjs \
  test/unit/t05/04-hooks-fences-dispatch.test.mjs \
  test/unit/t05/11-import-smoke.test.mjs \
  test/fault/t05/production-limits.test.mjs \
  --reporter=json --outputFile="$AOUT"
```

Structured result: `/tmp/gt-mcp-t05-f2-focused.wUVrev.json` (umask 077,
mode 0600), shared with the coordinator out of band.

## Phase A result: exit 1 — 66 tests, 65 passed, 1 failed, 0 skipped

Passing files (3): `02-validation-identity`, `04-hooks-fences-dispatch`,
`11-import-smoke` — all repaired oracles green, including positional sync
guards, strict `__proto__` rejection + backend additive preservation, and
the zero-delta smoke with materialized stdio.

Single failure —
`production-limits > truncated bodies never become success and never
auto-retry` (failure line 238):

```text
AssertionError: expected 'network_error' to be 'internal_error'
```

Observed: the repaired fixture (declared `Content-Length: 100`, 10 valid
bytes, graceful FIN) maps to `network_error`, not the oracle's
`internal_error`. No success and no partial data occurred either way.

QA analysis (no oracle changed): an early close is observationally close to
a severed connection — the complete response never arrives — so a
`network_error` mapping is arguably the truthful adapter verdict, with
`mismatched` reserved for complete-but-inconsistent responses; conversely
the declared-vs-received length contradiction is observable metadata
favoring `internal_error`. Both codes are retryable; for reads the outcome
stays definite either way. This is a mapping-boundary question for
spec-level adjudication, not a unilateral oracle edit.

## Phase B: NOT EXECUTED (conditional grant not met)

No full-15 run, no foundation/T03/T04 or private-provider commands. The
T04 provider prefix/launcher were never invoked.

## Cleanup / limits

- Owned loopback/raw servers closed in test `finally` blocks; child
  processes reaped; single invocation, no hangs.
- Synthetic doubles + owned literal-loopback fixtures only; no live
  backend/credentials/writes; TLS fixtures intact; no deferred, parked,
  whole-suite or regression execution.
- This report is NOT acceptance. F1/focused failures remain retained
  historical evidence.
