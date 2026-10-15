# T07-S3 and parent T07 acceptance — 2026-10-15

S3 and parent T07 are complete under the user's separate S3 assignment. Direct
primary implementation used bounded launcher/guide/review and specification-derived
test helpers; the prior user override of QA/Developer/Herdr relays continues.
[Work order](../tasks/t07-s3-work-order.md), [design](../decisions/t07-general-design-and-slices.md)
and [ADR](../decisions/t07-implementation-adr.md) define this controlled acceptance.
No successor is active and no external release gate is waived.

## Delivered boundary

New cli/main.ts and launcher.ts implement the node-invoked trusted setup/login/
resume/cancel/recover commands, strict no-private-IO argument rejection, fixed
stderr-only disclosure/status, empty stdout, SIGINT/SIGTERM cancellation and owned
cleanup. Setup/fresh login disclose potentially indefinite recovery retention and
AI host/model transcript exposure. Storage ambiguity takes exit3 precedence over
cancellation; ordinary cancellation is130. The default launcher validates only
canonical localhost page URLs, selects fixed /usr/bin/xdg-open without a shell or
BROWSER override, bounds acknowledgement and reaps only its owned child.

Configured login was factored internally to capture validated settings/budgets and
an owned S1 transaction once. The additive openConfiguredBrowserLoginHelper passes
that capture to S2 and closes ownership on failure. Existing S1/S2 formats and
interfaces are preserved. No dependency/manifest/compiler/build/bin/shared-contract
change. The legacy package CLI remains inert; T18 owns packaging. See the
[operator guide](../login.md) for the delivered explicit-node commands.

## Observed checks

All commands pin provisioned Node24.21.0/npm11.19.0 through T01_NODE_HOME/PATH.
Tests use only owned loopback, disposable home/XDG, private D-Bus/Secret Service,
ext4 and generated private-CA HTTPS with visibly synthetic accounts/credentials.
The reused facility qualifies synthetic libsecret store/read/clear, then terminates/
reaps its provider/bus and removes owned integration scopes. No personal browser,
live backend/credentials, product writes, .pi edits, staging or commits.

| Check | Result |
| --- | --- |
| Root typecheck, production ESLint/format and clean build | PASS |
| Complete scoped login-test ESLint/Prettier | PASS |
| Complete S3 scope, two files | 32/32 PASS; zero failures/pending |
| Final selected first batch,27 files | 236/236 PASS; zero failures/pending |
| Final unchanged provider batch, one file | 9/9 PASS; zero failures/pending |
| Clean source snapshot npm ci --ignore-scripts and four production checks | PASS; zero install vulnerabilities reported |
| Root/companion compiled output comparison | 148/148 byte-identical |
| Clean complete active T07 replay, nine files | 99/99 PASS; zero failures/pending |
| Frozen source/test/contract/config/guide/compatibility identities | 334 SHA-256 hashes stable |

[Exact selection](t07-s3-active-files.json) includes all nine active T07 files,
all16 T08 runtime/protocol/stdio files, foundation package-contract/inert imports
and T04 provider. Total245 passing checks across two final batches:32 S3,67 S1/S2,
82 T08,55 foundation and9 provider. These are scoped passing batches, not the
whole repository/parked T02 or every historical T06 suite.

The21 boundary checks exercise closed argv grammar, C1/control/path rejection,
help on stderr, inert import/argv guard, fixed safe missing-config and failed
async-diagnostic handling, signal-listener restoration, unsafe launcher URLs and
default headless refusal. All default-launcher tests remove DISPLAY/WAYLAND so
they cannot open a personal browser.

The11 isolated process checks exercise direct compiled-entry setup/resume/cancel/
recover, safe statuses, competing ownership and headless failure; successful
compiled-main login child processes use the trusted launcher composition capability
to report only their canonical loopback URL through IPC. Parent tests activate
the real local callback with synthetic credentials, never a live Google flow.
An actual SDK stdio client then reopens the installed session for reads. Tests
cover same-account re-login, exact uncertain restart replay without another
challenge/browser, explicit cancel without backend IO, committed-target metadata
recovery, completion while launcher remains pending, controlled launcher failure,
SIGINT/SIGTERM waiting cancellation and SIGTERM after TLS exchange dispatch.
Ownership/listeners are checked released, prior bytes preserved/restored as required,
and all CLI stdout remains empty. Existing S1/S2 checks retain deeper persistence,
publication and HTTP security boundary coverage.

## Original findings and repairs

- Initial boundary replay15/21 passed; six unsafe-URL cases expected sign_in_failed.
  The producer rejected them as invalid_arguments before IO, distinct from
  desktop/spawn failure. Coordinator settled that library argument classification
  explicitly in the work order; tests now require exact invalid_arguments. No
  unsafe URL was accepted, no assertion was weakened to generic failure and no
  failed case excluded. The expanded final boundary behavior passes21/21.
- Review found a late-signal race: cancel could be invoked after transaction.close
  marked the facade closed, incorrectly reporting recovery required. Main now
  stops new cancelOwned calls at cleanup entry while preserving signal recording
  and awaiting existing cancellation. It also inspects helper completion for
  recovery ambiguity after cleanup, preserving exit3 precedence. This race is
  reviewed in source; no generalized persistence/cleanup fault harness was added.
- Extended new CLI path rejection to C1 controls; preserved accepted S1 direct
  path behavior. Added launcher AbortSignal validation before IO. Disclosure now
  explicitly says indefinite retention. Async failed-sink tests verify signal
  handlers are restored without native throw or stdout fallback.
- Early static checks caught source formatting and a redundant text initialization;
  a misplaced cleanup edit was corrected before the passing build. No compiler,
  lint or dependency relaxation. First isolated process run11/11 passed; final
  complete owning and regression runs also passed unchanged.

## Limits and parent closure

The fixed production xdg-open spawn/timeout/escalation branch was reviewed in
source, with unsafe/headless paths exercised. Successful desktop spawning and
forced termination of a desktop launcher were deliberately not executed: successful
workflow tests use the trusted library launcher seam, while the executable guard
has no override. This does not certify actual desktop launch, browser CSP enforcement,
Google nonce/audience/signature interoperability or a deployed backend. Those real
gates remain T19/T16 and broader release work. Setup/recover interruption and
cleanup-ambiguity precedence are reviewed alongside S1 durability tests; no claim
of exhaustive crash/power-loss or whole-machine sandbox proof.

The implemented T07 parent outcome is now delivered and accepted under these
controlled boundaries. T06 historical verification omissions, parked T02, retired
T13/T14 and config-only writes policy persist. Routine creation remains unavailable.
T09 is dependency-ready/unassigned; no automatic succession, live service access,
packaging change, staging, commit or release follows this closure.
