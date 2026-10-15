# T04-f2 frozen relay — post-f1 targeted repairs

**Execution open; acceptance pending.** f1 remains NOT accepted with failures and
[adjudication](../decisions/t04-f1-adjudication.md) retained. R2 QA sources correct
only F3/F4 oracles/cleanup, not production inputs or required safety gates.

Coordinator focused public-entry checks: omitted timeout/default PASS;8 repeated
actual ownership conflicts map locked_by_other_owner PASS; valid INCOMPLETE on an
initialized profile refuses reprovision incomplete_provision PASS. Initial R2
verification still failed marker precedence (check was after nonempty data refusal);
Developer moved it before all existing-state refusals, then repeat PASS.
No backend/personal keyring; only issued synthetic diagnostic roots, cleaned.

Coordinator repeated pinned Node24.21.0/npm11.19.0 typecheck/lint:production/
format:check:production/build, all exit0. Manifest/locked closure and foundation/
compiler/server/CLI/companion scope hashes unchanged from f1;14 authorized added
package nodes, none removed, existing baseline only root dependency changed.
No whole-suite/clean source-snapshot/storage acceptance claim from these checks.

Frozen58-file source/build/metadata inventory: `/tmp/gt-mcp-t04-f2-inventory.json`;
aggregate SHA256
`dd0029b0696cc86be2ccf92d6dc2321efa88932b58f66173f4721f2ea6a87f69`.
QA may inspect nonsecret hashes/inventory, never implementation contents.
Developer/coordinator HOLD all source/build/install/config until relay closed;
any production repair invalidates f2.

Same full execution scope and qualified public private-provider launcher as
[f1 relay](t04-f1-coordinator-relay.md), NOT only previously failing tests:

- installed local Vitest owning unit T04;
- public env-i/private-bus/ext4 launcher owning fault T04, provider lock-last then
  owned daemon/keyring teardown (no Reset/Unlock/GUI fallback);
- foundation smoke and T03 regression;
- scoped QA lint/format/parse checks, no semantic weakening or target changes.

Exact provisioned toolchain/provider-prefix values and commands delivered
asynchronously to QA. Preserve raw execution results safely and report exact
counts/failures/cleanup/limits; no skips, parked-T02 or whole-matrix claim.
Coordinator later reproduces passing evidence and clean locked allowlisted snapshot
before final acceptance. T04 remains in progress; product writes disabled, no next
task/staging/commits/release grant.
