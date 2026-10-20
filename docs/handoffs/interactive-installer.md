# Interactive installer delivery

**Complete, 2026-10-18.** User requested an installer that prompts for required
configuration, using already-installed Node. [Work order](../tasks/interactive-installer-work-order.md),
[verification record](../evidence/interactive-installer-checks.json).

## Candidate and use

```text
dist/delivery/interactive-installer/gymtracka-mcp-0.0.0.tgz
SHA256: 856582c7e5dd88ac3a6e5d8d643fe81f432aa10747b0ba0eef41951e54f9cb2e
```

The sibling gymtracka-mcp-0.0.0.inventory.json identifies87 delivered files,
76 runtime JS and111 locked dependencies. All delivered runtime JS remains
byte-identical to the prior minimum-Node candidate. Original R1/S6/minimum-Node
archives/inventories are unchanged. Version0.0.0 alone is not candidate identity.

Copy this archive/inventory to the receiving Linux x64 machine. Verify its digest,
then extract in a fresh directory and run the delivered installer:

```sh
mkdir -m 700 gymtracka-installer
tar -xzf "<ARCHIVE>/gymtracka-mcp-0.0.0.tgz" -C gymtracka-installer --strip-components=1
node gymtracka-installer/install.mjs
```

No Node path or T01_NODE_HOME input is needed. Existing Node24+ and npm must be
on PATH; the installer does not download/replace them or install global packages.
It prompts for fresh application/config destinations, canonical HTTPS origin,
matching public Google web client ID, registered fixed localhost port and explicit
Secret Service socket. Operator writesEnabled defaults false, with an explicit
choice to enable creation. The first confirmation precedes filesystem mutation.

The installer copies only delivered allowlisted content, runs locked npm ci with
scripts disabled, writes private0700/0600 configuration and prepares a Hermes
snippet plus exact follow-up commands. Existing destinations/symlinks/unsafe
ancestry are refused. Setup is separate opt-in and requires the unlocked default
login keyring. Browser login follows only successful setup and explicit choice.
No client secret, Google password, token paste or Android credential is requested.

After successful login, optional Hermes registration delegates to the installed
Hermes interactive add command. The explicit adding/replacing choice backs up
the main config to the new private config directory first. Other profiles/clients
can use the prepared snippet manually. Startup uses command:node. If optional
work is deferred/fails, follow private next-steps.txt and the bundled recovery
guide; never reset a partial/existing credential profile to rerun fresh setup.

## Verification and limits

Provisioned Node24.21.0/npm11.19.0 only: typecheck, scoped JavaScript syntax/ESLint/
Prettier and pinned build PASS. Exact final candidate consumed through
GT_PACKAGE_REFRESH_ARTIFACT_ROOT by the complete selected suites:

- test/installer/install.test.mjs:4/4 PASS; real isolated locked dependency install,
  protected configs/default denial, explicit write choice, no accidental profile/
  Hermes edits, canary exclusion, cancellation/EOF/unsafe/existing path refusal and
  real CLI failure on an isolated unavailable bus.
- test/packaging/artifact-install.test.mjs:5/5 PASS; actual locked extract/install,
  file/mode/notice/dependency closure, CLI help and official-SDK unconfigured stdio.
- test/packaging/documents.test.mjs:3/3 PASS; standalone guides/templates/budgets.
- test/foundation/package-contract.test.mjs:43/43 PASS; package/config metadata.

Final55/55 across four files, zero failures/skips. Static inspection verifies all
87 member hashes/modes,15 local documentation links and unchanged frozen package
inputs. The initial fixture failed before tests ran because the generated
manifest's files allowlist omitted install.mjs; that failure/unexecuted four cases
are not passes. Inclusion was repaired, focused4/4 and final55/55 then passed.

Successful real Google login/interactive Hermes registration through the installer
was not qualified here. Existing trusted CLI and public Hermes command semantics
are reused within their boundaries; no ambient keyring/provider/profile/account
was used. No newer-Node compatibility tests, live backend/Android/domain writes,
user-machine installer execution or deployment occurred. No general release or
clean-reproduction claim, source commit, publication or automatic successor.
