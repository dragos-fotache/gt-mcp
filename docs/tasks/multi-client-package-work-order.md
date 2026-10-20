# Multiple clients S2 — private install package

**Complete, 2026-10-18.** Final57/57 exact-archive checks across five files pass,
593 stable hashes and owned cleanup confirmed.90 delivered files/79 runtime JS/
111 locked dependencies; all runtime JS matches S2, prior eight delivery files
unchanged. [Handoff](../handoffs/multi-client-package.md),
[checks/history](../evidence/multi-client-package-checks.json). Installer remains
fresh-only; compatible update procedure documented. No S3/deployment claim.

User requests a new install package and an answer
about updating an existing installation. Window starts11:08 UTC; checkpoint12:38,
hard stop13:08 with an honest handoff.

Outcome: prepare a separately identified private S2 archive/inventory under
dist/delivery/multi-client-s2/, preserve prior deliveries and verify the exact
archive through isolated locked installation. Explain the existing fresh-only
installer and document compatible side-by-side executable replacement. No updater
implementation, laptop deployment, real credentials/backend/writes, publication,
staging/commits or automatic S3 acceptance.

Authority: user packaging grant; standing primary-agent/proportional testing
policies; shared MCP draft0.3/backend v1; T21 successor storage spec and completed
multiple-client S1/S2 work orders. S3 parent acceptance/independent review and
existing host/live/release gates remain pending; packaging does not satisfy them.

Settled behavior: installer refuses existing app/config destinations and creates
a fresh profile configuration. Compatible config2/single-record application
replacement installs into a new app directory, retains private config/profile/key,
stops all old server processes before switching the host entry, and does not run
setup/login/reset as an upgrade. Config1/old-format transition remains separate.
Current S2 permits idle connected servers sharing a profile and serializes calls.

Edit scope: shipped/repository installation/server/package guides, narrowly update
the installed holder smoke to current idle ownership and add exact-archive two
authenticated-server proof, task/evidence/handoff/index. No runtime, dependency,
manifest/lock, shared-contract or installer behavior changes. Preserve historical
guides/evidence and unrelated uncommitted work.

Commands/environment: provisioned Node24.21.0/npm11.19.0, existing locked tools,
package:artifact and scoped static checks. Existing isolated ext4/private-provider/
synthetic-TLS runner only; exact archive extracted npm ci --omit=dev --ignore-scripts.
No build/install while tests use that execution target. Reuse frozen S2 compiled
outputs after verifying their hashes; rebuild only if necessary, preserving prior
delivery bytes. No newer-Node or Btrfs testing, SSH, ambient provider, .pi changes.

Acceptance: verify all shipped runtime bytes equal S2's stable final target and
reviewed import closure; inspect member modes/hashes/input identity, shrinkwrap and
standalone links. Run complete installer, artifact-install, document, installed
holder and foundation package suites against the retained candidate. Verify two
installed authenticated processes can coexist/call/close without an idle lock;
preserve default-deny and existing-destination refusal checks. Capture exact
selection, stable hashes, cleanup and historical archive preservation. This is
bounded package verification, not the deferred parent fault/backpressure campaign
or clean source reproduction/independent review.

Deliverables/milestones: freeze corrected operator docs and smoke; package exact
bytes; run isolated acceptance; record checksum/inventory, checks, limits and
install/update instructions. Stop affected work on unsafe archive/state mutation,
runtime mismatch, unavailable isolation, contract conflict or time limit. Record
failures without excluding checks or weakening expectations.
