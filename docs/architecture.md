# Proposed architecture and safety boundaries

Current local write policy is [configuration-only routine creation](decisions/routine-creation-config-policy.md):
no custom or external permission extension. The user-approved shared MCP draft0.2
is aligned in the working tree; no implementation/conformance pass is claimed. T02 is parked,
T13/T14 retired. T03/T04 and portable MCP work own the remaining decisions.

## Components

```text
Pi or another local MCP host (no permission extension required)
  -> portable stdio MCP server: config writesEnabled guard + validation + seven tools
  -> fixed-origin HTTP client + dedicated service session
  -> existing GymTracka REST API

Operator-managed MCP configuration file
  -> writesEnabled: false by default; true authorizes routine creation without prompts

Trusted foreground CLI
  -> local configuration / Google loopback helper / sign-out / retirement / profile removal

Protected local storage
  -> credential vault and pending refresh identity
  -> creation journal and compact terminal receipts
  -> external profile-generation/recovery fence
```

Write permission belongs to the operator-managed server config, not the host.
Only explicit boolean writesEnabled:true permits creation; no per-routine approval,
companion, external extension, mode check or sidecar is required. Any client with
access to an enabled local process can request creation without confirmation;
disclose that trust boundary. clientInfo, annotations, model arguments and a
confirmed flag never enable writes. This is not an OS sandbox. Normal backend
auth, account/origin fences and creation recovery still apply.

## Suggested repository layout

```text
src/
  cli/                 trusted command dispatch and safe presentation
  config/              fixed origin, budgets, profile binding, local write policy
  domain/              strict schemas, normalization and response/domain comparison
  protocol/            official MCP SDK integration and tool/result catalogue
  http/                route allowlist, exact bytes, lossless reads, errors and limits
  auth/                session fences, refresh recovery and foreground browser login
  storage/             encryption, atomic writes, profile ownership and generation fences
  operations/          admission, step state machine, receipts and retirement
companion/
  src/                 existing inert T01 scaffold; retired product extension scope
experiments/t02/        parked experimental companion, driver and synthetic fixture
test/
  unit/
  fault/
  protocol/
  backend-integration/
  pi-integration/
docs/
```

The portable server/CLI use shared pure schema/normalization modules; they do not
need a Pi runtime or permission extension. Existing T01 companion package/build
artifacts remain inert historical scaffolding until an explicit cleanup task;
no source/dependency removal is implied by this documentation revision.

## Interfaces to agree in T01

Define minimal injectable boundaries; names below are illustrative:

- ProfileBinding: immutable captured origin/account/generation plus profile-generation ID.
- ProfileStore: protected provisioning/opening, ownership lock, atomic vault/journal writes
  and an external recovery marker; no implicit creation on read.
- SessionProvider: dedicated opaque credential selection, pending refresh settlement,
  serialized rotation, and pre-send/pre-delivery binding checks.
- BackendClient: typed allowed-route methods accepting stored body bytes/resource keys
  and abort signal; internal credential injection, never caller-controlled headers.
- SchemaCodec: strict tool arguments, normalized creation intent, lossless backend numeric
  parsing, millisecond UTC checks, and decimal-string revision projection.
- OperationRepository: exclusive admission/execution, immutable step bytes and keys,
  dispatch/confirmation commits, versioned keyed intent identity, terminal minimization.
- RoutineCreationService: orchestration only; no stdout, interactive login or Pi access.
- T01 CompanionBinding/IntentStore exports are legacy inert boundaries from the
  retired companion plan, not production implementation requirements. The server
  operation journal retains operationId/normalized intent for recovery.
- Clock, UUID generator, sleeper, process/file fault points and transport are injectable
  for deterministic tests; test seams cannot become production authentication bypasses.

Request identity is method + concrete normalized route + exact UTF-8 body + namespace key.
Keep retry bytes immutable and separate from normalized intent. Normalize only documented
defaults; do not trim names, fold case, normalize Unicode or reorder exercise/set arrays.

## Private storage and durability

T04 selects an OS-backed secret facility or equivalent separately protected key; no
plaintext fallback or adjacent unprotected encryption key. Credentials and operation
bodies must be restricted/encrypted and outside the repository, ordinary
logs, transcript entries and normal backup/transfer paths. Never put Google/service tokens
in argv, environment values visible to the model, tool schemas, results or browser storage.

Prefer one process owner per profile. A second server/helper must acquire ownership or
fail/wait safely; it must not race refresh. Trusted CLI actions may require the owner to
stop/release the profile. Per-operation exclusivity is still required inside the owner.

Persist before send and before reply. Test atomic replacement/transactions, durable flush,
directory durability where required, interrupted writes, lock cleanup and PID reuse.
A missing or stale journal is not an empty new profile. Keep a generation/recovery fence
outside journal storage; design its protection/update ordering before claiming detection
of restored stale state. If a trustworthy non-rollback anchor cannot be provided, narrow
the supported recovery environment explicitly and block unsupported restored state;
do not claim a local marker alone defeats arbitrary whole-machine rollback.

Schema/version/key migration must retain exact accepted body bytes or fence recovery.
Profile removal/retirement cannot free old operation IDs in the same profile.

## Auth and local browser helper

The helper uses existing Google challenge/exchange and GIS web popup/callback with the
backend audience. It binds only loopback on an exact configured registered
http://localhost:<port> origin. Host/Origin/CSRF and active-attempt nonce checks are
mandatory; an occupied port fails, never picks a random replacement. No token-paste
fallback, service grants in JavaScript, third-party analytics, or background login.

Exchange retry is bounded to the same protected foreground body/key/challenge deadline.
Refresh is independently durable and serialized across processes. Lost refresh must
retry the same predecessor token/body/key; replayed expired access with current refresh
is installed first, then a distinct serialized rotation may occur.

## Routine state machine

Admission -> draft -> populate -> save -> compact terminal outcome.

Allocate root/entry/set UUIDs and three distinct resource keys once, after complete local
validation and visibility prechecks. Persist all step requests before the first send.

- draft: POST /v1/routines, expected same-ID empty draft.
- populate: PUT /v1/routines/{id}, complete admitted draft, generated consecutive positions.
- save: POST /v1/routines/{id}/save, expected saved same-ID content.

A dispatched unconfirmed step stays uncertain and is settled by exact replay, never GET.
Before a previously unsent remaining step, compare fresh GET with last confirmed state.
That is advisory; backend last-write-wins still permits races. Confirmed save with changed
domain content is terminal concurrent_modification, not success or automatic rollback.

Permanent rejection stops remaining steps and remains an original terminal result.
Cancellation stops unsent work and preserves possible commits. Restart does not resume
until an explicit identical call. After settlement erase full bodies and keep encrypted
profile-lifetime compact receipts/keyed intent digests. Check live backend authorization
before returning private terminal results, even if the routine was later deleted.
Sign-out fences/preserves; authoritative account deletion removes only that account's material.

## Host integration and parked extension work

T17 verifies named Pi stdio/tool-path interoperability with the portable server.
Write permission is identical across host paths/modes: config false/missing denies
creation, config true allows valid authenticated explicit calls without a prompt.
No native terminal approval UI, extension load-order certification, companion
binding/label cache, sidecar or externally approved-digest comparison is required.
Inputs actually received by the server remain strictly validated and normalized;
server journal identity/immutable bytes protect retries, not human-approved intent.

Host output truncation and untrusted fitness text remain interoperability/privacy
concerns: server results must be complete or explicitly too large, and no output
may enable writes or change destination. Passing one host does not certify all hosts.

Preserve experiments/t02 and its QA evidence under the historical public experiment
spec. Four slices/six SDK profiles accepted; R3 candidate unaccepted. No genuine
PTY approval/overall T02 completion claimed. Shared draft0.2 explicitly supersedes
the old approval clauses; parked tests are retained, not rewritten to pass.

## Technical ADR backlog

| Owner   | Decision/evidence                                                                            |
| ------- | -------------------------------------------------------------------------------------------- |
| T01     | Runtime/package/protocol pins, scripts, modules and interfaces.                              |
| T02     | Parked historical Pi companion feasibility; no active product dependency.                    |
| T03     | Schema engine and truly lossless backend numeric codec.                                      |
| T04     | Supported OS secret store, encryption/atomicity, lock strategy and anti-stale-state fence.   |
| T05     | Transport/output budgets, timeout/retry policy, redirect/proxy controls.                     |
| T15/T17 | Config-only routine-creation guard and named-host interoperability; no permission extension. |
| T18     | Installation, backup exclusions, packaging and upgrade compatibility.                        |

Any inability to uphold the shared draft is a blocker, not permission to add a weaker
confirmation flag, round Int64 data, drop recovery evidence or expand API scope.

## References inspected for planning

- [Pi extensions](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md)
- [Pi MCP](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/mcp.md)
- [Pi terminal UI](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/tui.md)
- [Pi SDK](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md)
- [Pi packages](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md)
- [Official MCP SDKs](https://modelcontextprotocol.io/docs/sdk)
- [Versioned MCP tools reference](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)

The Pi web links move; installed version documentation was used for the facts above.
T01/T17 must record immutable version/source references. Parked T02 records remain
historical evidence under their old contract. The versioned MCP reference is
planning context, not a negotiated-protocol support claim.
