# T09-S1 acceptance — journal format and immutable identities

**Disposition:** accepted on 2026-10-15. S1 source/test/build/execution work is
closed. Parent T09 remains incomplete; S2 is ready/unassigned, S3 held.
User assigned S1 after the [three-slice plan](../decisions/t09-plan-and-slices.md).
The primary Codex agent implemented/integrated/reviewed the work, with a bounded
specification-derived test author and a separate read-only source/spec reviewer.
These helpers do not establish external security/release certification.

## Accepted outcome

Additive public module src/operations/index.ts -> dist/operations/index.js/.d.ts.
Seven source modules provide version-1 journal/store/receipt/tombstone types and
strict codecs; domain-separated intent material; one-time candidate UUID/key/body
allocation; exact stored request reads; compact confirmation baselines; safe
errors and finite whole-store reservation arithmetic. The
[format/interface note](../decisions/t09-journal-format.md) documents immutable
identity, state constraints, bounds and the future repository boundary.

Reuse accepted T03 validation/normalization/write projection and T04 public
capacity constant. No existing production source, manifest/lock/config, schema,
shared contract, old test or historical evidence was changed by S1.
Creation remains unavailable; candidates are not admitted/authenticated operations.

## Final verification

Runtime Node24.21.0, npm11.19.0, TypeScript5.9.3, Vitest4.1.11.
All commands used the provisioned disposable toolchain after resolving the unset
T01_NODE_HOME variable; no system installation/global packages/settings changes.

| Check                                            | Result                                        |
| ------------------------------------------------ | --------------------------------------------- |
| npm run typecheck                                | PASS                                          |
| npm run lint:production                          | PASS                                          |
| npm run format:check:production                  | PASS                                          |
| npm run build                                    | PASS                                          |
| node --check test/unit/t09/s1-format.test.mjs    | PASS                                          |
| Scoped ESLint and Prettier on that test file     | PASS                                          |
| Complete active S1 owning selection              | 27/27 PASS                                    |
| Unchanged T03 normalization/identity regression  | 28/28 PASS                                    |
| Unchanged T03 write projection/result regression | 19/19 PASS                                    |
| Final exact selection                            | 3 files, 74/74 PASS; 0 failed/pending/skipped |
| Selected source/test/compiled/manifest hashes    | 27 stable before/after final run              |
| Emitted operations-module import smoke           | Exit0, empty stdout/stderr                    |

Exact final test command:

    npm exec --no -- vitest run test/unit/t09/s1-format.test.mjs test/unit/t03/parse-normalize-identity.test.mjs test/unit/t03/write-projection-result.test.mjs --reporter=json --outputFile=<private-result-file>

Scoped checks used the installed node_modules ESLint/Prettier entrypoints, no
package download. Import smoke used node --input-type=module with only an awaited
import of dist/operations/index.js in a child process bounded to five seconds.
The production import graph was reviewed for absence of startup IO/dispatch;
this smoke/source audit is limited evidence, not comprehensive interception or
an OS sandbox.

[Artifact inventory](t09-s1-artifact-inventory.json) records relative paths and
SHA256 only: seven new source files, fourteen emitted JS/declaration files, three
selected tests and package.json/package-lock.json/tsconfig.json. It is a scoped
target identity, not a whole-repository snapshot or clean-install claim.
No build/install overlapped test execution.

## Retained development failures and repairs

- Initial environment version diagnostic reported system Node26.11.1/npm12.2.0
  because T01_NODE_HOME was unset. Only version checks ran with that runtime;
  production/static/build/test commands used the resolved pinned toolchain.
- First typecheck failed on Zod optional-property inference under
  exactOptionalPropertyTypes and the native JSON reviver third-context type.
  Capture rejects explicit undefined, allowing a documented schema-output cast;
  an optional typed context matches the TypeScript library signature while runtime
  integer validation requires source text. No compiler setting was relaxed.
- Initial focused owning replay passed23/23. Source review subsequently found a
  read-helper binding accessor path before capture, final-newline UUID acceptance
  from dollar anchoring, and insufficient safe-machine-code validation.
  These were source findings, not claimed historical red-test observations.
  Fixes received focused regression cases; final owning selection is27 tests.
- Final contract review separated UUID family distinctness from resource-key
  namespace distinctness; a resource key may equal a family ID while the three
  resource keys remain mutually distinct. The generator and a regression now
  reflect the shared namespace boundary.
- An intermediate combined selection passed73/73 before that final namespace
  correction. The final74/74 run supersedes it and is the accepted selection.
  No failed assertion was removed or changed to fit implementation.

## Limits and next action

S1 proves pure format/identity/state invariants, detached ownership and bounded
byte accounting. It does not prove admission, config/auth/visibility enforcement,
whole-store serialization, provider/OS persistence, commit ambiguity recovery,
live terminal authorization, mutation dispatch, actual saved receipts or backend/
Android/Google/host interoperability. No real provider/network services were
needed or used for this pure slice.

Clean locked install/source-snapshot behavioral replay remains parent S3 work,
as scoped in the plan; it is UNRUN here, not passed or waived. Existing release
gates and T06 omissions remain unchanged. S2 must implement durable guarded
admission/locks/headroom enforcement over the real isolated T04/T06 boundaries.
S3 owns durable transitions and parent acceptance; T10/T11/T12/T15 retain their
dispatch/orchestration/lifecycle/product integration scopes.

See [S1 handoff](../handoffs/t09-s1.md). No automatic S2, product write,
staging/commit or release permission follows.
