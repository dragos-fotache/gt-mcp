# T06-S4 coordinator acceptance — production c4 / t06-s4-f3

**Disposition: T06-S4 DONE, bounded internal acceptance. Parent T06 INCOMPLETE.**
ALL S4 source/helper/static/build/install/target/fixture/rerun grants CLOSED.
Developer/QA HOLD ALL; S1–S3 accepted/closed, S5 unassigned/T07/T08 blocked.
[Accepted handoff](../handoffs/t06-s4.md). Closure supersedes historical opening/
repair/relay permissions WITHOUT changing frozen work-order/source/inventory bytes.
No automatic successor/context renewal, product writes, staging/commits or release.

## Independent final evidence

- Frozen [f3 inventory](t06-s4-f3-artifact-inventory.json):289files, production c4,
  independent r3+saved-list+default-query QA repairs approved; SHA256
  `3321b8e343a5fd548b54272c88b7b7d4672e066975010fc7f9614a12a63216e2`.
- [QA complete f3 execution](t06-s4-qa-f3-execution.md):33/33owning in3files,
  then202/202unchanged regressions in18files, both exit0, zero fail/skip/todo/
  timeout/unhandled/cleanup errors reported. FULL runner output retained before
  summarization; no tail-only capture.289row/checksum checkpoints stable before/
  after each selection; owned isolated roots removed with no residue.
- Coordinator [clean locked-source reproduction](t06-s4-clean-source-snapshot-result.json)
  via [explicit allowlisted procedure](t06-s4-clean-source-snapshot.py):189source
  inputs, fresh disjoint source/HOME/XDG/temp/cache and DISTINCT empty user/global
  npmrc files. Checked Node24.21.0/npm11.19.0; npm ci --ignore-scripts, four production
  checks/build, SAME33owning+202regressions, scoped S4 QA ESLint/Prettier ALL exit0.
  Zero skipped owning/regression cases; exact33/202 and3/18pass counts verified.
  ALL100compiled files byte-identical to frozen c4/f3,189source hashes unchanged,
  original289rows stable and disposable scope removed successfully.
- Source inventory SHA256:
  `f97ce3e013ff4518feef6227c4f17f6b21ca29f1bae8e9106ee4b5864d163abd`.
  Clean procedure SHA256:
  `b51a3c0478eb7200be311b67a68667bfbeac4fb910206cba48529c8ad761863c`.
- [Small isolated import smoke](t06-s4-import-smoke-result.json),
  [procedure](t06-s4-import-smoke.py): exact8runtime exports/versions1/2, natural
  exit0 in131ms, empty stderr, empty HOME/temp removed;289hashes stable. Source
  audit included; NOT comprehensive interception, OS sandbox or power-loss proof.
- Final Coordinator checksum/ALL289row verification and clean-proof/import-result
  assertions PASS. Pinned Vitest4.1.11. Clean install reports0vulnerabilities;
  node-domexception deprecation/npm upgrade notice retained, no upgrade performed.

235tests is this explicit owning/regression selection, NOT npm test/check or whole
repository green. ALL accepted S1–S3 owning suites included; full foundation/T03/
real provider/full transport/integrated lifecycle gates remain final parent T06
requirements. Parked T02/deferred T05 work preserved, unexecuted/unpassed here.
No T07/T08 unlock, actual backend/Google/browser/Android/Pi/release acceptance.

## Retained failures, review misses and observation limits

Production c0–c3 source reviews rejected incomplete active-auth/vault-transition/
revision/terminal-delivery/error-priority handling; c4 source-approved after repairs
and independent four production checks/157stable rows. Initial readiness and ADR
§10–§10.9 history retained; no production behavioral diagnostic was Developer input.
Independent QA source r1/r2/r3 reviews required fixture/ordering/settlement/durable-ack/
unsafe-origin/tautology/timer corrections; same cases retained without a broad matrix.
Only specification-level decisions crossed role boundaries.

[f1 original execution](t06-s4-qa-f1-execution.md):28PASS/5FAIL, regressions202UNRUN,
281hashes stable. [Adjudication](t06-s4-f1-adjudication.md) found list-routine fixture
items incorrectly used default isDraft:true despite the non-draft list contract.
Coordinator source review missed that membership invariant. FOUR explicit fixture
isDraft:false overrides corrected stimulus only; mutation drafts stayed true.
No decoder/contract/production weakening or failed-case deletion.

[f2 original execution](t06-s4-qa-f2-execution.md):30PASS/3FAIL, regressions202UNRUN,
284hashes stable. One retained failure expected queryless /v1/routines despite
specified default limit20. [Available-record adjudication](t06-s4-f2-adjudication.md)
found THREE independent queryless oracle defects, corrected to EXACT specified
/v1/routines?limit=20; case/count/other oracles unchanged, mutation POST stayed
queryless. Coordinator source review also missed these target expectations.

**TWO original f2 failed-case identities remain UNKNOWN/irretrievable:** QA's
in-shell tail pipeline never captured complete stdout. [Observation supplement](t06-s4-qa-f2-observation-completion.md)
withdraws unverified per-case pass labels. Those missing outcomes are NOT reconstructed,
assigned to source defects, declared fixed or retroactively passed. This historical
observation limit is permanent. NEW f3 full-capture evidence over ALL SAME33cases
and independently repeated235checks governs current-artifact acceptance; no hidden
exclusion. Both failed inventories/results and supplemental records remain intact.

Coordinator initial clean attempt [R1 failed result](t06-s4-clean-source-snapshot-r1-result.json)
and [original procedure](t06-s4-clean-source-snapshot-r1.py) retained: npm --version
exit1 because the SAME empty npmrc was double-loaded as user/global. Stopped before
install/build/tests; production/frozen hashes unchanged. Original report conservatively
left cleanup unclaimed; Coordinator separately observed zero remaining owned clean
scope prefixes. Procedure-only repair uses DISTINCT empty config files; unchanged
artifact then passed the complete clean proof. No failed command counted green,
root/system npm config edit or lifecycle hook enabled.

## Accepted internal outcome

Frozen [S4 work order](../tasks/t06-s4-work-order.md) plus
[common adjudication](../decisions/t06-s4-interface-adjudication.md): additive
openAuthenticatedSessionState, AuthenticatedSessionState and
AuthenticatedResourceTransport types.8runtime exports total; flat binding/nine
T05 resource methods/invalidate ONLY, no public token/grant/hooks/control/sender
capability. Existing S1–S3 APIs/errors/vault v1/v2 behavior preserved.

Read-only factory captures trusted same-origin transport config/exclusive T04 owner/
epoch clock; no migration/key/network/open-time refresh/operation reads. Resource
entry captures detached binding/query/IDs/body/key before await/local validation.
Pending exact S3 recovery priority precedes bearer; at most one shared auth cycle
per preflight/reactive stage, each bounded under S3 exact replay/install-before-
distinct-rotation rules. Auth failures preserve private evidence; no adoption/deletion.

Only validated delivered401 permits one refresh-and-retry, with unchanged effective
method/route/query/body/resource key and captured account/generations. Actual bearer
revision deduplicates concurrent/delayed older401s; repeated401/unresolved auth needs
reauthentication. Per-leg T05 attempts capped1 AFTER validating original config;
no transient retry multiplication/aggregate deadline claim. Result metadata is final
leg only. Same-binding auth rotation is not lifecycle replacement.

Private auth admission/owned read provenance/cancellation fences, follower-local and
leader-shared interruption, awaited begun commits and inline current-session final
checks prevent late delivery without rollback. Suppressed mutation success retains
safe dispatched/outcomeUnknown; local invalidate is synchronous/permanent/cancels
owned network, NOT durable sign-out. Stale pre-dispatch admission may fail closed;
no automatic in-call worker/re-admission. No background interactive login.

## Closure and remaining scope

Parent T06 remains incomplete. T06-S5 must settle trusted lifecycle/sign-out/same-
account replacement/best-effort logout/opaque evidence retention and integrated race
closure, then full relevant parent owning/provider/transport/foundation/T03/clean
gates. S5 requires a NEW explicit decision-ready assignment, not this acceptance.
T09 remains ready/unassigned; T02 parked/incomplete/T13–T14 retired.
No config-file guard/MCP/CLI/creation/journal/browser/backend/release delivery,
actual writes/private/live state, .pi/settings/trust changes, staging/commits/deploy
or automatic successor. ALL S4 windows CLOSED, agents HELD.
