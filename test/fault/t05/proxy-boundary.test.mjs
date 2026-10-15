// T05 fault: proxy boundary with a simple owned non-forwarding trap. The trap
// records connection/CONNECT attempts and fails the traffic (never forwards,
// tunnels or routes anywhere). A native child under the chosen startup proxy
// configuration proves the trap is reachable; the production transport must
// instead reach its owned HTTP/HTTPS target directly. Async bounded children
// keep parent fixture servers responsive; only owned children/sockets are
// shut down. No forwarding/tunnel framework, no sabotage variants.

import { describe, it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  startLoopbackHttp,
  startLoopbackHttps,
  startRawServer,
  closeServer,
  jsonResponse,
  readFixtureBytes,
  waitForDeadline,
} from "./helpers.mjs";
import { ROUTINE_R } from "../../unit/t05/helpers.mjs";

const CHILD = new URL("./proxy-boundary-child.mjs", import.meta.url);
const CERT_PATH = new URL("./fixtures/test-only-loopback-cert.pem", import.meta.url).pathname;

const ROUTINE_RECORD = { id: ROUTINE_R, name: "", isDraft: false, revision: 1, exercises: [] };

// Only these keys reach the child. Proxy variables are set explicitly per
// case with NO_PROXY cleared, so trap-required cases cannot silently bypass.
// Nothing unrelated (including personal/process config) is ever inherited.
const CHILD_ENV_KEYS = [
  "SYNTHETIC_QA_ORIGIN",
  "SYNTHETIC_QA_SECURE",
  "SYNTHETIC_QA_CERT",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "http_proxy",
  "https_proxy",
  "NO_PROXY",
  "no_proxy",
];

function childEnv(values) {
  const env = {};
  for (const key of CHILD_ENV_KEYS) {
    if (values[key] !== undefined) env[key] = values[key];
  }
  return env;
}

function proxyEnv(trapOrigin) {
  return {
    HTTP_PROXY: trapOrigin,
    HTTPS_PROXY: trapOrigin,
    http_proxy: trapOrigin,
    https_proxy: trapOrigin,
  };
}

// Small standard bounded child invocation: the builtin execFile facility
// (timeout, maxBuffer, killSignal) keeps parent fixture servers responsive.
// Any rejection (nonzero exit, timeout, overflow) fails the calling test.
const execFileAsync = promisify(execFile);

async function runBoundaryChild(origin, values, timeoutMs = 8000) {
  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    ["--use-env-proxy", CHILD.pathname],
    {
      env: childEnv({ SYNTHETIC_QA_ORIGIN: origin, ...values }),
      timeout: timeoutMs,
      maxBuffer: 65536,
      killSignal: "SIGKILL",
    },
  );
  return { stdout, stderr };
}

function parseLines(stdout) {
  return stdout
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

// Owned non-forwarding trap: records the first request line of every raw
// connection, then destroys it. HTTP absolute-form and HTTPS CONNECT attempts
// are both observable here; nothing is ever forwarded or tunneled.
async function startBoundaryTrap() {
  const attempts = [];
  const trap = await startRawServer((socket) => {
    let head = Buffer.alloc(0);
    const onData = (chunk) => {
      head = Buffer.concat([head, chunk]);
      if (head.length > 4096) {
        socket.destroy();
        return;
      }
      const end = head.indexOf("\r\n");
      if (end === -1) return;
      socket.removeListener("data", onData);
      attempts.push(head.subarray(0, end).toString("ascii"));
      socket.destroy();
    };
    socket.on("data", onData);
  });
  return { ...trap, attempts };
}

describe("proxy boundary over HTTP", () => {
  it("native control reaches the trap while the transport stays direct", async () => {
    const parentEnv = { ...process.env };
    const target = await startLoopbackHttp((req, res) => {
      jsonResponse(res, 200, ROUTINE_RECORD);
    });
    const trap = await startBoundaryTrap();
    try {
      const child = await runBoundaryChild(target.origin, proxyEnv(trap.origin));
      expect(child.stderr).toBe("");
      const [control, result] = parseLines(child.stdout);
      // Positive control: the native global-agent request reached the owned
      // trap as an absolute-form proxied request and failed there.
      expect(control).toMatchObject({ line: "control", ok: false, refused: true });
      expect(trap.attempts.length).toBe(1);
      expect(trap.attempts[0].startsWith("GET http://127.0.0.1:")).toBe(true);
      // Target: the transport connected directly to the owned HTTP target.
      expect(result).toMatchObject({ line: "target", ok: true });
      expect(target.requests.length).toBe(1);
      expect(process.env).toEqual(parentEnv);
      await waitForDeadline(() => trap.received.every((record) => record.destroyed));
    } finally {
      await closeServer(trap.server);
      await closeServer(target.server);
    }
  });
});

describe("proxy boundary over HTTPS", () => {
  it("CONNECT reaches the trap while the transport stays direct", async () => {
    const certPem = readFixtureBytes("test-only-loopback-cert.pem");
    const keyPem = readFixtureBytes("test-only-loopback-key.pem");
    const target = await startLoopbackHttps(
      { keyPem, certPem, label: "synthetic-qa valid loopback pair" },
      (req, res) => {
        jsonResponse(res, 200, ROUTINE_RECORD);
      },
    );
    const trap = await startBoundaryTrap();
    try {
      const child = await runBoundaryChild(target.origin, {
        SYNTHETIC_QA_SECURE: "1",
        SYNTHETIC_QA_CERT: CERT_PATH,
        ...proxyEnv(trap.origin),
      });
      expect(child.stderr).toBe("");
      const [control, result] = parseLines(child.stdout);
      // Positive control: the native TLS handshake attempted a CONNECT
      // tunnel through the owned trap and failed there.
      expect(control).toMatchObject({ line: "control", ok: false, refused: true });
      expect(trap.attempts.length).toBe(1);
      expect(trap.attempts[0].startsWith("CONNECT 127.0.0.1:")).toBe(true);
      // Target: the transport negotiated TLS directly with fixture trust.
      expect(result).toMatchObject({ line: "target", ok: true });
      expect(target.requests.length).toBe(1);
      await waitForDeadline(() => trap.received.every((record) => record.destroyed));
    } finally {
      await closeServer(trap.server);
      await closeServer(target.server);
    }
  });
});
