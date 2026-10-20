# T21-S6 and parent T21 acceptance review

**Accepted/closed, 2026-10-18.** The user separately assigned S6. All six T21
slices and parent T21 are complete. This accepts the exact private candidate in
isolation; external host/browser/Android and independent release gates stay open.

Final workspace and clean replay each pass **1,076/1,076 checks across 105 files**:
1,059 in 103 integrated main files,16 credential-store checks and one terminal
locked-key cleanup check on separate private providers. Zero failed/skipped/pending/
todo; exact result-file sets match the selections. Main workspace records 573 stable
hashes. [Selection](t21-s6-selection.json), [main inventory](t21-s6-main-inventory.json),
[storage inventory](t21-s6-storage-inventory.json),
[cleanup inventory](t21-s6-cleanup-inventory.json).

## Exact delivered candidate

`dist/delivery/t21-s6/gymtracka-mcp-0.0.0.tgz`, private version0.0.0:

`cb2c8f7b4e75c3823b107191ed5a9d4c16e72eda5274953fc85343ddafa58191`

[Package inventory](t21-s6-package-inventory.json):86 files,76 runtime JS modules,
111 locked runtime dependencies. The reviewed static closure has 227 literal
relative import/worker edges, including the credential worker. No diagnostic,
operation-journal, descriptor/anchor or retired holder dependency is shipped.
The packer retains traversal/symlink/mode/output/lock/notices guards; only the
runtime path grammar and mandatory worker change. Dependencies/compiler/root
manifests and all176 compiled outputs remain unchanged from accepted S5.

The exact archive is extracted in private fresh locations and installed using
`npm ci --omit=dev --ignore-scripts`. Installed bin/CLI/stdio and module-relative
worker resolution run from unrelated working directories without source fallback.
The installed journey covers CLI setup, synthetic configured-login API, restart,
reads, fresh creation, exact in-call401 auth retry, recover/sign-out/removal,
exclusive ownership and refusal of config1/old profiles, future auth/envelopes and
corrupt authentication tags without mutation/network. S5 current-format replacement
is inert and preserves credentials; explicit repeated calls after saved/uncertain
work are fresh and can duplicate routines. This is not R1 migration or real Google/
interactive-browser login evidence.

Five standalone shipped guides close local links/anchors, installed commands,
strict config2 defaults and the independent approved transport-budget table.
They describe one encrypted credential record, OS key custody, pending-refresh
identity, manual creation uncertainty and fresh-profile transition. No filesystem
name gate, rollback-detection or power-loss promise. Historical R1/laptop behavior
is preserved. [Scenario reconciliation](t21-s6-scenario-reconciliation.md).

## Integrated and clean acceptance

The final selection is the union of active S2–S5 owning suites and relevant
unchanged regressions plus all13 packaging checks. All active S3 owning paths are
included; earlier S3 legacy-storage regressions and three S2 journal paths were
already explicitly retired/archived in S4. They are not hidden failures or passes.
There is no unfiltered whole-repository, current Android or full Pi certification
claim. Actual isolated backend/PostgreSQL, SDK/Pi print, auth/login/lifecycle,
storage/IO, creation/read/codec/transport/foundation requirements are replayed.

[Clean reproduction](t21-s6-clean-reproduction.json) starts without node_modules/
dist, runs locked `npm ci --ignore-scripts`, typecheck, production lint/format and
build, then reproduces source/output/archive identities before the same replay.
395 copied source/oracle/selection inputs and 176 byte-identical emitted files. Archive bytes/content/modes/dependency lock/notices match exactly;
source/emitted/baseline inputs remain stable and the owned clean snapshot is removed.
[Clean main](t21-s6-clean-main-inventory.json),
[clean storage](t21-s6-clean-storage-inventory.json),
[clean terminal cleanup](t21-s6-clean-cleanup-inventory.json).

The runtime needed no repair. S6 changes 13 existing packager/test/guide/runner
paths plus the bounded clean-replay script;12 are monitored runtime inputs and
one guide is repository-only. [Scope comparison](t21-s6-scope-comparison.json),
[static checks](t21-s6-static-checks.json), [environment](t21-s6-environment.json).
The [original-source archive](t21-s6-original-source-manifest.json) preserves16
pre-S6 files, including unchanged helpers/allowlist/historical reproducer.

## Review and execution history

Initial audit identified17 stale allowlisted paths and the removed holder worker;
no package/runtime execution was attempted by that audit. After adaptation,
focused exact-package proof passed13/13; the first integrated pass was1,059/1,059.
Bounded read-only review found an outer clean-wrapper timeout shorter than nested
runner budgets and missing exact result-file-set checks. Both were corrected before
clean execution; original wrapper bytes are archived. Final workspace main and
clean replay ran against the corrected frozen script. No failed product/test case
was excluded or assertion weakened. [Execution history](t21-s6-execution-history.json).

Primary specification/source review and separate bounded read-only reviews of
package closure, installed tests, guide claims and clean wrapper found no remaining
blocking defect. They do not close independent release review T20. Existing
backend Clock/signed-proof overlays and response-loss relays are explicit synthetic
fault facilities; actual DB/domain/auth fences are exercised. Deliberate process
stops do not claim crash-during-commit or hardware power-loss qualification.

Workspace/clean backend and private provider/bus cleanup pass; original backend
inputs remain unchanged. R1 SHA256 remains
`ed5877dd16fc79043bc8773d3d15bb6fed2887dc891100ccebf8ddf2b3b22563`.
No live service/credentials, laptop installation, .pi change, staging or commit.
Later closure changes only status prose in monitored AGENTS/compatibility inputs;
exact execution bytes are archived and reconciled by [closure checks](t21-s6-closure-checks.json).
Source/test/compiled/shipped/archive bytes remain frozen; no extra replay claimed.

Actual Pi CLI/modes/lifecycle/session/output and final T17, current Android
delivery, T19 live Google/browser and independent T20 remain unverified release
gates. Btrfs testing is user-owned and was not run. No publication, real write
enablement, old-state cleanup or successor assignment follows from T21 completion.
[Handoff](../handoffs/t21-s6.md), [bounded laptop handoff](../handoffs/t21-s6-laptop.md).
