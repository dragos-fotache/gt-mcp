# T02 — Prove Pi registration and approval-gate feasibility

**Status:** parked/incomplete by user decision · **Owner:** Coordinator (historical work preserved) · **Requires:** T01 (accepted)
**Size:** 1-2 sessions

## Current disposition

The user parks this extension and selects [config-file writesEnabled only](../decisions/routine-creation-config-policy.md):
no custom/external permission extension or per-routine approval. Shared MCP draft0.2
is aligned; this old spike is not a current prerequisite. T13/T14 retired; portable
MCP schemas/storage/auth/reads/creation work can proceed under bounded assignments.

Preserve experiments/t02 companion/driver/fixture, metadata, QA tests and evidence.
Do not delete/retarget old tests or change acceptance history. No further R3–R11
execution, automatic successor/subordinate renewal, new QA artifact relay or overall
T02 acceptance is authorized. The original experiment spec is archived, not weakened.

R3 Developer reported candidate ARTIFACT-READY: new preflight worker/report validator/
unknown diagnostic, dispatch/scenario/metadata edits, four permitted checks and16
serial SDK diagnostics (ten candidates +six regressions), then all actions stopped.
Those results are self-reported implementation readiness, not independent acceptance.
No R3 frozen QA artifact relay occurred. QA prepared sources/56 artifact-free controls;
coordinator repeated56 controls only. Preserve the unaccepted candidate and private
QA review gaps in the coordinator pickup, never leak them to Developer.

Coordinator identity at parking: coordinator / w4:p2K; developer / w4:p2G,
qa / w4:p2H. No stop prompt was sent to subordinates (user explicitly forbade it);
later Developer stop was its own artifact-ready milestone. No process/state polling,
new pane/session, implementation cleanup or runtime execution is part of this docs edit.
T03 is next suggested bounded work, still unassigned.

## Historical accepted checkpoint and original task contract

Six bounded SDK scenarios across four slices are independently accepted:

- S1 `no-companion/sdk`: actual unavailable call and verified no fixture spawn.
- S2A `generic-readonly/sdk`: connected generic reads, receiver creation refusal
  and independent final zero; no companion gate.
- R1/S2B `direct-readonly/sdk`: genuine companion gate denial in print/no-UI,
  read success, native causal ID join, explicit-null receiver final zero and cleanup.
- R2 `deferred-readonly/sdk`, `codemode-readonly/sdk`, `nested-readonly/sdk`:
  actual search/script/orchestrator routes, read success, native ID/parent joins,
  exact observed tool surfaces, genuine inner gate denial, final zero and cleanup.

R1's first independent window failed on omitted no-admission null fields. That
failure is preserved; the two-file serialization/validation repair passed strict
independent acceptance without weakening assertions. S1/S2A regressions and34/34
artifact-free validator controls passed for both QA and coordinator. Metadata-only
accepted status was reconciled after closing QA's frozen-artifact window.

R2's first coordinator readiness FAILED public surface review before any QA
window. Bounded two-file repair passed strict acceptance without weakening tests.
All six exact SDK selections and48/48 artifact-free controls passed independently
for QA and coordinator. Metadata accepts exactly six SDK profiles/no candidates.

**13 total slices: 4 accepted + 9 remaining**, with35 registry scenarios still
unverified (14 SDK +21 PTY). R3 is the next fixed scope after READY/TAKEOVER;
R4-R11 were later sequential scopes in the now-parked plan; not current assignments. Genuine approval/PTY, other routes/conflicts/modes, integrity and
lifecycle remain unverified. T01 production entries remain inert; no product
write enablement, full T02 completion or T17 certification is claimed.

Historical authority for this experiment is [the archived public specification](../decisions/t02-approved-experiment-spec.md),
not the current product draft0.2 config-only policy. Sections below are preserved
OLD deliverables/acceptance criteria, not current product requirements.
Final bounded acceptance record (coordinator/QA only, not Developer input):
[R1 acceptance](../evidence/t02-r1-s2b-independent-acceptance.md) and
[R2 acceptance](../evidence/t02-r2-independent-acceptance.md).

## Outcome

Resolve host security risks before the production companion is built; use a synthetic MCP fixture, never the real backend.

## Read first

- [tools.md](../../shared-docs/docs/mcp-contract/tools.md)
- [architecture.md](../architecture.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Read complete selected Pi extensions/MCP/codemode/TUI docs and relevant permission/SDK examples. Pin an immutable Pi source/version reference.
- Build an isolated seven-tool fixture and minimal experimental companion to prove actual tool_call/tool_result behavior for direct, deferred/search-loaded, codemode and nested executeTool calls.
- Prove registration/teardown order and detect static overrides, normalized server-name collisions, replacement MCP extensions and incompatible modes before a write-enabled registration can connect.
- Investigate later argument-mutating handlers. Define a final-input integrity mechanism, or explicitly detect/exclude incompatible load-order/runtime configurations and withdraw writes.
- Specify a trusted noncredential profile/session binding channel for authorized label observations and host intent. Define how sign-out/reauthentication/reload invalidates it without changing tool schemas.
- Record ADR, runnable reproduction tests, supported configuration and unresolved blockers; experimental code must not become an undocumented production workaround.

## Acceptance criteria

- Direct and every nested path invoke the gate for the actual creation tool, not just the outer orchestration call.
- No-UI/RPC/print/JSON, handler failure, collision and missing companion leave no write-capable registration.
- Post-approval input mutation is blocked/detected, or the mutating configuration is identified and rejected before enabling writes. If neither is achievable, stop write implementation and request contract review.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

C10-C12 feasibility; full certification belongs to T17.

## Handoff

Explain verified APIs, exact runtime, integrity/load-order constraints and tests; do not mark certification complete.

On completion append: changed paths; exact safe commands and pass/fail results; versions;
remaining blockers/limits; next-agent integration notes. Update the task index. Do not
record credentials, identifying production data or raw private request/response bodies.
