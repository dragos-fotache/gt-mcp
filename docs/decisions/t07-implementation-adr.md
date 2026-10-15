# T07 — Trusted foreground login implementation

The user assigned S1 on 2026-10-15, superseding historical role/Herdr relays for
this assignment. [The work order](../tasks/t07-s1-work-order.md) and
[general design](t07-general-design-and-slices.md) define the trusted boundary.

The additive, inert `src/login/index.ts` entry provides a caller-owned transaction
and explicit configured setup/login/recovery composition. Existing T04/T05/T06/T08
public interfaces, strict config and supported vault formats remain unchanged.
Configured composition uses only explicit protected paths and the selected private
Secret Service bus. It has no provider/sender override. Direct composition accepts
the existing T04 owner and T05 private-CA config for isolated integration.

An admitted credential is serialized once with its challenge ID. A strict encrypted
v4 envelope retains the exact predecessor vault and exchange body/key, captured
settings/deadline, send reservations and retry instant. Empty prior vault is
canonical empty base64; the accepted refresh-body decoder requires nonempty data,
so a separate predecessor decoder handles that case. Each network handoff follows
an acknowledged durable reservation. Resume is explicit, uses identical bytes/key
and allows at most the second send. Retry-After is never shortened to the transport
backoff cap. Expiry precision follows T06; unsupported submilliseconds fail safely.

T06 private grant/vault codecs validate service authority and preserve pending
refresh/superseded evidence. A supported v3 vault consumes temporary Google material
within one T04 account bind or generation advance. Expired access/live refresh is
installable without login-time refresh. Different-account grants restore the exact
predecessor and never install. Operations remain opaque to login.

Metadata uses an exclusive credential-free write-ahead receipt, then the T04
transition, atomic descriptor replacement and durable receipt removal. The metadata
capability pins ancestry and file identities, operates through a pinned parent fd,
requires private single-link files and a user-owned 0700 parent, uses exclusive
temporary files, and fsyncs files/directories. Detected substitution or uncertain
IO fences the capability. This is recoverable publication, not a cross-file atomic
transaction or protection from privileged same-user interference.

Explicit recovery authenticates only receipt target/source candidates. It tries
source only after definitive target binding/generation mismatch; key, corruption,
ownership, IO and fence failures preserve evidence. A provision receipt cannot
authorize reprovisioning. Setup relies on T04's safe new-profile preconditions and
generates a fresh profile UUID; it cannot adopt an existing profile.

Cancellation aborts owned network, awaits begun persistence and restores prior bytes
only while the source remains authoritative. A begun install settles before
publication and release, including cancellation. Ambiguous storage/publication
fences the facade. Close preserves unresolved durable v4 for explicit resume,
drops local credential references and closes only a configured-composition-owned
profile; cancellation through a closed facade is refused. JavaScript reference
release/byte scrubbing is not a guarantee of physical memory or disk erasure.

Verification uses selective exact-byte/state boundary checks and real isolated
Secret Service/ext4/private-CA HTTPS integration, including T08 reopen/read. See
[S1 acceptance evidence](../evidence/t07-s1-review.md) for actual results and repairs.
S1 acceptance made no browser helper, delivered CLI, live Google/backend, named
host, Android, routine creation or release claim. The subsequent S2 assignment
and boundary follow below; S3 remains unassigned.

## S2 secured loopback helper

The subsequent user assignment activates [S2](../tasks/t07-s2-work-order.md).
The additive startBrowserLoginHelper entry accepts the same trusted settings as
its S1 transaction and assumes responsibility for transaction close. It reserves
both IPv4 and IPv6-only localhost sockets at the exact fixed port before S1 starts.
No launcher, executable CLI, ambient provider or model-facing route is introduced.

Strict Host/Origin, independent256-bit CSRF, exact bounded JSON and synchronous
one-callback admission protect three fixed routes. Header/body reads share one
five-second deadline from accepted connection; socket idle and parser timers
provide additional bounds. The helper caps headers, body bytes, live connections
and requests per socket. Missing Host reaches the explicit protected refusal;
parser overflow/error and dropped-request responses use fixed sanitized text and
the same security headers. Unexpected listener failure closes S1 while preserving
uncertain exchange; only explicit cancellation/expiry selects S1 cancellation.
Completion waits for owned network/listeners and S1 persistence/close settlement.

The pure page renderer escapes embedded JSON and nonce attributes, uses a separate
script/style nonce, initializes GIS once with captured client ID/backend nonce,
renders an explicit button and supports Cancel during submission. Only hosted GIS
and own page code are allowed by the frozen CSP. No token URL/storage, analytics,
decoded account claims, One Tap or implicit prompt. Service grants remain private.

Header/API choices were checked against official [GIS setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
and [JS reference](https://developers.google.com/identity/gsi/web/reference/js-reference)
on2026-10-15: the localhost HTTP referrer policy and popup-compatible opener policy
are explicit. Controlled DOM/GIS execution checks page behavior without claiming
actual browser CSP enforcement or Google interoperability. T19 still owns those
live gates. [S2 evidence](../evidence/t07-s2-review.md) records observed checks.

## S3 trusted CLI and single-capture composition

The user separately assigned [S3](../tasks/t07-s3-work-order.md). New cli/main.ts
and cli/launcher.ts deliver the compiled node-invoked operator entry. The legacy
inert CLI entry and package/bin/build configuration are unchanged; T18 owns final
packaging. Main imports are inert and direct execution uses import.meta.main and
process.exitCode only after awaited owned cleanup.

A closed command grammar rejects invalid flags/paths before private IO or signal
registration. Help and all statuses use fixed stderr text with empty stdout.
Setup/fresh login disclose potential indefinite recovery retention and AI host/
model transcript exposure. Storage/recovery failures take exit3 precedence over
cancellation; other fixed codes follow the S3 work order. No native exception,
selected path, client/account ID or credential reaches CLI output.

The existing configured login composition was factored internally to return one
validated settings/budget/owned-transaction capture. The additive configured
browser factory passes exactly that capture to S2; no second login-settings read
or production provider override. Existing S1 transaction behavior is preserved.

The production launcher accepts only canonical localhost page URLs, invokes fixed
/usr/bin/xdg-open with one argument and no shell, ignores BROWSER and uses a
desktop/home/XDG environment allowlist with fixed PATH. It checks Linux/display/
executable readiness, bounds launch acknowledgement to10s and terminates/reaps
only its child on abort/timeout with500ms escalation. Actual desktop launcher
success/timeout is selected behavior reviewed in source, not runtime-certified
by isolated tests. Google/browser interoperability remains T19.

Main registers SIGINT/SIGTERM only during valid execution, aborts active browser/
network work and awaits S1/S2 settlement/ownership release. Setup/recover cannot
be rolled back by signals; they settle before cancellation reporting. Once final
cleanup begins, new signals record cancellation without calling cancel on an
already-closing transaction. Existing cancellation is awaited and helper completion
is inspected for recovery ambiguity even after an original launcher failure.

The exported main accepts a trusted optional launcher function for isolated
compiled-main child-process verification. This is a library composition seam;
the executable guard supplies no override and no flag/environment/config can
select an executable or provider. Successful login tests use that capability to
drive owned local callback requests without opening a personal browser; direct
CLI subprocesses exercise setup/resume/cancel/recover/usage/headless failure.
An actual SDK stdio client reopens the installed session for reads.

See [operator guide](../login.md) and [S3 acceptance](../evidence/t07-s3-review.md)
for commands, observed results, retained failures and remaining release gates.
