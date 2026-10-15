# T02 QA test-source readiness (Stage 2, pre-execution)

**Role:** QA · **State:** test sources written; NO experiment executed, no verdict
claimed. Execution of `experiments/t02/` artifacts awaits the coordinator
artifact-ready relay. No polling, no builds/installs by QA.
**Spec:** `docs/decisions/t02-approved-experiment-spec.md` (sole derivation
source plus public specs). No `experiments/` source, compiled contents, maps,
diffs, or Developer internals were read — `experiments/` does not exist yet in
this checkout. No package/config edits, no new dependencies.

## Owned paths written

- `test/pi-feasibility/` — 8 `.test.mjs` files + `helpers/` (2 `.mjs`):
  `experiment-contract`, `gate-routes-pty` (8 PTY approve/reject), `readonly-sdk`
  (4 readonly + no-companion + generic-readonly), `registration-conflicts`
  (3 conflict + 4 resource-profile + hidden-tool), `modes` (4),
  `gate-failure` (handler-failure + dismiss/cancel/timeout + distinctness),
  `integrity-sidecar` (mutator-boundary + 3 sidecar faults + 2 calibrations),
  `lifecycle-binding` (2 binding negatives + 3 invalidations).
- `test/fixtures/t02/synthetic-seed.mjs` — labeled synthetic seed (spec §5),
  independent canonical-digest implementation, 41-scenario registry mirror,
  refusal vocabulary, seven tool names.
- Helpers enforce: finite-registry scenarios only; sanitized disposable env
  (provider keys/tokens/auth/NODE_OPTIONS never inherited; disposable
  HOME/XDG/TMPDIR); `--out`/stdout cross-check; redacted failure messages (no
  private paths in evidence); per-test 120s timeouts within spec budgets;
  disposable-root cleanup on every outcome.

## Layer discipline (per plan refinement)

`tui-interactive` (genuine PTY only; stimulus `genuine-pty`, no injected UI),
`sdk-pipeline` (mode print, no injected UI), `injected-ui`/`logic-control`
(controls only, never evidence). Full inert-content UI/labels and durable
replay/receipts are asserted as demos/future coverage only, not T02 passes.
Seven-tool listing while creation is unavailable is not capability;
`write_approval_required` is a compatible pass. Bypass battery covers supported
Pi paths only; same-user direct-stdio bypass is outside the trust boundary.

## Calibration plan

`calibration-unguarded` must show a fixture-origin counter > 0 (else all
zero-effect evidence void); `calibration-mutation` must show received ≠
approved digests (else all integrity evidence void). Zero-effect proof requires
a fixture-origin zero-counter FINAL ledger record, never log absence.
Gate-before-registration ordering, cleanup records, call-ID/parent linkage,
and seed-digest equality (approve paths) are asserted per report.

## Verification done now (no experiment execution)

- `node --check` passes on all 13 new/revised files.
- `validators-selftest.test.mjs`: 12/12 pass — validators reject
  synthetic:false, unpinned runtime, non-monotonic seq, weak cleanup,
  invented ledgers for absent fixtures, missing finals, effect-before-allow
  order, and effects/ledger total disagreement.
- `experiment-contract.test.mjs`: 8/11 pass (fixed-SHA calibration
  `71a6d7ac…6cd456`, digest defaults/order/rejection, 41-row registry,
  seven tools, refusal vocabulary). The 3 metadata describes fail ONLY on the
  absent Developer-owned `experiments/t02/metadata.json`, with the
  artifact-ready message — honest pending state, not a bug.
- All scenario tests remain unexecuted (artifacts absent; relay pending).

## Conformance to spec §8 + source review (rev 3: final helper gaps)

- Runtime pins compare exactly (optional single leading `v`); near-misses
  like 24.21.01/1.32.10 are rejected in reports and metadata.
- Absent (`not-spawned`) outcomes require an explicit `spawned:false`
  registration observation plus an `isError:true` result joined to the exact
  attempted creation call; no-result and empty-registration cases fail.
  Success/failure are scoped to matching call IDs everywhere in the outcome
  check, so unrelated read/outer results neither satisfy nor invalidate it.
- `readSuccesses` accepts only the configured `synth_gt` namespace
  (unqualified fixture names or `mcp__synth_gt__<read>`); foreign-server
  suffixes are rejected.
- Positive effect proof requires receiver allow with `tupleMatch:true` and
  `generationMatch:true`.
- Gate/denial/prompt joins enforce per-call uniqueness (exactly one gate per
  actual creation call; every call carries its own prompt/denial), so
  duplicated IDs cannot fool counts.
- `validators-selftest.test.mjs` (19/19 PASS, logic-control only) adds
  negative controls for near-versions, no-result/empty-absence, unrelated
  results, wrong-namespace reads, false binding matches, and duplicated
  gate IDs; the strengthened validator caught the stale canned fixture
  during revision (fixed, still passing).

## Conformance to spec §8 + source review (rev 2)

- Absent/preflight-refused cases assert spawn absence + actual
  unavailable-call via `expectNoEffectOutcome` branching; connected cases
  require the independent fixture final. No invented ledgers.
- Lifecycle asserts approval/pending-dispatch seq < invalidation seq < at
  least one actual post-invalidation denial/withdrawal; no
  afterInvalidation-flag loops.
- mode-rpc-has-ui asserts actual mode rpc AND hasUI true with no injection;
  no-ui binds tui-without-UI as sdk-pipeline.
- Gate checks join the qualified creation tool name
  (`mcp__synth_gt__create_routine`) and call/parent IDs; codemode joins
  parents like orchestrator nesting; approval/receiver-allow precede effect
  seq; intermediate positives before allow are rejected.
- Cleanup asserts booleans + zero counts; runtime pins asserted per report;
  effects/ledger totals and operations must agree.
- Helper env sets official Pi isolation (`PI_CODING_AGENT_DIR`,
  `PI_CODING_AGENT_SESSION_DIR`, `PI_OFFLINE`, `PI_TELEMETRY`,
  `PI_SKIP_VERSION_CHECK`) on disposable roots; no provider keys/tokens.
- Dismiss/cancel/timeout share stimulus genuine-pty, distinguished by deny
  reason; fault cases require real receiver_check denials; mutation asserts
  valid 64-hex digests, known-seed approval, genuine difference.
- Read-success joins actual read-tool results; generic-readonly requires an
  actual tool_list with exactly the seven names; conflicts/profiles assert
  recorded reasons + refusals, not mere policy absence.

## Authority and pending items

- The approved COMMON SPEC (§§2/4/7/8) is the sole authority for scripts,
  trace fields, metadata shape, and scenario/layer contracts. Field names
  are spec-confirmed; QA asserts them as written. Any ambiguity or change
  must be resolved as a shared spec decision through the coordinator BEFORE
  assertions are altered — there is no driver-authoritative internal
  contract, and QA will not conform tests to implementation.
- The 12/12 validator self-tests are logic-control evidence only: they prove
  the QA validators reject malformed controls, nothing about the pipeline.
- The 3 metadata failures are expected absence-of-artifact state while the
  Developer artifact is pending — not passes, not T02 acceptance.
- Remaining pending items (no QA action): `test:t02`-family scripts
  (Developer-owned, pending artifact/config readiness) and the
  artifact-ready relay itself. No package edits, no guessed fields, no
  polling; all scenario execution stays blocked until relay.
