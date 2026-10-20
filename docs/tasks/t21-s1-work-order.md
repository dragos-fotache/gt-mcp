# T21-S1 — Contract and replacement-interface revision

**Assignment:** user requested “start slice 1” on 2026-10-17.
**Disposition:** [accepted/closed](../evidence/t21-s1-review.md); documentation only.
Parent T21 remains incomplete; S2 ready/unassigned, S3–S6 held.

Outcome: align the shared MCP draft to creation without durable recovery, settle
the successor credential-storage/config/creation interfaces, and enumerate the
production/test dispositions needed by S2–S6. Follow the
[parent plan](t21-remove-durable-creation-recovery.md), current shared backend v1,
foundation spec/ADR, config-only write decision and proportional testing policy.

Settled behavior: no operationId, durable creation journal/receipt or cross-call
deduplication; independent calls can duplicate routines; no automatic restart
continuation; retained within-call backend identities and strict response checks;
creation errors retryable:false. Keep config-only writes, credential encryption,
exclusive ownership, auth refresh recovery and account/session fences. A single
encrypted credential record replaces the separate anchor and mutable descriptor;
new config version2, fresh-profile transition and no filesystem-name gate.

Permitted edits: five `shared-docs/docs/mcp-contract/*.md` files and shared root
README; local AGENTS.md, architecture/config-policy/successor storage/interface
decisions, relevant T04/T09/T12 authority notices, T17 supersession notice, T21
task/index/implementation/verification status and S1 review/handoff. No source, test, package/config-template, dependency,
build-output, backend-contract/catalogue, historical evidence or `.pi` edits.

Permitted commands: read/search, local documentation edits and targeted formatting,
link/JSON/schema/scenario/consistency checks, source/backend/input hash comparisons.
Use provisioned Node24.21.0/npm11.19.0 for any Node command. No install/build/test
execution, fixtures, network/backend/laptop access, deployment, staging or commits.

Acceptance: all shared draft pages identify 0.3; seven-tool scope/domain/backend v1
unchanged except the explicit creation input/result/annotation/retry changes;
affected scenario meanings mapped transparently; exact future storage API/config/
error/lifecycle behavior recorded; every existing production/test path classified;
local conflicting authority explicitly superseded; backend and all source/test/
package/existing evidence bytes unchanged. Verify local links and embedded JSON,
and review positive recovery wording in context to distinguish retained auth from
retired creation requirements. No runtime conformance claim.

Milestones: (1) shared contract; (2) replacement storage/interfaces and path map;
(3) consistency/input-stability checks, review and handoff. Target60–90 minutes,
checkpoint at90 and stop by two hours. Stop affected work for a needed backend
change, unresolved public decision or loss of retained auth safeguards. S2 and
later slices require separate assignments; no automatic successor.

## Closure

[Review](../evidence/t21-s1-review.md), [checks](../evidence/t21-s1-doc-checks.json)
and [handoff](../handoffs/t21-s1.md) record completion. All checks are documentation/
input identity checks; no runtime acceptance is claimed. No successor was started.
