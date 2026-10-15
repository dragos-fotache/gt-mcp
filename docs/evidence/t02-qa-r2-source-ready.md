# T02 QA — R2 source readiness, rev 3: native envelope hardening (no execution; prep only)

**Role:** QA · **Slice:** R2 deferred/codemode/nested-readonly/sdk · **State:** test-source ready.
**Authority:** `docs/decisions/t02-approved-experiment-spec.md` §§1–13, shared contracts; nothing
derived from implementation, work orders, or generated sources. Execution CLOSED until the
coordinator's exact reviewed frozen-artifact relay. R1/S1/S2A regressions preserved
byte-identical; strict explicit-null assertions unchanged. R3–R11 held.

## Rev 3: native envelope hardening (bounded original requirements, explicitly stated)

- All route `tool_call`/`tool_result` records must carry `source:pi`.
- Exactly three native starts and three native ends per route (search/outer + read +
  creation); call IDs nonempty and unique; every call joins exactly one later result
  with the same ID, name and parent — enforced for read/search/outer endpoints, not
  only creation (wrong read/outer result metadata and results-before-starts fail).
- Deferred search result and the exactly-matching `search_loaded` record both follow
  the search call and precede the read call.
- First-request `fixtureTools` is an explicit array (empty if undiscovered, never
  omitted) holding only fixture names.
- 4 additional artifact-free negatives (non-pi sources, extra calls, wrong endpoint
  metadata, results-before-starts, omitted/loose FR fixtureTools).

## Rev 2: coordinator-resolved §13 exactness (no arbitrary joins or loose unions)

- `search_loaded`: exact `toolCallId` key equal to the actual search ID;
  `loadedTools` exactly the seven qualified fixture names (order immaterial, no duplicates).
- Exactly one `tool_surface` per phase; `hiddenTools:[]` in both; exact tabled
  active/callable sets (deferred FR `[tool_search]`, connected
  `[tool_search + 7Q]/[7Q]`; codemode FR/connected active `[codemode]`, connected
  callable `[7Q]`; nested FR/connected active and callable `[outer + 7Q]`);
  deferred/codemode FR callable holds only fixture names (never the outer tool);
  nested FR callable is its complete active set; FR fixtureTools optional but
  name-checked when present; connected fixtureTools exactly seven unqualified.
- Causal bounds: connected surface and same-record registration follow fixture
  discovery and precede creation; read success precedes creation; outer calls have
  null parents, precede inners, and their result finishes after both inner results.
- 4 additional artifact-free negatives (inexact loadedTools/ID, duplicate phases,
  hidden/non-tabled sets, four bound reorderings) plus the retained prior controls.

## What was prepared (QA-owned paths only)

- `test/pi-feasibility/helpers/report-checks.mjs` (additive; R1 helper untouched):
  `expectSdkReadonlyBase` (envelope, print/no-UI preflight, companion gate before
  declaration/registration/startup/discovery/creation, one same-record readonly
  registration, seven-tool fixture discovery, exact tabled launcher `tool_surface`
  sets (one snapshot per phase, `hiddenTools:[]`, connected pairing with discovery
  and creation bounds), no invented receiver/approval/sidecar/guarded
  records, all-zero ledgers with explicit-null final, shutdown before last cleanup),
  `expectDeferredReadonly` (one successful native `tool_search` then null-parent read/create;
  `search_loaded` carries the exact search `toolCallId` and exactly the seven qualified
  names; read succeeds with no gate and precedes creation),
  `expectCodemodeReadonly` / `expectNestedReadonly` (one real outer `codemode` /
  `t02_orchestrate` call with null parent and exactly one outer result; both inners carry
  the actual outer ID — generated parents fail; inner denial/error join holds regardless
  of the outer result; exact §12 gate fields with gate parent equal to the inner parent).
  A §12 first-request inventory is not required by §13; when present it must still carry
  the seven launcher-observed names.
- `test/pi-feasibility/readonly-sdk.test.mjs`: three dedicated R2 cases replacing the
  lenient shared check (removed, not weakened — each route now has strictly more joins).
- `test/pi-feasibility/validators-selftest.test.mjs`: 10 new artifact-free controls
  (3 route accepts + missing/failed search, parented read, generated parents, missing
  outer, wrong outer, missing outer result, inexact loadedTools/ID, duplicate phases,
  hidden/non-tabled sets, four bound reorderings).

## Safe controls executed (artifact-free only)

- `npx prettier --write` on the three touched files → clean.
- `node node_modules/vitest/vitest.mjs run test/pi-feasibility/validators-selftest.test.mjs`
  → **48/48 passed** (34 prior + 14 R2 controls).
- `node node_modules/vitest/vitest.mjs list test/pi-feasibility/readonly-sdk.test.mjs`
  → collects 6/6 with no execution (3 new R2 + R1/S1/S2A intact).

No driver/fixture/PTY/artifact executed. No config/dependency/install/metadata changes.

## Exact selections requested for the relay (serial, canonical toolchain)

1. `node node_modules/vitest/vitest.mjs run test/pi-feasibility/validators-selftest.test.mjs`
2. `node node_modules/vitest/vitest.mjs run test/pi-feasibility/readonly-sdk.test.mjs -t "deferred-readonly: tool_search loads, null-parent read/create denied, fixture final zero"`
3. Same file `-t "codemode-readonly: inner calls carry outer ID, inner denial holds, fixture final zero"`
4. Same file `-t "nested-readonly: inner calls carry orchestrate ID, inner denial holds, fixture final zero"`

## Open contract questions

Both rev-1 questions are resolved by the updated §13 (exact `toolCallId` key
and tabled phase sets enforced above). No remaining blockers.
