# T06-S2 coordinator production review — initial candidate c0

**Disposition: NOT SOURCE-APPROVED; bounded Developer repair required.**
Production readiness/four green checks are self-reported, not independent
acceptance. No frozen artifact or QA execution relay. Coordinator reviewed complete
refresh.ts/vault.ts/index.ts and S2 ADR/compatibility delta against the
[S2 public work order](../tasks/t06-s2-work-order.md) and accepted T04/T05/S1
contracts. QA sources/oracles are not Developer input. No new target execution
or project checks were run during this source review.

## Candidate identity at review

These identify reviewed sources, NOT an executable frozen relay:

| Path                                     | SHA256                                                           |
| ---------------------------------------- | ---------------------------------------------------------------- |
| src/auth/refresh.ts                      | 854199d47544c57388b1d3b952cfe9e35d879617c88c6ade0f8b4c90fa20730a |
| src/auth/vault.ts                        | 5533a9db683e97d73d82df66763b8cd249fc8f600017d0a75569b670520de515 |
| src/auth/index.ts                        | 14f11474d6712772b4a77b3d1233e1cb967a85c19ace3be66ededcc4bde7b6b7 |
| docs/decisions/t06-implementation-adr.md | 7ed773260342a1e468d41d1bbc0ddb91106f9af26c583fa3f6e7358e6d1d823f |
| docs/compatibility.md                    | 9d12c48fab96b18bdfc4b4c154a7068623c894ae1353bc8b2449333a529037c6 |

## Source-supported positive observations (not tested claims)

Additive public exports/versions, no new root/server/CLI wiring; original S1 codec
still rejects version2. Strict v2 grant/predecessor/body-base64/auth-key shape;
read-only open and write-on-prepare upgrade. Actual prepare commit is awaited
before T05 handoff; internal hooks have no shared queue deadlock. One active
rotation/shared outcome, same-account check, joint returned-grant/pending-null
commit, blocked pending and operation-only preservation by vault-only commits.
Source has no top-level network/IO/timers/logging, public grant getter or lifecycle
expansion. None of this substitutes for independent frozen execution.

## C0-1 — Capture complete trusted transport config at entry

refresh.ts621–655 captures top-level entries, then awaits owner.readVaultBytes
BEFORE invoking the T05 factory that copies nested budgets/CA bytes. Caller changes
to those referenced objects/bytes while open is unresolved affect configuration.
This violates required complete entry capture before yielding.

Additionally detachedConfig={} plus indexed assignment gives an own **proto**
field setter meaning instead of preserving/rejecting the unknown field. For
example a data **proto**:null disappears into the detached object's prototype;
T05 can receive an apparently ordinary null-prototype config without that field.
Do not drop unknown data keys or invoke prototype setters during capture.

Use unchanged T05 authoritative validation/copying synchronously before the first
await, or an equivalent complete descriptor-safe detached capture preserving
unknown keys/byte contents and safe T05 errors. Private structure is Developer's
choice; no T05/config/dependency changes. Invalid T05 config with valid state must
propagate safe TransportError, including own-data/accessor/unknown-field rejection.
The common public contract now makes this entry-capture guarantee explicit.

## C0-2 — Expiry check at the actual final commit boundary

refresh.ts954 checks returned refresh expiry BEFORE awaited owner validation at
965 and serialization at972, then commits at973 without rechecking. A grant can
expire while owner validation is unresolved and be installed anyway. Recheck
clock/expiry, abort and fence after validation and serialization, immediately
before invoking final commit. Expired returned refresh keeps exact pending and
reports reauthentication_required, without installation.

Likewise the predecessor check precedes key/body/record serialization before
prepare; ensure its immediate check also occurs after that synchronous work,
before actual prepare commit. Once commit begins it cannot be retracted; do not
turn an already-completed commit into rollback/deletion. No expiry rounding or
new key for an already-prepared uncertain attempt.

## C0-3 — Leader cancellation must await its owned commit

refresh.ts717–718 runs the owner asynchronously but attaches the leader through
the same attachToRotation early-abort waiter as followers. Its onAbort immediately
rejects the public leader promise while runLeaderRotation may still await an
owned prepare/final storage commit. The caller can believe the operation is settled
and close ownership while a durability action or late installation remains active.

Followers may abort their own waits immediately; the leader owns the storage/
network attempt and must await safe owned completion before reporting cancellation
if a commit is unresolved. Keep commit results installed/pending as appropriate,
suppress success, cleanup listeners and settle all owned work. Do not add another
public shutdown/wait seam or force-kill storage. Distinguish leader-owned completion
from follower-local cancellation without changing concurrency/one-attempt behavior.
Common public contract now states this leader-promise obligation explicitly.

## Opening precedence adjudication

No total error order is specified when BOTH config and stored vault are invalid;
any appropriate safe rejection with no mutation/dispatch is acceptable. Unknown
vault version still precedes version-specific state checks, and valid-state/bad-
config preserves the T05 error contract. Thus the reported vault-before-config
priority is not itself a defect, but it does not exempt entry capture C0-1.
No extra multi-fault oracle or broad design round is required.

## Disclosed process deviation

Developer reported one built-entry import-surface listing and retained it in ADR
8.4. The grant prohibited custom runtime diagnostics; build is compilation, not
permission to execute output. Retain the disclosure as a deviation, not behavioral
acceptance/inertness evidence. Do not repeat. Coordinator owns later small isolated
import smoke/source audit; no comprehensive sandbox claim. No reported personal
state or live backend use; that absence is not an OS isolation proof.

## Repair grant and next gate

Developer may repair src/auth/ plus owned ADR/bounded compatibility notes for
C0-1–3 only, choosing internals. Original S1 observable behavior remains fixed.
Run early/final four permitted production checks, no runtime diagnostic/tests/
install/config/manifest/dependency expansion. Report exact changed paths/results,
then HOLD for independent production re-review. Preserve initial readiness/review
and deviation history. No QA private source/oracle reads.

Original90min checkpoint/120min safe-stop applies, not an automatic renewed window;
if time/context insufficient, hand off partial/blocked and await explicit continuation.
QA source gate also has independent r1 blockers and its own scoped repair; no
private details relayed to Developer. Both gates must pass before named frozen
inventory/QA execution. S2/T06 remain incomplete; S3–S5 unassigned. No actual
product writes/live services/.pi changes/staging/commits/publication/release.
