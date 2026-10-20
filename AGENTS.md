# GymTracka MCP development guide

## Environment and commands

Use the Node.js and npm installed on the machine; there is no exact local Node
pin or required disposable toolchain. Current manifests, credential storage and
packaging require Node.js >=24.0.0 on Linux x64. Do not replace system Node,
install global packages or change Pi settings.

```sh
node --version
npm --version
npm ci --ignore-scripts
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
npm run test
```

Use `npm install --ignore-scripts` only for intentional dependency/lock changes.
`npm run smoke` runs the foundation suite. `npm run check` runs typecheck, lint,
formatting, build and tests sequentially. Build cleans root/companion outputs;
preserve needed private delivery archives outside `dist/` before building.
Production/test code must not require install lifecycle hooks. Never rebuild or
install while tests execute against that target.

## Authority and present behavior

Normative authority: shared MCP draft 0.3 and backend v1/OpenAPI 1.0.0 under
`shared-docs/`, followed by the current local [storage contract](docs/storage.md),
[architecture](docs/architecture.md) and operator guides. Never rewrite a shared
contract to make a failing implementation appear conformant. Contract conflicts
need user resolution; shared-doc changes require explicit authorization.

Runtime uses version-2 config, one encrypted credential record, OS Secret Service
key custody and per-invocation exclusive ownership through result delivery. Idle
servers release ownership. Creation is invocation-local without durable creation
journals/receipts or restart continuation. Exact pending-refresh identity and
account/session fences remain required. There is no filesystem-name gate.

Routine-creation permission is solely config-file `writesEnabled`, a strict
boolean defaulting to false. Only explicit true enables creation, with ordinary
auth/validation/recovery safeguards. No permission extension or per-routine prompt.
Config is a startup snapshot. Every client of an enabled process shares that trust.

See [improvements](docs/improvements.md) for outstanding integrated acceptance,
independent review and release gates. Do not infer release, deployment or real
write enablement from implemented behavior or private package availability.
Btrfs qualification is user-owned; do not run it.

## Work planning and ownership

One primary agent owns planning, implementation, tests, review and verification.
Optional bounded subagents may help; the primary remains responsible for integration
and acceptance. Settle common interfaces and use one editor for shared manifests,
lockfiles and configuration. Extra dependencies or relaxed compiler settings need
primary review. No staging or commits without separate authorization.

Before implementation/test-source work, record a concise, decision-ready task
contract: outcome/non-goals, normative references, public behavior/interfaces,
edit scope, commands/environment/execution grants, proportional acceptance checks,
deliverables, milestones and stop/escalation conditions. Choose internals within
that contract. Escalate unresolved public/contract choices while continuing
unrelated authorized work. Broad design/testing campaigns require an explicit
bounded request with a named uncertainty, expected output and stopping point.

Keep small tasks whole; split larger/riskier work into reviewable outcomes. Target
60–90-minute windows, checkpoint at 90 minutes and stop at two hours with an honest
handoff if unfinished. Time limits never justify weakened verification. Require
final integrated acceptance and authorize successor work separately.

## Proportional verification

Follow [development and verification](docs/development.md). Default to the smallest
meaningful contract/risk-based checks with simple reused fixtures: core success,
representative failures/boundaries, early scoped static checks, focused regressions,
then the full active owning suite and relevant unchanged regressions.

Keep selective high-value unit tests for validation, lossless Int64, exact-byte
identity and retry/error decisions. Prefer real isolated integration checks for
HTTP/TLS, persistence/providers and delivered MCP/backend boundaries. Each test
needs a meaningful risk rationale and a specification-derived oracle. Avoid
implementation-mirroring mocks, private-function assertions and redundant cases.
No coverage, test-count or test-to-production line-ratio quotas. A generalized
framework or exhaustive campaign needs explicit approval.

Mandatory safety/shared-contract/release gates remain in force. No hidden failing
suite exclusions, skipped checks counted as passes, `passWithNoTests`, `|| true`
masking, weakened contracts or blanket test deletion. Report exact scope, failures,
unrun checks and blockers honestly. Required independent review remains distinct
from primary review; isolated fixtures do not establish live interoperability.

## Safety

Actual writes stay disabled except in explicitly isolated fixtures. No personal/live
backend, database or Android session. No real credentials, tokens, account/resource
IDs, private paths or raw private request/response bodies in the repo or logs.
Report missing origins, public client IDs, ports, isolated backend and secret
facilities as blockers with placeholders only. Login/logout are trusted local
actions, never model-facing tools. Keep `.pi` untouched. No deployment, publication,
staging, commits or real write enablement without separate authorization.
