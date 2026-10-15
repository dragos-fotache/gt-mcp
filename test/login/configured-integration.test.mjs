// Real S1 configured persistence and metadata integration; all data synthetic.
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { recoverLoginProfile, setupLoginProfile } from "../../dist/login/index.js";
import { openLoginMetadata } from "../../dist/login/metadata.js";
import { provisionProfile } from "../../dist/storage/index.js";
import { openReadRuntime } from "../../dist/runtime/index.js";
import { ACCOUNT, fixture, signIn, signal, bytes, parse } from "./configured-helpers.mjs";

describe("T07-S1 real protected configured composition", () => {
  it("sets up, signs in, reopens T08 reads and replaces same-account retaining exact pending evidence/operations", async () => {
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
      const operations = Buffer.from("synthetic opaque retained operations");
      try {
        prior = parse(await owner.readVaultBytes());
        prior.pendingRefresh = {
          predecessor: { ...prior.grant },
          refreshToken: prior.grant.refreshToken,
          bodyBase64: bytes({ refreshToken: prior.grant.refreshToken }).toString("base64"),
          authKey: randomUUID(),
        };
        await owner.commit({ vaultBytes: bytes(prior), operationBytes: operations });
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
        expect(Buffer.from(await reopened.readOperationStoreBytes())).toEqual(operations);
      } finally {
        await reopened.close();
      }
      expect(fs.existsSync(`${f.descriptorPath}.pending`)).toBe(false);
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

  it("recovers a verified target after install committed before descriptor publication", async () => {
    const f = await fixture();
    try {
      const source = await setupLoginProfile({ configPath: f.configPath });
      const target = { ...source, accountUuid: ACCOUNT, sessionGeneration: 1 };
      const metadata = await openLoginMetadata(f.configPath);
      const receipt = {
        version: 1,
        kind: "install",
        transitionId: randomUUID(),
        from: source,
        to: target,
      };
      const owner = await f.open(source);
      try {
        await metadata.prepareReceipt(receipt);
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
      await expect(f.login()).rejects.toMatchObject({ code: "recovery_required" });
      expect(await recoverLoginProfile({ configPath: f.configPath })).toEqual(target);
      expect(parse(fs.readFileSync(f.descriptorPath)).binding).toEqual(target);
      expect(fs.existsSync(`${f.descriptorPath}.pending`)).toBe(false);
      expect(f.requests).toHaveLength(0);
      const runtime = await openReadRuntime({ configPath: f.configPath });
      await runtime.close();
    } finally {
      await f.close();
    }
  });

  it("recovers source with pending v4 without a send, then explicit cancel restores empty prior", async () => {
    const f = await fixture();
    try {
      const source = await setupLoginProfile({ configPath: f.configPath });
      f.setExchange((req) => req.socket.destroy());
      const login = await f.login();
      const c = await login.start(signal());
      await expect(
        login.submit(c.attemptId, "synthetic-t07-google", signal()),
      ).rejects.toMatchObject({ code: "retry_later" });
      await login.close();
      const meta = await openLoginMetadata(f.configPath);
      await meta.prepareReceipt({
        version: 1,
        kind: "install",
        transitionId: randomUUID(),
        from: source,
        to: { ...source, accountUuid: ACCOUNT, sessionGeneration: 1 },
      });
      const count = f.requests.length;
      expect(await recoverLoginProfile({ configPath: f.configPath })).toEqual(source);
      const cancel = await f.login();
      try {
        await cancel.cancel();
      } finally {
        await cancel.close();
      }
      const owner = await f.open(source);
      try {
        expect((await owner.readVaultBytes()).byteLength).toBe(0);
      } finally {
        await owner.close();
      }
      expect(f.requests).toHaveLength(count);
    } finally {
      await f.close();
    }
  });

  it("recovers an authenticated provision target but never provisions from a receipt alone", async () => {
    const f = await fixture();
    try {
      const target = {
        origin: f.origin,
        accountUuid: null,
        sessionGeneration: 0,
        profileGenerationId: randomUUID(),
      };
      const meta = await openLoginMetadata(f.configPath);
      await meta.prepareReceipt({
        version: 1,
        kind: "provision",
        transitionId: randomUUID(),
        from: null,
        to: target,
      });
      await expect(recoverLoginProfile({ configPath: f.configPath })).rejects.toMatchObject({
        code: "recovery_required",
      });
      expect(fs.existsSync(`${f.descriptorPath}.pending`)).toBe(true);
      const owner = await provisionProfile({
        ...f.storage,
        origin: f.origin,
        profileGenerationId: target.profileGenerationId,
      });
      await owner.close();
      expect(await recoverLoginProfile({ configPath: f.configPath })).toEqual(target);
      const login = await f.login();
      await login.close();
      await expect(setupLoginProfile({ configPath: f.configPath })).rejects.toMatchObject({
        code: "recovery_required",
      });
    } finally {
      await f.close();
    }
  });

  it("refuses competing ownership and corrupt target recovery while retaining metadata", async () => {
    const f = await fixture();
    try {
      const source = await setupLoginProfile({ configPath: f.configPath });
      const owner = await f.open(source);
      const target = { ...source, accountUuid: ACCOUNT, sessionGeneration: 1 };
      try {
        await expect(f.login()).rejects.toMatchObject({ code: "recovery_required" });
        const meta = await openLoginMetadata(f.configPath);
        await meta.prepareReceipt({
          version: 1,
          kind: "install",
          transitionId: randomUUID(),
          from: source,
          to: target,
        });
        await owner.bindAccount(
          ACCOUNT,
          bytes({ version: 3, binding: target, grant: null, pendingRefresh: null, superseded: [] }),
        );
      } finally {
        await owner.close();
      }
      await expect(recoverLoginProfile({ configPath: f.configPath })).rejects.toMatchObject({
        code: "recovery_required",
      });
      expect(fs.existsSync(`${f.descriptorPath}.pending`)).toBe(true);
      expect(parse(fs.readFileSync(f.descriptorPath)).binding).toEqual(source);
      expect(f.requests).toHaveLength(0);
    } finally {
      await f.close();
    }
  });
});
