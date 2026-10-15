#!/usr/bin/env python3
"""Coordinator-only: prepare locked disjoint sources, then verify after QA green."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = Path.cwd()
MANIFEST = ROOT / 'docs/evidence/t06-s5-f2-artifact-inventory.json'
EXPECTED = 'f76749257bb40ffebcb16fa86a29016596acac826a5a1715522ad3f92f07a6bd'
RESULT = ROOT / 'docs/evidence/t06-s5-clean-source-snapshot-result.json'
LOCATOR = Path('/tmp/gt-t06-s5-clean-scope-location')
FORBIDDEN = {'.git', '.pi', 'node_modules', 'private', 'profiles', 'vault', 'journals', 'receipts', 'coverage'}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(rows, root):
    for row in rows:
        rel = Path(row['path'])
        assert not rel.is_absolute() and '..' not in rel.parts
        p = root / rel
        assert p.is_file() and not p.is_symlink(), 'Unsafe frozen input'
        assert sha(p) == row['sha256'], 'Frozen input changed'


def save(summary):
    summary['procedureSha256'] = sha(Path(__file__))
    RESULT.write_text(json.dumps(summary, indent=2) + '\n')


assert sha(MANIFEST) == EXPECTED, 'Inventory changed'
relay = json.loads(MANIFEST.read_text())
verify(relay['files'], ROOT)
sources = [r for r in relay['files'] if 'dist' not in Path(r['path']).parts]
compiled = [r for r in relay['files'] if 'dist' in Path(r['path']).parts]
mode = sys.argv[1] if len(sys.argv) > 1 else ''
assert mode in ('--prepare', '--verify'), 'Choose prepare or verify explicitly'
if mode == '--prepare':
    assert not LOCATOR.exists(), 'Existing owned snapshot needs disposition'
    scope = Path(tempfile.mkdtemp(prefix='gt-t06-s5-clean-', dir='/var/tmp'))
    LOCATOR.write_text(str(scope))
    os.chmod(LOCATOR, 0o600)
    target = scope / 'source'
    target.mkdir()
    for name in ('home', 'tmp', 'run', 'cache'):
        (scope / name).mkdir(mode=0o700)
    (scope / 'user.npmrc').write_text('')
    (scope / 'global.npmrc').write_text('')
    for row in sources:
        rel = Path(row['path'])
        assert not FORBIDDEN.intersection(rel.parts)
        assert not any(p.startswith('.env') for p in rel.parts)
        destination = target / rel
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / rel, destination)
    assert not (target / 'node_modules').exists() and not (target / 'dist').exists()
    summary = {'artifactId': 't06-s5-f2', 'inventorySha256': EXPECTED,
               'status': 'preparing_not_behaviorally_verified', 'commands': [],
               'sourceFileCount': len(sources), 'compiledFileCount': len(compiled),
               'cleanupCompleted': False}
else:
    assert '--qa-green' in sys.argv, 'Coordinator must review independent QA green first'
    scope = Path(LOCATOR.read_text())
    assert scope.parent == Path('/var/tmp') and scope.name.startswith('gt-t06-s5-clean-')
    assert scope.is_dir() and not scope.is_symlink()
    target = scope / 'source'
    summary = json.loads(RESULT.read_text())
    assert summary['status'] == 'prepared_not_behaviorally_verified'
    verify(sources, target)
    verify(compiled, target)

node_home = os.environ['T01_NODE_HOME']
launcher = Path('/tmp/gt-t06-s5-private-provider-launcher.sh')
inner = Path('/tmp/gt-t06-s5-private-provider-inner.sh')
assert sha(launcher) == '9098ff72d9140f63d4d8d690704f74a4a5b627bf65fbb3d048fd49833ef7d222'
assert sha(inner) == '87f0ff35bd5a1c1b7fb5ff2a518303e43894d24bbea8f3345154c30dbe65b360'
env = {'PATH': node_home + '/bin:/usr/bin:/bin', 'T01_NODE_HOME': node_home,
       'HOME': str(scope / 'home'), 'TMPDIR': str(scope / 'tmp'),
       'TMP': str(scope / 'tmp'), 'TEMP': str(scope / 'tmp'),
       'XDG_CONFIG_HOME': str(scope / 'home/config'), 'XDG_DATA_HOME': str(scope / 'home/data'),
       'XDG_STATE_HOME': str(scope / 'home/state'), 'XDG_CACHE_HOME': str(scope / 'home/cache'),
       'XDG_RUNTIME_DIR': str(scope / 'run'), 'NPM_CONFIG_CACHE': str(scope / 'cache'),
       'NPM_CONFIG_USERCONFIG': str(scope / 'user.npmrc'),
       'NPM_CONFIG_GLOBALCONFIG': str(scope / 'global.npmrc'), 'TZ': 'UTC', 'NO_COLOR': '1'}
focused = ['bash', str(launcher), 'node', 'node_modules/vitest/vitest.mjs', 'run', *relay['focusedSuites']]
parent = ['bash', str(launcher), 'node', 'node_modules/vitest/vitest.mjs', 'run', *relay['parentSuites']]
quality = [['node', 'node_modules/eslint/bin/eslint.js', *relay['sourceQualityFiles']],
           ['node', 'node_modules/prettier/bin/prettier.cjs', '--check', *relay['sourceQualityFiles']]]
if mode == '--prepare':
    commands = [['node', '--version'], ['npm', '--version'], ['npm', 'ci', '--ignore-scripts'],
                ['npm', 'run', 'typecheck'], ['npm', 'run', 'lint:production'],
                ['npm', 'run', 'format:check:production'], ['npm', 'run', 'build']]
else:
    commands = [focused, parent, *quality]

try:
    for command in commands:
        ordinal = len(summary['commands']) + 1
        log = scope / f'command-{ordinal:02}.log'
        with log.open('w') as stream:
            run = subprocess.run(command, cwd=target, env=env, stdout=stream,
                                 stderr=subprocess.STDOUT,
                                 timeout=None if command in (focused, parent) else 300)
        # COMPLETE original output retained before any inspection. Read all bytes;
        # repository result persists summaries only, no private paths/bodies.
        output = log.read_text(errors='replace')
        label = ' '.join(command).replace(str(launcher), '<qualified-private-provider-launcher>')
        counts = [line.strip() for line in output.splitlines()
                  if re.match(r'\s*(Test Files|Tests|Duration)\s', line)]
        entry = {'command': label, 'exit': run.returncode, 'testSummary': counts}
        summary['commands'].append(entry)
        print('COMMAND', label, 'EXIT', run.returncode, flush=True)
        for line in counts:
            print(line, flush=True)
        if run.returncode:
            raise RuntimeError('Command failed; COMPLETE private log retained for review')
        if command == ['node', '--version']:
            assert output.strip() == 'v24.21.0'
        if command == ['npm', '--version']:
            assert output.strip() == '11.19.0'
        if command in (focused, parent):
            wanted = relay['focusedExpectedCases'] if command == focused else relay['parentExpectedCases']
            files = len(relay['focusedSuites']) if command == focused else len(relay['parentSuites'])
            assert any(re.fullmatch(rf'Tests\s+{wanted} passed\s+\({wanted}\)', x) for x in counts), 'Counts/skip/todo mismatch'
            assert any(re.fullmatch(rf'Test Files\s+{files} passed\s+\({files}\)', x) for x in counts), 'Suite count mismatch'
            verify(relay['files'], ROOT)
        save(summary)
    verify(sources, target)
    verify(compiled, target)
    actual = {p.relative_to(target).as_posix() for base in ('dist', 'companion/dist')
              for p in (target / base).rglob('*') if p.is_file()}
    assert actual == {r['path'] for r in compiled}, 'Compiled file-set mismatch'
    verify(relay['files'], ROOT)
    if mode == '--prepare':
        summary.update({'status': 'prepared_not_behaviorally_verified',
                        'lockedInstallProductionChecksPassed': True,
                        'sourcesUnchanged': True, 'buildMatchesFrozenRelay': True,
                        'behavioralSelections': 'UNRUN pending independent QA green'})
    else:
        summary.update({'status': 'passed', 'sourcesUnchanged': True,
                        'buildMatchesFrozenRelay': True, 'originalFrozenHashesStable': True,
                        'distinctCases': 859, 'testExecutions': 874})
        shutil.rmtree(scope)
        LOCATOR.unlink()
        summary['cleanupCompleted'] = True
    summary['limits'] = 'Explicit fixture-repair focused15+same full parent859; not whole-repository/real backend/browser/host/release/power-loss proof'
    save(summary)
    print('PASS' if mode == '--verify' else 'PREPARED ONLY; behavioral selections UNRUN', flush=True)
except BaseException as error:
    summary.update({'status': 'failed', 'errorType': type(error).__name__,
                    'cleanupCompleted': False,
                    'fullOutput': 'Complete original private logs retained; Coordinator review/cleanup required'})
    save(summary)
    print('FAILED; complete private logs retained, no pass claim.', flush=True)
    raise SystemExit(1)
