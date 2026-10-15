# T03 coordinator acceptance — schemas, intent identity and lossless codecs

**Result: PASS for bounded T03 only.** Independent QA and coordinator reproduction
pass on frozen **t03-f1**. Not a working MCP server, write/config guard,
backend/Pi/Google/Android interoperability or release acceptance.

## Authority and independent roles

Shared committed baseline9a96dcb with the prior user-approved MCP0.2-draft
config-only working-tree revision; backend v1/OpenAPI1.0.0 unchanged.
[Approved public spec](../decisions/t03-approved-schema-codec-spec.md),
[work order](../tasks/t03-work-order.md) and
[Zod import adjudication](../decisions/t03-zod-import-adjudication.md) apply.
No shared contract edits made to hide failures.

Fresh Developer/QA agents used the selected Muse Spark1.3 Contributor model.
Developer implemented without QA reads; QA derived tests from the public
specification without production/generated implementation reads. Coordinator
reviewed both and relayed only specification-level decisions. Asynchronous
Herdr messages; no polling/automatic coordinator succession/whole-matrix grant.

## Delivered public boundary

New `src/domain/` (15 production files) emits `dist/domain/index.js` and readonly
concrete declarations. It exports the seven-tool schema map/name catalogue,
CodecError, strict parseArguments, normalizeIntent, versioned
intentIdentityMaterial, projectRevision, decodeBackendResponse, buildRoutineInput
and makeToolResult; a pure identity-version constant is also public.

- Pinned Zod runtime inputs are the schema source of truth; generated JSON
  schemas mechanically retain documented defaulted fields as input-optional.
  Output schemas are aligned standard draft2020-12 compositions, with local
  references only and exact discriminated root/error/receipt envelopes.
- Nonblank Unicode names, canonical UUIDs, finite-double/Int32 values,
  defaults/null/zero/empty/repeated references and absence preservation verified.
  No added name/exercise/set count caps or caller-controlled permission fields.
- Internal parser retains original numeric tokens and rejects duplicate keys;
  exact integral/range evaluation uses BigInt before bounded number conversion.
  Int64 revisions through9223372036854775807 project to exact decimal strings.
- UTC/calendar/ms precision, record family identities/positions/domain rules,
  canonical relationship membership and additive own-JSON preservation verified.
- Version `gymtracka-create-intent-v1`; fixed-key-order JSON of normalized
  name/exercises, UTF-8 downstream digest material. operationId/generated IDs,
  labels/revisions/credentials/transport metadata excluded. No digest key/store,
  journal admission or immutable replay bytes implemented in T03.
- Whitelist body builder validates supplied family-distinct identities and
  count matching, generates consecutive positions without allocating IDs,
  and excludes labels/revisions/volume/notes/completion/recorded rest.
- Own-data/non-JSON gates precede schema validation; unexecuted accessors,
  cycles/nonfinite/non-JSON values and prototype-sensitive keys are covered.
  Structured and serialized text values agree; no input mutation/shared arrays.

Root type-only barrel/server/CLI/companion JS hashes remain identical to the
accepted inert foundation. No network/config/auth/private storage/UUID allocation/
journal/mutation/MCP registration is added. Actual product writes stay disabled.

## Exact tested artifacts and versions

Node24.21.0, npm11.19.0, TypeScript5.9.3, Zod4.5.4, SDK1.32.1,
Vitest4.1.11 and the existing locked tooling. No dependencies/lockfile/compiler
settings changed by T03. No new skipLibCheck exception; prior legacy exceptions
remain separately documented, not declaration-compatibility passes.

[t03-f1 relay](t03-f1-artifact-relay.json):35 frozen source/config/spec files,
40 JS/declaration artifacts. Source aggregate SHA256
`5ba20c0357ea47a30425122e374b3451eb0a4783e2a06951439a0da7ed333fe6`;
build aggregate SHA256
`5d26c1d487da8ff7b5e412c37104224c9a4f6852dbbae7fcc7b76cbe76ceae3e`.
Public domain JS SHA256
`6488fbf2e79f444d64bf4b9b505ecc1e7fa9ccb6cfbe4d2c7be7d7423f1aa3a6`;
declaration SHA256
`aaab42eb969bee73b4bb944f1aaae0b94b07c7b1846275a79f9200ea9b32e3be`.

## Independent QA and coordinator reproduction

[QA adjudication report](t03-qa-adjudication-rerun.md) and
[final assertion strengthening](t03-qa-final-strengthening.md):25 owning QA files;
parameterized declaration counts are NOT execution counts. The final probe also
compares the complete global-name set against before plus exactly the two vendor
properties, rejecting removals as well as other additions.
Coordinator reviewed source assertions/control construction and repeated live-tree
owning suites after QA readiness. Both independently observed:

| Command | Result |
| --- | --- |
| npm run test -- test/unit/t03 | 7 files,221/221 passed, no skips |
| npm run smoke | 7 files,100/100 passed, no skips |

The domain suite includes14 independent compiled-schema checks and both envelope
variants/tool, strict argument matrices/normalization/order/default equivalence,
raw numeric/Int32 rounding traps, JSON/Unicode/calendar/identity boundaries,
whitelist/result behavior, public surface and import observations.
Fourteen import controls comprise inert/Zod-only references plus twelve live
forbidden-action tripwires. Instrumentation uses fail-closed preflight, explicit
readonly-loader handling, synthetic env/temporary roots and exact resource/
handler checks. It is NOT an OS sandbox; source audit complements it.

## Clean locked-install acceptance

Coordinator ran the recorded reproduction helper
[t03-clean-source-snapshot.py](t03-clean-source-snapshot.py) against a fresh
allowlisted disposable **100-file source snapshot**, initially without
node_modules/build output. No root/nested .git, local .pi, private state,
parked QA tests/fixtures or generated output copied. Preserved historical
production inputs were copied only to keep existing broad production checks
intact; no T02 target/scenario was executed. Not a clean-clone/publication claim.

Snapshot inventory aggregate
`f261fc73861d3be0f59e8bd66b6695b4b0a31d07ff93c6313a05402050fe8298`.
This final snapshot repeats all checks after the QA-only exact-global-union
strengthening. The earlier successful snapshot is preserved separately in
[t03-clean-source-snapshot-initial-result.json](t03-clean-source-snapshot-initial-result.json).
Lockfile SHA256 unchanged, also matching the original foundation lock:
`797f6c5b116ec1683e50fb010f6b1960caffa6a0e3a71fb6c7ee24c7f56b642b`.
[Machine-readable results](t03-clean-source-snapshot-result.json).

All commands used the provisioned toolchain and exited0:

| Command | Observed |
| --- | --- |
| node --version / npm --version | v24.21.0 /11.19.0 |
| npm ci --ignore-scripts | 332 packages;334 audited; no lifecycle hooks |
| npm run typecheck | PASS |
| npm run lint:production | PASS |
| npm run format:check:production | PASS |
| npm run build | PASS;40 artifacts byte-match frozen relay |
| npm run test -- test/unit/t03 | 221/221 PASS |
| npm run smoke | 100/100 PASS |

Snapshot/live source parity and lockfile immutability verified afterward.
Disposable snapshot/HOME/temp removed; public package cache not copied, private
user config/provider credentials not inherited. npm's node-domexception deprecation
warning retained as a dependency maintenance note. Audit reported0 vulnerabilities
at execution; neither audit nor these tests are a security/release proof.

No whole-suite npm test/check pass claimed, no script discovery changed, no parked
checks silently counted passed. The bounded selectors are explicit authorization,
not exclusion of a failing task. Whole-matrix/release reconciliation remains open.

## Initial failures, repairs and process limitations retained

- Baseline formatting failed on a nonexistent historical ADR reference. Developer
  removed only that literal from both format scripts; existing paths/checks kept.
- Baseline foundation99/100 failed on stale compatibility metadata after the
  approved policy revision. QA repaired only that assertion, preserving exact
  seventeen-name/count/status/pin checks; current matrix never became a false pass.
- Coordinator found spec-derived QA fixture/traversal/coverage errors before
  target execution; original reviews and correction reports remain visible.
- Production source findings were repaired before t03-f1 freeze; all reports
  remain, including Developer's first-round unapproved ad-hoc diagnostics.
  Those diagnostics were explicitly stopped and not counted as acceptance;
  later repairs used only four permitted production checks.
- Import controls initially failed on blocking the pinned loader's readonly
  open. Failed/11-pass/13-pass revision evidence preserved; coordinator explicitly
  approved reader-aware handling while write-capable opens/fd writes stay denied.
- First t03-f1 run219/220 failed only on two pinned Zod in-memory global-data
  registries. Coordinator verified vendor initialization and adjudicated the
  blanket-global test overconstraint, not a target defect or contract waiver.
  An isolated Zod-only control now requires exactly those own-data nonnull
  object additions; every other global/handler/resource/effect still fails.
  Original failed report unchanged. Production/build bytes never changed.

## Changed paths and downstream handoff

Production: `src/domain/`, `docs/decisions/t03-implementation-adr.md`;
package.json only for the narrow missing-reference repair (lock unchanged).
QA: `test/unit/t03/`, one compatibility assertion in
`test/foundation/package-contract.test.mjs`, `docs/evidence/t03-qa-*`.
Coordinator: T03 public spec/work order/adjudication, task/index/pickup/roadmap/
coordination status, and `docs/evidence/t03-coordinator-*`, frozen relay/readiness,
clean-snapshot helper/results. No .pi, contracts, historical experiment source/
tests/evidence, staging or commits touched.

T03 supplies pure primitives, NOT stdio publication/negotiation, config guard,
auth/visibility authorization, keyed digest persistence, immutable request replay,
creation/recovery/lifecycle or live interoperability. Future owners must bind
identity to profile/origin/account and retain version/key/exact bytes. T05 owns
backend search-filter normalization/budgets/error mapping; T08 actual tool/schema
advertisement; T04/T09 protected keys/storage/admission; T10-T15 confirmations/
recovery/config integration. No runtime compatibility row becomes a release pass.

T04 storage remains ready; T05 transport prerequisites are now met. Neither is
assigned by T03 completion. T02 parked/incomplete, T13/T14 retired. No automatic
next-task grant, real writes, deployment/publication or personal account actions.
