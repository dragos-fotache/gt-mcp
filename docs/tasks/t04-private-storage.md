# T04 — Build protected profile storage and exclusive ownership

> **T21-S1 successor authority (2026-10-17):** T21 replaces the ext4-only external-anchor storage contract; historical acceptance stays closed.
> See the [successor storage/interface spec](../decisions/t21-single-record-storage-spec.md). Documentation only;
> current runtime/package behavior is unchanged until T21 implementation acceptance.

**Status:** done (bounded T04 accepted on t04-f4) · **Owner:** Coordinator; fresh Developer + QA · **Requires:** T01
**Size:** 2-3 sessions

## Outcome

Supply durability/encryption and origin/account/profile-fencing before credentials
or creation. No companion approval store is planned. A profile is local config and
private storage for one origin/account, not a Pi session or new backend entity.

## Current assignment

User authorized starting T04, selected Linux x64 with an OS-backed Secret Service
keyring, and authorized fresh Developer/QA agents via Herdr in the existing panes.
T01 and T03 remain accepted; T04's prerequisite is T01. Read the coordinator
[approved public spec](../decisions/t04-approved-storage-spec.md) and
[bounded work order](t04-work-order.md). Implementation and independent bounded
acceptance are complete; [coordinator acceptance](../evidence/t04-coordinator-review.md)
records owning123/123 plus foundation100/100/T03221/221 and clean locked snapshot.
All execution windows are closed; no automatic next-task grant.

Initial missing-toolchain blocker is resolved: coordinator reprovisioned the exact
runtime and repeated baseline production/foundation/T03 checks successfully.
Design repairs are incorporated in the approved spec; a portable isolated real
provider fixture and dependency/kernel/type feasibility probes pass. See
[preflight](../evidence/t04-coordinator-preflight.md), retained
[design review](../evidence/t04-coordinator-design-review.md) and
[start evidence](../evidence/t04-coordinator-start.md). Narrow protected-storage
acceptance is now verified independently on t04-f4, not merely fixture preflight.
Do not substitute system Node or the personal session keyring. No actual product
writes, T05/T09 succession, staging or commits are implied.

## Read first

- [authentication.md](../../shared-docs/docs/mcp-contract/authentication.md)
- [routine-creation.md](../../shared-docs/docs/mcp-contract/routine-creation.md)
- [architecture.md](../architecture.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Select primary supported OS and OS-backed secret storage or equivalent separately protected key; record ADR and fail closed on unsupported platforms/unavailable keys.
- Implement explicitly provisioned profile identity, configured origin binding and generation markers. Opening an existing profile never auto-creates missing journal/vault state.
- Separate encrypted credential and server operation stores; no companion-intent store; apply restrictive permissions, authenticated encryption, atomic durable persistence and corruption/version checks.
- Acquire profile ownership across processes; define CLI/server coordination and safe lock release after crashes. Prevent PID reuse or stale-lock guessing from admitting a competing refresh owner.
- Keep a protected recovery/generation fence outside journal storage. Specify stale-backup detection/limitations and commit ordering; no false whole-machine rollback guarantee.
- Expose injectable persistence faults and safe test key facilities that cannot be activated as a production auth/storage bypass.

## Acceptance criteria

- Inspect files/permissions; no plaintext secrets/domain bodies or unprotected adjacent keys. Missing/corrupt/foreign/unsupported state fails closed.
- Kill/reopen around atomic writes and ownership acquisition; a second process cannot race updates or reset generation.
- Missing/reset and supported stale-state restoration tests detect recovery loss, never initialize an apparently empty existing profile.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

Storage foundation for A03-A04/A07-A09, R01/R11-R12.

## Handoff

Record OS/secret-store requirements, lock semantics, durability ordering, fence coverage and safe test procedures.

### Accepted handoff

- Public runtime/types: dist/storage/index.js/.d.ts; source src/storage/16 modules.
  Read approved spec/ADR for exact factories/async session API/error catalogue.
  Diagnostic facility/worker are separate, issued synthetic roots only; no
  production key/provider/fault flags. Root/server/CLI/companion remain inert.
- Platform: Linux x64, supported local ext4, OS-backed immutable Secret Service
  key (qualified GNOME51.1), disjoint encrypted external anchor and data roots.
  Current COMMITTED manifest only; PREPARED/incomplete/stale/missing state denies,
  never reset or previous-manifest fallback. Close owner before another process opens.
- Opaque vault/operation bytes preserved; pre-auth null-account then trusted
  service-confirmed bind; atomic replacement vault+generation fence, stable
  gymtracka-digest-v1 keyed identity, exact operation bytes/ciphertext retained.
  T06/T07 supply verified grants, T09 admission/immutable journal/receipt logic.
  T09 must budget/reserve256MiB store headroom before admission/mutation.
- Changes: src/storage/, exact @homebridge/dbus-native0.7.8 +14 locked nodes,
  own ADR and2 compatibility rows; independent unit/fault T04 QA sources/evidence;
  coordinator spec/work orders/reviews/status. Existing dependency pins/lock nodes,
  compiler/scripts/foundation/parked source and QA suites preserved.
- Safe pinned commands: npm ci --ignore-scripts, typecheck, lint:production,
  format:check:production, build; owning T04 unit54/fault69 (actual private provider),
  foundation100/T03221 plus scoped QA lint/format. Independent QA and separate
  clean136-file source snapshot all PASS; generated bytes match t04-f4 exactly.
- No T04 blocker remains. Conditional fsync/hardware durability, whole-state
  rollback exclusion, same-UID/ptrace and V8/native erasure limits remain explicit;
  no backend/session/config guard/recovery orchestration/host/release claim.
- All initial source/runtime/test failures and two Developer process deviations
  retained in [acceptance evidence](../evidence/t04-coordinator-review.md).
  T05 and T09 ready, unassigned; new bounded user/coordinator assignment required.
  No actual writes, personal state, staging/commits or .pi edits authorized.
