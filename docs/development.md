# Development and verification

Use the Node.js and npm already installed on the machine. The runtime currently requires Node.js 24
or later, with no upper-version guard or exact local version pin. CI uses the Node 24 release line
as the minimum supported baseline. `packageManager` records npm 11.19.0, and dependency
versions/integrities are locked; do not replace system Node or install global tooling for this
project.

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

`npm install --ignore-scripts` is for intentional dependency/lock changes. Production and test code
must not depend on install lifecycle hooks.

| Command                                      | Purpose                                                           |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `npm run typecheck`                          | No-emit root, companion and experimental TypeScript checks        |
| `npm run lint:production`                    | Production sources and configuration                              |
| `npm run format:check:production`            | Production formatting and current documentation                   |
| `npm run build`                              | Clean and compile root/companion output; no application execution |
| `npm run test`                               | Vitest discovery under `test/**/*.test.mjs`                       |
| `npm run smoke`                              | Foundation suite, rather than an MCP handshake                    |
| `npm run check`                              | Sequential typecheck, lint, formatting, build and tests           |
| `npm run package:artifact -- --out <OUTPUT>` | Package an existing build into an empty output directory          |

Build removes `dist/`, including any delivery archives stored there. Preserve needed private
artifacts separately before building. Never build/install while tests are executing against those
outputs.

## Working policy

One primary agent owns planning, implementation, tests, review and verification. Optional bounded
subagents may help; the primary remains responsible for integration. Settle shared interfaces first
and use one editor for manifests, lockfiles and shared configuration. Extra dependencies or relaxed
compiler settings need review.

Before implementation/test-source changes, record a concise task contract: outcome and non-goals,
normative references, public behavior/interfaces, edit scope, permitted environment/commands,
proportional checks, deliverables, milestones and stop/escalation conditions. Choose implementation
internals within that scope. Escalate unresolved public-contract choices while continuing unrelated
authorized work. Broad design or generalized testing campaigns need an explicit bounded request.

Keep small tasks whole; split larger/riskier work into reviewable outcomes. Target 60–90-minute
windows, checkpoint at 90 minutes and stop at two hours with an honest handoff if incomplete. Final
integrated acceptance is required; one slice passing does not authorize its successor, deployment or
release.

## Proportional testing

Use the smallest meaningful set of specification-derived checks: core success, representative
important failures and boundaries, plus focused regressions for observed defects. Run scoped syntax,
types, lint, formatting and import checks early. Finish with the full active owning suite and
relevant unchanged regressions. Do not repeat broad clean-install campaigns after every edit.

Keep high-value unit checks for validation, lossless Int64, exact-byte identity and retry/error
decisions. Prefer real isolated integration checks for HTTP/TLS, persistence/providers and delivered
MCP/backend boundaries. Reuse simple fixtures. Each test should catch a meaningful distinct risk;
avoid private-function tests, implementation-mirroring mocks and redundant permutations. There are
no coverage, unit-test-count or test-to-source line-ratio quotas. A generalized framework or
exhaustive campaign requires explicit approval.

Do not silently exclude failures, count skips as passes, use `passWithNoTests`, mask failures with
`|| true`, or weaken requirements to fit code. Existing deferred or experimental suites are not
release proof. Some integration suites require explicit isolated backend, provider, TLS,
baseline-archive or Android inputs; missing facilities are blockers, not passing checks. Use the
existing scoped runners under `test/` and supply selections explicitly. Historical reproduction
helpers require the matching source/artifact inventory and selected tests.

Report actual commands/results and material limits. Preserve stable targets and exact artifact
identity/clean locked reproduction when the acceptance boundary requires them. Required independent
review remains distinct from primary review.

## Safety and external inputs

Keep writes disabled except in explicitly isolated fixtures. Do not use a personal/live backend,
database or Android session. No real credentials, account IDs, private paths or raw private
request/response bodies belong in the repository or logs. Use placeholders for backend origin,
public Google client ID, loopback port, Secret Service address and disposable fixture facilities.

Login/logout are trusted local actions, never model-facing tools. Leave local `.pi` untouched. Do
not stage, commit, deploy, publish or enable real writes without separate authorization.
Shared-contract changes need explicit authorization; never edit a contract to hide an implementation
failure. Btrfs qualification is user-owned. Remaining mandatory gates are in
[improvements](improvements.md).
