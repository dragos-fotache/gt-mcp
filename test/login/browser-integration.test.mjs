// Actual S2 -> S1 -> isolated private-CA HTTPS/Secret Service/ext4, synthetic only.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { startBrowserLoginHelper, setupLoginProfile } from "../../dist/login/index.js";
import { openReadRuntime } from "../../dist/runtime/index.js";
import { fixture, signal, parse, ACCOUNT } from "./configured-helpers.mjs";
import { availablePort, pageCsrf as page, request } from "./browser-helpers.mjs";

async function browser(f) {
  const port = await availablePort();
  const settings = {
    version: 1,
    googleWebClientId: "synthetic-t07-client.example.invalid",
    browserOrigin: `http://localhost:${port}`,
  };
  fs.writeFileSync(f.loginConfigPath, JSON.stringify(settings), { mode: 0o600 });
  const transaction = await f.login();
  const helper = await startBrowserLoginHelper({
    transaction,
    settings,
    maxRequestBytes: 262144,
    signal: signal(),
  });
  return { helper, port, settings };
}

describe("T07-S2 actual protected login composition", () => {
  it("accepts explicit local callback, installs privately and reopens T08 reads", async () => {
    const f = await fixture();
    let h;
    try {
      await setupLoginProfile({ configPath: f.configPath });
      h = await browser(f);
      const p = await page(h);
      const response = await request(h, {
        method: "POST",
        path: "/credential",
        body: JSON.stringify({ csrf: p.csrf, idToken: "synthetic-browser-google" }),
      });
      expect(response.status).toBe(200);
      expect(response.body).toBe("Login complete.\n");
      expect(await h.helper.completion).toMatchObject({
        accountUuid: ACCOUNT,
        sessionGeneration: 1,
      });
      const runtime = await openReadRuntime({ configPath: f.configPath });
      try {
        expect(await runtime.listRoutines({}, signal())).toMatchObject({ ok: true });
      } finally {
        await runtime.close();
      }
      expect(response.body).not.toContain(f.grant.accessToken);
      expect(response.body).not.toContain(f.grant.refreshToken);
    } finally {
      if (h) await h.helper.close();
      await f.close();
    }
  });

  it.each(["nonce", "audience"])(
    "propagates controlled backend %s rejection without account authority or credential output",
    async (reason) => {
      const f = await fixture();
      let h;
      try {
        const source = await setupLoginProfile({ configPath: f.configPath });
        f.setExchange((req, res, request) => {
          expect(parse(request.body).idToken).toBe(`synthetic-wrong-${reason}`);
          res.writeHead(401, { "content-type": "application/json" });
          res.end('{"errorCode":"invalid_google_credential"}');
        });
        h = await browser(f);
        const p = await page(h);
        const response = await request(h, {
          method: "POST",
          path: "/credential",
          body: JSON.stringify({ csrf: p.csrf, idToken: `synthetic-wrong-${reason}` }),
        });
        expect(response.status).toBe(400);
        expect(response.body).toBe("Login failed. Use the trusted local command.\n");
        await expect(h.helper.completion).rejects.toMatchObject({ code: "sign_in_failed" });
        const owner = await f.open(source);
        try {
          expect((await owner.readVaultBytes()).byteLength).toBe(0);
        } finally {
          await owner.close();
        }
        expect(response.body).not.toContain("invalid_google_credential");
      } finally {
        if (h) await h.helper.close();
        await f.close();
      }
    },
  );

  it("closes uncertain exchange without cancellation, preserving exact explicit resume", async () => {
    const f = await fixture();
    let h;
    try {
      const source = await setupLoginProfile({ configPath: f.configPath });
      f.setExchange((req) => req.socket.destroy());
      h = await browser(f);
      const p = await page(h);
      const response = await request(h, {
        method: "POST",
        path: "/credential",
        body: JSON.stringify({ csrf: p.csrf, idToken: "synthetic-browser-uncertain" }),
      });
      expect(response.status).toBe(400);
      await expect(h.helper.completion).rejects.toMatchObject({ code: "retry_later" });
      const owner = await f.open(source);
      let pending;
      try {
        pending = parse(await owner.readVaultBytes());
        expect(pending).toMatchObject({ version: 4, exchange: { sendsReserved: 1 } });
      } finally {
        await owner.close();
      }
      f.setExchange(null);
      const resume = await f.login();
      try {
        await expect(resume.resume(signal())).resolves.toMatchObject({ accountUuid: ACCOUNT });
      } finally {
        await resume.close();
      }
      const calls = f.requests.filter((r) => r.route === "/v1/auth/google");
      expect(calls).toHaveLength(2);
      expect(calls[1].body).toEqual(calls[0].body);
      expect(calls[1].key).toBe(pending.exchange.authKey);
    } finally {
      if (h) await h.helper.close();
      await f.close();
    }
  });
});
