# AGENTS.md — GymTracka MCP development guide

## Toolchain

Use the provisioned disposable Node toolchain for every command. Never replace
system Node, install global packages, or change Pi settings.

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
node --version # expect v24.21.0
npm --version # expect 11.19.0
```

Pinned development/build runtime: Node 24.21.0 (LTS Krypton), npm 11.19.0 (root
`packageManager`). User-approved runtime minimum: `engines.node >=24.0.0`, with
no upper bound. Credential storage and packaging reject only Node majors below24;
Linux/x64 requirements remain. The user explicitly requested no newer-Node
compatibility testing for this policy change; do not claim such tests passed.

## Commands

```sh
npm install --ignore-scripts # first install / lock creation
npm ci --ignore-scripts # locked clean install (acceptance command)
npm run typecheck # no-emit check of root + companion production configs
npm run lint:production # production sources and configs only
npm run format:check:production # formatting check of production paths only
npm run build # clean root/companion outputs, compile both, no code execution
npm run test # test suite: vitest run on test/**/*.test.mjs
npm run smoke # vitest run test/foundation (foundation suite, not a handshake)
npm run check # typecheck + lint + format:check + build + test, sequentially
```

Production/test code must not require install lifecycle hooks. No
`passWithNoTests`, no skipped checks counted as passes, no `|| true` masking,
no domain tests outside the owning task's scope.

## Contract authority

Normative, in order: shared MCP draft (0.3-draft, user-approved config-only
routine creation without durable creation recovery; uncommitted revision) and backend v1 contract under
`shared-docs/` (committed baseline 9a96dcb, unchanged OpenAPI 1.0.0); the T21 successor storage/interface spec
(`docs/decisions/t21-single-record-storage-spec.md`, for changed T21 behavior); the coordinator-approved
foundation spec (`docs/decisions/t01-approved-foundation-spec.md`); the
implementation ADR (`docs/decisions/t01-implementation-adr.md`); architecture,
verification, and task files under `docs/`. Never rewrite the shared contract
to make a failing implementation appear conformant. Contract conflicts need
user resolution, not implementation shortcuts.

## Working model

User-approved standing workflow: one primary agent in Codex owns planning,
implementation, tests, review, evidence and task/status updates. It may inspect
and edit both production and test sources within the authorized task scope and
run relevant production/test checks. It may spin up bounded subagents at its
discretion and remains responsible for integration and acceptance.

There is no required Coordinator/Developer/QA team, Herdr/Pi session layout,
role-private read/edit restriction or frozen-artifact relay. This supersedes
historical team instructions in project docs/work orders/handoffs. Preserve past
evidence and task dispositions; old grants do not reopen work. Specification-derived
test expectations, stable execution targets, honest evidence and required
independent review/release gates remain in force. Do not rebuild/install while
tests are executing against that target.

If delegating, assign bounded scopes, settle common interfaces and keep one
editor at a time for shared manifests/lockfiles/config. Subagents escalate common
decisions to the primary agent; extra dependencies or relaxed compiler settings
need its review first. No agent stages or commits unless separately instructed.

## Standing task-planning default

The primary agent records a concise, decision-ready task contract before
implementation/test-source work: outcome/non-goals, normative references, settled
public behavior/interfaces, edit scope, permitted commands/environment/execution
grants, proportional acceptance checks, deliverables, milestones and
stop/escalation conditions. See
`docs/agent-coordination.md#default-primary-agent-decision-ready-task-planning`.

Choose implementation internals within that contract and minimal
specification-derived checks with simple fixtures. Escalate specific unresolved
public/contract decisions to the user and hold affected work while continuing
unrelated authorized work; do not guess behavior or silently expand scope.

Broad design proposals/architecture exploration/test-planning rounds require an
explicit bounded request with a named uncertainty, expected output and stopping
point; they are not a routine prerequisite. Historical T04/T05 proposal workflows
remain history, not future templates. Mandatory safety/release gates and no
automatic successor stay unchanged. This docs update opens no implementation/test
window.

Apply bounded work to every task: keep small tasks whole; split larger/riskier
work by reviewable outcome. Target 60–90-minute windows, checkpoint at 90 minutes,
and stop at two hours with an honest handoff. Time limits never justify weakened
verification. Require final parent-task integrated acceptance and authorize
successor slices separately.

## Current delivery scope

T21-S1–S6 and parent T21 are accepted/closed. S6 delivers the separately identified
private archive under dist/delivery/t21-s6/ with exact installed proof and clean
locked reproduction;1,076/1,076 checks across105 files pass in workspace and clean.
Runtime uses config2, one encrypted credential record and invocation-local creation,
without operation journals, external descriptors/anchors or a filesystem-type gate.
Pending-refresh identity, ownership and auth/session fences remain. Btrfs testing
is user-owned by explicit instruction; do not run Btrfs qualification. Actual Pi
CLI/modes/lifecycle/session/output, current Android delivery, T19 live Google/browser
and independent T20 remain unverified release gates. Historical R1 and the laptop
retain their old installed behavior. Preserve historical evidence; no publication,
laptop/live deployment, real write enablement or automatic successor grant.

Routine-creation permission is solely operator config-file `writesEnabled`, a
strict boolean defaulting to false; no custom/external permission extension or
per-routine prompt. See `docs/decisions/routine-creation-config-policy.md` and
shared MCP draft0.3. T02 is parked/incomplete; T13/T14 retired from active delivery.
Preserve old experiment sources/tests/evidence. T03/T04 and portable MCP work do
not depend on parked T02. No automatic slice succession or whole-matrix grant.

## Standing testing scope

User standing policy for ALL future work is proportional, risk-based
testing — see `docs/decisions/proportional-testing-policy.md` (normative
for verification scope and cadence).

- Default to the smallest meaningful contract/risk-based checks with simple
  reused fixtures: core requirements, main success path, representative
  important failures/boundaries; early scoped static checks (syntax,
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
  stable execution targets and honest evidence rules stay.
- No hidden failing-test exclusion, no skipped checks counted as passes, no
  weakening contracts or tests to fit broken code.

## Universal safety rules

Actual writes stay disabled during development except in explicitly isolated
fixtures; production enablement requires the implemented/verified server config
guard and ordinary auth/validation/auth-recovery safeguards, not a companion. No real
credentials, tokens, account/resource IDs, private paths, or raw request/response
bodies in the repo, logs, or evidence. No personal/live backend, database, or
Android session. Login/logout are trusted local actions, never model-facing
tools. Keep local `.pi` untouched: do not stage, edit, or
reconfigure it. The primary agent may edit shared-docs/ for explicitly user-approved
contract changes. Never change contracts merely to hide implementation failures. No staging or
commits without separate approval. Report external-input needs (origin, client ID, ports,
isolated backend, secret facility) as blockers with placeholders only.
