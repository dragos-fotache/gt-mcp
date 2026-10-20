// Retained auth lifecycle with no creation state carried across sign-out/login.
import { describe, it, expect } from "vitest";
import { fixture, args, processSession } from "./helpers.mjs";
import { runCli } from "../login/cli-helpers.mjs";
import { signIn } from "../login/configured-helpers.mjs";
describe("T21 auth lifecycle and fresh creation", () => {
  it("sign-out/login preserves credential fences but cannot resume a creation", async () => {
    const f = await fixture();
    let s;
    try {
      s = await processSession(f.configPath);
      const first = (await s.client.callTool({ name: "create_routine", arguments: args() }))
        .structuredContent;
      expect(first.ok).toBe(true);
      await s.close();
      s = null;
      expect((await runCli(["sign-out", "--config", f.configPath])).code).toBe(0);
      const binding = await signIn(f);
      expect(await f.inspect(binding)).toEqual(["credentials.enc", "owner.lock"]);
      s = await processSession(f.configPath);
      const next = (await s.client.callTool({ name: "create_routine", arguments: args() }))
        .structuredContent;
      expect(next.ok).toBe(true);
      expect(next.data.routineId).not.toBe(first.data.routineId);
      await s.close();
      s = null;
      expect((await runCli(["profile-remove", "--config", f.configPath, "--confirm"])).code).toBe(
        0,
      );
    } finally {
      await s?.close();
      await f.close();
    }
  }, 60000);
});
