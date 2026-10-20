# T17-S1 — Primary-agent acceptance

**Accepted/closed on2026-10-17; parent T17 incomplete.**
[Contract](../tasks/t17-s1-work-order.md), [handoff](../handoffs/t17-s1.md).
Review is by the implementing primary agent against shared draft0.2 and the
standing proportional-testing policy; independent T20 remains required.

## Outcome and evidence

[Exact selection](t17-s1-selection.json): **25/25 in five files**, zero
failed/skipped/pending/todo:8 active S1 checks and17 unchanged SDK/config
regressions. [Inventory](t17-s1-artifact-inventory.json):623 hashes stable during
execution. [Baseline comparison](t17-s1-baseline-comparison.json):327 original
production/emitted/parked/packaging/config inputs unchanged, including194 emitted
files. No production, dependency, compiler, manifest or shared-contract repair.

Actual Pi1.1.0 SDK print/hasUI:false uses built-in MCP/codemode/tool-search and
its unchanged default stdio transport to the compiled portable server. A passive
transport listener records only initialize/list-tools metadata: actual negotiated
MCP2025-11-25 and seven input/output schemas. The default factory is imported from
the installed pinned Pi runtime module because the root SDK exposes no transport
metadata observer. It never substitutes messages/calls or domain responses.
Relevant installed versions match the lock; executable/data tree hashes remain
stable. [Environment and identities](t17-s1-environment.json).

The public local faux provider emits fixed calls. Public
`getCurrentTools(context.messages)` observes actual model-request declarations:
direct tools in the first request; deferred tools after actual tool search.
Nested events establish codemode parent IDs. Resource inventory contains only
the three built-ins and passive observer, with no permission gate/companion.
Explicit private configuration, in-memory settings and a child environment
allowlist exclude personal configuration and model credentials.

Every native path proves read success, false-policy refusal without mutation or
journal admission, and true-policy authenticated draft/populate/save with a
durable saved receipt. Independent fixture HTTP observations assert the three
exact routes; journal inspection follows host/profile release. Omitted policy
also refuses despite environment enablement attempts. Identical explicit repeat
returns the same receipt/root with no new mutations; changed intent fails
`operation_id_reused`; signed-out calls cannot create/admit. Literal expected
envelopes, serialized text, isError and advertised output schemas agree. Complete
small codemode results are verified across all text blocks.

The unchanged official SDK tests separately cover client metadata/capabilities/
annotations/meta/extra arguments, unsupported enablement flags, invalid config,
read availability, dispatch, safe protocol errors, result budgets and SDK startup.
Those observations are not represented as additional named-Pi paths. C10–C12/M10
and the full parent gate remain open.

## Verification and failures

The following passed with provisioned Node24.21.0/npm11.19.0:

~~~sh
export PATH="$T01_NODE_HOME/bin:$PATH"
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
node --check test/pi-integration/host-worker.mjs
node --check test/pi-integration/helpers.mjs
node --check test/pi-integration/paths-policy.test.mjs
node node_modules/eslint/bin/eslint.js test/pi-integration
node node_modules/prettier/bin/prettier.cjs --check test/pi-integration
python3 test/create-stdio/run-isolated.py \
  "$T01_NODE_HOME/bin/node" "$T17_PROVIDER" "$T17_LIBRARIES" \
  docs/evidence/t17-s1-selection.json "$T17_OUTPUT_PREFIX"
~~~

Production checks/build preceded final tests; no build/install raced execution.
The rebuild matches the prior candidate byte-for-byte. Public transcript API
import resolution also passed. Installed dependencies were reused; clean locked
reconstruction is reserved for integrated parent acceptance.

[History](t17-s1-execution-history.json) retains failed qualification runs0/8,
2/8 and4/8. Harness mistakes: assuming ToolInfo exposes outputSchema, using an
adapter-specific request hook, inspecting only the codemode header text block,
then reading obsolete context.tools. Corrections use wire metadata, complete
text and the public normalized transcript API; product expectations are retained.
Every run had stable sources/outputs and owned cleanup. Initial Node26 version
probes occurred before restoring the missing T01_NODE_HOME; no project execution
used that runtime.

[Cleanup](t17-s1-cleanup.json): private unlocked provider store/read/clear
qualification, owned provider/bus exit and private-root removal pass. Pi workers
finish normally and post-host journal reopening demonstrates profile release.
[Document-only closure](t17-s1-doc-closure.json) follows runtime acceptance with
an explicit hash reconciliation, not another full runtime replay.

## Limits

SDK print mode only; model is scripted, backend domain replies synthetic, while
Pi/stdout protocol/server/TLS/storage are real. Actual CLI/interactive mode,
host concurrency/cancellation/reconnect, lost-response exact replay, restart/fork,
effective disablement, large-output/truncation/untrusted text and clean integrated
acceptance remain held for separately assigned T17 work. T19/independent T20,
T04/T06 limits and parked/retired dispositions persist. No local `.pi` edits,
staging/commit, personal/live operation, real enablement or release.
