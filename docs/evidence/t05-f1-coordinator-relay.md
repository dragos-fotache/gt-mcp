# T05-f1 frozen relay — bounded owning-suite execution

**Status: first complete run CLOSED/FAILED (220/226,6failures,0skips); acceptance
pending.** The separately authorized
[production-limits focused observation](t05-f1-focused-observation.md) is ALSO
CLOSED (17/20,3failures,0skips). [Public adjudication](../decisions/t05-f1-verification-adjudication.md)
assigns targeted QA fixture/oracle repair, no production change. A new reviewed
inventory is required before further execution. Original grant retained below.
c3 production and bounded source readiness reviewed. This is the first owning
QA target execution grant, not a whole-suite/interoperability/release claim.
The user-approved proportional testing policy and bounded plan govern; general
interception/proxy frameworks remain preserved/deferred and are not passes.

## Frozen identity and ownership

Public entry: `dist/http/index.js` + declarations; compiled from c3 using
Node24.21.0/npm11.19.0, `npm run build`. Coordinator independently reproduced
build bytes, four production checks,26targeted observations and foundation100/
T03221 regressions. QA source gate: explicit19mjs parse/lint/format PASS; standard
asynchronous execFile runner correction reviewed. No owning QA result yet.

[Artifact inventory](t05-f1-artifact-inventory.json):191files covering production
source/emitted outputs, lock/build metadata/public interface docs, ACTIVE15suites +
4helpers and8synthetic TLS fixture/provenance files. SHA256 of that JSON inventory:
`04eb806a86a47dfab9c763e4c49be1e48a1abf32df8039146681c2c947bb8bf0`.
Underlying c3transport18file inventory SHA256:
`1d0a1d26180f790906108f86c2aa4d0e8baa7bebac38e3508e1dac3f901851a1`.

Developer/coordinator HOLD production/build/install/config. QA HOLDS active
source/helpers/fixtures while executing; only its execution evidence may change.
QA may read public specs/declarations/nonsecret metadata and hash listed files;
never open production/generated implementation/maps or private Developer reviews.
Hashing bytes without displaying contents is permitted inventory verification.
No source or artifact repairs during this relay; report failures then HOLD for
coordinator adjudication/new named inventory. No automatic next task.

## Preflight and hash check (before AND after execution)

Use coordinator-supplied disposable T01_NODE_HOME, never system Node/npm:

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
node --version # v24.21.0
npm --version # 11.19.0
sha256sum docs/evidence/t05-f1-artifact-inventory.json
python3 - <<'PY'
from pathlib import Path
import hashlib,json
manifest=Path('docs/evidence/t05-f1-artifact-inventory.json')
assert hashlib.sha256(manifest.read_bytes()).hexdigest() == '04eb806a86a47dfab9c763e4c49be1e48a1abf32df8039146681c2c947bb8bf0'
data=json.loads(manifest.read_text())
assert data['revision']=='t05-f1'
bad=[x['path'] for x in data['files'] if not Path(x['path']).is_file() or hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()!=x['sha256']]
if bad:
    print('Frozen inventory mismatch:',bad)
    raise SystemExit(1)
print('t05-f1 inventory unchanged:',len(data['files']),'files')
PY
```

Mismatch/missing artifact means STOP, not rebuild/install/repair or testing a
moving target. Do not use npx downloads, lifecycle scripts or change Pi settings.

## Exact first execution command

Run this complete bounded selection once with installed local tooling. All tests
inside selected files must run; no name filtering, skips or passWithNoTests.
Only synthetic injected responses and OWNED literal-loopback HTTP/HTTPS/native
fixtures are authorized. No live backend, Google/Android/personal keyring or
actual product writes; test routine requests go only to synthetic local fixtures.

```sh
node ./node_modules/vitest/vitest.mjs run \
  test/unit/t05/01-exports-factory.test.mjs \
  test/unit/t05/02-validation-identity.test.mjs \
  test/unit/t05/03-query-serialization.test.mjs \
  test/unit/t05/04-hooks-fences-dispatch.test.mjs \
  test/unit/t05/05-budgets-deadlines-retry.test.mjs \
  test/unit/t05/06-errors-uncertainty.test.mjs \
  test/unit/t05/07-results-decode.test.mjs \
  test/unit/t05/08-error-event-interface.test.mjs \
  test/unit/t05/10-replay-identity.test.mjs \
  test/unit/t05/11-import-smoke.test.mjs \
  test/fault/t05/abort-timing.test.mjs \
  test/fault/t05/loopback-wire.test.mjs \
  test/fault/t05/loopback-tls.test.mjs \
  test/fault/t05/production-limits.test.mjs \
  test/fault/t05/proxy-boundary.test.mjs
```

Retain actual exit status and safe complete test counts; no `|| true`/pipeline
masking. Do not run npm test/check, directory-wide T05, parkedT02 or deferred
09/general-proxy/cleanup-calibration suites. Explicit selection is user-approved,
not a claim the omitted material passes. No new harness expansion requested.

## Reporting and next gate

After the run, verify inventory again even on test failure, record exact command,
versions, counts/pass/fail/skips, sanitized failing observables, cleanup and limits
in `docs/evidence/t05-qa-f1-execution.md`; no private paths, raw bodies/tokens/PEMs.
Report asynchronously to coordinator/w4:p2K, then HOLD ALL target/source actions.
Do not send QA internals to Developer or silently repair an oracle against behavior.
Coordinator adjudicates against the public spec and sends each owner its own fixes.

Final acceptance is NOT this first run. Once owning failures are resolved, run
full active owning suite + unchanged foundation/T03/T04 with a separately issued
private-provider fixture command, then coordinator clean allowlisted locked source
snapshot and byte-identical build. T04 launcher was requalified with private bus/
synthetic keyring/ext4, not the storage suites rerun. No unnecessary full regressions
for each tiny intermediate repair. Product/release gates remain open.
