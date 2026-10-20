# T19 — Real Google/browser qualification work order

Assigned by the user on 2026-10-18: “let's do T19”. The user then confirmed that
external inputs are not ready and requested a local setup checklist. **Status:
blocked on external setup; preparation only completed.** The live gate is unpassed.

Outcome: qualify foreground GIS popup/callback login against an owner-approved
isolated trusted-HTTPS backend, dedicated Google test account and matching web
client. Verify dedicated service-session installation, authenticated reads,
sign-out/relogin, cancellation and safe configuration/expiry handling. Until
provisioned, deliver the [local checklist](../handoffs/t19-local-setup.md) and an
honest prerequisite disposition, without substituting synthetic login evidence.

Authority: [T19](t19-live-google-smoke.md); shared MCP draft0.3
[authentication](../../shared-docs/docs/mcp-contract/authentication.md) and
[A02/A11](../../shared-docs/docs/mcp-contract/acceptance-scenarios.md); unchanged
[backend authentication v1](../../shared-docs/docs/backend-contract/authentication.md);
[T21 successor spec](../decisions/t21-single-record-storage-spec.md); accepted
[S6 candidate](../handoffs/t21-s6.md); foundation and
[proportional testing](../decisions/proportional-testing-policy.md).

Settled behavior: strict config2 and settings1; writesEnabled:false throughout.
Only trusted foreground login starts the helper. Use a fixed registered
http://localhost port, both loopback families, exact Host/Origin/CSRF and backend
challenge nonce/audience. The helper exchanges the Google ID token over HTTPS;
the browser never receives service access/refresh grants. Store binding/grant
atomically in the single encrypted credential record with OS key custody and
exclusive ownership. Preserve pending-auth exact-body/key recovery. No Android
credential reuse, client secret, token paste, random-port fallback, audience
relaxation or test-provider bypass qualifies the real flow.

Scope: this work order, T19 checklist/task, task index and sanitized T19
evidence/handoff/status notes. Preparation changes no product, test, shipped guide,
manifest, dependency, contract, archive, personal configuration or .pi bytes.
A reproduced product defect requires a recorded narrow scope update before repair;
public contract conflicts require user resolution. No staging/commit, release,
laptop deployment, routine creation, Btrfs qualification or automatic successor.

Environment/commands: provisioned disposable Node24.21.0/npm11.19.0 via
T01_NODE_HOME/PATH, Linux x64 and fixed /usr/bin/xdg-open. Read-only repository,
version/hash inspection, public official Google documentation and scoped document
checks are permitted now. Once owner inputs are supplied, use only the approved
isolated deployment/account, new private profile and explicit Secret Service bus;
perform trusted setup/login/sign-out and authenticated read-only calls. User
handles Google credentials/MFA directly. Keep actual configuration, IDs, paths,
tokens and response bodies out of tool outputs/repository/evidence. Do not inspect
ambient personal configuration to discover missing inputs.

Verification: no runtime regression replay is needed for this documentation-only
preparation. Check changed links, placeholder-only examples, formatting/diff and
candidate checksum. For the eventual execution, freeze candidate/config identity;
observe actual foreground login, restart/read, sign-out/relogin, cancel and expiry,
plus missing/occupied configuration behavior. Reuse accepted T07/current T21
Host/Origin/CSRF/stale/duplicate/nonce/audience fault evidence within its limits;
do not repeat the full security matrix. An unregistered-origin live observation
needs an approved test configuration; otherwise retain that subgate as unverified.
Final relevant unchanged regressions are the complete active test/login/ suite
and test/stdio-server/sdk-startup.test.mjs on isolated existing facilities. Record
the exact selection and executed source/output hashes before running; no build or
install races. Any source repair also receives early scoped static checks and
focused regression verification. Synthetic checks are never real Google proof.

Milestones: (1) contract/input inventory and setup checklist; (2) owner provisioning
and safe readiness check; (3) actual browser/backend observations and relevant
regressions; (4) owned session revocation/cleanup, sanitized review and disposition.
This preparation reached milestone1 only. Start a fresh 60–90-minute execution
window when provisioned, checkpoint at90 minutes and stop at two hours with an
honest handoff. Stop affected work for missing/unsafe inputs, credential exposure,
uncertain ownership, contract conflict or substantial harness expansion. T19
closes only with actual passing observations and cleanup; T17/current Android and
independent T20 remain separate gates.
