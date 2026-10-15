# T03 coordinator production source review — first artifact-ready candidate

**Disposition:** repair required before frozen-artifact relay. T03 in progress;
no independent domain execution/acceptance yet. No contract weakening approved.

## Boundary and artifact identity

Developer reported implementation readiness and held production/build/install
changes. Coordinator inspected all **15** src/domain source files, public entry
and implementation ADR (report said14; actual inventory15). Emitted file inventory
contains matching JS/declarations; build/source hashes will be recorded only for
the repaired frozen candidate. No invented commit identity or release claim.

The inspected implementation has only local domain/Zod imports and pure module
initialization. No network, private state, timers, process launch, configuration
loading, credential handling, UUID allocation or mutation dispatch is implemented.
Root/server/CLI/companion inert paths remain outside the assignment. Manual
source audit supplements limited QA import instrumentation; neither is an OS
sandbox or proof against privileged same-user interference.

## Specification-level repair findings

- Unsupported decode read-name errors differ from the frozen
  invalid_backend_response contract.
- Timestamp implementation/ADR accepts -00:00, the RFC3339 unknown-offset form;
  the public supported UTC forms are Z/z and +00:00 only.
- Integer evaluator rejects equivalent valid exponent spellings by arbitrary
  lexical limits and rejects mathematically zero Int32 token forms. Interpret
  exact values with early range failure rather than lexical convenience caps;
  revisions stay positive and reject every zero form.
- Parser/copy/projection object assignments and prototype-chain membership can
  lose or reinterpret additive JSON member names. Preserve __proto__, constructor,
  toString and all other names as OWN JSON data; inherited fields must never
  establish required identity/resource/envelope validity.
- Arbitrary additive values need JSON-compatible validation before detached
  serialization. Nonfinite values/cycles/functions/undefined/BigInts/callbacks
  cannot silently disappear, become null or execute while structured content
  retains a different value. Reject safely with the relevant library category.
  Ordinary JSON string code-unit semantics must not acquire extra restrictions.
- Output pages must require nextPageToken and express nonempty iff hasMore,
  otherwise null. Backend terminal omission normalization is decode-only, not
  an optional projected-result field. Retain OpenAPI date-time annotations and
  schema-expressible list/draft, routine-set and custom-record invariants.
- Several public return types remain wholesale unknown; concrete readonly
  parsed argument/resource/page/result-envelope types are required. Additive
  JSON field values may remain unknown. CodecError(code) needs a safe default
  nonempty generic message; optional explicit internal generic message remains.
- Projected positions must remain Int32 as well as matching array indices.

The coordinator clarified existing requirements in the public specification
(JSON boundary section and constructor/public surface). This is not permission
to rewrite shared contracts or derive QA expectations from production code.
Additional pure public constants/types are allowed: required exports are a
minimum, not an exclusive namespace. QA receives only the common public
specification, never this production source review or implementation internals.

## Developer check/report scope

Developer reported four permitted checks, Node24.21.0/npm11.19.0, exit0:

- npm run typecheck
- npm run lint:production
- npm run format:check:production
- npm run build

It also reported ad-hoc compiled runtime self-checks and SDK schema diagnostics.
Those were **outside the explicitly authorized Developer four-check-only window**.
No reported QA source/test/fixture/evidence reads or QA suite executions occurred,
but this command-scope deviation is retained, not hidden or counted as independent
acceptance. Coordinator instructed Developer to stop such diagnostics and use
only the four permitted checks going forward. Runtime validation belongs to
coordinator/QA on a reviewed frozen candidate. Historical initial report/ADR is
not retrospectively presented as compliant independent verification.

## Authorized repair window

No QA artifact relay opened, so bounded Developer repairs may proceed solely in
src/domain/ and the implementation ADR. No package/config/dependency/lockfile/
compiler/root/server/CLI/companion/experiment/QA/shared-contract edits approved.
Rerun the four permitted production checks and report new artifact readiness,
then hold all production/build/install/config actions for coordinator inspection,
hash/freeze and explicit independent QA relay. No real writes, private/live
services, secrets, local .pi edits, staging/commits or next-task grant.

## First repair candidate review

Developer reported all eight items repaired, four production checks passing and
no additional ad-hoc runtime diagnostics in that repair round. Coordinator read
revised own-property/number/result helpers, argument/decode overloads, schema and
validator portions. Earlier repairs are retained as progress, not full acceptance.
No independent runtime execution or frozen relay opened.

Remaining source-level issues were returned for the same bounded repair window:

- Own-data/non-JSON gate must precede Zod at argument/normalization/identity
  boundaries, not exist only at the result boundary. Descriptor/accessor and
  inheritance behavior cannot be delegated to unguarded object reads.
- Published Exercise schema still needs standard conditional custom type/
  revision/equipment/muscle constraints, not just runtime validation.
- Concrete literal overloads need an emitted union-return fallback overload for
  dynamic tool/read-name callers. A private implementation signature does not
  provide a publicly callable overload in declarations.
- Numeric early failure must account for mantissa/fraction length and compensating
  exponents, not a fixed exponent-digit cutoff that rejects valid exact values.
- Positive integer retryAfterSeconds has no newly invented safe-integer cap;
  transport delay budgeting is a later task. Runtime and published schema agree.
- Array sanitation checks own indices/length and rejects non-JSON extras,
  accessors/symbols/cyclic members instead of silently dropping them.

QA receives only common public boundary requirements, never these implementation
observations. Import probe needs truthful limitations, representative tripwire
controls and the provisioned runtime in its minimal child environment; no claim
that a synthetic HOME confines arbitrary filesystem writes. Safe null-prototype
records are valid output representations. Required symbols are a minimum surface.

## Next gate

QA source readiness/control instrumentation review is also pending. Once both
source windows are ready, coordinator reviews/fixes any remaining issues, freezes
exact source/build inventories and authorizes scoped domain/foundation execution.
Failures and initial reports remain visible; T03 cannot be completed from build,
lint, ad-hoc self-checks or source readiness alone.
