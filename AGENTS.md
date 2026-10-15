# AGENTS.md — GymTracka MCP development guide

## Toolchain

Use the provisioned disposable Node toolchain for every command. Never replace
system Node, install global packages, or change Pi settings.

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
node --version # expect v24.21.0
npm --version # expect 11.19.0
```

Pinned runtime: Node 24.21.0 (LTS Krypton), npm 11.19.0 (root
`packageManager`). Narrow supported line: `engines.node >=24.21.0 <25`.

## Commands

```sh
npm install --ignore-scripts # first install / lock creation
npm ci --ignore-scripts # locked clean install (acceptance command)
npm run typecheck # no-emit check of root + companion production configs
npm run lint:production # Developer-owned production sources and configs only
npm run format:check:production # formatting check of Developer-owned paths only
npm run build # clean root/companion outputs, compile both, no code execution
npm run test # independent suite: vitest run on test/**/*.test.mjs
npm run smoke # vitest run test/foundation (foundation suite, not a handshake)
npm run check # typecheck + lint + format:check + build + test, sequentially
```

Production/test code must not require install lifecycle hooks. No
`passWithNoTests`, no skipped checks counted as passes, no `|| true` masking,
no domain tests outside the owning task's scope.

## Contract authority

Normative, in order: shared MCP draft (0.2-draft, user-approved config-only
routine creation; uncommitted revision) and backend v1 contract under
`shared-docs/` (committed baseline 9a96dcb, unchanged OpenAPI 1.0.0); the coordinator-approved
foundation spec (`docs/decisions/t01-approved-foundation-spec.md`); the
implementation ADR (`docs/decisions/t01-implementation-adr.md`); architecture,
verification, and task files under `docs/`. Never rewrite the shared contract
to make a failing implementation appear conformant. Contract conflicts need
coordinator review, not implementation shortcuts.

## Roles

### Developer

Owns production `src/`, companion source/manifest, manifests/lockfile,
TS/lint/format/Vitest/build config, runtime pin files, `.github/`, ignore rules,
this guide, the implementation ADR, and `docs/compatibility.md`. Never read QA
tests, fixtures, QA internal plans, or test-source diffs. Never modify QA
evidence/tests or coordinator task/status files. Runs only permitted production
checks (install, typecheck, `lint:production`, `format:check:production`,
build) — never the QA suite, whole-suite diagnostics, or test-source diffs.
Only one owner edits shared manifests/lockfiles/config at a time; extra
dependencies or relaxed compiler settings need coordinator approval first.
Never stage or commit unless separately instructed.

### QA

Owns `test/` (including visibly synthetic fixtures) and QA evidence under
`docs/evidence/`. Derives tests from the specifications, never from production
implementation code — no production source, diff, or generated-implementation
reads. May execute the compiled public entry points and inspect observable
results, and may read nonsecret package/build metadata plus the approved public
specification. Requests for dependencies or scripts go to the coordinator, never
direct manifest/config/lockfile edits.

### Coordinator

Owns task/index status, interface decisions, and integration/review evidence.
May inspect both production and test code, run the combined checks, and review
failures against the specifications. Resolves shared-edit conflicts and sends
specification-level failure descriptions for fixes. No agent stages or commits
unless separately instructed.

## Standing assignment default

User-approved default: the Coordinator supplies a concise, decision-ready task
contract before implementation/test-source work: outcome/non-goals, normative
references, settled public behavior/interfaces, edit/read boundaries, permitted
commands/environment/execution grants, proportional acceptance checks, deliverables,
milestones and stop/escalation conditions. See
`docs/agent-coordination.md#default-coordinator-led-decision-ready-assignments`.

Developer chooses implementation internals within that contract; QA chooses
minimal independent specification-derived checks and simple fixtures. Escalate
specific ambiguities to the Coordinator and hold affected work; do not guess
public behavior or silently expand scope. The Coordinator owns common decisions,
not every private function or implementation-derived test.

Broad design proposals/architecture exploration/QA planning rounds require an
explicit bounded request with a named uncertainty, expected output and stopping
point; they are not a routine prerequisite. Historical T04/T05 proposal workflows
remain history, not future default templates. Role independence, frozen-artifact
relays, mandatory safety/release gates and no automatic successor stay unchanged.
This docs update opens no implementation/test window.

## Current delivery scope

Routine-creation permission is solely operator config-file `writesEnabled`, a
strict boolean defaulting to false; no custom/external permission extension or
per-routine prompt. See `docs/decisions/routine-creation-config-policy.md` and
shared MCP draft0.2. T02 is parked/incomplete; T13/T14 retired from active delivery.
Preserve old experiment sources/tests/evidence. T03/T04 and portable MCP work do
not depend on parked T02. No automatic slice succession or whole-matrix grant.

## Standing testing scope

User standing policy for ALL future work is proportional, risk-based
testing — see `docs/decisions/proportional-testing-policy.md` (normative
for verification scope and cadence).

- Default to the smallest meaningful contract/risk-based checks with simple
  reused fixtures: core requirements, main success path, representative
  important failures/boundaries; early role-scoped static checks (syntax,
  types, lint, format, import resolution); focused repair/regression tests;
  final full active owning suite plus relevant unchanged regressions.
- Keep selective high-value unit tests for validation, lossless Int64, exact-byte
  identity and error/retry decisions; prefer real isolated integration checks for
  HTTP/TLS, persistence/providers and delivered MCP/backend boundaries. Do not
  abandon unit testing wholesale or require tests for every private function.
- No unit-test quota, coverage-percentage or test-to-production line-ratio target.
  Each test needs a meaningful bug/risk rationale; avoid implementation-detail
  assertions, implementation-mirroring mocks and redundant cases. AI-generated
  tests still need independent specification-derived oracles. This grants no
  blanket deletion of existing tests or weakening of required coverage.
- No exhaustive permutations or general interception/harness frameworks by
  default; a generalized testing framework or campaign needs explicit user
  approval.
- Mandatory safety, shared-contract, and release gates still apply in full;
  independent roles, frozen artifacts, and honest evidence rules stay.
- No hidden failing-test exclusion, no skipped checks counted as passes, no
  weakening contracts or tests to fit broken code.

## Universal safety rules

Actual writes stay disabled during development except in explicitly isolated
fixtures; production enablement requires the implemented/verified server config
guard and ordinary auth/validation/recovery safeguards, not a companion. No real
credentials, tokens, account/resource IDs, private paths, or raw request/response
bodies in the repo, logs, or evidence. No personal/live backend, database, or
Android session. Login/logout are trusted local actions, never model-facing
tools. Keep local `.pi` untouched: do not stage, edit, or
reconfigure it. The coordinator may edit shared-docs/ for explicitly user-approved
contract changes. Never change contracts merely to hide implementation failures. No staging or
commits without separate approval. Report external-input needs (origin, client ID, ports,
isolated backend, secret facility) as blockers with placeholders only.
