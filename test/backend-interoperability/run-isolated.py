"""T16: copy public backend inputs, build, and own a disposable real service.

Reuses Android's guarded PostgreSQL/backend launcher and T15's private provider
runner. Neither original checkout, personal config nor personal DB is modified.
Only sanitized stage/results/provenance are published; child logs stay private.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import tempfile
import time


def stop(child):
    if child is not None and child.poll() is None:
        child.send_signal(signal.SIGTERM)
        try:
            child.wait(timeout=30)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait(timeout=5)
            raise RuntimeError("owned backend launcher failed graceful cleanup")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("backend-root", "android-root", "node", "provider", "libraries",
                 "selection", "output"):
        parser.add_argument("--" + name, required=True)
    parser.add_argument("--restartable", action="store_true")
    parser.add_argument("--clock-seam", action="store_true")
    parser.add_argument("--account-proof", action="store_true")
    parser.add_argument("--slice", choices=("T16-S1", "T16-S2", "T16-S3", "T16-S4", "T16-S5", "T16-S6", "T16-S7", "T21-S5", "T21-S6"))
    args = parser.parse_args()
    if args.clock_seam and not args.restartable:
        parser.error("--clock-seam requires --restartable")
    if args.account_proof and args.slice not in ("T16-S6", "T16-S7", "T21-S5", "T21-S6"):
        parser.error("--account-proof is limited to T16-S6/T16-S7/T21-S5/T21-S6")
    backend = Path(args.backend_root).resolve()
    android = Path(args.android_root).resolve()
    node = Path(args.node).resolve()
    env = {key: os.environ[key] for key in ("HOME", "LANG", "JAVA_HOME") if key in os.environ}
    if args.slice == "T16-S7":
        for key in ("ANDROID_HOME", "ANDROID_SDK_ROOT", "ANDROID_USER_HOME", "ANDROID_SERIAL", "GRADLE_USER_HOME", "GT_T16_ANDROID_SERIAL",
                    "GT_T16_ANDROID_SNAPSHOT", "GT_T16_ANDROID_RESULT"):
            env[key] = os.environ[key]
    if args.slice == "T21-S6":
        # Explicit immutable package/baseline test inputs only, never runtime
        # configuration or credentials. Private runner still replaces all homes.
        for key in ("GT_PACKAGE_REFRESH_BASELINE_ROOT", "GT_PACKAGE_REFRESH_ARTIFACT_ROOT"):
            selected = Path(os.environ[key])
            if not selected.is_absolute() or not selected.is_dir() or selected.resolve() != selected:
                parser.error("canonical existing S6 package fixture roots required")
            env[key] = str(selected)
    env.update(PATH=str(node.parent) + ":/usr/bin:/bin", T01_NODE_HOME=str(node.parent.parent))
    task = args.slice or ("T16-S2" if args.restartable else "T16-S1")
    report = {"task": task, "status": "FAIL", "stage": "toolchain",
              "realGoogle": False, "androidObservation": False}
    child = None
    proof_child = None
    code = 1
    with tempfile.TemporaryDirectory(prefix=task.lower() + "-") as temporary:
        root = Path(temporary)
        os.chmod(root, 0o700)
        config = root / "backend.json"
        container = None
        try:
            for command, wanted in (([str(node), "--version"], "v24.21.0"),
                                    (["npm", "--version"], "11.19.0")):
                observed = subprocess.check_output(command, env=env, text=True, timeout=10).strip()
                if observed != wanted:
                    raise RuntimeError("pinned toolchain mismatch")
            report["node"], report["npm"] = "24.21.0", "11.19.0"
            report["stage"] = "public input snapshot"
            snapshot = root / "backend"
            snapshot.mkdir()
            for directory in ("src/main", ".mvn", "shared-docs"):
                shutil.copytree(backend / directory, snapshot / directory,
                                ignore=shutil.ignore_patterns(".git"))
            for filename in ("pom.xml", "mvnw", "docs/shared-docs-inputs.sha256"):
                destination = snapshot / filename
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(backend / filename, destination)
            original_inputs = {
                str(path.relative_to(snapshot)): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in sorted(snapshot.rglob("*")) if path.is_file()
            }
            # Reproduce the backend's declared build inputs, rather than rewriting
            # its checksum gate to accept newer documents. Only historical prose
            # is reconstructed; runtime seed/schema/API inputs must already match.
            historical = "0bd414b6c1b819a26e2d5fca0bed6b6b5acf2cea"
            allowed = {"README.md", "docs/backend-contract/README.md",
                       "docs/backend-contract/android-client-protocol.md",
                       "docs/backend-contract/authentication.md",
                       "docs/backend-contract/open-decisions.md", "docs/backend-contract/sync.md"}
            restored = {}
            for line in (snapshot / "docs/shared-docs-inputs.sha256").read_text().splitlines():
                if not line or line.startswith("#"):
                    continue
                expected, relative = line.split(maxsplit=1)
                destination = snapshot / relative
                current = hashlib.sha256(destination.read_bytes()).hexdigest()
                if current == expected:
                    continue
                shared_relative = relative.removeprefix("shared-docs/")
                if shared_relative not in allowed:
                    raise RuntimeError("nonprose pinned input mismatch")
                original = subprocess.check_output(
                    ["git", "-C", str(backend / "shared-docs"), "show", historical + ":" + shared_relative])
                if hashlib.sha256(original).hexdigest() != expected:
                    raise RuntimeError("historical pinned prose is not reproducible")
                destination.write_bytes(original)
                restored[relative] = {"currentSha256": current, "pinnedSha256": expected,
                                      "sourceCommit": historical}
            report["historicalPinnedProse"] = restored
            report["normativeContract"] = ("MCP working draft0.3; unchanged backend v1" if task in ("T21-S5", "T21-S6")
                                           else "MCP working draft0.2; backend v1 at current 9a96dcb")
            if args.clock_seam:
                relative = "com/dragosfotache/gtbackend/auth/TestChildAuthClockConfiguration.java"
                clock_source = backend / "src/test/java" / relative
                destination = snapshot / "src/main/java" / relative
                if destination.exists():
                    raise RuntimeError("test clock would overwrite a product class")
                shutil.copy2(clock_source, destination)
                report["testClockOverlay"] = {
                    "source": "src/test/java/" + relative,
                    "sha256": hashlib.sha256(clock_source.read_bytes()).hexdigest(),
                    "testOnlyBackendArtifact": True,
                }
                env["GT_T16_CLOCK_SEAM"] = "1"
            launcher = root / "backend-launcher.py"
            shutil.copy2(android / "scripts/run-isolated-backend.py", launcher)
            report["launcherSha256"] = hashlib.sha256(launcher.read_bytes()).hexdigest()
            if args.account_proof:
                report["stage"] = "private signed-proof fixture"
                if report["launcherSha256"] != "631180c5f573a9ad2e51772e1ac32d7729ca955b0d25817d27dab16ab51bc3c8":
                    raise RuntimeError("guarded launcher changed; account overlay needs review")
                proof_config = root / "proof.json"
                proof_source = Path("test/backend-interoperability/account-proof-server.py")
                proof_child = subprocess.Popen(
                    ["python3", str(proof_source), "--config", str(proof_config)],
                    env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                deadline = time.monotonic() + 40
                while not proof_config.exists():
                    if proof_child.poll() is not None or time.monotonic() >= deadline:
                        raise RuntimeError("private signed-proof fixture did not qualify")
                    time.sleep(0.1)
                proof = json.loads(proof_config.read_text())
                env["GT_T16_PROOF_CONFIG"] = str(proof_config)
                env["GT_T16_PROOF_CERTS_URL"] = proof["origin"] + "/certs"
                original = launcher.read_text()
                anchor = '            ACCOUNT_DELETION_LEDGER_KEYS="",\n            ACCOUNT_DELETION_PURGE_ENABLED="false",'
                if original.count(anchor) != 1:
                    raise RuntimeError("account proof overlay anchor mismatch")
                launcher.write_text(original.replace(anchor, '''            AUTH_GOOGLE_CERTIFICATES_URL=os.environ["GT_T16_PROOF_CERTS_URL"],
            ACCOUNT_DELETION_LEDGER_KEYS=json.dumps({"activeVersion": "1", "keys": {"1": base64.b64encode(secrets.token_bytes(32)).decode()}}),
            ACCOUNT_DELETION_PURGE_ENABLED="true",
            ACCOUNT_DELETION_PURGE_INITIAL_DELAY_MS="3600000",''', 1))
                report["accountProofFixture"] = {
                    "source": str(proof_source),
                    "sha256": hashlib.sha256(proof_source.read_bytes()).hexdigest(),
                    "realSignatureNonceVerification": True,
                    "realDeletionStatusTransactions": True,
                    "syntheticExternalCertificates": True,
                    "disposableLauncherSha256": hashlib.sha256(launcher.read_bytes()).hexdigest(),
                }
            if args.restartable:
                report["stage"] = "restart-control overlay"
                if report["launcherSha256"] != "631180c5f573a9ad2e51772e1ac32d7729ca955b0d25817d27dab16ab51bc3c8":
                    raise RuntimeError("guarded launcher changed; restart overlay needs review")
                original = launcher.read_text()
                anchor = "        exit_code = proc.wait()\n    except KeyboardInterrupt:"
                if original.count(anchor) != 1:
                    raise RuntimeError("restart overlay anchor mismatch")
                overlaid = original.replace("import argparse\n", "import argparse\nfrom restart_control import serve_restarts\n", 1)
                overlaid = overlaid.replace(anchor, """        proc, exit_code = serve_restarts(
            proc, lambda clock=None: subprocess.Popen(
                ["java", "-jar", str(jar), f"--server.port={args.port}", "--server.address=127.0.0.1"] +
                ([] if clock is None else ["--auth.qa.child-clock=" + clock]),
                cwd=backend_root, env=app_env), config_path, challenge_url,
            clock_enabled=os.environ.get("GT_T16_CLOCK_SEAM") == "1")
    except KeyboardInterrupt:""", 1)
                launcher.write_text(overlaid)
                shutil.copy2("test/backend-interoperability/restart-control.py", root / "restart_control.py")
                report["restartLauncherSha256"] = hashlib.sha256(launcher.read_bytes()).hexdigest()
                report["restartControlSha256"] = hashlib.sha256((root / "restart_control.py").read_bytes()).hexdigest()
                env["GT_T16_BACKEND_RESTARTABLE"] = "1"
            report["backendInputs"] = {
                str(path.relative_to(snapshot)): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in sorted(snapshot.rglob("*")) if path.is_file()
            }
            report["originalBackendInputs"] = original_inputs
            report["backendCommit"] = subprocess.check_output(
                ["git", "-C", str(backend), "rev-parse", "HEAD"], text=True).strip()
            report["backendDirty"] = bool(subprocess.check_output(
                ["git", "-C", str(backend), "status", "--porcelain"], text=True).strip())
            with (root / "child.log").open("wb") as log:
                report["stage"] = "shared-input verification"
                subprocess.run(["sha256sum", "-c", "docs/shared-docs-inputs.sha256"],
                               cwd=snapshot, env=env, stdout=log, stderr=log, check=True, timeout=30)
                report["stage"] = "backend build"
                subprocess.run(["flock", "-w", "30", "/tmp/gt-backend-task7-build.lock",
                                "./mvnw", "-q", "-DskipTests", "package"], cwd=snapshot,
                               env=env, stdout=log, stderr=log, check=True, timeout=600)
                jar = snapshot / "target/gtbackend-0.1.0-SNAPSHOT.jar"
                report["backendJarSha256"] = hashlib.sha256(jar.read_bytes()).hexdigest()
                report["stage"] = "isolated backend startup"
                with socket.socket() as port_probe:
                    port_probe.bind(("127.0.0.1", 0))
                    port = port_probe.getsockname()[1]
                child = subprocess.Popen(
                    ["python3", str(launcher), "--backend-root", str(snapshot), "--no-build",
                     "--config-path", str(config), "--port", str(port)],
                    env=env, stdout=log, stderr=log)
                deadline = time.monotonic() + 180
                while not config.exists():
                    if child.poll() is not None or time.monotonic() >= deadline:
                        raise RuntimeError("isolated backend did not qualify")
                    time.sleep(0.1)
                configuration = json.loads(config.read_text())
                container = configuration["containerName"]
                report["backendQualified"] = True
                report["postgresImageId"] = subprocess.check_output(
                    ["docker", "inspect", "--format", "{{.Image}}", container],
                    text=True, timeout=10).strip()
                print(task + ": actual isolated backend/PostgreSQL qualified", flush=True)
                report["stage"] = "MCP integration checks"
                env["GT_T16_BACKEND_CONFIG"] = str(config)
                result = subprocess.run(
                    ["python3", "test/create-stdio/run-isolated.py", str(node), args.provider,
                     args.libraries, args.selection, args.output], env=env, timeout=660)
                code = result.returncode
                if args.slice == "T16-S7":
                    native_path = Path(env["GT_T16_ANDROID_RESULT"])
                    native = json.loads(native_path.read_text()) if native_path.exists() else {}
                    report["androidObservation"] = (native.get("status") == "PASS"
                        and len(native.get("cases", [])) == 1
                        and not native["cases"][0]["failed"] and not native["cases"][0]["skipped"])
                    if code == 0 and not report["androidObservation"]:
                        code = 1
                        raise RuntimeError("S7 requires actual nonempty native Android proof")
                report["checksExitCode"] = code
                report["status"] = "PASS" if code == 0 else "FAIL"
        except Exception as error:
            # Never surface child output/config/credential-bearing exception text.
            report["failureClass"] = type(error).__name__
            print(task + ": failed during " + report["stage"], flush=True)
        finally:
            try:
                stop(child)
                report["ownedBackendExited"] = child is None or child.poll() is not None
                report["privateBackendConfigRemoved"] = not config.exists()
                restart_stats = Path(str(config) + ".restart.json")
                if args.restartable and report.get("backendQualified"):
                    if not restart_stats.exists() or Path(str(config) + ".control").exists():
                        raise RuntimeError("owned restart supervisor cleanup incomplete")
                    report["restartControl"] = json.loads(restart_stats.read_text())
                    if not report["restartControl"]["ownedJavaExited"]:
                        raise RuntimeError("owned restarted Java still running")
                if container is not None:
                    absent = subprocess.run(["docker", "inspect", container],
                                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                            timeout=10).returncode != 0
                    report["ownedContainerRemoved"] = absent
                    if not absent or config.exists():
                        raise RuntimeError("owned backend cleanup incomplete")
            except Exception as error:
                report["cleanupFailureClass"] = type(error).__name__
                report["status"], code = "FAIL", 1
            try:
                stop(proof_child)
                report["ownedProofServerExited"] = proof_child is None or proof_child.poll() is not None
                if args.account_proof and proof_child is not None and proof_child.returncode != 0:
                    raise RuntimeError("owned proof fixture cleanup failed")
                report["privateProofMaterialRemoved"] = not any(
                    (root / name).exists() for name in ("proof.json", "proof-config.pending", "proof-key.pem", "proof-cert.pem"))
                if not report["privateProofMaterialRemoved"]:
                    raise RuntimeError("private proof material cleanup incomplete")
            except Exception as error:
                report["proofCleanupFailureClass"] = type(error).__name__
                report["status"], code = "FAIL", 1
            log_path = root / "child.log"
            if log_path.exists():
                report["privateChildLogSha256"] = hashlib.sha256(log_path.read_bytes()).hexdigest()
                report["privateChildLogBytes"] = log_path.stat().st_size
            if "originalBackendInputs" in report:
                report["originalBackendInputsStable"] = all(
                    (backend / relative).is_file() and
                    hashlib.sha256((backend / relative).read_bytes()).hexdigest() == digest
                    for relative, digest in report["originalBackendInputs"].items())
                if not report["originalBackendInputsStable"]:
                    report["status"], code = "FAIL", 1
    report["privateSnapshotRemoved"] = not root.exists()
    Path(args.output + ".backend.json").write_text(json.dumps(report, indent=2) + "\n")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
