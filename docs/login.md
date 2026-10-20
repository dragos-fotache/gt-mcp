# Trusted local setup, login and lifecycle

This guide accompanies the installer-update private candidate with S2 runtime,
with strict version-2 config. Its runtime accepts Node24 or later; newer-Node
compatibility testing was excluded by user instruction. The original S6 archive
and its historical acceptance remain unchanged.
Version0.0.0 alone is not candidate identity; use its archive checksum/inventory.
Earlier archives and installed deployments retain their bundled guides. S3 parent
acceptance and independent review remain pending. This guide makes no release or
deployment claim. Login/logout are trusted local actions, never model-facing tools.
Wait for active calls to finish before using a separate CLI process; idle S2
servers hold no profile owner. Stop older lifetime-owner servers first. After
profile/account replacement, restart connected servers.

## Private configuration

Use Linux x64, Node24 or later and an available, unlocked OS Secret
Service. Supply its intended Unix bus address explicitly. The store has no
filesystem-name/magic restriction: required safe IO must succeed. Agent verification
uses isolated ext4; Btrfs testing is user-owned. This is not certification of every
filesystem, network storage, another OS or actual power-loss survival.

Create a private0700 parent directory and separate user-owned0400/0600 regular,
single-link config/login files. Paths must be absolute/normalized and symlink-free;
ancestors must satisfy the existing trusted ownership/write rules. Keep both files
outside the installed application and profileRoot. **Leave profileRoot nonexistent**: explicit setup creates it
exclusively, even an existing empty root is refused. Profile directories/files use
0700/0600. Unsafe permissions are refused, not silently repaired.

```json
{
  "version": 2,
  "serviceOrigin": "<canonical HTTPS service origin>",
  "storage": {
    "profileRoot": "<absolute normalized nonexistent private profile root>",
    "secretServiceBusAddress": "unix:path=<absolute OS Secret Service socket>"
  },
  "writesEnabled": false
}
```

These are placeholders, not deployment inputs. Optional existing transportBudgets,
protocol.maxToolResultBytes and storage.timeoutMs retain their validated constraints.
No anchorRoot or bindingDescriptorPath is accepted. Binding and auth vault are
stored together in credentials.enc, with owner.lock and possible private temporary
replacements. Temporary files are never promoted on startup.

Login settings remain version1, separate from server config:

```json
{
  "version": 1,
  "googleWebClientId": "<registered public Google web client ID>",
  "browserOrigin": "http://localhost:<registered fixed port>"
}
```

Use the intended Google client, HTTPS backend origin and available unprivileged
localhost port. The owned helper reserves both loopback families; do not paste
tokens into a model, config, logs or command arguments. Real Google/browser
qualification remains T19, outside isolated package/provider checks.

## Commands

Replace all angle-bracket placeholders with prepared local paths. No global binary
installation is needed. The examples select the absolute installed trusted CLI explicitly. The application
directory is the extracted package root. Select Node24 or later on PATH as shown in
installation, then replace the quoted path placeholders below.

```sh
node "<absolute application directory>/dist/cli/main.js" --help
node "<absolute application directory>/dist/cli/main.js" setup --config "<CONFIG>"
node "<absolute application directory>/dist/cli/main.js" login --config "<CONFIG>" --login-config "<LOGIN_CONFIG>"
node "<absolute application directory>/dist/cli/main.js" login --config "<CONFIG>" --login-config "<LOGIN_CONFIG>" --resume
node "<absolute application directory>/dist/cli/main.js" login --config "<CONFIG>" --login-config "<LOGIN_CONFIG>" --cancel
node "<absolute application directory>/dist/cli/main.js" recover --config "<CONFIG>"
node "<absolute application directory>/dist/cli/main.js" sign-out --config "<CONFIG>"
node "<absolute application directory>/dist/cli/main.js" account-status --config "<CONFIG>" --login-config "<LOGIN_CONFIG>"
node "<absolute application directory>/dist/cli/main.js" profile-remove --config "<CONFIG>" --confirm
```

Setup creates a fresh key/profile, never migrates existing state. Config1 and old
profiles are refused without mutation/reset; select a different nonexistent root
for explicit fresh setup and inspect old uncertain remote work first. Successful login
installs the backend-confirmed account/session and vault atomically. Existing-account
login must confirm that same account; it cannot silently switch accounts. Foreground
login retains encrypted exact exchange evidence for bounded explicit resume/cancel.

Recover validates the selected record/auth state without backend sends or repair.
It can report ready, or directs pending foreground login to explicit resume/cancel.
Missing/corrupt/old state requires fresh configuration/profile/login; recover never
creates a replacement key, repairs an external descriptor or resumes creation.

Sign-out fences/settles domain and auth work, advances generation and durably clears
usable grants before best-effort dedicated-session logout. Account identity remains
bound. Account-status uses a fresh proof matching that account and challenge/purpose;
only authoritative matching deletion authorizes automatic local credential cleanup.
A lost proof reply requires a new foreground attempt, not a stored proof replay.

Profile removal requires explicit local confirmation and exclusive ownership. It
deletes the authenticated exact key first, then known credential files/temps. Unknown
contents or partial cleanup fail safely. owner.lock/root remain available for explicit
cleanup retry and are never unlinked while held. After interrupted key deletion,
normal open fails; repeat profile-remove explicitly to finish. Choose a different
new root for later setup. It never deletes backend data, host transcripts or backups;
physical erasure is not promised. Retired retire-operation and setup --reconcile
commands are rejected. See [installation](installation.md), [recovery](recovery.md) and
[server operations](stdio-server.md).
