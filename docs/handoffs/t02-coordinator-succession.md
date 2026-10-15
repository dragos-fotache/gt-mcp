# Automatic coordinator succession — T02 only

**PARKED / HISTORICAL ONLY:** the user parks T02 and selects
[configuration-only routine creation](../decisions/routine-creation-config-policy.md):
no custom/external permission extension or per-routine approval. Shared MCP
draft0.2 supersedes the old product approval policy. Preserve this document as
the original experiment/design/succession record; do not rewrite old assertions
or failures as current-policy passes. No further R3–R11 execution, automatic
succession or artifact QA relay is authorized. R3 remains an unaccepted candidate.
All "latest", "OPEN", authorization and next-slice instructions below are
historical and overridden by this parking notice.

**Audience:** coordinator only. Do not give coordinator-private handoffs/design/
source reviews or QA evidence to the wrong subordinate role.

## Latest user instruction and authority

After accepting R1/S2B, the user instructed the outgoing coordinator to start and
orient a fresh coordinator for the next slice, close its own pane once the successor
is ready, and have each successor repeat this handoff after finishing its slice.
**Automatic succession ends at the end of T02.** This supersedes the old requirement
for a new user resume instruction before each remaining planned T02 slice.

Standing authorization is for the fixed next slices R2 through R11, one coordinator
per slice and only one active implementation slice at a time. **Latest additional
user instruction:** retain the existing Developer/QA sessions for current R2;
for every future slice (R3 onward), start fresh Developer AND QA sessions as well
as the fresh coordinator. No role resumes/forks its predecessor conversation. It is not permission
to delegate the entire matrix, add slices/scenarios/dependencies, weaken acceptance,
start T03+, enable product writes, stage/commit or change personal Pi settings.
A genuine unresolved blocker stops execution and the chain for user/coordinator
resolution; never skip a failing prerequisite or spawn successors indefinitely.

## Orientation and bounded work

1. Read `AGENTS.md`, `docs/README.md`, `docs/handoffs/t02-coordinator-pickup.md`
   and the current task/finite plan/public specification. Follow normative refs
   and complete pinned Pi docs/API/examples before designing your assigned slice.
   Handoffs are orientation, not substitute runtime evidence.
2. Determine the first unaccepted slice in the fixed plan. At this handoff it is
   **R3**, with S1/S2A/R1/R2 accepted:13 total slices,4 accepted,9 remaining.
   Six accepted SDK profiles leave35 unverified registry profiles (14 SDK +21 PTY).
   Review accepted evidence. R2 retains existing Developer/QA; R3 onward must
   safely replace both subordinate sessions in their existing panes before opening
   the new slice's work windows (see Fresh subordinate sessions below).
3. Coordinator owns concrete design and public interface decisions. Before
   delegation write the bounded work order and exact checks/gates/stop conditions;
   do not return architectural uncertainty or the whole matrix to Developer.
4. Preserve Developer/QA independence, exclusive edit ownership, isolated synthetic
   experiments, selected disposable toolchain and serialized frozen QA windows.
   Receive asynchronous milestones only; no agent/output/readiness polling.
5. Accept your slice only after coordinator review and independent QA evidence/
   relevant regressions. Record exact scoped results, failures/repairs, artifact
   identity and limitations; update pickup/task/index/plan before handing off.

## Safe handoff procedure

The user authorizes one **temporary successor pane** in the same existing tab and
repository for coordinator overlap. Do not create another workspace, tab or
worktree, move Developer/QA panes or leave an accumulating trail of coordinator
panes. After predecessor closure, successor occupies the coordinator's left-half
position and the existing right-side Developer/QA stack remains.

- Read the Herdr skill; require HERDR_ENV=1; inspect current caller/layout and the
  installed CLI once for startup, not as a readiness/completion loop.
- Start a fresh Pi session in a temporary split of your own coordinator pane,
  same cwd, selected pinned Node PATH/T01_NODE_HOME. Preserve focus until ready.
  Do not resume/fork the previous conversation or edit host settings.
- Match the outgoing coordinator's nonsecret PI_PROVIDER/PI_MODEL selection when
  available; this handoff used openai-codex / gpt-6.1-sol. Developer/QA remain their
  existing sessions/models. `--no-mcp` is a coding-session launch precaution, not
  proof that experimental runtime isolation is satisfied.
- Give a **short prompt only**, directing the successor to this documented pickup.
  Example (substitute the actual predecessor reply name):

  > You are the new coordinator for the next T02 slice. Orient using AGENTS.md and
  > docs/handoffs/t02-coordinator-pickup.md, including its succession policy. Send
  > READY to coordinator with your slice and pane, then await takeover.

- Send asynchronous prompts without --wait. Successor reads docs, confirms the
  next slice/current state/safety and sends a single READY message to the actual
  predecessor identity. **An agent-start readiness response alone is not proof
  that orientation is complete.** Do not begin slice execution before takeover.
- Predecessor remains sole coordinator/editor until READY; successor may read docs
  but does not edit shared status/design or prompt subordinates during overlap.
  No two coordinators delegate or edit shared files concurrently.
- On READY, predecessor records the successor's actual pane, renames itself to a
  unique outgoing name and successor to `coordinator`, announces the actual reply
  identity to Developer/QA, then sends TAKEOVER. No extra user approval round.
- Predecessor closes **only its own explicitly authorized pane**, after successor
  is oriented and ownership transferred. Preserve the successor and subordinate
  processes, never kill the Herdr server or global processes. If closure outcome
  is unknown, do not blindly retry or close some other pane.
- Successor takes exclusive coordination, executes only its next fixed slice,
  then repeats this same documented procedure with a fresh coordinator.

No waiting/polling loops: use the successor's asynchronous READY message. If
startup is blocked/failed, inspect the specific startup once and report rather
than treating a timeout as proof no process exists. Do not answer an unexpected
trust/auth/approval dialog or alter provider credentials without authority.

## Fresh subordinate sessions — required from R3 onward

The user's latest instruction requires a fresh Developer and a fresh QA for
EVERY future slice. Current R2 alone retains developer / w4:p2G and qa / w4:p2H.
This changes session freshness, not the fixed slice count, role ownership,
independence, design gates, or right-side pane geometry.

1. Outgoing coordinator closes all source/build/QA target windows at the slice
   boundary and receives asynchronous safe-stop milestones from both roles.
   Record any owned-resource uncertainty as a blocker; never treat an idle badge
   as proof that session-owned experiments have closed. Do not hand off ongoing
   experiments or kill test groups globally.
2. Successor may orient during coordinator overlap but does not prompt, replace
   or assign subordinates until TAKEOVER. After takeover, it owns subordinate
   renewal before next-slice implementation/test preparation begins. Do not give
   the whole matrix to either new role.
3. Use the installed Herdr CLI and pinned Pi docs to perform supported orderly
   exit of each stopped subordinate, then reuse its SAME existing pane. Do not
   close/move the Developer/QA panes, create extra panes/tabs/workspaces/worktrees,
   or terminate unrelated processes. One specific exit/startup inspection is
   allowed to resolve uncertainty, not an output/readiness polling loop. Unknown
   exit outcome blocks replacement; never blindly launch over an existing agent.
4. Start fresh Pi sessions (no continue/resume/fork) in the repository with the
   selected disposable T01_NODE_HOME/PATH. Preserve the outgoing roles' nonsecret
   provider/model selection when available; current subordinate selection is
   meta / muse-spark-1.3-contributor. Do not inspect/change credentials or personal
   Pi settings, answer unexpected trust/auth dialogs, or upgrade the runtime.
   --no-mcp remains only a coding-session precaution, not experiment isolation.
5. Restore unique live names developer and qa after their previous occupants
   have exited. Send each a SHORT role-appropriate orientation prompt: AGENTS.md,
   public T02 spec/current bounded scope and actual coordinator reply identity.
   Developer may receive its new coordinator-written private work order after
   design; QA receives public requirements only. Never send this succession/
   pickup file, implementation plans/reviews or QA evidence to the wrong role.
6. Require single asynchronous oriented READY messages from both fresh roles;
   startup-interactive readiness alone is insufficient. Do not poll or --wait.
   Coordinator remains exclusive designer/status owner. Delegate only the next
   fixed slice, and keep QA target execution held for the exact artifact relay.

A successor startup or subordinate renewal blocker stops the chain with a retained
handoff, not a skip to another slice. After R11, no further coordinator or subordinate
renewal is authorized; report final T02 disposition and stop.

## Terminal boundary

After R11's genuine final T02 disposition, **do not launch another coordinator or
start another task**. Report acceptance or retained blockers and stop. The final
coordinator remains available in its pane; no successor exists to satisfy the
ready-before-close handoff condition. Any later work requires user instruction.
If a prerequisite/runtime/security blocker prevents progressing earlier, stop
with a retained blocked handoff instead of automatically moving to the next slice.

## Current handoff checkpoint

Outgoing R2 coordinator: coordinator_prev / w4:p2J, completed accepted R2 and
metadata reconciliation. All source/build/QA/metadata windows CLOSED; safe-stop
milestones received from developer / w4:p2G and qa / w4:p2H. Fresh R3 session
coordinator_next / w4:p2K started in the authorized temporary split of the
coordinator's own pane, pinned Node PATH, same cwd/tab, matching
openai-codex / gpt-6.1-sol, --no-mcp. ORIENTED READY now received for exact R3,
with fresh Developer/QA requirement acknowledged. Incoming renamed coordinator
/ w4:p2K; predecessor renamed coordinator_prev / w4:p2J. Ownership transfers
on TAKEOVER, then predecessor closes ONLY its own authorized pane. Incoming R3
coordinator must replace BOTH stopped subordinate sessions with fresh Pi sessions
in their existing panes before new work windows, without resuming/forking or
role contamination. Accepted sources/evidence preserved; no staging/commits.
Succession ends at T02 or unresolved blocker; live identities restored at takeover.
