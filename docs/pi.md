# Pi integration

The server supports portable MCP registration without a permission companion. The development
dependency is Pi coding-agent 1.1.0. Its SDK print-mode paths cover direct, deferred and codemode
exposure; actual CLI/interactive qualification remains open. See [compatibility](compatibility.md)
and [remaining host qualification](improvements.md).

## Registration shape

The tested SDK passes this server configuration to the built-in
`createMcpExtension({ loadConfig })`, with all Pi state in disposable roots. The corresponding
`mcp.json` shape is:

```json
{
  "mcpServers": {
    "gymtracka": {
      "command": "node",
      "args": [
        "<INSTALL_ROOT>/dist/protocol/server.js",
        "--config",
        "<PROTECTED_OPERATOR_CONFIG_FILE>"
      ],
      "exposure": "codemode"
    }
  }
}
```

Replace placeholders with operator-managed absolute paths; follow [installation](installation.md),
[login](login.md) and [server configuration](stdio-server.md). File-based CLI registration and
interactive mode still need qualification; this example describes the configuration shape, not an
accepted CLI journey.

## Observed paths

| Exposure   | SDK observation                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| `direct`   | Seven tools declared in the first model request and called directly.                                  |
| `deferred` | `tool_search` loads read/creation tools; subsequent model requests declare and call them.             |
| `codemode` | Namespace/search discovery and nested `tools.mcp__gymtracka__<tool>` calls, with observed parent IDs. |

Each path refuses creation under false policy before mutation, while reads work. Strict true permits
valid authenticated draft/populate/save without a permission extension or prompt. Omitted policy
also refuses despite environment enablement attempts. Forged metadata/arguments, invalid config and
unsupported CLI enablement flags cannot enable creation.

Any client accessing an enabled process can request valid creation without human confirmation.
Protect configuration, process and private state. Config is read at startup: change policy through
stop/await/update/relaunch as documented in the server guide. Editing a file alone does not change
the running process.

Small results retain complete matching structured/text envelopes. Codemode gets the complete
`CallToolResult`; check its `structuredContent` and `isError`. Execution failures resolve inside
scripts. Creation advertises idempotentHint:false; success contains only routineId/status. Every
explicit call is fresh, even with identical content, and can create another routine. There is no
operationId or saved receipt. After an uncertain/lost reply, inspect list_routines or a known
routine via get_routine before deliberately choosing another attempt. Hosts must not silently repeat
creation after reply loss, reconnect or restart. Authentication remains required.
