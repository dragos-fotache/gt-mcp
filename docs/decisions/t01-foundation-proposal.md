# T01 foundation proposal (Developer, Stage 1)

**Status:** Stage 1 interface/design preparation only. No implementation, install,
production code, manifest, or shared-config change is included or claimed.
This document is a proposed interface specification for coordinator review,
not production code and not test evidence.

**Role boundary:** Developer preparation per
[work order](../tasks/t01-work-order.md). QA paths not inspected.

## 1. Normative references (read)

- Shared baseline: shared-docs commit `9a96dcb`; MCP draft `0.1-draft`;
  backend OpenAPI `1.0.0` (`shared-docs/docs/backend-contract/openapi.yaml`
  declares `openapi: 3.1.0`, `info.version: 1.0.0`).
- `shared-docs/docs/mcp-contract/` — `README.md`, `tools.md`,
  `authentication.md`, `routine-creation.md`, `acceptance-scenarios.md`
  (seven tools, envelopes, error codes, three-step creation, journal lifecycle).
- `docs/architecture.md`, `docs/verification.md`,
  `docs/implementation-plan.md`, `docs/agent-coordination.md`.
- Installed Pi **1.1.0** documentation
  (`.../pi-coding-agent/docs/*.md` under release `1.1.0`): inspected as a
  packaging/host candidate only, not a certification claim.

## 2. Proposed toolchain pins (candidates, pending coordinator approval)

All versions below are proposal candidates verified against live upstream
sources on 2026-10-11. Stage 2 pins the exact patch in the manifest +
lockfile and re-verifies.

| Component | Proposed candidate | Evidence |
|---|---|---|
| Node.js | Develop/test on active LTS **24.x**; `engines: >=22.19.0` minimum | Pi 1.1.0 `engines.node >=22.19.0` (all `@earendil-works/*` packages inspected); Node 24 is LTS ("Krypton"), Node 26.11.1 is Current, Node 22 in maintenance (https://nodejs.org/en/about/previous-releases, https://github.com/nodejs/node/releases). Local harness runs `v26.11.1` — recorded, not selected. |
| TypeScript | `typescript@5.9.x` pinned exact, `strict: true` | Stable 5.9 line (https://github.com/microsoft/TypeScript/releases lists 5.9.3); 6.x/7.x lines exist but are not proposed — ecosystem churn risk, decision recorded for coordinator. Exact patch confirmed at Stage 2 manifest write. |
| MCP server SDK | Official `@modelcontextprotocol/sdk` **v1 line**, exact `1.32.1` proposed | npm shows `1.32.1` updated 2026-10-05 (https://www.npmjs.com/package/@modelcontextprotocol/sdk). v1 (single package, stdio transport) matches the shared draft's local-stdio scope. **Not** v2 split packages (`@modelcontextprotocol/server` / `client`), which implement spec `2026-07-28` (https://ts.sdk.modelcontextprotocol.io/v2/) — beyond the planning reference and untested with Pi 1.1.0. |
| Negotiated protocol | Request `2025-11-25`; accept Pi 1.1.0's set | Installed `@earendil-works/pi-mcp@1.1.0` `dist/protocol/types.js`: `LATEST_PROTOCOL_VERSION = "2025-11-25"`, `SUPPORTED_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"]`. This is also the architecture doc's versioned tools reference (`2025-11-25`). |
| Schema engine | `zod@4.x` pinned exact (proposed `4.5.4`) | npm latest `4.5.4` (https://www.npmjs.com/package/zod). MCP SDK v1 tool schemas are zod-based. Lossless Int64 handling is **not** decided here — T03 must prove lossless parse-before-projection (JSON.parse alone is unsafe above 2^53); candidate approaches (big-int-preserving parser) are T03 scope. |
| Package manager | `npm` + committed `package-lock.json`, clean `npm ci` | Pi 1.1.0 install tree ships `package-lock.json` and npm scripts; keeps one owner/edit protocol for manifests per coordination rules. |
| Test runner | `vitest` pinned 4.x/5.x (proposed latest stable at Stage 2) | Pi 1.1.0 uses `vitest --run` (`pi-coding-agent` and `pi-mcp` `test` scripts; `pi-mcp` devDeps pin `vitest 4.1.11`); vitest 5.x stable exists (https://vitest.dev/releases). Exact pin at manifest write. |
| Lint/format | ESLint + Prettier, pinned exact at Stage 2 | Proposed only; no config written at this stage. |

## 3. Package manager / scripts contract (proposed)

Proposed `package.json` scripts (names only; not yet created):

- `install:ci` → `npm ci` (locked, clean).
- `typecheck` → `tsc --noEmit` (strict config, `exactOptionalPropertyTypes`
  and `noUncheckedIndexedAccess` proposed for coordinator decision).
- `lint` → eslint; `format:check` → prettier check.
- `build` → `tsc -p tsconfig.build.json`, emit to `dist/`, no bundle of
  host modules.
- `test` → `vitest --run` (synthetic unit/smoke only at T01).
- `smoke` → node-based stdio handshake + `tools/list` seven-tool shape check
  (exact command fixed after entry points land; QA black-box target).

## 4. Module / output paths (proposed, per architecture layout)

```text
src/
  cli/          trusted command dispatch and safe presentation
  config/       fixed origin, budgets, profile binding, local write policy
  domain/       strict schemas, normalization, response/domain comparison
  protocol/     official MCP SDK integration, tool/result catalogue
  http/         route allowlist, exact bytes, lossless reads, errors, limits
  auth/         session fences, refresh recovery, foreground browser login
  storage/      encryption, atomic writes, profile ownership, generation fences
  operations/   admission, step state machine, receipts, retirement
companion/
  src/          Pi registration, gate, labels, approval UI, intent persistence
  package.json  companion package (see §5)
test/
  unit/ fault/ protocol/ backend-integration/ pi-integration/
docs/decisions/ docs/evidence/
dist/           build output only (git-ignored)
```

Entry points (proposed):

- Portable stdio server: `src/protocol/server.ts` → `dist/server.js`
  (official SDK `StdioServerTransport`; **stdout carries MCP messages only**,
  diagnostics on sanitized stderr).
- Trusted CLI: `src/cli/index.ts` → `dist/cli.js`
  (illustrative `gymtracka-mcp login/logout/...`; final command names are a
  T07/T12 decision; tools/workers can never trigger interactive login).
- Companion extension: `companion/src/index.ts` (default factory receiving
  `ExtensionAPI`; registers `tool_call` gate + `registerMcpServer`, never a
  fork of Pi or a backend change).

T01 builds only inert entry points: importing pure modules starts no
processes/listeners, performs no network or private-state access, emits no
stdout. Entry points must not advertise implemented seven-tool behavior or
connect a write-enabled server.

## 5. Pi packaging constraints (inspected Pi 1.1.0 docs)

From installed `packages.md` / `extensions.md` / `mcp.md` (candidate facts,
T02/T17 must prove them on the selected runtime):

- Companion ships as a Pi package (npm/git/local source) exposing
  `companion/src/index.ts` as its extension entry; distributed extension
  dependencies go in companion `dependencies`.
- Host-provided modules (`@earendil-works/pi-ai`, `*-agent-core`,
  `*-coding-agent`, `*-tui`, `typebox`) are declared in companion
  **`peerDependencies` with `"*"`** and **never** in `dependencies` and
  never bundled — a physical copy bypasses Pi's module mapping (per
  `packages.md` "Declare dependencies").
- Extension factory must not start processes/sockets/watchers/timers at load;
  long-lived resources start from `session_start`/command handlers.
- Terminal-only behavior guarded by `ctx.mode === "tui"` (`ctx.hasUI` alone
  is insufficient — RPC forwards dialogs); headless/print/JSON/RPC modes are
  read-only and must fail closed for `create_routine`.
- Every MCP call passes Pi's tool pipeline, so the `tool_call` gate sees
  direct, deferred, and nested/codemode calls (`parentToolCallId`); matching
  only the outer codemode call is insufficient. Static `mcp.json` entries
  override extension registrations (including `-`/`_` collisions) — conflicts
  must fail closed before connecting a write-enabled process.
- Host MCP text truncation exists (documented 20 KB threshold in inspected
  Pi): the adapter never truncates canonical content; the companion preview
  renders full intent as inert text in a scrollable view.
- `.pi/mcp-adapter.json` in this checkout is local harness configuration,
  not a product setup; the server name must avoid `-`/`_` collision with it.

## 6. Proposed minimal public typed boundaries

Names illustrative per `architecture.md`; exact signatures are Stage 2 work
against the approved spec. Proposed narrow, injectable, dependency-inward
boundaries:

- `ProfileBinding` — immutable `{ origin, accountUuid, generation }`
  captured per invocation; checked pre-send and pre-delivery.
- `ProfileStore` — protected provisioning/opening, ownership lock, atomic
  vault/journal writes, external recovery marker; no implicit creation on read.
- `SessionProvider` — dedicated opaque credential selection, pending-refresh
  settlement, serialized rotation, pre-send/pre-delivery binding checks.
- `BackendClient` — typed allowed-route methods taking stored body
  bytes/resource keys + abort signal; credentials injected internally, never
  caller-controlled headers/URLs.
- `SchemaCodec` — strict tool-argument validation (`additionalProperties:
  false`, no coercion), documented-default normalization only, lossless
  backend numeric parse, millisecond-UTC checks, decimal-string revision
  projection.
- `OperationRepository` — exclusive admission/execution, immutable step bytes
  and keys, dispatch/confirmation commits, versioned keyed intent identity,
  terminal minimization.
- `RoutineCreationService` — orchestration only; no stdout, interactive login,
  or Pi access.
- `CompanionBinding` / `IntentStore` — trusted non-credential profile/session
  context and retained approved `operationId`/normalized intent; labels are
  transient authorized observations from read-tool results in the active
  profile/session.
- Test seams — injectable `Clock`, UUID generator, sleeper, process/file
  fault points, transport; seams must not become production auth bypasses.

Envelope contract (from MCP draft, restated as the foundation's wire rule):
success `{ ok: true, data }` with `isError: false`; execution error
`{ ok: false, error: { code, retryable, ... } }` with `isError: true`;
`structuredContent` and text block carry the same JSON; output schemas accept
both variants with `ok` as discriminator. Seven tools exactly
(`search_exercises`, `get_exercise`, `list_workouts`, `get_workout`,
`list_routines`, `get_routine`, `create_routine`); `create_routine` returns
`write_approval_required` until the verified companion-managed write policy
exists. Writes disabled by default. No invented origin, Google client ID, or
loopback port anywhere in code or docs — placeholders only.

## 7. Unsupported behaviors and non-goals (Stage 1 callouts)

- No remote/streamable-HTTP MCP endpoint; no OAuth authorization-server role
  for the adapter (generic MCP OAuth ≠ backend Google nonce/challenge flow).
- No bundling of Pi host modules; no Pi fork; no new backend endpoint,
  audience relaxation, or token minting.
- No update/delete routine tools, workout/exercise mutation, sync
  cache/bootstrap, bulk import, analytics, autonomous recovery worker, or
  background continuation on startup.
- JSON/RPC/print modes stay read-only; another AI host has no writable
  certification by default.
- No `confirmed`-flag/model-supplied consent, no `clientInfo`/annotation-based
  authorization, no silent preview truncation, no token-paste fallback, no
  random-port fallback for the login helper, no plaintext credential fallback.
- Compatibility matrix starts with every row explicitly unverified; installing
  a dependency is not a compatibility pass.

## 8. External inputs required (not yet available; placeholders only)

- Fixed HTTPS service origin; Google web client ID + registered
  `http://localhost:<port>` origin; configured loopback port.
- Isolated backend artifact/version + real DB, test-account/fixture
  provisioning, backend-owned clock/provider controls.
- Supported OS secret facility + permission to provision private encrypted
  test profiles.
- Named Pi runtime/package + terminal harness + supported extension set.
- Android integration fixture/device access (observation only).

## 9. Blockers, risks, and decisions needed from coordinator

1. Approve toolchain candidates (§2), especially TypeScript 5.9.x vs newer
   lines and MCP SDK v1 `1.32.1` vs v2.
2. Approve package manager (npm), test runner (vitest), scripts (§3),
   module/output paths and entry points (§4).
3. Confirm companion packaging approach (§5) and exclusive path ownership
   for Stage 2 (Developer: `src/`, manifests/lockfile, TS/lint/build config,
   `.github/`, ignore rules, ADR/dev guide; QA: `test/`, fixtures, evidence).
4. Confirm strict-TS flags (`exactOptionalPropertyTypes`,
   `noUncheckedIndexedAccess`) and lint/format selection.
5. Known risks carried to later tasks, not resolved here: lossless Int64
   codec (T03), OS secret store + generation fence (T04), Pi gate
   fail-closed proof incl. nested calls and registration conflicts (T02),
   transport budgets (T05). Any inability to uphold the shared draft is a
   blocker, not permission to weaken the contract.

---
*Teamsite note: planning-only artifact. No dependency installed, no code
written, no manifest/config edited, no QA paths inspected, no test run
claimed, no live service touched.*
