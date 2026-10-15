# T02 S2A coordinator artifact readiness

**Audience:** coordinator and Developer; implementation review, not QA input.
**Scope:** generic-readonly/sdk only, plus accepted S1 regression. Ready for one
independent QA subset relay; not S2A acceptance or approval/gate/TUI feasibility.

## Independent review and integration

Native discovery, real structured refusal, canonical digest and independent
fixture final ledger were reviewed against the public specification. Coordinator
isolated initial runs passed: S2A 928 ms, S1 700 ms. Source review identified
remaining callback chronology, shared-writer protections and parent evidence/read
validation edges. Developer paused; coordinator temporarily owned four files:

- driver/event-journal.mjs: record/aggregate prechecks, complete newline/record
  validation, fixed producer/source/layer provenance and protected global seq.
- fixture-server/server.mjs: reuse that protected checked append helper rather
  than a duplicate writer, plus idempotent stdin end/close finalization. No tool
  schemas/validation/canonicalization/sidecar/counter behavior changed.
- driver/sdk-readonly-worker.mjs: require exact full first-request tool inventory
  and emit inventory/confirmed registration in that real callback before calls;
  require the two native execution endpoints. No late reconstructed snapshot.
- driver/run.mjs: closure-gated shared journal and bounded strict ledger reads;
  explicit final/startup/context/refusal/discovery shapes and call/result joins.
  Accepted S1 semantics preserved; no dependency/configuration changes.

## Independent checks and runtime results

Node24.21.0/npm11.19.0: typecheck (all three configs), t02:build, lint:t02 and
format:check:t02 independently pass after integration corrections.

The supervisor supplied a complete closed environment and disposable
HOME/TMPDIR/Pi-agent/session/cwd. Both public stdout and --out reports agreed.
No personal credentials/settings, live provider/backend or product effects.

Final S2A run: exit0, 911 ms, 22 chronological records. Exactly one fixture
startup; real initialize negotiation 2025-11-25 and fixture-generated tools/list
with seven names. Actual Pi first-request inventory and readonly registration
preceded the real calls. get_exercise succeeded; create_routine returned actual
isError:true/write_approval_required/no-sidecar joined to its native call ID.
Fixture receiver_check denied the public seed digest
71a6d7acdeb769821f1b6231f206853c8e9423fec5989a68312b06fa8e6cd456. Exactly one
independently parsed fixture final ledger: total0/operations[]. No approval/gate
records or sidecar/binding inputs. Actual print/noUI context and no injection.
Effects source:fixture/observation:fixture-final/total0; native shutdown completed;
last parent cleanup confirmed stdio/group/listener closure, root removal and
zero remaining counts. Supervisor independently found no experimental roots.

S1 regression: exit0, 711 ms, 16 records, preserved source:none/not-spawned/zero
unavailable-call branch and final observed cleanup.

Separate coordinator journal controls: protected-key overrides rejected; six
negative controls rejected incomplete newline, producer-sequence gap, spoofed
source, unknown producer, wrong layer and oversized record. These are pure
logic controls, not approval or runtime feasibility evidence. Concurrent aggregate
prechecks are not atomic; parent hard-cap rejection remains mandatory. Timeout/
large-output/failure-path calibration is not claimed complete by this slice.

## Relay/freeze

Authorize QA execution only of existing generic-readonly/sdk case after this
readiness record. Developer and coordinator source/build/install mutations freeze
throughout that target window. QA derives from the public specification/metadata,
never this source review. All other scenarios/subsystems stay held. S2A acceptance
requires the independent QA result and coordinator review; T02 remains unverified
for companion gates, nested paths, integrity, lifecycle and genuine PTY.
