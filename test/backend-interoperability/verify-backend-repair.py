"""Fixed S6 backend timestamp verification on copied public source/Testcontainers."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import xml.etree.ElementTree as ET


def containers():
    return set(subprocess.check_output(
        ["docker", "ps", "-aq", "--filter", "label=org.testcontainers=true"],
        text=True, timeout=10).split())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backend-root", required=True)
    parser.add_argument("--node", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--focused", action="store_true")
    args = parser.parse_args()
    backend = Path(args.backend_root).resolve()
    node = Path(args.node).resolve()
    env = {key: os.environ[key] for key in ("HOME", "LANG", "JAVA_HOME") if key in os.environ}
    env.update(PATH=str(node.parent) + ":/usr/bin:/bin", T01_NODE_HOME=str(node.parent.parent))
    selection = "AccountDeletionAcceptanceHttpIntegrationTest#fractionalAcceptanceRetainsMillisecondReceiptAcrossStatusAndExpiredProofReplay" if args.focused else ",".join((
        "AccountDeletionAcceptanceHttpIntegrationTest", "AccountDeletionProofHttpIntegrationTest",
        "AccountDeletionReplayHttpIntegrationTest", "AccountStatusHttpIntegrationTest"))
    report = {"task": "T16-S6-backend-repair", "status": "FAIL", "selection": selection,
              "realGoogle": False, "stage": "qualification"}
    code = 1
    original = {}
    before_containers = containers()
    with tempfile.TemporaryDirectory(prefix="gt-t16-s6-backend-check-") as temporary:
        root = Path(temporary)
        os.chmod(root, 0o700)
        log = root / "private.log"
        try:
            assert subprocess.check_output([str(node), "--version"], env=env, text=True).strip() == "v24.21.0"
            assert subprocess.check_output(["npm", "--version"], env=env, text=True).strip() == "11.19.0"
            snapshot = root / "backend"
            snapshot.mkdir()
            for directory in ("src", ".mvn", "shared-docs"):
                shutil.copytree(backend / directory, snapshot / directory,
                                ignore=shutil.ignore_patterns(".git", "__pycache__"))
            for name in ("pom.xml", "mvnw", "docs/shared-docs-inputs.sha256"):
                destination = snapshot / name
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(backend / name, destination)
            original = {str(p.relative_to(snapshot)): hashlib.sha256(p.read_bytes()).hexdigest()
                        for p in sorted(snapshot.rglob("*")) if p.is_file()}
            # Same declared historical build prose as accepted T16. Current
            # contracts remain normative; no runtime/schema/seed input replaced.
            allowed = {"README.md", "docs/backend-contract/README.md",
                       "docs/backend-contract/android-client-protocol.md",
                       "docs/backend-contract/authentication.md",
                       "docs/backend-contract/open-decisions.md", "docs/backend-contract/sync.md"}
            restored = []
            for line in (snapshot / "docs/shared-docs-inputs.sha256").read_text().splitlines():
                if not line or line.startswith("#"):
                    continue
                expected, name = line.split(maxsplit=1)
                destination = snapshot / name
                if hashlib.sha256(destination.read_bytes()).hexdigest() == expected:
                    continue
                relative = name.removeprefix("shared-docs/")
                assert relative in allowed
                data = subprocess.check_output(["git", "-C", str(backend / "shared-docs"),
                    "show", "0bd414b6c1b819a26e2d5fca0bed6b6b5acf2cea:" + relative])
                assert hashlib.sha256(data).hexdigest() == expected
                destination.write_bytes(data)
                restored.append(name)
            report["historicalBuildProse"] = restored
            report["sourceHashes"] = original
            report["stage"] = "Maven compile and isolated HTTP checks"
            with log.open("wb") as output:
                subprocess.run(["sha256sum", "-c", "docs/shared-docs-inputs.sha256"],
                    cwd=snapshot, env=env, stdout=output, stderr=output, check=True, timeout=30)
                result = subprocess.run(["flock", "-w", "30", "/tmp/gt-backend-task7-build.lock",
                    "./mvnw", "-q", "-Dtest=" + selection, "test"],
                    cwd=snapshot, env=env, stdout=output, stderr=output, timeout=600)
            code = result.returncode
            suites = [ET.parse(p).getroot() for p in sorted((snapshot / "target/surefire-reports").glob("TEST-*.xml"))]
            report["results"] = [{"suite": s.attrib["name"], **{
                k: int(s.attrib.get(k, 0)) for k in ("tests", "failures", "errors", "skipped")}}
                for s in suites]
            report["failures"] = [{"test": case.attrib["name"],
                "type": failure.attrib.get("type", "unknown"),
                "reason": "wire_deletion_time_precision" if failure.attrib.get("message", "").startswith(
                    "Wire deletion time must preserve exact milliseconds only") else "other_assertion_or_error"}
                for s in suites for case in s.findall("testcase")
                for failure in list(case.findall("failure")) + list(case.findall("error"))]
            total = sum(r["tests"] for r in report["results"])
            failed = sum(r["failures"] + r["errors"] + r["skipped"] for r in report["results"])
            assert total > 0
            prefix = "com.dragosfotache.gtbackend.account."
            expected = {prefix + name.split("#")[0] for name in selection.split(",")}
            assert {s.attrib["name"] for s in suites} == expected
            if args.focused:
                assert total == 1 and suites[0].find("testcase").attrib["name"] == selection.split("#")[1]
            report["tests"] = total
            report["status"] = "PASS" if code == 0 and failed == 0 else "FAIL"
            if report["status"] != "PASS":
                code = 1
        except Exception as error:
            report["failureClass"] = type(error).__name__
            code = 1
        finally:
            report["originalInputsStable"] = all(
                hashlib.sha256((backend / name).read_bytes()).hexdigest() == digest
                for name, digest in original.items())
            if log.exists():
                report["privateLogSha256"] = hashlib.sha256(log.read_bytes()).hexdigest()
            deadline = time.monotonic() + 20
            while containers() - before_containers and time.monotonic() < deadline:
                time.sleep(0.2)
            report["noNewTestcontainersRemain"] = not (containers() - before_containers)
            if not report["originalInputsStable"] or not report["noNewTestcontainersRemain"]:
                report["status"], code = "FAIL", 1
    report["privateSnapshotAndLogRemoved"] = not root.exists()
    Path(args.output).write_text(json.dumps(report, indent=2) + "\n")
    print("T16-S6 backend checks: " + report["status"] + "; stage=" + report["stage"], flush=True)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
