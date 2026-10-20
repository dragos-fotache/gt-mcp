// Actual compiled processes and official SDK; no persistent creation recovery.
import { describe, it, expect } from "vitest";
import { fixture, args, processSession } from "./helpers.mjs";
import { expectError } from "../read-protocol/helpers.mjs";
const call = (s) => s.client.callTool({ name: "create_routine", arguments: args() });
describe("T21 response loss, restart and stop", () => {
  it("lost final reply has no receipt; later explicit call creates fresh", async () => {
    const f = await fixture();
    let s;
    try {
      s = await processSession(f.configPath);
      const lost = s.loseSavedReply();
      const pending = call(s).then(
        () => true,
        () => false,
      );
      const original = await lost;
      await s.close("eof");
      expect(await pending).toBe(false);
      s = null;
      expect(await f.inspect()).toEqual(["credentials.enc", "owner.lock"]);
      const before = f.requests.length;
      s = await processSession(f.configPath);
      expect(f.requests).toHaveLength(before);
      const next = await call(s);
      expect(next.structuredContent.ok).toBe(true);
      expect(next.structuredContent.data.routineId).not.toBe(
        original.structuredContent.data.routineId,
      );
      expect(f.mutations()).toHaveLength(6);
    } finally {
      await s?.close();
      await f.close();
    }
  }, 30000);
  for (const reason of ["eof", "SIGTERM"])
    it(`${reason} stops held creation and relaunch sends nothing`, async () => {
      const f = await fixture();
      let s;
      try {
        f.state.hold = "draft";
        s = await processSession(f.configPath);
        const pending = call(s).then(
          () => true,
          () => false,
        );
        await f.entered;
        await s.close(reason);
        expect(await pending).toBe(false);
        expect(s.stderr()).toBe("");
        s = null;
        expect(f.mutations()).toHaveLength(1);
        expect(await f.inspect()).toEqual(["credentials.enc", "owner.lock"]);
        f.release();
        f.state.hold = null;
        f.write({ ...f.config, writesEnabled: false });
        const before = f.requests.length;
        s = await processSession(f.configPath);
        expect(f.requests).toHaveLength(before);
        expectError(await call(s), "configuration_required", false, {
          message: "Routine creation is disabled in the operator configuration.",
        });
        expect(f.mutations()).toHaveLength(1);
      } finally {
        f.release();
        await s?.close();
        await f.close();
      }
    }, 30000);
});
