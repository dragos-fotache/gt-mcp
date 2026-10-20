# Minimum-only Node runtime refresh

**Complete, 2026-10-18.** User requested removal of Node-version guards except a
minimum of24 and explicitly excluded compatibility testing. Runtime storage and
the packer now reject Node majors below24 only. Root/companion manifests and lock
metadata declare engines.node >=24.0.0. Development/build pins remain
Node24.21.0/npm11.19.0; npm/dependency pins and Linux/x64/auth/storage/write guards
are unchanged. [Work order](../tasks/node-minimum-runtime-work-order.md),
[check record](../evidence/node-minimum-runtime-checks.json).

## Laptop candidate

Use the refreshed archive, not the original Node24-only S6 artifact:

```text
dist/delivery/node-minimum/gymtracka-mcp-0.0.0.tgz
SHA256: 6e8d089aaa05fe40c862cb00e81012d5befbf1ce254efab2bb4328ffc4853e16
```

The sibling gymtracka-mcp-0.0.0.inventory.json records86 delivered files,
76 runtime JS and111 locked dependencies. Archive manifest/shrinkwrap both declare
`>=24.0.0`; the emitted credential client has the major<24 guard. All archive file
hashes/modes and14 local document links were inspected. No dependency versions,
resolutions or integrity values changed. The original S6/R1 archive/inventory
files are preserved byte-for-byte. Version0.0.0 alone does not identify a candidate.

Follow the bundled installation/login/server/recovery guides using the selected
Node24-or-later executable. The earlier laptop procedure still applies, using
this archive/checksum and the laptop's intended Node path in Hermes. Existing
installed applications, credentials, keyrings and Hermes registrations were not
changed by this source task. Executable replacement is a separate operator action:
stop the server and await profile release, retain the protected config/profile/key,
then select the refreshed application. Do not rerun setup or reset credentials to
replace application files. No automatic old-format migration is introduced.

## Checks and limits

On the provisioned Node24.21.0/npm11.19.0 toolchain:

- npm run typecheck: PASS.
- Scoped ESLint, Prettier and node --check scripts/package-artifact.mjs: PASS.
- npm run build: PASS; historical delivery files restored with matching hashes.
- Existing test/foundation/package-contract.test.mjs: final43/43 PASS, zero skips.
  The initial42/43 run exposed a pre-existing expected matrix-row name from the
  retired journal policy. Original saved inputs confirm it; the metadata oracle
  now uses the approved T21 credential/config terminology. No product expectation
  was weakened to fit failing runtime behavior.
- npm run package:artifact with a fresh separate output: PASS; static archive
  membership/hash/mode/engine/guard/link inspection: PASS.

These are source/build/package-metadata checks, not Node26 compatibility proof.
No newer-Node runtime, integration/provider/live tests, clean install or installed
package replay was performed, as scoped. The refresh does not inherit the exact
S6 installed/clean-reproduction acceptance for its changed bytes. T17/current
Android/T19/independent T20 gates and user-owned Btrfs work keep their dispositions.
No deployment, live write enablement, publication, staging, commit or successor.
