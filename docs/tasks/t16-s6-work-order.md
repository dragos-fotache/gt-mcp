# T16-S6 — Other-client races and lifecycle

**Authorization:** user, 2026-10-17: “ok start work at s6”. Primary agent owns S6.
Initial start 08:36 UTC; interrupted waiting for tool download approval.
User restarted/resumed at 09:21 UTC with download authorization; resumed checkpoint
10:51 UTC; stop 11:21 UTC with owned teardown.
**Disposition:** accepted/closed after the authorized continuation. Final full
owning45/45, unchanged local regressions35/35 and backend checks27/27; zero failures/
skips,615 stable owning hashes and owned cleanup PASS. The initial44/45 failure
and fixture calibration remain recorded. [Review](../evidence/t16-s6-review.md),
[handoff](../handoffs/t16-s6.md). S1–S6 closed; S7 unassigned, parent T16 incomplete.

## Authorized continuation — backend repair

User, 2026-10-17: “and why did you stop? continue” explicitly resumes the narrow
backend repair proposed in the preceding response. New bounded window starts
13:30 UTC; checkpoint15:00 UTC; stop15:30 UTC with owned teardown. Earlier failed
results and authorization checkpoint remain history. S6 resumed in this window and is now accepted above; S7 and
parent acceptance remain separately unassigned/open.

Exception to original-backend read-only scope: only backend
src/main/java/com/dragosfotache/gtbackend/account/AccountDeletionService.java and
src/test/java/com/dragosfotache/gtbackend/account/AccountDeletionAcceptanceHttpIntegrationTest.java.
Normalize NEW persisted acceptance to milliseconds after unrounded raw-time proof
freshness; purgeBy is derived from that instant, exact persisted receipts/replays
are retained. No historical ledger rewrite, contract/MCP validation relaxation,
Android/.pi/dependency changes, staging/commit or deployment. Preserve all other
original inputs and record exact before/after hashes.

Add one specification-derived backend HTTP regression with a fixed nonzero
nanosecond clock, literal expected millisecond receipt/24h deadline, matching DB
columns, exact delete replay after challenge expiry and identical fresh status.
Run it red on unchanged backend, apply the proposed repair, then run the backend
acceptance/proof/replay classes on a disposable source snapshot/Testcontainers.
A small fixed runner may prepare only public inputs, restore the same declared
historical build prose as the accepted runner, keep raw test logs private, publish
sanitized counts/hashes and clean owned resources. No generalized campaign.
Then qualify actual signed-proof A10, replay full active T16 plus unchanged relevant
regressions, review evidence and close S6 only after all required boundaries pass.
A bounded subagent reviews oracles/source read-only; primary owns all edits/runs.

## Outcome and settled contract

Close S6 from [the remaining plan](../decisions/t16-remaining-slices.md).
Normative authority: shared MCP draft0.2 acceptance A07/A08/A10/R09–R12,
authentication and routine-creation; backend v1 authentication/account-lifecycle,
service-protocol/domain/sync; accepted T04/T06/T09/T11/T12 evidence and
[proportional testing](../decisions/proportional-testing-policy.md).

Detected edits/deletion before an unsent step return concurrent_modification and
do not reapply confirmed state. Advisory reads confer no compare-and-swap: actual
last-write-wins is permitted; a mismatched saved shape reports any confirmed save
truthfully without rollback. Local generation fences discard obsolete results and
unsent work; committed remote effects may remain. Only explicit identical intent
under the same verified origin/account resumes retained identities. A different
binding never inherits journals/page tokens. Only authoritative deletion evidence
removes private account material; generic errors fence/preserve. Recovery integrity
fails closed without identity reconstruction. Pending work has no TTL; settlement
minimizes payloads, retirement permanently reserves IDs, sign-out preserves pending
evidence and removal retains generation fences.

## Scope and execution

Edit test/backend-interoperability/: one S6 race/lifecycle test, small fixture or
fixed child additions only where needed, runner slice selection; current task,
plan, status, sanitized evidence and handoff documents. Record a narrow repair
scope before production edits if a reproducible product defect is found. Preserve
prior sources/evidence, shared contracts, dependencies, compiler/config settings,
original backend/Android inputs and .pi. No S7/Android, Google, Pi certification,
packaging, staging/commits, deployment, personal/live resources or enablement.

Reuse guarded actual backend/PostgreSQL16, private Secret Service/ext4/TLS,
compiled MCP/official SDK, Node24.21.0/npm11.19.0, Java27 and Maven lock. The
session's prior disposable Node location is absent: locate or restore a private
tool extraction before executable Node checks; never substitute ambient Node26.
Provision private fixture roots within authorized writable space and use only
owned processes/containers. Scoped static/import checks, relevant production
checks/build and guarded isolated integration runners are permitted. No install
or rebuild during target execution. No generalized fault framework.

## Proportional acceptance and deliverables

1. Real second-client edit/delete at confirmed boundaries, explicit identical
   resume, independent DB history showing no reapplication/unrelated mutation.
2. Real PUT/save after advisory GET races: verify LWW and confirmed-save shape
   conflict with independent persisted children/revisions/replay/sync observations.
3. Real-response local generation fence, fresh same-binding reauthentication vs
   different binding, and actual authoritative account-status deletion cleanup.
   Reuse accepted local lifecycle checks for boundary permutations.
4. Reconcile R11/R12 against accepted local integrity/retention/minimization/
   retirement/removal evidence; add only missing actual-service compositions.
5. Early syntax/lint/format/import resolution, focused S6 qualification, then full
   active T16 suite plus a small unchanged lifecycle/recovery regression selection.
   Record stable product/source/artifact identity and owned cleanup. Do not count
   skips, mocks or service disablement as actual deletion/Android evidence.

Milestones: environment and source qualification; focused races/lifecycle;
specification review and final integrated S6 checks/cleanup. Deliver runnable
checks, sanitized versions/provenance/results/failures, requirement mapping,
review, handoff and task/status updates. Primary owns edits; one bounded
subagent reconciles normative oracles/component evidence and implements the A10
fixture addition below; primary alone executes integration.

### Bounded A10 proof fixture addition

Primary delegated exclusive runner/new account-deletion fixture editing. Add one
fixed private loopback RS256 signer/public-certificate server, ephemeral key and
independent deletion-ledger ring. The disposable launcher alone selects the
existing backend certificate-URL property and isolated purge readiness; original
backend/Android inputs remain unchanged. No external Google call, relaxed verifier,
production class replacement or real credential is involved. Actual signature,
nonce/purpose, account deletion/status transactions and local provenance cleanup
remain exercised. Preserve natural backend receipt timestamps. The private proof
config/token never enters ordinary output/evidence. Primary executes integration
serially; delegated work runs static checks only.

Stop affected work for unresolved public behavior/contract drift, unsafe/unowned
inputs/logging, unavailable isolated facilities or time limit; continue unrelated
authorized work and preserve an honest partial handoff. S6 acceptance does not
close parent T16, S7 or any external/independent release gate.

### Backend regression fixture calibration

The repaired four-class run passed26/27; the precision regression passed. An
unchanged acceptance case expired fixture credentials using PostgreSQL wall time
but ran production cleanup against the frozen service Clock. Fix only its two
fixture expiry assignments to one sampled service-Clock-minus-one-second instant;
keep all zero-row/account/identity/deletion assertions. No auth cleanup product
change. Preserve the original failure and rerun all four selected classes.
