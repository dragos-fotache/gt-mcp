# T15-S1 — Guarded runtime review and acceptance

**Disposition:** accepted/closed on 2026-10-15; primary-agent review, not
independent security/release certification. [Work order](../tasks/t15-s1-work-order.md)
and [settled plan](../decisions/t15-plan-and-slices.md) govern. Parent T15 incomplete;
S2/S3 held. No executable/SDK creation enablement or successor.

## Implemented boundary and review

Additive `openToolRuntime`/`ToolRuntime.createRoutine` shares protected startup,
one profile/session, and optionally one repository/service. The old read opener
still exposes exactly six reads plus close; protocol/CLI sources are unchanged.
File-only strict true permits creation; omitted/false blocks before any operation
lookup/UUID/backend traffic. Null account requires authentication. Arguments and
native signal validation precede policy/auth. Config is a detached startup
snapshot; close synchronously fences repository/admission and aborts owned calls,
awaits work/persistence, invalidates session and releases ownership.

T09 retains acknowledged operation history before late cancellation checks and
after durable transitions. A private WeakMap associates errors with the exact
invocation callback and binding; no serialized error fields or new public exports.
T11 obtains that context only for its own invocation/current binding. Unacknowledged
admission, failed auth and mismatched intent do not invent recovery context.
Runtime delivery preserves authorized history on late interruption and suppresses
private history when captured bindings differ. T03 validates creation envelopes.
No outer retry, new UUID/key regeneration, automatic resume, storage format or
permission interface was introduced.

Review considered config provenance, exact ownership/close ordering, error privacy,
acknowledged-vs-uncertain persistence, receipt immutability, cancellation before
service snapshot, read-only compatibility and inert startup/imports. Accepted
T09/T10/T11 request/confirmation/recovery algorithms remain authoritative; source
and test expectations were checked against shared draft0.2, not merely each other.

## Verification scope fixed before final execution

Complete S1 owning: `test/unit/t15/s1-boundaries.test.mjs` and
`test/fault/t15/s1-runtime.test.mjs` (5 unit + 6 actual integration checks).
Focused regressions, exact remaining16 files:

- All seven `test/read-runtime/*.test.mjs`: startup/config, reads, errors,
  validation/auth ordering and cancellation/ownership after shared opener changes.
- `test/unit/t11/s2-service.test.mjs`, `test/fault/t11/s2-service.test.mjs`:
  service authorization, stable terminals, compaction and failure history.
- `test/unit/t09/s2-admission.test.mjs`, `test/fault/t09/s2-storage.test.mjs`:
  admission/persistence/ownership behavior after the private catch/context change.
- `test/unit/t10/s2-executor.test.mjs`, `test/fault/t10/s2-execution.test.mjs`:
  acknowledged step execution/confirmation and conservative stop decisions.
- `test/read-protocol/config-import.test.mjs`,
  `test/read-protocol/configured-policy.test.mjs`,
  `test/stdio-server/sdk-startup.test.mjs`: retained read-only/unavailable factory,
  inert imports and executable catalogue/startup. No named-host certification.

Actual fixture: requalified private D-Bus/Secret Service store/read/clear,
ext4 roots, synthetic credentials and private-CA loopback HTTPS; existing T10
isolation runner and T08 relay preparation, with only a bounded selection/hash
wrapper. No ambient personal services. Final run uses a stable build with no
parallel files/build/install. All source/test/emitted hashes are recorded before
and after. No clean locked replay is claimed in S1; S3 owns parent reproduction.

## Development results retained

- Initial scoped type/lint/build checks and 5/5 unit checks passed.
- New helper lint found an undeclared structuredClone global; replaced with a
  simple JSON-only fixture copy. An unused test global declaration was removed.
- First actual integration run: 1/6 passed, 5 failed. The fixture inspector passed
  sessionGeneration to a strict durable-binding parser; corrected to the three
  durable fields. The combined create/replay journey exceeded the default10s
  Vitest bound; assigned a bounded30s test timeout (no product timeout changed).
- Repaired integration: 5/6 passed; the combined uncertain/reopen/replay journey
  likewise exceeded10s. Its test-only bound is now30s. Focused repair passed1/1;
  five deselected checks in that focused run are not counted as acceptance.
- Final source review added per-invocation context correlation and safe cleanup
  failure handling, retained operation-local recovery errors without unnecessarily
  fencing unrelated reads, and clarified source comments. Four production checks
  and scoped test lint/format passed on the final candidate before execution.

## Final commands/results

Final **122/122 PASS in18 exact files**: all11 S1 owning plus111 unchanged
regressions, zero failed/skipped/pending/todo. All543 source/test/config/emitted
hashes remained identical across execution. Four production checks and scoped
test lint/format/syntax checks PASS. Requalified private provider/libsecret and
owned bus/provider/fixture cleanup PASS. See the relative-path-only
[artifact inventory](t15-s1-artifact-inventory.json) for exact files, per-file
counts, stable hashes, runner/provider identities and evidence limitations.
No existing production/test assertion was changed or excluded for this acceptance.

Node24.21.0/npm11.19.0 from the provisioned disposable toolchain; no installation,
dependency/compiler/global/system/Pi changes. Commands so far:

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
node node_modules/eslint/bin/eslint.js test/unit/t15 test/fault/t15
node node_modules/prettier/bin/prettier.cjs --check test/unit/t15 test/fault/t15
node --check test/unit/t15/s1-boundaries.test.mjs
node --check test/fault/t15/s1-helpers.mjs
node --check test/fault/t15/s1-runtime.test.mjs
```

The final exact18-file selection is described above. Its safe command was:

```sh
python3 /tmp/gt-t10-s3-isolated.py "$T01_NODE_HOME/bin/node" /tmp/gt-t15-s1-runner.mjs
```

These are disposable nonsecret runner locators, not personal profile paths. The
wrapper/isolation runner hashes are in the inventory; reverify availability and
provenance rather than substituting ambient services. The existing isolated runner
invokes the pinned Node on a private bounded wrapper, which prepares T08 fixtures
and runs `node node_modules/vitest/vitest.mjs run --no-file-parallelism <exact files>
--reporter=json --outputFile=<private-output>`. Private scope paths/bodies/credentials
are excluded from repository evidence. The complete final selection passed; the
earlier failed/development and focused-filter runs remain described above.

Changed production/test paths: `src/runtime/read.ts`, `src/runtime/index.ts`,
`src/operations/repository.ts`, new private `src/operations/context.ts`,
`src/creation/service.ts`; new `test/unit/t15/s1-boundaries.test.mjs`,
`test/fault/t15/s1-helpers.mjs`, `test/fault/t15/s1-runtime.test.mjs`.
Task/work-order/plan/current status/evidence/handoff documents were updated.
Pre-existing unrelated changes were preserved; no shared contract, manifest,
lockfile/compiler, protocol/CLI source, .pi, staging or commit change.

## Remaining limits

S2 MCP creation/error-budget dispatch and S3 compiled-process/parent acceptance
remain unavailable/unverified. The isolated scripted HTTPS fixture does not prove
real backend transactions/idempotency/database/sync/Android, Google/browser,
named Pi or release behavior. T06 omissions, T04 whole-protected-state restore/
runtime/media/backup limits, parked T02 and retired T13/T14 are preserved.
