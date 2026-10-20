"""Run exactly one T16 Android class; publish only sanitized native XML counts."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import xml.etree.ElementTree as ET
import re
import signal

snapshot, output = map(Path, sys.argv[1:])
class_name = "com.dragosfotache.gymtracka.data.sync.roombackend.T16McpSyncTest"
report = {"status": "FAIL", "actualAndroid": True}
code = 1
child = None


def cancel(_signal, _frame):
    if child is not None and child.poll() is None:
        os.killpg(child.pid, signal.SIGTERM)
        try:
            child.wait(timeout=30)
        except subprocess.TimeoutExpired:
            os.killpg(child.pid, signal.SIGKILL)
            child.wait(timeout=5)
    raise RuntimeError("Owned Android execution canceled")


signal.signal(signal.SIGTERM, cancel)
with output.with_suffix(".private.log").open("wb") as log:
    os.chmod(log.name, 0o600)
    try:
        child = subprocess.Popen(
            ["./gradlew", ":app:connectedDebugAndroidTest", "-Pgymtracka.roomBackend=true",
             "-Pandroid.testInstrumentationRunnerArguments.class=" + class_name,
             "-Pandroid.testInstrumentationRunnerArguments.timeout_msec=150000",
             "--rerun", "--console=plain", "--offline", "--no-configuration-cache"],
            cwd=snapshot, env=os.environ, stdout=log, stderr=log, start_new_session=True)
        try:
            code = child.wait(timeout=300)
        except subprocess.TimeoutExpired:
            cancel(None, None)
        report["gradleExitCode"] = code
        cases = []
        files = list((snapshot / "app/build/outputs/androidTest-results/connected").rglob("TEST-*.xml"))
        for path in files:
            root = ET.parse(path).getroot()
            for case in root.iter("testcase"):
                cases.append({"class": case.get("classname"), "name": case.get("name"),
                              "failed": case.find("failure") is not None or case.find("error") is not None,
                              "skipped": case.find("skipped") is not None})
                failure = case.find("failure")
                if failure is not None:
                    # Only literal messages authored in this fixed fixture; no
                    # raw XML stack, transport error/body or credential escapes.
                    allowed = re.findall(r'\{\s*"([^"\n]+)"\s*\}', Path(
                        "test/backend-interoperability/T16McpSyncTest.kt").read_text())
                    message = failure.get("message", "") + "\n" + "".join(failure.itertext())
                    kinds = re.findall(r'\b((?:java|kotlin|android|com\.dragosfotache)\.[\w.$]+(?:Exception|Error))\b', message)
                    report["nativeFailureTypes"] = sorted(set(kinds))
                    report["nativeSourceFrames"] = re.findall(r'(T16McpSyncTest\.kt):(\d+)', message)[:6]
                    # This declared harness summary contains counts/stop kinds
                    # only (SyncDeliveryResult contract), never domain values.
                    report["deliverySummary"] = re.findall(r'R10aDelivery\([^\r\n]+\)', message)[:1]
                    report["syncDiagnostic"] = re.findall(r'T16Diagnostic kind=[\w]+ http=-?\d+ io=[\w]+ reason=[\w-]+ decode=[\w]+ field=[\w]+ site=[\w.:]+', message)[:1]
                    report["failureShape"] = {"attributes": list(failure.attrib),
                        "children": [part.tag for part in failure], "textLength": len(message)}
                    if "java.io.FileNotFoundException" in message:
                        report["nativeFailureKind"] = "missing target-private fixture input"
                    report["fixtureFailure"] = next((value for value in allowed if len(value) > 12 and value in message),
                                                    "native failure; private details erased")
        report["cases"] = cases
        report["xmlSha256"] = [hashlib.sha256(p.read_bytes()).hexdigest() for p in files]
        if code != 0 or len(cases) != 1 or cases[0] != {
            "class": class_name, "name": "savedMcpRoutineArrivesThroughOrdinarySync",
            "failed": False, "skipped": False,
        }:
            raise RuntimeError("native one-class execution did not pass")
        report["status"] = "PASS"
        code = 0
    except Exception as error:
        report["failureClass"] = type(error).__name__
        code = 1
        crash = subprocess.run(["adb", "-s", os.environ["ANDROID_SERIAL"], "logcat", "-b", "crash", "-d"],
                               capture_output=True, timeout=10).stdout.decode(errors="replace")
        report["crashTypes"] = sorted(set(re.findall(
            r'\b((?:java|kotlin|android|com\.dragosfotache)\.[\w.$]+(?:Exception|Error))\b', crash)))
        report["crashProjectFrames"] = re.findall(
            r'at (com\.dragosfotache\.[\w.$]+)\(([^():\s]+\.kt):(\d+)\)', crash)[:12]
report["privateLogSha256"] = hashlib.sha256(output.with_suffix(".private.log").read_bytes()).hexdigest()
output.write_text(json.dumps(report, indent=2) + "\n")
sys.exit(code)
