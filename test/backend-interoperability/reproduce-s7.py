"""Clean locked S7 reconstruction and full isolated owning/regression replay.

Run after accepted workspace runtime inventory; all external paths are explicit.
No warm node_modules/outputs/private state are copied. Both source and emitted
identities must match; raw logs live only in the owned disposable root.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("inventory", "android-root", "backend-root", "sdk", "node", "provider", "libraries", "output",
                 "selection", "regression-selection"):
        parser.add_argument("--" + name, required=True)
    args = parser.parse_args()
    workspace = Path.cwd()
    inventory = json.loads(Path(args.inventory).read_text())
    if not inventory["success"] or not inventory["stable"] or any(inventory[key] for key in ("failed", "pending", "todo")):
        raise RuntimeError("A passing stable workspace inventory is required")
    source = {p: h for p, h in inventory["hashes"].items() if "dist" not in Path(p).parts}
    emitted = {p: h for p, h in inventory["hashes"].items() if p.startswith(("dist/", "companion/dist/"))}
    # Compatibility prose is permitted to advance after actual workspace proof.
    # Record that delta explicitly, never silently reinterpret runtime identity.
    prose = "docs/compatibility.md"
    changes = {}
    if sha(workspace / prose) != source[prose]:
        changes[prose] = {"runtimeSha256": source[prose], "cleanSha256": sha(workspace / prose)}
        source[prose] = sha(workspace / prose)
    if any(sha(workspace / p) != h for p, h in {**source, **emitted}.items()):
        raise RuntimeError("Workspace candidate changed beyond declared compatibility prose")
    report = {"status": "FAIL", "sourceInputs": source, "emittedOutputs": emitted,
              "postRuntimeProse": changes, "checks": []}
    code = 1
    with tempfile.TemporaryDirectory(prefix=".gt-t16-s7-clean-", dir=workspace.parent) as temporary:
        root = Path(temporary)
        os.chmod(root, 0o700)
        target = root / "source"
        target.mkdir()
        for relative, expected in source.items():
            destination = target / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(workspace / relative, destination)
            if sha(destination) != expected:
                raise RuntimeError("Source copy mismatch")
        for selection in (args.selection, args.regression_selection):
            relative = Path(selection)
            (target / relative).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(workspace / relative, target / relative)
        for name in ("home", "cache", "runtime"):
            (root / name).mkdir(mode=0o700)
        for name in ("user.npmrc", "global.npmrc"):
            (root / name).write_text("")
        node = Path(args.node).resolve()
        env = {"T01_NODE_HOME": str(node.parent.parent), "PATH": str(node.parent) + ":/usr/bin:/bin",
               "HOME": str(root / "home"), "XDG_CONFIG_HOME": str(root / "home/config"),
               "XDG_DATA_HOME": str(root / "home/data"), "XDG_RUNTIME_DIR": str(root / "runtime"),
               "NPM_CONFIG_CACHE": str(root / "cache"), "NPM_CONFIG_USERCONFIG": str(root / "user.npmrc"),
               "NPM_CONFIG_GLOBALCONFIG": str(root / "global.npmrc"), "LANG": "C.UTF-8"}
        log_path = root / "private-build.log"
        with log_path.open("wb") as log:
            for command in (["npm", "ci", "--ignore-scripts"], ["npm", "run", "typecheck"],
                            ["npm", "run", "lint:production"], ["npm", "run", "format:check:production"],
                            ["npm", "run", "build"]):
                result = subprocess.run(command, cwd=target, env=env, stdout=log, stderr=log, timeout=300)
                report["checks"].append({"command": " ".join(command), "exitCode": result.returncode})
                print("T16-S7 clean: " + " ".join(command) + " -> " + str(result.returncode), flush=True)
                if result.returncode:
                    raise RuntimeError("Clean locked production check failed")
        if any(sha(target / p) != h for p, h in {**source, **emitted}.items()):
            raise RuntimeError("Clean reconstruction is not byte identical")
        report["sourceInputsCopied"] = len(source)
        report["byteIdenticalEmittedOutputs"] = len(emitted)
        print("T16-S7 clean: source and compiled identities match", flush=True)
        # Integration launchers replace all application homes/buses and never
        # consume operator config. Retain public Gradle/Maven download caches.
        execution_env = dict(os.environ)
        execution_env.update(T01_NODE_HOME=str(node.parent.parent), PATH=str(node.parent) + ":/usr/bin:/bin",
                             JAVA_HOME="/usr/lib/jvm/java-27-openjdk")
        result = subprocess.run(
            ["python3", "test/backend-interoperability/run-android.py", "--android-root", args.android_root,
             "--backend-root", args.backend_root, "--sdk", args.sdk, "--node", args.node, "--provider", args.provider,
             "--libraries", args.libraries, "--selection", args.selection, "--output", args.output],
            cwd=target, env=execution_env, timeout=1800)
        report["owningExitCode"] = result.returncode
        if result.returncode == 0:
            result = subprocess.run(
                ["python3", "test/create-stdio/run-isolated.py", args.node, args.provider, args.libraries,
                 args.regression_selection, args.output + "-regressions"],
                cwd=target, env=execution_env, timeout=660)
            report["regressionsExitCode"] = result.returncode
        code = result.returncode
        report["stableSourceAndOutputs"] = all(sha(target / p) == h and sha(workspace / p) == h
                                                    for p, h in {**source, **emitted}.items())
        if not report["stableSourceAndOutputs"]:
            code = 1
        report["status"] = "PASS" if code == 0 else "FAIL"
        report["privateBuildLogSha256"] = sha(log_path)
    report["ownedCleanRootRemoved"] = not root.exists()
    Path(args.output + ".reproduction.json").write_text(json.dumps(report, indent=2) + "\n")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
