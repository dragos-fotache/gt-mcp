# T07 — Trusted browser login design and proposed slices

## Authority and disposition

Subsequent disposition: the user assigned S1 after this planning checkpoint;
[S1 is now complete](../evidence/t07-s1-review.md), followed by the separately
assigned and [accepted S2](../evidence/t07-s2-review.md), then
[S3 and parent acceptance](../evidence/t07-s3-review.md). The
[S1 work order](../tasks/t07-s1-work-order.md) and
[S2 work order](../tasks/t07-s2-work-order.md) and
[S3 work order](../tasks/t07-s3-work-order.md) supersede the original design-only
activation status below. All T07 work is closed; the technical design below
remains the historical reference. No successor is assigned by this document.

The user requested T07 design and potential slicing on 2026-10-15. Previously,
T07 had only a task outline: no design, slice specifications or work orders.
This Coordinator design supplies the proposed architecture, public behavior and
three sequential outcomes. It authorizes documentation only; T07 remains
implementation-unassigned. No source/test edits, installs, runtime execution,
live Google/backend access, staging or commits follow from this plan.

Normative references, in order: shared MCP draft0.2
[authentication](../../shared-docs/docs/mcp-contract/authentication.md) and
[A01/A02/A11 scenarios](../../shared-docs/docs/mcp-contract/acceptance-scenarios.md);
backend v1 [authentication](../../shared-docs/docs/backend-contract/authentication.md)
and unchanged OpenAPI; accepted T04/T05 and T06 public specifications, especially
[initial installation](../tasks/t06-s1-work-order.md),
[replacement](../tasks/t06-s5-work-order.md) and
[the unresolved T07 handoff](../handoffs/t06-complete-coordinator-pickup.md).
Preserve T08's [config/descriptor contract](t08-s1-runtime-spec.md) and accepted
S2 protocol config addition. Apply [proportional testing](proportional-testing-policy.md)
and [bounded work](../agent-coordination.md#standing-bounded-work-and-context-safe-slicing-policy).
T06 verification omissions remain recorded, not reopened or passed by this design.

## Outcome and boundary

Deliver trusted local setup and foreground Google login, followed by a dedicated
service-confirmed session that the existing T08 stdio server can open. Login
must work both for an unbound profile and for explicit same-origin/same-account
reauthentication, preserving uncertain predecessor refresh evidence under T06-S5.
The operator stops the MCP server before setup/login; competing profile ownership
fails safely with stop-and-retry guidance. No live handoff to a running server.

No model-facing login/logout tools, token paste/argv/environment credential input,
hosted companion, remote listener, new backend endpoint, account switching,
account-deletion/status/export flow, background recovery or routine creation.
T12 owns broader trusted lifecycle commands; T18 owns final package/bin wiring.
T16/T19 own real backend and Google/browser interoperability. T07 never enables
writes or changes operator `writesEnabled`; T08 creation remains unavailable.

## Operator interface and configuration

Proposed compiled CLI entry is `dist/cli/main.js`, separate from the unchanged
MCP entry. The command names below are settled for this design; T18 can package
them later without moving login into MCP:

```text
node dist/cli/main.js setup --config <absolute normalized config path>
node dist/cli/main.js login --config <path> --login-config <path>
node dist/cli/main.js login --config <path> --login-config <path> --resume
node dist/cli/main.js login --config <path> --login-config <path> --cancel
node dist/cli/main.js recover --config <path>
```

Flags may appear in any order; duplicates, unknown flags, extra positionals
and missing values fail before IO. There is no ambient config search. `setup`
explicitly provisions a new pre-auth T04 profile with a newly generated profile
UUID and publishes its descriptor; it never resets/adopts an existing store.
`recover` only finishes or reconciles a recorded local metadata transition; it
does not request a challenge, exchange credentials or repair T04 corruption.
Normal `login` starts a fresh attempt only after prior local state is settled.
`--resume` explicitly retries an already prepared exchange within its original
deadline, without opening Google, accepting another credential or issuing a new
challenge/key. It fails if there is no resumable attempt. `--cancel` explicitly
clears a pending foreground exchange after a crash, without network/browser work,
preserving prior auth/operation evidence; it is mutually exclusive with `--resume`.
Neither option bypasses an unresolved metadata receipt or storage ambiguity.

Keep the accepted T08 version1 server configuration unchanged. A separate,
explicit trusted login settings file avoids adding fields that existing strict
T08 readers reject:

```text
{ version: 1, googleWebClientId: <public web client ID>,
  browserOrigin: "http://localhost:<registered port>" }
```

All fields required; no unknown fields, duplicate keys, coercion or BOM. Origin
is exactly lowercase `http://localhost:<port>` with a decimal integer port in
1024..65535, no leading zeroes, path, slash, userinfo, query or fragment. The
public web client ID must be configured as the backend Google audience; the
client cannot discover or prove that deployment match locally. Real values and
registration remain external inputs, never invented fixtures presented as live.
The same private-file access rules and 65536-byte bound as T08 config apply.
Config, login settings, descriptor and pending metadata are distinct files
outside the profile/anchor roots. The CLI requires the descriptor's immediate
parent to be a user-owned private 0700 directory for safe metadata publication.

CLI stdout is empty; fixed safe status/guidance goes to stderr. No binding,
account/client IDs, private paths, credentials, raw bodies or native exceptions
in diagnostics. Exit codes: 0 acknowledged completion, 2 usage/configuration,
3 ownership/storage/local recovery required, 4 sign-in/provider/network failure,
130 cancellation. An interrupted commit may have succeeded privately: report
recovery required, never roll it back or claim login failed to reach the service.

## Protected foreground exchange and atomic installation

The main integration decision is to store temporary exchange evidence in T04's
encrypted credential vault, never the operation store or a plaintext sidecar.
Do not pass a novel record to the existing strict T06 initial-install/replacement
factories and hope they accept it. Add a T07-owned trusted auth composition with
an explicit temporary vault version4 envelope:

```text
{ version: 4, binding: <exact source StorageBinding>,
  priorVaultBase64: <exact previous empty/v1/v2/v3 vault bytes>,
  exchange: {
    attemptId: <local random UUID>, challengeId: <backend UUID>,
    challengeExpiresAt: <exact backend deadline>,
    googleWebClientId: <captured configured ID>, browserOrigin: <captured origin>,
    authKey: <one random auth UUID>, bodyBase64: <exact UTF-8 exchange bytes>,
    sendsReserved: <integer 0..2>,
    retryNotBeforeMs: <null or exact safe-integer epoch milliseconds>
  } }
```

Strict shape/UTF-8/duplicate-key/version/binding validation applies, including
canonical base64 and validation of the embedded previous vault under its source
binding. No recursive version4 nesting. The body contains exactly the active
`challengeId` and opaque `idToken`. Account identity never comes from decoded
Google claims. T07 may share accepted private grant-validation/lifecycle logic;
no change to T04 storage APIs or accepted T06 public factory contracts is needed.
Older factories, including T08 startup, continue to refuse version4 safely.
An interrupted login therefore requires explicit trusted local recovery before
MCP startup; it never authenticates using the embedded predecessor implicitly.

State transitions:

1. Validate files, acquire the existing T04 owner and validate prior auth state.
   A fresh login sends one `purpose:signIn` challenge request through T05, then
   starts the browser attempt. Waiting for a callback keeps challenge/CSRF only
   in memory; no credential has yet been dispatched or persisted.
2. Admit one valid callback synchronously. Generate one auth key and serialize
   `{challengeId,idToken}` once. Durably commit version4 before any exchange
   handoff. Capacity/preparation failure sends nothing; never evict prior auth
   evidence to make room. Every send first durably increments `sendsReserved`.
3. Exchange only through T05's fixed same-origin HTTPS control. Each invocation
   makes one attempt. Permit one initial send plus at most one explicit
   `--resume` send across restarts, using identical body/key. No automatic loop
   or worker. Persist any T05-provided bounded retry delay as `retryNotBeforeMs`
   before returning; an early resume fails safely without sending. Never delay
   past or extend the original challenge deadline. A consumed challenge is never
   retried as a new login.
4. Validate the complete service grant with accepted T06 rules, exact expiry
   spellings and a live refresh deadline. Backend-confirmed account is authority.
   Unbound source: T04 `bindAccount` once. Bound source: require the same account
   and use `advanceSessionGeneration` once, retaining predecessor grant/pending
   refresh/superseded evidence exactly as T06-S5 specifies. A different account
   never installs or inherits journals. Write a normal supported version3 target
   vault, consuming the Google-bearing version4 evidence IN that atomic
   binding/grant commit. Operations stay byte-identical and are not read.
5. Publish the resulting descriptor through the recovery procedure below before
   reporting success. Expired access/live refresh is installed first; no extra
   login-time refresh is invented. Subsequent explicit T08 reads use T06 policy.

Before dispatch and installation, recheck source identity, cancellation and the
original challenge deadline (`now >= expiresAt` is expired); no rounded or
renewed deadline. Uncertain transport/response failures retain exact version4
evidence for explicit bounded recovery. Definite rejection, cancellation or
expiry restores the exact prior vault and removes temporary Google material,
after owned network/storage work safely settles. No automatic predecessor
refresh, logout, journal replay or account deletion follows. A crash cannot
promise timed physical erasure while no process runs: the next trusted login
entry must clear expired temporary exchange data before further work.

Once a durable install begins, cancellation awaits settlement and may suppress
the success report, but never restores predecessor bytes over a committed grant.
Storage ambiguity/corrupt/foreign state stops with private evidence preserved;
do not mask it by cleanup. Explicit cancellation cannot retract an exchange
already committed at the backend; an unknown service session is not claimed
revoked. Resume after the two-send bound cannot dispatch again; expiry or explicit
cancellation clears the temporary credential before a new foreground attempt.

## Descriptor publication and crash recovery

A descriptor rename and T04 binding transition are not one transaction. Use a
small credential-free, protected write-ahead metadata receipt at the fixed
`<bindingDescriptorPath>.pending` path:

```text
{ version: 1, kind: "provision" | "install", transitionId: <local UUID>,
  from: <source binding or null for provision>, to: <exact target binding> }
```

Maximum 4096 UTF-8 bytes; exact keys and private access rules. Receipt creation
is exclusive, never overwrites existing evidence, and is durable BEFORE T04
provision/transition. For install, prepare it only after service grant validation;
target keeps origin/profile UUID and advances generation exactly as T04 requires.
No Google token, service grant, response bytes or private operation payload in it.
Hold T04 exclusive ownership through descriptor publication whenever acquired.
Concurrent setup/login/recovery encountering a pending receipt must reconcile
explicitly or fail; it cannot start a second transition.

Order: durable receipt -> T04 provision/atomic install -> durable descriptor
replacement -> durable receipt removal -> close owner -> success. Use private
exclusive temporary files, file fsync, atomic rename and directory fsync, with
T08-style no-link/owner/identity checks. Never overwrite an unexpected descriptor.
This is a recoverable sequence, not a claim of cross-file atomicity.

On explicit `recover`, validate the receipt/config/descriptor relationship first.
Use only its exact source/target candidates with T04's authenticated open/fence
checks; no discovery, generation guessing or account inference. One candidate
may be attempted after the other ONLY for definitive binding/generation mismatch,
never after ownership, key, IO, fence, corruption or commit ambiguity. Once open:

- Verified target binding and expected supported vault: publish/confirm the exact
  target descriptor and remove the receipt. This needs no Google credential or
  challenge replay, even if the challenge has since expired.
- Verified source binding with intact version4 evidence, or a supported prior
  vault after acknowledged cancellation/expiry cleanup: installation did not
  advance; restore/confirm the source descriptor and clear only the metadata
  receipt. Any remaining exchange evidence is subject to explicit
  resume/cancel/expiry. Normal cancellation removes a prepared receipt only after
  the source restore is acknowledged and no transition is in flight.
- Provision receipt without an authenticated target, incompatible state or any
  ambiguous observation: stop, preserve evidence, require bounded coordinator
  review. Never reprovision/reset merely because a descriptor is absent.

Setup writes its receipt before provisioning; partial T04 provisioning retains
T04's existing fail-closed behavior. Fresh setup is allowed only when all required
locations and descriptor/receipt state meet T04's new-profile preconditions.
T08 itself remains read-only and never performs this reconciliation. Future T12
generation transitions must use the same publication protocol or explicitly
supersede it in their own contract.

## Temporary browser helper

Reserve the exact configured port on `127.0.0.1` and `::1` (IPv6-only socket),
with both binds required for this supported baseline. Failure closes all acquired
listeners; no wildcard bind, external address, random port or numeric-IP browser
origin fallback. Obtain the challenge only after listener reservation succeeds;
serve the active page only after challenge creation. Open the canonical localhost
page with a fixed platform browser launcher and argument array, never a shell
command or caller-supplied executable. Unsupported launch/browser fails with safe
guidance and cleanup, without token paste.

Serve only the active page and fixed same-origin credential/cancel endpoints.
GET navigation may omit Origin; require exact single Host on every request and
validate Origin if supplied. All state-changing requests require exact single
Origin, exact Host, attempt-bound unpredictable 256-bit CSRF, JSON media type and
an active unexpired attempt. Reject duplicate headers/keys, foreign/null/missing
callback Origin, unsolicited/stale/duplicate callbacks and unsupported methods.
Atomically consume callback admission before awaits. No permissive CORS or
cross-origin preflight approval. Enforce bounded headers/body/read time and
connections; credential body cannot exceed accepted transport `maxRequestBytes`.
Freeze numeric local HTTP limits in the S2 work order before source work.

Initialize GIS once with the captured web client ID, backend nonce, popup callback
and automatic selection disabled; render a button requiring user activation.
No One Tap, redirect login or implicit prompt. The browser posts the Google
credential and CSRF in the body, never the URL or browser storage. Backend
signature/audience/nonce/expiry validation remains authoritative; merely decoding
the ID token supplies no local account authority.

Use no-store responses, anti-framing policy and a narrowly scoped CSP allowing
only the application's own page code and required GIS resources. No analytics,
other scripts or backend calls from JavaScript; service grants remain server-side.
Popup-compatible opener/referrer policies follow the official GIS requirements,
with exact headers frozen in S2 and live interoperability still owned by T19.
Credential references/page state are dropped after submission; no localStorage,
sessionStorage, cookies or service worker retention of credentials.

Success/cancel/expiry fences callbacks, stops listeners/connections, cancels owned
network and awaits already-started persistence before release. Provide a visible
Cancel action and CLI SIGINT/SIGTERM handling; a closed tab or Google popup is
not reliable cancellation evidence, so the backend deadline still ends waiting.
Browser responses are fixed safe status only; cancellation never promises that
already-sent service work was undone.

Google references checked 2026-10-15: [web setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
requires authorized JavaScript origins, the hosted GIS client, and compatible
CSP/opener policy; [JavaScript reference](https://developers.google.com/identity/gsi/web/reference/js-reference)
documents nonce, popup callback and button initialization. Google additionally
advises registering bare localhost for local development. That deployment advice
does not broaden the helper's sole accepted `http://localhost:<port>` origin.
These references support API choices, not a claim of tested browser behavior.

## Proposed slices and acceptance

Three slices separate the durable auth boundary, browser attack surface and
delivered operator workflow. Two would concentrate persistence and browser
security into one large implementation/review window. More are unnecessary
unless a concrete blocker emerges. Target 60–90-minute work windows, checkpoint
at 90 minutes and stop safely at two hours with an honest partial handoff; these
are outcomes, not promises of single-session acceptance.

| Slice | Reviewable outcome and dependency | Proportional acceptance |
| --- | --- | --- |
| **S1 — Protected login transaction and binding publication** | Version4 exchange evidence, exact bounded exchange/recovery, atomic initial/same-account install, setup/recovery composition and descriptor writer. Requires accepted T04/T05/T06/T08 contracts. No browser or delivered CLI yet. | Focused state/identity validation; real isolated Secret Service/ext4 and private-CA HTTPS success; uncertain exchange exact replay; initial and same-account retention; different-account refusal; representative commit/publication interruption and expiry/cancel cleanup. Verify normal target vault opens under existing T06/T08 and pending v4 fails closed. |
| **S2 — Secured loopback GIS helper** | Actual loopback HTTP helper/page and lifecycle, composed with accepted S1. No model route or production provider override. | Real loopback requests for Host/Origin/CSRF rejection, callback uniqueness/staleness, occupied port, listener scope and cancel/expiry cleanup. Controlled provider checks nonce/audience failure propagation; inspect page initialization against public requirements. Real Google/browser deferred to T19. |
| **S3 — Trusted CLI delivery and parent integration** | Executable setup/login/resume/cancel/recover commands, fixed browser-launch integration, safe diagnostics, operator guide and T08 reopen/read workflow. Requires accepted S1/S2. | Launch compiled CLI with isolated controlled dependencies; fresh setup/login then actual SDK stdio read, same-account re-login, resume/cancel and metadata-recovery command paths. Check competing owner, usage errors, signals/cleanup, empty stdout and no credential exposure. Final complete active T07 suite plus relevant unchanged regressions and clean locked build/install reproduction. |

Before each implementation assignment, the Coordinator freezes a concise work
order with exact additive trusted API/types and record invariants, paths/ownership,
permitted commands/environment, frozen artifact relay, active nonempty test-file
selection, checks and stop conditions. This is finalization of this design, not
another broad architecture/QA proposal round. S1 must include its receipt/vault
schemas and definite-versus-ambiguous recovery error handling; S2 must include
HTTP limits and page security headers; S3 must include launcher support/exit
behavior. Each slice is separately assigned and accepted; no automatic successor.

Developer owns scoped production/auth/runtime helper/CLI changes and compatibility
notes; QA owns independent specification-derived tests/evidence; Coordinator
owns shared interfaces/status/review. No production reads by QA or QA-source
reads by Developer. Shared config/manifest ownership remains exclusive; new
dependencies or relaxed compiler settings require review, and none are proposed.
Run early role-scoped static checks and focused repairs. Reuse simple accepted
fixtures; no generalized browser/interception framework or repeated dependency
fault campaign. Final owning coverage includes every distinct A01/A02/A11 risk,
without testing every combination at every layer. Preserve original failures,
frozen identities, full safe output and cleanup results. No skips counted passed.

## External inputs, stop conditions and next step

Controlled isolated provider/TLS/storage facilities must be provisioned and
reviewed before a named execution relay. Real backend origin, Google public web
client ID/audience, registered exact port/origin, supported browser and private
secret facility remain external prerequisites for T19, recorded as placeholders.
Their absence does not block specification-derived isolated T07 implementation.

Stop affected work for shared-contract conflicts, uncertain storage authority,
missing keys/foreign or corrupt bindings, inability to preserve predecessor
evidence, incompatible T08 metadata behavior, new dependency needs, or absent
isolated facilities. Do not redefine contracts, reset profiles, follow ambient
personal services or use live credentials to unblock it. Packaging, genuine
backend/Google/Android/Pi gates and release remain unverified.

Next: turn **T07-S1** into its bounded decision-ready work order, then obtain its
separate implementation assignment. This design completes the requested planning;
T07 implementation and all successor tasks remain unassigned.
