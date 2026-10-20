# Recovery and fresh-profile transition

This guide accompanies the separately identified version-2 installer-update private
candidate; use its archive checksum/inventory, not version0.0.0 alone. Historical
R1 and the existing laptop installation keep their bundled older procedures.
No automatic format migration or old-data cleanup occurs. Stop all old servers and
await profile ownership release before executable replacement. Trusted local commands
require no active owner; idle S2 servers release ownership. See the
[compatible update procedure](installation.md#updating-a-compatible-installation).
S3 parent acceptance and independent review remain pending. This guide establishes
no release/deployment or power-loss claim.

## Interrupted application update

Stop every related MCP process before inspecting or changing executable directories.
An unresolved sibling <app>.update directory blocks another updater. Do not delete
it blindly: it may hold your only previous application. The updater's activation
uses two renames; it is not a crash-atomic exchange and does not claim power-loss
survival.

If the original application path is absent and <app>.update/previous exists,
restore that previous directory to the original application path. For example,
substitute the intended absolute paths before running:

```sh
mv -- "<APP>.update/previous" "<APP>"
```

Only do this when <APP> is absent; never merge directories or overwrite another
application. If <APP> exists and .update/previous also exists, activation may have
completed: preserve both, inspect the installed CLI --help/version inventory and
choose the intended executable before cleaning staging. If only .update/replacement
exists while the original app is still present, preparation was interrupted;
preserve the original and remove or move aside only that owned staging directory
after inspection. Unknown combinations require local investigation, not a reset.

Successful updates retain the old executable in <app>.backup-*/application.
These are application backups, not profile/key backups and not permission for an
automatic downgrade. Never run setup/login/profile-remove or modify config,
credentials.enc or the OS key as part of executable recovery. Once the executable
and staging disposition are settled, restart the intended MCP backends and request
a read. The [installation guide](installation.md#updating-a-compatible-installation)
describes retrying the updater from a separately verified extracted archive.

## Credential and creation recovery

| Situation                                       | Action                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version-1 config/old storage                    | Stop the old server; manually inspect uncertain remote creations. Prepare version-2 config with a new nonexistent private root and sign in again. Never point new setup at old state or use the new removal command to erase old-format data. Old cleanup is a separate explicit action using that installation's guide.          |
| Missing/unsafe config                           | Fix the protected version-2 config and separation/permissions. No environment or CLI write override exists.                                                                                                                                                                                                                       |
| Signed out                                      | Explicitly sign in to the same bound account. This does not resume creation.                                                                                                                                                                                                                                                      |
| Pending foreground login                        | Use login --resume within the original deadline/budget, or login --cancel. Original token/body/key are retained encrypted; never invent a replacement retry identity.                                                                                                                                                             |
| Pending refresh after lost response             | Retain the exact encrypted credential record. Startup sends nothing. When an explicit authenticated action needs recovery, the auth layer preserves/replays the original refresh token/body/key under current session fences; do not manufacture a new refresh attempt to bypass uncertainty.                                     |
| Ambiguous credential commit                     | Close the fenced owner. Reopen authenticates only credentials.enc and may find valid old or new state; missing/corrupt state fails. Temporary files are never promoted.                                                                                                                                                           |
| Missing/locked/ambiguous/replaced key           | Restore access to the intended OS facility where appropriate, or prepare a separately selected fresh profile/login. No cached-key fallback or automatic replacement key.                                                                                                                                                          |
| Interrupted explicit removal after key deletion | Normal open remains unavailable. Repeat trusted profile-remove --confirm on the same version-2 selection to finish known local cleanup; do not recursively delete unknown contents.                                                                                                                                               |
| Lost account-status response                    | Start a fresh foreground proof. A completed local deletion is not reversed; an interrupted key-first cleanup needs explicit profile removal retry.                                                                                                                                                                                |
| Lost/interrupted routine result                 | Manually inspect saved routines and a known own draft ID if available. Hosts must not automatically repeat on reconnect or response loss. A deliberate new call starts a new attempt and can create a duplicate. There is no operationId, durable creation receipt, restart resume, automatic deletion or multi-request rollback. |

The private profile contains credentials.enc and owner.lock, with possible private
replacement temps. Keep the corresponding immutable Secret Service key available
on the intended bus. Preserve config/key/credential custody independently of the
application archive; do not copy credentials between origins/accounts.

Recover validates current credential/auth state only. It does not repair old
metadata, reconstruct missing state, send creation, or finish cleanup without an
explicit removal action. Full syntax is in [trusted lifecycle](login.md#commands).

## Restore and filesystem limits

The one authenticated record protects confidentiality/integrity and commits binding
with vault bytes using private temporary write, file fsync, rename and directory
fsync under exclusive ownership. No filesystem type is hard-coded. Actual IO errors
are reported safely; fsync/hardware compliance remains conditional and tests do not
prove power-loss survival. Btrfs qualification belongs to the user.

There is no independent anchor or rollback marker. Restoring an older valid encrypted
credential snapshot is not detected independently and may require fresh login or
trigger backend refresh-token reuse consequences. Do not describe encryption as
rollback detection. Preserve pending refresh identity; do not merge vault snapshots,
manually edit bindings or copy credentials between accounts/origins.

No creation content is retained locally for retry. Auth recovery and foreground
login evidence remain encrypted as required. AI hosts may retain fitness requests,
results and transcripts under their own policies. Removal does not erase those,
remote routines, filesystem snapshots, backups or physical media copies.

## Candidate replacement limits

Same-format executable replacement/recovery qualification belongs to the exact
candidate and its recorded isolated evidence. There is no old/future format
migration support. An archive digest identifies bytes; it does not certify real
deployments or release readiness. Keep the selected application checksum and its
bundled guide together, and retain private credentials/key custody separately.
