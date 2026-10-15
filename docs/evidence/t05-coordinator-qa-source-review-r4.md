# T05 QA source/calibration re-review — R4 NOT ready

**Disposition: FAIL; no production target/suite executed.** QA/coordinator-only
review, never Developer input. c3 production remains held and unchanged. Review
uses QA-owned sources and approved public behavior only, no production internals.
Earlier native controls/parse passes remain credited, not acceptance evidence.

## 1. Static source-quality gate now open; initial checks failed

With Developer install/build HELD and node_modules fixed, the work order now
allows coordinator+QA scoped installed ESLint/Prettier on OWN QA paths. This opens
no target/suite/build/install window and no shared-config changes.

Coordinator used provisioned Node24.21.0 and exact commands:

- `node node_modules/eslint/bin/eslint.js test/unit/t05 test/fault/t05 --format json`
  =>exit1,125errors,0warnings; full private JSON supplied out of band.
- `node node_modules/prettier/bin/prettier.cjs --check --ignore-unknown test/unit/t05 test/fault/t05`
  =>exit1,27files need formatting.

Many no-undef reports are real Node globals absent from configured lint globals:
use explicit globalThis references, builtin imports or narrowly documented known
Node globals in OWN files, not blanket lint disables/config relaxation. Fix real
missing symbols too: 09-inert-import references `VIOLATIONS`, `reportLines`,
`deltaCounts` with NO definitions/imports. Parse checks cannot detect that suite
collection would fail. Restore exact intended helper/table coverage; do not delete
assertions to make lint green. Resolve unused variables/empty catches intentionally;
for fixture errors retain sanitized diagnostics, not native cause/private paths
merely to satisfy a rule. No production or existing-test reads/edits.

## 2. Two of the six original interceptor bypasses STILL reproduce

Coordinator repeated the SAME six owned-temporary-file controls:
4now correctly fail with expected tags/no mutation;2still silently succeed with
exit0, clean:true, no tag, and synthetic data changed:

- unprefixed `import {writeFileSync} from "fs"`;
- `import fs from "node:fs"; await fs.promises.writeFile(...)`.

All synthetic temporary data was removed afterwards; no personal/production reads
or writes. R3's first four repairs are progress, not full closure.

The committed controls do NOT exercise these forms: fs-bare-write.mjs imports
`"node:fs"`, despite its unprefixed label; fs-promises-write.mjs imports standalone
`"node:fs/promises"`, not the nested promises property of default fs. Fix the actual
controls and guards (canonicalize bare builtin aliases, guard nested promises).
Require exact tags AND unchanged sentinel for each. Keep separate standalone-
promises and prefixed positive tests; do not rename a weaker case as repaired.

Do not overstate coverage: module shim currently rejects requiring a builtin at
all, rather than intercepting its eventual IO, and events-prototype control creates
an emitter instead of exercising prototype registration. Calibration must separate
harmless module import from forbidden effects and test the real named forms it
claims. Pure builtin import with no IO must not become a false failure. No broad
suffix exemption or silent unguarded default/nested surface may reappear.

## 3. Collector is character-bounded, not byte-bounded

Committed spawn-collect.mjs converts chunks to UTF8 strings, then compares string
length (UTF16code units) against65536. Independent native calibration child emitted
40000copies of a synthetic non-ASCII character: collector retained80000UTF8bytes,
truncated:false,exit0. Expected enforce65536-byte limit.

Count raw Buffer.byteLength BEFORE decoding/accumulating. Preserve decoder boundaries
or collect bounded buffers then decode; do not miscount split UTF8 chunks. Bound
both stdout/stderr (state clearly whether cap is combined or per stream), including
chatty interleaving. Extend committed collector controls with multibyte/split chunks,
not only ASCII. Timeout/error/output overflow paths must kill and OBSERVE close/reap,
clear listeners/timers and stay within the enclosing test budget including reap.
No unbounded string append or raw native exception diagnostic.

## 4. Response-header overflow necessarily follows a request

The repaired legal trailer boundary correctly uses >=4096budgets and otherwise-valid
response, but still expects `received.length===1` after BOTH equality and tight calls.
The tight call must send a request to learn the response head/trailers. Expected
received count2 (one each), attempts1 for tight, dispatched:true, internal_error,
no automatic retry. A response head cap is not a local request-head cap. Fix source
comments and evidence claiming no further egress; do not move the oracle to
predispatch or weaken it. Keep the first successful equality precondition.

Use native fixture calibration to distinguish normalized head accounting from actual
Node parser overhead at exact limits; do not claim small normalized budgets imply
no wire/parser interaction. Body/request/projected budgets remain separate.

## 5. Honest reproducible current evidence

SystemNode26 deviation is now recorded, not counted, and pinned reruns reported;
keep that. Current header/readiness still says R2 while claiming later repairs;
label historical R1/R2 incorrect mappings/assumptions where they appear, rather
than relying on a distant withdrawn list beside present-tense assertions.

Commit a full SHA256 inventory/calibration command+result record in QA evidence
for the actual owning files;8-character prefixes whose full values exist only in
an agent transcript are not a portable frozen-source inventory. Do not include
raw payloads/PEMs/personal paths. Claimed controls must correspond to the exact
committed source, not differently implemented /tmp drivers. A passing control
for node:fs does not prove bare fs interception.

## 6. Repair window and exact permitted checks

QA may repair ONLY its assigned source/helpers/fixtures/evidence and run:
- provisioned node --check on owning mjs/cjs;
- read-only own import checks;
- scoped installed ESLint command above;
- scoped Prettier check or --write with --ignore-unknown on test/unit/t05/,
  test/fault/t05/ and explicitly named t05-qa evidence files ONLY;
- already-authorized artifact-free builtin/synthetic/native-owned-fixture
  calibration, no src/dist/domain/node_modules/production imports in controls.

ESLint/Prettier themselves use installed tooling; that narrow exception does NOT
allow test suites or importing the moving/held production entry. No Vitest, target
HTTP/TLS/diagnostic/protocol/provider execution, build/install/config/manifest edits,
new dependencies, .pi changes, staging/commits or successor work. Do not change
compiler/lint config or suppress checks to hide real errors. Keep role independence.
Report clean scoped lint/format/parse/import checks, genuine six-bypass and collector
calibrations, exact source inventory and hold for coordinator re-review.
