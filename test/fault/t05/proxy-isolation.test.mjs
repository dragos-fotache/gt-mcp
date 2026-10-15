// T05 fault: proxy isolation proven in isolated child processes with their
// own allowlisted environment and startup flags. Parent servers stay
// responsive: children are spawned asynchronously (never spawnSync) with
// bounded collection, kill and reaping. An owned forward-proxy/tunnel trap
// must observe the native positive control yet never the transport's direct
// loopback traffic. Parent suite env is never mutated.

/* global clearTimeout, setTimeout */

import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import {
  startLoopbackHttp,
  startLoopbackHttps,
  closeServer,
  jsonResponse,
  readFixtureBytes,
} from "./helpers.mjs";
import { ROUTINE_R } from "../../unit/t05/helpers.mjs";
import { collectChild } from "../../unit/t05/spawn-collect.mjs";

const CHILD = new URL("./proxy-child-fixture.mjs", import.meta.url);
const CERT_PATH = new URL("./fixtures/test-only-loopback-cert.pem", import.meta.url).pathname;

const ROUTINE_RECORD = { id: ROUTINE_R, name: "", isDraft: false, revision: 1, exercises: [] };

// Only these keys reach the child. Proxy/no-proxy variables are set
// explicitly per case; everything unrelated (including personal/process
// variables) is never inherited.
const CHILD_ENV_KEYS = [
  "SYNTHETIC_QA_ORIGIN",
  "SYNTHETIC_QA_MODE",
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

// Async spawn with bounded collection; kills and reaps without blocking the
// parent loop. Collection is byte-bounded; timeout kills are followed by an
// observed close (reap proof) and spawn failures stay sanitized labels.
async function runChild(origin, values, timeoutMs = 8000, useEnvProxyFlag = true) {
  const args = useEnvProxyFlag ? ["--use-env-proxy", CHILD.pathname] : [CHILD.pathname];
  const child = spawn(process.execPath, args, {
    env: childEnv({ SYNTHETIC_QA_ORIGIN: origin, ...values }),
    stdio: ["ignore", "pipe", "pipe"],
  });
  return collectChild(child, { timeoutMs });
}

function parseLines(stdout) {
  const lines = stdout.split("\n").filter((line) => line.length > 0);
  return lines.map((line) => JSON.parse(line));
}

// Owned forward proxy: forwards ONLY absolute-form requests whose origin is
// the known owned literal-loopback target, with a bounded request head.
// Anything else gets a closed 502 without forwarding. All sockets tracked.
async function startForwardTrap(targetOrigin) {
  const hits = [];
  const clientSockets = new Set();
  const outbound = new Set();
  const direct = new http.Agent();
  const trap = http.createServer((req, res) => {
    if (req.url.length > 8192 || req.rawHeaders.length > 400) {
      try {
        req.socket.destroy();
      } catch {
        // Best effort: oversized heads never reach forwarding; a dead socket
        // here only means the peer already went away.
      }
      return;
    }
    let destination;
    try {
      destination = new URL(req.url);
    } catch (parseError) {
      // Not an absolute-form proxy request: closed 502 without forwarding.
      // Only the sanitized error name is retained, never the raw URL.
      void parseError;
      res.writeHead(502);
      res.end();
      return;
    }
    if (destination.origin !== targetOrigin) {
      res.writeHead(502);
      res.end();
      return;
    }
    hits.push(`${req.method} ${req.url}`);
    const proxy = http.request(
      {
        host: "127.0.0.1",
        port: Number(destination.port),
        path: `${destination.pathname}${destination.search}`,
        method: req.method,
        headers: { ...req.headers, host: destination.host },
        agent: direct,
      },
      (got) => {
        res.writeHead(got.statusCode, got.headers);
        got.pipe(res);
      },
    );
    outbound.add(proxy);
    proxy.on("close", () => outbound.delete(proxy));
    proxy.on("error", () => {
      try {
        res.writeHead(502);
        res.end();
      } catch {
        // Best effort: the client is already gone, so the 502 has nobody to
        // reach; the outbound error itself is the recorded outcome.
      }
    });
    req.pipe(proxy);
  });
  trap.on("connection", (socket) => {
    clientSockets.add(socket);
    socket.on("close", () => clientSockets.delete(socket));
    socket.on("error", () => {});
  });
  await new Promise((resolve, reject) => {
    trap.once("error", reject);
    trap.listen(0, "127.0.0.1", resolve);
  });
  return {
    origin: `http://127.0.0.1:${trap.address().port}`,
    hits,
    async close() {
      for (const socket of [...clientSockets, ...outbound]) {
        try {
          socket.destroy();
        } catch {
          // Best effort: destroy() is idempotent, so already-reaped sockets
          // need no further handling during trap shutdown.
        }
      }
      direct.destroy();
      trap.closeAllConnections();
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("synthetic-qa: trap close timed out")), 5000);
        trap.close((error) => {
          clearTimeout(timer);
          if (error) reject(error);
          else resolve();
        });
      });
    },
  };
}

// Owned CONNECT tunnel: tunnels ONLY to the known owned literal-loopback
// target authority, with a bounded request head. All sockets tracked both
// sides; nothing routes to unexpected destinations.
async function startTunnelTrap(targetOrigin) {
  const authority = new URL(targetOrigin).host;
  const connects = [];
  const sockets = new Set();
  const outbound = new Set();
  const trap = net.createServer((client) => {
    sockets.add(client);
    client.on("close", () => sockets.delete(client));
    client.on("error", () => {});
    let head = Buffer.alloc(0);
    const onData = (chunk) => {
      head = Buffer.concat([head, chunk]);
      if (head.length > 4096) {
        client.destroy();
        return;
      }
      const end = head.indexOf("\r\n\r\n");
      if (end === -1) return;
      client.removeListener("data", onData);
      const [line] = head.subarray(0, end).toString("ascii").split("\r\n");
      const [, claimed] = line.split(" ");
      if (claimed !== authority || !line.startsWith("CONNECT ")) {
        client.destroy();
        return;
      }
      connects.push(line);
      const [host, port] = claimed.split(":");
      const server = net.connect(Number(port), host, () => {
        client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        const rest = head.subarray(end + 4);
        if (rest.length > 0) server.write(rest);
        client.pipe(server);
        server.pipe(client);
      });
      outbound.add(server);
      server.on("close", () => outbound.delete(server));
      server.on("error", () => client.destroy());
    };
    client.on("data", onData);
  });
  await new Promise((resolve, reject) => {
    trap.once("error", reject);
    trap.listen(0, "127.0.0.1", resolve);
  });
  return {
    origin: `http://127.0.0.1:${trap.address().port}`,
    connects,
    async close() {
      for (const socket of [...sockets, ...outbound]) {
        try {
          socket.destroy();
        } catch {
          // Best effort: destroy() is idempotent, so already-reaped sockets
          // need no further handling during trap shutdown.
        }
      }
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("synthetic-qa: trap close timed out")), 5000);
        trap.close((error) => {
          clearTimeout(timer);
          if (error) reject(error);
          else resolve();
        });
      });
    },
  };
}

describe("child proxy isolation over HTTP", () => {
  it("native control reaches the trap while the transport stays direct", async () => {
    const parentEnv = { ...process.env };
    const target = await startLoopbackHttp((req, res) => {
      jsonResponse(res, 200, ROUTINE_RECORD);
    });
    const trap = await startForwardTrap(target.origin);
    try {
      const child = await runChild(target.origin, {
        SYNTHETIC_QA_MODE: "http-proxy",
        ...proxyEnv(trap.origin),
      });
      expect(child.timedOut).toBe(false);
      expect(child.code).toBe(0);
      expect(child.signal).toBe(null);
      expect(child.truncated).toBe(false);
      expect(child.stderr).toBe("");
      const [control, result] = parseLines(child.stdout);
      // Positive control: native global-agent request went through the trap.
      expect(control).toMatchObject({ line: "control", ok: true });
      expect(trap.hits.length).toBe(1);
      expect(trap.hits[0].startsWith("GET http://127.0.0.1:")).toBe(true);
      // Target: the transport connected directly, bypassing the trap, so the
      // owned target served exactly the forwarded control plus one direct hit.
      expect(result).toMatchObject({ line: "target", ok: true });
      expect(target.requests.length).toBe(2);
      expect(process.env).toEqual(parentEnv);
    } finally {
      await trap.close();
      await closeServer(target.server);
    }
  });

  it("NO_PROXY bypass keeps both legs direct as an explicit control", async () => {
    const target = await startLoopbackHttp((req, res) => {
      jsonResponse(res, 200, ROUTINE_RECORD);
    });
    const trap = await startForwardTrap(target.origin);
    try {
      const child = await runChild(target.origin, {
        SYNTHETIC_QA_MODE: "http-bypass",
        ...proxyEnv(trap.origin),
        NO_PROXY: "127.0.0.1",
        no_proxy: "127.0.0.1",
      });
      expect(child.timedOut).toBe(false);
      expect(child.code).toBe(0);
      expect(child.signal).toBe(null);
      expect(child.truncated).toBe(false);
      expect(child.stderr).toBe("");
      const [control, result] = parseLines(child.stdout);
      expect(control).toMatchObject({ line: "control", ok: true });
      expect(result).toMatchObject({ line: "target", ok: true });
      expect(trap.hits.length).toBe(0);
      expect(target.requests.length).toBe(2);
    } finally {
      await trap.close();
      await closeServer(target.server);
    }
  });

  it("runtime global sabotage breaks native paths but not the transport", async () => {
    // Genuine runtime replacement (not startup flag alone): the child swaps
    // the process globals for throwing stubs after startup.
    const target = await startLoopbackHttp((req, res) => {
      jsonResponse(res, 200, ROUTINE_RECORD);
    });
    try {
      const child = await runChild(
        target.origin,
        { SYNTHETIC_QA_MODE: "global-sabotage" },
        8000,
        false,
      );
      expect(child.timedOut).toBe(false);
      expect(child.code).toBe(0);
      expect(child.truncated).toBe(false);
      const [control, result] = parseLines(child.stdout);
      // Sabotage proof: the native global-agent path throws on the stub.
      expect(control).toMatchObject({ line: "control", ok: false, sabotaged: true });
      // The transport never consults the globals and still succeeds.
      expect(result).toMatchObject({ line: "target", ok: true });
      expect(target.requests.length).toBe(1);
    } finally {
      await closeServer(target.server);
    }
  });
});

describe("child proxy isolation over HTTPS", () => {
  it("CONNECT reaches the tunnel trap while the transport stays direct", async () => {
    const certPem = readFixtureBytes("test-only-loopback-cert.pem");
    const keyPem = readFixtureBytes("test-only-loopback-key.pem");
    const target = await startLoopbackHttps(
      { keyPem, certPem, label: "synthetic-qa valid loopback pair" },
      (req, res) => {
        jsonResponse(res, 200, ROUTINE_RECORD);
      },
    );
    const trap = await startTunnelTrap(target.origin);
    try {
      const child = await runChild(target.origin, {
        SYNTHETIC_QA_MODE: "https-proxy",
        SYNTHETIC_QA_CERT: CERT_PATH,
        ...proxyEnv(trap.origin),
      });
      expect(child.timedOut).toBe(false);
      expect(child.code).toBe(0);
      expect(child.signal).toBe(null);
      expect(child.truncated).toBe(false);
      expect(child.stderr).toBe("");
      const [control, result] = parseLines(child.stdout);
      // Positive control: native TLS went through a CONNECT tunnel the trap saw.
      expect(control).toMatchObject({ line: "control", ok: true });
      expect(trap.connects.length).toBe(1);
      expect(trap.connects[0].startsWith("CONNECT 127.0.0.1:")).toBe(true);
      // Target: the transport negotiated TLS directly with fixture trust.
      expect(result).toMatchObject({ line: "target", ok: true });
      expect(target.requests.length).toBe(2);
    } finally {
      await trap.close();
      await closeServer(target.server);
    }
  });
});
