# T15 — Portable creation integration: design and bounded development plan

**Original planning disposition (2026-10-15):** planning complete under the user's request to
“design and plan T15 development” and split it if warranted. Primary Codex agent
owns planning; implementation is unassigned. This document authorizes no source
edits, tests, build/install, fixture execution, product writes or successor task.

The user subsequently assigned [S1](../tasks/t15-s1-work-order.md), now
[accepted/closed](../evidence/t15-s1-review.md). The guarded runtime and private
admission-context repair are delivered; [handoff](../handoffs/t15-s1.md). Parent
T15 remains incomplete. The user assigned S2 on 2026-10-15; it is now
[accepted/closed](../evidence/t15-s2-review.md), with
[handoff](../handoffs/t15-s2.md). The user assigned S3 on 2026-10-16;
[S3 and parent T15 are accepted/closed](../evidence/t15-s3-review.md),
with [final handoff](../handoffs/t15-s3.md). All T15 grants closed. The original planning
grant above remains historical; no automatic successor.

## Task contract and readiness

Deliver the existing recoverable creation service through the portable seven-tool
stdio server. Only the operator's strict config-file `writesEnabled:true` permits
valid authenticated explicit creation. Keep the six reads, schemas, annotations,
operation identity, encrypted recovery and trusted lifecycle intact.

Authority, in order: shared MCP draft0.2
[tools/errors](../../shared-docs/docs/mcp-contract/tools.md),
[creation](../../shared-docs/docs/mcp-contract/routine-creation.md),
[authentication](../../shared-docs/docs/mcp-contract/authentication.md) and
[scenarios](../../shared-docs/docs/mcp-contract/acceptance-scenarios.md); backend v1
[request identity](../../shared-docs/docs/backend-contract/service-protocol.md),
[domain rules](../../shared-docs/docs/backend-contract/domain-rules.md) and
[OpenAPI](../../shared-docs/docs/backend-contract/openapi.yaml); accepted foundation
[spec](t01-approved-foundation-spec.md)/[ADR](t01-implementation-adr.md), then local
architecture, verification and task files. Preserve shared baseline 9a96dcb and the
approved uncommitted MCP revision; no contract changes are proposed.

Prerequisites checked by document/source inspection, not fresh execution:

- [T08 accepted](../handoffs/t08-s3.md): strict protected startup snapshot, one
  T04 owner/T06 session, official SDK catalogue, results, cancellation and compiled
  stdio process. The creation handler is still a fixed unavailable response.
- [T11 accepted](../handoffs/t11-s3.md): `createCreationService({repository,session})`
  uses awaited T09 admission, explicit exact-byte recovery, durable terminals,
  definitive compaction and fresh live authorization before historical delivery.
  Inspection found one T15 integration gap: T09 checks cancellation after durable
  admission but before the service's first snapshot, so that failure can currently
  escape without recovery fields. S1 must repair this boundary and preserve prior
  acceptance as historical evidence, not claim the gap was already verified.
- [T12 accepted](../handoffs/t12-s4.md): trusted sign-out, retirement, removal and
  account cleanup. It is a lifecycle integration dependency for verification,
  although T15's declared engine prerequisites remain T08/T11. These commands
  acquire exclusive profile ownership; they do not remotely reconfigure a server.

Non-goals: new engine/storage formats, backend endpoints/CAS/rollback/delete,
automatic startup continuation, hot reload, permission extensions/prompts,
additional MCP tools, remote transports, account switching, package/dependency
changes, generalized test infrastructure, real backend/DB/Android (T16), named Pi
(T17), packaging (T18), Google/browser (T19) or independent release review (T20).
Preserve parked T02, retired T13/T14, T06 omissions, T04 restore/erasure limits and
all previous evidence. Three slices are warranted because runtime ownership,
creation-specific protocol delivery and real process acceptance have distinct
failure modes and reviewable outcomes.

## Settled interfaces and composition

Add a creation-capable entry alongside accepted read-only library factories;
do not turn a read-only factory into implicit mutation authority. Proposed public
TypeScript additions, implemented and recorded in the S1/S2 work orders:

```ts
// src/runtime/index.ts; reuse existing options/envelope and SavedReceipt types.
interface ToolRuntime extends ReadRuntime {
  createRoutine(args: unknown, signal: AbortSignal): Promise<ReadEnvelope<SavedReceipt>>;
}
function openToolRuntime(options: ReadRuntimeOptions): Promise<ToolRuntime>;

// src/protocol/index.ts; reuse the existing connect/close server capability.
interface ToolServerOptions {
  readonly runtime: ToolRuntime;
  readonly maxToolResultBytes?: number;
}
function createToolServer(options: ToolServerOptions): ReadToolServer;
function openConfiguredToolServer(options: ConfiguredReadToolServerOptions): Promise<ReadToolServer>;
```

These use the existing sanitized runtime/server error classes and strict option
rules; no error taxonomy or rename campaign. `openReadRuntime`,
`createReadToolServer` and `openConfiguredReadToolServer` retain their read-only
behavior and unavailable creation response. Share private opening/dispatch code
where useful; do not duplicate the storage/session lifecycle. Factory imports and
low-level construction remain inert. The low-level runtime is a trusted library
capability, never model input or a permission configuration channel.

The executable keeps `gymtracka-mcp-server [--config <absolute path>]`, existing
exit codes/framing and `main(args)`, and switches to `openConfiguredToolServer` in
S2. There is no `--writes-enabled`, environment enablement, initialize option,
consent argument, permission setter, credential getter or generic command API.

The configured runtime loads and validates config/descriptor once, opens one T04
profile owner and one bound T06 session, and captures the same binding throughout.
Retain the detached validated version-1 config record privately for T09; do not
reread the file or reconstruct policy from client metadata. For enabled nonnull
account composition, construct one `openOperationRepository({owner,config,reads:session})`
and one creation service over that repository/session. Constructors send nothing
and do not resume unfinished work. The configured tool/server opener locally reads
and validates retained operation evidence at startup with the existing T09 decoder,
including version, binding, identity and step-key structure, regardless of write
policy. A never-bound null-account profile must have empty operation bytes.
Validation performs no network request, admission, migration or write. The separate
read-only opener retains its no-operation-read behavior. Do not open a second
profile, expose the owner or replace live T06 reads with snapshots.
Missing/disabled/null-account states need no repository or service. Partial startup failure releases everything
already acquired; cleanup failure remains a sanitized startup failure.

### Permission, validation and loading semantics

Use the accepted protected config schema, strict boolean/default false and
protocol budgets without adding configuration keys. Invalid selected config is
fatal startup `configuration_required` (existing process exit 78), never a fallback
to enabled or missing configuration. Missing selection/file still serves the
seven-tool catalogue with unavailable calls.

For a well-formed tool request: validate complete T03 arguments first, then apply
the existing cancellation/close fence, then config policy, then authentication
and admission. Invalid arguments return `invalid_arguments`; valid disabled or
unconfigured create returns `configuration_required` with a fixed safe disabled
explanation before operation lookup/admission, UUID allocation or backend traffic.
Enabled null-account create returns `authentication_required`. Enabled calls use
real T09 live authorization, reference checks, identity and capacity gates before
mutation. False config blocks even historical receipt retrieval through create.
Malformed JSON-RPC/unknown tools retain protocol-error behavior.

Config and descriptor remain immutable startup snapshots. Editing a running
process's file is **not effective disablement**. Document the deterministic
operator sequence: gracefully stop the old process and await owned cleanup,
update configuration or perform trusted lifecycle work, then relaunch. Do not
overlap owners or claim immediate file-change revocation. Stop synchronously
fences new admission, closes the repository and aborts owned calls; no remaining
unsent mutations may start. Await tracked work/begun durability operations, then
invalidate the session and release the owner. The new false-policy process keeps
reads usable but cannot admit/resume creation. Committed work may remain.

Recheck current owner/origin/account/session/profile generation and the owned
signal at existing admission/dispatch/delivery boundaries. Reuse repository
closure and live T06 checks to fence the captured true snapshot; no new dynamic
policy API is needed. Trusted sign-out/login/removal happens after server release;
a concurrent CLI attempt must fail ownership rather than report a false logout.
Fresh same-account login can permit later explicit recovery under its new session
binding; old in-flight capabilities cannot continue or deliver private history.

### Creation results, errors and cancellation

Map T11 `terminal(result)` to its original canonical envelope and `stopped(error)`
to `{ok:false,error}`. Route through T03 and official SDK validation. Preserve
stable saved receipts, terminal rejections, error retryability/backend code and
whole Retry-After. No outer retry loop: accepted T06 resource legs allow one wire
attempt plus one eligible 401 refresh/retry; further transient recovery requires
another identical explicit call. Restart alone sends nothing.

The read-only result filter accepts neither creation codes nor recovery fields;
the adapter also currently replaces late results with a context-free interruption.
Do not reuse those paths unchanged. Add a narrow creation mapper/validator using
the shared error table, requiring all four recovery fields after journal
admission: `operationId`, `routineId`, `lastConfirmedStep`, `outcomeUnknown`.
Pre-admission failures need no invented routineId. Error text is fixed/sanitized;
never serialize native exceptions, abort reasons, tokens or request/response bodies.

On cancellation or graceful stop, suppress late success and stop unsent work.
When a response can still be delivered under the same authorized binding, return
`operation_interrupted` with the latest acknowledged history and truthful
uncertainty; a confirmed save is not rewritten as uncommitted. If the SDK has
already suppressed delivery, durable evidence remains for explicit recovery.
Changed/invalid binding never receives captured private IDs/history. Do not open
another owner or perform an unauthorized recovery read merely to decorate an error.
Keep context through runtime/adapter awaits so generic final guards do not erase
authorized history. Specifically, T09 must retain sanitized context as soon as
admission is durably acknowledged, before its following cancellation check or
service callback. Propagate that context on a failed admission-to-callback handoff
to T11, which converts it to `stopped(error)` only while the original current
binding remains authorized. Keep latest acknowledged context across subsequent
commits; do not derive it from caller arguments or query after invalidation. An
admitted but never-dispatched operation reports `none`/false; local storage
ambiguity alone does not establish that a backend mutation was sent. Choose the
internal error/context representation in S1's work order; it is no new permission
input, callback escape hatch or model-facing interface. Preserve existing error
codes and sanitized diagnostics. Add a focused durable-admission/cancellation
regression, rather than a new fault framework.

Keep the existing complete-result UTF-8 measurement, default 4 MiB and 4096..67108864
range. Creation size/serialization fallbacks must also retain authorized admitted
history: `result_too_large` or safe `internal_error`, matching text and `isError:true`.
Never truncate a success or silently drop required recovery fields to fit. Minimal
fixed creation errors fit the 4096-byte minimum; private/unvalidated fields cannot
be recovered from a malformed result. Receipt persistence is never undone by
protocol delivery failure. Catalogue schemas/hints remain byte-equivalent except
for an actual separately resolved contract defect; no schema expansion is planned.

## Sequential slices and acceptance

Each slice targets 60–90 minutes, checkpoints at 90 and stops by 120 with a truthful
partial/blocked handoff. These are work-window bounds, not completion promises.
One slice per implementation context; authorize each successor separately.

### S1 — Guarded creation-capable runtime

**Prerequisite:** accepted T08/T11; T12 lifecycle evidence available.
**State:** accepted/closed; see [S1 review](../evidence/t15-s1-review.md).

Implement `ToolRuntime`/`openToolRuntime`, shared private startup ownership,
real repository/service composition, policy/auth gates, typed envelope conversion,
owned cancellation and close ordering, including the identified T09-to-T11
admission-context repair. Preserve existing read-only factories.
The executable continues using the old unavailable handler until S2.

Acceptance: smallest useful strict policy/precedence unit table plus actual
isolated Secret Service/ext4/private-CA HTTPS runtime calls. Cover enabled saved
receipt and identical repeat, disabled zero traffic/no admission, enabled missing
auth, representative invalid input/invisible reference, cancellation immediately
after acknowledged admission, uncertainty preserving all recovery fields, and
close during a held mutation with no dependent send and
successful owner reacquisition. Confirm inert startup/no automatic replay and
six-read behavior. Reuse T09/T10/T11 checks for engine internals rather than
rebuilding their crash matrix. Run complete active S1 owning checks plus relevant
unchanged runtime/service regressions; record exact selection before execution.

Deliver source/types, focused tests, spec/source/test review, sanitized evidence
and handoff. S1 acceptance delivers a trusted library boundary, not MCP creation,
parent acceptance or release.

### S2 — Official MCP creation dispatch and safe delivery

**Prerequisite:** accepted S1. **State:** accepted/closed; see
[S2 review](../evidence/t15-s2-review.md).

Add the two protocol factories above and a captured create method, preserve
read-only adapter behavior, route the compiled entry to the configured tool
server, and implement creation-specific validation/budget/late-cancellation paths.
Update launch/config documentation with startup-only loading and operator trust.
Remove the obsolete build-unavailable sentence from the trusted setup/login
disclosure in `src/cli/main.ts`, retaining every privacy, default-false and
connected-client trust requirement. Update its focused T12 disclosure expectation
to the delivered behavior; do not alter CLI grammar or lifecycle algorithms.

Acceptance: official SDK client on in-memory transport for the new public adapter,
exact seven-tool catalogue/input/output schemas/hints, enabled success, post-admission
uncertainty, permanent conflict/rejection and interrupted history. Validate each
canonical structured/text result and `isError`; demonstrate complete size failure
with retained history at a focused result boundary. Check protocol vs execution
errors and that clientInfo, `_meta`/annotations or extra tool arguments cannot
enable false policy. Run one compiled stdio enabled happy call plus disabled call
to prove entry wiring before S3. Shared service semantics remain T11-owned.

Explicitly adapt obsolete “this build never creates even when true” expectations
only where tests launch the changed production entry. Prefer selecting false
config in existing read/lifecycle fixtures, retain their original ownership/read
assertions, and update the fixed disabled explanation. Known locations:
`test/stdio-server/configured-integration.test.mjs` and
`test/fault/t12/s4-flow.test.mjs`; review exact affected assertions at pickup.
`test/read-protocol/configured-policy.test.mjs` still exercises the retained
read-only factory and need not change its old unavailable guarantee. Adapt the
exact export list in `test/read-protocol/config-import.test.mjs` for the two new
factory exports while retaining inert-import/handler/resource assertions. Never skip
old files or count historical bytes as acceptance of changed behavior.

Deliver protocol/source/test changes, operator launch notes, focused complete
S1/S2 owning checks, relevant unchanged protocol/stdio/lifecycle regressions and
handoff. Creation is wired but parent T15 remains incomplete pending S3.

### S3 — Process recovery, lifecycle fences and parent acceptance

**Prerequisite:** accepted S2. **State:** accepted/closed with parent T15; see
[S3 review](../evidence/t15-s3-review.md).

Complete the small boundary matrix against the actual compiled process with the
official SDK client and actual isolated storage/T06/T05 HTTPS composition:

| Risk | Required integration evidence |
| --- | --- |
| Permission source | Omitted/false, enabled and invalid null/number/string file values; no-config launch; false policy with apparent client/env/CLI enablement attempts. Invalid startup is a failure, not a tool success. Disabled has no new journal/root or mutation; configured reads remain usable. |
| Identity/delivery | Saved receipt and original IDs on identical repeat; changed admitted intent rejects; distinct explicit ID creates a distinct root; terminal rejection replays under fresh live auth. |
| Explicit recovery | One held/lost or malformed mutation reply stops uncertain, then actual process reopen plus identical call replays exact method/route/UTF-8 bytes/key and skips confirmed work. Reopen/initialize alone sends no resource work. |
| Lost final MCP reply | Save/receipt persisted before reply loss, process reopened and explicit repeat returns the original receipt without further mutations. |
| Cancellation/disable | Pre-admission cancellation and representative admitted/dispatch cancellation; graceful EOF/SIGTERM fences unsent work, settles owned persistence and releases ownership. Stop/update false/relaunch denies continuation while preserving evidence. Reuse T08 framing/backpressure regressions. |
| Auth/lifecycle privacy | Enabled auth denial reveals no stored receipt; old-session/private history cannot cross generation changes. Server ownership blocks competing trusted CLI; after graceful release, sign-out and same-account login preserve explicit recovery, while retirement/removal prohibit it. Reuse T12 assertions and one representative operator journey. |

Observe requests and persisted synthetic operation evidence independently of MCP
success text. Use an existing bounded held responder/child fixture to lose a
reply; no production fault switches or generalized proxy. Reuse the T11 per-step
crash proof by reference, adding only the process/MCP boundary cases above. Check
stdout contains protocol only and stderr only fixed diagnostics, including
cancellation/fatal startup paths; do not copy raw bodies into evidence.

Final acceptance: complete active T15 owning suite (all S1–S3), full existing T08
runtime/protocol/stdio and T11 owning suites, relevant T09 admission/T10 execution
and T12 lifecycle regressions plus catalogue/schema/foundation checks affected by
exports or docs. Record exact files and reasons at pickup; add other regressions
only for a changed boundary or observed defect. Run production checks, clean
locked source-snapshot reproduction and identical emitted/stable-input evidence.
No build/install races tests. Only integrated S3 acceptance closes parent T15.

Deliver requirement-to-evidence map, exact commands/results/versions, failures
and repairs, artifact inventory, clean replay, changed-path list, reviewed launch
guide and task/index/verification handoff. Review is primary-agent review, not
independent T20 certification. T16–T20 remain separately assigned gates.

## Scope, environment, commands and stopping conditions

The original planning assignment edited only this plan, T15 task and current planning/index/roadmap/
verification status documents. Production/test sources and shared contracts are
unchanged; no behavioral checks were executed to substantiate this design.

Future separately authorized scopes: S1 `src/runtime/` plus focused
`test/unit/t15/`/`test/fault/t15/` and minimal `src/operations/`/`src/creation/`
changes for the specified admission-context handoff, with focused T09/T11
regression additions if the existing fixtures are the cheapest reliable layer;
S2 `src/protocol/`, minimal runtime integration,
the single obsolete disclosure sentence in `src/cli/main.ts`,
`test/create-protocol/`, the named existing integration/export expectations and
`test/unit/t12/s4-disclosures.test.mjs`; S3
`test/create-stdio/`, narrowly shared fixture extensions and necessary focused
integration repairs. All slices may update their work/evidence/handoff documents;
S2/S3 may update `docs/stdio-server.md`/`docs/login.md` and current product status.
Reuse existing T10 provider/HTTPS, T11 recovery, T12 lifecycle and T08 SDK helpers.
Further changes in accepted auth/operations/creation/storage are limited to a
demonstrated integration defect, with its scope/contract impact recorded before dependent edits;
new public behavior or contract conflicts require user resolution.

Before each source window, record the slice work order and exact permitted
execution/fixture scope. Use provisioned disposable `T01_NODE_HOME`, verify
Node 24.21.0/npm 11.19.0, then early type/lint/format/import checks. Expected commands
after assignment: `npm run typecheck`, `npm run lint:production`,
`npm run format:check:production`, `npm run build`; scoped ESLint/Prettier and
`node --check` for authored helpers; `npm exec -- vitest run <exact active files>`
inside the existing verified isolated runner. Final clean snapshot uses
`npm ci --ignore-scripts` before build/replay. These are planned commands, not
passes or a present execution grant. Preserve the standing
[proportional testing policy](proportional-testing-policy.md).

Reverify disposable provider/TLS/ext4/runner provenance before execution; if absent,
report the specific fixture blocker rather than use the ambient bus or live
backend. No real tokens/accounts/private paths/raw bodies in repo or evidence.
Never repurpose HOME, modify system Node/Pi/.pi, change manifests/lockfiles/compiler
rules/dependencies, stage/commit, deploy or enable a real backend. Write-enabled
execution is only in explicitly isolated synthetic fixtures.

Stop/escalate a contradictory normative requirement, missing public decision,
unsafe/ambiguous ownership or durability, unavailable isolated environment, scope
expansion/generalized harness need, or the two-hour limit. Preserve partial state
and exact remaining acceptance; do not waive gates to finish a slice. No unresolved
public contract question was found in this planning review. S1 is now accepted;
S2 is also accepted; subsequently assigned S3 and parent T15 are now accepted/closed.
This plan never authorizes an automatic successor.

## T18-S3 startup-validation correction

On 2026-10-16, installed incompatibility verification exposed that the original
“do not resume/read unfinished work” wording prevented local startup validation
required by shared routine-creation.md. The user explicitly resolved the conflict
in favor of local journal validation at startup and authorized the narrow repair
within T18-S3. The construction contract above now distinguishes validation from
continuation; the original T15 acceptance remains historical evidence. No shared
contract, public tool/config/schema, storage format or retry behavior changes.
See the [S3 work order](../tasks/t18-s3-work-order.md).
