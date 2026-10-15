# T02 QA — R2 repair-window acceptance record (strict, unweakened)

**Role:** QA · **Slice:** R2 deferred/codemode/nested-readonly/sdk + S1/S2A/R1 regressions.
**State:** accepted in this independent frozen window; STOPPED after.
**Authority:** `docs/decisions/t02-approved-experiment-spec.md` §§1–13 (rev-3 envelope hardening).
**Relay identities (frozen, QA-unmodified):** run.mjs `866c809b…4a161f`,
sdk-gate-worker `14a3cd17…1353a4`, dist/index.js `ea3c9a35…738fe55`,
fixture-server `80ca89b1…4d79caab`, metadata `a2a36abe…d1a31` (candidates, as relayed).
No assertion weakened; no whole file/suite, build, install, or metadata action. R3–R11 held.

## Exact serial executions (Node v24.21.0 / npm v11.19.0)

1. `run test/pi-feasibility/validators-selftest.test.mjs` → **48/48 passed**.
2. `run test/pi-feasibility/readonly-sdk.test.mjs -t "deferred-readonly: tool_search loads, null-parent read/create denied, fixture final zero"` → **1 passed | 5 skipped** (filter exclusions, not passes).
3. Same file `-t "codemode-readonly: inner calls carry outer ID, inner denial holds, fixture final zero"` → **1 passed | 5 skipped**.
4. Same file `-t "nested-readonly: inner calls carry orchestrate ID, inner denial holds, fixture final zero"` → **1 passed | 5 skipped**.
5. Same file `-t "no-companion: policy none, spawn absence, actual unavailable call"` → **1 passed | 5 skipped**.
6. Same file `-t "generic-readonly: connected fixture stays read-only, seven tools listed"` → **1 passed | 5 skipped**.
7. Same file `-t "direct-readonly: synchronous companion gate denies in print/no-UI, reads succeed, fixture final zero"` → **1 passed | 5 skipped**.

## Observed R2 outcomes (public §13, sdk-pipeline, all routes)

- Exactly three native `source:pi` starts and three ends per route with unique nonempty
  IDs; every endpoint joins exactly one later same-ID/name/parent result.
- Deferred: `tool_search` success and the exactly-matching `search_loaded`
  (`toolCallId` = search ID, `loadedTools` = seven qualified names) both follow the
  search call and precede the null-parent read; read succeeds with no gate invocation.
- Codemode/nested: real outer `codemode` / `t02_orchestrate` call (null parent) with
  exactly one same-name/null-parent later outer result finishing after both inner
  results; both inners carry the actual outer ID; inner read succeeds; inner creation
  meets the exact §12 companion deny (`mode:print`, `hasUI:false`,
  `reason:mode-not-tui:print`, public digest, `approvedDigest:null`) and one native
  `code:null` error with `call < gate < result`.
- Exact tabled surfaces: one snapshot per phase, `hiddenTools:[]` both, connected
  snapshot and same-record registration bounded between discovery and creation,
  connected `fixtureTools` exactly seven unqualified, FR `fixtureTools` explicit.
- No receiver check, approval prompt, sidecar verdict, guarded registration, or any
  positive effect; exactly one fixture-origin final zero (`operationId:null`,
  `digest:null`, `operations:[]`); shutdown before last cleanup.
- S1/S2A/R1 regressions pass in their accepted bounded profiles, unchanged and distinct.

## Blockers

None. Safe-stop milestone reached; no further QA action in this window.
