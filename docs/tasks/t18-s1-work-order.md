# T18-S1 — Locked runtime artifact and delivered bins

**Status:** accepted/closed · **Owner:** primary Codex agent · **Authorized:**
user requested “start work at s1” on 2026-10-16. Started 13:07 UTC;
90-minute checkpoint 14:37 UTC, hard stop 15:07 UTC. S2/S3 remain unassigned/held.

The user requested pausing at the earliest convenience. Work stopped after
toolchain restoration/version verification, before baseline freeze or any
production/test/manifest changes. [Paused handoff](../handoffs/t18-s1.md) records
the exact state. No process is running; resume only on user direction and reset
the bounded working clock then. The original execution times are historical.

User resumed work with “ok continue” at 13:12 UTC. New 90-minute checkpoint
14:42 UTC, hard stop 15:12 UTC. Toolchain versions reverified; S2/S3 held.

## Contract and scope

Implement S1 of the [settled T18 plan](../decisions/t18-plan-and-slices.md), under
shared MCP draft0.2 auth/tools/creation/scenarios, unchanged backend v1, accepted
foundation/storage specs and [proportional testing](../decisions/proportional-testing-policy.md).
Deliver a private local npm tarball with runtime-only shrinkwrap derived from
the root lock, explicit production JS/holder closure, fixed trusted CLI bin and
modes, placeholder false templates, sanitized content/checksum inventory and
actual fresh local install/bin/stdio/provider smoke. No public runtime/schema/
storage-format changes or dependency upgrades. Preserve old inert CLI/tests,
companion workspace/Pi dev dependency, prior uncommitted work and historical evidence.

Edit packaging/, scripts/, test/packaging/, root manifest and root-lock bin
metadata, minimal lint/format/build path wiring, packaging notes and task/status/
evidence/handoff docs. Narrow installed-entry parameters in existing test helpers
are allowed only when cheaper than a small packaging-specific helper. Freeze a
sanitized current source/lock/config baseline before metadata edits for S3; no
private material or .pi. No accepted product-source repair without a demonstrated
integration defect and recorded scope. S2 standalone guide completion and S3
replacement/recovery/clean parent acceptance are not opened by this assignment.

## Environment and permitted execution

Restore disposable Node24.21.0/npm11.19.0 and verify official archive checksum.
Use T01_NODE_HOME for every Node/npm command; no system Node/global install/Pi
settings changes. Restore disposable pinned provider if needed; qualify a fresh
private bus, unlocked Secret Service/libsecret store/read/clear and ext4 roots
before profile execution. No ambient bus/provider, real backend/account/Google/
Android or real credentials. Write-enabled fixtures are unnecessary for S1.

Permit downloads/extraction under /tmp, source-only baseline freeze, locked
install if needed, production typecheck/lint/format/build, scoped authored-helper
syntax/lint/format/import checks, explicit packaging command, npm pack in staging,
isolated extract-and-ci installation, focused Vitest
and exact final selection below. No build/install/pack races its test target.
No staging/commits, publication/deployment, real enablement or successor execution.

## Installation decision and initial findings

The user selected extract-and-npm-ci as the sole supported installation route
during S1. The original fresh local-consumer test failed: npm11.19 re-resolved
three transitive versions despite the included shrinkwrap. An isolated
_hasShrinkwrap metadata spike did not fix it (npm strips underscore attributes).
Do not weaken dependency expectations or promote that route to a pass.
The plan/package guide and active tests now omit the unsupported route by explicit
user decision; retain the original failure in final evidence. This changes local
installation scope, not shared schemas/runtime/storage or dependency pins.

Initial packaging repairs: explicit Node Buffer/URL imports for lint, permitted
template filename grammar, distinct empty npm user/global config files, and
explicit shrinkwrap inclusion in the files allowlist. Actual installed CLI
setup/server ownership/EOF release/local removal passed on the private provider.
Read-only source/oracle review identified partial-output cleanup and an unbounded
test child wait; both require repair before final replay.

## Verification and deliverables

Use a small artifact/lock check plus installed black-box journeys. Verify the
archive itself (paths, modes, allowed bytes, no private/parked/diagnostic inputs),
locked installed production tree without Pi/dev tooling, actual installed executable entries,
trusted CLI help/usage, official MCP initialize/exact seven tools/safe unconfigured
calls/EOF from unrelated CWD, and actual packaged holder ownership/release against
the qualified isolated provider. Reuse source SDK client and production storage
fixture; packaged subjects must resolve only their own dependencies/child paths.
Synthetic forbidden-file probes belong only in disposable snapshots. No new
generalized harness or private-function testing campaign.

Final S1 selection: complete new test/packaging/ S1 suite; complete test/foundation/;
test/login/cli-boundaries.test.mjs and test/login/cli-integration.test.mjs;
test/stdio-server/sdk-startup.test.mjs and framing-lifecycle.test.mjs. Record exact
file selection before execution. Full owning suite plus these relevant package/bin
regressions required for S1; parent T18's broader final floor remains S3. Existing
T02 experiment tests stay deferred, not passed. No whole-repository/release claim.

Milestones: work order/baseline/environment; packer/bin/lock and early static
checks; archive/install/stdio/provider checks; final production/scoped/selected
checks and stable hashes; source/oracle review, sanitized inventory and handoff.
Review is primary-agent, not independent T20 certification. Record failures and
repairs honestly. Stop at normative/public conflict, dependency drift, unavailable
safe fixture/toolchain, unsafe ownership, scope/harness expansion or hard limit;
retain partial work and exact outstanding acceptance without waiving checks.

## Final disposition

Accepted/closed:152/152 in13 exact files (6 owning +146 relevant regressions),
zero failed/skipped/pending/todo; four production/scoped checks,817 stable hashes,
94 archive files/86 production JS/111 locked runtime dependencies.194 prior
emitted files remain byte-identical. Actual extract-and-ci/CLI/SDK/provider/owned
cleanup PASS. [Review](../evidence/t18-s1-review.md),
[handoff](../handoffs/t18-s1.md). All S1 grants closed; S2 unassigned, S3 held;
parent incomplete. Original failures and user route decision are retained.
