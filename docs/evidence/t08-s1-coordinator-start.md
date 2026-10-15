# T08-S1 coordinator opening — bounded source work

## Authority and current disposition

User instructed the new Coordinator to complete prerequisites and start T08-S1.
S1 is IN PROGRESS, not implemented or accepted. The
[activated work order](../tasks/t08-s1-work-order.md) and
[settled runtime specification](../decisions/t08-s1-runtime-spec.md) govern this
first bounded window. Existing settled behavior is reused, not redesigned.

Developer production source/static/build work and independent QA source preparation
are OPEN only within the work order. QA static checks wait for a reviewed nonempty
filename list. All install, compiled-target, fixture/provider, HTTPS and test-suite
execution grants remain CLOSED pending a separately verified environment and named
frozen-artifact relay. No S2/S3 successor or T06 waiver reopening is authorized.

## Prerequisites and baseline

Reviewed settled S1 config/descriptor/runtime/read/error/close behavior, selected user
choices, standing role separation, bounded-work and proportional-testing policies,
and normative shared MCP draft0.2 read/authentication and backend service protocol.
Accepted T03–T06 capabilities and T06 closure remain the dependency authority;
T06's user-waived final checks remain WAIVED/UNRUN, never passed.

Shared-docs baseline remains 9a96dcb with the same six MCP policy working-tree edits;
no backend v1 or shared contract changes. Root repository still has no commits and
its existing project files are untracked; no staging/commit or cleanup permission.
New S1 source/test/ADR paths were absent at opening, with no competing S1 owner.

Inherited T01_NODE_HOME was absent. Located the retained disposable T06-S5 Node
provisioning and privately supplied its location to roles. Verified Node v24.21.0
and npm 11.19.0. Retained archive SHA-256 matches the retained official manifest;
this relies on historical verified provisioning, not a fresh download/authenticity
claim. No system Node/npm, global install, Pi settings or .pi changes.

Coordinator baseline, sequential, all exit 0:

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
```

Installed nonsecret metadata agrees with SDK 1.32.1/Vitest 4.1.11 and pinned engines.
No install, QA suite, public feature probe, private provider or HTTPS fixture was run.
Baseline checks are not S1 behavior evidence or renewed parked T02 acceptance.

Working filesystem reports ext4; dbus-run-session and openssl are present. These
presence checks do NOT establish a private Secret Service, supported isolated roots,
fixture CA/origin, provider provenance or safe cleanup. Configured-runtime execution
remains held until those prerequisites are independently confirmed/reprovisioned.
No ambient bus/keyring/home, live backend, Google/browser/Android or real data use.

## Staffing

Standing user-approved Herdr coordination authority was reused without a new
permission questionnaire. Discovery confirmed the existing same-tab/cwd agents:
Coordinator w4:p2K, Developer w4:p2H and QA w4:p2M. Subordinates were idle/ready.
Sent /new to each; subsequent detection snapshots show new sessions, 0.0% context
and preserved meta/muse-spark-1.3-contributor/high. MCP remained disabled/project
trust blocked; no trust/configuration dialog was approved. No new topology,
worktree, process restart or user-focus change.

Role-specific decision-ready activation prompts were submitted asynchronously to
Developer and QA successfully (agent_prompted, exit 0). A subsequent single lifecycle
inspection at 10:29 UTC observed both agents WORKING in those same panes. Assignment
submission/observed activity is not source readiness or acceptance. QA was asked to
report its own planned nonempty source filenames before static approval. No polling
loop or role-private implementation/test oracle was exchanged.

## Verification and next gates

Use the work order's small risk matrix: safe metadata loading, actual existing owner/
session/HTTPS composition, six meaningful read mappings, exact revision and complete
records, validation-before-auth, conservative errors, cancellation and durable close.
QA chooses independent simple fixtures/cases; no generalized harness or count quota.

Early production checks are permitted. QA reported nine planned new .mjs paths;
Coordinator approved [exact source-only static argv](t08-s1-coordinator-qa-static-grant.md)
after filename/risk-scope review. QA then reported all nine sources/plan written,
unexecuted. Plan read confirms the scoped risk matrix; private provisioning-path
sanitization was requested. No test correctness/static/behavior pass is inferred.
QA subsequently reported pinned syntax9/9/lint/format green and blocked future-entry
resolution; evidence sanitization is verified. Independent
[QA source review r1](t08-s1-coordinator-qa-source-review-r1.md) REJECTED readiness:
setup errors falsely pass, weak/conditional oracles and missing concrete fixtures/
checks. Focused same-scope source repairs only; no runtime relay. The QA plan also
discloses an initial system-Node invocation; known details requested, not erased
by pinned reruns. Developer receives only the common caller-input/metadata error
clarification added to S1, never QA-private findings.
QA subsequently reported same-nine r1 repairs/static reruns. Independent
[QA source review r2](t08-s1-coordinator-qa-source-review-r2.md) STILL REJECTS readiness:
bootstrap capture/signature error, fixture lifetime issues and missing concrete
owning checks/setup remain. R1 Coordinator stale-descriptor wording was too broad;
common clarification preserves existing all-T04-opening-failure recovery mapping.
Both roles receive that clarification independently; no source findings cross roles.
R2 repair milestone reviewed in [QA source review r3](t08-s1-coordinator-qa-source-review-r3.md):
bootstrap/setup/oracles improved, but missing derived label, lowercase-query oracle,
umask-sensitive metadata fixture, hidden cleanup failure and incomplete refresh
settlement observation still block source readiness. Prior Coordinator fixture-
completeness miss retained. Same-nine focused source repairs only; no runtime grant.
R3 corrections resolve those contract/oracle findings. [R4 narrow safety hold](t08-s1-coordinator-qa-source-review-r4.md)
identifies one remaining setup-error path deleting durable roots without confirmed
profile/runtime release; conservative retention requested, no new testing scope.
Runtime-entry build/import resolution and production gate remain pending.
Final r4 repair verified; [QA source-preparation gate](t08-s1-coordinator-qa-source-gate.md)
APPROVED with nine-file source hashes. All QA windows now HOLD/CLOSED pending a
separate grant; no compiled candidate, complete import-resolution or behavior pass.
Developer production readiness/build and verified isolated environment remain next.
User subsequently instructed continuing without an unnecessary milestone pause.
Coordinator independently reran all four production checks with full/unmasked output
(exit0), but [production source review c0](t08-s1-coordinator-production-source-review-c0.md)
REJECTS safety/contract defects. Focused production-only repairs assigned; QA stays
closed. Coordinator preflight proceeds in parallel within the candidate review:
retained provider executable reports51.1 and ext4/tmpfs/tools are present, but an
initial archive-name selection did not qualify retained package hashes. No provider/
TLS/target or whole-environment pass is inferred; confirmation continues.
Subsequent [environment preflight](t08-s1-coordinator-environment-preflight.md) PASS:
approved archives/extracted bytes reverified, fresh private GNOME51.1 collection/
canary, ext4/pinned tools and actual private-CA loopback HTTPS qualify; daemon/bus
and both owned scopes cleanly torn down. No compiled target/QA suite executed.
Production repairs and frozen runtime relay remain separate gates.
C0 repair readiness received; [production review c1](t08-s1-coordinator-production-source-review-c1.md)
finds three focused guard/precedence issues still blocking source approval. Corrections
assigned within the original source window. Private one-off relay control authored/
syntax-checked for exact seven owning + three unchanged relevant regression files;
no target imports/execution yet.
C1 correction review addresses file/config/recovery findings; [c2 narrow signal hold](t08-s1-coordinator-production-source-review-c2.md)
requires arbitrary abort-reason/intrinsic capture and observed-link identity fixes.
QA separately receives only the common native-signal requirement for a one-file
source-only regression; previous frozen source identity will be explicitly superseded
on review, never silently mutated or treated as a compiled relay. No target execution.
Production c3/focused QA source gate approved; exact c3/f1137-input/10-file relay
executed once:100/101PASS, owning38/39+reg62/62. Original getWorkout error code
UNKNOWN in complete reporter. [F1 adjudication](t08-s1-f1-coordinator-adjudication.md)
identifies invalid finished+empty fixture and Coordinator review miss, not a justified
production change. At exhausted initial window all roles HELD; explicit
[F2 bounded contract](../tasks/t08-s1-f2-work-order.md) then starts fresh QA /new
(confirmed0.0% Contributor/high, same pane/cwd/focus, no trust changes), fixture-only
source fix, checkpoint20/stop30. Original f1 inputs137 hashes unchanged and provider
reaped marker confirmed; failed fixture scopes retained pending approved cleanup.
F2 fixture-only source fix reviewed/rechecked against public finished-aggregate
invariants. New [f2 inventory](t08-s1-f2-artifact-inventory.json)/[one-run relay](t08-s1-f2-coordinator-relay.md):
137 inputs, exactly one fixture file's two blocks changed; other eight QA/assertions,
production refs/compiled/metadata/control unchanged. F1 full observations/pointers
copied separately and preserved before any F2 output; QA executes same exact101-case
selection once in a NEW private scope. No result/acceptance presumed.
Final [c3/f2 independent acceptance](t08-s1-coordinator-review.md):101/101PASS,
owning39+regressions62, zero failed/pending/todo, exact10-file/137-hash identity and
new scope teardown independently verified. Old F1 scopes separately cleared after
preserved original outputs/provider reap/no active owned descriptors checks. ALL
windows CLOSED; [handoff](../handoffs/t08-s1.md), parent T08 incomplete/S2 unassigned.
Earlier opening/repair/relay grants are historical and not renewed. Separate Coordinator production/QA reviews precede any
frozen artifact relay. Target 60–90 minutes, checkpoint at 90, stop at two hours with
an honest partial handoff after safe owned settlement. Readiness is not acceptance.
No automatic context renewal/successor, actual writes, staging/commits or release.
