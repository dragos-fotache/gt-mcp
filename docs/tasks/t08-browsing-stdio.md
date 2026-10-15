# T08 — Ship the authenticated read tools and stdio protocol surface

**Status:** done / T08-S1, S2 and S3 accepted · **Owner:** Coordinator; independent Developer/QA · **Requires:** T03, T05, T06
**Size:** 1-2 sessions

Current closure: [S3 acceptance](../evidence/t08-s3-review.md) and
[handoff](../handoffs/t08-s3.md) supersede prior S3-held descriptions below.
Final active 941/941 and clean T08 owning 82/82 PASS; actual stdio delivered.
No automatic successor or release acceptance.

T06 closed by user direction with explicit verification omissions; read the
[next-Coordinator pickup](../handoffs/t06-complete-coordinator-pickup.md).
T08 does NOT depend on T07; safe configured/signed-out/read protocol work is ready.
End-to-end operator browser login still needs T07 later. User selected T08 and
requested a general design/slices. See the [Coordinator proposal](../decisions/t08-general-design-and-slices.md):
S1 trusted runtime/read boundary, S2 seven-tool adapter, S3 stdio delivery/integration.
[User choices](../decisions/t08-s1-user-decisions.md), the
[settled S1 specification](../decisions/t08-s1-runtime-spec.md) and
[accepted S1 record](t08-s1-work-order.md) govern delivered runtime behavior.
[S1 independent acceptance](../evidence/t08-s1-coordinator-review.md):101/101 owning/
relevant regressions and stable137-input freeze; [handoff](../handoffs/t08-s1.md).
S1/S2 windows CLOSED. [S2 independent acceptance](../evidence/t08-s2-coordinator-review.md):
112/112 owning/relevant passes,217stable inputs, final four pinned production checks,
126identical outputs and real isolated provider/HTTPS/release/cleanup; original
F1 failures/limits retained. [Current handoff](../handoffs/t08-s2.md).
Descriptor writing is deferred to T07/T12. S2 also has a
[settled specification](../decisions/t08-s2-protocol-spec.md) and
[accepted work-order record](t08-s2-work-order.md), including its output budget/SDK
adaptation. S3 has a [settled stdio/parent specification](../decisions/t08-s3-stdio-spec.md)
and [held work-order draft](t08-s3-work-order.md). Implementation is sequential:
S1/S2 are accepted; S3 is dependency-ready but separately unassigned/held.
Actual stdio/parent acceptance remains S3; design documents alone are not delivery.

## Outcome

Make browsing portable and schema-correct while creation remains unavailable.

## Read first

- [tools.md](../../shared-docs/docs/mcp-contract/tools.md)
- [service-protocol.md](../../shared-docs/docs/backend-contract/service-protocol.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Implement six tools mapped to their exact GET routes; return complete canonical records/pages with lossless decimal-string revisions and authorized current labels.
- Forward effective search/filter/limit context; default page size 20 and no automatic exhaustive traversal. Keep continuation tokens opaque and never silently drop invalid/expired tokens.
- Register exactly seven tools through the pinned official SDK, with creation placeholder returning configuration_required with a safe unavailable/disabled-creation reason and no mutation dispatch.
- Publish full input/output schemas/annotations; return structuredContent and identical serialized text with correct isError.
- Ensure malformed JSON-RPC/unknown tools remain protocol errors while invalid tool arguments/API failures return application error envelopes; handle SDK automatic validation behavior explicitly.
- Keep stdout MCP-only; test shutdown/abort/disconnection and explicit result_too_large without truncation.

## Acceptance criteria

- Official SDK client initializes/list/calls successfully; seven names/schemas/annotations exactly match draft.
- Unit/controlled HTTP tests cover own draft get vs saved list, no foreign disclosure, filter/context paging and null terminal tokens.
- All tool paths reject missing config/auth safely; disabled create never reaches backend.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

M01-M10 deterministic/protocol aspects; A01; read aspects of M05/A09.

## Handoff

Provide protocol test commands, the tools registry wiring point for T15, and known host output-budget constraints.

On completion append: changed paths; exact safe commands and pass/fail results; versions;
remaining blockers/limits; next-agent integration notes. Update the task index. Do not
record credentials, identifying production data or raw private request/response bodies.
