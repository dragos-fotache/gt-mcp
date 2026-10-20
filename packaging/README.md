# GymTracka MCP

Compiled stdio MCP server, trusted local CLI and installer. The server uses
version-2 configuration, single-record encrypted credentials and independent
routine-creation calls. Multiple server processes may share a profile: idle
connections release ownership; calls serialize through result delivery. Identify
this private build by its archive SHA256 and inventory, rather than version 0.0.0
alone. Archive availability is not release certification.

Use Linux x64, Node.js 24 or later, compatible util-linux flock and an unlocked
OS Secret Service on an explicitly selected Unix bus. Required safe local IO must
work; there is no filesystem-name gate. Btrfs qualification is user-owned. No general filesystem or power-loss claim follows.
Desktop browser login also needs xdg-open and prepared Google/localhost settings.

For prompted installation, verify/extract this archive and run node install.mjs.
It uses your already-installed Node/npm, asks for new private destinations and
backend/Google/local-port/keyring settings, and leaves writes disabled by default.
It copies the delivered app and runs locked npm ci with install scripts disabled.
Profile setup, browser sign-in and backed-up Hermes registration are separate
operator choices. Fresh installation refuses existing destinations.
See the [interactive procedure](docs/installation.md#interactive-installation).
Use node install.mjs --update for a compatible config2 installation at its existing
application path. Stop all its MCP processes first. The updater stages locked
dependencies, retains the old executable as a backup and preserves external
config/profile/key and Hermes registration. Follow the
[update procedure](docs/installation.md#updating-a-compatible-installation).

Verify the exact archive checksum, extract into a fresh dedicated application
directory and run `npm ci --omit=dev --ignore-scripts` using Node.js 24 or later.
Extract-and-ci is the sole supported installation route. Dependencies require
registry/cache access and are not bundled. No global package, compilation, Pi
runtime or permission extension is needed. Start the absolute installed
`dist/protocol/server.js` or `dist/cli/main.js` entry using Node.js 24 or later.

Start with [installation and prerequisites](docs/installation.md), then
[trusted setup/login/lifecycle](docs/login.md), [server operations](docs/stdio-server.md)
and [recovery and transition](docs/recovery.md). These operator links are
self-contained in the archive. Templates in examples/ are placeholders; prepare
private config/login files outside the application and profile. Never put tokens
in argv, chat, config or logs.

Creation defaults to disabled. Bundled examples use `writesEnabled:false`;
omission is false and invalid config fails closed. Only strict true in the
operator config permits authenticated explicit creation. Every local client of
an enabled process shares that trust without a per-routine prompt. Protect the
config, process, credential root and OS key. Config loads at startup: stop, await
cleanup, edit config, then relaunch. Trusted lifecycle actions require an idle
profile; an active call retains exclusive ownership.

Every creation call is fresh and can duplicate an earlier saved routine. There
is no operationId, creation journal, durable receipt or restart continuation.
After uncertainty, inspect saved routines or a known own draft before deliberately
calling again. Pending credential-refresh identity remains encrypted and must be
preserved. Local cleanup cannot undo remote drafts/saved work or erase host
transcripts, backups or snapshots.

Existing config1/old-format profiles are refused without migration, replay or
reset. Inspect old uncertain remote work, select a separate nonexistent new root
and sign in afresh using config2. Keep existing state untouched unless separately
performing explicit cleanup under its own bundled guide. Keep executable replacement
separate from private config, credentials.enc, owner.lock and the OS-protected key.

This private package grants no new project license. Runtime dependency notices
are in THIRD-PARTY-NOTICES.txt; dependency packages retain their own terms.
