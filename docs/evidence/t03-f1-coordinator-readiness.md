# T03-f1 coordinator frozen readiness

**Disposition:** frozen for independent QA; NOT T03 acceptance.

## Production review and checks

Coordinator reviewed the final domain source repairs against the public spec:
pre-Zod own-data/JSON gates, prototype-safe preservation, exact numeric value
semantics, conditional schemas, dynamic typed overloads, generic errors and
absolute canonical-string matching. Existing source-audit findings and prior
Developer diagnostic-scope deviation remain preserved in
[t03-coordinator-production-source-review.md](t03-coordinator-production-source-review.md).
No implementation/test internals were cross-relayed between roles.

With provisioned Node24.21.0/npm11.19.0, coordinator independently ran:

```sh
npm run typecheck && npm run lint:production && npm run format:check:production && npm run build
```

All four passed, exit0; no ad-hoc Developer diagnostics counted as acceptance.
Broad existing production scripts check preserved historical sources, but no
parked T02 scenario/QA target was executed or silently excluded from a claimed
whole-suite pass. New domain code has no transport/auth/config/storage/journal/
UUID allocation/mutations; import source graph is pure domain/Zod construction.

## Exact artifact relay

Descriptor: [t03-f1-artifact-relay.json](t03-f1-artifact-relay.json).

- Revision: **t03-f1**, source snapshot identity, not an invented commit.
- Source inventory:35 regular files; aggregate SHA256
  `5ba20c0357ea47a30425122e374b3451eb0a4783e2a06951439a0da7ed333fe6`.
- Build inventory:40 regular files; aggregate SHA256
  `5d26c1d487da8ff7b5e412c37104224c9a4f6852dbbae7fcc7b76cbe76ceae3e`.
- dist/domain/index.js SHA256
  `6488fbf2e79f444d64bf4b9b505ecc1e7fa9ccb6cfbe4d2c7be7d7423f1aa3a6`.
- dist/domain/index.d.ts SHA256
  `aaab42eb969bee73b4bb944f1aaae0b94b07c7b1846275a79f9200ea9b32e3be`.

Inventory aggregate is SHA256 of sorted rows encoded UTF-8 as
relative-path + NUL + hex-file-SHA256 + newline. Symlinks refused. Source
inventory includes current manifests/config, public spec/ADR and production
sources; build inventory contains JS/declarations, no private state. Root
barrel/contracts/server/CLI/companion JS hashes remain identical to baseline-f0.
No actual product writes enabled. No staging/commits/publication/deployment.

## QA controls and current execution window

QA reports **13/13 artifact-free controls passed** on its revised guard,
including readonly module loading, live forbidden-write-open/fd-write tripwires
and ten earlier denial cases. Earlier blanket-open control failure and previous
11/11 revision evidence remain visible. Controls prove the harness only, NOT
production behavior. Instrumentation plus source audit is not an OS sandbox.
See [QA source review](t03-coordinator-qa-source-review.md).

Explicit relay authorizes QA to execute:

```sh
npm run test -- test/unit/t03
npm run smoke
```

Plus its own scoped lint/format. QA checks build hashes/inventory metadata without
production/generated implementation content reads; source digest is coordinator-
verified. Developer holds all production/source/build/install/config/ADR edits
until the coordinator closes this window. No whole-suite or parked target run.

Any target repair closes the window and requires rebuild/new hash/relay. Test
source issues require coordinator specification adjudication, never altered
expectations solely to match implementation. Resource noise remains HOLD/report,
not automatic guard relaxation. Record tested QA source inventory and actual
execution counts (parameterized declaration counts are not executed passes).

## Acceptance still pending

Await independent domain+foundation results; coordinator repeats relevant checks
and runs a fresh allowlisted source-snapshot locked install/production/scoped-test
acceptance. Failures preserve in-progress status. No tools/list/handshake/config
write-guard/journal/backend/Pi/Google/Android or release claim follows from source
readiness, controls or passing production build checks.
