# GymTracka MCP

TypeScript/Node.js stdio MCP adapter for GymTracka, with six browsing/read
tools and saved-routine creation controlled solely by an operator
configuration-file `writesEnabled` flag. No custom or external permission extension
is required; no per-routine approval prompt is required.

**Latest change: installer updates in place.** The new private archive supports
node install.mjs --update: stage locked dependencies, replace at the existing app
path, retain the previous executable and preserve external config/profile/key and
Hermes registration. [Package and checks](docs/handoffs/installer-update.md).
Stop all related MCP processes before updating; no laptop deployment occurred.

**Prior private package: multiple clients S2.** Connected servers can share one
profile: idle servers release ownership and calls serialize through result delivery.
The separately identified archive and compatible update instructions are in the
[package handoff](docs/handoffs/multi-client-package.md). The existing installer
remains fresh-only. S3 parent acceptance/independent review and laptop deployment
remain pending.

**Prior change: interactive local installer.** The private archive includes
install.mjs, which prompts for configuration and uses your existing Node24+/npm.
Profile setup, browser login and backed-up Hermes registration are operator
choices. [Installer archive/checksum and instructions](docs/handoffs/interactive-installer.md).
Final55/55 selected installer/package/document/metadata checks pass; no user
installation or newer-Node compatibility tests were performed.

**Prior change: minimum-only Node policy.** Runtime Node24 or later is permitted,
with no upper-version guard. The private refresh is under
`dist/delivery/node-minimum/`; use its [checksum and handoff](docs/handoffs/node-minimum-runtime.md).
Development/build tooling stays pinned. Newer-Node compatibility testing was
explicitly excluded by the user; original T21-S6 bytes/evidence remain unchanged.

**Current development: T21-S6 and parent T21 accepted/closed.** All six slices
are complete. Workspace and clean locked replay each pass1,076/1,076 checks in105
files. The exact private package passes isolated installation/setup/login fixtures,
reads/fresh creation/auth/lifecycle and old-format refusal; clean source/build/
archive bytes match. [Review](docs/evidence/t21-s6-review.md),
[package inventory](docs/evidence/t21-s6-package-inventory.json),
[handoff](docs/handoffs/t21-s6.md),
[laptop handoff](docs/handoffs/t21-s6-laptop.md). R1/laptop unchanged. Actual Pi
CLI/modes/lifecycle/output, current Android delivery, T19 and independent T20 stay
unverified release gates; Btrfs testing is user-owned. No publication or deployment.

**Prior development: T21-S5 accepted/closed.** Actual isolated backend/SDK/Pi
print boundaries now qualify config2, single-record credentials and fresh-call
creation.545/545 checks in58 files pass with569 stable hashes and176 unchanged
compiled outputs. [Review](docs/evidence/t21-s5-review.md),
[handoff](docs/handoffs/t21-s5.md). S1–S5 closed; S6 package/clean parent acceptance
is ready/unassigned. Btrfs testing is user-owned. Actual Pi CLI/modes/lifecycle/
output, current Android delivery, T19 and independent T20 remain unverified.
R1/laptop retain prior installed behavior; no parent/release claim.

**Historical package: refreshed private T18-R1 accepted/closed.** Exact
delivered installation/recovery/refusal and relevant regressions pass40/40 in12
files on workspace and clean reconstruction.430 source inputs,194 emitted files
and archive bytes/content/modes/lock match. The current decoder fix and standalone
server-guide closure are included. [Review](docs/evidence/t18-r1-review.md),
[inventory](docs/evidence/t18-r1-package-inventory.json),
[handoff](docs/handoffs/t18-r1.md). T17-S2–S5, T19 and independent T20 remain
separate; no release or real enablement.

**Prior state: T17-S1 accepted; parent T17 incomplete.** Actual Pi1.1.0 SDK
print mode verifies direct/deferred/codemode paths and MCP2025-11-25 negotiation.
Config-only creation, reads, receipt identity and missing-auth refusal pass;
25/25 in five files, zero failures/skips, stable inputs/outputs and owned cleanup.
[Review](docs/evidence/t17-s1-review.md), [handoff](docs/handoffs/t17-s1.md),
[Pi notes](docs/pi.md). Host lifecycle/recovery/mode/output and clean integrated
acceptance remain held for separate assignment. T19 and independent T20 remain
separate; no release or real enablement.

**Prior state: T16-S7 and parent T16 accepted/closed.** Actual isolated
Android ordinary sync preserves the exact MCP-created saved graph and stable
repeated sync. Full T16 replay passes46/46;181 relevant unchanged regressions
pass, with zero failures/skips and clean locked reconstruction.424 source inputs
and194 emitted files match; executed Android sources/APKs remain stable and owned
cleanup passes. [S7 review](docs/evidence/t16-s7-review.md),
[handoff](docs/handoffs/t16-s7.md). S1–S7 are closed. T17 named Pi, T19 live
Google/browser and independent T20 remain separate; no successor or release grant.

**Prior T16-S6 complete; parent T16 incomplete.** All 45 active T16
checks, 35 selected local regressions and 27 backend checks pass. Other-client
races, local generation fences, same-account recovery/retirement and authoritative
deletion cleanup are verified. The authorized backend timestamp fix preserves
freshness, exact replay and the 24-hour deadline. Owned cleanup passes; initial
failures remain recorded. [S6 review](docs/evidence/t16-s6-review.md),
[handoff](docs/handoffs/t16-s6.md). S1–S6 closed; S7 Android/integrated acceptance
is planned/unassigned. No successor or release grant.

**Prior T16-S5 window complete; parent T16 incomplete.** Final 54/54 in eight
files covers all 36 active T16 checks plus 18 unchanged regressions. Actual durable
interruption, cancellation, receipt/rejection/key-reuse and corrupted-response
recovery checks pass; product code unchanged and owned cleanup verified. See
[S5 review](docs/evidence/t16-s5-review.md) and
[remaining slices](docs/decisions/t16-remaining-slices.md). S1–S5 closed; S6 races/
lifecycle and S7 Android/integrated acceptance remain planned/unassigned.

**Prior T16-S4 window complete; parent T16 incomplete.** Final 42/42 in eight
files covers all 21 active T16 checks plus 21 unchanged regressions. Authentic
expired-grant recovery and real creation/rejection/identity/collision boundaries
pass; product code unchanged and owned cleanup verified. See
[S4 review](docs/evidence/t16-s4-review.md) and
[remaining slices](docs/decisions/t16-remaining-slices.md). S5 is separately authorized;
S6/S7 remain planned/unassigned. Crash/race/lifecycle/Android and integrated gates
remain open.

**Prior T16-S3 window complete; parent T16 incomplete.** Actual read filters,
visibility, paging/expiry and lossless Int64 boundaries pass. A catalogue decoder
repair preserves valid bundled muscle memberships in distinct roles while retaining
custom restrictions. Final 147/147 in 11 files includes all 16 active T16 checks
and 131 unchanged regressions; cleanup verified. See
[S3 review](docs/evidence/t16-s3-review.md) and [handoff](docs/handoffs/t16-s3.md).
A05 and remaining creation/domain/race/crash/lifecycle/Android and parent gates stay
open; later slices remain unassigned.

**Prior T16-S2 window complete; parent T16 incomplete.** Real refresh recovery,
backend restart and logout/account-disable write fences now have isolated evidence.
Final 90/90 in eight files includes all nine active T16 checks and 81 auth/lifecycle
regressions; product inputs and rebuilt outputs are unchanged. See
[S2 review](docs/evidence/t16-s2-review.md) and [handoff](docs/handoffs/t16-s2.md).
Remaining timing/cursor/ownership/domain/race/recovery/Android gates stay open;
later bounded outcomes remain unassigned.

**First T16 real-backend window complete.**
Four actual isolated backend/PostgreSQL checks prove representative reads, routine
creation, exact replay after committed-response loss at each step, independent DB
effects and ordinary sync publication. Final 450/450 across49 files includes 446
unchanged regressions. [Review](docs/evidence/t16-s1-review.md) and
[handoff](docs/handoffs/t16-s1.md) record provenance/cleanup and remaining real
auth/race/recovery/Android gates. Later bounded outcomes remain unassigned.

**T18 packaging accepted.** Installed same-format replacement,
exact recovery/receipt preservation and incompatible-state startup refusal are
verified. Full runtime replay261/261 in workspace and clean; final document-only
packaging closure14/14 in both. See [T18 acceptance](docs/evidence/t18-s3-review.md)
and [handoff](docs/handoffs/t18-s3.md). External and independent release gates remain.

**T15 portable creation integration accepted.**
The compiled stdio server delivers guarded recoverable creation behind the sole
operator config-file `writesEnabled` permission, default false. Process recovery,
receipt loss, cancellation/shutdown and trusted lifecycle fences are verified.
[S3/parent review](docs/evidence/t15-s3-review.md) records 446/446 checks on
workspace and clean locked replay, 194 byte-identical outputs and 584 stable hashes.
[Launch/privacy notes](docs/stdio-server.md) document stop/update/relaunch.
T16/T17/T19/T20 external interoperability and independent release gates remain.

**T08 read-only stdio delivery is accepted.** Schemas/codecs,
protected storage, HTTP transport, session handling, configured reads and the
seven-tool SDK/stdio surface are implemented. Final active verification passed
941/941 checks; a clean locked rebuild produced 128 identical compiled files and
passed all 82 active T08 checks. See [S3 acceptance](docs/evidence/t08-s3-review.md)
and [server launch/privacy notes](docs/stdio-server.md).

**T07 trusted login is now complete.** Setup/login/resume/cancel/recover are
delivered through `node dist/cli/main.js`, with a secured loopback GIS helper
and protected session recovery. See the [operator guide](docs/login.md) and
[S3/parent acceptance](docs/evidence/t07-s3-review.md):99/99 clean T07 checks and
245 selected checks pass with isolated facilities and a controlled launcher.
The package CLI bin targets the delivered trusted entry. Use the standalone
[installation](docs/installation.md), [login/lifecycle](docs/login.md),
[server](docs/stdio-server.md) and [recovery/upgrade](docs/recovery.md) guides.
[Developer packaging](docs/packaging.md) explains the private candidate artifact;
installed same-format replacement/recovery and parent packaging acceptance are
complete in [T18-S3](docs/evidence/t18-s3-review.md).

**T12 trusted lifecycle is complete.** Sign-out, permanent operation retirement,
fenced removal/reconciliation and verified account-status cleanup are delivered.
Setup/login disclose privacy, retention, replay limits and config-only creation
policy. [Parent acceptance](docs/evidence/t12-s4-review.md) records 325/325
checks on workspace and clean locked replay; see [operator flow](docs/login.md).

Creation is enabled only by strict config-file `writesEnabled: true`; no real
backend enablement or release is claimed. T06 retains its explicit historical
verification omissions. Real backend/Google/Android/named-host/release
interoperability remains unverified. T02 is parked; T13/T14 are retired.

## Start here

- [Implementation documentation](docs/README.md)
- [Single-agent working policy and optional subagents](docs/agent-coordination.md)
- [Configuration-only creation policy](docs/decisions/routine-creation-config-policy.md)
- [Roadmap and dependencies](docs/implementation-plan.md)
- [Agent task queue](docs/tasks/README.md)
- [Architecture and safety boundaries](docs/architecture.md)
- [Verification and release gates](docs/verification.md)
- [Shared MCP draft](shared-docs/docs/mcp-contract/README.md)
- [Finalized backend contract](shared-docs/docs/backend-contract/README.md)

The user-approved config-only policy is aligned in shared MCP draft0.2 (uncommitted
working-tree revision based on9a96dcb). Backend v1 is unchanged. This documents the
intended behavior, not a compatibility pass or actual write enablement.
Do not use a personal/live database or put credentials in this repository.
