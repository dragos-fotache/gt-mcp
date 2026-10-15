# T02 R2 — remaining SDK refusal routes

**HISTORICAL / T02 PARKED:** user-selected config-only routine creation supersedes
the custom/external permission-extension plan. Shared MCP draft0.2 is aligned;
no further T02 execution/succession or QA artifact relay. Preserve original evidence
and failures; R3 remains an unaccepted candidate. See
[the current decision](../decisions/routine-creation-config-policy.md).
Instructions/windows below are historical, not current execution permission.

**Audience:** coordinator/Developer only. QA receives public spec §13 and an
exact frozen-artifact relay, never this implementation work order.
**Disposition:** R2 ACCEPTED after strict repair and independent verification;
all source/build/QA/metadata windows CLOSED. Historical design below is not renewed
execution permission. Incoming coordinator takes R3 only after READY/TAKEOVER,
with fresh Developer AND QA sessions in the existing panes.
**Authorization history:** TAKEOVER received; coordinator / w4:p2J owned R2.
User-authorized finite succession permits R2 only now; no R3+, PTY/RPC,
sidecar/integrity, production writes, dependencies, staging or commits.
**State:** first artifact readiness FAILED coordinator review before QA relay;
its nonconformant surface observation is preserved in coordinator/Developer-only
[initial review](../evidence/t02-r2-initial-review.md). Same-slice repair window
CLOSED after the two-file repair cleared fresh coordinator source/process/public
review in [repaired readiness](../evidence/t02-r2-coordinator-readiness.md).
Developer edits/build/diagnostics are STOPPED. Exact independent QA window
PASSED and CLOSED; three R2 routes, S1/S2A/R1 regressions and48/48 logic controls
passed. Metadata-only reconciliation completed after closure (six accepted SDK
profiles/no candidates); source/build identities stayed unchanged.
No spec/assertion weakening or scope expansion. 13 slices total,4 accepted,9 remaining.
Developer receives bounded acceptance, never QA records/diagnostics.

## Authority and coordinator API review

Read AGENTS.md, public experiment spec §§1–13 and finite plan R2. Preserve the
accepted S1/S2A/R1 behavior and explicit-null repair. Exact runtime is selected
Node24.21.0/npm11.19.0, Pi/pi-ai1.1.0, SDK1.32.1/Zod4.5.4; no install or lock edit.
Pinned installed extensions/SDK/MCP/codemode/TUI/configuration/settings/package
and security docs, SDK14/13 and permission examples were reviewed. Relevant
exported ExtensionToolContext.executeTool declaration promises native parent IDs,
execution events and isError outcomes for blocked calls. Selected agent-session
implementation corroborates nested runToolCall against callable surfaces.
Native tool_search schema accepts query/limit; its result.details.loaded records
actual matched names; search activates deferred tools for the next model request.
Native MCP waits for discovery on tool_search/codemode calls, not necessarily the
first indirect-profile request. Native codemode uses public ctx.executeTool;
a host gate block rejects the script (unlike a receiver structured error).
These are design facts, not runtime acceptance. API/runtime mismatch stops R2.

## Exclusive allowed changes

Only these production-experiment files may change:

- experiments/t02/driver/run.mjs — authorize/dispatch three R2 routes through the
  existing sdk-gate-worker, route-aware real evidence validation and timeout seam.
- experiments/t02/driver/sdk-gate-worker.mjs — bounded route loadout, surface
  observations and exact native endpoint/parent/result checks.
- experiments/t02/driver/scenarios.mjs — ONLY R2 readonly turns/default tools.
  Do not change shared deferred/codemode/nested PTY helper behavior or registry.
- experiments/t02/companion/index.ts — typed nested-readonly orchestrator read
  then creation; readonly MCP timeout10 seconds. Preserve all gate/canonical/
  approval/sidecar/validation/counter logic and factory registration ordering.
- experiments/t02/metadata.json — truthful implementation/launchable/candidate
  R2 status, never accepted before independent disposition.

Generated experiments/t02/dist follows the permitted build. No QA reads/tests,
fixtures/evidence, S1/S2A worker rewrites, fixture changes, new adapter/module,
config/manifests/lock changes or final ADR. Reuse the existing journal reader's
explicit direct-readonly companion-enabled provenance profile for these same
producer envelopes; do not relax default S2A provenance or add log concatenation.
Request a coordinator decision before editing any extra path.

## Fixed native runtime and loadouts

Reuse the original compiled companion path, companion-FIRST named inline loader,
installed codemode/search/MCP/observer factories, actual getExtensions() prebind
profile/error/warning checks, empty native MCP loadConfig, private launcher-owned
strict synthetic tuple, closed faux ModelRuntime and in-memory SessionManager.
No manual pre-spawn or generic fallback registration. All runs bind mode:print,
no UI injection, no sidecar/listener/approval or receiver binding flags.

| Target | Fixture exposure | defaultTools | Public exclusion | Actual calls |
| --- | --- | --- | --- | --- |
| direct-readonly (regression) | direct | [] | t02_orchestrate | existing direct read, creation |
| deferred-readonly | deferred | [tool_search] | t02_orchestrate | search, direct read, direct creation |
| codemode-readonly | codemode | [codemode] | t02_orchestrate | one codemode outer, nested read, nested creation |
| nested-readonly | direct | [] | none | one t02_orchestrate outer, nested read, nested creation |

Codemode mode:on, models:false for the R2 codemode factory (no model-service
capability is needed). Native autoEnableCodemode:false remains; unrelated tools
must stay inactive. R1 keeps its accepted loadout. Nested may declare seven
fixture tools plus orchestrator; its scripted provider issues only orchestrator.
Do not hide direct fixture tools in a way that makes nested executeTool unavailable.

## Fixed scripted turns and orchestrator

Use the unchanged public seed args and get_exercise input exerciseId from §5.
Each action is awaited/separate; do not put read and creation in parallel.

Deferred readonly turns, separate assistant requests:
1. tool_search({query:'mcp__synth_gt', limit:7}). This query matches all seven
   namespace-qualified names; require actual result.details.loaded exactly seven.
2. mcp__synth_gt__get_exercise({exerciseId:<public seed>}).
3. mcp__synth_gt__create_routine(<public seed create args>).
4. final synthetic done text.

Codemode readonly turns:
1. codemode({code:<fixed script>}), script first awaits
   tools.mcp__synth_gt__get_exercise(<read args>), verifies actual read outcome is
   not isError, then awaits tools.mcp__synth_gt__create_routine(<seed args>).
   Start with // @options: {"timeout_ms":10000,"max_output_tokens":1000}.
   No catch that turns the genuine gate failure into invented receiver success;
   script failure is expected, inner events are decisive. No store/models calls.
2. final synthetic done text.

Nested readonly turns:
1. t02_orchestrate(<seed create args>).
2. final synthetic done text.
For state.scenario === 'nested-readonly' ONLY, typed toolCtx.executeTool first
awaits get_exercise using the first actual validated exerciseId, checks native
outcome.isError, then forwards unchanged creation args through executeTool with
the owned signal. Propagate actual error/content without type-erasing casts.
No hand-authored nested IDs/events or transcript reconstruction. Do not broaden
future unimplemented orchestrator scenarios or promise PTY readiness.

## Observations and driver validation

Native session subscriptions supply tool_execution_start/end for BOTH outer and
inner calls. Extract only safe operationId for actual creation; never full input.
Use actual end.isError and actual structured code/text category; no fake receiver
code for host-denied input. turn_end cannot join inner calls absent from transcript.

Preserve R1 first-request-inventory seven-name assertion and §12 connected record.
R2 first provider request instead records tool_surface:phase:first-request from
actual session active/callable/all exposure APIs. Active tools: deferred only
search; codemode only codemode; nested seven fixture+orchestrator. Callable may
not yet contain indirect fixture tools before discovery; do not assert imaginary
absence/presence or treat that snapshot as connected proof.

At actual native search end (deferred), or inner read execution start after native
MCP wait (codemode), or first request after direct discovery (nested), capture
phase:connected tool_surface from selected session APIs and confirm seven actual
fixture definitions, no hidden fixture tools, no unrelated surfaces. Pair with
fixture's own discovery/startup records and own-file ledger existence, then emit
same-record connected readonly registration. Deferred search_loaded must derive
loadedTools from actual search result.details.loaded with actual search ID.
No worker-crafted constant list may stand in for real inventory/discovery.

Exact endpoint set: deferred search+read+creation (3), codemode outer+inner
read+inner creation (3), nested outer+inner read+inner creation (3).
R1 stays2. IDs unique, every start joins exactly one matching native end.
Deferred parents null. Indirect inner IDs/parents come from runtime: parent is
actual outer ID, outer starts before children and ends after child creation result.
Read succeeds before creation; no read gate. Exactly one creation gate denies
mode-not-tui:print, actual ID/parent, operationId/seed digest/approvedDigest:null.
Enforce creation call < gate < matching inner result and result isError:true/code:null;
unknown-tool/generic receiver refusal is failure. Require gate before declarations,
fixture startup/discovery and all calls. Reject extra/positive/intermediate ledger,
approval, receiver_check, sidecar_verdict, guarded registration and hidden allow.

Both shared and independent final ledgers require exactly-one final0, own explicit
operationId:null/digest:null, empty operations. Producer/pseq/global physical append
order and parent hard caps are unchanged. Await real runtime.dispose and close all
handles; final cleanup remains last, owned group/stdio gone, no sockets/listeners,
roots removed. Never turn unknown effects/cleanup into verified zero/completed:true.

Every slice enforces budgets: set readonly registerMcpServer timeout:10 seconds.
Use parent owned-worker deadline55s with existing <=5s reap bound so a scenario
cannot be reported complete past public60s; preserve prompt50s. No sleeps/polling.
This is narrow enforcement, not R10 calibration acceptance. Stop on owned cleanup
unknown, malformed trace, auth/network/resource surprises, or any failed check.

## Permitted serial verification and milestones

Export selected T01_NODE_HOME/bin PATH for each shell. Run only:

```sh
npm run typecheck
npm run t02:build
npm run lint:t02
npm run format:check:t02
```

Then serial public driver diagnostics, each report disposable:
`node experiments/t02/driver/run.mjs --scenario <name> --harness sdk --out <disposable-report.json>`
Names ONLY deferred-readonly, codemode-readonly, nested-readonly, then
no-companion, generic-readonly, direct-readonly regressions. No QA or whole-suite
commands. Report exact safe commands, exit/results/layers/parent joins/read/gate/
final0/cleanup and SHA256 of changed sources/compiled entry/public artifacts.
Report any blocker asynchronously to coordinator / w4:p2J; no independent scope
expansion or weakened evidence. After artifact-ready, STOP edits/build/target runs.
Coordinator owns subsequent source/process review, one exact QA readiness relay,
independent acceptance and frozen-window closure. No acceptance claimed by Developer.
