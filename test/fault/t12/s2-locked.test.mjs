import fs from "node:fs";
import { describe, it, expect } from "vitest";
import { removeLoginProfile } from "../../../dist/lifecycle/index.js";
import { lifecycleFixture, signal } from "./s1-helpers.mjs";
import { busctlLock } from "../t04/provider-helpers.mjs";
describe("locked real provider cleanup gate (terminal isolated case)", () => {
  it("never deletes or acknowledges a locked matching key", async () => {
    const f = await lifecycleFixture();
    try {
      const before = fs.readFileSync(`${f.storage.profileRoot}/credentials.enc`);
      busctlLock(f.storage.secretServiceBusAddress);
      await expect(
        removeLoginProfile({ configPath: f.configPath }, signal()),
      ).rejects.toMatchObject({ code: "key_locked" });
      expect(fs.readFileSync(`${f.storage.profileRoot}/credentials.enc`)).toEqual(before);
      await expect(f.open()).rejects.toMatchObject({ code: "key_locked" });
    } finally {
      await f.close();
    }
  });
});
