# T21-S6 bounded laptop installation handoff

This is an operator handoff, not an executed laptop installation or release grant.
Select the exact candidate checksum/inventory from [the S6 handoff](t21-s6.md).
Historical R1 and the laptop application files stay unchanged by repository work.
Version0.0.0 alone cannot identify the candidate.

The discussed laptop has application files only and no existing profile/login.
Use fresh setup. If any profile has since been created, stop its server and inspect
uncertain remote routines before proceeding; retain old state and use that old
installation's bundled cleanup procedure only as a separately explicit local action.
The new candidate never migrates/resets/discards config1 or old-format state.

Prepare these external inputs locally; do not put real values in chat/evidence:

- Linux x64 and disposable/intended Node24.21.0/npm11.19.0; compatible flock,
  available unlocked Secret Service and desktop xdg-open for browser login.
- Intended fixed HTTPS service origin and registered Google web client ID.
- Available unprivileged fixed dual-loopback browser port matching registration.
- Explicit local Secret Service socket, private parent and nonexistent profileRoot;
  distinct private config2/login-settings files outside application/profile roots.
- Fresh dedicated application directory, exact archive/inventory and registry/cache
  access for locked runtime dependencies.

Verify the digest, extract into the fresh application directory and follow the
archive's standalone installation/login/server/recovery guides. The sole install
route is extract + `npm ci --omit=dev --ignore-scripts` using the pinned toolchain.
Use installed absolute dist CLI/server paths from other working directories.
Start with `writesEnabled:false`; templates contain placeholders and are disabled.
Perform trusted local setup and login, then verify ordinary reads and owner release.
No personal credentials, tokens or private paths belong in repository logs/evidence.

Every explicit enabled creation is fresh and can duplicate earlier work, including
after response loss or restart. Inspect list_routines or a known routine with
get_routine after uncertainty before deliberately choosing another attempt. Restart
never resumes creation. Configuration is a startup snapshot: stop/await cleanup,
edit/relaunch to change write permission. Login/logout are trusted local actions.

Credentials live in one encrypted credentials.enc with an OS-protected key and
owner.lock. Keep them outside executable replacement and do not reset them to repair
an install. Exact pending-refresh identity remains recoverable. An older valid
restored credential snapshot is not independently detected; follow auth guidance.
Local removal does not roll back remote work or erase transcripts/backups.

Btrfs testing remains user-owned; production has no filesystem-name gate. Repository
ext4 IO evidence does not certify other platforms/network filesystems or power loss.
Actual Pi CLI/modes/lifecycle/output, current Android delivery, real Google/browser
T19 and independent T20 remain unverified release gates. No automatic deployment,
write enablement, publication, old-state deletion or successor work follows here.
