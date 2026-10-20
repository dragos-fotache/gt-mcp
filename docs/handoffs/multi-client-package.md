# Multiple clients S2 — private install package

**Prepared and scoped installed verification complete, 2026-10-18.** No laptop
deployment. This packages completed S1/S2; S3 integrated parent acceptance and
independent review remain pending. Prior archives/evidence remain unchanged.

Archive: [gymtracka-mcp-0.0.0.tgz](../../dist/delivery/multi-client-s2/gymtracka-mcp-0.0.0.tgz)

SHA256: `c4732ea59892b1264f025b9c9972c5fb2dbf24363ca28b707803ccba897d8571`

[Sibling inventory](../../dist/delivery/multi-client-s2/gymtracka-mcp-0.0.0.inventory.json)
records90 files,79 runtime JavaScript files and111 locked runtime dependencies.
Version0.0.0 is unchanged; use this exact checksum/inventory. All member hashes,
modes and source inputs match. All79 runtime files are byte-identical to the final
verified S2 build;236 relative imports close inside the archive, including the
credential worker, acquisition helper and private delivery modules.273 production
source/output hashes match S2. All eight earlier delivery files remain unchanged.

## Install and update

Use the bundled [installation guide](../installation.md). The existing installer
works only for fresh installation: it refuses existing app and config directories.
It has no update/overwrite mode. No updater behavior was changed in this task.

For compatible config2/single-record installations, follow the
[update procedure](../installation.md#updating-a-compatible-installation): extract
and run locked npm ci in a new app directory, keep the existing protected config,
login settings, profile and OS key, stop every old MCP process and point each
host registration at the new absolute server entry with the existing --config.
Restart/reload the host backends. Do not run setup/login/reset as an executable
update. A surviving old lifetime-owner process can still block the new servers;
closing its UI alone does not prove it stopped. Config1/old-format state requires
the separate fresh-profile transition, not this compatible update path.

Multiple installed S2 servers can connect to one profile. Idle servers hold no
owner; calls serialize under ownership through result delivery. Runtime config
remains fixed at startup; trusted auth state is loaded afresh for each call.

## Verification and limits

Final57/57 checks across five complete files pass, zero failures/pending/todo,
593 stable execution hashes. Tests consume the exact retained archive through
fresh isolated locked installs. They verify installed CLI/setup/removal, two
authenticated actual stdio processes using one unchanged synthetic credential
record, concurrent reads, idle provider reopen, surviving process after the first
closes, disabled creation, installer existing-destination refusal/cancellation,
archive/lock/notice identity, official SDK boundary and standalone guide links.
Qualified owned private provider/bus exit and temporary-root cleanup pass.
Production typecheck/lint/format, scoped smoke lint/format and whitespace checks
pass. A rebuild was unnecessary because production source/output hashes match
the previously verified S2 build; no build/install changed its execution target.

Primary review corrected the installed smoke's historical lifetime-owner assertion
and removed the source-only guide link from the shipped document closure. Bundled
guides now describe current sharing, fresh-only installer and compatible updates.
No runtime, installer, dependency, lock, format or shared-contract changes.

Initial package creation was blocked by sandbox child-process EPERM; unchanged
packer succeeded with required escalation. The first archive passed57/57 but was
superseded before delivery by bundled guide label/lifecycle clarification; the
final exact archive then passed the same full selection. Failures and iterations
are retained in [checks/history](../evidence/multi-client-package-checks.json), with
[selection](../evidence/multi-client-package-selection.json),
[stable inventory](../evidence/multi-client-package-inventory.json) and
[cleanup](../evidence/multi-client-package-cleanup.json).

This is a private S2 install candidate, not completed parent acceptance or release.
No new clean source reproduction, independent review, parent fault/backpressure
campaign, live Google/backend/Hermes/Android qualification, newer-Node/Btrfs testing,
real installation/write enablement or deployment is claimed. Existing release gates
remain. No staging, commits, publication, .pi changes or automatic successor work.
