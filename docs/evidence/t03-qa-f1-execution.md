# T03 QA t03-f1 execution results (frozen relay, authorized runs only)

**Role:** independent QA (Muse Spark 1.3 Contributor, pane `w4:p2H`).
**Relay:** t03-f1 (`docs/evidence/t03-f1-artifact-relay.json`), status frozen
for independent QA, not accepted. No production/build/install/config actions;
no generated-code/map reads; Developer holds all production edits.
**Date (UTC):** 2026-10-11. Toolchain verified: Node v24.21.0, npm 11.19.0.

## Relay metadata verification (hashes/inventory only, no contents read)

- Source inventory: 35 entries; build inventory: 40 entries (counts match).
- `dist/domain/index.js` SHA256
  `6488fbf2e79f444d64bf4b9b505ecc1e7fa9ccb6cfbe4d2c7be7d7423f1aa3a6` — match.
- `dist/domain/index.d.ts` SHA256
  `aaab42eb969bee73b4bb944f1aaae0b94b07c7b1846275a79f9200ea9b32e3be` — match.
- Foundation artifacts unchanged from baseline-f0 (`dist/index.js`
  `8e609bb7…`, `companion/dist/index.js` `f5ade48…` re-verified).
- Tested QA source inventory: 22 files under `test/unit/t03/` (7 suites +
  fixtures/helpers/runner/deny-setup + 12 synthetic control fixtures);
  foundation regression file unchanged since the authorized name-presence
  repair. No QA source added/modified for this run.

## Authorized command 1: `npm run test -- test/unit/t03`

**Result: 7 files — 6 passed, 1 failed. 220 tests — 219 passed, 1 failed.**

All schema/behavior suites pass in full: 14-schema compilation and both
envelope branches per tool, strict inputs/normalization/identity, lossless
revision tokens, backend decoding incl. exact-source Int32 traps and
calendar/order/ID invariants, whitelist write projection, result envelopes,
canonical-exactness boundaries, required export subset, and all 13
import-probe controls (clean + twelve denies).

**Single failure** — `public-surface.test.mjs` >
"domain entry imports cleanly under arbitrary argv":
`domain: no new globals: expected [...176] to deeply equal [...178]`.
Observed delta: after-import globals equal before-import globals PLUS
exactly two names: `__zod_globalConfig`, `__zod_globalRegistry`.
All other probe channels clean: exit 0, empty stderr, setup complete (all
deny patches applied, ESM sync on, restore clean), import succeeded,
violations `[]`, listeners/handles/cwd deltas empty, argv passthrough
observed, sandbox tree empty.

Spec reference: section 2 — "Its import is effect-free: no IO, output,
timers, processes, network, state loads or global handlers."
The delta is dependency global registry DATA from the spec-mandated pinned
Zod 4.5.4 (section 3 mandates Zod 4.5.4; registries are Zod v4's documented
global pattern) — not IO, output, timers, processes, network, persisted
state loads, or event handlers.

**Adjudication requested (no unilateral change):** either the effect-free
clause covers data registries of the mandated dependency (my globals
equality is overconstrained → coordinator-approved test adjustment), or the
target must avoid dependency global writes (spec-level fix → close/rebuild
→ NEW relay). Production and specs/tests left untouched; no guard/resource
relaxation applied.

## Authorized command 2: `npm run smoke`

**Result: 7 files passed, 100/100 tests passed** — foundation suite green
including the authorized 17-name compatibility repair. No parked targets
executed.

## Own lint/format (allowed)

- `npx prettier --check` over `test/unit/t03/` +
  `test/foundation/package-contract.test.mjs`: clean.
- `npx eslint` over the same paths: exit 0, no findings.

## Limits and provenance

- Synthetic fixtures only; no credentials, tokens, account/resource IDs,
  private paths, or raw request/response bodies anywhere.
- No whole-suite/parked runs, installs, builds, or manifest/config edits.
- Independent tests determine acceptance; this report claims no acceptance —
  one failure above blocks it pending adjudication.
