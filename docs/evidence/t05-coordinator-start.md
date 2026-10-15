# T05 coordinator start and prerequisite baseline

**Status:** T05 in progress, design/planning only; no T05 implementation or
independent transport acceptance yet. User authorized starting T05, selected
fresh Developer/QA via Herdr, supplied standing Herdr-operation permission,
then reported stopping both agents and requested restart/resume.

## Scope and staffing

Claimed task/index before design edits. Public
[design brief](../decisions/t05-transport-design-brief.md) and
[work order](../tasks/t05-work-order.md) assign only Developer proposal and
independent QA planning. No production/test-source implementation or target
execution granted to either role; coordinator owns initial baseline installs/build.

Inspected actual existing topology and shell foreground once on resumption:
coordinator/w4:p2K, upper-right Developer/w4:p2H, lower-right QA/w4:p2M.
The former Developer pane ID no longer exists; discovered handles, not historical
IDs, were used. Both subordinate panes were available zsh shells in this cwd.
Fresh Pi sessions started successfully with selected
meta/muse-spark-1.3-contributor, --thinking high --no-mcp --no-approve.
Asynchronous role-specific assignments were submitted, no --wait or output/status
polling. No extra panes/tabs/workspaces/worktrees or focus changes; no prior
conversation resumed. Flags do not establish an OS sandbox or full isolation.
Standing authorization is in
[coordination](../agent-coordination.md#standing-herdr-authorization) and linked
from pickup docs; do not repeat Herdr-permission questions.

## Authority and retained prerequisites

Shared MCP0.2 working-tree config-only revision over9a96dcb; backend OpenAPI1.0.0
unchanged. Existing shared modifications are retained, not coordinator transport
contract edits. T01/T03/T04 accepted evidence reviewed; T09 remains unassigned,
T02 parked/incomplete, T13/T14 retired. No successor/whole-matrix grant.

Located the retained disposable official T04 Node toolchain. Archive SHA256
check against retained SHASUMS256.txt: PASS. Exact observed pins:
Node24.21.0/npm11.19.0. No system Node/npm, global installs or Pi settings changed.
Use coordinator-supplied T01_NODE_HOME out of band, not a private repository path.

## Independently repeated baseline

Coordinator executed sequentially with
`export PATH="$T01_NODE_HOME/bin:$PATH"` while both roles were document-only:

| Command | Observed result |
| --- | --- |
| node --version; npm --version | v24.21.0;11.19.0 |
| npm ci --ignore-scripts | PASS,346 installed,348 audited,0 vulnerabilities reported |
| npm run typecheck | PASS |
| npm run lint:production | PASS |
| npm run format:check:production | PASS |
| npm run build | PASS |
| npm run smoke | PASS,7 files,100/100 foundation tests |
| npm run test -- test/unit/t03 | PASS,7 files,221/221 T03 tests |

Command chain exit0. No skips or passWithNoTests; upstream node-domexception1.0.0
deprecation retained, not repaired through dependency churn. Existing broad
production scripts compile/inspect preserved experiment sources without resuming
parked T02 scenarios. No whole-suite npm test/check claim.

T04 real private-provider/fault regressions were NOT rerun in this startup window;
previous independent444-test acceptance remains the prerequisite evidence. Later
T05 acceptance requires coordinated regression/frozen-artifact commands and an
explicit isolated Secret Service fixture, never personal bus/keyring fallback.
This is a current-working-tree baseline, not T05 acceptance or clean-snapshot
reproduction, real backend/DB/browser/Android/Pi interoperability or release.

## Design completion and current window

Both roles reported initial and revised planning readiness, only their own documents
written and no execution. Coordinator reviewed separately and published the
[approved public transport spec](../decisions/t05-approved-transport-spec.md),
retaining round1/round2 defects in
[design adjudication](t05-coordinator-design-review.md). Exact production and
independent QA TEST-SOURCE grants were sent asynchronously to Developer/w4:p2H
and QA/w4:p2M; no output/status polling or cross-role private artifact transfer.
Developer now owns build/install/production checks per work order. QA compiled
execution remains CLOSED until explicit named frozen relay; no T05 acceptance.

Coordinator captured a preimplementation57-file production/experiment source
inventory for later non-scope drift checks (not an accepted build target):
SHA256 `8dff30e3f508392aac8e82e82529872f933a742bf395de39ac6ec93e9b63f3e6`.
Root package.json SHA256
`d79e251a3fb7eb8f10ea21586b8c82e41b3732d7cba88ac6180d3e37b78c70a0`;
package-lock SHA256
`d1e340762075496d17bb8c46de0b98956e6a257d8ae5bc27efa7a1b28542512d`.
Exact pins observed again before delegation. Local links for approved spec/work
order/task/design review checked with a read-only path validator: PASS. No
production/test source changed by coordinator in this design window.

Next: independent source readiness/review, frozen relay, owning/scoped regression
execution and clean-source locked acceptance. Dependency/compiler changes are
not approved; no implementation/target pass is inferred from the design. No actual backend writes, real credentials, private bodies,
local .pi edits, staging/commits, publication or deployment authorized.
