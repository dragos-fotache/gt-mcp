# T16-S5 — Crash, cancellation and uncertain-result boundaries

**Authorization:** user, 2026-10-16: “go ahead with the next slice”, received while
S4 was finishing.
S4 is closed with42/42 and owned cleanup. Primary agent owns S5 only.
Start17:04 UTC; checkpoint18:34 UTC; stop19:04 UTC with owned teardown.
**Disposition:** complete; final54/54,611 stable hashes and owned cleanup PASS.
[Review](../evidence/t16-s5-review.md), [handoff](../handoffs/t16-s5.md).
S1–S5 closed; S6/S7 unassigned, parent T16 incomplete.

## Outcome and normative behavior

Implement the S5 scope from [remaining slices](../decisions/t16-remaining-slices.md).
Current shared MCP draft0.2 acceptance R01–R08/routine-creation/authentication and
backend v1 service-protocol/domain/transaction/sync rules govern. Reuse accepted
T04/T09/T11/T15 contracts and [proportional testing](../decisions/proportional-testing-policy.md).

At each of draft/populate/save, durable identity precedes dispatch and durable
confirmation precedes further work. Process reopening sends nothing automatically;
explicit repeat preserves all UUIDs/methods/routes/body bytes/keys. Confirmed steps
are skipped; uncertain steps settle only by original exact replay. A durable saved
receipt survives lost MCP delivery. Cancellation stops unsent dependent steps but
cannot roll back a committed server prefix. Domain rejection and backend key reuse
remain terminal without altered keys/bodies. Malformed success remains uncertain.
Retry-After is never shortened to fit a deadline; exhausted calls preserve original
pending identity for explicit repeat, with no autonomous worker.

## Scope, fixtures and commands

Edit only test/backend-interoperability/ small helpers, runner, one S5 owning test
file and one fixed checkpoint child/helper; T16 task/plan/evidence/handoff/current
status documents. No product changes unless a concrete reproduced defect receives
recorded narrow repair scope first. No dependency/config/compiler/shared-contract
or historical test changes. S6 races/lifecycle, Android, Google/browser, packaging,
production enablement, .pi, staging/commits and successor execution are excluded.

Reuse the guarded disposable actual backend/PostgreSQL16/private provider/ext4/TLS,
compiled MCP/SDK, retained Node24.21.0/npm11.19.0, Java27 and backend Maven lock.
Original backend/Android inputs stay read-only. Reuse existing backend-owned test
Clock only because the full active owning suite contains S3/S4; S5 introduces no
clock/provider bypass. No rebuild/install while any tests use the target. Allow
scoped syntax/import/lint/format, production checks/build and guarded isolated runners.

Use the existing public creation executor checkpoints in a fixed test child with
real production profile/auth/repository. Input travels through private stdin, never
argv/logs; stdout is a fixed ready/checkpoint marker only. Opening is observed inert
before explicit IPC execution. At an awaited durable checkpoint drain the real
storage owner, then exit the child without advancing the executor. This proves
process interruption between acknowledged commits, not physical power loss or
interruption inside a storage commit. Parent reopens the actual encrypted profile
and uses compiled MCP for explicit recovery; no reconstructed/fabricated journal.

Extend the existing relay only with small after-response gates, cancellation-close
observation and explicitly labeled malformed-body/429 fault switches. Real backend
successful outcomes are always obtained before corruption/cancellation observation;
never invent DB commits. A relay-injected429 is transport-fault evidence combined
with real-service recovery, not a claim that the backend generated a rate limit.
All raw credentials/bodies/resource IDs/private paths stay private. Clean only owned
children/container/control/config/build snapshot/provider/bus/profile resources.

## Small specification-derived acceptance set

1. Six required checkpoint cases: after-dispatch-mark before send and after durable
   confirmation at each of the three steps. Inspect persisted exact requests and
   independent DB prefix; inert MCP reopen, explicit same-operation completion,
   skipped confirmed steps and exactly three final revisions/replay records/batches.
   S1 already covers committed-response loss at every step; no redundant full
   backend-restart cross-product or extra crash phases.
2. Lost final MCP response after real save/receipt persistence: reopen returns the
   exact stored receipt with unchanged independent DB history and no writes.
3. Pre-admission cancellation plus cancellation after each real stage commits while
   its response is held. Observe actual downstream socket closure before attempt
   timeout; check prefix/no dependent work, durable uncertainty, explicit exact
   replay and no duplicate real effects. Every wait/gate is bounded and released
   on failure before closing owned sessions.
4. One injected429 with Retry-After longer than the call budget: no shortened retry
   or server effect; truthful rate_limited fields; explicit repeat uses exact draft
   bytes/key and creates one routine through the real service. Existing T05/T11
   checks cover other error-decision permutations.
5. Actual save validation rejection: after advisory checks, a real fixture PUT
   clears the draft's exercises. Actual save must reject validation_error, preserve
   the other client's committed draft and become stable terminal history.
6. Actual backend idempotency_key_reused: an independent real POST claims the draft
   key for another root first. No replacement key/root or dependent writes.
7. Corrupt genuine committed draft successes at the relay: malformed JSON and,
   separately, valid-shaped JSON with an unrelated target UUID. These exercise
   distinct parser and semantic identity risks. Neither may confirm/advance;
   explicit unchanged replay gets the authentic original result and settles
   without duplicate revisions/batches. Review also requires discarding held
   responses whose downstream socket was already canceled.

Use independent DB counts/children/revisions/replay/sync and public stored-operation
validation, not displayed messages or production-generated expectations alone.
Run early scoped static/import checks, focused S5 qualification, then full active
T16 plus a fixed small relevant unchanged T11 checkpoint/failure and T15 delivered
recovery regression selection. No skipped/missing checks as passes or generalized
interception campaign. Deliver sanitized stable-input/provenance/results/cleanup,
review, handoff and status. Milestones: checkpoint child/gates qualified; focused
core boundaries; final owning/regression acceptance and cleanup.

Stop affected work for contract drift, unsafe/unowned inputs/logging, unresolved
public behavior, unavailable isolated facilities or time limit. Preserve failures,
continue unrelated authorized work and record an honest partial handoff if needed.
Parent T16, S6/S7 and all independent/external release gates remain open.
