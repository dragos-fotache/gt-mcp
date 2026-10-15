# T06 — Implement dedicated sessions, refresh recovery and fences

**Status:** done — user-directed completion with explicit final-verification omissions · **Owner:** Coordinator; Developer/QA HELD · **Requires:** T04, T05
**Planning estimate:** high complexity; roughly 6–12 hours end-to-end across bounded
sessions, including independent QA and repairs, not a promised duration. Five
proposed slices replace the earlier coarse 2–3-session estimate.

## Outcome

Authenticate all calls safely without sharing Android credentials or initiating interactive sign-in from tools.

## Read first

- [authentication.md](../../shared-docs/docs/mcp-contract/authentication.md)
- [authentication.md](../../shared-docs/docs/backend-contract/authentication.md)
- [auth-expiry-precision.md](../../shared-docs/docs/backend-contract/issues/auth-expiry-precision.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Current disposition — COMPLETE by user direction

User directed dropping remaining verification and finishing T06. S1–S4 historical
acceptance retained; S5 c2/r5 independently30/30 and complete active parent859/859
PASS, focused15PASS,341stable frozen hashes. Locked clean install/four production
checks/102identical outputs PASS; clean-snapshot behavioral replay/new import smoke/
additional QA reconfirmation explicitly WAIVED/UNRUN, not passed. QA's ungranted
whole-repository run/protocol deviation and unknown original observations retained.
[Closure evidence](../evidence/t06-s5-coordinator-closure.md) and
[next-Coordinator pickup](../handoffs/t06-complete-coordinator-pickup.md).
ALL source/static/build/install/runtime grants CLOSED, Developer/QA HELD. T07/T08/
T09 ready and UNASSIGNED; none is uniquely required next. No product writes,
release, staging/commits or automatic successor/context renewal. Later incomplete/
blocked/unassigned descriptions are historical, superseded here without changing
frozen contracts/inputs. Shared safety/release gates remain open.

## Accepted S4 checkpoint — historical closure

User authorized **T06-S4 only**, now **accepted c4 / t06-s4-f3** with
[independent acceptance](../evidence/t06-s4-coordinator-review.md):33owning+202unchanged
regressions,zero fail/skip; clean189-source locked reproduction,100identical compiled
files,289stable hashes,small8export import smoke/source audit. [S4 handoff](../handoffs/t06-s4.md).
ALL S4 source/helper/static/build/install/target/fixture/rerun grants CLOSED;
Developer/QA HOLD ALL. Frozen work-order/repair/relay text is historical, superseded
by acceptance closure WITHOUT changing frozen bytes.
S1–S4 accepted/closed; S5 unassigned, parent T06 incomplete/T07/T08 blocked.

f1 28PASS/5FAIL and f2 30PASS/3FAIL (BOTH regressions202UNRUN) preserved; TWO original
f2 failure identities UNKNOWN/irretrievable after tail-only output, pass-label guesses
withdrawn. New f3 full-capture proof runs ALL same33cases. Coordinator source-review
misses and initial clean-procedure npmrc failure retained, not counted green.
No product writes/release/whole-task grant, automatic successor/context renewal.
Recommended next is NEW bounded T06-S5 lifecycle/race assignment, not auto-start.

### Accepted S3 prerequisite (historical grants closed)

User authorized **T06-S3 only**, now **accepted c1 / t06-s3-f1** with
[independent acceptance](../evidence/t06-s3-coordinator-review.md):33/33owning
+169/169unchanged regressions,zero fail/skip; clean171source locked reproduction,
98identical compiled files and269stable hashes. [S3 handoff](../handoffs/t06-s3.md).
ALL S3 source/helper/build/install/target/fixture/rerun windows CLOSED; Developer/QA
HOLD ALL. Frozen [S3 work order](t06-s3-work-order.md) and relay language remain
historical, superseded by acceptance closure without frozen byte changes.
S1/S2 remain accepted/closed; S4 subsequently assigned above; S5 unassigned. Parent T06 incomplete, T07/T08 blocked;
no actual writes, release, whole-task grant or automatic successor/context renewal.

### Accepted S2 prerequisite (historical grants closed)

User authorized **T06-S2 only**, now **accepted c2 / t06-s2-f1** with
[independent acceptance](../evidence/t06-s2-coordinator-review.md): owning40/40
+unchanged regressions129/129,zero failures/skips; clean161-source locked
reproduction,96identical compiled files and257stable frozen hashes.
[S2 handoff](../handoffs/t06-s2.md). All S2 source/build/target/fixture/relay/rerun
windows CLOSED; Developer and QA HOLD ALL actions. Frozen opening/repair/relay
language is historical, superseded by acceptance closure without byte changes.
At S2 closure S3–S5 were unassigned; S3 now separately accepted above. No automatic
successor or whole-task grant.

The frozen [S2 work order](t06-s2-work-order.md) settles version2 private state and
the refresh-only API. Its temporary pending refusal stays unchanged; S3 now supplies
accepted explicit recovery. Parent T06 incomplete, no browser/browsing unlock or writes.

The accepted [S1 work order](t06-s1-work-order.md) settles the version1 private
vault, exact expiry handling, initial installation and read-only T05 hooks.
**S1 is accepted c2 / t06-s1-f1** with
[independent acceptance](../evidence/t06-s1-coordinator-review.md):51owning +399
unchanged regressions,zero skips; clean155-source locked reproduction,94identical
compiled files and249stable hashes. Initial QA regression failure is retained;
focused16/full399rerun passed after corrected sibling HOME/TMPDIR fixture layout,
without source/oracle change or waiver.

All S1 source/build/target/fixture/relay/rerun windows remain CLOSED.
[S1 handoff](../handoffs/t06-s1.md). Its opening-state text and relay grants remain
historical, superseded by acceptance closure; the new S2 order alone supplies
historical permissions only. S2 is now separately accepted/closed. No recovery/
retry/lifecycle grant, actual writes or automatic successor. Parent T06 remains
incomplete; T07/T08 remain blocked on parent acceptance.

## Proposed bounded slices

These are recorded planning proposals under the user-approved
[bounded-work policy](../agent-coordination.md#standing-bounded-work-and-context-safe-slicing-policy),
not whole-task execution grants. T06-S1–S4 are accepted and all their windows
are closed; S5 remains unassigned/unstarted.
Authorize one slice at a time after a concise
decision-ready coordinator contract; no automatic successor.
Reuse the accepted [T04 storage handoff](t04-private-storage.md#accepted-handoff)
and [T05 transport handoff](t05-backend-transport.md#handoff).

S1 interfaces/version1 vault are settled in its frozen work order. Before each
later slice, settle its additional vault version/API, transport hook behavior,
refresh transitions and trusted transition/error semantics.
Hold specifically unresolved behavior; Developer chooses private implementation
internals and QA chooses independent minimal checks. No broad design round is
required. Each slice must preserve safety while later functionality is incomplete.

| Slice | Bounded outcome | Target working window |
| ----- | --------------- | --------------------- |
| T06-S1: Session state and fences (accepted) | Versioned private credential state; exact expiries; service-confirmed grant installation; captured identity and transport binding hooks. | 60–90 min |
| T06-S2: Durable refresh rotation (accepted) | Serialize refresh within the exclusive profile owner; durably persist exact predecessor token/body/auth key before dispatch; atomically install the returned same-account grant before clearing evidence. | 60–90 min |
| T06-S3: Restart and uncertain-refresh recovery (accepted) | Exact replay after lost response/restart; persist a recovered expired-access/current-refresh grant before a distinct rotation; invalid/legacy expiry responses fail closed without rounding, rekeying or deleting recovery material. | 60–120 min |
| T06-S4: Authenticated request orchestration (accepted) | At most one refresh-and-retry after a resource 401; unchanged method/route/body/resource key; concurrent callers share serialized refresh; repeated 401 requires reauthentication. | 60–90 min |
| T06-S5: Trusted lifecycle and race closure | Fence-first local sign-out; trusted same-origin/same-account replacement; best-effort dedicated logout; preserved account-bound operation evidence; suppress stale read/write/refresh delivery. | 60–90 min |

Window targets are not guaranteed acceptance times. Independent review, repairs
and final integrated acceptance need additional time within the rough overall
estimate, which may grow if defects or provisioning blockers appear. Checkpoint
at 90 minutes; stop at two hours with a partial/blocked handoff if not accepted.
Do not rush or weaken checks to fit a window; continue only through an explicit
bounded continuation grant.

### Integration and acceptance boundaries

- S2 pending refusal remains; S3 explicit recovery is now accepted. S1–S4 are partial
  internal capabilities, not a complete safely authenticated server; lifecycle
  guarantees and combined race closure remain required in S5.
- Use small specification-derived checks for each new outcome: state/expiry and
  fence validation; durable exact refresh identity and serialization; representative
  loss/restart recovery; resource retry identity; sign-out/replacement races.
  Reuse simple isolated storage/provider and HTTP fixtures rather than a new
  general harness. Do not rebuild accepted T04/T05 tests inside T06.
- Each slice needs independent acceptance on a frozen artifact and a concise
  handoff. Failed/unfinished checks leave the slice partial/blocked, not done.
  Slice acceptance alone does not mark T06 done or unlock T07/T08.
- Final T06 acceptance requires the complete active T06 suite, relevant unchanged
  foundation/T03/T04/T05 regressions and required integrated persistence/transport
  evidence. Specify the exact final selection and clean locked reproduction
  requirements in the work order; no whole-repository pass claim by implication.
- Browser login (T07), MCP/CLI wiring, writesEnabled integration, operation-journal
  implementation (T09) and real backend/browser/host/release proof are outside
  these slices. T06 preserves opaque operation evidence; it does not own its format.
  Actual writes stay disabled except explicitly isolated fixtures.

## Deliverables

- Implement service-confirmed account installation, exact expiry storage, session generation capture and pre-send/pre-delivery fence checks.
- Persist predecessor refresh token/body/key before dispatch; serialize refresh across calls and profile owners. Commit returned grant before clearing pending evidence.
- Recover lost refresh with unchanged evidence; persist replayed expired-access/current-refresh grant before a distinct serialized rotation. Never rekey an uncertain consumed-token attempt.
- Allow at most one refresh-and-retry per resource request; preserve resource identity. Repeated 401/invalid refresh returns reauthentication_required, not account deletion.
- Provide trusted sign-out/reauthentication primitives: fence first, clear usable local credentials, best-effort dedicated-session logout, preserve account-bound journals. No new account/origin adoption.
- Keep auth recovery evidence separate from operations and outside logs/model/browser. Bad legacy expiry replay fails closed rather than rounding.

## Acceptance criteria

- Concurrent refresh and crash/lost-response tests prove one attempt and exact predecessor replay.
- Race sign-out/session replacement against read/write/refresh results; no stale delivery or new-account installation.
- Unknown/revoked/expired credentials preserve domain recovery material and do not trigger interactive login or deletion.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

A03-A08/A10, auth aspects of R04/R12.

## Handoff

### Accepted S1 checkpoint

Read [S1 handoff](../handoffs/t06-s1.md) and [acceptance](../evidence/t06-s1-coordinator-review.md).
New production src/auth/ (five modules), S1 ADR and bounded compatibility notes;
independent test/unit/t06 and test/fault/t06 sources; coordinator work-order/
reviews/relay/clean-reproduction evidence. Accepted only initial state/install/
read-fence hooks, not refresh/lifecycle or a complete authenticated server.
Pinned install/production/source checks and450selected tests PASS,zero skips;
all first failed reviews/runs remain historical. No S1 blocker remains. The S1
checkpoint opened no successor; the subsequent explicit user assignment now opens
S2 only through its new work order. No parent completion, actual writes, .pi
changes or staging/commits.

### Accepted S2 checkpoint

Read [S2 handoff](../handoffs/t06-s2.md) and [acceptance](../evidence/t06-s2-coordinator-review.md).
Additive refresh facade/v2 codec/exports and owned ADR/compatibility notes;3independent
S2 QA suites, unchanged S1/helpers preserved. QA40+129PASS; clean161-source locked
reproduction/four production checks/same169tests/scoped QA quality PASS,96compiled
files identical and257hashes stable. Small isolated import smoke/source audit PASS,
not comprehensive sandbox proof. Prior source rejections and Developer diagnostic
deviation remain preserved. ALL S2 grants CLOSED, agents HELD. No S3/parent completion.

### Accepted S3 checkpoint

Read [S3 handoff](../handoffs/t06-s3.md) and [acceptance](../evidence/t06-s3-coordinator-review.md).
New src/auth/recover.ts + additive auth index/type, owned ADR/compat notes;
independent4new S3 QA source/helper files and evidence. Exact replay/persist-before-
distinct-rotation, bounded no-pending gap, shared cancellation and retained evidence
accepted internally. QA33+169PASS; clean171source locked install/four production
checks/build/SAME202tests/scoped QA quality ALLPASS,98identical compiled files,
269stable hashes. Small seven-export smoke/source audit green, not comprehensive
sandbox/crash/power-loss proof. Source failures/process deviations retained.
ALL S3 grants CLOSED, agents HELD. S4/S5 unassigned; parent/T07/T08 not complete.

### Accepted S4 checkpoint

Read [S4 handoff](../handoffs/t06-s4.md) and [acceptance](../evidence/t06-s4-coordinator-review.md).
New authenticated-request source/additive export/types, owned ADR/compatibility notes;
four NEW S4 QA files and independent source/fixture/oracle repairs. Exact401 identity/
shared auth/recovery/bounded stages/durable fences/safe errors accepted internally.
QA33+202PASS; clean189source locked install/four production checks/build/SAME235tests/
scoped QA quality ALLPASS,100identical compiled files,289stable hashes. Small8export
smoke/source audit green, not sandbox/power-loss/backend/lifecycle proof. Prior f1/f2
failures/TWO irretrievable f2 observations/review misses/clean npmrc failure retained.
ALL S4 grants CLOSED, agents HELD; S1–S4 accepted/closed, S5 unassigned.
Parent T06 incomplete/T07/T08 blocked. No actual writes or automatic successor.

On eventual parent completion, document refresh state transitions, fence points,
same-account recovery behavior and pending evidence version.

On completion append: changed paths; exact safe commands and pass/fail results; versions;
remaining blockers/limits; next-agent integration notes. Update the task index. Do not
record credentials, identifying production data or raw private request/response bodies.
