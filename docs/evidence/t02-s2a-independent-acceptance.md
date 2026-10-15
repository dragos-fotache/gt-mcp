# T02 S2A independent acceptance

**Audience:** coordinator and QA only; Developer must not read QA diagnostics or
this acceptance record. No implementation source is included.
**Disposition:** generic-readonly/sdk accepted as the bounded connected generic
read-only baseline. T02 remains in progress; companion gates, nested routes,
input-integrity, lifecycle and genuine PTY feasibility remain unverified.

QA ran only the explicit relay on Node24.21.0/npm11.19.0:

```sh
node node_modules/vitest/vitest.mjs run test/pi-feasibility/readonly-sdk.test.mjs -t "generic-readonly: connected fixture stays read-only, seven tools listed"
```

QA: 1 passed, 5 filtered skips. Coordinator independently repeated the exact
command: 1 passed, 5 skipped, exit0, 1.32s. Filtered cases were not executed and
are not passes. Source/build/install stayed frozen during this window.

Independent assertions verified exact runtime pins and SDK layer; fixture-origin
seven-tool discovery; receiver write_approval_required refusal and its own final
zero ledger; no fabricated gate/approval; genuine namespace-exact get_exercise
success joined on a nonempty native ID with matching call/result names; explicit
print/hasUI:false/uiInjected:false preflight; observed cleanup with zero remaining
children/listeners. Strict validator source/logic-control review was separate
from runtime proof and preserved independence.

S1 remains independently accepted as the distinct unavailable-call/no-spawn
baseline. Neither baseline proves a companion approval gate. Every other scenario
remains held. The QA target window is closed; coordinator will immediately design
a separate minimal companion-managed SDK refusal slice before delegating it.
Developer receives only high-level bounded acceptance, never QA source/diagnostics.
