# T06-S3 coordinator acceptance — c1 / t06-s3-f1

**Disposition: T06-S3 DONE, bounded internal acceptance. Parent T06 INCOMPLETE.**
All S3 source/helper/build/install/target/fixture/rerun grants CLOSED; Developer
and QA HOLD ALL actions. S1/S2 remain accepted/closed; S4/S5 unassigned. No automatic
successor/context renewal, product writes or release. This closure supersedes
historical opening/repair/relay grants WITHOUT changing frozen bytes.
[Accepted handoff](../handoffs/t06-s3.md).

## Independent accepted evidence

- Frozen [269file inventory](t06-s3-f1-artifact-inventory.json), production c1,
  independent QA r1-repairs approved; SHA256
  `92e4dbaafbee306425d7e719023d6c7ce5b3d4f4675ec6d6a39b4de3794d88b3`.
- [QA f1 execution](t06-s3-qa-f1-execution.md): exact owning3files33/33PASS,
  then unchanged regression15files169/169PASS (S151+S240+T04unit54+T05hooks24).
  Both exit0; zero failures/skips/todos/timeouts/unhandled/cleanup errors reported.
  Three before/after checksum/269row checkpoints stable. Owned diagnostic storage/
  TLS/gates settled naturally; fresh sibling HOME/TMPDIR/run roots removed, no residue.
- Coordinator [clean locked-source reproduction](t06-s3-clean-source-snapshot-result.json)
  using [explicit allowlisted procedure](t06-s3-clean-source-snapshot.py):171source
  inputs, fresh disposable HOME/XDG/temp/cache and empty npmrc; pinned
  npm ci --ignore-scripts, typecheck/lint:production/format:check:production/build,
  SAME owning33+regression169 and scoped S3 QA ESLint/Prettier ALLexit0/PASS.
  All98compiled files byte-identical to frozen candidate,171source hashes unchanged,
  original269rows stable and disposable scope removed successfully.
- Source inventory SHA256
  `d7da996e21552c9c9e9377ac32f7cf1d54ef4e006c879b70429048d6372bc469`.
- Coordinator [small isolated import smoke](t06-s3-import-smoke-result.json),
  [procedure](t06-s3-import-smoke.py): exact seven exports/versions1/2,
  natural exit0 in121ms, empty stderr, HOME/temp unchanged/empty and removed,
  269stable hashes. Combined with production source audit; NOT comprehensive
  interception, power-loss or OS-sandbox proof. Final coordinator checksum and
  269row verification after clean reproduction PASS.
- Node24.21.0/npm11.19.0/Vitest4.1.11. No install lifecycle hooks, runtime/package
  upgrades or personal provider. Clean install reports0vulnerabilities; upstream
  node-domexception deprecation/npm upgrade notice retained, no upgrade performed.

202tests is this explicit slice selection, NOT npm test/check or whole repository
acceptance. ALL accepted S1/S2 owning suites selected. Foundation/T03/full real
provider/transport and integrated S4/S5 gates remain parent T06 final requirements;
accepted dependency source/compiled bytes unchanged. Parked T02/deferred T05 work
preserved, unexecuted/unpassed here. Slice acceptance does NOT unlock T07/T08.

## Retained findings and process deviations

Production [c0](t06-s3-coordinator-production-source-review-c0.md) found a terminal
clock callback could abort leader yet resolve the shared fresh-recovery outcome
for live followers. [c1](t06-s3-coordinator-production-source-review-c1.md) verifies
post-clock leader/fence/identity repair and independent four production checks.
QA's new public durable-boundary regression independently proves both leader/live
follower interruption after callback abort, retained installed grant and no third
request. Failed source readiness was not executed or relabeled as a runtime pass.

QA [r1 review](t06-s3-coordinator-qa-source-review-r1.md) rejected dropped TLS capture
record/req.body misuse, unresolved failure-path gates/hidden secondary cleanup,
commit-invocation-only durability oracle and missing post-clock/definite409 risks.
[QA repair evidence](t06-s3-qa-repairs-r1.md) and [source gate](t06-s3-coordinator-qa-source-gate.md)
verify fixes, small combined real commit-ack/durable-state/cancellation case and
post-clock/409 regressions. Initial30case inventory/incorrect clock claim retained
with explicit correction; final33case count is not an erased failed test. No
compiled QA attempt failed; first named frozen owning/regression execution green.

Developer disclosed initial out-of-grant built-entry import diagnostic, despite
initial no-custom-runtime statement. ADR/c1 review retain it; not repeated in repair
and NOT behavioral acceptance. Explicit HOLD/no-diagnostic caution sent. Only later
Coordinator isolated smoke supplies permitted independent import observation.
Opening Coordinator ambient version-only probes (no project execution) also retained
in [start evidence](t06-s3-coordinator-start.md), never supported-runtime acceptance.
All project checks then used the verified disposable pin. No role-private source/
implementation/test oracle was cross-role input; shared terminal-clock clarification
is specification-level and preserves normative behavior. Shared contracts unchanged.

## Accepted public outcome and limits

Frozen [S3 public work order](../tasks/t06-s3-work-order.md) adds ONLY
openRecoverableRefreshSessionState at dist/auth/index.js and the
RecoverableRefreshSessionState type. Seven runtime exports total; existing S1/S2
factories/behavior/version constants unchanged. New facade: captured binding,
rotateRefresh(captured,signal), recoverRefresh(captured,signal), permanent invalidate.
No grant/token/key getter, public sender/hooks, automatic opening IO or new version.

Existing S2 rotate still refuses pending. New explicit recover replays original
durable token/body/auth key without preparation/rekeying, including locally expired
predecessor. Same-account lossless original grant atomically installs with pending-null
BEFORE at most one distinct freshly durable rotation for expired access. No-pending
expired-access/live-refresh state covers restart gap without volatile marker; live
access+refresh is read-only no-op. Fresh expired-access result installs then reports
reauthentication_required instead of looping; no extra key/request in that cycle.

Same-kind callers share entire cycle; follower cancellation local, leader owns
network/commit settlement. Different-kind overlap rejects without damaging leader.
All unsuccessful replays preserve original evidence; unsuccessful distinct attempts
retain their own recovered predecessor/identity. Definite409 never proves settlement.
Strict invalid account/legacy precision fails closed, no rounding/adoption/cleanup.
Begun commits finish without rollback/late success; post-clock leader abort propagates
to live followers. Binding/generation/opaque operation bytes unchanged.

Durability evidence uses actual public stored record observation while a real commit
acknowledgement is held, not invocation ordering alone. Lost-response close/reopen
and directly seeded gap prove durable/no-volatile-marker behavior, not crash/power-loss.
T04 diagnostic persistence and owned HTTPS are real isolated component boundaries,
NOT real backend/provider or complete authenticated-server proof. Resource401
orchestration (S4), trusted lifecycle/race closure (S5) and parent integrated gates
still required before safely delivered server/authentication acceptance.

Root/server/CLI/companion remain inert; no writesEnabled guard/wiring, creation,
Google/browser/backend/database/Android/Pi/package/release interoperability.
No actual product writes/private/live state, .pi/settings edits, staging/commits,
publication/deployment or automatic S4/context succession. T09 ready/unassigned,
T02 parked/incomplete, T13/T14 retired.
