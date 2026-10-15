# T01 coordinator work order

**State:** T01 foundation accepted after independent Stage 2 work and coordinator
clean-snapshot review against [the approved specification](../decisions/t01-approved-foundation-spec.md).
See [acceptance evidence](../evidence/t01-coordinator-review.md). This work order is
historical execution scope; no interoperability or dependent-task approval is implied.

Read this with [T01](t01-foundation.md), [coordination rules](../agent-coordination.md),
[architecture](../architecture.md), [verification](../verification.md) and the shared
MCP/backend contracts. Shared baseline: 9a96dcb; MCP 0.1-draft; OpenAPI 1.0.0.

## Stage 1: independent preparation

### Developer

Read the complete shared MCP draft and relevant backend references. Research stable
runtime/SDK/protocol candidates using actual upstream documentation. Inspect installed
Pi package/extension documentation completely for packaging constraints; do not infer
host certification from the current harness. Report exact candidate pins, evidence URLs,
package manager/test runner choice, module/output paths, scripts and proposed minimal
public typed boundaries. Call out unsupported behaviors, external inputs and blockers.

Write only `docs/decisions/t01-foundation-proposal.md` at this stage. Do not install,
create production code, modify manifests or implement domain behavior until coordinator
approval. Do not inspect QA paths. This proposal is an interface specification for both
roles, not production code. It should cover the interfaces listed in architecture.md,
without claiming that their implementations already exist.

### QA

Independently derive a T01 coverage plan from the specifications, without reading
production code. Write only `docs/evidence/t01-qa-plan.md` at this stage. Include clean
locked install/typecheck/lint/build/unit-smoke commands; package pin and companion peer
requirements; import-side-effect checks; inert entry-point expectations; synthetic-only
fixtures and privacy/ignore boundaries. Distinguish planning, deterministic evidence and
unverified live interoperability. Do not claim checks pass before a runnable artifact.

List public observable/API decisions needed to implement black-box tests; ask the
coordinator rather than guessing APIs or inspecting implementation. No dependency or
configuration edits. Test source implementation waits for the approved interface spec.

### Coordinator

Review the two proposals against the normative contracts and confirm the final public
interface/observable foundation contract in a separate local specification. Resolve
choices and assign concrete path ownership before Stage 2; communicate only shared
specification decisions, not the other role's internal approach. Own task/index status
and integration documentation. Do not advance dependent tasks before T01 acceptance.

## Stage 2: implementation and tests in parallel

After explicit coordinator approval:

- Developer owns `src/`, package manifest/lockfile, TypeScript/lint/build configuration,
  `.github/`, ignore rules and the implementation ADR/development guide. No test reads.
- QA owns `test/` (including visibly synthetic fixtures) and QA evidence. No production
  source, diff or generated implementation reads. Package/build metadata and the approved
  public specification are allowed. Requests for dependencies/scripts go to coordinator.
- Coordinator resolves shared edits and may inspect both sides. Only coordinator updates
  status and handoff in T01/index/verification docs. No agent stages or commits changes
  during this work order unless separately instructed.

The final specification must name entry-point/module paths and exactly what smoke tests
can observe. Importing pure modules must start no processes/listeners, perform no network
or private-state access, and emit no stdout. Foundation entry points must not advertise
implemented seven-tool behavior or connect a write-enabled server. Pi host modules must
not be bundled. No actual origin, Google client ID or registered port is invented.

Developer runs its permitted install/typecheck/lint/build checks; QA runs independent
checks through public entry points. Do not relax tests to match code or expose test source
to Developer. Coordinator sends specification-level failure descriptions for fixes.

## Reporting and integration gate

Send asynchronous Herdr messages to `coordinator` (pane `w4:p2D`) after preparation,
when blocked, when interface changes are needed, and at completion. No polling or
waiting on the other agent's output. Include safe paths/commands/results and limitations.
Use role-prefixed messages: `T01 / Developer:` or `T01 / QA:`.

Coordinator review includes a clean locked install, typecheck, lint, build, independent
unit/smoke tests, relevant existing checks and a private-data/side-effect review. Record
exact tested versions and sanitized results; all host/backend/Google compatibility rows
remain explicitly unverified absent their own evidence. Acceptance requires the T01
criteria, not merely these proposals. Keep writes disabled and preserve shared-docs.
