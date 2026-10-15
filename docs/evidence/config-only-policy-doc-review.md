# Config-only routine-creation policy — documentation review

**Disposition:** user-approved documentation revision complete; no implementation,
compatibility, product writes or release acceptance claimed. Coordinator docs-only
integration ownership of AGENTS.md/compatibility.md ends with this record;
ordinary Developer ownership resumes, with no new work assignment or agent prompt.

## Approved change and preserved boundaries

The user explicitly selects config-file writesEnabled as the sole creation permission
setting, without custom/external permission extensions or per-routine prompts, and
approves shared-contract edits. Project instructions were reloaded to permit the
coordinator's approved shared-docs edits. No staging/commits/config/provider changes.

[Local decision](../decisions/routine-creation-config-policy.md) and shared MCP
[0.2-draft](../../shared-docs/docs/mcp-contract/README.md) are aligned. Omitted/false
writesEnabled disables creation with configuration_required before admission/dispatch;
invalid config fails closed; explicit boolean true permits valid authenticated
explicit calls without confirmation. Same seven tools and input schemas; no new
backend endpoint. Auth/account/origin fences, encryption, operationId/exact-byte
recovery, cancellation/no rollback and no autonomous restart remain required.

Shared checkout remains at committed9a96dcb with uncommitted changes to exactly:
README.md and docs/mcp-contract/{README,tools,authentication,routine-creation,
acceptance-scenarios}.md. Backend v1/OpenAPI1.0.0/catalogue are untouched. Legacy
approval/companion anchors remain valid aliases pointing to the revised policy.
Shared links remain self-contained (no parent-project dependency).

Local README/architecture/roadmap/verification/compatibility/guide/task docs align.
T02 parked/incomplete; T13/T14 retired (historical task text preserved). T15 now
requires T08/T11; T17 requires T12/T15 and verifies ordinary Pi/server config
interoperability, not approval UI/extensions. T18 packages server/CLI/config.
T03 next suggested/unassigned; T04 also ready. No source/build/QA window opens here.

Old T02 work/spec/plan/succession have parked banners, not weakened assertions.
R3 is unaccepted candidate artifact-ready; no R3 frozen QA relay. Existing source,
fixture/harness/test/evidence and original failures preserved. Candidate source/
metadata hashes match Developer-reported prefixes; dist/index.js and lock hashes
remain their previously reported identities. No new runtime/QA target tests run.

## Checks performed

Pinned Node24.21.0/npm11.19.0 verified. Docs-only checks:

- Shared/root git diff --check: PASS; no whitespace errors.
- Shared diff/status scope: exactly the six approved Markdown files; no backend,
  OpenAPI, catalogue, implementation, fixture, test or manifest changes there.
- In-memory Markdown local-link/anchor review of39 changed docs:182 local links
  resolve; no shared cross-checkout link; zero failures. Historical banners included.
- Shared creation inputSchema parsed before/after: exact JSON object equivalence.
  Shared scenario IDs preserved:45 unique ordered IDs (M01–M10,A01–A11,C01–C12,
  R01–R12); updated C03/C08–C12/R07 meanings explicitly reflect the approved policy.
- Explicit selected Prettier --ignore-path /dev/null --check on23 active local and
  six shared Markdown files: initial formatting warnings corrected on the11 named
  active/shared docs; final PASS. Default ignore-path check alone was NOT used to
  count ignored docs as formatted. Historical archive bodies were not reformatted.
- SHA256 inspection of parked R3 artifacts/dist/lock: identity consistency only,
  NOT source/process/independent behavioral acceptance.

No install/build/typecheck/lint/runtime/QA suite was executed for this docs-only
change. Existing earlier56 artifact-free controls remain historical old-policy
logic evidence, not a new-policy pass. No tests were skipped/changed/excluded to
make the revised policy appear implemented. Future package/build/test reconciliation
needs its own announced ownership window and relevant independent verification.
