# T08-S2 QA — independent source readiness

## State and boundary

REVISED SOURCE-READY / HOLD after narrow F1-Q1/Q2 repair and approved two-file
static checks; all new target execution HELD. Earlier source-only/UNRUN entries below describe their historical source
window. The separate c1/f1 SDK relay subsequently ran and FAILED (95/99 passed);
its original four failures and complete observations remain in
`t08-s2-qa-f1-sdk.md` and private retained storage. No provider/fixture/build/install
execution was performed by QA. Coordinator explicitly approved the original
source-only Bash block below; it completed with exit 0.
No existing S1 files changed. Node v24.21.0/npm11.19.0 verified with explicit retained-toolchain PATH.
No production sources, generated implementation/maps or Developer-private records read.

## Exact new source inventory

1. `test/read-protocol/fixtures.mjs`
2. `test/read-protocol/helpers.mjs`
3. `test/read-protocol/catalogue-dispatch.test.mjs`
4. `test/read-protocol/validation-errors.test.mjs`
5. `test/read-protocol/result-budget.test.mjs`
6. `test/read-protocol/lifecycle.test.mjs`
7. `test/read-protocol/config-import.test.mjs`
8. `test/read-protocol/import-observation.mjs`
9. `test/read-protocol/configured-policy.test.mjs`

QA evidence: this record and `docs/evidence/t08-s2-qa-source-checks.log`.

## Independent risks and smallest meaningful checks

- Actual official Client/InMemoryTransport initialization, catalogue, annotations,
  descriptions and schema root-object adaptation; compile all listed schemas and
  validate success/error variants using reused T03 SDK Ajv2020 configuration.
  Compare published schemas with unchanged accepted T03 public artifacts, not
  private implementation; independent expected records exercise canonical values.
- Six named capability methods each succeed once; defaults, opaque continuation,
  receiver capture, Int64-max revision, ordered nested null/zero and additive data
  survive matching structured/text envelopes. Valid create is locally unavailable
  and invokes no read method. No auth/backend simulator is introduced.
- Representative top-level and nested malformed known-tool arguments are application
  errors; SDK-admitted malformed params/list/cursors, unknown name/method and task
  authority are safe protocol errors. SDK-prefiltered whole-message shapes are
  explicitly deferred to S3 below, with no S2 reply/timeout claim. Branded runtime errors, safe metadata, invalid envelopes,
  native failures and hostile thrown getters distinguish safe mapping failures.
- An independent JSON.stringify/Buffer.byteLength oracle measures entire duplicated
  final CallToolResult, with escaped quotes/newlines/backslashes and Unicode. Equality
  passes; budget one byte smaller fails. Oversized safe errors and non-JSON accessor
  hazards test bounded whole-result replacement, not data truncation.
- Held cancellation does not close runtime or emit late success. Explicit close
  fences calls after validation, waits a persistence gate and closes once. SDK
  disconnect retains a safe failed cleanup outcome with no unhandled rejection.
  Reconnection and begun connection failure exercise transferred lifetime.
- Exact five-export surface, strict options/bounds, inert factory and method capture;
  a small child observation checks output, handlers and selected persistent handles.
  This is not comprehensive IO interception or an OS sandbox. Coordinator source
  audit remains necessary for import IO and exactly-one validated startup read.
- Separately relayed real isolated null-account S1 composition accepts the new strict
  protocol config range, preserves old configs/S1 entry, and cannot activate create
  even with writesEnabled:true. Config/descriptor edits after startup establish
  no-reload snapshots, NOT configured-budget capture or absence of duplicate startup
  reads. Independent byte checks plus Coordinator forwarding/one-read audit cover
  those distinctions. This signed-out scope was explicitly Coordinator-approved.

Reused unchanged QA helpers: `test/unit/t03/helpers.mjs`,
`test/read-runtime/helpers.mjs`, `test/read-runtime/fixtures.mjs`. Only public
production entry points are named. Configured execution requires separately
confirmed private real bus, supported private roots, synthetic HTTPS key/cert,
cleanup ownership and frozen relay; no ambient bus or auth grant is used.

Relevant final regression selection for Coordinator freeze: existing
`test/unit/t03/tool-schemas.test.mjs`, `test/unit/t03/write-projection-result.test.mjs`,
`test/read-runtime/startup-config.test.mjs` and
`test/read-runtime/startup-ownership.test.mjs`. These are proposed, not executed or
implicitly authorized; existing S1 tests retain all old assertions.

Deferred: authenticated parent composition, actual stdio/framing/startup signals,
full parent and clean reproduction (S3), live backend/host/release certification.
No skipped tests count as passes; missing isolated inputs fail closed.

## Approved source-only commands (exact scope)

Run from repository root in Bash. No target import/execution; static resolution
reads only these nine QA sources and checks QA/package resolution. The three
specified emitted public entries are reported DEFERRED without reading or importing
them, pending a frozen declaration/target relay. Transitive source execution is not
part of this check. Preserve complete stdout/stderr in the named log.

```bash
set -euo pipefail
exec > >(tee -a docs/evidence/t08-s2-qa-source-checks.log) 2>&1
test -n "${T01_NODE_HOME:-}"
export PATH="$T01_NODE_HOME/bin:$PATH"
test "$(node --version)" = v24.21.0
test "$(npm --version)" = 11.19.0
node --version
npm --version
files=(
  test/read-protocol/fixtures.mjs
  test/read-protocol/helpers.mjs
  test/read-protocol/catalogue-dispatch.test.mjs
  test/read-protocol/validation-errors.test.mjs
  test/read-protocol/result-budget.test.mjs
  test/read-protocol/lifecycle.test.mjs
  test/read-protocol/config-import.test.mjs
  test/read-protocol/import-observation.mjs
  test/read-protocol/configured-policy.test.mjs
)
test "${#files[@]}" -eq 9
for file in "${files[@]}"; do
  printf 'SYNTAX %s\n' "$file"
  node --check "$file"
done
node node_modules/prettier/bin/prettier.cjs --write "${files[@]}"
node node_modules/prettier/bin/prettier.cjs --check "${files[@]}"
node node_modules/eslint/bin/eslint.js "${files[@]}"
node --input-type=module - "${files[@]}" <<'STATIC_RESOLVE'
import fs from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
const files = process.argv.slice(2);
if (files.length !== 9) process.exit(1);
const deferred = new Set([
  "../../dist/protocol/index.js",
  "../../dist/domain/index.js",
  "../../dist/runtime/index.js",
]);
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const specifiers = [...source.matchAll(/(?:from\s*|import\s*\()(["'])([^"']+)\1/g)]
    .map((match) => match[2]);
  for (const specifier of specifiers) {
    if (deferred.has(specifier)) {
      console.log("DEFERRED public target", file, specifier);
      continue;
    }
    try {
      const resolved = specifier.startsWith(".")
        ? new URL(specifier, pathToFileURL(`${process.cwd()}/${file}`)).href
        : import.meta.resolve(specifier);
      if (!resolved.startsWith("node:") && !fs.existsSync(fileURLToPath(resolved))) {
        console.error("FAIL missing import", file, specifier);
        process.exit(1);
      }
      console.log("RESOLVED", file, specifier);
    } catch {
      console.error("FAIL import resolution", file, specifier);
      process.exit(1);
    }
  }
}
STATIC_RESOLVE
printf 'SOURCE CHECKS COMPLETE (no target execution)\n'
```

## SDK ingress adjudication — narrow source repair

Before any target execution, Coordinator published
`docs/decisions/t08-s2-sdk-ingress-adjudication.md`. Original authored S2 tables
incorrectly expected InvalidParams replies for call params null/array, call array
_meta/object progressToken, and list array _meta/boolean progressToken. These were
AUTHORED MISMATCHES, never executed failures, passes or timeout observations.

The narrow repair changes only `test/read-protocol/validation-errors.test.mjs`
and this approved evidence/log. SDK-prefiltered null/array request params, array
_meta, object/boolean/fractional progressToken and invalid related-task metadata
are explicit DEFERRED S3 protocol/transport-failure case identities, not skipped
or passed S2 checks. No S2 timeout/reply claim is made for them.

All SDK-admitted absent/empty params, missing/nonstring names, unknown names,
unknown call fields, valid-shape task/related-task authority, supplied list cursors,
unknown list fields and unknown-method assertions remain active. A known-name
unknown-call-field case makes that structural boundary explicit. All known-tool
malformed-argument application assertions are unchanged, including null/array/
primitive arguments and nested create validation.

Coordinator authorized the same source-only block for exactly
`files=(test/read-protocol/validation-errors.test.mjs)`, with both array/Node
resolver length checks changed from 9 to 1. Syntax, Prettier --write/--check,
ESLint and the otherwise unchanged nonexecuting resolver run only that file.
All three public target entries remain in the DEFERRED set; no target import,
suite, fixture/provider, storage/backend, build or install is authorized.
Complete original nine-file static output remains untouched in the source-checks
log; the single-file repair transcript is appended with a distinct marker.

Single-file repair check outcome: exit 0; Node v24.21.0/npm11.19.0 reverified;
syntax PASS, Prettier --write unchanged and --check PASS, ESLint PASS, nonexecuting
QA/package path resolution PASS with runtime public entry DEFERRED. No failures,
skips, target execution or broader source changes. SOURCE-READY / HOLD again.

## QA-F1 — safe error overflow fixture repair

Independent Coordinator pre-execution source review identified that the original
oversized backendErrorCode used hyphens, Unicode and quotes. Under accepted T05
public safe-code rules (`t05-approved-transport-spec.md`, safe-code section), it
was invalid metadata, so could not establish valid-error result-budget overflow.
This was an AUTHORED INVALID FIXTURE / UNRUN finding, not an observed runtime
failure, pass or production-derived oracle.

Narrow repair changes only that fixture in `test/read-protocol/result-budget.test.mjs`
to `"synthetic_overflow_code_".repeat(600)`: it satisfies
`^[a-z][a-z0-9_]*$`, has no contiguous 32-hex-digit run, and this public capability
fixture has no captured sensitive values. There is no arbitrary code-length cap.
The same independent final-result byte oracle, overflow threshold, result_too_large
and full-replacement assertions remain unchanged. Unicode/escaping coverage remains
in the separate successful-result equality/one-byte-over boundary case.

Coordinator authorized the otherwise identical source-only block with exactly
`files=(test/read-protocol/result-budget.test.mjs)` and both length checks set to 1.
Original nine-file and ingress-repair transcripts remain intact; a distinct QA-F1
single-file static transcript is appended. All emitted public entries remain
DEFERRED; no target/runtime/suite/provider/fixture/build/install grant is inferred.

QA-F1 focused static outcome: exit 0, pinned Node v24.21.0/npm11.19.0 reverified;
syntax PASS, Prettier --write unchanged/--check PASS, ESLint PASS, nonexecuting
QA/package resolution PASS. No direct emitted entry is imported by this file;
all three remain in the resolver's DEFERRED set. Full original output appended,
no failure/skip or behavioral claim. Both focused repairs are SOURCE-READY / HOLD.

## F1-Q1/Q2 — revised task and semantic/text oracles

Common authority: `docs/decisions/t08-s2-f1-sdk-adjudication.md`. Original c1/f1
failures remain unchanged: 99 tests, 95 passed / 4 failed. The task case observed
-32603 rather than expected -32602; that uniform task-code expectation
overspecified a public SDK capability gate. Ordinary admitted call/name/list
errors and all malformed known-tool application checks retain exact codes.
Task-only correction requires SDK McpError identity; only -32602 or -32603
qualifies, never arbitrary errors/timeouts. The -32603 branch requires exact
`MCP error -32603: Server does not support task creation (required for tools/call)`.
The -32602 branch requires the fixed Invalid parameters message with exact SDK
prefix and at most one additional identical wrapper, per the updated public
adjudication. Ordinary admitted malformed call/list rows use that same bounded
-32602 predicate; unknown-tool fixed text and exact code remain independently
checked. Task errors carry no data/taskId/private marker, make zero runtime
calls and cannot advertise tasks.

The original helper compared result text to serialization of the independently
expected object's member insertion order. JSON object insertion order is not
prescribed. Its correction preserves exact semantic expected structured values
and ordered arrays, exact result-root keys, exactly one exact-shape text block
serializing ACTUAL structuredContent and matching isError. The independent
budget byte oracle is unchanged. Safe application-code assertions precede full
envelope comparisons to retain useful future failure identities without bodies.

The original fourth failure's actual returned fields/code/order are UNKNOWN in
the reporter. The static order overconstraint is not a proven original runtime
cause, nor a claim that any original failed test now passes. Fresh frozen
behavioral evidence is required after independent source review.

Only `test/read-protocol/helpers.mjs`,
`test/read-protocol/validation-errors.test.mjs` and approved readiness/log evidence
are editable. Source-only checks use exact two-file array in that order and both
length checks set to 2; all emitted public entries stay DEFERRED. No target,
SDK session, suite, fixture/provider, build or install execution authorized.

Revised two-file static outcome: exit 0; Node v24.21.0/npm11.19.0 reverified;
syntax PASS for both files; Prettier --write scoped only to those two (helper
unchanged, validation formatted) then --check PASS; ESLint PASS; nonexecuting
QA/package resolution PASS, protocol/runtime emitted entries explicitly DEFERRED.
Full stdout/stderr appended under the F1-Q1/Q2 marker in the approved log; all
prior static and f1 behavioral observations preserved. No failures/skips or new
behavioral result claimed. QA HOLDs source/static/target actions pending independent
review and a new named freeze/relay.

## Outcomes

Coordinator approved the exact nine-file block before execution. All nine syntax
checks PASS; local Prettier wrote only those nine files and its subsequent check
PASS; local ESLint PASS; static QA/package resolution PASS with all three named
public emitted entries explicitly DEFERRED. Block exit 0, no original failures,
no skips and no target/module execution. Pins verified again before these checks.
Complete original stdout/stderr is retained in `t08-s2-qa-source-checks.log`;
its initial NOT EXECUTED marker is preserved as historical pre-approval state.

This is source/static readiness only, NOT SDK interoperability or behavioral
acceptance. Configured provider availability, public declaration verification and
import/one-read/config-forwarding source audits remain unproved. QA now HOLDs for
independent Coordinator source review and a separate named frozen relay. No
runtime, SDK session, fixture/provider, suite, build/install or S3 grant inferred.
