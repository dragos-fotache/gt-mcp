# Packaging

The private archive contains compiled server/CLI code, the interactive installer, standalone
operator guides, disabled configuration templates, a projected runtime manifest/shrinkwrap and
third-party dependency notices. Node, OS helpers, runtime dependencies, private configuration and
credentials are not bundled.

Use the machine's Node.js 24+; the current archive packer requires npm 11.19.0. This npm requirement
is specific to archive generation, not local Node selection or runtime startup. npm 12 packaging
support is an open improvement. Complete production checks/build first; never build/install/package
while tests execute against the target. Build cleans `dist/`, so retain needed private archives
separately. Then run:

```sh
npm run package:artifact -- --out "<ABSOLUTE-EXISTING-EMPTY-OUTPUT-DIRECTORY>"
```

The command packages the existing build; it does not build, install or publish.
`packaging/runtime-files.json` is the explicit runtime file list, and
`packaging/document-files.json` maps standalone documentation/templates. Runtime imports and
worker/provider entries must close inside the archive. Dependencies follow the root lockfile's
runtime reachability; workspace/dev/Pi packages and diagnostic bypasses are excluded. Missing
inputs, unsafe paths or a nonempty output fail closed. Root `npm pack` is not the distribution
procedure.

Outputs are `gymtracka-mcp-0.0.0.tgz` and `gymtracka-mcp-0.0.0.inventory.json`. The inventory
records archive/content SHA256, file modes, nonsecret input hashes and locked runtime dependency
identities. Version 0.0.0 alone does not identify a build. Verify an archive against its own
inventory before using it; neither a digest nor packaging alone certifies release.

Installation is extract-and-ci using `npm ci --omit=dev --ignore-scripts`. Consumer-dependency
installation can re-resolve transitive versions and is unsupported. Registry or populated
dependency-cache access is required. Use the absolute installed `dist/protocol/server.js` and
`dist/cli/main.js` entries. No global install, source compilation, Pi runtime or permission
extension is needed. See [installation](installation.md), including fresh interactive installation
and compatible in-place updates, and [recovery](recovery.md) for interrupted updates.

Operator links in the shipped guides must resolve within the archive. Keep configuration/profile/key
custody separate from executable replacement. Config1 and old-format profiles require a separate
fresh config/profile/login; no migration or automatic reset occurs. Pending authentication recovery
identity remains protected even though creation itself has no durable journal or replay receipt.

Delivered-boundary acceptance checks exact archive membership/modes/dependency and link closure,
installs that archive in fresh isolation without source fallback, and compares clean locked
reproduction bytes. Report actual scope and limitations. Outstanding acceptance/release work is in
[improvements](improvements.md). Private packaging grants no project license or permission to
publish/deploy.
