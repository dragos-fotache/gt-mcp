# T05 — Implement fixed-origin HTTP transport and safe error mapping

**Status:** done (bounded c4/f3 acceptance; all windows closed) · **Owner:** Coordinator; fresh Developer + QA · **Requires:** T01, T03 (accepted)
**Size:** 1-2 sessions

## Accepted outcome

Fixed-origin transport accepted on c4/f3 with [independent evidence](../evidence/t05-coordinator-review.md):
228/228active owning tests and444/444relevant regressions in both QA and clean
locked reproduction;0skips. Four production checks/install PASS,193frozen hashes
stable and rebuilt artifacts byte-identical. All action windows CLOSED; agents
held for today's wrap. [Daily handoff](../handoffs/t05-end-of-day.md).
No protocol/config-guard/backend/host/release claim; T06/T09 ready but unassigned.

## Original outcome and retained progress (historical)

Create the only backend network boundary, with immutable request identity and truthful failure classification.
The preparation/repair grants below are historical, superseded by final acceptance.

T03 prerequisite acceptance: [schemas/codec evidence](../evidence/t03-coordinator-review.md).
Read its public entry/handoff and exact numeric/intent-version limits before design.
The user authorized starting T05 and selected fresh Developer/QA via Herdr.
Read the [bounded work order](t05-work-order.md) and
[coordinator design brief](../decisions/t05-transport-design-brief.md).
The [approved public specification](../decisions/t05-approved-transport-spec.md)
now opens bounded production implementation and independent QA test-source work.
QA compiled-target/loopback/suite execution remains closed until frozen relay.
T09 remains ready and unassigned; no automatic successor.
Fresh agents started in the existing panes and submitted independent planning
artifacts. Coordinator [baseline](../evidence/t05-coordinator-start.md): locked
install/four production checks PASS, foundation100/100 and T03221/221.
[Design review/adjudication](../evidence/t05-coordinator-design-review.md) retained
initial failures and resolved round2 API/recovery/safety issues into the approved
spec. Initial QA source review and production candidate c0 both failed; separate
role-private repair windows are open. c0 had11failed coordinator no-network
public-entry observables, foundation99/100 (compatibility doc structure),
T03221/221 and repeated typecheck/lint/format PASS. No QA target execution,
artifact relay or acceptance yet. Subsequent c2 repairs pass22prior coordinator
observables, foundation100/100,T03221/221 and production checks, but4further
boundary observations fail across3remaining defects; c2 is closed and targeted
Developer repairs continue. QA R3 harness/source repair/calibration remains
independent. Subsequent c3 closes the reported production defects: coordinator
26/26observables, four production checks/build and foundation100/T03221PASS;
rebuild reproduces18candidate source/emitted hashes. Developer holds all actions,
awaiting independent QA harness/source readiness and explicit frozen relay.
No T05 acceptance yet; initial defects are retained, not hidden.

**Latest user decision:** reduce harness scope, not transport guarantees. The
[bounded verification plan](../decisions/t05-bounded-verification-plan.md)
selects15core suites (two small replacements), defers general Node interception/
forwarding-proxy calibration, and retains final foundation/T03/T04 regressions
plus clean locked reproduction. Existing work/evidence is preserved, deferred
cases are not passed. Bounded source gate is now closed (19parse/lint/format
PASS, small runners reviewed). [t05-f1 frozen relay](../evidence/t05-f1-coordinator-relay.md)
authorized the first exact15-suite owning QA run against191frozen files:
220/226PASS,6FAIL,0skips; focusedlimits17/20,3FAIL recovered all diagnostics.
Both windows now CLOSED. [Adjudication](../decisions/t05-f1-verification-adjudication.md)
assigns targeted QA fixture/oracle repairs, no production change. c3held; f2will
run only four affected suites before final full regressions/clean snapshot.

## Read first

- [authentication.md](../../shared-docs/docs/mcp-contract/authentication.md)
- [tools.md](../../shared-docs/docs/mcp-contract/tools.md)
- [service-protocol.md](../../shared-docs/docs/backend-contract/service-protocol.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Implement an internal allowlisted route/method client; configure one trusted HTTPS origin, with HTTP only for explicit isolated local tests. Separate tool resource routes from trusted auth/lifecycle routes (including account/status verification for T12); tools and resource content cannot select destinations, headers or proxies.
- Reject cross-origin redirects and other credential-forwarding paths; prefer no redirects. Keep authenticated header injection internal to the session boundary.
- Send exact stored UTF-8 bodies and resource keys unchanged. Capture status/body separately; classify rate limits, 413, malformed responses, unknown permanent codes and bodyless success safely.
- Publish request/result size, timeout and bounded retry budgets in trusted configuration. Oversize output fails result_too_large without partial successful aggregates; oversize input fails request_too_large without endless retry.
- Implement abort handling and sanitized diagnostics/metrics. Transport failure after write dispatch remains potentially committed; no retry switching to sync routes.
- Use T03's lossless codec; do not call ordinary JSON parsing before extracting Int64 data.

## Acceptance criteria

- Redirect/destination exfiltration tests, safe error tests and logging inspection show no credentials, raw URLs/search/IDs or bodies.
- Retry tests retain method/route/body/key and honor positive Retry-After within the documented budget.
- Oversize/malformed/500 cases distinguish reads from uncertain writes; original backendErrorCode survives when safe.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

M10 transport boundary; A09; error paths used by R02/R06/R08.

## Handoff

- Production: six modules under `src/http/`; compiled entry `dist/http/index.js`.
  Exports `createBackendTransport`, `TransportError`, `isTransportError`,
  `DEFAULT_TRANSPORT_BUDGETS`, `TRANSPORT_IDENTITY_VERSION`; declarations alongside.
- Allowlist: six reads (search/get exercise, list/get workout, list/get routine),
  create/populate/save draft primitives, challenge/exchange/refresh/logout/account
  status controls. Exact14method/path/status/auth table: [spec §3](../decisions/t05-approved-transport-spec.md#3-destination-tls-and-allowlist).
  No generic URL/header/proxy method, redirects, sync or other mutations.
- Defaults: request body256KiB, request target+headers4KiB; response/projected result
  1MiB each; heads32KiB/100fields; attempt10s/total60s;3attempts,500msbackoff capped
  at5s. Positive Retry-After is honored exactly or retry declined, never shortened.
- Frozen-byte API: `createDraft/populateDraft/saveRoutine(binding,id,body,key,signal)`;
  Uint8Array copied before awaits, validated without reserialization, same bytes/
  resource identity on every permitted attempt. Controls take exact body bytes;
  exchange/refresh additionally take an auth key. [Full API/spec](../decisions/t05-approved-transport-spec.md).
- Future session/journal owners must supply trusted binding/credential hooks and
  durable `beforeDispatch`; transport supplies no session persistence or permission
  guard. Controls/raw responses remain private, never direct model output.
- Safe typed errors preserve sticky mutation uncertainty after dispatch. Observed
  truncation is internal_error/no in-call retry; no-response/explicit wire timeout
  retains network_error behavior. Abort/fences stop delivery; only full validated,
  unfenced success settles uncertainty. Never rekey or infer settlement from errors.
- QA: exact15active suites/4helpers + visibly synthetic TLS fixtures under T05test
  paths. General interception/proxy/cleanup infrastructure preserved/deferred,
  not passed or removed; no whole-suite claim or silent discovery changes.
- Exact commands/versions/results/history/remaining limits are in [acceptance](../evidence/t05-coordinator-review.md).
  No bounded-task blocker remains; integration, config guard, real backend/auth/
  host/Android and release gates remain future unverified work. No writes/commits.
- Next pickup uses the [standing proportional-testing policy](../decisions/proportional-testing-policy.md).
  T06/T09 dependency readiness is not assignment or automatic succession.
