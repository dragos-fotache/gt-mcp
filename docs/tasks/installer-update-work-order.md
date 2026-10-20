# Installer — compatible application update in place

**Complete, 2026-10-18.** Focused8/8 and final61/61 exact-archive checks across
five files pass; zero failures/pending/todo, stable hashes and owned cleanup pass.
Production/scoped checks pass. New archive preserves prior deliveries and S2 runtime
bytes. [Package/handoff](../handoffs/installer-update.md),
[checks/review](../evidence/installer-update-checks.json). No S3/deployment claim.

User requests an installer that updates in place.
Window starts11:16 UTC; checkpoint12:46, hard stop13:16 with honest handoff.

Outcome: explicit --update mode installs the current delivered application at an
existing application path, retaining external config2/settings/profile/key and
Hermes registration. Fresh flow remains compatible. No setup/login/reset, config
rewrite, migration, live backend/credentials, process killing or automatic host
restart. No laptop deployment/publication/staging/commit or S3 acceptance.

Authority: user update request; standing planning/proportional testing policies;
config2/settings1/T21 successor and completed S1/S2; package delivery contract.
User also requested the new install package in the preceding turn; deliver a new
separately identified archive with updater, preserving all prior deliveries.

Settled interface: node install.mjs --update, prompt existing application path and
protected external config2 path, confirm all MCP processes using it are stopped,
then confirm replacement. Same server path/--config/Hermes registration continue
working after restart. No secret/config values echoed. Refuse unrelated/unsafe
targets, source overlap, embedded config/profile and concurrent/unresolved updates.
Config validation uses the staged installed production loader without opening a
profile or contacting a backend/keyring.

Algorithm: exclusive private sibling <app>.update transaction directory; stage
allowlisted delivered files and real locked npm ci there, validate staged app and
external config before moving the old app. Revalidate selected target identity and
safe ancestry. Rename old app to transaction/previous, replacement to original
app path. On ordinary activation failure restore the old path; never discard an
unrestored original. Keep previous executable in a private sibling backup after
success. Existing destinations are never merged or pruned in place. Failed/canceled
preparation leaves original bytes untouched and removes only owned staging.
SIGKILL/power loss may leave .update and a missing app path between the two renames;
document local recovery, no claim of atomic exchange/crash-proof rollback. Do not
perform update until stopped-process confirmation; no unreliable automatic PID
discovery or claim of proving quiescence. Backup retention requires operator cleanup.

Edit scope: scripts/install.mjs, focused installer update integration tests, shipped
guides, repository status/evidence/handoff and new delivery. No runtime/dependency/
lock/schema/shared-contract changes. One primary agent; no delegated work needed.

Environment/commands: pinned Node24.21.0/npm11.19.0, production types/lint/format,
scoped test syntax/lint/format; verified S2 runtime outputs reused if hashes match.
package:artifact to separate empty directory. Exact-archive complete installer,
package-install/docs/holder/foundation suites in existing private ext4/provider/TLS
runner, isolated temp HOME/npm settings and real npm ci only. No build/install
against targets currently in use; no newer Node/Btrfs/live qualification.

Acceptance: old app replaced at same path, obsolete files not merged, previous app
retained, external config/login/profile bytes and modes/Hermes untouched, writes
policy preserved, installed CLI/SDK entry works. Cancellation/EOF, unrelated/unsafe
paths, source/config/profile overlap, concurrent marker and real offline dependency
failure leave original unchanged. Proportional representative failures, no general
fault injection framework. Review rollback/cleanup branches and interruption limit.
Freeze archive, inspect hashes/modes/import/document closure and historical bytes;
run full active owning suites and record stable hashes/cleanup. Stop for unsafe
replacement/privacy, contract conflict, new dependencies, missing isolation or time.
