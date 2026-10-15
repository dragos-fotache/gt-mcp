#!/usr/bin/env python3
"""Coordinator-only T04 clean locked source snapshot; no parked suites."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
from tempfile import TemporaryDirectory

ROOT = Path.cwd()
RELAY = json.loads(Path(os.environ.get('T04_RELAY_INVENTORY', '/tmp/gt-mcp-t04-f3-inventory.json')).read_text())
FORBIDDEN = {'.git', '.pi', 'node_modules', 'dist', 'private', '.private',
             'vault', 'journals', 'receipts', 'profiles', 'coverage'}

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def verify_relay():
    for name, expected in RELAY['files'].items():
        p = ROOT / name
        assert p.is_file() and not p.is_symlink() and sha(p) == expected, 'Frozen target changed'

verify_relay()
files = {n for n in RELAY['files'] if not n.startswith('dist/')}
files.update({'README.md', '.gitignore', '.node-version', '.nvmrc', '.prettierrc.json',
              '.prettierignore', 'eslint.config.mjs', 'vitest.config.ts', 'AGENTS.md',
              'companion/package.json', 'companion/tsconfig.json',
              'experiments/t02/tsconfig.json', 'experiments/t02/metadata.json',
              'test/fixtures/synthetic-vectors.mjs',
              'docs/decisions/t01-approved-foundation-spec.md',
              'docs/decisions/t03-zod-import-adjudication.md',
              'docs/decisions/t01-implementation-adr.md',
              'docs/decisions/t04-approved-storage-spec.md'})
for tree in ['src', 'companion/src', '.github', 'test/foundation', 'test/unit/t03',
             'test/unit/t04', 'test/fault/t04', 'experiments/t02/companion',
             'experiments/t02/driver', 'experiments/t02/driver-files',
             'experiments/t02/fixture-server']:
    base = ROOT / tree
    assert base.is_dir() and not base.is_symlink()
    for p in base.rglob('*'):
        assert not p.is_symlink(), 'Symlink source rejected'
        if p.is_file():
            files.add(p.relative_to(ROOT).as_posix())
rows = []
for name in sorted(files):
    rel = Path(name)
    assert not rel.is_absolute() and '..' not in rel.parts
    assert not set(rel.parts) & FORBIDDEN
    assert not any(x.startswith('.env') for x in rel.parts)
    p = ROOT / rel
    assert p.is_file() and not p.is_symlink()
    rows.append({'path': name, 'sha256': sha(p)})
inventory = hashlib.sha256(''.join(r['path']+'\0'+r['sha256']+'\n' for r in rows).encode()).hexdigest()
summary = {'tag':RELAY['tag'], 'snapshotKind':'allowlisted source, not clone/release',
           'sourceFileCount':len(rows), 'sourceInventorySha256':inventory,
           'commands':[], 'status':'in_progress'}
node_home = os.environ['T01_NODE_HOME']
provider_prefix = os.environ['T04_PROVIDER_PREFIX']
with TemporaryDirectory(prefix='gt-mcp-t04-clean-') as d:
    scope = Path(d)
    target = scope/'source'; target.mkdir()
    home = scope/'home'; home.mkdir()
    temp = scope/'tmp'; temp.mkdir()
    cache = scope/'npm-cache'; cache.mkdir()
    npmrc = scope/'empty-npmrc'; npmrc.write_text('')
    for row in rows:
        dest = target/row['path']; dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT/row['path'], dest)
    assert not (target/'node_modules').exists() and not (target/'dist').exists()
    env = {'PATH':node_home+'/bin:/usr/bin:/bin', 'T01_NODE_HOME':node_home,
           'T04_PROVIDER_PREFIX':provider_prefix, 'HOME':str(home),
           'TMPDIR':str(temp), 'TMP':str(temp), 'TEMP':str(temp),
           'XDG_CONFIG_HOME':str(home/'config'), 'XDG_DATA_HOME':str(home/'data'),
           'XDG_STATE_HOME':str(home/'state'), 'XDG_CACHE_HOME':str(home/'cache'),
           'NPM_CONFIG_USERCONFIG':str(npmrc), 'NPM_CONFIG_CACHE':str(cache),
           'NO_COLOR':'1', 'TZ':'UTC'}
    commands = [['node','--version'], ['npm','--version'], ['npm','ci','--ignore-scripts'],
                ['npm','run','typecheck'], ['npm','run','lint:production'],
                ['npm','run','format:check:production'], ['npm','run','build'],
                ['node','node_modules/vitest/vitest.mjs','run','test/unit/t04'],
                ['bash','/tmp/gt-mcp-t04-qa-private-run.sh','test/fault/t04'],
                ['npm','run','smoke'],
                ['node','node_modules/vitest/vitest.mjs','run','test/unit/t03'],
                ['node','node_modules/eslint/bin/eslint.js','test/unit/t04','test/fault/t04'],
                ['node','node_modules/prettier/bin/prettier.cjs','--check','test/unit/t04','test/fault/t04']]
    for command in commands:
        result = subprocess.run(command, cwd=target, env=env, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                timeout=180)
        output = result.stdout.replace(str(scope), '<snapshot>').replace(str(ROOT), '<repository>')
        print('COMMAND:', ' '.join(command), 'EXIT:', result.returncode, flush=True)
        print(output, flush=True)
        summary['commands'].append({'command':' '.join(command),'exit':result.returncode})
        if result.returncode:
            summary['status']='failed'
            (ROOT/'docs/evidence/t04-clean-source-snapshot-result.json').write_text(json.dumps(summary,indent=2)+'\n')
            raise SystemExit(result.returncode)
    for row in rows:
        assert sha(target/row['path'])==row['sha256'], 'Snapshot source changed'
        assert sha(ROOT/row['path'])==row['sha256'], 'Live source changed'
    for name, expected in RELAY['files'].items():
        if name.startswith('dist/'):
            assert sha(target/name)==expected, 'Clean build differs from frozen artifact'
    summary['buildMatchesFrozenRelay']=True
    summary['sourcesUnchanged']=True
verify_relay()
summary['status']='passed'
summary['cleanup']='Disposable source/HOME/temp/npm-cache removed; private provider daemon/keyring teardown'
summary['limits']='Owning T04+foundation+T03 only; no parked suite, backend, whole-machine rollback, hardware power-loss or release claim'
(ROOT/'docs/evidence/t04-clean-source-snapshot-result.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
