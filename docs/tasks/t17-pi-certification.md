# T17 — Verify named Pi interoperability and the server config guard

**Status:** planned · **Owner:** unassigned · **Requires:** T12, T15
**Size:** 2-3 sessions

## Outcome

Verify the portable stdio server with named Pi/Node/MCP SDK/protocol versions,
without a custom or external permission extension. This task is ordinary host
interoperability/config-policy verification, not approval/UI certification.
Parked T02 and retired T13/T14 are not prerequisites. Shared draft0.2 and
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
- Verify operationId/request retention across lost response and explicit host
  retry/session restart/fork; server journals retain admitted intent/exact bytes.
  Conflicting admitted intent fails operation_id_reused, never creates another
  root. Restart alone never resumes work. No human-approved-preview integrity claim.
- Check complete schema-valid structured/text results or explicit result_too_large,
  untrusted text/privacy handling and real protocol negotiation. Use the official
  MCP client separately; one host pass does not certify other hosts.

## Acceptance criteria

- Shared draft0.2 C09–C12 pass for the actual supported Pi configuration with no
  required permission extension. Config disabled means no backend mutation; config
  enabled still enforces normal auth/input/identity/recovery constraints.
- Named host/mode compatibility is claimed only with actual passing evidence;
  unsupported alternatives remain explicit, not silently promoted to passes.
- Setup discloses that any client accessing an enabled local process can request
  routine creation without human confirmation. Process/config/private-state
  restrictions and ordinary account/generation fences are independently reviewed.
- Relevant existing checks remain green; no schema expansion, private fixture
  leakage or silently excluded parked/failing suite counted as a pass.

## Scenario ownership

M01–M02/M10 host boundary; draft0.2 C09–C12 config/retry/host integration and
server-side A07/A09. No old T02 41-profile approval matrix is a release prerequisite.
Historical old successes/failures remain preserved, not rewritten as new-policy proof.

## Handoff

Record exact configuration, artifacts/versions, safe commands, supported paths/modes,
config enabled/disabled observations, recovery/privacy evidence and genuine remaining
limits. No commits, deployment or personal-data operation without separate approval.
