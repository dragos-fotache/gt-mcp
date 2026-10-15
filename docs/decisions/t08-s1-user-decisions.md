# T08-S1 — User decisions

## Authority and scope

The user initially requested explicit questions; the following choices were
selected through the structured questionnaire. The user subsequently delegated
remaining decisions to the Coordinator for this design work. Existing selections
remain fixed; the [settled S1 specification](t08-s1-runtime-spec.md) supplies the
remaining technical decisions. This is a decision record, not a source/test/
execution grant or an acceptance claim.
Those design-time holds are historical: the subsequent
[accepted work-order record](../tasks/t08-s1-work-order.md) now governs delivered
behavior; all source/runtime/install/provider/suite windows are closed.

## Settled operator-facing choices

1. **Configuration selection:** one explicit `--config` path supplied by the MCP
   host launch command. No environment selector, automatic search or fallback.
   Credentials and write-enable flags are not accepted through arguments.
2. **Configuration changes:** startup snapshot; changes take effect only after
   stopping/restarting the server. No reload control or file watcher.
3. **Profile binding:** a separate private, machine-managed descriptor holds the
   trusted account/generation binding, not the operator configuration. Future
   trusted setup/login/logout must update it safely. Stale metadata fails closed;
   no account guessing, profile reset or automatic adoption.
4. **Malformed/unsafe configuration:** safe stderr and process exit before private
   storage opening or backend contact. Missing/unselected configuration remains a
   supported unavailable runtime producing `configuration_required` tool responses.
5. **Descriptor selection:** the configuration file explicitly names the private
   binding descriptor path; no extra launch argument or automatic discovery.
6. **Storage/session opening failures:** stop startup with safe stderr, preserving
   state untouched. No blocked-but-running fallback, lock bypass, automatic repair
   or repeated opening. The operator resolves the issue and restarts.
7. **MCP result budget:** defer its default and exact serialization/framing
   measurement rules to the S2 work order, before protocol source work. S1 retains
   accepted T05 HTTP/projected-data limits; it does not add an MCP budget now.

8. **Versioned file shapes:** strict config/descriptor version 1; accepted optional
   T05 transport budget overrides; no credentials, development overrides or MCP
   result budget in S1 configuration. Exact field shapes are recorded below.
9. **Paths:** absolute paths only; reject symlinks and unsafe ownership/permissions.
   No current-working-directory or config-relative interpretation.
10. **Runtime API:** six named read operations plus `close()`, returning shared
    success/error envelopes rather than SDK text/framing. Strict matching-tool
    argument validation; no binding, grants, mutation or auth-control capability
    exposed to the protocol layer.
11. **Descriptor update scope:** S1 is read-only. An absent/stale descriptor fails
    startup safely; trusted crash-safe updates belong to T07/T12. S1 does not claim
    user bootstrap or supply a binding discovery/repair mechanism.
12. **Invocation errors:** conservative shared-envelope mapping below; no native,
    backend or private-state messages copied into results.
13. **Shutdown:** fence new reads, abort network work, await started durable refresh
    work, then invalidate and close the owner. Close is idempotent; cleanup failures
    are reported safely, not misreported as successful release. No new graceful-close
    deadline or forced persistence termination.

The separate descriptor is an additive trusted composition artifact, not a change
of T04/T06 authority or persistence formats. Its selected location/schema and
Coordinator-set access rules are in the S1 specification. The crash-safe writer
handoff remains explicitly deferred to T07/T12; creating another file alone does
not solve atomicity across storage and metadata.

## Selected file schemas

```text
config = {
  version: 1,
  serviceOrigin: <fixed HTTPS origin>,
  storage: {
    profileRoot: <absolute private directory>,
    anchorRoot: <absolute separate private directory>,
    secretServiceBusAddress: <explicit local Unix bus>,
    timeoutMs?: <accepted T04 default/range>
  },
  bindingDescriptorPath: <absolute private file>,
  writesEnabled?: <strict boolean, default false>,
  transportBudgets?: <accepted T05 fields/defaults/ranges>
}

descriptor = {
  version: 1,
  binding: {
    origin: <must match configured origin>,
    accountUuid: <service-confirmed canonical UUID or null>,
    sessionGeneration: <nonnegative safe integer>,
    profileGenerationId: <trusted canonical profile UUID>
  }
}
```

All listed nonoptional fields are required. Reject unknown fields at every object
level, duplicate JSON keys and invalid values; no coercion or inferred binding.
T08 reads, never updates the descriptor. Null account is a supported signed-out
binding, not authority to provision or install a grant.

## Selected runtime shape

```ts
interface ReadRuntime {
  searchExercises(args: unknown, signal: AbortSignal): Promise<ReadEnvelope>;
  getExercise(args: unknown, signal: AbortSignal): Promise<ReadEnvelope>;
  listWorkouts(args: unknown, signal: AbortSignal): Promise<ReadEnvelope>;
  getWorkout(args: unknown, signal: AbortSignal): Promise<ReadEnvelope>;
  listRoutines(args: unknown, signal: AbortSignal): Promise<ReadEnvelope>;
  getRoutine(args: unknown, signal: AbortSignal): Promise<ReadEnvelope>;
  close(): Promise<void>;
}
```

ReadEnvelope is the shared success/error envelope, with operation-appropriate
canonical data; concrete declarations may specialize each method's data type.
No SDK `content`, text serialization or `isError` is produced in S1.

## Selected invocation error mapping

| Failure | Shared application code / handling |
| --- | --- |
| Argument validation | `invalid_arguments` |
| No selected/missing configuration | `configuration_required` |
| No grant | `authentication_required` |
| Auth recovery refused | `reauthentication_required` |
| Cancellation/closed runtime | `operation_interrupted` |
| Recognized T05 failure | Preserve safe code and retry metadata |
| Storage failure or corrupt/unsupported session state | `recovery_unavailable`; fence runtime; require restart/trusted local repair |
| Unexpected fault | `internal_error` |

Use shared retryable values and fixed safe guidance. Do not copy stack traces,
native/backend messages, private state or creation metadata. Startup opening
failures remain fatal as selected above; this table applies to read invocations.

## Coordinator finalization and remaining gates

The [settled S1 specification](t08-s1-runtime-spec.md) defines exact factory/error
exports, typed read envelopes, file access/bounds, startup precedence, recovery
fencing and close/cancellation. The [activated work order](../tasks/t08-s1-work-order.md)
records current bounded source grants, proportional acceptance and runtime holds.

The writer/update crash-recovery contract is deferred to T07/T12; missing/stale
metadata never triggers automatic repair in S1. The user deferred MCP output sizing
to S2; the [S2 design](t08-s2-protocol-spec.md) now settles it, including one optional
protocol field in version1 config. That integration belongs to S2, not S1. Fixture environment availability
and named frozen execution relay still require confirmation before runtime checks.

[General design and slices](t08-general-design-and-slices.md) remains the parent
sequence. Design finalization is not implementation or acceptance; only the subsequent
activated work order opens bounded source work. Runtime execution remains CLOSED.
