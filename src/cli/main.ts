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
import { openConfiguredAccountStatusBrowserHelper } from "../lifecycle/account-status.js";
import type { AccountStatusBrowserHelper } from "../login/browser.js";
import { launchBrowser } from "./launcher.js";
import { signOutProfile, removeLoginProfile } from "../lifecycle/index.js";
import { isSessionError } from "../auth/index.js";
import { isStorageError } from "../storage/index.js";
import { isTransportError } from "../http/index.js";

export interface TrustedCliIo {
  stderr(text: string): void | Promise<void>;
}
export type BrowserLauncher = (url: string, signal: AbortSignal) => Promise<void>;

const USAGE =
  "Usage: node dist/cli/main.js setup|recover|sign-out --config <absolute path>\n       node dist/cli/main.js login --config <absolute path> --login-config <absolute path> [--resume|--cancel]\n       node dist/cli/main.js profile-remove --config <absolute path> --confirm\n       node dist/cli/main.js account-status --config <absolute path> --login-config <absolute path>\n";
const REMOVE_WARNING =
  "Profile removal erases local credentials. Remote routines, host transcripts, backups and physical media copies are not deleted.\n";
const STATUS_DISCLOSURE =
  "Verify the cached account with a fresh Google proof. If the service confirms deletion, matching local credentials will be removed. This command does not delete the backend account.\n";
const DISCLOSURE =
  "Requested fitness data is shared with your AI host/model and may remain in its transcripts under the host’s retention settings.\n" +
  "Routine creation uses three independently committed backend steps. Interruption may leave a draft or saved routine; repeating a call may create a duplicate. Inspect routines manually before a deliberate new attempt. Creation cannot resume after restart.\n" +
  "The operator config-file writesEnabled setting is a strict boolean, false by default. Explicit true permits any connected local client’s valid authenticated explicit creation without per-routine confirmation. No permission extension or CLI write-enable flag is required.\n";
const MESSAGES = {
  configuration:
    "Configuration is invalid or unsafe. Use version-2 server config, a new private profile root and trusted login. Version-1 installations require fresh setup; old data is not migrated or removed.\n",
  recovery:
    "Private state is unavailable. Stop other profile owners. For pending foreground login use login --resume or --cancel. Missing, corrupt or old-format state requires a new private profile/config and trusted login; recover does not repair it.\n",
  signIn: "Sign-in could not finish. Check setup or use explicit resume/cancel.\n",
  cancelled: "Login cancelled. Committed work may have completed.\n",
  lifecycle:
    "Lifecycle action could not finish. Check trusted login or private recovery guidance.\n",
  status:
    "Account-status verification could not finish. Follow private recovery guidance or start a fresh trusted attempt.\n",
  lifecycleCancelled:
    "Lifecycle action interrupted. Committed local or backend work may have completed.\n",
} as const;

interface Command {
  readonly name: "setup" | "recover" | "login" | "sign-out" | "profile-remove" | "account-status";
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
  if (
    name !== "setup" &&
    name !== "recover" &&
    name !== "login" &&
    name !== "sign-out" &&
    name !== "profile-remove" &&
    name !== "account-status"
  )
    return null;
  const flags = new Map<string, string | true>();
  for (let i = 1; i < args.length; i++) {
    const flag = args[i];
    if (flag === undefined || flags.has(flag)) return null;
    if (
      flag === "--config" ||
      ((name === "login" || name === "account-status") && flag === "--login-config")
    ) {
      const value = args[++i];
      if (!validPath(value)) return null;
      flags.set(flag, value);
    } else if (name === "login" && (flag === "--resume" || flag === "--cancel"))
      flags.set(flag, true);
    else if (name === "profile-remove" && flag === "--confirm") flags.set(flag, true);
    else return null;
  }
  const configPath = flags.get("--config");
  const loginConfigPath = flags.get("--login-config");
  if (
    typeof configPath !== "string" ||
    ((name === "login" || name === "account-status") && typeof loginConfigPath !== "string") ||
    (name === "profile-remove" && !flags.has("--confirm")) ||
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

function failure(
  error: unknown,
  lifecycle = false,
  accountStatus = false,
): { code: number; text: string } {
  const cancelled = lifecycle ? MESSAGES.lifecycleCancelled : MESSAGES.cancelled;
  const fallback = accountStatus
    ? MESSAGES.status
    : lifecycle
      ? MESSAGES.lifecycle
      : MESSAGES.signIn;
  if (lifecycle) {
    if (isStorageError(error)) return { code: 3, text: MESSAGES.recovery };
    if (isSessionError(error)) {
      if (error.code === "operation_interrupted") return { code: 130, text: cancelled };
      if (error.code === "state_corrupt" || error.code === "state_version_unsupported")
        return { code: 3, text: MESSAGES.recovery };
      return { code: 4, text: MESSAGES.signIn };
    }
    if (isTransportError(error)) return { code: 4, text: fallback };
  }
  if (!isLoginError(error)) return { code: 4, text: fallback };
  switch (error.code) {
    case "invalid_arguments":
    case "configuration_required":
      return { code: 2, text: MESSAGES.configuration };
    case "recovery_required":
    case "state_corrupt":
    case "state_version_unsupported":
      return { code: 3, text: MESSAGES.recovery };
    case "operation_interrupted":
      return { code: 130, text: cancelled };
    default:
      return { code: 4, text: fallback };
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
  const lifecycle =
    command.name === "sign-out" ||
    command.name === "profile-remove" ||
    command.name === "account-status";
  const controller = new AbortController();
  const launchController = new AbortController();
  let helper: BrowserLoginHelper | AccountStatusBrowserHelper | undefined;
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
    if (command.name === "account-status" && !(await write(STATUS_DISCLOSURE)))
      throw new LoginError("internal_error");
    if (command.name === "profile-remove" && !(await write(REMOVE_WARNING)))
      throw new LoginError("internal_error");
    if (controller.signal.aborted) throw new LoginError("operation_interrupted");
    if (command.name === "profile-remove") {
      await removeLoginProfile({ configPath: command.configPath }, controller.signal);
      text = "Profile removal complete locally. Remote data was not deleted.\n";
    } else if (command.name === "setup") {
      await setupLoginProfile({ configPath: command.configPath });
      text = "Setup complete.\n";
    } else if (command.name === "recover") {
      await recoverLoginProfile({ configPath: command.configPath });
      text = "Recovery complete.\n";
    } else if (command.name === "sign-out") {
      await signOutProfile({ configPath: command.configPath }, controller.signal);
      text = "Sign-out complete. Local credentials were cleared.\n";
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
        const proof =
          command.name === "account-status"
            ? await openConfiguredAccountStatusBrowserHelper(selected, controller.signal)
            : await openConfiguredBrowserLoginHelper(selected, controller.signal);
        helper = proof;
        cancelOwned = () => helper!.cancel();
        if (controller.signal.aborted) {
          cancel();
          await cancelWork;
          throw new LoginError("operation_interrupted");
        }
        if (
          !(await write(
            command.name === "account-status"
              ? "Continue account-status verification in your browser.\n"
              : "Continue sign-in in your browser.\n",
          ))
        )
          throw new LoginError("internal_error");
        launchWork = Promise.resolve().then(() => launcher(helper!.url, launchController.signal));
        void launchWork.catch(() => undefined);
        try {
          const outcome = await Promise.race([
            launchWork.then(async () => await proof.completion),
            proof.completion,
          ]);
          if (command.name === "account-status") {
            if (!("state" in outcome)) throw new LoginError("internal_error");
            text =
              outcome.state === "active"
                ? "Account is active. Local private material was preserved.\n"
                : "Account deletion verified. Matching local private material was removed.\n";
          } else text = "Login complete.\n";
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
    const mapped = failure(error, lifecycle, command.name === "account-status");
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
      text = lifecycle ? MESSAGES.lifecycleCancelled : MESSAGES.cancelled;
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
