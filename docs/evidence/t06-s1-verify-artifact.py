#!/usr/bin/env python3
"""Verify the explicit T06-S1 frozen inventory; no target execution."""
import hashlib
import json
from pathlib import Path
import sys

root = Path.cwd()
manifest = root / (sys.argv[1] if len(sys.argv) > 1 else
                   "docs/evidence/t06-s1-f1-artifact-inventory.json")
inventory = json.loads(manifest.read_text())
rows = inventory["files"]
assert len({row["path"] for row in rows}) == len(rows), "Duplicate inventory entry"
for row in rows:
    relative = Path(row["path"])
    assert not relative.is_absolute() and ".." not in relative.parts, "Unsafe path"
    path = root / relative
    assert path.is_file() and not path.is_symlink(), "Frozen file absent/unsafe"
    assert hashlib.sha256(path.read_bytes()).hexdigest() == row["sha256"], "Frozen artifact changed"
print("PASS", inventory["artifactId"], "unchanged files:", len(rows))
