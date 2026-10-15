# T02 R2 independent acceptance

**Audience:** coordinator/QA only. Developer receives bounded acceptance, not
QA evidence or diagnostics. **Disposition:** R2 deferred/codemode/nested-readonly
SDK routes ACCEPTED after bounded surface-evidence repair. S1/S2A/R1 regressions
pass. T02 incomplete: **13 total slices,4 accepted,9 remaining (R3-R11)**;
**six accepted registry profiles,35 unverified (14 SDK +21 PTY)**.
No product write enablement, genuine PTY approval, T17 or release certification.

## Frozen artifact and identity

Selected runtime: Node24.21.0/npm11.19.0, Pi/pi-ai1.1.0, SDK1.32.1/Zod4.5.4;
connected profiles observed protocol2025-11-25. Lock SHA256
797f6c5b116ec1683e50fb010f6b1960caffa6a0e3a71fb6c7ee24c7f56b642b.
Coordinator source/process review is separate from specification-derived QA.
Developer source/build/target runs were stopped throughout frozen acceptance.
Coordinator checked every identity again after the safe-stop milestone; unchanged.

| Artifact (under experiments/t02/) | SHA256 |
| --- | --- |
| driver/run.mjs | 866c809b960cd446cdf84ddd70f2e629ea653f426ca14613eed3601a3d4a161f |
| driver/sdk-gate-worker.mjs | 14a3cd17f22f616409863a1b54aade29b92cf7f1598d3910f293b70b0f1353a4 |
| driver/scenarios.mjs | c90828bbe26620391d0a8447e1e5e62bdae49a6b518e5a4869b565ff533ffab6 |
| companion/index.ts | 34ce0e6c6d641389c8760271139a67936b1b91ad1b4dd067412d08917854cf56 |
| dist/index.js | ea3c9a351e7177f249117bd4d2544154da0b2c359f44b008f9b6a296e738fe55 |
| fixture-server/server.mjs | 80ca89b1307f91ad7bad22c2fca5d855999a29fe6031389bff7cff7d4d79caab |
| metadata.json at relay | a2a36abe3352044f70d8cca382370e853701da853b93832200eebd2f520d1a31 |

Post-acceptance metadata-only reconciliation completed AFTER QA window closure:
SHA256 ae50681d4ce5ba27fe28ab1f0d7fb69984aded6d7e4f05a408bb3e080c5172df.
Exactly six SDK profiles accepted/launchable, candidateSubset empty, all others
unready. Scoped formatter passed for Developer and coordinator. It was not part
of the frozen target window; all source/build/fixture identities stayed unchanged.
No runtime/schema/registry/entry changes or further source/build action.

## Exact serial commands and results

Each command starts `node node_modules/vitest/vitest.mjs run`:

1. `test/pi-feasibility/validators-selftest.test.mjs`
2. `test/pi-feasibility/readonly-sdk.test.mjs -t "deferred-readonly: tool_search loads, null-parent read/create denied, fixture final zero"`
3. Same file `-t "codemode-readonly: inner calls carry outer ID, inner denial holds, fixture final zero"`
4. Same file `-t "nested-readonly: inner calls carry orchestrate ID, inner denial holds, fixture final zero"`
5. Same file `-t "no-companion: policy none, spawn absence, actual unavailable call"`
6. Same file `-t "generic-readonly: connected fixture stays read-only, seven tools listed"`
7. Same file `-t "direct-readonly: synchronous companion gate denies in print/no-UI, reads succeed, fixture final zero"`

| Selection | Independent QA | Coordinator strict repeat before QA relay |
| --- | --- | --- |
| Artifact-free validators | 48/48 pass | 48/48 pass,423ms |
| deferred-readonly | 1 pass,5 filter exclusions | 1 pass,5 exclusions,1.41s |
| codemode-readonly | 1 pass,5 filter exclusions | 1 pass,5 exclusions,1.49s |
| nested-readonly | 1 pass,5 filter exclusions | 1 pass,5 exclusions,1.41s |
| S1 | 1 pass,5 filter exclusions | 1 pass,5 exclusions,1.17s |
| S2A | 1 pass,5 filter exclusions | 1 pass,5 exclusions,1.39s |
| R1 | 1 pass,5 filter exclusions | 1 pass,5 exclusions,1.40s |

Excluded cases were NOT run or counted as passes. Controls are logic-control,
not48 runtime/approval scenarios. QA's strict record:
[t02-qa-r2-acceptance.md](t02-qa-r2-acceptance.md).
Coordinator's permitted typecheck/t02:build/lint:t02/format:check:t02 all pass.
No full matrix, future scenario, foundation/combined suite or clean-install claim.

## Accepted public observations

All R2 profiles: actual print/no-UI sdk-pipeline, exactly3 native source:pi starts
and ends, unique IDs, later same-ID/name/parent results, successful ungated read
before creation. Gate installed before registration/discovery; exactly one inner
creation joins companion denial mode-not-tui:print, public seed digest,
approvedDigest:null and actual native isError:true/code:null with call<gate<result.
No unavailable/generic receiver refusal substitutes for the companion gate.

Deferred has real successful tool_search and actual result-origin search_loaded
with exact toolCallId/seven qualified names before null-parent read/create.
Codemode/orchestrator outer calls have null parents; native inner IDs/parents join
that actual outer, whose result completes after inner read and denial. Outer
success/error alone is not used as inner evidence.

One exact phase surface each, hiddenTools:[]; connected surfaces and same-record
registered/connected/spawned readonly declaration follow fixture discovery and
precede creation. Connected seven-tool availability pairs actual receiver listing.
Exactly one fixture final0, explicit operationId:null/digest:null/operations[],
no positive intermediate effects, receiver creation check, approval, sidecar or
guarded capability. Genuine shutdown precedes last cleanup with owned children/
listeners0 and roots removed. S1 absence, S2A receiver refusal and R1 direct gate
remain distinct bounded accepted profiles.

Coordinator public observations: deferred1150ms/32 records, codemode1229ms/31,
nested1158ms/31, S1 895ms/16, S2A1142ms/22, R1 1094ms/28; stdout/out agree,
stderr empty, exit0/completed:true and correct independent zero-effect origin.

## Preserved review failure and limits

First Developer readiness did NOT clear coordinator §13 review: surface evidence
was nonconformant despite self-declared completion. Readiness was withdrawn BEFORE
any QA target window; the failed source/public review remains preserved separately.
Coordinator authorized only a two-file observation/validation repair inside R2.
Strict independent assertions/specification were never weakened or replaced by
missing-keys equivalence. No extra slice, scenario, subsystem or dependency added.

This closed launcher conservatively fails if indirect fixture discovery completes
unexpectedly early before its first-request snapshot; it does not fake that state.
R2 deadlines enforce55s worker/10s MCP; full failure calibration remains R10.
Arbitrary ambient CLI inventory, same-user/non-OS-sandbox and IPC race limits remain.
No production auth/backend/storage/durable intent, hostile-preview or release proof.

## Closed boundary and next scope

Independent target window CLOSED; QA safe-stop received. Developer metadata-only
maintenance then stops. R3 is next ONLY after fresh coordinator READY/TAKEOVER.
Latest user instruction requires fresh Developer AND QA for R3 and every future
slice, reusing their existing panes safely after takeover. No current R3 assignment
or whole-matrix delegation. Automatic succession ends at T02 or unresolved blocker.
