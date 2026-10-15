import net from "node:net";
import { once } from "node:events";
import { describe, expect, it } from "vitest";
import { startBrowserLoginHelper } from "../../dist/login/index.js";
import {
  assertPortReleased,
  availablePort,
  bind,
  closeServer,
  deferred,
  delay,
  helperFixture,
  pageCsrf,
  rawRequest,
  request,
  transactionFixture,
} from "./browser-helpers.mjs";

function credentialBody(csrf, idToken = "synthetic-opaque-credential") {
  return JSON.stringify({ csrf, idToken });
}

async function finish(fixture) {
  await fixture.helper.close();
  await fixture.helper.completion.catch(() => {});
}

function expectSafeHeaders(response) {
  expect(response.headers["cache-control"]).toBe("no-store");
  expect(response.headers.pragma).toBe("no-cache");
  expect(response.headers["x-content-type-options"]).toBe("nosniff");
  expect(response.headers["x-frame-options"]).toBe("DENY");
  expect(response.headers["cross-origin-opener-policy"]).toBe("same-origin-allow-popups");
  expect(response.headers["referrer-policy"]).toBe("no-referrer-when-downgrade");
  expect(Object.keys(response.headers).some((key) => key.startsWith("access-control-allow-"))).toBe(
    false,
  );
}

describe("T07-S2 owned loopback HTTP boundary", () => {
  it("serves both reserved loopbacks with canonical URL and security headers", async () => {
    const fixture = await helperFixture();
    try {
      expect(Object.isFrozen(fixture.helper)).toBe(true);
      expect(fixture.helper.url).toBe(`${fixture.settings.browserOrigin}/`);
      const { response, csrf } = await pageCsrf(fixture);
      expect(response.status).toBe(200);
      expectSafeHeaders(response);
      const csp = response.headers["content-security-policy"];
      const nonce = csp.match(/script-src 'nonce-([A-Za-z0-9_-]{43})'/)[1];
      expect(nonce).not.toBe(csrf);
      expect(csp).toContain(`style-src 'nonce-${nonce}'`);
      for (const directive of [
        "default-src 'none'",
        "connect-src 'self' https://accounts.google.com/gsi/",
        "frame-src https://accounts.google.com/gsi/",
        "img-src https://accounts.google.com/gsi/",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
      ])
        expect(csp).toContain(directive);
      expect((await request(fixture, { host: "::1" })).status).toBe(200);
    } finally {
      await finish(fixture);
    }
    expect(fixture.calls.start).toBe(1);
    expect(fixture.calls.close).toBe(1);
    await assertPortReleased(fixture.port);
  });

  it("rejects Host, Origin, routes, methods and CSRF without consuming admission", async () => {
    const fixture = await helperFixture();
    try {
      const { csrf } = await pageCsrf(fixture);
      const base = { method: "POST", path: "/credential", body: credentialBody(csrf) };
      const missingHost = await rawRequest(fixture, "GET / HTTP/1.1\r\nConnection: close\r\n\r\n");
      expect(missingHost).toMatch(/^HTTP\/1\.1 403 /);
      expect(missingHost).toContain("Cache-Control: no-store");
      for (const headers of [
        { Host: `127.0.0.1:${fixture.port}` },
        { Host: `localhost:${fixture.port + 1}` },
        { Origin: undefined },
        { Origin: "null" },
        { Origin: "https://synthetic-foreign.invalid" },
      ]) {
        const response = await request(fixture, { ...base, headers });
        expect(response.status).toBe(403);
        expectSafeHeaders(response);
        expect(response.headers.connection).toBe("close");
      }
      expect((await request(fixture, { headers: { Origin: "null" } })).status).toBe(403);
      for (const path of [
        "/?query",
        "/credential?query",
        "/other",
        `${fixture.settings.browserOrigin}/`,
      ]) {
        expect((await request(fixture, { path })).status).toBe(404);
      }
      expect((await request(fixture, { method: "OPTIONS" })).status).toBe(405);
      for (const badCsrf of ["synthetic-wrong-csrf", "é".repeat(43)]) {
        expect((await request(fixture, { ...base, body: credentialBody(badCsrf) })).status).toBe(
          403,
        );
      }
      expect(fixture.calls.submit).toHaveLength(0);
      expect((await request(fixture, base)).status).toBe(200);
      await expect(fixture.helper.completion).resolves.toEqual(fixture.binding);
      expect(fixture.calls.submit).toHaveLength(1);
      expect(fixture.calls.submit[0].attemptId).toBe(fixture.challenge.attemptId);
      expect(fixture.calls.submit[0].idToken).toBe("synthetic-opaque-credential");
      expect(fixture.calls.cancel).toBe(0);
      await assertPortReleased(fixture.port);
    } finally {
      await finish(fixture);
    }
  });

  it("rejects a stale page CSRF after a new attempt reuses the fixed port", async () => {
    const first = await helperFixture();
    const { csrf: staleCsrf } = await pageCsrf(first);
    await finish(first);
    const fixture = await helperFixture({ port: first.port });
    try {
      const { csrf } = await pageCsrf(fixture);
      expect(csrf).not.toBe(staleCsrf);
      expect(
        (
          await request(fixture, {
            method: "POST",
            path: "/credential",
            body: credentialBody(staleCsrf),
          })
        ).status,
      ).toBe(403);
      expect(fixture.calls.submit).toHaveLength(0);
      expect(
        (
          await request(fixture, {
            method: "POST",
            path: "/credential",
            body: credentialBody(csrf),
          })
        ).status,
      ).toBe(200);
      await fixture.helper.completion;
    } finally {
      await finish(fixture);
    }
  });

  it("rejects ambiguous headers, framing and malformed bounded JSON", async () => {
    const fixture = await helperFixture({ maxRequestBytes: 256 });
    try {
      const { csrf } = await pageCsrf(fixture);
      const prefix = `POST /credential HTTP/1.1\r\nHost: localhost:${fixture.port}\r\nOrigin: ${fixture.settings.browserOrigin}\r\n`;
      for (const duplicate of [
        "Host: duplicate.invalid",
        "origin: null",
        "Content-Type: application/json",
        "X-Fixture: a\r\nx-fixture: b",
      ]) {
        const raw = await rawRequest(
          fixture,
          `${prefix}Content-Type: application/json\r\n${duplicate}\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}`,
        );
        expect(raw).toMatch(/^HTTP\/1\.1 400 /);
      }
      expect(
        await rawRequest(
          fixture,
          `${prefix}Transfer-Encoding: chunked\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n2\r\n{}\r\n0\r\n\r\n`,
        ),
      ).toMatch(/^HTTP\/1\.1 400 /);
      const cases = [
        { body: "{}" },
        { body: `{"csrf":"${csrf}","csrf":"${csrf}","idToken":"synthetic"}` },
        { body: credentialBody(csrf, "") },
        { body: JSON.stringify({ csrf, idToken: "synthetic", extra: true }) },
        { body: Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d]) },
        { body: Buffer.from([0xff]) },
      ];
      for (const options of cases) {
        expect(
          (await request(fixture, { method: "POST", path: "/credential", ...options })).status,
        ).toBe(400);
      }
      expect(
        (
          await request(fixture, {
            method: "POST",
            path: "/credential",
            body: credentialBody(csrf),
            headers: { "Content-Type": "application/json; charset=utf-8" },
          })
        ).status,
      ).toBe(415);
      expect(
        await rawRequest(
          fixture,
          `${prefix}Content-Type: application/json\r\nContent-Length: 257\r\n\r\n`,
        ),
      ).toMatch(/^HTTP\/1\.1 413 /);
      expect(
        await rawRequest(
          fixture,
          `${prefix}Content-Type: application/json\r\nContent-Length: 02\r\n\r\n{}`,
        ),
      ).toMatch(/^HTTP\/1\.1 400 /);
      expect(
        await rawRequest(
          fixture,
          `GET / HTTP/1.1\r\nHost: localhost:${fixture.port}\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{}`,
        ),
      ).toMatch(/^HTTP\/1\.1 400 /);
      expect(fixture.calls.submit).toHaveLength(0);
      expect(
        (
          await request(fixture, {
            method: "POST",
            path: "/credential",
            body: credentialBody(csrf, "x".repeat(189)),
          })
        ).status,
      ).toBe(200);
      await fixture.helper.completion;
    } finally {
      await finish(fixture);
    }
  });

  it("enforces maximum header count and bytes", async () => {
    const fixture = await helperFixture();
    try {
      const head = `GET / HTTP/1.1\r\nHost: localhost:${fixture.port}\r\nConnection: close\r\n`;
      const many = Array.from({ length: 31 }, (_, index) => `X-Fixture-${index}: x\r\n`).join("");
      expect(await rawRequest(fixture, `${head}${many}\r\n`)).toMatch(/^HTTP\/1\.1 431 /);
      expect(await rawRequest(fixture, `${head}X-Fixture: ${"x".repeat(8192)}\r\n\r\n`)).toMatch(
        /^HTTP\/1\.1 431 /,
      );
      expect(fixture.calls.submit).toHaveLength(0);
    } finally {
      await finish(fixture);
    }
  });

  it("admits one credential synchronously and permits cancellation during submission", async () => {
    const entered = deferred();
    const cancelled = deferred();
    const fixture = await helperFixture({
      submit: async (signal) => {
        entered.resolve();
        if (!signal.aborted) await once(signal, "abort");
        throw new Error("synthetic interrupted exchange");
      },
      cancel: async () => cancelled.resolve(),
    });
    try {
      const { csrf } = await pageCsrf(fixture);
      const first = request(fixture, {
        method: "POST",
        path: "/credential",
        body: credentialBody(csrf),
      }).catch(() => undefined);
      await entered.promise;
      expect(
        (
          await request(fixture, {
            method: "POST",
            path: "/credential",
            body: credentialBody(csrf),
          })
        ).status,
      ).toBe(409);
      expect(
        (
          await request(fixture, {
            method: "POST",
            path: "/cancel",
            body: JSON.stringify({ csrf }),
          })
        ).status,
      ).toBe(200);
      await cancelled.promise;
      await expect(fixture.helper.completion).rejects.toThrow();
      await first;
      expect(fixture.calls.submit).toHaveLength(1);
      expect(fixture.calls.cancel).toBe(1);
      expect(fixture.calls.close).toBe(1);
      await assertPortReleased(fixture.port);
    } finally {
      await finish(fixture);
    }
  });

  it("keeps uncertain exchange intact on submit failure and hides private error", async () => {
    const fixture = await helperFixture({
      submit: async () => {
        throw new Error("synthetic-private-backend-detail");
      },
    });
    try {
      const { csrf } = await pageCsrf(fixture);
      const response = await request(fixture, {
        method: "POST",
        path: "/credential",
        body: credentialBody(csrf),
      });
      expect(response.status).toBe(400);
      expect(response.body).not.toContain("synthetic-private-backend-detail");
      await expect(fixture.helper.completion).rejects.toThrow();
      expect(fixture.calls.cancel).toBe(0);
      expect(fixture.calls.close).toBe(1);
      await assertPortReleased(fixture.port);
    } finally {
      await finish(fixture);
    }
  });

  it("releases partial listeners without starting challenge when IPv6 port is occupied", async () => {
    const port = await availablePort();
    const blocker = await bind("::1", port);
    const fixture = transactionFixture();
    try {
      await expect(
        startBrowserLoginHelper({
          transaction: fixture.transaction,
          settings: {
            version: 1,
            googleWebClientId: "synthetic.apps.googleusercontent.com",
            browserOrigin: `http://localhost:${port}`,
          },
          maxRequestBytes: 65536,
          signal: new globalThis.AbortController().signal,
        }),
      ).rejects.toThrow();
      expect(fixture.calls.start).toBe(0);
      expect(fixture.calls.close).toBe(1);
      const released = await bind("127.0.0.1", port);
      await closeServer(released);
    } finally {
      await closeServer(blocker);
    }
  });

  it("settles completion only after transaction cleanup and closes idempotently", async () => {
    const closing = deferred();
    const entered = deferred();
    const fixture = await helperFixture({
      close: async () => {
        entered.resolve();
        await closing.promise;
      },
    });
    let settled = false;
    fixture.helper.completion.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    const close = fixture.helper.close();
    await entered.promise;
    expect(settled).toBe(false);
    closing.resolve();
    await close;
    await fixture.helper.close();
    await expect(fixture.helper.completion).rejects.toThrow();
    expect(fixture.calls.cancel).toBe(1);
    expect(fixture.calls.close).toBe(1);
    await assertPortReleased(fixture.port);
  });

  it("expires at the original deadline and closes after external abort", async () => {
    const expiring = await helperFixture({ ttl: 180 });
    await expect(expiring.helper.completion).rejects.toThrow();
    expect(expiring.calls.submit).toHaveLength(0);
    expect(expiring.calls.cancel).toBe(1);
    expect(expiring.calls.close).toBe(1);
    await assertPortReleased(expiring.port);
    const controller = new globalThis.AbortController();
    const fixture = await helperFixture({ signal: controller.signal });
    controller.abort();
    await expect(fixture.helper.completion).rejects.toThrow();
    expect(fixture.calls.cancel).toBe(1);
    expect(fixture.calls.close).toBe(1);
    await assertPortReleased(fixture.port);
  });

  it("bounds live connections and cleans stalled requests on cancellation", async () => {
    const fixture = await helperFixture();
    const sockets = [];
    try {
      for (let index = 0; index < 16; index += 1) {
        const socket = net.createConnection({ host: "127.0.0.1", port: fixture.port });
        sockets.push(socket);
        await once(socket, "connect");
        socket.on("error", () => {});
        socket.write(`GET / HTTP/1.1\r\nHost: localhost:${fixture.port}\r\n`);
      }
      const extra = net.createConnection({ host: "::1", port: fixture.port });
      sockets.push(extra);
      extra.on("error", () => {});
      await once(extra, "close");
      await fixture.helper.cancel();
      await expect(fixture.helper.completion).rejects.toThrow();
      await delay(20);
      expect(sockets.every((socket) => socket.destroyed)).toBe(true);
      await assertPortReleased(fixture.port);
    } finally {
      for (const socket of sockets) socket.destroy();
      await finish(fixture);
    }
  });

  it("header and body trickles share one whole-request deadline", async () => {
    const fixture = await helperFixture();
    const socket = net.createConnection({ host: "127.0.0.1", port: fixture.port });
    socket.on("error", () => {});
    try {
      await once(socket, "connect");
      const chunks = [];
      socket.on("data", (chunk) => chunks.push(chunk));
      const closed = once(socket, "close");
      const startedAt = Date.now();
      socket.write(`POST /credential HTTP/1.1\r\nHost: localhost:${fixture.port}\r\n`);
      await delay(2000);
      socket.write(
        `Origin: ${fixture.settings.browserOrigin}\r\nContent-Type: application/json\r\nContent-Length: 100\r\n\r\n{`,
      );
      await delay(2000);
      socket.write(" ");
      await closed;
      // A fresh deadline after headers would allow this request until ~7s.
      expect(Date.now() - startedAt).toBeLessThan(6500);
      expect(Buffer.concat(chunks).toString("utf8")).toMatch(/^HTTP\/1\.1 408 /);
      expect(fixture.calls.submit).toHaveLength(0);
    } finally {
      socket.destroy();
      await finish(fixture);
    }
  });
});
