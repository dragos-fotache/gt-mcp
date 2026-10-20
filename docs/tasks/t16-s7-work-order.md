# T16-S7 — Android ordinary sync and integrated acceptance

**Authorization:** user, 2026-10-17: “start work at t16-s7”. Primary agent owns
planning, implementation, checks, review and evidence. S1–S6 remain closed.
**Disposition:** accepted/closed with parent T16 on2026-10-17. Workspace full
owning46/46, relevant unchanged regressions138+43=181, clean full owning46/46 and
clean regressions181/181 pass; zero failures/skips. Clean locked source/compiled
identity, original-input preservation and owned cleanup pass.
[Review](../evidence/t16-s7-review.md), [handoff](../handoffs/t16-s7.md).
Original bounded window: start13:56 UTC, checkpoint15:26 UTC, stop15:56 UTC.
All S7 work is complete within that window; no successor or release grant.

## Outcome and contract

Verify an MCP-created saved routine through actual Android ordinary sync and
reconcile T16 M04–M09/A03–A10/C01–C08/R01–R12 before parent acceptance.
Normative: shared MCP draft0.2 acceptance/authentication/routine-creation; backend
v1 service-protocol/domain/sync/android-client-protocol; accepted S1–S6 evidence;
[remaining plan](../decisions/t16-remaining-slices.md) and
[proportional testing](../decisions/proportional-testing-policy.md).

Android must observe the same saved root, ordered entries and sets, references,
values and identities after successful normal sync using delivered HTTP and
Room/engine paths. Independent submission/DB observations supply the oracle;
no simulated successful domain responses or backend-only substitute. Preserve
default-disabled writes outside isolated fixtures. Carry the accepted S3 codec
repair and S6 backend timestamp repair in the verified candidate. No public API,
schema, permission-policy or contract change is planned.

## Edit scope and environment

Edit test/backend-interoperability/ for one focused Android integration fixture
and minimal fixed orchestration, plus S7 task/evidence/review/handoff and current
status/verification documents. Build an isolated Android source snapshot with
test-only fixture additions: original Android/backend sources and shared contracts
remain unchanged. Record any reproducible production defect and narrow repair
scope before editing product code; escalate unresolved public behavior.

Use pinned disposable Node24.21.0/npm11.19.0, Java27, existing Android SDK/current
system image and KVM, guarded disposable PostgreSQL16/backend, private Secret
Service/ext4/TLS and compiled MCP/official SDK. User's S7 assignment authorizes
creation/build/use/teardown of a fresh isolated emulator and synthetic account/
session; never select a personal/running device, existing AVD or personal database.
Discover existing public tools; no global/system installs or Pi settings changes.
Relevant static checks, locked source-snapshot installation/build, Android Gradle
assembly/one-class instrumentation, existing isolated runners and read-only
artifact/version/hash inspection are permitted. No build/install races execution
against the same target. Keep credentials/config/private logs in mode700/600
temporary roots, sanitize results and erase owned private artifacts.

No original Android/backend edits, dependency/compiler relaxation, generalized
testing framework, live Google, named Pi/T17, T19/T20, publication, enablement,
staging or commits. Existing user work and historical evidence are preserved.

## Acceptance, milestones and stopping conditions

1. Qualify tools, owned emulator and actual isolated service; record candidate
   identities, exact safe commands and any unavailable prerequisite honestly.
2. One meaningful ordinary-sync journey: create through compiled MCP; actual
   Android HTTP/Room projection observes exact saved graph/IDs/order and stable
   repeated sync. Verify nonempty executed instrumentation XML, not shell exit.
3. Reconcile every owned scenario with specification-derived S1–S7/component
   evidence and explicit limitations. Preserve per-step mandatory fault gates.
4. Early syntax/import/lint/format checks; final full active T16 suite, relevant
   unchanged regressions and clean locked candidate reproduction. Reuse closed
   evidence where proportional; no unrun checks or skips counted as passes.
5. Review, sanitized artifact/version/results/cleanup evidence, concise handoff
   and current task/status updates. Close T16 only if every required gate passes.

Stop affected work on unresolved contract drift, unsafe/unowned external inputs,
missing safe emulator/backend/secret facility, unsafe logging or the two-hour
limit. Continue independent reconciliation where possible; report exact missing
inputs with placeholders. Partial work is not Android/parent/release acceptance.

## Acceptance closure

All five milestones pass. The unchanged foundation package/compatibility metadata
guard was added to the final regression selection for the compatibility evidence
update; no test source or expected status was weakened. Full owning uses nine
files; final clean regressions use eight.424 public source inputs and194 emitted
files are exact; two historical parked T02 generated outputs stay unchanged in
the workspace and are excluded from reconstruction. Task scope and all external/
independent release gates remain as above; all S7 grants are closed.
