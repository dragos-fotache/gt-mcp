#!/usr/bin/env python3
"""Coordinator-only T03 locked-install reproduction; no parked targets executed."""

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
from tempfile import TemporaryDirectory

ROOT = Path.cwd()
RELAY_PATH = ROOT / "docs/evidence/t03-f1-artifact-relay.json"
RELAY = json.loads(RELAY_PATH.read_text())
FORBIDDEN = {".git", ".pi", "node_modules", "dist", "private", ".private",
             "vault", "journals", "receipts", "profiles", "coverage"}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def aggregate(rows):
    material = "".join(row["path"] + "\0" + row["sha256"] + "\n" for row in rows)
    return hashlib.sha256(material.encode()).hexdigest()


def verify_relay():
    for group in ["source", "build"]:
        rows = RELAY[group]
        assert aggregate(rows) == RELAY[group + "_inventory_digest"]
        for row in rows:
            path = ROOT / row["path"]
            assert path.is_file() and not path.is_symlink()
            assert sha(path) == row["sha256"], "Frozen artifact changed"


def safe_source(name):
    path = ROOT / name
    assert not Path(name).is_absolute() and ".." not in Path(name).parts
    assert not set(Path(name).parts) & FORBIDDEN, "Private/generated source refused"
    assert not any(part.startswith(".env") for part in Path(name).parts)
    assert path.is_file() and not path.is_symlink(), "Source symlink/nonfile refused"
    return path


verify_relay()
files = {row["path"] for row in RELAY["source"]}
files.update({"README.md", "docs/compatibility.md",
              "docs/decisions/t01-approved-foundation-spec.md",
              "docs/decisions/t01-implementation-adr.md",
              "docs/decisions/routine-creation-config-policy.md",
              "docs/decisions/t03-zod-import-adjudication.md",
              "test/fixtures/synthetic-vectors.mjs",
              "experiments/t02/tsconfig.json", "experiments/t02/metadata.json"})
# Preserve production check inputs, but copy/execute no parked QA tests/fixtures.
for tree in ["test/foundation", "test/unit/t03", ".github",
             "experiments/t02/companion", "experiments/t02/driver",
             "experiments/t02/driver-files", "experiments/t02/fixture-server"]:
    base = ROOT / tree
    assert base.is_dir() and not base.is_symlink()
    for path in base.rglob("*"):
        assert not path.is_symlink(), "Source symlink refused"
        if path.is_file():
            files.add(path.relative_to(ROOT).as_posix())
rows = [{"path": name, "sha256": sha(safe_source(name))} for name in sorted(files)]
lock_hash = sha(ROOT / "package-lock.json")
summary = {"revision": "t03-f1", "snapshot_kind": "allowlisted source, not clone/release",
           "source_file_count": len(rows), "source_inventory_digest": aggregate(rows),
           "lockfile_sha256": lock_hash, "commands": [],
           "limits": "Only T03/foundation tests; parked suite and release not claimed"}
node_home = os.environ.get("T01_NODE_HOME")
assert node_home, "Provisioned toolchain required"
# Use the existing public package download cache; never copy it or user config.
npm_cache = os.environ.get("NPM_CONFIG_CACHE", str(Path.home() / ".npm"))
with TemporaryDirectory(prefix="gt-mcp-t03-clean-") as directory:
    scope = Path(directory)
    target = scope / "source"
    home = scope / "home"
    temp = scope / "tmp"
    target.mkdir()
    home.mkdir()
    temp.mkdir()
    userconfig = scope / "empty-npmrc"
    userconfig.write_text("")
    for row in rows:
        dest = target / row["path"]
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(safe_source(row["path"]), dest)
    assert not (target / "node_modules").exists() and not (target / "dist").exists()
    env = {"PATH": node_home + "/bin:/usr/bin:/bin", "T01_NODE_HOME": node_home,
           "HOME": str(home), "TMPDIR": str(temp), "TMP": str(temp), "TEMP": str(temp),
           "XDG_CONFIG_HOME": str(home), "XDG_DATA_HOME": str(home),
           "XDG_STATE_HOME": str(home), "XDG_CACHE_HOME": str(home), "NO_COLOR": "1",
           "NPM_CONFIG_USERCONFIG": str(userconfig), "NPM_CONFIG_CACHE": npm_cache}
    commands = [["node", "--version"], ["npm", "--version"],
                ["npm", "ci", "--ignore-scripts"],
                ["npm", "run", "typecheck"], ["npm", "run", "lint:production"],
                ["npm", "run", "format:check:production"], ["npm", "run", "build"],
                ["npm", "run", "test", "--", "test/unit/t03"], ["npm", "run", "smoke"]]
    for command in commands:
        result = subprocess.run(command, cwd=target, env=env, text=True,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        output = result.stdout.replace(str(scope), "<snapshot>")
        output = output.replace(npm_cache, "<npm-cache>").replace(str(ROOT), "<repository>")
        print("COMMAND:", " ".join(command), "EXIT:", result.returncode, flush=True)
        print(output, flush=True)
        summary["commands"].append({"command": " ".join(command), "exit": result.returncode})
        if result.returncode:
            summary["status"] = "failed"
            (ROOT / "docs/evidence/t03-clean-source-snapshot-result.json").write_text(
                json.dumps(summary, indent=2) + "\n")
            raise SystemExit(result.returncode)
    assert sha(target / "package-lock.json") == lock_hash
    for row in rows:
        assert sha(target / row["path"]) == row["sha256"], "Snapshot source changed"
        assert sha(safe_source(row["path"])) == row["sha256"], "Live source changed"
    for row in RELAY["build"]:
        assert sha(target / row["path"]) == row["sha256"], "Clean build byte mismatch"
    summary["build_matches_frozen_relay"] = True
    summary["snapshot_source_unchanged"] = True
verify_relay()
summary["cleanup"] = "Disposable snapshot/HOME/temp removed; dependency cache not copied"
summary["status"] = "passed"
(ROOT / "docs/evidence/t03-clean-source-snapshot-result.json").write_text(
    json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
