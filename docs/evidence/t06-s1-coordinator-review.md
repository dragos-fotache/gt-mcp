# T06-S1 coordinator acceptance — c2 / t06-s1-f1

**Disposition: T06-S1 DONE, bounded internal acceptance. Parent T06 INCOMPLETE.**
All S1 implementation/source/target/fixture/relay/rerun windows are CLOSED;
Developer and QA HOLD all actions. No S2, automatic successor or release grant.
This record supersedes historical opening-state language in the frozen work order
and relay records; their normative bytes/history are preserved, not fresh grants.

## Accepted evidence

- Frozen artifact: t06-s1-f1, Developer c2; [249-file inventory](t06-s1-f1-artifact-inventory.json)
  SHA256 `5e31b0f0cf970d6db63d0ab5f2c88f9e59d6e728fbaa0b6f812ae57e263fa11b`.
- Independent QA [owning execution](t06-qa-f1-execution.md):3files,51/51PASS,exit0,
  zero skips. Initial unchanged regressions398/399FAILED; preserved, not erased.
- [Adjudicated QA rerun](t06-qa-f1-calibration-rerun.md): focused calibration16/16,
  then full original regression selection23files,399/399PASS,exit0,zero skips.
  No source/oracle changes or failing-suite exclusion; owning51not redundantly
  rerun because the same frozen identity remained unchanged.
- Coordinator [clean locked source reproduction](t06-s1-clean-source-snapshot-result.json):
  155allowlisted source inputs, fresh disposable HOME/XDG/temp/cache, locked
  `npm ci --ignore-scripts`, typecheck, production lint/format/build, identical
  owning51/51 +regressions399/399, scoped QA lint/format allPASS/exit0.
  All94compiled files reproduce frozen bytes exactly; source hashes unchanged.
- QA before/after and Coordinator final verification:249/249rows unchanged.
  Source inventory SHA256 `e7e0a0e607a806bdabe29976a2c09cd5bc0ff933ae5664020e6cace80f3cb2d5`.
- Node24.21.0/npm11.19.0/Vitest4.1.11. No lifecycle hooks. Retained upstream
  node-domexception deprecation; no runtime/package upgrade or system replacement.
- [Isolated auth import smoke](t06-s1-import-smoke-result.json):exact four-export
  output,empty stderr,natural exit0 in28ms,disposable scope removed. Source audit
  found inert top-level imports/definitions; not comprehensive IO interception or
  OS-sandbox proof.

The final active selection is450tests (51new +399unchanged), not whole-repository
`npm test/check`. Regression breakdown: foundation100,T03221,T04unit54,T05hooks24.
No test quota/coverage target or generalized campaign was used. New real boundaries
are isolated T04 diagnostic persistence plus actual loopback HTTPS through T05;
not new production Secret Service/backend/Google/host certification.

## Retained failures and resolution

C0 source review rejected ordinary-object parsing, refresh-token grammar,
post-queue mutable input use, capability handling, extra parse caps and version
priority; C1 review identified pre-commit expiry and mid-commit invalidation
handoff boundaries plus inherited route labels. C2 repairs pass source review
and independent51-test execution. All [production reviews](t06-s1-coordinator-production-review-c2.md)
and earlier findings remain recorded.

Initial QA readiness was incomplete scaffolding. Subsequent source reviews repaired
fixture identity/oracles, public-method synchronization and cleanup/owned-pending
settlement. No private production source/diff/ADR was relayed to QA, and no QA
source/oracle was relayed to Developer; common public clarifications were updated
against unchanged shared contracts before independent authoring.

Initial QA regression failure was a T01 calibration launch-layout defect:
TMPDIR was under parent HOME, so the frozen private-path guard correctly classified
the neutral synthetic probe as private. [Adjudication](../decisions/t06-s1-f1-calibration-adjudication.md)
required sibling disposable HOME/temp roots, preserving all guards/assertions.
QA confirms initial ancestry and final disjointness; focused16/full399passes prove
resolution. No waiver, source repair, silent exclusion or mocked-green claim.

Initial ambient Node/npm version-only discovery deviation is retained in
[start evidence](t06-s1-coordinator-start.md). No project execution used that
runtime; all accepted commands used the checked disposable pinned toolchain.

## Public outcome and limits

See [S1 public work order](../tasks/t06-s1-work-order.md) and
[handoff](../handoffs/t06-s1.md). Version1 private settled grant/no-grant vault;
strict exact lossless expiry strings; initial trusted same-origin grant install
through atomic T04 bind; four-field capture and T05-compatible read/fence hooks;
owned-commit cancellation/explicit invalidation suppress late success without
rollback. Operation bytes remain unchanged; stale facade must close/reopen.

Grant provenance remains a trusted future T07 exchange-helper obligation, not a
claim that S1 validates Google identity or executed actual OAuth. No refresh,
replay/retry, replacement/sign-out/logout, browser/CLI/MCP wiring or writesEnabled
integration is delivered. Mutation/refresh/logout/account-status dispatch remains
unavailable through S1. Root/server/CLI/companion stay inert. Actual product writes
remain disabled; only isolated synthetic state/loopback fixtures executed.

S2–S5 remain unassigned/unstarted. S2 needs a new reviewed vault version/API and
its own bounded grant; S2 is not usable production refresh until S3 recovery passes.
S1 acceptance alone neither completes T06 nor unlocks T07/T08. Parent final T06
requires complete active owning and relevant full unchanged T04/T05 integration/
provider regressions and integrated recovery/lifecycle races, clean locked proof.
Parked T02/deferred T05 campaigns remain preserved/unpassed; T13/T14 retired.
No real backend/database/Google/browser/Android/Pi/packaging/release claim.
No .pi changes, staging/commits, publication or automatic successor.
