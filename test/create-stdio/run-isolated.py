"""Bounded T15-S3 runner: fresh private bus/provider/TLS/ext4, no ambient secrets.

Usage: python3 test/create-stdio/run-isolated.py <node> <provider> <library-dir>
       <selection.json> <output-prefix>
The pinned provider is a disposable extraction, never a system installation.
"""
import json
import os
from pathlib import Path
import select
import signal
import subprocess
import sys
import tempfile


def run(args, env, **kwargs):
    return subprocess.run(args, env=env, check=True, capture_output=True, timeout=30, **kwargs)


def stop(child):
    if child is not None and child.poll() is None:
        child.send_signal(signal.SIGCONT)
        child.terminate()
        try:
            child.wait(timeout=10)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait(timeout=5)


node, provider, libraries, selection, output = sys.argv[1:]
cwd = Path.cwd()
bus = daemon = None
with tempfile.TemporaryDirectory(prefix=".gt-t15-s3-", dir=cwd.parent) as temporary:
    root = Path(temporary)
    os.chmod(root, 0o700)
    if subprocess.check_output(["findmnt", "-n", "-o", "FSTYPE", "--target", str(root)], text=True).strip() != "ext4":
        raise RuntimeError("Verified ext4 fixture parent required")
    env = dict(os.environ)
    for key in ("DISPLAY", "WAYLAND_DISPLAY", "SSH_AUTH_SOCK", "DBUS_SESSION_BUS_ADDRESS"):
        env.pop(key, None)
    for key in ("HOME", "XDG_DATA_HOME", "XDG_CONFIG_HOME", "XDG_CACHE_HOME", "XDG_RUNTIME_DIR"):
        directory = root / key.lower()
        directory.mkdir(mode=0o700)
        env[key] = str(directory)
    env["LD_LIBRARY_PATH"] = libraries
    env["PATH"] = str(Path(node).parent) + ":/usr/bin:/bin"
    env["NODE_OPTIONS"] = ""
    try:
        bus = subprocess.Popen(
            ["dbus-daemon", "--session", "--nofork", "--print-address=1",
             f"--address=unix:path={root / 'bus'}"],
            env=env, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True,
        )
        if not select.select([bus.stdout], [], [], 5)[0]:
            raise RuntimeError("Private bus failed to start")
        address = bus.stdout.readline().strip()
        if not address.startswith(f"unix:path={root / 'bus'}"):
            raise RuntimeError("Unexpected bus identity")
        env["DBUS_SESSION_BUS_ADDRESS"] = address
        daemon = subprocess.Popen(
            [provider, "--foreground", "--components=secrets", "--unlock",
             f"--control-directory={root / 'control'}"],
            env=env, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        daemon.stdin.write(b"synthetic-t15-s3-keyring\n")
        daemon.stdin.close()
        # Service property and actual libsecret store/read/clear are the qualification.
        for attempt in range(50):
            # Ask the bus itself first. Querying an absent Secret Service can
            # activate a competing system daemon before our private daemon owns it.
            owner = subprocess.run(
                ["busctl", f"--address={address}", "call", "org.freedesktop.DBus",
                 "/org/freedesktop/DBus", "org.freedesktop.DBus",
                 "GetConnectionUnixProcessID", "s", "org.freedesktop.secrets"],
                env=env, capture_output=True, timeout=2,
            )
            if owner.returncode == 0:
                if owner.stdout.strip() != f"u {daemon.pid}".encode():
                    raise RuntimeError("Private provider identity mismatch")
                probe = subprocess.run(
                    ["busctl", "--auto-start=no", f"--address={address}", "get-property", "org.freedesktop.secrets",
                     "/org/freedesktop/secrets/collection/login", "org.freedesktop.Secret.Collection", "Locked"],
                    env=env, capture_output=True, timeout=2,
                )
                if probe.returncode == 0 and probe.stdout.strip() == b"b false":
                    break
            if daemon.poll() is not None:
                raise RuntimeError("Private provider exited")
            # Short bounded wait for this owned disposable daemon only.
            select.select([], [], [], 0.1)
        else:
            raise RuntimeError("Private provider did not unlock")
        run(["secret-tool", "store", "--label=synthetic-t15-s3-probe", "t15-s3-probe", "1"],
            env, input=b"synthetic-t15-s3-secret")
        if run(["secret-tool", "lookup", "t15-s3-probe", "1"], env).stdout.strip() != b"synthetic-t15-s3-secret":
            raise RuntimeError("Private provider read mismatch")
        run(["secret-tool", "clear", "t15-s3-probe", "1"], env)
        if subprocess.run(["secret-tool", "lookup", "t15-s3-probe", "1"], env=env,
                          capture_output=True, timeout=5).returncode == 0:
            raise RuntimeError("Private provider clear failed")
        cert, key = root / "cert.pem", root / "key.pem"
        run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
             "-subj", "/CN=synthetic-t15-s3", "-addext", "subjectAltName=IP:127.0.0.1,DNS:localhost",
             "-keyout", str(key), "-out", str(cert)], env)
        os.chmod(key, 0o600)
        env.update({
            "GT_S3_ISOLATION_CONFIRMED": "t08-s3-isolated",
            "GT_S2_ISOLATION_CONFIRMED": "t08-s2-isolated",
            "GT_S2_TEST_BUS": address, "GT_S2_PRIVATE_ROOT": str(root),
            "GT_S2_TLS_CERT": str(cert), "GT_S2_TLS_KEY": str(key),
            "GT_S3_PRIVATE_ROOT": str(root), "GT_S1_ISOLATED_BASE": str(root),
            "GT_S3_TEST_BUS": address, "GT_S1_TEST_BUS": address,
            "T04_PROVIDER_BUS": address, "T04_PROVIDER_PARENT": str(root),
            "GT_S3_PROVIDER_PID": str(daemon.pid),
            "GT_S1_FIXTURE_CERT_FILE": str(cert), "GT_S1_FIXTURE_KEY_FILE": str(key),
            "NODE_EXTRA_CA_CERTS": str(cert),
        })
        result = subprocess.run(
            [node, "test/create-stdio/run.mjs", selection, output], env=env, timeout=600,
        )
        code = result.returncode
    finally:
        stop(daemon)
        stop(bus)
    if daemon.poll() is None or bus.poll() is None:
        raise RuntimeError("Owned provider/bus did not exit")
Path(output + ".cleanup.json").write_text(json.dumps({
    "privateProviderQualified": True, "ownedProviderExited": True,
    "qualifiedProviderWasOwnedProcess": True,
    "ownedBusExited": True, "privateRootsRemoved": not root.exists(),
}) + "\n")
sys.exit(code)
