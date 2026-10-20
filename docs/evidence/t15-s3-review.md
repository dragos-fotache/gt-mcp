# T15-S3 — Process integration and parent acceptance review

**Disposition:** accepted/closed with parent T15 on 2026-10-16.
[Work order](../tasks/t15-s3-work-order.md), [settled plan](../decisions/t15-plan-and-slices.md)
and [exact selection](t15-s3-selection.json) govern. S1/S2 stay closed. Primary-agent
review with bounded source/oracle review, not independent T20 certification.

## Delivered boundary and requirement-to-evidence map

No production behavior/interface changes were needed. Three small process test
files exercise the actual compiled entry with the official SDK client/framing,
actual private Secret Service/ext4 and T06/T05 private-CA loopback HTTPS.
Independent observations include synthetic request method/route/body/key and
decrypted durable operation records after ownership release. Scripted HTTPS is
not real backend/DB/idempotency/Android evidence.

| Requirement/risk | New process evidence | Reused/selected boundary evidence |
| --- | --- | --- |
| Sole strict startup permission, M01–M03/C03/C09/C11 | policy-identity: omitted/false, true, null/number/string fatal startup, no-config, client metadata/annotations/extra argument/env/CLI attempts; reads remain usable; no disabled admission/mutation | Complete T08 catalogue/validation/config/stdio; retained S1/S2 policy and immutable file snapshot |
| Operation identity/receipt, C05/C06/C08 | policy-identity: one saved receipt for identical repeat, changed intent refusal, distinct explicit ID/root | T09 admission/identity, T10 execution and T03 normalization/result/schema |
| Explicit uncertain replay, C12/R05/R06 | lifecycle: malformed populate, durable draft confirmation, release/sign-out/same-account login, explicit same-operation exact method/route/bytes/key replay, skips confirmed draft; startup/initialize sends nothing | Full T11 owning/crash/terminal/minimization plus relevant T09 persistence/T10 executor/fresh |
| Lost final MCP reply, C05/C12 | recovery-stop: saved reply deliberately withheld from SDK call, independent durable receipt after exit, reopen alone inert, explicit repeat original IDs/receipt with live authorization and no mutation | T11 stable receipts and final authorization |
| Terminal rejection, C05 | recovery-stop: actual409 invalid_state at populate, definitive compact receipt, fresh session replay unchanged with no further mutation | T11 terminal replay/privacy; S2 canonical mapper/errors |
| Cancellation/effective disable, A07/C10 portable/C11/R05 | recovery-stop: pre-dispatch SDK cancel, dispatched held request socket closes before shutdown; EOF0/SIGTERM143 settle/release; dependent steps stay unsent; stop/false/relaunch denies continuation and preserves evidence, explicit true re-enable replays original draft identity | S1 acknowledged admission history; S2 late-result/budget/suppressed delivery; full T08 framing/backpressure/lifecycle |
| Auth/lifecycle privacy, A07/A09/R06 | policy-identity denied saved-receipt replay; lifecycle owner blocks trusted CLI, sign-out has no private IDs/history, same-account new session permits explicit recovery, unresolved retirement rejects same/changed intent, removal/reconciliation yields empty distinct generation/false policy | Full T11 current-binding privacy, selected T12 sign-out/retirement/removal/integrated journey/disclosures and T08 stale descriptor |
| Complete results/diagnostics, M10/A09 | Process SDK canonical structured/text/isError checks; child stdout parsed with official framing, parse errors fail; fixed stderr/exit dispositions | S2 output-size/recovery preservation and full T08 result/framing/startup plus T03 output schemas |

C01/C02 complete bodies/defaults/repeated references and C04 invisible references
are independently asserted in the selected S1/T03/T10 checks; C07 same-operation
serialization and cross-process exclusion are asserted by selected T09 and full
T11. These are portable integration proofs; named Pi C10 remains T17 and real
backend/domain/race/sync proofs remain T16.

Creation internals/per-step fault permutations remain T09–T11-owned; the final
selection reruns full T11 and relevant T09/T10 checks. No new general-purpose
fault/interception framework, production fault switch or dependency was added.
Test process transport owns its child and uses official SDK ReadBuffer/
serializeMessage/Client so silent client shutdown escalation cannot pass as EOF.
The bounded run scripts replace missing disposable runner artifacts, reuse T08
preparation and report exact selection/hash/results. They never use an ambient
secret bus or change the agent shell HOME/system settings.

## Development findings retained

The former disposable toolchain/runner were absent. Initial discovery only found
system Node26.11.1/npm12.2.0; no build/install/test used those versions. Restored
Node24.21.0/npm11.19.0 under a disposable directory after official archive SHA256
verification. Restored gnome-keyring51.1-1/gcr3.41.2-2 by extracting public Arch
packages, never installing globally. A fresh owned bus/provider is qualified by
unlocked collection and actual libsecret store/read/clear for every run; roots
must be on ext4; HTTPS uses a fresh private self-signed test CA certificate.

First lifecycle run1/1 passed with583 stable hashes. First full new S3 run6/10:
fixture supplied a nonexistent backend concurrent_modification code (that MCP
code is an adapter decision), receipt oracle expected only admission auth rather
than admission plus delivery authorization, and initial confirmation was expected
as a none marker instead of null. Corrected from backend service-protocol/shared
creation semantics and the settled journal format, without changing production.
Independent read-only review identified SDK close fallback and stop-masked
cancellation oracles; replaced them with actual child exit disposition and held
response socket closure before release/stop. Scoped lint caught missing explicit
node:timers imports during this refinement; repaired. r2 passed8/10 (the two
authorization-read replacements were still missing); r3 passed10/10 with584 stable
hashes and cleanup. Replay oracle now requires a nonempty sequence solely of
live authorization reads, without fixing private call counts. The28.3s lifecycle
journey has a60s final test timeout; production budgets are unchanged.

Final source/oracle review found no demonstrated production integration defect
or unresolved blocking oracle defect. Existing launch/login notes correctly state
startup snapshots, stop/await/update/relaunch, no startup continuation, stable
operationId/intent retry, indefinite unresolved retention, host transcripts and
separate external gates; no operator behavior correction was required.

First integrated replay passed444/446 in48 files with stable hashes; the two
unchanged configured-policy checks failed before preparation because the restored
runner had not supplied GT_S2_ISOLATION_CONFIRMED and its private-bus/root/TLS
aliases. Added only those qualified fixture aliases; no existing test expectation
or production behavior changed. The unchanged focused file passed2/2, and the complete final replay passed446/446
with584 stable hashes and owned cleanup; clean locked replay is in progress.

## Final integrated acceptance

Production typecheck/lint/format/build and scoped authored/changed test lint/
format/syntax checks passed on the final candidate. The focused unchanged T08-S2
file passed2/2 after qualified fixture aliases were restored; the final identical
48-file selection then passed **446/446** on workspace and clean locked
snapshot, **30 T15 owning + 416 relevant regressions**, zero failed/skipped/pending/
todo. All 584 workspace source/test/config/emitted hashes stayed identical.
Clean npm ci --ignore-scripts and all four production checks passed; all 388
copied source inputs matched workspace and remained unchanged, and all 194
emitted outputs were byte-identical. Fresh provider/libsecret qualification,
private roots/TLS and owned provider/bus/root/snapshot cleanup passed. No build/
install raced tests. All accepted S2 production/emitted inputs still match;
only its shared T15 fixture changed. No production repair was needed.

See [inventory](t15-s3-artifact-inventory.json), [clean result](t15-s3-clean-reproduction.json),
[environment](t15-s3-environment.json), [exact selection](t15-s3-selection.json) and
[handoff](../handoffs/t15-s3.md). All S1–S3 and parent T15 are accepted/closed; no
successor or external/independent gate is opened or waived.

## Changed paths and limits

New test/create-stdio/: helpers.mjs, policy-identity.test.mjs,
recovery-stop.test.mjs, lifecycle.test.mjs, run.mjs and run-isolated.py.
Narrow extension test/fault/t15/s1-helpers.mjs adds synthetic trusted auth routes/
login configuration, mutation-only invalid_state rejection, held-response close
gate and inspection/open capability for fresh bindings. Existing S1/S2 assertions
and default behavior remain. New task/selection/clean procedure/review/inventory/
handoff and current status documents describe the outcome. No production,
contract, dependency/manifest/lockfile/compiler, .pi, staging or commit changes.

T16 real backend/DB/Android, T17 named Pi, T18 packaging, T19 Google/browser and
T20 independent security/release remain separately assigned/unrun. T06 omissions,
T04 restore/erasure limits, parked T02 and retired T13/T14 remain. No actual writes,
release or automatic successor is authorized.

## Safe commands and reproducibility

```sh
export T01_NODE_HOME=/tmp/gt-t15-s3-tools/node-v24.21.0-linux-x64
export PATH="$T01_NODE_HOME/bin:$PATH"
node --version
npm --version
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
node node_modules/eslint/bin/eslint.js test/create-stdio test/fault/t15/s1-helpers.mjs
node node_modules/prettier/bin/prettier.cjs --check test/create-stdio test/fault/t15/s1-helpers.mjs
node --check test/create-stdio/helpers.mjs
node --check test/create-stdio/policy-identity.test.mjs
node --check test/create-stdio/recovery-stop.test.mjs
node --check test/create-stdio/lifecycle.test.mjs
node --check test/create-stdio/run.mjs
python3 test/create-stdio/run-isolated.py "$T01_NODE_HOME/bin/node" /tmp/gt-t15-s3-provider/usr/bin/gnome-keyring-daemon /tmp/gt-t15-s3-provider/usr/lib docs/evidence/t15-s3-selection.json /tmp/gt-t15-s3-final
python3 docs/evidence/t15-s3-clean-reproduction.py
```

The [bounded clean procedure](t15-s3-clean-reproduction.py) checks the green stable
workspace inventory, copies only captured non-dist source/test/config inputs to a
fresh disjoint ext4 snapshot, starts with no node_modules/dist, uses isolated empty
npm configs/cache, runs npm ci --ignore-scripts and four production checks, then
the same 48-file replay with a fresh qualified private provider. It compares emitted
bytes and source hashes before/after, and removes its owned snapshot. Disposable
artifact paths are not personal profiles; availability/provenance must be reverified.
Python syntax was checked with compile() without retaining cache files. Final
Markdown-link QA and git diff --check pass. No production/test changes followed
final acceptance.
