# T17-S1 — Named Pi call paths and configuration policy

**Status:** accepted/closed · **Owner:** primary Codex agent · **Authorized:** user
requested “Let's do T17.” on 2026-10-17. Started 15:20 UTC; checkpoint 16:50 UTC,
hard stop 17:20 UTC. This first bounded outcome is active; later T17 work needs
separate assignment under the standing sequential-slice policy.

## Contract

Verify the installed pinned Pi 1.1.0 native MCP host against the actual compiled
portable server, private Secret Service/ext4 storage and existing synthetic HTTPS
backend fixture. The model alone is scripted through Pi's public faux provider;
the host agent loop, native MCP transport, server, auth/storage and HTTP calls are
real. This is host interoperability evidence, not another real-backend/Google/
interactive-terminal or independent release certification.

Authority: shared MCP draft0.2 tools/authentication/creation and scenarios
M01/M02/M10, C09–C12; backend v1; accepted T12/T15/T16 evidence;
[T17 parent](t17-pi-certification.md), config-only policy, foundation ADR and
[proportional testing](../decisions/proportional-testing-policy.md). No contract,
schema, dependency, compiler or storage-format changes. Only strict operator
config boolean `writesEnabled:true` allows valid authenticated creation; omitted
or false refuses before admission/mutation. No permission extension/prompt.

S1 settles native SDK print/headless direct calls, deferred discovery followed by
direct calls, codemode namespace discovery and nested calls through the real
portable server. Verify seven tools, real protocol negotiation where observable,
read success, creation disabled/enabled, matching structured/text envelopes,
normal validation/auth failures and representative attempted non-config
enablement. Reuse official SDK startup/config tests separately. Supported claims
are limited to actually observed paths/mode; no T02 approval matrix.

Later T17 outcome covers actual CLI/interactive-mode observations as supported,
concurrency/cancellation, host reconnect/shutdown, lost-response exact retry,
restart/fork intent retention, effective config disablement, result-budget and
host truncation/privacy handling, then clean integrated parent acceptance.
S1 alone does not close C10–C12 or parent T17. No automatic successor.

## Scope, environment and commands

Edit `test/pi-integration/`, a focused Pi operator guide if warranted, and
T17 task/status/compatibility/evidence/handoff documentation. Reuse existing
fixtures, runner and public Pi helpers; preserve parked T02 code/tests/evidence.
Minimal existing fixture changes or production repairs require a demonstrated
T17 defect and a recorded scope decision before editing. No generalized harness,
new dependencies, manifest/lock edits or runtime policy expansion.

Use restored disposable Node24.21.0/npm11.19.0 through `T01_NODE_HOME` for all
Node/npm commands. Initial shell resolved Node26 because this variable was
absent; only version probes ran before restoration. Use disposable provider
extraction, fresh private bus/unlocked store/read/clear qualification, ext4 roots
and trusted fixture TLS. No personal/live services/credentials, ambient provider,
real model network, local `.pi` edits, global installations or Pi settings changes.
SDK configuration is explicit and contained in disposable fixture roots.

Permit read-only source/package inspection, scoped Python/Node syntax, lint,
format/import checks, production typecheck/lint/format/build, locked installs in
disposable reconstruction only if necessary, and the existing isolated runner
with an exact new owning + relevant unchanged selection. Never build/install
while tests execute against that target. No staging/commit, release, publication,
real enablement, Google/Android/backend provisioning or successor execution.

## Acceptance and deliverables

Use small integration cases for each distinct Pi routing mechanism and the
config guard; avoid a Cartesian mode/policy matrix. Observe actual Pi tool events
and returned envelopes, plus fixture HTTP mutations and encrypted journal
inspection after owner shutdown. Disabled policy must leave no journal admission
or mutation. Enabled calls must create/save through the three expected routes,
and explicit identical retry must retain the same receipt/root without further
mutations. Verify no permission-gating extension is loaded. Native discovery,
tool-search activation and parent IDs must be observed, not inferred from labels.

Run early static checks and one focused journey, then complete active S1 owning
tests plus unchanged `test/create-stdio/policy-identity.test.mjs`, complete
`test/create-protocol/`, and `test/stdio-server/sdk-startup.test.mjs`. Record the
exact selection before execution, production checks, stable input/output hashes,
immutable package integrity and installed Pi module identity, sanitized failures,
cleanup and primary-agent source/spec review. Existing deferred/parked suites are
not passes. Parent's broader lifecycle/recovery suite and clean integrated replay
remain later work.

Deliver source checks, scoped evidence/review, operator compatibility limits and
handoff; update parent/index/verification disposition honestly. Milestones:
environment/contract; native path tests and early checks; final scoped execution;
source/spec review and evidence closure. Stop/escalate on a public contract
conflict, missing safe toolchain/provider, dependency drift, unsafe host loading,
substantial harness expansion, or hard time limit. Leave exact partial state
rather than weakening requirements.

## Final disposition

Accepted/closed:25/25 in five files (8 active S1 +17 unchanged regressions), zero
failed/skipped/pending/todo;623 stable hashes,327 unchanged baseline inputs and194
identical emitted files. Actual Pi SDK print/direct/deferred/codemode paths,
MCP2025-11-25 negotiation, config-only creation, receipt identity and missing-auth
refusal pass. Production/scoped checks and owned cleanup pass. No production
repair; original qualification failures retained. A passive listener on Pi's
unchanged default transport records public initialize/catalogue metadata;
normalized declarations use public `getCurrentTools`. Messages/domain results
are never replaced. [Review](../evidence/t17-s1-review.md),
[handoff](../handoffs/t17-s1.md). S1 grants closed; later work held, parent incomplete.
Document-only closure follows runtime acceptance without another full runtime
replay; its hash reconciliation is recorded separately.
