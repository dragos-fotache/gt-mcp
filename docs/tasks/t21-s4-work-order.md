# T21-S4 — Integrate single-record credentials

Assignment: user requested “do s4 too”, 2026-10-17. S1–S4 accepted/closed;
S5 ready/unassigned, S6 held, no automatic successor. Btrfs testing remains user-owned by explicit
instruction; production must not restrict filesystem type.

Outcome: switch storage/runtime/config/setup/login/auth/lifecycle/CLI to the
[accepted successor interface](../decisions/t21-single-record-storage-spec.md).
Config2 rejects config1/descriptor/anchor fields before protected/backend changes.
Fresh explicit setup creates an exclusive root; no old data/key reuse or migration.
Verified binding and vault changes are one atomic record. Preserve foreground login
version4, auth vault1–3, exact pending-refresh token/body/key before dispatch and
returned grant before evidence removal, current binding/session/result fences,
sign-out and authenticated account-status proof/cleanup. Recover validates selected
auth state and directs pending foreground actions; no metadata publication repair.
Explicit local removal supports key-first cleanup retry, without unknown deletion.
Remove obsolete operation retirement/reconcile commands and detached journal/anchor
production code. No optional legacy mode. Keep model tool/auth boundaries unchanged.

Scope: src/storage, runtime/config/read, login, auth and lifecycle, trusted CLI;
affected owning tests/helpers for T04/T06/T07/T08/T09/T12/T15 and read/create protocol/
stdio configuration fixtures; packaging config template and operator/current status
guides. Archive original uncommitted bytes before removing obsolete code/tests;
record path/case dispositions and retained requirement replacements explicitly.
Retain valuable crypto/validation/key/ownership/auth/login/privacy checks; no broad
exclusion or changed oracle to hide a failing retained requirement. Diagnostic
facilities stay separately imported, use only isolated issued synthetic fixtures,
and cannot alter production provider/path policy. Reuse accepted worker/crypto/
file/Secret Service primitives and existing small fixtures; no general test framework.
Preserve unrelated work, historical evidence, parked T02 and .pi. No shared/backend
contract changes, dependencies/compiler relaxations, new delivery archive/install/live backend,
real credentials, laptop changes, staging or commits. S5 backend/Pi and S6 packaging
closure/clean installed reproduction remain separate.

Execution: provisioned disposable Node24.21.0/npm11.19.0 only. Early scoped static
checks, explicit stable builds before focused tests; no rebuild/install while tests
execute. Preserve R1 outside clean build output and restore it unchanged. Reuse private
Secret Service/ext4/HTTPS and actual SDK subprocess fixtures; synthetic writes only.
Full active storage/auth/login/lifecycle owning suites and relevant read/create/
protocol/static regressions on final targets. Isolate terminal locked-provider cases.

Verification risks: old config/profile refusal without changes; setup → synthetic
login → restart → reads; auth login exchange/current-binding/cancel/nonce/origin
checks; uncertain refresh restart uses original body/token/key; generation advance
and sign-out stop stale sends/delivery; account-status only cleans up after matching
fresh proof; explicit removal/retry under ownership; no routine data in persisted
record; schema/CLI privacy/refusal. New S3 format/provider tests remain active.
Retire only specification-retired anchor/journal/descriptor receipt requirements;
keep their history and map surviving safeguards to adapted checks. No Btrfs run or
whole-project/release claim. Deliver evidence, scoped review/status and handoff.

Milestones: production integration + early checks; proportional owning/helper repair;
final full active owning/relevant regressions and closure. Target60–90 minutes,
checkpoint90, stop120 with honest partial handoff. Stop affected work for unresolved
public decisions, required auth weakening, new dependency, unsafe fixture need or
backend/shared contract conflict; continue independent authorized work.

Integration scope reconciliation: retire the single T10 S2 temporary legacy-store
preservation case after removing that store. Retain actual creation behavior and
verify no creation persistence through strict auth-vault decoding plus the complete
credentials.enc/owner.lock file set. Production/diagnostic helpers and scoped test
quality are checked early; exact path/case dispositions record retired requirements.
The store retains the former100ms worker reply margin inside parent IPC deadlines
to report bounded provider failures rather than race a silent bus timeout.

Final shared creation regression reconciliation: T10/T11 inspect now reports the
actual credential file set after strict auth-vault validation, rather than a
retired operation-record list. Retain all creation/restart/identity assertions,
and assert exact unchanged credential ciphertext across two successful fresh calls
without auth refresh. No implementation oracle or empty-list stub is used.

Closure: [accepted review](../evidence/t21-s4-review.md),
[handoff](../handoffs/t21-s4.md). Final808/808 in81 files,569 stable hashes,
176 compiled outputs; production/static/build and owned cleanup pass. Original
retired files/cases are retained in a review-only source archive. No successor,
installation/parent/release claim. Btrfs verification remains user-owned.
