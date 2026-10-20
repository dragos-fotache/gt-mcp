# S6 backend deletion timestamp finding — authorized repair verified

Focused races/lifecycle pass 8/8. Actual account deletion succeeds (202), with
independent DB ledger, purge intent, account disablement, revoked sessions and
identity detachment. Active proof and signed foreign-subject 404 preserve local
material. The subsequent actual deleted account-status response is rejected by
the trusted local transaction as account_status_failed; local erasure is not
accepted. [Diagnostic](../evidence/t16-s6-deletion-diagnostic-results.json).

Backend AccountDeletionService samples raw time for proof freshness, then
microsecondPrecision persists deletion acceptance. DeletionReceipts returns exact
persisted values. MCP expiryToMs rejects nonzero submillisecond fractions. This
matches the [shared wire timestamp rule](../../shared-docs/docs/backend-contract/client-compatibility.md#wire-types-and-validation):
UTC epoch-millisecond-lossless timestamps; extra fractional digits must be zero.
Changing MCP validation or shared prose would weaken the contract.

The [original proposed patch](../evidence/t16-s6-proposed-backend-timestamp.patch)
changes only new deletion acceptance normalization to milliseconds. It keeps the
raw-time freshness decision, exact persisted receipt/replay and purgeBy=acceptance
plus24h. It does not migrate/round historical immutable receipts. Incompatible
historical ledger rows remain fail-closed and require a separately scoped owner
disposition before a deployment claiming such history is supported.

The original S6 read-only backend boundary caused a stop after the failed
acceptance. The user then instructed “and why did you stop? continue” on 2026-10-17,
authorizing this exact narrow repair. The [work order](../tasks/t16-s6-work-order.md)
records the exception and resumed bounded window before backend source edits.

[Applied repair](../evidence/t16-s6-applied-backend-repair.patch): only the production
normalization and its backend acceptance test changed. The fixed-clock regression
failed specifically on wire deletion precision before the repair, then passed with
literal expected milliseconds, persisted DB times, exact24h deadline, expired-proof
exact replay and fresh status byte identity. An existing regression's expired-row
fixture mixed DB wall time and a frozen service Clock; its fixture now uses service
time minus one second, with all cleanup/account/identity/deletion assertions intact.
The initial 26/27 run is retained; the four final backend classes pass 27/27, zero
failures/errors/skips. See [backend evidence](../evidence/t16-s6-backend-final.json).

Actual RSA-signed nonce/account proof through the unchanged backend verifier and
MCP account-status transaction now passes, erasing A's local ciphertext/key and
retaining its generation fence while B's private state/key fingerprint stays exact.
[Actual composition](../evidence/t16-s6-repaired-deletion-results.json). Final full
T16 acceptance is recorded in the [S6 review](../evidence/t16-s6-review.md).

All other 115 original backend build inputs, shared contracts, MCP production,
dependencies, Android and .pi remain unchanged. No historical ledger rewrite,
staging/commit or deployment. This repair is for new deletion acceptance; the
historical receipt limitation above remains explicit.
