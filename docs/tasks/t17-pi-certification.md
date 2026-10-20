# T17 — Verify named Pi interoperability and the server config guard

**Status:** incomplete; S1 accepted/closed, later outcomes held · **Owner:** primary Codex agent · **Requires:** T12, T15 (accepted)
**Size:** five bounded outcomes; S1 complete, four remaining

User assigned T17 on 2026-10-17. [S1](t17-s1-work-order.md) is
[accepted/closed](../evidence/t17-s1-review.md):25/25 in five files (8 actual Pi
SDK print checks +17 unchanged regressions), zero failures/skips;623 stable hashes,
194 identical emitted files and owned cleanup PASS. Native direct/deferred/
codemode paths and MCP2025-11-25 negotiation preserve config-only creation.
[Handoff](../handoffs/t17-s1.md), [Pi notes](../pi.md). Later host lifecycle/
recovery/mode/output and integrated acceptance work remains separately held.
Parent T17 incomplete; local `.pi` untouched, no release or real enablement.

T21-S5 refreshes SDK print fixtures for current config2/single-record/fresh-call
semantics and revises this remaining plan. Its [review](../evidence/t21-s5-review.md)
records current executed evidence separately; historical S1 acceptance is unchanged.
Actual CLI/modes, host lifecycle/session transitions/output and parent T17 remain open.

## Remaining plan

The user requested planning/slicing on2026-10-17. The
[settled remaining plan](../decisions/t17-remaining-slices.md) defines:

1. **S2 — Actual CLI registration and modes:** print/JSON/RPC and one real PTY
   interactive path; native file registration and representative config behavior.
2. **S3 — Lifecycle/concurrency/cancellation:** actual host cancellation/reconnect/
   shutdown, independent invocation identity and effective stop/update/relaunch policy.
3. **S4 — Lost replies/restart/fork:** manual inspection and deliberate fresh calls
   after persisted-session transitions, with no automatic retry/resume or receipt.
4. **S5 — Output/privacy and parent acceptance:** complete canonical output versus
   host display limits, hostile data/diagnostics, scenario reconciliation and clean
   integrated owning/regression acceptance.

S2 is ready/unassigned; S3–S5 held sequentially. Each targets60–90 minutes, with
a90-minute checkpoint and two-hour stop. This docs-only planning update opens no
implementation/test execution window, successor or release grant.

## Outcome

Verify the portable stdio server with named Pi/Node/MCP SDK/protocol versions,
without a custom or external permission extension. This task is ordinary host
interoperability/config-policy verification, not approval/UI certification.
Parked T02 and retired T13/T14 are not prerequisites. Shared draft0.3 and
[the approved config-only decision](../decisions/routine-creation-config-policy.md)
replace the old task's draft0.1 companion requirements.

## Read first

- [Shared acceptance scenarios](../../shared-docs/docs/mcp-contract/acceptance-scenarios.md)
- [Shared tools/config policy](../../shared-docs/docs/mcp-contract/tools.md)
- [Architecture](../architecture.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Use actual named Pi stdio/tool paths against isolated fixture/backend only;
  record immutable package/artifact versions and supported registration/settings.
  No personal/live backend/session or production permission bypass.
- Observe direct/deferred/search-loaded, codemode and nested tool calls reaching
  the real portable server. For every supported creation path, omitted/false config
  yields configuration_required before admission/mutation; explicit true permits
  valid authenticated creation without a confirmation prompt. Invalid config fails
  closed. Reads remain usable independently of creation permission.
- Confirm clientInfo, annotations, tool arguments, content, UI/mode, environment,
  CLI flags and extension presence cannot become an enablement source. Config is
  the sole permission setting across every advertised supported mode.
- Test concurrent calls, cancellation, reconnect/shutdown and documented config
  loading semantics. Once disabling policy is effective, new admission and unsent
  mutations are fenced; already committed effects remain possible. No requirement
  to add a watcher/hot reload or a terminal approval UI.
- Verify no automatic creation after lost reply/session restart/fork. There is no
  operationId/journal/receipt. User inspection and a deliberate fresh call may
  produce another routine; concurrent identical calls are independent. Preserve
  exact HTTP identity only for bounded retries within one invocation. Creation
  errors advertise retryable:false; pending-refresh recovery remains separate.
- Check complete schema-valid structured/text results or explicit result_too_large,
  untrusted text/privacy handling and real protocol negotiation. Use the official
  MCP client separately; one host pass does not certify other hosts.

## Acceptance criteria

- Shared draft0.3 C09–C12 pass for the actual supported Pi configuration with no
  required permission extension. Config disabled means no backend mutation; config
  enabled still enforces normal auth/input/session/HTTP-identity constraints.
- Named host/mode compatibility is claimed only with actual passing evidence;
  unsupported alternatives remain explicit, not silently promoted to passes.
- Setup discloses that any client accessing an enabled local process can request
  routine creation without human confirmation. Process/config/private-state
  restrictions and ordinary account/generation fences are independently reviewed.
- Relevant existing checks remain green; no schema expansion, private fixture
  leakage or silently excluded parked/failing suite counted as a pass.

## Scenario ownership

M01–M02/M10 host boundary; draft0.3 C09–C12 config/fresh-call/host integration and
server-side A07/A09. No old T02 41-profile approval matrix is a release prerequisite.
Historical old successes/failures remain preserved, not rewritten as new-policy proof.

## Handoff

Record exact configuration, artifacts/versions, safe commands, supported paths/modes,
config enabled/disabled observations, recovery/privacy evidence and genuine remaining
limits. No commits, deployment or personal-data operation without separate approval.
