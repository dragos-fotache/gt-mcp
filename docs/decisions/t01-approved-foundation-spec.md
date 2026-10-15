# T01 approved foundation specification

**Authority:** User approved starting T01; coordinator authorizes this Stage 2 work
contract. It supersedes conflicting candidates in t01-foundation-proposal.md without
changing shared wire/domain policy.
**State:** authorized for implementation and independent tests; acceptance and
interoperability remain unverified.

## 1. Decisions and exact pins

Use ESM, npm workspaces (root plus `companion`), unbundled TypeScript emission and
Vitest. Every direct runtime/development dependency uses the following exact version:

| Component | Selected version | Placement |
|---|---|---|
| Node.js | 24.21.0 (LTS Krypton) | `.node-version` and `.nvmrc`; CI exact version |
| npm | 11.19.0 | root `packageManager: npm@11.19.0` |
| TypeScript | 5.9.3 | root devDependency |
| official MCP SDK | @modelcontextprotocol/sdk 1.32.1 | root dependency |
| Zod | 4.5.4 | root dependency; no domain schemas implemented in T01 |
| Vitest | 4.1.11 | root devDependency |
| Node types | @types/node 24.19.2 | root devDependency |
| ESLint | 10.12.0 | root devDependency |
| ESLint JS config | @eslint/js 10.0.1 | root devDependency |
| TypeScript ESLint | typescript-eslint 8.71.1 | root devDependency |
| Prettier | 3.9.10 | root devDependency |
| Pi development types/runtime candidate | @earendil-works/pi-coding-agent 1.1.0 | root devDependency only |

Root/companion `engines.node` is `>=24.21.0 <25`, a narrow initial supported runtime
line. Pi's upstream minimum >=22.19.0 is not this project's tested runtime claim.
The existing harness Node 26.11.1/npm 12.2.0 is not the selected validation runtime.
Use the coordinator-provisioned disposable Node toolchain via `$T01_NODE_HOME/bin`
in PATH; do not replace system Node, install global packages or change Pi settings.
Record the exact patch tested. Initial supported development platform is Linux x64;
OS secret facilities and product installation/platform certification remain unselected.

A single root `package-lock.json` locks workspaces/transitives. No dependency named
latest or experimental, no floating direct dep ranges. Upstream transitive ranges are
resolved by the lockfile. Pi host peers are the explicit exception below.

**Source checks:** coordinator reviewed the official Node distribution index
(https://nodejs.org/dist/index.json), exact npm registry metadata for selected versions,
and https://raw.githubusercontent.com/modelcontextprotocol/typescript-sdk/v1.x/README.md.
The upstream v1 SDK is a maintenance line implementing through 2025-11-25, with bug/security
support promised for at least six months after v2's 2026-07-27 release. Record this
maintenance horizon as a future release-review risk; selection is not a blanket promise.
For each package, record its exact registry version URL in the implementation ADR.
Pi packaging evidence is the installed 1.1.0 packages.md/extensions.md/mcp.md docs;
record an immutable package version/integrity, not merely a moving GitHub branch.
The local Node archive's SHA256 was checked against official SHASUMS256.txt before use.

Protocol **candidate**: 2025-11-25. Earlier SDK/Pi protocol candidates may be recorded
but no negotiated-version support is claimed until actual stdio client tests in T08+
(and Pi certification separately). Do not accept/infer a protocol simply from Pi's set.

## 2. Build layout and public imports (D1/D5)

Production source/build mapping:

| Source | Emitted artifact | Public contract |
|---|---|---|
| `src/index.ts` | `dist/index.js`, `.d.ts` | pure type re-export barrel |
| `src/contracts/index.ts` | `dist/contracts/index.js`, `.d.ts` | pure typed boundaries only |
| `src/protocol/server.ts` | `dist/protocol/server.js`, `.d.ts` | inert server entry |
| `src/cli/index.ts` | `dist/cli/index.js`, `.d.ts` | inert trusted CLI entry |
| `companion/src/index.ts` | `companion/dist/index.js`, `.d.ts` | inert Pi extension factory |

Root tsc production build uses rootDir `src`, outDir `dist`; companion is compiled
separately with rootDir `src`, outDir `dist` relative to companion. No bundler, no
flattening fiction such as src/protocol/server.ts -> dist/server.js via tsc alone.
Delete stale build output before rebuild. Production declarations are emitted; source
maps are unnecessary at T01. Build/typecheck configs cover production independently
from QA tests. QA uses `.test.mjs` plus `.mjs` helpers under `test/foundation/` so no
additional test TypeScript type configuration/API guessing is needed yet.

`src/contracts/index.ts` exports types/interfaces named:
`ProfileBinding`, `TrustedConfiguration`, `ProfileStore`, `SessionProvider`,
`BackendClient`, `SchemaCodec`, `OperationRepository`, `RoutineCreationService`,
`CompanionBinding`, `IntentStore`, `Clock`, `UuidGenerator`, `Sleeper`, `FaultInjector`
and `Transport`. `src/index.ts` re-exports these using type-only exports. No runtime
implementations, mock stores, default service configuration, or validation logic.

Interface semantics are architecture.md's injectable boundaries. ProfileBinding includes
immutable origin/account UUID/session generation **and profile-generation ID** (the
proposal omitted the latter; do not conflate these fences). BackendClient exposes typed
allowlisted operations, not arbitrary caller headers/URLs; exact persisted request bytes
and resource keys remain distinct from normalized intent. Session credentials stay
internal and cannot enter companion metadata. Stubs must not perform or claim durable
storage/encryption/reauthentication/creation. Use readonly types and unknown rather than
any for opaque yet-undecided representations; no invented domain wire fields/caps.

Developer records the proposed exact signatures in the ADR as a public interface
specification and messages the coordinator before finalization. They may be reviewed
and refined before later owning tasks implement them; they must not be presented as
fully settled wire schemas. QA's T01 runtime tests target public paths/observables, not
unapproved signature details; coordinator reviews typed boundaries for suitability.

Strict compiler requirements: strict, NodeNext module/resolution, target ES2023,
exactOptionalPropertyTypes, noUncheckedIndexedAccess, noImplicitOverride,
verbatimModuleSyntax, forceConsistentCasingInFileNames. Document any required library
compatibility exception explicitly; no silent relaxation.

Coordinator reproduced 43 TS1543 diagnostics solely in Pi 1.1.0's upstream
pi-ai provider .d.ts JSON imports under NodeNext. **Approved exception:**
`skipLibCheck: true` in companion/tsconfig.json only; root declaration checking stays
fully enabled. Project sources remain strict/typechecked. This skips checking imported
library declarations, not checking the companion against their declared API. Record the
upstream defect, affected pins and exception scope in the ADR and evidence; no claim of
full upstream declaration validation. Remove/revisit this exception when Pi is upgraded.

## 3. Inert observable behavior (D3/D4)

T01 is **not an MCP server implementation**. No handshake, tool catalogue/list,
backend transport, login, private storage or writes exist yet.

### Imports

Importing any artifact named in §2 with arbitrary argv has no stdout/stderr emission,
network/private-state access, child process/listener/watcher/timer start, global process
handler subscription or exit-code change. Both barrels have no runtime exports (type-only).
Server exports `main`; CLI exports `main`; companion exports a default factory.
Additional hidden implementation exports are unnecessary; no seven-tool runtime export.

### Explicit server invocation

When executed directly with any argv, `dist/protocol/server.js` exits 78, prints exactly
`GymTracka MCP server is not implemented (T01 foundation).\n` to stderr, prints nothing
to stdout and does not consume stdin, initialize MCP or touch network/private storage.
Feeding it an initialize/tools-list JSON-RPC request still produces no protocol response.
If package bin entries are declared, direct invocation through an ordinary filesystem
symlink (as npm creates for bin commands) must produce the same specified results for
both server and CLI. Importing an entry while argv[1] happens to equal its public path
must remain inert; argument values alone cannot turn an import into direct execution.
Use an effect-free, selected-runtime-supported entry-point detection mechanism; record
any runtime API maturity/compatibility limitation in the ADR. The selected mechanism
is `import.meta.main === true`; coordinator accepts its documented Node 24.21.0
**Stability 1.0 (Early development)** API risk for this narrow foundation, contingent
on selected-runtime symlink/import regression checks. It is flag-free but not a stable
API guarantee; retest on every runtime upgrade and make no broader compatibility claim.
Official pinned source: https://raw.githubusercontent.com/nodejs/node/v24.21.0/doc/api/esm.md.
`main(): number` returns 78 without effects; direct-execution guarding handles presentation
and exit code. Importing the entry must not invoke main.

### Explicit CLI invocation

`dist/cli/index.js` has `main(args: readonly string[], io: { stdout(text: string): void;
stderr(text: string): void }): number`. It does not call process.exit itself.

- Exactly `--help`: exit 0, stdout exactly
  `GymTracka MCP foundation\nUsage: gymtracka-mcp --help\nDomain commands are not implemented.\n`, no stderr.
- Any other args, including none, login/logout and --version: exit 78, stdout empty,
  stderr exactly `GymTracka MCP CLI commands are not implemented (T01 foundation).\n`.
- Direct execution connects io to stdio and uses the returned exit code; importing it
  never dispatches commands from argv or writes output (reading argv solely for the
direct-execution guard is permitted). No setup prompt, browser or private-state discovery.

### Companion

Default export is a synchronous factory accepting Pi ExtensionAPI via an erased type
import. At T01 it returns undefined and makes **zero calls** on the supplied API, starts
no resources, and connects/registers nothing. QA can pass a throwing/recording API proxy
in an ordinary Node subprocess without a live Pi host. This proves inert scaffolding,
not Pi loading, gate feasibility or host compatibility.

### Side-effect probes

QA owns a black-box subprocess/preload harness, including interception of Node networking,
child-process creation, server listening and fs private-state paths, and output/exit
observation. Permit ordinary module-loader reads of the approved build/dependency artifacts;
intercept attempted data/private-state reads/writes, not the loader reading JS files.
Use syncBuiltinESMExports where appropriate and intercept global fetch. Fake HOME/XDG
roots under temporary synthetic directories prevent consulting real credentials.
A timeout/clean exit proves termination only, not absence of transient effects. Clearly
state gaps (unintercepted APIs, native/global escape paths) and defer stronger assurance
to coordinator source review; never claim OS sandboxing or complete network proof.
No QA reading generated implementation contents is authorized by this harness.

## 4. Package/scripts contract (D2/D10)

Root package is private, ESM, version 0.0.0, workspaces [`companion`]. It can declare bin
paths for the emitted inert server/CLI, but no static write-enabled MCP configuration.
Companion package is private/version 0.0.0 until packaging work; type module.

Required scripts and observable purposes:

- `typecheck`: no-emit check of root + companion production configs.
- `lint:production`: production sources, Developer-owned config/scripts only.
- `lint`: production plus test/foundation helpers/tests.
- `format:check:production`: Developer-owned source/config paths only.
- `format:check`: production plus QA test files; exclude shared-docs, local harness,
  generated files, lockfile and asynchronously-owned docs from whole-repo formatting.
- `build`: clean root/companion outputs then compile both; no code execution/connection.
- `test`: `vitest run` with discovery restricted to `test/**/*.test.mjs`.
- `smoke`: `vitest run test/foundation` (same independent foundation suite; **not** handshake).
- `check`: typecheck, lint, format:check, build, test sequentially.

Locked install command is `npm ci --ignore-scripts`. Generate lock with exact selected
pins and install --ignore-scripts (production/test code must not require lifecycle hooks).
Record registry/network failures as blockers. No `passWithNoTests`, skipped checks counted
as passes, `|| true` masking required checks, or domain tests outside owning task scope.
Developer runs only install, typecheck, lint:production, format:check:production and build,
not QA tests or whole-suite diagnostics/source diffs. QA/coordinator run combined scripts.
If tests do not exist yet, test failure is expected/not T01 acceptance; report that truthfully.

Developer owns Vitest configuration (include `.test.mjs`, node environment, timeout, no
pass-with-no-tests) but not test source. Any extra direct dependency/script needs coordinator
approval; QA sends requests, never edits manifests/config/lockfiles. CI runs clean install
and `npm run check` on selected Node/npm pins. Pin GitHub Actions to immutable SHAs with
version comments/evidence rather than floating tags, or ask coordinator if resolving
those immutable references is blocked.

## 5. Pi peer/external constraints (D8)

Companion `pi.extensions` is [`./dist/index.js`]. The only host package imported at T01
is `@earendil-works/pi-coding-agent` **type-only**; declare it in companion peerDependencies
with `"*"`, never runtime dependencies. Add further Pi host peers with `"*"` only when
actually imported (the host supplies pi-ai/agent-core/coding-agent/tui/typebox).
Exact root development pin 1.1.0 is separate from host peer metadata. Do not package
node_modules or root dev dependencies; do not load this inert fixture into live Pi now.

No bundler is used. Developer build metadata/ADR names direct tsc emission and peer
policy. QA checks manifests plus output file inventory/tarball inventory where useful,
without reading production/generated implementation content. Such metadata checks alone
do not prove no host copy: coordinator inspects the complete emitted companion JS,
source type imports, build configuration and package contents for that acceptance gate.
Document the boundary explicitly in combined evidence.

## 6. Synthetic/ignore/privacy contract (D6/D7)

QA owns `test/foundation/`, `test/fixtures/` and `docs/evidence/t01-qa-*` files only.
Fixtures use clearly labeled synthetic provenance/example names; valid UUID values remain
canonical UUIDs. No credential-looking fixture is needed for T01. Use temporary HOME/XDG
roots at execution and clean them afterward; do not import personal runtime state.

Developer creates root ignore rules for node_modules, root/companion dist, coverage,
*.tsbuildinfo, .pi/, .env/.env.* (permit nonsecret .env.example only if actually needed),
private-state directories (.private/, private/, profiles/, vault/, journals/, receipts/),
credential/key material (*.pem, *.key, credentials*.json, auth.json), and local logs.
Ignore rules are risk reduction, not permission to store private state inside the repo.
Ignore `/shared-docs/` in root Git for now: it is an independent existing repository, not
an accidental embedded gitlink. Record its exact baseline/clean status in docs; do not
stage, convert, edit or reconfigure it. A proper submodule/vendor decision is later
coordination, not an automatic `git add .` side effect.

Coordinator owns source/secret/scope audits. QA may inspect nonsecret package/config
metadata, file inventories, ignore matching and public output only; do not scan production
source contents under the guise of privacy checks. Evidence fields: task/scenario,
layer, artifact/version, exact safe command, expected/observed, pass/fail/blocked,
cleanup and limits. No private paths/account IDs/secrets/raw private bodies.

## 7. Compatibility matrix and checks (D9)

Developer owns `docs/compatibility.md`. Columns: component, selected/candidate version,
evidence boundary/owning task, status, evidence reference, limitations. Initialize every
compatibility row **unverified**, even for dependencies installed during T01. Include
Node/npm/TS/SDK/protocol, Pi package/runtime/extension ordering/terminal mode, OS secret
facility, backend artifact/OpenAPI/shared baseline, Google/helper origin, Android sync,
artifact upgrades and journal/intent/key versions. Selection is distinct from observed
foundation build results; no counterfeit host/backend compatibility passes.

Relevant pre-existing checks (coordinator already observed both passing during preparation):

```sh
python3 shared-docs/catalogue/verify.py
python3 -m unittest discover -s shared-docs/catalogue -p 'test_*.py'
```

These verify shared catalogue fixtures, not MCP behavior. Shared checkout must stay clean.

For clean install evidence, coordinator creates a disposable allowlisted snapshot of
current sources/config/test/spec documentation (no root/nested .git, .pi, private state,
node_modules or build output). A clean clone is not currently possible: root has no
commits and no commits are authorized by this work order. QA may request/use that
snapshot to rerun npm ci/check after both agents report ready; coordinator verifies the
snapshot inventories and records this is a source snapshot, not published/clone evidence.
Do not use git archive before there is an authorized commit or count live-tree npm install
alone as clean-install acceptance.

## 8. Ownership and Stage 2 reporting

Developer: production src/, companion source/manifest, root manifests/lockfile, TS/lint/
format/Vitest/build config, runtime pin files, .github/, ignore rules, AGENTS.md (development
commands/authority/security/independence), implementation ADR and docs/compatibility.md.
No modifications to QA evidence/tests or coordinator task/status files. Keep the Stage 1
proposal historical; the implementation ADR references this approved spec.

QA: independent test/foundation and test/fixtures; its plan/evidence. No production reads,
shared edits or package writes. Both agents use this common specification, not one
another's internals. Coordinator can review both, resolve changes and run all checks.

Send asynchronous messages at implementation/test-source readiness, after permitted
checks, when a public contract needs correction, and on blockers. Never poll output.
User approval and coordinator Stage 2 authorization are now granted. QA may write tests
from this shared spec, but only execute compiled targets after the coordinator relays
Developer's artifact-ready message. Developer never reads
QA source or tests; coordinator sends spec-level failure reports if fixes are needed.
No staging/commits, live services, write registration, packaging/publication or release
claim. T01 remains in progress until coordinator accepts all criteria with evidence.
