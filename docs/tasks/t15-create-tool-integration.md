# T15 — Integrate creation into the portable seven-tool server

**Status:** S1–S3 and parent accepted/closed · **Owner:** primary Codex agent · **Requires:** T08, T11
**Size:** three accepted bounded outcome slices

The user assigned [S1](t15-s1-work-order.md) on 2026-10-15. This bounded grant
opened guarded-runtime implementation and verification only; S1 is now
[accepted](../evidence/t15-s1-review.md):122/122 selected checks, four production
checks and543 stable hashes. [S1 handoff](../handoffs/t15-s1.md). S2 is
now [accepted/closed](../evidence/t15-s2-review.md):68/68 in15 files, four
production/scoped checks and545 stable hashes. [S2 handoff](../handoffs/t15-s2.md).
Compiled creation dispatch and integrated parent acceptance are delivered; all T15 grants closed.

[Development design and slice contracts](../decisions/t15-plan-and-slices.md)
settle the runtime/protocol interfaces, config loading, ownership, recovery-field
delivery, verification, scope and stop conditions. T08/T11 and supporting T12
lifecycle are accepted. The design/planning request itself opened no source window;
the subsequent explicit S1/S2 assignments are accepted above. S3 is now accepted with parent T15.

The user assigned [S3](t15-s3-work-order.md) on 2026-10-16; it is now
[accepted with parent T15](../evidence/t15-s3-review.md). All S1–S3 grants are closed.

## Development sequence

1. **S1 — Guarded runtime:** one protected startup snapshot and shared profile/
   session/repository/service owner; strict policy/auth gating and truthful
   creation envelopes. Existing read-only factories remain compatible; the
   executable creation handler stays unavailable during S1.
2. **S2 — MCP dispatch:** add the creation-capable protocol factory and wire the
   compiled entry; preserve recovery fields through errors, budgets and
   cancellation. Prove the official SDK boundary and one actual stdio happy path.
3. **S3 — Integrated acceptance:** actual compiled-process recovery/receipt loss,
   policy/auth/lifecycle fences, full active owning/relevant regressions and clean
   locked reproduction. Only this acceptance closes parent T15.

Each slice targets 60–90 minutes, checkpoints at 90 and stops by 120 with an honest
handoff if unfinished; these are working windows, not completion promises.
Authorize slices separately; no automatic successor. Apply
[proportional testing](../decisions/proportional-testing-policy.md).

## Outcome

Connect the tested creation engine to portable MCP behind the sole operator
config-file writesEnabled guard, default false. No custom/external permission
extension or per-routine approval. Shared draft0.2 and
[the approved decision](../decisions/routine-creation-config-policy.md) govern;
parked T02/retired T13/T14 are not prerequisites.

## Read first

- [T15 settled plan](../decisions/t15-plan-and-slices.md)
- [T08 handoff](../handoffs/t08-s3.md), [T11 handoff](../handoffs/t11-s3.md)
  and [T12 lifecycle handoff](../handoffs/t12-s4.md)
- [tools.md](../../shared-docs/docs/mcp-contract/tools.md)
- [routine-creation.md](../../shared-docs/docs/mcp-contract/routine-creation.md)
- [architecture.md](../architecture.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Replace unavailable creation handler with T11 service behind strict config-file writesEnabled:true and normal origin/account/generation fences; never enable from initialize clientInfo/annotations.
- Keep schema/result/annotation catalogue exactly seven tools; no Pi-specific wire arguments, extra endpoints or hidden arbitrary command surfaces.
- Ensure invalid arguments/missing policy/config/auth precede mutation admission; creation failures after admission include all required recovery fields.
- Wire cancellation/shutdown signals through protocol/auth/engine without rollback claims; automatic retries remain bounded inside explicit calls only.
- Preserve all authorized post-admission recovery fields through protocol validation, output-size fallbacks and late cancellation; stale bindings receive no private history. Retain the accepted one resource attempt plus one eligible 401 refresh/retry, with no outer retry loop.
- Test ordinary isolated stdio launches with writesEnabled omitted/false/true/invalid. Disabled/missing policy returns configuration_required before admission/dispatch; enabled valid authenticated calls create without a prompt. Permission does not depend on host/mode/UI/extension; args/annotations/clientInfo/environment/CLI cannot enable it. Effective disabling fences new admission/unsent steps; no rollback claim or automatic hot-reload requirement.
- Validate final structured/text errors and stable receipts, output budgets and no stdout leakage using the official MCP client.
- Retain startup-only config/descriptor loading. Document graceful stop/await cleanup, update config or perform trusted lifecycle work, then relaunch; a file edit alone is not effective disablement. Close fences admission/unsent steps and settles owned persistence before releasing the session/profile.

## Acceptance criteria

- Config-enabled, authenticated isolated happy/retry calls return one saved receipt and original IDs; disabled create never mutates.
- All advertised output schemas accept both success and execution failures, including uncertain and terminal creation cases.
- Restart alone sends no unfinished steps; session fence prevents delivery/continuation under stale binding.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

M01-M03/M10 and A07/A09 portable boundaries; C01-C12 portable integration portions;
R05/R06. Reuse accepted engine evidence rather than duplicate its per-step matrix.
T16 supplies actual backend/DB/Android evidence; T17 supplies named Pi paths/modes.
T18-T20 packaging, Google/browser and independent release gates remain separate.

## Handoff

Document launch policy/interface, protocol integration commands and exact remaining production verification gates.

Planning handoff (2026-10-15): local contract/source/dependency evidence inspected;
three-slice design and proportional verification recorded. No source/test edits or
behavioral execution, no creation enablement and no release claim. S1 remains
unassigned; its work order/execution grant must be recorded before implementation.
Documentation verification: local Markdown targets in all six changed planning/
status documents resolve; `git diff --check` passes. The initial version probe
found an unset toolchain selector and Node26/npm12; the existing disposable
toolchain was then located and verified as Node24.21.0/npm11.19.0. No build,
install or test ran. Pre-existing working-tree changes were preserved.

S1 implementation handoff (2026-10-15): guarded runtime and private acknowledged
history repair accepted;11/11 owning +111/111 unchanged regressions=122/122 in18
files, zero failed/skipped/pending/todo. Four production/scoped checks,543 stable
hashes and actual isolated provider/ext4/HTTPS/cleanup PASS. Five production and
three new test/helper paths changed, listed with exact commands/versions/failures/
limits in [review](../evidence/t15-s1-review.md). No clean locked parent replay
claim (S3), no executable/SDK creation enablement (S2), no external/independent
release claim. All S1 grants closed; parent incomplete; S2 ready/unassigned.

On completion append: changed paths; exact safe commands and pass/fail results; versions;
remaining blockers/limits; next-agent integration notes. Update the task index. Do not
record credentials, identifying production data or raw private request/response bodies.


S2 implementation handoff (2026-10-15): official SDK creation factories and compiled
entry now use the guarded runtime. Validated recovery history survives error,
complete-result budget and late cancellation delivery.68/68 in15 files (20 owning
+48 regressions), zero failed/skipped/pending/todo; four production/scoped checks,
545 stable hashes and actual isolated provider/ext4/HTTPS/SDK stdio/cleanup PASS.
Six production and seven test paths changed; exact commands, versions, findings,
limits and artifact identity in [review](../evidence/t15-s2-review.md). Operator
launch/login docs explain startup-only loading and stop/await/update/relaunch.
All S1/S2 grants closed; S3 ready/unassigned; parent incomplete. No clean locked
parent replay, full process recovery/lifecycle, external or independent release
claim, automatic successor, real enablement, staging or commits.

S3/parent final handoff (2026-10-16): 446/446 PASS in 48 exact files (30 T15 owning + 416 relevant regressions), zero failed/skipped/pending/todo; four production/scoped checks, 584 stable hashes, clean locked replay, 388 identical source inputs and 194 byte-identical emitted outputs.
[Review](../evidence/t15-s3-review.md), [handoff](../handoffs/t15-s3.md).
No production changes were needed; all T15 grants closed, no successor or external/release claim.
