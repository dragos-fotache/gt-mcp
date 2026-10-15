import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout, clearTimeout } from "node:timers";
import { expect } from "vitest";
import { availablePort } from "./browser-helpers.mjs";

export const CLI = fileURLToPath(new URL("../../dist/cli/main.js", import.meta.url));
const CHILD = fileURLToPath(new URL("./cli-child.mjs", import.meta.url));

export function startCli(args, { launcherMode, env = process.env } = {}) {
  const child = spawn(
    process.execPath,
    launcherMode === undefined ? [CLI, ...args] : [CHILD, launcherMode, ...args],
    {
      env: { ...env, DISPLAY: "", WAYLAND_DISPLAY: "" },
      stdio:
        launcherMode === undefined ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "pipe", "ipc"],
    },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (data) => (stdout += data.toString()));
  child.stderr.on("data", (data) => (stderr += data.toString()));
  const exited = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
  let timer;
  const ready =
    launcherMode === undefined
      ? undefined
      : new Promise((resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error("Synthetic CLI launcher readiness not observed")),
            10000,
          );
          child.once("message", ({ url }) => {
            clearTimeout(timer);
            resolve(url);
          });
          void exited.then(() => {
            clearTimeout(timer);
            reject(new Error("Synthetic CLI exited before launcher readiness"));
          });
        });
  return {
    child,
    exited,
    ready,
    async close() {
      clearTimeout(timer);
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
      await exited;
    },
  };
}

export async function runCli(args) {
  const running = startCli(args);
  try {
    return await running.exited;
  } finally {
    await running.close();
  }
}

export function command(f, mode) {
  return [
    "login",
    "--config",
    f.configPath,
    "--login-config",
    f.loginConfigPath,
    ...(mode ? [mode] : []),
  ];
}

export async function browserSettings(f) {
  const port = await availablePort();
  const settings = {
    version: 1,
    googleWebClientId: "synthetic-t07-client.example.invalid",
    browserOrigin: `http://localhost:${port}`,
  };
  fs.writeFileSync(f.loginConfigPath, JSON.stringify(settings), { mode: 0o600 });
  return { port, settings };
}

export function expectSafe(result, f) {
  expect(result.signal).toBeNull();
  expect(result.stdout).toBe("");
  expect(result.stderr).not.toContain(f.dir);
  expect(result.stderr).not.toContain(f.origin);
  expect(result.stderr).not.toContain("synthetic-t07-");
  expect(result.stderr).not.toContain(f.grant.accessToken);
  expect(result.stderr).not.toContain(f.grant.refreshToken);
  expect(result.stderr).not.toContain("Error:");
}
