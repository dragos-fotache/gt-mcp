# T04 coordinator start — design authorized, execution gated

## Authority and prerequisite boundary

User asked to start T04, then explicitly selected Linux Secret Service and fresh
Developer/independent QA via Herdr in existing panes. Coordinator claims T04 in
its task and task index. Design brief/work order open proposal/QA planning only;
no implementation API, production execution, storage acceptance or successor grant.

T01 accepted foundation and bounded T03 acceptance are recorded in their unchanged
coordinator evidence. T03 reported 221/221 owning tests, 100/100 foundation and
clean locked source-snapshot install/production checks. Those are prior evidence,
not tests rerun in this session. T02 remains parked/incomplete; T13/T14 retired.
Shared MCP draft0.2 working-tree revision and backend v1 authority are unchanged.

## Initial environment observations

- Current Herdr caller: w4:p2K in w4:t1. Existing right-hand panes w4:p2G and
  w4:p2H contain foreground interactive zsh shells, no recognized agents.
  No panes/tabs/workspaces/worktrees were created or closed; focus preserved.
- `HERDR_ENV=1`; current CLI syntax and role layout inspected once for startup.
  Fresh `developer`/w4:p2G and `qa`/w4:p2H started successfully. Herdr returned
  `interactive_ready:true`, idle, and cwd at the repository for each. Both were
  launched with `pi --model meta/muse-spark-1.3-contributor --no-mcp --no-approve`,
  without continue/resume. No previous conversations were resumed.
  Coordinator was named `coordinator` at w4:p2K. Two asynchronous planning-only
  prompts were submitted successfully; submission alone does not prove completion.
  Developer writes its proposal only; QA writes its independent plan only. No
  output/status polling or waits were used; readiness arrives by agent messages.
- `T01_NODE_HOME` is unset. Bounded disposable-runtime inventory did not locate
  the historical provisioned toolchain. An unrelated cached runtime was inventoried
  but neither executed nor adopted. Production execution is blocked pending the
  approved Node24.21.0/npm11.19.0 disposable facility; no system runtime fallback.
- Installed binary inventory: secret-tool, flock, dbus-run-session, busctl, gdbus,
  compiler/pkg-config. Package metadata: libsecret0.21.8.2-1,
  util-linux2.42.4-1, D-Bus1.16.2-1. No gnome-keyring provider binary/package found
  in the bounded inventory. This is not an exhaustive provider search or a
  Secret Service availability/compatibility claim.
- No session bus/keyring was contacted, no key material read/generated/stored,
  no real private profile provisioned, no backend/browser/Android access.
  An isolated provider/private bus/disposable HOME-XDG fixture remains unprovisioned.

## Planning source review

Read normative MCP authentication/recoverable-creation requirements, public shared
scenarios, architecture, verification, T01 public foundation spec, T03 accepted
handoff and work order, package/build metadata and provisional typed boundaries.
Public design brief records fail-closed requirements and unsettled interface/OS/
crypto/lock/durability/external-fence decisions. QA receives only public specs.

External fetched sources: Secret Service draft index and secret-tool manual.
The manual says lookup can unlock items and selects the first unlocked match;
therefore naive lookup is not approved for noninteractive unique-key fail-closed
semantics. A flock manual fetch failed, providing no source evidence. No settings
were changed to enable fetch fallbacks.

## Commands and limitations

Safe preparation commands: `git status --short`, bounded `find`/`rg`/inventory,
Herdr help/list/process-info for the existing startup topology, command paths,
read-only OS package metadata and public documentation retrieval.
Some optional inventory commands returned nonzero for missing paths/packages;
those results are absence/limits, not passing gates. Initial Herdr command-group
help exited2 and stopped that `&&` chain; subsequent discovery used documented
syntax. No baseline, install, typecheck, lint, format, build or tests have run.

No `.pi` edits, production/test source edits, shared-contract edits, credentials,
raw private bodies/identifiers, staging, commits or actual product writes.

## Subsequent coordinator review

Both fresh agents reported planning readiness and model confirmation; role reports
and coordinator review are in [design review](t04-coordinator-design-review.md).
The missing-toolchain blocker was then resolved via SHA256-verified official
runtime reprovisioning. Coordinator independently repeated locked install,
typecheck/lint/format/build, foundation100/100 and T03221/221 successfully.
These subsequent baseline checks supersede the initial no-checks observation
above; no T04 implementation acceptance or QA artifact relay. Design revisions
and isolated actual Secret Service provisioning remain open.

## Required next gates

1. Developer proposal and independent QA plan, no cross-role implementation reads.
2. Coordinator-approved concrete public API/design/dependency decision.
3. Restore approved disposable toolchain; provision/verify isolated Secret Service
   test facility without touching personal keyring or installing global packages.
4. Baseline checks, explicit implementation/test-source windows, frozen artifact
   relay and independent acceptance. Unavailable facilities remain blockers.
