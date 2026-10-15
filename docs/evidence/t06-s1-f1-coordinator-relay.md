# T06-S1 frozen relay t06-s1-f1 — historical execution grant CLOSED

**Current status:** CLOSED after [S1 acceptance](t06-s1-coordinator-review.md).
The grant below is historical; no further execution or successor is authorized.

**Artifact:** Developer c2 + final independent QA source repairs, source gates
PASS; no assertion/runtime acceptance yet. Developer holds ALL edits/build/runtime
checks. QA holds ALL test/helper/fixture source edits; only named execution and
new sanitized `docs/evidence/t06-qa-f1-execution.md` reporting are allowed.

[Inventory](t06-s1-f1-artifact-inventory.json): **249 files**; SHA256:
`5e31b0f0cf970d6db63d0ab5f2c88f9e59d6e728fbaa0b6f812ae57e263fa11b`.
Coordinator pre-relay verifier: PASS249unchanged files. Inventory includes the
production/compiled inputs, exact QA owning/regression sources and reused synthetic
TLS/helper dependencies, common contract and locked metadata; no node_modules,
.git/.pi, personal/private state or raw captured service data.

## Granted sequence (QA only)

Every command uses provisioned T01_NODE_HOME and
`PATH="$T01_NODE_HOME/bin:$PATH"`, Node24.21.0/npm11.19.0. No system fallback,
install/build/package/config/source edits or expanded discovery. New disposable
QA-owned HOME/XDG/temp/cache roots, no ambient credential bus/personal keyring;
T04 **issued diagnostic facility only**, real TLS loopback with the existing
synthetic CA. No external service/Google/browser/Android/provider invocation.
Clear inherited NODE_OPTIONS and TLS override variables for isolated execution;
never install test TLS trust or change .pi. The inventory verifier reads bytes
for hashing only; QA must not inspect production/emitted JS contents/maps.
Public declarations may now be read for the frozen public entries only.

1. Verify inventory checksum and all249rows before importing targets:

   ```sh
   printf '%s  %s\n' \
     5e31b0f0cf970d6db63d0ab5f2c88f9e59d6e728fbaa0b6f812ae57e263fa11b \
     docs/evidence/t06-s1-f1-artifact-inventory.json | sha256sum --check
   python3 docs/evidence/t06-s1-verify-artifact.py docs/evidence/t06-s1-f1-artifact-inventory.json
   ```

2. Run the **entire S1 owning selection**, once, no skips/todos:

   ```sh
   node node_modules/vitest/vitest.mjs run \
     test/unit/t06/01-expiry-grant-oracles.test.mjs \
     test/unit/t06/02-session-fence-matrix.test.mjs \
     test/fault/t06/commit-fence.test.mjs
   ```

   This grants compiled auth/storage/transport entry execution, issued synthetic
   filesystem/lease/fault fixtures and owned loopback HTTPS only. No ordinary
   Secret Service qualification, backend or MCP-server interoperability claim.

3. **Only if all owning assertions pass**, run the explicit unchanged regressions:

   ```sh
   node node_modules/vitest/vitest.mjs run \
     test/foundation test/unit/t03 test/unit/t04 \
     test/unit/t05/04-hooks-fences-dispatch.test.mjs
   ```

   Foundation/T03/T04unit preserve accepted entry/schema/storage integration.
   The one unchanged T05 hook/fence suite is directly relevant; no need to rerun
   all unchanged transport/provider suites for this S1 checkpoint. Full relevant
   T04/T05 integration and complete active T06 remain mandatory at parent final
   acceptance, not waived. Parked T02 and deferred T05 interception/proxy campaigns
   remain preserved, unexecuted and NOT passed. No whole `npm test/check` claim.

4. Repeat checksum+249row verification even if a suite fails. Safely settle owned
   requests/commits/holders/listeners before deleting only issued QA disposable
   roots. Report exact exit statuses, files/tests/pass/fail/skips, versions,
   fixture cleanup and hash stability in the new QA evidence; no secrets, private
   paths or bodies. Send an asynchronous milestone to coordinator/w4:p2K then
   HOLD all actions. Do not modify frozen source-ready evidence.

## Failure/stop boundary

Any owning failure, timeout, hash change, unsafe/unavailable fixture or cleanup
error stops subsequent regression execution. Preserve the failure and distinguish
unrun/blocked checks; no reclassification, assertion/source repair or extra rerun
without Coordinator adjudication/new grant. A failed frozen artifact remains
historical; later repairs require a new inventory/relay. No hidden exclusions,
`passWithNoTests`, skipped gate as pass or masked diagnostic.

Original60–90minute window preference/90checkpoint/120stop remain; execution
is a phase of S1, not automatic context renewal. Finish safe handling of owned
work, then honest partial/blocked handoff if the limit arrives. No S2, actual
product writes, live credentials, staging/commits, .pi changes or release.

Coordinator final acceptance still requires independent clean allowlisted locked
source reproduction (`npm ci --ignore-scripts`, production checks/build, S1 owning
and these regressions), unchanged source hashes and identical compiled bytes.
A small inert-import black-box observation plus completed source audit is separate
from an exhaustive interceptor/OS-sandbox claim. This relay alone accepts nothing.
