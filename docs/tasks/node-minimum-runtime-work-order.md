# Node minimum runtime policy

**Complete, 2026-10-18.** Source/metadata/docs updated, pinned static/build and
43/43 existing metadata checks pass; separate archive statically inspected.
No newer-Node compatibility or installation/integration tests ran.
[Results](../evidence/node-minimum-runtime-checks.json),
[handoff and candidate identity](../handoffs/node-minimum-runtime.md).

User assignment, 2026-10-18: remove Node-version restrictions except a minimum
of24; explicitly do not test compatibility with newer Node versions. Interpret
the minimum as Node major24 or later, with no upper bound. This supersedes the
older Node24-only runtime/engine policy, not the pinned development toolchain.

Outcome: credential storage and the private packer accept Node24+; root/companion
manifests and lock metadata declare engines.node >=24.0.0. Development, static
checks, build and packaging still use provisioned Node24.21.0/npm11.19.0. Keep npm
and dependency pins, Linux/x64 checks, encryption, key custody, ownership, config,
auth/session and write safeguards unchanged. No Node26 or other compatibility
execution, live access, installed-profile changes, deployment, publication or commit.

Authority: this explicit user revision; retained foundation and T21 successor
specifications; shared MCP draft0.3/backend v1 unchanged; standing
[proportional testing](../decisions/proportional-testing-policy.md).

Edit scope: src/storage/credential/client.ts; scripts/package-artifact.mjs;
root/companion package manifests and their existing lock metadata; the existing
foundation manifest assertion; current runtime-policy/operator/package guides;
task/status/handoff notes. Preserve historical acceptance and exact archives.
No dependency resolution, compiler relaxation, generalized harness or added
compatibility suite. No shared wire/backend changes.

Narrow metadata repair: the existing foundation file expected the retired
"Artifact / journal / intent / key upgrades" matrix row, while the pre-assignment
matrix already used T21's "Credential/config format transitions". Original
bytes confirm the mismatch predates this task. Correct that row-name oracle to
the approved current T21 terminology; preserve the initial42/43 result, not a pass.

Checks: inspect all production Node-version gates; scoped syntax/type/lint/format
checks; existing foundation package-contract metadata checks only; normal pinned
build; prepare a separately identified private archive and inspect its delivered
guard, engine metadata, file hashes/modes and links without running it. No runtime
compatibility, integration, provider or live tests. Record this limited scope
honestly; a refreshed archive does not inherit S6's installed acceptance claim.
Keep any execution target stable and preserve dist/delivery before clean build.

Deliverables: revised source/metadata/docs; new private archive/inventory/checksum
and concise handoff identifying that existing installed copies retain the old
guard. Milestones: contract/baseline; narrow edits/static checks; pinned build/
archive inspection; review/status. Target60–90 minutes, checkpoint90 minutes,
hard stop two hours from assignment with honest handoff. Stop affected work for
unexpected scope/dependency changes, concurrent builds/tests, archive drift or
contract conflict. No successor grant or release certification.
