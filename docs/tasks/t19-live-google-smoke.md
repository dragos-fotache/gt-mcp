# T19 — Verify real Google browser bootstrap in an isolated deployment

**Status:** planned · **Owner:** unassigned · **Requires:** T07, T16, T18
**Size:** 1 session plus owner/provider configuration

## Outcome

Close the selected browser-helper interoperability gate using real Google and trusted HTTPS.

## Read first

- [authentication.md](../../shared-docs/docs/mcp-contract/authentication.md)
- [README.md](../../shared-docs/docs/mcp-contract/README.md)
- [verification.md](../verification.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Obtain owner-approved test account, isolated trusted-HTTPS service, matching public Google web client audience and exactly registered localhost helper origin/port.
- Run actual browser foreground GIS sign-in with backend challenge nonce; verify service-confirmed dedicated session and authenticated reads without exposing credentials.
- Observe sign-out/relogin and browser cancellation/expiry/configuration guidance. Use controlled tests for boundary faults where actual Google cannot be deterministically manipulated; distinguish evidence types.
- Confirm Android refresh credential was never copied and no client secret/service grants entered browser storage, tools, stdout or chat.
- Capture sanitized observations, browser/OS/runtime/configuration provenance, then revoke/clean test sessions/resources. Do not publish audience IDs/accounts/private URLs.
- If external configuration or approval is absent, leave task blocked and release gate unpassed.

## Acceptance criteria

- Real browser/backend nonce/audience/origin exchange succeeds using existing endpoints and stores a dedicated grant privately.
- Missing/occupied/unregistered configuration remains safe with no token-paste/random-origin workaround.
- Report does not count test-provider bypasses as live Google proof or claim unobserved refresh traffic.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

A02 real-browser happy path; A11 live configuration observations with deterministic security tests from T07.

## Handoff

Record sanitized actual observation, exact tested versions and distinction from doubles; no raw auth material.

On completion append: changed paths; exact safe commands and pass/fail results; versions;
remaining blockers/limits; next-agent integration notes. Update the task index. Do not
record credentials, identifying production data or raw private request/response bodies.
