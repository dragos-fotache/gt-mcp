# T15-S2 — Official MCP creation dispatch and safe delivery

**Status:** accepted/closed · **Owner:** primary Codex agent · **Authorized:** user
requested “start work at t15-s2” on 2026-10-15. S1/S2 are accepted; S3 ready/unassigned.

[Acceptance](../evidence/t15-s2-review.md):68/68 in15 files (20 owning +48
regressions), four production/scoped checks,545 stable hashes, actual isolated
provider/ext4/HTTPS/SDK stdio and cleanup PASS. [Handoff](../handoffs/t15-s2.md).
All S2 grants closed; parent T15 incomplete. No successor started.

## Contract

Deliver S2 of the [settled plan](../decisions/t15-plan-and-slices.md), under its
normative shared MCP draft0.2/backend v1 references and the standing
[proportional testing policy](../decisions/proportional-testing-policy.md).
Add `createToolServer(ToolServerOptions)` and
`openConfiguredToolServer(ConfiguredReadToolServerOptions)`, returning the existing
connect/close capability. Capture `ToolRuntime.createRoutine` with its receiver;
retain the read-only factories' unavailable creation guarantee. Wire the compiled
entry to the guarded creation factory, using one startup config/budget snapshot.
Keep exactly seven schemas/hints; the new factory's creation description explains
config-only operator trust while the read-only catalogue retains its old text.

Validate creation envelopes against T03 plus the shared retry table and complete
admitted history. Strip native presentation text, retaining the fixed disabled
explanation. Preserve authorized operation/root/confirmed-step/uncertainty fields
through complete-result budget/serialization fallbacks and late interruption;
never extract history from malformed results or caller input. Binding authorization
remains the runtime's responsibility; no additional recovery read or outer retry.
Remove only the obsolete CLI unavailable sentence and adapt obsolete compiled-entry
expectations. Document graceful stop/await, update config/lifecycle, relaunch.

## Scope, execution and stopping conditions

Edit `src/protocol/`, minimal runtime integration only if demonstrated necessary,
the obsolete disclosure sentence in `src/cli/main.ts`, `test/create-protocol/`,
the named export/compiled-entry/disclosure tests in the plan (including the
compiled-entry catalogue/error expectations in `test/stdio-server/sdk-startup.test.mjs`), launch/login docs
and task/status/evidence/handoff documents. Preserve pre-existing changes and
accepted/historical evidence. No contracts, dependencies/manifests/lockfiles,
compiler settings, .pi, staging/commits, real backend or successor work.

Use the existing disposable `/tmp/gt-t08-s3-tools/node-v24.21.0-linux-x64`
as T01_NODE_HOME; verified Node24.21.0/npm11.19.0. Initial unset-selector probe
reported system26.11.1/12.2.0; no build/test/install used those versions.
Permit production type/lint/format/build and scoped test syntax/lint/format.
Execute only synthetic in-memory SDK fixtures and actual private-provider/ext4/
private-CA HTTPS/stdio fixtures through the inspected existing T10 isolated runner,
with fresh scopes, qualified libsecret store/read/clear and owned cleanup.
Do not alter HOME in the agent shell or use ambient services. No install needed;
clean locked parent replay belongs to S3. Keep build/input hashes stable during tests.

Milestones: contract; adapter/delivery and early static checks; focused SDK/stdio
checks; final complete active S1/S2 and relevant regressions; review/handoff.
Target60–90 minutes, checkpoint90, stop120 with honest handoff. Escalate contract
conflicts, missing public decisions, unsafe ownership/privacy/durability, missing
isolated fixture, or scope expansion. Time never weakens gates.

## Verification and deliverables

Use the official SDK client/in-memory transport for exact catalogue schemas/hints,
success, uncertainty, terminal conflict/rejection, interrupted history, validation
vs protocol failures, safe malformed envelopes, and full result budget retaining
history. Reuse small T08 fixtures, no generalized interception. Real configured
SDK boundary proves false-policy metadata/extra args cannot enable writes; one
compiled-process enabled saved receipt and disabled zero-mutation call proves
entry wiring. SDK text/structured/error/schema assertions use independent oracles.

Final selection: both S1 files, all new S2 owning files, all existing T08
read-protocol/stdio files, plus changed T12 disclosure/flow files (exact paths
recorded before final execution). Read-runtime/engine matrices already accepted
in S1 are not duplicated without a demonstrated integration defect.
Deliver source/types/tests, operator notes, primary-agent specification/source/test
review, safe exact commands/results/versions, stable artifact inventory and handoff.
S2 does not close T15: S3 process recovery/lifecycle/clean reproduction, external
backend/host/browser/Android and independent release gates remain unverified.
