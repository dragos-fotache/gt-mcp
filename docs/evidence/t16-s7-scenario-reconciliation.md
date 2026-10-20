# T16 integrated scenario reconciliation

**Accepted with S7 and parent T16 on2026-10-17.** All34 owned scenario IDs and
the ordinary Android cross-project gate are reconciled below. Fresh full owning
and relevant regression checks pass in workspace and clean reconstruction;
[S7 review](t16-s7-review.md) records exact counts, candidate identity and cleanup.
Accepted older component/slice references retain their original limits; this does
not claim every historical suite was rerun or waive T17/T19/independent T20.

Normative [MCP scenarios](../../shared-docs/docs/mcp-contract/acceptance-scenarios.md),
[backend scenarios](../../shared-docs/docs/backend-contract/acceptance-scenarios.md)
and [S7 work order](../tasks/t16-s7-work-order.md). Counts belong to individual
reviews/results; do not sum repeated runs as distinct coverage.

| Scenario | Specification-derived evidence | Boundary/limit |
| --- | --- | --- |
| M04 | [S3](t16-s3-review.md): real catalogue/custom mixed-case search, OR within/AND across muscle/equipment categories, usable IDs/catalogue version | Representative combinations, not exhaustive filter permutations |
| M05 | [S3](t16-s3-review.md): own/foreign/missing exercise/routine/workout, own draft read, saved-only routine list | Foreign and absent results do not disclose ownership |
| M06 | [S1](t16-s1-review.md) default20/multiple pages; [S3](t16-s3-review.md) explicit1/200 and active/finished workout lists | No automatic exhaustive traversal |
| M07 | [S3](t16-s3-review.md): same-context signed continuation after real refresh; changed filter/limit/endpoint/account reject | No silent restart or account reassignment |
| M08 | [S3](t16-s3-review.md): fixed authentic expiry at +10/+16 minutes and real insertion/edit/deletion between pages | Disposable backend-owned Clock overlay; live keyset membership, not frozen snapshot |
| M09 | [S3](t16-s3-review.md): exact numeric HTTP tokens above2^53 through Int64 maximum; [T03](t03-coordinator-review.md) lossless decoding | Isolated SQL sets revision boundaries; no production revision-generation claim |
| A03 | [S2](t16-s2-review.md): concurrent delivered reads share one actual refresh; [T04](t04-coordinator-review.md) kernel process ownership; [T06](t06-s4-coordinator-review.md) rotation ownership | Actual database auth replay/current-family oracle; process exclusion is local component evidence |
| A04 | [S2](t16-s2-review.md): lost real refresh response, MCP/backend restart, exact predecessor/body/key and original returned grant/deadlines | No startup/autonomous refresh |
| A05 | [S4](t16-s4-review.md): recover expired original access/current refresh, acknowledge original grant before distinct rotation | Backend-owned Clock/trusted local clock options; compiled MCP reopens settled state |
| A06 | [S2](t16-s2-review.md) real401/refresh/revocation; [T06](t06-s4-coordinator-review.md) one retry/second401/invalid-refresh decisions | Generic auth failure preserves evidence; no inferred deletion |
| A07 | [S6](t16-s6-review.md): held genuine responses fenced by local generation; [S2](t16-s2-review.md): real logout/disable versus in-flight transaction | Already committed effects remain possible; no rollback |
| A08 | [S6](t16-s6-review.md): exact same-account explicit recovery, foreign binding refused; [T12](t12-s4-review.md): origin/profile/session replacement fences | Grants synthetic/actual refreshed service sessions; live Google remains T19. Same-Google replacement account is governed by different backend account binding |
| A09 | [T04](t04-coordinator-review.md) restricted/encrypted stores, [T05](t05-coordinator-review.md) origin/redirect/TLS safeguards, [T15](t15-s3-review.md) framed stdout/sanitized errors, S1–S7 private runner guards/cleanup | No credential/body/identifying query in ordinary output; private raw logs are erased, not public evidence. V8/same-UID/media limits persist |
| A10 | [S6](t16-s6-review.md): actual signed active/foreign/deleted status, exact matching-account cleanup with B unchanged; [T12](t12-s4-review.md) local proof/removal safety | Test-only external certificate source; real verifier/transactions. Purge intent/status, not completed physical purge or transcript wipe |
| C01 | [S1](t16-s1-review.md): actual draft/populate/save, distinct step keys, root/child IDs/order and DB revision/replay/batch oracle | S7 adds actual Android consumption; no workout mutation |
| C02 | [S1](t16-s1-review.md): literal null/zero/default/empty-set/repeated-reference mapping; [T03](t03-coordinator-review.md) schemas; [S7 native result](t16-s7-native-results.json) | Names preserved; only allowed write fields |
| C03 | [T03](t03-coordinator-review.md), [T09](t09-s3-review.md), [T15](t15-s3-review.md): invalid inputs and strict file policy deny before admission; [S4](t16-s4-review.md) no reservation for invalid reference | These are local validation/policy requirements, requiring no actual backend mutation; focused unchanged policy regressions selected for S7 |
| C04 | [S4](t16-s4-review.md): invisible precheck and actual reference deletion after precheck; backend422 authoritative | One partial draft retained; no ownership disclosure |
| C05 | [S1](t16-s1-review.md) saved repeat; [S4](t16-s4-review.md)/[S5](t16-s5-review.md) terminal populate/save rejection repeat under live auth | Original receipt/rejection, no new root/key/mutation; [T11](t11-s3-review.md) local terminal privacy |
| C06 | [S4](t16-s4-review.md): changed intent conflicts; reordered object keys/defaults normalize identically; [T03](t03-coordinator-review.md) identity boundaries | No overwrite of admitted intent |
| C07 | [S4](t16-s4-review.md): concurrent identical/conflicting delivered calls; [T04](t04-coordinator-review.md)/[T09](t09-s3-review.md) cross-process exclusive ownership; [S5](t16-s5-review.md) process reopen/exact outcome | One stream/root; second profile process cannot rotate/execute concurrently; same explicit identity recovers after owner release |
| C08 | [S4](t16-s4-review.md): same content/distinct operation creates two explicit roots and six distinct keys | No fuzzy deduplication or automatic new identity on uncertainty |
| R01 | [S5](t16-s5-review.md): acknowledged persisted dispatch-possible then process exit before send, independently draft/populate/save | Drained acknowledged-commit boundaries, not physical power loss inside storage commit |
| R02 | [S1](t16-s1-review.md): genuine commit/response loss at each draft/populate/save; [S2](t16-s2-review.md) representative backend restart; [S5](t16-s5-review.md) malformed/mismatched successful wire | Exact replay/DB counts; [T11](t11-s3-review.md) timeout/uncertain local decisions. No exhaustive fault × restart cross-product |
| R03 | [S5](t16-s5-review.md): persisted confirmation then process exit at each draft/populate/save, no startup continuation | Exact remaining steps; actual DB prefix; before-unsent advisory read |
| R04 | [S5](t16-s5-review.md): actual save/compact receipt durable, final MCP reply lost, reopen returns exact original without new effects | Final-receipt boundary; [T11](t11-s3-review.md) per-step retained confirmation. Later remote edit/delete does not rewrite immutable local history |
| R05 | [S5](t16-s5-review.md): pre-admission abort and each actually dispatched/committed stage canceled | Accurate retained prefix/uncertainty; no dependent send or rollback |
| R06 | [S5](t16-s5-review.md): explicit injected429/Retry-After exceeds budget, exact explicit recovery; [T05](t05-coordinator-review.md)/[T11](t11-s3-review.md) transient/offline retry decisions | Relay429 is a labeled fault, not actual backend rate limiting; no autonomous worker |
| R07 | [S4](t16-s4-review.md) actual populate rejection; [S5](t16-s5-review.md) actual save rejection | Original terminal replay retained, no altered-key retry or rollback |
| R08 | [S4](t16-s4-review.md) actual root collision; [S5](t16-s5-review.md) actual reused key plus malformed/unrelated-target real commit response | No regenerated UUID or fabricated confirmation |
| R09 | [S6](t16-s6-review.md): real second-session draft edit/delete before explicit resume | Second HTTP client exercises same service conflict boundary; no Android UI edit journey claimed |
| R10 | [S6](t16-s6-review.md): real second-client PUT after advisory GET; LWW and confirmed-save shape conflict | No CAS or rollback illusion; independent persisted children/history |
| R11 | [T04](t04-coordinator-review.md)/[T09](t09-s3-review.md) encrypted state/key/version/stale-anchor checks; [T18](t18-s3-review.md) installed same-format preservation/incompatible refusal; S6 unchanged persistence replay | Local recovery requirement; protected-state whole rollback/same-UID/media limits remain explicit |
| R12 | [S6](t16-s6-review.md): retained pending identity through sign-out/reauth, retirement without remote mutation, actual authoritative deletion; [T09](t09-s3-review.md)/[T11](t11-s3-review.md)/[T12](t12-s4-review.md): minimization and generation fences | No operation-age/TTL branch; beyond30days is invariant/component proof, not31-day elapsed service run; no offline remote wipe |
| Cross-project ordinary Android sync | [Workspace](t16-s7-native-results.json) and [clean](t16-s7-clean-native-results.json) native XML; full owning/clean gates pass | Empty baseline, three actual creation batches, exact saved graph and stable repeated sync verified on owned emulator; integrated parent accepted |

All required service outcomes are supplied by real isolated backend/PostgreSQL;
only external credentials/certificates and declared faults/Clock boundaries use
fixtures. Google/browser/T19, named Pi/T17, independent security/release/T20,
deployed TLS and personal/live environments remain separate gates. T18's older
archive remains historical: S7 verifies the source-built candidate containing the
S3 codec and S6 backend repair, without claiming a newly released package.
