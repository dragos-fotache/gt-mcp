# T06-S2 coordinator acceptance — c2 / t06-s2-f1

**Disposition: T06-S2 DONE, bounded internal acceptance. Parent T06 INCOMPLETE.**
All S2 source/build/target/fixture/relay/rerun windows CLOSED; Developer and QA HOLD
ALL actions. No S3, automatic successor/context renewal, product writes or release
permission. This closure supersedes historical opening/repair/relay grants without
changing frozen source/work-order bytes. [Handoff](../handoffs/t06-s2.md).

## Independent accepted evidence

- Frozen [257-file inventory](t06-s2-f1-artifact-inventory.json), production c2,
  independent QA r3 sources; SHA256
  `e7b415d54004550faec96791efef56252e27aa02073b0d0db39cbcabab173725`.
- [QA f1 execution](t06-s2-qa-f1-execution.md): exact S2 owning3files,40/40PASS;
  then unchanged regressions12files,129/129PASS (S1 owning51,T04unit54,T05hooks24).
  Both exit0,zero failures/skips/todos; each run once. Before/after checksum and
  all257hashes unchanged. Issued diagnostic fixtures/owned TLS settled; isolated
  HOME/TMPDIR empty and run root removed, no cleanup failure reported.
- Coordinator [clean locked-source reproduction](t06-s2-clean-source-snapshot-result.json)
  using [explicit allowlist procedure](t06-s2-clean-source-snapshot.py):161source
  inputs, fresh disposable HOME/XDG/temp/cache and empty npmrc; pinned
  npm ci --ignore-scripts, four production checks/build, EXACT owning40 +regressions129,
  scoped S2 QA lint/format ALLPASS/exit0. All96compiled files reproduce frozen bytes
  exactly; source hashes unchanged. Disposable scope removed successfully.
- Source inventory SHA256
  `8abbdbad1efa981af601c8e5835aa7da8c6133fc251bb8b7b57ed7ef34d64e80`.
  Final coordinator frozen verification257/257unchanged after clean proof/smoke.
- [Small isolated auth import smoke](t06-s2-import-smoke-result.json): exact six
  runtime exports and versions1/2, empty stderr, natural exit0 in121ms; HOME/temp
  unchanged/empty and removed,257stable hashes. [Procedure](t06-s2-import-smoke.py).
  Combined with production source audit; NOT comprehensive IO interception/OS isolation.
- Node24.21.0/npm11.19.0/Vitest4.1.11. No lifecycle hooks, dependency upgrades,
  ambient runtime/personal facility fallback. Clean install reported0vulnerabilities;
  upstream node-domexception deprecation/npm upgrade notice retained, no upgrade.

169tests is this explicit slice selection, NOT npm test/check or whole repository
acceptance. Foundation/T03 and full real-provider/transport campaigns were not
rerun here; accepted dependencies and compiled bytes are unchanged. Full relevant
integration/provider/regression and recovery/lifecycle closure remain parent T06
requirements. Parked T02/deferred T05 work remains preserved/unexecuted/unpassed.

## Retained source findings and resolution

Production [c0](t06-s2-coordinator-production-source-review-c0.md) rejected nested
config capture after await/unknown-key loss, returned expiry before owner await,
and premature leader abort settlement. [c1](t06-s2-coordinator-production-source-review-c1.md)
verified those repairs but required final cancellation checks AFTER the trusted
clock callback. [c2 source gate](t06-s2-coordinator-production-source-review-c2.md)
verified repairs plus independent four production checks/122scoped dependency/
S1-fixed/metadata hashes. All prior findings/readiness remain records.

Developer disclosed one out-of-grant built-entry import-surface diagnostic in the
initial readiness/ADR. Retained as process deviation, not behavioral acceptance;
not repeated in repairs. Only coordinator's later isolated smoke supplies import
observation. No tests/source oracles crossed from QA to Developer.

QA initial source readiness had invalid account-bound setup, ineffective numeric
uppercase key, invalid post-PREPARED reads, stale-owner/gate cleanup and weak
ordering/error/cancellation oracles. [r1](t06-s2-coordinator-qa-source-review-r1.md),
[r2](t06-s2-coordinator-qa-source-review-r2.md),
[r3](t06-s2-coordinator-qa-source-review-r3.md) and all QA follow-ups remain preserved;
[final QA gate](t06-s2-coordinator-qa-source-gate.md) verified spec-derived repairs.
No compiled QA attempt failed; first frozen owning/regression run green. Initial
16-vs19source-count error was corrected honestly (final40), not test results erased.
No private production implementation/ADR/readiness was QA input.

Public work-order clarifications settled original T05 error propagation, foreign-
caller isolation, complete entry capture, actual pre-commit expiry and owned leader
completion; no shared-contract changes or implementation-mirroring test framework.

## Public outcome and strict limits

Accepted [frozen public S2 work order](../tasks/t06-s2-work-order.md): additive
openRefreshSessionState/REFRESH_VAULT_VERSION=2 at dist/auth/index.js, refresh-only
facade with captured binding, rotateRefresh(captured,signal):Promise<void>, invalidate.
S1 API/version1 behavior preserved. Validated v1/empty/v2 opens read-only; explicit
v1-to2 migration only inside durable prepare. Unknown/corrupt/foreign state fails
closed without repair/deletion. No public grant/key getter, hooks or automatic IO.

New attempts persist exact predecessor/original deadlines/opaque token/canonical
UTF-8 body bytes and auth UUID before one unchanged T05 control dispatch. Concurrent
valid calls share attempt; follower abort stays local, leader awaits owned commit
completion. Same-account validated result installs atomically with pending-null;
binding/generation/opaque operation bytes unchanged. Cancellation before commit
prevents it; begun commits settle without rollback and suppress late success.

Lost/bad response, definite backend error, cancellation or storage failure retains
pending evidence unless joint success already began/completed; failure never rekeys,
deletes domain data or adopts another account. Existing pending refuses further
rotation/dispatch as reauthentication_required in S2. S3 must implement exact replay
and recovered expired-access/current-refresh handling before production refresh
use. S4 request identity/401 orchestration and S5 lifecycle/races remain separate.

Durability oracle is parsed durable RECORD equality before gate release plus EXACT
embedded predecessor/body/key and received request comparison, not raw whole-vault
JSON-whitespace identity. Clock-abort smoke case is representative early abort;
actual final-clock guard placement also source-audited. Returned expiry case proves
already-expired response rejection; no exhaustive deadline cross-product claimed.

No browser/Google/backend/database/Android/Pi/packaging/release interoperability,
new Secret Service qualification, model-facing auth, writesEnabled/config guard,
server/CLI wiring or routine creation. Root/server/CLI/companion remain inert and
actual product writes disabled. No .pi edits, staging/commits/publication/deployment,
automatic S3/context succession or parent completion.
