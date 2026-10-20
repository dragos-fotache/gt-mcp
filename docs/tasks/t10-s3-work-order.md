# T10-S3 — Fresh workflow and integrated parent acceptance

**Status:** accepted/closed, 2026-10-15 · **Owner:** primary Codex agent
**Authorization:** user: “start work at t10-s3”. S1/S2 accepted/closed.

## Contract

Implement the settled `executeFresh(binding, handle, signal)` in the
[T10 plan](../decisions/t10-plan-and-slices.md), on the accepted single-step
executor. Only an active pristine journal (all steps unsent, no confirmation or
terminal result) is eligible. Reject existing progress before dispatch. Await
exactly draft -> populate -> save, stopping at the first stopped/terminal result.
Return only the newly durable terminal result or sanitized stopped error; never
historical private results. Hold same-handle exclusion across the entire fresh
invocation, including distinct executor facades. Preserve T09 guarded admission,
original requests/keys, persisted-before-send and confirmed-before-next-send,
advisory baseline checks, auth/binding/cancellation fences and atomic save/result.
No outer retries or automatic continuation.

Authority: shared MCP draft0.2 creation/tools/authentication; backend v1
OpenAPI/service-protocol/domain rules; accepted foundation/implementation ADR;
T10 plan, S1/S2 evidence and T09 delivered interfaces; standing
[proportional testing policy](../decisions/proportional-testing-policy.md).
No contract or persisted-format change. T11 recovery/replay/minimization, T12
lifecycle, T15 MCP/config composition, T16 real backend/DB/Android and independent
release review remain separate. Product creation remains unavailable.

## Scope, environment and execution

Edit src/creation, focused test/unit/t10 and test/fault/t10 sources/helpers,
and T10 work/evidence/handoff/current status documents. Preserve preexisting
uncommitted work and historical evidence. No dependencies/compiler relaxation,
shared contract, .pi, manifests/lockfile changes, staging or commits.
Use disposable T01_NODE_HOME Node24.21.0/npm11.19.0 (existing locator resolved).
Read/edit, early scoped syntax/type/lint/format, production build/checks and
explicit selected tests permitted. Clean source snapshot with locked
`npm ci --ignore-scripts`, production checks/build and identical selected replay
is authorized for parent acceptance. Never build/install while tests run.

Only synthetic isolated fixtures: existing T04 diagnostic faults, fresh private
D-Bus/Secret Service on verified ext4 with disposable HOME/XDG, actual shared
T04 owner/T06 session/T09 repository and private-CA loopback HTTPS. Reuse existing
provider runner and TLS/storage helpers; qualify store/read/clear. No personal
bus/provider/backend/DB/Google/phone or actual credentials. Await and fail on
cleanup errors, reap owned processes, remove owned data. No real backend claim.

## Checks and deliverables

Small decision checks: fresh rejects pending/confirmed/terminal/receipt progress,
excludes concurrent fresh/single-step calls, stops on uncertainty/failure and
preserves latest acknowledged history. Real isolated production-provider/ext4/
HTTPS checks: independent exact three-request bodies/keys and root/child IDs,
confirmation ordering, durable result before return/reopen with no startup sends,
visibility precheck then authoritative populate rejection, saved-content race.
Reuse S2 fault cases without a new generalized harness or crash cross-product.

Final complete active T10 suites plus unchanged selection:

- test/unit/t09/s1-format.test.mjs
- test/unit/t09/s2-admission.test.mjs
- test/unit/t09/s3-transitions.test.mjs
- test/fault/t09/s3-persistence.test.mjs
- test/unit/t05/10-replay-identity.test.mjs
- test/fault/t06/s4-refresh-retry.test.mjs
- test/fault/t06/s4-concurrency-fences.test.mjs

Run four production checks and scoped test lint/format/syntax; bounded silent
import/construction check; stable input/emitted/test digests and clean emitted
comparison. Record exact selections/results/versions, failures and limitations in
review/inventory/clean evidence, handoff and task/index/roadmap/verification.
Primary-agent spec/source/test review is not independent release certification.

Milestones: contract/claim -> implementation/early statics -> focused real checks
-> stable final selection -> clean reproduction/replay -> review/status/handoff.
Target60–90 minutes, checkpoint90, stop120 with honest partial handoff if needed.
Escalate specific contract conflicts, missing isolated facilities or dependency
changes; hold affected work. Never weaken contracts or tests. No automatic T11.

## Disposition

[S3 and integrated parent T10 accepted](../evidence/t10-s3-review.md):182/182
workspace and clean selected checks, four production/scoped checks,345 stable
copied inputs,178 identical outputs and492 identical stable selected hashes PASS.
[Handoff](../handoffs/t10-s3.md). S3/T10 grants closed; no automatic T11.
