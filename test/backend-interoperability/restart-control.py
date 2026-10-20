"""Private T16 supervisor overlay for this run's Java child only.

Called only by the disposable copy of Android's guarded launcher. No product HTTP
endpoint, config/keys/database change, source edit or personal process control.
"""
import json
from datetime import datetime
import os
from pathlib import Path
import socket
import subprocess
import time
import urllib.error
import urllib.request


def stop_java(child):
    if child.poll() is None:
        child.terminate()
        try:
            child.wait(timeout=20)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait(timeout=5)
            raise RuntimeError("owned Java failed graceful stop")


def serve_restarts(child, start, config_path, challenge_url, clock_enabled=False):
    control = Path(config_path + ".control")
    stats_path = Path(config_path + ".restart.json")
    stats = {"restarts": 0, "clockRestarts": 0, "allRestartPidsChanged": True, "ownedJavaExited": False}
    listener = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    bound = False
    try:
        listener.bind(str(control))  # never overwrite a prior path
        bound = True
        os.chmod(control, 0o600)
        listener.listen(1)
        listener.settimeout(0.2)
        while child.poll() is None:
            try:
                connection, _ = listener.accept()
            except TimeoutError:
                continue
            with connection:
                connection.settimeout(5)
                command = connection.recv(128)
                clock = None
                if command != b"restart\n":
                    try:
                        if not clock_enabled or not command.startswith(b"clock:") or not command.endswith(b"Z\n"):
                            raise ValueError()
                        clock = command[6:-1].decode("ascii")
                        datetime.fromisoformat(clock[:-1] + "+00:00")
                    except (ValueError, UnicodeError):
                        connection.sendall(b"rejected\n")
                        continue
                if len(command) > 64:
                    connection.sendall(b"rejected\n")
                    continue
                previous_pid = child.pid
                stop_java(child)
                child = start(clock)
                deadline = time.monotonic() + 45
                while True:
                    if child.poll() is not None or time.monotonic() >= deadline:
                        raise RuntimeError("owned Java restart did not qualify")
                    try:
                        request = urllib.request.Request(challenge_url, data=b"{}",
                                                         headers={"Content-Type": "application/json"})
                        with urllib.request.urlopen(request, timeout=2) as response:
                            if response.status == 200:
                                break
                    except (OSError, urllib.error.URLError):
                        pass
                    time.sleep(0.1)
                stats["restarts"] += 1
                stats["clockRestarts"] += clock is not None
                stats["allRestartPidsChanged"] &= child.pid != previous_pid
                stats_path.write_text(json.dumps(stats) + "\n")
                os.chmod(stats_path, 0o600)
                connection.sendall(b"restarted\n")
        return child, child.returncode
    finally:
        listener.close()
        if bound:
            control.unlink(missing_ok=True)
        stop_java(child)
        stats["ownedJavaExited"] = child.poll() is not None
        stats_path.write_text(json.dumps(stats) + "\n")
        os.chmod(stats_path, 0o600)
