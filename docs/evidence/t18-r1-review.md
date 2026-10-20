# T18-R1 — Current private package refresh acceptance

**Accepted/closed on2026-10-17.** User requested the package refresh;
[work order](../tasks/t18-r1-work-order.md), [handoff](../handoffs/t18-r1.md).
Review is by the primary implementing agent; independent T20 remains separate.

## Delivered candidate

`dist/delivery/t18-r1/gymtracka-mcp-0.0.0.tgz`,264637 bytes, with sibling inventory.
Archive SHA256:

```text
ed5877dd16fc79043bc8773d3d15bb6fed2887dc891100ccebf8ddf2b3b22563
```

[Retained inventory](t18-r1-package-inventory.json):96 files,86 production JS,
111 locked runtime dependencies. The archive includes the accepted T16-S3
catalogue decoder fix and current standalone guides. Independent archive reading
checks actual bytes/modes against the inventory and resolves shipped local links.
[Comparison](t18-r1-package-preflight.json) against the historical T18-S3 inventory
finds exactly two changed members: `dist/domain/projected.js` and
`docs/stdio-server.md`. Runtime shrinkwrap, dependency identities, manifest, other
runtime bytes and modes are unchanged. This compares historical recorded content;
the old archive itself was not reconstructed or freshly executed.

## Acceptance and exact targets

**40/40 in12 files on workspace and clean reconstruction**, zero
failed/skipped/pending/todo: full active packaging12 +28 relevant unchanged
regressions in the [exact selection](t18-r1-selection.json).
[Workspace inventory](t18-r1-artifact-inventory.json) has626 stable hashes;
[clean inventory](t18-r1-clean-artifact-inventory.json) has622. The
[scope comparison](t18-r1-scope-comparison.json) identifies the four workspace-only
inputs: two retained delivery files and two historical parked T02 emitted files.
Every shared hash agrees; no whole626-file cross-target equality claim.

The packaging suite explicitly consumes copies of the retained delivery archive
via the test-only `GT_PACKAGE_REFRESH_ARTIFACT_ROOT`; every install uses
extract-and-`npm ci --omit=dev --ignore-scripts`. It verifies actual installed
dependency versions, bins/help, unrelated-CWD SDK/seven tools/EOF, private holder
ownership/release and CLI local removal. Independent tar inspection checks safe
members/modes, root-authoritative lock, absence of source/dev/Pi/private material
and synthetic canaries. Packer refusal/canary probes still execute the real packer.

Installed recovery preserves pending IDs/keys/exact bytes and saved receipts;
no-call replacement is inert, false policy blocks continuation and explicit
enabled retry settles original work. Future store/journal versions, invalid keys,
future envelope and nonempty never-bound evidence refuse startup without resetting
bytes; ownership releases. Config/auth/identity/cancellation/lifecycle/SDK and the
known catalogue-role regression pass separately. The exact packaged decoder
hash matches accepted T16-S3; no new production repair was made.

[Baseline provenance](t18-r1-baseline-identity.json):302 frozen current-source/
compiled/packaging/config files stay unchanged, including194 emitted files.
Historical temporary pre-T18 baselines no longer existed. The explicit test-only
`GT_PACKAGE_REFRESH_BASELINE_ROOT` selects current frozen source -> fresh installed
candidate, not a pre-T18 or old-release migration claim. The historical baseline
control remains available; ambiguous dual selection fails. Baseline dependencies
use a declared symlink to unchanged workspace node_modules; installed candidates
resolve their own freshly installed runtime dependencies.

[Clean reproduction](t18-r1-clean-reproduction.json):430 copied source inputs,
fresh empty npm configuration/cache, `npm ci --ignore-scripts`, all four production
checks/build and package creation pass.194 emitted files match byte-for-byte.
Archive bytes, member content/modes, selected input hashes and runtime dependency
identities match exactly. The same full40-check selection passes on that target;
workspace/baseline remain stable and the owned clean snapshot is removed.

## Changes, commands and observed failure

[Initial red finding](t18-r1-initial-document-finding.json) independently reads
the archive and finds the server guide's link to unshipped repository-only
`pi.md`. Replaced that link with standalone registration/verification wording;
the full existing document-link oracle passes unchanged. No evidence tree or
additional documents were added to the shipped allowlist.

Other changes are two minimal test input controls, the fixed
`test/packaging/reproduce-refresh.py`, selection and task/evidence/status notes.
No production/dependency/manifest/compiler/storage-format/shared-contract change.
Source/spec review checked that archive selection preserves the original fresh-
pack default, replacement assertions remain intact, installed subjects use their
own module-relative dependencies/holder, and current-baseline evidence is labeled
honestly. No generalized harness or additional fault campaign.

Safe command shapes, with provisioned toolchain and qualified disposable provider:

~~~sh
export PATH="$T01_NODE_HOME/bin:$PATH"
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
npm run package:artifact -- --out "<absolute empty delivery directory>"
export GT_PACKAGE_REFRESH_BASELINE_ROOT="<verified frozen current source>"
export GT_PACKAGE_REFRESH_ARTIFACT_ROOT="<absolute delivery directory>"
python3 test/create-stdio/run-isolated.py \
  "$T01_NODE_HOME/bin/node" "$T18_PROVIDER" "$T18_LIBRARIES" \
  docs/evidence/t18-r1-selection.json "$T18_OUTPUT_PREFIX"
python3 test/packaging/reproduce-refresh.py \
  "$T01_NODE_HOME/bin/node" "$T18_PROVIDER" "$T18_LIBRARIES" \
  "$GT_PACKAGE_REFRESH_BASELINE_ROOT" "$T18_WORKSPACE_INVENTORY" \
  "$GT_PACKAGE_REFRESH_ARTIFACT_ROOT" "$T18_CLEAN_OUTPUT_PREFIX"
~~~

Scoped Node syntax, test-helper lint/format/import and Python AST checks pass.
Build/pack/install occur before the corresponding target's tests, never during
them. The reproduced archive is frozen; [status-only documentation closure](t18-r1-doc-closure.json)
is reconciled separately without repacking or claiming another full runtime run.
For later reproduction from the final status tree, apply only the recorded
documentation hash reconciliation to a disposable copy of the workspace inventory
before invoking the fixed script; all runtime/package inputs remain exact.

[Workspace cleanup](t18-r1-cleanup.json) and
[clean cleanup](t18-r1-clean-cleanup.json) pass private unlocked provider
store/read/clear qualification, provider/bus exit and fixture-root removal.
[Environment](t18-r1-environment.json) records Node24.21.0/npm11.19.0, pinned
packages, GNOME Keyring51.1 binary identity and Linux x64/ext4/TLS scope.

## Remaining gates

Historical T18-S1–S3 acceptance stays preserved. This is a refreshed private
candidate, not publication/release or real enablement. T17-S1 stays closed;
planned T17-S2–S5, T19 real Google/browser and independent T20 remain separate.
No new actual-backend/Android/Pi certification, personal/live use, local `.pi`
change, staging/commit or successor. T04/T06 limits and parked/retired dispositions
persist. Use the bundled installation/login/server/recovery guides and the sole
supported extract-and-ci route.
