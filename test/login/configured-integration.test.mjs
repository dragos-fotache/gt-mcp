// Real S1 configured persistence and metadata integration; all data synthetic.
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { recoverLoginProfile, setupLoginProfile } from "../../dist/login/index.js";
import { openReadRuntime } from "../../dist/runtime/index.js";
import { ACCOUNT, fixture, signIn, signal, bytes, parse } from "./configured-helpers.mjs";

describe("T07-S1 real protected configured composition", () => {
  it("sets up, signs in, reopens T08 reads and replaces same-account retaining exact pending refresh evidence", async () => {
    const f = await fixture();
    try {
      const initial = await setupLoginProfile({ configPath: f.configPath });
      expect(initial.accountUuid).toBeNull();
      const first = await signIn(f);
      expect(first).toMatchObject({ accountUuid: ACCOUNT, sessionGeneration: 1 });
      const runtime = await openReadRuntime({ configPath: f.configPath });
      try {
        expect(await runtime.listRoutines({}, signal())).toMatchObject({
          ok: true,
          data: { items: [], nextPageToken: null },
        });
      } finally {
        await runtime.close();
      }
      const owner = await f.open(first);
      let prior;
      try {
        prior = parse(await owner.readVaultBytes());
        prior.pendingRefresh = {
          predecessor: { ...prior.grant },
          refreshToken: prior.grant.refreshToken,
          bodyBase64: bytes({ refreshToken: prior.grant.refreshToken }).toString("base64"),
          authKey: randomUUID(),
        };
        await owner.commit({ vaultBytes: bytes(prior) });
      } finally {
        await owner.close();
      }
      const next = await signIn(f);
      expect(next.sessionGeneration).toBe(2);
      const reopened = await f.open(next);
      try {
        const actual = parse(await reopened.readVaultBytes());
        expect(actual).toMatchObject({
          version: 3,
          pendingRefresh: null,
          superseded: [
            { binding: first, grant: prior.grant, pendingRefresh: prior.pendingRefresh },
          ],
        });
      } finally {
        await reopened.close();
      }
      expect(fs.readdirSync(f.storage.profileRoot).sort()).toEqual([
        "credentials.enc",
        "owner.lock",
      ]);
      expect(await recoverLoginProfile({ configPath: f.configPath })).toEqual(next);
      expect(f.requests.filter((r) => r.route === "/v1/auth/refresh")).toHaveLength(0);
    } finally {
      await f.close();
    }
  });

  it("persists uncertain exchange across actual owner restart and replays identical body/key", async () => {
    const f = await fixture();
    try {
      const source = await setupLoginProfile({ configPath: f.configPath });
      f.setExchange((req) => req.socket.destroy());
      let login = await f.login();
      const c = await login.start(signal());
      await expect(
        login.submit(c.attemptId, "synthetic-t07-google", signal()),
      ).rejects.toMatchObject({ code: "retry_later" });
      await login.close();
      const owner = await f.open(source);
      let saved;
      try {
        saved = parse(await owner.readVaultBytes());
        expect(saved).toMatchObject({ version: 4, exchange: { sendsReserved: 1 } });
      } finally {
        await owner.close();
      }
      await expect(openReadRuntime({ configPath: f.configPath })).rejects.toMatchObject({
        code: "recovery_unavailable",
      });
      f.setExchange(null);
      login = await f.login();
      try {
        expect(await login.resume(signal())).toMatchObject({
          accountUuid: ACCOUNT,
          sessionGeneration: 1,
        });
      } finally {
        await login.close();
      }
      const sent = f.requests.filter((r) => r.route === "/v1/auth/google");
      expect(sent).toHaveLength(2);
      expect(sent[1].body).toEqual(sent[0].body);
      expect(sent[1].key).toBe(sent[0].key);
      expect(sent[0].key).toBe(saved.exchange.authKey);
    } finally {
      await f.close();
    }
  });
});
