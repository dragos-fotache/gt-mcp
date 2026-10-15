# T01 coordinator acceptance evidence

**Result:** PASS for T01 foundation only. Not MCP/Pi/backend/Google certification.
**Team:** Developer implemented from the approved spec without QA reads; QA derived
independent tests without production reads; coordinator reviewed both and ran integration
checks. Reports arrived asynchronously through Herdr; no output polling.

## Tested artifacts and versions

Developer rev4 inert foundation plus final QA sources. Node **24.21.0**, npm **11.19.0**,
TypeScript **5.9.3**, official MCP SDK **1.32.1**, Zod **4.5.4**, Vitest **4.1.11**,
Node types **24.19.2**, ESLint **10.12.0**, @eslint/js **10.0.1**,
typescript-eslint **8.71.1**, Prettier **3.9.10**, Pi dev package **1.1.0**.
Pi development dependency is not host certification; negotiated protocol remains unverified.

Shared checkout remained at `9a96dcbce647933f5415da71db6d389bd2197983`, clean.
Selected toolchain came from the official Node distribution with SHA256 verification;
no system runtime/global packages/provider settings were changed.

## Clean source snapshot boundary

Coordinator copied an allowlist of **35 regular files** into a disposable directory:
production sources, QA tests/fixtures, workspace manifests/lockfile, runtime/compiler/
lint/format/test configs, CI, development guide, root README, compatibility matrix,
approved spec and implementation ADR. Source symlinks were rejected. No node_modules,
build output, root/nested .git, .pi, shared checkout, credentials or private state was
copied. The snapshot started without dependencies/build output and was removed afterward.

This is **clean source-snapshot evidence**, not clean-clone/published-package evidence:
root Git has no commits, and no staging/commits were authorized. Final handoff-only
coordinator documentation edits followed the tested snapshot; runtime/config/test inputs
were unchanged.

Tested snapshot inventory digest (relative file name + SHA256 pairs):
`828aa634252f3ec3e05a017b152753bc17253a6e8ce8cc1c55ae0c2f619d0b9c`.
Lockfile SHA256: `797f6c5b116ec1683e50fb010f6b1960caffa6a0e3a71fb6c7ee24c7f56b642b`.
The lockfile stayed byte-identical after install/checks, and snapshot/source parity
was verified after execution. npm ci installed 332 packages without lifecycle scripts.
Its audit reported zero known vulnerabilities at execution time; that is not a security
proof. A transitive node-domexception deprecation warning is retained as a dependency
maintenance note, not a failed gate.

## Exact checks and observations

All commands used `$T01_NODE_HOME/bin` in PATH (selected disposable toolchain).
Inside the clean snapshot:

| Command | Exit | Expected / observed |
|---|---|---|
| `node --version` | 0 | v24.21.0 |
| `npm --version` | 0 | 11.19.0 |
| `npm ci --ignore-scripts` | 0 | Clean locked workspace install; lockfile unchanged |
| `npm run check` | 0 | Sequential typecheck, lint, format:check, clean build, test all passed |
| `npm run smoke` | 0 | 100/100 tests, 7 files, no skips |
| `node test/foundation/run-calibration.mjs` | 0 | 16/16 synthetic interception probes behaved as specified |
| `npm pack --dry-run --ignore-scripts --json --workspace companion` | 0 | Exactly dist/index.js, dist/index.d.ts, package.json; bundled []; no archive created |

The `test` stage of `npm run check` also passed **100/100 tests across 7 files**,
including 9 npm-style symlink/argv-match regressions. QA independently observed the same
counts on final live-tree artifacts, plus full lint/format success.

In the original checkout, coordinator also ran:

```sh
npm run typecheck
npm run lint
node test/foundation/run-calibration.mjs
PYTHONDONTWRITEBYTECODE=1 python3 shared-docs/catalogue/verify.py
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s shared-docs/catalogue -p 'test_*.py'
```

Shared checks passed (899 exercises; 11 catalogue unit tests). Earlier invocation without
PYTHONDONTWRITEBYTECODE generated only catalogue __pycache__; coordinator removed that
owned generated cache, leaving shared Git clean. These are catalogue fixture checks,
not MCP interoperability evidence.

## Safe snapshot reproduction

Run from the repository root with the pinned toolchain selected. This copies only
explicit known nonsecret trees/files; do not replace it with `cp -a .` or `git add .`.

```sh
export PATH="$T01_NODE_HOME/bin:$PATH"
python3 - <<'PY'
from pathlib import Path
from tempfile import TemporaryDirectory
import hashlib, shutil, subprocess
root = Path.cwd()
files = ['package.json', 'package-lock.json', 'tsconfig.json',
    'eslint.config.mjs', 'vitest.config.ts', '.prettierrc.json', '.prettierignore',
    '.gitignore', '.node-version', '.nvmrc', 'AGENTS.md', 'README.md',
    'companion/package.json', 'companion/tsconfig.json', 'docs/compatibility.md',
    'docs/decisions/t01-approved-foundation-spec.md',
    'docs/decisions/t01-implementation-adr.md']
for tree in ['src', 'companion/src', 'test', '.github']:
    for p in (root / tree).rglob('*'):
        assert not p.is_symlink(), 'source symlink refused'
        if p.is_file(): files.append(p.relative_to(root).as_posix())
lock = hashlib.sha256((root / 'package-lock.json').read_bytes()).hexdigest()
with TemporaryDirectory(prefix='gt-mcp-t01-clean-') as directory:
    target = Path(directory)
    for name in sorted(set(files)):
        source = root / name
        assert source.is_file() and not source.is_symlink()
        assert not set(source.relative_to(root).parts) & {
            '.git', '.pi', 'node_modules', 'dist', 'private', '.private',
            'vault', 'journals', 'receipts', 'profiles'}
        dest = target / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, dest)
    for command in [['npm', 'ci', '--ignore-scripts'], ['npm', 'run', 'check'],
        ['npm', 'run', 'smoke'], ['node', 'test/foundation/run-calibration.mjs'],
        ['npm', 'pack', '--dry-run', '--ignore-scripts', '--json', '--workspace', 'companion']]:
        subprocess.run(command, cwd=target, check=True)
    assert hashlib.sha256((target / 'package-lock.json').read_bytes()).hexdigest() == lock
PY
```

## Independent source, packaging and privacy review

Coordinator examined every project production source and emitted JS module, declarations,
compiler/build/manifest/CI metadata, and QA assertions/calibration. Barrels erase to no
runtime exports; companion JS is a no-op factory with no runtime host imports or copies.
Server/CLI contain only inert selected-entry behavior and import node:process; no listeners,
network, private storage, credential loading, MCP registration or domain behavior exists.
Package inventory now includes its declared extension. Git ignores local harness/state,
secrets/build output and independent shared checkout; QA validated actual ignore matching.
CI actions' exact SHAs were independently checked via git ls-remote; no hosted CI run is
claimed. Scoped credential-pattern scan of project-owned sources/tests/docs/metadata found
no candidates; manual source review and visibly synthetic fixtures complement the scan.
Neither a regex scan nor the interception harness is an OS sandbox/complete secret proof.

## Defects found and resolved during review

- Unconstrained route alias, missing profile/refresh/intent binding boundaries: replaced
  with semantic client methods and per-step method/route identities; context/fence types
  and journal/refresh boundaries agreed. Runtime enforcement is not implemented at T01.
- QA script-discovery overconstraint, placeholder assertion and weak metadata probes:
  replaced with actual configuration/ignore/matrix assertions and calibrated probes.
- Companion omitted its declared extension from package inventory: explicit files:[dist].
- Node globals absent from flat ESLint config: scoped readonly globals; no-undef retained.
- argv/path entry detection broke npm-style symlinks and import inertness: effect-free
  import.meta.main guards, independently tested with regression cases.
- Companion upstream declaration incompatibility: reproducible, narrowly approved exception.

## Limits and next handoff

- **Approved companion-only skipLibCheck:** 43 upstream Pi pi-ai TS1543 JSON-import
  diagnostics under NodeNext. Root declarations remain checked; companion project code
  remains strict. No claim of validating all upstream .d.ts files. Revisit on Pi upgrade.
- **import.meta.main is Stability 1.0 (Early development)** in pinned Node 24.21.0 docs.
  No-flags availability is not stable API status. Narrow tested-runtime risk accepted;
  retest upgrades. Unknown/unsupported runtimes have no compatibility claim.
- Uint8Array readonly references do not make contents immutable; T04/T09 must enforce
  ownership/copies/persist-before-send/exact replay. Template routes do not validate UUIDs;
  T03/T05/T09 own runtime validation. Opaque interface shapes are future-task seams.
- SDK v1 maintenance horizon is a release-review risk. All compatibility matrix rows stay
  unverified; no actual MCP handshake, Pi gate, backend, Google or Android certification.
- Entries intentionally do not implement domain behavior; writes remain unavailable.
- Changes are uncommitted; no publication/deployment or personal account mutation occurred.
- T02/T03/T04 prerequisites are now satisfied for bounded assignment; prioritize T02
  fail-closed host feasibility. Do not start any dependent task without coordinator handoff.
