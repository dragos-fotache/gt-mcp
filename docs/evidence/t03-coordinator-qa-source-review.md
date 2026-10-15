# T03 coordinator QA source review — pre-relay

**Disposition:** exact foundation component-name follow-up accepted at source
review; independent T03 source readiness needs corrections. T03 remains in
progress. No domain/foundation target execution in this moving-build window.
This record is coordinator/QA review material, not Developer input.

## Inspected boundary

Coordinator read QA's component-name follow-up evidence, the single authorized
foundation compatibility assertion and all seven test/unit/t03 source files.
No production behavior was used to derive expectations. Developer continues
implementation from the approved public spec; QA retains independent ownership.
No cross-role implementation/test details relayed, no parked target execution.

The metadata assertion now compares the exact public seventeen component names
and uniqueness, retaining five-column/status/count/pin checks. Missing,
substituted, duplicated or additional names fail. Authoritative compatibility
metadata unchanged. Compiled regression repeat waits for the final frozen relay;
prior baseline-f0 smoke100/100 remains evidence for its earlier source revision.

## Required source corrections (not implementation failures)

1. `4.5e1` is exactly45, an integral valid numeric token, not a fractional reject.
2. A timestamp without explicit UTC suffix is invalid; `.0000Z` is permitted,
   but `.0000` without Z/UTC offset is not.
3. Object-key-order equivalence requires identical ordered array content/counts;
   the submitted examples accidentally compared two sets with one.
4. The standard `$schema` URI is metadata, not a remote schema fetch. Only
   nonlocal reference resolution is prohibited; scanning all HTTP text overrejects.
5. Schema keyword traversal must not confuse property/definition-map names or
   literal annotation/default/example object keys with schema keywords.
6. Arbitrary digit-accepting patterns may be names/tokens, not revision patterns.
   Test actual revision fields in compiled per-tool envelopes without assuming
   private schema layout or misclassifying unrelated string patterns.
7. Runtime Object.isFrozen and particular output-schema type placement are not
   required public representations. Standard JSON Schema semantics, not additional
   validator stylistic restrictions, determine schema validity.

These specification-derived corrections were sent to QA only, asynchronously.
No production fixes inferred from these test-source defects.

## Coverage additions requested

- Both compiled output-envelope branches for all seven tools; the result-builder
  invocation alone does not independently validate its published schema.
- Compiled valid/invalid input matrices, including nested unknown fields, alongside
  runtime strictness tests; no data coercion/default insertion by the validator.
- Exact-source Int32 fractional-rounding traps, not just revision tokens.
- Null/zero/absent distinctions; custom relationship invariants/canonical ordering.
- Calendar/UTC/ms and years0000/9999 boundaries, invalid dates/nonzero sub-ms and
  legitimate clock-corrected finish-before-start values.
- Actual same-length exercise/set permutations, nonstandard-version canonical UUIDs,
  and positive no-new-domain-cap cases.
- Effect-free public domain import and declaration/export existence, without
  generated implementation/source-map reads.

QA may change only its T03 sources/evidence and the previously authorized single
foundation metadata assertion. Own scoped lint/format permitted; compiled tests
still await coordinator freeze of the domain artifact. No manifest/dependency/
compiler/contract/production changes, network, actual writes or secrets.

## Second source review after QA's correction report

Coordinator reviewed revised helpers/schema suites, calendar/domain additions,
normalization additions and the new public-surface suite, without executing a
compiled target. The first-round schema-traversal, envelope, numeric exponent,
calendar-suffix and identical-array corrections are now represented correctly.
Source readiness remains conditional on these remaining issues:

- Positive multi-equipment sorting fixture uses a custom exercise, contradicting
  its one-equipment invariant and the same suite's negative case. Use bundled
  data for multi-equipment ordering; lexical UUID order was also reversed.
- Obvious fractional JS Number arguments do not demonstrate lossless raw-source
  Int32 validation. Add wire token fractions that round into valid integers,
  preserving their original lexical source through decodeBackendResponse.
- Public-surface suite calls ten exports nine, imposes unspecified function
  arities, and only reimports a cached module. Check required public symbols and
  declaration existence without content reads; instrument a fresh subprocess
  import for specified forbidden effects rather than equating cache identity
  with import inertness.
- The purported UUID-version-freedom case only rejects uppercase. Add a valid
  canonical lowercase regex match with non-RFC version/variant nibbles.

QA received these specification-level source-review findings only; Developer
received no QA details. Exact own lint/format success remains source hygiene,
not execution or codec acceptance. Original review findings/evidence preserved.

## Later JSON-boundary and probe source review

QA prepared additional cases from the common public JSON-boundary clarifications,
without production reads or compiled execution. Required export checks now use a
minimum surface; safe null-prototype JSON representations must not be rejected.
Raw lexical Int32 traps, numeric/Unicode/property-name boundaries, schema-level
page/custom/list rules and inherited/accessor cases are source requirements,
not executed passes. Claimed source counts were corrected to22 owning files;
parameterized declarations are not an execution count.

Coordinator inspected the split probe runner/control suite and ten synthetic
forbidden-action fixture files. The controls have no dist/production imports and
are genuinely artifact-free; a filtered public-surface suite was not, because
it statically imported the domain. Child environment uses only a nonsecret
allowlist and synthetic temporary roots with the provisioned runtime first in
PATH. That is not filesystem/network containment or an OS sandbox.

The current deny-family boundary (global capabilities, child/worker/fs writes,
HTTP/HTTPS/HTTP2/TLS/net/dgram/DNS and macro timers) is sufficient for this bounded
source-audited task; exotic paths remain audit-covered, not claimed blocked.
No open-ended sandbox expansion authorized. Partial interception must fail
closed BEFORE importing a target/deny fixture; post-import patch-failure
assertions alone would be too late. QA was directed to add this preflight gate
and finally-based restore/reporting before controls execute.

After that gate, coordinator explicitly authorizes ONLY:
`npm run test -- test/unit/t03/import-probe-controls.test.mjs` with the pinned
toolchain. This artifact-free calibration window is separate from the still-closed
domain/foundation execution window. Report actual results and safe category deltas;
resource noise is HOLD, never silently relaxed. Controls have not yet run at the
point of this record; source readiness/hygiene is not proof of interception.

## Artifact-free control execution report and narrow loader handling

QA added patch-failure/ESM-sync preflight and finally-based restoration before
executing only the authorized artifact-free controls suite. First report:
11/11 failed because the pinned Node ESM loader uses readonly fs.openSync;
the blanket open deny blocked ordinary module loading. This is harness failure,
not domain failure. Initial failed result remains visible.

QA removed open/openSync from deny lists and reported a second control run:
11/11 passed, inert control empty/equal resource categories and ten live tripwire
controls. That report proves only its prior guard revision, not domain behavior,
new revisions or filesystem containment. No resource-noise waiver was needed.

Coordinator does not authorize leaving write-capable opens unguarded. A narrow
readonly-loader exception is now explicit: delegate known readonly opens,
reject/record write/create/truncate/append/RDWR or unknown flag forms, preserve
ordinary async/loading semantics. Standard fd write methods remain denied;
other exotic paths stay source-audit-covered. Add denied-open/fd-write synthetic
controls and repeat ONLY the artifact-free controls command. No automatic guard
relaxation; observed interference must be reported before changing restrictions.
Domain/foundation execution still waits for reviewed artifact hashes/freeze.

## Next gate

Await corrected QA source readiness and Developer artifact readiness via
asynchronous reports. Coordinator independently reviews production, records
source/build inventory hashes and explicitly relays a frozen execution window.
No T03 acceptance, live integration or release compatibility claim follows from
lint/format success or this source-only review.
