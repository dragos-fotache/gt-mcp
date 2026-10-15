# T05-f3 frozen final-verification relay

**Status: CLOSED/PASSED**, production c4. QA21focused,228owning and444regressions
PASS,0skips; independent clean locked reproduction PASS, rebuilt bytes identical,
193hashes unchanged. [Bounded acceptance](t05-coordinator-review.md). No further
actions granted; historical execution instructions below are CLOSED.
[Inventory](t05-f3-artifact-inventory.json):193files SHA256
`4d92f6d7e7c86bb8578d256e0a5f48ec1f9bd603799d0b9ffaa317ed7009d3f2`.
Only wire source/emitted JS changed from f2; public truncation adjudication added.
QA sources/oracles unchanged. Developer reports four production checks PASS.
Coordinator reviewed repair and verified5/5targeted public-entry observations:
read/write truncation internal_error/one attempt (mutation uncertain), no-response
network retry preserved, post-response timeout preserved, complete success intact.
These are readiness, not final acceptance. f1/f2failure records remain unchanged.

## Pre/postflight

Node24.21.0/npm11.19.0 only. Use supplied T01_NODE_HOME and PATH. Verify193frozen
hashes before A, after A, and after B (also after any failure). Metadata/hash only,
never production/generated implementation reads:

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
node --version
npm --version
python3 - <<'PY'
from pathlib import Path
import json,hashlib
p=Path('docs/evidence/t05-f3-artifact-inventory.json')
assert hashlib.sha256(p.read_bytes()).hexdigest()=='4d92f6d7e7c86bb8578d256e0a5f48ec1f9bd603799d0b9ffaa317ed7009d3f2'
m=json.loads(p.read_text())
assert len(m['files'])==193
bad=[r['path'] for r in m['files'] if not Path(r['path']).is_file() or hashlib.sha256(Path(r['path']).read_bytes()).hexdigest()!=r['sha256']]
if bad:
    print('Mismatch:',bad)
    raise SystemExit(1)
print('t05-f3 unchanged193files')
PY
```

Any mismatch => STOP/report/HOLD, never rebuild the target. No npx/global install,
source/oracle edits, contracts/config changes, deferred/parked/whole-suite checks.

## Phase A — one affected file, once

```sh
umask 077
AOUT=$(mktemp /tmp/gt-mcp-t05-f3-limits.XXXXXX.json)
node ./node_modules/vitest/vitest.mjs run test/fault/t05/production-limits.test.mjs --reporter=json --outputFile="$AOUT"
```

Capture actual exit and structured counts/full failures. Any failure/skip/error or
hash drift => STOP/report/HOLD; phaseB NOT permitted. No automatic repair/rerun.

## Phase B — explicit conditional final grant

ONLY if A passes with0skips/errors and stable hashes:

1. Full15active owning suites ONCE, exactly the frozen selection:

```sh
export T05_QA_FULL_RESULT=$(mktemp /tmp/gt-mcp-t05-f3-full.XXXXXX.json)
python3 - <<'PY'
from pathlib import Path
import json,os,subprocess
m=json.loads(Path('docs/evidence/t05-f3-artifact-inventory.json').read_text())
assert m['revision']=='t05-f3' and len(m['activeSuites'])==15
r=subprocess.run(['node','./node_modules/vitest/vitest.mjs','run',*m['activeSuites'],'--reporter=json','--outputFile='+os.environ['T05_QA_FULL_RESULT']])
raise SystemExit(r.returncode)
PY
```

2. ONLY if full owning run passes, execute sequentially, stopping on any failure:

```sh
npm run smoke
node ./node_modules/vitest/vitest.mjs run test/unit/t03
node ./node_modules/vitest/vitest.mjs run test/unit/t04
T04_PROVIDER_PREFIX="$T04_PROVIDER_PREFIX" /usr/bin/bash /tmp/gt-mcp-t04-qa-private-run.sh test/fault/t04
```

Use out-of-band qualified disposable provider prefix. Public launcher provides
env-i/private D-Bus/synthetic keyring+HOME+XDG/ext4profiles, lock-last negative case
and owned cleanup. No personal bus/keyring/GUI/reset fallback, live backend or real
credentials. Provisioning failure is BLOCKED, not skipped/passed. Preserve actual
command exits; no masking. No deferred interception/general proxy/cleanup or parked
T02 runs; this bounded selection is NOT whole-repository certification.

After executions reverify193hashes, record each command separately in
`docs/evidence/t05-qa-f3-execution.md`, report structured result paths/counts/
cleanup/limits asynchronously, then HOLD. No production/private-source reads.
Coordinator independently reproduces from a separate clean locked source snapshot;
no live-target mutation while QA executes. Acceptance needs both final evidence sets.
No releases/writes/commits/.pi changes or next task; finish current work and wrap today.
