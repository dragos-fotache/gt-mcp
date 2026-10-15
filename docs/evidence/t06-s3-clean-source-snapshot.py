#!/usr/bin/env python3
"""Coordinator: explicit locked T06-S3 reproduction, not whole-suite discovery."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
from tempfile import TemporaryDirectory

ROOT = Path.cwd()
MANIFEST = ROOT / "docs/evidence/t06-s3-f1-artifact-inventory.json"
EXPECTED_MANIFEST = "92e4dbaafbee306425d7e719023d6c7ce5b3d4f4675ec6d6a39b4de3794d88b3"
RESULT = ROOT / "docs/evidence/t06-s3-clean-source-snapshot-result.json"
FORBIDDEN = {".git", ".pi", "node_modules", "private", ".private", "vault", "journals",
             "receipts", "profiles", "coverage"}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify(rows, root):
    for row in rows:
        path = root / row["path"]
        assert path.is_file() and not path.is_symlink(), "Unsafe frozen input"
        assert sha(path) == row["sha256"], "Frozen input changed"


cleanup_completed = False
summary = {"artifactId": "t06-s3-f1", "snapshotKind": "explicit allowlisted locked source",
           "relayInventorySha256": EXPECTED_MANIFEST, "status": "in_progress", "commands": []}
exit_code = 1
try:
    assert sha(MANIFEST) == EXPECTED_MANIFEST, "Relay inventory changed"
    relay = json.loads(MANIFEST.read_text())
    verify(relay["files"], ROOT)
    sources = [row for row in relay["files"] if "dist" not in Path(row["path"]).parts]
    compiled = [row for row in relay["files"] if "dist" in Path(row["path"]).parts]
    summary["sourceFileCount"] = len(sources)
    summary["compiledFileCount"] = len(compiled)
    summary["sourceInventorySha256"] = hashlib.sha256(
        "".join(row["path"] + "\0" + row["sha256"] + "\n" for row in sources).encode()).hexdigest()
    node_home = os.environ["T01_NODE_HOME"]
    with TemporaryDirectory(prefix="gt-t06-s3-clean-") as directory:
        scope = Path(directory)
        target = scope / "source"
        target.mkdir()
        home = scope / "home"
        home.mkdir()
        temp = scope / "tmp"
        temp.mkdir()
        cache = scope / "npm-cache"
        cache.mkdir()
        npmrc = scope / "empty-npmrc"
        npmrc.write_text("")
        for row in sources:
            relative = Path(row["path"])
            assert not relative.is_absolute() and ".." not in relative.parts
            assert not set(relative.parts) & FORBIDDEN
            assert not any(part.startswith(".env") for part in relative.parts)
            destination = target / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / relative, destination)
        assert not (target / "node_modules").exists() and not (target / "dist").exists()
        env = {"PATH": node_home + "/bin:/usr/bin:/bin", "T01_NODE_HOME": node_home,
               "HOME": str(home), "TMPDIR": str(temp), "TMP": str(temp), "TEMP": str(temp),
               "XDG_CONFIG_HOME": str(home / "config"), "XDG_DATA_HOME": str(home / "data"),
               "XDG_STATE_HOME": str(home / "state"), "XDG_CACHE_HOME": str(home / "cache"),
               "NPM_CONFIG_USERCONFIG": str(npmrc), "NPM_CONFIG_CACHE": str(cache),
               "NO_COLOR": "1", "TZ": "UTC"}
        commands = [
            ["node", "--version"], ["npm", "--version"], ["npm", "ci", "--ignore-scripts"],
            ["npm", "run", "typecheck"], ["npm", "run", "lint:production"],
            ["npm", "run", "format:check:production"], ["npm", "run", "build"],
            ["node", "node_modules/vitest/vitest.mjs", "run", *relay["owningSuites"]],
            ["node", "node_modules/vitest/vitest.mjs", "run", *relay["regressionSelectors"]],
            ["node", "node_modules/eslint/bin/eslint.js", *relay["owningSuites"], "test/unit/t06/s3-helpers.mjs"],
            ["node", "node_modules/prettier/bin/prettier.cjs", "--check", *relay["owningSuites"], "test/unit/t06/s3-helpers.mjs"],
        ]
        for command in commands:
            result = subprocess.run(command, cwd=target, env=env, text=True,
                                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                    timeout=None if command[0:3] == ["node", "node_modules/vitest/vitest.mjs", "run"] else 300)
            label = " ".join(command)
            output = result.stdout.replace(str(scope), "<snapshot>").replace(str(ROOT), "<repository>").replace(node_home, "<toolchain>")
            print("COMMAND:", label, "EXIT:", result.returncode, flush=True)
            print(output, flush=True)
            counts = [line.strip() for line in output.splitlines()
                      if re.match(r"\s*(Test Files|Tests|Duration)\s", line)]
            summary["commands"].append({"command": label, "exit": result.returncode,
                                        "testSummary": counts})
            if result.returncode:
                summary["status"] = "failed"
                raise SystemExit(result.returncode)
            if command == ["node", "--version"]:
                assert result.stdout.strip() == "v24.21.0", "Wrong Node pin"
            if command == ["npm", "--version"]:
                assert result.stdout.strip() == "11.19.0", "Wrong npm pin"
        verify(sources, target)
        verify(compiled, target)
        verify(relay["files"], ROOT)
        summary.update({"status": "passed", "sourcesUnchanged": True,
                        "buildMatchesFrozenRelay": True})
        exit_code = 0
    cleanup_completed = True
except SystemExit as error:
    exit_code = error.code if isinstance(error.code, int) else 1
except Exception as error:
    summary["errorType"] = type(error).__name__
finally:
    if summary["status"] == "in_progress":
        summary["status"] = "failed"
    summary["cleanupCompleted"] = cleanup_completed
    summary["cleanup"] = ("Disposable source/HOME/XDG/temp/cache scope removed; test-owned fixture teardown required"
                          if cleanup_completed else "Failure before completed reproduction; cleanup success not preclaimed")
    summary["limits"] = "S3 owning33 plus explicit unchanged S1/S2/T04unit/T05hooks169 only; not whole-suite/provider/backend/host/browser/release"
    RESULT.write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2), flush=True)
raise SystemExit(exit_code)
