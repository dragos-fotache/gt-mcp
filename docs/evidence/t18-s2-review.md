# T18-S2 — Standalone guide and template acceptance

**Disposition:** accepted/closed on2026-10-16; parent T18 incomplete, S3 unassigned.
User requested “go ahead and do s2”. [Work order](../tasks/t18-s2-work-order.md),
[settled plan](../decisions/t18-plan-and-slices.md),
[exact selection](t18-s2-selection.json),
[acceptance inventory](t18-s2-artifact-inventory.json),
[package inventory](t18-s2-package-inventory.json).

## Delivered and verified

The package README links a self-contained four-guide journey:
[installation](../installation.md), [login/lifecycle](../login.md),
[server/policy/budgets](../stdio-server.md) and [recovery/retention/replacement](../recovery.md).
All local guide links and section anchors resolve inside the actual archive.
Development decision/evidence/source-build links were removed from shipped
operator text; source entry README/developer packaging notes link the same guides.
Installed absolute entry paths and quoted placeholders work independently of CWD.
The sole supported install route remains extraction then locked
npm ci --omit=dev --ignore-scripts; no consumer/global/npx installation claim.

Guidance covers pinned toolchain/Linux/ext4/flock/private-provider prerequisites,
external service/audience/registered-port inputs, protected configuration paths/
modes, setup/foreground login, startup-only writesEnabled/default false/local-client
trust, shutdown/owner release, transcript exposure, indefinite unresolved retention,
identifying compact receipts, partial remote effects, explicit identical recovery,
trusted retirement/removal/reconciliation/account-status, unsupported restore/loss/
transfer/downgrade and safe diagnostics. No secret or live deployment value is
supplied. Login resume versus recorded-transition recover is kept distinct.
Normal auth vault versions1/2/3 and temporary trusted-login exchange envelope4
are described separately, following accepted T07/T06 formats; no new format exists.

Accepted transport defaults/ranges/units are published in the server guide, with
storage/protocol/file/framing bounds and their distinct meanings. Request-target
accounting includes the request line and sent headers, not just URL length.
No budget promises arbitrary supported-data capacity or truncation. Placeholder
server/login JSON templates remain byte-identical to S1, with strict false creation
and no credentials; inline examples and packaged templates pass pure schema
validation after synthetic-only substitution. No filesystem/provider/network
configuration is created by that validation.

Final **10/10 PASS in3 exact files**, **3 owning +7 relevant regressions**, zero
failed/skipped/pending/todo. New document checks inspect actual archive links/
anchors, templates and approved-spec budget rows; unchanged S1 artifact tests
verify actual fresh extraction/npm ci, archive content/modes, executable CLI,
official SDK unconfigured seven-tool responses and directly observed EOF0.
Unchanged T12 disclosure checks pass. Scoped syntax/ESLint/Prettier and diff
whitespace checks PASS. All **563 selected hashes** stable across final execution.

**546 S1 runtime/packer/manifest/lock/dependency inputs** verified unchanged.
The194 accepted emitted files were not rebuilt. In the repacked96-file candidate,
all86 production JS files, manifest/shrinkwrap, runtime notices and templates have
identical bytes/modes to S1; the111 dependency identities are unchanged. The only
package changes are operator documentation and its inclusion map. No runtime/
packer/test-helper/build/compiler/dependency edit, profile/provider/backend/browser/
Google/Android execution, or enabled creation was necessary for S2.

Primary-agent review plus a bounded read-only subagent safety review found no
remaining substantive guidance conflict. Review requested tar -tvzf rather than
tar -tzf so the documented pre-extraction inspection exposes member types/modes/
link targets; fixed before final replay. This is bounded guide review, not T20
independent certification. First focused replay passed2/3: one safety-text regex
was sensitive to prose line wrapping. Whitespace normalization fixed that oracle;
the documented safety requirement was preserved, with no runtime defect or waiver.

## Exact checks and artifact

Pinned disposable Node24.21.0/npm11.19.0 reverified. Existing S1 provider was not
started or used. No rebuild/reinstall of the source target or full S1 matrix was
needed for documentation; previous S1 acceptance remains historical evidence.

```sh
node --check test/packaging/documents.test.mjs
npm exec -- eslint test/packaging/documents.test.mjs
npm exec -- prettier --check test/packaging/documents.test.mjs packaging
npm exec -- prettier --check --ignore-path /dev/null packaging/README.md
npm exec -- prettier --check --ignore-path /dev/null docs/installation.md docs/recovery.md docs/login.md docs/stdio-server.md docs/packaging.md
npm run package:artifact -- --out /tmp/gt-t18-s2-final-artifact
npm exec -- vitest run test/packaging/documents.test.mjs test/packaging/artifact-install.test.mjs test/unit/t12/s4-disclosures.test.mjs --no-file-parallelism --reporter=default --reporter=json --outputFile=/tmp/gt-t18-s2-final.vitest.json
```

Owned tests use fresh temporary output/extraction/npm config/cache roots, inspect
the archive before extraction, execute real npm ci with install hooks disabled,
then clean them. No target mutation raced final execution. Final candidate:
/tmp/gt-t18-s2-final-artifact/gymtracka-mcp-0.0.0.tgz . SHA256:
1512dc3e348408c8cc9bf95f7883f43163041fa75d516acfdc47e246ff719335.
Version0.0.0 remains private; compare archive digests rather than version alone.

S3 retained-identity replacement, incompatible-state refusal and clean parent
reconstruction are unrun. Guides describe existing procedures without claiming
those proofs. T16/T17/T19/T20 real external/independent gates, T06 omissions,
T04 restore/erasure limits, parked T02 and retired T13/T14 remain unchanged.
No parent completion, release/license/publication, staging/commit, .pi/settings
change, real enablement or automatic successor. All S2 source/check/pack/install
windows close at this acceptance; S3 requires separate assignment.
