# T07-S2 — Secured loopback GIS helper

Status: COMPLETE, user-assigned and verified on 2026-10-15. See
[acceptance evidence](../evidence/t07-s2-review.md). Direct primary
implementation with optional bounded helpers; the user's prior override of
historical QA/Developer/Herdr relays continues. S3 is not assigned.

## Outcome and authority

Implement S2 of the [T07 design](../decisions/t07-general-design-and-slices.md)
over [accepted S1](../evidence/t07-s1-review.md). Shared MCP draft0.2/backend v1,
T04/T05/T06/T08 and S1 contracts remain unchanged. No delivered CLI, browser
launcher, model tool, provider override, routine creation or genuine Google/live
backend execution. S3 owns fixed browser launching and process signal wiring;
S2 accepts an AbortSignal and returns the canonical URL to its trusted caller.

## Additive trusted API and lifecycle

`startBrowserLoginHelper({transaction,settings,maxRequestBytes,signal})` is exported
from the inert login entry. transaction is the accepted S1 LoginTransaction;
settings is strict S1 LoginSettings; maxRequestBytes is the resolved accepted T05
request budget (integer64..16777216); signal is an AbortSignal. No other options.
Calling explicitly transfers transaction lifecycle responsibility to the helper.
The trusted composition caller must supply the same settings captured for S1;
S3 will read/capture this explicit configuration for both components together.

It reserves BOTH 127.0.0.1 and ::1 (ipv6Only) at the configured fixed port before
transaction.start. Partial bind failure closes acquired listeners and transaction,
without a challenge. Once ready, return a frozen helper with url (exact canonical
origin plus /), completion Promise<StorageBinding>, cancel() and close(). It never
returns credentials. completion settles only after listener/socket cleanup and
transaction.close, including persistence already begun. Attach an internal reject
observer so a caller can await completion later without unhandled rejection.

One challenge/attempt, one callback admission synchronously before awaits. Invalid
requests do not consume admission. Success/error fences page and callbacks and
stops listeners. Error closes S1 without cancelling uncertain protected exchange;
explicit resume remains an S1 trusted action. Cancel/expiry fences callbacks,
aborts S1 work via transaction.cancel, awaits it and closes. Cancellation cannot
undo backend work/committed local installation. close is idempotent foreground
cancellation while active; after settled it only waits cleanup. No global signal
handlers, worker, ambient settings or automatic retries. A closed tab/popup is
not cancellation evidence. Backend deadline ends the attempt; no extension.

## HTTP boundary and fixed limits

Only GET /, POST /credential and POST /cancel. Exact origin-form paths, no query,
absolute targets or alternate routes. No CORS/preflight approval, redirects,
cookie or credential-bearing URL. Fixed safe response text only.

- Both listeners bind loopback only. Global maximum16 live connections; excess
  sockets are destroyed. Maximum4 requests per socket, keepalive1000ms.
- Maximum8192 header bytes and32 headers. Reject every duplicated header name
  (case-insensitive), including Host/Origin/Content-Type; Node parser rejects
  ambiguous framing. Reject Transfer-Encoding for the bounded POST interface.
- Header/read/whole-request deadline5000ms; socket idle timeout5000ms. Independent
  whole-request timer bounds slow trickles; cancellation/success destroys owned
  outstanding sockets after allowing the fixed terminal response to flush.
- Callback body limit min(65536,maxRequestBytes), inclusive, checked before and
  during reads. Reject oversized declared Content-Length before reading. POSTs
  require one canonical nonnegative decimal Content-Length and exact
  Content-Type application/json (no parameters). Page fetch sends this content
  type and the browser supplies Content-Length. Strict UTF-8/no BOM, duplicate-free
  JSON and exact keys. GET bodies are rejected.
- Exact single Host localhost:<configured port> on every request. GET Origin may
  be absent; if present it must equal settings.browserOrigin. POST Origin is
  required and exact; foreign/null/missing origins fail. No numeric-IP fallback.
- POST /credential body exactly {csrf,idToken}; /cancel exactly {csrf}. csrf is a
  per-attempt cryptographically random32-byte base64url string, compared safely.
  Nonempty opaque credential, no decoding as account authority. Recheck active
  attempt and original expiry after body read and before synchronous admission.
  Cancel is allowed during admitted submission; subsequent credential calls fail.

Invalid requests use fixed400/403/404/405/408/409/413/415/431/503 responses as
appropriate, Connection:close and no private error detail. Credential response
is fixed200 success or fixed400 failure; cancellation response fixed200. Helpers
never expose bindings/grants/backend errors to the browser.

## Page and security headers

All responses: Cache-Control:no-store; Pragma:no-cache; X-Content-Type-Options:
nosniff; X-Frame-Options:DENY; Cross-Origin-Opener-Policy:same-origin-allow-popups;
Referrer-Policy:no-referrer-when-downgrade (Google's localhost HTTP guidance).
No Access-Control-Allow-* headers. Content-Security-Policy:

```text
default-src 'none'; script-src 'nonce-<random>' https://accounts.google.com/gsi/client; style-src 'nonce-<random>' https://accounts.google.com/gsi/style; connect-src 'self' https://accounts.google.com/gsi/; frame-src https://accounts.google.com/gsi/; img-src https://accounts.google.com/gsi/; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
```

The script/style nonce is independent of CSRF and32 random bytes. Only required
hosted GIS script plus own nonce-authorized page code/style. Escape embedded values
as JSON and HTML attribute text to prevent closing script injection. Initialize
GIS once, captured client_id and backend nonce, ux_mode popup, auto_select:false,
cancel_on_tap_outside:false; renderButton requires explicit user action. No prompt(),
One Tap, redirect flow, analytics, browser storage, cookies or service worker.
Credential callback posts only to /credential; visible Cancel posts only /cancel.
Drop credential references immediately after request serialization/dispatch;
disable sign-in after admission. Show fixed success/failure/cancel guidance. Google
load failure gives safe setup guidance, never token paste.

Official setup and JS reference were checked again2026-10-15. This supports page
API/header choices, not browser interoperability. Real Google/browser remains T19.

## Edits, execution and proportional acceptance

Own additive src/login/browser.ts/page.ts and login entry export, focused new
test/login/browser-*.test.mjs/helpers if needed, work order/ADR/status/evidence.
No dependencies or manifest/compiler changes. Preserve S1 sources/tests and old
evidence unless a concrete integration defect requires a focused repair.

Pin provisioned Node24.21.0/npm11.19.0 on every command. Allowed locked install
without scripts, production type/lint/format/build, focused tests, final complete
S2 suite plus S1 and relevant unchanged regressions. Only owned literal-loopback
HTTP and explicitly isolated storage/private-CA HTTPS; no personal services or
real IDs/tokens/credentials. No .pi edits/staging/commits or product writes.

Small real HTTP tests cover exact Host/Origin/CSRF, stale/duplicate callback,
partial occupied-port release/bind scope, bounded input/slow read/connections,
cancel/expiry and cleanup; use simple trusted S1 capability fixtures for HTTP
admission. Exercise actual S1+isolated HTTPS/provider storage for success and
controlled nonce/audience rejection propagation; inspect page setup with a small
controlled DOM/GIS execution or equivalent precise public-behavior oracle. No
generalized browser/interception framework or exhaustive fault matrix.
Final S2 and S1 suites, proportional unchanged regressions, clean locked build
reproduction and honest failure/repair evidence. Stop affected work on shared
contract conflict, missing IPv6/isolated facilities, storage ambiguity or new
dependency needs. Missing facilities fail/block; never skip or count unrun checks
as passing. Finish S2 only, with bounded handoff; no automatic S3.
