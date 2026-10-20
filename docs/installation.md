# Installation and updates

Use the private archive and its sibling inventory to identify exact application bytes. Version 0.0.0
alone does not identify a build. Verify its SHA256 before extracting. Archive availability does not
establish release readiness.

## Prerequisites and installation

Use Linux x64, Node.js 24 or later, compatible util-linux flock and an available, unlocked OS Secret
Service on an explicitly selected Unix bus. Required protected paths, private modes, atomic
replacement and fsync operations must succeed. There is no filesystem-name gate. Btrfs qualification
is user-owned. Other OS/network storage and actual power-loss survival are not certified. Desktop
browser login also needs xdg-open and prepared deployment inputs below.

## Interactive installation

Use your already-installed node and npm from PATH. No private Node installation, global npm package
or system Node replacement is needed. Verify the archive SHA256 against the supplied inventory, then
extract it into a fresh temporary application directory and start the bundled installer:

```sh
mkdir -m 700 gymtracka-installer
tar -xzf "<ARCHIVE>/gymtracka-mcp-0.0.0.tgz" -C gymtracka-installer --strip-components=1
node gymtracka-installer/install.mjs
```

The installer prompts for new application/config directories, your canonical HTTPS backend origin,
matching public Google web client ID, registered localhost port (default 8765), and Secret Service
Unix socket. It explains Google origin and unlocked default login-keyring prerequisites; it does not
install/configure the backend, Google client or desktop keyring. Credentials/passwords are entered
only in the browser/desktop, never in installer fields.

Routine creation defaults to disabled. An explicit operator choice can enable it without per-routine
confirmation; all clients of that process share the setting. After confirmation, the installer
copies the delivered application, runs locked npm ci --omit=dev --ignore-scripts and writes
protected config version 2/settings version 1 files. It refuses existing destinations and leaves the
profile nonexistent until you explicitly choose setup. For an existing installation use the explicit
--update mode below; never run fresh setup over an existing profile.

Profile setup, foreground Google login and Hermes registration are optional steps. With login
complete, registration runs Hermes's own interactive add command after backing up its current main
config; choosing that step explicitly permits adding or replacing the gymtracka entry. Use the
generated snippet manually for other profiles/clients. The registration uses command:node and
absolute application/ config paths. Run /reload-mcp in Hermes afterward. Multiple server processes
can share one profile: idle connections hold no owner; calls wait and serialize under exclusive
ownership through result delivery. See [server operations](stdio-server.md).

If an optional step is deferred or fails, the application/config files remain. Private
hermes-mcp.yaml and next-steps.txt in the chosen configuration directory contain the exact follow-up
commands. A failed setup can leave partial profile state: follow the recovery guide, not a
reset/repeated fresh setup. Cancellation before confirmation creates no files; interruption after
confirmation can leave only the new selected installation partially complete. No existing
installation is deleted or rolled back.

## Manual installation

Obtain the private archive and its inventory. Compare its SHA256 with the archive digest recorded in
the inventory; the checksum must identify this exact build. All angle-bracket values below are
placeholders for prepared local paths, not commands to run unchanged.

```sh
sha256sum "<ARCHIVE>/gymtracka-mcp-0.0.0.tgz"
mkdir -m 700 "<NEW-APP-DIRECTORY>"
tar -xzf "<ARCHIVE>/gymtracka-mcp-0.0.0.tgz" -C "<NEW-APP-DIRECTORY>" --strip-components=1
node --version
npm --version
npm --prefix "<NEW-APP-DIRECTORY>" ci --omit=dev --ignore-scripts
node "<NEW-APP-DIRECTORY>/dist/cli/main.js" --help
```

Node must be major 24 or later. Development and installation use your existing Node.js 24+ and npm.
Both interactive and manual paths use extract-and-ci, the sole supported install route. Do not
install this tarball as a consumer dependency: npm can re-resolve transitive versions that way.
Locked runtime dependencies require registry or populated cache access; dependencies, Node and OS
helpers are not bundled. No global install, source compilation or Pi runtime/permission extension is
needed. Use absolute installed JS entry paths when launching from another directory.

## Fresh private setup

Prepare the intended HTTPS backend origin, Google web client ID, available unprivileged
dual-loopback browser port, explicit Secret Service bus address and a private parent with a
**nonexistent** profileRoot. Keep server config and login settings separate, protected and outside
both the application directory and profileRoot. Deployment inputs are supplied by the operator;
examples do not identify a live service. Bundled templates start with `writesEnabled:false`.

[Trusted setup/login](login.md) defines strict config version 2, unchanged settings version 1,
permissions and the installed CLI setup/login commands. [Server operations](stdio-server.md) shows
the installed stdio entry, startup config policy and creation behavior. [Recovery](recovery.md)
covers pending authentication, ambiguous IO and cleanup. Login/logout stay local trusted actions,
never model-facing tools.

For a config version 1/old-format installation: stop its server, inspect uncertain remote routines,
create a separate version-2 config/new nonexistent root and sign in again. New code refuses config
version 1/old files without mutation and never migrates, replays or discards them. Do not repoint
setup at an existing empty root. Old-format cleanup is a separate explicit action using that
installation's bundled guide.

## Updating a compatible installation

Verify/extract the new archive into a separate temporary directory as above, then:

```sh
node gymtracka-installer/install.mjs --update
```

Select the existing application directory and protected external server config. Stop every MCP
server using that application/profile and await ownership release, then confirm shutdown and
replacement in the installer. Closing a Hermes UI may leave its backend/MCP child alive; the
installer cannot prove shutdown. Keep config, login settings, profileRoot/credentials.enc and the
corresponding OS key outside the application directory. Config2 and single-record state are
required; this mode does not migrate config version 1 or old-format state.

The updater prepares a separate private sibling <app>.update/replacement with locked npm ci
--omit=dev --ignore-scripts, validates your existing config, then renames the previous application
aside and activates the replacement at the same path. Dependency/config preparation failure leaves
the old application unchanged. Ordinary activation failure attempts to restore it. The previous
executable is retained under a private sibling <app>.backup-*/application; backups accumulate until
you deliberately remove them. Unrecognized top-level app files, unsafe paths, embedded
config/profile and an existing .update directory are refused.

External config/login/profile/key and writesEnabled are preserved. No setup, login, profile removal
or Hermes config edit occurs. Existing server entry paths and --config arguments continue to work.
Restart the Hermes backends or reload MCP as appropriate, then request a read. New server processes
may share the profile; an old lifetime-owner process can still block them until stopped.

The two activation renames are not an atomic exchange. Abrupt termination/power loss can leave a
sibling .update directory and, between renames, no application at the original path. Preserve that
directory and use the
[interrupted-update recovery instructions](recovery.md#interrupted-application-update). No automatic
deletion or replay of an unresolved update occurs. Retaining the old executable does not establish
general credential-format downgrade safety.

Manual side-by-side extract-and-ci into a new directory remains available; retain the external
config/profile/key and update the host's absolute server entry path. Never recreate credentials to
repair application installation.
