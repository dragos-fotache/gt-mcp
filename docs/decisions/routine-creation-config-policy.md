# Decision — configuration-only routine creation

**Status:** user-approved local product-policy revision; implementation unverified.
**Scope:** the portable MCP application, not a Pi extension.

## User decision

The user explicitly selected a configuration-file setting to enable routine
creation and **nothing else for write permission**: no custom Pi companion, no
external permission extension, no per-routine human approval prompt, and no
host-provided consent proof. This replaces the earlier local companion/approval
plan. The user also explicitly approved corresponding shared-document changes. After
project instructions were reloaded to permit that scope, the shared MCP draft was
aligned as 0.2-draft in the working tree. No backend contract, implementation or
historical acceptance record was changed.
This is a deliberate policy change, not a repair to make a failing experiment pass.

## Intended configuration contract

Use the existing planned trusted configuration field:

```json
{
  "writesEnabled": false
}
```

- `writesEnabled` is a strict boolean in the operator-managed MCP configuration
  file. Only explicit `true` enables `create_routine`; omission defaults to false.
  Invalid configuration fails closed. No environment/CLI/model argument becomes
  a second write-enable mechanism. File location and complete configuration
  schema are owning-task implementation decisions, not implemented commands.
- The setting authorizes routine creation for the configured backend origin and
  signed-in account. "Profile" means this local configuration plus its private
  credentials/recovery storage; it is not a Pi session or a new backend entity.
  A single-account installation needs no elaborate profile-selection UI.
- With false/missing policy, creation remains advertised among the same seven
  tools but returns configuration_required with a safe disabled-creation reason
  before mutation admission/backend dispatch. No
  eighth tool, consent argument, approval socket, or host registration is added.
- With true, a valid authenticated explicit `create_routine` call may execute
  without another approval step. Pi TUI/print/JSON/RPC, clientInfo, annotations,
  extension presence and tool-exposure mode do not grant or withdraw permission.
  This policy does not itself certify any host/runtime as compatible.
- Changing the configured origin/account still requires the existing trusted
  setup/authentication and storage fences. The flag does not bypass credentials,
  authorization, strict validation, visible exercise checks, idempotency,
  account isolation, encryption, cancellation or recoverable creation semantics.
- Retained operation identity belongs to the server's recovery journal, not a
  companion approval store. Changed content with an already admitted operationId
  still fails operation_id_reused; a new valid operationId can create a distinct
  routine without a fresh permission prompt. Restart never resumes automatically.
- Operational config loading/reloading must have documented deterministic
  semantics. Once disabled policy is effective, new creation admission and unsent
  mutation steps must be fenced; committed backend work cannot be rolled back.
  No file-watcher/hot-reload feature is implied by this decision.

**Risk accepted by this choice:** any client able to access an enabled local
MCP process can request routine creation without human confirmation. Restrict
local process/config/private-state access accordingly. This is operator trust,
not evidence of per-routine consent or an OS sandbox. Setup/packaging must explain
this plainly; no bundled example/config enables writes by default.

## Existing work and revised task scope

- T01 foundation remains accepted. Existing server/CLI/production companion
  entries are inert; this documentation change enables no actual writes.
- T02 custom companion feasibility is **parked, incomplete**, not accepted as a
  whole. Preserve `experiments/t02/companion/`, `driver/`, `fixture-server/`,
  metadata and QA tests/evidence as historical experimental work. Four slices
  (S1/S2A/R1/R2), six SDK profiles were independently accepted under the OLD
  experiment contract. R3 Developer reported candidate artifact-ready with four
  permitted checks and sixteen public diagnostics; it was NOT independently
  accepted. QA prepared sources and56 artifact-free controls; coordinator repeated
  those56 controls only. No R3 frozen QA artifact relay occurred.
- R3–R11 execution and automatic coordinator/subordinate succession are parked;
  no successor, PTY approval or overall T02 acceptance is implied. Preserve
  historical failed reviews and limitations; do not rewrite old tests/specification
  to make this new policy look like a completed old acceptance requirement.
- T13 companion registration and T14 companion approval are **retired from the
  current delivery plan**, with their original task descriptions kept historical.
- T15 integrates server-side config-only routine creation after T08/T11; T17
  verifies named Pi interoperability with the portable server and configuration
  guard, NOT permission-extension certification. T18 ships server/CLI/config and
  recovery guides, not a required companion. No alternative permission-extension
  evaluation/install is part of the revised plan.
- T03 schemas/codecs and T04 storage remain independent of parked T02. T03 is
  the next suggested bounded assignment; neither is started by this docs update.
  Existing inert companion package/Pi dependencies and parked tests are not removed
  here. Any future build/package/suite scope reconciliation needs a separate
  announced ownership window and explicit checks; no silent test exclusion/pass.

## Shared-contract alignment — completed documentation revision

The shared checkout's committed baseline remains9a96dcb; the user-approved MCP
policy changes are uncommitted working-tree draft0.2 edits. Backend v1 wire/domain/
auth/recovery rules and OpenAPI1.0.0 are unchanged. This resolves the earlier
approval-policy documentation discrepancy, not implementation or release verification.
Old draft0.1 host-approval/companion requirements are explicitly superseded; old
experiment evidence remains evidence against its original contract only.

Shared documents aligned in this approved docs-only window:

1. `mcp-contract/README.md`: selected write policy becomes operator-managed
   writesEnabled; Pi-first interoperability no longer requires a companion.
2. `mcp-contract/tools.md`: replace Host approval/Pi approval companion requirements
   with the single config guard, default-disabled behavior and local-client trust
   disclosure; retain seven tool schemas and all unrelated result/domain rules.
3. `mcp-contract/routine-creation.md`: admission checks current config/auth, not
   per-call consent; server journal retains operation identity/intent; retries,
   conflicts, exact bytes, retirement and no automatic continuation remain.
4. `mcp-contract/authentication.md`: config is trusted local operator input;
   remove companion-only permission assumptions while retaining private account/
   origin binding, credentials and generation fences.
5. `mcp-contract/acceptance-scenarios.md`: revise approval parts of C03/C08–C12
   and host-specific cross-project gates to test enabled/disabled configuration,
   normal host interoperability and stable operation identity. Preserve remaining
   numeric/domain/auth/storage/replay requirements. Old scenarios are superseded
   policy requirements, NOT tests passed or arbitrarily waived.

The shared revision is in docs/mcp-contract/README.md, tools.md, authentication.md,
routine-creation.md and acceptance-scenarios.md, with the shared root README aligned.
Shared links remain self-contained (no dependency on this local decision file).
MCP schema/storage/read work may continue under bounded assignments; no production
writes or release approval follow merely from this docs change. Future evidence
must name draft0.2 and the actual tested implementation; do not count parked old
approval tests as current guard/host compatibility passes.
