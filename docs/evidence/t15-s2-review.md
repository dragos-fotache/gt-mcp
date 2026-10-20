# T15-S2 — MCP dispatch review and acceptance

**Disposition:** accepted/closed on 2026-10-15; primary-agent review, not independent security/release
certification. [Work order](../tasks/t15-s2-work-order.md) and
[settled plan](../decisions/t15-plan-and-slices.md) govern. Parent T15 incomplete;
S3 held. No successor or external enablement.

## Candidate review

Additive creation factories capture trusted creation methods with their receivers
and share the existing adapter/lifecycle. The compiled entry uses the guarded
creation-capable runtime and one protected startup policy/budget snapshot. Old
read factories keep unavailable creation. Exactly seven schemas and annotations
remain unchanged; only the new factory's creation description describes its
config-only behavior. No permission argument, environment flag, initialization
switch, extra tool, recovery read, outer retry or automatic continuation is added.

Creation delivery validates T03 canonical data plus shared error/retry decisions,
whole safe Retry-After and complete admitted history. Runtime messages are removed;
the disabled explanation is fixed. Only fully validated runtime history enters
budget/serialization/late-interruption fallbacks. Malformed results receive safe
context-free internal_error. A confirmed save becomes interrupted with save/false,
never an invented uncommitted state. Runtime binding authorization remains in S1;
the adapter performs no await after receiving/validating that runtime result.

Source/test review checked shared tools.md/routine-creation.md independently of
implementation: permission provenance, validation precedence, schemas/hints,
error taxonomy, privacy, acknowledgement vs uncertainty, receipt permanence,
UTF-8 complete-result accounting, signal forwarding and owned close ordering.
No accepted auth/storage/engine algorithm required repair. The obsolete trusted
CLI sentence and compiled-entry test expectations are updated to delivered behavior;
all privacy/default-false/operator-trust and lifecycle/read assertions are retained.
The read-only factory's old unavailable expectations remain unchanged.

## Final selection fixed before execution

Complete S1/S2 owning; all existing T08 protocol/stdio regressions; changed
T12 disclosure/integrated lifecycle flow. Exact15-file selection:

- `test/unit/t15/s1-boundaries.test.mjs`
- `test/fault/t15/s1-runtime.test.mjs`
- `test/create-protocol/configured.test.mjs`
- `test/create-protocol/dispatch.test.mjs`
- `test/read-protocol/catalogue-dispatch.test.mjs`
- `test/read-protocol/config-import.test.mjs`
- `test/read-protocol/configured-policy.test.mjs`
- `test/read-protocol/lifecycle.test.mjs`
- `test/read-protocol/result-budget.test.mjs`
- `test/read-protocol/validation-errors.test.mjs`
- `test/stdio-server/configured-integration.test.mjs`
- `test/stdio-server/framing-lifecycle.test.mjs`
- `test/stdio-server/sdk-startup.test.mjs`
- `test/unit/t12/s4-disclosures.test.mjs`
- `test/fault/t12/s4-flow.test.mjs`

S1 supplies actual runtime uncertainty/replay/binding/close coverage. S2 adds the
SDK mapper/captured capability, terminal failures, malformed-result privacy,
complete budget boundary, late stopped/saved interruption, suppressed cancellation,
actual false-policy metadata/file-edit checks and enabled/disabled compiled stdio.
Existing T08 files retain strict protocol/framing/startup/error/budget/ownership
coverage; T12 verifies that executable wiring and disclosure changes preserve the
trusted lifecycle. Engine per-step/crash matrices are accepted dependency evidence,
not duplicated here. S3 retains full process recovery/lost-reply/lifecycle/policy
checks and clean locked parent reproduction.

## Development findings retained

Initial production checks caught exactOptionalPropertyTypes on conditional history
and an unused destructured message. Fixed by explicit defined-field narrowing and
removing message from a detached validated copy. Test lint rejected a this-alias;
the receiver assertion now uses an observation object. Initial SDK tests passed6/7:
the remaining assertion wrongly expected adapter argument validation to insert
creation defaults. Per the T03/engine boundary, the adapter passes validated intent;
the engine normalizes defaults. Corrected the oracle; complete focused7/7 passed.

First isolated S2 run passed8/9: compiled enabled/disabled flow and all7 adapter
checks passed. The metadata test used a boolean experimental capability, which the
SDK rejects at initialization; changed it to the SDK object-valued capability
format. Complete configured file then passed2/2. All isolated focused runs had
stable hashes; provider/bus qualification and owned cleanup passed. No product
timeout changed; actual configured journeys use bounded30s test timeouts, as S1 does.

Final production typecheck, lint, format and build PASS. Scoped authored/changed
test ESLint/Prettier and both new-file syntax checks PASS. Final selected execution
**68/68 PASS in15 files**:20 owning (11 S1 +9 S2),48 relevant regressions, zero
failed/skipped/pending/todo. All545 tracked source/test/config/emitted hashes
remained identical. Actual private provider/ext4/HTTPS/SDK stdio and owned cleanup
PASS. No build/install ran alongside tests. See the sanitized
[artifact inventory](t15-s2-artifact-inventory.json) for exact selection, per-file
counts, hashes, versions and runner/provider identities. All S2 grants are closed;
S3 ready/unassigned and parent T15 incomplete.

Final documentation QA: local link targets resolve in all13 changed Markdown
documents; git diff --check PASS. All545 accepted input/output hashes still match
after documentation/status updates. No production/test edits followed acceptance.

## Commands and changed paths

Pinned Node24.21.0/npm11.19.0, TypeScript5.9.3, Vitest4.1.11, official SDK1.32.1.
No installation was needed. Safe final commands:

```sh
export T01_NODE_HOME=/tmp/gt-t08-s3-tools/node-v24.21.0-linux-x64
export PATH="$T01_NODE_HOME/bin:$PATH"
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
node node_modules/eslint/bin/eslint.js test/create-protocol test/read-protocol/config-import.test.mjs test/stdio-server/sdk-startup.test.mjs test/stdio-server/configured-integration.test.mjs test/fault/t12/s4-flow.test.mjs test/unit/t12/s4-disclosures.test.mjs
node node_modules/prettier/bin/prettier.cjs --check test/create-protocol test/read-protocol/config-import.test.mjs test/stdio-server/sdk-startup.test.mjs test/stdio-server/configured-integration.test.mjs test/fault/t12/s4-flow.test.mjs test/unit/t12/s4-disclosures.test.mjs
node --check test/create-protocol/dispatch.test.mjs
node --check test/create-protocol/configured.test.mjs
python3 /tmp/gt-t10-s3-isolated.py "$T01_NODE_HOME/bin/node" /tmp/gt-t15-s2-runner.mjs
```

The runner is the inspected T15-S1 bounded wrapper with only selection/output
locators changed, over the same inspected T10 private bus/provider/TLS/ext4 runner.
It prepares T08 fixtures, runs official Vitest with no file parallelism and exact
selection, and records all source/test/config/emitted hashes before/after. Runner
locators are disposable nonsecret artifacts, not personal profile paths; availability
and provenance must be reverified rather than substituting ambient services.

Changed production: `src/protocol/adapter.ts`, `results.ts`, `catalogue.ts`,
`index.ts`, `server.ts`; only the obsolete unavailable sentence in the pre-existing
T12 disclosure in `src/cli/main.ts`. New tests: `test/create-protocol/dispatch.test.mjs`
and `configured.test.mjs`. Changed existing tests: the five export/compiled-entry/
disclosure files named in the scoped commands above. Task/work-order/plan/current
status/evidence/handoff and launch/login docs updated. Pre-existing unrelated
working-tree changes preserved; no shared contract, manifest/lockfile/compiler,
auth/storage/engine/runtime, .pi, staging or commit changes in S2.

## Limits

S3 is separately authorized work: actual compiled-process recovery/lost replies,
complete policy/lifecycle matrix and clean locked parent reproduction. S2 does not
close T15. Scripted isolated HTTPS is not real backend/DB/idempotency/sync/Android,
Google/browser, named Pi or independent release certification. T06 omissions,
T04 restore/erasure limits, parked T02 and retired T13/T14 remain. Proportional
testing retains these mandatory later gates rather than claiming them as passed.
