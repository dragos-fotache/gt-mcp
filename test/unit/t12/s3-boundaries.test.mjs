/* global AbortController */
import { describe, it, expect } from "vitest";
import { main } from "../../../dist/cli/main.js";
import {
  applyVerifiedAccountDeletion,
  openAccountStatusTransaction,
  openConfiguredAccountStatusBrowserHelper,
} from "../../../dist/lifecycle/account-status.js";
import { signal } from "../../login/configured-helpers.mjs";
const common = ["--config", "/synthetic/missing", "--login-config", "/synthetic/settings"];

describe("T12-S3 trusted account-status boundary", () => {
  it.each(
    [
      ["account-status", "--config", "/synthetic/missing"],
      ...["--resume", "--cancel", "--confirm", "--reconcile"].map((flag) => [
        "account-status",
        ...common,
        flag,
      ]),
      ["account-status", ...common, "--account-id", "synthetic-account"],
      ["account-status", ...common, "--id-token", "synthetic-private"],
      ["account-status", ...common, "--config", "/synthetic/duplicate"],
    ].map((args) => ({ args })),
  )("rejects unsupported authority/replay grammar before handlers: $args", async ({ args }) => {
    const before = ["SIGINT", "SIGTERM"].map((s) => process.listenerCount(s));
    let text = "";
    expect(
      await main(
        args,
        {
          stderr: (value) => {
            text += value;
          },
        },
        () => {
          throw new Error("Unexpected launcher");
        },
      ),
    ).toBe(2);
    expect(text).toMatch(/^Usage:/);
    expect(text).not.toContain("/synthetic/missing");
    expect(text).not.toContain("synthetic-private");
    expect(["SIGINT", "SIGTERM"].map((s) => process.listenerCount(s))).toEqual(before);
  });
  it("raw receipts, copied objects, booleans and proxies cannot manufacture cleanup authority", async () => {
    const raw = {
      accountId: "79999999-9999-4999-8999-999999999999",
      state: "deleted",
      deletedAt: "2026-09-27T12:00:00Z",
      purgeBy: "2026-09-28T12:00:00Z",
    };
    let accessed = false;
    const proxy = new Proxy(
      {},
      {
        get: () => {
          accessed = true;
          throw new Error("Untrusted getter");
        },
      },
    );
    for (const receipt of [raw, Object.freeze({ ...raw }), {}, true, null, proxy])
      await expect(applyVerifiedAccountDeletion(receipt, signal())).rejects.toMatchObject({
        code: "invalid_arguments",
      });
    expect(accessed).toBe(false);
  });
  it("captures exact trusted options and aborted signals before configured IO", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      openConfiguredAccountStatusBrowserHelper(
        { configPath: "/synthetic/missing", loginConfigPath: "/synthetic/settings" },
        controller.signal,
      ),
    ).rejects.toMatchObject({ code: "operation_interrupted" });
    await expect(
      openConfiguredAccountStatusBrowserHelper(
        {
          configPath: "/synthetic/missing",
          loginConfigPath: "/synthetic/settings",
          accountId: "synthetic-account",
        },
        signal(),
      ),
    ).rejects.toMatchObject({ code: "invalid_arguments" });
    await expect(openAccountStatusTransaction({})).rejects.toMatchObject({
      code: "invalid_arguments",
    });
  });
  it("required account-status disclosure output failure prevents configuration or launcher work", async () => {
    let launched = false;
    expect(
      await main(
        ["account-status", ...common],
        {
          stderr: () => {
            throw new Error("Synthetic output failure");
          },
        },
        () => {
          launched = true;
          throw new Error("Unexpected launcher");
        },
      ),
    ).toBe(4);
    expect(launched).toBe(false);
  });
});
