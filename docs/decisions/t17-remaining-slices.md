# T17 remaining slices after S1

> **T21-S5 plan revision (2026-10-18):** shared MCP draft0.3 removes
> operationId/journal/receipt-based creation recovery. Historical exact-recovery
> requirements are retired, not passed. T21-S4 integrated the current source runtime;
> T21-S5 adapts existing SDK print fixtures and this plan to invocation-local creation.
> This plan does not claim current runtime acceptance: use the separate T21-S5
> evidence for actual executed checks. Actual CLI/modes, host lifecycle/cancellation,
> persisted-session transitions, output/privacy and final T17 acceptance remain open.
> See [T21](../tasks/t21-remove-durable-creation-recovery.md). No T17 successor is opened.

**Authority:** user,2026-10-17: “plan the rest of T17, split it into slices”.
The original assignment was documentation-only; T21-S5 authorizes only the current
SDK fixture adaptation and plan refresh. S1 stays historically accepted/closed;
S2 is ready for separate assignment, S3–S5 are sequentially held. This refresh
opens no T17 successor implementation, test-source or runtime execution window,
and grants no release action.

Normative: shared MCP draft0.3 tools/authentication/routine-creation and acceptance
scenarios; unchanged backend v1; [parent T17](../tasks/t17-pi-certification.md);
config-only policy; the [T21 single-record successor specification](t21-single-record-storage-spec.md);
foundation specifications and
[proportional testing](proportional-testing-policy.md). Reuse
[S1 acceptance](../evidence/t17-s1-review.md), T12/T15 lifecycle/process evidence
and T16 actual-service/Android acceptance with their existing limits.

## Outcome and fixed boundaries

Close named Pi interoperability for the pinned Pi1.1.0/Node24.21.0/npm11.19.0
candidate and actually observed MCP protocol, without a permission companion or
per-routine prompt. S1 already proves SDK print direct/deferred/codemode/nested
paths, seven tools, MCP2025-11-25, false/missing denial, true authenticated save,
small complete envelopes and historical draft0.2 receipt identity. That evidence
qualifies its original artifact only. T21-S5 updates the existing SDK print checks
for fresh-call results, non-idempotent creation annotations and credential-only
storage; its handoff records the exact current results. Reuse accepted evidence
within its stated scope rather than rebuild every matrix at every slice.

Remaining uncertainty is actual CLI/mode behavior, host lifecycle/cancellation,
safe explicit fresh calls after host transitions, and host output/privacy limits.
Four further outcomes keep terminal qualification, interruption, restart/session
behavior and final integrated acceptance separately reviewable. This replaces the
original rough two-to-three-session estimate, not any retained requirement. Target60–90 minutes per
slice; checkpoint at90 minutes, stop at two hours with an honest partial handoff.
Each successor needs separate assignment; elapsed time never waives verification.

Public behavior stays settled:

- Only startup operator config `writesEnabled:true` permits valid creation.
  False/missing denies before mutation; invalid config fails closed.
  UI, mode, clientInfo, annotations, arguments, environment and extensions are not
  permission sources. Reads remain independently available.
- Config changes use **stop, await cleanup, update, relaunch**. Editing the file
  alone does not alter the running process. No watcher/hot reload is introduced.
  Effective disablement blocks new calls/unsent work; previous commits remain.
- Cancellation stops unsent work and retains uncertainty. A host may suppress a
  canceled reply; absence of a reply is not proof of rollback or success.
- Every explicit creation call is fresh, including identical and concurrent input.
  Success returns only routineId/status. No operationId, creation journal, stored
  request/receipt or cross-call deduplication remains. Hosts must not automatically
  repeat creation after cancellation, lost replies or reconnect. Users may inspect
  list_routines/get_routine and choose whether to make another fresh call.
  Starting/reconnecting/resuming/forking alone never starts domain work.
- Preserve backend exact-byte/key identity only for bounded HTTP retries inside
  one invocation. Creation execution errors have retryable:false; safe uncertainty
  may include authorized routineId/lastConfirmedStep/outcomeUnknown. These are
  observations, not recovery credentials. Credential pending-refresh identity and
  ownership/auth/session fences remain independent requirements.
- The adapter returns a complete canonical result or explicit result_too_large.
  Host display shortening is a separate observation, never a valid partial
  canonical success or permission source. Ordinary diagnostics exclude secrets
  and domain bodies; requested data may remain in host transcripts/temp output.

## S2 — Actual CLI registration and modes

**Prerequisite:** accepted S1. **Status:** planned, ready/unassigned.

Use the installed pinned Pi CLI entry and its normal file-configured native MCP
registration from a fresh private agent directory. Target one supported terminal
renderer plus actual print text, JSON and RPC interfaces. Run the interactive
journey in an owned real PTY with terminal stdin/stdout; binding an SDK context
to `interactive` does not qualify it. Use a local scripted model/provider only;
its explicit test extension is not a permission gate. Load no personal resources.

Observe seven-tool discovery/negotiation and representative read/creation calls
with false and true policy in each targeted interface, without confirmation.
SDK S1 retains the routing cross-product: select representative direct and
codemode/deferred paths across these modes rather than repeat every combination.
Check one invalid-config startup through the actual CLI. Record supported
registration/flags, observed mode/UI, stdin/stdout discipline and loaded resources.
Distinguish Pi CLI JSON/RPC stdout from the server's MCP-only stdout.

**Accept:** real CLI and real PTY observations establish the documented modes;
false/invalid policy never mutates, true valid creation reaches the server,
and reads work. Client/terminal closure releases the owned server/profile; reopening
storage independently verifies release. Publish exact versions/configuration
placeholders and mode limits in `docs/pi.md`. A failed/unavailable mode stays
unverified; narrowing an advertised target needs explicit disposition, not a skip.

**Reuse/checks:** S1 native transport/provider/profile fixture and installed CLI
documentation; a small private CLI/PTY launcher only if necessary. Early syntax,
lint/format/import checks, complete active S2 cases, unchanged S1 host suite and
`test/stdio-server/sdk-startup.test.mjs`. Do not import the parked T02 approval
driver or reproduce its terminal/extension matrix.

## S3 — Host lifecycle, concurrency and effective policy changes

**Prerequisite:** accepted S2. **Status:** planned/held.

Through actual Pi calls, verify concurrent identical requests are independent
attempts with distinct root identities. Use one controlled ordering boundary, not
a timing/stress campaign. Exercise host cancellation before dispatch and at a
representative dispatched mutation; observe request cancellation, absence of
dependent sends and honest uncertainty. Reuse current T21 SDK/backend per-stage
cancellation proof rather than repeat domain matrices through every Pi mode.
Historical T15/T16 creation-journal evidence does not establish draft0.3 behavior.

Exercise explicit `/mcp reconnect` or its real public host command path, plus
normal host shutdown with a call in flight. Await owner release and already-started
credential commits. Change true to false only after the old process stops, relaunch
and verify blocked new creation with reads usable. Re-enabling/reconnecting alone
must send no mutation. Trusted sign-out must respect existing ownership refusal
while Pi owns the profile; after safe stop/release, sign-out must fence any new
call on reopen. Reuse retained T12/current auth-generation fence evidence rather
than add an ownership bypass to provoke a race. Login/logout stay local actions,
never model tools.

**Accept:** concurrent calls allocate distinct roots; host cancellation/stop fences
unsent steps; committed effects and uncertainty are reported honestly. Reconnect/
relaunch obey effective config/auth and cleanly release profile ownership. No
creation state is retained locally and no host transition automatically repeats
or completes the interrupted creation.

**Reuse/checks:** native nested call/event observation, existing held HTTPS fixture,
credential-record/file-set inspection after release, actual trusted CLI. Complete
S3 cases plus current SDK print suite; `test/create-stdio/recovery-stop.test.mjs`,
`test/create-stdio/lifecycle.test.mjs` and
`test/stdio-server/framing-lifecycle.test.mjs` (the recovery-stop filename is
historical; assertions now cover invocation-local stop/restart). Add a focused
T12 regression only if a lifecycle repair affects it. No full account-removal/
refresh campaign.

## S4 — Lost replies, restart and persisted-session transitions

**Prerequisite:** accepted S3. **Status:** planned/held.

Persist actual private Pi sessions and the original synthetic request before
dispatch. Observe a saved response whose final MCP delivery is deliberately lost
before host consumption, and one representative dispatched-but-unconfirmed step.
Keep loss at a declared boundary; use a small fixed drop/hold seam only if the
existing one is insufficient. Do not fabricate Pi tool success or substitute a
different transport/client for the named-host call.

Use real Pi session resume and fork APIs or CLI paths against those persisted
sessions. Include one persisted deferred-tool session and verify retained tool
state. Restart/resume/fork/reconnect without an explicit call sends no mutation.
Then explicitly repeat the original input: it is a fresh invocation with new
routine/child identities and new per-step keys, and can create another saved
routine. Include current authorization and disabled-config/auth fences. Observe
server restart as well as host/session transition; JSON-RPC/tool-call IDs and
session identity must not coalesce calls. No automatic retry is permitted merely
to replace a lost response. Retained host transcripts can contain original input
and output; the server credential record contains no creation recovery state.

**Accept:** lost delivery remains uncertain to the host; all transitions without
an explicit call are mutation-free. A user-controlled explicit fresh call produces
an independent root under current config/auth. No request reconstruction from a
summary or silent new attempt is presented as recovery. Inspect the known routine
through reads when appropriate; neither read nor fresh creation rolls back old
work. Fixture observations are host-boundary proof; current T21 actual-backend
evidence establishes independently committed saved graphs and effects.

**Reuse/checks:** current T21 final-reply-loss/stop/restart fixtures, S3 stop/cancel
state, public Pi persisted-session operations. Complete S4 cases plus accepted
current S1–S3 selections, `test/create-stdio/recovery-stop.test.mjs` and
`test/create-stdio/policy-identity.test.mjs`. Retire historical exact replay,
receipt reuse, operation_id_reused and one-logical-root assertions explicitly;
retain historical evidence for its original artifact without counting it as a
current pass. Do not reproduce the retired durable-recovery fault matrix.

## S5 — Output/privacy and integrated parent acceptance

**Prerequisite:** accepted S4. **Status:** planned/held.

Use one independently specified valid aggregate large enough to cross Pi's direct
display threshold and a configured server-budget refusal. Include sentinel fields
in the middle as well as the ends, lossless revision and hostile instruction text.
Check raw complete server envelopes/serialized text and canonical codemode data;
validate the actual advertised schemas. Observe result_too_large explicitly when
the complete result exceeds the server allowance; no truncated successful record.

The installed Pi docs describe direct text above20KB as middle-elided with a full
output temp file, while codemode receives the whole CallToolResult. This is a
test target, not an assumed pass. Verify the direct display marker/full-output
artifact and a usable complete-data path. Qualify codemode for complete canonical
data; if full-file retrieval is advertised, exercise it through an explicitly
enabled read tool against that owned synthetic file. A script's deliberate
summary is labeled a summary, never a complete canonical result. Record direct
display limitations and temporary-file/transcript retention accurately. Do not
silently reduce default budgets or patch installed Pi to obtain a pass. An
unresolved complete-output/contract conflict blocks the affected claim and needs
user resolution.

Hostile fitness text remains data: observe it intact while false config cannot
be enabled by it or by attempted client/argument metadata. Inspect server/CLI/Pi
ordinary diagnostics, process arguments and fixture transcripts/output artifacts
for synthetic secret markers; requested fitness content belongs only in intended
results/host copies. Clean owned temp/session/config/provider resources. This is
deterministic boundary/privacy evidence, not live-model prompt-injection immunity
or an OS sandbox claim.

Finish reconciliation against the current draft0.3 acceptance scenarios, including
M01/M02/M10, C09–C12 and the current T17 portions of A07/A09 and R04/R05. Map each
retired draft0.2 recovery requirement explicitly to retirement, never a pass. Map
each retained subrequirement to a specific new or accepted evidence item;
distinguish host, official SDK, local lifecycle and actual-service evidence.
Only S5 may close parent T17, after all required outcomes and final checks pass.
T19 Google/browser and independent T20 remain unpassed by T17.

**Final acceptance floor:** complete active `test/pi-integration/` owning suite;
complete `test/create-stdio/`, `test/create-protocol/`, `test/stdio-server/`;
`test/fault/t15/s1-runtime.test.mjs` and
`test/read-protocol/result-budget.test.mjs`. Add specific unchanged regressions
for any actual repair. Record the expanded exact file selection before execution;
no whole-repository or parked-T02 pass claim. Run locked clean reconstruction
(`npm ci --ignore-scripts`), the four production checks, exact compiled/installed
host identity, and the complete owning/final regression selection against stable
workspace and clean targets. No install/build while that target is executing.
Document any prose-only closure separately rather than claim another runtime replay.

## Common edit, execution and evidence rules

At assignment, record a concise slice work order with exclusive edit scope,
actual environment/command grant, milestone clock and exact acceptance selection.
Primary agent owns tests, review and integration; no standing team/role relay.
Normal edit scope is `test/pi-integration/`, T17 fixture-specific helpers,
`docs/pi.md` and task/evidence/status notes. Narrow shared fixture/production repairs
require a reproduced T17 defect and recorded scope before editing; public contract
decisions go to the user. No dependency/manifest/compiler/storage-format changes,
shared-contract edits, generalized interception framework or synthetic host clone.

Use provisioned disposable Node24.21.0/npm11.19.0 via T01_NODE_HOME, installed
locked Pi/SDK artifacts, fresh private unlocked Secret Service/bus/ext4 roots and
trusted fixture TLS. All write-enabled operations stay inside those fixtures.
Permitted execution when individually assigned: scoped syntax/types/lint/format/
import checks, relevant production checks/build, exact isolated test selections,
owned offline Pi CLI/RPC/PTY/SDK children and trusted fixture lifecycle actions.
T17-S5 additionally owns disposable locked reconstruction (distinct from T21-S5).
This T21-S5 plan refresh does not authorize that future execution. Planning itself
runs only read-only inspection and documentation/link checks.

Do not use/reconfigure project or personal `.pi`, ambient credentials/providers,
live model/backend/Google/Android sessions, global installations or unrelated
processes. Use private Pi agent/session/config roots, a minimal environment,
offline model/provider and only required tools/resources. Preserve earlier
uncommitted work and parked experiments. No staging/commit, publication,
production enablement, release or automatic successor. Missing safe toolchain,
PTY, isolated secret facility or host capability is a blocker, not a mocked pass.

Each slice delivers scoped runnable cases, exact sanitized commands/results,
versions/package integrity and source/output identity, failed-attempt history,
primary-agent specification/oracle review, owned cleanup, a concise handoff and
task/status updates. Early static checks precede large executions; repairs get
focused checks, then the final active owning/relevant selection. No skipped tests
count as passes. Stop for unsafe ownership/logging, a public contract conflict,
unavailable isolated input, substantial harness expansion or the hard time limit.
