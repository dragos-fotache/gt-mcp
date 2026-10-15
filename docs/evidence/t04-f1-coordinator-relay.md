# T04-f1 frozen execution relay — c2 candidate, acceptance pending

Coordinator verified c1/c2 repair scope and repaired baseline lock:
14 added authorized closure nodes,0 removed, existing nodes unchanged except root;
ip-address10.7.3 restored. Manifest exact single-dependency delta PASS.
Foundation/root/server/CLI/companion/compiler source hashes unchanged.

Current candidate is16 TS storage modules (not the earlier reported17).
Targeted re-review confirms issued synthetic key consistency, exact22 immutable
errors, data header/generation/fence repairs and guarded cleanup. c1 isolated
positive provision/bytes/bind/generation/reference-HMAC/current-anchor probe PASS,
but cleanup default-fork guard left one owned sleep descendant. Coordinator
identified it by its own synthetic environment/deleted fixture lease and cleaned
only that verified descendant. c2 adds no-fork guard; repeat same public diagnostic
probe PASS and remaining own c2 descendants0. Initial failures remain recorded.

Coordinator independently ran on pinned Node24.21.0/npm11.19.0:
`npm run typecheck`, `npm run lint:production`,
`npm run format:check:production`, `npm run build`: all exit0.
Full `npm audit --json`: exit0,0 advisory entries (point-in-time only).
No QA suite or clean source-snapshot acceptance supplied by these checks.

## Frozen inventory

Tag **t04-f1**, c2 build.58 source/build/metadata/ADR/compatibility files;
aggregate SHA256:
`6545da66fd80285dc225ab7c2c0a7bed14dcca5471a5f74d84d57b4a850a6ba8`.
Exact nonsecret inventory supplied as coordinator `/tmp/gt-mcp-t04-f1-inventory.json`.
QA may inspect inventory/hashes/metadata, never production/generated contents.

- `dist/storage/index.js`:
  `37da6c74241f7818d3cb3d9ed2fa68e9f6d8b45424735a2fb5e708f1f215543f`.
- `dist/storage/test-facility.js`:
  `73a71d36e126d61d86a79b1d18267108845a44b76e66f1e81184ff66cbda053d`.
- Internal inert artifacts: dist/storage/holder.js, dist/storage/diag-worker.js;
  names/behavior only are QA input, not generated implementation reads.

Developer holds all source/build/install/config; coordinator also performs no
build/install/source/metadata changes during QA target execution. Repairs close
and invalidate this relay. QA owns test sources/evidence only; test-source semantic
changes need coordinator specification review and revised evidence, never oracle
changes from production implementation reads.

## Execution grant and isolated provider fixture

QA may now execute owning unit/fault suites and foundation/T03 regressions on this
frozen target; no whole-suite/parked-T02 execution, no skips counted passed.
Use only coordinator-provisioned exact runtime and installed local Vitest, no npx
network fallback. Scoped QA lint/format checks allowed on own test paths; formatting-
only corrections must be reported, no production/build changes or weakening checks.

Public coordinator fixture launcher `/tmp/gt-mcp-t04-qa-private-run.sh` and inner
helper provide a fresh env-i private dbus-run-session, portable GNOME Keyring51.1/
gcr3.41.2, verified ext4 `/var/tmp` synthetic parent, restrictive HOME/XDG and
synthetic password on stdin. Launcher qualification exit0. No personal bus,
credential env/argv, global installs, GUI or production unlock/prompt.

Launcher sets T04_PROVIDER_BUS and T04_PROVIDER_PARENT only inside its private
session, intentionally no T04_PROVIDER_RESET_COMMAND. The locked production
negative runs LAST, then private daemon/keyring teardown. Do not attempt the
unqualified busctl Unlock/prompt fallback. QA may inspect this public fixture
launcher or own provider helpers, not coordinator private diagnostic probe code.

Commands (exact nonsecret provisioned runtime/provider-prefix values delivered
in the asynchronous relay):

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
./node_modules/.bin/vitest run test/unit/t04
T04_PROVIDER_PREFIX=<qualified-portable-provider-prefix> \
  bash /tmp/gt-mcp-t04-qa-private-run.sh test/fault/t04
npm run smoke
./node_modules/.bin/vitest run test/unit/t03
./node_modules/.bin/eslint test/unit/t04 test/fault/t04
./node_modules/.bin/prettier --check test/unit/t04 test/fault/t04
```

The native launcher resolves only the locked local Vitest via Node, starts/controls
its own daemon PID and cleans its own issued roots even when tests fail. Native
provider control failures remain blocked/failing, never simulated OS passes.

QA reports exact versions/commands/counts/results/failures/cleanup and limits
asynchronously, then holds. Coordinator reproduces accepted cases and later clean
allowlisted locked snapshot before final acceptance. This relay proves readiness
to test only; T04 remains in progress, actual product writes disabled, no next-task
or release/staging/commit grant.
