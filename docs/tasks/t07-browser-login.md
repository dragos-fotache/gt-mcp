# T07 — Implement trusted foreground Google browser login

**Status:** done; S1/S2/S3 and parent accepted · **Owner:** primary agent (all T07 work closed) · **Requires:** T04, T05, T06
**Size:** three proposed outcome-based slices; work-window limits apply, not a session guarantee

## Design and proposed slices

The user requested design/slicing on 2026-10-15. The Coordinator's
[T07 design and slice plan](../decisions/t07-general-design-and-slices.md) now
documents protected foreground exchange/atomic installation, crash-safe binding
descriptor publication, secured GIS loopback behavior and trusted CLI delivery:

1. **S1:** protected login transaction and binding publication.
2. **S2:** secured loopback GIS helper.
3. **S3:** trusted CLI delivery and parent integration.

The original design authorized planning only. Exact slice API/types, execution
boundaries and proportional checks are frozen in a decision-ready work order
before each sequential assignment. The later S1 assignment is recorded below.

Subsequently, the user assigned S1 on 2026-10-15 and superseded the historical
QA/Developer/Herdr workflow for this assignment. The
[S1 work order](t07-s1-work-order.md) bounds direct implementation and optional
helpers. S2/S3 remain unassigned; the original design-only disposition above is
historical.

S1 is now [accepted](../evidence/t07-s1-review.md): protected exchange, initial/
same-account installation, setup and explicit descriptor recovery are delivered
as additive trusted composition. All 47 S1 checks pass, including real isolated
Secret Service/ext4/HTTPS and T08 reopen/read, with clean locked reproduction.
[S1 handoff](../handoffs/t07-s1.md) records remaining boundaries. No browser
helper or executable CLI exists yet; S2/S3 require separate assignments.

The user subsequently assigned S2. [S2 is complete](../evidence/t07-s2-review.md):
the secured dual-loopback GIS helper/page composes with S1, with20/20 owning
checks,67/67 clean T07 replay,213 selected checks across two passing batches,
and144 byte-identical clean compiled files. [Current handoff](../handoffs/t07-s2.md).
The earlier S1-only boundary above is historical; S3 CLI/parent delivery remains
unassigned. No genuine Google/browser interoperability or release claim.

The user subsequently assigned S3. [S3 and parent T07 are complete](../evidence/t07-s3-review.md):
compiled trusted CLI, single-capture S1/S2 configuration, fixed launcher, safe
diagnostics/signals and [operator guide](../login.md). Final S3 scope32/32, complete
clean T07 replay99/99, selected236/236 plus provider9/9,148 identical compiled files
and334 stable input hashes. [Current handoff](../handoffs/t07-s3.md).
The earlier S1/S2-only boundaries above are historical. All T07 work is closed;
T09 remains ready/unassigned, with no automatic successor. Real desktop/Google/
backend/named-host/Android/release gates remain separate.

T06 closed by user direction with explicit verification omissions; read the
[next-Coordinator pickup](../handoffs/t06-complete-coordinator-pickup.md).
T08 is complete. S1 settled the protected foreground exchange-record/atomic T06
installation handoff under its bounded work order. Readiness opens no successor
grant; T09 remains separately assigned work.

## Outcome

Build the selected dedicated-session bootstrap mechanism without a new backend login API.

## Read first

- [authentication.md](../../shared-docs/docs/mcp-contract/authentication.md)
- [authentication.md](../../shared-docs/docs/backend-contract/authentication.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Add trusted local setup/login command using configured backend audience and fixed registered http://localhost:<port> origin. Never accept configuration or tokens through model tools.
- Request signIn challenge, open a temporary loopback-only GIS popup/callback page, and pass the backend nonce to Google initialization.
- Check exact Host/Origin, attempt-bound CSRF, active-attempt callback, challenge deadline and callback uniqueness; reject unsolicited/stale credential submissions and wildcard CORS.
- Exchange through backend HTTPS with stable protected body/key and bounded foreground identical recovery; install the dedicated service-confirmed grant atomically.
- Never send service grants to browser JavaScript, URLs/storage, argv/stdout or chat. Only required Google identity script; no analytics/token-paste fallback.
- Close listener and erase temporary Google credential material on success/cancel/expiry; handle occupied port/browser/configuration failures with safe guidance.

## Acceptance criteria

- Controlled-provider tests cover nonce/audience mismatch, duplicate/stale callback, forged Origin/Host/CSRF, occupied port and cancellation/expiry.
- Listener binds only loopback and respects the exact configured registered origin; no random-port fallback.
- No browser/tool/background route can reveal grants or initiate unapproved login. Live Google success is explicitly deferred to T19.
- Relevant existing checks remain green; no shared policy/wire-schema expansion or private fixture leakage. The proposed private temporary vault format is scoped by the design/S1 work order.

## Scenario ownership

A01-A02/A11 deterministic helper checks; actual browser/provider evidence in T19.

## Handoff

Record nonsecret required configuration, login commands, helper origin/deadline behavior and unverified live prerequisites.

On completion append: changed paths; exact safe commands and pass/fail results; versions;
remaining blockers/limits; next-agent integration notes. Update the task index. Do not
record credentials, identifying production data or raw private request/response bodies.
