# T21-S5 scenario reconciliation

Authority: shared MCP draft0.3, unchanged backend v1 and T21 successor interfaces.
Historical T16/T17 acceptance remains evidence for its original artifacts only.
This is an explicit replacement of retired requirements, not hidden exclusions.
Original source bytes are preserved in [the manifest](t21-s5-original-source-manifest.json)
and its review-only archive. Runtime acceptance/results are recorded separately.

| Requirement / original cases | Current evidence and disposition |
| --- | --- |
| C01/C02/C05, M04–M06: ordered graph, defaults/null/zero, visibility, paging, sync | `creation-replay` retains independent DB and ordinary pull/snapshot graph/history oracles. Saved repeat now creates a second distinct root/family/keys and leaves the original aggregate unchanged. |
| R02/C12: three per-step lost-response/restart exact creation replay cases | Retire cross-invocation exact replay/receipt identity. One lost populated response retains the actual committed draft, truthful non-retryable context, own-draft visibility and saved-only listing; restart sends nothing, deliberate new call allocates fresh work. SDK final-loss case covers the saved boundary separately. |
| A03/A04/A06/R02: concurrent authoritative401, in-call resource retry and lost refresh across MCP/backend restart | `auth-restart` retains exact original refresh token/body/key/grant and independent rotation/session DB evidence. One real draft401 after exercise precheck also proves exact in-call method/route/body/key identity with one refresh and only three committed domain steps. These auth requirements are not retired. |
| A05: expired returned grant is durably installed before distinct new rotation | `creation-decisions` retains authentic fixed-clock/backend-restart test, acknowledged vault observations and real DB family/rotation checks. Clock is a declared test-only backend overlay. |
| C04/R07: invisible/deleted reference, populate rejection, corrected input | Keep precheck and actual backend422 boundaries; stop before save, retain the committed draft. Repetition revalidates live references/auth; corrected new input creates a fresh root instead of returning a permanent local rejection. |
| C05–C08: concurrent normalized ID deduplication/conflict/reservation | Retire operationId/shared stream/operation_id_reused. `creation-decisions` uses concurrent identical calls with independent roots/keys, then changed valid content as another call; obsolete operationId is rejected without mutation. Pi repeats/changed input likewise produce independent families. |
| R08: root collision/backend key reuse | Keep actual backend409 proof and no replacement identity/dependent sends within that invocation. A later explicit call is fresh; no permanent local collision receipt. |
| R01/R03: six durable-dispatch/confirmation process checkpoint combinations | Retire exhaustive persisted journal/resume matrix. Two fixed public draft-call boundaries stop before send and after actual draft response. Credentials settle before deliberate process exit; reopen does nothing, old draft stays intact, next call is fresh. No SIGKILL, power-loss or credential-commit crash claim. |
| R04: lost final saved MCP delivery | `crash-cancellation` drops the actual SDK result after the real save; DB shows saved graph. Exact credential ciphertext/file set is unchanged. No local receipt; restart is idle and an explicit call creates another routine. |
| R05: three per-step SDK cancellation/recovery cases | Retire exact recovery assertions. Representative pre-dispatch cancellation sends nothing; SDK cancellation after real populate commit closes downstream request, stops save, leaves draft unchanged. New call is fresh. Complete current creation/stdio regressions retain local cancellation/shutdown boundaries. |
| R06: exhausted Retry-After | Relay explicitly injects429/60 seconds; the six-second invocation budget is not shortened or bypassed. Final error is retryable:false. No DB effect/persisted creation state; restart is idle and a deliberate new call uses a fresh root/key. Existing within-call HTTP/auth retry identity checks remain in the selected creation suites. |
| R07: save rejected after other-client clears draft | Keep actual backend422 and independent committed graph/history. No restore/rollback; corrected new call leaves the prior draft alone. Retire saved local rejection repeat. |
| R08: malformed/wrong-target genuine success | Relay deliberately corrupts the response after real backend commit. Keep uncertainty/no false confirmation/no dependent mutation and credential-only persistence. Retire later exact replay settlement. |
| R09/R10: edit/delete before resume and after advisory GET | Retire nonexistent restart-baseline/advisory-GET requirement. `races-lifecycle` deletes this invocation's root before populate/save and edits before populate/save. Preserve real backend LWW/rejection/confirmed saved-content conflict and unrelated aggregate checks. No automatic restoration. |
| A07/A08/R12: held real read/write during local sign-out | Keep obsolete-generation result suppression, unsent-step fence, credential removal and atomic generation change. A committed draft remains. No operation-store preservation oracle. |
| A08: different account / fresh same-account grant after uncertainty | Keep refusal of foreign-account adoption without changing vault. Same-account login advances binding atomically; restart sends nothing and a fresh call leaves old uncertain work intact. |
| Retire-operation/retirement tombstone case | Retired entirely: draft0.3 and S4 remove that API/command. No replacement tombstone requirement; strict auth-vault/file set plus byte-identical credential ciphertext across creation establishes no creation retention. |
| A10/R12: active/foreign/deleted signed proof and separate profile | `account-deletion` retains real signature/nonce/backend transactions, independent deletion ledger/session observations, no cleanup for active/foreign proof, exact unrelated-profile preservation and selected key removal. Replace external descriptor/anchor/tombstone checks with authenticated binding/single-record cleanup. |
| M01/M02/C09/C10: Pi direct/deferred/codemode, true/false/missing config, schemas/envelopes | All eight Pi cases retained; actual pinned host/default stdio/parser/server, scripted local model only. Creation annotation false and strict schema rejects obsolete operationId. Policy, path/parent IDs, output/envelope and diagnostics checks remain; credential-only inspection replaces receipts. |
| M03–M09 and codec/read/auth safety | Full active current creation/protocol/backend selection plus selected unchanged domain/read/auth suites are enumerated before execution in `t21-s5-selection.json`. Unrelated/parked work is not counted. |

## Explicit remaining gates

- Actual Pi CLI/interactive modes, host reconnect/cancellation/session resume/fork,
  large output/privacy and final T17 acceptance remain in the refreshed remaining
  T17 plan. SDK print and official SDK cancellation evidence do not certify them.
- `android-sync.test.mjs` is preserved unchanged. T16's historical actual Android
  sync evidence remains historical; no current S5 Android run or session is claimed.
  S5 checks actual ordinary backend sync pull/snapshot, not phone delivery.
- S6 owns updated packaging/allowlists, the exact isolated installed candidate,
  locked clean reproduction and T21 parent acceptance. R1/laptop stay unchanged.
- Btrfs testing is user-owned. T19 Google/browser and independent T20 release
  review remain separate. No live enablement, publication or installation here.
