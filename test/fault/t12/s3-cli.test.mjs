import fs from "node:fs";
import { describe, it, expect } from "vitest";
import { statusFixture, state, deleted, json, pageCsrf, request, TOKEN } from "./s3-helpers.mjs";
import { startCli, expectSafe, browserSettings } from "../../login/cli-helpers.mjs";
import { assertPortReleased } from "../../login/browser-helpers.mjs";

const command = (f) => [
  "account-status",
  "--config",
  f.configPath,
  "--login-config",
  f.loginConfigPath,
];
const callback = (url) => ({
  port: Number(new URL(url).port),
  settings: { browserOrigin: new URL(url).origin },
});
describe("T12-S3 compiled account-status CLI", () => {
  it.each(["active", "deleted"])(
    "foreground %s flow reports a fixed safe result and releases all owners/listeners",
    async (status) => {
      const f = await statusFixture();
      let running;
      try {
        const before = await state(f);
        await browserSettings(f);
        f.setStatus((_req, res) =>
          json(
            res,
            status === "deleted"
              ? deleted(f.binding.accountUuid)
              : { accountId: f.binding.accountUuid, state: "active" },
          ),
        );
        running = startCli(command(f), { launcherMode: "ok" });
        const h = callback(await running.ready);
        const page = await pageCsrf(h);
        expect(
          (
            await request(h, {
              method: "POST",
              path: "/credential",
              body: JSON.stringify({ csrf: page.csrf, idToken: TOKEN }),
            })
          ).status,
        ).toBe(200);
        const result = await running.exited;
        expect(result.code).toBe(0);
        expectSafe(result, f);
        expect(result.stderr).toContain("does not delete the backend account");
        expect(result.stderr).toContain(
          status === "active"
            ? "Account is active. Local private material was preserved."
            : "Account deletion verified. Matching local private material was removed.",
        );
        expect(result.stderr).not.toContain(f.binding.accountUuid);
        expect(result.stderr).not.toContain(TOKEN);
        if (status === "active") expect(await state(f)).toEqual(before);
        else expect(fs.readdirSync(f.storage.profileRoot)).toEqual(["owner.lock"]);
        await assertPortReleased(h.port);
      } finally {
        await running?.close();
        await f.close();
      }
    },
  );
  it.each(["fail", "hold"])(
    "launcher %s/cancellation preserves data without status-token persistence",
    async (mode) => {
      const f = await statusFixture();
      let running;
      try {
        const before = await state(f);
        await browserSettings(f);
        running = startCli(command(f), { launcherMode: mode });
        const h = callback(await running.ready);
        if (mode === "hold") running.child.kill("SIGTERM");
        const result = await running.exited;
        expect(result.code).toBe(mode === "hold" ? 130 : 4);
        expectSafe(result, f);
        expect(await state(f)).toEqual(before);
        expect(fs.readdirSync(f.dir)).not.toContain("binding.json.pending");
        expect(f.requests.filter((r) => r.route === "/v1/account/status")).toHaveLength(0);
        await assertPortReleased(h.port);
      } finally {
        await running?.close();
        await f.close();
      }
    },
  );
});
