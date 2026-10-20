# Architecture

```text
Local MCP host
  -> stdio server: strict tools and startup write policy
  -> per-call profile ownership and authenticated session
  -> fixed-origin HTTP transport
  -> GymTracka REST API

Trusted local CLI
  -> setup / Google loopback login / recovery / sign-out / removal

Protected profile
  -> credentials.enc: encrypted binding and authentication vault
  -> owner.lock: exclusive kernel ownership
  -> master key in the OS Secret Service
```

## Components

- `domain`: strict schemas, lossless Int64 decoding, canonical domain results and whitelist request
  projection.
- `protocol`: MCP catalogue, envelopes, stdio transport, cancellation and result delivery. Only MCP
  frames go to stdout.
- `runtime`: protected configuration, six read tools, creation policy and per-call
  authentication/ownership composition.
- `creation`: invocation-local draft/populate/save workflow and validated outcomes.
- `http`: fixed-origin allowlisted routes, TLS, bounded requests/responses and exact within-call
  retry identity.
- `auth` and `login`: dedicated service credentials, refresh recovery, Google exchange and
  account/session fences.
- `storage`: encrypted single-record persistence, OS key custody and ownership.
- `lifecycle` and `cli`: trusted setup, recovery, sign-out, account-status proof and explicit local
  profile removal.

The companion workspace and experimental sources are outside the runtime delivery; no host
permission extension is required.

## Configuration and client trust

The protected version-2 configuration is read once at startup. `writesEnabled` is a strict boolean
defaulting to false; only explicit true enables creation. Editing the file requires a deliberate
process restart to take effect. Model arguments, host metadata, environment variables and CLI flags
cannot enable writes. All clients of an enabled process can request valid creation without another
prompt.

Startup authenticates the selected profile and pins its profile identity, origin and account, then
releases ownership. Each admitted call waits cancellably for an exclusive owner, reloads
authentication state and captures its current generation. Calls serialize across processes,
including reads. Same-account session changes are read afresh; profile/account replacement requires
restart.

Ownership spans HTTP/auth work, durable credential commits and final result handoff. SDK delivery
retains the lease until transport send settles. Cancellation during a pending write closes the
connection before releasing ownership. Close waits for begun authentication persistence and owned
cleanup. A waiting cancelled call cannot later dispatch. Acquisition is bounded at 60 seconds
independently of `storage.timeoutMs`; timeout reports `recovery_unavailable` without permanently
fencing a healthy runtime. Unsafe credential state still fails closed.

## Routine creation

Validate input and visible exercise references before allocating fresh routine, entry and set UUIDs.
Prepare complete request bodies and three distinct backend step keys in memory, checking request
budgets before mutation:

1. Create an empty draft and validate its identity.
2. Populate the complete draft and validate IDs, order and values.
3. Save it and validate the saved response.

Eligible transport/auth retries within the call reuse the exact method, route, body bytes and step
key. Success is `{routineId, status: "saved"}`. Another tool call gets new identities even when its
content is identical.

Failure or cancellation stops unsent steps but can leave a remote draft or saved routine. Creation
errors are always `retryable: false`; when authorized, context includes `routineId`,
`lastConfirmedStep` and `outcomeUnknown`. Session/binding fences can suppress sensitive context. A
saved response with mismatched content reports `concurrent_modification` rather than success.

No routine content, step keys, creation journal or receipt is persisted. There is no restart
continuation, cross-call deduplication, automatic rollback or remote deletion. Inspect remote
routines before deliberately trying again after an uncertain result. Hosts may retain tool content
in their own transcripts.

## Authentication and persistence

Binding and opaque auth vault bytes commit together in one encrypted record. Exact pending refresh
token/body/key are persisted before dispatch; returned grants are persisted before clearing that
evidence. Refresh recovery remains necessary because token reuse can revoke a credential family. It
is separate from creation.

Only trusted foreground actions perform Google login, sign-out and account-status proof. The
loopback helper enforces configured origin, Host/Origin, CSRF and nonce checks with no token-paste
fallback. Account/session fences protect sends and result delivery. Removal deletes the verified OS
key before known credential files; it does not delete remote data or host transcripts.

See [storage](storage.md) for the record and failure contract, [server operations](stdio-server.md)
for configuration/budgets and [improvements](improvements.md) for remaining qualification.
