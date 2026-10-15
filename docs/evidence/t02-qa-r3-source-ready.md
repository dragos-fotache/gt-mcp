# T02 QA — R3 source readiness: SDK prebind refusal + hidden reachability (no execution; prep only)

**Role:** QA · **Slice:** R3 ten SDK targets · **State:** test-source ready.
**Authority:** `docs/decisions/t02-approved-experiment-spec.md` §§1–14, shared contracts; nothing
derived from implementation, work orders, generated sources, or Developer internals.
Execution CLOSED until the coordinator's exact frozen artifact-ready relay. Six accepted SDK
profiles (S1/S2A/direct/deferred/codemode/nested readonly) preserved untouched in
`readonly-sdk.test.mjs`. R4+ held. No matrix/future target tests.

## R3 scope (exactly ten SDK scenarios, spec §14)

Nine prebind refusals (refuse target before bind, dispose, closed refusal-probe
unknown-tool attempt, source:none/not-spawned): static-shadow,
normalized-collision, normalized-collision-reversed, replacement-mcp,
replacement-codemode, missing-mcp, unsupported-inventory, binding-missing,
binding-ambiguous. One connected exception: hidden-tool (supported print/no-UI
bound target, six reads callable, creation hidden/unreachable, fixture final zero).

## What was prepared (QA-owned paths only)

- `test/pi-feasibility/helpers/report-checks.mjs` (additive; §§10–13 helpers untouched):
  `R3_PREBIND_REASONS`/`R3_SCENARIOS`, `expectR3PrebindRefusal` (target
  resource_inventory actual-sdk-loader + inlineProfiles/replaceable + empty
  loaderErrors/Warnings; static_settings launcher-owned-loadConfig with exact
  static names/namespaces + readonly direct fixture:t02 entries + no
  executable/argv/env/socket/path; binding_check present/candidateCount/valid/reason
  with missing 0/false and ambiguous 2/false neither selected; prebind_check
  supported:false + specific reason + targetBound:false + zero
  loadConfig/transport + registrations:[] before disposal; target_disposed
  shutdownObserved:true/targetBound:false; refusal-probe session-context +
  preflight print/no-UI + same specific reason + targetBound:false +
  actual-sdk-loader; same-record policy:none refusal registration; exactly one
  native pi creation call/result isError:true/code:null/reason:unknown-tool with
  explicit null parents; zero gate/receiver/sidecar/approval/declaration/ledger/
  tool_list/guarded records; effects source:none/not-spawned/total:0),
  `expectR3HiddenTool` (prebind profile-ok + preflight hidden-readonly-profile,
  companion gate before discovery, one first-request + one connected tool_surface
  each with six qualified reads active/callable + hiddenTools:[creation] +
  six unqualified fixtureTools, fixture tool_list seven advertised, same-record
  readonly registration after discovery before calls, read success then creation
  unknown-tool with null parents, no creation gate/receiver/sidecar, explicit-null
  final zero + shutdown/last-cleanup).
- `test/pi-feasibility/registration-conflicts.test.mjs`: rewritten to §14 (3 conflict +
  4 replacement/missing/unsupported prebind refusals + hidden-tool connected case).
- `test/pi-feasibility/lifecycle-binding.test.mjs`: binding-missing/ambiguous rewritten
  to §14 prebind refusal; PTY invalidation block unchanged (held, not R3).
- `test/pi-feasibility/validators-selftest.test.mjs`: 7 new artifact-free R3 controls
  (prebind accept + wrong-reason/gate-substitute/invented-ledger/fabricated-code/
  missing-disposal/renamed-statics; hidden accept + visible-callable/gated-creation).

## Safe controls executed (artifact-free only)

- `prettier --write` on the four touched files → recheck clean.
- `vitest run test/pi-feasibility/validators-selftest.test.mjs` → **55/55 passed**
  (48 prior + 7 R3 controls).
- `vitest list` (collect only, no driver/artifact execution):
  registration-conflicts 8/8, lifecycle-binding 2 R3 + 3 held PTY invalidation,
  readonly-sdk 6/6 regressions intact (untouched file).

No driver/fixture/PTY/artifact executed. No config/dependency/install/metadata changes.
No production/experiment/private-plan/work-order/pickup reads.

## Exact selections requested for the relay (serial, canonical toolchain)

1. `node node_modules/vitest/vitest.mjs run test/pi-feasibility/validators-selftest.test.mjs`
2. `node node_modules/vitest/vitest.mjs run test/pi-feasibility/registration-conflicts.test.mjs`
3. `node node_modules/vitest/vitest.mjs run test/pi-feasibility/lifecycle-binding.test.mjs -t "binding-missing"`
4. Same file `-t "binding-ambiguous"`
5. `node node_modules/vitest/vitest.mjs run test/pi-feasibility/readonly-sdk.test.mjs` (six regressions)

## Amendment: public §14 probe-registration clarification (bounded, no execution)

Coordinator relay confirmed all four open questions are now explicit public §14 text:
literal hyphenated `session-context` with top-level role/fields (already asserted),
server namespace `mcp__synth_gt` vs tool prefix `mcp__synth_gt__` (already asserted),
separately labeled refusal-probe inventory (already asserted), and the one gap found:
the same-record probe none registration carries explicit `runtimeRole:refusal-probe`,
`transportAttempts:0`, and `loadConfigCalls` as a positive integer from the actual
native empty-config callback (no separate attempt record required for zero; any actual
attempt is a harness failure). `expectR3RefusalProbe` now enforces all three fields
on every matching refusal registration; the canned R3 base carries
`runtimeRole:refusal-probe/transportAttempts:0/loadConfigCalls:1` and one new
artifact-free negative rejects a missing role, a nonzero attempt count, and a
zero callback count. Controls re-run: validators-selftest **56/56 passed**
(55 prior + 1 new); prettier clean; scenario collection unchanged (8 + 2 R3,
6 regressions intact). No ambiguities remain; relay selections unchanged.

Prior open questions, now resolved by explicit public §14 text (kept for record):

1. `session-context` type spelling: asserting the literal hyphenated `session-context`
   record with `runtimeRole:refusal-probe`. If the driver emits `session_context` or
   nests context under `session`, the probe assertions fail explicitly — confirm literal.
2. Static namespace: §14 table states `mcp__synth_gt` while §5 normalized form carries a
   trailing `__`. Asserting the §14 table literal for R3 static entries — confirm.
3. Transport accounting: zero target/probe transport corroborated via prebind fields +
   refusal registration + effects/closure review. If the driver exposes separate
   `transport_attempts` records, provide the exact record/field mapping.
4. Probe inventory: asserting a separately labeled `refusal-probe` resource_inventory
   distinct from the target inventory. If the probe reuses the target inventory record,
   confirm whether relabeling or a second record is authoritative.
