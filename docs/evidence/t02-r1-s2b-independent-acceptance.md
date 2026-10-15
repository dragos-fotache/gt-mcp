# T02 R1/S2B independent acceptance

**Audience:** coordinator/QA only; Developer receives the bounded outcome, not
QA evidence or diagnostics. No implementation source is included.
**Disposition:** R1/S2B `direct-readonly/sdk` ACCEPTED after the strict ledger
repair. S1/S2A selected regressions pass. T02 remains incomplete and paused after
this authorized slice: **13 total slices, 3 accepted, 10 remaining (R2-R11)**.
No next-slice assignment, production write enablement or T17 certification.

## Frozen artifact and independence

Exact selected runtime: Node24.21.0/npm11.19.0, Pi1.1.0, pi-ai1.1.0,
MCP SDK1.32.1/Zod4.5.4. Connected profiles observed protocol2025-11-25.
Independent tests derive from public experiment specification §§1-12, not
implementation. Coordinator source/process review was separate from QA testing.
Build/install/source stayed frozen during each exact QA window.

| Public artifact | SHA256 |
| --- | --- |
| experiments/t02/fixture-server/server.mjs | 80ca89b1307f91ad7bad22c2fca5d855999a29fe6031389bff7cff7d4d79caab |
| experiments/t02/driver/run.mjs | cd1fda86a2974017e96e41a2d3d5949cf468b07e81b06b0d64198e63132d56cb |
| experiments/t02/dist/index.js | 07296531dc39bd2370685cc9010d056533ec211127e0d5ca69f7fc05100215ab |

Coordinator checked identities again after QA acceptance; unchanged. After closing
that window, Developer performed only the authorized metadata-status update:
`experiments/t02/metadata.json` SHA256
`952fbee431352a54dfc3e18d70267acb9bc371158106f214d2a78b29f3039018`.
Only acceptance/launchable/candidate notes changed; runtime entries/versions/
registry and source/build artifacts did not. Scoped formatting passed. Metadata
now names exactly S1/S2A/S2B accepted SDK profiles, no candidate, all others unready.

## Exact independent commands and results

Each selection is separate and serial; filtered cases are NOT executed or passes.

```sh
node node_modules/vitest/vitest.mjs run test/pi-feasibility/validators-selftest.test.mjs
node node_modules/vitest/vitest.mjs run test/pi-feasibility/readonly-sdk.test.mjs -t "direct-readonly: synchronous companion gate denies in print/no-UI, reads succeed, fixture final zero"
node node_modules/vitest/vitest.mjs run test/pi-feasibility/readonly-sdk.test.mjs -t "no-companion: policy none, spawn absence, actual unavailable call"
node node_modules/vitest/vitest.mjs run test/pi-feasibility/readonly-sdk.test.mjs -t "generic-readonly: connected fixture stays read-only, seven tools listed"
```

| Selection | Independent QA | Coordinator repeat on same repaired artifact |
| --- | --- | --- |
| Validator self-tests | 34/34 passed | 34/34 passed, 268ms |
| R1/S2B exact case | 1 passed, 5 filtered skips | 1 passed, 5 filtered skips, 1.18s |
| S1 exact case | 1 passed, 5 filtered skips | 1 passed, 5 filtered skips, 993ms |
| S2A exact case | 1 passed, 5 filtered skips | 1 passed, 5 filtered skips, 1.22s |

Coordinator ran these repeats before the fresh QA relay, while QA execution was
held; QA independently repeated afterward. There was no concurrent build/test
window or assertion weakening. The 34 validator cases are artifact-free logic
controls, not 34 runtime approval/host scenarios.

QA record: [strict repair-window evidence](t02-qa-r1-repair-acceptance.md).

## Accepted observations and limits

R1 actual sdk-pipeline behavior:

- Exactly one companion-origin synchronous gate installation before registration/
  declaration/startup/discovery/creation; print/no-UI, no injected UI.
- Same-record connected readonly registration plus actual fixture-origin seven-tool
  listing and native first-request inventory; qualified get_exercise read succeeds.
- One real direct creation call joins one genuine companion deny and one native
  creation-named error, nonempty native ID/null parents, `call < gate < result`.
  Gate mode:print/hasUI:false, reason:mode-not-tui:print, attemptedDigest is the
  independently canonical public seed, approvedDigest:null. Result isError:true,
  code:null; not a fabricated generic receiver refusal.
- No receiver creation check, sidecar verdict, approval prompt, guarded capability
  or hidden positive ledger. Exactly one receiver final0 with explicit
  operationId:null/digest:null/operations[]. Genuine shutdown precedes last cleanup;
  owned children/listeners0 and disposable roots removed.

Coordinator public reruns: R1 1031ms/28 records, S1 753ms/16 records,
S2A 998ms/22 records, each exit0/completed:true and appropriate zero-effect source.
An isolated official-SDK fixture-only read/close control also observed explicit
nulls in BOTH shared final and independent owned-file final; it is serialization/
transport corroboration, not additional Pi approval proof. Seven journal controls
separately calibrated protected envelopes/profile provenance only.

S1 remains actual unavailable-call/no-spawn evidence, with no invented fixture.
S2A remains actual generic receiver write_approval_required and connected final0,
without a companion gate. Those cannot substitute for the accepted R1 gate denial.

## Preserved failure history

The first QA R1 window FAILED: final zero omitted operationId/digest rather than
explicit null (§8). Controls passed34/34; that selection had1 failed/5 filtered
skips; S1/S2A were not executed after the failure. Evidence remains in
[t02-qa-r1-s2b-readiness.md](t02-qa-r1-s2b-readiness.md). Initial coordinator
readiness was withdrawn because its checks had missed the null-field assertion.

Coordinator rejected absent-keys equivalence, authorized only final-zero
serialization/validation repair within existing R1, reviewed it and sent a fresh
relay. The strict original assertions passed without weakening. No extra slice,
scenario, policy, dependency or shared-contract change was introduced.

## Stop state

No blockers for this bounded R1 acceptance. Both agent target windows are closed;
Developer metadata maintenance is complete and agents stopped at the slice boundary.
R2-R11 remain unassigned/paused, with 38 registry scenarios still awaiting first
acceptance (17 SDK + 21 PTY). R2 is the next potential slice, not authorization.

Production T01 entries remain inert. Root/companion/experiment typecheck and
scoped experimental build/lint/format passed; no fresh full foundation/combined
regression was claimed. Genuine PTY approval, remaining routes/conflicts/modes,
final-input integrity and lifecycle remain future gates. Arbitrary ambient CLI
inventory risk, IPC race limits and non-OS-sandbox boundary remain; no product
compatibility/release/backend/auth/storage/durable recovery guarantee is implied.
