# T18-R1 — Refresh and verify the current private package

**Status:** accepted/closed · **Owner:** primary Codex agent · **Authorized:** user,
2026-10-17: “let's refresh and verify the package”. Started15:57 UTC;
checkpoint17:27 UTC, hard stop17:57 UTC. One bounded refresh outcome; historical
T18-S1–S3 remain accepted/closed. T17-S2–S5, T19 and T20 remain unassigned/held.

## Outcome, authority and scope

Build the existing private `gymtracka-mcp-0.0.0.tgz` from the current accepted
source candidate, including T16-S3's catalogue decoder fix and current standalone
operator documents. Deliver the archive, content/dependency/checksum inventory,
actual locked-install/installed-process/recovery evidence and clean reconstruction.
This refresh is not publication, release, real enablement or new host/backend/
Google/Android certification. Version remains0.0.0; digest identifies the candidate.

Authority: shared MCP draft0.2/backend v1, accepted foundation/storage/transport
specs, [T18 packaging design](../decisions/t18-plan-and-slices.md),
[package guide](../packaging.md), T16-S3/S7 and T17-S1 source identity/evidence,
and [proportional testing](../decisions/proportional-testing-policy.md).
Keep config-only creation, strict false defaults, exact operation/step identity,
startup validation and same-format refusal/recovery unchanged. Install solely
through extract + `npm ci --omit=dev --ignore-scripts`; no lifecycle hooks.

Edit only a demonstrated standalone-document closure defect in shipped guides,
minimal explicit package-test artifact/baseline selection, a fixed refresh
reproduction script/selection and task/evidence/status notes. Initial inspection
found `docs/stdio-server.md` links to unshipped repository-only `pi.md`.
Prove the broken shipped link, then remove that repository-only dependency using
standalone wording. Do not ship the Pi evidence tree or expand package scope.
No production/schema/format/dependency/manifest/compiler/shared-contract changes.
A reproducible product defect requires recorded narrow repair scope first;
public conflicts require user resolution. Preserve all earlier uncommitted work.

## Stable targets and safety

Restore/verify provisioned disposable Node24.21.0/npm11.19.0 via T01_NODE_HOME;
requalify retained provider binary, a fresh unlocked private bus/Secret Service
store/read/clear, ext4 roots and fixture TLS. No ambient credentials/providers,
live backend/model/Google/Android resources, local `.pi` settings, global installs,
staging/commits or release. Actual writes only in isolated synthetic fixtures.

Freeze a current-source/pre-refresh compiled baseline before edits, with relative
SHA256 inventory. Historical pre-T18 temporary baselines are absent. Replacement
tests must explicitly select `GT_PACKAGE_REFRESH_BASELINE_ROOT`, documenting
current frozen source -> freshly installed package, and retain the historical
GT_T18_BASELINE_ROOT/default semantics. Do not relabel this as pre-T18 or an
old-release upgrade test. Baseline remains immutable throughout execution.

Use `GT_PACKAGE_REFRESH_ARTIFACT_ROOT` only as an explicit test input so the
existing packaging suite installs/verifies copies of the **exact retained
delivery archive**, rather than merely equivalent fresh repacks. Preserve the
default fresh-pack path. Both controls are test-only and never enter the runtime
package. Repack deterministic canary/refusal checks still run their actual packer.

Keep delivery output under ignored `dist/delivery/t18-r1/`, separate from private
fixtures. Build only before packaging/tests; future root builds can remove this
build output. Reconstruct/test the clean candidate in a distinct disposable target.
Never rebuild/install/pack into a target while its tests are executing. No
private state/config/credentials or raw bodies in artifact/repository/evidence.

## Proportional acceptance and permitted commands

Permit baseline/source/dependency inspection, scoped Python/Node syntax/lint/
format/import/link checks, four production checks, documented package creation,
safe archive inspection, exact isolated test selections and disposable npm ci.
Early focus: independent archive link check and scoped static checks. Fix only
observed defects; preserve original red evidence. No generalized framework or
exhaustive fault/host matrix.

Final selection: complete active `test/packaging/`; complete
`test/create-protocol/` and `test/create-stdio/`;
`test/stdio-server/sdk-startup.test.mjs`,
`test/backend-interoperability/catalogue-roles.test.mjs`, and
`test/unit/t12/s4-disclosures.test.mjs`. Freeze exact filenames before execution.
These cover artifact allowlist/modes/notices/lock, executable bins/seven-tool
stdio/EOF, actual installed private holder, pending/receipt same-format
replacement/incompatible startup refusal, config/auth/recovery and the known
catalogue repair carried into this archive. No manifest/bin changes are planned,
so do not repeat unrelated foundation/engine/actual-backend or parked T02 suites.
Add focused regressions only for demonstrated affected behavior.

Require workspace and clean selection passes with zero failures/skips/pending/
todo, stable executed source/output/archive identities and owned cleanup. Clean
target must start without node_modules/dist, run `npm ci --ignore-scripts`, four
production checks/build, reproduce archive content/modes/runtime lock (record
archive-byte identity where observed), and replay the same exact selection.
Compare installed files/locked dependencies and the packaged decoder hash against
the accepted current candidate. Actual DB/Android/backend timestamp evidence
remains T16-owned, not a dependency bundled into the MCP archive.

Deliver sanitized review/inventory/reproduction/cleanup and concise handoff;
update current package status without rewriting historical artifact hashes.
Milestones: contract/baseline/environment; red document check/narrow fixes;
build/archive/exact installed acceptance; clean reproduction; source/spec review
and delivery. Freeze shipped inputs before final packaging. Later status-only
documentation closure is reconciled separately, not repacked into a new untested
artifact. Stop on unsafe/missing facilities, dependency drift, unresolved public
contract, substantial harness expansion or the hard limit; report partial state
honestly. No successor task starts automatically.

## Final disposition

Accepted/closed:40/40 in12 files on workspace and clean reconstruction, zero
failed/skipped/pending/todo.96 archive files/86 JS/111 runtime dependencies;
430 source inputs,194 emitted files and archive bytes/content/modes/lock match.
302 baseline files unchanged;626/622 stable workspace/clean hashes are explicitly
reconciled. Initial broken shipped Pi link retained red, fixed by standalone
wording. No production repair. Exact retained-artifact install and current-source
replacement/recovery/refusal pass. Production/scoped checks and owned cleanup
PASS. [Review](../evidence/t18-r1-review.md), [handoff](../handoffs/t18-r1.md).
Shipped inputs are frozen; later status-only document closure is separate.
R1 grants closed; T17/T19/T20 remain separate, no successor or release.
