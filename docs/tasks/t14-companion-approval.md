# T14 — Implement complete Pi approval and durable host intent

**Status:** retired from current delivery · **Owner:** none · **Requires:** T03, T09, T13
**Size:** 2-3 sessions

## Current disposition

Retired by the user's [config-only write-policy decision](../decisions/routine-creation-config-policy.md).
There is no custom/external permission extension or per-routine approval in
current delivery. Preserve this original task contract as historical planning;
do not implement it or count it passed. T15/T17/T18 no longer depend on this scope.
The Requires/size fields and sections below describe the OLD plan only.

## Historical outcome

Gate the actual creation call with explicit full-content consent and stable recovery identity.

## Read first

- [tools.md](../../shared-docs/docs/mcp-contract/tools.md)
- [routine-creation.md](../../shared-docs/docs/mcp-contract/routine-creation.md)
- [architecture.md](../architecture.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Validate/normalize creation arguments using shared pure logic; resolve labels only from T13 authorized observations in matching binding.
- Render full name, operationId, exercise UUID/current label, order, every set/repetition/kg weight including null/zero, empty sets and effective rest. Use inert escaped terminal text and scroll/expansion, not executable Markdown/ANSI.
- Queue concurrent approval dialogs safely; explicit Approve/Reject only. Reject/dismiss/cancel/timeout/missing UI/handler failure must block before backend dispatch.
- Persist operationId and exact approved normalized intent outside model responses before allowing dispatch, encrypted/account-bound and outside transcripts. Define minimal retention/cleanup; re-prompt identical recovery rather than relying on a permanent approval cache.
- Apply T02 final-dispatched-intent integrity solution. Detect/block later mutation or reject uncertifiable configurations; never silently rewrite approved arguments or replace operation IDs.
- Bind approval to origin/account/operation/session policy and explicit resume after sign-out. No per-step extra approval, consent argument or blanket allow-all mode.

## Acceptance criteria

- Long/narrow terminal, resize, wide Unicode, hostile labels and control sequences show complete inspectable data with inert rendering.
- Denial/failure/cancel produces zero backend writes across direct/deferred/codemode/nested paths.
- Restart/resume/fork preserves original host intent outside response; changed content/new ID requires fresh approval and post-approval mutation is not dispatched.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

C03/C08-C12 host approval; A09 private host persistence.

## Handoff

Document UI controls, intent store/retention, integrity proof/excluded configurations and tests on actual Pi pipeline.

On completion append: changed paths; exact safe commands and pass/fail results; versions;
remaining blockers/limits; next-agent integration notes. Update the task index. Do not
record credentials, identifying production data or raw private request/response bodies.
