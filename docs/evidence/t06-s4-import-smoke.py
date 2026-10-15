#!/usr/bin/env python3
"""Coordinator: small isolated eight-export import observation, not a sandbox."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import time

ROOT = Path.cwd()
MANIFEST = ROOT / "docs/evidence/t06-s4-f3-artifact-inventory.json"
EXPECTED = "3321b8e343a5fd548b54272c88b7b7d4672e066975010fc7f9614a12a63216e2"
RESULT = ROOT / "docs/evidence/t06-s4-import-smoke-result.json"
summary = {"artifactId": "t06-s4-f3", "status": "failed",
           "observation": "isolated eight-export auth import plus source audit; not comprehensive interception or OS sandbox"}
code = 1


def verify():
    assert hashlib.sha256(MANIFEST.read_bytes()).hexdigest() == EXPECTED
    rows = json.loads(MANIFEST.read_text())["files"]
    for row in rows:
        relative = Path(row["path"])
        assert not relative.is_absolute() and ".." not in relative.parts
        path = ROOT / relative
        assert path.is_file() and not path.is_symlink()
        assert hashlib.sha256(path.read_bytes()).hexdigest() == row["sha256"]
    return len(rows)


try:
    verify()
    node_home = os.environ["T01_NODE_HOME"]
    with TemporaryDirectory(prefix="gt-t06-s4-import-") as directory:
        scope = Path(directory)
        home, temp = scope / "home", scope / "tmp"
        home.mkdir()
        temp.mkdir()
        env = {"PATH": node_home + "/bin:/usr/bin:/bin", "HOME": str(home),
               "TMPDIR": str(temp), "TMP": str(temp), "TEMP": str(temp),
               "XDG_CONFIG_HOME": str(home / "config"), "XDG_DATA_HOME": str(home / "data"),
               "XDG_STATE_HOME": str(home / "state"), "XDG_CACHE_HOME": str(home / "cache"),
               "TZ": "UTC", "NO_COLOR": "1", "T06_IMPORT_ENTRY": (ROOT / "dist/auth/index.js").as_uri()}
        pin = subprocess.run([node_home + "/bin/node", "--version"], cwd=scope,
                             env=env, capture_output=True, text=True, timeout=5)
        assert pin.returncode == 0 and pin.stdout.strip() == "v24.21.0", "Wrong Node pin"
        source = ("const m=await import(process.env.T06_IMPORT_ENTRY);"
                  "process.stdout.write(JSON.stringify({exports:Object.keys(m).sort(),"
                  "session:m.SESSION_VAULT_VERSION,refresh:m.REFRESH_VAULT_VERSION})+'\\n');")
        started = time.monotonic()
        result = subprocess.run([node_home + "/bin/node", "--input-type=module", "-e", source],
                                cwd=scope, env=env, capture_output=True, text=True, timeout=5)
        expected = {"exports": sorted(["REFRESH_VAULT_VERSION", "SESSION_VAULT_VERSION", "SessionError",
                                       "isSessionError", "openAuthenticatedSessionState",
                                       "openRecoverableRefreshSessionState", "openRefreshSessionState", "openSessionState"]),
                    "session": 1, "refresh": 2}
        summary.update({"exit": result.returncode,
                        "elapsedMs": round((time.monotonic() - started) * 1000),
                        "exactExportOutput": result.stdout == json.dumps(expected, separators=(",", ":")) + "\n",
                        "stderrEmpty": result.stderr == "", "naturalTermination": True,
                        "homeTempEmpty": not any(home.iterdir()) and not any(temp.iterdir())})
        assert summary["exit"] == 0 and summary["exactExportOutput"] and summary["stderrEmpty"]
        assert summary["homeTempEmpty"]
    summary["cleanup"] = "Owned disposable HOME/temp removed"
    summary["frozenHashesStable"] = verify()
    summary["status"] = "passed"
    code = 0
except Exception as error:
    summary["errorType"] = type(error).__name__
summary["procedureSha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
RESULT.write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
raise SystemExit(code)
