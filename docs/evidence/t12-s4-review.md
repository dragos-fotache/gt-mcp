# T12-S4 and parent T12 — Integrated acceptance

**Disposition:** accepted/closed, 2026-10-15. Primary-agent specification/source/test
review under the [S4 work order](../tasks/t12-s4-work-order.md) and
[proportional testing](../decisions/proportional-testing-policy.md).
96/96 T12 owning + 229/229 relevant regressions = **325/325 in 31 exact files** on both workspace and clean locked snapshot;
zero failed/skipped/pending/todo in final acceptance. Main 324/324 plus
terminal locked-provider 1/1 in its own fresh scope on each target.
Five new S4 checks; all 91 prior T12 owning checks retained.
[Artifact inventory](t12-s4-artifact-inventory.json),
[clean reproduction](t12-s4-clean-reproduction.json), [handoff](../handoffs/t12-s4.md).

## Delivered behavior and review

Setup/fresh login now disclose AI-host fitness-data/transcript exposure, indefinite
encrypted unresolved content, identifying compact receipts for profile lifetime,
three independently committed creation steps/draft leftovers, local-erasure/replay
limits and config-only writesEnabled strict boolean/default false. Explicit true
permits connected local clients’ valid authenticated explicit creation without a
per-routine prompt when supported; the disclosure explicitly states that creation
remains unavailable in this build. Fixed stderr output precedes effects; sink
failure prevents provisioning/login. No grammar, API, tool, policy or lifecycle
algorithm changed. The [operator guide](../login.md) records exact commands,
exclusive-owner sequencing, recovery choices and required external deployment inputs.

Shared authentication/journal/account-lifecycle specifications provide independent
oracles for privacy copy and flow expectations. Review followed CLI admission and
settlement, lifecycle ownership/retirement, owned removal/publication, verified
status provenance and storage fence/key cleanup, plus protocol inert creation and
strict config defaulting. S1–S3 accepted semantics remain intact: sign-out advances
and clears credentials before best-effort logout, retirement reserves IDs, durable
external intent precedes erasure, and only fresh verified matching deletion invokes
cleanup. Primary review is not independent security/release review.

New integrated checks launch the actual compiled server via SDK: startup/listing/
creation refusal sends no HTTP, a concurrent trusted CLI cannot take ownership,
and graceful server exit releases the owner. Same-account explicit login preserves
exact seeded valid recovery identity; retirement remains permanent after another
sign-out/login even with changed intent. Removal blocks ordinary setup; confirmed
reconciliation retains the old fence and provisions distinct empty evidence, followed
by explicit login. Separate signed-out A verification through actual secured callback/
HTTPS removes only A; a genuinely different synthetic B account/profile retains
its exact vault, operations and digest. Config remains false. The seeded journal
is explicitly recovery evidence, not backend-admission proof; unchanged T11 actual
provider/HTTPS recovery/service regressions supply creation/replay/minimization
boundary evidence. Prior fault matrices are reused, not rebuilt.

Changed existing production input is only src/cli/main.ts disclosure text. The
S1 fixture gains one optional synthetic account override; no prior assertions
changed. Two new S4 test files and operator/task/evidence/status documents complete
the scope. Baseline hashes confirm shared contracts, manifests, lockfile, compiler
and unrelated production/test inputs unchanged. No .pi edits, staging or commits.

## Verification and original observations

Node24.21.0/npm11.19.0, TypeScript5.9.3/Vitest4.1.11. Initial version probe found
unset T01_NODE_HOME and system26.11.1/12.2.0; resolved the provisioned toolchain
before install/build/test. Early syntax/type/lint/format checks ran. Lint found a
missing uuid import in the new distinct-account test; the first focused run still
executed and passed4/5, failing that test with ReferenceError. Corrected the import;
focused repair passed its one selected case (two deselected, not acceptance passes).
The first full main acceptance passed313/324 with11 failures in unchanged T07
CLI integration: the expanded disclosure had lost the required phrase “recovery
evidence.” Restored that wording while preserving all new disclosures; did not
change old assertions. The full affected CLI suite and new disclosure checks passed13/13
after repair. Original failed reports remain separate from final acceptance. No
contract was weakened; final complete selections below pass.

Workspace typecheck, lint:production, format:check:production and build PASS;
scoped lint/format for both new tests and changed helper/operator guide PASS.
Final acceptance has 537 stable source/test/config/emitted hashes,
including 192 emitted files. Clean source snapshot copied 375
locked inputs, ran npm ci --ignore-scripts and the same four production checks,
then repeated the identical main/locked selections. All source inputs remained
stable; all 192 emitted artifacts matched workspace bytes exactly. Clean
install used a disposable npm cache/userconfig and no lifecycle hooks.

Exact selection and per-file results/hashes are in the inventory. Safe commands:

```sh
export T01_NODE_HOME="$(cat /tmp/gt-mcp-workflow-node-home)"
export PATH="$T01_NODE_HOME/bin:$PATH"
node --version
npm --version
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
python3 /tmp/gt-t10-s3-isolated.py "$T01_NODE_HOME/bin/node" /tmp/gt-t12-s4-runner.mjs main workspace
python3 /tmp/gt-t10-s3-isolated.py "$T01_NODE_HOME/bin/node" /tmp/gt-t12-s4-runner.mjs locked workspace
python3 /tmp/gt-t12-s4-clean.py
```

The acceptance runner executes node node_modules/vitest/vitest.mjs run
--no-file-parallelism with the inventory’s exact nonempty selection, JSON reporter
and private output file. The clean runner copies only declared inputs, installs/
checks/builds sequentially and executes both identical batches in fresh isolated
facilities. No build/install raced tests against its target. Each facility qualified
private libsecret store/read/clear, actual ext4 and private-CA HTTPS; fixtures used
actual Secret Service, dual-loopback and compiled CLI/SDK boundaries. Owned provider/
bus processes terminated and were reaped; disposable synthetic data scopes were
removed after every run, including the original failed run. No personal facilities.

## Closure and retained limits

S1–S4 and parent T12 are complete within local integrated acceptance. Synthetic
Google/backend responses and controlled launcher prove local composition only,
not real Google/browser/backend/DB/Android/sync/named-host interoperability.
T06 historical omissions and T04 whole-state restore/same-UID/runtime/media/backups
limits persist. Host transcripts and remote data are outside local erasure.
T15 creation composition remains separate/unassigned/unavailable; T16–T20 and
required independent security/release gates remain. No successor, live action,
product write enablement or release is authorized.
