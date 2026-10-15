# Trusted local setup and Google login

The compiled trusted CLI provisions a private profile and installs a
service-confirmed session for the [stdio MCP server](stdio-server.md). Run it
locally as the profile owner. Stop the MCP server and any other process using
the profile before setup, login or recovery; a competing owner fails safely.
Login is a trusted operator action, never a model-facing tool.

Use the pinned Node 24.21.0 / npm 11.19.0 toolchain and compile with `npm run
build`. Invoke `node dist/cli/main.js` from the project root. The legacy
`gymtracka-mcp` package bin remains the inert foundation entry; final packaging
belongs to T18.

## Prepare the private configuration

The supported storage baseline is Linux x64, supported local ext4 storage and
an available, unlocked OS Secret Service. Supply the intended local Secret
Service bus explicitly; no service or credential is discovered from ambient
configuration. Keep the separately encrypted profile and anchor roots disjoint.
Use new, empty roots for setup. Setup never resets or adopts an existing profile.

Create a user-owned private directory with mode 0700 for configuration and
binding metadata. Configuration and login settings must be distinct, regular,
single-link, user-owned files with mode 0400 or 0600. No symlinks are accepted
in files or traversal paths. Ancestors must be user/root-owned and not writable
by group or others; a root-owned sticky shared ancestor requires a private
0700 subtree below it. Profile and anchor roots use mode 0700 and their files
use mode 0600. Unsafe existing permissions fail closed rather than being repaired.

Use absolute normalized paths, without `.` or `..` segments, duplicate slashes
or control characters. Keep config, login settings, binding descriptor and its
fixed `.pending` receipt outside both storage roots, with distinct paths. The
descriptor's immediate parent must be user-owned mode 0700. Leave the descriptor
and receipt absent for first setup: the CLI creates them. Do not fabricate or
manually edit binding identity or recovery receipts.

The existing strict server config remains version 1. The following is a schema
template, not a runnable configuration; replace angle-bracket placeholders with
operator-supplied deployment values in private files:

```json
{
  "version": 1,
  "serviceOrigin": "<canonical HTTPS service origin>",
  "storage": {
    "profileRoot": "<absolute normalized new profile root>",
    "anchorRoot": "<absolute normalized separate new anchor root>",
    "secretServiceBusAddress": "unix:path=<absolute Secret Service bus socket>"
  },
  "bindingDescriptorPath": "<absolute normalized descriptor path>",
  "writesEnabled": false
}
```

Create a separate trusted login settings file using this template:

```json
{
  "version": 1,
  "googleWebClientId": "<registered public Google web client ID>",
  "browserOrigin": "http://localhost:<registered fixed port>"
}
```

Both files have a 65536-byte bound and require strict UTF-8 JSON with no BOM,
duplicate keys, unknown keys or type coercion. All three login fields are
required. Use the registered public web client ID that the backend accepts as
its Google audience; the CLI cannot verify that deployment match locally. The
origin must be exactly lowercase `http://localhost:<port>`, with a decimal port
from 1024 through 65535, no leading zeros, slash, path, credentials, query or
fragment. Register that exact JavaScript origin for the Google web client.
Registration, audience, service origin, port and private secret facility are
external operator inputs; there are no built-in live values.

The chosen fixed port must be free on both `127.0.0.1` and `::1`; both listeners
are required. The helper does not use wildcard addresses, random fallback ports
or a numeric-IP browser URL. For the browser launch, use a local Linux desktop
with DISPLAY or WAYLAND_DISPLAY and executable `/usr/bin/xdg-open`. The launcher
uses that fixed executable, one canonical localhost page argument and no shell.
It ignores BROWSER and passes an explicit desktop/home/XDG/LANG environment
allowlist with PATH fixed to `/usr/bin:/bin`. Exit 0 within 10 seconds acknowledges
browser handoff; authentication still requires the service-confirmed result.
Unsupported/headless launching fails with safe guidance. No token-paste fallback
is available.

## Commands

Replace each path placeholder with its prepared absolute normalized path. Flags
following the command may appear in any order. Unknown/duplicate flags, extra
positionals, missing values, relative paths and simultaneous resume/cancel are
rejected before filesystem, network, browser or signal handling begins. There
is no ambient configuration lookup.

```text
node dist/cli/main.js --help
node dist/cli/main.js setup --config <absolute normalized config path>
node dist/cli/main.js login --config <absolute normalized config path> --login-config <absolute normalized login settings path>
node dist/cli/main.js login --config <absolute normalized config path> --login-config <absolute normalized login settings path> --resume
node dist/cli/main.js login --config <absolute normalized config path> --login-config <absolute normalized login settings path> --cancel
node dist/cli/main.js recover --config <absolute normalized config path>
```

Run setup once to provision the pre-auth profile and publish its binding
descriptor. Then run normal login and activate the Google button in the opened
page. The backend validates the Google credential and determines account
identity. Explicit re-login can replace only a session for the same origin and
account; selecting another Google account cannot switch this profile's account.
After acknowledged completion and CLI exit, start the stdio server with the
same server config. A successful session uses the existing T08 read workflow.
Login does not change `writesEnabled` or enable routine creation.

Use `--resume` only to retry protected exchange evidence left after an uncertain
exchange. It sends the identical prepared body and key, without opening a
browser, acquiring another Google credential or requesting a new challenge.
The original challenge deadline, persisted retry delay and maximum two sends
still apply. A missing, expired or exhausted attempt cannot be resumed. An
expired temporary credential is cleared on the next trusted login entry;
no background process guarantees erasure while the CLI is stopped.

Use `--cancel` to clear a pending foreground exchange after a crash, preserving
prior authentication evidence. It performs no browser or exchange network work.
Cancellation cannot retract an exchange already accepted by the service and
does not promise revocation of an unknown service session.

Use recover when directed to reconcile a recorded descriptor transition. It
only verifies recorded source/target metadata and finishes or reconciles local
publication; it never obtains a challenge, exchanges credentials or resets a
corrupt profile. If recovery still fails, preserve the private evidence and
seek bounded review. Do not delete roots, receipts or keys to force a retry.

Ctrl-C (SIGINT), SIGTERM and the page's Cancel action cancel owned work and await
cleanup. Closing the browser tab or Google popup does not reliably signal
cancellation; the challenge deadline still bounds waiting. A begun storage
commit may have succeeded despite interruption: recovery guidance takes
precedence, and cancellation never claims rollback.

## Diagnostics and privacy

CLI stdout is always empty, including help. Fixed status and guidance go to
stderr. The CLI does not print private paths, account/binding/client IDs,
credentials, response bodies or native exception details. Do not paste Google
tokens into commands, environment variables, model messages or logs. Keep
private configuration, stores and diagnostic evidence out of the repository.

Setup discloses retention and transcript exposure before reporting completion.
Unresolved private recovery evidence may remain indefinitely until explicitly
settled or retired; no automatic operation-evidence expiry is promised.
An uncertain exchange retains the exact Google-bearing request in the encrypted
credential vault for bounded explicit recovery. Successful installation consumes
that temporary evidence; acknowledged cancellation/expiry restores predecessor
evidence. Crashes and storage ambiguity can retain protected evidence until
trusted recovery. Encryption does not promise physical erasure from runtime
memory, backups or storage media. The credential-free pending metadata receipt
still contains private binding identity.

Host applications may expose account data returned by MCP reads to models and
retain it in transcripts. Local encrypted credentials do not prevent that
separate disclosure. Consider the host's transcript and data-retention settings
before connecting the profile.

| Exit code | Meaning and next action                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0         | Acknowledged completion; start MCP only after CLI cleanup and exit.                                                                                                            |
| 2         | Invalid usage or missing/unsafe configuration; correct private configuration.                                                                                                  |
| 3         | Ownership, storage, corrupt/versioned state or metadata recovery required; stop other owners and preserve evidence. Use recover only for a recorded metadata transition.       |
| 4         | Sign-in/provider/network/expiry failure, no resumable attempt, unsupported launcher or internal failure; follow fixed guidance, using explicit resume/cancel where applicable. |
| 130       | Cancellation after owned settlement; a begun install may still require recovery, which takes precedence as exit 3.                                                             |

The delivered baseline is verified with isolated local facilities and a
controlled launcher capability. It does not establish real desktop/Google,
live-backend, named-host or release interoperability. Those external gates
remain separate work.
