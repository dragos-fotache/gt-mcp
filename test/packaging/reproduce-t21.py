"""Bounded T21-S6 clean locked reconstruction and exact installed parent replay.

No warm node_modules/dist or private state enter the clean source target. Reuse
existing guarded backend/provider runners; no new interception/fault framework.
All output is sanitized metadata; child build logs stay outside repository evidence.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("node", "provider", "libraries", "baseline", "inventory", "delivery",
                 "backend-root", "android-root", "output",
                 "main-selection", "storage-selection", "cleanup-selection"):
        parser.add_argument("--" + name, required=True)
    args = parser.parse_args()
    workspace = Path.cwd()
    node, baseline, delivery = (Path(value).resolve() for value in (args.node, args.baseline, args.delivery))
    reference = json.loads(Path(args.inventory).read_text())
    assert reference["success"] and reference["stable"] and reference["exitCode"] == 0
    assert reference["failed"] == reference["pending"] == reference["todo"] == 0
    assert all(result["other"] == 0 for result in reference["results"])
    source = {p: h for p, h in reference["hashes"].items() if "dist" not in Path(p).parts}
    selections = [args.main_selection, args.storage_selection, args.cleanup_selection]
    for name in selections:
        source[name] = sha(workspace / name)
    expected_main = json.loads((workspace / selections[0]).read_text())
    assert reference["selection"] == expected_main
    assert len(reference["results"]) == len(expected_main)
    assert {r["file"] for r in reference["results"]} == set(expected_main)
    emitted = {p: h for p, h in reference["hashes"].items()
               if p.startswith(("dist/", "companion/dist/")) and Path(p).suffix in (".js", ".ts")}
    assert emitted and all(sha(workspace / p) == h for p, h in {**source, **emitted}.items())
    baseline_files = json.loads((baseline.parent / "baseline.json").read_text())
    assert all(sha(baseline / p) == h for p, h in baseline_files.items())
    report = {"task": "T21-S6", "status": "FAIL", "checks": [], "sourceInputs": source,
              "emittedOutputs": emitted, "selection": reference["selection"],
              "baselineKind": "frozen accepted S5 current-format source; not an old-release migration"}
    code = 1
    with tempfile.TemporaryDirectory(prefix=".gt-t21-s6-clean-", dir=workspace.parent) as temporary:
        scope = Path(temporary)
        os.chmod(scope, 0o700)
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
                "T01_NODE_HOME": str(node.parent.parent), "PATH": str(node.parent) + ":/usr/bin:/bin",
                "HOME": str(scope / "home"), "XDG_CONFIG_HOME": str(scope / "home/config"),
                "XDG_DATA_HOME": str(scope / "home/data"), "XDG_STATE_HOME": str(scope / "home/state"),
                "XDG_RUNTIME_DIR": str(scope / "runtime"), "NPM_CONFIG_CACHE": str(scope / "cache"),
                "NPM_CONFIG_USERCONFIG": str(scope / "user.npmrc"),
                "NPM_CONFIG_GLOBALCONFIG": str(scope / "global.npmrc"),
                "NPM_CONFIG_REGISTRY": "https://registry.npmjs.org/", "NPM_CONFIG_AUDIT": "false",
                "NPM_CONFIG_FUND": "false", "NODE_OPTIONS": "", "NODE_PATH": "", "LANG": "C.UTF-8",
                "GT_PACKAGE_REFRESH_BASELINE_ROOT": str(baseline),
            }
            assert not (target / "node_modules").exists() and not (target / "dist").exists()
            log_path = Path(args.output + "-build.log")
            with log_path.open("w") as log:
                for command in (["npm", "ci", "--ignore-scripts"], ["npm", "run", "typecheck"],
                                ["npm", "run", "lint:production"], ["npm", "run", "format:check:production"],
                                ["npm", "run", "build"]):
                    result = subprocess.run(command, cwd=target, env=env, stdout=log, stderr=log, timeout=300)
                    report["checks"].append({"command": " ".join(command), "exitCode": result.returncode})
                    print("T21-S6 clean: " + " ".join(command) + " -> " + str(result.returncode), flush=True)
                    if result.returncode:
                        raise RuntimeError("clean locked production check failed")
                assert all(sha(target / p) == h for p, h in {**source, **emitted}.items())
                artifact = scope / "artifact"
                artifact.mkdir()
                result = subprocess.run(["npm", "run", "package:artifact", "--", "--out", str(artifact)],
                                        cwd=target, env=env, stdout=log, stderr=log, timeout=60)
                report["checks"].append({"command": "npm run package:artifact -- --out <empty-output>",
                                         "exitCode": result.returncode})
                assert result.returncode == 0
            original = json.loads((delivery / "gymtracka-mcp-0.0.0.inventory.json").read_text())
            reproduced = json.loads((artifact / "gymtracka-mcp-0.0.0.inventory.json").read_text())
            for field in ("files", "inputs", "runtimeDependencies", "archive"):
                assert original[field] == reproduced[field], field
            assert sha(delivery / original["archive"]["name"]) == sha(artifact / original["archive"]["name"]) == original["archive"]["sha256"]
            print("T21-S6 clean: source/build/archive bytes, modes and dependency lock match", flush=True)
            # Only public Maven download caches are reused. The guarded runner
            # ignores operator config and its private provider replaces all homes.
            execution_env = {key: os.environ[key] for key in ("HOME", "LANG", "JAVA_HOME") if key in os.environ}
            execution_env.update(T01_NODE_HOME=str(node.parent.parent), PATH=env["PATH"],
                                 GT_PACKAGE_REFRESH_BASELINE_ROOT=str(baseline),
                                 GT_PACKAGE_REFRESH_ARTIFACT_ROOT=str(artifact))
            command = ["python3", "test/backend-interoperability/run-isolated.py", "--slice", "T21-S6",
                       "--restartable", "--clock-seam", "--account-proof", "--backend-root", args.backend_root,
                       "--android-root", args.android_root, "--node", str(node), "--provider", args.provider,
                       "--libraries", args.libraries, "--selection", selections[0], "--output", args.output]
            result = subprocess.run(command, cwd=target, env=execution_env, timeout=1800)
            report["checks"].append({"command": "guarded actual-backend integrated main selection", "exitCode": result.returncode})
            assert result.returncode == 0
            clean = json.loads(Path(args.output + ".inventory.json").read_text())
            cleanup = json.loads(Path(args.output + ".cleanup.json").read_text())
            assert clean["success"] and clean["stable"] and clean["exitCode"] == 0
            assert clean["failed"] == clean["pending"] == clean["todo"] == 0 and all(cleanup.values())
            assert clean["selection"] == reference["selection"]
            assert len(clean["results"]) == len(expected_main)
            assert {r["file"] for r in clean["results"]} == set(expected_main)
            assert {r["file"]: r for r in clean["results"]} == {r["file"]: r for r in reference["results"]}
            terminal_results = []
            for selection, suffix in zip(selections[1:], ("-storage", "-cleanup")):
                result = subprocess.run(["python3", "test/create-stdio/run-isolated.py", str(node), args.provider,
                                         args.libraries, selection, args.output + suffix],
                                        cwd=target, env=execution_env, timeout=900)
                assert result.returncode == 0
                inventory = json.loads(Path(args.output + suffix + ".inventory.json").read_text())
                isolated_cleanup = json.loads(Path(args.output + suffix + ".cleanup.json").read_text())
                assert inventory["success"] and inventory["stable"] and inventory["exitCode"] == 0
                assert inventory["failed"] == inventory["pending"] == inventory["todo"] == 0
                assert all(isolated_cleanup.values())
                expected_terminal = json.loads((target / selection).read_text())
                assert inventory["selection"] == expected_terminal
                assert len(inventory["results"]) == len(expected_terminal)
                assert {r["file"] for r in inventory["results"]} == set(expected_terminal)
                terminal_results.append({"selection": inventory["selection"], "passed": inventory["passed"],
                                         "cleanup": isolated_cleanup})
            assert all(sha(workspace / p) == sha(target / p) == h for p, h in {**source, **emitted}.items())
            assert all(sha(baseline / p) == h for p, h in baseline_files.items())
            assert sha(delivery / original["archive"]["name"]) == original["archive"]["sha256"]
            report.update(status="PASS", sourceInputsCopied=len(source), emittedFilesByteIdentical=len(emitted),
                          archiveBytesContentModesAndLockIdentical=True, archive=original["archive"],
                          mainPassed=clean["passed"], terminalResults=terminal_results,
                          sourceInputsAndOutputsStable=True, baselineFilesStable=len(baseline_files))
            code = 0
        except Exception as error:
            report["failureClass"] = type(error).__name__
            print("T21-S6 clean reproduction failed; see sanitized report/private build log", flush=True)
        finally:
            log = Path(args.output + "-build.log")
            if log.exists(): report["privateBuildLogSha256"] = sha(log)
    report["ownedCleanSnapshotRemoved"] = not scope.exists()
    Path(args.output + ".reproduction.json").write_text(json.dumps(report, indent=2) + "\n")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
