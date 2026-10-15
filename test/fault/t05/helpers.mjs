// Synthetic T05 fault helpers: isolated literal-loopback HTTP(S)/raw servers
// and test-only TLS fixture loading. No external endpoints, no personal trust.
// TLS fixture files are coordinator-provisioned test-only material; absence
// fails loudly, never skips.

/* global clearTimeout, setTimeout */

import http from "node:http";
import https from "node:https";
import net from "node:net";
import { existsSync, readFileSync } from "node:fs";

export const LOOPBACK_V4 = "127.0.0.1";

export const FAULT_WAIT_MS = 5000;
export const FAULT_POLL_MS = 10;

// Read a required synthetic fixture next to this helper. Missing fixtures
// throw a fixture-missing error (requested via coordinator), never a skip.
// Presence is gated explicitly so no native error chain (with private paths)
// ever enters the failure; the message names only the repo-relative fixture.
export function readFixture(name) {
  const url = new URL(`./fixtures/${name}`, import.meta.url);
  if (!existsSync(url)) {
    throw new Error(
      `synthetic-qa fixture missing: test/fault/t05/fixtures/${name} ` +
        `(requested through coordinator)`,
    );
  }
  return readFileSync(url, "utf8");
}

export function readFixtureBytes(name) {
  const url = new URL(`./fixtures/${name}`, import.meta.url);
  if (!existsSync(url)) {
    throw new Error(
      `synthetic-qa fixture missing: test/fault/t05/fixtures/${name} ` +
        `(requested through coordinator)`,
    );
  }
  return readFileSync(url);
}

export function formatHost(host) {
  return host.includes(":") ? `[${host}]` : host;
}

// Bounded condition wait with a real deadline (no unbounded busy turns).
export async function waitForDeadline(predicate, timeoutMs = FAULT_WAIT_MS) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (predicate()) return;
    if (Date.now() >= deadline) {
      throw new Error("synthetic-qa: fault condition not met within deadline");
    }
    await new Promise((resolve) => setTimeout(resolve, FAULT_POLL_MS));
  }
}

function listenAsync(server, host) {
  return new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    server.once("error", onError);
    server.listen(0, host, () => {
      server.removeListener("error", onError);
      resolve();
    });
  });
}

// Start an isolated HTTP server on literal loopback. Handler receives the raw
// Node request/response plus a capture record. Resolves with { server, origin,
// requests, responses } where responses accumulate server-side close events.
export async function startLoopbackHttp(handler, host = LOOPBACK_V4) {
  const requests = [];
  const responses = [];
  const server = http.createServer((req, res) => {
    const record = { closed: false };
    responses.push(record);
    res.on("close", () => {
      record.closed = true;
    });
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      requests.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        rawHeaders: req.rawHeaders,
        body: Buffer.concat(chunks),
        sentHeaders: null,
      });
      handler(req, res, requests[requests.length - 1]);
    });
  });
  await listenAsync(server, host);
  const address = server.address();
  const origin = `http://${formatHost(host)}:${address.port}`;
  return { server, origin, requests, responses };
}

// Start an isolated HTTPS server on literal loopback with the given test-only
// key/cert PEM material. Label is recorded for provenance only.
export async function startLoopbackHttps({ keyPem, certPem, label }, handler) {
  void label;
  const requests = [];
  const server = https.createServer({ key: keyPem, cert: certPem }, (req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      requests.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        rawHeaders: req.rawHeaders,
        body: Buffer.concat(chunks),
      });
      handler(req, res, requests[requests.length - 1]);
    });
  });
  await listenAsync(server, LOOPBACK_V4);
  const address = server.address();
  const origin = `https://${LOOPBACK_V4}:${address.port}`;
  return { server, origin, requests };
}

// Start an isolated raw TCP server for byte-exact stimulus (duplicate
// headers, truncation, upgrades, 204 framing). onConnection receives the
// socket; received accumulates connection/destruction events.
export async function startRawServer(onConnection) {
  const received = [];
  const sockets = new Set();
  const server = net.createServer((socket) => {
    const record = { destroyed: false };
    received.push(record);
    sockets.add(socket);
    socket.on("close", () => {
      record.destroyed = true;
      sockets.delete(socket);
    });
    socket.on("error", () => {});
    onConnection(socket, record);
  });
  server.__qaSockets = sockets;
  await listenAsync(server, LOOPBACK_V4);
  const address = server.address();
  const origin = `http://${LOOPBACK_V4}:${address.port}`;
  return { server, origin, received };
}

// Close a test server robustly: destroy owned connections first, then close
// with a bounded deadline so leaked sockets cannot hang the suite. The
// deadline timer is cleared on success, never left dangling.
export async function closeServer(server, timeoutMs = FAULT_WAIT_MS) {
  if (typeof server.closeAllConnections === "function") {
    server.closeAllConnections();
  } else {
    for (const socket of server.__qaSockets ?? []) {
      try {
        socket.destroy();
      } catch {
        // Best effort: destroy() is idempotent, so a dead socket here only
        // means owned cleanup already reaped it; teardown continues.
      }
    }
  }
  let timer = null;
  try {
    await Promise.race([
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("synthetic-qa: server close timed out")),
          timeoutMs,
        );
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer !== null) clearTimeout(timer);
  }
}

// JSON response with extra headers as an ARRAY of pairs (objects would create
// numeric header keys). Headers are installed via setHeader BEFORE writeHead
// so the sent precondition is independently observable through
// res.getHeaders() on the optional capture record.
export function jsonResponse(res, status, obj, extraPairs = [], capture = null) {
  const body = Buffer.from(JSON.stringify(obj), "utf8");
  for (const [name, value] of extraPairs) res.setHeader(name, value);
  res.writeHead(status, { "content-type": "application/json" });
  if (capture) capture.sentHeaders = res.getHeaders();
  res.end(body);
}

// Temporarily set process env vars for proxy-override tests; restores after.
export async function withEnv(vars, fn) {
  const previous = new Map();
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}
