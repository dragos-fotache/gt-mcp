import { describe, it, expect } from "vitest";
import { StorageError, provisionProfile } from "../../../dist/storage/index.js";
import { ALL_CODES } from "./helpers.mjs";
describe("sanitized storage errors", () => {
  it("keeps every supported code immutable and free of native paths or causes", () => {
    for (const code of ALL_CODES) {
      const error = new StorageError(code);
      expect(error.code).toBe(code);
      expect(error.message).toBe(`Storage failure: ${code}.`);
      expect(error.stack).toBe(`StorageError: ${error.message}`);
      expect(error).not.toHaveProperty("cause");
      expect(() => {
        error.code = "synthetic-secret";
      }).toThrow();
    }
  });
  it("never echoes invalid configuration fields", async () => {
    const error = await provisionProfile({
      profileRoot: "synthetic-secret",
      origin: "https://synthetic-secret.invalid",
      secretServiceBusAddress: "invalid",
    }).catch((e) => e);
    expect(error.code).toBe("invalid_argument");
    expect(`${error.stack}${JSON.stringify(error)}`).not.toContain("synthetic-secret");
  });
});
