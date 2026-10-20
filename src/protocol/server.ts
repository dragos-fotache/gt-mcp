#!/usr/bin/env node
/** Actual local stdio entry. Imports remain inert, including through symlinks. */
import process from "node:process";
import path from "node:path";
import { fstatSync } from "node:fs";
import { Socket } from "node:net";
import { setImmediate } from "node:timers/promises";
import { adapterOutcome, openProcessToolServer } from "./adapter.js";
import { ProfileAcquisitionError } from "../storage/credential/acquire.js";
import type { ReadToolServer } from "./adapter.js";
import { isReadToolServerError } from "./errors.js";
import { ProcessStdioTransport } from "./stdio.js";
import type { StopReason } from "./stdio.js";

const DIAGNOSTICS = {
  usage: "Usage: gymtracka-mcp-server [--config <absolute path>]\n",
  configuration: "GymTracka MCP startup configuration is invalid or unsafe.\n",
  privateState: "GymTracka MCP private state could not be opened safely.\n",
  protocol: "GymTracka MCP input protocol failure.\n",
  server: "GymTracka MCP server failed.\n",
  transport: "GymTracka MCP transport failed.\n",
  shutdown: "GymTracka MCP shutdown failed.\n",
} as const;
type Failure = keyof typeof DIAGNOSTICS;

function validArgs(args: readonly string[]): boolean {
  if (!Array.isArray(args)) return false;
  if (args.length === 0) return true;
  const selected = args[1];
  return (
    args.length === 2 &&
    args[0] === "--config" &&
    typeof selected === "string" &&
    !selected.includes("\0") &&
    path.posix.isAbsolute(selected) &&
    path.posix.normalize(selected) === selected
  );
}

/** Write only fixed text; stderr errors never fall back to stdout or native logging. */
async function diagnose(text: string): Promise<boolean> {
  let failed = false;
  const onError = (): void => {
    failed = true;
  };
  process.stderr.on("error", onError);
  try {
    await new Promise<void>((resolve) => {
      try {
        process.stderr.write(text, (error?: Error | null): void => {
          if (error != null) failed = true;
          resolve();
        });
      } catch {
        failed = true;
        resolve();
      }
    });
    // Node may emit the stream error after invoking the write callback.
    await setImmediate();
    return !failed;
  } finally {
    process.stderr.off("error", onError);
  }
}

/** One process lifecycle; resolves only after acquired runtime cleanup. Never calls process.exit. */
export async function main(args: readonly string[]): Promise<number> {
  if (!validArgs(args)) {
    await diagnose(DIAGNOSTICS.usage);
    return 64;
  }
  let server: ReadToolServer | undefined;
  let primary: Failure | undefined;
  let cleanupFailed = false;
  let signalCode: number | undefined;
  let stopping = false;
  let opening = true;
  const startup = new AbortController();
  let finish!: () => void;
  const stopped = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const fail = (reason: Failure): void => {
    primary ??= reason;
  };
  const requestStop = (reason: StopReason): void => {
    if (reason !== "eof") fail(reason);
    if (server !== undefined && adapterOutcome(server)?.sdkFailed === true) fail("server");
    stopping = true;
    startup.abort();
    void transport.close();
    finish();
  };
  // Node protects process.stdout from actual destruction. Own a public pipe handle
  // so cancellation can release kernel-blocked writes without a private handle API.
  const stdoutStat = fstatSync(1);
  const ownsOutput = stdoutStat.isFIFO() || stdoutStat.isSocket();
  const output = ownsOutput
    ? new Socket({ fd: 1, readable: false, writable: true })
    : process.stdout;
  const transport = new ProcessStdioTransport(process.stdin, output, requestStop, ownsOutput);
  const interrupt = (): void => {
    signalCode ??= 130;
    requestStop("eof");
  };
  const terminate = (): void => {
    signalCode ??= 143;
    requestStop("eof");
  };
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", terminate);
  try {
    try {
      const configPath = args[1];
      server = await openProcessToolServer(
        configPath === undefined ? {} : { configPath },
        startup.signal,
      );
      opening = false;
      // A signal/stream fault during acquisition still owns and closes the acquired runtime.
      if (!stopping) await server.connect(transport);
    } catch (error: unknown) {
      // Acquisition failures are fatal even if a signal requested orderly shutdown first.
      // A connect interrupted by that same close is expected and preserves its stop reason.
      const cancelledOpening =
        stopping && error instanceof ProfileAcquisitionError && error.code === "interrupted";
      if (!cancelledOpening && (opening || !stopping)) {
        if (isReadToolServerError(error) && error.code === "configuration_required") {
          fail("configuration");
        } else if (isReadToolServerError(error) && error.code === "recovery_unavailable") {
          fail("privateState");
        } else fail("server");
      }
      requestStop("eof");
    }
    await stopped;
    if (server !== undefined) {
      try {
        await server.close();
      } catch {
        const outcome = adapterOutcome(server);
        if (outcome?.sdkFailed === true) fail("server");
        if (outcome?.cleanupFailed !== false) cleanupFailed = true;
      }
    }
    try {
      await transport.close();
    } catch {
      cleanupFailed = true;
    }
    // Settle owned pipe destruction/error events before removing stream observation.
    await setImmediate();
    if (primary !== undefined) await diagnose(DIAGNOSTICS[primary]);
    if (cleanupFailed && primary !== "shutdown") await diagnose(DIAGNOSTICS.shutdown);
    if (cleanupFailed) return 70;
    if (primary === undefined) return signalCode ?? 0;
    if (primary === "configuration" || primary === "privateState") return 78;
    if (primary === "protocol") return 65;
    return 70;
  } finally {
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", terminate);
    transport.dispose();
    // A still-open client pipe can remain referenced after pause; cleanup is now
    // settled, so it must not keep this terminated process lifecycle alive.
    if (typeof process.stdin.unref === "function") process.stdin.unref();
  }
}

if (import.meta.main === true) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch {
    await diagnose(DIAGNOSTICS.server);
    process.exitCode = 70;
  }
}
