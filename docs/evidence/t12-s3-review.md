# T12-S3 — Account-status proof/cleanup acceptance

**Disposition:** accepted/closed, 2026-10-15. Primary-agent specification/source/test
review under the [S3 work order](../tasks/t12-s3-work-order.md) and
[proportional testing](../decisions/proportional-testing-policy.md).
33/33 new S3+58/58 unchanged S1/S2+206/206 relevant unchanged regressions=
**297/297 in24 exact files**, zero failure/skip/pending/todo. Four production
checks, scoped syntax/lint/format, bounded silent import/signal/forgery smoke and
owned actual isolated provider/ext4/private-CA HTTPS/dual-loopback/CLI cleanup PASS.
All535 source/test/build hashes stable throughout both final batches, including192
emitted files. [Inventory](t12-s3-artifact-inventory.json),
[handoff](../handoffs/t12-s3.md), [API/provenance notes](../decisions/t12-account-status-boundary.md).

## Specification and source review

The shared backend account lifecycle/OpenAPI require fresh purpose-bound Google
proof for the captured account; only successful matching deleted receipt authorizes
local erasure. Generic401/404, offline/lost response and bearer failure do not.
The reviewed implementation captures the protected descriptor/actual owner binding,
including signed-out cached account, never a caller-selected account/token/purpose.
It dispatches accountStatus challenge and same-origin status only, with no bearer,
auth/resource key, exchange/signup/export/delete or account rebinding.

Successful active and deleted bodies require exact duplicate-free shared shapes,
canonical matching account and valid shared UTC millisecond receipt timestamps;
purgeBy must equal deletedAt+24h. Historical valid receipts have no local expiry.
The client never decodes Google claims; backend HTTPS is the proof verifier.
Purpose-specific maxAttempts1 is explicit. Original trusted budgets are validated
before applying that cap; the unchanged T05 control-route cap also prevents replay.
Lost/failed proof ends the attempt and requires fresh challenge/foreground Google
verification. No Google-token vault/receipt journal or status resume/polling exists.

Only the completed verified request mints an empty frozen object recorded in a
module-private WeakMap. The private entry captures exact origin/account/session/
profile generation, actual owner/metadata and current-evidence verifier. Public
outcome contains state only; no receipt/capability or account identifiers escape.
Cleanup entry rejects forged raw JSON/objects/booleans/proxies before IO, consumes
actual provenance once, rechecks binding/storage/descriptor, then calls the shared
accepted S2 owned removal/publication helper. That helper preserves external-fence,
file/key erasure, metadata minimization and recovery ordering. Delayed A cannot erase
advanced session/new generation/B. Separate profile/key remains unchanged.

The existing secured callback implementation has two typed purpose-specific entries
and one private shared implementation, with no generalized auth strategies or new
configuration grammar. Original login root exports and sign-in semantics remain.
Both purposes retain dual-loopback reservation before challenge, exact Host/Origin/
CSRF, bounded IO/expiry, one admitted callback, fixed GIS popup/no auto-select,
nonce/script escaping/CSP and listener/socket cleanup. Status page/CLI copy describes
verification and matching local cleanup without exposing private data or claiming
backend deletion. No token paste, arbitrary launcher or status replay arguments.
Signals before preparation prevent effects; after verified cleanup preparation,
durable erasure/publication/release settle before interruption is reported.

Changed production: new lifecycle/account-status.ts and owned-removal.ts; narrow
lifecycle/index.ts S2 helper reuse; login/browser.ts/page.ts/configured.ts/errors.ts
and CLI main. Existing protected config/login-settings validation is reused through
internal helpers. No HTTP/storage production, shared-contract, manifest/lockfile,
compiler/dependency, .pi, staging/commit or permission-policy changes. Three existing
fixture files add only optional status/challenge replies and actual-holder read/
owner-export seams. No previous test assertion is changed. Baseline hashes preserve
unrelated preexisting work and completed S1/S2 evidence.

## Verification and original development observations

Provisioned Node24.21.0/npm11.19.0 was resolved before every command; no system
replacement, global packages, install hooks or personal facilities. Early typecheck
passed, then lint rejected an unused attempt to overwrite the immutable token
parameter. Removed the ineffective assignment; the encoded transient body is cleared
on settlement, with no promise of physical runtime/string erasure. A subsequent
CLI typecheck caught a union of completion promises in the shared launcher path;
explicit async flattening preserves both typed outcomes without compiler relaxation.
No behavior ran against either incomplete target; successful build preceded tests.

First focused actual status + unchanged browser-page/HTTP run33/33 PASS. It covers
purpose/nonce/exact body/no bearer or key, active exact-byte preservation, signed-out
matching deletion with separate-profile survival, wrong account/calendar/purge/extra/
duplicate response, wrong-purpose401/foreign404, response loss/timeout one-send with
fresh-challenge restart, callback Host/Origin/CSRF/duplicate guards, expired challenge,
port reservation, cancellation, stale session and new-profile/account races, and
verified key-erasure crash followed by S2 recovery without another proof/token journal.

Focused unit/compiled CLI16/16 PASS: closed grammar/authority forgery/aborted options/
disclosure output, active/deleted safe reporting, launcher failure/SIGTERM preservation
and signal after verified removal preparation settling fence/key/metadata cleanup.
These are specification-derived public oracles with actual isolated components,
not mocks agreeing with private implementation. No behavioral failures or skipped
cases were hidden; no exhaustive cross-product or new harness framework was added.

Final main296/296 in23 files plus terminal S2 locked-provider1/1 in a separate fresh
bus/keyring scope =297/297 in24 files. This includes every active T12 S1–S3 owning,
all99 T07 login/browser/metadata/CLI checks,68 affected T05 validation/hook/retry
checks,30 T06 lifecycle checks and9 configured-stdio checks. Every assertion passed;
no skipped/pending/todo and no unhandled or owned-cleanup failure reported.

Both runners qualified actual private libsecret store/read/clear, ext4 and private-CA
loopback HTTPS, with disposable HOME/XDG. Provider/bus terminated and were reaped;
owned private fixture scopes removed in both batches. Synthetic Google tokens,
seeded recovery journals and controlled HTTPS responses prove local integration only.
No personal bus, real Google/browser/backend/DB/Android, live credentials or raw
private bodies in repo/evidence. Final535 relative input/output hashes match before/
after both batches and one another; includes192 emitted files. TypeScript5.9.3,
Vitest4.1.11. Bounded5000ms silent child import/export/aborted-call/forgery smoke PASS;
this plus source review is not comprehensive runtime interception or an OS sandbox.

## Commands and scope

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
node_modules/.bin/eslint test/unit/t12 test/fault/t12 test/login/configured-helpers.mjs
node_modules/.bin/prettier --check test/unit/t12 test/fault/t12 test/login/configured-helpers.mjs
node --check test/unit/t12/s3-boundaries.test.mjs
node --check test/fault/t12/s3-status.test.mjs
node --check test/fault/t12/s3-cli.test.mjs
node --check test/fault/t12/s3-helpers.mjs
node --check test/fault/t12/s2-helpers.mjs
node --check test/fault/t12/s2-holder.mjs
node --check test/login/configured-helpers.mjs
```

Fresh qualified runners execute `node node_modules/vitest/vitest.mjs run
--no-file-parallelism <exact selected files> --reporter=json --outputFile=<private
result>`. The inventory records exact nonempty selections, per-file counts and
relative stable hashes. Main includes every T12 S1–S3 owning except its terminal
locked file, all nine test/login files and six named T05/T06/stdio regressions in
the work order. The complete locked file runs in its own fresh scope and counts
in acceptance. Build/install never overlaps tests against their execution target.
Clean locked integrated parent replay remains S4 rather than a per-slice claim.

Final documentation audit resolved366 local targets/12 anchors across
12 changed documentation files, with no trailing whitespace. Git diff whitespace
check PASS. Final535 source/test/emitted hashes still match acceptance; all baseline
paths outside the authorized source/helper/docs changes remain unchanged.

## Disposition and limits

S3 closed; parent T12 incomplete. S4 operator flow/integrated acceptance is ready/
unassigned, T15 separate/unassigned and product creation unavailable. Primary review
is not independent security/release certification. Preserve T06 historical omissions,
T04 whole-external-state restore/media/runtime/backups/same-UID limits and fail-closed
incomplete reconciliation provisioning. Real Google/backend admission/idempotency/
DB/sync/Android/named-host and mandatory independent/external release gates remain.
No successor, live action, staging, commit, publication or release follows.
