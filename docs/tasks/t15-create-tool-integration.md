# T15 — Integrate creation into the portable seven-tool server

**Status:** planned · **Owner:** unassigned · **Requires:** T08, T11
**Size:** 1-2 sessions

## Outcome

Connect the tested creation engine to portable MCP behind the sole operator
config-file writesEnabled guard, default false. No custom/external permission
extension or per-routine approval. Shared draft0.2 and
[the approved decision](../decisions/routine-creation-config-policy.md) govern;
parked T02/retired T13/T14 are not prerequisites.

## Read first

- [tools.md](../../shared-docs/docs/mcp-contract/tools.md)
- [routine-creation.md](../../shared-docs/docs/mcp-contract/routine-creation.md)
- [architecture.md](../architecture.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Replace unavailable creation handler with T11 service behind strict config-file writesEnabled:true and normal origin/account/generation fences; never enable from initialize clientInfo/annotations.
- Keep schema/result/annotation catalogue exactly seven tools; no Pi-specific wire arguments, extra endpoints or hidden arbitrary command surfaces.
- Ensure invalid arguments/missing policy/config/auth precede mutation admission; creation failures after admission include all required recovery fields.
- Wire cancellation/shutdown signals through protocol/auth/engine without rollback claims; automatic retries remain bounded inside explicit calls only.
- Test ordinary isolated stdio launches with writesEnabled omitted/false/true/invalid. Disabled/missing policy returns configuration_required before admission/dispatch; enabled valid authenticated calls create without a prompt. Permission does not depend on host/mode/UI/extension; args/annotations/clientInfo/environment/CLI cannot enable it. Effective disabling fences new admission/unsent steps; no rollback claim or automatic hot-reload requirement.
- Validate final structured/text errors and stable receipts, output budgets and no stdout leakage using the official MCP client.

## Acceptance criteria

- Config-enabled, authenticated isolated happy/retry calls return one saved receipt and original IDs; disabled create never mutates.
- All advertised output schemas accept both success and execution failures, including uncertain and terminal creation cases.
- Restart alone sends no unfinished steps; session fence prevents delivery/continuation under stale binding.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

M01-M03; C01-C09 integrated behavior; R05/R06; T16/T17 supply real interoperability.

## Handoff

Document launch policy/interface, protocol integration commands and exact remaining production verification gates.

On completion append: changed paths; exact safe commands and pass/fail results; versions;
remaining blockers/limits; next-agent integration notes. Update the task index. Do not
record credentials, identifying production data or raw private request/response bodies.
