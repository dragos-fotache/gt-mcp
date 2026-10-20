# Building a private runtime candidate

The installer-update package is separately identified under
`dist/delivery/installer-update/`, with explicit in-place application updates,
staged locked dependencies, external config/profile preservation and retained
previous executables. S2 runtime bytes remain unchanged; earlier delivery archives
and evidence remain historical. See the installer-update handoff for exact identity
and verification; no S3 parent acceptance or deployment follows from packaging.

The separately authorized multiple-client S2 package lives under
`dist/delivery/multi-client-s2/`. It packages the completed S1/S2 runtime and the
existing fresh-only installer, with compatible side-by-side update instructions.
S3 parent acceptance, independent review and deployment remain separate gates.
Earlier archives and their evidence remain unchanged. Current packaging evidence
is recorded in the multiple-client package handoff; historical sections below
describe earlier candidates, not acceptance of these new bytes.

The user's 2026-10-18 minimum-Node revision produces a separate archive under
`dist/delivery/node-minimum/`. Its runtime and packer accept Node24 or later;
development/build/packaging execution remains on Node24.21.0/npm11.19.0.
Newer-Node compatibility testing was explicitly excluded. Original S6/R1 archives
and their acceptance evidence remain unchanged; the refresh does not inherit
their installed/clean-reproduction qualification.

T21-S6 prepares a separately identified private candidate for config2, a single
encrypted credential record and invocation-local creation. Version0.0.0 is unchanged;
output lives under `dist/delivery/t21-s6/` and its exact archive checksum/inventory
identify the candidate. This procedure and candidate availability do not establish
acceptance, release or deployment. Current status/evidence belong in the T21-S6
handoff. Historical [T18-R1 evidence](evidence/t18-r1-review.md) and its archive
remain preserved; the laptop retains its earlier installed behavior.

Use the disposable pinned Node24.21.0/npm11.19.0 toolchain. From locked source,
complete the production checks/build before packaging. Preserve historical archives
outside clean-build output and restore them unchanged. Never build/install/package
while tests execute against that target. After shipped inputs are frozen, run:

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
npm run package:artifact -- --out "<ABSOLUTE-EXISTING-EMPTY-OUTPUT-DIRECTORY>"
```

The command does not build, install or publish. It stages the explicit reviewed
production JS/worker list, standalone operator documents/templates, projected runtime
manifest/shrinkwrap and original runtime dependency notices. Required credential
worker/provider and trusted CLI/server imports must close inside the archive;
retired journal/anchor/legacy recovery modules and diagnostic bypasses are not
production inputs. Root lock versions/resolutions/integrities are authoritative;
workspace/dev/Pi packages are excluded by runtime dependency reachability.
Missing inputs, unsafe paths or nonempty output fail closed. Failure removes only
the command's own temporary/partial outputs. Root npm pack is not the distribution
procedure. Package no live configuration, private profile, credentials, key or log.

Outputs are `gymtracka-mcp-0.0.0.tgz` and
`gymtracka-mcp-0.0.0.inventory.json`. The inventory records archive/content SHA256,
file modes, nonsecret input hashes and locked runtime dependency identities. The
expected candidate digest is `<EXPECTED_CANDIDATE_SHA256>` from the final private
handoff; do not infer identity from version0.0.0. No public version, license grant
or release permission is implied.

Extract into a fresh dedicated directory and run
`npm ci --omit=dev --ignore-scripts` using Node24 or later. This is the sole
supported install route. Consumer-dependency `npm install` can re-resolve transitive
versions and is unsupported. Dependencies require registry/cache access; no
node_modules, Node, system helpers or host runtime are bundled. Use absolute
installed `dist/protocol/server.js` and `dist/cli/main.js` entry paths. No global
install or source compilation is needed on the receiving machine.

Shipped documentation is the package README and standalone
[installation](installation.md), [login](login.md), [server](stdio-server.md) and
[recovery](recovery.md) guides, plus false configuration/login templates. Their local
operator links must close within the archive; this repository packaging/evidence
page is not shipped. Keep private config/credentials/key custody outside executable
replacement. Config1/old profiles require separate fresh setup, never automatic
migration/reset. Current creation has no journal/receipt or restart resume; pending
credential-refresh identity remains encrypted and recoverable.

Acceptance must inspect exact archive membership/modes/dependency and link closure,
install that archive in fresh isolation without source fallback, and compare clean
locked reproduction bytes before claiming the delivered boundary. Record failures,
exact selections, stable input/output/archive hashes and owned cleanup separately.
Current backend/SDK/Pi evidence retains its stated limits. Actual Pi CLI/modes/
lifecycle/output, current Android delivery, live Google/browser T19 and independent
T20 release review remain separate gates. Btrfs qualification is user-owned; ext4
fixture evidence and conditional fsync behavior do not prove power-loss survival.
