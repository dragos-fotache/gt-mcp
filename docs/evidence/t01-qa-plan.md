# T01 QA plan — Stage 1 preparation (no results claimed)

**Role:** QA · **Task:** T01 foundation · **Stage:** 1 — preparation only
**State:** planning; Stage 1 plan reviewed and accepted as planning only per coordinator. No runnable artifact exists, no checks claimed passing. Stage 2 test implementation awaits explicit coordinator authorization with the approved public spec.
**Normative refs:** `docs/tasks/t01-foundation.md`, `docs/tasks/t01-work-order.md`,
`docs/agent-coordination.md`, `docs/architecture.md`, `docs/verification.md`,
shared MCP draft 0.1-draft + backend v1 (OpenAPI 1.0.0), shared baseline `9a96dcb`.
**Ownership:** QA owns this file only at this stage (`docs/evidence/t01-qa-plan.md`).
No test sources, fixtures, dependency/config edits, or production reads performed.

> Independence note: this plan is derived solely from the specifications above.
> No production code, diffs, generated sources/maps, or bundled implementation
> were read. Package/build metadata was not inspected at Stage 1; all concrete
> script/pin/path names below are placeholders awaiting the coordinator-approved
> public interface specification.

## 1. T01 acceptance coverage map (planned, not executed)

Each T01 acceptance criterion → planned black-box check. All checks target only
the approved public entry points / pure modules once named in the Stage 2 spec.

| # | T01 acceptance criterion (from `t01-foundation.md`) | Planned QA check (Stage 2) | Layer / evidence type |
|---|---|---|---|
| A1 | Clean locked install succeeds on selected runtime | Locked install via the coordinator-specified disposable clean source snapshot + locked-install method (no clean clone is presently available: root Git has no commits); record exact command, runtime version, pass/fail. Fails if lockfile missing, network-unpinned, or install mutates lockfile. | deterministic env evidence |
| A2 | Typecheck succeeds | Run approved typecheck script; zero errors. | deterministic |
| A3 | Lint succeeds | Run approved lint (and format-check if specified); zero violations. | deterministic |
| A4 | Unit smoke tests succeed | Run approved unit/smoke suite; all pass, no skips counted as passes. | deterministic |
| A5 | Build succeeds | Run approved build; outputs to specified paths only; rebuild is clean. | deterministic |
| A6 | No floating latest/experimental deps; peer ranges permitted where packaging rules allow | Assert direct deps are exact-pinned except peer-dependency compatibility ranges intentionally permitted by Pi packaging rules; exact development pins recorded separately from host peer metadata. No `*`/`latest`/unbounded non-peer ranges; lockfile present; record exact versions. | deterministic pin audit |
| A7 | Companion does not bundle host-provided Pi modules | Assert via coordinator-approved observable/metadata contract only (manifest peer/external declarations, build-output manifest — never by reading production sources or bundled implementation). Metadata-only bundle checks alone are not passing evidence (see §8). Method TBD — needs decision D8. | deterministic |
| A8 | Pi packaging rules followed; dev/cert pins recorded separately from host peer metadata | Assert packaging doc/ADR distinguishes dev pins vs required host peer metadata; assert no invented origin/client-ID/port values. | doc/spec audit |
| A9 | Importing pure libraries starts no processes/listeners | Import each named pure module in isolation; assert no child process, server listen, `process.on` side subscriptions, timers keeping loop alive; process exits cleanly. | import side-effect check |
| A10 | No credentials / personal fixture data committed (QA-observable scope only) | QA checks only its own observable scope (QA fixtures/evidence, ignore-rule presence) without reading production sources or bundled implementation; source/secret and implementation-side scope audits are coordinator-owned. | privacy/ignore audit (bounded) |
| A11 | No write-enabled MCP registration committed | Assert foundation entry points do not register/connect a write-enabled server and do not advertise implemented seven-tool behavior (M01 rows stay unverified). | inert entry-point check |
| A12 | Relevant existing checks remain green | Run repo's pre-existing check set named by coordinator; record pass/fail. | deterministic |
| A13 | No policy/schema expansion or private fixture leakage (QA-observable scope only) | Assert no new tool/policy/schema surface in QA-observable artifacts beyond foundation scaffolding; assert ignore rules cover credentials, private state, build output. Implementation-side scope audit is coordinator-owned; QA does not read production sources to perform it. | scope/ignore audit (bounded) |

Out of scope for T01 QA (explicitly not claimed): any domain behavior
(schemas/codecs T03, storage T04, transport T05+), seven-tool behavior (M01),
Pi pipeline approval (C10–C12/T17), real-backend interop (T16), live Google (T19).
Compatibility matrix rows all remain **unselected/unverified**; installing a
dependency is never recorded as a compatibility pass.

## 2. Planned commands (placeholders — exact names pending approved spec)

Exact package manager, script names, and module/output paths are **not yet decided**
and the commands below are **placeholders, not evidence**. Placeholder commands,
skipped checks, and metadata-only bundle checks are never counted as passing evidence.
Stage 2 QA will substitute the coordinator-approved values. Planned shape:

```sh
# A1 — clean locked install (exact tool + flags per approved spec, e.g. npm ci / pnpm --frozen-lockfile)
<install-cmd> --locked --clean
# A2/A3/A4/A5 — Werden strictly from approved manifest scripts; never invented ad-hoc flags
<run> typecheck
<run> lint
<run> test:smoke   # or approved unit/smoke entry
<run> build
# A12 — pre-existing checks named by coordinator
<existing-checks>
```

QA will record: exact command lines, Node/package-manager versions, wall time,
exit codes, and full pass/fail per command. Mocks, skips, and installs are not
interoperability passes and will be labeled as such.

## 3. Pin and peer requirements to verify (values pending Developer proposal)

- [ ] Stable Node.js, TypeScript, official MCP SDK, protocol candidates recorded
      with exact versions + evidence URLs + ADR (Developer proposal → coordinator decision).
- [ ] Package manager + test runner choice recorded; lockfile committed.
- [ ] Strict TS config, lint/format/check/build/test scripts, CI, ignore rules present.
- [ ] No floating/experimental ranges in direct dependencies, except peer-dependency
      compatibility ranges intentionally permitted by Pi packaging rules.
- [ ] Companion Pi host modules declared as peer/external (not bundled); exact
      development/certification pins kept separate from required host peer metadata.
      Metadata-only declarations are not alone passing evidence (see §8).
- [ ] Compatibility matrix created with every row explicitly **unverified**
      (Node/TS/PM/SDK/protocol, Pi version/package/runtime, OS/secret facility,
      backend artifact/OpenAPI baseline, install/upgrade/journal versions).

## 4. Import-side-effect checks (black-box, via public entry points only)

Detection-limit principle: a subprocess exiting cleanly alone does **not** prove no
transient network/filesystem/listener effects occurred. QA will therefore use
coordinator-approved observable interception probes where available (e.g. loopback /
filesystem-observation harnesses named in the approved spec) and will explicitly state
remaining detection limits in every report. Where no probe is approved, the check is
recorded as **limited / unverified for transients**, never as a pass on exit code alone.

For each pure shared module named in the approved spec (config/storage/session/
HTTP/codecs/journals/fault-injection boundaries per `architecture.md` illustrative
list), QA will, without reading implementation sources:

- Import/require the module in a fresh process and assert:
  - no spawned process or listener (no `listen`, no held-open handles);
  - no network access attempted;
  - no private-state/credential file access;
  - no stdout/stderr emission on import;
  - process exits without forced kill (no lingering timers/sockets).
- Negative probes: importing pure modules must not register an MCP server, list
  seven tools, or open any profile vault/journal path.

Method (e.g. subprocess harness with handle/network/stdout capture) to be fixed
once entry-point paths are agreed — see decisions D1–D3.

## 5. Inert entry-point expectations

Foundation server/CLI/companion entry points (paths TBD) MUST, at T01:

- Exist as inert scaffolding only: `--help`/version-style invocation or import
  succeeds without performing domain work.
- NOT advertise implemented seven-tool behavior (no tool catalogue, no schemas,
  no execution paths).
- NOT connect or register a write-enabled server (no stdio serve loop claiming
  writability; no static MCP entry that would collide/override).
- NOT bundle Pi host modules; NOT invent any actual origin, Google client ID,
  or registered port.
- Emit no stdout on pure-module import (per work order); any CLI output confined
  to explicit invoked commands, with stdout discipline to be asserted.

## 6. Synthetic-only fixtures and privacy/ignore boundaries

- All QA fixtures (Stage 2, under QA-owned `test/`) will be visibly synthetic via
  fixture labels/docs and synthetic-marker conventions — never personal/live data.
  Synthetic UUIDs used as *valid* inputs must still use canonical UUID syntax;
  synthetic provenance is marked via fixture labels/docs, not via invalid
  `SYNTHETIC-` UUID prefixes (which would only suit negative-shape cases).
- QA privacy/package checks never read production sources or bundled implementation.
  Source/secret and implementation-side scope audits are coordinator-owned; QA asserts
  only its observable scope (QA fixtures/evidence, ignore-rule presence, approved
  metadata contract).
  journals/receipts, build output, lockfile-adjacent secrets, local harness
  config (e.g. existing `.pi/mcp-adapter.json` stays local-only, never a product claim).
- Evidence reports under `docs/evidence/` will be sanitized: no raw credentials,
  private filesystem paths, account/resource identifiers, personal content, or
  raw request/response bodies — per `verification.md` evidence format.
- Distinguish in every report: **planning** (this file) vs **deterministic
  evidence** (clean install/typecheck/lint/build/unit-smoke outputs) vs
  **unverified live interoperability** (backend/Pi/Google/Android — all remain
  unverified at T01 by definition).

## 7. Public observable/interface decisions needed (to Coordinator — no guessing)

QA cannot write black-box tests until the coordinator approves and publishes
these as a shared specification. Requesting decisions, not Developer internals:

- **D1 — Entry-point/module paths:** exact `src/` + `companion/src/` entry files,
      pure module paths, and build output paths smoke tests may import/invoke.
- **D2 — Script contract:** exact package manager + lockfile name; exact script
      names for install/typecheck/lint/build/test/smoke/CI and their flags.
- **D3 — Side-effect harness protocol:** approved way to assert "no
      processes/listeners/network/stdout on import" (e.g. permitted helper or
      plain subprocess observation) without reading implementation.
- **D4 — Inert observable behavior:** exact expected output/exit codes for
      `--help`/`--version`/no-arg invocation of each entry point; what "does not
      advertise seven-tool behavior" observably means (e.g. tool-list command
      absent vs empty).
- **D5 — Pure-module boundary list:** final typed-boundary names (ProfileBinding,
      ProfileStore, SessionProvider, BackendClient, SchemaCodec,
      OperationRepository, RoutineCreationService, CompanionBinding/IntentStore,
      Clock/UUID/sleeper/fault/transport seams per `architecture.md`) — confirm
      which exist at T01 as inert types/stubs vs deferred to later tasks.
- **D6 — Fixture/synthetic conventions:** approved synthetic-marker convention
      and `test/` layout (`unit/`, `fault/`, `protocol/`, etc.) so QA fixtures
      cannot be mistaken for real data.
- **D7 — Ignore/privacy contract:** exact ignore-rule set and the sanitized
      evidence format fields QA must emit (commands, versions, pass/fail,
      cleanup, limits).
- **D8 — Companion peer/bundle assertion method (observable/metadata only):** how QA observably checks
      "Pi host modules not bundled" via the approved metadata contract (manifest peer field / build-output manifest)
      without reading production sources or bundled implementation; confirm that metadata-only
      checks are necessary but not sufficient passing evidence.
- **D9 — Compatibility matrix location/format:** file + columns QA must create
      with all-unverified rows at T01.
- **D10 — Test runner + assertion style:** approved runner (pending Developer
      proposal) and whether QA may add a devDependency via coordinator or must
      request it (work order: requests go to coordinator; no racing edits).

Until D1/D2/D5 are approved, QA writes no test sources and asserts nothing
against guessed APIs — per work-order constraint.

## 8. Evidence bar (what never counts as a pass)

- Placeholder commands, skipped checks, and metadata-only bundle checks are never
  passing evidence. Each report distinguishes **planning** (this file) vs
  **deterministic evidence** (approved-command outputs with exact versions) vs
  **unverified live interoperability** (backend/Pi/Google/Android — all remain
  unverified at T01 by definition).
- Transient-effect checks without an approved interception probe are reported with
  explicit detection limits, never as passes on exit code alone.

## 9. Stage 2 readiness (after explicit coordinator approval)

- QA will own `test/` (including visibly synthetic fixtures) and QA evidence;
  will not read production sources, diffs, or generated implementation/maps.
- Allowed reads: package/build metadata + the approved public specification.
- Dependency/script needs will be requested through the coordinator; no direct
  manifest/lockfile/config edits racing Developer.
- First Stage 2 milestone: translate §1 rows A1–A13 into executable black-box
  checks against the approved entry points, then report pass/fail/blocked with
  exact commands and versions via `herdr agent prompt coordinator`.

## 10. Blockers / risks (Stage 1)

1. **Blocked on approved interface spec + Stage 2 authorization:** D1/D2/D5 (consolidated
   by coordinator after Developer candidate pins/interfaces) — no test implementation
   until the coordinator sends the asynchronous approved-spec message with explicit
   Stage 2 authorization. No polling.
2. No acceptance checks claimed passing; no runnable artifact asserted. No clean clone
   presently available (root Git has no commits); locked-install evidence awaits the
   coordinator-specified disposable clean source snapshot method.
3. No live/external interop attempted or claimed (backend, Pi, Google, Android
   all remain unverified; placeholders only, no invented origins/ports/IDs).

1. **Blocked on approved interface spec:** D1/D2/D5 — no test implementation
   possible until coordinator publishes the final public interface/observable
   foundation contract (Developer proposal review pending).
2. No acceptance checks claimed passing; no runnable artifact asserted.
3. No live/external interop attempted or claimed (backend, Pi, Google, Android
   all remain unverified; placeholders only, no invented origins/ports/IDs).

---

*Prepared from specifications only. Next: await coordinator interface decisions,
then implement black-box tests strictly against the approved contract.*
