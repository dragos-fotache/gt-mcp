# T03 QA acceptance plan — schemas / normalization / lossless codecs

**Role:** fresh independent QA (Muse Spark 1.3 Contributor).
**Status:** plan only — no test source implementation, no target execution.
**Date (UTC):** 2026-10-11.
**Authority baseline:** shared-docs committed `9a96dcb`, MCP `0.2-draft`
working-tree revision (user-approved config-only routine creation), backend
OpenAPI `1.0.0` unchanged; coordinator-approved foundation spec and T01 ADR;
`docs/tasks/t03-schemas-codecs.md`; `docs/decisions/routine-creation-config-policy.md`.
**Scope note:** T02 parked/incomplete (historical evidence preserved, not a
dependency, no T02 targets executed); T13/T14 retired. This plan derives only
from the public specifications listed below, never from production
implementation.

## Sources read for this plan

- `AGENTS.md` (toolchain, commands, roles, contract authority, config-only scope).
- `docs/tasks/t03-schemas-codecs.md` (deliverables, acceptance, M02-M03/M09 and
  C02-C03/C06/R08 ownership).
- `docs/README.md` (baseline, pickup rules, parked/retired status).
- `docs/decisions/routine-creation-config-policy.md` (strict-boolean
  `writesEnabled`, default false, fail-closed; no companion/prompt/extension).
- Shared MCP draft0.2: `tools.md`, `routine-creation.md`, `acceptance-scenarios.md`.
- Backend v1: `openapi.yaml`, `client-compatibility.md`, `domain-rules.md`.

NOT read: `src/`, `companion/src/`, `experiments/` source, generated
implementation code/maps/diffs, old private T02 plans/evidence, QA-internal
material beyond this task. No package/config/lockfile/shared edits made.

## Initial authorization boundary (explicit)

Per coordinator work order: derive the schema/codec acceptance plan only in
this file. The T03 public API specification is being prepared — **do not guess
the API, do not write test sources, do not execute any compiled target yet.**

- No `test/` additions/modifications in this step.
- No execution of compiled public entry points until an explicit frozen-artifact
  relay names the artifact (path + version/commit + build command).
- No live/personal backend, database, Android session, credentials, tokens,
  account/resource IDs, private paths, or raw request/response bodies in repo,
  logs, or evidence. Synthetic fixtures only when test sources are later authorized.
- Provisioned toolchain only (`node v24.21.0`, `npm 11.19.0`,
  `engines.node >=24.21.0 <25`); no global installs, no Pi reconfiguration,
  no lifecycle-hook-dependent code, no `.pi` edits, no staging/commits.

## T03 acceptance mapping (spec-derived, no API names invented)

### P1 — Published self-contained schemas, envelopes (owns M02 schema aspect)

- Seven tools each publish concrete self-contained JSON input/output schemas via
  `tools/list`; no MCP client fetches OpenAPI or resolves remote references.
- Every serialized success envelope validates as `{ok:true, data}` with
  `isError:false`; every execution-error envelope validates as
  `{ok:false, error}` with `isError:true`; structuredContent and serialized text
  block agree.
- Envelope objects contain exactly `ok` plus `data` or `error`; no additional
  root fields. `ok` is the discriminator. Output error objects reject unknown
  fields. Malformed JSON-RPC / unknown tool names remain protocol errors (not
  tool execution errors); invalid arguments, missing auth, API/domain failures
  are tool execution errors without stack traces or credentials.
- Plan gate: when the approved T03 public spec freezes schema source of truth
  (file/path + version), QA will assert every fixture envelope against those
  published schemas directly, including both union branches per tool.

### P2 — Strict write-input validation, no coercion (owns M03, C03 schema aspect)

- Unknown fields rejected at every nesting level (`additionalProperties:false`
  at root, exercise entries, and sets); nested unknowns covered, not root-only.
- No string-to-number/boolean coercion; `NaN`/`Infinity` invalid.
- Canonical UUIDs: lowercase hyphenated
  `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`.
- Int32: integer `0–2147483647`; Repetitions Int32-or-null default null;
  Weight: finite number `0–1.7976931348623157e308` or null default null;
  page args: limit integer `1–200` default 20, pageToken nonempty string omitted
  initially (never null). Local validation failure dispatches no backend mutation.
- Blank-name rejection uses backend Unicode whitespace/space classification;
  valid names preserved without trimming/truncating. Zero is not null; empty set
  arrays allowed; repeated `exerciseId` references allowed with distinct
  entry/set identities (identity allocation itself is Developer scope; QA checks
  observable acceptance C02 below).
- No added domain size caps on names/exercise counts/set counts; transport/output
  budgets (if any) must be published config and fail explicitly with
  `result_too_large`, never silent truncation.
- Coverage matrix will include: nested unknown fields (root/entry/set/error
  object), string-for-number, malformed UUIDs (uppercase, truncated, non-hex),
  negative/overflow Int32, nonfinite/negative/over-max weight, U+ whitespace
  names (e.g. U+0020-only, U+00A0, U+2003, U+200B-adjacent cases per backend
  Unicode rules — exact list frozen at spec approval), zero vs null vs empty vs
  omitted.

### P3 — Creation-intent defaults and normalization (owns C02, C06 schema aspect)

- Documented defaults only: `restDurationSeconds=30`, absent
  `repetitions`/`weightKg=null`; no invented default set; empty sets array
  supported; search-filter defaults (`search=""`, `muscleGroupIds=[]`,
  `equipmentIds=[]`) per tools.md.
- Normalization preserves: name bytes (no trim/case-fold/Unicode
  normalization), exercise order, set order, repeated references, explicit zero
  vs null distinction. JSON object key order and omitted-vs-explicit defaults
  normalize identically; different array order, name, values, or references do
  not. Numbers compare as declared Int32/finite-double values (`40` and `40.0`
  equal).
- Versioned deterministic identity material usable with a keyed digest over
  normalized name/exercises (not transport metadata, credentials, or
  generated root/child IDs). Normalization/digest version documented so later
  agents cannot reserialize old evidence.
- Same `operationId` + changed normalized intent → `operation_id_reused`, no
  further writes (observable behavior; journal internals are Developer scope).
- Plan gate: exact normalization function signature, digest version/key
  handling, and canonicalization rules (property order, number spelling, default
  expansion) come from the approved T03 public spec. QA will not assume them.

### P4 — Lossless backend numeric codec and revision projection (owns M09, R08 aspect)

- Backend Int64 values losslessly parsed **before** revision projection;
  converting an already-rounded JS number to string is not safe.
- Positive Int64 revisions projected as decimal strings matching
  `^[1-9][0-9]*$`, at most `9223372036854775807`; null/absent catalogue
  revisions remain null/absent. Other backend fields keep specified types/values;
  IDs, relationships, ordering, nullables preserved.
- Boundary fixtures (synthetic, no live data): `9007199254740991` (2^53-1),
  exact values above 2^53 (e.g. `9007199254740993`), and `9223372036854775807`;
  invalid/overflow values (0, negative, `9223372036854775808`, fractional,
  non-numeric spellings, rounded doubles) reject **before** any rounded
  conversion. Millisecond UTC precision preserved; sub-millisecond nonzero
  digits rejected per client-compatibility rules.
- Strict write inputs vs tolerant canonical response reading separated:
  labels (`exerciseName`), revisions, `totalVolumeKg` never leak into mutation
  bodies; `isDraft`/positions/IDs handled per routine-creation contract
  (Developer scope; QA asserts observable payload-shape acceptance only after
  the spec freezes what is observable at the T03 boundary).
- Malformed/mismatched success bodies stay uncertain (`internal_error`-family
  handling per tools.md), never fabricated confirmations; identity mismatch
  fails closed (R08 observable aspect).

### P5 — No policy/schema expansion, no leakage

- `writesEnabled` remains a strict boolean config guard (Developer/T15 scope);
  this T03 plan adds no permission mechanism, no consent argument, no size cap,
  no new error code.
- All fixtures visibly synthetic (placeholder UUIDs/names); no real catalogue
  IDs asserted as valid; no private fixture leakage into evidence.

## Scenario coverage table (future test sources, not yet written)

| T03 deliverable | Scenarios | Planned assertion shape (pending spec freeze) |
| --- | --- | --- |
| Self-contained schemas + envelopes | M02 | Validate every synthetic success/error envelope against published per-tool schemas; check `isError` discrimination and structured/serialized agreement. |
| Strict inputs, nested unknowns, U+ whitespace, zero/null/empty, no new caps | M03, C02, C03 | Boundary + negative matrices at root/entry/set levels; confirm `invalid_arguments` with no mutation dispatched (dispatch observability per approved spec). |
| Defaults + normalization + versioned digest | C02, C06 | Default insertion, preservation, order-sensitivity, 40/40.0 equality, key-order/default-spelling equivalence; digest stability across equivalent spellings. |
| Lossless numerics + revision projection + tolerant reads | M09, R08 aspect | 2^53-1 / above-2^53 / Int64-max exactness; overflow rejection pre-conversion; ms precision; label/revision/volume exclusion from writes. |
| Regression | — | Relevant existing checks remain green; no skipped gate counted as pass; no whole-matrix grant. |

Out of T03-QA scope (owned elsewhere): transport/session/login/journal
durability/recovery flows (T04–T11), Pi/host certification (T17), packaging
(T18), live-backend sync (T16/T19), release review (T20).

## Fixture and execution discipline (binding on future test sources)

- Synthetic UUIDs/names/numbers only; fixtures marked synthetic in-file.
- No network, no filesystem writes outside the test sandbox, no clock/randomness
  dependence unless the frozen spec provides a seam.
- Vitest scope limited to the owning task (`test/` paths named by coordinator at
  spec approval); no domain tests outside T03 scope; no `passWithNoTests`,
  no `|| true` masking, no skipped checks counted as passes.
- Execution only after: (a) approved T03 public spec received, (b) explicit
  frozen-artifact relay (artifact path + producing build command + version),
  (c) coordinator confirms the execution command. Until then, plan-only.

## Toolchain (verified this session)

- `node --version` → `v24.21.0`; `npm --version` → `11.19.0`;
  `package.json` → `gymtracka-mcp@0.0.0`,
  `packageManager npm@11.19.0`, `engines.node >=24.21.0 <25`.
- No installs, builds, or suite runs performed in this plan-only step.

## Readiness and blockers

- **Ready:** this plan file. Fresh-role/model confirmed above; public-spec
  sources enumerated; no implementation read or guess made.
- **Blocked (expected, not a failure):** test-source implementation awaits the
  approved T03 public spec (schema source-of-truth path, normalization/digest
  version, lossless representation contract, observable T03 boundary and error
  taxonomy subset). Target execution additionally awaits the frozen-artifact
  relay and explicit run authorization.
- **Questions relayed to coordinator** via Herdr (workspace `w4`, pane `w4:p2K`)
  alongside this plan: (1) approve/freeze the T03 public spec interface QA must
  test against; (2) confirm the owning `test/` path and allowed execution
  command for the later phase; (3) confirm the frozen-artifact relay format.
  No `--wait`/polling; QA holds at plan-only until answers arrive.

## Boundary revision — approved spec, work order, baseline-f0 (2026-10-11)

- Approved interface `docs/decisions/t03-approved-schema-codec-spec.md` and bounded
  assignment `docs/tasks/t03-work-order.md` received and read. QA owns
  `test/unit/t03/` plus `docs/evidence/t03-qa-*` and the single foundation
  compatibility-metadata assertion (spec section 7). Test sources are now being
  implemented from the public spec (this plan's gates (a)/(b) satisfied for
  preparation; execution gates unchanged).
- Spec clarifications incorporated: exact TOOL_NAMES order; projectRevision takes
  raw numeric token TEXT (`"40"` is the token, `'"40"'` rejects) and wire string
  revisions stay invalid; normalizeIntent canonicalizes accepted -0 to +0; exact
  JSON numeric grammar with integral exponents; duplicate-key rejection mandatory;
  source-unavailable paths fail closed or use an exact parser, never rounded
  fallback; output revision schemas reject Int64max+1 via standard bounded regex
  (asserted at schema level, not runtime-only refinement).
- Validator clarification incorporated: SDK default Ajv provider is not assumed
  draft2020-12-capable. QA helpers configure the public AjvJsonSchemaValidator
  with SDK-owned Ajv2020 + ajv-formats via createRequire anchored to
  `import.meta.resolve("@modelcontextprotocol/sdk/validation/ajv")` (locked
  transitive use; no dependency/install/manifest change). Formats enabled; no
  coercion/default insertion/removal; `$schema` never stripped, no downgrade.
- Baseline-f0 remains smoke-only under relay hashes recorded in
  `docs/evidence/t03-qa-baseline-smoke.md` (100/100 after the single authorized
  metadata repair). Developer holds all production/build/install actions.
- T03 public API target execution (`npm run test -- test/unit/t03`) awaits the
  LATER domain artifact relay naming `dist/domain/index.js`. No
  guard/journal/host/live-backend claims in T03 sources or evidence.

## Next-agent notes

- Successor QA implements test sources only from the approved T03 public spec,
  not from this plan's illustrative examples.
- Handoff on completion must append: changed paths; exact safe commands with
  pass/fail results; versions; remaining blockers/limits; integration notes —
  sanitized only (no credentials, IDs, private paths, or raw bodies).
- Preserve parked T02 and retired T13/T14 history; do not count them as passes.
