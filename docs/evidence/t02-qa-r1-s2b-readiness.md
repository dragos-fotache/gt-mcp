# T02 QA — R1 S2B direct-readonly/sdk test readiness (no results claimed)

**Role:** QA · **Slice:** R1 / S2B direct-readonly/sdk · **State:** test-source ready; no target executed.
**Authority:** `docs/decisions/t02-approved-experiment-spec.md` §§5–8/11 plus the coordinator R1
acceptance clarification relay (public spec levels only; nothing derived from implementation).
R2–R11 held. No readiness polling performed; awaiting the coordinator's exact artifact-ready relay
before any target or broad-suite execution.

## What was refined (QA-owned paths only)

- `test/pi-feasibility/helpers/report-checks.mjs`: added `expectDirectReadonlyS2B(report)` —
  strict R1 S2B predicate: envelope `direct-readonly/sdk/sdk-pipeline`; print + `hasUI:false` +
  `uiInjected:false` preflight; exactly one companion-origin `gate_installed` before every
  registration; zero `guarded` policy with a connected `readonly` registration on a spawned
  fixture; seven-tool `tool_list` with `source:fixture`; named `get_exercise` success joining
  actual call/result IDs; exactly one `CREATION_TOOL` call / companion `deny` gate (`mode:print`,
  public operationId/digest, null direct parents) / `isError:true` + `code:null` error join;
  zero `receiver_check` / `sidecar_verdict` / `approval_prompt`; structured
  `write_approval_required` on the joined error explicitly rejected (S2A shape must not pass);
  fixture-origin final zero ledger; real final cleanup.
- `test/pi-feasibility/readonly-sdk.test.mjs`: dedicated R1 S2B case for `direct-readonly/sdk`
  asserting the predicate above. Deferred/codemode/nested readonly keep existing checks
  untouched (later slices held). Absent vs generic-readonly distinction preserved.
- `test/pi-feasibility/validators-selftest.test.mjs`: six new artifact-free negative controls
  proving the predicate accepts the companion S2B shape and rejects the S2A receiver shape,
  the absent unknown-tool substitute, invented receiver/approval/sidecar records, guarded
  capability / non-print gate mode, duplicated creation calls, and a gateless public digest.

No metadata/config/lockfile edits. No experiment, coordinator, or Developer paths read or written.

## Safe controls executed (artifact-free only)

- `npx prettier --check` on the three touched files → clean after `--write` (QA-owned only).
- `npx vitest run test/pi-feasibility/validators-selftest.test.mjs` → **29/29 passed**
  (23 pre-existing + 6 new R1 S2B controls). This file constructs all reports inline and
  launches no driver/fixture/PTY artifact.

No target scenario, driver, fixture, PTY harness, or broad suite was executed.

## Environment note (specification-level blocker/question)

- Controls above ran under the disposable Node `v24.21.0` / npm `11.19.0` toolchain,
  matching the pinned pins. `T01_NODE_HOME` is unset in this QA session, so the toolchain
  was taken from the provisioned disposable location rather than the variable — request
  coordinator confirmation of the canonical per-session toolchain export.

## R1 execution outcome (artifact-ready relay, frozen artifact SHA 07296531…00215ab)

Exact serial selections per relay (canonical toolchain, `node node_modules/vitest/vitest.mjs`):

1. Controls: `run test/pi-feasibility/validators-selftest.test.mjs` → **34/34 passed**
   (artifact-free logic-control only; includes 11 R1 §12 negative controls).
2. R1 target: `run test/pi-feasibility/readonly-sdk.test.mjs -t "direct-readonly:
   synchronous companion gate denies in print/no-UI, reads succeed, fixture final zero"`
   → **1 failed | 5 skipped** (skips are the filtered-out cases, not passes).

Failure (spec-level, no assertion weakened):
`final carries no admitted operation: expected undefined to be null`
at `expectDirectReadonlyS2B` final-ledger check. Every preceding §12 assertion in
the predicate passed on the live report: envelope `direct-readonly/sdk/sdk-pipeline`;
print + `hasUI:false`/`uiInjected:false` preflight; exactly one companion-origin
gate before declaration/registration/startup/discovery/creation; one same-record
connected readonly registration; launcher seven-tool first-request inventory paired
with fixture-origin discovery and qualified `get_exercise` success; exactly one
creation call / companion `deny` gate (`mode:print`, `hasUI:false`,
`reason:mode-not-tui:print`, `attemptedDigest` = public seed SHA,
`approvedDigest:null`) / `source:pi` `code:null` error join with
`call.seq < gate.seq < result.seq`; zero receiver/sidecar/prompt/guarded;
all ledgers counter zero with exactly one fixture-origin final zero.

Mismatch: the connected fixture's own final zero ledger **omits** the
`operationId`/`digest` keys (`undefined`) instead of carrying explicit `null`.
Public contract (§8 effect_ledger: "operationId and digest (null if no admitted
call)"; §12 "final zero/empty-operation ledger") requires explicit null.
Whether absent keys satisfy "empty-operation" is a coordinator contract decision —
QA did not weaken the assertion.

Per relay stop-on-failure, selections 3–4 (S1 `no-companion`, S2A `generic-readonly`
regressions) were **not executed**. No other targets run. R2–R11 held.

## Next (before this edit: awaiting relay; now: awaiting coordinator decision)

Awaiting coordinator ruling: accept absent-keys as empty-operation (with contract
wording), request a Developer artifact fix under a new relay, or redirect. QA will
not weaken assertions or re-execute held targets without direction.
