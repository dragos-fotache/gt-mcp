# T05 bounded work order — transport design and fresh independent agents

**Status: CLOSED / bounded T05 ACCEPTED (c4/f3).**
[Independent acceptance](../evidence/t05-coordinator-review.md): QA21focused,
228active owning +444regressions, allPASS/0skips; independent clean174-file locked
snapshot/install/production checks and same672final tests PASS; byte-identical
rebuild,193frozen hashes unchanged. [Daily handoff](../handoffs/t05-end-of-day.md).
All Developer/QA source/build/install/config/runtime windows CLOSED, both agents
HELD; no successor. Historical f1/f2failures and repair records remain FAILED;
c4fixed observed-truncation classification without changing the oracle/contract.
**User authority:** start T05; fresh Developer/QA via Herdr; restart the stopped
agents and resume. Standing Herdr coordination permission is recorded in
[coordination](../agent-coordination.md#standing-herdr-authorization); do not ask
permission for those operations again.
**Coordinator:** coordinator/w4:p2K. Live available existing panes after the user
stopped agents: upper-right w4:p2H for Developer, lower-right w4:p2M for QA.
Selected coding-agent model: meta/muse-spark-1.3-contributor. Fresh sessions, no
continue/resume or prior conversation transfer; no extra topology/focus changes.

## Common assignment and authority

Read AGENTS.md, [T05 task](t05-backend-transport.md),
[coordinator design brief](../decisions/t05-transport-design-brief.md), local
pickup/architecture/verification/policy and T01/T03/T04 public handoffs.
Normative shared MCP0.2 config-only revision over9a96dcb and unchanged backend
OpenAPI1.0.0 remain authoritative. T01/T03/T04 are accepted; T09 ready but
unassigned, T02 parked/incomplete, T13/T14 retired. Preserve historical work.

Implement eventually only the fixed-origin backend transport; no MCP/CLI wiring,
config-file loading/write enablement, session/refresh/login implementation,
storage edits, journal admission, creation orchestration or cleanup. Actual writes
remain disabled, no personal/live backend/DB/browser/Android/keyring, real secrets,
shared-contract rewrites, .pi/settings changes, staging/commits or release claims.
Tests later use explicitly isolated synthetic local fixtures only.

## Current disposition — no open grant

T05accepted; no further checks, edits, installs/builds, provider runs or successor
work assigned. T06/T09 are dependency-ready but unassigned. Actual writes disabled,
no .pi changes/staging/commits/release. Standing Herdr authorization and proportional
testing remain future coordination policy, not automatic task succession.

## Historical grants — CLOSED

All source preparation, repair and conditional execution instructions below are
retained history, NOT live permission. Frozen specification/verification-plan
preparation-state wording is likewise superseded by the final disposition above.

The user approved simplifying the harness while retaining transport safety tests.
Read [the bounded verification plan](../decisions/t05-bounded-verification-plan.md)
completely. It supersedes the general-harness R1–R4 repair demands below where
inconsistent. Prior failures remain recorded; they are NOT retrospectively passed.

- Developer: c3 remains HELD; no source/build/install/config/runtime actions or
  successor. No API/production/dependency change requested by this scope decision.
  Separate user-requested DOCUMENTATION-ONLY exception is now CLOSED: Developer
  added the all-future-work proportional-testing summary/link to AGENTS.md and
  reported pinned Prettier PASS; coordinator verified guide/policy links and the
  unchanged18-file c3source/emitted inventory. Full Developer hold restored.
  No production/build/install/test actions or other file edits followed from that
  exception; coordinator owns the policy and pickup-guide documentation.
- QA: use the plan's exact15active suites, writing the new small
  test/unit/t05/11-import-smoke.test.mjs and
  test/fault/t05/proxy-boundary.test.mjs. Reuse simple safe fixture/helpers; repair
  real active assertion/helper defects. Preserve old general interception/proxy/
  cleanup-calibration files as deferred; do not delete, skip or silently weaken
  product assertions. No existing foundation/T03/T04 or parked-work edits.
- Stop expanding or certifying a general Node runtime interceptor/forward proxy.
  Import evidence is a small smoke plus COORDINATOR source audit; QA never reads
  production implementation. Proxy evidence uses simple owned targets and a
  non-forwarding trap, not a tunnel/forwarding framework.
- QA owns ONLY T05 test paths and docs/evidence/t05-qa-*; publish active suite +
  transitive helper inventory and a concise matrix-to-test mapping with deferred
  disposition. Active helper code must not import deferred infrastructure.
- Source checks now: pinned node --check, own import validation, installed ESLint
  and Prettier on explicit ACTIVE suites/helpers/QA evidence only; formatting writes
  allowed only there. No config/rule weakening, dependencies or manifest changes.
  General deferred-file lint/format failures remain historical/deferred, not passes.
  Small artifact-free builtin/native fixture sanity checks remain allowed; no
  src/dist/domain/production imports or target suites until explicit frozen relay.
- Coordinator independently repeated active19-file parse/lint/format checks: all
  PASS; c3hashes unchanged. Bounded review requests only one small pre-relay fix:
  replace the two new manual child collectors with standard asynchronous Node
  execFile timeout/maxBuffer handling; no general-harness repair. That correction
  is CLOSED: coordinator verified both small changes and repeated19-file source
  checks, all PASS. c3 and activeQA now frozen as t05-f1. The retained T04 private bus/provider/ext4
  launcher was qualified successfully by coordinator; this is fixture readiness,
  NOT a T04 suite rerun or transport acceptance.
- Coordinator reviews this bounded source set and freezes c3+lock/build+active QA
  inventory before granting exact commands. No directory-wide T05/whole-suite
  command falsely presented as green. Final active owning suite plus unchanged
  foundation/T03/T04 regressions and clean locked reproduction remain mandatory;
  focused tests suffice during intermediate repairs after an appropriate relay.
- Both roles keep independent read boundaries/asynchronous reporting. No real
  writes/live services/credentials/private state, .pi edits, staging/commits,
  extra topology or automatic successor. Standing Herdr permission remains.

## Historical implementation and repair windows

The current grant above supersedes incompatible instructions in this retained
history; old "now/open" wording below is not a renewed execution grant.
This section originally superseded initial document-only windows.
The exact [approved specification](../decisions/t05-approved-transport-spec.md)
is the ONLY common API/observable authority; Developer proposal and QA plan are
private role artifacts, not cross-role inputs. Initial reviews/fixes retained in
[public design adjudication](../evidence/t05-coordinator-design-review.md).

- Developer may now create/edit ONLY `src/http/`,
  `docs/decisions/t05-implementation-adr.md`, and bounded T05 notes in
  `docs/compatibility.md` (no product compatibility status upgrades). Proposal
  may receive a superseded-by link but not replace the public spec.
- QA may now create/edit ONLY `test/unit/t05/`, `test/fault/t05/`, visibly synthetic
  helpers/fixtures in those paths and `docs/evidence/t05-qa-*`. No existing test
  edits. Source preparation only; no node_modules tool/suite/compiled-target/
  provider/loopback execution until relay. Synthetic test-only TLS fixture
  generation is to be requested through coordinator, not personal trust stores.
- Developer exclusively owns build/install window: provisioned pins and
  `npm run typecheck`, `npm run lint:production`,
  `npm run format:check:production`, `npm run build` permitted. Coordinated
  `npm ci --ignore-scripts` permitted if needed; report it before running so
  coordinator does not overlap targets. Direct pinned Prettier check of the
  Developer-owned T05 ADR is permitted; no script change needed.
- No new dependencies, manifest/lockfile edits, compiler/config relaxation, or
  modifications to accepted src/domain/storage/contracts/root/CLI/server,
  companion/experiments/shared contracts/local .pi. No Developer self-run domain/
  diagnostic/QA tests. QA never reads production/generated implementation source;
  Developer never reads QA source/fixtures/internal evidence or test diffs.
- APIs/semantics changed from the private proposal: implement/test the approved
  spec exactly, especially idempotency conflict uncertainty, final synchronous
  isCurrent, all-binding credential match, mutable-but-detached typed-array copies,
  response/size precedence and safe error/diagnostic distinction.
- **QA source-review repair window:** initial13mjs review found invalid imports,
  fixture/oracle mistakes and missing mandatory coverage; private coordinator QA
  review is QA-only, never Developer input. QA may repair owning sources/evidence,
  copy coordinator-provisioned six labelled test-only PEMs + README/provenance
  into test/fault/t05/fixtures/, run pinned `node --check` on owning mjs/cjs only
  (parse-only, no imports/node_modules) and a read-only own relative-import check.
  R2 independently repeated19parse checks and8fixture hashes PASS, but targeted
  source re-review still FAILED (private QA R2 review, not Developer input).
  QA now may prepare/run artifact-free harness calibration with ONLY Node builtins,
  synthetic modules and owned ephemeral literal-loopback native fixtures, using
  already-provisioned test TLS pairs. NO src/dist/domain/production/node_modules
  imports in controls; no T05 target/loopback invocation, provider/Vitest/installed
  lint/format/build/install or OpenSSL generation. Record native controls as harness
  calibration, never transport acceptance. T04 private fixture remains deferred
  to relay. R3 re-review repeated10selected native import controls successfully
  but reproduced6silent artifact-free interception bypasses and found child-result,
  cleanup/evidence and head-limit oracle defects. QA private R3 repair continues
  under the SAME narrow source/native-calibration grant; no production imports.
  Reported system-Node26 trial requires honest deviation/command clarification,
  never permission for fallback. With c3 production/build/install now HELD,
  coordinator and QA may additionally run pinned installed ESLint/Prettier ONLY
  on QA-owned test/unit/t05/, test/fault/t05/ and t05-qa evidence; QA may format its
  OWN files. No dependency/install/build/config changes or compiled-target/suite
  execution follow. This source-quality gate is independent of the later frozen
  target relay and is safe only while node_modules remains unchanged. Initial
  R4scoped source checks FAIL (ESLint125errors, formatting27files);2of6original
  native interception bypasses remain plus collector byte-bound/response-header
  oracle issues. QA repairs its PRIVATE R4review within those scopes; no target
  grant. No tests passed merely because sources were ready.
- Public contract correction: backend ServiceError optional message may be string
  OR null; approved spec section8 now agrees with unchanged OpenAPI. Both roles
  notified; no other production grant changes.
- Both report specification contradictions as blockers before implementing guesses;
  coordinator adjudicates publicly. No forced implementation around shared-contract
  conflicts. QA can plan/write unrelated covered cases while one issue is blocked.
- **Production c0 repair window:** first artifact-ready failed coordinator
  production review and11no-network public-entry observables; candidate c0 is
  CLOSED/not accepted, never QA-relayed. Foundation99/100 fails on public matrix
  structure drift; T03221/221 and three repeated production checks pass. Developer
  repairs P1-P13 in its PRIVATE coordinator production review (never QA input),
  existing source/ADR/compatibility scope only. No source/diagnostic probes/tests
  run by Developer. Four permitted production checks, then fresh artifact-ready
  and hold; new independent review/inventory required. Subsequent c1 passes the
  original11observables, foundation100/100,T03221/221 and repeated three production
  checks, but a further boundary probe passes2/11 (ordinary HTTP/HTTPS positives)
  and FAILS9; private c1review C1-F1..F9 sent for repair. c1 is CLOSED/not accepted,
  never QA-relayed. Existing Developer source/ADR/notes scope reopened only for
  those repairs plus truthful history. Subsequent c2passes both prior11-case
  sets22/22, three repeated production checks and foundation100/T03221, but4new
  no-network boundary probes FAIL across C2-F1..F3 (synchronous sender handoff,
  terminal-error post-guard checks, backing-buffer prototype getter). c2CLOSED,
  not accepted/QA-relayed; same Developer scope reopened ONLY for these fixes.
  Subsequent c3 closes these production review defects: all26coordinator
  observations PASS, four independently repeated production checks/build PASS,
  foundation100/T03221PASS and18source/emitted hashes byte-identical after rebuild.
  Developer now HOLDS all source/build/install/config; no further production
  repair assigned. Independent QA source/harness R3 gate remains open, no QA target
  relay or T05 acceptance yet. No dependency/config/compiler expansion or existing
  QA test changes.
- Developer reports artifact-ready with exact four production results, versions;
  paths and limitations, then holds ALL source/build/install/config actions.
  QA reports test-source readiness and holds target execution. Coordinator reviews
  both, creates named inventory/hash freeze and grants exact QA execution commands.
  Repairs invalidate the target and require a new freeze. No automatic successor.

## Historical initial ownership and role-independent read boundaries

- **Developer now:** only `docs/decisions/t05-transport-proposal.md`. May inspect
  production sources, package/build metadata and approved public specs/handoffs.
  Propose exact readonly public API, Node adapter, allowlist, frozen-byte identity,
  session/fence hooks, control response boundary, budgets/retries/uncertainty,
  diagnostics and dependency needs from the design brief. Never QA sources,
  fixtures, internal plans/evidence/diffs (including t05-qa-plan).
- **QA now:** only `docs/evidence/t05-qa-plan.md`. May read public specs/handoffs
  and nonsecret package/build metadata; never production/generated implementation
  sources/maps/diffs or Developer proposal/ADR/private review. Plan independent
  scenario/oracle coverage, production-adapter wire versus double coverage,
  expected regressions and API questions. No guessed API or test sources yet.
- **Coordinator:** public brief/approved spec, work order/task/index/status,
  integration evidence, baseline/install/build ownership initially, interface
  adjudications and frozen-artifact relay. No cross-role source/plan transfer.

Future intended ownership (NOT open yet): Developer `src/http/`,
`docs/decisions/t05-implementation-adr.md`, narrow compatibility notes; QA
`test/unit/t05/`, `test/fault/t05/` with synthetic helpers/fixtures within those
paths and `docs/evidence/t05-qa-*`. Existing src/domain/storage/contracts/root,
server/CLI/companion/experiments and old tests remain untouched. Shared manifests,
lockfile/config/dependencies require coordinator approval and one explicit owner.
No extra dependencies or relaxed compiler settings are preapproved.

## Windows and acceptance sequence

1. Coordinator claims T05, records user authority/current topology/prerequisite
   evidence, provisions/verifies the disposable pinned runtime and reproduces
   permitted baselines with no subordinate build/target execution overlap.
2. Fresh Developer drafts proposal and QA independently plans acceptance; both
   report questions/readiness asynchronously and hold after their document.
   No install/build/typecheck/lint/format/test/diagnostic/target execution by
   subordinates during this initial planning window. Reading metadata is allowed.
3. Coordinator reviews independently, resolves normative conflicts, publishes a
   self-contained approved public API/observable behavior/budget/error contract,
   settles dependency/environment needs, then explicitly opens exact source paths.
4. Developer implements and owns coordinated install/build/production checks;
   QA independently writes owning test sources from the approved spec only.
   QA target/suite/provider execution stays closed while build/install is moving.
5. Developer reports artifact-ready, exact permitted checks/versions/paths/limits
   and holds ALL source/build/install/config actions. Coordinator reviews source,
   freezes named source/build inventory and hashes, supplies QA a public artifact
   relay and exact allowed execution/regression commands. Any repair invalidates
   the target and requires a closed window/new reviewed freeze.
6. Independent QA runs owning suites plus scoped regressions against that target.
   Coordinator reviews both roles and separately reproduces checks with clean
   allowlisted source-snapshot locked install and byte-identical frozen build.
   T04 real isolated-provider regression requires explicit disposable fixture
   provisioning; never use personal service bus/keyring or count a skip as pass.
7. Accept bounded T05 only after all checks pass. No automatic T06/T09 succession,
   product write enablement, real backend/host interoperability, release or commits.

## Toolchain and commands

Every command uses provisioned `T01_NODE_HOME` and
`PATH="$T01_NODE_HOME/bin:$PATH"`, Node24.21.0/npm11.19.0; no system runtime,
global install or Pi configuration changes. Coordinator has located the retained
T04 disposable official runtime, verified archive SHA256 against the retained
SHASUMS256.txt, and observed both exact pins. The runtime location is supplied
out-of-band in the assignment, never a private repository path.

Coordinator permitted initial baseline: `npm ci --ignore-scripts`,
`npm run typecheck`, `npm run lint:production`,
`npm run format:check:production`, `npm run build`,
`npm run smoke`, `npm run test -- test/unit/t03`.
Coordinator repeated every listed initial command successfully: locked install,
four production checks,100/100 foundation and221/221 T03 tests; see
[start evidence](../evidence/t05-coordinator-start.md). These are prerequisite
baselines, not T05 transport acceptance. T04 private-provider regressions were
not rerun in this startup window and must use an isolated fixture later. Existing broad production checks
inspect/compile preserved experiment code but do not resume parked T02 scenarios.
No npm test/check whole-suite, historical experiment diagnostics or silent
parked-suite exclusions claimed as whole-suite passes.

Later Developer checks: the four named production checks and coordinated
`npm ci --ignore-scripts` only after its implementation window opens; no QA suite
or compiled diagnostic/self-written domain tests. QA execution/scoped lint/format
commands are separately authorized in the later artifact relay, not here.

## Reporting

Use asynchronous `herdr agent prompt coordinator "T05 / <role>: <milestone>"`
without --wait. Include changed paths, commands/results (or not run), interface
questions, blockers and next requested decision. Do not poll agent/pane output
or status; initial startup checks and specific failed-startup diagnosis only.
No direct cross-role implementation/test exchange. After proposal/plan readiness,
hold for coordinator adjudication; after implementation/QA readiness follow frozen
relay windows. Evidence uses synthetic provenance/placeholders, no secrets,
identifying content/private paths or raw request/response bodies.
