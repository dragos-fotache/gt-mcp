# Named Pi interoperability

Current source uses config2, a single encrypted credential record and fresh-call
creation. T21-S5 refreshes pinned Pi1.1.0 **SDK print mode** evidence with
Node24.21.0/npm11.19.0 and the actual portable stdio server. Pi negotiates
MCP2025-11-25 and discovers seven tools. Use the [S5 review](evidence/t21-s5-review.md)
for current results and [current setup](login.md)/[recovery](recovery.md) for local
auth actions. Historical [T17-S1 evidence](evidence/t17-s1-review.md) describes its
original artifact. Packaging and isolated installed-candidate acceptance remain S6;
no current package/release certification. Btrfs testing remains user-owned.

## Registration shape

The tested SDK passes this server configuration to the built-in
`createMcpExtension({ loadConfig })`, with all Pi state in disposable roots.
The corresponding `mcp.json` shape is:

~~~json
{
  "mcpServers": {
    "gymtracka": {
      "command": "<PINNED_NODE_BINARY>",
      "args": [
        "<INSTALL_ROOT>/dist/protocol/server.js",
        "--config",
        "<PROTECTED_OPERATOR_CONFIG_FILE>"
      ],
      "exposure": "codemode"
    }
  }
}
~~~

Replace placeholders with operator-managed absolute paths; follow
[installation](installation.md), [login](login.md) and
[server configuration](stdio-server.md). File-based CLI registration and
interactive mode still need T17 observations; this example describes the
configuration shape, not an accepted CLI journey.

## Observed paths

| Exposure | SDK observation |
| --- | --- |
| `direct` | Seven tools declared in the first model request and called directly. |
| `deferred` | `tool_search` loads read/creation tools; subsequent model requests declare and call them. |
| `codemode` | Namespace/search discovery and nested `tools.mcp__gymtracka__<tool>` calls, with observed parent IDs. |

Each path refuses creation under false policy before mutation,
while reads work. Strict true permits valid authenticated draft/populate/save
without a permission extension or prompt. Omitted policy also refuses despite
environment enablement attempts. Separate official SDK regressions cover forged
metadata/arguments, invalid config and unsupported CLI enablement flags.

Any client accessing an enabled process can request valid creation without human
confirmation. Protect configuration, process and private state. Config is read at
startup: change policy through stop/await/update/relaunch as documented in the
server guide. Editing a file alone does not change the running process.

Small results retain complete matching structured/text envelopes. Codemode gets
the complete `CallToolResult`; check its `structuredContent` and `isError`.
Execution failures resolve inside scripts. Creation advertises idempotentHint:false;
success contains only routineId/status. Every explicit call is fresh, even with
identical content, and can create another routine. There is no operationId or saved
receipt. After an uncertain/lost reply, inspect list_routines or a known routine via
get_routine before deliberately choosing another attempt. Hosts must not silently
repeat creation after reply loss, reconnect or restart. Authentication remains required.

## Remaining verification

Parent T17 is incomplete. Actual CLI/interactive mode, host lifecycle,
concurrency/cancellation/reconnect, persisted-session restart/fork, effective
disablement, large-output/truncation/untrusted-text behavior and clean integrated
acceptance remain open. The model is scripted and HTTP domain replies use the
existing synthetic fixture; Pi/default stdio/server/TLS/storage are actual.
T16 owns actual backend/Android evidence, T19 real Google/browser login and T20
the independent release decision.

The [remaining slice plan](decisions/t17-remaining-slices.md) assigns these to
S2 CLI/modes, S3 lifecycle/cancellation, S4 lost replies and explicit fresh calls after restart/fork and
S5 output/privacy plus clean parent acceptance. S2 is ready for separate
assignment; no later execution window is open.
