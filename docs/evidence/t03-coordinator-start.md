# T03 coordinator start and baseline evidence

**Status:** T03 in progress, not accepted. User authorized starting T03 and
fresh Developer/QA agents via Herdr. No release/interoperability claim.

## Authority and assignment

Shared baseline `9a96dcbce647933f5415da71db6d389bd2197983`, backend v1/OpenAPI1.0.0.
Observed shared working-tree modifications are precisely the prior approved
MCP draft0.2 policy files: shared README and MCP README/tools/authentication/
routine-creation/acceptance-scenarios. No new shared edits made here.
T01 historical foundation acceptance read; T02 remains parked/incomplete and
T13/T14 retired. No other task assigned. T03 claimed in task/index before edits.

Approved coordinator interface:
[specification](../decisions/t03-approved-schema-codec-spec.md),
[work order](../tasks/t03-work-order.md). Pure domain entry is new;
root type-only barrel/server/CLI/companion inert behavior remains unchanged.
Writes/config guard/transport/auth/storage/journal/host integration are not T03.

Fresh Developer and QA Pi sessions replaced the prior idle sessions in their
existing stacked panes; no new tab/workspace/worktree/pane. Selected model
meta/muse-spark-1.3-contributor. Fresh-session starts used --no-mcp and --approve;
no settings/local .pi edits, and no isolation certification inferred from flags.
Asynchronous role-boundary assignments; no pane-output polling or --wait.
Developer/QA confirmed role/model/readiness by message. Coordinator read QA plan
and production/metadata as its role permits; no cross-role private material relay.

## Exact baseline commands and failures

All commands used PATH="$T01_NODE_HOME/bin:$PATH".
Observed node v24.21.0, npm11.19.0; package pin set unchanged.

Coordinator initial chain:

```sh
npm run typecheck && npm run lint:production && npm run format:check:production && npm run build && npm run smoke
```

Typecheck and production lint passed. Formatting failed **exit2** because
`docs/decisions/t02-feasibility-adr.md` does not exist; build/smoke were NOT run
by this chain. This was recorded, not masked or called passed.

Developer was exclusively authorized to remove only that nonexistent literal
from BOTH formatting scripts in package.json. No fake historical ADR, lockfile,
dependency/test removal or compiler relaxation. Developer reported:

- npm run typecheck: exit0.
- npm run lint:production: exit0.
- npm run format:check:production: exit0.
- npm run build: exit0.

Coordinator independently repeated:

```sh
npm run format:check:production && npm run smoke
```

Formatting passed. Smoke failed **exit1**, **99/100 tests passing**, six of seven
files passing. The foundation metadata expectation assumes the old compatibility
matrix; current approved public matrix has17 rows/five columns with one retired
companion status. This is baseline policy-metadata drift, not T03 codec behavior.
QA's single assertion repair is explicitly authorized by public spec section7;
no assertion deletion/skip, false status or parked-test rewrite is permitted.
Historical initial acceptance/failure evidence is unchanged.

Existing broad production scripts typecheck/lint preserved historical sources;
no experimental scenario executable or parked T02 QA target was run. Whole-suite
npm test/check are not claimed green or silently reconfigured. This bounded
window runs owning T03/foundation suites; whole-matrix reconciliation/release
checks remain separate gates.

## No-dependency numeric feasibility probe

Coordinator ran a Node --input-type=module synthetic JSON.parse reviver probe
with Int64-max numeric source. Observed exact `context.source` available and
ordinary parsed Number rounded. This supports a candidate implementation approach,
not proof of the codec. Public spec requires exact source integral/range checks
before conversion and independent raw-wire boundary tests. No external input,
backend/credentials or dependency changes needed for T03.

## Baseline-f0 frozen regression relay

Developer holds production/source/build/install/config edits during QA's
baseline-only metadata repair/smoke execution. New T03 test source preparation
is allowed from public spec; compiled domain execution is NOT yet authorized.
Build command npm run build with Node24.21.0/npm11.19.0.

| Public artifact | SHA256 |
| --- | --- |
| dist/index.js | 8e609bb71c20b858c77f0e9f90bb1319db8477b13f9f965f1a1e18524bf50881 |
| dist/contracts/index.js | e762a5c8a0b42f023f3dff047372723e9eb6b352a0521289ff871f53e21cc6e4 |
| dist/protocol/server.js | f796dc48412b3068b7fb18c5511a2858b313e3ee862aa304c3e714cc5e0796ef |
| dist/cli/index.js | f4e36466b4e7a67933e70cb77b24fdbff4136a0ca41f402497fb1139d119b033 |
| companion/dist/index.js | f5ade4881f4a7b3d08169489c249c445ef916d50b89ddf2a2bd5fe03b11b5395 |

QA authorized command npm run smoke ONLY at this baseline compiled window.
QA reported baseline repair and 100/100 smoke; coordinator reviewed its evidence
and authorized assertion change, then independently repeated npm run smoke:
7 files, 100/100 passed, exit0. Production formatting was independently repeated
again, exit0; both formatting references and preserved historical script paths
were verified from package metadata. Baseline-f0 is now CLOSED. Developer is
released to the approved src/domain/ and T03 implementation ADR scope; QA may
prepare test sources but must not execute moving builds/domain targets.
Exact compatibility component-set coverage is a QA follow-up before final
acceptance; this baseline regression closure is not T03 codec acceptance. Final domain-artifact relay
will carry source/build inventory digest and close production edit ownership
while QA executes the independent T03 tests. T03 remains in progress until
accepted with clean-install, production checks and independent scoped evidence.

No secrets/live account/resource identifiers, private bodies/paths, actual writes,
staging/commits, publication/deployment or product compatibility claims.
