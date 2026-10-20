# T21-S5 — Current backend and host boundaries

Assigned by the user, 2026-10-18: “start work at s5”, resumed with “go ahead and
download the node toolchain and continue”. Accepted/closed; S1–S5 closed,
S6 ready/unassigned; no automatic successor. Working window starts 05:25 UTC; checkpoint 06:55, hard stop 07:25.

Outcome: current evidence for invocation-local creation, config2 and single-record
credentials through the existing isolated actual backend/PostgreSQL and actual
SDK/Pi host fixtures. Authority: shared MCP draft0.3, unchanged backend v1,
[T21 plan](t21-remove-durable-creation-recovery.md), successor storage/interface
spec, S4 handoff, and proportional-testing policy. Successful calls return only
routineId/status; repeated/concurrent calls are independent. Interrupted calls
stop unsent work and report safe uncertainty, never tool-level retry. Restart does
no autonomous creation. Existing within-call HTTP and pending-refresh identity,
authorization/session fences, visibility, validation, lossless numbers, cancellation
and config-only writesEnabled remain required. No backend contract/source change.

Edit scope: test/backend-interoperability and test/pi-integration fixtures/cases;
minimal shared test helpers only for demonstrated integration needs; current
T16/T17/T21 status/plan/operator/compatibility docs and new evidence/handoff.
Retain original bytes and explicit dispositions for specification-retired recovery
cases before replacement/removal. Preserve historical evidence and unrelated work.
A narrow production repair requires a reproduced retained-requirement defect and
recorded scope decision before editing; no public behavior changes by inference.
No dependencies/manifests/compiler changes, shared contracts, parked T02/.pi,
delivery packaging/archive/install/laptop/live backend/Google/Android, staging or commits.

Execution: restored disposable Node24.21.0/npm11.19.0 exclusively; pinned disposable
Secret Service extraction/private D-Bus, synthetic TLS, owned backend/database and
local offline Pi SDK. Restore tools under /tmp without system/global installs.
Read-only source/package inspection, scoped Python/Node syntax/lint/format/import
checks, production typecheck/lint/format/build, exact isolated selections and owned
cleanup are authorized. Preserve R1 outside clean-build output before building and
restore byte-identically; never build/install while tests use that target.
No Btrfs execution (user-owned), personal credentials/providers or real model.

Verification: reuse the small existing backend TLS relay and DB oracle. Check saved
graph/order/defaults/sync, identical call creates another root, representative lost
response/interruption and cancellation stop dependencies, restart does no work,
retained auth/session fences and relevant read/codec boundaries. Adapt active
creation/backend cases explicitly; retire only old journal/receipt/exact creation
replay assertions with scenario mappings, no skipped/hidden failures. Reuse actual
Pi direct/deferred/codemode paths, strict config guard, current annotations/envelopes
and fresh repeat semantics. Official SDK stdio supplies cancellation/framing proof;
remaining real Pi CLI/modes/lifecycle/output/privacy stay separately assigned T17
work and the remaining plan must say so. No exhaustive retired fault campaign.

Acceptance: early static checks, focused repair runs, then full active
creation/protocol/backend owning selection plus relevant unchanged codec/read/auth
regressions and Pi paths on stable targets. Record exact file selections before
execution, versions/tool identity, source/output stability, original failures,
backend provenance/unchanged original inputs, owned cleanup and primary-agent
specification/oracle review. Clean installed candidate/parent acceptance belongs S6.
Deliver scenario reconciliation, sanitized evidence, refreshed T17 remaining plan,
task/status updates and handoff. No whole-project/release/parent completion claim.

Milestones: contract/environment; fixture/case adaptation + early static checks;
actual focused boundary execution; final owning/regression selection, source/spec
review and closure. Stop affected work for contract conflict, required safety
weakening, unsafe/missing isolated input, dependency drift, generalized harness
expansion or time limit; continue independent authorized work and hand off honestly.
Optional bounded delegation may own only test/pi-integration and a draft T17 plan;
the primary agent owns common helpers, backend cases, final docs and integration.

Closure: [accepted review](../evidence/t21-s5-review.md),
[handoff](../handoffs/t21-s5.md). Final545/545 in58 files,569 stable execution hashes,
176 byte-identical compiled outputs, production/scoped checks and owned cleanup pass.
No production/backend/shared contract change. Original sources and failures are
preserved; actual Pi CLI/modes/lifecycle/output and current Android/release evidence
remain separate. No S6, installed package, parent completion or release grant.
