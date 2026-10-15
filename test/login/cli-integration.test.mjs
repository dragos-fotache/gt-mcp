// Actual compiled CLI process -> real owned loopback callback -> isolated
// Secret Service/ext4/private-CA HTTPS. All accounts/credentials are synthetic.
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { openLoginMetadata } from "../../dist/login/metadata.js";
import { fixture, ACCOUNT, bytes, parse } from "./configured-helpers.mjs";
import { request, pageCsrf, assertPortReleased, deferred } from "./browser-helpers.mjs";
import { ajvValidator } from "../read-protocol/helpers.mjs";
import { SERVER } from "../stdio-server/helpers.mjs";
import { startCli, runCli, command, browserSettings, expectSafe } from "./cli-helpers.mjs";

async function setup(f) {
  const result = await runCli(["setup", "--config", f.configPath]);
  expectSafe(result, f);
  expect(result.code).toBe(0);
  expect(result.stderr).toMatch(/recovery evidence/i);
  expect(result.stderr).toMatch(/host\/model/);
  expect(result.stderr).toMatch(/transcripts/);
  return parse(fs.readFileSync(f.descriptorPath)).binding;
}

async function login(f, { launcherMode = "complete", credential = "synthetic-cli-google" } = {}) {
  const browser = await browserSettings(f);
  const running = startCli(command(f), { launcherMode });
  try {
    expect(await running.ready).toBe(`${browser.settings.browserOrigin}/`);
    const { csrf } = await pageCsrf(browser);
    const response = await request(browser, {
      method: "POST",
      path: "/credential",
      body: JSON.stringify({ csrf, idToken: credential }),
    });
    const result = await running.exited;
    expectSafe(result, f);
    await assertPortReleased(browser.port);
    return { result, response };
  } finally {
    await running.close();
  }
}

async function sdkRead(f) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER, "--config", f.configPath],
    env: process.env,
    stderr: "pipe",
  });
  let stderr = "";
  transport.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  const client = new Client(
    { name: "synthetic-t07-cli", version: "0" },
    { jsonSchemaValidator: ajvValidator() },
  );
  try {
    await client.connect(transport);
    const result = await client.callTool({ name: "list_routines", arguments: {} });
    expect(result.structuredContent).toMatchObject({
      ok: true,
      data: { items: [], nextPageToken: null },
    });
    expect(stderr).toBe("");
  } finally {
    await client.close();
  }
}

describe("T07-S3 delivered CLI isolated workflow", () => {
  it("fresh setup/login reaches SDK stdio reads; same-account re-login advances one generation", async () => {
    const f = await fixture();
    try {
      const source = await setup(f);
      expect(source.accountUuid).toBeNull();
      const first = await login(f);
      expect(first.result.code).toBe(0);
      expect(first.response.status).toBe(200);
      expect(parse(fs.readFileSync(f.descriptorPath)).binding).toMatchObject({
        accountUuid: ACCOUNT,
        sessionGeneration: 1,
      });
      await sdkRead(f);
      const second = await login(f);
      expect(second.result.code).toBe(0);
      expect(parse(fs.readFileSync(f.descriptorPath)).binding).toMatchObject({
        accountUuid: ACCOUNT,
        sessionGeneration: 2,
      });
      expect(f.requests.filter((r) => r.route === "/v1/auth/google/challenge")).toHaveLength(2);
      expect(f.requests.filter((r) => r.route === "/v1/auth/google")).toHaveLength(2);
    } finally {
      await f.close();
    }
  });

  it("completion aborts and settles a still-pending owned launcher before process exit", async () => {
    const f = await fixture();
    try {
      await setup(f);
      const { result, response } = await login(f, { launcherMode: "hold" });
      expect(result.code).toBe(0);
      expect(response.status).toBe(200);
      const owner = await f.open(parse(fs.readFileSync(f.descriptorPath)).binding);
      await owner.close();
    } finally {
      await f.close();
    }
  });

  it("uncertain exchange survives process exit; resume sends exact body/key without another challenge or browser", async () => {
    const f = await fixture();
    try {
      await setup(f);
      f.setExchange((req) => req.socket.destroy());
      expect((await login(f)).result.code).toBe(4);
      const sent = f.requests.filter((r) => r.route === "/v1/auth/google");
      expect(sent).toHaveLength(1);
      f.setExchange(null);
      const result = await runCli(command(f, "--resume"));
      expectSafe(result, f);
      expect(result.code).toBe(0);
      const replayed = f.requests.filter((r) => r.route === "/v1/auth/google");
      expect(replayed).toHaveLength(2);
      expect(replayed[1].body).toEqual(sent[0].body);
      expect(replayed[1].key).toBe(sent[0].key);
      expect(f.requests.filter((r) => r.route === "/v1/auth/google/challenge")).toHaveLength(1);
      expect((await runCli(command(f, "--resume"))).code).toBe(4);
    } finally {
      await f.close();
    }
  });

  it("explicit cancel clears uncertain exchange without network and preserves the source binding", async () => {
    const f = await fixture();
    try {
      const source = await setup(f);
      f.setExchange((req) => req.socket.destroy());
      expect((await login(f)).result.code).toBe(4);
      const before = f.requests.length;
      const result = await runCli(command(f, "--cancel"));
      expectSafe(result, f);
      expect(result.code).toBe(0);
      expect(f.requests).toHaveLength(before);
      const owner = await f.open(source);
      try {
        expect((await owner.readVaultBytes()).byteLength).toBe(0);
      } finally {
        await owner.close();
      }
      expect(parse(fs.readFileSync(f.descriptorPath)).binding).toEqual(source);
    } finally {
      await f.close();
    }
  });

  it("recover publishes a verified already-committed target without backend activity", async () => {
    const f = await fixture();
    try {
      const source = await setup(f);
      const target = { ...source, accountUuid: ACCOUNT, sessionGeneration: 1 };
      const metadata = await openLoginMetadata(f.configPath);
      const owner = await f.open(source);
      try {
        await metadata.prepareReceipt({
          version: 1,
          kind: "install",
          transitionId: randomUUID(),
          from: source,
          to: target,
        });
        const { account, ...tokens } = f.grant;
        await owner.bindAccount(
          ACCOUNT,
          bytes({
            version: 3,
            binding: target,
            grant: { accountUuid: account.id, ...tokens },
            pendingRefresh: null,
            superseded: [],
          }),
        );
      } finally {
        await owner.close();
      }
      const result = await runCli(["recover", "--config", f.configPath]);
      expectSafe(result, f);
      expect(result.code).toBe(0);
      expect(parse(fs.readFileSync(f.descriptorPath)).binding).toEqual(target);
      expect(fs.existsSync(`${f.descriptorPath}.pending`)).toBe(false);
      expect(f.requests).toHaveLength(0);
    } finally {
      await f.close();
    }
  });

  it("competing owner refuses before challenge/browser and leaves the owner valid", async () => {
    const f = await fixture();
    try {
      const source = await setup(f);
      await browserSettings(f);
      const owner = await f.open(source);
      try {
        const result = await runCli(command(f));
        expectSafe(result, f);
        expect(result.code).toBe(3);
        expect(f.requests).toHaveLength(0);
        expect((await owner.readVaultBytes()).byteLength).toBe(0);
      } finally {
        await owner.close();
      }
    } finally {
      await f.close();
    }
  });

  it.each(["SIGINT", "SIGTERM"])(
    "%s while waiting for callback cancels, reaps and releases both listeners/owner",
    async (signal) => {
      const f = await fixture();
      let running;
      try {
        const source = await setup(f);
        const browser = await browserSettings(f);
        running = startCli(command(f), { launcherMode: "hold" });
        await running.ready;
        running.child.kill(signal);
        const result = await running.exited;
        expectSafe(result, f);
        expect(result.code).toBe(130);
        expect(result.stderr).not.toMatch(/Login complete/);
        await assertPortReleased(browser.port);
        const owner = await f.open(source);
        try {
          expect((await owner.readVaultBytes()).byteLength).toBe(0);
        } finally {
          await owner.close();
        }
        expect(f.requests.filter((r) => r.route === "/v1/auth/google")).toHaveLength(0);
      } finally {
        if (running) await running.close();
        await f.close();
      }
    },
  );

  it("signal during an already-dispatched exchange settles cancellation before releasing the profile", async () => {
    const f = await fixture();
    let running;
    try {
      const source = await setup(f);
      const browser = await browserSettings(f);
      const dispatched = deferred();
      f.setExchange(() => dispatched.resolve());
      running = startCli(command(f), { launcherMode: "complete" });
      await running.ready;
      const { csrf } = await pageCsrf(browser);
      // Listener cleanup may close the callback connection; consume either fixed
      // response or disconnect while independently asserting durable settlement.
      const callback = request(browser, {
        method: "POST",
        path: "/credential",
        body: JSON.stringify({ csrf, idToken: "synthetic-cli-held-google" }),
      }).then(
        () => undefined,
        () => undefined,
      );
      await dispatched.promise;
      running.child.kill("SIGTERM");
      const result = await running.exited;
      await callback;
      expectSafe(result, f);
      expect(result.code).toBe(130);
      expect(result.stderr).not.toMatch(/Login complete/);
      await assertPortReleased(browser.port);
      const owner = await f.open(source);
      try {
        expect((await owner.readVaultBytes()).byteLength).toBe(0);
      } finally {
        await owner.close();
      }
      expect(parse(fs.readFileSync(f.descriptorPath)).binding).toEqual(source);
    } finally {
      if (running) await running.close();
      await f.close();
    }
  });

  it.each(["default-headless", "fail"])(
    "%s launcher failure cancels attempt and releases every acquired resource",
    async (mode) => {
      const f = await fixture();
      let running;
      try {
        const source = await setup(f);
        const browser = await browserSettings(f);
        running = startCli(command(f), mode === "fail" ? { launcherMode: mode } : {});
        const result = await running.exited;
        expectSafe(result, f);
        expect(result.code).toBe(4);
        await assertPortReleased(browser.port);
        const owner = await f.open(source);
        try {
          expect((await owner.readVaultBytes()).byteLength).toBe(0);
        } finally {
          await owner.close();
        }
        expect(f.requests.filter((r) => r.route === "/v1/auth/google")).toHaveLength(0);
      } finally {
        if (running) await running.close();
        await f.close();
      }
    },
  );
});
