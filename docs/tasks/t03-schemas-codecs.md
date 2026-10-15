# T03 — Implement strict schemas, intent normalization and lossless codecs

**Status:** done (bounded T03 accepted) · **Owner:** Coordinator; fresh Developer + QA · **Requires:** T01
**Size:** 2-3 sessions

## Outcome

Provide validation/projection primitives for the portable adapter and recoverable
server operation identity. No approval companion is in current delivery. Read the
[config-only policy](../decisions/routine-creation-config-policy.md) and shared
draft0.2; this ready task does not depend on parked T02.

## Current assignment

User authorized T03 and fresh Developer/QA via Herdr. Coordinator owns public
[approved schema/codec specification](../decisions/t03-approved-schema-codec-spec.md)
and [bounded work order](t03-work-order.md). Implementation and independent
bounded acceptance are complete; see
[coordinator acceptance](../evidence/t03-coordinator-review.md). No next task is
assigned by this completion. T02 stays parked,
no actual writes or whole-matrix grant. Baseline formatting-script repair and
foundation compatibility-metadata reconciliation are explicitly scoped; initial
failures remain recorded in the work order.

## Read first

- [tools.md](../../shared-docs/docs/mcp-contract/tools.md)
- [client-compatibility.md](../../shared-docs/docs/backend-contract/client-compatibility.md)
- [openapi.yaml](../../shared-docs/docs/backend-contract/openapi.yaml)
- [Agent pickup rules](../README.md)
- [Verification matrix](../verification.md)

## Deliverables

- Publish concrete self-contained JSON input/output schemas for all seven tools, including success/error unions and exact root/error envelopes. Reject unknown input fields at every nesting level and avoid coercion.
- Implement documented defaults, Unicode nonblank name checks, canonical UUIDs, finite nonnegative weights/Int32 values, empty set arrays and repeated exercise references.
- Normalize only creation intent defaults; preserve names/array order/null/zero. Define versioned deterministic identity material usable with a keyed digest; equivalent object order/default spellings and 40/40.0 match.
- Implement truly lossless backend JSON numeric parsing before revision projection to bounded decimal strings. Validate actual positive Int64 range, millisecond UTC precision, nested identity/order and domain invariants.
- Separate tolerant canonical response reading from strict write inputs; labels/revisions/volume never leak into mutation bodies.

## Acceptance criteria

- Boundary tests include 2^53-1, larger exact revisions and 9223372036854775807; invalid/overflow values reject before any rounded conversion.
- Schema and runtime validation cover M03/C02/C03 with nested unknown fields, U+ whitespace cases, zero/null/empty distinctions and no added domain size caps.
- Every serialized success/error envelope validates against its published schema; no remote schema fetch is required.
- Relevant existing checks remain green; no policy/schema expansion or private fixture leakage.

## Scenario ownership

M02-M03, M09; schema aspects of C02-C03/C06 and R08.

## Handoff

Document schema source of truth, lossless number representation and normalization/digest version so subsequent agents cannot accidentally reserialize old evidence.

### Accepted handoff

- Public entry: `dist/domain/index.js` (+ readonly declarations), source
  `src/domain/`; pinned Zod runtime input schemas with aligned generated/default-
  optional JSON schemas; manually composed output unions/range constraints.
- Lossless representation: internal original-number-token boxes, exact BigInt
  integral/range checks; revisions become canonical decimal strings. Identity:
  `gymtracka-create-intent-v1`, fixed-key-order normalized JSON, UTF-8 downstream
  keyed-digest material. Never regenerate retained request bytes from it.
- Changed paths: `src/domain/`, T03 implementation ADR; only the two missing-ADR
  formatting-script references in package.json; `test/unit/t03/`, the single
  foundation compatibility assertion, QA evidence; coordinator public spec/work
  order/adjudication/status and integration evidence. Lock/deps/compiler unchanged.
- Safe commands with provisioned Node24.21.0/npm11.19.0: npm ci --ignore-scripts,
  typecheck, lint:production, format:check:production, build; all PASS in a fresh
  allowlisted100-file source snapshot. T03 tests221/221 and foundation100/100,
  independently and in final coordinator reproduction; no skips.
- Exact target/source/build/snapshot hashes, initial failures/repairs and process
  limits: [acceptance evidence](../evidence/t03-coordinator-review.md).
- Pinned Zod in-memory registry data is the sole approved import-probe baseline
  exception, supported by an isolated vendor control; forbidden IO/handler/resource
  effects remain failures. [Adjudication](../decisions/t03-zod-import-adjudication.md).
- No T03 blockers remain. No implemented server/CLI/config guard/auth/storage/
  journal/digest key/replay/creation/recovery or actual interoperability claim.
  Root/CLI/server/companion stay inert; real writes disabled; parked work preserved.
- T04 storage and T05 transport are ready, unassigned. Their owners must agree
  interfaces/budgets/secret-facility requirements; no automatic next-task grant.
  T05 must use raw decode entry, not pre-round JSON; T08 publishes actual tools;
  T04/T09 bind/protect identity keys and immutable replay evidence.

No credentials/private bodies, staging, commits or release actions authorized.
