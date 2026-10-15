# T08-S3 — Settled stdio delivery and parent integration

Current implementation status: S1/S2/S3 and parent T08 are
[accepted](../evidence/t08-s3-review.md). The design-time hold/status statements
below are historical; the public behavior remains normative. User superseded the
Herdr/separate-role relay workflow for the S3 run, retaining the acceptance gates.

## Authority, outcome and holds

User requested S3 design and delegated design decisions to Coordinator. Preserve
[S1 choices](t08-s1-user-decisions.md), [S1 runtime](t08-s1-runtime-spec.md),
[S2 adapter](t08-s2-protocol-spec.md), shared MCP draft0.2 tools/authentication and
unchanged backend v1. Apply standing proportional testing/context-safe slicing.
This is design only. S1/S2 are designed, not implemented/accepted; Developer/QA
remain HELD and all source/build/install/test/fixture/runtime grants CLOSED.

Outcome: actual compiled server entry serves the seven-tool local stdio surface,
with safe startup/configuration, framing, cancellation/EOF/signals, owner release
and independent final integrated T08 acceptance. No remote listener, login/logout
CLI, descriptor writer, journal/creation workflow, token-paste bootstrap, persistent
cache, companion, dependency upgrade, host/browser/backend/release certification.
Create remains unavailable regardless of true write flag. S3 requires accepted S1/S2.

## 1. Executable entry and startup

Keep package bin `gymtracka-mcp-server` -> dist/protocol/server.js, existing shebang
and Node24.21.0 import.meta.main guard, including symlink execution. Root and trusted
CLI/companion remain inert/unchanged. Importing server never calls main, reads argv/
environment/private files, registers handlers or changes output/exitCode, even when
argv[1] names its artifact. Explicit exported `main(args: readonly string[]):
Promise<number>` runs one process lifecycle using actual process streams; it does
not call process.exit. This intentionally replaces T01 server main():number/exit78
behavior only, not CLI/root/import guarantees.

Accepted launch arguments: no args, or exactly `--config <absolute normalized path>`.
No --help/--version/--stdio/environment config search, relative path, write-enable
flag, token/account/binding argument or silent unknown-argument ignoring. Wrong
shape/path => usage exit64 before config/provider/network access. No args or a
safely absent selected config runs unconfigured MCP: initialize/list work; valid
reads return configuration_required, valid create unavailable, malformed known-tool
arguments still invalid_arguments. Do not print banners/help on stdout.

Use S2 openConfiguredReadToolServer and the same single detached startup config/
descriptor snapshot; no reread or additional config fields. Malformed/unsafe config,
descriptor or configured private-state opening failures are fatal, not a fallback.
Startup never performs auth/resource dispatch or automatic migration/recovery.
Configured valid signed-out/pre-auth state remains usable for auth-required errors.

Install owned EOF/stream-error/SIGINT/SIGTERM observation before the first startup
await, not import time. If shutdown arrives during opening, await the bounded owned
factory outcome and close any acquired adapter without starting message handling;
never abandon acquisition or emit a late initialized server. No forced startup kill.

## 2. Stdio framing and SDK boundary

Use pinned official SDK StdioServerTransport for incoming message parsing and
public SDK serializeMessage for outgoing framing. Node streams/private adapters
may wrap these public interfaces for lifecycle/backpressure safety; no SDK patch,
private-buffer access, generic custom JSON-RPC stack or generalized interceptor.
Messages are SDK JSON followed by one newline, not Content-Length framing; stdout
contains MCP messages only. No domain body, query, account/resource ID, private path,
credential, argv/native exception or SDK error payload in diagnostics.

Publish fixed inbound SDK buffer limit **10485760 bytes (10 MiB)**. This bounds the
buffer's accumulated incoming bytes (including a coalesced chunk), not just a
single logical argument or every memory allocation. It is an operational transport
limit, not a domain-name/array cap. No new config override in S3. Use a small strict
streaming UTF-8 ingress guard before forwarding original bytes to the SDK parser:
reject malformed/truncated UTF-8 rather than silently replace text. SDK remains
JSON/message authority. JSON-RPC batching/blank lines are not supported. Do not add
an independent JSON decoder/deduplicator or claim duplicate-key rejection beyond
SDK behavior; T03 validates the argument object actually received, not a human preview.

Malformed JSON/message shape, invalid UTF-8 or buffer overflow => protocol/transport
failure, fixed stderr and orderly connection close (exit65), no application envelope,
backend dispatch or guessed error-response id. This deliberately uses SDK's out-of-
band parse-error behavior; it does not promise a JSON-RPC error reply for a frame
whose request identity cannot be trusted. Valid-envelope call/list parameter/name
errors still receive S2's fixed JSON-RPC protocol errors and do not close the server.
An EOF with any unterminated record bytes or unfinished UTF-8 is a protocol failure;
EOF at a complete newline boundary is normal shutdown. Never execute a partial tail.

The narrow outbound writer uses SDK serialization and Node write callbacks, handles
stdout error/close/backpressure and rejects its pending send promises with fixed
safe errors on transport shutdown. Do not depend on stock SDK send's drain-only
promise settling after a broken/closed pipe. Do not throw native write errors through
SDK handlers or log them. Stop admission/input when shutdown starts; no new sends
or successful replies from a closed/fenced connection. Already-written bytes cannot
be recalled. SDK owns response ids/cancellation, not the stream wrapper.

S2 maxToolResultBytes still counts CallToolResult only, not JSON-RPC ids/newline or
catalogue. Do not silently apply that budget to schema listing or claim a total wire/
queue/memory bound. The writer must honor healthy backpressure, not busy-loop,
truncate or treat a queued result as delivered before the write callback. A live
client that stops reading can stall output; EOF/signal/stream failure initiates
shutdown and releases owned send waits. No invented output/shutdown deadline or
forced persistence termination. Any private stream/listener teardown touches only
owned callbacks/adapters; no global API monkey-patching.

## 3. Initialization, error observation and lifetime integration

Settle two narrow S2 lifecycle integrations for delivery:

- No tools/list or tools/call execution before a valid SDK initialize request and
  notifications/initialized sequence. Return fixed InvalidRequest (-32600), no
  runtime dispatch. Use SDK public initialization/capability state and callbacks,
  not model-supplied authority or a custom negotiated-version implementation.
  Keep SDK negotiation/ping behavior; no claim for untested protocol versions.
- SDK internal onerror payloads are never printed. Adapter initiates its existing
  owned close on unexpected SDK faults and retains a safe internal_error terminal
  outcome; explicit close observes it. S3 observes transport closure and awaits
  that same outcome, so a fault cannot silently leave the profile held or become
  a normal successful exit. Ordinary S2 handled protocol/application rejections
  are not fatal internal faults.

On EOF, requested termination or stream/parse failure: fence input/new calls,
initiate adapter close, abort reads, await started durable refresh/persistence,
invalidate/release runtime owner, finish transport/writer teardown, remove owned
listeners and resolve main with the terminal status. SDK disconnect may suppress
error replies; no promise of delivery to a gone client. No logout, vault erasure,
operation evidence deletion, account adoption, auto-reopen/reconnect or successor.
Healthy output already pending can flush normally; broken/cancelled transport waits
must settle safely without waiting for another drain event. Never call process.exit
or kill the profile holder while a durable operation is unresolved.

SIGINT =>130; SIGTERM =>143 after successful orderly cleanup. Repeated signals
reuse the same close, never escalate to forced kill. Cleanup failures are failures,
not proof of release; no automatic close retry if S1/S2 retained a failed terminal
outcome. An unresolved owned operation may prevent exit: report blocked teardown
rather than enforce a misleading deadline. SIGKILL/power loss is outside graceful
shutdown claims; accepted storage/auth recovery governs subsequent explicit startup.

## 4. Exit and diagnostics contract

| Outcome | Exit | Fixed stderr text |
| --- | ---: | --- |
| Complete-boundary EOF / ordinary clean disconnect | 0 | none |
| Successful SIGINT / SIGTERM cleanup | 130 / 143 | none |
| Bad launch arguments | 64 | `Usage: gymtracka-mcp-server [--config <absolute path>]\n` |
| Unsafe/malformed config or descriptor | 78 | `GymTracka MCP startup configuration is invalid or unsafe.\n` |
| Configured storage/session could not open safely | 78 | `GymTracka MCP private state could not be opened safely.\n` |
| Bad input framing/UTF-8/buffer | 65 | `GymTracka MCP input protocol failure.\n` |
| Unexpected startup/adapter fault | 70 | `GymTracka MCP server failed.\n` |
| Stream read/write failure | 70 | `GymTracka MCP transport failed.\n` |
| Failed owned cleanup | 70 | `GymTracka MCP shutdown failed.\n` |

No diagnostic for ordinary application failures/valid-request protocol rejections;
those are MCP messages. Never dump caught errors, debug bodies or user values.
Write at most one fixed primary failure diagnostic, plus one cleanup-failure line
if distinct. If stderr itself fails, no stdout fallback or recursive logging; retain
nonzero status. Fatal failure overrides normal/signal status; first fatal reason
wins unless cleanup fails, which overrides status to70. First requested signal wins
when otherwise clean. Multiple faults need safe close/honest status, not an oracle.
Direct guard catches rejected main with fixed safe failure output/exitCode70 and no
unhandled-rejection dump. ExitCode is assigned only after main's owned teardown.

## 5. Independent parent acceptance

S3 owning cases use official SDK Client/StdioClientTransport launching the actual
compiled entry, plus small raw byte/process checks for framing not expressible by
Client.callTool. Reuse isolated S1 HTTPS/private real Secret Service/ext4 fixture
preparation through accepted public APIs; no live origin/account/bus or token-paste
UX. Selected-runtime direct/symlink/import tests retain T01's inert-import guarantees.

Core checks: initialize/list exact seven schemas/hints and observed negotiated
version; unconfigured/missing config/invalid launch/fatal config/private-state states;
controlled authenticated six reads, representative effective paging/filter and
canonical Int64/error/no foreign disclosure handling; true flag still no creation
mutation; complete/too-large result; stdout purity/sanitized failure; cancellation,
clean/partial EOF, signal during a held read/owned refresh, disconnect/broken pipe
and subsequent explicit ownership acquisition only after release. Use representative
high-risk cases, not every signal/error/data combination or a general process harness.
Verify pre-initialize calls reject and malformed ingress never reaches the backend.

Final T08 acceptance requires full active S1/S2/S3 owning suites plus relevant unchanged
regressions: foundation (narrow supersession below), complete T03/T04/T06 active suites
and the accepted bounded T05 selection from current T06 closure. Deduplicate filenames;
no task-count target or repository discovery. Freeze exact nonempty filenames/hashes
before execution, preserve complete original output/safe failure identities and stop
on scope/hash/output/cleanup deviation. Parked T02 and historical deferred T05 campaign
remain preserved/unrun/unpassed; no whole-repository green claim or hidden exclusion.

Coordinator clean locked source snapshot: npm ci --ignore-scripts, four production
checks/build, stable inputs and byte-identical outputs, final active owning suite plus
representative actual stdio replay; unchanged regressions need not be rerun twice
without a concrete risk. Small public-import observation plus source audit is not
an OS sandbox. Record precise commands/pins/protocol/artifact/limits and cleanup.
No skipped check counts as pass; any required unrun/failure blocks acceptance unless
explicitly adjudicated. T06's task-specific waivers do not waive these new T08 gates.

### Explicit T01 supersession and evidence limits

Replace only server direct-execution/old main-signature assertions that require
exit78/not-implemented stderr with the new actual startup/stdio cases. Preserve root,
CLI, companion, symlink/import/no-import-IO assertions and historical T01 evidence.
Coordinator reviews exact changed test identities before QA edits/runs; no blanket
foundation rewrite or hidden failing-test removal. No implementation/test grant here.

After acceptance, compatibility may claim observed official SDK/Node/stdin-stdout
protocol integration only. Named Pi, real backend ownership/account behavior,
Google/browser, Android sync, descriptor update durability, product write enablement,
packaging/support matrix and release remain T07/T12/T15–T20 gates. Publish minimal
server launch/config/limits/privacy notes, disclosing host/model exposure of requested
fitness data. T18 still owns final distribution/operations. Parent done requires
actual independent accepted artifacts/evidence, not three completed design documents.
