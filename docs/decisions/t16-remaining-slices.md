# T16 remaining slices after S3

**Authority:** user, 2026-10-16: “ok settle the remaining work slices and start
at the first one”, then separately “go ahead with the next slice”.
[S4](../evidence/t16-s4-review.md), [S5](../evidence/t16-s5-review.md),
[S6](../evidence/t16-s6-review.md) and [S7](../evidence/t16-s7-review.md) are complete.
User assigned S7 on2026-10-17; all S1–S7 and integrated parent T16 are now
accepted/closed. The authorized S6 backend repair remains unchanged. No successor,
enablement or release grant follows.

Normative: current shared MCP draft0.2 acceptance/authentication/routine-creation,
backend v1 acceptance/authentication/service-protocol/domain/sync/account-lifecycle,
[T16](../tasks/t16-backend-interoperability.md), accepted S1–S3 reviews and
[proportional testing](proportional-testing-policy.md). Component evidence remains
component evidence; doubles do not close an actual-service or Android gate.

## Coverage reconciliation and slice boundaries

| Slice                                                         | Reviewable outcome and remaining requirements                                                                                                                                                                                                                                                                                                                                                                             | Existing evidence to reuse                                                                                                                                                                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S4 — auth recovery and creation decisions (complete)**      | A05 authentic expired-access/current-refresh replay, durable recovered install before distinct rotation; C04 visibility/reference rejection; C05 terminal rejection under live auth; C06 normalized identity/conflict; C07 concurrent identical/conflicting delivered calls; C08 distinct explicit creation. Include R07 actual populate rejection and R08 actual root collision.                                         | S1 C01/C02 mapping, saved repeats and per-step response loss; S2 A03/A04/A06 refresh/restart/fences; T04/T09/T11/T15 process ownership and validation.                                                                                              |
| **S5 — crash, cancellation and uncertain results (complete)** | Close real-service R01/R03 persistence boundaries at each of draft/populate/save; R04 receipt persisted/lost MCP result; R05 pre-admission and each dispatched-stage cancellation; representative R02 malformed/uncertain response and R06 bounded failure/retry with exact identity; remaining R07 save rejection and R08 key-reuse/response mismatch.                                                                   | S1 independently proves all three commit/response-loss replays and DB/batch counts; S2 representative backend restart; T11 crash hooks and T15 delivered cancellation/result-loss helpers. No repetition of the full service-restart cross-product. |
| **S6 — other-client races and lifecycle (complete)**                     | Real edit/delete before explicit resume (R09), race after advisory GET (R10) with last-write-wins and truthful saved-shape conflict; remaining A07 local response/generation fences, A08 matching vs different verified binding and A10 authoritative deletion; R11 corrupt/stale recovery fails closed and R12 retention/minimization/retirement/deletion, using accepted local evidence where the requirement is local. | S2 actual logout/account-disable serialization is complete; disable is not deletion. T04/T06/T09/T11/T12 already cover local persistence/retirement/cleanup: add only missing real-service compositions.                                            |
| **S7 — Android and parent acceptance (complete)**                        | Isolated Android normal sync observes final saved routine with exact root/child IDs/order; reconcile every owned scenario M04–M09/A03–A10/C01–C08/R01–R12 against evidence and close integrated T16 acceptance. Carry the S3 codec repair and S6 backend timestamp repair in the verified candidate; record versions, relevant regressions and owned cleanup.                                                                                                 | S1 ordinary pull/snapshot already observes draft and saved publication; S3 read/filter/paging/visibility/numeric/live-expiry evidence is complete for its representative boundaries.                                                                |

Four remaining scopes are used because the concrete crash and lifecycle obligations
should not be promised inside one window. These are 60–90-minute targets with a
90-minute checkpoint and two-hour stop, not completion guarantees. A partial slice
gets an honest handoff; no automatic continuation or successor. Repairs can affect
the estimate, never the required checks.

## Common interfaces, evidence and limits

- Reuse the guarded actual-backend/PostgreSQL launcher, private provider/ext4/TLS,
  compiled MCP and official SDK. Node24.21.0/npm11.19.0, Java27 and backend Maven lock
  remain pinned; no install/build during target execution.
- Public behavior is settled by the shared contracts. Exact method/route/body/key,
  UUID and normalized-operation identity remain stable. Independent DB roots,
  children/revisions/replay records/sync batches establish effects; messages alone
  cannot prove no duplication, rollback or settlement.
- Keep small fixtures and selective relevant regressions; no generalized fault
  framework or exhaustive Cartesian campaign. Mandatory per-step crash/fault
  requirements remain per-step. Record partial scenario coverage honestly.
- Preserve original backend/Android checkouts outside the recorded S6 repair, historical evidence, .pi, manifests,
  shared contracts and personal/live resources. No new dependencies, staging,
  commits, deployment, Google/browser or production writes. Each slice records its
  exact source-edit grant before test/product changes. Narrow reproducible product
  defects may receive recorded repair scope, never contract relaxation.
- Android requires separately authorized isolated emulator/device, app build,
  synthetic account/session and ordinary sync access. A missing safe setup blocks
  Android evidence; neither a backend snapshot nor a mock is a substitute. T17,
  T19 and independent T20 remain separate gates.
- Stop affected work for unresolved contract behavior, unsafe/unowned inputs,
  missing private secret facility, unsafe logging or time limits. Continue unrelated
  authorized work; report external needs using placeholders only.

Each slice delivers scoped runnable checks, sanitized stable-target/artifact/version
and results evidence, review, cleanup, handoff and task/status updates. S7 alone may
close the parent after every required gap has evidence and relevant regressions pass.
