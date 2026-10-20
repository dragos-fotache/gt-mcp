"""S7: build public Android snapshot, own one fresh emulator, run isolated MCP gate.

Same required arguments as run-isolated.py plus --sdk. Original app/backend,
existing AVDs and devices are never changed. Raw build/device logs stay private.
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


def hashes(root, paths):
    result = {}
    for relative in paths:
        path = root / relative
        files = sorted(path.rglob("*")) if path.is_dir() else [path]
        for file in files:
            if file.is_file():
                result[str(file.relative_to(root))] = hashlib.sha256(file.read_bytes()).hexdigest()
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("backend-root", "android-root", "node", "provider", "libraries", "selection", "output", "sdk"):
        parser.add_argument("--" + name, required=True)
    args = parser.parse_args()
    source = Path(args.android_root).resolve()
    sdk = Path(args.sdk).resolve()
    output = Path(args.output).resolve()
    public = ["app/src", "app/schemas", "app/build.gradle.kts", "gradle", "gradlew",
              "gradle.properties", "settings.gradle.kts", "build.gradle.kts"]
    before = hashes(source, public)
    report = {"task": "T16-S7", "status": "FAIL", "stage": "Android source snapshot",
              "originalAndroidInputs": before, "realGoogle": False, "personalDevice": False}
    child = None
    code = 1
    with tempfile.TemporaryDirectory(prefix="gt-t16-s7-android-") as temporary:
        root = Path(temporary)
        os.chmod(root, 0o700)
        snapshot = root / "android"
        snapshot.mkdir()
        env = dict(os.environ)
        env.update(ANDROID_HOME=str(sdk), ANDROID_SDK_ROOT=str(sdk),
                   ANDROID_USER_HOME=str(root / "android-user"),
                   ANDROID_AVD_HOME=str(root / "avds"), JAVA_HOME="/usr/lib/jvm/java-27-openjdk",
                   GRADLE_USER_HOME=str(Path.home() / ".gradle"),
                   PATH=str(Path(args.node).resolve().parent) + ":" + str(sdk / "platform-tools") + ":/usr/bin:/bin")
        log_path = root / "private.log"
        with log_path.open("wb") as log:
            os.chmod(log_path, 0o600)
            try:
                for relative in public:
                    original = source / relative
                    target = snapshot / relative
                    target.parent.mkdir(parents=True, exist_ok=True)
                    if original.is_dir():
                        shutil.copytree(original, target)
                    else:
                        shutil.copy2(original, target)
                fixture = Path("test/backend-interoperability/T16McpSyncTest.kt")
                destination = snapshot / "app/src/roomBackendTest/java/com/dragosfotache/gymtracka/data/sync/roombackend" / fixture.name
                shutil.copy2(fixture, destination)
                report["fixtureSha256"] = hashlib.sha256(fixture.read_bytes()).hexdigest()
                report["snapshotPublicInputs"] = hashes(snapshot, public)
                report["androidCommit"] = subprocess.check_output(
                    ["git", "-C", str(source), "rev-parse", "HEAD"], text=True).strip()
                report["androidDirty"] = bool(subprocess.check_output(
                    ["git", "-C", str(source), "status", "--porcelain"], text=True).strip())
                report["stage"] = "Android assembly"
                result = subprocess.run(
                    ["./gradlew", ":app:assembleDebug", ":app:assembleDebugAndroidTest",
                     "-Pgymtracka.roomBackend=true", "--console=plain", "--offline", "--no-configuration-cache"],
                    cwd=snapshot, env=env, stdout=log, stderr=log, timeout=600)
                report["assemblyExitCode"] = result.returncode
                if result.returncode:
                    # Compilation errors have no fixture credentials. Publish only
                    # Kotlin error lines after replacing the private root.
                    report["compileErrors"] = [line.replace(str(root), "<private-root>")
                        for line in log_path.read_text(errors="replace").splitlines() if line.startswith("e: ")][:12]
                    raise RuntimeError("Android assembly failed")
                report["apks"] = {str(p.relative_to(snapshot)): hashlib.sha256(p.read_bytes()).hexdigest()
                                  for p in sorted((snapshot / "app/build/outputs/apk").rglob("*.apk"))}
                report["stage"] = "owned emulator startup"
                avds = root / "avds"
                avds.mkdir()
                avd = avds / "t16s7.avd"
                avd.mkdir()
                (avds / "t16s7.ini").write_text("avd.ini.encoding=UTF-8\npath=" + str(avd) + "\ntarget=android-37.2\n")
                image = "system-images/android-37.2/google_apis_playstore_ps16k/x86_64/"
                (avd / "config.ini").write_text(
                    "avd.ini.encoding=UTF-8\nAvdId=t16s7\nabi.type=x86_64\nhw.cpu.arch=x86_64\n"
                    "hw.cpu.ncore=2\nhw.ramSize=2048\nhw.gpu.enabled=yes\nhw.gpu.mode=swiftshader\n"
                    "hw.keyboard=yes\nhw.lcd.width=1080\nhw.lcd.height=1920\nhw.lcd.density=420\n"
                    "disk.dataPartition.size=2048M\nPlayStore.enabled=false\ntag.id=google_apis_playstore_ps16k\n"
                    "image.sysdir.1=" + image + "\n")
                image_root = sdk / image
                report["systemImage"] = {"package": image.rstrip("/"),
                    "sourcePropertiesSha256": hashlib.sha256((image_root / "source.properties").read_bytes()).hexdigest()}
                port = None
                for candidate in range(5580, 5680, 2):
                    try:
                        with socket.socket() as a, socket.socket() as b:
                            a.bind(("127.0.0.1", candidate)); b.bind(("127.0.0.1", candidate + 1))
                        port = candidate
                        break
                    except OSError:
                        continue
                if port is None:
                    raise RuntimeError("No unused emulator ports")
                serial = "emulator-" + str(port)
                child = subprocess.Popen(
                    [str(sdk / "emulator/emulator"), "-avd", "t16s7", "-port", str(port),
                     "-no-window", "-no-audio", "-no-snapshot", "-no-boot-anim", "-gpu", "swiftshader"],
                    env={key: value for key, value in env.items() if key != "ANDROID_USER_HOME"}, stdout=log, stderr=log)
                def adb(arguments, **kwargs):
                    return subprocess.run([str(sdk / "platform-tools/adb"), "-s", serial] + arguments,
                        env=env, capture_output=True, timeout=15, **kwargs)
                deadline = time.monotonic() + 180
                while time.monotonic() < deadline and child.poll() is None:
                    probe = adb(["shell", "getprop", "sys.boot_completed"])
                    if probe.returncode == 0 and probe.stdout.strip() == b"1":
                        break
                    time.sleep(0.5)
                else:
                    # Only fixed emulator diagnostics; never any device/private logs.
                    report["emulatorErrors"] = [line.replace(str(root), "<private-root>")
                        for line in log_path.read_text(errors="replace").splitlines()
                        if "ERROR" in line or "PANIC" in line][-8:]
                    raise RuntimeError("Owned emulator did not boot")
                report["ownedEmulatorBooted"] = True
                report["stage"] = "owned Android package manager qualification"
                ready_deadline = time.monotonic() + 45
                while time.monotonic() < ready_deadline:
                    api = adb(["shell", "getprop", "ro.build.version.sdk"])
                    abi = adb(["shell", "getprop", "ro.product.cpu.abi"])
                    packages = adb(["shell", "pm", "path", "android"])
                    if (api.returncode == abi.returncode == packages.returncode == 0
                            and api.stdout.strip() == b"37" and abi.stdout.strip() == b"x86_64"
                            and packages.stdout.startswith(b"package:")):
                        break
                    time.sleep(1)
                else:
                    raise RuntimeError("Owned Android package manager did not qualify")
                report["androidApi"] = "37"
                report["androidAbi"] = "x86_64"
                report["stage"] = "owned Android APK install"
                for relative in report["apks"]:
                    for attempt in range(5):
                        install = adb(["install", "-r", "-t", str(snapshot / relative)])
                        if install.returncode == 0:
                            break
                        if not any(kind in install.stderr for kind in (b"device offline", b"device not found", b"no devices")):
                            raise RuntimeError("Owned emulator APK install failed")
                        time.sleep(1)
                    else:
                        raise RuntimeError("Owned emulator APK install transport did not qualify")
                package = "com.dragosfotache.gymtracka"
                if adb(["shell", "run-as", package, "mkdir", "-p", "files"]).returncode:
                    raise RuntimeError("Android private setup directory unavailable")
                probe = adb(["shell", "-T", "run-as", package, "tee", "files/t16-probe"], input=b"probe")
                read = adb(["exec-out", "run-as", package, "cat", "files/t16-probe"])
                removed = adb(["shell", "run-as", package, "rm", "files/t16-probe"])
                if probe.returncode or read.stdout != b"probe" or removed.returncode:
                    raise RuntimeError("Android private input handoff failed")
                report["privateInputHandoffQualified"] = True
                print("T16-S7: isolated Android build/emulator qualified", flush=True)
                report["stage"] = "actual MCP/backend/Android integration"
                env.update(ANDROID_SERIAL=serial, GT_T16_ANDROID_SERIAL=serial,
                           GT_T16_ANDROID_SNAPSHOT=str(snapshot), GT_T16_ANDROID_RESULT=str(output) + ".native.json")
                result = subprocess.run(
                    ["python3", "test/backend-interoperability/run-isolated.py", "--slice", "T16-S7",
                     "--account-proof", "--restartable", "--clock-seam", "--backend-root", args.backend_root,
                     "--android-root", args.android_root, "--node", args.node, "--provider", args.provider,
                     "--libraries", args.libraries, "--selection", args.selection, "--output", args.output],
                    env=env, timeout=1200)
                code = result.returncode
                report["checksExitCode"] = code
                native_path = Path(str(output) + ".native.json")
                native = json.loads(native_path.read_text()) if native_path.exists() else {}
                report["androidObservation"] = native.get("status") == "PASS"
                report["status"] = "PASS" if code == 0 else "FAIL"
            except Exception as error:
                report["failureClass"] = type(error).__name__
                print("T16-S7: failed during " + report["stage"], flush=True)
            finally:
                if child is not None and child.poll() is None:
                    child.send_signal(signal.SIGTERM)
                    try:
                        child.wait(timeout=30)
                    except subprocess.TimeoutExpired:
                        child.kill(); child.wait(timeout=10)
                report["ownedEmulatorExited"] = child is None or child.poll() is not None
                report["snapshotInputsStable"] = (report.get("snapshotPublicInputs") == hashes(snapshot, public))
                report["apkBytesStable"] = (report.get("apks", {}) == {
                    str(p.relative_to(snapshot)): hashlib.sha256(p.read_bytes()).hexdigest()
                    for p in sorted((snapshot / "app/build/outputs/apk").rglob("*.apk"))})
                report["ownedEmulatorDetached"] = child is None
                if child is not None:
                    detach_deadline = time.monotonic() + 10
                    while time.monotonic() < detach_deadline:
                        if adb(["get-state"]).returncode != 0:
                            report["ownedEmulatorDetached"] = True
                            break
                        time.sleep(0.2)
                report["originalAndroidInputsUnchanged"] = before == hashes(source, public)
                report["privateLogSha256"] = hashlib.sha256(log_path.read_bytes()).hexdigest()
        # Private source/build/AVD/log/fixtures disappear together.
    report["privateAndroidRootRemoved"] = not root.exists()
    if (not report["originalAndroidInputsUnchanged"] or not report["ownedEmulatorExited"]
            or not report["ownedEmulatorDetached"] or not report["snapshotInputsStable"] or not report["apkBytesStable"]):
        report["status"] = "FAIL"
        code = 1
    Path(str(output) + ".android.json").write_text(json.dumps(report, indent=2) + "\n")
    return code


if __name__ == "__main__":
    raise SystemExit(main())
