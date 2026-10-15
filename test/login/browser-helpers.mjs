import http from "node:http";
import net from "node:net";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { startBrowserLoginHelper } from "../../dist/login/index.js";

export { delay };

export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

export async function bind(host, port = 0) {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host, port, ipv6Only: host === "::1" }, resolve);
  });
  return server;
}

export async function closeServer(server) {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

export async function availablePort() {
  const ipv4 = await bind("127.0.0.1");
  const port = ipv4.address().port;
  let ipv6;
  try {
    ipv6 = await bind("::1", port);
  } finally {
    if (ipv6) await closeServer(ipv6);
    await closeServer(ipv4);
  }
  return port;
}

export function transactionFixture(options = {}) {
  const calls = { start: 0, submit: [], cancel: 0, close: 0 };
  const binding = Object.freeze({ fixture: "synthetic-binding" });
  const challenge = {
    attemptId: "synthetic-attempt",
    challengeId: "synthetic-challenge",
    nonce: "synthetic-backend-nonce",
    expiresAt: new Date(Date.now() + (options.ttl ?? 60_000)).toISOString(),
  };
  const transaction = {
    binding,
    async start(signal) {
      calls.start += 1;
      if (options.start) return options.start(signal);
      return challenge;
    },
    async submit(attemptId, idToken, signal) {
      calls.submit.push({ attemptId, idToken, signal });
      if (options.submit) return options.submit(signal);
      return binding;
    },
    async cancel() {
      calls.cancel += 1;
      if (options.cancel) await options.cancel();
    },
    async close() {
      calls.close += 1;
      if (options.close) await options.close();
    },
  };
  return { transaction, calls, binding, challenge };
}

export async function helperFixture(options = {}) {
  const port = options.port ?? (await availablePort());
  const fixture = transactionFixture(options);
  const settings = {
    version: 1,
    googleWebClientId: "synthetic-client.apps.googleusercontent.com",
    browserOrigin: `http://localhost:${port}`,
  };
  const helper = await startBrowserLoginHelper({
    transaction: fixture.transaction,
    settings,
    maxRequestBytes: options.maxRequestBytes ?? 65536,
    signal: options.signal ?? new globalThis.AbortController().signal,
  });
  return { ...fixture, helper, settings, port };
}

export async function request(fixture, options = {}) {
  const body = options.body ?? "";
  const headers = {
    Host: `localhost:${fixture.port}`,
    ...(options.method === "POST"
      ? {
          Origin: fixture.settings.browserOrigin,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        }
      : {}),
    ...options.headers,
    Connection: "close",
  };
  for (const [name, value] of Object.entries(headers)) {
    if (value === undefined) delete headers[name];
  }
  return new Promise((resolve, reject) => {
    const outgoing = http.request(
      {
        host: options.host ?? "127.0.0.1",
        port: fixture.port,
        method: options.method ?? "GET",
        path: options.path ?? "/",
        headers,
        agent: false,
      },
      (incoming) => {
        const chunks = [];
        incoming.on("data", (chunk) => chunks.push(chunk));
        incoming.on("end", () =>
          resolve({
            status: incoming.statusCode,
            headers: incoming.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
        incoming.on("error", reject);
      },
    );
    outgoing.on("error", reject);
    outgoing.end(body);
  });
}

export async function pageCsrf(fixture) {
  const response = await request(fixture);
  const match = response.body.match(
    /(?:["']?csrf["']?\s*:\s*|\bcsrf\s*=\s*)["']([A-Za-z0-9_-]{43})["']/,
  );
  if (!match) throw new Error("Expected page's serialized per-attempt CSRF");
  return { response, csrf: match[1] };
}

export async function rawRequest(fixture, bytes) {
  const socket = net.createConnection({ host: "127.0.0.1", port: fixture.port });
  socket.setTimeout(7000, () => socket.destroy(new Error("fixture timeout")));
  await once(socket, "connect");
  const chunks = [];
  socket.on("data", (chunk) => chunks.push(chunk));
  const closed = once(socket, "close");
  socket.write(bytes);
  await closed;
  return Buffer.concat(chunks).toString("utf8");
}

export async function assertPortReleased(port) {
  const ipv4 = await bind("127.0.0.1", port);
  let ipv6;
  try {
    ipv6 = await bind("::1", port);
  } finally {
    if (ipv6) await closeServer(ipv6);
    await closeServer(ipv4);
  }
}
