# T12-S4 — Operator flow and integrated parent acceptance

**Status:** accepted/closed, 2026-10-15 · **Owner:** primary Codex agent.
**Authorization:** user: “start work at T12-S4”, 2026-10-15.
Start 16:06 UTC; checkpoint 17:36 UTC; stop 18:06 UTC with honest partial handoff
if acceptance remains incomplete.

## Task contract

Complete the S4 outcome in the [parent plan](../decisions/t12-plan-and-slices.md),
after [accepted S3](../handoffs/t12-s3.md). Authority: shared MCP draft0.2
[authentication](../../shared-docs/docs/mcp-contract/authentication.md),
[journal lifecycle](../../shared-docs/docs/mcp-contract/routine-creation.md#journal-lifecycle-selected),
backend v1 [account lifecycle](../../shared-docs/docs/backend-contract/account-lifecycle.md),
foundation spec/ADR and accepted S1–S3 format/API/work orders. Preserve shared
contracts, existing evidence and unrelated working-tree changes.

Settled public behavior: setup and fresh login disclose fitness-data exposure and
host transcripts, indefinite encrypted unresolved content, identifying compact
receipts for profile lifetime, three non-atomic creation steps/draft leftovers,
local erasure/replay limits and strict config-only writesEnabled default false.
Explicit true permits connected local clients’ valid authenticated explicit
creation without per-routine confirmation when supported. Creation remains
unavailable in this build until separately assigned T15. No CLI enable flag,
permission extension, new tools, automatic recovery, backend deletion or account
switching. Disclosures precede effects and output failure prevents work.
Preserve strict grammar, stderr-only fixed messages, exits and owned settlement.

Edit scope: src/cli/main.ts disclosure copy; docs/login.md operator sequencing and
privacy guidance; focused new test/unit/t12 and test/fault/t12 S4 checks reusing
existing fixtures (one optional synthetic account binding in S1 helper to prove
different-account preservation); work order/evidence/handoff/task/status docs. Production fixes
outside this narrow scope require a concrete integrated defect and recorded scope
update. No dependencies/manifests/compiler/.pi edits, staging/commits, release,
live Google/backend/DB/Android/host actions or automatic successor.

## Verification and execution grants

Resolve the provisioned T01_NODE_HOME for every command: Node24.21.0/npm11.19.0.
The initial version probe found unset T01_NODE_HOME and system26.11.1/12.2.0;
no install/build/test ran there. Correct provisioned versions verified before work.
Use early syntax/type/lint/format checks, four production checks/build and exact
nonempty Vitest selections. Reuse the qualified private Secret Service/ext4,
private-CA HTTPS, dual-loopback, compiled CLI and SDK fixtures with disposable
HOME/XDG and owned teardown; synthetic isolated writes only. No build/install
while tests execute against that target.

Apply [proportional testing](../decisions/proportional-testing-policy.md): a small
operator disclosure/fail-before-effect boundary check plus integrated retained
same-account evidence -> permanent retirement -> removal -> reconciliation ->
explicit login -> signed-out verified A deletion, preserving separate B. Launch
actual compiled stdio via SDK to prove exclusive ownership and startup never
resumes writes; false config unchanged and create_routine unavailable. Reuse
accepted fault evidence rather than invent new fault campaigns.

Final selection: complete active T12 S1–S4 owning, all T07 login owning, T05
validation/hooks/retry controls, T06 lifecycle races/validation, T09 transitions/
persistence, T11 service integration, catalogue dispatch and configured stdio.
The terminal locked-provider owning file runs in a fresh separate isolated scope.
Record exact files before execution. Repeat the same selection once on a clean
source snapshot after npm ci --ignore-scripts and production checks; compare all
source/test/emitted hashes and preserve failures/repairs. No whole-project or
external/independent security/release certification claim.

Deliver work order, operator flow, review with exact commands/results/versions,
artifact inventory, clean reproduction and handoff/status. Milestones: contract
-> copy/integrated checks -> focused validation -> stable workspace and clean
acceptance -> primary spec/source/test review -> evidence and parent closure.
Only close T12 after all required acceptance passes. Stop/hold specific shared
contract conflict, missing isolated facility, privacy breach or two-hour limit;
report concrete blockers without invented inputs. T15 remains separate/unassigned.

## Disposition

[Accepted](../evidence/t12-s4-review.md): 96/96 T12 owning + 229/229 relevant regressions = **325/325 in 31 exact files** on workspace and clean locked
snapshot. Four production checks, clean locked install, 192 byte-identical emitted
files and 537 stable hashes PASS. [Handoff](../handoffs/t12-s4.md). Parent T12
complete; T15 separate/unassigned and product creation unavailable. No successor.
