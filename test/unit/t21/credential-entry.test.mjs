import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  provisionProfile,
  openProfile,
  removeProfile,
} from "../../../dist/storage/credential/index.js";

describe("T21 inert entry and argument boundary", () => {
  it("rejects invalid public locations before any filesystem/provider action", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "t21-entry-"));
    try {
      const valid = {
        profileRoot: path.join(root, "profile"),
        origin: "https://storage-qa.example.invalid",
        secretServiceBusAddress: "unix:path=/synthetic-unused.sock",
      };
      for (const factory of [provisionProfile, openProfile, removeProfile]) {
        for (const bad of [
          null,
          [],
          { ...valid, profileRoot: "/" },
          { ...valid, origin: "http://storage-qa.example.invalid" },
          { ...valid, provider: "bypass" },
          { ...valid, timeoutMs: 0 },
          { ...valid, secretServiceBusAddress: "tcp:host=localhost" },
        ])
          await expect(factory(bad)).rejects.toMatchObject({ code: "invalid_argument" });
      }
      expect(fs.readdirSync(root)).toEqual([]);
    } finally {
      fs.rmSync(root, { recursive: true });
    }
  });

  it("imports without forbidden effects under the reused calibrated hook and refuses direct worker startup", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "t21-import-"));
    const summary = path.join(root, "summary.jsonl");
    const hook = fileURLToPath(new URL("../t04/import-hook.mjs", import.meta.url));
    const entry = new URL("../../../dist/storage/credential/index.js", import.meta.url).href;
    const worker = fileURLToPath(
      new URL("../../../dist/storage/credential/worker.js", import.meta.url),
    );
    // Deliberately no ambient HOME, keyring or Node options in either subprocess.
    const env = {
      PATH: path.dirname(process.execPath) + ":/usr/bin:/bin",
      HOME: root,
      XDG_RUNTIME_DIR: root,
      XDG_DATA_HOME: root,
      XDG_CONFIG_HOME: root,
      XDG_CACHE_HOME: root,
      T04_QA_HOOK_OUT: summary,
    };
    try {
      const imported = spawnSync(
        process.execPath,
        [
          "--import",
          hook,
          "--input-type=module",
          "--eval",
          `await import(${JSON.stringify(entry)})`,
        ],
        { cwd: root, env, encoding: "utf8", timeout: 10000 },
      );
      expect(imported.status).toBe(0);
      expect(imported.stdout).toBe("");
      expect(imported.stderr).toBe("");
      const report = JSON.parse(fs.readFileSync(summary, "utf8").trim());
      expect(report.forbidden).toEqual([]);
      expect(report.patched["child_process.spawn"]).toBe(true);
      expect(report.patched["net.connect"]).toBe(true);
      const direct = spawnSync(process.execPath, [worker], {
        cwd: root,
        env,
        encoding: "utf8",
        timeout: 10000,
      });
      expect(direct.status).toBe(2);
      expect(direct.stdout).toBe("");
      expect(direct.stderr).toBe("");
      expect(fs.readdirSync(root)).toEqual(["summary.jsonl"]);
    } finally {
      fs.rmSync(root, { recursive: true });
    }
  });
});
