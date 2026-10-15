# T04 coordinator design brief — protected storage and exclusive ownership

**State:** user-authorized T04 design window; not an approved implementation API
or acceptance claim. User selected Linux x64 with OS-backed Secret Service and
fresh independent Developer/QA agents via Herdr. Implementation requires a later
coordinator-approved public specification and explicit bounded grant.

## Authority and prerequisites

Normative: shared MCP 0.2-draft (user-approved config-only working-tree revision
over baseline 9a96dcb) and unchanged backend v1/OpenAPI 1.0.0; then approved T01
foundation specification, implementation ADR, architecture and T04 task.
Read:

- [MCP authentication](../../shared-docs/docs/mcp-contract/authentication.md)
- [Recoverable creation](../../shared-docs/docs/mcp-contract/routine-creation.md)
- [Shared scenarios](../../shared-docs/docs/mcp-contract/acceptance-scenarios.md)
- [Backend retention/log exclusions](../../shared-docs/docs/backend-contract/retention.md)
- [Architecture](../architecture.md), [verification](../verification.md)
- [T01 public foundation specification](t01-approved-foundation-spec.md)
- [T03 accepted handoff](../tasks/t03-schemas-codecs.md)

T01 is accepted, T03 is accepted but not required for T04's storage primitives.
T02 remains parked/incomplete; T13/T14 remain retired. Their sources/tests/evidence
are preserved. No changes to shared contracts to accommodate implementation.

## Selected scope and non-negotiable observables

1. Primary target: Linux x64 on explicitly supported local filesystems; Secret
   Service provides protected key material. Missing, locked, ambiguous or unusable
   key facilities fail closed. No plaintext key file next to encrypted data,
   password in argv/environment/tool results, fallback key generation on open,
   or automatic personal-keyring access in development.
2. Provisioning a genuinely new profile is an explicit trusted action, separate
   from reopening. Existing profiles with missing vault, operation store, key or
   external generation/fence state must not be reinitialized. Partial provisioning
   has an explicit fail-closed/reconciliation disposition.
3. Binding covers configured origin, service-confirmed account UUID, session
   generation and distinct profile-generation ID. Storage accepts trusted verified
   identity from its caller, never establishes backend authentication itself.
   Opening/updates check captured identity; changed origin/account never inherits
   old private state. Pre-auth provisioning and same-account generation changes
   need explicit public semantics before implementation.
4. Separate credential and operation stores. Encrypt and authenticate sensitive
   payloads and binding/version metadata. Validate versions, lengths, authenticity
   and store identity before returning data. Restrict directories/files and reject
   unsafe paths, links, foreign ownership or permissions; do not silently chmod
   or repair an existing hostile/corrupt profile into apparent validity.
5. Durable updates preserve byte-for-byte opaque payloads. Persist before success;
   atomic replacement alone is insufficient: specify file and parent-directory
   flush ordering, error handling and interrupted-write cleanup. Failure or crash
   cannot expose a partly committed usable state. Store authentication/refresh
   semantics belong to T06; operation state machine/admission/minimization to T09+
   (T04 supplies persistence, not arbitrary domain JSON serialization).
6. One exclusive owner across processes before reading/updating protected state.
   Second owners fail or wait safely, never race refresh or journal commits. Locks
   survive process races, release safely after owner death and cannot be stolen
   by PID reuse, elapsed time or stale-lock guessing. Specify descendants, orphaned
   helpers, release ordering, lock-file inode replacement and in-process call
   serialization. A lock-helper/supervisor must not leave a usable unlocked parent.
7. Protected external recovery/generation fence is outside the journal's restore
   unit. Specify commit sequence with vault and operation stores, crash boundaries
   and stale-backup detection. Restoring old journal/vault state while the current
   anchor remains intact must fail closed, including after sign-out/replacement.
   Missing/reset anchor is not permission to provision anew. Do not claim detection
   of arbitrary whole-machine rollback: Secret Service is not inherently a
   hardware monotonic counter. Narrow supported recovery environments explicitly;
   unsupported restore procedures block recovery, not silently resume mutations.
8. Digest-key lifecycle for later profile-lifetime compact receipts must be
   specified: separately protected stable keyed-identity material/version, no key
   rotation that makes retained receipts unverifiable. No digest/journal admission
   implementation is required here; do not regenerate T03 intent/body bytes.
9. No persistent routine/exercise read cache, operation TTL, automatic retirement,
   account switching, network/auth requests, startup continuation, CLI commands,
   MCP tools, config guard, live state or companion code in this task. Root,
   server, CLI and companion remain inert. Product writes remain disabled.
10. Errors are typed sanitized storage failures, without private paths, account/
    resource IDs, raw payloads, key material or native exception messages/causes
    that leak those values. Imports are effect-free: no filesystem discovery,
    keyring/bus access, child processes, listeners, timers or global handlers.

## Design questions to settle before implementation

Developer proposes an exact public `dist/storage/index.js` API with readonly types,
error catalogue, trusted provisioning/open/ownership/close calls, opaque byte
reads/commits and safe explicit fault points. Names here are candidate semantics,
not signatures QA should guess. T01's `ProfileStore` interface was provisional;
any refinement is coordinator-reviewed, narrow, type-only and regression-tested.

The proposal must select and justify:

- Secret Service integration mechanism and exact dependencies/OS helper versions;
  noninteractive locked-service behavior, uniqueness, attributes without identifying
  domain content, encrypted session transport, bounded timeouts, unavailable bus,
  duplicate items, provider persistence acknowledgment and key/fence updates.
- Whether native helpers/new npm dependencies/build steps are necessary; no
  installation lifecycle hooks, compiler relaxation, global/system package installs
  or dependency edits without coordinator approval. A generic injected key callback
  alone does not constitute the selected production Secret Service implementation.
- Encryption format/algorithm, nonce generation, separate store keys/key derivation,
  authenticated metadata, no same-key nonce reuse and stable identity-key retention.
- Local filesystem support, protected path roots, syscall/path-race assumptions,
  atomic/durable commit format, recovery fence ordering and fail-closed ambiguous
  commits. Explicitly list power-loss guarantees versus process-kill test evidence.
- Kernel ownership mechanism and process supervision protocol, release on crash,
  helper failure/loss and no stale inode/PID-based competing owner.
- Exact supported restore model, external anchor provisioning and preservation,
  partial provision/remove/generation behavior; lifecycle orchestration stays T12.
- Public test facilities: synthetic byte keys and persistence faults reachable only
  through a clearly isolated test boundary, never through production environment/
  CLI/config flags. Tests cannot turn missing production facilities into success.
- An isolated Secret Service test provider/daemon and private D-Bus session with
  disposable HOME/XDG roots, no personal bus/address inheritance and cleanup.
  Doubles prove failure/ordering logic, not real OS-facility interoperability.

## Independent acceptance budget

QA derives a concrete case matrix from this brief and the later approved API:

- Explicit provision/open distinctions; missing components, partial initialization,
  unknown versions, wrong origin/account/profile generation and session fencing.
- Disk inspection, restrictive permissions, authenticated tamper detection, wrong/
  missing key, cross-store swapping and plaintext absence with synthetic canaries.
- Exact bytes across reopen; no shared mutable buffers or serialization rewriting.
- Concurrent owners/processes, kernel lock behavior, kills before/after acquisition,
  parent/helper death, second-owner isolation, safe close and queued calls.
- Fault/kill at every persistence and external-fence boundary; acknowledged writes
  durable, ambiguous writes fail closed, no implicit repaired empty profile.
- Restore old operation and vault snapshots against current external anchor; missing/
  corrupt/reset anchor and unsupported whole-state restore explicitly blocked.
- Secret Service isolated provider success plus missing/locked/ambiguous/provider-
  failure tests, no interactive unlock and no leaked child output/arguments/errors.
- Effect-free imports and unchanged foundation/domain regression behavior.

Owning coverage: storage portions of A03-A04/A07-A09, C07, R01/R11-R12 only.
No entire scenario, real refresh, creation/backend replay or release pass follows
from storage doubles/process fixtures. No skipped gates counted passed.

## External-source review (planning, not runtime evidence)

Coordinator fetched the Secret Service draft index and libsecret `secret-tool`
manual. The latter explicitly says lookup may unlock an item and returns the first
unlocked match among multiple matches. Consequently unqualified `secret-tool
lookup` is not an approved fail-closed/no-prompt/unique-item design. Developer must
propose a mechanism satisfying these requirements, not silently adopt the helper.

- https://specifications.freedesktop.org/secret-service-spec/latest/
- https://specifications.freedesktop.org/secret-service/latest/description.html
- https://manpages.debian.org/bookworm/libsecret-tools/secret-tool.1.en.html

Installed binary inventory found libsecret 0.21.8.2-1, util-linux 2.42.4-1 and
D-Bus 1.16.2-1. Inventory is not provider availability or compatibility evidence;
no keyring/bus was contacted. A flock manual fetch failed and proves nothing.
Versions and exact immutable source references must be reviewed in the approved
specification/implementation ADR before platform certification.
