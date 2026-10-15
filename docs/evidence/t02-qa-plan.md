# T02 QA plan — Stage 1 independent acceptance preparation (no results claimed)

**Role:** QA · **Task:** T02 Pi gate feasibility · **Stage:** 1 — planning only
**State:** planning; no tests written, no experiment executed, no results claimed.
Stage 2 test implementation awaits the coordinator-approved common experiment
specification plus explicit Stage 2 authorization. No polling for readiness.
**Normative refs:** `docs/tasks/t02-work-order.md`,
`docs/tasks/t02-pi-feasibility.md`, `docs/architecture.md`
("Pi integration facts and unresolved risks" §1–7), `docs/verification.md`
(layers, C10–C12 rows, fault matrix, evidence format),
`shared-docs/docs/mcp-contract/tools.md` (host approval, Pi companion duties,
creation schema/identity), `shared-docs/docs/mcp-contract/acceptance-scenarios.md`
(C10/C11/C12), `docs/decisions/t01-approved-foundation-spec.md`,
`docs/evidence/t01-coordinator-review.md` (T01 handoff: inert entries, toolchain,
snapshot method), `docs/agent-coordination.md`.
**Ownership:** QA owns this file only at this stage
(`docs/evidence/t02-qa-plan.md`). No `test/` sources, fixtures, config/dependency
edits, or host execution performed.
**Toolchain:** per-invocation `export PATH="$T01_NODE_HOME/bin:$PATH"` using the
coordinator-provisioned disposable Node toolchain (Node 24.21.0 /
npm 11.19.0; Pi development candidate 1.1.0, dev types only — selection is
not certification). No literal toolchain path is recorded in this plan; the
coordinator supplies `$T01_NODE_HOME` per session. Never replace system Node,
install global packages, or change Pi settings.

> Independence note: this plan is derived solely from the specifications above
> plus official Pi docs/examples/public type declarations (extensions, MCP,
> codemode, TUI, SDK, packages docs of installed Pi 1.1.0 as planning
> references). No project production/experimental implementation sources, diffs,
> generated sources/maps/bundles, or upstream runtime implementation code were
> read; no Developer internals were inspected. No assertions are derived from
> guessed APIs or reverse-engineered behavior. All concrete fixture paths,
> launch shapes, trace fields, and data values below are placeholders awaiting
> the coordinator-approved common spec.

## 1. What T02 must prove (QA acceptance reading, coordinator-scoped)

T02 is a **synthetic feasibility spike**, not product certification (T17) and not
a production write policy. Per coordinator scope review, T02 mandatory acceptance
is exactly the following four feasibility items, demonstrated against the
**actual selected Pi pipeline** (pure logic simulations alone do not satisfy any
of them):

- **Gate feasibility on every route (C10 core):** the approval gate invokes for
  the **actual synthetic creation tool** on direct calls,
  deferred/tool-search-loaded calls, codemode-script calls, and nested
  `executeTool` calls (including a tool calling the creation tool), with the
effective content presented and explicit Approve/Reject before dispatch. Reads
  are never gated.
- **Registration/mode/conflict/handler-failure safety (C11):** absent
  companion, reload/shutdown, conflicting or static-overriding registration,
  headless/non-TUI modes (no-UI/RPC/print/JSON), handler failure, and `-`/`_`
  server-name collisions leave **no write-capable registration and no
  unguarded effect**. Generic or headless setups stay read-only and reject
  creation; interactive denial or error blocks before any synthetic-backend
  mutation. No clientInfo/annotation/model-argument-based auto-enablement.
- **Final-dispatched-input integrity or provable configuration exclusion
  (C12 core):** **post-approval mutation by a later handler is
  blocked/detected at the final dispatched input**, or the mutating
  configuration is identified and rejected before writes are enabled. If
  neither is achievable, T02 stays blocked and requests contract review — no
  weakened policy, no simulator workaround.
- **Trusted noncredential binding-channel feasibility (C12 binding):** a
  noncredential origin/account/session/profile-generation binding channel for
  labels and retained intent is shown feasible in synthetic scope, with
  sign-out/reauth/reload invalidation and missing/ambiguous-label failure
  demonstrated (mechanism feasibility only; production encrypted storage and
  full approval UX remain T04/T13/T14 scope).

### Explicitly out of T02 mandatory scope (retained as future coverage)

The following remain covered in this plan only as **future-certification
coverage or explicitly synthetic demonstrations** — they MUST NOT be reported
as production C10–C12 passes at T02:

- **Full scrollable inert-content UI and authorized-label behavior**
  (complete native preview rendering, hostile-content inertness in the real
  approval surface, scrollable/expandable long-content presentation) —
  **T14/T17 ownership**. T02 rows P5/N4/N5 assert only feasibility-level
  demonstrations (gate receives full content; labels resolve from the approved
  synthetic channel; missing/ambiguous blocks) and are labeled as such.
- **Durable restart/fork/replay/receipt behavior** (intent durability across
  restart/fork, exact-replay settlement, saved-receipt stability, generation
  fences) — **T09–T12/T15 ownership**. T02 rows I1/I2/I7 assert only
  explicitly synthetic demonstrations of identity retention (same operationId
  reused on explicit retry; no replacement ID), never production durability
  or recovery passes.

### Tool presence is not write capability

Exactly seven fixture tools may remain **advertised/listed while creation is
unavailable**: tool presence or listing is not write capability. A generic
(ungated) creation path returning `write_approval_required` with zero effects
is a **compatible** fail-closed outcome, and QA will assert it as a pass
where the approved spec defines that code — not as a missing-tool failure.

Unresolved security/runtime feasibility keeps T02 blocked with a retained
handoff. All relevant T01 checks must stay green.

## 2. Planned coverage map (Stage 2 tests, not yet written)

Names like `synthetic_create_routine` below are illustrative placeholders for
the seven-tool synthetic fixture's write analogue; exact tool/server/fixture
names come from the approved common spec. "Synthetic backend" means a
deterministic local counter/observation ledger labeled synthetic — never a real
backend, never a real write.

### 2a. C10 — real-pipeline gate invocation (positive path)

| # | Spec source | Planned assertion (Stage 2) | Real-pipeline evidence |
|---|---|---|---|
| P1 | tools.md companion duties; C10 | Direct call to the synthetic creation tool triggers the gate exactly once with the full normalized input (name, operationId, ordered exercise IDs + authorized labels, order, every set/reps/weight incl. null/zero, effective rest incl. defaults); explicit Approve dispatches exactly one synthetic effect; the effect ledger records the approved bytes. | Yes — real Pi tool pipeline driving the fixture |
| P2 | C10; extensions.md exposure | Deferred/tool-search-loaded route: creation tool reached via deferred exposure + `tool_search` activation still triggers the gate for the actual creation invocation, not merely for the loader/search call. | Yes — real pipeline with deferred exposure |
| P3 | C10; extensions.md nested `executeTool`, mcp.md "every MCP call passes through Pi's tool pipeline" | Nested route: an orchestrator tool (model-callable) invoking the creation tool via `ctx.executeTool` triggers the gate for the **inner** creation call; blocking the inner call blocks the effect while the outer call reports failure without side effects. Assert via `parentToolCallId` linkage in trace (field name TBD — see §6). | Yes — real nested pipeline |
| P4 | C10; codemode.md + mcp.md parentToolCallId | Codemode route: a codemode script invoking the creation tool triggers the gate for the actual creation call carrying the codemode call ID as parent; Approve dispatches once, Reject blocks with zero effects. | Yes — real codemode pipeline |
| P5 [T14/T17 future — T02 synthetic demo only] | tools.md labels duty; C10 hostile labels | Feasibility demo: gate receives the full normalized input (name, operationId, ordered exercise IDs + labels, every set/reps/weight incl. null/zero, effective rest incl. defaults); labels resolve only from the approved synthetic authorized-read channel; hostile label strings are passed through as data. Full native inert-rendering/scrollable-presentation conformance is T14/T17 certification and is NOT claimed here. | Yes — real pipeline (demo tag) |
| P6 | tools.md; C10 reads not gated | Read analogues (synthetic search/get/list) never trigger the gate and need no approval; internal draft/populate/save sub-steps of one approved operation require no extra prompts. | Yes — real pipeline |
| P7 | C10 concurrent calls | Two concurrent creation calls (distinct operationIds) each gate independently; approving one dispatches exactly that one's effect; rejecting the other leaves zero effect for it. | Yes — real pipeline |

### 2b. C10 negative — denial/cancellation/timeout paths

| # | Spec source | Planned assertion (Stage 2) |
|---|---|---|
| N1 | tools.md "Reject, dismissal, cancellation, timeout, missing UI or handler failure blocks it with no backend writes"; C10 | Explicit Reject → zero synthetic effects, error ledger records denial, outer/nested caller observes failure (exact error shape TBD — see §6). |
| N2 | same | Dismissal (dialog closed without choice) and cancellation (abort signal mid-prompt) → treated as denial: zero effects. Dismissal and cancellation are tested as **distinct** stimuli, not assumed identical. |
| N3 | same; SDK abort/waitForIdle | Timeout while awaiting approval → blocked with zero effects; no background continuation or late dispatch after the timeout boundary. |
| N4 [T14/T17 future — T02 synthetic demo only] | C10 missing required lookup | Creation call whose exercise references lack authorized labels (no prior read result) → gate blocks and requests the read first; retry uses the **unchanged** operation (same operationId/intent). Native label-UX conformance is T14/T17 scope; T02 demonstrates the block/request-channel feasibility only. |
| N5 [T14/T17 future — T02 synthetic demo only] | C10 ambiguous identity | Ambiguous exercise identity (name-only match, multiple candidates) → blocked; no name-based substitution (feasibility demo; full identity-UX certification is T14/T17). |

### 2c. C11 — fail-closed registration and mode confusion

| # | Spec source | Planned assertion (Stage 2) |
|---|---|---|
| F1 | C11; tools.md "Persistent generic MCP configuration must not leave a write-enabled server behind when this companion is absent" | Companion absent (extension not loaded): generic stdio setup of the synthetic server connects read-only at most; creation attempt returns a rejection (exact code TBD — `write_approval_required` from a generic path is a compatible pass) with zero effects. All seven tools may still be listed; listing is not capability. **Zero-effect** = effect ledger empty; **no-write-registration** = write analogue unreachable or rejection-gated per approved observable (TBD). |
| F2 | C11 reload/shutdown; extensions.md session-only registration | After reload and after shutdown: no write-enabled registration survives; re-registration requires the gate-owning companion load path again. Assert both reload (session persists) and full shutdown/restart orderings (TBD — see §6). |
| F3 | C11 conflicting static registration; mcp.md "`mcp.json` server overrides a registered one", "`/mcp` shows the override" | Static `mcp.json` entry with the same server name present alongside the companion registration → conflicting registration fails closed: no write-capable path connects (neither silently overridden server nor duplicate); observable conflict signal (TBD) recorded; zero effects on creation attempt. |
| F4 | mcp.md "`-`/`_` count as the same server: a second one is rejected" | Server names differing only in `-` vs `_` (e.g. `synth-srv` vs `synth_srv`) → second registration rejected; no normalized-collision write path; zero effects. Both orderings (which registers first) tested. |
| F5 | C11 print/JSON/RPC; architecture risk §4; extensions.md modes | Headless modes (print, JSON, RPC) and no-UI sessions: creation rejected as read-only even with companion files present; no auto-approve because a prompt cannot display. RPC specifically: `hasUI === true` with `mode !== "tui"` MUST NOT enable writes (**mode-confusion** probe: hasUI-true/non-tui is read-only). Exact mode-detection observable TBD. |
| F6 | C11 permission-handler failure; extensions.md "`tool_call` can mutate input or block execution" | Gate handler throws (or its UI dependency fails) → creation blocked with zero effects; failure is fail-closed, never fail-open. Handler-exception and handler-timeout variants tested separately. |
| F7 | tools.md "no model-supplied confirmed field"; C11 "No clientInfo/annotation-based auto-enablement" | Creation smuggled with model-supplied approval markers (`confirmed: true` arg, permissive annotations, write-claiming clientInfo) → still gated; markers alone dispatch nothing; without explicit gate approval, zero effects. |
| F8 | SDK replaceable builtin; C11 replacement runtime | Replacement MCP/codemode runtime (builtin MCP extension replaced or absent per approved config matrix) → gate path declared unsupported: creation rejected, zero effects; supported vs unsupported runtime set comes from the approved spec, never guessed. |
| F9 | tools.md "Conflicting file-configured registrations or an incompatible runtime fail closed" | `toolExposure`/exposure misconfiguration that would expose the creation tool outside the gated path → fail closed with zero effects (exact exposure matrix TBD — see §6). |

### 2d. C12 — integrity, durability, and mutation detection

| # | Spec source | Planned assertion (Stage 2) |
|---|---|---|
| I1 [T09–T12/T15 future — T02 synthetic demo only] | tools.md intent preservation; C12 | Feasibility demo: after Approve + simulated response loss, explicit retry with identical operationId/intent reuses the original identity; re-prompting is acceptable; the ledger shows exactly one effect (no duplicate from replay). Replacement-ID generation on retry is forbidden. Production replay/receipt durability is T09–T12/T15 scope and is NOT claimed here. |
| I2 [T09–T12/T15 future — T02 synthetic demo only] | C12 session restart/fork | Feasibility demo: approved intent (operationId + exact normalized bytes) retained outside the model response across a synthetic session restart/fork analogue; explicit recovery resumes the same operation; changed content after restore requires fresh approval. Durable-store mechanism TBD — see §6 (production encryption/durability is T04/T13/T14 scope; the spike needs only a clearly-labeled synthetic retention observable, never real private storage). Production restart/fork durability is NOT claimed here. |
| I3 | tools.md "Do not silently mutate approved arguments"; C12 post-approval mutation | A later-registered `tool_call` handler that mutates approved arguments (field substitution, set/weight alteration, exercise swap, operationId swap) → dispatch blocked or mismatch detected before any effect; ledger records detection with zero effects from the mutated call. Mutation battery (per-field variants) TBD — see §6. This is the **critical** C12 proof: freezing one object or trusting annotations/clientInfo without evidence is insufficient per the work order. |
| I4 | same | Mutating-handler configuration that cannot be detected/blocked by the integrity mechanism → configuration identified and **excluded from certification** (explicit unsupported-load-order list); writes stay disabled under it. If neither mechanism nor exclusion is defensible, QA records a contract-review blocker (fail, not waiver). |
| I5 | C06/C08 via tools.md identity; C12 "Changed content needs approval" | Same operationId + changed normalized intent → rejected (`operation_id_reused` analogue or spec-approved spike code, TBD) with no further effects. Omitted-vs-explicit-default normalization equivalence rules come from the approved spec (T03 owns production normalization; the spike uses only the spec-published equivalence). |
| I6 [binding feasibility — production channel is T04/T13/T14] | C12; A07/A08 fences (planning context) | Feasibility demo: sign-out/reauth/reload analogue (synthetic session-label invalidation): post-invalidation dispatch of a previously approved operation is fenced (blocked or re-approved); missing/ambiguous label fails closed rather than dispatching under an inferred identity. Binding-channel shape TBD — see §6. |
| I7 [T09–T12/T15 future — T02 synthetic demo only] | routine-creation/C05 analogue | Feasibility demo: identical retry after recorded success returns the original receipt analogue without a second effect (production receipt stability is T09–T12/T15 scope). |

### 2e. Sensitive-harness calibration controls (anti-fooling)

These controls prove the harness itself can see what it claims; a control that
fails invalidates the corresponding pass, it does not merely add a warning. T02-mandatory rows require `sdk-pipeline` or `tui-interactive` observations as specified per row; `logic-control`/`injected-ui` NEVER count as C10–C12 evidence.

| # | Control | What it proves |
|---|---|---|
| H1 | **Unguarded-effect detector:** a deliberately unguarded synthetic creation path (gate bypassed by colluding test-only wiring, exact shape TBD in approved spec) MUST be recorded as an effect by the ledger + trace assertion. If the harness reports "zero effects" for this control, all F/N zero-effect passes are void. |
| H2 | **Mutation-visibility control:** a deliberately mutating handler on a monitored call MUST be flagged by the trace/dispatch comparison. If the harness cannot see the mutation, all I3/I4 passes are void. |
| H3 | **Mock-vs-pipeline discriminator:** each C10/I assertion records its layer tag — `sdk-pipeline` / `tui-interactive` (observed through the real Pi tool pipeline, with genuine interactive evidence separated from injected UI) vs `logic-control` / `injected-ui` (direct handler invocation / fake-event ordering / simulated UI — useful controls, never evidence). The plan requires at least one real-pipeline observation per P1–P4 row; docs-only or signature-only inspection counts as nothing. |
| H4 | **Supported-path bypass battery (bounded trust boundary):** dispatch paths reachable through **supported Pi paths/configurations** that skip the gate (if any exist in the approved launch shape) are probed to confirm they cannot reach the synthetic effect; any reachable bypass is a C11 failure, not a harness gap. Raw external processes or operators explicitly bypassing the supported host pipeline (e.g. same-user direct stdio access outside Pi) are **outside the stated non-OS-sandbox trust boundary** per tools.md/architecture.md and are NOT claimed preventable — QA asserts no such prevention. |
| H5 | **Ledger independence:** the synthetic-effect ledger is written by a channel independent of the gate's own approval record (exact channel TBD), so a gate that merely logs "approved" cannot fake detection of effects. H1 validates this separation. |

## 3. Real-pipeline vs mock distinction (how observations will be labeled)

Per verification.md layers, every Stage 2 result will carry:

- **Layer tag (pipeline vs UI separated):** `sdk-pipeline` (deterministic local
driver through the real SDK session/extension/tool-pipeline runtime — counts
as pipeline evidence only where the approved spec says so), `tui-interactive`
(genuine interactive terminal evidence through the actual TUI — recorded
separately with PTY/transcript observations), `injected-ui` (tests using an
injected/simulated UI context for Approve/Reject — useful control, NEVER
counted as interactive approval evidence), or `logic-control` (pure
handler-order simulation — useful control, never C10–C12 evidence). SDK
pipeline results and genuine TUI results are labeled separately and actual
interactive evidence is kept separate from injected-UI contexts.
- **Artifact identity:** exact Pi package version + integrity, SDK version,
  Node version, fixture/companion/driver revisions under test.
- **Reproduction:** exact safe command, disposable HOME/XDG/Pi-agent-dir/
  session/cwd roots, offline/deterministic-local-provider flags, cleanup.
- **Observed channel:** PTY transcript excerpt (visibly synthetic), tool trace,
  effect-ledger dump, or denial code — never raw private bodies, never personal
  paths/credentials.

A result without a layer tag and artifact identity is reported as
**indeterminate**, never as a pass.

## 4. What QA will NOT do (Stage 1–2 boundaries)

- No reading of Developer proposal/internals, experiment sources, diffs, or
  generated output; no execution of host experiments before the
  coordinator-approved spec + artifact-ready relay.
- No test creation, config/dependency edits, or manifest/lockfile changes now;
  dependency/script needs go to the coordinator as requests (§6).
- No backend connection, no real credentials/tokens/account/resource IDs, no
  personal Pi settings/provider configuration changes, no write-capable product
  MCP registration, no live-backend or personal-state inspection.
- No production write policy or T17 certification claims; no `passWithNoTests`,
  no skipped checks counted as passes, no `|| true` masking.
- T01 entries and tests are not rewritten to suit the spike; relevant T01
  checks must stay green (clean locked install + `npm run check` rerun is
  coordinator-owned evidence; QA reports only its specified slice).

## 5. Needed coordinator decisions (no guessing; no tests before approval)

### D-T02-1 — Common public fixture contract
Seven-tool synthetic fixture identity: exact server name(s), tool names,
which tool is the gated write analogue, input/output schemas and envelope
shape, read-vs-write annotation mapping, normalized intent definition (fields,
defaults, equivalence rules for omitted-vs-explicit), and the synthetic-effect
ledger interface. QA exercises it independently without reading implementation.

### D-T02-2 — Launch and isolation topology
Concrete source/build/output and launch paths for the fixture, experimental
companion, and deterministic driver; disposable-root layout (HOME/XDG/
Pi-agent-dir/session/cwd); offline or deterministic-local-provider flags;
resource budgets; exact reproduction commands. Which layer each experiment
proves (pure logic vs actual SDK pipeline vs actual PTY/TUI).

### D-T02-3 — Gate observable contract
Gate invocation signal (event/trace shape), preview content completeness rule
(full field list incl. nulls/zeroes/defaults), Approve/Reject/dismiss/timeout/
cancel observables, denial error shape, and the per-route (direct, deferred,
codemode, nested) trace linkage fields (`parentToolCallId` or approved
equivalent) QA must assert.

### D-T02-4 — Registration/lifecycle matrix
Supported extension set + load order; gate-before-connect registration order;
teardown/reload/shutdown ordering; static-override and `-`/`_` collision
observables; headless/mode-fail-closed observables (`tui`-only rule,
hasUI-vs-mode probe shape); replacement-runtime and incompatible-mode
exclusions; zero-effect and no-write-registration assertion method per case.

### D-T02-5 — Final-input integrity mechanism
Exact mechanism (or verifiable exclusion list) for pre-dispatch final-input
comparison: what bytes are compared, at which pipeline boundary, with what
mismatch observable. If no defensible mechanism exists, the coordinator records
a contract-review blocker — QA will assert the blocker, not a waiver.

### D-T02-6 — Binding/label channel (synthetic scope)
Trusted noncredential origin/account/session/profile-generation binding channel
shape for labels and retained intent (synthetic labels only); sign-out/reauth/
reload invalidation and missing/ambiguous-label failure observables. Full
encrypted storage/approval UX stays T04/T13/T14 scope.

### D-T02-7 — Trace, data, and calibration harness
Trace/log/ledger formats and independence requirements (supports H1/H2/H5);
deliberately-unguarded and deliberately-mutating calibration controls'
approved shapes; PTY/TUI observation method and visibly-synthetic transcript
conventions; sanitized evidence fields per verification.md.

### D-T02-8 — Scripts, dependencies, and file ownership
Any new devDependency/script QA may need (requested, never self-edited);
Stage 2 write ownership confirmation (`test/pi-feasibility/` + QA helpers +
`docs/evidence/t02-qa-*` for QA; `experiments/t02/` + ADR for Developer);
serialization order for shared build/install changes and test runs.

## 6. Stage 2 readiness

On coordinator approval (D-T02-1…D-T02-8 after the Developer proposal) +
explicit Stage 2 authorization, QA will translate §2 rows into executable
black-box checks strictly against the approved common spec, implement them under the QA-owned paths named in D-T02-8, execute only
the public compiled experiments/selected Pi runtime after the coordinator's
artifact-ready relay, and report pass/fail/blocked with exact commands,
versions, layer tags, and calibration-control outcomes via
`herdr agent prompt coordinator`. First milestone: C10 gate-invocation battery
(P1–P4) with H1–H3 controls green.

## 7. Blockers / risks (Stage 1)

1. **Blocked on the coordinator-approved common experiment spec + Stage 2
   authorization** (D-T02-1…D-T02-8): no test implementation or host execution
   until the asynchronous approved-spec message arrives. No polling.
2. Integrity-mechanism risk: per the work order, freezing one object or trusting
   annotations/clientInfo is insufficient; if the approved spec provides no
   defensible final-input mechanism or exclusion list, QA will record
   C12/I3–I4 as blocked with a contract-review request.
3. Mode/binding risks: hasUI-vs-mode confusion and the noncredential binding
   channel are open design points; QA asserts only spec-approved observables.
4. No acceptance checks claimed passing; no runnable artifact asserted; no
   live/external interop attempted or claimed.

---

*Prepared from specifications only. Next: await coordinator common-spec
decisions, then implement black-box tests strictly against that contract.*
