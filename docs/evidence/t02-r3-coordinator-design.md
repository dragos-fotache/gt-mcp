# T02 R3 coordinator design checkpoint

**Audience:** coordinator/Developer only; not QA input. QA receives public spec
§14, not this source/API/probe record. **Disposition:** bounded design complete;
implementation and independent acceptance NOT yet reviewed/passed.

## Ownership and authority

Coordinator / w4:p2K received TAKEOVER from coordinator_prev / w4:p2J;
predecessor pane closed, caller occupies left half, right Developer/QA stack
preserved. Existing stopped roles orderly exited via /quit. One bounded
process/pane inspection confirmed each foreground was its interactive shell,
then fresh Pi sessions started in the SAME panes without resume/fork:
developer / w4:p2G and qa / w4:p2H, meta/muse-spark-1.3-contributor, --no-mcp.
Both sent asynchronous oriented READY. No host credentials/settings, extra
pane/tab/workspace/worktree, staging or commit. --no-mcp is not isolation proof.

Bounded design: docs/tasks/t02-r3-work-order.md; shared observable interface:
docs/decisions/t02-approved-experiment-spec.md §14. Only ten registered R3 SDK
profiles, six accepted SDK regressions. Counts unchanged:13 slices,4 accepted,
9 remaining; six accepted profiles,35 unverified. T02 remains incomplete.
The latest user fresh Developer/QA requirement applies to every future slice.

## API and mechanism review

Selected Node24.21.0/npm11.19.0 verified; pinned installed Pi1.1.0. Read local
AGENTS, pickup/succession/finite plan/current task, public spec/architecture/
verification/roadmap, T01 approved foundation and implementation ADR, shared
MCP tools/authentication/routine-creation/acceptance and accepted R2 evidence.
No moving-web/latest API substituted for installed pinned declarations/source.
Relevant pinned Pi extension/MCP/SDK/TUI/codemode/configuration/settings docs
read completely. SDK codemode-MCP/full-control/session-runtime and extension
permission/dynamic-tool examples plus exported service/runtime/loader/MCP
option declarations reviewed. Loader omission and native lifecycle source
corroborate selected public mechanisms; no private API import/patch is designed.

Disposable coordinator wiring probe (mechanism evidence, NOT public driver/QA
acceptance) constructed sanitized HOME/XDG/Pi/session/cwd/TMP roots before Pi
import in one owned child process group, closed model/provider/runtime/resources:

- Named inline native MCP marked replaceable:true was actually omitted when
  the known diagnostic registered /mcp. Returned inventory had diagnostic
  ownership; loader errors0/warnings0; loadConfig calls0 before binding.
  No fabricated builtin warning is required for this inline profile.
- await native runtime.dispose on that unbound target emitted one genuine
  shutdown and left no fixture ledger/connection. No target bind/start/prompt
  or guessed actual mode was claimed.
- A separate mechanism branch bound actual print/no-UI readonly companion with
  hidden creation. Native active/callable sets were exactly six reads, registered
  hidden exposure exactly create_routine. Actual get_exercise succeeded; genuine
  direct creation start/end joined native ID and returned unavailable-tool
  isError:true, not a mode gate denial. Fixture final0 had explicit nulls.
- Child exit0, natural stdio close, owned group ESRCH, no overflow/timeout and
  disposable roots removed. No real backend/provider, approval/listener/effect.

The combined exploratory probe loaded companion twice in the same journal,
which resets that producer's pseq; its full journal is therefore NOT a conformant
accepted artifact. It was not fed to a validating driver or counted as readiness.
The final design specifically loads companion ONCE per R3 scenario: refused
unbound target then no-companion native refusal probe, or hidden target alone.
The sdk-worker writer persists throughout, with physical append/pseq validation.
No test assertion/specification is weakened to accept a reset sequence.

## Chosen refusal boundary and limits

First nine profiles: actual target loader/config/binding observations and a
specific launcher refusal before any target bind/connect; dispose target, then
explicitly labeled absence-only native session supplies real unknown-tool result.
It is NOT companion per-call gate proof or successful binding of rejected profile.
Static configuration is the actual closed launcher-owned native loadConfig input,
not Pi's unexported default-file-parser API or ambient CLI discovery. All executable
entries use only the readonly fixture with original approved path and no sidecar.
Both normalized insertion orders are fixed; no placeholder 'shadow' executable.
Binding ambiguity is two valid trusted candidates, never model labels.
Hidden is connected readonly and requires actual hidden exposure/native unavailable
call plus fixture final0; absence is never fabricated as a fixture ledger.

No source implementation edited by coordinator. Bounded Developer window and
QA specification-only preparation assigned asynchronously; QA artifact execution
still CLOSED. Await source-ready/QA-source-ready milestones, not output polling.
Any API/check/security/cleanup blocker stops this slice/chain. R5 PTY corroboration,
R10 calibration and R11 final acceptance remain future fixed scopes. Ambient CLI,
IPC and non-OS-sandbox limits remain; no product/T17/overall T02 certification.
