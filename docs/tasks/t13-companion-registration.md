# T13 — Build companion-owned Pi registration and label binding

**Status:** retired from current delivery · **Owner:** none · **Requires:** T02, T04, T08
**Size:** 1-2 sessions

## Current disposition

Retired by the user's [config-only write-policy decision](../decisions/routine-creation-config-policy.md).
There is no custom/external permission extension or per-routine approval in
current delivery. Preserve this original task contract as historical planning;
do not implement it or count it passed. T15/T17/T18 no longer depend on this scope.
The Requires/size fields and sections below describe the OLD plan only.

## Historical outcome

Own the portable server's Pi registration safely and collect only transient authorized exercise labels.

## Read first

- [tools.md](../../shared-docs/docs/mcp-contract/tools.md)
- [authentication.md](../../shared-docs/docs/mcp-contract/authentication.md)
- [architecture.md](../architecture.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Implement the T02 verified runtime/configuration contract with gate installed before any owned server can connect. Use fixed configured server/tool identity, executable/profile paths and trusted nonsecret binding metadata.
- Keep production writes off until T14/T15 are integrated; fixtures may exercise proposed launch policy in isolation.
- Use session_start/session_shutdown and idempotent reload cleanup; unregister/withdraw owned registration on shutdown, runtime incompatibility or lost gate/binding.
- Detect static override/server-name collisions and unsupported replacement extensions/configurations before enabling a write process. Generic/headless registration remains read-only.
- Observe authorized search/get exercise results through actual tool_result for this registration/session only; validate envelopes and collect current usable IDs/labels without storing read results persistently.
- Clear label state on profile/generation/session replacement, reconnect when binding changes, and block missing/ambiguous identities with guidance to call get_exercise.

## Acceptance criteria

- No resource starts merely by importing/factory loading in a non-session inspection; no persistent generic write registration is installed.
- RPC with hasUI, print/JSON, static overrides, absent gate and runtime mismatch cannot enable writes.
- Foreign/untrusted labels or stale-session responses cannot populate label cache or approve a create; teardown/reload tests pass.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

C10-C11 registration/binding, C12 session changes; A07-A09 companion isolation.

## Handoff

Document tested registration lifecycle, configured naming/runtime requirements and the label/binding API used by T14.

On completion append: changed paths; exact safe commands and pass/fail results; versions;
remaining blockers/limits; next-agent integration notes. Update the task index. Do not
record credentials, identifying production data or raw private request/response bodies.
