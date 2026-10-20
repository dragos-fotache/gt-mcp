# T10-S1 acceptance — pure confirmation and failure decisions

**Disposition:** accepted/closed on 2026-10-15 under the user's explicit S1
assignment. Primary Codex agent implementation, verification and source/spec/test
review; no independent security/release certification. Parent T10 incomplete.
S2 is ready for separate assignment; no automatic successor.

## Delivered behavior and review

The [work order](../tasks/t10-s1-work-order.md) and
[plan](../decisions/t10-plan-and-slices.md) govern. New inert internal entry
`dist/creation/index.js/.d.ts` exports only evaluateStepConfirmation and
classifyCreationFailure, plus their TypeScript decision/error/phase types.

The evaluator validates/detaches an active T09 journal and requires its first
unconfirmed dispatch-possible step plus the exact original method/route/body/key.
It checks expected mutation metadata and losslessly decodes the raw response with
T03, expected root and fatal UTF-8. Projected result.data is never the oracle.
Admitted domain state comes from the validated stored populate body. Names,
ordered child IDs/references/positions/rest/repetitions/weights and array counts
must match; nullable response omissions mean null. Derived labels/additive fields
are excluded from writable identity while canonical shape still must validate.

An empty unnamed draft or matching populated draft returns its exact revision
marker. A matching saved record returns save marker plus saved terminal result;
a valid same-root saved-content difference returns save marker plus terminal
concurrent_modification/outcomeUnknown=false. These are facts for S2's atomic
confirmation+terminal commit, not a persistence acknowledgement. Wrong state/
metadata/root/shape/revision or populate mismatch remains active uncertainty with
required history and retryable internal_error. No fabricated confirmation.

Failure classification uses entry history before this attempt's dispatch mark,
plus a trusted before-dispatch/mutation/confirmation phase. Only a received
permanent mutation error may propose terminal rejection, validated against T09's
unchanged result shape/budget. Local/read/auth/throttle/transient/persistence
failures stop without terminal backend claims. Earlier pending/sticky uncertainty
survives 4xx, including idempotency mismatch. Safe backend codes and Retry-After
are preserved; incompatible terminal metadata fails closed to active internal_error.
Unknown/spoofed errors never expose native diagnostics. All decisions are detached.

Primary review checked the shared draft0.2 HTTP-step/recovery/error rules,
backend v1 exact resource identity and numeric/domain contracts, actual T03 raw
decoder, T05 branded safe errors/sticky uncertainty, T06 local failures and T09
strict transitions/terminal shapes. Test expectations use independently authored
wire records/IDs, not production comparison helpers. Existing dependency sources,
tests and fixtures were unchanged. No policy/format/API relaxation was needed.

## Verification

Provisioned Node24.21.0/npm11.19.0, TypeScript5.9.3, Vitest4.1.11. No install,
system toolchain changes or global packages. Stable build targets; no build/install
overlapped tests. [Inventory](t10-s1-artifact-inventory.json) records exact file
selection, versions, relative hashes, tree digests, results and smoke limitations.

| Check                                                                   | Result                                         |
| ----------------------------------------------------------------------- | ---------------------------------------------- |
| npm run typecheck                                                       | PASS                                           |
| npm run lint:production                                                 | PASS                                           |
| npm run format:check:production                                         | PASS                                           |
| npm run build                                                           | PASS                                           |
| Scoped creation/test ESLint and Prettier; three new .mjs syntax checks  | PASS                                           |
| Complete S1 confirmation suite                                          | 28/28 PASS                                     |
| Complete S1 failure suite                                               | 28/28 PASS                                     |
| Selected unchanged T03/T05/T09 regressions                              | 183/183 PASS                                   |
| Final exact eight-file selection                                        | 239/239 PASS, zero failed/pending/skipped/todo |
| 29 selected source/test/emitted/config hashes before/after              | Stable                                         |
| Root/companion source and 176 emitted files; selected test-tree digests | Stable                                         |
| Bounded silent creation-entry child import                              | PASS: exit0, empty stdout/stderr               |

The scoped commands were:

```sh
node node_modules/eslint/bin/eslint.js src/creation test/unit/t10
node node_modules/prettier/bin/prettier.cjs --check src/creation test/unit/t10
node --check test/unit/t10/helpers.mjs
node --check test/unit/t10/s1-confirmation.test.mjs
node --check test/unit/t10/s1-failure.test.mjs
```

Final selection, using existing built artifacts:

```sh
node node_modules/vitest/vitest.mjs run --no-file-parallelism \
  test/unit/t10/s1-confirmation.test.mjs \
  test/unit/t10/s1-failure.test.mjs \
  test/unit/t03/backend-response.test.mjs \
  test/unit/t03/lossless-revision.test.mjs \
  test/unit/t05/06-errors-uncertainty.test.mjs \
  test/unit/t05/07-results-decode.test.mjs \
  test/unit/t09/s1-format.test.mjs \
  test/unit/t09/s3-transitions.test.mjs \
  --reporter=json --outputFile=<private-result-file>
```

Regression counts39+55+38+15+27+9=183; owning28+28=56; total239.
No whole-repository or parked/deferred-suite pass is implied. The smoke command
was `node --input-type=module -e "await import('./dist/creation/index.js');"`,
in a separate child with a five-second timeout. Source review found only pure
definitions/validation imports; this is limited import evidence, not exhaustive
interception, provider testing or an OS sandbox.

## Development record and limits

- Initial typecheck/scoped source lint passed. Initial scoped formatting rejected
  only failure.ts; Prettier corrected it. Final production/scoped checks passed.
- First focused owning run passed55/55. Source review then identified native
  exceptions from malformed local journal/request values. Sanitized boundary
  handling and one focused public regression were added; no prior red test is
  claimed. The final owning selection passed56/56 within the239-case run.
- Review also guarded mutable/spoofed local OperationError codes with a fixed
  allowlist, retaining only shared classifications. Incompatible T05 terminal
  metadata cannot force changes to T09's accepted schema.
- No observed behavioral failure, skipped assertion or relaxed contract remains.

This slice has no executor/factory, mutation, advisory GET, persistence update,
retry/resume loop, terminal replay/compaction, config/MCP/CLI integration or
production enablement. Clean locked reproduction and real isolated provider/
ext4/HTTPS execution remain S2/S3/parent work, UNRUN here. Real backend/DB/Android/
Google/named-host/release gates stay open; T06 omissions and T04 restore limits
remain unchanged. S1 is pure decision evidence, not an integrated creation claim.

Changed production paths are the five new src/creation modules; tests are the
two S1 files and synthetic helper in test/unit/t10. Other changes are S1 work
order/evidence/inventory/handoff, T10 plan/task/index/roadmap and verification
status. Preexisting uncommitted changes and past evidence were preserved.
No staging/commits or automatic S2 authorization. [Handoff](../handoffs/t10-s1.md).
