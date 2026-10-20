# Installer update in place — private package

**Complete, 2026-10-18.** Explicit update mode and separately identified package
are ready. Final61/61 checks across five complete files pass, zero failures,
pending or todo. No laptop installation, release or S3 parent acceptance claim.

Archive: [gymtracka-mcp-0.0.0.tgz](../../dist/delivery/installer-update/gymtracka-mcp-0.0.0.tgz)

SHA256: `4c2574cccab981bf84b9c4855772e148b5cd277638437e532af7b2ac8d2f8d39`

[Inventory](../../dist/delivery/installer-update/gymtracka-mcp-0.0.0.inventory.json):
90 delivered files,79 runtime JS files,111 locked runtime dependencies. Version0.0.0
is unchanged; identify these bytes by checksum. All member hashes/modes/input
identity pass;236 relative runtime imports close. Runtime JS is unchanged from the
verified S2 build. All10 earlier delivery files remain unchanged.

## Use

Verify and extract the new archive into a separate directory, then run:

```sh
node gymtracka-installer/install.mjs --update
```

Select the existing app directory and protected external config2 file. Stop all
MCP processes using that app/profile and confirm shutdown/replacement. The updater
prepares locked dependencies before replacement, retains the previous executable
in a private sibling .backup-*/application and keeps the original app path. Config,
login settings, profile/key, writesEnabled and Hermes registration remain unchanged.
Restart the MCP backends; existing entry paths continue working. No setup/login or
fresh profile is needed. Running without --update retains the fresh-only flow.

See the [complete update procedure](../installation.md#updating-a-compatible-installation)
and [interrupted-update recovery](../recovery.md#interrupted-application-update).
The updater refuses unrelated/unsafe applications, source overlap, embedded private
state and an existing sibling .update directory. It does not migrate config1 or
old-format credentials or prove processes have stopped. Keep external state and
backups protected; cleanup of retained application backups is deliberate operator work.

## Verification and primary review

Focused installer8/8 and final exact-archive61/61 pass. The final selection covers
all installer, artifact-install, standalone document, installed holder and foundation
package checks. Real locked npm installs verify same-path replacement, no stale-file
merge, preserved complete old application, repeated updates, private state/host
byte and mode preservation including existing enabled policy, cancellation/EOF,
unsafe/overlapping paths, unresolved transaction and real offline dependency failure.
Actual isolated CLI setup creates an encrypted record; the installed updater leaves
it byte-identical, and the restarted MCP reads and trusted local removal work. Two
authenticated installed processes share one profile. Owned private provider/bus and
temporary-root cleanup pass. Production types/lint/format, scoped syntax/lint/format
and whitespace checks pass.273 production source/output hashes match the verified
S2 target, so rebuilding unchanged runtime output was unnecessary.

Primary review checked staging ownership, target revalidation, both rename/error
paths, retained-original cleanup and fixed diagnostics. Dependency/config preparation
failure leaves the old app untouched. Ordinary activation failure attempts restoration.
If restoration or backup finalization fails, the previous app stays in .update/previous
and is never recursively deleted. The app is updated by two renames, not an atomic
exchange: forced termination/power loss between them can leave the app path absent.
Recovery instructions preserve and restore the original without touching credentials.
No forced-kill/power-loss campaign or injected rename/restore failure test was run;
those branches were reviewed. No general crash-proof rollback claim.

[Checks/review and limits](../evidence/installer-update-checks.json),
[exact selection](../evidence/installer-update-selection.json),
[stable execution inventory](../evidence/installer-update-inventory.json),
[owned cleanup](../evidence/installer-update-cleanup.json).

Scope excludes clean source reproduction, S3 parent fault/backpressure acceptance,
independent review, actual host/live Google/backend/Android qualification, Btrfs and
newer-Node testing, deployment, real write enablement and publication. No staging,
commits, .pi changes or automatic successor work.
