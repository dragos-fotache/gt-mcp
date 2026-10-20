# T18 — Package server/CLI/config with setup and recovery guides

**Status:** S1/S2/S3 and parent accepted/closed · **Owner:** Primary Codex agent · **Requires:** T12, T15 (accepted)
**Size:** 3 sequential outcome slices; bounded 60–90-minute windows, not completion promises

## Current package refresh — T18-R1 accepted/closed

The user assigned a current-candidate refresh on2026-10-17.
[R1](t18-r1-work-order.md) is [accepted/closed](../evidence/t18-r1-review.md):40/40
in12 files on workspace and clean, zero failures/skips;430 source inputs,194
emitted files and archive bytes/content/modes/runtime dependencies match.
96 files/86 JS/111 dependencies. Current decoder fix and standalone guide closure
are included; exact delivered installation/recovery/refusal and owned cleanup PASS.
[Handoff](../handoffs/t18-r1.md). Historical S1–S3 acceptance preserved; no T17
successor, publication, release or real enablement follows.

## Development plan and current grant

The user requested T18 design, planning and splitting where needed on 2026-10-16.
The [settled plan](../decisions/t18-plan-and-slices.md) defines the private local
npm tarball/runtime-only shrinkwrap, delivered CLI bin, explicit production/worker
contents, safe templates and same-format replacement/recovery boundary.

1. **S1 — Locked runtime artifact and delivered bins:** staging/allowlist/runtime
   lock, CLI metadata/modes, fresh isolated installation and actual bin/stdio smoke.
2. **S2 — Standalone operator guides and safe templates:** complete installation,
   setup/privacy/recovery/upgrade journey and shipped document/link closure.
3. **S3 — Installed recovery and clean parent acceptance:** retained exact identity,
   incompatible-state fencing, clean locked reconstruction and final active replay.

[S1 accepted/closed](../evidence/t18-s1-review.md):152/152 in13 exact files
(6 owning +146 relevant regressions),94 archive files/86 JS/111 locked runtime
dependencies,817 stable hashes and194 byte-identical prior emitted files.
Actual extract-and-ci/CLI/SDK/private-provider/cleanup PASS.
[Handoff](../handoffs/t18-s1.md). The user selected extract-and-npm-ci as the sole
supported install route after consumer dependency drift; original failures retained.
[S2 accepted/closed](../evidence/t18-s2-review.md):10/10 in3 exact files, standalone
installation/login/server/recovery guides and shipped links/templates verified,
563 stable hashes, unchanged runtime/dependency inputs and actual fresh locked
install/CLI/SDK smoke. [Handoff](../handoffs/t18-s2.md).
[S3 and parent accepted/closed](../evidence/t18-s3-review.md): full runtime/
initial-document261/261 in31 files in workspace and clean; final document-only
closure14/14 in5 files in both.404 source inputs/194 emitted outputs and final
archive bytes/content/modes/runtime dependencies match clean reconstruction.
User-approved local startup validation and installed exact recovery/refusal pass.
[Handoff](../handoffs/t18-s3.md). All T18 grants closed; parent complete.
External/independent gates remain. No publication/release or automatic successor. Follow
[proportional testing](../decisions/proportional-testing-policy.md).

## Outcome

Deliver reproducible installation and privacy-aware operation without claiming untested readiness.

## Read first

- [README.md](../../shared-docs/docs/mcp-contract/README.md)
- [authentication.md](../../shared-docs/docs/mcp-contract/authentication.md)
- [verification.md](../verification.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)
- [T18 design, scopes and slice acceptance](../decisions/t18-plan-and-slices.md)

## Deliverables

- Package the compiled portable server/CLI and documented config, not a required companion/permission extension. Exclude parked T02 artifacts/private state from distribution; any old inert package/build/dependency cleanup needs an announced bounded task scope and verified foundation regression. Test clean locked install/build/artifact.
- Document ordinary local stdio setup with config-file writesEnabled:false/missing disabling creation and explicit true enabling valid authenticated creation without per-routine approval. No permission extension, UI/mode or CLI/environment enablement flag; bundled examples never enable writes.
- Publish required nonsecret service/audience/registered-port configuration, supported OS secret-store setup, budgets/timeouts, private paths via placeholders and safe diagnostics.
- Document login/sign-out, identical operation resume, partial drafts/concurrency, journal retirement, profile removal/lost storage, stale-backup limits and upgrade/version fences.
- Disclose data exposure to AI host/transcripts, host output limitations, unresolved indefinite retention, compact receipts, backup/transfer exclusion and no offline remote wipe promise.
- Verify package contents/permissions/log exclusions; test upgrade preserving bytes or blocking incompatible versions. Keep verification matrix pending until T16/T17/T19 evidence exists.

## Acceptance criteria

- Fresh package install smoke test works and contains no credentials/private state/personal config, parked experiment artifacts or required permission-extension/Pi runtime bundle.
- Setup starts with routine creation disabled by default and explains config-file writesEnabled and the ongoing local-client trust risk; no custom/external permission extension is required; error guidance never requests pasted tokens.
- Restore/upgrade/private-store failure procedures preserve uncertainty and cannot silently recreate profiles or rekey requests.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

Packaging aspects of M01/A01/A09/R11-R12; documented release/setup prerequisites.

## Handoff

Record artifact contents/install commands, supported platforms, recovery guide links and verification status.

On completion append: changed paths; exact safe commands and pass/fail results; versions;
remaining blockers/limits; next-agent integration notes. Update the task index. Do not
record credentials, identifying production data or raw private request/response bodies.
