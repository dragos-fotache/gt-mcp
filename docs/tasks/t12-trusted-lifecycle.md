# T12 — Complete trusted lifecycle commands and privacy cleanup

> **T21-S1 successor authority (2026-10-17):** T21 removes operation retirement/reconciliation and replaces storage cleanup. Trusted auth/account proof/privacy duties remain; historical acceptance stays closed.
> See the [successor storage/interface spec](../decisions/t21-single-record-storage-spec.md). Documentation only;
> current runtime/package behavior is unchanged until T21 implementation acceptance.

**Status:** complete; S1–S4 accepted/closed · **Owner:** primary Codex agent · **Requires:** T06, T07, T11
**Size:** 4 bounded outcome slices; work-window limits are not completion estimates

## Development plan and assignment boundary

The user requested development planning and splitting on 2026-10-15. The
[decision-ready plan](../decisions/t12-plan-and-slices.md) records the contract,
CLI behavior, dependency/API findings, scope, proportional checks and stops:

1. **S1 — Sign-out and unresolved-operation retirement:** reuse T06/T09 with
   protected descriptor publication/recovery and trusted CLI controls.
2. **S2 — Durable profile removal and explicit reconciliation:** add holder-owned
   removal, key cleanup and an external fence that survives deletion of the key.
3. **S3 — Foreground account-status proof and account-bound cleanup:** reuse the
   secure helper/transport, validate trusted proof provenance and clean only the
   matching account through S2.
4. **S4 — Complete operator flow and integrated parent acceptance:** finish
   disclosures/guidance and verify the combined lifecycle on a clean locked target.

The user assigned [S1](t12-s1-work-order.md) on 2026-10-15; it is now
[accepted/closed](../evidence/t12-s1-review.md):21/21 owning+121/121 regressions=
142/142 in14 exact files, four production/scoped checks,512 stable hashes and
actual isolated provider/ext4/HTTPS/compiled CLI cleanup PASS.
[S1 handoff](../handoffs/t12-s1.md). The user assigned
[S2](t12-s2-work-order.md), now [accepted/closed](../evidence/t12-s2-review.md):
37/37 new S2+21/21 unchanged S1+244/244 regressions=302/302 in35 files; four
production/scoped checks,525 stable hashes and actual isolated provider/ext4/HTTPS/
CLI/owned cleanup PASS. [S2 handoff](../handoffs/t12-s2.md),
[format/API/crash order](../decisions/t12-removal-format.md). The user assigned
[S3](t12-s3-work-order.md), now [accepted/closed](../evidence/t12-s3-review.md):
33/33 new S3+58/58 unchanged S1/S2+206/206 regressions=297/297 in24 files; four
production/scoped checks,535 stable hashes and actual isolated provider/ext4/HTTPS/
dual-loopback/CLI/owned cleanup PASS. [S3 handoff](../handoffs/t12-s3.md),
[API/provenance notes](../decisions/t12-account-status-boundary.md).
The user assigned [S4](t12-s4-work-order.md) on 2026-10-15; operator flow and
clean locked integrated parent acceptance are [accepted](../evidence/t12-s4-review.md).
Parent T12 complete; [current handoff](../handoffs/t12-s4.md). No successor started.
S4 integrated acceptance closes T12. T15 remains separate/unassigned.
The former2–3-session estimate is replaced: storage removal/key deletion is new
safety work, rather than CLI-only integration. Each slice includes its own source,
tests, review, evidence and handoff within the standing bounded-work policy.

## Outcome

Expose safe local setup/recovery actions without adding model-facing tools.

## Read first

- [authentication.md](../../shared-docs/docs/mcp-contract/authentication.md)
- [routine-creation.md](../../shared-docs/docs/mcp-contract/routine-creation.md)
- [account-lifecycle.md](../../shared-docs/docs/backend-contract/account-lifecycle.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Complete CLI setup/login/sign-out and explicit operation retirement/profile removal paths using protected profile ownership; never require secrets in argv/chat.
- Show setup disclosures for fitness data exposure to AI host, indefinite encrypted unresolved content, compact receipts and non-atomic creation/draft leftovers. Explain operator config-file writesEnabled:false by default and that true lets connected clients create without per-routine confirmation; no custom/external permission extension or CLI write-enable flag.
- Retirement warns that remote draft/saved data may exist; atomically reserve retired operation ID permanently, erase bodies and never issue backend DELETE.
- Sign-out fences and preserves private operations; explicit same-origin/account reauthentication plus identical explicit invocation under current writesEnabled:true may resume. Different accounts/origins never inherit evidence.
- Implement trusted account-status verification/cleanup using existing purpose-bound accountStatus Google proof and the shared lifecycle procedure, reusing the foreground helper securely. An internal cleanup entry point accepts only verified account-bound receipts. This is a trusted local control path, not an eighth tool; never trust a supplied boolean/401/404 as evidence and do not add export/delete-account workflows.
- Profile removal erases local material while retaining external removed-generation fence; warn replay guarantees end and require trusted reconciliation before provisioning a distinct profile.

## Acceptance criteria

- Retired repeats fail recovery_unavailable even with changed intent; removal/reset cannot reopen an intact-looking empty profile.
- Cleanup tests use validated synthetic deletion receipts through the trusted verification boundary, clear only matching account, and preserve separate bindings; generic errors never clear data.
- CLI permissions/diagnostics and shutdown behavior reveal no credentials/bodies; no deletion/status tools or autonomous mutation queue appear.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

A07-A10; R11-R12 lifecycle; setup disclosures in T18.

## Handoff

Record exact local commands, ownership coordination, cleanup verification boundary and any external lifecycle integration limitation.

On completion append: changed paths; exact safe commands and pass/fail results; versions;
remaining blockers/limits; next-agent integration notes. Update the task index. Do not
record credentials, identifying production data or raw private request/response bodies.
