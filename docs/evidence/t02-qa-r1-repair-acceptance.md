# T02 QA — R1 repair-window acceptance evidence (strict, unweakened)

**Role:** QA · **Slice:** R1 / S2B direct-readonly/sdk + S1/S2A regressions · **State:** accepted in this window.
**Authority:** `docs/decisions/t02-approved-experiment-spec.md` §§1–12 (explicit-null contract:
final `operationId:null`, `digest:null`, `operations:[]`).
**Relay artifacts (frozen):** fixture-server `80ca89b1…4d79caab`, driver `cd1fda86…32d56cb`,
compiled companion `07296531…00215ab` (coordinator-relayed identities; independently unmodified by QA).
Prior failed-window evidence in `t02-qa-r1-s2b-readiness.md` is preserved unaltered.
No assertion was weakened; no other target, suite, install, or metadata action taken. R2–R11 held.

## Exact commands (canonical toolchain Node v24.21.0 / npm v11.19.0, serial)

1. `node node_modules/vitest/vitest.mjs run test/pi-feasibility/validators-selftest.test.mjs`
   → **34/34 passed** (artifact-free logic-control; 11 R1 §12 negative controls).
2. `node node_modules/vitest/vitest.mjs run test/pi-feasibility/readonly-sdk.test.mjs -t "direct-readonly: synchronous companion gate denies in print/no-UI, reads succeed, fixture final zero"`
   → **1 passed | 5 skipped** (skips are filter exclusions, not passes).
3. Same file `-t "no-companion: policy none, spawn absence, actual unavailable call"`
   → **1 passed | 5 skipped**.
4. Same file `-t "generic-readonly: connected fixture stays read-only, seven tools listed"`
   → **1 passed | 5 skipped**.

## Observed R1 outcome (public §§11–12, sdk-pipeline)

- Exactly one companion-origin gate installed before declaration/registration/startup/
  discovery/creation; print context with `hasUI:false`/`uiInjected:false`.
- One same-record connected readonly registration (`readonly` + `registered` + `connected`
  + `spawned`); no guarded capability; pending declaration never counted as proof.
- Launcher seven-tool first-request inventory paired with fixture-origin discovery and a
  qualified `mcp__synth_gt__get_exercise` success after discovery.
- Exactly one direct creation call on the public operationId/digest (nonempty native ID,
  null parent) joined to one companion `deny` gate (`mode:print`, `hasUI:false`,
  `reason:mode-not-tui:print`, `attemptedDigest` = public seed SHA, `approvedDigest:null`)
  and exactly one `source:pi` creation-named error (`isError:true`, `code:null`,
  null parent), ordered `call.seq < gate.seq < result.seq`.
- Zero `receiver_check` / `sidecar_verdict` / `approval_prompt`; no structured
  `write_approval_required` on the joined error (S2A shape would fail here).
- No positive effect hidden: all ledgers counter zero; exactly one fixture-origin final
  ledger with **explicit `operationId:null`, `digest:null`**, report `operations:[]`;
  genuine runtime shutdown precedes the final cleanup, which is the last trace record.
- S1 absence (`policy:none`, `spawned:false`, actual unavailable call, no invented ledger)
  and S2A generic receiver refusal (seven discovered tools, `get_exercise` success,
  `write_approval_required`, receiver's own final zero, no fabricated gate) each pass
  their unchanged bounded profiles and remain distinct from the S2B companion denial.

## Blockers

None in this window. Stopping here per relay; awaiting further coordinator direction.
