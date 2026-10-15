#!/usr/bin/env python3
"""Coordinator: clean locked reproduction of the explicit bounded T05 selection."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
from tempfile import TemporaryDirectory

ROOT = Path.cwd()
MANIFEST = ROOT / os.environ["T05_RELAY_INVENTORY"]
RELAY = json.loads(MANIFEST.read_text())
RESULT = ROOT / "docs/evidence/t05-clean-source-snapshot-result.json"
FORBIDDEN = {".git", ".pi", "node_modules", "dist", "private", ".private", "vault",
             "journals", "receipts", "profiles", "coverage"}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_relay():
    for row in RELAY["files"]:
        path = ROOT / row["path"]
        assert path.is_file() and not path.is_symlink() and sha(path) == row["sha256"], "Frozen artifact changed"


verify_relay()
active = RELAY["activeSuites"]
helpers = RELAY["activeHelpers"]
assert len(active) == 15 and len(helpers) == 4
files = {row["path"] for row in RELAY["files"] if "dist" not in Path(row["path"]).parts}
files.update({".gitignore", "test/fixtures/synthetic-vectors.mjs",
              "docs/decisions/t01-approved-foundation-spec.md",
              "docs/decisions/t01-implementation-adr.md",
              "docs/decisions/t03-approved-schema-codec-spec.md",
              "docs/decisions/t03-zod-import-adjudication.md",
              "docs/decisions/t04-approved-storage-spec.md"})
for tree in [".github", "test/foundation", "test/unit/t03", "test/unit/t04", "test/fault/t04"]:
    base = ROOT / tree
    assert base.is_dir() and not base.is_symlink()
    for path in base.rglob("*"):
        assert not path.is_symlink(), "Symlink source rejected"
        if path.is_file():
            files.add(path.relative_to(ROOT).as_posix())
rows = []
for name in sorted(files):
    rel = Path(name)
    assert not rel.is_absolute() and ".." not in rel.parts
    assert not set(rel.parts) & FORBIDDEN and not any(x.startswith(".env") for x in rel.parts)
    path = ROOT / rel
    assert path.is_file() and not path.is_symlink(), "Allowlisted source absent"
    rows.append({"path": name, "sha256": sha(path)})
summary = {"revision": RELAY["revision"], "relayInventorySha256": sha(MANIFEST),
           "snapshotKind": "explicit allowlisted source; NOT clone/release/whole-suite",
           "sourceFileCount": len(rows),
           "sourceInventorySha256": hashlib.sha256("".join(x["path"] + "\0" + x["sha256"] + "\n" for x in rows).encode()).hexdigest(),
           "activeOwningSuites": active, "commands": [], "status": "in_progress"}
node_home = os.environ["T01_NODE_HOME"]
provider_prefix = os.environ["T04_PROVIDER_PREFIX"]
launcher = Path(os.environ.get("T04_PRIVATE_LAUNCHER", "/tmp/gt-mcp-t04-qa-private-run.sh"))
assert launcher.is_file(), "Qualified private-provider launcher missing"
summary["privateProviderLauncherSha256"] = sha(launcher)
try:
    with TemporaryDirectory(prefix="gt-mcp-t05-clean-") as directory:
        scope = Path(directory)
        target = scope / "source"; target.mkdir()
        home = scope / "home"; home.mkdir()
        temp = scope / "tmp"; temp.mkdir()
        cache = scope / "npm-cache"; cache.mkdir()
        npmrc = scope / "empty-npmrc"; npmrc.write_text("")
        for row in rows:
            destination = target / row["path"]
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / row["path"], destination)
        assert not (target / "node_modules").exists() and not (target / "dist").exists()
        env = {"PATH": node_home + "/bin:/usr/bin:/bin", "T01_NODE_HOME": node_home,
               "T04_PROVIDER_PREFIX": provider_prefix, "HOME": str(home),
               "TMPDIR": str(temp), "TMP": str(temp), "TEMP": str(temp),
               "XDG_CONFIG_HOME": str(home / "config"), "XDG_DATA_HOME": str(home / "data"),
               "XDG_STATE_HOME": str(home / "state"), "XDG_CACHE_HOME": str(home / "cache"),
               "NPM_CONFIG_USERCONFIG": str(npmrc), "NPM_CONFIG_CACHE": str(cache),
               "NO_COLOR": "1", "TZ": "UTC"}
        commands = [
            ["node", "--version"], ["npm", "--version"], ["npm", "ci", "--ignore-scripts"],
            ["npm", "run", "typecheck"], ["npm", "run", "lint:production"],
            ["npm", "run", "format:check:production"], ["npm", "run", "build"],
            ["node", "node_modules/vitest/vitest.mjs", "run", *active],
            ["npm", "run", "smoke"],
            ["node", "node_modules/vitest/vitest.mjs", "run", "test/unit/t03"],
            ["node", "node_modules/vitest/vitest.mjs", "run", "test/unit/t04"],
            ["bash", str(launcher), "test/fault/t04"],
            ["node", "node_modules/eslint/bin/eslint.js", *active, *helpers],
            ["node", "node_modules/prettier/bin/prettier.cjs", "--check", *active, *helpers],
        ]
        for command in commands:
            result = subprocess.run(command, cwd=target, env=env, text=True,
                                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=240)
            label = " ".join(command).replace(str(launcher), "<qualified-private-provider-launcher>")
            output = result.stdout.replace(str(scope), "<snapshot>").replace(str(ROOT), "<repository>")
            print("COMMAND:", label, "EXIT:", result.returncode, flush=True)
            print(output, flush=True)
            summary["commands"].append({"command": label, "exit": result.returncode})
            if result.returncode:
                summary["status"] = "failed"
                raise SystemExit(result.returncode)
            if command == ["node", "--version"]:
                assert result.stdout.strip() == "v24.21.0", "Wrong Node pin"
            if command == ["npm", "--version"]:
                assert result.stdout.strip() == "11.19.0", "Wrong npm pin"
        for row in rows:
            assert sha(target / row["path"]) == row["sha256"], "Snapshot source changed"
            assert sha(ROOT / row["path"]) == row["sha256"], "Live source changed"
        for row in RELAY["files"]:
            if "dist" in Path(row["path"]).parts:
                assert sha(target / row["path"]) == row["sha256"], "Rebuild differs from frozen artifact"
        verify_relay()
        summary["buildMatchesFrozenRelay"] = True
        summary["sourcesUnchanged"] = True
        summary["status"] = "passed"
finally:
    if summary["status"] == "in_progress":
        summary["status"] = "failed"
    summary["cleanup"] = "Disposable source/HOME/temp/cache removed; private-provider launcher owns isolated daemon/keyring teardown"
    summary["limits"] = "Bounded T05 + foundation/T03/T04 only; deferred/parked suites excluded explicitly, no backend/host/Google/Android/release claim"
    RESULT.write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
