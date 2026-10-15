# T07-S2 acceptance — 2026-10-15

S2 is complete under the user's separate assignment after S1. Direct primary
implementation used bounded page/review and specification-derived test helpers;
the user's historical QA/Developer/Herdr override continues. No S3 work started.
[Work order](../tasks/t07-s2-work-order.md), [design](../decisions/t07-general-design-and-slices.md)
and [ADR](../decisions/t07-implementation-adr.md) define this scoped claim.

## Delivered behavior

New browser.ts/page.ts and additive login entry export implement dual fixed-port
loopback reservation before challenge creation, strict HTTP admission, a nonce-
protected explicit GIS sign-in page, Cancel, original-deadline expiry and owned
cleanup. No package/dependency/compiler/config change, launcher, CLI, model route,
creation or live provider bypass. S1 production code is unchanged except the
additive entry export/comment. The S1 configured integration fixture was extracted
without behavioral changes into a shared small helper for reuse by S2 tests.

HTTP checks enforce exact single Host/Origin, canonical256-bit CSRF, duplicate-free
bounded JSON, exact routes/methods/framing, original five-second header+body deadline,
8192 header bytes/32 headers, min65536-or-transport body cap,16 live connections,
and fixed safe responses/security headers. Callback admission precedes awaits.
Unexpected failures close S1 preserving uncertain exchange; explicit cancel/expiry
invokes cancellation and awaits persistence. Completion waits for sockets/listeners
and S1 close. No grant/account/backend error body reaches the browser.

The page initializes GIS once with captured client ID/backend nonce, popup mode
and auto_select:false, renders a button, supports Cancel during submission and
drops local token/body references after dispatch. It escapes JSON/nonce attributes
and permits only own nonce-authorized code/style plus required hosted GIS URLs.
Official [setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)
and [JS reference](https://developers.google.com/identity/gsi/web/reference/js-reference)
were checked2026-10-15. Controlled DOM/GIS tests establish selected page behavior;
they do not establish browser CSP enforcement or actual Google interoperability.

## Observed checks

Every command pins provisioned Node24.21.0/npm11.19.0 via T01_NODE_HOME/PATH.
Only owned literal-loopback HTTP and explicitly isolated private-CA HTTPS,
Secret Service/D-Bus, disposable home/XDG and ext4 profiles were used. The reused
facility qualifies synthetic libsecret store/read/clear; owned provider/bus are
terminated/reaped and disposable integration scopes removed. No personal/live
credentials/services, .pi edits, product writes, staging or commits.

| Check | Result |
| --- | --- |
| Root typecheck, production ESLint/format and clean build | PASS |
| Complete scoped login-test ESLint/Prettier | PASS |
| Complete S2 owning scope, three files | 20/20 PASS; zero failures/pending |
| Final selected batch,25 files | 204/204 PASS; zero failures/pending |
| Reused runner's final unchanged T04 provider batch | 9/9 PASS; zero failures/pending |
| Clean source snapshot npm ci --ignore-scripts plus four production checks | PASS; zero install vulnerabilities reported |
| Root/companion compiled output comparison | 144/144 byte-identical |
| Clean complete T07 S1/S2 replay, seven files | 67/67 PASS; zero failures/pending |
| Frozen source/test/contract/config/compatibility identities | 327 SHA-256 hashes stable |

[Actual active file selection](t07-s2-active-files.json) contains all seven T07
files, all16 T08 runtime/protocol/stdio files, foundation package-contract/inert
imports and the provider file. The reused runner executes the provider file in
a separate final batch, including when it was absent from the initial25-file
selection; the recorded manifest includes that actually executed extra file.
Total213 passing checks across two batches:20 S2,47 unchanged S1,82 T08,55
foundation and9 provider. This is a bounded selected regression claim, not the
whole repository/parked T02 or all historical T06 suites.

Twelve real HTTP tests cover both binds/canonical URL/security headers; Host/Origin/
CSRF/method/path rejection; missing Host and parser overflow; strict body/framing;
stale and duplicate callbacks; cancellation while submitting; uncertain failure
preservation; occupied IPv6 port with partial release/no challenge; completion
awaiting close; expiry/abort; global connections and shared header/body trickle
deadline. Four controlled page execution tests cover one GIS initialization,
explicit button/no prompt, one local callback serialization, cancellation during
submission, safe load/fetch guidance and escaping/no storage.

Four real S2->S1 persistence/HTTPS integration checks establish successful callback
installation followed by T08 reads, backend-controlled nonce and audience rejection
without installing account authority, and uncertain exchange preservation followed
by exact explicit resume. These synthetic backend rejections do not implement or
verify Google's signature/audience/nonce checks themselves. Live interoperability
remains T19. Existing S1 checks preserve its atomicity/recovery boundary.

## Failures and repairs retained

- First focused HTTP/page run:14/16 passed. One oracle incorrectly required
  returned binding object identity; corrected to public value equality. One
  implementation branch destroyed parser-overflow sockets without the required
  fixed431 response; protected raw parser responses repaired it. Expanded cases
  remain in the same12-test HTTP scope. Later runs16/16 PASS.
- Review found independently reset header/body timers, an unexpected listener
  error selecting cancellation and a multibyte CSRF comparison length mismatch.
  Shared read deadlines, uncertainty-preserving S1 close, and canonical base64url
  validation repaired them. The trickle test spans both headers and body.
- Review found Node's implicit missing-Host rejection bypassed security headers.
  Disabled only that implicit rejection; explicit exact-Host refusal remains and
  its fixed403/security headers are checked. Parser/drop responses are protected.
- Early lint found one unused import and a useless assignment while dropping
  token references. Corrected using immediate request-byte scrubbing and removal
  of the parsed credential reference; no lint/compiler rule was relaxed.
- Initial combined configured integration:6 S1 passes,4 S2 failures from a test
  helper import named page instead of pageCsrf. Corrected the import and captured
  identical configured/helper settings;4/4 S2 integration then passed. No product
  contract/assertion was weakened and no failed file was excluded.

## Remaining boundary

S2 supplies trusted composition, not a delivered login command. S3 must capture
the same settings for S1/helper, integrate fixed platform launching, setup/login/
resume/cancel/recover commands, signal handling and operator guidance. Genuine
Google/browser, deployed backend, named host, Android, packaging and release gates
remain unverified. T06 historical omissions, parked T02, retired T13/T14 and the
config-only creation policy remain unchanged. All S2 work is closed; no successor
or live-service grant follows.
