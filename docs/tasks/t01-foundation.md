# T01 — Establish the pinned TypeScript project and interfaces

**Status:** done · **Owner:** Coordinator (Developer + QA subordinates) · **Requires:** None
**Size:** 1-2 sessions

## Active assignment

See [T01 coordinator work order](t01-work-order.md) for staged preparation,
independent implementation/test ownership and integration gates, and
[team workflow](../agent-coordination.md) for communication rules. Preparation is
complete. Developer implementation and independent QA tests were reviewed and accepted
against the [approved specification](../decisions/t01-approved-foundation-spec.md).
See [coordinator acceptance evidence](../evidence/t01-coordinator-review.md): clean
locked snapshot install, typecheck/lint/format/build, 100 tests and 16 calibration probes
passed. This is foundation acceptance only, not MCP/Pi/backend certification.

## Outcome

Create a reproducible development foundation without implementing domain behavior or enabling writes.

## Read first

- [README.md](../../shared-docs/docs/mcp-contract/README.md)
- [architecture.md](../architecture.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Select supported stable Node.js/TypeScript/official MCP SDK versions and protocol candidates from their actual documentation; record exact versions and an ADR. Pi 1.1.0 is an inspected candidate only.
- Choose package manager and test runner; commit lockfile, strict TypeScript configuration, lint/format/check/build/test scripts, CI, and ignore rules for credentials, private state and build output.
- Establish server/CLI/companion entry points and pure shared modules. Agree typed boundaries for configuration, storage, session binding, HTTP, codecs, journals and fault injection.
- Create synthetic fixtures/build smoke tests only. Add an agent development guide listing commands, task claiming, contract authority and security exclusions.
- Start a compatibility matrix with every row explicitly unverified; do not infer support from installing a dependency.

## Acceptance criteria

- Clean locked install, typecheck, lint, unit smoke tests and build succeed on the selected runtime.
- No floating latest/experimental dependencies; companion does not bundle host-provided Pi modules. Follow Pi packaging rules and record exact development/certification pins separately from required host peer metadata.
- Importing pure libraries starts no processes/listeners; no credentials, personal fixture data or write-enabled MCP registration is committed.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

Foundation for all scenarios; version/package evidence used by M01 and T17/T20.

## Handoff

**Accepted by Coordinator after independent Developer/QA work and clean-snapshot review.**

- Changed paths: root workspace manifest/lockfile and runtime/config/ignore files;
  `.github/workflows/ci.yml`; `src/index.ts`, `src/contracts/index.ts`,
  `src/protocol/server.ts`, `src/cli/index.ts`; companion manifest/config/source;
  `test/foundation/`, synthetic `test/fixtures/`; `AGENTS.md`; implementation ADR,
  approved spec, compatibility matrix and QA/coordinator evidence.
- Selected Node 24.21.0/npm 11.19.0/TS 5.9.3/SDK 1.32.1/Vitest 4.1.11;
  remaining exact pins in the ADR/lockfile. Protocol 2025-11-25 is only a candidate.
- Safe checks: `npm ci --ignore-scripts`, `npm run check`, `npm run smoke`,
  `node test/foundation/run-calibration.mjs`, companion dry-run package inventory:
  all exit 0 in a disposable 35-file source snapshot. 100/100 tests (7 files),
  16/16 calibration probes, lockfile unchanged. Shared catalogue checks pass (11 tests).
  Exact reproduction/evidence: [coordinator review](../evidence/t01-coordinator-review.md).
- No acceptance blockers. Known limits: companion-only approved skipLibCheck for 43
  upstream Pi TS1543 declarations; import.meta.main Stability 1.0 API risk on the
  narrowly tested runtime; no actual protocol/host/auth/backend/storage implementation.
  All general compatibility rows remain unverified. No secrets/live writes/publication.
- Production interfaces are type-only seams and semantic client methods with per-step
  mutation identities. Later owners must implement runtime validation, byte ownership,
  durable storage and authorization; signatures are not proof of those behaviors.
- Coordinator owns interface changes/integration; Developer owns production/config,
  QA owns independent tests. T02/T03/T04 are now ready; no dependent task is assigned
  merely by this handoff. Preserve inert/write-disabled defaults.
- Root changes remain uncommitted under this work order; no staging/commits authorized.
  Shared checkout remains clean at 9a96dcb and locally excluded from root Git.

Record scripts, chosen versions, interfaces/module ownership and any unsupported platform or SDK behavior.

On completion append: changed paths; exact safe commands and pass/fail results; versions;
remaining blockers/limits; next-agent integration notes. Update the task index. Do not
record credentials, identifying production data or raw private request/response bodies.
