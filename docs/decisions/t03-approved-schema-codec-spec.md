# T03 approved schema/codec specification

**Authority:** user authorized starting T03 and fresh Developer/QA via Herdr.
Coordinator authorizes the bounded implementation and independent test-source
window below. This is an interface specification, not acceptance evidence.

## 1. Authority and scope

Normative: shared MCP **0.2-draft**, user-approved config-only working-tree
revision over shared commit `9a96dcbce647933f5415da71db6d389bd2197983`;
backend OpenAPI **1.0.0**, tools.md, routine-creation.md, acceptance-scenarios.md,
backend client-compatibility.md, domain-rules.md and service-protocol.md.
Read docs/decisions/routine-creation-config-policy.md and T01 approved foundation.
Do not change shared contracts to accommodate code/tests.

Implement pure portable validation/projection primitives only. No transport,
configuration loading/guard implementation, authentication, private storage,
UUID allocation, journal admission, mutation dispatch, MCP server registration,
login or host integration. T02 stays parked/incomplete; T13/T14 retired.
Server, CLI, companion and root type-only barrel retain T01 inert behavior.
No actual writes, live services, secrets, local .pi edits, staging or commits.
T04 and the remaining matrix are not assigned by this work order.

## 2. Public module and API

Production entry: `src/domain/index.ts` -> `dist/domain/index.js` and `.d.ts`.
Its import is effect-free: no IO, output, timers, processes, network, state loads
or global handlers. Root `src/index.ts` remains a pure type-only barrel.
Developer can split internal modules under src/domain/ and publish readonly
concrete TypeScript types; never `any`. Tests import only the emitted public entry.

Required exports (a minimum public surface, not an exclusive namespace;
additional pure constants/types are permitted). Names and behavior are frozen;
concrete readonly public return types cover parsed per-tool arguments, decoded
resources/pages and discriminated result envelopes, not wholesale unknown seams.
Actual additive JSON fields may use unknown/JSON value types:

- `TOOL_NAMES`: readonly exact order: search_exercises, get_exercise,
  list_workouts, get_workout, list_routines, get_routine, create_routine.
- `toolSchemas`: map keyed by those names, each value exactly
  `{inputSchema, outputSchema}` containing self-contained JSON Schema objects.
- `CodecError extends Error`: `new CodecError(code, message?)` always supplies
  a safe nonempty generic message when message is omitted; internal callers may
  provide explicit generic messages. It has readonly `code`, one of
  `invalid_arguments`, `invalid_backend_response`, `invalid_tool_result`.
  These are local library categories, NOT new model-facing error codes.
- `parseArguments(toolName, input: unknown)`: strict validated detached arguments.
  Expand documented read defaults (limit=20; search="", filter arrays=[]),
  preserve optional status/pageToken omission and opaque token bytes.
  For create, return validated arguments without default expansion; use
  normalizeIntent for its defaults. Unknown tool names fail locally; the future
  protocol layer must intercept unknown names as protocol errors.
- `normalizeIntent(input: unknown)`: validate complete create_routine arguments;
  return exactly `{name, exercises}` with defaults expanded. Each entry exactly
  `{exerciseId, restDurationSeconds, sets}`; each set exactly
  `{repetitions, weightKg}`. operationId is validated but excluded from intent.
- `intentIdentityMaterial(input: unknown)`: return exactly
  `{version: "gymtracka-create-intent-v1", canonicalJson: string}`.
  canonicalJson is JSON.stringify of normalizeIntent with property order exactly
  as above. Document UTF-8 encoding for subsequent keyed digest use. No hash key
  provisioning/digest storage or operation admission in T03.
- `projectRevision(numericToken: string)`: interpret an original JSON number
  token EXACTLY; positive integral value <=9223372036854775807 becomes canonical
  decimal string. Reject malformed/nonintegral/out-of-range tokens, JS numbers
  (including apparently safe numbers), BigInts and arbitrary wire JSON strings.
  Integral exponent/decimal spellings are valid when their exact value is valid;
  no float conversion before integrality/range checks. Its string parameter is
  numeric TOKEN TEXT: projectRevision("40") returns "40", whereas token text
  containing JSON quotes (projectRevision('"40"')) rejects. decodeBackendResponse
  must distinguish numeric source from a wire string: {revision:"40"} rejects.
- `decodeBackendResponse(readToolName, rawJson: string, expectedId?: string)`:
  parse and validate backend SUCCESS DATA, not an HTTP/MCP envelope. Supports
  the six reads. For get tools, optional canonical expectedId must match root
  id. expectedId on a list/search is invalid_backend_response. Raw wire numeric
  revisions become exact decimal strings. Wire string revisions are invalid.
  Failure throws invalid_backend_response, never fabricates confirmation.
- `buildRoutineInput(input: unknown, identities: unknown)`: validate complete
  create arguments and a strict identity object exactly
  `{routineId, exercises: [{id, setIds: [UUID, ...]}, ...]}`. Counts must match
  intent entry/set counts; all root/entry/set identities are canonical and
  family-distinct (exerciseId references are NOT in that namespace).
  Return exactly `{id, name, isDraft: true, exercises}`; entries exactly
  `{id, exerciseId, position, restDurationSeconds, sets}` and sets exactly
  `{id, position, repetitions, weightKg}`. Positions are consecutive zero-based.
  No IDs generated; no backend calls/body persistence. This whitelist primitive
  cannot leak labels/revisions/volume/notes/completion/recorded rest into writes.
- `makeToolResult(toolName, envelope: unknown)`: validate a projected tool
  envelope and return detached `{structuredContent, content, isError}`;
  content is exactly one `{type: "text", text: JSON.stringify(structuredContent)}`.
  isError equals !structuredContent.ok. Validation failure throws
  invalid_tool_result. No HTTP error mapping/auth/admission decisions here.

Invalid arguments to creation/identity builders throw invalid_arguments.
Inputs are never mutated. Published schema values are treated as immutable;
return values share no mutable input/record arrays/objects. No silent truncation.
Existing SchemaCodec type boundary may remain historical; no unrelated interface
or retired companion cleanup is authorized.

## 3. Strict input schemas and runtime validation

Use pinned Zod **4.5.4** for strict argument schemas/runtime validation. Zod
JSON Schema generation or carefully aligned concrete schema composition is
allowed; Developer documents the single source of truth and unavoidable
runtime refinements. No extra dependencies or relaxed compiler flags approved.
Schemas use draft2020-12 with only local `#` references; no remote fetches.

All input object levels reject unknown fields; no number/string/boolean/null
coercion. UUID regex is exactly tools.md (not a narrower UUID version check).
Page limit=1..200 (default20), pageToken nonempty and never null. Repetitions,
positions and rest Int32=0..2147483647. Weight finite nonnegative double up to
Number.MAX_VALUE or null. Missing create repetitions/weight become null; rest30;
explicit rest null invalid. Empty sets and repeated exercise references allowed.
No name length, exercise count or set count domain maximum.

Nonblank name uses Java/Android Unicode whitespace OR space-character
classification, not JS trim/\\s alone. Blank code points:
U+0009..000D, U+001C..001F, U+0020, U+00A0, U+1680, U+2000..200A,
U+2028..2029, U+202F, U+205F, U+3000. Empty/all-blank names invalid.
U+0085, U+180E, U+200B and U+FEFF are not in that set. Preserve every valid
name exactly: no trimming, NFC/NFKC, case folding or truncation.
The published schema may use a nonblank pattern; runtime refinement is required.

Do not apply backend query case-folding/UUID sorting to creation intent. Search
filters are validated/defaulted here and preserved; T05 owns their backend
normalization/context binding. No automatic traversal/token restart.

## 4. Intent identity and write projection

Fixed key order plus declared finite-double/Int32 values yields identical
canonicalJson for object-key-order changes, omitted/explicit defaults and 40/40.0.
normalizeIntent canonicalizes any accepted negative zero numeric value to
positive zero; their identity material is equal. Names, array order, repeated refs,
null/zero and all actual values remain significant. operationId, generated IDs,
labels, revisions, credentials, host metadata and transport details are excluded.
Different operationIds may have equal material: journal identity is also scoped
by profile/origin/account and operationId (T09), not content-based dedup.

T09 must version/domain-separate keyed digest input with this version and bind
its key to the profile; key selection/persistence is T04/T09. Never use public
unkeyed routine-content hashes as compact receipts. Old retained evidence must
not be regenerated using a future normalization version or reserialized bodies.
buildRoutineInput produces a fresh deterministic whitelist projection, NOT
stored/replay bytes or permission to send. T09 owns freeze/persistence and T10
owns confirmations. T03 does not prove operation_id_reused/admission semantics.

## 5. Lossless parsing and tolerant canonical records

Native Node24 JSON.parse reviver `context.source` is an approved no-dependency
candidate: coordinator verified original Int64-max source is available even
though the ordinary parsed JS number is rounded. Retain source before conversion
for exact integral checks. An internal lexical numeric representation/parser is
also allowed. Record actual implementation and limitations in the T03 ADR.
No parse-to-Number-then-stringify revision path. Duplicate-key rejection is
mandatory, not an ADR-waivable limitation: native parsing needs a lexical
precheck for duplicate keys, or use a complete internal parser. If source text
is unavailable, use an exact internal parser or fail closed; never fall back to
rounded values. Raw numeric token grammar is JSON's grammar: no leading zeros,
leading plus, NaN/Infinity or surrounding whitespace. Wire JSON numbers required for
revisions; projected strings are accepted ONLY at the tool-result boundary.

Validate exact integer semantics/ranges for all known integer fields before
rounded conversion; decimal/exponent numeric tokens cannot round into valid
Int32/Int64 values. Ordinary weight/volume use finite declared double values,
not arbitrary-precision decimal semantics. Reject malformed/trailing JSON,
duplicate object keys, nonfinite known numbers and structurally invalid records.

Read known fields according to the complete corresponding OpenAPI resource.
Preserve optional absence vs explicit null, names/notes/instruction order,
exercise references and valid values; only revision types change. Bundled
exercise null/absent revisions stay null/absent. Custom exercises require a
positive revision, reps type and custom relationship invariants. Read schemas
and readers tolerate additive JSON convenience fields (including nested ones),
but do not let them replace/bypass known-field validation. Preserve those fields
as JSON values; do not project unknown fields merely because their key is revision.
No unknown credentials/config fields are manufactured by this module.

Canonical exercise relationship membership is emitted by role primary/secondary/
tertiary then UUID; equipment by UUID. Preserve instruction array order. Validate
custom primary/secondary distinctness, at most one primary/equipment, no tertiary
custom relationship. Known relationship duplicate identities are invalid.

Routine/workout root, entry and set UUIDs must be family-distinct; entry/set
positions must equal array index. Do NOT sort/repair bad ordered arrays or allocate
replacement IDs. Repeated exerciseId references remain valid. Read routines may
be blank/empty saved records as well as drafts; never impose save-eligibility
constraints on ordinary representation. list_routines items must be non-draft.
Routine-set known completion/recorded-rest fields are invalid domain data, not
permitted convenience fields. Completed workout sets require nonnull repetitions
and weight; finished workouts require finish time, at least one completed set,
no incomplete sets or empty exercise entries. Active workouts have no nonnull
finish time. WorkoutSummary checks only observable summary invariants.

Validate real calendar/time values, UTC and epoch-ms range
-62167219200000..253402300799999 (years0000..9999). Accept T/t and Z/z or
+00:00 UTC offset; reject nonzero/unknown offsets and leap seconds not representable
by Android epoch milliseconds. Fraction may be absent or carry 1..3 digits;
additional fractional digits must all be zero after the third. Preserve original
valid string; reject nonzero sub-ms values. Finished time may precede start after
clock correction; do not impose chronological ordering.

Pages return exactly the known items/hasMore/nextPageToken fields plus catalogueVersion
for search (and tolerated additive convenience data). Nonterminal token nonempty;
terminal token null (normalize backend omission to null for MCP page contract).
No automatic dedup/traversal, domain caps or silent partial results.

## 6. Output schemas/envelopes

Each tool output schema covers both exact-root discriminated branches:
`{ok:true,data}` or `{ok:false,error}`. Error object is strict, required nonempty
code + boolean retryable, optional fields exactly tools.md. Positive integer
retryAfterSeconds; canonical creation IDs; lastConfirmedStep enum. Preserve
unknown nonempty error codes without schema enum restrictions. Safe messages are
caller/error-mapping responsibility; library errors never include raw input/IDs.
Post-admission required history is orchestration context (T09-T15), not a field
that can be inferred from an arbitrary envelope in T03.

Success data uses projected complete resources/page/receipt. Revision-string
schemas must reject noncanonical/zero/overflow values, including Int64max+1,
without nonstandard custom keywords or converting bounds to JS Number.
Use a range-restricting anchored regex (possibly generated once from the exact
maximum decimal text): allow 1..18-digit positive decimals; for 19 digits,
allow first-differing-digit prefixes lexically below the maximum plus the exact
maximum. Pattern/length with only runtime overflow refinement is insufficient.
Known nullable/required shapes follow OpenAPI; canonical resource convenience
fields are additive, but envelope roots/errors and saved receipts are exact.
The saved receipt is exactly {operationId,routineId,status:"saved"}.
makeToolResult additionally enforces known runtime record invariants; schemas
need not encode cross-record identity/calendar constraints that JSON Schema
cannot faithfully express. No actual tools/list/handshake acceptance in T03.

## JSON boundary clarifications

These clarify existing strict JSON/preservation/exact numeric requirements, not
new wire/domain policy. Known required fields are OWN JSON data fields, never
satisfied by inheritance. Arbitrary additive JSON member names, including
__proto__, constructor and toString, remain ordinary own data through parsing,
projection, detachment and serialization; they cannot mutate prototypes or be
dropped because a name exists on Object.prototype. Escaped strings follow
ordinary JSON code-unit semantics; do not add unapproved character restrictions.

Structured result and serialized text must describe the same JSON value. Reject
non-JSON JavaScript values (nonfinite numbers, functions, undefined, BigInts,
cycles, callbacks/accessors) with generic local CodecError rather than silently
coercing/dropping them or executing them. Decoded additive wire numbers that
cannot be represented as finite JSON doubles fail closed, not Infinity-to-null.
This does not invent a new number-to-string projection for unknown fields.

Exact evaluation concerns VALUE, not lexical convenience limits: padded exponent
spellings such as 1e0000000 still mean1; zero Int32 spellings include -0 and
0e-1. Revisions remain positive, so every zero form rejects there. Range-invalid
astronomic exponents can fail cheaply, without arbitrarily rejecting equivalent
in-range spellings or rounded conversion.

Projected page results always require nextPageToken, nonempty iff hasMore,
otherwise null; only decode normalizes terminal backend omission. Published
schemas express this ordinary conditional constraint. Retain OpenAPI date-time
format annotations and schema-expressible known-field rules (non-draft routine
lists, forbidden routine-set completion/rest fields, custom canonical type/
revision/equipment constraints). Runtime calendar/cross-identity refinements
remain additional, not excuses to omit expressible schema requirements.
Unsupported decode read names also fail invalid_backend_response as specified.

## 7. Independent verification and baseline reconciliation

QA owns `test/unit/t03/` (.test.mjs and synthetic fixture/helper .mjs/.json) and
`docs/evidence/t03-qa-*`. Derive from this public spec/contracts only; never read
production/generated implementation code/maps/diffs. Use emitted API as black box.
Use SDK public `@modelcontextprotocol/sdk/validation/ajv` for independent schema
validation, configured with its already-locked Ajv2020 and ajv-formats rather
than assuming its default validator supports draft2020-12. QA may resolve these
SDK-owned transitive modules via createRequire anchored to the SDK public entry
(no direct dependency/install or manifest change). Enable schema validation and
formats, with no data coercion/default insertion/removal. Never strip $schema
or downgrade schemas merely to make the test engine accept them. Validate all
fourteen schemas locally and both envelope branches per tool.

Cover M02-M03/M09 and schema aspects of C02-C03/C06/R08. Include Int64 boundaries
2^53-1, 2^53+1, maximum and overflow; fractional/integral exponent tokens; nested
unknowns, Unicode names, null/zero/empty/defaults, order/default equivalence,
no new caps, additive reads, malformed numbers/calendar/order/IDs, and whitelist
write projection. Test declarations/exports/import inertness where observable.
No live auth/storage/transport/guard/journal/host claims.

**Explicit regression repair window:** existing foundation metadata assertion
still assumes the old policy matrix: 16 rows, 6 columns, all unverified. Current
public docs/compatibility.md has 17 rows, 5 columns; 16 product rows unverified
and the one retired companion row `not in current delivery`. QA may update ONLY
that metadata assertion in test/foundation/package-contract.test.mjs to validate
current public component/status structure; preserve the assertion, fail on
missing components/false compatibility claims, and leave all other tests alone.
Do not send test internals to Developer or change production policy to fit it.
No parked T02 test rewrite/execution/exclusion is authorized.

Developer exclusively owns src/domain/, a T03 implementation ADR, and the
already-authorized package.json missing-ADR formatting-script repair. Other
production/config edits require coordinator review. No dependency/lockfile/compiler
changes approved. QA never edits manifests. Coordinator owns this spec, work order,
task/index/status and integration evidence.

Use PATH="$T01_NODE_HOME/bin:$PATH": Node24.21.0/npm11.19.0. Developer checks:
typecheck, lint:production, format:check:production, build. These existing broad
production checks compile/lint preserved historical sources; no T02 executable
scenario/diagnostic or historical QA target is resumed. QA prepares sources first,
then waits for coordinator's explicit frozen relay before compiled target execution.

Frozen relay names artifact revision (source/build inventory digest, not an
invented commit), public artifact path, build command/version, hash and execution
window. Developer makes no source/build/install/config edits during QA execution;
repairs require closing the window, rebuilding and a new relay. QA reports exact
checks/failures; coordinator supplies specification-level fixes only.

After relay, QA may run `npm run test -- test/unit/t03` and `npm run smoke`,
plus scoped ESLint/Prettier on its own T03 sources and the single regression file.
Coordinator repeats scoped tests and production checks after independent readiness.
A fresh allowlisted locked-install snapshot with the same scoped tests provides
clean-install acceptance; no silent whole-suite/parked-test pass is claimed.
Existing npm test/check scripts stay unchanged; parked-suite/release reconciliation
remains an explicit future gate. No skips/passWithNoTests/||true masking.

Report readiness/questions/failures/completion asynchronously to live
`coordinator` at `w4:p2K`; no polling/--wait. Hold T03 in progress until independently
accepted. Evidence names changed paths, exact commands/results, versions, hashes,
synthetic provenance, known failures/repairs and limits. No private data/bodies.
