# Agent coordination workflow

## Latest T08-S3 disposition

The user explicitly replaced Herdr and the separate Developer/QA-agent workflow
for T08-S3 with primary-agent implementation/verification and optional bounded
subagents. S3 and parent T08 are [accepted](evidence/t08-s3-review.md); all S3 work
is closed. [Current handoff](handoffs/t08-s3.md). Historical role/pane/grant
instructions below did not govern this run. No successor or release was opened.

## Team and terminal layout

The user selected a three-agent team for this implementation:

- **Coordinator:** supplies concise decision-ready task contracts, owns public
  behavior/interface decisions, delegates bounded work, resolves ambiguity,
  integrates changes and independently reviews evidence.
- **Developer:** implements production code and build/runtime configuration from the
  specifications. Does not read QA tests or test fixtures, including through diffs.
- **QA:** designs and implements acceptance tests from the specifications. Does not read
  production implementation code, including through diffs or generated source/maps.

Developer and QA are separate interactive **Pi agents**. For the user-requested
T08-S2 experiment, both use `openai-codex/gpt-6.1-sol` with **medium** reasoning
in fresh sessions in the existing panes. Earlier assignments used
`meta/muse-spark-1.3-contributor` (Muse Spark 1.3 Contributor).
This is coding-agent staffing, not product/runtime compatibility certification.

Use the current Herdr tab and this repository's working directory. Keep the coordinator
on the left half and split the right half vertically: Developer above, QA below.
Preserve coordinator focus when creating panes. Do not create extra workspaces,
worktrees or tabs without user authorization.

## Default: coordinator-led, decision-ready assignments

**Authority:** the user approved this default for future project work. The
Coordinator supplies a concise, decision-ready task contract; Developer chooses
implementation internals; QA chooses minimal independent checks. Subordinates
escalate specific unresolved questions instead of producing broad design documents
unless explicitly requested.

Before opening implementation/test-source work, the Coordinator settles the
task's public API/observable behavior, cross-component boundaries, applicable
safety/error/recovery semantics and acceptance criteria against normative specs.
Reuse accepted specifications and handoffs by reference; do not require a new
design document when a short work order and exact references suffice. A list of
reading links plus "design the feature" is not a decision-ready assignment.

Developer retains discretion over algorithms, private structure and other
implementation details within the approved contract and edit scope. QA retains
discretion over independent specification-derived oracles, representative cases
and simple fixtures within the proportional verification scope. The Coordinator
must not prescribe tests from production implementation or dictate every private
function. Neither subordinate may redefine public behavior, expand scope,
introduce unapproved dependencies or invent missing external inputs.

When a decision is missing or contradictory, report a short question identifying
the exact ambiguity, affected requirement and, where useful, a recommendation or
small set of alternatives. Hold the affected work, not unrelated approved work.
The Coordinator owns resolution and updates the common public contract before
dependent implementation/tests proceed; do not guess or silently redesign.

A broad public-API proposal, architecture exploration, extensive QA design plan
or multi-round proposal/approval phase is an exception, not an automatic task
stage. The Coordinator must explicitly request it for a named uncertainty and
specify the bounded question, expected output and stopping point. Prefer a short
feasibility answer or focused spike when sufficient; research readiness is not
implementation or acceptance evidence, and execution needs its own grant.
Generalized testing frameworks/campaigns still require explicit user approval.

Historical T04/T05 proposal workflows are retained records, not templates that
every future assignment must repeat. This policy changes future delegation only;
role independence, permitted checks, frozen-artifact QA relays, safety/release
gates and no automatic successor remain unchanged. No current work window is
opened by this documentation update.

## Standing bounded-work and context-safe slicing policy

**Authority:** user-approved general approach for ALL future tasks, not a
mandatory five-slice template. Assess complexity, risk and likely context/time
cost before assignment. Keep small tasks whole; split larger or riskier tasks
into independently reviewable outcomes with clear prerequisites and integration
boundaries. The goal is reliable continuation, not extra planning bureaucracy.

- Settle shared public interfaces/state transitions in a short coordinator
  contract before implementation. Reuse accepted dependencies and specifications;
  do not turn slicing into a broad proposal or generalized QA planning round.
- Target 60–90-minute working windows, checkpoint at 90 minutes and stop the
  working session at two hours with an honest handoff. These are work-window
  targets/limits, not promises that implementation, QA or acceptance will finish
  on time. Time limits never justify rushed completion or weakened verification.
  Arrange safe cancellation/teardown of owned work; do not abandon an uncertain
  operation or forcibly terminate a durability-critical action to meet the clock.
- Default to one slice per implementation context. If unfinished at the stop,
  record the partial state, exact blocker and remaining acceptance work rather
  than continuing indefinitely. Resume from the handoff in a fresh context when
  explicitly authorized; do not rely on the previous conversation fitting.
- Each slice has scoped Developer/QA permissions, independent specification-derived
  checks, a frozen artifact relay before QA target execution, and an explicit
  accepted/partial/blocked disposition. Record any functionality that must remain
  unavailable until another slice passes. Slice acceptance is not parent-task
  completion or release readiness.
- Use focused checks during slices under the
  [proportional testing policy](decisions/proportional-testing-policy.md).
  Require the complete active owning suite and relevant regressions at final
  integrated acceptance before marking the parent task done. Slicing does not
  duplicate all dependency checks at every checkpoint or defer mandatory safety.
- Keep each handoff concise: task/slice, accepted behavior and interfaces, changed
  paths/artifact identity, exact safe commands/results, unresolved issues, current
  grants and next permitted action. Include versions and limitations where
  relevant. Preserve role-private boundaries; no raw private data or cross-role
  implementation/test-source disclosures.
- Authorize slices sequentially; no automatic successor, context renewal, agent
  restart or whole-task-matrix grant. Existing role independence, exclusive edit
  ownership, safety/release gates and stopped/parked work stay unchanged.

[T06's five proposed slices](tasks/t06-sessions-refresh.md#proposed-bounded-slices)
apply this policy to the current ready task. Recording the policy/proposal opens
no implementation, test-source or execution window.

## Standing Herdr authorization

The user authorizes Herdr operations for project coordination and explicitly
instructs coordinators not to ask permission for those operations again. This
standing authorization applies to task staffing, inspection, prompts and agent
session lifecycle operations; fresh Developer/QA sessions are selected for T05.
Carry this instruction into future coordinator handoffs rather than presenting
another Herdr-permission questionnaire.

Preserve the current tab/cwd, coordinator focus and existing Developer/QA pane
stack. Do not create unnecessary topology or resume parked tasks. This permission
does not expand a bounded implementation/test grant, authorize live services,
actual product writes, staging/commits, changes to local .pi/settings, or approval
of unrelated security/trust dialogs. Keep asynchronous communication and role
independence; no status/output polling loops.

## Standing proportional testing instruction

The user explicitly extends reduced test scope to ALL future project work.
Follow [the standing policy](decisions/proportional-testing-policy.md) in every
assignment/handoff, not just T05. Default to a small contract/risk-based matrix,
representative important failures, simple reused fixtures and EARLY role-scoped
syntax/type/lint/format/import checks. Focused repair runs; complete active owning
and relevant regression checks at final acceptance, not every small edit.
Keep selective high-value unit tests rather than abandoning them; prefer real
isolated integration checks for HTTP/TLS, storage/providers and delivered MCP/
backend boundaries. Require a meaningful bug/risk rationale, not a unit-test quota,
coverage-percentage or line-ratio target. Avoid private-function assertions,
implementation-mirroring mocks and redundant tests. AI-generated tests still derive
independent oracles from specifications, never production code. This grants no
blanket deletion of existing tests or weakening of required coverage.

No default exhaustive combinations, generalized Node/runtime interceptor, simulator,
proxy or stress/mutation framework. If test infrastructure dominates the feature,
simplify before expanding; a new generalized framework/exhaustive campaign needs
specific justification and explicit user approval. Preserve mandatory contract/
security/recovery/release gates and honest active/deferred evidence. Do not change
oracles to fit broken code, count skips as passes, silently exclude failing suites,
or relax independent-role/frozen-target rules.

## T02 fresh-session assignment

At the user's request, the T01 Developer/QA processes were exited and fresh Pi sessions
spawned for T02 in the same stacked right-hand panes with the same selected model.
No T01 conversation was resumed. Workspace trust is explicit for these new coding
sessions; they were launched with --no-mcp, but that flag is not proof of actual
host isolation (one observed footer reported MCP enabled). This is not trust or
certification of an experimental host under test, which must use independently
verified isolated disposable runtime settings.
The [T02 work order](tasks/t02-work-order.md) restores role boundaries and handoff context
from specifications, not from the other agent's implementation/test internals.

## Current scope override

The user parks T02 and removes custom/external permission extensions from the
product plan. Only config-file writesEnabled governs routine-creation permission;
see [the policy revision](decisions/routine-creation-config-policy.md). Preserve
old sources/tests/evidence without reclassifying them as accepted or resumed.
T13/T14 are retired; T03/T04 and the remaining portable MCP work are independent
of parked T02. No automatic successor or subordinate renewal is currently
scheduled. Fresh bounded assignments are still required; this docs update opens
no implementation or QA artifact window.

## T03 fresh-session assignment (accepted; no successor assigned)

The user authorized starting T03 and fresh Developer/QA agents via Herdr.
Prior idle subordinate sessions were exited and fresh Pi sessions launched in
those same panes with meta/muse-spark-1.3-contributor; no extra topology or
coordinator succession. Current roles: coordinator/w4:p2K,
developer/w4:p2G, qa/w4:p2H. User focus and current cwd/tab were preserved.
Read [T03 work order](tasks/t03-work-order.md) and
[approved public schema/codec spec](decisions/t03-approved-schema-codec-spec.md).
These authorize only bounded T03 implementation/testing and explicit baseline
metadata repairs, not T02 resumption, real writes or a whole-matrix grant.
Frozen-artifact relay and independent role boundaries remain mandatory.
T03-f1 is accepted with [independent/clean-install evidence](evidence/t03-coordinator-review.md):
221/221 domain and100/100 foundation; initial failures/adjudication retained.
The assignment ends at T03, not automatic T04/T05 work or coordinator renewal.

## T04 fresh-session assignment (accepted; no successor assigned)

User authorized starting T04, selected Linux x64 Secret Service and fresh
Developer/QA agents via Herdr. Existing right-hand panes were available shells;
fresh Pi sessions started in w4:p2G/w4:p2H, with
meta/muse-spark-1.3-contributor and `--no-mcp --no-approve`. Coordinator remains
coordinator/w4:p2K. No prior sessions resumed, extra topology or focus changes.
Read [T04 work order](tasks/t04-work-order.md) and
[approved public spec](decisions/t04-approved-storage-spec.md).

T04-f4 is accepted with [independent/clean-snapshot evidence](evidence/t04-coordinator-review.md):
owning123/123, foundation100/100, T03221/221; locked136-file snapshot production
checks and identical build bytes. Earlier failures/process deviations remain.
All T04 implementation/testing/relay windows are closed; agents hold without any
successor assignment. T05/T09 ready, unassigned. No personal keyring/system runtime
fallback, actual writes, staging/commits, extra topology or automatic renewal.

## T08-S2 accepted — all windows closed

S2 c2/SDKf2+configuredf3 [ACCEPTED](evidence/t08-s2-coordinator-review.md):
112/112=20owning+92relevant regressions in two same-candidate runs,217stable inputs,
final four pinned Coordinator checks/126identical outputs and real isolated
provider/HTTPS/release/cleanup. Original F1four failures/unknown fourth fields and
process/fixture/oracle repairs retained. [Current pickup](handoffs/t08-s2.md).
All source/static/build/install/target/fixture/provider/cleanup windows CLOSED,
roles HOLD; parentT08 incomplete, S3 ready/unassigned. No automatic successor.

User selected fresh gpt-6.1-sol/medium Pi Developer/QA sessions for S2. Later waived
this run's90-minute checkpoint, then explicitly resumed closure after roles held.
Fresh Developer DOC-ONLY /new context preserved same model/pane/cwd/focus; narrow
compatibility/ADR notes and format check completed, no implementation/runtime
renewal. Standing policies and safety/release gates otherwise unchanged.

## T08-S2 historical opening — first bounded source window

User explicitly authorized starting T08-S2 with fresh gpt-6.1-sol/medium Developer
and QA agents, replacing prior idle Muse sessions in w4:p2H/w4:p2M.
[Activated work order](tasks/t08-s2-work-order.md) and
[opening record](evidence/t08-s2-coordinator-start.md) govern exclusive source scope,
proportional verification, exact QA source-check approvals and execution holds.
Preserve tab/cwd/Coordinator focus; no extra topology or local .pi/settings/trust edits.
Developer source/four production checks/build and QA source preparation are OPEN;
install/target/suite/fixture/provider/runtime work remains CLOSED until separate
frozen relay. Target60–90min/checkpoint90/stop120; hold at readiness, no automatic
renewal/S3/successor, actual writes, staging/commits or release.

## T08-S1 accepted — all S1 windows closed

S1 c3/f2 is [ACCEPTED](evidence/t08-s1-coordinator-review.md):owning39/39 +regressions62/62,
101/101PASS,137stable inputs, four pinned production checks, real isolated provider/
HTTPS/cleanup and limited import observation/source audit. F1 failure/unknown code,
role/toolchain/review misses preserved; only normative fixture corrected.
[S1 handoff](handoffs/t08-s1.md). ALL source/static/build/install/target/fixture/runtime
windows CLOSED; both roles HOLD. Parent T08 incomplete; S2 ready/unassigned, S3 held.
No automatic successor/context renewal, writes/.pi/trust/staging/commits/release.
Initial two-hour window checkpointed; narrow explicit F2 assignment used a fresh QA
/new in the same pane, Contributor/high/cwd/focus preserved, not silent extension.

## T08-S1 historical opening — first bounded source window

User instructed the new Coordinator to complete prerequisites and start S1.
[Activated work order](tasks/t08-s1-work-order.md) supplies settled public behavior,
exclusive role ownership and proportional checks; [opening evidence](evidence/t08-s1-coordinator-start.md)
records baseline/toolchain/staffing. Existing Developer w4:p2H and QA w4:p2M were
idle; /new confirmed fresh independent Contributor/high conversations in the same
tab/cwd, preserving Coordinator w4:p2K focus. No topology/.pi/trust changes.

Developer source/static/build and QA source preparation are OPEN only for S1's
first bounded window. QA static checks need reviewed exact nonempty filenames.
Install/target/fixture/provider/suite execution stays CLOSED until environment
confirmation and named frozen relay. Target60–90min/checkpoint90/stop120 with honest
partial handoff; hold at readiness. No context renewal/S2/S3 successor, actual
writes, staging/commits/release. T06 windows remain closed and omissions retained.

## T06 final disposition — user-directed completion, ALL windows closed

User directed finishing T06 and omitting remaining verification. S5 owning30/
parent859PASS; clean locked install/production checks/102identical outputs green.
Final clean behavioral replay/new import smoke/QA reconfirmation WAIVED/UNRUN,
not passed; [closure](evidence/t06-s5-coordinator-closure.md) retains old failures,
count mistakes and ungranted whole-repo discovery/unknown original observations.
ALL source/static/build/install/runtime windows CLOSED, Developer/QA HOLD ALL.
[Next-Coordinator pickup](handoffs/t06-complete-coordinator-pickup.md): T07/T08/T09
ready/UNASSIGNED, no uniquely required next task. No successor selected or started.
Current same panes: coordinator/w4:p2K, developer/w4:p2H, qa/w4:p2M; preserve tab/
cwd/focus/Contributor-high. Fresh independent role contexts only AFTER explicit
next assignment; no automatic restart/topology/.pi/settings/trust edits, actual
writes, staging/commits/release. This is ONE-OFF task closure, not a new testing
policy or waived shared safety/release gates. Older assignment statuses historical.

Future runtime safeguard: construct explicit argv array, assert exact expected
NONEMPTY file list before Vitest; scope deviation => STOP/report BEFORE continuing.
Keep complete original observations before cleanup, not aggregate pass-label guesses.

## T06-S4 final disposition — accepted, all windows closed

User authorized T06-S4 only, now [accepted c4/f3](evidence/t06-s4-coordinator-review.md):
independent33owning+202regressions,zero fail/skip; clean189-source locked reproduction,
100identical compiled files,289stable hashes and small8export smoke/source audit.
[S4 handoff](handoffs/t06-s4.md). ALL S4 source/helper/static/build/install/target/
fixture/rerun windows CLOSED; Developer/QA HOLD ALL. S1–S4 accepted/closed; S5
unassigned, parent T06 incomplete/T07/T08 blocked. No automatic successor/context
renewal/product writes/staging/commits/release. Frozen work-order/repair/relay bytes
unchanged; acceptance closure supersedes historical permissions.

Existing panes retained: Coordinator w4:p2K, Developer w4:p2H, QA w4:p2M, same tab/cwd;
fresh subordinate conversations via /new confirmed, selected Contributor/high
preserved. No extra topology or .pi/settings/trust changes. Standing Herdr applies;
asynchronous milestone/readiness/result messages, no status polling loops. Only
common public specification-level decisions crossed independent role boundaries.

Initial production/QA source findings and f1/f2 owning failures retained. TWO original
f2 failure identities irretrievable after tail-only capture; unverified pass labels
withdrawn, never reconstructed/retroactively passed. Fixture/oracle corrections
derived from unchanged specs; NEW f3 full output +all same33cases independently green.
Coordinator source-review misses and clean R1 duplicate npmrc failure retained;
distinct owned user/global configs then unchanged clean proof green. No whole-suite,
OS-sandbox/power-loss/real backend/browser/host/provider/release claim.

## T06-S3 final disposition — accepted, windows closed

User instructed Coordinator to start T06-S3 only, now
[accepted c1 / t06-s3-f1](evidence/t06-s3-coordinator-review.md): independent
QA33owning+169regressions,zero fail/skip; clean171source locked reproduction,
98identical compiled files,269stable hashes and small seven-export import smoke/
source audit. [S3 handoff](handoffs/t06-s3.md). ALL S3 source/helper/build/install/
fixture/target/rerun grants CLOSED; Developer/QA HOLD ALL. S1/S2 accepted/closed,
S4/S5 unassigned, parent T06 incomplete and T07/T08 blocked.

Fresh role contexts used existing Developer w4:p2H/QA w4:p2M, Coordinator w4:p2K;
selected Contributor/high preserved, same tab/cwd/focus, no new topology or
.pi/settings/trust changes. [Opening evidence](evidence/t06-s3-coordinator-start.md).
Prior source/repair/relay grants historical, superseded by closure WITHOUT changing
frozen bytes. Initial source findings, honest clock-prose correction and disclosed
Developer out-of-grant import/Coordinator version-only diagnostic retained, not
acceptance evidence. Only common specification-level clarification crossed roles.
No actual writes, staging/commits/release or automatic context/slice succession.

## T06-S2 final disposition — accepted, windows closed

User instructed Coordinator to start T06-S2 only, now
[accepted c2 / t06-s2-f1](evidence/t06-s2-coordinator-review.md). Independent
QA40owning+129regressions,zero fail/skip; clean161-source locked reproduction,
96identical compiled files,257stable hashes and small import smoke/source audit.
All S2 source/build/target/fixture/relay/rerun grants CLOSED; Developer/QA HOLD ALL.
[S2 handoff](handoffs/t06-s2.md). S1 remains accepted/closed; S3–S5 unassigned,
T06 incomplete and T07/T08 still blocked.
Current tab/cwd/focus and existing Developer w4:p2H / QA w4:p2M panes are preserved;
new S2 conversations use the selected Contributor model, not cross-role history.
Coordinator remains coordinator/w4:p2K. No new topology, whole-task grant, actual
writes, .pi/settings edits, staging/commits or automatic context/slice succession.
[Opening evidence](evidence/t06-s2-coordinator-start.md) records baseline and grants.
Prior opening/repair/relay windows are historical and superseded by acceptance
closure without changing frozen bytes. Initial source failures and disclosed
Developer diagnostic deviation remain preserved. Public contract clarifications
were shared; role-private findings/sources were not cross-role input. S2 is not
production-ready refresh until S3 recovery; no successor/context renewal.

## T06-S1 final disposition — accepted, windows closed

User authorized starting T06-S1. Coordinator published the
[decision-ready work order](tasks/t06-s1-work-order.md), claimed parent T06 as in
progress/S1 only, and started fresh independent Developer w4:p2H and QA w4:p2M
in the existing right-hand panes; Coordinator is coordinator/w4:p2K. Same tab/cwd,
focus preserved, no prior conversations resumed. Selected model remains
meta/muse-spark-1.3-contributor, --thinking high --no-mcp --no-approve; startup
flags are not an OS sandbox. Both starts returned interactive_ready and role
assignment prompts were submitted asynchronously. [Start evidence](evidence/t06-s1-coordinator-start.md).

[S1 acceptance](evidence/t06-s1-coordinator-review.md):c2/f1,51owning+399regressions,
zero skips,clean155-source locked reproduction/production checks,94identical
compiled files and249stable hashes. Initial QA398/399calibration failure retained;
focused16/full399rerun passed with unchanged source/oracles and corrected sibling
HOME/TMPDIR fixture layout. [S1 handoff](handoffs/t06-s1.md).
All S1 source/build/target/fixture/relay/rerun windows CLOSED; Developer/QA HOLD
all actions. Parent T06 incomplete; S2–S5 and T09 remain unassigned. No actual writes, automatic successor, .pi,
staging/commits or release. Earlier closed T04/T05 grants remain historical.

## T05 final disposition — accepted, historical hold

[Acceptance](evidence/t05-coordinator-review.md): c4/f3, QA228owning+444regressions,
0skips; independent clean locked reproduction/production checks PASS, rebuilt bytes
identical and193hashes stable. [Daily handoff](handoffs/t05-end-of-day.md).
All T05grants CLOSED. Developer/QA hold ALL actions; no checks/source/build/install/
config/runtime or successor. T06/T09 are ready but unassigned. User requested
wrap-up today, not another task. No actual writes, .pi, staging/commits or release.

### Historical T05 fresh-session assignment (closed)

User authorized starting T05, selected fresh Developer/QA via Herdr and supplied
standing permission for future Herdr project-coordination operations (above).
Coordinator remains coordinator/w4:p2K; use the existing stacked right panes,
Developer w4:p2H and QA w4:p2M, with the selected
(the user stopped the prior agents; the discovered right-hand pane IDs changed),
meta/muse-spark-1.3-contributor model. Fresh Pi processes successfully started
in those exact panes with --thinking high --no-mcp --no-approve; asynchronous
role-specific proposal/plan assignments submitted. No previous conversations are
resumed. Startup flags are not an OS sandbox or comprehensive isolation proof.
Read [T05 work order](tasks/t05-work-order.md) and
[approved public transport spec](decisions/t05-approved-transport-spec.md).
After independent planning and two design rounds, bounded implementation and
independent QA test-source windows are open. QA compiled-target/loopback/suite
execution awaits an explicit reviewed frozen artifact relay. Developer owns
production/install/build checks only; role boundaries unchanged. c3 is now HELD; the
[t05-f1 frozen relay](evidence/t05-f1-coordinator-relay.md) authorizes only the
first exact15-suite owning QA run with191-file before/after hash checks. Active
QA sources/fixtures are held; evidence-only reporting then hold.
The user subsequently approved a
[bounded verification plan](decisions/t05-bounded-verification-plan.md): retain
core transport safety checks, simplify import/proxy fixtures, defer the general
interception framework without deleting or passing it. QA adapted sources and
used scoped early lint/format; final regression/clean-install gates subsequently
passed as recorded above. These earlier execution grants are closed. T09 remains
unassigned; T02 parked and T13/T14 retired. No actual writes, .pi changes,
staging/commits, extra topology or automatic successor.

## Historical T02 automatic coordinator succession (parked)

After accepted R1/S2B, the user authorized a fresh coordinator for each remaining
fixed slice, oriented from documentation, followed by predecessor-pane closure
once the successor is ready. The chain ends at T02; blockers stop progression.
The [coordinator-only policy](handoffs/t02-coordinator-succession.md) defines
READY/TAKEOVER ownership, simple prompts and final stop conditions.

One temporary successor split in the current coordinator pane/tab/cwd is expressly
authorized for overlap; no accumulating panes or extra tabs/workspaces/worktrees.
Preserve the existing Developer/QA stack and sessions. Before takeover only the
predecessor edits/delegates; after takeover only the successor does. Do not rely
on old coordinator pane IDs; announce the actual reply identity each handoff.

## Communication: asynchronous, no polling

Agents communicate through their Herdr tools. The coordinator supplies its live agent
name/pane ID with each assignment. Subordinates send concise milestone, interface,
blocker and completion messages using:

```sh
herdr agent prompt coordinator "T01 / Developer: <sanitized status or question>"
```

Use asynchronous prompts, without `--wait`. The coordinator likewise sends assignments
and decisions using `herdr agent prompt developer ...` or `herdr agent prompt qa ...`.
Do not poll pane output, repeatedly list agents, or run status/read loops to discover
completion. Initial topology/startup inspection is allowed; completion is reported by
messages. If startup fails, inspect the specific failed startup once to diagnose it,
without treating timeout as proof that no process started.

Messages include task ID, role, changed paths, safe commands/results, blockers and the
next decision needed. No secrets, account IDs, personal content or raw private bodies.
Agents do not directly feed one another implementation or test details: route interface
questions through the coordinator as specification-level decisions.

## Independent work and shared contracts

The shared MCP/backend contracts remain normative; local architecture/task documents
provide implementation scope. An agreed, coordinator-reviewed public interface and
observable entry-point behavior are specifications, not production implementation.
Both agents may read those interface specifications and nonsecret package/build metadata.

For each assignment the Coordinator supplies a concise work order containing:

1. Outcome, prerequisites, exact scope and explicit non-goals; never infer
   readiness from stubs.
2. Normative references and a settled common public API/observable behavior
   contract, including relevant safety/error/recovery boundaries. Identify
   genuinely unresolved decisions and hold dependent work.
3. Exclusive write ownership by path, forbidden read paths, permitted commands,
   provisioned environment and current implementation/build/test execution grants.
4. A short proportional verification scope: core requirements/risks, representative
   success/failure checks, simple fixtures, early source-quality checks, complete
   active owning/final relevant regressions and explicit deferrals. QA chooses
   independent cases/oracles; no exhaustive harness by default.
5. Deliverables, reporting milestones, integration/freeze order, escalation and
   stopping conditions. Broad design documents are not default deliverables;
   explicitly bound any requested exploration by question/output/stopping point.

Developer owns implementation paths; QA owns test/fixture paths and QA evidence. The
coordinator owns task/index status, interface decisions and integration/review evidence.
Only one owner edits shared manifests, lockfiles and configuration at a time. QA requests
needed scripts/dependencies through the coordinator rather than racing Developer edits.
Do not modify shared-docs to accommodate a failing implementation.

Work in parallel when prerequisites and interfaces are agreed: QA can derive tests while
Developer implements from the same specifications. If an interface is not yet agreed,
QA may plan coverage, but must not guess it or reverse-engineer implementation code.
QA may execute the compiled public entry points and inspect observable results; that
does not authorize reading implementation sources. Developer may run permitted build
checks, but the coordinator/QA run the independent suite and report specification-level
failures without exposing test source to Developer.

## Coordinator review and completion

The coordinator may inspect both production and test code, run the combined checks and
review failures against the specifications. Resolve ambiguity in a shared specification
before requesting fixes; do not teach either agent the other's internal implementation.
Independent tests must cover real assertions, not just agree with production behavior.

Claim tasks in both docs/tasks/README.md and their individual files before work. Keep
implementation tasks in progress/blocked until all acceptance checks pass. Record
sanitized handoffs and update verification evidence; mocks, skips and dependency installs
are not interoperability/release passes. Do not enable real writes, use personal/live
services, commit credentials, publish or deploy as part of coordination.

## Initial work sequence

Start with **T01: foundation**. Agree its module/interface contract first; then Developer
builds the pinned development foundation while QA independently builds synthetic
foundation/entry-point smoke checks. Coordinator reviews both and runs a clean locked
install plus typecheck/lint/build/tests before accepting T01.

Only after T01 acceptance do T02 (Pi gate feasibility), T03 (schemas/codec) and T04
(protected storage) become ready. With only two subordinate agents, the coordinator
sequences implementation and independent QA slices rather than assuming three tasks can
all receive dedicated developers. Current user scope parks T02 and selects T03
schemas/codecs next, followed by independently ready storage/read work. Revised
roadmap dependencies remove retired companion tasks. External auth/backend/storage
verification remains required; shared MCP draft0.2 is aligned in the uncommitted
working tree, without changing backend v1. Old approval tests/evidence stay historical.
