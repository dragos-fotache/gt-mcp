# T21 — Remove durable routine-creation recovery

**Disposition (2026-10-18): S1–S6 and parent T21 accepted/closed.**

The separately user-assigned [S6](t21-s6-work-order.md) is
[accepted/closed](../evidence/t21-s6-review.md):1,076/1,076 checks across105 files
in workspace and clean locked replay, exact private installed package proof and
byte-identical source/build/archive reconstruction. [Inventory](../evidence/t21-s6-package-inventory.json),
[handoff](../handoffs/t21-s6.md), [laptop handoff](../handoffs/t21-s6-laptop.md).
Current config2/single-record/fresh-call source and exact package are qualified in
isolation. Historical R1/laptop are unchanged. Current Android, actual Pi CLI/
modes/lifecycle/output, T19 and independent T20 remain unverified release gates;
Btrfs testing stays user-owned. No publication, laptop/live deployment, write
permission enablement or successor assignment. Earlier slice dispositions follow
as historical evidence of their respective scope.

The user-assigned [S5](t21-s5-work-order.md) is
[accepted/closed](../evidence/t21-s5-review.md):545/545 in58 files,569 stable hashes,
actual isolated backend/SDK/Pi fresh-call/config2 boundaries and refreshed T17 plan.
[Handoff](../handoffs/t21-s5.md). No S6 package/install or parent/release grant follows.

The user subsequently assigned [S4](t21-s4-work-order.md), now
[accepted/closed](../evidence/t21-s4-review.md): config2, authenticated single-record
runtime/login/lifecycle integration and retired detached journal/anchor code.
808/808 checks across81 files pass. [Handoff](../handoffs/t21-s4.md).
R1/laptop retain prior installed behavior; S5 subsequently closed above and S6
packaging/parent acceptance remains unassigned. No automatic successor or installation claim.

The user assigned [S3](t21-s3-work-order.md), now
[accepted/closed](../evidence/t21-s3-review.md): single-record credential store,
33/33 owning and 223/223 storage/foundation regressions. [Handoff](../handoffs/t21-s3.md).
The user directed that Btrfs testing belongs to them: no agent-run Btrfs test or
Btrfs acceptance blocker. The solution must be independent of filesystem type;
required safe IO/path/ownership rules remain. This supersedes this plan's original
agent-owned Btrfs testing requirement for S3/S6. S4 has subsequently integrated
current callers; installed behavior remains unchanged.

The user assigned [S2](t21-s2-work-order.md), now
[accepted/closed](../evidence/t21-s2-review.md): invocation-local creation and
821/821 owning/regression checks. [Handoff](../handoffs/t21-s2.md). Existing credential
storage remains unchanged; the current source candidate is not an installation package.
The user requested removal of the duplicate-creation protection and a plan/report.
The user subsequently assigned [S1](t21-s1-work-order.md), now
[accepted/closed](../evidence/t21-s1-review.md): shared draft0.3, successor interfaces
and exact path dispositions. Runtime was unchanged by S1; S2 was subsequently
assigned separately, as recorded above. [S1 handoff](../handoffs/t21-s1.md).

## Outcome and scope

Make routine creation an ordinary foreground operation. Remove its durable
journal, permanent operation identity, saved retry receipts, restart continuation
and local rollback-detection machinery. Remove the ext4 installation requirement
by replacing the shared multi-store/anchor engine with a single encrypted
credential store. Qualify local Linux ext4 through actual isolated IO; the user
owns Btrfs verification as directed above.
Do not retain the old recovery system behind an optional setting.

The user accepts that repeating creation can create another routine. An interrupted
attempt can leave a draft, or a saved routine whose reply was lost. Recovery is
manual inspection followed by a deliberate new attempt if desired. There is no
automatic remote deletion or multi-request rollback.

Keep authentication, encrypted credentials with an OS-protected key, exclusive
profile ownership, strict validation, exercise visibility checks, lossless numeric
handling, fixed-origin HTTPS, write configuration and ordinary cancellation.
Keep pending token-refresh identity: backend refresh-token reuse has separate
session consequences and is not duplicate-routine protection. Keep trusted login,
sign-out, profile removal and authoritative account-status handling.

Non-goals: backend/API changes, making creation atomic, a new database/dependency,
support for other operating systems or network filesystems, general migration
infrastructure, changing Google login, public publication, or live laptop changes.

## Findings and authority

The current implementation is conforming to a stronger requirement; this is a
requested product change, not a repair by weakening tests:

- Shared MCP [creation](../../shared-docs/docs/mcp-contract/routine-creation.md),
  [tools](../../shared-docs/docs/mcp-contract/tools.md),
  [authentication](../../shared-docs/docs/mcp-contract/authentication.md) and
  [acceptance scenarios](../../shared-docs/docs/mcp-contract/acceptance-scenarios.md)
  require operationId, durable exact-byte replay and retained receipts.
- [T04 storage](../decisions/t04-approved-storage-spec.md) implements two encrypted
  stores plus a separate PREPARED/COMMITTED anchor. Its production holder explicitly
  allows only ext4. Credentials and login/refresh also use that engine; removing
  only `src/operations` would not remove the filesystem restriction.
- [T09](../decisions/t09-journal-format.md), T10/T11 and T15 compose admission,
  execution, recovery and tool delivery. T12/CLI, packaging and T17 also assume it.
- Backend v1 still requires resource request identities and uses three separately
  committed requests. Backend baseline 9a96dcb/OpenAPI 1.0.0 must remain unchanged.

Apply the foundation spec/ADR, current write-config decision and proportional
testing policy to retained behavior. S1 must explicitly supersede conflicting
MCP/local recovery clauses, including standing references in AGENTS.md. Preserve
historical acceptance evidence and task dispositions. Existing package/verification
results continue to describe their original artifacts, not the future replacement.

## Settled target behavior — S1

| Boundary | Replacement |
| --- | --- |
| Creation input | `name` and `exercises` with existing domain rules/defaults. Remove `operationId`; strict schemas reject that obsolete field. |
| Successful result | `{routineId, status: "saved"}` after validating the save response. No persisted receipt. |
| Repeated/concurrent calls | Each invocation is independent and allocates fresh routine/entry/set IDs. Identical content can produce distinct routines. No cross-call deduplication, including within one process. |
| MCP annotation | `idempotentHint: false` for creation; retain the existing read-only/destructive/open-world distinctions. |
| HTTP identity | Allocate backend-required per-step keys in memory. Any existing bounded HTTP/auth retry within this invocation retains the same route/body/key. No keys or routine request bodies are persisted for later invocation. |
| Workflow | Validate complete input and references, then draft → populate → save. Validate target IDs, shape and intended values before advancing; never report saved on HTTP status alone. |
| Failure/cancellation | Stop unsent steps. Report safe `routineId`, `lastConfirmedStep` and `outcomeUnknown` when available for the current authorized invocation; omit `operationId`. A canceled/disconnected host may receive no reply. |
| Tool-level retry | Creation errors advertise `retryable: false`: a new tool call cannot resume this attempt. Descriptions explain that a new attempt can duplicate work. Read and refresh retry policy stays unchanged. |
| Restart/lost final reply | No creation resumes or yields a stored result. Inspect saved routines; a known routine ID can also address a draft. A fresh call starts fresh. |
| Local retention | Persist credentials/auth recovery only. No creation bodies, intent digests, operation reservations, terminal receipts or retirement tombstones. |
| Configuration | New version-2 server config retains origin, `profileRoot`, Secret Service access, budgets and `writesEnabled:false` default. Remove `anchorRoot` and `bindingDescriptorPath`. Store authenticated binding and vault state together. |
| Credential persistence | One versioned encrypted profile record, replaced atomically with file/directory flushes and a local ownership lock. Reuse encryption/keyring/worker primitives where useful; remove multi-store commit manifests and separate anchor roots. |
| Filesystem support | No ext4 name/magic allowlist. Validate paths/ownership and perform required IO; report actual IO failures safely. Qualify Btrfs and ext4. Do not promise support for every filesystem or actual power-loss survival. |
| Credential recovery limit | No independent detection of an older restored encrypted credential snapshot. Corrupt/missing/unsafe state cannot silently reset; trusted setup/login is required. Encryption and current-session/account fences remain. |
| CLI | Remove `retire-operation` and creation-reconciliation setup flags. Retain needed login/refresh recovery, sign-out, account status and explicit profile removal. |

This removes the recovery feature rather than transferring it to the host or a
new database. Ordinary fsync/atomic replacement and profile locking remain because
they protect credentials; they are not a durable routine journal.

### Existing installations

Choose a fresh-profile transition, not transparent migration. New code refuses
version-1 config/old storage with clear setup instructions, before backend writes.
It never silently reuses or discards old journals, credentials or keyring entries.
Stop the old server, inspect any uncertain remote creations, create a new private
profile/config, and sign in again. Old data cleanup is a separately explicit local
action using the documented old installation procedure; no automatic deletion.

The laptop discussed in this session has application files only, with no profile
or login created. It will need fresh setup rather than data migration. This plan
does not install a new candidate or contact its live backend.

## Sequential implementation slices

Each slice targets a 60–90-minute work window, checkpoints at 90 minutes, and
stops by two hours with an honest handoff if unfinished. These are scope bounds,
not duration promises. Authorize successors separately. Intermediate candidates
are not installation/release candidates; parent acceptance is required.

### S1 — Revise the contract and settle replacement interfaces

Update the five shared MCP documents and shared-docs entry summary to a clearly
identified new draft, preserving policy history. Specify the table above and revise
the affected creation/fault/host acceptance scenarios. Do not alter backend v1.
Record a concise successor storage spec: one authenticated encrypted record holds
binding plus vault bytes; its format/header permits key lookup without an external
mutable binding descriptor; unverified metadata never authorizes account access.
Settle storage open/commit/lifecycle interfaces and new config/error shapes before
dependent code. Supersede only relevant T04/T09/T12/architecture/AGENTS clauses.

Deliver a path-level production/test disposition list: retained, adapted, or
removed with the retired requirement. Include packaging helper/worker closure and
obsolete CLI commands. No blanket exclusions of failing suites. Keep historical
evidence and parked T02 sources/tests intact.

Accept: requirements and executable expectations agree on the new behavior;
credential refresh identity and authorization remain explicit; backend diff empty.
Documentation checks only. No runtime or test-source changes in this slice.

### S2 — Replace creation with an invocation-local workflow

Change domain inputs/results, MCP catalogue and creation/runtime composition.
Reuse the existing whitelist body builder, response validation and authenticated
HTTP transport; remove journal admission, digest comparison, receipt delivery and
recovery execution from creation. Runtime startup no longer requires decoding a
creation journal. Keep old storage only as a temporary credential dependency until
S4; do not erase existing operation evidence or claim installation readiness.

Accept with focused protocol/HTTPS checks: successful three-step creation;
identical calls create distinct roots; false/missing write policy and bad input
send no mutations; a failed/interrupted step stops remaining work and reports no
false success. Verify annotations/schema and within-call key/body stability on a
representative retry. No exhaustive crash matrix.

### S3 — Implement the single-record credential store

Implement the S1 storage interface and format with isolated provider/filesystem
fixtures. Reuse existing cryptography, Secret Service and exclusive-owner worker
where appropriate. One record replaces vault/operations/anchor coordination;
binding and vault changes commit together. No creation-specific API or keyed
intent digest in the new interface. No production filesystem-name gate.

Accept: real isolated Secret Service and ext4 setup/open/update/reopen;
second-owner refusal; representative interrupted replacement leaves a valid old
or new record or a clear recovery error; missing key/corruption/foreign binding
cannot disclose credentials or silently provision. Process interruption is not
power-loss proof. Btrfs verification is user-owned by the S3 execution directive above; do not run
it or claim qualification from ext4 evidence.

### S4 — Integrate setup, auth, lifecycle and configuration

Switch runtime, login, auth refresh and lifecycle to the new store; implement
version-2 config and fresh-profile transition. Remove separate binding-descriptor
publication/receipts where the atomic record replaces them, while retaining
foreground OAuth state and exact pending refresh evidence. Adapt profile removal,
sign-out and account-status cleanup. Remove operation retirement/reconciliation
commands and unused production journal/anchor code. Update templates and operator
guides, including failure/restore behavior. No optional legacy recovery mode.

Accept: setup → synthetic login → restart → reads; representative lost-refresh
response/restart retains original token/body/key; sign-out fences calls; explicit
profile removal works; old config/state gets clear refusal without changes. Verify
no creation data is persisted. Run full active storage/auth/login/lifecycle owning
suites, with explicitly revised obsolete expectations and relevant regressions.

### S5 — Verify the delivered creation and host boundaries

Reuse the isolated real backend and actual SDK/Pi fixtures. Adapt affected T16
and T17 requirements rather than rerun the retired durable creation-recovery
campaign. Verify saved domain graph, a repeated call producing another routine,
one interrupted/uncertain creation, and restart doing no autonomous work. Exercise
actual stdio tool discovery/results, config enforcement and cancellation. Refresh
the remaining T17 plan: its former S4 exact-recovery certification is retired;
CLI/modes, lifecycle and output/privacy requirements still need their own evidence.

Accept: full active creation/protocol/backend owning selection and relevant
unchanged codec/read/auth regressions pass. Record affected historical tests and
new scenario mappings explicitly. Existing T16/T17 results are historical evidence,
not certification of modified storage/creation. This slice does not finish every
remaining T17 mode or the independent release review.

### S6 — Refresh the package and perform parent acceptance

Update packaging runtime/document allowlists and dependency closure if removals
change them. Build a new separately identified archive; preserve the existing R1
archive outside the clean-build output before building. Install that exact candidate
into an isolated fresh location using pinned Node and locked runtime dependencies.
Verify setup/login fixtures, isolated storage (Btrfs testing is user-owned),
stdio reads/creation and old-format
refusal from the installed artifact. Replay the final active owning suites plus
relevant regressions against stable targets and reproduce from clean locked inputs.

Deliver archive/checksum/inventory, updated standalone installation/recovery guides,
acceptance evidence and a bounded laptop installation handoff. Confirm no shipped
anchor/journal dependencies or ext4-only requirement and no secret/body logging.
T21 completes only after integrated acceptance; T19 real Google/browser and T20
independent review remain separate. No publication or laptop/live deployment here.

## Edit and execution boundaries

Original planning edited only this task plan and its task-index link. S1 records
the authorized documentation revision; later slice work orders
can authorize the named shared MCP docs; relevant `src/domain`, `src/creation`,
`src/runtime`, `src/protocol`, `src/storage`, `src/auth`, `src/login`, `src/lifecycle`,
CLI, owning tests, packaging and current operator/status documentation. Reuse
dependencies and compiler settings. Preserve unrelated uncommitted work, `.pi`,
backend contracts and historical evidence. No staging/commits.

For implementation use the provisioned Node24.21.0/npm11.19.0 toolchain exclusively.
Run early relevant type/lint/format/import checks, focused Vitest selections, then
complete active owning suites/relevant regressions at parent acceptance. Locked
`npm ci --ignore-scripts`, production checks, explicit builds and packaging run
only in authorized stable targets; never rebuild while tests use that target.
Use simple reused fixtures. Only isolated synthetic backends, private Secret
Service/bus and disposable storage may be write-enabled. No live backend, real
credentials, laptop mutations or disk formatting under this plan.

Stop affected work for a needed backend-contract change, loss of retained auth
safeguards, new dependency, ambiguous old-profile
handling or exceeded slice window. Report the exact issue and continue only
independent authorized work. No tests/builds were run to produce this plan; it
is based on repository inspection, not new behavioral evidence. S1 adds only
documentation/schema/input-identity verification; actual implementation remains open.
