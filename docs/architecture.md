# Architecture and safety boundaries

**Current target: shared MCP draft0.3/T21, 2026-10-17.** The user removed durable
creation recovery. This describes the successor architecture; current runtime/R1
package still implements draft0.2 storage/creation until T21-S2–S6 pass. Prior
T04/T09/T12 evidence remains valid only for its named artifacts. See the
[T21 plan](tasks/t21-remove-durable-creation-recovery.md) and normative
[single-record storage/interfaces](decisions/t21-single-record-storage-spec.md).

## Components

```text
Pi or another local MCP host
  -> portable stdio MCP server: config writesEnabled guard + seven strict tools
  -> fixed-origin HTTP client + dedicated service session
  -> existing GymTracka REST API

Trusted foreground CLI
  -> setup / Google loopback login / auth recovery / sign-out / profile removal

Protected local storage
  -> one encrypted authenticated binding + credential/auth-recovery record
  -> OS Secret Service key and exclusive local profile owner

Creation invocation (memory only)
  -> fresh routine/entry/set UUIDs and three backend step keys/body byte arrays
  -> draft -> populate -> save; no journal, receipt or cross-call retry identity
```

Write permission remains [config-only](decisions/routine-creation-config-policy.md):
strict writesEnabled default false; only explicit true permits creation. No
permission companion, per-call prompt, host metadata or model argument enables it.
Connected local clients can request creation when enabled; disclose that boundary.
Config is a startup snapshot, without a new watcher or CLI/environment override.

## Module boundaries

- `domain`: strict inputs/results, documented defaults, whitelist body projection,
  lossless Int64 and response validation. Creation no longer takes operationId.
- `protocol`/`runtime`: standard stdio, safe envelopes, six reads plus fresh creation,
  write policy, cancellation and current binding/result-delivery fences.
- `creation`: one invocation-local workflow. Same content in another call creates
  independently. No persistent intent digests or saved outcomes.
- `http`: fixed allowlisted routes, exact within-call body/key retries, budgets,
  error mapping and internal credentials; never arbitrary URLs/headers from models.
- `auth`/`login`: dedicated service credentials, exact pending refresh recovery,
  serialized rotation, bounded foreground Google exchange and trusted lifecycle.
- `storage`: single authenticated encrypted record and ownership/key custody; no
  external anchor, mutable binding descriptor or filesystem-name allowlist.
- `lifecycle`/`cli`: auth/account cleanup, no operation retirement or creation
  reconciliation. Old-format installations need explicit fresh setup/login.

`src/operations` and old creation-recovery dependencies are removed during T21.
Inert foundation/companion scaffolding and parked T02 experiments stay historical;
no companion runtime dependency is added. Exact future path dispositions are in
[the S1 map](decisions/t21-s1-path-dispositions.md).

## Credential persistence and authorization

Store authenticated origin/account/session/profile binding with opaque auth vault
bytes in one encrypted record; use the OS-protected immutable key. No plaintext
fallback or nearby unprotected master key. Config/login inputs stay restricted and
outside the profile. One kernel lease owner serializes credential state across
processes; it does not deduplicate creation calls. Trusted CLI requires ownership,
so the running server may need to stop first.

Use same-directory private temporary replacement, complete writes, file fsync,
rename and parent-directory fsync. Missing/corrupt/foreign state or lost key fails
closed; no automatic fresh setup. A failure after possible rename fences the owner.
There is no PREPARED/COMMITTED multi-store manifest or independent detection of a
valid older restored credential snapshot. Qualify actual local ext4 and Btrfs IO;
process-kill tests do not prove hardware/power-loss durability.

Persist exact pending refresh token/body/key before dispatch and grant before
clearing evidence. Refresh credential reuse can revoke a family, so it remains
separate from the removed routine-creation protection. Account and session fences
still apply before sends/delivery; sign-out/replacement stops old calls. Explicit
removal deletes the verified key and credential record under ownership. No external
removal tombstone or promise of erasure from backups/hardware.

## Creation and interruption

Validate all input and visible references before allocating a fresh routine family
and distinct per-step backend keys. Prepare complete request bodies in memory and
check budgets before the first send. Steps remain existing backend transactions:

1. POST draft: same-ID empty draft response.
2. PUT complete draft: matching IDs/order/values, isDraft:true.
3. POST save: matching saved routine, isDraft:false.

Validate each response losslessly before advancing. Existing bounded within-call
HTTP/auth retry reuses exact route/body/key. No retry identity survives invocation
end or process restart. No mandatory recovery-baseline GET/read-before-resume
protocol remains. Backend last-write-wins/race semantics are unchanged; malformed
or mismatched success is not success for requested content.

Failure/cancellation stops unsent steps; a draft or saved routine may exist.
Deliver safe current-call context only while binding allows it. Creation errors
have retryable:false; another call starts fresh and may duplicate. No automatic
remote deletion/rollback, startup continuation or response-loss replacement call.
Do not persist routine content, generated IDs/keys or terminal creation results.
Success is `{routineId,status:"saved"}` for this call, not a stored receipt.

## Browser, hosts and verification

The trusted browser helper retains GIS popup/callback, configured registered
loopback origin, Host/Origin/CSRF/nonce checks, no token-paste fallback and no
background interactive login. Backend audience/endpoints/lifetimes stay unchanged.

Named Pi/stdout portability and config enforcement remain release requirements.
Host paths/modes do not grant permission. T17's old exact creation restart/fork
recovery requirement is retired; modes, lifecycle, cancellation, result budgets and
untrusted content/privacy still need evidence for modified artifacts. Hosts may
retain tool content in transcripts even though the adapter no longer journals it.

No backend/domain/Android wire change, new transport or database is introduced.
Shared contract deviations still require explicit resolution. Old T02 evidence and
historical acceptance counts are preserved without claiming this revision passed.

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
