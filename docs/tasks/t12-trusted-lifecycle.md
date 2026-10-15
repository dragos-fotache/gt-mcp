# T12 — Complete trusted lifecycle commands and privacy cleanup

**Status:** planned · **Owner:** unassigned · **Requires:** T06, T07, T11
**Size:** 2-3 sessions

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
