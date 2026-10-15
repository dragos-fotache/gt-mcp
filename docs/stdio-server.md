# Running the read-only stdio server

Use the pinned Node 24.21.0 / npm 11.19.0 disposable toolchain, install with
`npm ci --ignore-scripts`, and build with `npm run build`. The advertised
`gymtracka-mcp-server` bin targets `dist/protocol/server.js`.

```sh
node dist/protocol/server.js
node dist/protocol/server.js --config /absolute/path/config.json
```

The server accepts no other arguments or environment-based config selector. The
selected path must be absolute and normalized. No selection or a safely absent
config still starts MCP: initialization and the seven-tool catalogue work, while
valid reads return `configuration_required`. Unsafe/malformed selected metadata
or an unsafe private-state opening fails startup. Configured signed-out profiles
return `authentication_required` on valid reads.

The version-1 config and binding descriptor use the settled
[T08-S1 format](decisions/t08-s1-runtime-spec.md) with the additive
[S2 result budget](decisions/t08-s2-protocol-spec.md). This server opens existing
protected profiles; browser login, descriptor writing and trusted lifecycle CLI
commands are separate work. Operator config and secret-provider locations stay
local. Never put credentials into tool arguments, config examples, argv or chat.

Clients must complete the SDK initialize/initialized sequence before listing or
calling tools. The six reads return complete canonical results. `create_routine`
is a validated unavailable placeholder, including with `writesEnabled: true`;
this build cannot enable routine creation.

Stdio uses official SDK newline-delimited JSON, with protocol messages alone on
stdout and fixed diagnostics on stderr. Malformed framing/UTF-8, partial EOF and
an accumulated input buffer above 10 MiB close the connection with exit 65.
The whole serialized `CallToolResult` UTF-8 budget defaults to 4 MiB and can be
configured from 4096 through 67108864 bytes. Overflow replaces the result with
`result_too_large`; records are never truncated. These limits do not bound the
whole wire, catalogue, process memory, client display or client transcript.

Complete-boundary EOF exits 0 after cleanup. SIGINT/SIGTERM exit 130/143 after
cleanup; usage exits 64, unsafe startup exits 78, and internal/transport/cleanup
failure exits 70. Shutdown aborts reads and awaits begun owned persistence and
profile release. There is no forced shutdown deadline; a client must not kill
the process while persistence is unresolved.

Requested fitness data is delivered to the selected host/model and may remain in
its transcripts. Backend retention does not control those copies. Local SDK
stdio checks do not certify a named host, real Google/browser login, live backend,
Android synchronization, packaging or release readiness.
