// Small actual-process helpers. Inert-import interception intentionally stays in
// foundation: delivered stdio owns stdin, stream and signal subscriptions.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SERVER = fileURLToPath(new URL("../../dist/protocol/server.js", import.meta.url));
export const USAGE = "Usage: gymtracka-mcp-server [--config <absolute path>]\n";
export const INPUT_FAILURE = "GymTracka MCP input protocol failure.\n";
export const CONFIG_FAILURE = "GymTracka MCP startup configuration is invalid or unsafe.\n";

export function syntheticScope() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gt-s3-synthetic-"));
  const env = Object.fromEntries(
    Object.entries({
      ...process.env,
      HOME: dir,
      XDG_CONFIG_HOME: dir,
      XDG_DATA_HOME: dir,
      XDG_STATE_HOME: dir,
      DBUS_SESSION_BUS_ADDRESS: "unix:path=/synthetic-unavailable-bus",
      NODE_OPTIONS: "",
    }).filter(([, value]) => typeof value === "string"),
  );
  return { dir, env, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

export function runServer({ args = [], input = "", entry = SERVER, evalCode } = {}) {
  const scope = syntheticScope();
  try {
    return spawnSync(
      process.execPath,
      evalCode === undefined ? [entry, ...args] : ["--input-type=module", "-e", evalCode],
      { env: scope.env, input, encoding: "utf8", timeout: 15000, maxBuffer: 20 * 1024 * 1024 },
    );
  } finally {
    scope.cleanup();
  }
}

export function frame(message) {
  return `${JSON.stringify(message)}\n`;
}

export const INITIALIZE = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "synthetic-s3", version: "0.0.0" },
  },
};

// Only live framing/signal cases need a dialogue; SDK handles ordinary calls.
export function rawServer() {
  const scope = syntheticScope();
  const child = spawn(process.execPath, [SERVER], { env: scope.env, stdio: "pipe" });
  let stdout = "";
  let stderr = "";
  const records = [];
  const waiters = [];
  let tail = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    tail += chunk;
    for (let end; (end = tail.indexOf("\n")) >= 0;) {
      const record = JSON.parse(tail.slice(0, end));
      tail = tail.slice(end + 1);
      if (waiters.length) waiters.shift()(record);
      else records.push(record);
    }
  });
  child.stderr.on("data", (chunk) => (stderr += chunk));
  child.stdin.on("error", () => {}); // child may reject framing before sender drains
  const exited = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
  return {
    child,
    exited,
    send: (message) => child.stdin.write(frame(message)),
    next: () =>
      records.length
        ? Promise.resolve(records.shift())
        : new Promise((resolve) => waiters.push(resolve)),
    async cleanup() {
      if (child.exitCode === null && child.signalCode === null) {
        child.stdin.end();
        child.kill("SIGTERM");
      }
      try {
        await exited;
      } finally {
        scope.cleanup();
      }
    },
  };
}
