import { describe, it, expect } from "vitest";
import { main } from "../../../dist/cli/main.js";

// Public privacy/policy requirements, checked before configuration or browser work.
describe("T12-S4 operator disclosures", () => {
  it.each(["setup", "login"])(
    "%s explains the complete policy before configuration effects",
    async (name) => {
      const output = [];
      let launches = 0;
      const args = [name, "--config", "/synthetic-t12-s4-missing/config.json"];
      if (name === "login") args.push("--login-config", "/synthetic-t12-s4-missing/login.json");
      expect(
        await main(args, { stderr: (text) => output.push(text) }, async () => {
          launches++;
        }),
      ).toBe(2);
      const disclosure = output[0];
      for (const requirement of [
        /fitness data.*AI host\/model.*transcripts/s,
        /three independently committed.*draft or saved routine/s,
        /repeating a call may create a duplicate/s,
        /Creation cannot resume after restart/s,
        /config-file writesEnabled.*strict boolean, false by default/s,
        /true permits any connected local client.*authenticated explicit creation without per-routine confirmation/s,
        /No permission extension or CLI write-enable flag/s,
      ])
        expect(disclosure).toMatch(requirement);
      expect(disclosure).not.toContain("creation remains unavailable");
      expect(output.join("")).not.toContain("/synthetic");
      expect(launches).toBe(0);
    },
  );
});
