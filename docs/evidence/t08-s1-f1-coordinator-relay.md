# T08-S1 c3/f1 independent runtime relay

## Exact grant

Production c3 and QA source-preparation/focused-regression reviews approved;
qualified private Secret Service/ext4/HTTPS/toolchain preflight PASS. Frozen
[artifact identity](t08-s1-f1-artifact-inventory.json) records compiled files, QA
sources/helpers, manifest/config/dependency metadata, production source references
and private control hashes. Earlier QA-only source inventory is PRESERVED;
validate-before-auth alone changed under the reviewed one-file grant, other eight
hashes verified unchanged. Private dependency copy prevents build/install/vendor
cache races with the mutable working tree. No source/build window remains open.

QA is authorized ONE invocation of the privately supplied frozen c3/f1 launcher
and one-off control, with explicitly exported provisioned T01_NODE_HOME/PATH,
verified provider/control/candidate inputs and the exact ten-file argv below.
No discovery/empty fallback, install/build/source changes or second run. Control
asserts/fingerprints inputs before and after, prepares new isolated provider/CA/
synthetic profiles via approved QA fixture APIs, runs files serially to avoid
shared-profile owner races, captures complete stdout/stderr (only private-prefix
path redaction, never tail/failed-case removal), structured results and exact safe
failure identities. Unknown/missing output stays unknown; scope/hash/cleanup fault
means STOP. No external timeout/forced durability termination.

```text
test/read-runtime/startup-config.test.mjs
test/read-runtime/startup-ownership.test.mjs
test/read-runtime/reads-success.test.mjs
test/read-runtime/reads-pages-filters.test.mjs
test/read-runtime/canonical-errors.test.mjs
test/read-runtime/validate-before-auth.test.mjs
test/read-runtime/cancel-close.test.mjs
test/unit/t03/backend-response.test.mjs
test/unit/t06/s5-lifecycle-validation.test.mjs
test/foundation/inert-imports.test.mjs
```

Seven owning files plus three relevant unchanged regressions: T03 read decoding/
lossless/canonical record boundaries; T06-S5 read-only lifecycle/version/fences; T01
inert unchanged entries. Their direct helpers/preload are frozen, not edited. This
is not whole-repository execution or a new exhaustive dependency campaign. S3
owns full parent integration/clean reproduction; T06 waivers are not reopened.

## Safety and stop

Only new synthetic fixture accounts/grants/resources and loopback HTTPS are used;
no product mutations, personal bus/home/account/backend/Google/Android. Credentials,
CA keys, bus/origin/root values stay private placeholders. Source tests use real
isolated T04 production provider for S1 configured behavior; accepted standalone
T06 unit diagnostics remain explicitly diagnostic, not provider proof.

Normal success reaps foreground daemon/private bus and confirms fixture scope
removal; failure retains uncertain scope for separately approved safe cleanup.
Provider teardown is after the test command returns, never forced target shutdown.
Report full safe status/counts/failure identities/artifact/cleanup and HOLD all.
No automatic repair/rerun/exclusions/skips-as-pass, S2/S3/source edit/context renewal,
staging/commits/release. Original source-window stop is12:29UTC; if target owning
persistence cannot settle safely by then, checkpoint truthfully rather than kill it.

This relay is execution permission, NOT an executed result or S1 acceptance claim.
