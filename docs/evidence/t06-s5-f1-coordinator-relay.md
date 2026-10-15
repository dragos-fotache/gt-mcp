# T06-S5 frozen relay t06-s5-f1 — independent owning and parent verification

**Status: OPEN for the TWO exact independent QA selections below ONLY.**
Production c2 and QA r5 sources SOURCE-APPROVED/HELD; ALL source/helper/static/build/
install windows CLOSED.29S5 cases authored/ZERO executed at relay issuance. Source
readiness and fixture qualification are NOT behavioral acceptance. Parent T06
incomplete/T07–T08 blocked. No successor, product writes, staging/commits/release.

[Inventory](t06-s5-f1-artifact-inventory.json):339files,102compiled+237source/spec/
metadata/test/evidence inputs, SHA256:
`25840875112a27d6567b591199ac8b3f37958567ac5ade4700ec3ce93799bac5`.
Coordinator verifier PASS339rows. Source gates: production c2, QA r5, corrected
readiness evidence; active77suite/helper scoped lint/format PASS. Initial rejected
c0/c1 and QA r1–r4 findings remain historical; no retroactive pass.

QA permitted reads: this relay/common work order/lifecycle adjudication, own sources/
QA gates, hash-only inventory and frozen public declarations. NEVER production
source/review/private ADR/emitted JS/maps. Public compiled entries EXECUTABLE through
listed tests, not inspectable as implementation. Hash-only verification allowed.
No source rebuild/repair/extra runtime/import probe from this relay.

## Exact selections and sequencing

Inventory lists EVERY concrete filename; no wildcard/name-pattern filtering:

1. ONCE: `node node_modules/vitest/vitest.mjs run` with exactly owningSuites:
   - test/unit/t06/s5-lifecycle-validation.test.mjs
   - test/fault/t06/s5-lifecycle-races.test.mjs
   Expected authored29cases/2files (11unit+18fault), NOT preclaimed passes.
2. ONLY if owning ALL PASS/zero fail/skip/todo/unhandled/cleanup errors AND339hashes
   stable, ONCE: complete parentSuites60filenames in the SAME inventory, under NEW
   qualified private-provider launcher, invoking:
   `bash "$T04_PRIVATE_LAUNCHER" node node_modules/vitest/vitest.mjs run <ALL parentSuites>`.
   ALL active T06 S1–S5, foundation/T03/T04 unit+fault INCLUDING real isolated provider,
   plus EXACT15active T05 suites from its approved bounded plan. Expected858cases:
   foundation100+T03221+T04123+boundedT05228+T06(S1–S4)157+S529. Expected numbers are
   oracles, not green claims. S529 repeats in final integrated selection; focused29
   plus parent858 are887executions,858distinct cases, not887distinct coverage.

Parent command arrays may be built from hash-verified inventory JSON, not discovery
that silently adds/drops files. Helpers/fixtures closure reviewed;77quality files.
Parked T02/general deferred T05 interception/proxy/calibration remain explicitly
UNRUN/not passed; no npm test/check/directory-wide T05 or whole-repository claim.

ANY owning failure/timeout/unhandled/hash drift/unsafe fixture/cleanup error STOPS
parent execution. Preserve complete original observation; no rerun/repair/extra
suite/import probe without Coordinator adjudication/new named artifact.

## Environment, isolated provider and allowed fixture runtime

Pinned verified disposable T01_NODE_HOME privately supplied; PATH first. Verify
Nodev24.21.0/npm11.19.0 and STOP if absent/mismatched, no ambient fallback/install.
Use NEW QA-owned ext4 /var/tmp scope with disjoint sibling home/tmp/run/cache;
fresh HOME/XDG/cache, UTC, cleared Node/TLS/proxy/DBus overrides. Example placeholders:

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
unset NODE_OPTIONS NODE_COMPILE_CACHE NODE_TLS_REJECT_UNAUTHORIZED NODE_EXTRA_CA_CERTS
unset SSL_CERT_FILE SSL_CERT_DIR DBUS_SESSION_BUS_ADDRESS DBUS_SYSTEM_BUS_ADDRESS
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy NO_PROXY no_proxy
QA_SCOPE="$(mktemp -d /var/tmp/gt-t06-s5-qa-XXXXXX)"
mkdir -m 700 "$QA_SCOPE/home" "$QA_SCOPE/tmp" "$QA_SCOPE/run" "$QA_SCOPE/cache"
export HOME="$QA_SCOPE/home" TMPDIR="$QA_SCOPE/tmp" TMP="$QA_SCOPE/tmp" TEMP="$QA_SCOPE/tmp"
export XDG_CONFIG_HOME="$HOME/config" XDG_DATA_HOME="$HOME/data" XDG_STATE_HOME="$HOME/state"
export XDG_CACHE_HOME="$HOME/cache" XDG_RUNTIME_DIR="$QA_SCOPE/run" NPM_CONFIG_CACHE="$QA_SCOPE/cache"
export TZ=UTC NO_COLOR=1
node --version
npm --version
```

Owning: issued T04 diagnostic persistence/leases and actual test-owned literal-
loopback HTTPS only. Synthetic mutation traffic expressly allowed, no product/live
backend/session/Google/browser/Android/database/host. No personal keyring/bus.

Parent: coordinator reprovisioned SAME approved portable GNOME Keyring51.1/gcr3.41.2
verified archive hashes (see provider preflight); new env-i dbus-run-session/private
foreground secrets daemon, synthetic stdin password, fresh ext4 HOME/XDG/profile
roots. No OS install/hooks/global settings/personal facility. Fixture independently
qualified store/read/clear/unlocked persistent login collection, cleanup green;
production adapter proof remains the ACTUAL provider tests, not qualification.
Private launcher/inner locations supplied privately, no literal locations in repo.
Mandatory private script SHA256s before/after parent:

- launcher: b635af1b5d38abc11122ce222d57ac08f3870693fd131eec906998f6720c621e
- inner: 8abed7b7149dda24a30ae12830d2780bde6292239a0585062e5e04016c151b54

Launcher supplies ONLY fresh private T04_PROVIDER_BUS/PARENT; lock-negative is last,
no unqualified reset/Unlock/GUI. It owns/reaps its daemon/private bus and removes
its issued roots; failed cleanup propagates. Same host libraries as accepted T04,
not self-contained provider packaging or OS-sandbox/power-loss proof.

## Integrity and full observations — mandatory

Before ANY target import and AFTER EACH selection (including failure):

```sh
printf '%s  %s\n' \
  25840875112a27d6567b591199ac8b3f37958567ac5ade4700ec3ce93799bac5 \
  docs/evidence/t06-s5-f1-artifact-inventory.json | sha256sum --check
python3 docs/evidence/t06-s1-verify-artifact.py docs/evidence/t06-s5-f1-artifact-inventory.json
```

Capture FULL stdout+stderr to a fresh owned file BEFORE viewing/summarizing; capture
ACTUAL exit separately (shell set+e for measurement is not masking success). Read
ALL output; retain all failed identities/expected-vs-observed safe error/count facts.
No tail-only/truncation/pass-label guessing. Write sanitized NEW
`docs/evidence/t06-s5-qa-f1-execution.md` BEFORE cleanup/deleting original logs.
Do not persist tokens/IDs/bodies/private absolute paths; use placeholders. Missing
original failure observations BLOCK acceptance; do not reconstruct by rerunning.

Safely settle all owned calls/commits/gates/responders/listeners; no force-killing
begun durability. Close owners/facilities/servers; remove ONLY QA-owned run roots.
All cleanup failures propagate. Frozen source/spec/readiness files MUST NOT change;
new execution evidence only. Send asynchronous concise result/exits/counts/hash/
cleanup/limitations to coordinator/w4:p2K, then HOLD ALL runtime/source actions.

## Checkpoint and final acceptance

Original checkpoint90/STOP120 remains; roughly95minutes of Coordinator work at
relay preparation. Keep remaining run bounded; stop with safely settled partial
handoff if time insufficient, never weaken checks/auto-renew. Source-role clocks
are not renewed by relay. No automatic successor/context restart.

Coordinator final clean allowlisted locked source reproduction requires
npm ci --ignore-scripts/four production checks/SAME selections/active77quality/
stable sources and102identical compiled files, plus small isolated ten-export inert
import smoke/source audit. These remain OPEN, not accepted by issuing this relay.
Real backend/browser/Google/host/config guard/deletion/profile cleanup/release gates
stay separate. Parent T06 done/T07–T08 ready ONLY after integrated acceptance.
