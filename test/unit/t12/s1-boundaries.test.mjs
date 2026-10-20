/* global AbortController */
import { describe, it, expect } from "vitest";
import { main } from "../../../dist/cli/main.js";
import { signOutProfile, removeLoginProfile } from "../../../dist/lifecycle/index.js";
describe("trusted local lifecycle grammar", () => {
  it.each([
    [
      "retire-operation",
      "--config",
      "/synthetic/config",
      "--operation-id",
      "00000000-0000-4000-8000-000000000001",
      "--confirm",
    ],
    ["setup", "--config", "/synthetic/config", "--reconcile", "--confirm"],
    ["setup", "--config", "/synthetic/config", "--confirm"],
    ["sign-out", "--config", "relative"],
    ["sign-out", "--config", "/synthetic/config", "--writes-enabled"],
    ["profile-remove", "--config", "/synthetic/config"],
  ])("refuses obsolete or invalid grammar before IO: %j", async (args) => {
    const before = ["SIGINT", "SIGTERM"].map((s) => process.listenerCount(s));
    let output = "";
    expect(
      await main(
        args,
        {
          stderr: (v) => {
            output += v;
          },
        },
        () => {
          throw Error("unexpected launcher");
        },
      ),
    ).toBe(2);
    expect(output).toMatch(/^Usage:/);
    expect(output).not.toContain("/synthetic");
    expect(["SIGINT", "SIGTERM"].map((s) => process.listenerCount(s))).toEqual(before);
  });
  it("validates options and cancellation before configured ownership", async () => {
    const c = new AbortController();
    c.abort();
    await expect(
      signOutProfile({ configPath: "/synthetic/missing" }, c.signal),
    ).rejects.toMatchObject({ code: "operation_interrupted" });
    await expect(
      removeLoginProfile({ configPath: "relative" }, new AbortController().signal),
    ).rejects.toMatchObject({ code: "invalid_arguments" });
  });
});
