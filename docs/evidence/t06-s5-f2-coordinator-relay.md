# T06-S5 frozen relay t06-s5-f2 — fixture-only regression repair

**Status: OPEN for exact focused15 then SAME parent859 ONLY.** All production/QA
source/helper/static/build/install windows CLOSED/HELD. F1 execution CLOSED;
its source/inventory/relay bytes unchanged and its two failures remain historical.
[Adjudication](t06-s5-f1-coordinator-adjudication.md) confirms Coordinator launcher
prerequisite errors, not a test/production/contract repair. Parent T06 incomplete.

NEW [inventory](t06-s5-f2-artifact-inventory.json):341files,102compiled, SHA256
`f76749257bb40ffebcb16fa86a29016596acac826a5a1715522ad3f92f07a6bd`.
ALL339original f1 input hashes and SAME60parent filenames unchanged; two new
adjudication/f1-observation inputs added. Independent f1 owning30/30 already green;
no test added/dropped. Authored counts recalibrated from same sources:11unit+
19fault=30S5; parent859, not old29/858. Old metadata mistake is preserved/withdrawn,
not retroactively passed. No parent acceptance from source/fixture readiness.

## Exact QA runtime — no source action

Read this relay/adjudication and own/public specifications/hash-only metadata,
NOT production source/review/ADR/emitted implementation. Before any target and
AFTER EACH run verify inventory SHA and all341rows with the unchanged S1 verifier.
Mandatory private wrapper SHAs before/after:

- launcher:9098ff72d9140f63d4d8d690704f74a4a5b627bf65fbb3d048fd49833ef7d222
- inner:87f0ff35bd5a1c1b7fb5ff2a518303e43894d24bbea8f3345154c30dbe65b360

Node24.21.0/npm11.19.0 via privately supplied T01_NODE_HOME, no ambient fallback.
NEW private provider instances each selection; repaired wrapper sets umask0077,
NEW owned TMPDIR/TMP/TEMP on tmpfs under /tmp, DISJOINT from NEW ext4 HOME/XDG/run/
T04_PROVIDER_PARENT under /var/tmp. Cleared inherited Node/TLS/proxy/DBus overrides;
env-i private dbus-run-session/foreground pinned provider51.1, synthetic stdin
password, no personal bus/keyring/GUI/reset/system install. Requalified store/read/
clear/safe copy posture and owned cleanup; public integration assertions UNRUN.

1. ONCE with qualified wrapper:
   `bash "$T04_PRIVATE_LAUNCHER" node node_modules/vitest/vitest.mjs run`
   plus EXACT inventory.focusedSuites:
   test/fault/t04/filesystem.test.mjs (6cases) and
   test/fault/t04/provider.test.mjs (9cases). FULL files, no name filters.
2. ONLY if focused15/2files ALLgreen/zero fail/skip/todo/unhandled/cleanup/hash errors,
   ONCE with a NEW wrapper instance: SAME node/Vitest command plus ALL60 concrete
   inventory.parentSuites (expected859cases). Includes all30S5 and ALL accepted
   foundation/T03/T04/provider/bounded15T05/S1–S4; no exclusions. Focused15 repeats
   in complete parent:874executions/859distinct cases, no inflated coverage claim.

Exact arrays may be read from hash-verified JSON; no discovery or changed commands.
ANY focused failure blocks parent. Preserve full original observations and STOP;
no retry/repair/extra diagnostics/import probe without new Coordinator gate.
Parked T02/deferred general T05 work remains UNRUN, not passed; no npm test/check
or whole-repository/real backend/browser/host/release claim.

## Full output, cleanup, evidence and stop

FULL stdout+stderr to NEW owned logs BEFORE viewing, true exit separately, read
ALL output, retain every failed identity/safe expected-vs-observed code/count.
New `docs/evidence/t06-s5-qa-f2-execution.md` ONLY; no frozen-source/readiness/spec/
old-f1-evidence rewrite. F1 adjudication already corrects count and tentative
interpretation/compiled-public-execution wording without deleting originals.
No private absolute paths/credentials/IDs/bodies in repository evidence.

Await owned commits/calls/gates/responders; no force-kill of durability. Wrapper
reaps its daemon/bus/removes issued roots; QA cleans ONLY owned run/log scopes
AFTER sanitized full observation report. Hash/cleanup failures propagate.
Send focused milestone then final/failed result asynchronously to coordinator/
w4:p2K, then HOLD ALL. No status polling, source edits/build/install/settings/trust/
.pi/staging/commits/product-live writes/successor or automatic context renewal.
Current original checkpoint90/STOP120 remains; if insufficient time, safely settle
and report partial, never weaken gates. Final clean-source proof/import smoke
still pending AFTER independent green. No parent completion until those pass.
