# T02 coordinator work order

**HISTORICAL / T02 PARKED:** user-selected config-only routine creation supersedes
the custom/external permission-extension plan. Shared MCP draft0.2 is aligned;
no further T02 execution/succession or QA artifact relay. Preserve original evidence
and failures; R3 remains an unaccepted candidate. See
[the current decision](../decisions/routine-creation-config-policy.md).
Instructions/windows below are historical, not current execution permission.

**LATEST AUTHORITY:** R1/S2B is accepted after strict repair; its windows are
closed. The user now authorizes documentation-oriented fresh-coordinator handoffs
for each fixed remaining T02 slice, through T02 only. Follow the coordinator-only
succession policy: incoming coordinator takes R2 after READY/TAKEOVER; each slice
still needs concrete work order/review/independent relay. **13 total slices:
3 accepted + 10 remaining**. No whole-matrix delegation, skipped gates or T03+ work.
See the [coordinator-only pickup handoff](../handoffs/t02-coordinator-pickup.md).

**State:** user-authorized T02; independent Stage 1 proposals reviewed.
The earlier broad Stage 2 assignment is superseded by the
[coordinator/Developer implementation slice plan](../decisions/t02-coordinator-slice-plan.md)
(not QA input):
S1 (`no-companion`, SDK) is independently accepted as an unavailable-call baseline.
S2A (`generic-readonly`, SDK) was implemented and independently accepted under the
[concrete coordinator/Developer work order](t02-s2a-work-order.md) (not QA input).
Coordinator readiness, S1 regression and independent S2A QA acceptance passed.
R1/S2B direct-readonly/sdk was implemented/repaired under the
[concrete coordinator/Developer order](t02-s2b-work-order.md) (not QA input) and
is now accepted as actual print/no-UI companion denial only. Its first QA failure
is preserved; assertions were not weakened. S1/S2A regressions passed in the new
window. Metadata-only status maintenance is complete; all target/build windows
closed. No genuine interactive approval or write-capable setup is proved by these
three accepted SDK profiles. Remaining scenarios/subsystems are unassigned/paused.
[The approved experiment specification](../decisions/t02-approved-experiment-spec.md)
still defines acceptance. Feasibility remains unproven; no product writes or
T17 certification is implied.
**Prerequisite:** T01 accepted; read its handoff and coordinator evidence, and repeat
relevant permitted checks on the selected toolchain. No T03+ task is assigned.
Coordinator pickup baseline: `npm run check` passed on Node 24.21.0/npm 11.19.0
(typecheck, lint, formatting, clean build and all 100 T01 tests); shared checkout clean.

## Team reset and safety scope

At the user's request, T02 uses fresh Developer and QA Pi processes/sessions rather
than continuing the T01 agents. Same Herdr tab and right-hand stacked panes, same
`meta/muse-spark-1.3-contributor` model, coordinator on the left. Agent names remain
`developer`, `qa`, `coordinator`; asynchronous reports only, no output polling.
Fresh coding sessions are distinct from any isolated Pi runtime under test.

T02 is a **synthetic feasibility spike**, not the product companion and not T17
certification. Never connect a backend, inspect/copy real auth/profile data, edit personal
Pi settings/provider configuration, change the current coding-agent host pipeline, or
connect write-capable product MCP registration. Production server/CLI/companion entries
from T01 stay inert. All simulated effects must be clearly labeled counters/observations,
never real domain writes. No staging/commits/publication.

Use Node 24.21.0/npm 11.19.0 and locked Pi 1.1.0 development candidate initially.
The existing global/replacement MCP setup is not the product's certified configuration.
All experiment execution must use disposable HOME/XDG/Pi-agent-dir/session/cwd roots,
explicit resources and offline/provider-free or deterministic local-provider operation.
Do not load user extensions/credentials or send experimental data to a real model.
No extra Herdr tabs/panes/workspaces/worktrees unless the user requests them; a local
PTY/SDK child process is a test harness, not an instruction to rearrange the user's UI.

## Stage 1: independent design/coverage preparation

### Developer owns the feasibility proposal

Read all normative T02 references (task, architecture, shared tools/approval contract,
verification C10-C12), T01 approved spec/ADR/handoff and the selected Pi's complete
extensions/MCP/codemode/TUI/SDK/packages documentation plus relevant permission,
command/nested-tool/provider/SDK examples. Follow related API documentation links.
Pin an immutable source/package identity including integrity; verify actual runtime APIs
rather than treating documentation or installed dependencies as passing evidence.

Only write `docs/decisions/t02-feasibility-proposal.md` at this stage. Do not create
experiment code, change configuration/dependencies or execute new host experiments yet.
Permitted existing production-only T01 checks may be repeated; never read or execute QA
sources/suite. Read actual upstream runtime implementation as needed for feasibility,
but never QA tests, fixtures, plans, evidence internals or test-source diffs.

Propose a common public observable specification and isolated experiment architecture:

1. A seven-tool synthetic stdio fixture using existing official SDK, plus an experimental
   companion and deterministic driver; concrete source/build/output and launch paths.
2. How to drive actual selected Pi pipeline for direct, deferred/tool-search, codemode,
   and nested executeTool calls without network/real credentials; report which layer
   each planned experiment proves (pure logic vs actual SDK pipeline vs actual PTY/TUI).
   Fake events/handler-order simulations are useful controls, not actual-pipeline evidence.
3. Minimal stable fixture interface/data/envelope/trace requirements that QA can exercise
   independently without reading implementation. No new model-facing approval fields,
   credentials, arbitrary routes, product endpoint or domain schema expansion.
4. Gate-before-connect registration, teardown/reload ordering, static overrides and
   '-'/'_' collisions, missing/failing gate, replacement runtime and incompatible modes.
   Name observable zero-effect and no-write-registration assertions for each negative case.
5. Exact final-input integrity mechanism or verifiable exclusion/detection of later
   mutating handler configurations **before** enabling synthetic writes. Freezing one
   object or trusting annotations/clientInfo without evidence is insufficient. If no
   defensible mechanism exists, identify a contract-review blocker, do not weaken policy.
6. A trusted noncredential origin/account/session/profile-generation binding channel for
   labels and retained intent; sign-out/reauth/reload invalidation and missing/ambiguous
   label failure. Prove feasibility only; production encrypted storage/full approval UX
   remain T04/T13/T14 responsibilities, not silently fabricated by an in-memory fixture.
7. Required dependencies/scripts/resources and expected reproduction commands; prefer
   current locked dependencies and stdlib tooling. Ask before manifest/lock changes.
8. Supported extension/load-order/runtime configuration and explicit failure boundaries;
   distinguish controlled synthetic experiments from future host/write certification.

### QA owns the independent acceptance plan

Only write `docs/evidence/t02-qa-plan.md` at this stage. Derive required assertions from
shared tools/approval/C10-C12, task/architecture/verification and T01's public handoff/spec.
Official Pi docs/examples and public API declarations are allowed specifications; do not
inspect project production/experimental implementation, generated bundles, or upstream
runtime implementation to derive tests. Never read Developer internals. Nonsecret
package/build metadata and coordinator-approved public interface specs are allowed.

Plan positive/negative tests for every path and fail-closed configuration above, including
handler mutation after approval, identity/collision normalization, mode confusion
(hasUI versus tui), handler exceptions, cancellation/dismissal and lifecycle invalidation.
State how real pipeline/PTY observations will be distinguished from mocks and how controls
prove the harness can detect an unguarded effect or mutated dispatch. Identify API/trace/
launch/data decisions needed; do not guess them or create tests before the shared spec.
No configuration/dependency edits or experimental host execution yet.

### Coordinator approves the shared experiment specification

Review both independent proposals, inspect normative/runtime feasibility evidence and
select bounded observable contracts, supported runtime/configuration and safety isolation.
Record common decisions in a separate approved specification; share only specification
requirements/decisions, never the other role's internal implementation/test approach.
Do not equate a documentation inspection or public type signature with actual behavior.

## Stage 2: implementation and independent tests after shared-spec approval

Tentative ownership (final concrete paths confirmed in the approved spec):

- Developer owns an explicit `experiments/t02/` implementation tree (synthetic server,
  experimental companion/driver/build/metadata), necessary shared config edits as sole
  owner, and its ADR. Experimental sources are implementation: QA cannot read them.
- QA owns `test/pi-feasibility/`, clearly synthetic QA fixture/probe helpers, and
  `docs/evidence/t02-qa-*`. Developer cannot read those paths or QA diagnostics/source.
- Coordinator owns task/index/verification/architecture decision and combined evidence.
  Existing T01 entries and tests are not casually rewritten to suit the spike.

After agreeing public paths/contracts, Developer and QA use the shared spec and
current coordinator slice authorization, not the full matrix as a blanket assignment.
Coordinator owns concrete integration design, next-slice paths, interfaces and stop
conditions. QA executes only the named public experiment subset after a coordinator
artifact-ready relay; no readiness polling. Serialize shared build/install
changes and target test runs. Coordinator reviews both implementations and assertions,
runs all relevant checks and records independent source/process/transport observations.

## Evidence, acceptance and reporting

Send asynchronous milestones/questions/blockers/completion via:

```sh
herdr agent prompt coordinator "T02 / Developer: <sanitized report>"
herdr agent prompt coordinator "T02 / QA: <sanitized report>"
```

No `--wait`, pane reads or loops watching readiness. Coordinator pane is `w4:p2D`.
Use relative artifact paths, exact safe commands, package/runtime identity, layer and
pass/fail/blocked status. No private filesystem/account/profile identifiers, credentials,
raw personal bodies or unredacted host sessions. Synthetic transcripts must be visibly
synthetic and never used as release evidence for real authorization or durable storage.

T02 acceptance requires actual gate invocation for direct/every nested path, no write
registration/effect for missing/failing/unsupported/colliding configurations, and blocked
post-approval mutation or demonstrably rejected incompatible configuration. Unresolved
security/runtime feasibility keeps T02 blocked with a retained handoff; no workaround or
simulator can make it done. All relevant T01 checks must stay green. The output is a
verified feasibility ADR/fixture/tests and bounded supported configuration, **not** a
production write policy or full Pi T17 certificate. Agents stop after T02 handoff and
wait for the next assignment.
