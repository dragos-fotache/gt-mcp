# T04 bounded work order — coordinator design and fresh independent agents

**Status:** bounded T04 ACCEPTED; all implementation/testing/relay windows CLOSED.
[Final acceptance](../evidence/t04-coordinator-review.md): independent t04-f4 QA
and separate clean136-file locked source snapshot reproduce444/444 scoped tests,
production/scoped QA checks and byte-identical build. Earlier grants/instructions
below are historical; no further source/build/install/test work, next task, product
write enablement or staging/commits follows this completion. f2 remains CLOSED/not accepted (unit54/54, fault68/69, foundation100/100,
T03221/221); timeout repair passed independent private-provider/blackhole checks.
[Adjudication](../decisions/t04-f2-timeout-adjudication.md) and failures retained;
QA oracles unchanged, full suites rerun before acceptance. t04-f1 remains CLOSED/not accepted (unit53/54, fault52/69;
foundation100/100, T03221/221), with
[f1 adjudication](../decisions/t04-f1-adjudication.md) and all failures retained.
F1/F2/F7 repairs passed focused checks; F3/F4 oracle corrections are explicit.
Full owning suites/regressions rerun, no shared-contract changes or acceptance yet. Initial c0 source reviews found blocking
defects; c1/c2 repairs passed focused verification, not final acceptance. See production-only
[review](../evidence/t04-coordinator-production-source-review.md); QA must not read
that production review. Coordinator+QA source review is separate and not Developer
input.
**User authority:** start T04; Linux x64 Secret Service; fresh Developer/QA via Herdr.
**Coordinator:** coordinator, w4:p2K. Planned existing panes: Developer w4:p2G,
QA w4:p2H. Selected coding-agent model: meta/muse-spark-1.3-contributor.
No additional panes/tabs/workspaces/worktrees or automatic successor.

## Common public assignment

Read AGENTS.md, [T04 task](t04-private-storage.md),
[approved public storage specification](../decisions/t04-approved-storage-spec.md),
[preflight decisions/evidence](../evidence/t04-coordinator-preflight.md), normative
references and the T01/T03 public handoffs. The initial
[design brief](../decisions/t04-storage-design-brief.md) and Developer proposal are
historical candidates where the approved spec supersedes them; QA never reads
the Developer proposal. T01/T03 are accepted; T02 remains
parked/incomplete and T13/T14 retired. The approved shared MCP draft0.2 working-tree
policy revision and backend v1 are unchanged by T04.

Target protected storage/exclusive ownership only. No backend service access,
Google/browser/Android/personal keyring, real credentials, routine creation,
MCP registration, CLI commands, product writes, staging/commits or .pi changes.
Origins, identities and paths in evidence are synthetic or placeholders only.

## Exclusive ownership and read boundaries

- Developer now: `src/storage/` (including inert holder/diagnostic entry and
  shared engine), `docs/decisions/t04-implementation-adr.md`,
  `docs/compatibility.md`, and only the exact approved runtime dependency
  `@homebridge/dbus-native@0.7.8` in package.json plus its package-lock closure.
  Implement the exact approved public/diagnostic API and protocols. No foundation
  source/barrel, script/config/compiler, other dependency or companion edits. May read
  production sources/metadata, public specs and public prior handoffs. Never QA
  tests/fixtures/internal plans/evidence/diffs, including T04 QA artifacts.
- QA now: `test/unit/t04/`, `test/fault/t04/`, synthetic fixtures/helpers within
  those owning paths, and `docs/evidence/t04-qa-*`. Derive independent tests from
  the approved public specification, including final explicit error mappings and
  per-call immutable-key-facility guards. No existing foundation/T03 test edits.
  Never production/generated implementation sources/maps/diffs; may read nonsecret
  manifest/build metadata and public specs. Do not guess an API or execute targets.
- Coordinator: task/index/status, design brief/approved specification, work order,
  integration evidence and artifact relay. Resolve all cross-role questions as
  specification-level decisions, never send either role the other's private code.
- Only the scopes above are open. No typed foundation refinement or helper outside
  src/storage is authorized. Developer is the exclusive root metadata/install/build
  owner until artifact-ready and coordinator freeze. QA writes sources only and
  runs no tools from moving node_modules/build targets; formatting/lint and test
  execution commands are authorized separately at relay.
- No edits to parked experiment/companion sources/tests, existing QA suites, shared
  contracts, dependencies/lockfiles/compiler settings or config without decision.
  Preserve role independence and single-owner metadata edits.

## Windows and acceptance sequence

1. Coordinator claims T04, captures user selections, prerequisite evidence and
   environment inventory. Initially no baseline checks had run; later successful
   coordinator reproduction is recorded in the review/preflight.
2. Fresh Developer proposes the public API/storage format/keyring/lock/fence design
   and dependency/environment needs; QA independently prepares a scenario plan.
   Both reported readiness and rev2 planning. Coordinator reviewed, retained
   failures and published the approved public spec plus preflight evidence.
   Developer public API feasibility and QA coverage alignment are now authorized;
   proposal/QA-plan revisions only. No implementation/test sources/target runs yet.
3. Coordinator resolves API/security/crash semantics into an approved self-contained
   public specification; reviews any new dependency/helper; restores the provisioned
   exact toolchain and an explicitly isolated Secret Service facility. Coordinator
   reprovisioned the toolchain, repeated all baseline checks successfully, and
   verified a portable private-daemon fixture/dependency probe. Actual production
   adapter/provider acceptance remains pending, not a mock/fixture-only pass.
   Missing facilities remain blockers, never personal/runtime fallback.
4. **OPEN:** Developer implements exact production/diagnostic API, approved metadata,
   ADR and compatibility notes; QA independently writes owning test sources from
   the same spec. No QA target/provider execution. Developer may use
   `npm install --ignore-scripts --save-exact @homebridge/dbus-native@0.7.8`,
   coordinated `npm ci --ignore-scripts`, and four permitted production checks.
   No self-run QA/domain/provider diagnostic scripts. Additional direct formatting
   check of the Developer-owned ADR via installed Prettier is allowed; no package
   script edit required. QA executes only after a separate frozen artifact relay.
5. Developer reports exact permitted production commands, versions, changed paths,
   artifact readiness and limitations; holds all source/build/install/config work.
   Coordinator reviews production source, freezes inventory/digests and relays a
   named revision/public artifact to QA. Repairs invalidate that relay.
5a. **Retained initial repair window (closed for production by f1 freeze):** c0 failed coordinator static source review and a
    sanitized isolated public-entry candidate probe; no relay. Developer repairs
    P1-P11 in its existing scope, restores unauthorized ip-address10.7.4 change to
    baseline10.7.3, records deviations accurately and repeats permitted checks.
    QA repairs its own source/harness review findings independently. QA may use
    pinned parse-only node --check on owning mjs/cjs and artifact-free calibrated
    preload controls (builtins/synthetic sandbox only); no dist/storage imports,
    providers, suites, package/lint/format/build execution. Production and QA private
    reviews are not cross-role input. New artifact-ready invalidates c0 and requires
    fresh review/inventory freeze. No compiled target execution by Developer.
6. QA executes independent scoped tests on the frozen target; coordinator reviews
   both roles and reproduces accepted checks including a clean allowlisted source
   snapshot/locked install. No moving build or personal secret facility.
7. T04 is accepted only after all required gates pass. Blocked/partial tests stay
   blocked/partial; no mock-only OS certification. Completion grants no T05/T06/T09
   succession, actual writes, packaging, release or commits.

## Toolchain and intended commands

Use only provisioned `PATH="$T01_NODE_HOME/bin:$PATH"`, Node24.21.0/npm11.19.0.
The initial absent-toolchain blocker is resolved: coordinator reprovisioned the
exact official runtime in a disposable directory, verified its SHA256 and observed
the expected pins. Coordinator repeated locked-install/production/foundation/T03
baseline checks while both agents planned/held; all passed. See
[design review and baseline](../evidence/t04-coordinator-design-review.md).
Agents use the coordinator-supplied disposable `T01_NODE_HOME` for later authorized
checks; no system Node/npm or unrelated cached runtime substitution approved.
The current implementation grant permits only the Developer install/build and
production checks specified above. QA install/build/target/test/provider execution
remains closed. Provider portable artifacts are coordinator-provisioned; QA will
receive exact nonsecret binary/library locations with the later execution relay.

Later Developer: `npm ci --ignore-scripts` when needed and coordinated;
`npm run typecheck`, `npm run lint:production`,
`npm run format:check:production`, `npm run build`.
Later QA/coordinator after explicit artifact relay: owning T04 tests, foundation
smoke and T03 regressions on the exact artifact. Exact commands/public probe entry
points are settled in the approved spec. No `npm test`/`npm run check` whole-suite
or parked T02 scenario execution; no silent exclusions counted as whole-suite passes.

## Reporting and coordination

Send asynchronous Herdr prompts to coordinator/w4:p2K with T04/role, milestone,
changed paths, safe commands/results (or not run), public interface questions,
blockers and next requested decision. No --wait, output/status polling loops,
automatic succession or direct implementation/test detail exchange between roles.
Developer reports source/API readiness plus exact four production checks and
holds source/build/install/config actions for coordinator review/freeze. QA reports
independent test-source readiness and holds target execution for relay. Questions
must go to coordinator as specification-level decisions; no direct cross-role
implementation/test detail exchange. Blockers stop the affected window.

Agent startup uses a fresh session without continue/resume and the selected model;
`--no-mcp --no-approve` avoids project MCP/resource loading without editing settings.
These flags are not OS sandboxing or proof of comprehensive isolation. If startup
is blocked, coordinator inspects that startup once and obtains any required user
approval rather than blindly resubmitting or changing Pi settings.
