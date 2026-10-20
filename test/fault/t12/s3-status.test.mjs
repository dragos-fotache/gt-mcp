/* global AbortController */
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";
import { signOutProfile, removeLoginProfile } from "../../../dist/lifecycle/index.js";
import { removeOwnedProfile } from "../../../dist/lifecycle/owned-removal.js";
import { openAccountStatusTransaction } from "../../../dist/lifecycle/account-status.js";
import { recoverLoginProfile, setupLoginProfile } from "../../../dist/login/index.js";
import { signIn, SETTINGS } from "../../login/configured-helpers.mjs";
import {
  deferred,
  availablePort,
  assertPortReleased,
  bind,
  closeServer,
} from "../../login/browser-helpers.mjs";
import { ownerAt, key } from "./s2-helpers.mjs";
import {
  statusFixture,
  browser,
  submit,
  state,
  currentBinding,
  signal,
  parse,
  json,
  deleted,
  pageCsrf,
  request,
  TOKEN,
} from "./s3-helpers.mjs";

const statusCalls = (f) => f.requests.filter((r) => r.route === "/v1/account/status");

describe("T12-S3 actual foreground account proof", () => {
  it("active proof sends accountStatus purpose/nonce/body without bearer/key and preserves exact private bytes", async () => {
    const f = await statusFixture();
    let h;
    try {
      const before = await state(f),
        count = f.requests.length;
      h = await browser(f);
      const page = await pageCsrf(h);
      expect(page.response.body).toContain("Verify cached account status");
      expect(page.response.body).toContain("matching local credentials");
      expect(page.response.body).toContain(f.challenges[0].nonce);
      expect(page.response.body).not.toContain(f.binding.accountUuid);
      expect((await request(h, { host: "::1" })).status).toBe(200);
      const result = await request(h, {
        method: "POST",
        path: "/credential",
        body: JSON.stringify({ csrf: page.csrf, idToken: TOKEN }),
      });
      expect(result.status).toBe(200);
      expect(await h.helper.completion).toEqual({ state: "active" });
      expect(await state(f)).toEqual(before);
      expect(f.requests.slice(count).map((r) => r.route)).toEqual([
        "/v1/auth/google/challenge",
        "/v1/account/status",
      ]);
      expect(parse(f.requests[count].body)).toEqual({ purpose: "accountStatus" });
      expect(parse(statusCalls(f)[0].body)).toEqual({
        accountId: f.binding.accountUuid,
        challengeId: f.challenges[0].challengeId,
        idToken: TOKEN,
      });
      expect(f.headers[0].authorization).toBeUndefined();
      expect(f.headers[0]["idempotency-key"]).toBeUndefined();
      expect(fs.readdirSync(f.dir)).not.toContain("binding.json.pending");
      expect(result.body).not.toContain(TOKEN);
      await assertPortReleased(h.port);
    } finally {
      await h?.helper.close();
      await f.close();
    }
  });

  it("signed-out A deletion clears only its actual profile/key and leaves separate B intact", async () => {
    const f = await statusFixture(),
      separate = await statusFixture();
    let h;
    try {
      f.binding = await signOutProfile({ configPath: f.configPath }, signal());
      const before = await state(separate),
        count = f.requests.length;
      f.setStatus((req, res) => {
        expect(req.headers.authorization).toBeUndefined();
        json(res, deleted(f.binding.accountUuid));
      });
      h = await browser(f);
      expect((await submit(h)).response.status).toBe(200);
      expect(await h.helper.completion).toEqual({ state: "deleted" });
      expect(fs.readdirSync(f.storage.profileRoot)).toEqual(["owner.lock"]);
      await expect(f.open()).rejects.toMatchObject({ code: "store_missing" });
      await expect(key(f).loadMaster(Date.now() + 5000)).rejects.toMatchObject({
        code: "key_not_found",
      });
      expect(await state(separate)).toEqual(before);
      expect(f.requests.slice(count).map((r) => r.route)).toEqual([
        "/v1/auth/google/challenge",
        "/v1/account/status",
      ]);
      expect(fs.readdirSync(f.dir)).not.toContain("binding.json.pending");
    } finally {
      await h?.helper.close();
      await f.close();
      await separate.close();
    }
  });

  it.each([
    "wrong-account",
    "invalid-calendar",
    "wrong-purge-deadline",
    "extra-field",
    "duplicate-json",
    "wrong-purpose-401",
    "unknown-account-404",
  ])("%s never authorizes erasure", async (kind) => {
    const f = await statusFixture();
    let h;
    try {
      const before = await state(f);
      f.setStatus((_req, res) => {
        const receipt = deleted(f.binding.accountUuid);
        if (kind === "wrong-account") json(res, { ...receipt, accountId: randomUUID() });
        else if (kind === "invalid-calendar")
          json(res, { ...receipt, deletedAt: "2026-02-30T12:00:00Z" });
        else if (kind === "wrong-purge-deadline")
          json(res, { ...receipt, purgeBy: "2026-09-29T12:00:00Z" });
        else if (kind === "extra-field") json(res, { ...receipt, confirm: true });
        else if (kind === "duplicate-json") {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(
            JSON.stringify(receipt).replace(
              '"state":"deleted"',
              '"state":"active","state":"deleted"',
            ),
          );
        } else
          json(
            res,
            { errorCode: kind === "wrong-purpose-401" ? "invalid_google_credential" : "not_found" },
            kind === "wrong-purpose-401" ? 401 : 404,
          );
      });
      h = await browser(f);
      expect((await submit(h)).response.status).toBe(400);
      await expect(h.helper.completion).rejects.toMatchObject({ code: "account_status_failed" });
      expect(await state(f)).toEqual(before);
      expect(fs.readdirSync(f.storage.profileRoot).sort()).toEqual([
        "credentials.enc",
        "owner.lock",
      ]);
      expect(fs.readdirSync(f.dir)).not.toContain("binding.json.pending");
      expect(statusCalls(f)).toHaveLength(1);
    } finally {
      await h?.helper.close();
      await f.close();
    }
  });

  it.each(["lost-response", "timeout"])(
    "%s is one send with no proof journal/resume; a new helper gets a fresh challenge",
    async (kind) => {
      const f = await statusFixture();
      let h, next;
      try {
        const before = await state(f);
        const config = parse(fs.readFileSync(f.configPath));
        config.transportBudgets.maxAttempts = 3;
        fs.writeFileSync(f.configPath, JSON.stringify(config));
        f.setStatus((req) => {
          if (kind === "lost-response") req.socket.destroy();
        });
        h = await browser(f);
        expect((await submit(h)).response.status).toBe(400);
        await expect(h.helper.completion).rejects.toMatchObject({ code: "account_status_failed" });
        expect(statusCalls(f)).toHaveLength(1);
        expect(await state(f)).toEqual(before);
        expect(fs.readdirSync(f.dir)).not.toContain("binding.json.pending");
        f.setStatus((_req, res) =>
          json(res, { accountId: f.binding.accountUuid, state: "active" }),
        );
        next = await browser(f);
        expect((await submit(next)).response.status).toBe(200);
        expect(await next.helper.completion).toEqual({ state: "active" });
        expect(f.challenges).toHaveLength(2);
        expect(f.challenges[0].challengeId).not.toBe(f.challenges[1].challengeId);
        expect(f.challenges[0].nonce).not.toBe(f.challenges[1].nonce);
        expect(parse(statusCalls(f)[0].body).challengeId).not.toBe(
          parse(statusCalls(f)[1].body).challengeId,
        );
      } finally {
        await h?.helper.close();
        await next?.helper.close();
        await f.close();
      }
    },
  );

  it("callback Host/Origin/CSRF and duplicate admission guards protect the status submission", async () => {
    const f = await statusFixture();
    let h;
    const entered = deferred(),
      release = deferred();
    let work;
    try {
      f.setStatus((_req, res) => {
        entered.resolve();
        void release.promise.then(() =>
          json(res, { accountId: f.binding.accountUuid, state: "active" }),
        );
      });
      h = await browser(f);
      const page = await pageCsrf(h);
      for (const options of [
        { headers: { Host: `127.0.0.1:${h.port}` } },
        { headers: { Origin: "http://foreign.example.invalid" } },
        { body: JSON.stringify({ csrf: "x".repeat(43), idToken: TOKEN }) },
      ])
        expect(
          (
            await request(h, {
              method: "POST",
              path: "/credential",
              body: JSON.stringify({ csrf: page.csrf, idToken: TOKEN }),
              ...options,
            })
          ).status,
        ).toBe(403);
      expect(statusCalls(f)).toHaveLength(0);
      const callback = {
        method: "POST",
        path: "/credential",
        body: JSON.stringify({ csrf: page.csrf, idToken: TOKEN }),
      };
      work = request(h, callback);
      await entered.promise;
      expect((await request(h, callback)).status).toBe(409);
      release.resolve();
      expect((await work).status).toBe(200);
      expect(await h.helper.completion).toEqual({ state: "active" });
      expect(statusCalls(f)).toHaveLength(1);
    } finally {
      release.resolve();
      if (work) await work;
      await h?.helper.close();
      await f.close();
    }
  });

  it("expiry and port reservation failures send no status proof and release actual ownership", async () => {
    const f = await statusFixture();
    let held;
    try {
      const count = f.requests.length;
      const port = await availablePort();
      held = await bind("::1", port);
      fs.writeFileSync(
        f.loginConfigPath,
        JSON.stringify({ ...SETTINGS, browserOrigin: `http://localhost:${port}` }),
      );
      const { openConfiguredAccountStatusBrowserHelper } =
        await import("../../../dist/lifecycle/account-status.js");
      await expect(
        openConfiguredAccountStatusBrowserHelper(
          { configPath: f.configPath, loginConfigPath: f.loginConfigPath },
          signal(),
        ),
      ).rejects.toMatchObject({ code: "configuration_required" });
      expect(f.requests).toHaveLength(count);
      await closeServer(held);
      held = null;
      await assertPortReleased(port);
      f.setChallenge((_req, res) =>
        json(res, {
          challengeId: randomUUID(),
          nonce: "synthetic-expired",
          expiresAt: "2020-01-01T00:00:00Z",
        }),
      );
      await expect(browser(f)).rejects.toMatchObject({ code: "attempt_expired" });
      expect(statusCalls(f)).toHaveLength(0);
      expect(fs.readdirSync(f.storage.profileRoot).sort()).toEqual([
        "credentials.enc",
        "owner.lock",
      ]);
      await state(f);
    } finally {
      if (held) await closeServer(held);
      await f.close();
    }
  });

  it("cancellation while a deleted response is pending preserves private material", async () => {
    const f = await statusFixture();
    let h, work;
    const entered = deferred(),
      release = deferred(),
      controller = new AbortController();
    try {
      const before = await state(f);
      f.setStatus((_req, res) => {
        entered.resolve();
        void release.promise.then(() => json(res, deleted(f.binding.accountUuid)));
      });
      h = await browser(f, controller.signal);
      work = submit(h).catch((error) => error);
      await entered.promise;
      controller.abort();
      release.resolve();
      await expect(h.helper.completion).rejects.toMatchObject({ code: "operation_interrupted" });
      await work;
      expect(await state(f)).toEqual(before);
      expect(fs.readdirSync(f.storage.profileRoot).sort()).toEqual([
        "credentials.enc",
        "owner.lock",
      ]);
      await assertPortReleased(h.port);
    } finally {
      release.resolve();
      if (work) await work;
      await h?.helper.close();
      await f.close();
    }
  });
});

describe("T12-S3 owned binding and durable cleanup provenance", () => {
  it.each(["session", "new-profile-account"])(
    "late A proof cannot erase %s replacement",
    async (kind) => {
      const f = await statusFixture();
      const entered = deferred(),
        release = deferred();
      let owner, tx, work;
      try {
        owner = await f.open(f.binding);
        tx = await openAccountStatusTransaction({
          profile: owner,
          settings: SETTINGS,
          transportConfig: { origin: f.origin },
        });
        f.setStatus((_req, res) => {
          entered.resolve();
          void release.promise.then(() => json(res, deleted(f.binding.accountUuid)));
        });
        const challenge = await tx.start(signal());
        work = tx.submit(challenge.attemptId, TOKEN, signal());
        void work.catch(() => undefined);
        await entered.promise;
        let next;
        if (kind === "session") {
          const vault = parse(await owner.readVaultBytes());
          next = { ...f.binding, sessionGeneration: f.binding.sessionGeneration + 1 };
          await owner.advanceSessionGeneration(
            Buffer.from(JSON.stringify({ ...vault, binding: next })),
          );
          await owner.close();
        } else {
          await removeOwnedProfile(owner, f.binding, signal());
          await owner.close();
          f.storage.profileRoot = `${f.dir}/replacement-profile`;
          const config = parse(fs.readFileSync(f.configPath));
          config.storage.profileRoot = f.storage.profileRoot;
          fs.writeFileSync(f.configPath, JSON.stringify(config));
          await setupLoginProfile({ configPath: f.configPath });
          f.grant.account.id = randomUUID();
          next = await signIn(f);
        }
        const before = await state(f, next);
        release.resolve();
        await expect(work).rejects.toMatchObject({ code: "recovery_required" });
        expect(await state(f, next)).toEqual(before);
        expect(await currentBinding(f)).toEqual(next);
      } finally {
        release.resolve();
        if (work) await work.catch(() => undefined);
        await tx?.close();
        await owner?.close();
        await f.close();
      }
    },
  );

  it("verified cleanup interrupted after key erasure recovers without another proof or stored Google token", async () => {
    const f = await statusFixture();
    let owner, tx;
    try {
      f.setStatus((_req, res) => json(res, deleted(f.binding.accountUuid)));
      owner = await ownerAt(f, "remove.key.deleted");
      tx = await openAccountStatusTransaction({
        profile: owner,
        settings: SETTINGS,
        transportConfig: { origin: f.origin },
      });
      const challenge = await tx.start(signal());
      await expect(tx.submit(challenge.attemptId, TOKEN, signal())).rejects.toMatchObject({
        code: "recovery_required",
      });
      await tx.close();
      await owner.close();
      expect(fs.existsSync(`${f.storage.profileRoot}/credentials.enc`)).toBe(true);
      const count = f.requests.length;
      await expect(recoverLoginProfile({ configPath: f.configPath })).rejects.toMatchObject({
        code: "recovery_required",
      });
      await removeLoginProfile({ configPath: f.configPath }, signal());
      expect(f.requests).toHaveLength(count);
      expect(fs.readdirSync(f.storage.profileRoot)).toEqual(["owner.lock"]);
    } finally {
      await tx?.close();
      await owner?.close();
      await f.close();
    }
  });
});
