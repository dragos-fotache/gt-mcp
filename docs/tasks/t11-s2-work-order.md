# T11-S2 — Authorized terminal delivery and definitive minimization

**Status:** accepted/closed, 2026-10-15 · **Owner:** primary Codex agent
**Authorization:** user: “go ahead and do s2 and then s3”. S1 accepted/closed.
S3 is explicitly authorized to start after S2 acceptance; no later task is opened.

Implement the [settled S2 contract](../decisions/t11-plan-and-slices.md) on accepted
S1/T09/T10: inert createCreationService({repository,session}), exposing awaited
create(binding,args,signal). Admit only through actual T09 withOperation, drive
active journals through S1 recovery, compact definitive terminal journals before
delivery, and reauthorize stored terminal results with a fresh bounded T06
listRoutines read followed by binding/signal/current-owner checks. Preserve the
original terminal result, keyed intent/profile/history and v1 format. Uncertain
terminal evidence remains unminimized and undispatched. Definite compaction failure
stops safely; ambiguity fences until owner reopen; explicit retry never resends
settled mutations. No outer retry, permission mechanism, startup IO or MCP enablement.

Authority and safety: shared MCP draft0.2 creation/tools/authentication, backend v1,
accepted foundation/ADRs, linked T11 plan and T09 APIs; standing
[proportional testing](../decisions/proportional-testing-policy.md).
Scope: src/creation, focused test/unit/t11 and test/fault/t11, narrowly reused T10
fixture hooks if necessary, T11 work/evidence/handoff/status docs. Preserve prior
work. No shared-contract/dependencies/compiler/manifest/lockfile/.pi changes,
staging or commits. T12 lifecycle, T15 config/MCP composition, T16 backend/Android
and independent release gates remain separate; product creation stays unavailable.

Use provisioned Node24.21.0/npm11.19.0. Read/edit, early syntax/types/lint/format/
import checks, production build/four checks, explicit focused/final Vitest selections
and bounded smoke permitted. Reuse qualified fresh private D-Bus/Secret Service,
verified ext4, diagnostic T04 faults and private-CA loopback HTTPS with synthetic
data only. No personal/live service; await owned cleanup. No build/install races.

Checks: minimal service decisions for inert capability capture, terminal/pending
handling and safe failures; actual provider/ext4/HTTPS saved and rejection receipts
across reopen, same-default intent/changed-intent rejection, live auth denial/401
recovery and invalidation, historical delivery after deletion, body/key removal;
actual T04 definite/ambiguous compaction failures without mutation replay. Keep
fixtures simple; no generalized harness. Final complete active S1/S2 suites plus
unchanged T10 S2/S3, T09 S3, T05 replay and T06 refresh/fences selection from S1.
Record exact filenames/commands/results, versions, stable hashes and review/handoff.

Milestones: contract/claim -> implementation/early checks -> focused real checks ->
stable final selection -> review/handoff -> authorized S3. Target60–90 minutes,
checkpoint90 and stop120 with honest partial disposition. Hold affected work for
contract conflict, isolation failure or expansion need. No S2 clean-parent claim;
S3 owns crash matrix and integrated clean locked reproduction.

## Disposition

[Accepted](../evidence/t11-s2-review.md):27/27 S1/S2 owning+80/80 regressions=
107/107 in13 files, four production/scoped checks,502 stable hashes and silent
bounded service/executor smoke PASS. Actual isolated provider/ext4/HTTPS terminal
replay/auth and diagnostic compaction failures PASS. [Handoff](../handoffs/t11-s2.md).
S2 grants closed; user-authorized S3 may start. Parent T11 remains incomplete.
