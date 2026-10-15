# Coordinator pickup — T06 closed, choose the next ready task

Later T08-S1/S2 are accepted. The [current S2 pickup](t08-s2.md) supersedes older
next-task planning below: parentT08 incomplete, S3 ready/unassigned/held, all windows
closed. T06 omissions stay recorded and are not reopened or inherited as passes.

## Historical subsequent task selection — T08 design only

User subsequently selected T08 and requested a general design and slices.
[Coordinator proposal](../decisions/t08-general-design-and-slices.md): trusted runtime/read
boundary, seven-tool adapter, stdio delivery/integrated acceptance. T08 planning is
Coordinator-owned; Developer/QA remain HELD with all implementation/runtime grants
CLOSED. All three slices now have settled specifications/held work-order drafts
linked from the proposal; no implementation or acceptance follows. T07/T09 remain
ready/unassigned. The no-successor descriptions below record
the T06 closure checkpoint, not the current planning selection. No waived T06 check
is reopened and no source/test/execution grant is supplied by this update.

## Current disposition and authority

User directed **finish T06 now and drop remaining verification**; T06 is COMPLETE
with explicitly recorded omissions, not full verification/release certification.
[Closure](../evidence/t06-s5-coordinator-closure.md) is the CURRENT authority over
older partial/blocked checkpoints and historical grants, WITHOUT changing frozen
input bytes. All Developer/QA source/static/build/install/runtime windows CLOSED;
both roles HELD. No successor is selected/started. No staging/commits/release.

User also instructed **do not necessarily recommend T07 unless required next**.
There is NO uniquely required immediate successor. Ready choices:

| Ready task | Why ready | Outcome and next Coordinator decision |
| --- | --- | --- |
| T07 foreground browser login | T04/T05/T06 complete | Deliver trusted dedicated-session bootstrap; settle exact local command/config, fixed registered loopback origin, protected foreground exchange evidence and atomic installation/replacement handoff. |
| T08 read tools/stdio | T03/T05/T06 complete; does NOT require T07 | Deliver six read tools and exact seven-tool protocol surface, with disabled create placeholder; settle config/owner wiring and SDK validation/error-envelope behavior. End-to-end user login UX still needs T07 later. |
| T09 immutable journals | T03/T04 complete | Deliver operation admission/exact identity/recovery evidence; settle public journal API/format/reservation/storage headroom. Does NOT enable product writes or depend on T07. |

Choose based on the desired next deliverable, not task numbering. T10 waits on T09;
T12 waits on T07/T11; T15 waits on T08/T11. T02 remains parked/incomplete and
T13/T14 retired. No automatic execution/matrix succession from readiness.

## Evidence to retain, not redo automatically

S1–S4 accepted historical work; S5 production c2/QA r5 source approval. Actual S5
30/30 and final independent exact parent60files/859tests PASS, zero skips/todos/
unhandled/cleanup errors,341stable f2hashes; mandatory isolated real provider included.
Focused fixture15PASS; active77source-quality checks PASS. Clean239-source locked
install/four production checks and102identical generated files PASS.

User omitted final clean-snapshot BEHAVIORAL rerun, new ten-export import smoke
and additional guarded QA reconfirmation. Those are UNRUN/WAIVED for this task,
never passed. Do not reopen them as routine next-task work absent a bounded need/
new grant. Keep relevant verification gaps visible for packaging/release review.
Shared safety/contracts/real backend/Google/browser/host/release gates stay open.

F1 parent had two Coordinator fixture-posture failures, repaired in private launcher
(tmpfs temp separate from ext4 production roots, restrictiveumask0077), NO source/
assertion/contract changes. Actual S5 count30=11+19; old29/858metadata retained as
wrong, not rewritten. QA f2 accidental ungranted whole-repo72file/42failure run and
unauthorized continuation are recorded; original42failed identities UNKNOWN after
logs deleted, no retroactive pass/reconstruction. Valid exact60/859 is observed
separate evidence, not a whole-repo green claim. Do not hide that process deviation.

## Accepted public capabilities for integration

- T04 exclusive ProfileSession owner with atomic vault/operation persistence,
  one-way initial account bind and generation advance; old captured owner stale
  after transition, close then explicit reopen with returned binding. No automatic
  reset/lease guessing/personal keyring fallback. Real supported production roots
  ext4; diagnostic temp may be tmpfs. Operations are opaque auth-wise.
- T05 fixed configured-origin HTTPS routes, strict config/budgets, safe errors,
  exact mutation identity/results and one-attempt auth controls. No arbitrary
  route/header/sender/model credentials, redirects or ambient proxy authority.
- dist/auth/index.js has TEN runtime exports: accepted S1–S4 plus
  LIFECYCLE_VAULT_VERSION3/openLifecycleSessionState. Read-only factory opening,
  strict empty/v1/v2/v3 as specified; older standalone factories still refuse v3.
- S1 initial trusted service-confirmed install is for a pre-auth empty/v1 owner;
  S5 bound facade has nine exact resource methods, invalidate, trusted signOut
  and same-origin/same-account replaceGrant. No public tokens/hooks/control/sender.
  Returned new binding requires explicit owner close/reopen. Captured origin/
  account/profile/generation isolate all network selection and response delivery.
- S5 stores exact superseded grant/deadlines/pending token/body/key under OLD
  same-account binding, permanently fenced from authentication/replay. New-session
  rotation remains usable; no automatic operation resume/deletion/account adoption.
  Sign-out clears ALL auth material atomically before bounded best-effort logout,
  preserving operation evidence. Full details in frozen S1–S5 work orders and
  common lifecycle adjudication, not implementation-derived decisions.

**T07 integration uncertainty to settle before source work:** protected foreground
Google exchange body/key must coexist with strict existing vault readers and be
atomically consumed into initial/same-account grant installation. Do NOT assume
S1 can open a novel foreground-record version or erase uncertain exchange evidence
before grant commit; settle exact additive public record/API handoff against shared
contracts. No broad proposal round required: a concise decision-ready contract.

T07 config inputs (origin/public client ID/exact registered localhost port) must be
trusted placeholders if not provisioned; no real credentials/IDs/private paths in
chat/repo/evidence. Controlled tests are not live Google evidence (T19). T08 can
implement safe unconfigured/signed-out behavior without waiting for T07, but no
synthetic token-paste/initial credentials masquerading as delivered user bootstrap.

## Working setup and process rules

Repository shared baseline9a96dcb, SAME six existing approved MCP draft0.2 policy
edits; backend v1/OpenAPI1.0.0 unchanged. No commits/staging by any role. Config-file
writesEnabled strict boolean/defaultfalse remains sole future creation permission;
no custom/external extension or per-routine prompt. Actual product writes disabled.

Existing same tab/cwd/focus/layout: Coordinator coordinator/w4:p2K, Developer
developer/w4:p2H, QA qa/w4:p2M. Contributor/high selected for independent roles;
standing Herdr permission applies, do not ask again. No automatic restart; after
next task explicitly assigned, use fresh independent role conversations in SAME
panes, no extra topology/.pi/settings/trust edits. Check live IDs once before use,
not polling loops. Send asynchronous milestone/question/result messages.

Nonsecret disposable Node24.21.0/npm11.19.0 toolchain and portable approved provider
binaries/private fixture scripts are retained outside repo, availability/provenance
must be checked privately or reprovisioned. No ambient/system Node or personal bus.
Prepared clean snapshot/log/home/temp/cache scope was removed at user closure;
no live owned provider/durability work remains. Private locations are NOT in this
handoff; use trusted environment/relay inputs, never invent them.

Before next implementation: concise decision-ready task outcome/non-goals,
public behavior/interfaces, ownership/read boundaries, exact permitted environment/
commands/fixture and execution grants, small risk-based checks, milestones/stop.
No broad design/testing campaign by default. Developer chooses private internals;
QA derives independent oracles without production reads. Frozen-artifact relay
before QA target execution; no build/install overlap or hidden failed exclusions.

**Concrete execution safeguard:** build explicit argv ARRAY from hash-verified
manifest; assert EXACT expected NONEMPTY filenames before Vitest. Empty argv must
FAIL CLOSED, never repository discovery. Any scope/output/hash/cleanup deviation
=> STOP and report BEFORE continuation; preserve FULL original output and safe
failure identities before cleanup. No tail-only reconstruction/pass-label guessing.

Keep proportional testing and bounded context policy; task-specific waived final
T06 checks do not become a new standing default. Future release safety gates stay
mandatory. Pick/assign ONE ready task; this handoff authorizes none by itself.
