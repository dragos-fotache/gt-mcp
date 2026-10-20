# Documentation

These guides describe the implemented server and its operating requirements. Outstanding work is
collected in [improvements.md](improvements.md).

## Operating the server

| Guide                           | Contents                                                                   |
| ------------------------------- | -------------------------------------------------------------------------- |
| [Installation](installation.md) | Prerequisites, interactive/manual installation and compatible updates      |
| [Login and lifecycle](login.md) | Protected configuration, setup, Google login, sign-out and profile removal |
| [Stdio server](stdio-server.md) | Seven tools, write permission, multiple clients, cancellation and budgets  |
| [Recovery](recovery.md)         | Interrupted updates, authentication uncertainty and lost creation results  |
| [Pi integration](pi.md)         | Registration shape, tool exposure and host limitations                     |

## Developing the server

| Guide                             | Contents                                                           |
| --------------------------------- | ------------------------------------------------------------------ |
| [Architecture](architecture.md)   | Components, creation workflow and trust boundaries                 |
| [Credential storage](storage.md)  | Record format, atomic replacement, ownership and cleanup           |
| [Development](development.md)     | Environment, commands, working policy and risk-based verification  |
| [Compatibility](compatibility.md) | Dependency versions, runtime requirements and certification limits |
| [Packaging](packaging.md)         | Private archive generation and installation boundary               |
| [Improvements](improvements.md)   | Pending integrated acceptance, release gates and optional cleanup  |

External contract authority is the [shared MCP draft](../shared-docs/docs/mcp-contract/README.md),
currently 0.3-draft, and the [backend v1 contract](../shared-docs/docs/backend-contract/README.md),
OpenAPI 1.0.0. Local guides supplement those contracts; conflicts require explicit resolution rather
than changing a contract to fit an implementation.
