# T16-S6 — Other-client races and lifecycle review

**Accepted/closed:** 2026-10-17 after the authorized backend repair. S6 only;
S1–S6 closed, S7 unassigned and parent T16 incomplete.
[Work order](../tasks/t16-s6-work-order.md), [remaining plan](../decisions/t16-remaining-slices.md),
[finding and proposed repair](../decisions/t16-s6-backend-timestamp-finding.md).
S1–S5 remain closed, S7 unassigned and parent T16 incomplete. Primary-agent
specification review with bounded subagent oracle/fixture review; not independent
T20 security or release certification.

## Authorized backend repair and current verification

The user resumed S6 with “and why did you stop? continue” on 2026-10-17. This
supersedes the original read-only backend boundary for the two narrowly recorded
source paths. [Applied diff](t16-s6-applied-backend-repair.patch) and
[identity](t16-s6-backend-repair-identity.json) record one production normalization
change and its acceptance test; the other 115 original build inputs remain exact.
No MCP production, shared contract, dependency, Android or .pi change.

New acceptance uses milliseconds only after unrounded proof freshness validation.
The same persisted instant drives deletion/consumption/revocation and the exact
24-hour purge deadline. DeletionReceipts, keyed replay identity and historical
ledger values are unchanged. No historical migration or deployment is claimed.

The new fixed-nanosecond regression reproduced the exact wire precision defect:
[confirmed red](t16-s6-backend-red-confirmed.json). The initial repaired run passed
26/27, including the new regression; an existing zero-row cleanup fixture compared
DB-wall-time expiry with a frozen service Clock. The fix changes only two fixture
expiry assignments to service time minus one second. Original assertions and real
cleanup remain; [initial failure](t16-s6-backend-initial-green.json) is preserved.

[Final backend checks](t16-s6-backend-final.json): **27/27 in four exact classes**,
zero failures/errors/skips, including acceptance, proof freshness/purpose, exact
replay and account status. The regression independently asserts literal expected
milliseconds, persisted ledger/intent/account/consumption times, the 24-hour deadline,
byte-identical replay after proof expiry and fresh status. Source review verified
that raw-time proof validation, locks, readiness and old receipt history remain
unchanged. Primary review with bounded read-only peer review is not T20 release
certification.

[Actual signed-proof cleanup](t16-s6-repaired-deletion-results.json): **1/1 PASS**.
The final authoritative deleted-status path now erases A ciphertext/master key,
retains its completed generation fence/redacted descriptor, preserves B private
bytes/key fingerprint and leaves B remotely usable. Signature/nonce/purpose checks
run through actual backend code; the certificate source is the private fixture.
[Focused cleanup](t16-s6-repaired-deletion-cleanup.json) and
[provenance](t16-s6-repaired-deletion-provenance.json) verify owned removal.

[Fresh local regressions](t16-s6-repaired-local-results.json): **35/35 PASS** in
three unchanged T09/T12 files, zero failed/skipped/pending/todo. The fixed backend
verification wrapper later gained an exact suite-set/focused-count guard; this
file is not consumed by the local runner and no local regression dependency changed.
[Final accepted results](t16-s6-accepted-results.json): **45/45 full active T16
checks** in eight files, zero failed/skipped/pending/todo. Runtime492.99seconds.
[Final owning inventory](t16-s6-repaired-artifact-inventory.json):615 stable hashes.
The local regression batch also has615 stable hashes; only the unused backend
verification wrapper differs between those batches. No whole-tree-identical-across-
batches claim. MCP product inputs/outputs remain unchanged on all310 checked paths.

[Final backend provenance](t16-s6-repaired-backend-provenance.json) and
[cleanup](t16-s6-repaired-cleanup.json) verify the repaired candidate, seven owned
Java restarts/three test-only Clock selections, original inputs stable during the
run and owned backend/container/control/config/signer/provider/bus/root removal.
The source identity records the authorized one production/one test change and
115 other unchanged build inputs. No install/build overlapped target execution.
S6 is accepted; S7 Android/integrated parent acceptance remains unassigned.


## Requirements and independent oracles

| Requirement | S6 evidence and scope |
| --- | --- |
| R09 detected other-client divergence | Real second-session draft edit after confirmed draft; delete after confirmed populate. Explicit identical MCP resume returns concurrent_modification with retained confirmed history and no mutation. Separate routine and actual DB/replay/sync state remain unchanged. |
| R10 advisory race | Real second-session PUT after advisory GET, before MCP PUT/save. Actual PUT overwrites the other edit under LWW; actual save retains changed child values and reports confirmed-save conflict without rollback. Independent DB children, revision4, four batches/replay effects and terminal repeat. |
| A07 local generation fences | Hold genuine read/committed-draft responses before relay delivery; actual production lifecycle sign-out advances the local generation, suppresses obsolete results and unsent steps. Committed remote draft remains at revision1. Uses caller-owned production session composition; compiled CLI ownership refusal remains covered by T12. |
| A08 verified matching/different binding | Real pending populate response loss, trusted sign-out, foreign real-grant refusal, real same-account fresh grant replacement and explicit identical MCP resume preserve exact bytes/key/root across generations. Grants originate from actual isolated refresh, not actual Google bootstrap. Existing T04/T06/T12 cover origin/profile and replacement permutations. |
| A10 authoritative deletion | Real RSA signature/issuer/audience/expiry/nonce/purpose verification, active proof, signed foreign404 and actual202 account deletion pass before the final deleted-status boundary. DB confirms ledger/purge intent/disablement/session revocation/identity detachment. After the authorized timestamp repair, actual deleted status clears only A; its ciphertext/master key are erased and the completed fence is retained while B stays exact. The initial account_status_failed result remains recorded below. |
| R11 integrity/recovery | Reuse accepted T04/T09 integrity, missing-key and stale encrypted-store/anchor evidence; selected unchanged T09 persistence regressions replay these boundaries. No identity reconstruction or reset. Whole protected-state rollback/media/same-UID limits remain unchanged. |
| R12 retention/minimization/retirement/removal | Real uncertain journal survives sign-out/replacement and explicit recovery. Real uncertain committed draft can be retired without remote changes; identical/changed repeats fail recovery_unavailable. T09/T11 receipts/minimization and T12 removal/status regressions supply local permutations. Beyond30days is schema/source invariant plus accepted component evidence, not an elapsed31-day service run. |

Test oracles derive from shared MCP A07/A08/A10/R09–R12 and backend v1. Return
messages alone do not prove effects: assertions inspect actual DB roots/children,
revisions/replays/sync batches and actual encrypted private state. Test code never
prints expected/actual private values. No source-generated expected response fixture,
CAS assumption, automatic rollback, Google/browser or Android claim.

No operation schema expiry/creation-age fields or operation execution TTL/eviction
branch exists. Definitive settlement compacts and explicit retirement erases
payloads/reserves IDs. Credential expiry is separate from evidence retention and
requires matching verified reauthentication. Existing T11 source review plus actual
explicit recovery addresses this invariant without an artificial aging framework.

## Qualification and retained failures

The initial version probe reached ambient Node26/npm12 while T01_NODE_HOME was
unset; no source check/build/test used it. Restored disposable Node24.21.0/npm11.19.0
from the versioned archive after checking its published SHA256. Java27, Docker29.9.0
and retained GNOME Keyring51.1 provider match prior accepted fixtures. Production
typecheck/lint/format/build pass; rebuilt product files match the accepted S5 bytes.

[Initial qualification](t16-s6-initial-qualification.json):5/9 passed, four failures.
Three arose from new invalid other-client PUT fixtures; one A10 test hit the default
10-second budget. Review corrected exact required PUT fields, removed derived
exerciseName, changed a child value to survive save-name replacement, preserved
the untrimmed requested name and gave the real multi-profile proof flow90seconds.
No public/product assertion or required case was dropped. Initial cleanup/input
stability passed: [provenance](t16-s6-initial-backend-provenance.json).

[Second qualification](t16-s6-second-qualification.json):8/9 passed; every race and
local lifecycle case passed. Actual deleted status failed. A separate
[diagnostic](t16-s6-deletion-diagnostic-results.json) confirmed the failing stage;
active/foreign proof and real deletion/DB effects had succeeded. Both runs retained
stable target hashes, original backend inputs and owned cleanup. No MCP/backend
product or contract repair has been applied at this review checkpoint.

An additive fixed-stage diagnostic initially failed preserve-caught-error lint;
it now retains the already-sanitized cause. Syntax/lint/format/import checks pass
for the final fixture sources. Final full owning acceptance remains failed solely at the actual deletion boundary.

## Initial full verification before the backend repair

[Results](t16-s6-results.json): full active T16 owning **44/45** in eight files;
only actual authoritative deleted-status cleanup fails. All original36 owning
checks and eight new S6 race/local-lifecycle checks pass. The fixed diagnostic
confirms the accepted backend deletion receipt has nonzero submillisecond digits.
No failing case was excluded, skipped, reclassified or counted as a pass.
[Owning inventory](t16-s6-artifact-inventory.json):614 stable hashes, zero
pending/todo and no other assertion outcomes. Total runtime483.62seconds.

[Unchanged local regressions](t16-s6-local-regression-results.json):35/35 in three
files, zero failed/skipped/pending/todo,614 stable hashes in that run. The final
owning run follows two proof-fixture hardening edits (per-connection timeout and
pending-secret cleanup audit); those files are not consumed by the local runner.
Local regression sources, production and their fixtures stay unchanged. The two
batches have separate inventories; no identical whole-tree-across-batches claim.
[Product identity](t16-s6-product-identity.json):310 unchanged inputs/outputs against
accepted S5. [Shared comparison](t16-s6-contract-comparison.json):24 matching files.
No fresh clean-install/reconstruction or complete S6/parent acceptance claim.

[Backend provenance](t16-s6-backend-provenance.json) verifies116 original backend
inputs unchanged, actual JAR/image identity, original guarded launcher identity,
seven owned Java restarts/three Clock selections and full backend/container/control/
private-config/snapshot/signer material removal. The backend Clock source overlay
is the existing backend-owned test artifact required by unchanged S3/S4.
[Cleanup](t16-s6-cleanup.json) verifies private provider qualification, provider/bus
exit and private-root removal. No owned fixture processes/resources remain running.
Raw private child log was hashed and erased. The public restored tool extraction
is retained for a possible separately authorized repair.

Reproduction uses the [handoff command](../handoffs/t16-s6.md). The local batch is
`python3 test/create-stdio/run-isolated.py "$T01_NODE_HOME/bin/node" "$T16_PROVIDER"
"$T16_LIBRARIES" docs/evidence/t16-s6-local-regression-selection.json
/tmp/gt-t16-s6-local-regressions` after exporting the pinned PATH. Scoped Node
syntax/ESLint/Prettier cover the changed helper and two new tests; Python AST covers
the runner/signer; compiled auth/storage/creation/lifecycle and fixed checkpoint
imports resolve. Production commands were typecheck, lint:production,
format:check:production and build before all integration execution. Final document
link/whitespace/status checks are separate from runtime results.

## Fixture, safety and remaining gates

Reuse actual isolated backend/PostgreSQL, private ext4/Secret Service/CA TLS and
compiled MCP/official SDK. The small proof fixture substitutes only the external
certificate source using the existing backend property: ephemeral private RSA key,
loopback certificate endpoint and authenticated fixed synthetic-subject signer.
It is not a Google provider/bootstrap or browser observation. The guarded copied
launcher enables a private deletion ledger key and purge capability with a one-hour
initial delay; this verifies deletion acceptance/status, not physical purge.
No backend class overlay is added for proof. The historical test-only Clock remains
required only for unchanged S3/S4 owning cases in final acceptance.

Outside the recorded backend production/test repair, original backend/Android
inputs, shared contracts, .pi, dependencies and production configuration remain
unchanged. Proof tokens/keys/config/bodies/private fixture
paths never enter repository evidence. Owned signer/backend/container/provider/bus/
private roots are stopped/reaped/removed, with sanitized cleanup reports. No
build/install overlaps target execution. Current proof is representative isolated
composition; physical power loss, original historical deletion receipts, Android,
named Pi, live Google and independent security/release gates remain separate.
