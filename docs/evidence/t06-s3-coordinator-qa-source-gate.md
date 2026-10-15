# T06-S3 QA source gate — r1 repairs approved

**Disposition: independent QA sources SOURCE-APPROVED / HELD.**
Production c1 separately approved/HELD. No runtime results or acceptance yet;
QA execution requires the exact named frozen relay, never a blanket run.

Reviewed all four repaired S3 sources (16unit+10replay+7concurrency=33declared
cases), repaired-source evidence, prior r1 findings and accepted QA helper callback
contract. Sources derived from public S3 specs, not production implementation;
role-private production review never supplied to QA. Initial30cases/source rejection
and corrected prose remain preserved, not retrospective executed failures/passes.

## Verified repairs and independent oracles

- Existing TLS helper third capture argument retained; body parsed from record.body,
  not raw req.body. Responders no longer contain orphan expect assertions. Synchronous
  handler failures captured/destroyed into owning-test results; owned delayed response
  gates are resolve-only and use captured synthetic response material.
- All gates registered/released on body/teardown paths before awaiting owned facade/
  actual storage work. Actual storage commits tracked independently from held
  acknowledgements. Current facade/owner closed before facility cleanup; server close
  bounded. combineFailures preserves both primary/secondary teardown errors. No
  accepted helper edits or general interception framework.
- Real recovered-install acknowledgement held; actual recovered grant/pending-null
  read through isolated storage while leader remains unresolved and no distinct
  request. Abort remains unresolved until acknowledgement release; then interruption,
  installed grant retained and no rollback/second dispatch. Invocation spy honestly
  labeled ordering-of-calls only, not standalone durability proof.
- Post-clock regression arms trusted callback only after observing actual durable
  fresh-result grant while acknowledgement held. Both leader and live follower must
  interrupt after release; installed grant remains and request count stays two.
  No private function or clock-call-count oracle. Three public vault commits describe
  the settled replay-install/fresh-prepare/fresh-install successful path.
- Definite409 idempotency_key_reused retains original predecessor/body/key; explicit
  repeat sends identical identity and remains safe TransportError, not settlement.
- Existing exact loss/reopen, expired predecessor, bounded follow-on, no-pending gap,
  no-loop, malformed/account/legacy responses, follower-local cancellation,
  mixed-kind and foreign invocation behavior remain independently specified.
  Direct gap seed is durable-state/no-volatile-marker proof, NOT crash/power-loss proof.
- Source-ready misleading clock claim corrected explicitly and private provisional
  toolchain path redacted; original source readiness not relabeled runtime evidence.

Coordinator pinned Node24.21.0/npm11.19.0: node --check x4, scoped ESLint, scoped
Prettier ALLexit0. Static source-only relative import existence PASS without executing
compiled target. Source count33verified. Production c1 four reviewed source hashes
stable;252/257accepted S2 rows unchanged, five authorized entry/ADR/compat differences
only. All accepted S1/S2 tests/helpers unchanged. No compiled suite/HTTP/provider run.

## Limits and next gate

Core risk-based selection with real isolated diagnostic storage/TLS, not backend,
Secret Service requalification, Google/browser/Android/host/stdio/release proof.
No exhaustive timeout/fault cross-product or OS sandbox claim; privacy/post-clock
source audit supplemented by small coordinator import smoke later. Parent T06
provider/transport/integrated S4/S5 regressions remain required.

Freeze named artifact with reviewed production, declarations, common specs and
independent owning/regression inputs. Open exact owning33 then unchanged169selection
only if owning/hash/cleanup pass; retain any failures and stop without new repairs/
reruns absent adjudication. Both roles otherwise HELD; no build race/successor.
