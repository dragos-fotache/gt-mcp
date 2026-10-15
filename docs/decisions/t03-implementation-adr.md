# T03 implementation ADR — strict schemas, intent identity and lossless codecs

**Status:** implementation complete with coordinator-directed repairs applied;
awaiting independent QA relay/acceptance. Repair window: 8 specification-level
defects fixed, exclusively within existing `src/domain/` plus this ADR scope.
**Scope:** `src/domain/` production module (15 source files) plus this ADR only. No manifest,
config, dependency, lockfile, compiler, barrel, server, CLI, companion or
historical-experiment changes.

## 1. Pins and toolchain

- Node 24.21.0 (LTS Krypton), npm 11.19.0 via `PATH="$T01_NODE_HOME/bin:$PATH"`.
- Pinned direct dependencies actually used: `zod@4.5.4` (strict runtime
  schemas plus input JSON Schema generation), `typescript@5.9.3`.
- `@modelcontextprotocol/sdk@1.32.1` is used only as the QA-side independent
  schema-validation facility (`validation/ajv`); production imports only `zod`.
- Compiler settings unchanged and strict (`strict`, `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `NodeNext`, ES2023). No
  `any` in new sources; public types are readonly and concrete.

## 2. Module layout (`src/domain/` -> `dist/domain/`)

| File              | Responsibility                                                              |
| ----------------- | --------------------------------------------------------------------------- |
| `index.ts`        | Frozen public entry (effect-free import; no IO/timers/network/handlers).    |
| `errors.ts`       | `CodecError` with local codes only (never model-facing error codes).        |
| `constants.ts`    | `TOOL_NAMES` exact order, intent version, Int64 max text, UUID pattern.     |
| `inputs.ts`       | Zod strict schemas; `parseArguments`, `normalizeIntent`, identity material. |
| `revision.ts`     | Exact token evaluation (BigInt, no float); range-regex generation.          |
| `datetime.ts`     | UTC calendar validation with epoch-ms range and sub-ms rules.               |
| `scalars.ts`      | UUID/Int32/weight checks, `-0` canonicalization, Unicode nonblank names.    |
| `lossless.ts`     | Internal wire-JSON parser: token boxes, duplicate-key rejection.            |
| `convert.ts`      | Wire-to-projected conversion with exact token checks and sorting.           |
| `projected.ts`    | Shared projected-record validators parameterized by error code.             |
| `decode.ts`       | `decodeBackendResponse` for the six reads plus page normalization.          |
| `routineInput.ts` | `buildRoutineInput` whitelist projection.                                   |
| `result.ts`       | `makeToolResult` envelope validation and MCP result triple.                 |
| `schemas.ts`      | Fourteen frozen self-contained draft 2020-12 schemas.                       |
| `clone.ts`        | Detached-copy and deep-freeze helpers for outputs/schemas.                  |

Root `src/index.ts`, server, CLI and companion entries are untouched and inert.

## 3. Specification decisions applied (coordinator rulings 1-10)

1. `TOOL_NAMES` is exactly search_exercises, get_exercise, list_workouts,
   get_workout, list_routines, get_routine, create_routine.
2. Zod 4.5.4 runtime input schemas are the source of truth. Input JSON Schemas
   are natively generated with `z.toJSONSchema` plus one documented mechanical
   adjustment: defaulted properties stay input-optional, so they are removed
   from generated output-side `required` lists at every nesting level.
   Output schemas are aligned manual compositions (revision range regex, exact
   roots). Runtime-only refinements: Unicode nonblank names, weight finiteness,
   calendar/identity invariants.
3. `projectRevision` takes raw numeric token text (`"40"` -> `"40"`; quoted
   text, JS numbers and BigInts reject). Grammar is strict JSON numbers (no
   surrounding whitespace, leading plus/zeros, or nonfinite literals);
   integral decimal/exponent spellings are accepted when exactly in range.
   Wire string revisions reject in decode.
4. Duplicate-key rejection is mandatory and implemented inside the internal
   parser (per-object key sets); it is not waivable.
5. Exact tokens come from the internal parser, so there is no dependency on
   reviver `context.source` availability and no rounded fallback path exists.
6. Revision-string schemas enforce the true decimal bound with an anchored
   regex generated from the exact maximum decimal text (1-18 digit
   alternative plus 19-digit lexically-below-max prefixes plus the exact
   maximum). No Number conversion, no custom keywords; runtime-only range
   checks are not relied upon.
7. `normalizeIntent` canonicalizes accepted `-0` to `+0`; identity material is
   therefore equal for `-0`/`0` and `40`/`40.0` spellings.
8. Published name schemas use only `minLength: 1`; the listed Unicode blank
   set is enforced at runtime and never over-rejects (U+0085/U+180E/U+200B/
   U+FEFF remain valid).
9. `buildRoutineInput` enforces pairwise-distinct root/entry/set identities
   (exerciseId references excluded), exact count matching and consecutive
   zero-based positions, with no ID allocation.
10. Historical `SchemaCodec` in `src/contracts/index.ts` is unchanged; the new
    domain entry is the only interface addition.

## 4. Error-code mapping

- `parseArguments`, `normalizeIntent`, `intentIdentityMaterial`,
  `projectRevision`, `buildRoutineInput` failures: `invalid_arguments`
  (unknown tool names included). Argument builders sanitize whole-input own
  data for JSON compatibility before Zod runs (nested identities and arrays
  included): inherited members are ignored and can never satisfy required
  fields, while accessors, symbol keys, non-enumerables, undefined,
  functions, symbols, BigInts, non-finite numbers, cycles and callable
  `toJSON` are rejected without executing user code.
- `decodeBackendResponse` content failures (malformed/trailing JSON,
  duplicate keys, token/range/type/calendar/identity/page violations,
  expectedId mismatch or misuse, and unknown/unsupported read names):
  `invalid_backend_response`.
- `makeToolResult` failures (unknown tool, inexact roots, invalid error
  object or projected data): `invalid_tool_result`.
- All `CodecError` messages are generic and carry no raw input or IDs.

## 5. Lossless parsing and projection notes

- The internal parser boxes every JSON number as `{value, token}`; known
  integer/revision positions are evaluated from the token with BigInt;
  weights use finite-double checks; unknown convenience numbers are preserved
  as plain parsed values, except non-finite wire numbers (for example `1e999`)
  which are rejected rather than silently serializing to null.
- Exact integer evaluation is purely mathematical over source lengths: the
  exponent stays exact via BigInt, all-zero mantissas return zero early, and
  the range decision compares the derived shift against mantissa/fraction
  lengths (astronomic nonzero magnitudes fail closed through a range
  sentinel). Padded exponent digits (`1e0000000`), long fractional mantissas
  with compensating exponents, and mathematically zero spellings (`0e-1`,
  `-0`) evaluate exactly, with negative zero accepted as zero for Int32
  positions while positive revisions still reject zero/negative values. No
  fixed digit cutoff rejects equivalent valid values and no rounded
  conversion ever occurs.
- Revisions project number -> canonical decimal string; projected strings are
  accepted only at the tool-result boundary, never on the wire.
- Prototype integrity holds end to end: the parser, converters, page builder,
  detachment and the result sanitizer use own-property membership and
  definition only, so additive keys such as `__proto__` survive as ordinary
  own JSON data, never mutate prototypes, never disappear during copies, and
  never satisfy inherited required fields.
- String escapes follow ordinary JSON code-unit semantics with no extra
  surrogate-pairing restrictions.
- `makeToolResult` first enforces whole-envelope JSON compatibility (no
  undefined, functions, symbols, BigInts, non-finite numbers, accessor
  properties, symbol keys, non-index array extras, cycles or callable
  `toJSON`, detected without invoking user code), so serialization executes
  no callbacks and changes no values; anything unusable is rejected with
  `invalid_tool_result`. Normal JSON arrays pass unchanged; no domain caps.
- Relationship membership is canonically emitted (muscles by
  primary/secondary/tertiary then UUID; equipment by UUID); instruction order,
  names, absence-vs-null, array order and valid values are preserved.
- Calendar validation accepts `T/t`, `Z/z` or `+00:00` only; `-00:00`,
  nonzero and unknown offsets are rejected, as are leap seconds. Fractions may
  be absent or carry 1..3 digits (longer only when all extra digits are
  zero), and values must fall in the epoch-ms range
  -62167219200000..253402300799999 with proleptic-Gregorian date checks.

## 6. Limitations and non-goals

- No transport, config loading/guard, auth, storage, journal, UUID
  allocation, mutation dispatch, server registration, login or host work.
- Published page schemas require an explicit `nextPageToken` and express the
  nonempty-iff-`hasMore` correlation with standard `if`/`then`/`else`; they
  carry OpenAPI `date-time` formats on workout timestamps, a schema-level
  `list_routines` non-draft item constraint, `not` exclusions for
  routine-set completion/rest fields, and standard conditional custom
  exercise constraints (`isUserCreated` true requires a positive projected
  revision, `reps` type, at most one equipment item and non-tertiary muscle
  roles). `retryAfterSeconds` stays a positive finite integer with no
  safe-integer/Int32 cap in schema and runtime alike; transport delay
  bounding belongs to T05. Runtime checks supplement (never
  replace) these constraints and keep remaining custom canonical invariants
  aligned without new domain caps.
- Public surfaces use concrete readonly TypeScript types (per-tool parsed
  arguments, projected records/pages/receipt, discriminated result
  envelopes). Per-literal overloads stay narrowed while `ToolName` and
  `string` union-return fallbacks keep dynamic callers typed (never wholesale
  `unknown`); unsupported names throw the proper runtime category.
  `new CodecError(code)` supplies a safe generic default message; internal
  call sites may pass their own explicit generic message (never raw input).
- Canonical-value patterns (UUID, projected revision strings, raw revision
  tokens, timestamps) enforce absolute end with a negative lookahead for any
  remaining character instead of `$` alone, so trailing LF/CR/U+2028/U+2029
  can never satisfy a full-value match in runtime or published schemas. UUID
  syntax stays exactly the documented 36-character lowercase form with no
  narrower version checks; names, search text and page tokens are never
  trimmed or whitespace-restricted by these patterns.
- Import performs pure schema construction only; no environment access.

## 7. Verification performed (Developer, no QA suite)

Provisioned Node 24.21.0 / npm 11.19.0. An initial artifact-ready round used
ad-hoc compiled black-box checks and SDK-Ajv schema diagnostics; the
coordinator ruled those outside the Developer four-check-only window, so they
are preserved here as truthful history but NOT counted as independent
acceptance, and no such diagnostics are run going forward. Developer runtime
validation is owned by the coordinator/QA relay. Standing Developer evidence
is exactly the four permitted production checks (typecheck,
lint:production, format:check:production, build) with exact results reported
in the artifact-ready message; full evidence (hashes, frozen relay) is owned
by the coordinator window.
