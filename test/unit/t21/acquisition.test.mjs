/* global AbortController */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { acquireProfile } from "../../../dist/storage/credential/acquire.js";
import { launch } from "../../../dist/storage/credential/client.js";

describe("private profile acquisition argument/cancellation boundary", () => {
  it("rejects invalid options before opening a profile or echoing caller input", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "acquisition-arguments-"));
    const request = {
      profileRoot: path.join(root, "profile"),
      origin: "https://storage-qa.example.invalid",
      secretServiceBusAddress: "unix:path=/synthetic-unused.sock",
    };
    const signal = new AbortController().signal;
    try {
      for (const options of [
        null,
        { signal: {} },
        { signal, waitMs: 0 },
        { signal, waitMs: null },
        { signal, waitMs: 600001 },
        { signal, waitMs: 1.5 },
        { signal, worker: "untrusted-injection" },
      ]) {
        await expect(acquireProfile(request, options)).rejects.toMatchObject({
          name: "StorageError",
          code: "invalid_argument",
        });
      }
      for (const action of ["provision", "removeProfile"])
        await expect(
          launch(request, action, "/synthetic-unused-worker", signal),
        ).rejects.toMatchObject({ name: "StorageError", code: "invalid_argument" });
      expect(fs.readdirSync(root)).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true });
    }
  });

  it("rejects a pre-aborted signal with a fixed error without starting an owner", async () => {
    const controller = new AbortController();
    controller.abort("synthetic-private-abort-reason");
    await expect(
      acquireProfile(
        {
          profileRoot: "/synthetic-never-opened",
          origin: "https://storage-qa.example.invalid",
          secretServiceBusAddress: "unix:path=/synthetic-unused.sock",
        },
        { signal: controller.signal },
      ),
    ).rejects.toMatchObject({
      name: "ProfileAcquisitionError",
      code: "interrupted",
      message: "Profile acquisition interrupted.",
      stack: "ProfileAcquisitionError: Profile acquisition interrupted.",
    });
  });
});
