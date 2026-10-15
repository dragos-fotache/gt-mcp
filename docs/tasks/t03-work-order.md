# T03 bounded work order — fresh Developer and independent QA

**Status:** bounded T03 accepted; execution window closed.
[Final coordinator evidence](../evidence/t03-coordinator-review.md) records
221/221 T03,100/100 foundation and clean locked-install/production reproduction.
The phase instructions below preserve the authorized workflow/history; no next
task, production write enablement or release claim is granted.
**User authority:** start T03; use Herdr team with fresh Developer/QA agents.
**Coordinator:** coordinator, w4:p2K. **Developer:** developer, w4:p2G.
**QA:** qa, w4:p2H. Fresh Pi sessions, selected model
meta/muse-spark-1.3-contributor; current tab/cwd/layout preserved. No automatic
coordinator succession or whole-matrix delegation.

## Common public assignment

Read [approved schema/codec specification](../decisions/t03-approved-schema-codec-spec.md),
[T03 task](t03-schemas-codecs.md), AGENTS.md and the normative references named
there. The shared MCP draft0.2 is an approved working-tree policy revision over
9a96dcb; backend v1/OpenAPI1.0.0 unchanged. T01 accepted inert foundation is the
only prerequisite; T02 remains parked/incomplete, T13/T14 retired.

The approved spec fixes the public dist/domain/index.js entry and exact export
names/semantics. Implement/test only pure schemas, strict argument validation,
creation-intent identity material, lossless success-data projection, routine-input
whitelist building and result envelopes. Config-only permission is not implemented
by this task. Server/CLI/root type barrel/companion remain inert. No network,
auth/storage/journal/UUID allocation/mutations/host certification, secret input,
personal backend/Android or live state. No staging/commits or .pi edits.

## Exclusive ownership and independence

- Developer: src/domain/; docs/decisions/t03-implementation-adr.md. Initial narrow
  package.json repair removes only nonexistent t02-feasibility-adr.md formatting
  references; now reported repaired with four passing production checks. No
  further manifest/config/lockfile edits without coordinator decision.
- QA: test/unit/t03/ and docs/evidence/t03-qa-*; the single foundation
  compatibility-metadata assertion repair explicitly scoped in spec section7.
- Coordinator: task/index/status, public spec/work order, integration evidence.
- Developer never reads QA sources/fixtures/plans/evidence/diffs. QA never reads
  production/generated implementation sources/maps/diffs; metadata and public
  specification/API behavior only. Coordinator bridges questions as spec decisions.
- No one touches parked experiment sources/tests/evidence or shared contracts.
  No additional dependencies/compiler relaxation approved. No shared-edit races.

## Phases and execution windows

1. Coordinator reviewed public contracts and repeated baseline production checks.
   Typecheck/lint passed; formatting initially failed on nonexistent historical
   ADR path. Developer repaired only two script literals and reported four checks
   passing. Coordinator independently repeated formatting successfully.
2. Coordinator baseline smoke then observed 99/100 passing: foundation
   compatibility metadata no longer matches user-approved policy matrix. Current
   five-column/17-row public matrix with one retired row is authoritative; the
   narrow QA regression repair is authorized, not test deletion or a policy pass.
3. Fresh QA plan-only readiness received; public spec permits independent
   test-source preparation and the named metadata repair. QA baseline-f0 smoke
   passed100/100; coordinator reviewed and independently repeated100/100.
   Baseline-f0 CLOSED; Developer's API review has no remaining blockers and
   implementation is now authorized in src/domain/ and the T03 implementation
   ADR only. QA prepares sources but waits for a new domain-artifact relay.
4. Developer reports source/public-interface readiness and four exact production
   checks. No self-run QA suite. Coordinator reviews production and freezes exact
   artifacts before relay. QA never runs a moving build target.
5. QA executes scoped independent tests on explicit relay only; sends sanitized
   results. Coordinator reviews both and repeats relevant checks, including a
   clean allowlisted source snapshot/locked install. Repairs invalidate the relay.
6. Acceptance evidence closes T03 only after all criteria and regressions pass;
   unresolved failures retain in-progress/blocked status. No inferred transport,
   config-guard, host/backend/Google/Android or release certification.

Use provisioned PATH="$T01_NODE_HOME/bin:$PATH", Node24.21.0/npm11.19.0.
Developer commands: npm run typecheck, npm run lint:production,
npm run format:check:production, npm run build. Existing checks include preserved
historical sources but do not execute parked T02 scenarios.
QA after relay: npm run test -- test/unit/t03; npm run smoke; scoped QA lint/format.
No npm test/check whole-suite run or historical scenario execution in this window;
no scripts/discovery changed or silently excluded tests counted passed.

## Frozen relay format

Coordinator message names revision tag, public artifact path, producing build
command/toolchain, source/build inventory digest, allowed execution command and
frozen write owner. Developer holds source/build/install/config actions until
coordinator closes the QA window. A baseline-only relay permits foundation smoke,
not new T03 target execution. Final relay includes the domain public artifact.

## Reporting

Asynchronous Herdr prompt to coordinator/w4:p2K: task/role, milestone, changed
paths, exact safe commands and results, blockers/interface decisions, next requested
step. No --wait, pane-output polling or agent-list loops. Hold after artifact-ready
until coordinator relay/window decision. Historical evidence remains unchanged;
initial failures and repair results must stay visible in integration evidence.
