import fs from "node:fs";
import net from "node:net";
import { describe, it, expect } from "vitest";
import { setupLoginProfile, recoverLoginProfile } from "../../../dist/login/index.js";
import { signOutProfile, removeLoginProfile } from "../../../dist/lifecycle/index.js";
import { openReadRuntime } from "../../../dist/runtime/index.js";
import { openProfile } from "../../../dist/storage/index.js";
import { fixture, signIn, signal, parse } from "../../login/configured-helpers.mjs";
import { runCli } from "../../login/cli-helpers.mjs";
const stored = (f) => fs.readFileSync(`${f.storage.profileRoot}/credentials.enc`);
async function current(f) {
  const owner = await f.open();
  try {
    return { binding: owner.binding, vault: parse(await owner.readVaultBytes()) };
  } finally {
    await owner.close();
  }
}

describe("S4 real configured single-record lifecycle", () => {
  it("refuses old config and old/unknown storage without migration, mutation or backend requests", async () => {
    const f = await fixture();
    try {
      const valid = fs.readFileSync(f.configPath),
        old = parse(valid);
      old.version = 1;
      old.bindingDescriptorPath = `${f.dir}/old-binding.json`;
      old.storage.anchorRoot = `${f.dir}/old-anchor`;
      fs.writeFileSync(f.configPath, JSON.stringify(old));
      const before = fs.readFileSync(f.configPath);
      await expect(setupLoginProfile({ configPath: f.configPath })).rejects.toMatchObject({
        code: "configuration_required",
      });
      await expect(openReadRuntime({ configPath: f.configPath })).rejects.toMatchObject({
        code: "configuration_required",
      });
      await expect(
        removeLoginProfile({ configPath: f.configPath }, signal()),
      ).rejects.toMatchObject({ code: "configuration_required" });
      expect(fs.readFileSync(f.configPath)).toEqual(before);
      expect(fs.existsSync(f.storage.profileRoot)).toBe(false);
      fs.writeFileSync(f.configPath, valid);
      fs.mkdirSync(f.storage.profileRoot, { mode: 0o700 });
      const legacy = `${f.storage.profileRoot}/vault.bin`;
      fs.writeFileSync(legacy, "synthetic-old-profile", { mode: 0o600 });
      await expect(setupLoginProfile({ configPath: f.configPath })).rejects.toMatchObject({
        code: "recovery_required",
      });
      await expect(openReadRuntime({ configPath: f.configPath })).rejects.toMatchObject({
        code: "recovery_unavailable",
      });
      expect(fs.readFileSync(legacy, "utf8")).toBe("synthetic-old-profile");
      expect(fs.readdirSync(f.storage.profileRoot)).toEqual(["vault.bin"]);
      expect(f.requests).toHaveLength(0);
    } finally {
      await f.close();
    }
  });
  it("recover validates a ready record but directs pending foreground login to explicit resume/cancel", async () => {
    const f = await fixture();
    let login;
    try {
      const source = await setupLoginProfile({ configPath: f.configPath });
      expect(await recoverLoginProfile({ configPath: f.configPath })).toEqual(source);
      f.setExchange((req) => req.socket.destroy());
      login = await f.login();
      const challenge = await login.start(signal());
      await expect(
        login.submit(challenge.attemptId, "synthetic-pending-google", signal()),
      ).rejects.toMatchObject({ code: "retry_later" });
      await login.close();
      const before = stored(f),
        count = f.requests.length;
      await expect(recoverLoginProfile({ configPath: f.configPath })).rejects.toMatchObject({
        code: "recovery_required",
      });
      expect(stored(f)).toEqual(before);
      expect(f.requests).toHaveLength(count);
      login = await f.login();
      await login.cancel();
      await login.close();
      expect(await recoverLoginProfile({ configPath: f.configPath })).toEqual(source);
      expect(fs.readdirSync(f.storage.profileRoot).sort()).toEqual([
        "credentials.enc",
        "owner.lock",
      ]);
    } finally {
      await login?.close();
      await f.close();
    }
  });
  it("an idle runtime permits lifecycle; an active owner blocks it and sign-out retains account fences", async () => {
    const f = await fixture();
    let runtime;
    try {
      await setupLoginProfile({ configPath: f.configPath });
      const first = await signIn(f);
      const before = stored(f);
      runtime = await openReadRuntime({ configPath: f.configPath });
      const active = await f.open();
      try {
        await expect(signOutProfile({ configPath: f.configPath }, signal())).rejects.toMatchObject({
          code: "locked_by_other_owner",
        });
        await expect(
          removeLoginProfile({ configPath: f.configPath }, signal()),
        ).rejects.toMatchObject({ code: "locked_by_other_owner" });
        expect(stored(f)).toEqual(before);
      } finally {
        await active.close();
      }
      const next = await signOutProfile({ configPath: f.configPath }, signal());
      expect(next).toEqual({ ...first, sessionGeneration: 2 });
      const cleared = await current(f);
      expect(cleared.vault).toMatchObject({
        binding: next,
        grant: null,
        pendingRefresh: null,
        superseded: [],
      });
      expect(await runtime.listRoutines({}, signal())).toMatchObject({
        ok: false,
        error: { code: "authentication_required" },
      });
      await runtime.close();
      runtime = null;
      const priorAccount = f.grant.account.id;
      f.grant.account.id = "72222222-2222-4222-8222-222222222222";
      await expect(signIn(f)).rejects.toMatchObject({ code: "sign_in_failed" });
      expect((await current(f)).binding).toEqual(next);
      f.grant.account.id = priorAccount;
      expect((await signIn(f)).sessionGeneration).toBe(3);
    } finally {
      await runtime?.close();
      await f.close();
    }
  });
  it("compiled explicit removal is repeatable, preserves config and cannot silently reprovision the old root", async () => {
    const f = await fixture();
    try {
      await setupLoginProfile({ configPath: f.configPath });
      await signIn(f);
      const config = fs.readFileSync(f.configPath);
      const result = await runCli(["profile-remove", "--config", f.configPath, "--confirm"]);
      expect(result.code).toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).not.toContain(f.dir);
      expect(fs.readdirSync(f.storage.profileRoot)).toEqual(["owner.lock"]);
      expect(fs.readFileSync(f.configPath)).toEqual(config);
      await removeLoginProfile({ configPath: f.configPath }, signal());
      await expect(openReadRuntime({ configPath: f.configPath })).rejects.toMatchObject({
        code: "recovery_unavailable",
      });
      await expect(setupLoginProfile({ configPath: f.configPath })).rejects.toMatchObject({
        code: "recovery_required",
      });
    } finally {
      await f.close();
    }
  });
  it("bounds a connected-but-silent key provider without changing the credential record", async () => {
    const f = await fixture(),
      sockets = new Set();
    let server;
    try {
      await setupLoginProfile({ configPath: f.configPath });
      const before = stored(f),
        socket = `${f.dir}/silent-bus`;
      server = net.createServer((s) => {
        sockets.add(s);
        s.on("close", () => sockets.delete(s));
      });
      await new Promise((r) => server.listen(socket, r));
      fs.chmodSync(socket, 0o600);
      const start = Date.now();
      await expect(
        openProfile({
          ...f.storage,
          origin: f.origin,
          secretServiceBusAddress: `unix:path=${socket}`,
          timeoutMs: 1500,
        }),
      ).rejects.toMatchObject({ code: "provider_failure" });
      expect(Date.now() - start).toBeLessThan(5000);
      expect(stored(f)).toEqual(before);
    } finally {
      for (const s of sockets) s.destroy();
      if (server) await new Promise((r) => server.close(r));
      await f.close();
    }
  });
});
