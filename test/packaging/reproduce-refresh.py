"""Fixed T18-R1 clean replay; explicit isolated prerequisites, no ambient npm config.

Usage: python3 test/packaging/reproduce-refresh.py <node> <provider> <libraries>
       <baseline> <workspace-inventory> <delivery-directory> <output-prefix>
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


node, provider, libraries, baseline, reference_file, delivery, output = sys.argv[1:]
workspace = Path.cwd()
baseline = Path(baseline).resolve()
delivery = Path(delivery).resolve()
reference = json.loads(Path(reference_file).read_text())
assert reference["success"] and reference["stable"] and reference["exitCode"] == 0
assert reference["failed"] == reference["pending"] == reference["todo"] == 0
assert all(result["other"] == 0 for result in reference["results"])
source = {p: h for p, h in reference["hashes"].items() if "dist" not in Path(p).parts}
# Required unchanged independent oracle for the shipped operational-budget table.
oracle = "docs/decisions/t05-approved-transport-spec.md"
source[oracle] = "5ff4ddb3e576ac48058654e30c87cd7e7414b0159d9facc04adeb344c04fb168"
selection = "docs/evidence/t18-r1-selection.json"
source[selection] = sha(workspace / selection)
emitted = {p: h for p, h in reference["hashes"].items()
           if p.startswith(("dist/", "companion/dist/"))
           and Path(p).suffix in (".js", ".ts")}
assert len(emitted) == 194
baseline_files = json.loads((baseline.parent / "baseline.json").read_text())
assert all(sha(baseline / p) == h for p, h in baseline_files.items())
assert all(sha(workspace / p) == h for p, h in source.items())

scope = Path(tempfile.mkdtemp(prefix=".gt-t18-r1-clean-", dir=workspace.parent))
summary = {"task": "T18-R1", "success": False, "checks": [],
           "sourceInputs": source, "emittedOutputs": emitted,
           "selection": reference["selection"],
           "baselineKind": "frozen current source, not historical pre-T18"}
try:
    target = scope / "source"
    target.mkdir()
    for p, h in source.items():
        dst = target / p
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(workspace / p, dst)
        assert sha(dst) == h
    for name in ("home", "cache", "runtime"):
        (scope / name).mkdir(mode=0o700)
    for name in ("user.npmrc", "global.npmrc"):
        (scope / name).write_text("")
    env = {
        "T01_NODE_HOME": str(Path(node).parent.parent),
        "PATH": str(Path(node).parent) + ":/usr/bin:/bin",
        "HOME": str(scope / "home"),
        "XDG_CONFIG_HOME": str(scope / "home/config"),
        "XDG_DATA_HOME": str(scope / "home/data"),
        "XDG_STATE_HOME": str(scope / "home/state"),
        "XDG_RUNTIME_DIR": str(scope / "runtime"),
        "NPM_CONFIG_CACHE": str(scope / "cache"),
        "NPM_CONFIG_USERCONFIG": str(scope / "user.npmrc"),
        "NPM_CONFIG_GLOBALCONFIG": str(scope / "global.npmrc"),
        "NPM_CONFIG_REGISTRY": "https://registry.npmjs.org/",
        "NPM_CONFIG_AUDIT": "false", "NPM_CONFIG_FUND": "false",
        "NODE_OPTIONS": "", "NODE_PATH": "", "LANG": "C.UTF-8",
        "GT_PACKAGE_REFRESH_BASELINE_ROOT": str(baseline),
    }
    assert not (target / "node_modules").exists() and not (target / "dist").exists()
    with open(output + "-build.log", "w") as log:
        for command in (
            ["npm", "ci", "--ignore-scripts"],
            ["npm", "run", "typecheck"],
            ["npm", "run", "lint:production"],
            ["npm", "run", "format:check:production"],
            ["npm", "run", "build"],
        ):
            result = subprocess.run(command, cwd=target, env=env, stdout=log,
                                    stderr=subprocess.STDOUT, timeout=300)
            summary["checks"].append({"command": " ".join(command),
                                      "exitCode": result.returncode})
            print(" ".join(command), result.returncode, flush=True)
            if result.returncode:
                raise RuntimeError("Clean locked check failed; private log retained")
        assert all(sha(target / p) == h for p, h in source.items())
        assert all(sha(target / p) == h for p, h in emitted.items())
        artifact = scope / "artifact"
        artifact.mkdir()
        result = subprocess.run(
            ["npm", "run", "package:artifact", "--", "--out", str(artifact)],
            cwd=target, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=60)
        summary["checks"].append({"command": "npm run package:artifact -- --out <empty-output>",
                                  "exitCode": result.returncode})
        assert result.returncode == 0
    original = json.loads((delivery / "gymtracka-mcp-0.0.0.inventory.json").read_text())
    reproduced = json.loads((artifact / "gymtracka-mcp-0.0.0.inventory.json").read_text())
    for field in ("files", "inputs", "runtimeDependencies", "archive"):
        assert original[field] == reproduced[field], field
    assert sha(delivery / original["archive"]["name"]) == original["archive"]["sha256"]
    assert sha(artifact / original["archive"]["name"]) == original["archive"]["sha256"]
    print("Clean archive bytes, content, modes, inputs and dependency lock match", flush=True)
    env["GT_PACKAGE_REFRESH_ARTIFACT_ROOT"] = str(artifact)
    result = subprocess.run(
        ["python3", "test/create-stdio/run-isolated.py", node, provider, libraries,
         selection, output], cwd=target, env=env, timeout=600)
    assert result.returncode == 0
    clean = json.loads(Path(output + ".inventory.json").read_text())
    cleanup = json.loads(Path(output + ".cleanup.json").read_text())
    assert clean["success"] and clean["stable"] and clean["exitCode"] == 0
    assert clean["failed"] == clean["pending"] == clean["todo"] == 0
    assert all(r["other"] == 0 for r in clean["results"])
    assert all(cleanup.values())
    assert clean["selection"] == reference["selection"]
    assert {r["file"]: r for r in clean["results"]} == {
        r["file"]: r for r in reference["results"]}
    assert all(sha(workspace / p) == sha(target / p) == h for p, h in source.items())
    assert all(sha(workspace / p) == sha(target / p) == h for p, h in emitted.items())
    assert all(sha(baseline / p) == h for p, h in baseline_files.items())
    assert sha(delivery / original["archive"]["name"]) == original["archive"]["sha256"]
    summary.update({
        "success": True, "sourceInputsCopied": len(source),
        "sourceInputsMatchWorkspace": True, "emittedFilesByteIdentical": len(emitted),
        "archiveBytesContentModesAndLockIdentical": True,
        "archive": original["archive"], "passed": clean["passed"],
        "failed": clean["failed"], "pending": clean["pending"], "todo": clean["todo"],
        "baselineFilesStable": len(baseline_files), "isolatedCleanup": cleanup,
    })
finally:
    shutil.rmtree(scope)
    summary["ownedCleanSnapshotRemoved"] = not scope.exists()
    Path(output + "-reproduction.json").write_text(json.dumps(summary, indent=2) + "\n")
print("Clean exact-package replay and owned cleanup PASS", flush=True)
