# T21-S5 acceptance review

**Accepted/closed, 2026-10-18.** The user assigned S5; S1–S5 are closed, S6 is
ready/unassigned. Parent T21 is incomplete. No delivery package/install/release grant.

The current config2/single-record/invocation-local source passes **545/545 checks
in58 files**, zero failed/skipped/pending/todo, with569 stable execution hashes.
This includes37 actual-backend checks and8 actual Pi SDK print checks. Complete
active S5 creation/protocol/backend selection and relevant unchanged codec/read/auth
regressions are explicit in [the selection](t21-s5-selection.json) and
[inventory](t21-s5-inventory.json). This is not a full historical T16/T17 or
unfiltered whole-repository pass.

## Changed behavior verified

The existing actual backend and guarded PostgreSQL observe saved graph IDs,
relationships/order/defaults/nulls/zeros, ordinary sync batches/pull/snapshot,
separate repeated/concurrent calls, authoritative rejection/last-write-wins and no
unrelated aggregate changes. Lost response, deliberate process stop, final MCP
reply loss and SDK cancellation stop dependent work without rollback claims.
Restart sends no creation; a deliberate new call uses fresh identities. Strict
credential-vault decoding, exact file set and unchanged credential ciphertext
across creation establish no local creation journal/receipt/body retention.

Auth requirements remain separate: original pending-refresh token/body/key/grant
survive backend/MCP restart; actual access401 during draft retries the same route,
method, exact body and key after one rotation, with only three domain steps.
Real logout/account-disable commit fences, local generation/result fences,
foreign-account refusal and fresh signed account-status cleanup remain verified.

Actual Pi1.1.0 SDK print/direct/deferred/codemode paths negotiate MCP2025-11-25,
discover seven tools and preserve strict config-only permission. Creation advertises
idempotentHint:false; schema rejects obsolete operationId. Current success has only
routineId/status; repeated/changed calls allocate fresh routines. Structured/text
schemas, parent routing, read availability and ordinary diagnostics remain checked.
The model is scripted locally; the host, default stdio, server, storage and TLS are real.

## Scope, review and original failures

Only12 test/fixture input paths changed versus the accepted S4 inventory. All
production/config/dependency inputs and176 compiled JS/declaration outputs remain
byte-identical. No backend source/API/shared contract changed. The runtime needed
no repair. [Scope comparison](t21-s5-scope-comparison.json),
[environment/package identity](t21-s5-environment.json),
[production/scoped static checks](t21-s5-static-checks.json).

The [scenario reconciliation](t21-s5-scenario-reconciliation.md) maps every affected
historical requirement to retained/adapted checks or explicit retirement. Original
bytes for14 source/plan files are preserved in [the manifest/archive](t21-s5-original-source-manifest.json).
No skipped checks, changed production oracle or hidden failing-file exclusion.
The remaining T17 plan and Pi operator guide now describe draft0.3 fresh calls.

A private provider exited once during qualification, before any product test;
its cause is unknown. An unchanged isolated provider probe and later qualifications
passed. Initial full run was542/544: two new deletion-race assertions incorrectly
compared account-wide replay/key totals after a404 domain rejection. Backend v1
requires durable original rejection evidence. The correction retains unchanged
per-root/unrelated aggregate assertions and requires exactly one persisted rejection,
with original error/status/send-count checks. Focused13/13 and final545/545 pass.
[Execution history](t21-s5-execution-history.json) preserves all failures/results.

Primary-agent specification/source review and a separate bounded read-only
specification/oracle review found no remaining blocking defect. That review does
not close independent release review T20. Checkpoint children settle credentials
before exit; they prove deliberate process boundaries, not crash-during-commit or
power loss. Relay loss/corruption/429 are declared injected faults; actual DB,
normal domain/auth responses, signature verification and rejection effects are real.

## Cleanup and remaining gates

[Final backend provenance/cleanup](t21-s5-backend.json) and
[provider cleanup](t21-s5-cleanup.json) confirm owned Java/container/signer/provider/
bus exit, private config/material/root removal and unchanged original backend inputs.
R1 remains byte-identical: SHA256
`ed5877dd16fc79043bc8773d3d15bb6fed2887dc891100ccebf8ddf2b3b22563`.
No laptop/live backend/Google/Android, .pi change, staging or commit.

Actual Pi CLI/modes/lifecycle/session resume/fork/output/privacy and final T17
acceptance remain separately assigned work. Current-candidate Android delivery is
unverified; unchanged historical T16 Android evidence is not promoted to a new pass.
Btrfs testing stays user-owned. S6 owns the exact new delivery archive, isolated
installation, clean locked reproduction and integrated T21 acceptance. T19 and
independent T20 remain separate release gates. No publication/enablement claim.

Status/operator documentation closes after the final runtime run. Only status
prose in monitored AGENTS/compatibility inputs changes afterward; no runtime/test/
compiled bytes change, and no extra runtime replay is claimed.
[Closure checks](t21-s5-closure-checks.json), [handoff](../handoffs/t21-s5.md).
