# Verification strategy and release gates

## Latest accepted boundary — T08 stdio

[T08-S3 review](evidence/t08-s3-review.md): final exact active76file941/941 tests
PASS; clean locked install/typecheck/production lint/format/build PASS,128 compiled
files identical and clean full active T08 replay82/82 PASS. The selection preserves
parked T02/deferred T05 as unrun and uses the accepted bounded T05 scope. Real
isolated provider/ext4/HTTPS and actual SDK stdio/lifecycle checks passed. Narrow
foundation server-launch expectations were explicitly superseded, with imports,
CLI/root/companion safety preserved. User replaced historical role relays for this
run; the source/test review and focused repair record remain available.

No real backend, Google/browser, Android, named Pi, routine-creation or release
claim follows. Older status paragraphs below describe their historical boundaries.

**Evidence status: T01 foundation, bounded T03 schemas/codecs, T04 storage, T05 transport
and T06-S1–S4 internal slices accepted; T06 completed by user with omissions recorded below.
All interoperability/release gates remain unverified.** [Coordinator evidence](evidence/t01-coordinator-review.md) records clean
locked source-snapshot install/typecheck/lint/format/build, 100/100 independent tests,
16/16 interception calibrations and package/source audits on Node 24.21.0/npm 11.19.0.
Entries are inert; foundation acceptance claims no protocol/host/backend/auth behavior.
[T03 acceptance](evidence/t03-coordinator-review.md) records independent221/221
pure schema/codec tests,100/100 foundation regression and clean locked-install/
production/scoped reproduction on t03-f1. This covers only schema aspects of
M02-M03/M09/C02-C03/C06/R08, not actual dispatch/auth/config/host/backend behavior.
Initial failures, the pinned-Zod import-data adjudication and limitations remain
visible. This document maps remaining checks to owners. Normative scenarios are in
[shared acceptance scenarios](../shared-docs/docs/mcp-contract/acceptance-scenarios.md).

**Current policy:** shared MCP draft0.2 and the
[approved local decision](decisions/routine-creation-config-policy.md) require
only an operator config-file writesEnabled flag (strict boolean, default false).
No custom/external permission extension or per-routine approval. Authentication,
validation, account fences, encrypted journals/recovery and integration remain gates.
Draft0.1 approval scenario meanings are superseded explicitly, not marked passed.

**Preserved T02 evidence:** four slices/six synthetic SDK profiles accepted through
R2 under the old experiment contract; initial failed reviews/repairs remain historical.
R3 Developer reported candidate checks/16 diagnostics and stopped; no independent
R3 artifact relay/acceptance. QA/coordinator56 artifact-free controls are logic
controls only. T02/further succession are parked; T13/T14 retired. Parked evidence
is not config-guard/host/backend/release proof. No old tests/evidence were weakened.

## T06 completion — user-directed omissions, not release certification

[Closure](evidence/t06-s5-coordinator-closure.md): S5 c2/r5 owning30/30PASS,
fixture-focused15PASS, exact active60files/859tests PASS (foundation/T03/T04 real
isolated provider/bounded15T05/allS1–S5), zero skip/todo/unhandled/cleanup failures.
341stable hashes;77active source-quality checks green. Clean239-source locked
npm ci/production checks/build green,102identical compiled files. Clean BEHAVIORAL
replay/new ten-export import smoke/additional QA reconfirmation WAIVED/UNRUN by
explicit user direction; never passed. T06 COMPLETE as an internal capability,
not full verification/release acceptance or a new standing-policy reduction.

F1 two Coordinator fixture-posture failures/count29-vs30mistake preserved; private
wrapper repaired (tmpfs temp/ext4 production roots/umask0077), unchanged tests f2
green. QA also ran ungranted whole-repo72files/42failures via empty argv and continued;
that run INVALID/unpassed, exact original42failed identities UNKNOWN, not recreated.
Valid exact parent859green is observed separate evidence, no whole-repository claim.
[Pickup](handoffs/t06-complete-coordinator-pickup.md) carries safeguards and remaining
release gaps. ALL source/runtime windows CLOSED, agents HELD. User subsequently
selected T08 for Coordinator design/slicing; the [proposal](decisions/t08-general-design-and-slices.md)
links settled S1–S3 designs. S1 is now [ACCEPTED c3/f2](evidence/t08-s1-coordinator-review.md):
101/101PASS (owning39 +regressions62), stable137-input freeze, four pinned checks,
real isolated provider/ext4/CA/HTTPS and verified cleanup. F1 failed100/101 with
unknown original code; fixture/review corrections and limits preserved. Small new
runtime import observation/source audit is limited proof, not a T06 waiver reopening.
[S1 handoff](handoffs/t08-s1.md); S1 windows CLOSED. S2 now
[ACCEPTED c2/SDKf2+configuredf3](evidence/t08-s2-coordinator-review.md): separate
same-candidate99/99SDK+13/13configured =112/112 (20full S2owning+92relevant regressions),
217stable inputs/154QA hashes, final four pinned Coordinator checks,126identical
compiled files and real isolated provider/ext4/CA/HTTPS/release/cleanup. Original
95/99F1/four failures/unknown fourth fields and earlier deviations retained.
Supplemental actual SDK initialize negotiated2025-11-25; no guessed reporter/host
or all-version claim. [Current handoff](handoffs/t08-s2.md); ALL windows CLOSED.
[S3 design](decisions/t08-s3-stdio-spec.md) still owns actual stdio/full parent/
clean reproduction. S3 ready but unassigned/held; parent/release not accepted.
T07/T09 remain ready/unassigned. T02 parked/T13–T14 retired. Mandatory
shared safety/real backend/browser/host/deletion/packaging/release gates remain open.
Older parent-incomplete/blocked descriptions below are historical only.

## Accepted T06-S4 checkpoint (parent T06 incomplete)

[S4 acceptance](evidence/t06-s4-coordinator-review.md), c4/f3: authenticated nine-route
internal facade, exact pending recovery/one401 replay, shared revision-aware auth,
owned transition/cancellation/delivery fences and conservative mutation errors.
Independent owning33/33 +unchanged202/202,zero fail/skip/todo/unhandled; full f3 output
and289stable hashes/cleanup green. Coordinator clean189source locked reproduction
repeats SAME235tests +npm ci --ignore-scripts/four production checks/build/scoped QA
quality;100compiled files identical,189sources unchanged,disposable scope removed.
Small isolated8export import natural131ms/empty stderr/HOME/temp +source audit,
NOT comprehensive interception/OS sandbox/power-loss proof. [Handoff](handoffs/t06-s4.md).

f1 28PASS/5FAIL and f2 30PASS/3FAIL/BOTH202regressions UNRUN preserved. Source-review
misses corrected fixtures to saved-list contract and exact default query, no weakening
or skipped cases. TWO original f2 failed-case identities UNKNOWN/irretrievable after
tail-only output; pass-label guesses withdrawn, no reconstruction/retroactive pass.
Current-artifact acceptance rests on NEW complete f3 all33cases +independent clean
235proof. Initial Coordinator npmrc configuration failure retained, procedure-only
distinct-config repair then green; no failed command counted passed.

ALL S1–S4 windows CLOSED, agents HELD; parent T06 incomplete/S5 unassigned/T07/T08
blocked. S5 trusted lifecycle/integrated race and full relevant parent owning/provider/
transport/foundation/T03/clean gates remain mandatory. Parked/deferred work unpassed,
real backend/Google/browser/Android/Pi/config guard/release gates still open.
Prior checkpoint descriptions below are historical where they call S4 unassigned.

## Accepted T06-S1 checkpoint (parent T06 incomplete)

[S1 acceptance](evidence/t06-s1-coordinator-review.md): version1 private state,
exact grant/expiry installation and read/session fences only;51owning+399unchanged
regressions,zero skips. Independent clean155-source locked reproduction,
94identical compiled files,249stable hashes; actual isolated diagnostic persistence
and loopback HTTPS boundaries. Initial QA calibration failure retained and resolved
by unchanged focused/fullrerun with sibling fixture HOME/temp roots; no waiver.

No complete A03–A10/auth-recovery claim: refresh/restart/retry/lifecycle races,
actual Google/backend/browser/MCP/host/config guard and full parent T06 owning/
relevant T04/T05 provider/transport integration remain mandatory. All S1 windows
closed; S2/S3 are subsequently accepted below, S4/S5 remain unassigned. Internal
acceptance is not release readiness.

## Accepted T06-S2 checkpoint (parent T06 incomplete)

[S2 acceptance](evidence/t06-s2-coordinator-review.md): refresh-only facade and
strict private version2 pending state, exact predecessor/body/key durable before
one control dispatch, shared fresh rotation, same-account joint grant/pending-null
commit, failure retention and cancellation-owned completion. Independent QA40owning
+129unchanged regressions,zero fail/skip; clean161-source locked install/production
checks/same169tests,96identical compiled files and257stable hashes. Small isolated
six-export import smoke plus source audit, not comprehensive interception/sandbox.
[Handoff](handoffs/t06-s2.md). Initial source rejections/diagnostic deviation retained.

Partial local A03 fresh serialization and A04 durable pending-retention/A09 privacy
boundaries only, NOT whole scenario passes. No uncertain restart replay, recovered
expired-access/current-refresh follow-on rotation, resource401 retry identity or
trusted lifecycle/race closure. Existing pending refuses new keys/dispatch in S2;
production refresh needs S3 recovery. Full parent relevant provider/transport/
integrated gates and real backend/browser/host/release remain unverified. ALL S2
windows CLOSED. S3 is subsequently accepted below; S4/S5 unassigned,
T07/T08 not unlocked. Prior S2 partial boundaries are not parent acceptance.

## Accepted T06-S3 checkpoint (parent T06 incomplete)

[S3 acceptance](evidence/t06-s3-coordinator-review.md), c1/f1: exact durable original
refresh replay after loss/close/reopen, recovered expired-access/current-refresh
installation before one distinct rotation, no-pending restart gap, bounded cycle,
retained invalid/legacy/409 evidence and shared post-clock cancellation. Independent
QA33owning+169unchanged regressions,zero fail/skip/unhandled; clean171source locked
reproduction repeats SAME202tests +install/production/scoped QA checks,98identical
compiled files and269stable hashes. Small isolated seven-export import smoke/source
audit green, NOT comprehensive interception/OS sandbox/power-loss/crash proof.
[Handoff](handoffs/t06-s3.md). Initial source findings/process deviations retained.

Local component portions of A03–A05/A09 only, NOT whole scenario/backend/release
passes. Real isolated diagnostic storage/owned HTTPS are not real backend/provider
interoperability. Direct gap seeding proves durable/no-volatile-marker behavior;
close/reopen is not a kill/power-loss campaign. Resource401 retry identity (S4),
trusted lifecycle/race closure (S5) and full relevant parent owning/provider/
transport/integrated/clean gates remain mandatory. ALL S1–S3 windows CLOSED,
Developer/QA HELD; S4/S5 unassigned, parent T06 incomplete/T07/T08 blocked.
No actual writes, automatic successor or release acceptance.

## Standing scope policy for future work

The user's [proportional testing policy](decisions/proportional-testing-policy.md)
applies to ALL future tasks. Use the smallest meaningful contract/risk-based
matrix, simple reused fixtures, early scoped static checks and focused repair runs.
Keep selective high-value unit tests for validation, Int64, exact-byte identity
and error/retry decisions; prefer actual isolated integration tests for HTTP/TLS,
persistence, providers and delivered MCP/backend workflows. No unit-test quota,
coverage-percentage or line-ratio target; avoid private-function assertions,
implementation-mirroring mocks and redundant cases. Each test should catch a named
meaningful failure not already adequately covered. AI-generated tests still need
independent specification-derived oracles. This is not permission to delete
existing tests or drop required coverage.
Final acceptance still requires the full ACTIVE owning suite and relevant unchanged
regressions/integration gates. Do not build generalized interception/sandbox/proxy
frameworks or exhaustive fault cross-products by default. Source review plus a
small smoke may support a bounded claim, not blanket sandbox certification.

The scenario ownership matrix below is traceability for mandatory behavior, not
a demand to duplicate every test across owners or enumerate all combinations.
Reconcile oversized local plans explicitly at task pickup; deferred work stays
visible and is not passed. Shared contract/safety/release gates remain unchanged.

## Accepted T04 boundary

[Independent coordinator acceptance](evidence/t04-coordinator-review.md) on t04-f4:
T04 unit54/54 + fault69/69 (actual isolated Secret Service production adapter),
foundation100/100 and T03221/221; clean136-file locked snapshot/install/production
checks, generated bytes identical to frozen artifact, scoped QA checks all PASS.
Covers storage portions of A03-A04/A07-A09/C07/R01/R11-R12 only, not whole-scenario
refresh/auth/backend creation/recovery/config/host/release acceptance. File+directory
fsync guarantee conditional on supported local ext4/hardware; no power-loss or
whole-machine rollback simulation claimed. Initial failures/deviations retained.
All T04windows closed. T05is subsequently accepted below; all T05windows closed
as well. Parent T06 is incomplete with S1–S3 accepted/closed, S4/S5 unassigned;
T09 ready/unassigned. Actual writes remain disabled.

## Accepted T05 boundary and bounded scope

[Independent acceptance](evidence/t05-coordinator-review.md), c4/f3: QA21focused,
228/228active owning,100foundation,221T03,54T04unit,69T04private-provider fault,
0skips. Coordinator clean174-file locked snapshot repeats all672final tests plus
production checks/source-quality gates; rebuilt bytes identical,193frozen hashes
stable. Covers bounded internal M10/A09 transport/error portions only, not whole
end-to-end scenarios, session/journals/config guard/MCP/CLI/host/backend/release.
All grants closed, agents held; [daily handoff](handoffs/t05-end-of-day.md).

The user explicitly approved the
[bounded T05 verification plan](decisions/t05-bounded-verification-plan.md).
Production/shared-contract requirements stay intact; a15-suite core selection,
simple local HTTP/HTTPS fixtures and import smoke plus coordinator source review
replace exhaustive Node API interception and fault cross-products. Existing broad
harness/calibration sources and failures remain preserved/deferred, NOT passed.
Scripts/discovery stay unchanged; scoped results never imply whole-suite green.
Final active T05 + unchanged foundation/T03/T04 (isolated provider included) and
clean locked source-snapshot reproduction have passed for c4/f3. Earlier f1/f2
failures remain retained, not retroactively passed. Future repairs still use
focused checks after reviewed relay. No interoperability/release gate is removed.

## Test layers

| Layer                               | Purpose                                                                                                                                 | Does not establish                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Pure unit/schema tests              | Strict arguments/output, normalization, Int64/timestamp rules, comparisons and error mapping.                                           | Real authorization, storage durability or provider compatibility.                    |
| Storage/process fault tests         | Encryption, ownership, atomicity, restart, absent/corrupt/stale evidence and no autonomous resume.                                      | Real backend commit/replay correctness.                                              |
| Controlled transport/provider tests | Deterministic timeout, malformed response, 401/429/500/503 and browser attack/cancel paths.                                             | Real Google login or real backend transactions.                                      |
| Official SDK stdio client           | Negotiation, seven tools, schemas, config-controlled creation, errors and stdout discipline.                                            | Named Pi/other-host compatibility by itself.                                         |
| Actual named Pi integration         | Direct/deferred/codemode/nested server config guard, results, reconnect/retry and retained operation identity; no permission extension. | Per-routine consent, human-preview integrity, an OS sandbox or blanket host support. |
| Isolated real backend + real DB     | Ownership, independent canonical assertions, idempotent replay, races, auth revocation and sync batches.                                | Live Google/browser sign-in or phone consumption by itself.                          |
| Android integration observation     | Same IDs/template after normal successful client sync.                                                                                  | Immediate/offline delivery or all Android journeys.                                  |
| Real Google + browser + HTTPS       | Registered local origin, nonce/audience, dedicated service grant, safe trusted bootstrap.                                               | Every deterministic auth/race case or complete public-v1 backend readiness.          |

Build each task's tests during implementation. T16/T17/T19 close the integration gates;
they cannot be replaced by re-running the same doubles at the end.

## Acceptance scenario ownership

Owners below are implementation/test owners; T20 independently reviews all evidence.
Each row must receive a specific passing command or sanitized observation reference.
Ranges include every numbered case in that range.

| Shared scenario | Implementation/test owners      | Required evidence boundary                                                                                                                                     |
| --------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M01             | T01, T08, T15, T17, T18         | Official client + named Pi stdio, exact seven tools and negotiated versions.                                                                                   |
| M02             | T03, T08, T15, T17              | Schema validation of both envelopes; protocol vs execution error behavior.                                                                                     |
| M03             | T03, T08, T15                   | Root/nested strict validation, no coercion/mutation.                                                                                                           |
| M04             | T08, T16                        | Real backend search/filter/visibility, correct catalogue version/IDs.                                                                                          |
| M05             | T08, T16                        | Two actual accounts; own draft reads and saved-only list.                                                                                                      |
| M06             | T08, T16                        | 20 default, limits 1/200, complete pages and no exhaustive traversal.                                                                                          |
| M07             | T06, T08, T16                   | Same-account refresh with bound continuation context/expiry.                                                                                                   |
| M08             | T08, T16                        | Explicit expired-token behavior and concurrent live-page changes.                                                                                              |
| M09             | T03, T08, T16                   | Raw numeric fixtures + real-service compatible response checks; exact Int64 max projection.                                                                    |
| M10             | T05, T08, T15, T17              | Complete result or explicit size failure; untrusted content cannot alter permission/destination or leak credentials.                                           |
| A01             | T07, T08, T18                   | Safe unconfigured/signed-out calls and setup guidance.                                                                                                         |
| A02             | T07, T19                        | Controlled nonce/audience failures plus separate real browser/Google exchange.                                                                                 |
| A03             | T04, T06, T16                   | Simultaneous calls/process ownership and real refresh serialization.                                                                                           |
| A04             | T04, T06, T16                   | Lost rotation response/process death; exact predecessor body/key replay.                                                                                       |
| A05             | T06, T16                        | Expired-access/current-refresh replay installed before next rotation.                                                                                          |
| A06             | T06, T16                        | One refresh/retry maximum per request; unchanged resource identity.                                                                                            |
| A07             | T06, T12, T15, T17              | Server in-flight origin/account/generation fences and sign-out/config-disable races; no companion state.                                                       |
| A08             | T06, T12, T16                   | Same-account explicit recovery vs different origin/account/new post-deletion UUID.                                                                             |
| A09             | T04-T08, T09-T12, T15, T18, T20 | Storage/config/process/argv/stdout/stderr/transcript/proxy inspection; redirect safety.                                                                        |
| A10             | T06, T12, T16                   | Verified account-bound deletion cleanup vs generic failures, no host remote-wipe claim.                                                                        |
| A11             | T07, T19                        | Deterministic callback security + real configured browser-origin observations.                                                                                 |
| C01             | T09-T11, T15, T16               | Three actual transaction bodies/keys, IDs/order and stable saved receipt.                                                                                      |
| C02             | T03, T09-T10, T16               | Null/zero/default/empty/repeated references preserved.                                                                                                         |
| C03             | T03, T09, T15-T17               | Unicode/strict-input validation; false/missing/invalid writesEnabled rejects before admission/mutation.                                                        |
| C04             | T09-T10, T16                    | Visibility precheck and authoritative real reference rejection after race.                                                                                     |
| C05             | T11, T15, T16                   | Terminal repeats with live authorization; no new roots.                                                                                                        |
| C06             | T03, T09, T16                   | Normalized equivalence/difference and operation identity retention.                                                                                            |
| C07             | T04, T09, T11, T16              | Parallel same/conflicting calls and second-process ownership.                                                                                                  |
| C08             | T09, T15-T16                    | Distinct explicit IDs create distinct roots under enabled config; lost response keeps original ID.                                                             |
| C09             | T09, T15-T17                    | Config false/missing denies, true permits valid authenticated calls without prompts; host/arguments cannot enable; identical retry/conflicting intent handled. |
| C10             | T15, T17                        | Real direct/deferred/codemode/nested calls hit the server config guard; disabled zero, enabled valid creation, no permission extension.                        |
| C11             | T12, T15, T17                   | Config is the sole permission source across supported modes/restart; effective disablement fences new admission/unsent steps.                                  |
| C12             | T09, T11, T15, T17              | Client operationId/request retention and encrypted journal identity/exact-byte replay; changed admitted intent rejects, no consent-preview guarantee.          |
| R01             | T04, T09, T11, T16              | Each step: persisted-before-send crash; stable requests, no startup continuation.                                                                              |
| R02             | T05, T11, T16                   | Each step: commit/response-loss/malformed reply; exact replay and independent DB checks.                                                                       |
| R03             | T10-T11, T16                    | Each step: confirmed-before-next-send crash; compare unsent continuation with current state.                                                                   |
| R04             | T11, T16-T17                    | Save/receipt persisted then lost MCP result; same receipt/ID and current auth.                                                                                 |
| R05             | T11, T15-T17                    | Cancel before/after admission/dispatch, truthful uncertainty, no rollback/delete.                                                                              |
| R06             | T05-T06, T11, T15-T16           | Bounded delays/retries and original identity, no automatic worker.                                                                                             |
| R07             | T10-T11, T16                    | Durable actual populate/save rejection; no dependent steps.                                                                                                    |
| R08             | T03, T05, T10-T11, T16          | Collision/identity/response mismatch failure; no regenerated UUIDs or fabricated confirmation.                                                                 |
| R09             | T11, T16                        | Actual Android/other-client edit/delete before explicit resume; no restore PUT.                                                                                |
| R10             | T10-T11, T16                    | Real race after advisory GET; LWW honored, mismatched saved shape explicit.                                                                                    |
| R11             | T04, T09, T12, T16, T18         | Missing/corrupt/incompatible/restored stale private evidence fails closed.                                                                                     |
| R12             | T04, T11-T12, T16, T18          | Long-offline retention, body minimization, retirement and fenced removal/deletion.                                                                             |

If a backend cannot emit a required numeric/clock boundary naturally, combine independent
raw-wire fixtures and backend-owned controlled seams; document which layer proves which
assertion. Do not lower the wire range to fit JavaScript or call a rounded number lossless.

## Configuration-guard coverage

Test writesEnabled omitted/false/true and invalid values (null, numbers, strings);
no coercion/implicit true. Disabled/missing config returns configuration_required
before admission, UUID allocation or dispatch. Invalid config fails closed.
Enabled config still requires valid input/auth/visible references and operation
identity; it triggers no permission prompt or extension.

Repeat against official MCP and supported named Pi direct/indirect paths.
ClientInfo/annotations/model args/returned text/environment/CLI flags cannot enable
writes. Document config-load/reload semantics; effective disablement fences new
admission/unsent mutations, without rollback of committed effects. Reads remain
usable. Disclose that clients accessing an enabled process may create without
human confirmation.

## Creation fault matrix

For **each** draft/populate/save step test at least:

1. Journal persisted, network not yet sent.
2. Dispatch possible recorded, request may/may not reach backend.
3. Domain committed, response lost/500/503/timeout or malformed successful body.
4. Valid response received, local confirmation not yet persisted.
5. Confirmation persisted, next step not sent.
6. Cancellation/session fence before and after each boundary.

For final save also lose the final MCP result after compact receipt persistence. Inspect
root/children/revisions/replay identity/change batches independently, not just adapter
success messages. At every retry assert method, concrete route, exact UTF-8 body,
resource key, root IDs and child IDs remain unchanged. Unsent steps stop on detected
concurrent changes; already dispatched uncertain steps settle by exact replay first.

## External inputs and blockers

Acquire through trusted setup/coordination, never chat/tool arguments containing secrets:

- Disposable backend artifact/source access, real isolated DB, test-account/fixture setup
  and backend-owned clock/provider controls. A simulator is not the backend.
- Isolated trusted HTTPS service and public Google web client audience with the exact
  configured http://localhost:<port> JavaScript origin; owner-approved Google test account.
- Supported OS secret facility and permission to provision private encrypted test profiles.
- Named Pi runtime/package and terminal harness; documented supported extension set.
- Android integration fixture/device/client access for observing actual normal sync.

Use nonsecret placeholders in docs. Never borrow a personal/live DB or Android session
refresh token. External access failures keep the owning task/gate blocked.

## Compatibility evidence to record

T01 created the [compatibility matrix](compatibility.md) with exact selected foundation
pins and all compatibility rows explicitly **unverified**. Foundation checks are recorded
separately; no inferred protocol/host/backend compatibility. Still record:

- Node.js, TypeScript, package manager/lockfile, official MCP SDK and protocol versions.
- Pi exact version, package/source identity, supported MCP/tool paths and host modes;
  ordinary portable server registration, no required permission extension.
- OS/secret facility, browser/GIS path, helper port/origin setup (no private values).
- Backend artifact/version, OpenAPI/shared-docs baseline and isolated fixture provenance.
- Artifact installation/upgrade versions and journal/intent/key versions.

Inspected Pi 1.1.0 and the linked 2025-11-25 MCP tools specification are planning references,
not compatibility passes. A newer stable version may be selected after tests. UI/mode does not determine
permission: the server config guard applies uniformly. Another host still needs
its own interoperability evidence.

## Release checklist (all currently unchecked)

- [ ] All active foundation/server/auth/schema/storage/creation tasks pass; parked
      T02/retired T13/T14 are not prerequisites or claimed passes.
- [ ] Locked clean install/build/typecheck/lint/schema/unit/storage/fault/protocol checks pass.
- [ ] Actual backend/database replay/ownership/auth/race/sync tests pass (T16).
- [ ] Android observes the saved routine after successful ordinary sync (T16).
- [ ] Config guard passes disabled/missing/invalid/enabled tests on official MCP
      and named Pi supported paths, with no permission extension/prompt (T15/T17).
- [ ] Real Google/browser registered-origin/nonce/audience exchange passes (T19).
- [ ] Protected encryption, ownership, generation fences, cleanup/minimization/retirement verified.
- [ ] Published operational budgets accept supported data or explicitly fail, never truncate.
- [ ] Server/CLI/config/setup/privacy/recovery/upgrade guides/artifacts verified;
      explicit writesEnabled risk/defaults explained, no companion required (T18).
- [ ] Shared-contract drift resolved and all scenario/evidence links reviewed independently (T20).
- [ ] Go/no-go report names tested versions, supported configuration, limitations and remaining risks.

No release gate becomes checked because a dependency was installed, a mock passed, a
case was skipped, or a task was estimated. Any unresolved contract/security blocker is
no-go for writable release. Publishing/deploying and personal-account changes require
separate authorization.

## Evidence format

Store sanitized reports under docs/evidence/ when tests exist. Each report states task,
scenario IDs, layer, tested artifact/version, exact safe reproduction commands, expected
vs observed results, pass/fail/blocked, cleanup and limits. Do not store raw credentials,
private filesystem paths, account/resource identifiers, personal content or raw request/
response bodies. Synthetic fixtures belong in test/ and must be visibly synthetic.
