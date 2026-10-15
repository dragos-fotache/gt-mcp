# T01 implementation ADR — pinned inert foundation (rev. 4)

**Authority:** implements `t01-approved-foundation-spec.md` (Stage 2 authorized).
Supersedes conflicting candidates in `t01-foundation-proposal.md`, which stays
historical. Rev. 2 applies coordinator review: closed BackendClient allowlist,
journal/generation/refresh/binding boundaries, context-bound intent, local-only
entry constants, role-specific agent guide, constrained format scope, and no
unapproved `skipLibCheck`. Rev. 3 applies final review: discriminated per-step
creation identities, approved companion-only `skipLibCheck` with recorded
diagnostics, and Uint8Array ownership notes. Rev. 4 replaces argv-path
direct-execution detection with effect-free `import.meta.main` guards
(symlink-equivalent, import-inert on argv match) and records the API maturity
limitation. No domain behavior, handshake, catalogue, transport,
storage, or writes are implemented or claimed.

## 1. Decision summary

ESM, npm workspaces (root plus `companion`), unbundled `tsc` emission, Vitest.
Exact pins per §2. Inert entries per §4. Companion type-only host binding per
§5. All compatibility rows stay unverified (`docs/compatibility.md`).

## 2. Exact pins and registry evidence

Toolchain provisioned by coordinator; local archive SHA256 checked by
coordinator against official SHASUMS256.txt before use.

| Component                         | Exact version         | Placement                                            | Registry version URL                                          |
| --------------------------------- | --------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| Node.js                           | 24.21.0 (LTS Krypton) | `.node-version`, `.nvmrc`, CI                        | https://nodejs.org/dist/index.json (distribution index)       |
| npm                               | 11.19.0               | root `packageManager: npm@11.19.0`                   | bundled with Node 24.21.0                                     |
| TypeScript                        | 5.9.3                 | root devDependency                                   | https://registry.npmjs.org/typescript/5.9.3                   |
| `@modelcontextprotocol/sdk`       | 1.32.1                | root dependency                                      | https://registry.npmjs.org/@modelcontextprotocol%2Fsdk/1.32.1 |
| `zod`                             | 4.5.4                 | root dependency (no T01 schemas)                     | https://registry.npmjs.org/zod/4.5.4                          |
| `vitest`                          | 4.1.11                | root devDependency                                   | https://registry.npmjs.org/vitest/4.1.11                      |
| `@types/node`                     | 24.19.2               | root devDependency                                   | https://registry.npmjs.org/@types%2Fnode/24.19.2              |
| `eslint`                          | 10.12.0               | root devDependency                                   | https://registry.npmjs.org/eslint/10.12.0                     |
| `@eslint/js`                      | 10.0.1                | root devDependency                                   | https://registry.npmjs.org/@eslint%2Fjs/10.0.1                |
| `typescript-eslint`               | 8.71.1                | root devDependency                                   | https://registry.npmjs.org/typescript-eslint/8.71.1           |
| `prettier`                        | 3.9.10                | root devDependency                                   | https://registry.npmjs.org/prettier/3.9.10                    |
| `@earendil-works/pi-coding-agent` | 1.1.0                 | root devDependency only (companion type-only import) | installed 1.1.0 tree; host peer is `"*"` (see §5)             |

Root/companion `engines.node` is `>=24.21.0 <25`. A single root
`package-lock.json` locks workspaces and transitives; no floating direct
ranges. Installed integrity hashes are recorded in the lockfile. Upstream v1
SDK maintenance horizon (bug/security support at least six months after v2's
2026-07-27 release, per upstream v1.x README) is a future release-review risk.

## 3. Build layout and public imports

| Source                   | Emitted artifact                   | Public contract                                                         |
| ------------------------ | ---------------------------------- | ----------------------------------------------------------------------- |
| `src/index.ts`           | `dist/index.js`, `.d.ts`           | pure type re-export barrel (no runtime exports)                         |
| `src/contracts/index.ts` | `dist/contracts/index.js`, `.d.ts` | pure typed boundaries only (§8)                                         |
| `src/protocol/server.ts` | `dist/protocol/server.js`, `.d.ts` | inert server entry: exports `main(): number` only                       |
| `src/cli/index.ts`       | `dist/cli/index.js`, `.d.ts`       | inert CLI entry: exports `main(args, io): number` and type `CliIo` only |
| `companion/src/index.ts` | `companion/dist/index.js`, `.d.ts` | inert Pi extension factory (default export)                             |

Entry message/exit-code constants are module-local, not exported. Root `tsc`
uses `rootDir src`, `outDir dist`; companion compiles separately with its own
`rootDir src`, `outDir dist`. No bundler. Stale outputs are deleted before
rebuild (`rm -rf dist companion/dist` in `build`). Declarations emitted; no
source maps at T01. Production configs cover production only; QA tests use
`.test.mjs`/`.mjs` helpers under `test/foundation/` with no extra test TS
configuration.

Strict flags: `strict`, `module`/`moduleResolution` `NodeNext`, `target`
`ES2023`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`,
`noImplicitOverride`, `verbatimModuleSyntax`, `forceConsistentCasingInFileNames`.
No `skipLibCheck` in root: library `.d.ts` files stay fully checked there.
Approved exception (coordinator, rev. 3): `skipLibCheck: true` in
`companion/tsconfig.json` ONLY. Without it, companion typecheck fails with
exactly 43 TS1543 diagnostics, all in
`node_modules/@earendil-works/pi-ai@1.1.0/dist/providers/*.models.d.ts`
(JSON-file imports without `type: "json"` attributes under NodeNext),
zero in project sources, root config clean — independently reproduced by
Developer and coordinator. Scope: companion host-type import only; no
dependency patching or engine changes. Revisit on any Pi upgrade. No other
relaxation; any future exception needs coordinator approval.

## 4. Inert observable behavior (as built)

- Imports of any §3 artifact with arbitrary argv: no stdout/stderr emission,
  network/private-state access, child process/listener/watcher/timer start,
  global handler subscription, or exit-code change — even if argv[1] matches
  the artifact's own path. Barrels are type-only.
  Server/CLI export `main` (plus the `CliIo` type); companion default-exports
  a factory. No seven-tool runtime export exists.
- `dist/protocol/server.js` direct execution (any argv): exit 78, stderr
  exactly `GymTracka MCP server is not implemented (T01 foundation).\n`,
  stdout empty, stdin untouched. `main()` returns 78 without effects; the
  direct-execution branch handles presentation and exit code. An
  initialize/tools-list JSON-RPC payload on stdin produces no protocol
  response (stdin is never consumed). Main-entry detection uses
  `import.meta.main === true`, which holds through npm-style filesystem
  symlinks where plain argv[1]-to-module-path equality silently fails; no
  argv comparison, no argv-path filesystem access, and no import-time effects
  are involved.
- `dist/cli/index.js` direct execution: `main(args, io)` never calls
  `process.exit`; direct execution connects `io` to stdio and applies the
  returned code. Exactly `--help` → exit 0 with the specified usage text on
  stdout and empty stderr; any other args (including none) → exit 78 with the
  specified stderr text and empty stdout. No setup/browser/private-state
  discovery. Invocation arguments are read only inside the main-entry branch,
  never on the import path, and symlink invocation is equivalent to direct
  invocation.
- Companion factory is synchronous, takes the Pi `ExtensionAPI` via an erased
  `import type`, returns `undefined`, and makes zero API calls. Checkable with
  a throwing/recording proxy in a plain Node subprocess; proves scaffolding
  only.
- Runtime API maturity (`import.meta.main`): boolean true only for the process
  entry module; added in Node.js v22.18.0 and v24.2.0, available with no flags
  on the selected 24.21.0 runtime (verified by Developer /tmp probes, not repo
  target runs). No-flags availability is distinct from stability: the official
  selected-runtime docs
  (https://raw.githubusercontent.com/nodejs/node/v24.21.0/doc/api/esm.md)
  label `import.meta.main` Stability 1.0 — Early development. Narrow claim:
  verified present and behaving (true direct/symlink, false on import) only on
  the selected 24.21.0 runtime; not a blanket Node support claim. The
  coordinator accepts this runtime API risk for T01; no experimental
  dependency is introduced. Runtimes without the API yield `undefined` and
  every guard requires `=== true`, failing closed to inert (never dispatch).
  The member is declared by `@types/node` 24.19.2 (a local project-side
  declaration conflicted with it and was removed); TypeScript 5.9's default
  libs alone do not carry it. Revisit if the supported line ever widens below
  v24.2.0 or the stability level changes.

## 5. Pi peer and packaging policy

Companion `pi.extensions` is `["./dist/index.js"]`. The only host package
imported at T01 is `@earendil-works/pi-coding-agent`, type-only; it is declared
in companion `peerDependencies` as `"*"` and never in runtime dependencies.
Further host peers are added with `"*"` only when actually imported. Exact root
dev pin 1.1.0 is separate from host peer metadata. No bundler; direct `tsc`
emission means the emitted companion JS contains no host-module copy (type-only
imports erase). Packaging: companion `files` is `["dist"]`, so the published
unit is the manifest plus the emitted `dist/index.js` and `dist/index.d.ts`
only — verified via `npm pack --dry-run --ignore-scripts --json --workspace
companion` (inventory: `dist/index.js`, `dist/index.d.ts`, `package.json`;
`bundled: []`; no archive created). The root `.gitignore` `dist/` exclusion
would otherwise omit the declared extension path; `files` restores exactly the
emitted output, never `node_modules` or host copies. Coordinator inspects emitted JS, source imports, build config,
and package contents for the no-bundled-host-copy gate. This fixture is not
loaded into live Pi.

## 6. Scripts, Vitest config, and CI

`typecheck` (no-emit root + companion), `lint:production` (production sources
plus Developer-owned `eslint.config.mjs` / `vitest.config.ts`),
`format:check:production` (Developer-owned paths), `build` (clean + compile
both, no execution), `test` (`vitest run`, discovery `test/**/*.test.mjs`),
`smoke` (`vitest run test/foundation`), `check` (sequential full gate).
`format:check` is explicitly scoped to production sources, owned config, owned
docs (`AGENTS.md`, this ADR, `docs/compatibility.md`), and QA `test/` files —
never coordinator specs, READMEs, or coordination docs (additionally backstopped
by `.prettierignore`). Locked install is `npm ci --ignore-scripts`; lock created
with `npm install --ignore-scripts`. No lifecycle-hook dependence, no
`passWithNoTests`, no masked checks.

Vitest config: `include: ["test/**/*.test.mjs"]`, `environment: "node"`,
`testTimeout: 10000`. Developer owns the config, not test source.

CI (`.github/workflows/ci.yml`) runs clean install plus `npm run check` on
Node 24.21.0 with npm cache. Actions pinned to immutable SHAs resolved
2026-10-11 via `git ls-remote`: `actions/checkout@d23441a…` (tag `v6`),
`actions/setup-node@24997072…` (tag `v6`).

## 7. Ignore rules and external checkouts

Root `.gitignore` covers `node_modules/`, root/companion `dist/`,
`coverage/`, `*.tsbuildinfo`, `.pi/`, `.env`/`.env.*` (nonsecret
`.env.example` permitted if ever needed), private-state directories
(`.private/`, `private/`, `profiles/`, `vault/`, `journals/`, `receipts/`),
credential/key material (`*.pem`, `*.key`, `credentials*.json`, `auth.json`),
and local logs. `/shared-docs/` is ignored in root Git: it is an independent
existing repository at baseline 9a96dcb, not an embedded gitlink candidate.
Recorded clean and untouched; never staged, edited, or reconfigured here.
Submodule/vendor treatment is later coordination. Ignore rules reduce accident
risk; they never authorize private state in the repo.

## 8. Public interface specification (actual signatures)

Normative source: `src/contracts/index.ts`, re-exported type-only from
`src/index.ts`. Proposed for coordinator review before finalization; owning
tasks refine them. Not settled wire schemas.

```ts
export interface ProfileBinding {
  readonly origin: string;
  readonly accountUuid: string;
  readonly sessionGeneration: number;
  readonly profileGenerationId: string;
}

export interface TrustedConfiguration {
  readonly serviceOrigin: string;
  readonly profileLocation: string;
  readonly writesEnabled: boolean;
}

export interface ProfileStore {
  readonly binding: ProfileBinding;
  acquireOwnership(): Promise<unknown>;
  releaseOwnership(): Promise<unknown>;
  loadVault(): Promise<unknown>;
  storeVault(payload: unknown): Promise<unknown>;
  loadJournal(operationId: string): Promise<unknown>;
  persistJournalStep(operationId: string, step: unknown): Promise<unknown>;
  loadGenerationMarker(): Promise<unknown>;
}

export type BindingCheckPoint = "pre-send" | "pre-delivery";

export interface SessionProvider {
  readonly binding: ProfileBinding;
  selectCredential(): Promise<unknown>;
  verifyBinding(point: BindingCheckPoint): Promise<unknown>;
  settlePendingRefresh(): Promise<unknown>;
}

export type CreationMutationMethod = "POST" | "PUT";

export interface MutationIdentityBase {
  readonly body: Uint8Array;
  readonly resourceKey: string;
}

export interface DraftMutationIdentity extends MutationIdentityBase {
  readonly method: "POST";
  readonly route: "/v1/routines";
}

export interface PopulateMutationIdentity extends MutationIdentityBase {
  readonly method: "PUT";
  readonly route: `/v1/routines/${string}`;
}

export interface SaveMutationIdentity extends MutationIdentityBase {
  readonly method: "POST";
  readonly route: `/v1/routines/${string}/save`;
}

export type MutationIdentity =
  DraftMutationIdentity | PopulateMutationIdentity | SaveMutationIdentity;

export interface BackendClient {
  readonly binding: ProfileBinding;
  searchExercises(request: unknown, signal: AbortSignal): Promise<unknown>;
  getExercise(request: unknown, signal: AbortSignal): Promise<unknown>;
  listWorkouts(request: unknown, signal: AbortSignal): Promise<unknown>;
  getWorkout(request: unknown, signal: AbortSignal): Promise<unknown>;
  listRoutines(request: unknown, signal: AbortSignal): Promise<unknown>;
  getRoutine(request: unknown, signal: AbortSignal): Promise<unknown>;
  createDraft(identity: DraftMutationIdentity, signal: AbortSignal): Promise<unknown>;
  populateDraft(identity: PopulateMutationIdentity, signal: AbortSignal): Promise<unknown>;
  saveRoutine(identity: SaveMutationIdentity, signal: AbortSignal): Promise<unknown>;
}

export interface SchemaCodec {
  parseArguments(toolName: string, input: unknown): unknown;
  normalizeIntent(input: unknown): unknown;
  projectRevision(value: unknown): unknown;
}

export interface OperationRepository {
  readonly binding: ProfileBinding;
  admit(operationId: string, intent: unknown): Promise<unknown>;
  recordDispatch(operationId: string, step: string): Promise<unknown>;
  recordConfirmation(operationId: string, step: string, response: unknown): Promise<unknown>;
  loadTerminal(operationId: string): Promise<unknown>;
}

export interface RoutineCreationService {
  readonly binding: ProfileBinding;
  create(operationId: string, intent: unknown): Promise<unknown>;
}

export interface CompanionBinding {
  readonly origin: string;
  readonly accountUuid: string;
  readonly sessionGeneration: number;
  readonly profileGenerationId: string;
}

export interface IntentStore {
  retain(binding: CompanionBinding, operationId: string, intent: unknown): Promise<unknown>;
  load(binding: CompanionBinding, operationId: string): Promise<unknown>;
}

export interface Clock {
  nowMs(): number;
}

export interface UuidGenerator {
  generate(): string;
}

export interface Sleeper {
  sleep(ms: number): Promise<void>;
}

export interface FaultInjector {
  readonly enabled: boolean;
  trigger(point: string): Promise<unknown>;
}

export interface Transport {
  send(request: unknown, signal: AbortSignal): Promise<unknown>;
}
```

Notes: the BackendClient method set is the allowlist (six semantic reads plus
the three creation steps), and each creation step takes only its matching
discriminated step identity — POST /v1/routines for draft, PUT
/v1/routines/{id} for populate, POST /v1/routines/{id}/save for save — so an
absolute/arbitrary route cannot typecheck. Method/route literal narrowing is
static only: runtime UUID/path validation is T05/T09 responsibility, and no
runtime code exists at T01. Mutation dispatch replays stored `Uint8Array`
bytes; it never re-serializes arguments. `readonly` guards the byte reference,
not the bytes: storage ownership/copy and replay-from-stored-bytes enforcement
are owning-task (operation/store) guarantees, recorded here as constraints.
Journal entry shapes are owned by the operation-journal task; read filter/paging shapes
by the schema/transport tasks — `unknown` there marks genuinely undecided
representations. All object types readonly; no `any`; no runtime code, stores,
defaults, validation logic, or invented domain wire fields/caps.

Entry signatures: `main(): number` (server),
`main(args: readonly string[], io: CliIo): number` with
`interface CliIo { stdout(text: string): void; stderr(text: string): void }`
(CLI), and `createCompanion(_pi: ExtensionAPI): undefined` default export
(companion).

## 9. Verification performed (Developer permitted checks only)

Toolchain `$T01_NODE_HOME/bin` in PATH: Node v24.21.0, npm 11.19.0. Chronology:
rev. 1 scaffolding (install, clean-tree `npm ci --ignore-scripts`, typecheck,
`lint:production`, `format:check:production`, build — all exit 0); rev. 2/3
boundary revisions (no-emit checks only while QA used preliminary artifacts,
then authorized clean rebuild + full permitted sequence, all exit 0); rev. 4
entry-point revision (no-emit checks, then authorized clean rebuild + full
permitted sequence, all exit 0). Final Developer-side results on the shipped
rev. 4 artifacts: `typecheck`, `lint:production`, `format:check:production`,
and `build` each exit 0; no installs or `node_modules` removals after the
initial lock creation; no rebuilds outside the two authorized clean rebuilds.
The no-`skipLibCheck` trial diagnostics (43x upstream TS1543, root clean) and
the approved companion-only exception are recorded in §3. QA suite,
whole-suite diagnostics, and test-source diffs were never run or read by the
Developer; QA's 100/100 and lint/format passes are QA/coordinator evidence,
not claimed here. Pre-existing shared checks
(`python3 shared-docs/catalogue/verify.py`,
`python3 -m unittest discover -s shared-docs/catalogue -p 'test_*.py'`) were
coordinator-observed during preparation and are out of Developer scope.
