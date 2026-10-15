#!/usr/bin/env node
/** Trusted foreground commands. Importing never dispatches argv or installs handlers. */
import process from "node:process";
import path from "node:path";
import { setImmediate } from "node:timers/promises";
import {
  isLoginError,
  LoginError,
  openConfiguredBrowserLoginHelper,
  openConfiguredLoginTransaction,
  recoverLoginProfile,
  setupLoginProfile,
} from "../login/index.js";
import type { BrowserLoginHelper, LoginTransaction } from "../login/index.js";
import { launchBrowser } from "./launcher.js";

export interface TrustedCliIo {
  stderr(text: string): void | Promise<void>;
}
export type BrowserLauncher = (url: string, signal: AbortSignal) => Promise<void>;

const USAGE =
  "Usage: node dist/cli/main.js setup|recover --config <absolute path>\n       node dist/cli/main.js login --config <absolute path> --login-config <absolute path> [--resume|--cancel]\n";
const DISCLOSURE =
  "Unresolved private recovery evidence may be retained indefinitely until explicitly settled or retired. Requested fitness data is shared with your AI host/model and may remain in its transcripts.\n";
const MESSAGES = {
  configuration: "Login configuration is invalid or unsafe.\n",
  recovery:
    "Private state requires recovery. Stop other profile owners and use the trusted recover command if needed.\n",
  signIn: "Sign-in could not finish. Check setup or use explicit resume/cancel.\n",
  cancelled: "Login cancelled. Committed work may have completed.\n",
} as const;

interface Command {
  readonly name: "setup" | "recover" | "login";
  readonly configPath: string;
  readonly loginConfigPath?: string;
  readonly mode: "fresh" | "resume" | "cancel";
}

function validPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value !== "/" &&
    path.posix.isAbsolute(value) &&
    path.posix.normalize(value) === value &&
    ![...value].some(
      (c) => c.charCodeAt(0) <= 31 || (c.charCodeAt(0) >= 127 && c.charCodeAt(0) <= 159),
    )
  );
}

/** Closed command grammar, evaluated entirely before any filesystem or handler IO. */
function parse(args: readonly string[]): Command | "help" | null {
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string")) return null;
  if (args.length === 1 && args[0] === "--help") return "help";
  const name = args[0];
  if (name !== "setup" && name !== "recover" && name !== "login") return null;
  const flags = new Map<string, string | true>();
  for (let i = 1; i < args.length; i++) {
    const flag = args[i];
    if (flag === undefined || flags.has(flag)) return null;
    if (flag === "--config" || (name === "login" && flag === "--login-config")) {
      const value = args[++i];
      if (!validPath(value)) return null;
      flags.set(flag, value);
    } else if (name === "login" && (flag === "--resume" || flag === "--cancel"))
      flags.set(flag, true);
    else return null;
  }
  const configPath = flags.get("--config");
  const loginConfigPath = flags.get("--login-config");
  if (
    typeof configPath !== "string" ||
    (name === "login" && typeof loginConfigPath !== "string") ||
    (flags.has("--resume") && flags.has("--cancel"))
  )
    return null;
  return {
    name,
    configPath,
    ...(typeof loginConfigPath === "string" ? { loginConfigPath } : {}),
    mode: flags.has("--resume") ? "resume" : flags.has("--cancel") ? "cancel" : "fresh",
  };
}

/** Fixed text only; stream errors never fall back to stdout or raw exception output. */
async function diagnose(text: string): Promise<void> {
  let failed = false;
  const error = (): void => {
    failed = true;
  };
  process.stderr.on("error", error);
  try {
    await new Promise<void>((resolve) => {
      try {
        process.stderr.write(text, (problem) => {
          if (problem) failed = true;
          resolve();
        });
      } catch {
        failed = true;
        resolve();
      }
    });
    await setImmediate();
    if (failed) throw new LoginError("internal_error");
  } finally {
    process.stderr.off("error", error);
  }
}

function failure(error: unknown): { code: number; text: string } {
  if (!isLoginError(error)) return { code: 4, text: MESSAGES.signIn };
  switch (error.code) {
    case "invalid_arguments":
    case "configuration_required":
      return { code: 2, text: MESSAGES.configuration };
    case "recovery_required":
    case "state_corrupt":
    case "state_version_unsupported":
      return { code: 3, text: MESSAGES.recovery };
    case "operation_interrupted":
      return { code: 130, text: MESSAGES.cancelled };
    default:
      return { code: 4, text: MESSAGES.signIn };
  }
}

/** Trusted library seam for isolated launcher tests; executable invocation uses defaults. */
export async function main(
  args: readonly string[],
  io: TrustedCliIo = { stderr: diagnose },
  launcher: BrowserLauncher = launchBrowser,
): Promise<number> {
  const command = parse(args);
  const write = async (text: string): Promise<boolean> => {
    try {
      await io.stderr(text);
      return true;
    } catch {
      return false;
    }
  };
  if (command === null) {
    await write(USAGE);
    return 2;
  }
  if (command === "help") return (await write(USAGE)) ? 0 : 4;
  const controller = new AbortController();
  const launchController = new AbortController();
  let helper: BrowserLoginHelper | undefined;
  let transaction: LoginTransaction | undefined;
  let cancelOwned: (() => Promise<void>) | undefined;
  let cancelWork: Promise<void> | undefined;
  let cancelFailure: unknown;
  let launchWork: Promise<void> | undefined;
  let result = 0;
  let text: string;
  const cancel = (): void => {
    controller.abort();
    launchController.abort();
    if (cancelOwned !== undefined && cancelWork === undefined)
      cancelWork = Promise.resolve()
        .then(cancelOwned)
        .catch((error) => {
          cancelFailure = error;
        });
  };
  process.on("SIGINT", cancel);
  process.on("SIGTERM", cancel);
  try {
    if (command.name === "setup" || (command.name === "login" && command.mode === "fresh")) {
      if (!(await write(DISCLOSURE))) throw new LoginError("internal_error");
    }
    if (controller.signal.aborted) throw new LoginError("operation_interrupted");
    if (command.name === "setup") {
      await setupLoginProfile({ configPath: command.configPath });
      text = "Setup complete.\n";
    } else if (command.name === "recover") {
      await recoverLoginProfile({ configPath: command.configPath });
      text = "Recovery complete.\n";
    } else {
      const selected = {
        configPath: command.configPath,
        loginConfigPath: command.loginConfigPath as string,
      };
      if (command.mode !== "fresh") {
        transaction = await openConfiguredLoginTransaction(selected);
        cancelOwned = () => transaction!.cancel();
        if (controller.signal.aborted) {
          cancel();
          await cancelWork;
          throw new LoginError("operation_interrupted");
        }
        if (command.mode === "cancel") {
          await transaction.cancel();
          text = "Pending login cancelled.\n";
        } else {
          await transaction.resume(controller.signal);
          text = "Login complete.\n";
        }
      } else {
        helper = await openConfiguredBrowserLoginHelper(selected, controller.signal);
        cancelOwned = () => helper!.cancel();
        if (controller.signal.aborted) {
          cancel();
          await cancelWork;
          throw new LoginError("operation_interrupted");
        }
        if (!(await write("Continue sign-in in your browser.\n")))
          throw new LoginError("internal_error");
        launchWork = Promise.resolve().then(() => launcher(helper!.url, launchController.signal));
        void launchWork.catch(() => undefined);
        try {
          await Promise.race([launchWork.then(() => helper!.completion), helper.completion]);
          text = "Login complete.\n";
        } catch (error) {
          // A launcher failure ends the foreground attempt; settled S2 failures
          // are already closed and retain their exact uncertain S1 evidence.
          await helper.cancel();
          throw error;
        }
      }
    }
    if (controller.signal.aborted) throw new LoginError("operation_interrupted");
  } catch (error) {
    const mapped = failure(error);
    result = mapped.code;
    text = mapped.text;
  } finally {
    // Once cleanup starts, signals mark cancellation without trying to cancel
    // an owner that close has already fenced/released.
    cancelOwned = undefined;
    launchController.abort();
    if (launchWork !== undefined) {
      try {
        await launchWork;
      } catch {
        /* Main outcome owns the safe diagnostic. */
      }
    }
    if (cancelWork !== undefined) await cancelWork;
    try {
      if (helper !== undefined) await helper.close();
      if (transaction !== undefined) await transaction.close();
    } catch {
      result = 3;
      text = MESSAGES.recovery;
    }
    if (helper !== undefined) {
      try {
        await helper.completion;
      } catch (error) {
        if (failure(error).code === 3) {
          result = 3;
          text = MESSAGES.recovery;
        }
      }
    }
    if (cancelFailure !== undefined) {
      result = 3;
      text = MESSAGES.recovery;
    }
    if (controller.signal.aborted && result !== 3) {
      result = 130;
      text = MESSAGES.cancelled;
    }
    process.off("SIGINT", cancel);
    process.off("SIGTERM", cancel);
  }
  if (!(await write(text)) && result === 0) return 4;
  return result;
}

if (import.meta.main === true) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch {
    try {
      await diagnose(MESSAGES.signIn);
    } catch {
      /* No stdout fallback. */
    }
    process.exitCode = 4;
  }
}
