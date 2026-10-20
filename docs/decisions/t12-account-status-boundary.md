# T12-S3 — Account-status proof and deletion-cleanup boundary

Authority: [approved parent](t12-plan-and-slices.md),
[S3 work order](../tasks/t12-s3-work-order.md), shared MCP
[authentication](../../shared-docs/docs/mcp-contract/authentication.md) and
backend v1 [account lifecycle](../../shared-docs/docs/backend-contract/account-lifecycle.md)/
[OpenAPI](../../shared-docs/docs/backend-contract/openapi.yaml). No shared-contract
revision, new endpoint or model-facing lifecycle tool.

## Purpose-specific trusted interfaces

`dist/lifecycle/account-status` exports:

- `openAccountStatusTransaction({profile,metadata,transportConfig,settings})` over
  a caller-owned actual LifecycleProfileSession; returns binding/start/submit/
  cancel/close. Closing the low-level transaction does not release its caller-owned
  holder. No resume, raw receipt output, arbitrary account argument or proof journal.
- `openConfiguredAccountStatusBrowserHelper({configPath,loginConfigPath},signal)`:
  captures protected config/settings/descriptor, acquires actual holder and returns
  temporary URL/completion/cancel/close. This configured path owns holder release.
- `applyVerifiedAccountDeletion(capability,signal)`: internal cleanup boundary,
  accepting only module-private provenance minted by the completed verified request.
  Raw JSON, typed-looking records, booleans and object copies reject before IO.

Public completion is exactly `{state:"active"|"deleted"}`, with no account ID,
receipt timestamps, credentials or domain data. Imports perform no IO/handlers.
The login root exports remain unchanged. An additive sanitized internal
LoginError code `account_status_failed` identifies failed status verification;
CLI guidance never prints backend bodies/codes or private identifiers.

## Captured account and proof

Account selection comes only from matching protected descriptor/actual owner
binding, including S1 signed-out state. Pre-auth/no cached account and pending
publication refuse entry. Captured origin/account/session/profile generation are
immutable. Recheck descriptor/receipt and storage ownership/current binding before
HTTP dispatch/delivery and again before cleanup. Reading the vault for validation
also revalidates both encrypted-store digests/key/roots; its temporary bytes are
cleared rather than parsed as a usable grant or persisted elsewhere.

Start requests `{purpose:"accountStatus"}` from the fixed challenge endpoint.
Require exact challengeId/nonce/expiresAt fields, canonical ID, nonempty nonce and
fresh valid shared UTC expiry. Each local attempt has a fresh one-use UUID; one
callback consumes admission before network awaits. The captured client ID and
backend nonce feed the secured GIS popup. No local JWT decoding/claims inference,
service bearer, auth idempotency key, signIn/exchange/export/delete or account
creation route is used by status verification.

Submission body is exactly `{accountId,challengeId,idToken}` to the same-origin
`POST /v1/account/status`. Validate the original trusted transport config, then
apply maxAttempts1 to this purpose-specific composition. T05 already caps controls
to one send; its unchanged resource/login policies remain authoritative. Lost,
failed or cancelled submission ends the attempt; a fresh challenge/Google proof
is required. No durable token journal, consumed-proof replay, automatic retry,
startup replay, status resume or background polling exists.

## Receipt provenance and cleanup

Strict successful active response contains only matching canonical accountId and
state active. Deleted response contains only matching canonical accountId, state
deleted, deletedAt and purgeBy. T06/shared timestamp validation enforces UTC calendar
and millisecond precision; purgeBy must equal deletedAt+24h as the backend contract
requires. Historical receipts remain valid; no local receipt TTL is introduced.
Duplicate/unknown fields, wrong account/state, invalid timestamps, generic401/404,
wrong-purpose/expired Google proof, timeout/offline and cancellation do not authorize
erasure. Active leaves credentials, operations and metadata bytes unchanged.

Only the actual completed status request can mint an empty frozen capability in a
module-private WeakMap. Its private entry binds source identity, actual owner,
metadata and the current-evidence verifier. The cleanup entry consumes it once,
rechecks owned evidence, then calls the same owned S2 removal/publication helper
as confirmed local profile removal. Public results never expose that capability;
there is no exported mint or raw-receipt-to-capability conversion.

S2 durable order is unchanged: prepare strict metadata transition; persist external
removal fence before erasure; unlink only exact owned files; delete only the matching
unique provider key; minimize fence and metadata; await release. After preparation,
cancellation waits for durable settlement rather than promising rollback. A crash
with durable verified intent is recovered through S2 without another Google proof
or retained Google credential. Before intent, failure preserves private material.
A delayed A result cannot erase a changed session, distinct generation or new B;
a separate profile/key is unaffected. No backend DELETE or account rebinding.

## Shared foreground boundary and CLI

The existing callback implementation is shared privately by typed login and
account-status entry points. Its public login behavior/validation remains intact;
this is two fixed purposes, not a configurable authentication framework. Both
reserve IPv4/IPv6 localhost before challenge issuance; retain exact Host/Origin,
CSRF, one admitted callback, bounded headers/body/deadlines, safe nonce/script
encoding, strict CSP, expiry/cancellation and owned listener/socket cleanup.

The account-status page explains verification and matching local cleanup on
confirmed deletion, without account IDs or receipt fields. It uses the same GIS
foreground popup/auto_select false behavior. No token paste or external command.

```text
node dist/cli/main.js account-status --config <absolute normalized config path> --login-config <absolute normalized login settings path>
```

No --resume/--cancel/--confirm/account/token/purpose flags. The CLI prints disclosure
before effects, launches only the captured local URL through the existing trusted
launcher and reports active/preserved or deleted/local-cleaned using fixed stderr
text. Signals/launcher/output errors settle owned work and release the same holder;
no forced takeover. Existing exit meanings remain0/2/3/4/130. Status verification
does not enable routine creation or alter writesEnabled.

Evidence uses synthetic Google tokens and controlled isolated HTTPS replies through
actual callback/provider/ext4/CLI. It is local integration, not Google/backend/DB/
Android/named-host certification or independent release review. S4 clean locked
parent acceptance and external T16/T19/release gates remain separate assignments.
