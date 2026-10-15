# T08 — General design and outcome-based slices

## Current disposition

User subsequently authorized S1, now [ACCEPTED c3/f2](../evidence/t08-s1-coordinator-review.md):
101/101 owning/relevant regressions with frozen137-input identity and real isolated
provider/HTTPS/cleanup. [S1 handoff](../handoffs/t08-s1.md); all role windows CLOSED.
S2 now [ACCEPTED c2/SDKf2+configuredf3](../evidence/t08-s2-coordinator-review.md):
112/112 owning/relevant passes, stable217inputs, four final pinned checks,
126identical outputs and real isolated provider/HTTPS/cleanup.
[Current S2 handoff](../handoffs/t08-s2.md). ALL windows CLOSED;
S3 dependency-ready but UNASSIGNED/HELD; parent T08 incomplete. The original design-
only disposition below is historical; this proposal supplies no new grant.

## Authority and bounded planning outcome

The user selected T08 and requested a general design and slices. This is the
Coordinator's proposed design/sequence, not an approved implementation work order
or an acceptance claim. The planning question is: how should existing schema,
transport, protected-owner and session capabilities become a portable read MCP
server without mixing in browser login or creation? The stopping point is this
short design, slice boundaries and explicit decisions for the first assignment.
Developer/QA remain HELD; all source/build/install/runtime windows remain CLOSED.
Subsequent [user decisions](t08-s1-user-decisions.md) supersede this proposal where
specified. User then delegated remaining design decisions to the Coordinator.
The [settled S1 specification](t08-s1-runtime-spec.md) and
[work-order draft](../tasks/t08-s1-work-order.md) finalize S1 design without opening grants.
S2 now also has a [settled protocol specification](t08-s2-protocol-spec.md) and
[accepted work-order record](../tasks/t08-s2-work-order.md). S3 now has its
[settled stdio specification](t08-s3-stdio-spec.md) and
[held work-order draft](../tasks/t08-s3-work-order.md). The original design-only
statements record planning history; S1/S2 acceptance above is current authority.

Normative references: shared MCP draft0.2 [tools](../../shared-docs/docs/mcp-contract/tools.md),
[authentication](../../shared-docs/docs/mcp-contract/authentication.md) and
[acceptance scenarios](../../shared-docs/docs/mcp-contract/acceptance-scenarios.md);
unchanged backend v1 [service protocol](../../shared-docs/docs/backend-contract/service-protocol.md)
and OpenAPI; accepted T03/T04/T05 and T06-S1–S5 public specifications.
The [T06 pickup](../handoffs/t06-complete-coordinator-pickup.md) records accepted
capabilities and user-waived checks. Those omissions remain visible, not reopened
or declared passed by this plan. Apply standing [proportional testing](proportional-testing-policy.md)
and [context-safe slicing](../agent-coordination.md#standing-bounded-work-and-context-safe-slicing-policy).

## Outcome and non-goals

Deliver six authenticated read tools over standard local stdio, with exactly
seven advertised tools. `create_routine` is a schema-correct unavailable placeholder
returning `configuration_required`; even `writesEnabled:true` cannot activate
unfinished creation. Invalid creation arguments still fail local validation.
No admission, journal allocation, exercise precheck for creation or resource mutation
is reachable from this placeholder. T15 owns later guarded creation integration.

No browser/login/logout command, token-paste bootstrap, remote MCP listener,
companion/permission extension, persistent read cache, automatic pagination,
background recovery worker, account adoption or new backend API. T07 owns operator
login; T09–T11 own journals/creation; T12 owns trusted cleanup; T17 owns named Pi
certification; T18 owns final distribution/operations; T16/T19 own genuine external
backend/browser evidence. T08 must nevertheless deliver an executable stdio entry,
not leave production wiring to packaging.

## General design

```text
trusted config file (startup snapshot; no credentials)
  -> runtime composition: one existing protected profile owner + T06 lifecycle facade
  -> six-method read capability
  -> strict T03 arguments / canonical results / safe error envelopes
  -> official SDK tools/list + tools/call
  -> SDK stdio transport / local MCP client
```

1. **Trusted configuration and ownership.** User selected explicit `--config`
   with no environment selector, ambient profile search or credential fallback.
   Read and validate configuration once at startup; changes take effect on restart,
   with no watcher. Unknown/invalid fields fail closed; `writesEnabled` is a strict
   boolean defaulting false, supplied only by the file. Configuration supplies the
   fixed HTTPS origin, protected storage locations/access and transport budgets.
   MCP output budget is deferred to S2 by user choice. A separate private descriptor
   supplies expected binding, not account/generation fields in operator config.
   Reuse T04 `openProfile`: never provision,
   repair/reset stores, infer account identity or silently update a stale binding.
   One process owns the profile until shutdown; a competing owner fails safely.
   Null-account and empty-grant states return safe authentication guidance.

2. **Session/read composition.** Use T06 `openLifecycleSessionState` for bound
   owners, including supported v3 state; older standalone factories cannot read all
   current lifecycle records. Narrow its nine resource methods to the six reads;
   do not hand protocol code grants, auth controls or mutation capabilities. T06
   retains refresh serialization, exact recovery and pre-send/pre-delivery fences.
   Network reads may overlap while refresh remains serialized. No added retry loop,
   interactive login or alternate session authority in the protocol layer.
   Opening/config loading never settles pending refresh or sends network requests.

3. **Tool semantics.** Reuse T03 `parseArguments`, `toolSchemas` and
   `makeToolResult`, and T05/T06 canonical decoded results. Forward effective filters
   and limit (default 20), preserving opaque continuations. Do not invent Unicode
   normalization or token parsing in the adapter. Return complete authorized records,
   ordering, nullable values, labels and exact decimal-string Int64 revisions.
   Backend ownership/visibility is authoritative; do not filter foreign records
   locally to disguise a backend contract violation.

4. **Protocol boundary.** S2 selects official SDK low-level `Server`, list handler
   and public fallback call handling, not custom JSON-RPC or a dependency upgrade.
   This avoids the stock call wrapper rejecting nonobject known-tool arguments
   before application validation. Explicit generic result validation remains.
   Publish detached T03 output schemas plus semantically redundant root type:object
   for SDK compatibility; T03 artifacts stay unchanged. Malformed call parameters
   and unknown names are protocol failures; known-tool argument/domain/API failures
   use application envelopes. Exactly seven names, required annotations and input/output
   schemas; no extra resources/prompts/login tools or experimental task capability.
   Results have matching structured JSON and serialized text, with correct `isError`.

5. **Budgets and safety.** Keep T05 wire/projected-data limits distinct from a
   published MCP result budget: structured data and duplicate text add overhead.
   Measure the complete serialized tool result in UTF-8 before successful delivery;
   too large means a bounded `result_too_large` envelope, never truncation. Account
   for the fixed JSON-RPC framing policy when settling the exact budget contract.
   Preserve safe recognized transport codes/retry metadata, never copy backend/native
   messages or arbitrary exception properties. Settle storage/session error mapping
   before source work. Backend fitness text remains inert data and cannot alter
   destination, configuration or permissions.

6. **Process lifetime.** Imports remain inert. Explicit execution connects the SDK
   stdio transport; stdout is MCP-only and diagnostics are fixed/sanitized stderr.
   EOF/disconnect, cancellation and supported termination signals fence new work,
   abort owned reads, await durability-critical refresh settlement, invalidate the
   facade and close the owner. Do not terminate persistence halfway through a
   commit to meet a timeout. No automatic reopen/reacquire/profile switching.

## Three proposed slices

| Slice | Reviewable outcome | Dependency / remains unavailable | Focused acceptance |
| --- | --- | --- | --- |
| **S1 — Trusted runtime and read boundary** | Config validation/startup snapshot; existing-owner/session composition; six read methods; safe missing-config/signed-out/storage failures; explicit close. | Accepted T03–T06. No delivered stdio server or product creation yet. | Small config/validation table; real isolated owner/session/HTTP integration for representative read, auth/fence and close; six route mappings; no provisioning or credential escape. |
| **S2 — Seven-tool protocol adapter** | Official SDK server factory, exact registry, schemas/annotations, read dispatch, disabled creation, envelopes and result budget. | Accepted S1. Production process launch remains unavailable until S3. | Official SDK client over an isolated in-memory transport: list/call, protocol vs application failures, strict inputs, exact Int64, complete/oversized output, create no-dispatch even with true policy. |
| **S3 — Stdio delivery and parent integration** | Executable server entry, startup/shutdown/cancellation/disconnection wiring and final integrated T08 acceptance. | Accepted S1/S2. Real operator browser login and genuine backend/Pi certification still deferred. | Official SDK client launching the actual compiled stdio entry; unconfigured and controlled authenticated read/paging paths; stdout purity, cancellation/EOF/termination and owner release; full active T08 plus relevant unchanged regressions. |

These are outcome boundaries, not promised durations or three giant execution
windows. Target 60–90 minutes per working window; checkpoint at 90 minutes and stop
at two hours with an honest handoff, allowing owned persistence to settle safely.
If a slice cannot fit, checkpoint/rescope it rather than silently continuing or
weakening checks. Each slice gets its own work order, role boundaries, frozen
artifact relay and accepted/partial/blocked disposition. No automatic successor.

## S1 decision checklist — now resolved or explicitly deferred

The [settled S1 specification](t08-s1-runtime-spec.md) and work-order draft resolve
this original planning checklist. Descriptor writing belongs to T07/T12; MCP output
budget belongs to S2. Neither is implicitly implemented by S1. The original issues
were:

- Exact file selector, versioned config schema, path resolution/file access rules,
  budgets/defaults and initialization behavior for absent versus invalid config.
  No CLI/environment write-enable setting or credentials in the config.
- How trusted setup/login supplies and updates the expected T04 binding after
  account bind/generation advance, without stale config becoming a reason to reset,
  infer identity or adopt an account. Coordinate with future T07/T12; do not change
  T04/T06 persisted formats or add a discovery API casually.
- Exact runtime/read factory signatures, ownership/close responsibilities,
  unconfigured/signed-out states and mapping of local storage/session failures to
  the shared application envelope. Specify startup fatal failures separately.
- Exact MCP output measurement/default/minimum, bounded failure envelope and
  cancellation/shutdown semantics. Distinguish SDK transport/framing limits from
  backend response and projected-data budgets.
- Narrow change in the old T01 inert-server expectation: imports/root/CLI remain
  inert, but direct server execution becomes implemented. QA may update only
  explicitly superseded server-launch expectations; retain unaffected assertions.
- Minimal production composition test seam using existing isolated provider
  facilities, never a model-visible/production diagnostic bypass. External values
  (origin, secret facility, binding) stay trusted placeholders until provisioned.

## Proportional verification and role boundaries

QA derives independent cases from shared/public specifications, not production
source. Use simple reused isolated fixtures; one meaningful mapping check per read,
representative paging/filter/own-draft/saved-list/foreign-not-found responses, exact
large revision projection, strict inputs, config/auth failures, safe errors and
no mutation reachability. Use the SDK client and actual process at their owning
boundaries rather than duplicating every case through every transport. Refresh
fault permutations remain accepted dependency coverage, not a new T08 campaign.

Developer owns scoped production/runtime/config changes; QA owns tests and QA
evidence; Coordinator owns common decisions/status/review. No dependency, compiler
relaxation or shared-contract change without explicit review. Start with role-scoped
static/import checks; focused repair runs during slices, full active T08 and relevant
unchanged T03–T06/foundation regressions at parent acceptance. Reconcile old T01
server-launch checks openly; parked T02 is preserved, not silently counted green.
Exact test-file selections are frozen in the work order/relay: nonempty explicit
argv, no repository discovery fallback. Preserve full output and safe failure
identities; any scope/hash/output/cleanup deviation means STOP before continuation.

No test count/coverage target or generalized harness. Frozen relays precede QA target
execution; no install/build overlap. Final clean locked install/build reproduction
and small import checks apply to the delivered integration, not every edit. Live
backend, Google/browser, Android, named Pi and release evidence remain future gates.
No real credentials/personal sessions, product writes, .pi changes, staging or commits.

## Next action

S1 is accepted; S2/S3 designs and held work-order drafts are settled. Sequential
activation now starts with a separately authorized S2 assignment, then accepted S2
before S3. Confirm role/safe
environment availability and separately activate source work if assigned; frozen
runtime execution still needs a named relay. Do not send Developer/QA a broad
“design T08” assignment. This artifact opens no implementation/test/execution grant.
