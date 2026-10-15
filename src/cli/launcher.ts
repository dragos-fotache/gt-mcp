/** Fixed local desktop handoff. Importing this module never opens a browser. */
import { spawn } from "node:child_process";
import { constants, promises as fs } from "node:fs";
import { LoginError } from "../login/errors.js";
import { assertSignal } from "../auth/validate.js";

const EXECUTABLE = "/usr/bin/xdg-open";
const TIMEOUT_MS = 10000;
const KILL_GRACE_MS = 500;
const ENVIRONMENT_KEYS = [
  "HOME",
  "DISPLAY",
  "WAYLAND_DISPLAY",
  "XAUTHORITY",
  "DBUS_SESSION_BUS_ADDRESS",
  "XDG_RUNTIME_DIR",
  "XDG_CONFIG_HOME",
  "XDG_CONFIG_DIRS",
  "XDG_DATA_HOME",
  "XDG_DATA_DIRS",
  "XDG_CACHE_HOME",
  "XDG_CURRENT_DESKTOP",
  "XDG_SESSION_DESKTOP",
  "XDG_SESSION_TYPE",
  "DESKTOP_SESSION",
  "LANG",
] as const;

function assertLocalPage(url: string): void {
  const match = /^http:\/\/localhost:([1-9][0-9]{3,4})\/$/.exec(url);
  const port = match?.[1] === undefined ? NaN : Number(match[1]);
  if (match?.[0] !== url || !Number.isSafeInteger(port) || port < 1024 || port > 65535)
    throw new LoginError("invalid_arguments");
}

/**
 * Open only the canonical token-free localhost page with the fixed Linux
 * executable. Success acknowledges launcher exit, not Google authentication.
 * Abort/timeout kills and reaps only this invocation's child; no process-group
 * signals, shell command, ambient BROWSER or caller-selected executable.
 */
export async function launchBrowser(url: string, signal: AbortSignal): Promise<void> {
  assertLocalPage(url);
  try {
    assertSignal(signal);
  } catch {
    throw new LoginError("invalid_arguments");
  }
  if (signal.aborted) throw new LoginError("operation_interrupted");
  const started = performance.now();
  if (process.platform !== "linux" || (!process.env["DISPLAY"] && !process.env["WAYLAND_DISPLAY"]))
    throw new LoginError("sign_in_failed");
  try {
    await fs.access(EXECUTABLE, constants.X_OK);
  } catch {
    if (signal.aborted) throw new LoginError("operation_interrupted");
    throw new LoginError("sign_in_failed");
  }
  if (signal.aborted) throw new LoginError("operation_interrupted");
  const remaining = TIMEOUT_MS - (performance.now() - started);
  if (remaining <= 0) throw new LoginError("sign_in_failed");
  const environment: NodeJS.ProcessEnv = { PATH: "/usr/bin:/bin" };
  for (const key of ENVIRONMENT_KEYS) {
    const value = process.env[key];
    if (value !== undefined) environment[key] = value;
  }

  await new Promise<void>((resolve, reject) => {
    let child;
    try {
      child = spawn(EXECUTABLE, [url], {
        shell: false,
        stdio: "ignore",
        env: environment,
      });
    } catch {
      reject(new LoginError(signal.aborted ? "operation_interrupted" : "sign_in_failed"));
      return;
    }
    let failed = false;
    let interrupted = false;
    let stopping = false;
    let killTimer: ReturnType<typeof setTimeout> | undefined;
    const stop = (): void => {
      if (stopping) return;
      stopping = true;
      // An exited child is already on its way to close/reaping. Never signal
      // a detached process or any descendant the desktop launcher may start.
      if (child.exitCode !== null || child.signalCode !== null) return;
      child.kill("SIGTERM");
      killTimer = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      }, KILL_GRACE_MS);
    };
    const abort = (): void => {
      interrupted = true;
      stop();
    };
    const timeout = setTimeout(() => {
      failed = true;
      stop();
    }, remaining);
    child.once("error", () => {
      failed = true;
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      clearTimeout(killTimer);
      signal.removeEventListener("abort", abort);
      if (interrupted || signal.aborted) reject(new LoginError("operation_interrupted"));
      else if (failed || code !== 0) reject(new LoginError("sign_in_failed"));
      else resolve();
    });
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
}
