# GymTracka MCP

Planned TypeScript/Node.js stdio MCP adapter for GymTracka, with six browsing/read
tools and recoverable saved-routine creation controlled solely by an operator
configuration-file `writesEnabled` flag. No custom or external permission extension
is required; no per-routine approval prompt is planned.

**Current state: T08 read-only stdio delivery accepted.** Schemas/codecs,
protected storage, HTTP transport, session handling, configured reads and the
seven-tool SDK/stdio surface are implemented. Final active verification passed
941/941 checks; a clean locked rebuild produced 128 identical compiled files and
passed all 82 active T08 checks. See [S3 acceptance](docs/evidence/t08-s3-review.md)
and [server launch/privacy notes](docs/stdio-server.md).

**T07 trusted login is now complete.** Setup/login/resume/cancel/recover are
delivered through `node dist/cli/main.js`, with a secured loopback GIS helper
and protected session recovery. See the [operator guide](docs/login.md) and
[S3/parent acceptance](docs/evidence/t07-s3-review.md):99/99 clean T07 checks and
245 selected checks pass with isolated facilities and a controlled launcher.
Legacy package/bin wiring remains unchanged pending T18.

Routine creation remains separate work; `create_routine` is
unavailable even with `writesEnabled: true`. T06 retains its explicit historical
verification omissions. Real backend/Google/Android/named-host/release
interoperability remains unverified. T02 is parked; T13/T14 are retired.

## Start here

- [Implementation documentation](docs/README.md)
- [Configuration-only creation policy](docs/decisions/routine-creation-config-policy.md)
- [Roadmap and dependencies](docs/implementation-plan.md)
- [Agent task queue](docs/tasks/README.md)
- [Architecture and safety boundaries](docs/architecture.md)
- [Verification and release gates](docs/verification.md)
- [Shared MCP draft](shared-docs/docs/mcp-contract/README.md)
- [Finalized backend contract](shared-docs/docs/backend-contract/README.md)

The user-approved config-only policy is aligned in shared MCP draft0.2 (uncommitted
working-tree revision based on9a96dcb). Backend v1 is unchanged. This documents the
intended behavior, not a compatibility pass or actual write enablement.
Do not use a personal/live database or put credentials in this repository.
