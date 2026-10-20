"""Reconstruct the exact sanitized T18-S3 candidate and replay its fixed selection.

Run from the workspace with the disposable T01_NODE_HOME. Public disposable
tool/provider/baseline locations below are prerequisites, never operator state.
"""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

workspace = Path.cwd()
assert sys.argv[1:] in ([], ["--documents-only"])
documents_only = sys.argv[1:] == ["--documents-only"]
document_inventory = Path("/tmp/gt-t18-s3-doc-closure.inventory.json")
source_inventory = document_inventory if document_inventory.exists() else Path(
    "/tmp/gt-t18-s3-final.inventory.json")
inventory = json.loads(source_inventory.read_text())
reference = inventory if documents_only else json.loads(Path(
    "/tmp/gt-t18-s3-final.inventory.json").read_text())
output = "/tmp/gt-t18-s3-doc-clean" if documents_only else "/tmp/gt-t18-s3-clean"
candidate = "/tmp/gt-t18-s3-delivery-artifact" if document_inventory.exists() else "/tmp/gt-t18-s3-final-artifact"
assert inventory["success"] and inventory["stable"]
assert inventory["failed"] == inventory["pending"] == inventory["todo"] == 0
assert all(result["other"] == 0 for result in inventory["results"])


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


source = {p: h for p, h in inventory["hashes"].items() if "dist" not in Path(p).parts}
# The S2 document oracle reads this approved spec. It is a source-snapshot
# prerequisite, not a shipped file; retain its independently accepted S2 hash.
oracle = "docs/decisions/t05-approved-transport-spec.md"
source[oracle] = "5ff4ddb3e576ac48058654e30c87cd7e7414b0159d9facc04adeb344c04fb168"
emitted = {p: h for p, h in inventory["hashes"].items()
           if p.startswith(("dist/", "companion/dist/"))}
baseline = Path("/tmp/gt-t18-s3-baseline/source")
old = json.loads(Path("/tmp/gt-t18-s3-baseline-reproduction.json").read_text())
for p, h in old["inputs"].items():
    assert sha(baseline / p) == h
for p, h in old["emitted"].items():
    assert sha(baseline / p) == h
for p, h in source.items():
    assert sha(workspace / p) == h

scope = Path(tempfile.mkdtemp(prefix=".gt-t18-s3-clean-", dir=workspace.parent))
try:
    target = scope / "source"
    target.mkdir()
    for p, h in source.items():
        dst = target / p
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(workspace / p, dst)
        assert sha(dst) == h
    selection = "docs/evidence/t18-s3-doc-closure-selection.json" if documents_only else "docs/evidence/t18-s3-selection.json"
    (target / selection).parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(workspace / selection, target / selection)
    for name in ("home", "cache", "runtime"):
        (scope / name).mkdir(mode=0o700)
    for name in ("user.npmrc", "global.npmrc"):
        (scope / name).write_text("")
    env = {
        "T01_NODE_HOME": os.environ["T01_NODE_HOME"],
        "PATH": os.environ["T01_NODE_HOME"] + "/bin:/usr/bin:/bin",
        "HOME": str(scope / "home"),
        "XDG_CONFIG_HOME": str(scope / "home/config"),
        "XDG_DATA_HOME": str(scope / "home/data"),
        "XDG_STATE_HOME": str(scope / "home/state"),
        "XDG_RUNTIME_DIR": str(scope / "runtime"),
        "NPM_CONFIG_CACHE": str(scope / "cache"),
        "NPM_CONFIG_USERCONFIG": str(scope / "user.npmrc"),
        "NPM_CONFIG_GLOBALCONFIG": str(scope / "global.npmrc"),
        "GT_T18_BASELINE_ROOT": str(baseline),
        "LANG": "C.UTF-8",
    }
    assert not (target / "node_modules").exists() and not (target / "dist").exists()
    checks = []
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
            checks.append({"command": " ".join(command), "exitCode": result.returncode})
            print(" ".join(command), result.returncode, flush=True)
            if result.returncode:
                raise RuntimeError("Clean locked production check failed; log retained")
        for p, h in source.items():
            assert sha(target / p) == h
        for p, h in emitted.items():
            assert sha(target / p) == h
        artifact = scope / "artifact"
        artifact.mkdir()
        command = ["npm", "run", "package:artifact", "--", "--out", str(artifact)]
        result = subprocess.run(command, cwd=target, env=env, stdout=log,
                                stderr=subprocess.STDOUT, timeout=120)
        checks.append({"command": "npm run package:artifact -- --out <empty-output>",
                       "exitCode": result.returncode})
        assert result.returncode == 0

    package = json.loads((artifact / "gymtracka-mcp-0.0.0.inventory.json").read_text())
    original_package = json.loads((Path(candidate) /
        "gymtracka-mcp-0.0.0.inventory.json").read_text())
    assert package["files"] == original_package["files"]
    assert package["runtimeDependencies"] == original_package["runtimeDependencies"]
    assert package["inputs"] == original_package["inputs"]
    print(len(source), "identical source inputs;", len(emitted),
          "byte-identical outputs; package contents/modes/lock identical", flush=True)
    result = subprocess.run([
        "python3", "test/create-stdio/run-isolated.py",
        env["T01_NODE_HOME"] + "/bin/node",
        "/tmp/gt-t18-s1-provider/usr/bin/gnome-keyring-daemon",
        "/tmp/gt-t18-s1-provider/usr/lib", selection, output,
    ], cwd=target, env=env, timeout=600)
    assert result.returncode == 0
    clean = json.loads(Path(output + ".inventory.json").read_text())
    assert clean["stable"] and clean["success"]
    assert clean["failed"] == clean["pending"] == clean["todo"] == 0
    assert all(r["other"] == 0 for r in clean["results"])
    assert clean["selection"] == reference["selection"]
    assert {r["file"]: r for r in clean["results"]} == {r["file"]: r for r in reference["results"]}
    for p, h in source.items():
        assert sha(workspace / p) == sha(target / p) == h
    for p, h in emitted.items():
        assert sha(workspace / p) == sha(target / p) == h
    for p, h in old["inputs"].items():
        assert sha(baseline / p) == h
    for p, h in old["emitted"].items():
        assert sha(baseline / p) == h
    summary = {
        "algorithm": "sha256", "sourceInputsCopied": len(source),
        "sourceInputsMatchWorkspace": True, "stableAcrossCleanReplay": True,
        "emittedOutputsByteIdentical": True, "emittedOutputCount": len(emitted),
        "checks": checks, "selectedReplayExitCode": result.returncode,
        "passed": clean["passed"], "failed": clean["failed"],
        "pending": clean["pending"], "todo": clean["todo"],
        "selection": clean["selection"], "sourceInputs": source,
        "emittedOutputs": emitted, "baselineInputsStable": len(old["inputs"]),
        "baselineEmittedStable": len(old["emitted"]),
        "packageFilesBytesAndModesIdentical": True,
        "runtimeLockDependencyIdentitiesIdentical": True,
        "packageInputHashesIdentical": True,
        "workspaceArchive": original_package["archive"],
        "cleanArchive": package["archive"],
        "documentsOnlyClosure": documents_only,
    }
finally:
    shutil.rmtree(scope)

summary["ownedCleanSnapshotRemoved"] = not scope.exists()
Path(output + "-reproduction.json").write_text(
    json.dumps(summary, indent=2) + "\n")
print("Clean locked parent acceptance and owned cleanup PASS", flush=True)
