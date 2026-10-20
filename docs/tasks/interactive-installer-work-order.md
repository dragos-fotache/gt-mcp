# Interactive local installer

**Complete, 2026-10-18.** Bundled installer, operator guides and separate private
archive delivered. Final55/55 checks in four files pass, zero failures/skips;
type/syntax/lint/format/build and archive identity inspection pass.
[Results](../evidence/interactive-installer-checks.json),
[handoff/checksum](../handoffs/interactive-installer.md).
No real user installation/login/Hermes edit or newer-Node compatibility run.

User assignment2026-10-18: create an automated installer that prompts for needed
information. Outcome: ship dependency-free install.mjs in the private archive;
run it using already-installed Node24+ and npm. No runtime download/global install,
T01_NODE_HOME prompt, source build or backend changes on the receiving machine.

Authority: this user request, minimum-only Node policy, current config2/settings1
and T21 storage/ownership/auth specifications, existing trusted CLI and extract+
locked npm ci installation policy; [proportional testing](../decisions/proportional-testing-policy.md).

Settled flow: collect fresh application/config directory choices, canonical HTTPS
backend origin, matching public Google client ID, fixed registered localhost port
and explicit Unix Secret Service socket. Explain required Google registration and
unlocked default login keyring. Optional writesEnabled is an operator setting,
strict boolean default false; explain all connected clients may create without
per-routine confirmation. Show a nonsecret action summary and ask before filesystem
mutation. Copy only delivered allowlisted package files into the fresh application;
run existing npm ci --omit=dev --ignore-scripts. Create0700 private dirs and0600
config2/settings1, leave profileRoot nonexistent unless explicit setup is selected.
Generate private Hermes YAML/next-step instructions with command:node.

Profile setup and subsequent browser login are separate opt-in trusted CLI steps.
Unavailable keyring/launcher/setup fails safely with guidance; no provider bypass,
token paste, keyring creation/unlock, OS installation or auth retries. Successful
login requires actual CLI exit success, never a browser-launch assumption. Optional
Hermes registration delegates to hermes mcp add after a local config backup; Hermes
owns its own prompts/config handling. That opt-in explicitly asks about adding or
replacing the gymtracka entry; it never silently replaces an entry. Missing Hermes leaves usable private snippet.
Do not overwrite an existing app/config/profile or an existing Hermes server entry
silently. No package migration, credential transfer/reset or live domain mutations.

Scope: scripts/install.mjs, minimal packer inclusion, focused test/installer cases
and package membership expectation, shipped installation/README guides, task/status/
evidence/handoff docs. No new dependencies/manifest/compiler/schema changes.
Preserve all historical archives and uncommitted work. No actual user install,
Hermes config edit, login, .pi change, release, staging/commit or successor here.

Verification: early syntax/lint/format; isolated process-level installer main path
with real locked npm install, protected configs/default-denial/no profile/no private
input output; cancellation and overwrite/path refusal; explicit write choice;
actual setup failure on an isolated unavailable bus, never ambient credentials.
Use small simple temporary fixtures and existing package helpers; no generalized
PTY/interception framework. Final complete active installer selection plus existing
package artifact/install, standalone guide and foundation metadata regressions
appropriate to changed packaging; pinned production checks/build and exact archive
membership/hash/mode/link inspection. No Node26/newer-Node compatibility testing,
real Google/backend/Android/provider qualification or unrelated domain suites.
Keep source/build/archive targets immutable during tests; no install/build racing
tests on the same target. Package fixtures install only their owned extracted copies.

Environment: provisioned Node24.21.0/npm11.19.0 for all development commands;
offline synthetic inputs, private temp HOME/npm config/cache/Unix-bus selections;
public locked npm downloads only. No personal/live backend/account/browser/model
resources. Fixed sanitized installer diagnostics; never echo submitted URL/client
ID, credentials, raw child failures or personal config. Values live only in chosen
protected files; user handles credentials in browser/desktop prompts directly.

Milestones: contract/source baseline; small installer and early checks; isolated
process cases and package inclusion; final owning/regression checks, new separate
archive and handoff. Window08:00 UTC, checkpoint09:30, hard stop10:00 with honest
handoff if incomplete. Stop affected work for unsafe overwrite/ownership/privacy,
public contract conflict, dependency/OS expansion, missing safe fixture or deadline.
