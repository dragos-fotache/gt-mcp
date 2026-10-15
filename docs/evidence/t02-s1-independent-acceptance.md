# T02 S1 independent acceptance

**Audience:** coordinator and QA; Developer must not read QA diagnostics or this
acceptance record. This contains no experimental implementation source.
**Disposition:** S1 `no-companion/sdk` accepted as a bounded unavailable-call
baseline. T02 remains in progress; no approval, connected-fixture, integrity,
gate-route or genuine PTY feasibility is established.

QA executed only the explicitly relayed subset on Node 24.21.0/npm 11.19.0:

```sh
node node_modules/vitest/vitest.mjs run test/pi-feasibility/readonly-sdk.test.mjs -t "no-companion: policy none, spawn absence, actual unavailable call"
```

QA reported 1 passed, 5 filtered skips. The coordinator independently repeated
that exact command: 1 passed, 5 skipped, exit 0, 942 ms. Excluded tests were not
executed and do not count as passes. No matrix, build or install was run during
this QA target window; Developer/source mutations remained frozen.

Independent assertions covered SDK-layer report identity, preflight presence,
actual unavailable-call error joined to the exact creation call, explicit
registration/spawn absence, no invented fixture ledger, no-effect/source:none
branch and successful cleanup with zero remaining children/listeners. These
assertions supplement the coordinator's own native source/runtime readiness
checks; they do not certify an approval mechanism.

QA corrected a missing readSuccesses import in its own readonly route test file,
without changing assertions. That unused route helper did not establish evidence
for any excluded connected-readonly scenario. No implementation source, private
slice/review design or source diff was given to QA, and no QA diagnostics were
given to Developer.

All other scenarios remain held. Coordinator may now design a separate S2
connected-readonly work order; Developer and QA await explicit bounded handoffs.
No general T02 completion or compatibility-table verification is implied.
