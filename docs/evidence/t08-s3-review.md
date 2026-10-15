# T08-S3 and parent T08 acceptance

Accepted on 2026-10-15. The user authorized S3 implementation and explicitly
replaced the historical Herdr/separate Developer–QA workflow with primary-agent
work and optional bounded subagents. One subagent authored focused public-boundary
checks; another performed bounded production source reviews. No Herdr was used.
Public contracts, isolated components and required acceptance gates were retained.

## Delivered behavior

- `dist/protocol/server.js` now runs the seven-tool local stdio surface through
  the pinned official SDK. Six reads are functional; creation remains a validated
  unavailable placeholder even with true write policy.
- Async `main(args)` accepts no args or exactly `--config <absolute normalized
  path>`. Missing config remains usable unconfigured MCP; malformed/unsafe config
  and private-state opening failures terminate safely.
- SDK parsing/serialization, strict streaming UTF-8, fixed 10 MiB accumulated
  input limit, initialize/initialized gating and fixed diagnostics are implemented.
  Malformed ingress closes without guessed response identity or backend dispatch.
- Callback-based output honors backpressure. EOF, stream failure, cancellation,
  signals and unexpected SDK faults fence activity, await owned persistence and
  release the profile. Public pipe/stdin handle cleanup prevents post-cleanup hangs.
- S1/S2 exports, catalogue, schemas, canonical results and budget behavior remain
  unchanged. Ordinary explicit S2 close still awaits runtime cleanup before
  transport close; unexpected SDK faults fence transport immediately.

Production changes: `src/protocol/server.ts`, new private `src/protocol/stdio.ts`,
and narrow lifecycle/init additions in `src/protocol/adapter.ts`. No dependencies,
lockfile, compiler settings, scripts, backend/shared contracts, CLI, companion or
S1/auth/storage/HTTP/domain production sources changed.

## Final acceptance

| Gate | Result |
| --- | --- |
| Final exact active selection | 76 files, 941/941 PASS; zero failed/pending/todo |
| Selection execution | 75 files / 932 PASS, then isolated-provider file / 9 PASS |
| T08 owning composition | S1 39 + S2 20 + S3 23 = 82 checks across 16 files |
| Clean locked install | `npm ci --ignore-scripts`, exit 0 |
| Clean production checks | typecheck, lint:production, format:check:production, build: all exit 0 |
| Build identity | 128 compiled files byte-identical to the tested candidate |
| Clean behavioral replay | Full active T08 owning selection: 16 files, 82/82 PASS |
| Input stability | 280 production/config/test/fixture SHA256 values unchanged around final runs |
| Changed test source checks | Node syntax, explicit ESLint and Prettier: PASS |
| Import/entry compatibility | Foundation direct/symlink/argv-match import checks retained and PASS |
| Source review | Earlier actionable findings repaired; final bounded review found no remaining concrete S3 violation |
| Owned fixture cleanup | Fresh private provider/bus terminated and reaped; disposable HOME/keyring/CA/grant/profile scopes removed |

[Artifact inventory](t08-s3-artifact-inventory.json) records the exact 76 filenames,
source hashes and compiled hashes. The parent selection is the accepted T06
60-file regression selection plus all 16 active T08 files, deduplicated. The
provider file runs last because its locked-provider negative intentionally changes
that isolated provider. No discovery fallback, test-name filtering or hidden
failing-test exclusion was used. Parked T02 and deferred historical T05 campaign
remain preserved/unrun; this is not a whole-repository green claim.

All Node/npm executions used disposable Node 24.21.0 / npm 11.19.0. The official
Node archive matched its HTTPS checksum manifest. SDK 1.32.1 / Zod 4.5.4 pins
remain unchanged; actual SDK initialization exercised protocol 2025-11-25.

Safe command forms (environment/material paths intentionally represented by
placeholders; the inventory supplies every exact suite filename):

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
npm run typecheck
npm run lint:production
npm run format:check:production
npm run build
node node_modules/vitest/vitest.mjs run --no-file-parallelism <exact-inventory-selection> --reporter=json --outputFile=<private-result>
# Fresh clean source snapshot, same pinned toolchain:
npm ci --ignore-scripts
# Same four production checks, then exact 16-file active T08 replay.
```

## Real isolated boundary observations

Fresh private D-Bus and unlocked GNOME Keyring 51.1 used the prior-qualified
portable archives (GNOME SHA256
`8e6dc27e40ebadae6569098dff9fffcad4ca9f67c211951f80a17c01485b4de4`,
gcr 3.41.2 SHA256
`790e5564c8560118f05452609ec1db90b928e25ca21a692ad23a954fd98eb37d`).
A synthetic libsecret store/read/equality/clear qualification passed before each
run. No system installation, personal bus/keyring or live credentials were used.
Production profile/anchor roots were on ext4; temporary negative fixtures remained
on tmpfs with umask 0077. A fresh private-CA HTTPS fixture served synthetic records.

Actual official Client/StdioClientTransport launched the compiled server and
exercised six exact canonical reads, Int64 revision preservation, context/paging,
own draft versus saved list, foreign not-found, expired paging, signed-out state,
true-policy no mutation, output overflow and caller cancellation. An authenticated
malformed whole-message check closed safely without a further backend request.
Held-read signal and begun-refresh shutdown suppressed late success and allowed
a subsequent explicit opener after release. Unexpected SDK fault also exited
and released ownership with fixed failure text. A direct compiled-process probe
observed exit 70 and exact safe diagnostic with no forced termination.

A small private-provider acquisition gate observed actual method metadata,
paused only that owned fixture provider, and verified early EOF prevents buffered
initialize dispatch. A startup private-state failure overrode an earlier signal.
No private request payloads were printed. SDK Client close was called only after
configured child exit, avoiding its built-in forced-kill escalation during owned
persistence. Raw subprocess cases covered strict ingress, signals, healthy
backpressure, broken pipe and EOF with pending blocked output.

## Original failures and repairs retained

[Focused development record](t08-s3-stdio-focused-development.md) preserves
original test identities/results. Initial unknown-tool assertions needed the
already accepted SDK double-prefix adaptation. Real production defects found and
repaired included explicit-close ordering, initialization/closing conflation,
blocked output and open stdin retaining a completed lifecycle, startup fatal
precedence and ineffective startup EOF observation. No failing requirement was
removed. Initial strict callback optional typing failed typecheck and was corrected;
compiler settings were not relaxed.

The first configured run was 5/9: a missing backendErrorCode oracle field
(the same contract correction was applied to expired paging), a post-SDK-fault
hang, and two startup gate failures. Corrected failure metadata follows the existing error contract; the
provider gate now observes its earlier Introspect request rather than waiting for
OpenSession while the provider is paused. The next run was 8/9, with the stdin
reference hang remaining. Final active and clean-owning runs pass all cases.
Complete original JSON results and outputs remain private; no original failure
was reconstructed from later green output. The final authenticated malformed-input
assertion was added to an existing integration case, refrozen and replayed before
closure; production/build bytes did not change.

Narrow [foundation supersession](t08-s3-foundation-supersession.md) replaces only
obsolete server exit-78/main-signature assertions. Root/CLI/companion/import safety
and historical acceptance evidence remain intact.

## Limits and closure

T08-S1/S2/S3 and parent T08 are complete. This delivers local SDK stdio and isolated
authenticated-read behavior, not browser login, descriptor writing, routine
creation, named Pi, real backend/Google/Android, packaging or release acceptance.
T06 historical user-directed verification omissions remain recorded and are not
retroactively passed. Requested data reaches client/model transcripts as described
in the [launch/privacy guide](../stdio-server.md). Graceful cleanup is not a
SIGKILL/power-loss or forensic/OS-sandbox guarantee.

All S3 work is closed. T07/T09 remain ready/unassigned; no automatic successor,
actual product writes, .pi/settings/trust edits, staging or commits occurred.
