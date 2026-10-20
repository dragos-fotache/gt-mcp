# T18-S2 — Standalone operator guides and safe templates

**Status:** accepted/closed · **Owner:** primary Codex agent · **Authorized:**
user requested “go ahead and do s2” on 2026-10-16. Started13:37 UTC;
90-minute checkpoint15:07 UTC, hard stop15:37 UTC. S1 stays closed; S3 held.

## Contract and edit scope

Complete S2 of the [settled plan](../decisions/t18-plan-and-slices.md), under shared
MCP draft0.2 auth/tools/creation/scenarios, unchanged backend v1, accepted
foundation/storage/transport/runtime/lifecycle specs and
[proportional testing](../decisions/proportional-testing-policy.md).
Deliver a standalone package README and installation/login/server/recovery/upgrade
journey, complete shipped links, safe placeholder templates and correct accepted
configuration/default/budget documentation. Extract-and-npm-ci is the sole supported
installation route. Startup-only policy and protected ownership/recovery behavior
stay unchanged; never claim migration/recovery/release evidence from prose checks.

Edit packaging/README.md, packaging/document-files.json and examples as needed;
docs/installation.md, docs/recovery.md, docs/login.md, docs/stdio-server.md,
docs/packaging.md, README and current task/status/compatibility/evidence/handoff
notes; one focused test/packaging/documents.test.mjs. No runtime, packer, manifest/
lock/compiler/dependency edits, no existing test weakening. Preserve historical
evidence, parked T02, retired T13/T14, T06 omissions and T04 limits. Existing guides
must remain useful in both the checkout and extracted artifact; ship every local
operator link target, with development evidence references kept outside that closure.

## Verification and execution

Use verified disposable T01_NODE_HOME at /tmp/gt-t18-s1-tools/node-v24.21.0-linux-x64
and confirm Node24.21.0/npm11.19.0. No system/global/Pi changes. Permit scoped
authored-test syntax/lint/format/import checks, document/link/template review,
package:artifact into new empty /tmp outputs, actual fresh extraction/npm ci
--omit=dev --ignore-scripts, installed CLI help and safe unconfigured MCP smoke.
No profile/provider/backend/browser/Google/Android or enabled writes are needed.
No install/build/pack races execution against its target. Existing dist is the
S1 accepted stable build; verify its hashes, do not rebuild for documentation.

Use a small independent specification-derived set: actual shipped link/anchor
closure and entry commands, template schema/defaults and documented budget rows,
mandatory privacy/recovery limitations. Reuse the existing artifact helper and
validator exports; no generalized documentation crawler/testing framework.
Final active selection: new documents.test.mjs; existing artifact-install.test.mjs
as repack/fresh-install/CLI/SDK regression; T12 s4-disclosures.test.mjs. Do not run
the full S1/provider/engine matrices again for document edits. Record exact active
paths before execution and hashes of product/packer/manifests/templates/emitted
inputs and shipped documents across final replay. Keep all skipped/failed work
explicit, no whole-project/parent acceptance claim.

## Milestones, deliverables and stop conditions

Recorded contract and authoritative schema/budget review; finished linked guides/
templates; early static checks; focused actual archive/install replay; source/
prose review and sanitized package/checksum evidence; S2 acceptance/handoff/status.
Optional bounded read-only review may help check operational safety; primary agent
owns integration and acceptance, never claims independent T20 certification.

Stop affected work for contradictory authority/public behavior, missing external
configuration, unsafe recovery guidance, runtime/dependency scope expansion,
generalized harness need or hard limit. No invented origins/client IDs/ports/private
paths, credential-paste instructions, store/fence deletion, real credentials/bodies
in repo/evidence, .pi/settings changes, staging/commits, publication/release or
automatic S3 assignment. Parent T18 closes only with S3 integrated acceptance.

## Final disposition

Accepted/closed:10/10 in3 exact files (3 owning +7 relevant regressions), zero
failed/skipped/pending/todo; scoped syntax/lint/format,563 stable hashes and actual
fresh extract-and-ci/installed CLI/SDK smoke PASS.546 S1 immutable inputs verified;
no source rebuild/runtime/packer/manifest/lock/dependency changes.96 package files,
86 unchanged production JS/111 unchanged runtime dependency identities.
[Review](../evidence/t18-s2-review.md), [handoff](../handoffs/t18-s2.md).
All S2 grants closed; S3 ready/unassigned, parent incomplete. Initial oracle failure
and read-only tar inspection finding/repair retained. No automatic successor.
