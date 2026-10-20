# T11 local recovery evidence matrix

All cells below passed the stable workspace and identical clean selections in the
[S3/parent review](t11-s3-review.md). This is local
engine/storage/HTTP evidence; real backend roots/children/revisions/sync batches,
Android effects and delivered MCP response loss remain T15/T16 gates.

## Each transaction's required boundaries

`test/fault/t11/s3-crash-matrix.test.mjs` parameterizes exactly these12 required
cells, plus one second-process owner-exclusion check. Each cell starts from a real
admitted journal and executes prior steps through actual T09/T10/T06/T05 HTTPS.
The child opens the real encrypted diagnostic T04 store/auth/repository/executor;
parent verifies zero startup HTTP before explicitly allowing work.

| Boundary | draft | populate | save | Evidence / required invariant |
| --- | --- | --- | --- | --- |
| Admitted, target step unsent | PASS | PASS | PASS | Separate-process local probe/reopen preserves original encrypted journal hash; startup sends nothing; explicit continuation keeps identity. |
| Dispatch marker durable, before wire | PASS | PASS | PASS | Child exits73 at after-dispatch-mark; retained step pending; repeat begins with original mutation, not GET settlement. |
| Reply received, before confirmation | PASS | PASS | PASS | Child exits73 at before-confirmation; simulated backend state may have advanced; exact original request/key replays, no replacement root. |
| Confirmation durable, before next send/result | PASS | PASS | PASS | Child exits73 at after-confirmation; repeat skips confirmed steps; pending dependent work uses advisory GET; save history returns original saved result. |

Nine abrupt client exits occur only at awaited durable checkpoints. T04 holders
drain on IPC disconnect; the fixture waits for the observed owned holder to exit
before reopening. The separate-process contention case proves actual flock rejection
with no network. This does not establish physical power-loss durability.

Every observed domain request matches the originally persisted method/concrete
route/exact body bytes/resource key. Repeated draft dispatch uses the same root
identity/key; it is not evidence of two DB roots. Scripted HTTPS cannot establish
backend idempotency, independent DB counts or sync batches. T16 must prove those.

## Requirement ownership and representative checks

| Requirement | Local evidence | Remaining external/integration boundary |
| --- | --- | --- |
| C05 / R04 terminal repeats | S2 service suites: saved/rejected receipts, original results across reopen/deletion, fresh live authorization/401 recovery; S3 save after-confirmation exit | T15 delivered MCP result loss; T16 backend/Android history |
| C07 concurrency | S1 whole-handle exclusion; S3 concurrent identical/changed service calls; actual second-process owner exclusion; unchanged T09 storage/operation regressions | T15 MCP concurrent calls; T16 real effects |
| R01 persisted-before-send | All three unsent/after-dispatch-mark cells, no startup continuation | Real DB root/batch inspection; physical power-loss remains a separate limit |
| R02 uncertainty / exact replay | All three before-confirmation cells; S1 malformed populate/reopen; S3 actual socket loss/timeout and 500/503 stops then explicit replay | T16 independently observed commits, duplicate revision/batch absence |
| R03 confirmed-before-next | All three after-confirmation cells; S3 actual resumed advisory GET edit/delete checks | T16 actual other-client/Android edits |
| R05 cancellation | S3 after-wire abort at each stage; S1 acknowledged-history cancellation; unchanged T09 pre-admission/queued/commit cancellation and T06 fences | T15 MCP cancellation delivery; T16 effects |
| R06 bounded retry / Retry-After | S3 T06 one-attempt resource cap, 429/503 whole Retry-After beyond budget, no outer retry; unchanged T05 direct retry/deadline24 checks and T06 one401 refresh | No broader automatic transient retry policy is delivered; explicit identical call required |
| R07 permanent rejection | S2 durable populate rejection/receipt, S3 failed terminal-write exact replay with no dependent save, unchanged T10 save/populate rejection decisions | T16 actual domain rejection effects |
| R08 identity / malformed response | S1 pending malformed response, all crash identities; unchanged complete T10 confirmation/error and T09 format/identity suites (collision, key mismatch, lossless Int64, alternate bytes) | T16 backend UUID/idempotency collisions |
| R09 detected edits/deletion | S3 real authorized GET response divergence and404 stop without further mutation; S1 decision checks | T16 actual Android editing/deletion |
| R10 advisory race | S3 valid changed-content save yields durable confirmed-save conflict and compact original receipt; unchanged T10 real TLS saved-content race | Backend remains last-write-wins; no CAS/account-wide lock claim |
| R11 storage integrity | Unchanged T09 S3 persistence/transition and T04 accepted evidence; S2 receipt commit faults; S3 confirmation/terminal faults | T04 whole-protected-state restore limitation and physical power loss remain |
| R12 retention / minimization | S2 definitive body/key erasure, uncertain terminal retention; S3 failed terminal-write stays unminimized; T09 explicit retirement reserves ID; S2 service retired-ID failure; source review finds no operation expiry/TTL/eviction worker | T12 trusted retirement/sign-out/profile removal/account deletion, T18 operator guidance; no time-based operation expiry added |

The matrix intentionally uses one representative HTTP/commit failure per named
risk in addition to the required per-step boundaries, without a Cartesian product
of failure type × transaction × auth/provider state. Existing tests remain active;
only the T10 exact barrel-export list is adapted for the settled additive service API.

## Safe focused command

With provisioned Node24.21.0/npm11.19.0 and completed production build:

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
node node_modules/vitest/vitest.mjs run --no-file-parallelism \
  test/fault/t11/s3-crash-matrix.test.mjs \
  test/fault/t11/s3-failures.test.mjs
```

These28 checks use only freshly issued diagnostic facilities and private-CA loopback
HTTPS. The complete integrated selection also contains real production-provider
suites and must run inside the qualified private isolation runner described in S3
review. No personal provider/backend/DB/Google/Android or real credentials are used.
