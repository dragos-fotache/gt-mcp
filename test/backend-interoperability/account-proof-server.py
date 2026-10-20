"""Fixed S6 synthetic RS256 proof boundary; keys/config live in an owned private root."""
import argparse
import base64
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from pathlib import Path
import re
import secrets
import signal
import subprocess
import time


def encoded(value):
    return base64.urlsafe_b64encode(value).rstrip(b"=")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True)
    args = parser.parse_args()
    config = Path(args.config)
    root = config.parent
    if not root.is_dir() or root.stat().st_uid != os.getuid() or (root.stat().st_mode & 0o777) != 0o700 or config.exists():
        raise RuntimeError("private proof root required")
    key, cert = root / "proof-key.pem", root / "proof-cert.pem"
    with key.open("xb") as handle:
        os.chmod(key, 0o600)
        generated = subprocess.run(
            ["openssl", "genpkey", "-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:2048"],
            stdout=handle, stderr=subprocess.DEVNULL, timeout=30, check=False)
    if generated.returncode:
        raise RuntimeError("proof key generation failed")
    subprocess.run(
        ["openssl", "req", "-new", "-x509", "-key", str(key), "-out", str(cert),
         "-days", "2", "-subj", "/CN=T16 synthetic proof"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30, check=True)
    os.chmod(cert, 0o600)
    public = json.dumps({"t16-s6-key": cert.read_text()}).encode()
    secret = secrets.token_urlsafe(32)
    audience = "android-isolated-test"

    class Handler(BaseHTTPRequestHandler):
        def setup(self):
            super().setup()
            self.connection.settimeout(5)

        def log_message(self, *_args):
            pass

        def reply(self, status, body):
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "public, max-age=3600" if status == 200 and self.path == "/certs" else "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            self.reply(200, public) if self.path == "/certs" else self.reply(404, b"{}")

        def do_POST(self):
            try:
                if self.path != "/sign" or not secrets.compare_digest(
                        self.headers.get("Authorization", ""), "Bearer " + secret):
                    raise ValueError()
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 2048:
                    raise ValueError()
                value = json.loads(self.rfile.read(size))
                if set(value) != {"subject", "nonce"} or not re.fullmatch(
                        r"t16-s6-[0-9a-f-]{36}", value["subject"]) or not isinstance(value["nonce"], str) or not 0 < len(value["nonce"]) <= 512:
                    raise ValueError()
                now = int(time.time())
                header = encoded(b'{"alg":"RS256","kid":"t16-s6-key","typ":"JWT"}')
                payload = encoded(json.dumps({"iss": "https://accounts.google.com", "aud": audience,
                                              "iat": now, "exp": now + 120,
                                              "sub": value["subject"], "nonce": value["nonce"]},
                                             separators=(",", ":")).encode())
                unsigned = header + b"." + payload
                signed = subprocess.run(["openssl", "dgst", "-sha256", "-sign", str(key)],
                                        input=unsigned, capture_output=True, check=True, timeout=5)
                token = (unsigned + b"." + encoded(signed.stdout)).decode()
                self.reply(200, json.dumps({"idToken": token}).encode())
            except Exception:
                self.reply(400, b"{}")

    server = HTTPServer(("127.0.0.1", 0), Handler)
    server.timeout = 1
    pending = root / "proof-config.pending"
    with pending.open("x") as handle:
        os.chmod(pending, 0o600)
        json.dump({"origin": f"http://127.0.0.1:{server.server_port}",
                   "token": secret, "audience": audience}, handle)
    os.link(pending, config)
    pending.unlink()
    def stop(_signum, _frame):
        raise KeyboardInterrupt()
    signal.signal(signal.SIGTERM, stop)
    try:
        while True:
            server.handle_request()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        config.unlink()
        key.unlink()
        cert.unlink()


if __name__ == "__main__":
    try:
        main()
    except Exception:
        raise SystemExit("isolated proof facility failed") from None
