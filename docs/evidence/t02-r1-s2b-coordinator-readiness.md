# T02 R1/S2B coordinator artifact readiness

**Audience:** coordinator/Developer only; not QA input. QA receives the public
specification and exact readiness relay, never this implementation review.
**Disposition:** FIRST readiness WITHDRAWN after independent R1 acceptance
failed. QA correctly rejected the fixture final zero observation's omitted
operationId/digest versus the explicit-null requirement in §8. The initial
coordinator checks missed that serialization assertion; healthy gate/read/zero
observations do not cure it. A bounded R1 repair is delegated, with QA execution
held until a new reviewed-artifact relay. R2-R11 remain held.

The following records the historical first-artifact review, not a current pass.

## Scope and source review

Developer changed only the bounded experimental package:

- New `experiments/t02/driver/sdk-gate-worker.mjs` and
  `experiments/t02/driver/event-journal.d.mts`.
- Narrow `driver/run.mjs`, `driver/event-journal.mjs`,
  `companion/index.ts` and `metadata.json` under `experiments/t02/`.
- Generated unbundled `experiments/t02/dist/index.js` matches the reviewed build.

No fixture/schema/scenario/config/manifest/lock or T01 product-entry changes were
assigned. S1/S2A worker paths, fixture and provider remain the accepted baseline
components. No QA internals were supplied to Developer.

Reviewed actual implementation:

1. Bootstrap dispatch authorizes only S1/S2A/R1 SDK combinations, imports no Pi,
   creates private disposable roots and passes a complete explicit child environment.
   Only R1 receives the strict private synthetic binding before startup. Neither
   its values nor private paths appear in the healthy reports.
2. Worker imports the original compiled companion, not a relocated copy; the
   named inline companion factory precedes codemode/search/native MCP/observer.
   Actual loader identities, handler/tool/command surfaces and errors are checked.
   The orchestrator stays in registration inventory but public excludeTools keeps
   it out of model tools. Ambient discovery and live-provider fallback stay off.
3. The same native faux provider handle/runtime is used for session creation.
   Native MCP loadConfig is empty; the companion registration owns the sole
   fixture spawn. The readonly fixture receives a trusted shared-journal flag,
   no sidecar or binding inputs. No manual pre-spawn or injected approval UI.
4. The existing single-append journal protects envelope keys. Default S2A reader
   provenance is unchanged; only the explicit direct-readonly profile admits
   companion=>source:companion. Global seq comes from physical append order,
   not per-actor log concatenation/sorting. Parent checks complete bounded records,
   producer sequences, allowed sources and aggregate size after owned closure.
5. The companion records gate installation immediately after synchronous tool_call
   registration, before session start/registration. While active, shared journal
   routes all companion observations; legacy separate tracing remains available
   outside that channel. Registration declaration is pending, not connected proof.
6. Native execution-start args supply only the safe creation operationId; native
   execution-end supplies result/isError. Actual gate invocation supplies mode,
   native ID, attempted digest and deny reason. No receiver code/check is invented
   for creation stopped by the gate. The read genuinely succeeds.
7. Awaited AgentSessionRuntime.dispose emits genuine shutdown and closes native
   MCP. Companion/worker shared descriptors close on the healthy path; process
   exit owns descriptor reclamation on failed startup. Parent awaits stdio close
   and checks only its owned process group before root removal and final cleanup.
   Failure/unknown closure retains roots and reports incomplete observation.

The known broader companion approval/integrity/lifecycle scaffold is not accepted
by this review. Concurrent journal aggregate prechecks are not an atomic total
budget guarantee; parent hard-cap validation remains mandatory. Arbitrary ambient
CLI inventory remains R1 (architecture risk), distinct from this slice's R1 label.

## Selected checks and frozen artifact

Coordinator repeated on Node24.21.0/npm11.19.0:

```sh
npm run typecheck
npm run t02:build
npm run lint:t02
npm run format:check:t02
```

All passed. Rebuild retained the same compiled SHA256:
`07296531dc39bd2370685cc9010d056533ec211127e0d5ca69f7fc05100215ab`.
No install, broad check, whole target suite or unrelated matrix run was made.

Reviewed source SHA256:

| Path under experiments/t02 | SHA256 |
| --- | --- |
| driver/sdk-gate-worker.mjs | 96fd4ac1e6e65f9043fac343d67ae5e7b0df9b055100a65d0cb201015ccaab87 |
| driver/event-journal.mjs | 50af2fbc8cb5aec973b6ebb9b8c89b95d33e6ac73e33187d3f9406a6bb68a4cf |
| driver/event-journal.d.mts | a8809e6a0d2b0dc442d480ae0c1bdf3ced819cfe5040b50213ebd2f581022b42 |
| driver/run.mjs | c460744a58531aa2b935d038f77d87e889abca8a21fff72873ae242e2dda011e |
| companion/index.ts | 7c24831851d505079fa085cce8ecead1c367dd2a9f72420adb481b7aa8adab91 |
| metadata.json | 4e5fd52fbcc64eed8419d9247c5f43e5ede1964238b121d8fb08d8cb3c2ac666 |

Metadata accurately separates accepted/launchable S1/S2A from candidate R1; registry
presence is not readiness for remaining profiles. It does not claim S2B acceptance.

## Actual coordinator reproduction

Exact public targets, run serially in sanitized disposable roots using the
selected executable/toolchain:

```sh
node experiments/t02/driver/run.mjs --scenario direct-readonly --harness sdk --out <disposable-report.json>
node experiments/t02/driver/run.mjs --scenario no-companion --harness sdk --out <disposable-report.json>
node experiments/t02/driver/run.mjs --scenario generic-readonly --harness sdk --out <disposable-report.json>
```

Reports were parsed and compared to their --out files; raw outputs were disposable.
All exit0/completed:true, zero effects, no evidenceFailures, no timeout/truncation,
and observed final cleanup children/listeners zero with roots removed. The reports
contain no private tuple values or absolute repository/disposable paths.

| Target | Coordinator scenario time | Records | Independent effect source |
| --- | --- | --- | --- |
| direct-readonly/sdk | 921ms | 28 | fixture-final total0, operations[] |
| no-companion/sdk | 704ms | 16 | none/not-spawned total0, operations[] |
| generic-readonly/sdk | 897ms | 22 | fixture-final total0, operations[] |

R1 actual chronology: binding presence1; companion gate_installed2; real loader
inventory3; companion start4; readonly registration5/declaration6; empty native
config7; observed start/context/preflight8-10; actual fixture startup11,
negotiated protocol12 (2025-11-25), listing13; first native-request seven-tool
inventory14; connected readonly confirmation15; named read call/result16/17;
creation call18, actual companion denial19, native error result20; prompt settled
observation21; genuine companion shutdown22; fixture final zero23; native runtime
shutdown24; provider/runtime25/26; worker closure27; final parent cleanup28.

The real creation ID `tool:1791726104097:sipp1uzqrf` joins call18/gate19/result20.
Direct parents are null; gate mode:print/hasUI:false, reason:mode-not-tui:print,
attemptedDigest is public seed
`71a6d7acdeb769821f1b6231f206853c8e9423fec5989a68312b06fa8e6cd456`,
approvedDigest:null. Result isError:true/code:null, not a fabricated generic
receiver error. Seven tools are discovered, get_exercise succeeds. No approval
prompt, sidecar verdict, receiver creation check, guarded registration or dispatch.

## Separate journal logic controls

Seven coordinator controls passed in disposable local files: default S2A rejects
companion provenance; explicit R1 profile accepts real companion provenance;
protected-field override remains ineffective; write-after-close fails; companion
cannot relabel as fixture; unknown producer fails; producer sequence gap and
incomplete final record fail. The accepted-profile/protected-field assertions form
one control; counts total seven. These calibrate journal validation only, not
SDK gate, approval, integrity or PTY behavior.

## Independent window

QA readiness reported specification-derived R1 assertions and 29/29 validator
controls, without target execution. Coordinator requested additional precise causal/
provenance negatives; public experiment specification §12 now clarifies the existing
observable inventory/join/final-cleanup interface. QA may finalize those independent
assertions from the public spec without implementation reads.

The readiness relay authorizes only the exact R1 case and separately selected
accepted S1/S2A regressions, plus QA validator controls. Source/build/install remain
frozen throughout. Filtered cases are unexecuted, not passes. Any failed assertion
keeps R1 open and returns a specification-level blocker, not test-source diagnostics
to Developer. Coordinator repeats accepted selections before final disposition.
Stop after recording R1; no R2, genuine PTY approval, live backend or product writes.

## First independent window failure and repair decision

QA validator controls: 34/34 passed (logic-control only). Exact R1 selection:
1 failed, 5 filtered skips (not passes); failure was missing explicit null
operationId/digest on the fixture final zero ledger. All earlier gate/read/causal
checks in that case passed before this assertion. QA correctly stopped; S1/S2A
regressions were not executed in that window. No assertion was weakened.

Coordinator source inspection confirmed finalize emitted operations/counter/final
but omitted those no-admission fields. Decision: fix artifact under existing §8,
not accept absence as null. §12 makes that existing requirement explicit.
The revised R1 work order permits only zero-final serialization in the fixture
(public journal and independent owned-file record) plus connected-zero validation
in the already-owned driver. Preserve nonempty behavior and all gate/counter/
sidecar/schema logic. Count remains 13 total; no new scenario, subsystem or slice.
Developer must repeat the four checks and R1/S1/S2A diagnostics, then freeze for
new coordinator review and an exact independent relay. R1 stays unaccepted.
