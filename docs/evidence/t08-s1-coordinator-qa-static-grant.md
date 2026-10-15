# T08-S1 QA source-only static grant

## Disposition and exact scope

Coordinator reviewed QA's planned filename/scope message. The following exact
nonempty list is approved for new S1 source preparation and SOURCE-ONLY checks:

```text
test/read-runtime/startup-config.test.mjs
test/read-runtime/startup-ownership.test.mjs
test/read-runtime/reads-success.test.mjs
test/read-runtime/reads-pages-filters.test.mjs
test/read-runtime/canonical-errors.test.mjs
test/read-runtime/validate-before-auth.test.mjs
test/read-runtime/cancel-close.test.mjs
test/read-runtime/fixtures.mjs
test/read-runtime/helpers.mjs
```

QA owns its concise plan at docs/evidence/t08-s1-qa-plan.md and its other permitted
S1 QA evidence. Review approves filenames and proportional requirement/risk scope,
NOT unwritten test correctness, fixture execution or behavior acceptance. The plan
was initially absent when Coordinator attempted to read it (ENOENT), then written
and read at the next QA milestone. Its requirement/risk scope is within the work
order. Coordinator requested removal of its private disposable provisioning path
in favor of a trusted placeholder; this is an evidence-hygiene correction, not a
production/test behavior decision or passed source review.

## Permitted checks

Use the privately supplied provisioned toolchain, Node24.21.0/npm11.19.0:

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
sources=(
  test/read-runtime/startup-config.test.mjs
  test/read-runtime/startup-ownership.test.mjs
  test/read-runtime/reads-success.test.mjs
  test/read-runtime/reads-pages-filters.test.mjs
  test/read-runtime/canonical-errors.test.mjs
  test/read-runtime/validate-before-auth.test.mjs
  test/read-runtime/cancel-close.test.mjs
  test/read-runtime/fixtures.mjs
  test/read-runtime/helpers.mjs
)
test "${#sources[@]}" -eq 9 || exit 1
for source in "${sources[@]}"; do test -f "$source" || exit 1; done
for source in "${sources[@]}"; do node --check "$source" || exit 1; done
./node_modules/.bin/eslint "${sources[@]}"
./node_modules/.bin/prettier --check "${sources[@]}"
```

Run each phase separately and retain its actual status; failed syntax/lint/format
needs focused source repair, never masked success. Scoped prettier --write on these
same exact files is allowed; no configuration/rule relaxation. An inline static
import-resolution check may read only these nine sources and use Node built-in
fs/path/module resolution or file-existence checks plus nonsecret package metadata.
It must assert the same nine-file argv, must not import/require/execute targets,
and must not read generated implementation/maps or invoke fixtures. No generalized
resolver/harness project. Missing future dist/runtime/index.js is honestly blocked
until Developer builds it, not skipped/passed or an excuse to execute it.

No directory glob/find/discovery fallback, empty argv, accepted-test edits, whole-repo
lint/format/tests, Vitest/npm test/smoke/check, build/install, compiled imports or
fixture/provider/HTTPS/suite execution. Those runtime grants remain CLOSED pending
separate source reviews, verified isolated environment and frozen-artifact relay.
This approval does not expand QA's read/edit boundaries or authorize S2/S3.

Report exact source-only results/remaining limitations; hold at readiness or the
existing window's stop. No actual writes, personal services, .pi/trust changes,
staging/commits/release, automatic successor or context renewal.
