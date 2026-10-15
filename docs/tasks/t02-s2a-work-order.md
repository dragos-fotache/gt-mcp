# T02 S2A coordinator implementation work order

**HISTORICAL / T02 PARKED:** user-selected config-only routine creation supersedes
the custom/external permission-extension plan. Shared MCP draft0.2 is aligned;
no further T02 execution/succession or QA artifact relay. Preserve original evidence
and failures; R3 remains an unaccepted candidate. See
[the current decision](../decisions/routine-creation-config-policy.md).
Instructions/windows below are historical, not current execution permission.

**Audience:** coordinator and Developer only; implementation design, not QA input.
**Authorization:** implement and diagnose **generic-readonly/sdk only**, with
no-companion/sdk regression preservation. QA executes neither new target nor
other scenarios until a fresh coordinator relay. No S2B/S3+ assignment.

## Fixed design and verified integration

S2A is the generic native MCP connection to the fixture's read-only default,
**without the experimental approval companion**, sidecar, binding file or
approval listener. Do not load or weaken the companion's non-TUI gate to make
creation reach this receiver. This tests default receiver refusal and native
connected tool discovery, not approval-gate feasibility. The shared approved
specification records the public profile distinction separately.

Coordinator independently proved this exact public API path in a sanitized
Node24.21.0 child with disposable HOME/TMPDIR/agent/session/cwd: explicit native
faux provider on the same ModelRuntime, no-discovery named SDK factories,
createAgentSessionRuntime, print binding, native MCP loadConfig supplying one
explicit direct stdio fixture. The first faux response callback saw all seven
actual active tools; get_exercise succeeded; create_routine returned real
write_approval_required/no-sidecar; awaited runtime.dispose produced exactly one
fixture final ledger, totalDispatches0/operations[]. Receiver digest matched the
public 71a6d7... seed. Exit0. This design probe is not S2A artifact acceptance.

Public SDK transport declarations also confirm StdioServerTransport.send is a
public Promise-returning method suitable for transparent observation, and native
faux setResponses accepts response factories. No dependency change is needed.

## Exact path ownership

Permitted edits/additions only:

- driver/run.mjs: dispatch the additional authorized target and collect its real
  journal/ledger; retain the accepted S1 path and failure reporting.
- driver/sdk-readonly-worker.mjs: new connected readonly worker. Reuse the proven
  setup, native event observation and awaited lifecycle; no generalized matrix.
- driver/event-journal.mjs: small shared worker/fixture append/read helper.
- driver-files/t02-scripted-provider.mjs: optional onRequest observation callback
  only; default behavior remains identical for S1 and CLI. No global handoff.
- fixture-server/server.mjs: only trusted journal launch option and transparent
  real protocol/lifecycle observations, idempotent finalization. Do not change
  tool schemas/annotations/validation/canonicalization/sidecar/counter behavior.
- metadata.json: new worker/helper paths and candidate launchable subset.

No edits to sdk-s1-worker.mjs, companion, diagnostics, scenario inputs/registry,
root config/manifests/lock, production entries, personal state or shared-docs.
No installs, backend/provider calls, publication, staging or commits.

## Implementation sequence

### 1. Shared append journal

Bootstrap creates a private journal once before workers/fixture start; it never
rewrites received events. Shared helper opens O_APPEND, mode0600, no truncate.
A protected record has fixed source/layer, type, producer ID and producer-local
sequence. Fields cannot overwrite those keys; global seq is assigned by the
parent in append order after known closure. Every bounded UTF-8 JSONL record is
one checked writeSync; partial write is failure, not retry/interleaving.

Per-record cap64KiB; aggregate trace cap4MiB. Writer size check bounds ongoing
work, but is not an atomic cross-process aggregate guarantee: parent rejects an
over-budget file before reading/reporting success. Validate shape and every
producer's increasing sequence. Support only the selected Linux local filesystem.
Preserve S1's existing single-writer journal reader unchanged in behavior.

### 2. Native connected worker

Use complete explicit child environment and disposable cwd, in-memory settings
(empty tools, retry/compaction disabled), same native provider/runtime/model,
no-discovery named codemode/search/MCP/observer factories. Inspect actual loader
identities/surfaces before bind. Native MCP loadConfig returns one synth-gt entry
with exposure:direct, command:process.execPath, absolute approved fixture path,
trusted ledger/journal argv and explicitly closed environment. No sidecar/binding
flags. Use the native default transport; do not pre-spawn another fixture or
introduce mock transport success. The absolute original fixture resolves its
existing pinned dependencies; never infer its path from a relocated extension.

Use a small optional provider onRequest callback (faux response factory) to read
session.getActiveToolNames on the first real request. Native direct-MCP startup
synchronization precedes this callback. Require exactly the seven qualified
fixture names and no unrelated tools; journal the actual inventory. No sleeps,
readiness loops, constant-list discovery event or fallback model. Do not parse
private provider state or patch Pi internals. Preserve existing generic-readonly
read/create/final-text turns.

### 3. Fixture-owned observations

Add optional trusted --t02-event-journal launch flag; no model argument/schema
change. Use a transparent subclass of the real StdioServerTransport whose public
send observes the actual SDK-generated response and delegates to super.send.
A tools/list response supplies actual tools names for source:fixture tool_list;
initialize response supplies observed negotiated protocol. Do not replace the
SDK listing handler, hand-write an expected response or access private SDK maps.
Pair that source observation with actual Pi inventory before claiming discovery.
Send failures abort the run, never become successful discovery.

Emit one private fixture startup/process-ownership observation. Record existing
receiver_check/dispatch observations in the shared journal before corresponding
actions, alongside the independent owned-file ledger. Exactly-once finalization
covers native stdin end/close/termination; final zero/nonzero ledger is always
receiver-origin. Keep stdout exclusively MCP. Do not duplicate a final on two
shutdown stimuli; do not fabricate one when the fixture failed to start.

### 4. Reports, effects and teardown

SDK tool_call/results append inside real callbacks with native IDs, before/after
actual execution; parse real structured codes. Actual mode:print/hasUI:false;
no UI injection, approval prompt or listener. Registration readonly is confirmed
by actual configuration, native discovery and owned child observations, not a
placeholder connected/spawned flag before handshake.

After awaited runtime disposal and actual worker/group/stdio closure, parent
reads the bounded shared journal and independent fixture ledger. Require exactly
one startup/fixture and exactly one final ledger; all seven tools; successful
joined get_exercise; real creation write_approval_required; receiver denied with
public seed digest; no dispatches/approval; final total0/operations[]. Effects
source:fixture/observation:fixture-final/total0 are copied from that final, never
from expected outcomes. Missing/malformed/ambiguous evidence fails with unverified
null effects. Negotiate protocol from actual initialization, not the candidate
string. Final parent cleanup is last, with observed closure/removal/counts; no
retcon, unreadable-directory-as-empty or unknown cleanup pass. All budgets apply.

## Commands and mandatory stop

Use the selected Node24.21.0/npm11.19.0 toolchain. Run permitted typecheck,
t02:build, lint:t02 and format:check:t02, then only:

```sh
node experiments/t02/driver/run.mjs --scenario generic-readonly --harness sdk --out <disposable-report.json>
node experiments/t02/driver/run.mjs --scenario no-companion --harness sdk --out <disposable-report.json>
```

Report sanitized commands, actual layer/versions/protocol, discovery, call/result
IDs, receiver digest/refusal, independently final ledger and cleanup. Then STOP.
No QA suite/sources/fixtures/evidence/diagnostics/diffs; no other matrix cases,
CLI/PTY/RPC, conflicts, integrity mutations, direct-readonly companion route or
ADR/compatibility completion. An unresolved API, native discovery/shutdown,
partial journal, unexpected resource/network or unknown ownership is a blocker:
report asynchronously rather than starting another subsystem or workaround.

Coordinator reviews code/report, independently runs the same bounded artifact
and S1 regression, then relays only generic-readonly/sdk to QA. Serialize source,
shared build/install and QA execution. No S2A acceptance on compilation alone.
