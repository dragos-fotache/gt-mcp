# T20 — Perform independent security and release-readiness review

**Status:** planned · **Owner:** unassigned · **Requires:** T16, T17, T18, T19
**Size:** 1-2 sessions

## Outcome

Review the entire deliverable against the shared draft and evidence before enabling/releasing writable support.

## Read first

- [README.md](../../shared-docs/docs/mcp-contract/README.md)
- [acceptance-scenarios.md](../../shared-docs/docs/mcp-contract/acceptance-scenarios.md)
- [verification.md](../verification.md)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Independently review route/tool allowlists, secret handling/encryption, external state fences, immutable identities, creation state machine and config-file writesEnabled guard (default false; no permission extension or per-routine prompt).
- Check all acceptance scenario IDs, release gates and compatibility rows against actual passing evidence. Re-run clean build/protocol/security/fault suites and focused real integration checks.
- Verify defaults/unknown fields/output unions, exact bytes, revision losslessness, no truncation, safe error context, minimization/retirement, session fencing and no autonomous restart.
- Audit config strictness/ownership/defaults and server admission/pre-send enforcement. Validate that args/clientInfo/annotations/mode/UI/environment/CLI cannot enable writes. Verify enabled/disabled behavior on supported hosts without permission extensions; review untrusted text, transcript privacy and package metadata.
- Check coordinated contract drift at release; shared changes require matching schemas/prose/tests or explicit blocked resolution.
- Produce go/no-go report and release checklist with named artifacts/versions and honest limitations; no deployment or personal-data operation unless separately authorized.

## Acceptance criteria

- All gates in verification.md have passing evidence with no skipped external cases represented as complete.
- Open security/contract blockers result in no-go; no waived gate hides partial implementation or failing tests.
- Future agent can reproduce supported installation/tests from local guides without access to personal configuration.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

Final independent coverage/release review of shared draft0.2 M01-M10, A01-A11,
C01-C12, R01-R12 and cross-project gates. Old approval scenario meanings are
explicitly superseded policy, not passes; parked T02/retired T13/T14 are not active
release prerequisites. Historical failed experiments remain preserved.

## Handoff

Record reviewed artifacts/versions, exact safe checks, go/no-go, unresolved risks and supported certification scope.

On completion append: changed paths; exact safe commands and pass/fail results; versions;
remaining blockers/limits; next-agent integration notes. Update the task index. Do not
record credentials, identifying production data or raw private request/response bodies.
