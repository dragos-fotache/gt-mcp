// Narrow actual-process transport uses the official SDK framing and client.
// Own the child so EOF cannot silently escalate to a passing signal fallback.
import { setTimeout, clearTimeout } from "node:timers";
import { spawn } from "node:child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ReadBuffer, serializeMessage } from "@modelcontextprotocol/sdk/shared/stdio.js";
import { ajvValidator } from "../read-protocol/helpers.mjs";
import { SERVER } from "../stdio-server/helpers.mjs";
export { fixture, args, uuid } from "../fault/t15/s1-helpers.mjs";

export async function processSession(configPath, options = {}) {
  const entry = options.entry ?? SERVER;
  let child,
    stderr = "",
    closing;
  const frames = [],
    errors = [],
    buffer = new ReadBuffer();
  let exited;
  const transport = {
    async start() {
      child = spawn(
        process.execPath,
        configPath === undefined ? [entry] : [entry, "--config", configPath],
        { cwd: options.cwd, env: { ...process.env, ...options.env }, stdio: "pipe" },
      );
      exited = new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("close", (code, signal) => {
          transport.onclose?.();
          resolve({ code, signal });
        });
      });
      child.stderr.on("data", (c) => {
        stderr += c.toString();
      });
      child.stdin.on("error", (error) => transport.onerror?.(error));
      child.stdout.on("data", (chunk) => {
        try {
          buffer.append(chunk);
          for (let message; (message = buffer.readMessage()) !== null;) {
            frames.push(message);
            transport.onmessage?.(message);
          }
        } catch (error) {
          errors.push(error);
          transport.onerror?.(error);
        }
      });
    },
    async send(message) {
      await new Promise((resolve, reject) => {
        child.stdin.write(serializeMessage(message), (error) =>
          error ? reject(error) : resolve(),
        );
      });
    },
    async close() {
      child.stdin.end();
      return waitExit();
    },
  };
  async function waitExit() {
    let timer;
    try {
      return await Promise.race([
        exited,
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            child.kill("SIGKILL"); // failed test teardown only; never counted as graceful exit
            reject(new Error("Owned synthetic server failed to exit gracefully"));
          }, 8000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  const client = new Client(
    { name: "synthetic-t15-s3", version: "0", ...options.clientInfo },
    { jsonSchemaValidator: ajvValidator(), ...options.clientOptions },
  );
  try {
    await client.connect(transport);
  } catch (error) {
    await client.close();
    throw error;
  }
  const receive = transport.onmessage;
  let loseReply;
  transport.onmessage = (message, extra) => {
    if (loseReply && message.result?.structuredContent?.data?.status === "saved") {
      const observed = loseReply;
      loseReply = undefined;
      observed(message.result);
      return;
    }
    receive(message, extra);
  };
  await client.listTools();
  return {
    client,
    exited,
    frames: () => frames,
    stderr: () => stderr,
    loseSavedReply() {
      return new Promise((resolve) => {
        loseReply = resolve;
      });
    },
    async close(reason = "SIGTERM") {
      if (closing) return closing;
      closing = (async () => {
        if (reason === "eof") child.stdin.end();
        else child.kill(reason);
        const result = await waitExit();
        await client.close();
        if (errors.length !== 0) throw new Error("Nonprotocol stdout from synthetic server");
        const expected = reason === "eof" ? 0 : reason === "SIGTERM" ? 143 : 130;
        if (result.code !== expected || result.signal !== null)
          throw new Error("Unexpected synthetic server exit disposition");
        return result;
      })();
      return closing;
    },
  };
}
