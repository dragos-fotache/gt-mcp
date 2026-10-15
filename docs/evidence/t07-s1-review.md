# T07-S1 acceptance — 2026-10-15

S1 is complete under the user's direct assignment. The user superseded historical
QA/Developer/Herdr relays; primary implementation used two bounded helpers for
metadata/review and specification-derived focused tests. No successor is active.
[Work order](../tasks/t07-s1-work-order.md), [design](../decisions/t07-general-design-and-slices.md)
and [implementation ADR](../decisions/t07-implementation-adr.md) define this claim.

## Delivered boundary

Six new `src/login/` modules provide inert additive trusted entry, strict private
v4 exchange evidence, stable body/key, two durable send reservations, exact service
retry delay, cancellation/expiry cleanup, initial and same-account supported-v3
installation with T06 predecessor retention, protected descriptor receipts,
explicit setup and source/target recovery. No operation-store reads by login,
automatic refresh, account switching, browser listener/page or executable CLI.
No existing production module, manifest, dependency, compiler setting or shared
contract changed. Compatibility prose was extended and its supplemental T08 table
converted to prose; the normative 17-row matrix and evidence remain intact.

## Validation and limits

All commands used provisioned Node24.21.0/npm11.19.0 via T01_NODE_HOME/PATH.
No install lifecycle hooks, personal bus, live credentials/service, `.pi` edits,
staging, commits or product writes. Filesystems/credentials/accounts are explicitly
synthetic. The reused isolated facility provisioned its own private D-Bus and
unlocked Secret Service with disposable home/XDG, qualified libsecret store/read/
clear, ext4 roots and a generated private-CA HTTPS fixture. Owned provider/bus
were terminated/reaped and disposable scopes removed after each integration run.

| Check | Result |
| --- | --- |
| Root typecheck, production ESLint, production format and clean build | PASS |
| Scoped new-test ESLint/Prettier | PASS |
| Complete active S1 suite, four files | 47/47 PASS; zero skips/pending |
| Clean source-snapshot npm ci --ignore-scripts plus four production checks | PASS; install reports zero vulnerabilities |
| Root vs clean root/companion compiled files | 140/140 byte-identical |
| Clean complete S1 replay on isolated real facilities | 47/47 PASS; zero skips/pending |
| Selected combined owning/regression run, 47 files | 523/524 PASS, one documentation-metadata failure; zero pending |
| Focused repair: complete foundation package-contract file | 43/43 PASS after documentation-only repair |
| Clean snapshot after synchronizing only repaired compatibility prose | Foundation43/43 and production format PASS; compiled outputs unchanged |
| Frozen production/test/contract/config input identities | 319 stable SHA-256 hashes |

[Exact active selection](t07-s1-active-files.json) includes complete S1, T06,
T08 runtime/protocol/stdio and foundation suites, plus T04 binding/contract and
T05 hook/retry/error/exact-replay regressions. The selected regression total is
477 checks in addition to 47 S1 checks. Its sole failure was the documentation
table described below; the complete affected 43-check file passed after repair.
Unchanged production/tests were not rebuilt or broadly replayed after this
documentation-only repair. These are separate observed runs, not a claim of a
single all-green combined replay or the whole repository/parked T02 suite.

The six real configured integration checks establish setup/login/T08 read,
same-account generation advancement with pending-refresh and byte-identical
operation retention, owner-close/reopen exact exchange replay, pending-v4 T08
refusal, target and source descriptor recovery, provision-target recovery without
reprovisioning, competing ownership and corrupt-target refusal. Selective TLS/
capability tests cover durable-before-send ordering, two-send bounds, Retry-After
larger than backoff cap, different-account refusal, malformed-vs-definite exchange
outcomes, duplicate admission, expiry/cancel, pre-prepare ambiguity, begun-install
settlement, publication ambiguity and final-clock cancellation. Metadata checks
cover exclusive receipts/CAS, source confirmation, strict records, substitutions,
links and private access. These are representative fault checks, not an exhaustive
crash/power-loss or adversarial same-user proof.

## Preserved failures and repairs

- Initial auth run:19/32 passed,13 failed. The genuine empty-predecessor defect
  reused a nonempty-only refresh base64 decoder. A dedicated canonical-empty
  predecessor decoder repaired initial installation and cleanup. Several failures
  instead reflected overstrict test assumptions about fixed safe stacks, nested-v4
  rejection code and poisoned-close behavior; those oracles were reconciled with
  the work order, without accepting unsafe state. Intermediate pre-rebuild and
  pre-clarification runs were23/32 and31/32; final expanded auth scope33/33.
- Source review repaired shortened Retry-After, cancellation after the final
  clock callback, closed-facade cancellation falsely acknowledging cleanup,
  a nonblocking descriptor-open omission and caller-config error classification.
  Focused replay/clock/closed-facade regressions remain in the suite.
- Early static checks found a typed-array generic declaration and an uninitialized
  descriptor variable; lint found an unused import and a control-character regex.
  Corrected without weakening compiler/lint configuration.
- First real configured integration run:5/6 passed. The read-response fixture
  omitted required hasMore. Restored the contract-shaped synthetic page;6/6 passed.
- Combined final selection:523/524 passed. An existing supplemental T08 table in
  compatibility.md made the foundation oracle count19 rather than17 matrix rows.
  Converted only that supplemental table to prose, preserving all observations
  and statuses. The affected complete foundation file then passed43/43. No test
  exclusion, skip or assertion weakening was used.

## Reproduction and remaining work

After a pinned locked install/build, run the four `test/login/*.test.mjs` files
serially with Vitest. Unit TLS tests reuse visibly synthetic T05 fixture files.
Configured integration requires explicit isolated GT_S3_PRIVATE_ROOT,
GT_S3_TEST_BUS, GT_S3_ISOLATION_CONFIRMED=t08-s3-isolated,
GT_S1_FIXTURE_KEY_FILE/GT_S1_FIXTURE_CERT_FILE and NODE_EXTRA_CA_CERTS. These names
reuse the accepted T08 isolation facility; absent facilities fail, never skip.
Values must identify disposable ext4/private-bus/provider/CA resources only.
No real values or private paths are recorded here.

Parent T07 remains incomplete. S2 owns secured GIS loopback helper and S3 owns
trusted CLI delivery/parent integration. Genuine Google/backend/browser, named
hosts, Android, packaging and release gates remain unverified. Historical T06
omissions, parked T02 and retired T13/T14 are unchanged. All S1 work is closed;
no automatic successor or live-service execution follows.
