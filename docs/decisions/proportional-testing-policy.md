# Standing policy — proportional testing for all future work

**Authority:** the user explicitly requested reduced test scope for ALL future
project work, not only T05. This is a standing instruction for the primary Codex
agent and any optional subagents, in every task and handoff. Do not restart the
earlier exhaustive harness approach by default or require the user to repeat this
preference.
The user also approved documenting selective unit testing rather than abandoning
unit tests, with integration tests preferred for real system boundaries.

## Default: smallest meaningful verification of the task

- Test the task's public requirements, main successful use and representative
  important failures/boundaries. Choose cases by concrete product risk, not by
  the number of permutations or hypothetical implementation mechanisms.
- Preserve critical security, privacy, authorization, data integrity and recovery
  checks. A real requirement must have evidence; it does not need the same
  assertion repeated at every layer or across every unrelated combination.
- Reuse established tools and small, straightforward fixtures. Prefer a focused
  unit table and a few real boundary/integration checks over a general-purpose
  simulator, interceptor, sandbox, proxy or harness framework.
- Do not rebuild already accepted dependency tests inside a new task. Test the
  new integration boundary and run relevant unchanged regressions at acceptance.
- No arbitrary test-count cap: a small change needs little testing; a genuine
  auth/recovery boundary needs more. Additional cases need a named requirement,
  observed defect or concrete risk, not "more rigorous" as the sole justification.

## Choose tests by value, not by layer quotas

Keep focused unit tests where they cheaply establish important deterministic
behavior: strict validation, lossless Int64 handling, exact-byte request identity
and error/retry decisions. Do not abandon unit testing wholesale or require a unit
test for every function.

Prefer boundary/integration tests for HTTP/TLS, persistence, secret-provider
behavior and, as those features are delivered, MCP/backend workflows. Use the
actual isolated component when the claim requires it; a mocked boundary does not
prove real integration. Combine these checks with focused unit tests when each
catches a distinct meaningful failure.

Avoid private-function and implementation-detail assertions, elaborate mocks that
merely reproduce the implementation, redundant permutations and new generalized
harnesses without a concrete need. Test public requirements and observable
behavior. AI-generated tests still need independent specification-derived oracles;
agreement with AI-generated production code alone is not correctness evidence.

There is no unit-test quota, coverage-percentage target or test-to-production
line-ratio target. Counts may prompt review, but helpers, fixtures and historical/
deferred experiments inflate totals; lines alone do not establish test value.

For each proposed test, ask: **"What meaningful bug would this catch that another
test would not?"** Name the requirement, observed defect or concrete risk and
choose the cheapest reliable layer. A small independent risk-based set is the
default; distinct safety requirements and mandatory gates still need evidence.

This guides future assignments, not a blanket deletion of existing tests.
Any consolidation must be explicitly scoped, retain required contract coverage
and regression evidence, and record what changed; failing requirements cannot be
removed or reclassified as redundant to obtain a pass.

## Planning and early checks

For each new bounded assignment, record a SHORT verification section:

1. Core requirements/risks, representative checks and why their chosen layers
   catch meaningful failures without unnecessary duplication.
2. Reused fixtures/tools and any genuinely necessary small additions.
3. Active tests/helpers and relevant final regression suites.
4. Deliberately out-of-scope/deferred checks and limits of the evidence.

This is not another elaborate test-planning project. Run scoped syntax,
type, lint, formatting and import-resolution checks EARLY, before building a
large test suite. Syntax-only checks do not prove names resolve or assertions
make sense. Catch harness mistakes locally before declaring sources ready.

## Execution cadence

- During development/repairs, use the smallest relevant check or focused test.
  Reproduce each real bug with a targeted regression where useful. Do not rerun
  all project suites and a clean install after every minor edit.
- Run the complete ACTIVE owning suite and relevant unchanged regressions on the
  final candidate. Preserve clean locked build/install and integration evidence
  when required by the owning task/release boundary, not as a per-edit ritual.
- The primary Codex agent owns implementation and verification, with optional
  bounded subagents under the [working policy](../agent-coordination.md).
  Derive test expectations from public specifications, not implementation
  agreement. Keep execution targets stable: no rebuild/install racing tests.
  Preserve frozen-artifact/clean-reproduction evidence when required by the
  acceptance claim; a separate role or artifact relay is not required.
- A modest black-box smoke plus source review may be the right proof
  for a property such as inert imports. State its limitations; do not pretend it
  is comprehensive runtime interception or an OS sandbox.

## Stop harness scope creep

When harness work starts dominating the feature, simplify or replace it before
adding more instrumentation. General-purpose interception, whole-runtime API
matrices, broad fault cross-products and stress/mutation campaigns are NOT the
default. A new generalized testing framework or exhaustive campaign requires a
separately justified proposal and explicit user approval. Ordinary targeted tests
for a concrete missing requirement do not need that escalation.

Use the least complicated method that provides meaningful evidence. Favor fixing
an actual product/test defect over inventing another meta-test framework.

## What this policy does NOT authorize

- No weakening of shared contracts, production behavior or mandatory safety gates.
  Existing named backend/browser/Android/host release checks remain real gates;
  a mock or smoke cannot replace genuine interoperability evidence.
- No deleting a failing product assertion, changing its expected result to fit
  broken code, disabling lint/compiler rules or counting skipped checks as passes.
- No silent suite exclusions or blanket whole-suite claims. Record active scope
  and deferrals explicitly; preserved deferred/parked work is NOT passed.
- No changes to tests/config/manifest/dependencies outside the owning grant,
  no real credentials/live services/writes, .pi edits, staging/commits or automatic
  next-task authorization.

Historical task matrices describe behavior/ownership, not an instruction to test
all Cartesian combinations. At pickup, reconcile an older oversized local plan
with this standing policy BEFORE implementation/testing, explicitly retaining
mandatory contract coverage and documenting deferrals. Never silently drop a
required scenario just because it is inconvenient or currently failing.

## Current application and future handoffs

[T05's bounded verification plan](t05-bounded-verification-plan.md) is the first
application, not the limit of this policy. Its selected final regressions and
held c3 production state remain unchanged. Future tasks choose their own SMALL
relevant matrix; they do not inherit T05's15-file selection or its old harness.

Every handoff/work order must carry this standing preference or link here.
The single-agent workflow changes staffing and source access; specification-derived
oracles, acceptance honesty, required independent review/release gates and the
application's security requirements remain unchanged.
