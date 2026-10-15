# T08-S2 c1/f1 — Named SDK-only frozen relay

## Grant

Coordinator source gates accepted c1/r3; Developer and QA source/static/build
windows HOLD. This named relay authorizes QA ONE SDK-only run against the held
compiled working-tree candidate, with exact input identity recorded in
[t08-s2-f1-artifact-inventory.json](t08-s2-f1-artifact-inventory.json):216inputs,
153 QA-readable hash-verification inputs. QA may hash compiled bytes for identity,
not inspect generated implementation/source/maps. Production source hash checking
remains Coordinator-owned. No install/build may race the freeze.

Exact nonempty argv (7files =5S2owning +2unchangedT03regressions):

```text
node node_modules/vitest/vitest.mjs run
 test/read-protocol/catalogue-dispatch.test.mjs
 test/read-protocol/validation-errors.test.mjs
 test/read-protocol/result-budget.test.mjs
 test/read-protocol/lifecycle.test.mjs
 test/read-protocol/config-import.test.mjs
 test/unit/t03/tool-schemas.test.mjs
 test/unit/t03/write-projection-result.test.mjs
 --reporter=json --outputFile=<private isolated result path>
```

Coordinator supplies a narrowly reviewed private Bash launcher and fresh private
0700 HOME/tmp/cache scope. Launcher verifies pinned Node24.21.0/npm11.19.0 and
exact count/filename identity against the frozen JSON manifest, then verifies
`t08-s2-f1-qa-inputs.sha256` before/after. It invokes Vitest in a minimal `env -i`
child with only pinned PATH, private HOME/TMPDIR/XDGcache/config, T01_NODE_HOME
and CI. No ambient bus, proxy, product auth, real configuration or CA is inherited.
This is environment hygiene, not an OS/network sandbox claim.

Private original stdout/stderr/result/status/hash logs are preserved, never
copied raw into chat/repo evidence. Do not echo paths/bodies/errors; report safe
exit/status/counts/relative suite identities and original failing case identities.
Missing/changed scope/hash/argv/output or any failure => STOP/report before any
repair/rerun. Explicit status capture retains failures; no tail-only pass guessing.
No cleanup deleting original observations. QA may write sanitized result evidence
only to docs/evidence/t08-s2-qa-f1-sdk.md after this run, with exact safe argv/pins,
observed counts/statuses/failed titles and limitations. Do not invent a reporter
runtime-error counter or count skipped/deferred checks as passes.

QA may read these frozen public declarations only if needed: dist/protocol/index.d.ts,
dist/protocol/adapter.d.ts, dist/protocol/errors.d.ts, dist/runtime/index.d.ts.
No private implementation/maps/production-source reads or edits. Import child
observation is authorized only through the exact config-import owning suite.

## Explicit active work still held

Configured owning test/read-protocol/configured-policy.test.mjs and relevant
S1 startup-config/startup-ownership regressions remain ACTIVE/UNRUN, not omitted
from acceptance. A retained supported private real provider has not yet been
confirmed; separate provider/ext4/CA/HTTPS preparation and frozen relay are required.
Do not run those files, auto-discover suites or substitute ambient keyring/services.

S2 is not accepted by SDK-only success. S3 actual stdio/parent acceptance/clean
reproduction, operator login, live backend/Google/Android/named Pi/packaging/release
remain deferred. No new source window, context renewal/S3, product writes, .pi,
trust/settings edits, staging, commits or release.
