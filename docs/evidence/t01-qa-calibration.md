# T01 QA calibration and interception limits

**Role:** QA · **Task:** T01 foundation · **Stage:** 2 — independent tests
**State:** calibration executed (16/16 probes behaved as specified); target
suite results recorded separately. No production sources, diffs, or generated
implementation contents were read at any point.
**Toolchain:** Node v24.21.0 via `$T01_NODE_HOME/bin` (coordinator-provisioned
disposable toolchain, exported per shell invocation because tool subshells do
not retain exports).
**Normative ref:** `docs/decisions/t01-approved-foundation-spec.md` §3 (probes),
§5 (peer/external boundary), §6 (synthetic/privacy contract).

## 1. Why this file exists instead of a placeholder check

Per coordinator review, detection limits and the bundle-proof boundary are
documented here as evidence — not as a self-passing assertion in the suite.
No `expect(true)`-style placeholder exists in QA tests; every suite test makes
a real assertion against an observed child behavior or allowed metadata file.

## 2. Companion bundle boundary (spec §5)

QA asserts the metadata half only (companion `pi.extensions` entry, host
packages as `"*"` peers at most, never runtime dependencies, full host names
`@earendil-works/pi-ai`, `@earendil-works/pi-agent-core`,
`@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`,
`@sinclair/typebox`/`typebox`). Metadata checks alone do **not** prove no host
copy is bundled: complete emitted-companion-JS, source type-import, build
configuration, and package-content inspection is the coordinator's acceptance
gate, stated here so the suite is never mistaken for that proof.

## 3. Interception policy (`test/foundation/preload-intercept.mjs`)

Fail-closed preload, loaded via `node --import` before any target code:

- Network (fetch/http/https/net-listen+connect/dns/dgram), child processes,
  workers, and IPC sends: counted and thrown (child fails + report entry).
- Uncaught exceptions/rejections: recorded and force exit code 1, so a
  violation can never hide behind a clean exit.
- Files: only the harness's own report path is writable — every other write
  (sync/callback/promise, including inside the synthetic HOME/tmp root) is
  recorded and blocked. Reads allow only loader-extension files, with
  private-state classification always winning over the allowance. Directory
  listings confined to dist/node_modules/toolchain roots. Paths normalized
  across string/Buffer/file-URL/relative forms first.
- stdin: `read()` calls and data/readable/end subscriptions recorded;
  `read()` throws. Piped input + empty stdout proves no response was produced;
  a clean stdin sub-report proves no intercepted stdin-consumption attempt
  (fd/native bypasses remain explicitly noted gaps; coordinator source audit
  supplies additional assurance).
- A timeout plus clean exit proves termination only — every verdict also
  requires the intercept report.

## 4. Honest detection gaps (not sandbox claims)

- fd-number / FileHandle-method I/O bypasses path classification. Handles are
  obtainable only through the gated `open()` calls, and inherited stdio is
  observed via child stdio capture instead.
- Native addons, `process.dlopen`, `process.binding`/internalBinding, `vm`
  escape hatches, or builtin references captured before the preload are not
  intercepted (preload is first by construction, so the captured-reference gap
  covers Node internals only).
- The module loader reads target files through the patched `fs.readFileSync`
  export, which is why loader-extension reads under the repo/node_modules/
  toolchain are allowed — and why private-state classification takes
  precedence over that allowance.
- The repo checkout lives under the real HOME, so the real-HOME prefix rule
  exempts the repo tree and judges repo-internal paths by pattern only.
- dgram/dns/worker/IPC coverage is creation/call counting, not payload
  inspection. A clean report proves no *intercepted* effect was attempted.
  Stronger assurance remains coordinator source review. No OS-sandbox or
  complete-network proof is claimed.

## 5. Calibration results (QA-owned probes only, executed 2026-10-11)

Runner: `node test/foundation/run-calibration.mjs` on Node v24.21.0.
Result: **16/16 probes behaved as specified** (machine-readable runner output
is kept in a temporary report outside the repo and transcribed here):

| Probe | Specified behavior | Observed |
|---|---|---|
| fetch attempt | detected, child fails | PASS |
| net listen attempt | detected, child fails | PASS |
| child_process spawn attempt | detected, child fails | PASS |
| process handler subscription | recorded, child exits 0 | PASS |
| timer creation | recorded, child exits 0 | PASS |
| sync private-state read | detected, child fails | PASS |
| sync write outside report path | detected, child fails | PASS |
| fs.promises private-state read | detected, child fails | PASS |
| callback private-state read | detected, child fails | PASS |
| URL-object private read (normalization) | detected, child fails | PASS |
| relative private read (resolution) | detected, child fails | PASS |
| stdin.read attempt | detected, child fails | PASS |
| stdin readable/data subscription | recorded; stream-machinery reads blocked, child fails | PASS ×2 |
| clean control: import QA-owned fixture | exit 0, clean report | PASS |
| clean control: own stdout passthrough | exact stdout, clean report | PASS |

Calibration defects actually found and fixed by these probes (evidence the
harness is sensitive, not vacuous): uncaught violations exited 0 before the
exitCode=1 forcing; the loader allowance briefly covered any repo `.json`
(relative private read slipped through); the real-HOME rule misclassified the
repo checkout; repo-internal private patterns briefly lost precedence.

## 6. What remains coordinator-owned

Clean-snapshot install evidence, source/host-copy/privacy audits, emitted-JS
bundle proof, and final T01 acceptance. QA target-suite results are reported
via Herdr with exact commands/versions; placeholders, skips, and
metadata-only checks are never counted as passes.
