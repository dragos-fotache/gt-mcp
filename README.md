# GymTracka MCP

A local TypeScript/Node.js stdio MCP server for GymTracka. It provides six tools
for browsing exercises, workouts and saved routines, plus routine creation.
A trusted local CLI handles setup, Google sign-in and credential lifecycle.

Routine creation is disabled by default. Only `writesEnabled: true` in the
operator's protected configuration enables it. Every connected client shares
that permission; there is no per-routine approval prompt. Each creation call is
independent, so repeating a call can create a duplicate.

The runtime uses version-2 configuration and one encrypted credential record,
with its key held by the OS Secret Service. Multiple server processes can share
a profile: idle connections release ownership, and active calls serialize through
result delivery. The installer supports fresh installation and compatible
in-place updates with a retained application backup.

Use the machine's Node.js and npm. The current runtime requires Node.js 24 or
later on Linux x64; there is no exact local Node version pin. This is a private
project, and the current implementation is not a public release certification.

## Documentation

- [Documentation index](docs/README.md)
- [Installation and updates](docs/installation.md)
- [Setup, login and lifecycle](docs/login.md)
- [MCP server, tools and configuration](docs/stdio-server.md)
- [Recovery](docs/recovery.md)
- [Architecture](docs/architecture.md) and [credential storage](docs/storage.md)
- [Development and verification](docs/development.md)
- [Compatibility](docs/compatibility.md) and [Pi integration](docs/pi.md)
- [Packaging](docs/packaging.md)
- [Further improvements and release gates](docs/improvements.md)

The [shared MCP contract](shared-docs/docs/mcp-contract/README.md) and
[backend contract](shared-docs/docs/backend-contract/README.md) define the external
behavior. Keep live credentials and personal data outside this repository.
