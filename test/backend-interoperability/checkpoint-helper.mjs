// One fixed owned child, private stdin, bounded lifetime and fixed public markers.
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { check } from "./helpers.mjs";

export async function checkpointChild(input, ready) {
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL("./checkpoint-child.mjs", import.meta.url))],
    { stdio: ["pipe", "pipe", "pipe", "ipc"], timeout: 30000 },
  );
  let stdout = "",
    stderr = "",
    startupFailed = false;
  child.stdout.on("data", (b) => {
    stdout += b;
  });
  child.stderr.on("data", (b) => {
    stderr += b;
  });
  child.on("message", (message) => {
    try {
      check(message?.kind === "ready", "Unexpected checkpoint child event");
      ready();
      child.send("execute");
    } catch {
      startupFailed = true;
      child.kill();
    }
  });
  const result = new Promise((resolve, reject) => {
    child.once("error", () => reject(new Error("Owned checkpoint child failed to start")));
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
  child.stdin.on("error", () => {
    startupFailed = true;
  });
  child.stdin.end(JSON.stringify(input));
  const ended = await result;
  check(
    !startupFailed &&
      ended.code === 73 &&
      ended.signal === null &&
      stdout === "creation-checkpoint" &&
      stderr === "",
    "Owned checkpoint child did not stop at its public draft boundary",
  );
}
