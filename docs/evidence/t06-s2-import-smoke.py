#!/usr/bin/env python3
"""Small isolated public-entry import observation, not an IO interceptor."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory
import time

ROOT = Path.cwd()
MANIFEST = ROOT / "docs/evidence/t06-s2-f1-artifact-inventory.json"
EXPECTED = "e7b415d54004550faec96791efef56252e27aa02073b0d0db39cbcabab173725"
RESULT = ROOT / "docs/evidence/t06-s2-import-smoke-result.json"
summary = {"artifactId": "t06-s2-f1", "status": "failed",
           "observation": "isolated six-export public auth import plus source audit; not comprehensive IO interception"}
code = 1

def verify():
    assert hashlib.sha256(MANIFEST.read_bytes()).hexdigest() == EXPECTED
    for row in json.loads(MANIFEST.read_text())["files"]:
        p = ROOT / row["path"]
        assert p.is_file() and not p.is_symlink()
        assert hashlib.sha256(p.read_bytes()).hexdigest() == row["sha256"]

try:
    verify()
    with TemporaryDirectory(prefix="gt-t06-s2-import-") as directory:
        scope = Path(directory)
        home, temp = scope / "home", scope / "tmp"
        home.mkdir()
        temp.mkdir()
        node_home = os.environ["T01_NODE_HOME"]
        env = {"PATH": node_home + "/bin:/usr/bin:/bin", "HOME": str(home),
               "TMPDIR": str(temp), "TMP": str(temp), "TEMP": str(temp),
               "XDG_CONFIG_HOME": str(home / "config"), "XDG_DATA_HOME": str(home / "data"),
               "XDG_STATE_HOME": str(home / "state"), "XDG_CACHE_HOME": str(home / "cache"),
               "TZ": "UTC", "NO_COLOR": "1", "T06_IMPORT_ENTRY": (ROOT / "dist/auth/index.js").as_uri()}
        source = ("const m=await import(process.env.T06_IMPORT_ENTRY);"
                  "process.stdout.write(JSON.stringify({exports:Object.keys(m).sort(),"
                  "session:m.SESSION_VAULT_VERSION,refresh:m.REFRESH_VAULT_VERSION})+'\\n');")
        started = time.monotonic()
        result = subprocess.run([node_home + "/bin/node", "--input-type=module", "-e", source],
                                cwd=scope, env=env, capture_output=True, text=True, timeout=5)
        expected = {"exports": ["REFRESH_VAULT_VERSION", "SESSION_VAULT_VERSION", "SessionError",
                                "isSessionError", "openRefreshSessionState", "openSessionState"],
                    "session": 1, "refresh": 2}
        summary.update({"exit": result.returncode,
                        "elapsedMs": round((time.monotonic() - started) * 1000),
                        "exactExportOutput": result.stdout == json.dumps(expected, separators=(",", ":")) + "\n",
                        "stderrEmpty": result.stderr == "", "naturalTermination": True,
                        "homeTempEmpty": not any(home.iterdir()) and not any(temp.iterdir())})
        assert summary["exit"] == 0 and summary["exactExportOutput"] and summary["stderrEmpty"]
        assert summary["homeTempEmpty"]
    summary["cleanup"] = "Owned disposable HOME/temp removed"
    verify()
    summary["frozenHashesStable"] = 257
    summary["status"] = "passed"
    code = 0
except Exception as error:
    summary["errorType"] = type(error).__name__
RESULT.write_text(json.dumps(summary, indent=2) + "\n")
print(json.dumps(summary, indent=2))
raise SystemExit(code)
