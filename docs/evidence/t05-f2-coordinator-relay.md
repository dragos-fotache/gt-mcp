# T05-f2 frozen relay — focused repair verification and final gates

**Status: CLOSED/FAILED.** QA phaseA65/66PASS,1FAIL,0skips; phaseB NOT executed.
Independent clean snapshot227/228owning checks,1same truncation failure; regressions
not reached. [Adjudication](../decisions/t05-f2-truncation-adjudication.md) assigns
a targeted production fix, no oracle change. Original grant retained below.
c3 production was unchanged during execution. Four QA source files repaired per
[public adjudication](../decisions/t05-f1-verification-adjudication.md), including
positional guard assertions (not an arbitrary exact maximum). Coordinator reviewed
those changes and repeated focused parse/lint/format:PASS. f1and its observation
remain FAILED historical evidence; not rewritten as success.

[Inventory](t05-f2-artifact-inventory.json):192files, SHA256
`bc8016cd207d5c2d81c5c2a0de54e95bbc7e82ea2d9afb43013a80ef54a5f112`.
Production candidate remains c3; no build/install/source changes assigned to Developer.
The inventory contains full active15suite/4helper selection plus public adjudication;
only four QA files differ from f1. All production and active QA sources/fixtures
are HELD. Evidence-only writes allowed. Any repair closes this relay.

## Preflight / postflight

Use provisioned T01_NODE_HOME, Node24.21.0/npm11.19.0. Verify before phaseA,
after phaseA, and after phaseB (including after failures):

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
node --version
npm --version
python3 - <<'PY'
from pathlib import Path
import hashlib,json
p=Path('docs/evidence/t05-f2-artifact-inventory.json')
assert hashlib.sha256(p.read_bytes()).hexdigest()=='bc8016cd207d5c2d81c5c2a0de54e95bbc7e82ea2d9afb43013a80ef54a5f112'
data=json.loads(p.read_text())
bad=[x['path'] for x in data['files'] if not Path(x['path']).is_file() or hashlib.sha256(Path(x['path']).read_bytes()).hexdigest()!=x['sha256']]
if bad:
    print('Frozen inventory mismatch:',bad)
    raise SystemExit(1)
print('t05-f2 inventory unchanged:',len(data['files']),'files')
PY
```

Metadata/hash reads only, never production/generated implementation contents.
Mismatch => STOP/report, never rebuild/install/repair the target. No npx/global
install, whole-suite/parked/deferred tests or Pi/settings changes.

## Phase A — four affected suites, once

Create an owned umask077 temporary structured-result file and run:

```sh
umask 077
AOUT=$(mktemp /tmp/gt-mcp-t05-f2-focused.XXXXXX.json)
node ./node_modules/vitest/vitest.mjs run \
  test/unit/t05/02-validation-identity.test.mjs \
  test/unit/t05/04-hooks-fences-dispatch.test.mjs \
  test/unit/t05/11-import-smoke.test.mjs \
  test/fault/t05/production-limits.test.mjs \
  --reporter=json --outputFile="$AOUT"
```

Preserve actual exit/status/counts and complete structured failure details. If
ANY failure/skip/error or inventory drift occurs, STOP, report, HOLD; phaseB
is NOT authorized in that case. No automatic fix/rerun.

## Phase B — explicitly conditional final QA grant

ONLY if phaseA passes with0skips/errors and unchanged192file inventory, QA is
explicitly authorized to run the following final gates against the SAME target.
This is one bounded T05 task, not successor/whole-matrix permission. It avoids
repeating full regressions during repairs while retaining final acceptance rigor.

1. Full active15-suite selection, once, structured output. Read the exact safe
   filenames from the public frozen manifest (equivalent to the f1listed command):

```sh
export T05_QA_FULL_RESULT=$(mktemp /tmp/gt-mcp-t05-f2-full.XXXXXX.json)
python3 - <<'PY'
from pathlib import Path
import json,os,subprocess
m=json.loads(Path('docs/evidence/t05-f2-artifact-inventory.json').read_text())
assert m['revision']=='t05-f2' and len(m['activeSuites'])==15
r=subprocess.run(['node','./node_modules/vitest/vitest.mjs','run',*m['activeSuites'],'--reporter=json','--outputFile='+os.environ['T05_QA_FULL_RESULT']])
raise SystemExit(r.returncode)
PY
```

2. If full owning run passes, execute sequentially, stopping on any failure:

```sh
npm run smoke
node ./node_modules/vitest/vitest.mjs run test/unit/t03
node ./node_modules/vitest/vitest.mjs run test/unit/t04
T04_PROVIDER_PREFIX="$T04_PROVIDER_PREFIX" /usr/bin/bash /tmp/gt-mcp-t04-qa-private-run.sh test/fault/t04
```

Coordinator supplies the qualified disposable T04_PROVIDER_PREFIX out of band.
The already-qualified PUBLIC launcher is readable fixture scaffolding, not
production code: env-i, fresh private D-Bus, disposable synthetic keyring/HOME/XDG
and ext4profiles; lock-last negative test followed by owned daemon/keyring teardown.
No personal bus/keyring, real credentials, GUI/reset fallback or live backend.
Never skip provider cases because provisioning failed; report the blocker instead.

Each command's actual exit/counts are recorded separately; no pipeline masking.
On failure STOP and HOLD remaining commands for coordinator decision. No edits.
After all success, reverify inventory and HOLD. Deferred interception/general
proxy/cleanup-calibration and parkedT02 remain explicitly outside this selection,
NOT passed. The full active owning suite is not whole-repository certification.

## Reporting / coordinator reproduction

QA records phaseA and, if permitted/executed, phaseB separately in
`docs/evidence/t05-qa-f2-execution.md`, with structured result paths out of band,
exact commands/pins/counts/skips/cleanup/limits and hash checks. No raw private
bodies/credentials/PEMs or production-source reads. Report asynchronously and hold.

Coordinator may independently run the prepared allowlisted clean-source locked
snapshot in a SEPARATE disposable tree/private provider instance on this immutable
inventory. No live target mutations/installs/builds overlap QA. Acceptance requires
both independent QA and clean locked reproduction, not a conditional grant alone.
No actual writes, release/publication/deployment, .pi edits, staging/commits or
next-task work. User requested wrap-up today: after final disposition, record
handoff and keep both agents held; do not start T06/T09.
