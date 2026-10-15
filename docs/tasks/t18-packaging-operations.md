# T18 — Package server/CLI/config with setup and recovery guides

**Status:** planned · **Owner:** unassigned · **Requires:** T12, T15
**Size:** 1-2 sessions

## Outcome

Deliver reproducible installation and privacy-aware operation without claiming untested readiness.

## Read first

- [README.md](../../shared-docs/docs/mcp-contract/README.md)
- [authentication.md](../../shared-docs/docs/mcp-contract/authentication.md)
- [verification.md](../verification.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Package the compiled portable server/CLI and documented config, not a required companion/permission extension. Exclude parked T02 artifacts/private state from distribution; any old inert package/build/dependency cleanup needs an announced Developer-owned window and verified foundation regression. Test clean locked install/build/artifact.
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
